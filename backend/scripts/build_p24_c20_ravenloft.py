#!/usr/bin/env python3
"""P24-C20: Ravenloft: The Horrors Within (RTW) live catalog waves (95 cards).

Sources: docs/edition-2024/sources/*.csv (book=RTW).
Pages: /tmp/p24-c20/cache (dndsu HTML + ttg JSON); curl only if missing.
source=rtw → content_layer=community_ref. Short RU only.
Adventure text / domain maps are out of scope.
"""

from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
import time
from collections import defaultdict
from html import unescape
from pathlib import Path
from typing import Any

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

import build_p24_c13_monsters_mm_w1 as mm  # noqa: E402
from scrape_p24_c13_monsters import parse_page  # noqa: E402

import build_p24_c17_frhof as c17  # noqa: E402
import build_p24_c18_fraif_bundle as c18  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "docs" / "edition-2024" / "sources"
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"
CACHE = Path("/tmp/p24-c20/cache")
DNDSU = CACHE / "dndsu"
TTG = CACHE / "ttg"
LAYER3 = SOURCES / "P24-C20-layer3-review.md"
GAPS = SOURCES / "gaps.md"
COUNTS = SOURCES / "counts.json"

PACK = "P24-C20"
BOOK = "RTW"
SOURCE = "rtw"
BOOK_RU = "Равенлофт: Ужасы внутри"

EXPECTED = {
    "species_rtw.json": ("species", 4),
    "backgrounds_rtw.json": ("backgrounds", 4),
    "feats_rtw.json": ("feats", 11),
    "subclasses_rtw.json": ("subclasses", 7),
    "magic_items_rtw.json": ("magic_items", 1),
    "creatures_rtw.json": ("creatures", 68),
}
C20_TOTAL = 4 + 4 + 11 + 7 + 1 + 68  # 95

SUBCLASS_CODES = {
    "artificer__reanimator": ("artificer", "subclass.reanimator"),
    "bard__college-of-the-spirits": ("bard", "subclass.college-of-the-spirits"),
    "cleric__grave-domain": ("cleric", "subclass.grave-domain"),
    "ranger__hollow-warden": ("ranger", "subclass.hollow-warden"),
    "rogue__phantom": ("rogue", "subclass.phantom"),
    "sorcerer__shadow-sorcery": ("sorcerer", "subclass.shadow-sorcery"),
    "warlock__undead": ("warlock", "subclass.undead"),
}

CAT_LABEL = {
    **c17.CAT_LABEL,
    "dark_gift": "Тёмный дар",
    "dragonmark": "Драконья метка",
}


def _csv_rows(name: str) -> list[dict[str, str]]:
    with (SOURCES / name).open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _book_rows(name: str) -> list[dict[str, str]]:
    return [r for r in _csv_rows(name) if r.get("book") == BOOK]


def polish_ru(text: str, *, limit: int | None = None) -> str:
    return c18.polish_ru(text, limit=limit)


def load_dndsu_html(row: dict[str, str], category: str) -> str:
    slug = row["id"]
    dest = DNDSU / category / f"{slug}.html"
    if dest.is_file() and dest.stat().st_size > 800:
        return dest.read_text(encoding="utf-8", errors="replace")
    url = (row.get("url_dndsu") or "").rstrip("/")
    if not url:
        return ""
    dest.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(4):
        try:
            proc = subprocess.run(
                [
                    "curl",
                    "-sL",
                    "--max-time",
                    "45",
                    "-A",
                    "Mozilla/5.0 (compatible; DvarfCatalogBot/1.0)",
                    "-o",
                    str(dest),
                    "-w",
                    "%{http_code}",
                    url + "/",
                ],
                capture_output=True,
                text=True,
                timeout=60,
            )
            if (proc.stdout or "").strip() == "200" and dest.stat().st_size > 800:
                time.sleep(0.05)
                return dest.read_text(encoding="utf-8", errors="replace")
        except Exception:
            pass
        time.sleep(1.0 * (attempt + 1))
    return dest.read_text(encoding="utf-8", errors="replace") if dest.is_file() else ""


