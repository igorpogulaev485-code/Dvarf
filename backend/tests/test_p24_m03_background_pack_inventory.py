"""P24-M03: background pack → inventory (coins, perfume, chosen tool).

Prod bug after fighter create (entertainer pack A): «духи» became «ду»,
placeholder «Музыкальный инструмент (выбранный)» stayed literal, and «11 зм»
was an inventory row while purse kept only class gold.

Covers all 16 PHB/SRD 2024 backgrounds used by the create wizard.
Does not touch the 2014 create path.
"""

from __future__ import annotations

import re

import pytest

from app.dnd import edition_2024_create as create24

# PHB 2024 origins (12 ph24 + 4 srd-5.2) — the create wizard's core 16.
PHB2024_BACKGROUNDS = (
    "acolyte",
    "artisan",
    "charlatan",
    "criminal",
    "entertainer",
    "farmer",
    "guard",
    "guide",
    "hermit",
    "merchant",
    "noble",
    "sage",
    "sailor",
    "scribe",
    "soldier",
    "wayfarer",
)

_COIN_ITEM_RE = re.compile(r"^\d+\s*зм\.?$", re.IGNORECASE)
_TRUNCATED_PERFUME = re.compile(r"^ду$", re.IGNORECASE)


def _class_pack_gp(class_slug: str = "fighter") -> int:
    from app.dnd import edition_2024_classes as e24

    data = e24.load_class_catalog()[class_slug]["data"]
    packs = data.get("starting_equipment") or []
    pack = next((p for p in packs if p.get("id") == "a"), packs[0])
    return int(pack.get("coins_gp") or 0)


def _pack_gp_from_summary(summary: str) -> int:
    total = 0
    for chunk in summary.replace(";", ",").split(","):
        name, qty = create24._parse_pack_summary_chunk(chunk.strip())
        if name is None:
            total += qty
    return total


def _expected_tool_slug(bg_slug: str) -> str | None:
    bg = create24.load_background_catalog()[bg_slug]
    data = bg.get("data") or {}
    choices = data.get("tool_choices")
    pool = create24._tool_choice_pool(choices if isinstance(choices, dict) else None)
    if pool:
        # Prefer bagpipes for entertainer regression; else first pool id.
        if "bagpipes" in pool:
            return "bagpipes"
        return pool[0]
    fixed = [str(x) for x in (data.get("tool_proficiencies") or []) if x]
    return fixed[0] if fixed else None


def _payload_for_background(bg_slug: str, *, tool_id: str | None) -> dict:
    """Fighter + pack A; background/tool/ASI/origin feat swapped to ``bg_slug``."""
    from tests import test_p24_m03_create as m03

    asi_mode, asi = m03._bg_asi(bg_slug)
    origin_meta = m03._origin_feat_fields(bg_slug)
    payload = m03.build_valid_payload(
        "fighter",
        background_slug=bg_slug,
        background_equipment="pack",
        class_equipment="a",
        background_tool_id=tool_id,
        background_asi_mode=asi_mode,
        background_asi=asi,
        name=f"Pack-{bg_slug}",
        **{k: v for k, v in origin_meta.items() if not k.startswith("_")},
    )
    # build_valid_payload seeds origin_feat_picks from the class's default
    # background — replace with the overridden background's nested picks.
    picks = dict((payload.get("class_option_picks") or {}).get("client_picks") or {})
    picks["origin_feat_picks"] = origin_meta.get("_origin_feat_picks") or {}
    payload["class_option_picks"] = {
        **(payload.get("class_option_picks") or {}),
        "client_picks": picks,
    }
    payload["background_tool_id"] = tool_id
    return payload


def test_parse_pack_chunk_does_not_split_dukhi_on_cyrillic_kh():
    name, qty = create24._parse_pack_summary_chunk("духи")
    assert name == "духи"
    assert qty == 1
    name2, qty2 = create24._parse_pack_summary_chunk("масло ×3")
    assert name2 == "масло"
    assert qty2 == 3
    name3, qty3 = create24._parse_pack_summary_chunk("11 зм")
    assert name3 is None
    assert qty3 == 11


