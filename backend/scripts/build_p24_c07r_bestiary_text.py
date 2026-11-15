#!/usr/bin/env python3
"""P24-C07R: rebuild creatures_srd.json + animals_srd.json from scraped next.dnd.su.

Format/quality matches C13/C14 (MM24 waves). Preserves source=srd-5.2,
srd_section monsters|animals, beast_tags for animals. Stats from scrape;
only report diffs vs previous live JSON when numbers change.
"""

from __future__ import annotations

import csv
import importlib.util
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "docs" / "edition-2024" / "sources"
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"
SCRAPED = Path("/tmp/p24-c07r/scraped.json")
CSV_PATH = SOURCES / "creatures.csv"
OUT_MONSTERS = LIVE / "creatures_srd.json"
OUT_ANIMALS = LIVE / "animals_srd.json"
GAPS = SOURCES / "gaps.md"
COUNTS = SOURCES / "counts.json"
LAYER3 = SOURCES / "P24-C07R-layer3-review.md"
STATS_DIFF = Path("/tmp/p24-c07r/stats_diffs.json")

SRD_MONSTER_COUNT = 235
SRD_ANIMAL_COUNT = 95

MOUNT_SLUGS = frozenset(
    {
        "camel",
        "draft-horse",
        "elephant",
        "mule",
        "pony",
        "riding-horse",
        "warhorse",
    }
)

# Reuse C13 helpers (size/type, short text, spell/gear resolve).
_spec = importlib.util.spec_from_file_location(
    "build_p24_c13",
    REPO / "backend" / "scripts" / "build_p24_c13_monsters_mm_w1.py",
)
assert _spec and _spec.loader
_c13 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_c13)


def cr_value(cr: str) -> float:
    t = str(cr).strip()
    if "/" in t:
        a, b = t.split("/", 1)
        return float(a) / float(b)
    return float(t)


def compute_beast_tags(
    *,
    slug: str,
    type_key: str,
    cr: str,
    speed: dict,
    subtype: str | None,
) -> list[str]:
    tags: list[str] = []
    is_swarm = bool(subtype and "swarm" in str(subtype).lower())
    if type_key == "beast" and not is_swarm and cr_value(cr) <= 1.0 + 1e-9:
        tags.append("wild_shape_ok")
    if slug in MOUNT_SLUGS:
        tags.append("mount")
    if speed.get("fly"):
        tags.append("has_fly")
    if speed.get("swim"):
        tags.append("has_swim")
    return tags


def feature_entries_full(raw_list: list[dict]) -> list[dict]:
    """Keep attack / spellcasting mechanics; shorten only long lore traits."""
    out: list[dict] = []
    for feat in raw_list or []:
        name_ru = _c13.clean_ru_text(feat.get("name_ru") or "").strip()
        if not name_ru:
            continue
        text = feat.get("text_ru") or ""
        text_l = text.lower()
        name_l = name_ru.lower()
        en = str(feat.get("name_en") or "")
        is_mech = bool(
            re.search(r"[+\-−–—]\d+", text)
            or re.search(r"\bсл\s*\d+", text_l)
            or "мультиатака" in name_l
            or "сотворение заклинаний" in name_l
            or "колдовство" in name_l
            or "spellcasting" in en.lower()
            or "бросок" in text_l
            or "попадание:" in text_l
            or "провал:" in text_l
        )
        if is_mech:
            text = _c13.clean_ru_text(text)
            # Cap very long spell lists but keep frequency lines.
            if len(text) > 900:
                text = _c13.short_text(text, limit=900)
        else:
            text = _c13.short_text(text, limit=280)
        # Drop English leftovers sometimes left in fan translations.
        text = text.replace(" or ", " или ")
        text = re.sub(r"\bThe\b", "Цель", text)
        text = re.sub(r"\bvs\b", "против", text, flags=re.I)
        text = re.sub(r"\(A\)", "(А)", text)
        text = re.sub(r"\(B\)", "(Б)", text)
        name_ru = name_ru.replace(" or ", " или ")
        item: dict[str, Any] = {
            "name_ru": name_ru,
            "text_ru": text,
            "name_ru_pending": bool(re.search(r"[A-Za-z]", name_ru)),
        }
        if feat.get("name_en"):
            item["name_en"] = feat["name_en"]
        out.append(item)
    return out


