"""P24-N01: 2024 Russian names follow 2014 pair, else next.dnd.su."""

from __future__ import annotations

from pathlib import Path

from app.dnd.p24_n01_names import (
    N17_11_NAME_OVERRIDES,
    RARITY_RU_ALLOWED,
    decide_name,
    decision_key,
    find_2014_pair,
    find_embedded_name_mismatches,
    is_pending,
    iter_live_entries,
    load_2014_name_index,
    parse_discrepancies,
    unify_srd_aliases,
)

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "docs" / "edition-2024" / "sources"


def _catalog_entries():
    for path, _payload, entry in iter_live_entries():
        if not entry.get("slug") or path.name.startswith("spell_"):
            continue
        yield path, entry


def _decisions():
    by_slug, by_en_kind = load_2014_name_index()
    discrepancies = parse_discrepancies()
    decisions = {}
    live_rows = []
    for path, entry in _catalog_entries():
        live_rows.append(entry)
        dec = decide_name(
            entry,
            file_name=path.name,
            discrepancies=discrepancies,
            by_slug=by_slug,
            by_en_kind=by_en_kind,
        )
        decisions[decision_key(dec.kind, dec.slug)] = dec
    alias_view = {d.slug: d for d in decisions.values() if d.kind in {"spell", "item"}}
    unify_srd_aliases(
        alias_view,
        [e for e in live_rows if e.get("kind") in {"spell", "item"}],
    )
    for key, dec in list(decisions.items()):
        if dec.kind not in {"spell", "item"}:
            continue
        synced = alias_view.get(dec.slug)
        if synced is not None:
            decisions[key] = synced
    return decisions, discrepancies, by_slug, by_en_kind


def test_rarity_ru_only_dictionary_values():
    bad: list[tuple[str, str, str]] = []
    for path, entry in _catalog_entries():
        for target in (entry, entry.get("data") or {}):
            if not isinstance(target, dict):
                continue
            rarity = target.get("rarity_ru")
            if rarity is None:
                continue
            if rarity not in RARITY_RU_ALLOWED:
                bad.append((path.name, str(entry.get("slug")), str(rarity)))
    # also weapon mastery / helpers without slug
    for path, _payload, entry in iter_live_entries():
        for target in (entry, entry.get("data") or {}):
            if not isinstance(target, dict):
                continue
            rarity = target.get("rarity_ru")
            if rarity is not None and rarity not in RARITY_RU_ALLOWED:
                bad.append((path.name, str(entry.get("slug")), str(rarity)))
    assert bad == []


def test_knowledge_domain_pair_is_phb2014_домен_знания():
    """Deploy flake: official5e/seed say «знаний», PHB 2014 spec says «знания».

    find_2014_pair must prefer phb2014 so Linux/mac agree (rglob order differs).
    """
    by_slug, by_en = load_2014_name_index()
    pair, how = find_2014_pair(
        kind="subclass",
        slug="cleric__knowledge-domain",
        name_en="Knowledge Domain",
        by_slug=by_slug,
        by_en_kind=by_en,
    )
    assert how == "en"
    assert pair is not None
    assert pair.src == "phb2014_subclass_catalog_spec.json"
    assert pair.name_ru == "Домен знания"


def test_live_names_follow_2014_or_dndsu_decision():
    decisions, _disc, _by_slug, _by_en = _decisions()
    failures: list[str] = []
    for path, entry in _catalog_entries():
        if is_pending(entry):
            continue
        expected = decisions[decision_key(entry.get("kind"), entry.get("slug"))]
        if entry.get("name_ru") != expected.new_ru:
            failures.append(
                f"{path.name}:{entry.get('slug')}: got {entry.get('name_ru')!r}, "
                f"want {expected.new_ru!r} ({expected.basis})"
            )
    assert failures == []


def test_discrepancy_rows_without_2014_pair_match_dndsu():
    from app.dnd.p24_n01_names import DISC_CATEGORY_TO_KIND, KIND_TO_2014

    _decisions_map, discrepancies, by_slug, by_en_kind = _decisions()
    failures: list[str] = []
    for slug, row in discrepancies.items():
        disc_kind = DISC_CATEGORY_TO_KIND.get(
            row["category"], KIND_TO_2014.get(row["category"], row["category"])
        )
        entry = next(
            (
                e
                for _path, e in _catalog_entries()
                if e.get("slug") == slug
                and KIND_TO_2014.get(e.get("kind"), e.get("kind")) == disc_kind
            ),
            None,
        )
        if entry is None or is_pending(entry):
            continue
        if (disc_kind, slug) in N17_11_NAME_OVERRIDES:
            continue
        pair, _how = find_2014_pair(
            kind=entry.get("kind"),
            slug=slug,
            name_en=entry.get("name_en"),
            by_slug=by_slug,
            by_en_kind=by_en_kind,
        )
        if pair is not None:
            continue
        if entry.get("name_ru") != row["dnd_su"]:
            failures.append(
                f"{entry.get('kind')}:{slug}: got {entry.get('name_ru')!r}, "
                f"dnd.su={row['dnd_su']!r}"
            )
    assert failures == []