def load_ttg_json(row: dict[str, str], category: str) -> dict | None:
    slug = row["id"]
    dest = TTG / category / f"{slug}.json"
    if dest.is_file() and dest.stat().st_size > 40:
        return json.loads(dest.read_text(encoding="utf-8"))
    return None


def load_class_html(parent: str) -> str:
    dest = DNDSU / "classes" / f"{parent}.html"
    if dest.is_file() and dest.stat().st_size > 800:
        return dest.read_text(encoding="utf-8", errors="replace")
    dest.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://next.dnd.su/class/{parent}/"
    proc = subprocess.run(
        [
            "curl",
            "-sL",
            "--max-time",
            "45",
            "-A",
            "Mozilla/5.0 (compatible; DvarfCatalogBot/1.0)",
            "-o",
            str(dest),
            "-w",
            "%{http_code}",
            url,
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if (proc.stdout or "").strip() != "200":
        raise RuntimeError(f"class page fail: {parent}")
    return dest.read_text(encoding="utf-8", errors="replace")


def feats_by_id() -> dict[str, dict[str, str]]:
    return {r["id"]: r for r in _book_rows("feats.csv")}


def origin_from_ttg(ttg: dict, feats: dict[str, dict[str, str]]) -> dict:
    """Primary origin feat = first featChoices url (minus -rhw) or parsed feat tag."""
    choices = ttg.get("featChoices") or []
    if choices:
        raw = str(choices[0].get("url") or "")
        slug = re.sub(r"-(rhw|rtw)$", "", raw)
        if slug in feats:
            row = feats[slug]
            return {
                "id": row["id"],
                "slug": row["id"],
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
            }
    feat_raw = c18.strip_ttg_markup(str(ttg.get("feat") or ""))
    primary = re.split(r"\s*\(|\s+или\s+", feat_raw, maxsplit=1)[0].strip()
    by_ru = {r["name_ru"]: r for r in feats.values()}
    by_ru["Острый глаз"] = feats["sharp-eye"]
    by_ru["Ходок туманов"] = feats["mist-walker"]
    by_ru["Ходок Туманов"] = feats["mist-walker"]
    by_ru["Сонм голосов"] = feats["gathered-whispers"]
    if primary in by_ru:
        row = by_ru[primary]
        return {
            "id": row["id"],
            "slug": row["id"],
            "name_ru": row["name_ru"],
            "name_en": row["name_en"],
        }
    raise KeyError(f"unknown origin feat from ttg: {feat_raw!r} choices={choices!r}")


def _tool_summary_ttg(ttg: dict) -> str:
    tool_choice = ttg.get("toolChoice") or {}
    if isinstance(tool_choice, dict) and tool_choice.get("from"):
        return "набор инструментов (на выбор)"
    tools = ttg.get("toolProficiencies") or []
    if isinstance(tools, list) and tools:
        names = []
        for t in tools:
            if isinstance(t, dict):
                names.append(t.get("name") or t.get("url") or "инструмент")
            else:
                names.append(str(t))
        return polish_ru(", ".join(names), limit=80)
    if isinstance(tools, str) and tools.strip():
        return polish_ru(tools, limit=80)
    return "инструмент"


def _pack_summary_ttg(ttg: dict) -> str:
    gear_items: list[str] = []
    for block in ttg.get("startingEquipment") or []:
        label = block.get("label")
        if label:
            gear_items.append(f"({label})")
        for it in block.get("items") or []:
            name = it.get("name") or it.get("url") or ""
            qty = it.get("quantity")
            if name:
                gear_items.append(f"{name}×{qty}" if qty else str(name))
    return polish_ru("; ".join(gear_items[:10]) or "пакет снаряжения", limit=280)


# TTG / RTW skill labels that differ from FRHoF dictionary
SKILL_ALIASES_RTW = {
    "аркана": "arcana",
    "анализ": "investigation",
    "расследование": "investigation",
    "магия": "arcana",
    "тайная магия": "arcana",
}


def _parse_skills_rtw(raw: str) -> list[str]:
    raw = (raw or "").replace(" и ", ", ")
    out: list[str] = []
    for part in re.split(r"[,;/]", raw):
        p = part.strip().lower().replace("ё", "е")
        if not p:
            continue
        code = SKILL_ALIASES_RTW.get(p) or c17.SKILL_RU.get(p)
        if code and code not in out:
            out.append(code)
    return out


def build_backgrounds() -> dict[str, Any]:
    """Prefer TTG structured fields; dnd.su paper is interactive/noisy for RTW."""
    rows = _book_rows("backgrounds.csv")
    feats = feats_by_id()
    entries: list[dict] = []
    for i, row in enumerate(rows):
        ttg = load_ttg_json(row, "backgrounds")
        if not ttg:
            raise RuntimeError(f"background missing ttg: {row['id']}")
        abilities = c17._parse_abilities(ttg.get("abilityScores") or "")
        assert len(abilities) == 3, (row["id"], abilities)
        origin = origin_from_ttg(ttg, feats)
        skill_list = _parse_skills_rtw(ttg.get("skillProficiencies") or "")
        assert len(skill_list) == 2, (row["id"], skill_list)
        tool_raw = _tool_summary_ttg(ttg)
        pack = _pack_summary_ttg(ttg)
        abi_ru = "/".join(c17.ABILITY_CODE_TO_RU[a] for a in abilities)
        skills_ru = ", ".join(c17.SKILL_EN_TO_RU.get(s, s) for s in skill_list)
        traits = (
            f"{row['name_ru']} ({BOOK_RU}): {abi_ru} (+2/+1 или +1/+1/+1). "
            f"Черта: {origin['name_ru']}. Навыки: {skills_ru}. "
            f"Инструмент: {tool_raw}. Пакет или 50 зм."
        )
        traits = polish_ru(traits, limit=420)
        ext: dict[str, Any] = {"book": BOOK}
        if row.get("url_dndsu"):
            ext["url_dndsu"] = row["url_dndsu"].rstrip("/")
        if row.get("url_ttg"):
            ext["url_ttg"] = row["url_ttg"]
        entries.append(
            {
                "kind": "background",
                "slug": row["id"],
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": SOURCE,
                "sort_order": (i + 1) * 10,
                "external_ref": ext,
                "data": {
                    "asi": {
                        "abilities": abilities,
                        "options": ["+2/+1", "+1/+1/+1"],
                        "cap": 20,
                    },
                    "origin_feat": origin,
                    "skill_proficiencies": skill_list,
                    "tool_proficiencies": [tool_raw],
                    "tool_choices": None,
                    "equipment_or_gold": {
                        "gold_alternative_gp": 50,
                        "pack_summary_ru": pack,
                    },
                    "traits_text": traits,
                },
            }
        )
    return {
        "meta": {
            "pack": PACK,
            "rules_edition": "2024",
            "source": SOURCE,
            "notes_ru": (
                f"{len(entries)} предысторий RTW. ASI + origin_feat. "
                f"RU: backgrounds.csv / ttg (структура) / next.dnd.su."
            ),
        },
        "entries": entries,
    }


def parse_feat_card_rtw(text: str, csv_row: dict[str, str]) -> dict:
    data = c17.parse_feat_card(text, csv_row)
    category = (csv_row.get("feat_category") or data.get("category") or "general").strip()
    data["category"] = category
    # Dark gifts / origin: do not invent general-level prereqs
    if category in {"origin", "dark_gift"}:
        data["prerequisites"] = data.get("prerequisites") or {}
        # strip auto level 4 from parse_feat_card if category was misread earlier
        if category == "dark_gift":
            data["prerequisites"].pop("level", None)
    label = CAT_LABEL.get(category, "Черта")
    summary = data.get("summary_ru") or csv_row["name_ru"]
    prereq_ru = None
    if data.get("prerequisites"):
        # keep existing traits_text rebuild
        pass
    traits = f"{label} ({BOOK_RU}): {summary}"
    data["traits_text"] = polish_ru(traits, limit=360)
    data["summary_ru"] = polish_ru(summary, limit=320)
    return data


def build_feats() -> dict[str, Any]:
    rows = _book_rows("feats.csv")
    entries = []
    for i, row in enumerate(rows):
        html = load_dndsu_html(row, "feats")
        text = c17._extract_paper(html) if html else ""
        if not text:
            ttg = load_ttg_json(row, "feats")
            if ttg:
                desc = ttg.get("description") or []
                if isinstance(desc, list):
                    body = " ".join(c18.strip_ttg_markup(x) for x in desc if isinstance(x, str))
                else:
                    body = c18.strip_ttg_markup(str(desc))
                cat_ru = ttg.get("category") or ""
                text = f"{cat_ru}\n{row['name_ru']}\n{body}"
            else:
                text = f"{row['name_ru']} [{row.get('name_en') or ''}]"
        data = parse_feat_card_rtw(text, row)
        for key in ("summary_ru", "traits_text", "prerequisites_ru"):
            if data.get(key):
                data[key] = polish_ru(data[key], limit=320 if key == "summary_ru" else 360)
        # Force category from CSV
        data["category"] = (row.get("feat_category") or data["category"]).strip()
        label = CAT_LABEL.get(data["category"], "Черта")
        data["traits_text"] = polish_ru(
            f"{label} ({BOOK_RU}): {data.get('summary_ru', row['name_ru'])}",
            limit=360,
        )
        ext: dict[str, Any] = {"book": BOOK}
        if row.get("url_dndsu"):
            ext["url_dndsu"] = row["url_dndsu"].rstrip("/")
        if row.get("url_ttg"):
            ext["url_ttg"] = row["url_ttg"]
        entries.append(
            {
                "kind": "feat",
                "slug": row["id"],
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": SOURCE,
                "sort_order": 50 + i * 5,
                "external_ref": ext,
                "data": data,
            }
        )
    entries.sort(key=lambda e: (e["data"]["category"], e["slug"]))
    for i, e in enumerate(entries):
        base = {
            "origin": 50,
            "dark_gift": 100,
            "general": 200,
            "fighting_style": 400,
            "epic_boon": 600,
        }.get(e["data"]["category"], 300)
        e["sort_order"] = base + i * 5
    return {
        "meta": {
            "pack": PACK,
            "rules_edition": "2024",
            "source": SOURCE,
            "notes_ru": (
                f"{len(entries)} черт RTW (origin + dark_gift). "
                "Короткие карточки next.dnd.su / ttg."
            ),
            "feat_count": len(entries),
        },
        "entries": entries,
    }


def build_species() -> dict[str, Any]:
    rows = _book_rows("species.csv")
    entries = []
    for i, row in enumerate(rows):
        payload = load_ttg_json(row, "species")
        if not payload:
            html = load_dndsu_html(row, "species")
            if not html:
                raise RuntimeError(f"species missing sources: {row['id']}")
            data = c18.parse_species_dndsu(html, row)
            # retag book name
            data["traits_text"] = polish_ru(
                re.sub(r"\([^)]+\)", f"({BOOK_RU})", data.get("traits_text") or "", count=1),
                limit=520,
            )
        else:
            data = c18.parse_species_ttg(payload, row)
            data["traits_text"] = polish_ru(
                re.sub(
                    r"\(Первый свет Лорвина\)|\(LFL\)",
                    f"({BOOK_RU})",
                    data.get("traits_text") or "",
                ),
                limit=520,
            )
            if f"({BOOK_RU})" not in (data.get("traits_text") or ""):
                data["traits_text"] = polish_ru(
                    f"{row['name_ru']} ({BOOK_RU}): {data.get('traits_text') or ''}",
                    limit=520,
                )
        ext = {
            "url_dndsu": (row.get("url_dndsu") or "").rstrip("/") or None,
            "url_ttg": row.get("url_ttg") or None,
            "book": BOOK,
        }
        entries.append(
            {
                "kind": "race",
                "slug": row["id"],
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": SOURCE,
                "sort_order": (i + 1) * 10,
                "external_ref": ext,
                "data": data,
            }
        )
    return {
        "meta": {
            "pack": PACK,
            "rules_edition": "2024",
            "source": SOURCE,
            "notes_ru": (
                "4 вида RTW (дампир, ведьмовская кровь, волколак, возрождённый) "
                "по TTG / next.dnd.su; RU-имена из species.csv."
            ),
        },
        "entries": entries,
    }


def build_magic_items() -> dict[str, Any]:
    rows = _book_rows("magic_items.csv")
    entries = []
    for i, row in enumerate(rows):
        html = load_dndsu_html(row, "magic_items")
        text = c17._extract_paper(html) if html else ""
        if not text:
            ttg = load_ttg_json(row, "magic_items")
            if ttg:
                desc = ttg.get("description") or []
                if isinstance(desc, list):
                    body = " ".join(
                        c18.strip_ttg_markup(x) for x in desc if isinstance(x, str)
                    )
                else:
                    body = c18.strip_ttg_markup(str(desc))
                rarity = (ttg.get("rarity") or {}).get("rus") or "артефакт"
                itype = (ttg.get("type") or {}).get("rus") or "оружие"
                text = f"{itype}, {rarity}\n{row['name_ru']}\n{body}"
            else:
                text = row["name_ru"]
        data = c17.parse_magic_item(text or row["name_ru"], row)
        data["summary_ru"] = polish_ru(data.get("summary_ru") or "", limit=320)
        ext: dict[str, Any] = {"book": BOOK}
        if row.get("url_dndsu"):
            ext["url_dndsu"] = row["url_dndsu"].rstrip("/")
        if row.get("url_ttg"):
            ext["url_ttg"] = row["url_ttg"]
        entries.append(
            {
                "kind": "item",
                "slug": row["id"],
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": SOURCE,
                "sort_order": (i + 1) * 10,
                "external_ref": ext,
                "data": data,
            }
        )
    return {
        "meta": {
            "pack": PACK,
            "source": "RTW magic items (community_ref)",
            "count": len(entries),
            "notes": [
                f"{len(entries)} магических предметов RTW.",
                "source=rtw → community_ref.",
            ],
        },
        "entries": entries,
    }


def build_subclasses() -> dict[str, Any]:
    rows = _book_rows("subclasses.csv")
    assert len(rows) == 7, len(rows)
    class_html: dict[str, str] = {}
    for parent in {SUBCLASS_CODES[r["id"]][0] for r in rows}:
        class_html[parent] = load_class_html(parent)

    entries = []
    for i, row in enumerate(rows):
        slug = row["id"]
        parent, code = SUBCLASS_CODES[slug]
        html = class_html[parent]
        features = c17._parse_subclass_features(html, code)
        if not features:
            raise RuntimeError(f"no features for {slug}")
        levels = {b["level"] for b in features}
        assert 3 in levels, (slug, levels)
        block_m = re.search(
            rf'data-code="{re.escape(code)}"(.*?)(?=class__subclass__holder|$)',
            html,
            re.S,
        )
        summary = f"Подкласс {row['name_ru']} ({parent})."
        if block_m:
            zero = re.search(
                r'data-level="0"[^>]*>.*?<p>\s*<i>(.*?)</i>',
                block_m.group(1),
                re.S,
            )
            if zero:
                summary = c17._compress_ru(c17._strip_tags(zero.group(1)), 160)
        # polish feature summaries
        for bucket in features:
            for feat in bucket["features"]:
                feat["summary_ru"] = polish_ru(feat.get("summary_ru") or "", limit=180)
                feat["name_ru"] = polish_ru(feat.get("name_ru") or "", limit=80)
        entries.append(
            {
                "kind": "subclass",
                "slug": slug,
                "name_ru": row["name_ru"],
                "name_en": row["name_en"] or row["subclass_id"],
                "source": SOURCE,
                "sort_order": (i + 1) * 10,
                "parent_id": c17.entry_id(kind="class", slug=parent),
                "external_ref": {
                    "url_dndsu": (
                        row.get("url_dndsu") or f"https://next.dnd.su/class/{parent}"
                    ).rstrip("/"),
                    "url_ttg": row.get("url_ttg") or None,
                    "book": BOOK,
                },
                "data": {
                    "parent_class": parent,
                    "subclass_level": 3,
                    "features": features,
                    "spell_list": [],
                    "spell_list_note_ru": (
                        "Расширенный список (если есть) — в умениях подкласса "
                        "про заклинания; отдельного списка в этой карточке нет."
                    ),
                    "summary_ru": polish_ru(summary, limit=180),
                },
            }
        )
    return {
        "meta": {
            "pack": PACK,
            "rules_edition": "2024",
            "source": SOURCE,
            "notes_ru": (
                "7 подклассов RTW к классам C04/C15. parent_id = UUID класса 2024. "
                "Имена — subclasses.csv; умения — короткие карточки next.dnd.su."
            ),
        },
        "entries": entries,
    }


def _walk_polish(obj: Any) -> Any:
    if isinstance(obj, str):
        return polish_ru(obj)
    if isinstance(obj, list):
        return [_walk_polish(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _walk_polish(v) for k, v in obj.items()}
    return obj


def build_creatures() -> tuple[dict[str, Any], list[str]]:
    rows = sorted(_book_rows("creatures.csv"), key=lambda r: r["name_en"])
    by_slug, by_ru = mm.load_spell_maps()
    gear_known = mm.load_gear_slugs()
    entries: list[dict] = []
    skipped: list[str] = []
    for i, row in enumerate(rows):
        slug = row["id"]
        html = load_dndsu_html(row, "creatures")
        if not html or len(html) < 800:
            skipped.append(f"{slug}:no_html")
            continue
        try:
            parsed = parse_page(html, row)
        except Exception as exc:  # noqa: BLE001
            skipped.append(f"{slug}:parse:{exc}")
            continue
        if parsed.get("incomplete"):
            skipped.append(f"{slug}:incomplete")
            continue
        parsed["name_ru"] = row["name_ru"]
        parsed["name_en"] = row["name_en"]
        parsed["creature_type_csv"] = row.get("creature_type") or ""
        parsed["url_dndsu"] = row.get("url_dndsu") or ""
        parsed["url_ttg"] = row.get("url_ttg") or ""
        spells = mm.resolve_spells(parsed, by_slug, by_ru)
        if parsed.get("has_spellcasting"):
            raw_slugs = parsed.get("spell_slugs") or []
            raw_names = parsed.get("spell_names_ru") or []
            if (raw_slugs or raw_names) and not spells:
                skipped.append(f"{slug}:unresolved_spells")
                continue
        entry = mm.build_entry(
            parsed,
            sort_order=(i + 1) * 10,
            by_slug=by_slug,
            by_ru=by_ru,
            gear_known=gear_known,
        )
        entry["source"] = SOURCE
        entry["external_ref"]["book"] = BOOK
        entry["data"]["source_book"] = BOOK
        entry = _walk_polish(entry)
        if parsed.get("has_spellcasting"):
            bad = False
            for sp in entry["data"].get("spell_refs") or []:
                if sp not in by_slug:
                    skipped.append(f"{slug}:bad_spell_ref:{sp}")
                    bad = True
                    break
            if bad:
                continue
        entries.append(entry)
    payload = {
        "meta": {
            "pack": PACK,
            "source": "RTW creatures (community_ref)",
            "count": len(entries),
            "notes": [
                f"{len(entries)} существ RTW; source=rtw.",
                "Короткие RU-карточки; spell_refs только из блока заклинаний.",
            ],
        },
        "entries": entries,
        "skipped": skipped,
    }
    return payload, skipped


def _assert_no_stubs(payload: dict, path: Path) -> None:
    text = json.dumps(payload, ensure_ascii=False)
    for needle in c17.STUB_NEEDLES:
        if needle in text:
            raise AssertionError(f"{path.name}: stub needle {needle!r}")
    for e in payload.get("entries") or []:
        blob = json.dumps(e.get("data") or {}, ensure_ascii=False)
        if re.search(r"[А-Яа-яЁё]\s+[,.;:!?]", blob):
            raise AssertionError(f"{path.name}/{e.get('slug')}: space before punct")


def all_feat_slugs() -> set[str]:
    slugs: set[str] = set()
    for path in LIVE.glob("feats_*.json"):
        for e in json.loads(path.read_text(encoding="utf-8")).get("entries") or []:
            slugs.add(e["slug"])
    return slugs


def write_layer3(counts: dict[str, int], skipped: list[str]) -> None:
    lines = [
        "# P24-C20 — выборка для ручной сверки (слой 3)",
        "",
        "Агент, собравший данные, **не** принимает слой 3. "
        "Сверять с [next.dnd.su](https://next.dnd.su/) и [new.ttg.club](https://new.ttg.club/).",
        "",
        "## Объём",
        "",
        "| Файл | Эталон | Сид |",
        "|---|---:|---:|",
    ]
    for fname, (_cat, exp) in EXPECTED.items():
        lines.append(f"| `{fname}` | {exp} | {counts.get(fname, 0)} |")
    total = sum(counts.values())
    lines.extend(
        [
            "",
            f"**Всего:** {total} (цель {C20_TOTAL}).",
            "",
            "## Пропуски",
            "",
        ]
    )
    if skipped:
        for s in skipped[:60]:
            lines.append(f"- `{s}`")
        if len(skipped) > 60:
            lines.append(f"- … ещё {len(skipped) - 60}")
    else:
        lines.append("- Честных пропусков по недоступности страниц нет (кэш P24-C20).")
    lines.extend(
        [
            "",
            "## Особые случаи",
            "",
            "- Виды: дампир, ведьмовская кровь (hexblood), волколак (lupin), возрождённый.",
            "- Предыстории: origin_feat — id из feats.csv; у Преследуемого — "
            "`survivor` (или тёмный дар на выбор в книге; в карточке — основная ссылка).",
            "- Черты: 2 origin + 9 dark_gift.",
            "- Подклассы: Reanimator → artificer (EFA); остальные → классы C04.",
            "- `ebonbane` есть и как существо, и как магический предмет (разный kind).",
            "- Тексты приключений и домены ужаса как сюжет/карты не переносим.",
            "- `source=rtw` → `community_ref`.",
            "",
            "## Выборка для сверки",
            "",
            "| slug | kind | Сверять |",
            "|---|---|---|",
            "| `dhampir` | race | next.dnd.su/species/dhampir · ttg dhampir-rhw |",
            "| `hexblood` | race | next.dnd.su/species/hexblood · ttg hexblood-rhw |",
            "| `haunted-one` | background | next.dnd.su backgrounds · ttg haunted-one-rhw |",
            "| `survivor` | feat (origin) | next.dnd.su/feats · ttg survivor-rhw |",
            "| `mist-walker` | feat (dark_gift) | next.dnd.su/feats · ttg mist-walker-rhw |",
            "| `artificer__reanimator` | subclass | next.dnd.su/class/artificer |",
            "| `cleric__grave-domain` | subclass | next.dnd.su/class/cleric |",
            "| `ebonbane` | item + bestiary | next.dnd.su items/bestiary · ttg ebonbane-rhw |",
            "| `strahd-von-zarovich` | bestiary | next.dnd.su · ttg strahd-von-zarovich-rhw |",
            "| `cthulhu` | bestiary | next.dnd.su · ttg cthulhu-rhw |",
            "",
        ]
    )
    LAYER3.write_text("\n".join(lines), encoding="utf-8")


def update_gaps(total: int, skipped: list[str]) -> None:
    note = (
        f"- **P24-C20 (2026-11-16):** Ravenloft RTW live waves — "
        f"**{total}** карточек (цель {C20_TOTAL}). "
        f"`source=rtw` → community_ref. "
        f"Пропусков: {len(skipped)}."
    )
    text = GAPS.read_text(encoding="utf-8") if GAPS.is_file() else ""
    if "P24-C20" in text:
        text = re.sub(
            r"- \*\*P24-C20.*?(?=\n- \*\*P24-|\n## |\Z)",
            note + "\n",
            text,
            count=1,
            flags=re.S,
        )
    else:
        text = text.rstrip() + "\n\n" + note + "\n"
    GAPS.write_text(text, encoding="utf-8")


def update_counts_note(total: int) -> None:
    counts = json.loads(COUNTS.read_text(encoding="utf-8")) if COUNTS.is_file() else {}
    notes = counts.get("notes") or []
    if isinstance(notes, list):
        notes = [n for n in notes if not str(n).startswith("P24-C20:")]
        notes.append(f"P24-C20: RTW live={total} cards (target {C20_TOTAL}).")
        counts["notes"] = notes
    COUNTS.write_text(
        json.dumps(counts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    # Ensure backend import path for entry_id
    sys.path.insert(0, str(REPO / "backend"))
    LIVE.mkdir(parents=True, exist_ok=True)
    outputs: dict[str, dict] = {}
    all_skipped: list[str] = []
    file_counts: dict[str, int] = {}

    outputs["species_rtw.json"] = build_species()
    outputs["feats_rtw.json"] = build_feats()
    outputs["backgrounds_rtw.json"] = build_backgrounds()
    outputs["subclasses_rtw.json"] = build_subclasses()
    outputs["magic_items_rtw.json"] = build_magic_items()
    creatures, skipped = build_creatures()
    outputs["creatures_rtw.json"] = creatures
    all_skipped.extend(skipped)

    feat_slugs = all_feat_slugs()
    for e in outputs["feats_rtw.json"]["entries"]:
        feat_slugs.add(e["slug"])
    for e in outputs["backgrounds_rtw.json"]["entries"]:
        oid = e["data"]["origin_feat"]["id"]
        assert oid in feat_slugs, f"origin feat missing: {oid} ({e['slug']})"

    total = 0
    for fname, payload in outputs.items():
        path = LIVE / fname
        # drop skipped key from creatures payload before write? keep for layer3 only
        to_write = {k: v for k, v in payload.items() if k != "skipped"}
        _assert_no_stubs(to_write, path)
        path.write_text(
            json.dumps(to_write, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        n = len(payload.get("entries") or [])
        file_counts[fname] = n
        total += n
        sk = payload.get("skipped") or []
        print(f"wrote {path.name} entries={n} skipped={len(sk)}")

    for fname, (_cat, exp) in EXPECTED.items():
        got = file_counts.get(fname, 0)
        if got != exp:
            print(f"WARN count mismatch {fname}: got {got} expected {exp}")

    write_layer3(file_counts, all_skipped)
    update_gaps(total, all_skipped)
    update_counts_note(total)
    print(f"TOTAL={total} skipped={len(all_skipped)}")
    if all_skipped:
        print("skipped sample:", all_skipped[:20])


if __name__ == "__main__":
    main()