def build_entry(
    scraped: dict,
    *,
    sort_order: int,
    section: str,
    by_slug: dict[str, str],
    by_ru: dict[str, str],
    gear_known: set[str],
) -> dict[str, Any]:
    size, size_ru, subtype, align = _c13.parse_size_type_align(
        scraped.get("size_type_alignment") or "",
        scraped.get("creature_type_csv") or "",
    )
    sta_raw = scraped.get("size_type_alignment") or ""
    if subtype is None and re.search(r"\bрой\b", sta_raw, re.I):
        # next.dnd.su: «Большой ? рой крошечных Зверей, …» (no parentheses)
        m_swarm = re.search(r"рой\s+([^,]+)", sta_raw, re.I)
        subtype = (m_swarm.group(0).strip() if m_swarm else "рой")
    spells = _c13.resolve_spells(scraped, by_slug, by_ru)
    gear = _c13.resolve_gear(scraped, gear_known)
    cr = str(scraped["cr"])
    pb = int(scraped["proficiency_bonus"])
    xp = int(scraped["xp"])
    init = scraped["initiative"]
    type_csv = scraped.get("creature_type_csv") or ""
    type_en = _c13.TYPE_RU.get(_c13._norm(type_csv))
    if not type_en:
        sta = _c13._norm(scraped.get("size_type_alignment") or "")
        type_en = next((v for k, v in _c13.TYPE_RU.items() if k in sta), "monstrosity")
    # Prefer CSV display label; capitalize like C07/C08.
    type_ru = type_csv or _c13.TYPE_LABEL[type_en]
    if section == "animals" and type_en == "beast":
        if subtype and "swarm" in str(subtype).lower():
            type_ru = "рой (зверь)"
        else:
            type_ru = type_csv or "Зверь"

    size_type = _c13.summary_size_type(size, type_en, type_ru)
    has_cast = bool(scraped.get("has_spellcasting") and spells)
    summary_bits = [
        f"{size_type}, ПО {cr}",
        f"КД {scraped['ac']}, хиты {scraped['hp_average']} ({scraped['hp_formula']})",
        f"инициатива {init['mod']:+d} (ср. {init['score']}), БМ +{pb}",
    ]
    tags: list[str] = []
    if section == "animals":
        tags = compute_beast_tags(
            slug=scraped["id"],
            type_key=type_en,
            cr=cr,
            speed=scraped.get("speed") or {},
            subtype=subtype,
        )
        if "wild_shape_ok" in tags:
            summary_bits.append("дикий облик")
        if "mount" in tags:
            summary_bits.append("ездовое")
    if has_cast:
        summary_bits.append("есть заклинания")
    summary = "; ".join(summary_bits)
    if not summary.endswith("."):
        summary += "."

    data: dict[str, Any] = {
        "schema_version": 1,
        "size": size,
        "size_ru": size_ru,
        "type": type_en,
        "type_ru": type_ru,
        "subtype": subtype,
        "alignment": align,
        "ac": int(scraped["ac"]),
        "hp_average": int(scraped["hp_average"]),
        "hp_formula": scraped["hp_formula"],
        "speed": scraped.get("speed") or {"walk": 30},
        "cr": cr,
        "xp": xp,
        "proficiency_bonus": pb,
        "initiative": {"mod": int(init["mod"]), "score": int(init["score"])},
        "abilities": scraped["abilities"],
        "ability_mods": scraped["ability_mods"],
        "ability_saves": scraped["ability_saves"],
        "skills": _c13.norm_skills(scraped.get("skills") or {}),
        "senses": scraped.get("senses") or {},
        "languages": scraped.get("languages") or [],
        "source_book": "SRD 5.2.1",
        "srd_section": section,
        "summary_ru": summary,
        "name_ru_pending": bool(
            re.search(r"[A-Za-z]", scraped.get("name_ru") or "")
            or not (scraped.get("name_ru") or "").strip()
        ),
        "gear_refs": gear,
        "spell_refs": spells,
        "traits": feature_entries_full(scraped.get("traits") or []),
        "actions": feature_entries_full(scraped.get("actions") or []),
        "bonus_actions": feature_entries_full(scraped.get("bonus_actions") or []),
        "reactions": feature_entries_full(scraped.get("reactions") or []),
        "legendary_actions": feature_entries_full(
            scraped.get("legendary_actions") or []
        ),
    }
    if scraped.get("damage_vulnerabilities"):
        data["damage_vulnerabilities"] = _c13.norm_damage_list(
            scraped["damage_vulnerabilities"]
        )
    if scraped.get("damage_resistances"):
        data["damage_resistances"] = _c13.norm_damage_list(
            scraped["damage_resistances"]
        )
    if scraped.get("damage_immunities"):
        data["damage_immunities"] = _c13.norm_damage_list(scraped["damage_immunities"])
    if scraped.get("condition_immunities"):
        data["condition_immunities"] = _c13.norm_conditions(
            scraped["condition_immunities"]
        )
    if scraped.get("legendary_actions_uses") is not None:
        data["legendary_actions_uses"] = scraped["legendary_actions_uses"]
    if scraped.get("legendary_actions_uses_lair") is not None:
        data["legendary_actions_uses_lair"] = scraped["legendary_actions_uses_lair"]
    if scraped.get("legendary_actions_note_ru"):
        data["legendary_actions_note_ru"] = scraped["legendary_actions_note_ru"]
    if section == "animals":
        data["beast_tags"] = tags
    for k in ("bonus_actions", "reactions", "legendary_actions", "traits"):
        if not data.get(k):
            data.pop(k, None)

    return {
        "kind": "bestiary",
        "slug": scraped["id"],
        "name_ru": scraped["name_ru"],
        "name_en": scraped["name_en"],
        "source": "srd-5.2",
        "sort_order": sort_order,
        "external_ref": {
            "url_dndsu": scraped.get("url_dndsu") or "",
            "url_ttg": scraped.get("url_ttg") or "",
            "book": "MM24",
        },
        "data": data,
    }