@pytest.mark.parametrize("bg_slug", PHB2024_BACKGROUNDS)
def test_phb2024_background_pack_inventory(bg_slug: str):
    catalog = create24.load_background_catalog()
    assert bg_slug in catalog, f"missing background {bg_slug}"
    bg = catalog[bg_slug]
    data = bg.get("data") or {}
    eq = data.get("equipment_or_gold") if isinstance(data.get("equipment_or_gold"), dict) else {}
    summary = str(eq.get("pack_summary_ru") or "")
    assert summary, f"{bg_slug}: empty pack_summary_ru"

    tool_id = _expected_tool_slug(bg_slug)
    # Normalize underscore fixed ids to inventory slugs where needed.
    payload = _payload_for_background(bg_slug, tool_id=tool_id)
    result = create24.validate_create_2024(create24.payload_from_dict(payload))
    inv = result.sheet.get("inventory") or {}
    items = list(inv.get("items") or [])
    coins = inv.get("coins") or {}
    names = [str(it.get("name_ru") or it.get("name") or "") for it in items]
    slugs = [str(it.get("slug") or "") for it in items]

    # 1) No truncated «ду» / perfume must resolve when summary mentions духи.
    assert not any(_TRUNCATED_PERFUME.match(n.strip()) for n in names), names
    if re.search(r"\bдухи\b", summary, re.IGNORECASE):
        assert any(
            str(it.get("slug")) == "perfume" or n.lower() == "духи" for it, n in zip(items, names)
        ), names

    # 2) Chosen tool replaces placeholders; no literal «(выбранный)».
    assert not any("выбранн" in n.lower() for n in names), names
    if tool_id and data.get("tool_choices"):
        tool_slug = create24._resolve_tool_inventory_slug(tool_id, create24.load_item_catalog())
        tool_ru = create24.tool_name_ru(tool_id)
        assert tool_slug in slugs or tool_ru in names, (tool_slug, tool_ru, names)
        # Entertainer proficiency: one musical instrument (the pick) — PHB 2024.
        if bg_slug == "entertainer":
            tools = list((result.sheet.get("proficiency") or {}).get("tools") or [])
            assert tools == [tool_ru], tools

    # 3) Pack GP goes to purse, not an inventory row.
    pack_gp = _pack_gp_from_summary(summary)
    assert pack_gp > 0, summary
    assert not any(_COIN_ITEM_RE.match(n.strip()) for n in names), names
    class_gp = _class_pack_gp("fighter")
    assert int(coins.get("gp") or 0) == class_gp + pack_gp, (
        bg_slug,
        coins.get("gp"),
        class_gp,
        pack_gp,
        summary,
    )


def test_entertainer_bagpipes_regression_exact():
    """Matches prod report: Human / Alert / Entertainer / pack / bagpipes."""
    payload = _payload_for_background("entertainer", tool_id="bagpipes")
    payload["name"] = "Артист-регресс"
    # Origin feat Alert is tied to entertainer in catalog; keep nested picks empty-safe.
    result = create24.validate_create_2024(create24.payload_from_dict(payload))
    inv = result.sheet["inventory"]
    items = inv["items"]
    names = [str(it.get("name_ru") or "") for it in items]
    slugs = [str(it.get("slug") or "") for it in items]

    assert "ду" not in {n.lower() for n in names}
    assert "perfume" in slugs
    assert "bagpipes" in slugs
    assert not any("выбранн" in n.lower() for n in names)
    assert not any(_COIN_ITEM_RE.match(n.strip()) for n in names)
    assert int(inv["coins"]["gp"]) == _class_pack_gp("fighter") + 11
    assert (result.sheet.get("proficiency") or {}).get("tools") == ["Волынка"]
    # Two costumes from «2 костюма».
    costume = next(it for it in items if it.get("slug") == "costume")
    assert int(costume.get("qty") or 0) == 2