def test_srd_alias_pairs_share_name_ru():
    by_slug = {entry["slug"]: entry for _path, entry in _catalog_entries()}
    failures: list[str] = []
    for slug, entry in by_slug.items():
        data = entry.get("data") if isinstance(entry.get("data"), dict) else {}
        alias = data.get("srd_alias")
        if not alias:
            continue
        other = by_slug.get(alias)
        if other is None:
            continue
        if is_pending(entry) or is_pending(other):
            continue
        if entry.get("kind") == "spell" and (
            ("spell", slug) in N17_11_NAME_OVERRIDES
            or ("spell", alias) in N17_11_NAME_OVERRIDES
        ):
            continue  # 17.11: SRD strips the eponym, PH24 keeps the 2014-style name
        if entry.get("name_ru") != other.get("name_ru"):
            failures.append(
                f"{slug}={entry.get('name_ru')!r} vs {alias}={other.get('name_ru')!r}"
            )
    assert failures == []


def test_names_decision_doc_exists():
    path = SOURCES / "names-decision.md"
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "Взято из 2014" in text
    assert "dnd.su" in text
    assert "Pending" in text


def test_discrepancies_have_result_columns():
    text = (SOURCES / "discrepancies.md").read_text(encoding="utf-8")
    assert "Итог" in text
    assert "Основание" in text
    assert "P24-N01" in text


def test_bastions_pending_cleared_after_17_11():
    import json

    from app.dnd.p24_n01_names import LIVE_DIR

    payload = json.loads((LIVE_DIR / "bastions_dmg24.json").read_text(encoding="utf-8"))
    assert payload["entries"]
    assert all(
        (e.get("data") or {}).get("name_ru_pending") is False for e in payload["entries"]
    )
    war_room = next(e for e in payload["entries"] if e["slug"] == "war-room")
    assert war_room["name_ru"] == "Штаб"


def test_embedded_slug_name_ru_matches_target_card():
    """Nested refs like origin_feat must echo the target card's current name_ru."""
    mismatches = find_embedded_name_mismatches()
    assert mismatches == [], (
        "; ".join(
            f"{m.file}:{m.owner_slug} {m.path} {m.ref_slug}={m.got!r} want={m.want!r}"
            for m in mismatches[:20]
        )
    )


def test_alembic_single_head_is_p24_n01():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one alembic head, got {heads}"
    assert heads[0] in {
        "p24n01r01",
        "p24m03pr01",
        "p24int01merge",
        "p24fixenum01",
        "p24n01r02",
        "p24n01r03",
        "j11sunfwep01", "k12tolldead01", "k13harenhop01", "k14diplbg01", "k15luckbow01", "k16bracers01", "k17braceammo01", "k18bardtce01",
    }
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "p24n01names01" in ancestor_ids
    assert "p24n01r02" in ancestor_ids
    assert "p24c21rau01" in ancestor_ids
    assert "p24c21au01" in ancestor_ids


def test_live_knowledge_domain_and_dungeoneers_pack_names():
    """Wizard step 6 reads DB; pack summaries must match equipment card (N01)."""
    import json

    from app.dnd.p24_n01_names import LIVE_DIR

    frhof = json.loads((LIVE_DIR / "subclasses_frhof.json").read_text(encoding="utf-8"))
    knowledge = next(
        e for e in frhof["entries"] if e.get("slug") == "cleric__knowledge-domain"
    )
    assert knowledge["name_ru"] == "Домен знания"

    classes = json.loads((LIVE_DIR / "classes_srd.json").read_text(encoding="utf-8"))
    equipment = json.loads((LIVE_DIR / "equipment_srd.json").read_text(encoding="utf-8"))
    pack = next(e for e in equipment["entries"] if e.get("slug") == "dungeoneers-pack")
    assert pack["name_ru"] == "Набор исследователя подземелий"
    for entry in classes["entries"]:
        for pack_row in (entry.get("data") or {}).get("starting_equipment") or []:
            summary = str(pack_row.get("summary_ru") or "")
            assert "данжеонер" not in summary.lower(), (
                f"{entry.get('slug')}: summary still uses «данжеонер»: {summary!r}"
            )
            item_ids = {
                str(it.get("id") or "")
                for it in (pack_row.get("items") or [])
                if isinstance(it, dict)
            }
            if "dungeoneers-pack" in item_ids:
                assert "исследователя подземелий" in summary.lower(), (
                    f"{entry.get('slug')}: pack summary should name the equipment card"
                )