STAT_KEYS = (
    "ac",
    "hp_average",
    "hp_formula",
    "cr",
    "xp",
    "proficiency_bonus",
    "abilities",
    "ability_mods",
    "ability_saves",
    "initiative",
)


def diff_stats(old: dict | None, new: dict) -> dict[str, Any] | None:
    if not old:
        return None
    changes: dict[str, Any] = {}
    for k in STAT_KEYS:
        ov, nv = old.get(k), new.get(k)
        if ov != nv:
            changes[k] = {"old": ov, "new": nv}
    return changes or None


def load_old_by_slug(path: Path) -> dict[str, dict]:
    if not path.is_file():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {e["slug"]: e["data"] for e in payload.get("entries") or []}


def write_wave(
    entries: list[dict],
    *,
    path: Path,
    pack: str,
    source_label: str,
    notes: list[str],
) -> None:
    payload = {
        "meta": {
            "pack": pack,
            "source": source_label,
            "count": len(entries),
            "notes": notes,
        },
        "entries": entries,
    }
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    scraped_payload = json.loads(SCRAPED.read_text(encoding="utf-8"))
    scraped_map: dict[str, dict] = scraped_payload["entries"]
    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        csv_rows = list(csv.DictReader(f))

    monsters_csv = sorted(
        [
            r
            for r in csv_rows
            if str(r.get("srd", "")).lower() == "true"
            and r.get("srd_section") == "monsters"
        ],
        key=lambda r: r["name_en"],
    )
    animals_csv = sorted(
        [
            r
            for r in csv_rows
            if str(r.get("srd", "")).lower() == "true"
            and r.get("srd_section") == "animals"
        ],
        key=lambda r: r["name_en"],
    )
    assert len(monsters_csv) == SRD_MONSTER_COUNT
    assert len(animals_csv) == SRD_ANIMAL_COUNT

    by_slug, by_ru = _c13.load_spell_maps()
    gear_known = _c13.load_gear_slugs()
    old_mon = load_old_by_slug(OUT_MONSTERS)
    old_ani = load_old_by_slug(OUT_ANIMALS)

    mon_entries: list[dict] = []
    ani_entries: list[dict] = []
    skipped: list[str] = []
    stats_diffs: dict[str, dict] = {}

    for i, row in enumerate(monsters_csv):
        slug = row["id"]
        sc = scraped_map.get(slug)
        if not sc or sc.get("incomplete"):
            skipped.append(slug)
            continue
        sc["name_ru"] = row["name_ru"]
        sc["name_en"] = row["name_en"]
        sc["creature_type_csv"] = row.get("creature_type") or sc.get("creature_type_csv")
        sc["url_dndsu"] = row.get("url_dndsu") or sc.get("url_dndsu")
        sc["url_ttg"] = row.get("url_ttg") or sc.get("url_ttg")
        entry = build_entry(
            sc,
            sort_order=(i + 1) * 10,
            section="monsters",
            by_slug=by_slug,
            by_ru=by_ru,
            gear_known=gear_known,
        )
        d = diff_stats(old_mon.get(slug), entry["data"])
        if d:
            stats_diffs[slug] = d
        mon_entries.append(entry)

    for i, row in enumerate(animals_csv):
        slug = row["id"]
        sc = scraped_map.get(slug)
        if not sc or sc.get("incomplete"):
            skipped.append(slug)
            continue
        sc["name_ru"] = row["name_ru"]
        sc["name_en"] = row["name_en"]
        sc["creature_type_csv"] = row.get("creature_type") or sc.get("creature_type_csv")
        sc["url_dndsu"] = row.get("url_dndsu") or sc.get("url_dndsu")
        sc["url_ttg"] = row.get("url_ttg") or sc.get("url_ttg")
        entry = build_entry(
            sc,
            sort_order=(i + 1) * 10,
            section="animals",
            by_slug=by_slug,
            by_ru=by_ru,
            gear_known=gear_known,
        )
        d = diff_stats(old_ani.get(slug), entry["data"])
        if d:
            stats_diffs[slug] = d
        ani_entries.append(entry)

    write_wave(
        mon_entries,
        path=OUT_MONSTERS,
        pack="P24-C07R",
        source_label="SRD 5.2.1 Monsters A–Z (text rebuild)",
        notes=[
            "Без раздела Animals (P24-C08 / animals_srd).",
            "Тексты черт/действий пересобраны с next.dnd.su (редакция 2024), формат как C13/C14.",
            "Короткие RU-карточки; длинный текст книги не копируем.",
            "Статы 2014 не подставлялись; расхождения со старым live — в отчёте P24-C07R.",
            "gear_refs → C03, spell_refs → C05/C10 только из блока Сотворения заклинаний.",
        ],
    )
    write_wave(
        ani_entries,
        path=OUT_ANIMALS,
        pack="P24-C07R",
        source_label="SRD 5.2.1 Animals (text rebuild)",
        notes=[
            "Только раздел Animals; Monsters A–Z — creatures_srd.",
            "Тексты пересобраны с next.dnd.su (редакция 2024), формат как C13/C14.",
            "Короткие RU-карточки; длинный текст книги не копируем.",
            "beast_tags: wild_shape_ok / mount / has_fly / has_swim (данные).",
            "gear_refs → C03, spell_refs → C05/C10 где есть блок колдовства.",
        ],
    )

    STATS_DIFF.write_text(
        json.dumps(
            {
                "count": len(stats_diffs),
                "skipped": skipped,
                "diffs": stats_diffs,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    # layer3 sample
    sample_slugs = {
        "aboleth",
        "lich",
        "adult-red-dragon",
        "goblin",
        "wolf",
        "owl",
        "tarrasque",
        "archmage",
        "vampire",
        "beholder",
    }
    lines = [
        "# P24-C07R — выборка для ручной сверки (слой 3)",
        "",
        f"Monsters: **{len(mon_entries)}**, Animals: **{len(ani_entries)}**, "
        f"stat diffs: **{len(stats_diffs)}**, skipped: **{len(skipped)}**.",
        "",
        "| slug | section | name_ru | CR | AC | HP | spells | traits/actions |",
        "|---|---|---|---|---|---|---|---|",
    ]
    by_slug_e = {e["slug"]: e for e in mon_entries + ani_entries}
    for slug in sorted(sample_slugs):
        e = by_slug_e.get(slug)
        if not e:
            continue
        d = e["data"]
        n_feat = sum(
            len(d.get(k) or [])
            for k in ("traits", "actions", "bonus_actions", "reactions", "legendary_actions")
        )
        lines.append(
            f"| `{slug}` | {d.get('srd_section')} | {e['name_ru']} | {d['cr']} | "
            f"{d['ac']} | {d['hp_average']} | {len(d.get('spell_refs') or [])} | {n_feat} |"
        )
    lines.extend(
        [
            "",
            "## Источник",
            "",
            "- Русские имена: `docs/edition-2024/sources/creatures.csv` (next.dnd.su / ttg.club).",
            "- Статы и тексты черт/действий: страницы next.dnd.su редакции 2024.",
            "",
        ]
    )
    LAYER3.write_text("\n".join(lines) + "\n", encoding="utf-8")

    # gaps note
    note = (
        f"- **P24-C07R (2026-11-15):** пересборка текстов C07 Monsters ({len(mon_entries)}) "
        f"и C08 Animals ({len(ani_entries)}) с next.dnd.su; формат как C13/C14; "
        f"стат-диффов {len(stats_diffs)}; пропусков scrape {len(skipped)}."
    )
    text = GAPS.read_text(encoding="utf-8") if GAPS.is_file() else ""
    if "P24-C07R" in text:
        text = re.sub(
            r"- \*\*P24-C07R.*?(?=\n- \*\*P24-|\n## |\Z)",
            note + "\n",
            text,
            count=1,
            flags=re.S,
        )
    else:
        text = text.rstrip() + "\n\n" + note + "\n"
    GAPS.write_text(text, encoding="utf-8")

    if COUNTS.is_file():
        payload = json.loads(COUNTS.read_text(encoding="utf-8"))
        notes = payload.get("notes") or []
        if isinstance(notes, list):
            notes = [n for n in notes if not str(n).startswith("P24-C07R:")]
            notes.append(
                f"P24-C07R: creatures_srd={len(mon_entries)}, animals_srd={len(ani_entries)} "
                f"(text rebuild from next.dnd.su)."
            )
            payload["notes"] = notes
            COUNTS.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

    print(
        f"monsters={len(mon_entries)} animals={len(ani_entries)} "
        f"skipped={skipped} stat_diffs={len(stats_diffs)}"
    )
    print(
        "types_mon",
        dict(Counter(e["data"]["type"] for e in mon_entries)),
    )
    print(
        "with_spells_mon",
        sum(1 for e in mon_entries if e["data"].get("spell_refs")),
    )


if __name__ == "__main__":
    main()
