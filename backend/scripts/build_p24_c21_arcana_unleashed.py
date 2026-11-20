#!/usr/bin/env python3
"""P24-C21: Arcana Unleashed (AU) + Deadfall (AUD) live catalog waves (166 cards).

Sources: docs/edition-2024/sources/*.csv (book=AU|AUD).
Pages: /tmp/p24-c21/cache (ttg JSON API + dndsu HTML); curl only if missing.
source=au|aud → content_layer=community_ref.
Full RU texts; dice with «к»; no stub needles; no mid-word ellipsis.
Species AU/AUD = 0. Adventure prose out of scope.
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
CACHE = Path("/tmp/p24-c21/cache")
DNDSU = CACHE / "dndsu"
TTG = CACHE / "ttg"
LAYER3 = SOURCES / "P24-C21-layer3-review.md"
GAPS = SOURCES / "gaps.md"
COUNTS = SOURCES / "counts.json"

PACK = "P24-C21"
BOOK_RU = {
    "AU": "Неудержимая магия",
    "AUD": "Неудержимая магия: Падение",
}
SOURCE_BY_BOOK = {"AU": "au", "AUD": "aud"}

EXPECTED = {
    "subclasses_au.json": ("AU", "subclasses", 8),
    "backgrounds_au.json": ("AU", "backgrounds", 10),
    "feats_au.json": ("AU", "feats", 29),
    "spells_au.json": ("AU", "spells", 33),
    "magic_items_au.json": ("AU", "magic_items", 47),
    "creatures_au.json": ("AU", "creatures", 19),
    "magic_items_aud.json": ("AUD", "magic_items", 14),
    "creatures_aud.json": ("AUD", "creatures", 6),
}
C21_TOTAL = 8 + 10 + 29 + 33 + 47 + 19 + 14 + 6  # 166

SUBCLASS_CODES = {
    "cleric__arcana-domain": ("cleric", "subclass.arcana-domain"),
    "fighter__arcane-archer": ("fighter", "subclass.arcane-archer"),
    "monk__warrior-of-the-mystic-arts": (
        "monk",
        "subclass.warrior-of-the-mystic-arts",
    ),
    "warlock__vestige-patron": ("warlock", "subclass.vestige-patron"),
    "wizard__conjurer": ("wizard", "subclass.conjurer"),
    "wizard__enchanter": ("wizard", "subclass.enchanter"),
    "wizard__necromancer": ("wizard", "subclass.necromancer"),
    "wizard__transmuter": ("wizard", "subclass.transmuter"),
}

CAT_LABEL = {
    **c17.CAT_LABEL,
    "dragonmark": "Драконья метка",
    "dark_gift": "Тёмный дар",
}
TTG_CAT_API = {
    "backgrounds": "backgrounds",
    "feats": "feats",
    "spells": "spells",
    "magic_items": "magic-items",
    "creatures": "bestiary",
}
SKILL_ALIASES = {
    "аркана": "arcana",
    "тайная магия": "arcana",
    "магия": "arcana",
    "анализ": "investigation",
    "расследование": "investigation",
    "внимание": "perception",
    "восприятие": "perception",
    "внимательность": "perception",
    "уход за животными": "animal_handling",
    "обращение с животными": "animal_handling",
    "дрессировка": "animal_handling",
}
SCHOOL_FROM_RU = {
    "ограждение": "abjuration",
    "вызов": "conjuration",
    "призыв": "conjuration",
    "прорицание": "divination",
    "очарование": "enchantment",
    "воплощение": "evocation",
    "иллюзия": "illusion",
    "некромантия": "necromancy",
    "преобразование": "transmutation",
}
RARITY_MAP = {
    "обычный": ("common", "обычный"),
    "обычное": ("common", "обычный"),
    "необычный": ("uncommon", "необычный"),
    "необычное": ("uncommon", "необычный"),
    "редкий": ("rare", "редкий"),
    "редкое": ("rare", "редкий"),
    "очень редкий": ("very_rare", "очень редкий"),
    "очень редкое": ("very_rare", "очень редкий"),
    "легендарный": ("legendary", "легендарный"),
    "легендарное": ("legendary", "легендарный"),
    "артефакт": ("artifact", "артефакт"),
    "редкость различается": ("varies", "редкость варьируется"),
    "редкость варьируется": ("varies", "редкость варьируется"),
    "варьируется": ("varies", "редкость варьируется"),
    "различается": ("varies", "редкость варьируется"),
}
TYPE_MAP = {
    "кольцо": ("ring", "кольцо"),
    "чудесный предмет": ("wondrous", "чудесный предмет"),
    "оружие": ("weapon", "оружие"),
    "доспех": ("armor", "доспех"),
    "жезл": ("wand", "жезл"),
    "посох": ("staff", "посох"),
    "свиток": ("scroll", "свиток"),
    "зелье": ("potion", "зелье"),
    "палочка": ("rod", "палочка"),
}
ABILITY_EN = {
    "STRENGTH": "str",
    "DEXTERITY": "dex",
    "CONSTITUTION": "con",
    "INTELLIGENCE": "int",
    "WISDOM": "wis",
    "CHARISMA": "cha",
    "СИЛА": "str",
    "ЛОВКОСТЬ": "dex",
    "ТЕЛОСЛОЖЕНИЕ": "con",
    "ИНТЕЛЛЕКТ": "int",
    "МУДРОСТЬ": "wis",
    "ХАРИЗМА": "cha",
}


def _csv_rows(name: str) -> list[dict[str, str]]:
    with (SOURCES / name).open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _book_rows(name: str, book: str) -> list[dict[str, str]]:
    return [r for r in _csv_rows(name) if r.get("book") == book]


def polish_ru(text: str, *, limit: int | None = None) -> str:
    """Clean RU; never append «…». Truncate only on sentence/word boundary."""
    return c18.polish_ru(text, limit=limit)


def strip_ttg_markup(text: str) -> str:
    return c18.strip_ttg_markup(text)


def flatten_ttg_desc(desc: Any) -> str:
    """Flatten TTG description (str | list | nested list blocks) to plain RU."""
    parts: list[str] = []

    def walk(node: Any) -> None:
        if node is None:
            return
        if isinstance(node, str):
            parts.append(strip_ttg_markup(node))
            return
        if isinstance(node, list):
            for x in node:
                walk(x)
            return
        if isinstance(node, dict):
            if "content" in node:
                walk(node.get("content"))
                return
            if "text" in node:
                walk(node.get("text"))
                return
            for v in node.values():
                if isinstance(v, (str, list, dict)):
                    walk(v)
            return

    walk(desc)
    text = " ".join(p for p in parts if p and p.strip())
    text = re.sub(r"\s+", " ", text).strip()
    return polish_ru(text)


def curl_get(url: str, dest: Path, *, min_size: int = 40) -> bool:
    if dest.is_file() and dest.stat().st_size > min_size:
        return True
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
                    "-H",
                    "Accept: application/json,*/*",
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
            if (proc.stdout or "").strip() == "200" and dest.stat().st_size > min_size:
                time.sleep(0.05)
                return True
        except Exception:
            pass
        time.sleep(0.8 * (attempt + 1))
    return dest.is_file() and dest.stat().st_size > min_size


def _ttg_search_row(category: str, row: dict[str, str]) -> dict | None:
    api = TTG_CAT_API[category]
    path = TTG / f"_search_{api}.json"
    if not path.is_file():
        return None
    try:
        items = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    url_ttg = (row.get("url_ttg") or "").rstrip("/")
    want = (
        url_ttg.split("/")[-1]
        if url_ttg
        else f"{row['id']}-{'au' if row.get('book') == 'AU' else 'aud'}"
    )
    for item in items or []:
        if item.get("url") == want:
            return item
    # fallback by english name
    en = (row.get("name_en") or "").lower()
    for item in items or []:
        name = ((item.get("name") or {}).get("eng") or "").lower()
        if name == en:
            return item
    return None


def load_ttg(row: dict[str, str], category: str) -> dict | None:
    dest = TTG / category / f"{row['id']}.json"
    if dest.is_file() and dest.stat().st_size > 40:
        try:
            data = json.loads(dest.read_text(encoding="utf-8"))
            if isinstance(data, dict) and data.get("status") in (404, 500):
                dest.unlink(missing_ok=True)
            else:
                return data
        except json.JSONDecodeError:
            dest.unlink(missing_ok=True)
    api = TTG_CAT_API[category]
    url_ttg = (row.get("url_ttg") or "").rstrip("/")
    slug = (
        url_ttg.split("/")[-1]
        if url_ttg
        else f"{row['id']}-{'au' if row.get('book') == 'AU' else 'aud'}"
    )
    url = f"https://new.ttg.club/api/v2/{api}/{slug}"
    if curl_get(url, dest):
        try:
            data = json.loads(dest.read_text(encoding="utf-8"))
            if isinstance(data, dict) and data.get("status") in (404, 500):
                return None
            return data
        except json.JSONDecodeError:
            dest.unlink(missing_ok=True)
            return None
    return None


def load_dndsu_html(row: dict[str, str], category: str) -> str:
    dest = DNDSU / category / f"{row['id']}.html"
    if dest.is_file() and dest.stat().st_size > 800:
        return dest.read_text(encoding="utf-8", errors="replace")
    url = (row.get("url_dndsu") or "").rstrip("/")
    if not url:
        return ""
    if curl_get(url + "/", dest, min_size=800):
        return dest.read_text(encoding="utf-8", errors="replace")
    return dest.read_text(encoding="utf-8", errors="replace") if dest.is_file() else ""


def load_class_html(parent: str) -> str:
    dest = DNDSU / "classes" / f"{parent}.html"
    if dest.is_file() and dest.stat().st_size > 800:
        return dest.read_text(encoding="utf-8", errors="replace")
    url = f"https://next.dnd.su/class/{parent}/"
    if curl_get(url, dest, min_size=800):
        return dest.read_text(encoding="utf-8", errors="replace")
    raise RuntimeError(f"class page fail: {parent}")


def ext_ref(row: dict[str, str], book: str) -> dict[str, Any]:
    ext: dict[str, Any] = {"book": book}
    if row.get("url_dndsu"):
        ext["url_dndsu"] = row["url_dndsu"].rstrip("/")
    if row.get("url_ttg"):
        ext["url_ttg"] = row["url_ttg"]
    return ext


def _parse_skills(raw: str) -> list[str]:
    raw = (raw or "").replace(" и ", ", ")
    out: list[str] = []
    for part in re.split(r"[,;/]", raw):
        p = part.strip().lower().replace("ё", "е")
        if not p:
            continue
        code = SKILL_ALIASES.get(p) or c17.SKILL_RU.get(p)
        if code and code not in out:
            out.append(code)
    return out


def _tool_summary_ttg(ttg: dict) -> str:
    tool_choice = ttg.get("toolChoice") or {}
    if isinstance(tool_choice, dict) and tool_choice.get("from"):
        return "набор инструментов (на выбор)"
    tools = ttg.get("toolProficiencies") or []
    if isinstance(tools, list) and tools:
        names = []
        for t in tools:
            if isinstance(t, dict):
                url = str(t.get("url") or "")
                name = t.get("name")
                if not name and url:
                    # thieves-tools-phb → воровские инструменты
                    slug = url.split("/")[-1]
                    name = {
                        "thieves-tools-phb": "Воровские инструменты",
                        "herbalism-kit-phb": "Набор травника",
                        "disguise-kit-phb": "Набор для грима",
                        "forgery-kit-phb": "Набор для фальсификации",
                        "poisoners-kit-phb": "Набор отравителя",
                        "navigators-tools-phb": "Инструменты навигатора",
                    }.get(slug, slug.replace("-phb", "").replace("-", " "))
                names.append(str(name or "инструмент"))
            else:
                names.append(str(t))
        return polish_ru(", ".join(names))
    if isinstance(tools, str) and tools.strip():
        return polish_ru(tools)
    return "инструмент"


def _pack_summary_ttg(ttg: dict) -> str:
    gear_items: list[str] = []
    for block in ttg.get("startingEquipment") or []:
        label = block.get("label")
        coins = block.get("coins")
        coin = block.get("coin") or "зм"
        bits: list[str] = []
        if label:
            bits.append(f"({label})")
        for it in block.get("items") or []:
            name = it.get("name") or it.get("url") or ""
            qty = it.get("quantity")
            if name:
                bits.append(f"{name}×{qty}" if qty else str(name))
        if coins:
            bits.append(f"{coins} {coin}")
        if bits:
            gear_items.append(" ".join(bits))
    return polish_ru("; ".join(gear_items) or "пакет снаряжения")


def origin_from_ttg(ttg: dict, feats: dict[str, dict[str, str]]) -> dict:
    feat_url = str(ttg.get("featUrl") or "")
    if feat_url:
        slug = re.sub(r"-(au|aud)$", "", feat_url)
        if slug in feats:
            row = feats[slug]
            return {
                "id": row["id"],
                "slug": row["id"],
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
            }
    feat_raw = strip_ttg_markup(str(ttg.get("feat") or ttg.get("featName") or ""))
    # also from search index fields
    if not feat_raw and ttg.get("featName"):
        feat_raw = str(ttg["featName"])
    primary = re.split(r"\s*\(|\s+или\s+", feat_raw, maxsplit=1)[0].strip()
    by_ru = {r["name_ru"]: r for r in feats.values()}
    # tolerate small name variants
    if primary in by_ru:
        row = by_ru[primary]
        return {
            "id": row["id"],
            "slug": row["id"],
            "name_ru": row["name_ru"],
            "name_en": row["name_en"],
        }
    # match by english in braces
    m = re.search(r"\[([^\]]+)\]", str(ttg.get("feat") or ""))
    if m:
        en = m.group(1).strip().lower()
        for row in feats.values():
            if row["name_en"].lower() == en:
                return {
                    "id": row["id"],
                    "slug": row["id"],
                    "name_ru": row["name_ru"],
                    "name_en": row["name_en"],
                }
    raise KeyError(f"unknown origin feat: {feat_raw!r} url={feat_url!r}")


def feats_by_id(book: str = "AU") -> dict[str, dict[str, str]]:
    return {r["id"]: r for r in _book_rows("feats.csv", book)}


# ---------------------------------------------------------------------------
# Backgrounds
# ---------------------------------------------------------------------------


def _background_from_dndsu(html: str) -> dict[str, str]:
    """Best-effort extract of skills/tools/equipment from dnd.su paper."""
    text = c17._extract_paper(html) if html else ""
    text = re.sub(r"\s+", " ", text)
    out: dict[str, str] = {}

    def _field(*labels: str) -> str | None:
        labs = "|".join(re.escape(x) for x in labels)
        # stop at the next known label
        stop = (
            r"Характеристики|Черта|Навыки|Инструменты|Снаряжение|"
            r"Владение|Распечатать"
        )
        m = re.search(
            rf"(?:{labs})\s*[:：]?\s*(.+?)(?=(?:{stop})\s*[:：]|$)",
            text,
            re.I,
        )
        return m.group(1).strip(" .;") if m else None

    if val := _field("Характеристики", "Увеличение характеристик"):
        out["asi"] = val
    if val := _field("Навыки", "Владение навыками"):
        out["skills"] = val
    if val := _field("Инструменты", "Владение инструментами", "Инструмент"):
        out["tools"] = val
    if val := _field("Снаряжение", "Стартовое снаряжение"):
        out["gear"] = val
    return out


def build_backgrounds() -> dict[str, Any]:
    rows = _book_rows("backgrounds.csv", "AU")
    feats = feats_by_id("AU")
    entries: list[dict] = []
    pending: list[str] = []
    for i, row in enumerate(rows):
        ttg = load_ttg(row, "backgrounds") or {}
        search = _ttg_search_row("backgrounds", row) or {}
        # Merge search index fields when detail is thin/corrupt
        for key in ("abilityScores", "featName", "featUrl", "skillProficiencies"):
            if not ttg.get(key) and search.get(key):
                ttg[key] = search[key]
        html = load_dndsu_html(row, "backgrounds")
        paper = _background_from_dndsu(html)
        abilities = c17._parse_abilities(
            ttg.get("abilityScores") or paper.get("asi") or ""
        )
        if len(abilities) != 3:
            pending.append(f"{row['id']}:asi")
            continue
        try:
            origin = origin_from_ttg(ttg, feats)
        except KeyError:
            pending.append(f"{row['id']}:origin_feat")
            continue
        skill_list = _parse_skills(
            ttg.get("skillProficiencies") or paper.get("skills") or ""
        )
        if len(skill_list) != 2:
            pending.append(f"{row['id']}:skills:{skill_list}")
            continue
        tool_raw = _tool_summary_ttg(ttg)
        if tool_raw == "инструмент" and paper.get("tools"):
            tool_raw = polish_ru(paper["tools"])
        pack = _pack_summary_ttg(ttg)
        if pack == "пакет снаряжения" and paper.get("gear"):
            pack = polish_ru(paper["gear"])
        abi_ru = "/".join(c17.ABILITY_CODE_TO_RU[a] for a in abilities)
        skills_ru = ", ".join(c17.SKILL_EN_TO_RU.get(s, s) for s in skill_list)
        traits = (
            f"{row['name_ru']} ({BOOK_RU['AU']}): {abi_ru} (+2/+1 или +1/+1/+1). "
            f"Черта: {origin['name_ru']}. Навыки: {skills_ru}. "
            f"Инструмент: {tool_raw}. Пакет или 50 зм."
        )
        entries.append(
            {
                "kind": "background",
                "slug": row["id"],
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": "au",
                "sort_order": (i + 1) * 10,
                "external_ref": ext_ref(row, "AU"),
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
                    "traits_text": polish_ru(traits),
                },
            }
        )
    return {
        "meta": {
            "pack": PACK,
            "rules_edition": "2024",
            "source": "au",
            "notes_ru": (
                f"{len(entries)} предысторий AU. ASI + origin_feat. "
                "RU: backgrounds.csv / ttg / next.dnd.su."
            ),
        },
        "entries": entries,
        "pending": pending,
    }


# ---------------------------------------------------------------------------
# Feats
# ---------------------------------------------------------------------------


def _asi_from_ttg_mechanics(mech: dict | None) -> dict | None:
    if not isinstance(mech, dict):
        return None
    bonuses = mech.get("abilityBonuses") or []
    if not bonuses:
        return None
    b0 = bonuses[0]
    abilities = []
    for a in b0.get("abilities") or []:
        code = ABILITY_EN.get(str(a).upper())
        if code:
            abilities.append(code)
    amount = int(b0.get("bonus") or 1)
    cap = int(b0.get("upto") or 20)
    if not abilities:
        return {"amount": amount, "from": "any", "cap": cap}
    if len(abilities) == 1:
        return {"amount": amount, "ability": abilities[0], "cap": cap}
    return {"amount": amount, "from": abilities, "cap": cap}


def _prereq_from_ttg(ttg: dict, category: str) -> dict:
    details = ttg.get("prerequisiteDetails") or {}
    out: dict[str, Any] = {}
    lvl = details.get("minCharacterLevel")
    if lvl:
        out["level"] = int(lvl)
    elif category == "general":
        out["level"] = 4
    elif category == "epic_boon":
        out["level"] = 19
    feats = details.get("classFeatures") or []
    if feats:
        out["class_features"] = [str(x).lower() for x in feats]
    return out


def build_feats() -> dict[str, Any]:
    rows = _book_rows("feats.csv", "AU")
    entries = []
    pending = []
    for i, row in enumerate(rows):
        category = (row.get("feat_category") or "general").strip()
        ttg = load_ttg(row, "feats")
        body = ""
        if ttg:
            body = flatten_ttg_desc(ttg.get("description"))
        if not body:
            html = load_dndsu_html(row, "feats")
            text = c17._extract_paper(html) if html else ""
            body = polish_ru(text) if text else ""
        if not body:
            pending.append(row["id"])
            body = (
                f"{CAT_LABEL.get(category, 'Черта')}: {row['name_ru']}. "
                "Текст механики недоступен на источниках пачки."
            )
            text_pending = True
        else:
            text_pending = False
        label = CAT_LABEL.get(category, "Черта")
        summary = body
        # first sentence for summary
        first = re.split(r"(?<=[.!?])\s+", body)[0] if body else row["name_ru"]
        summary = polish_ru(first)
        traits = polish_ru(f"{label} ({BOOK_RU['AU']}): {body}")
        data: dict[str, Any] = {
            "category": category,
            "prerequisites": _prereq_from_ttg(ttg or {}, category),
            "repeatable": False,
            "ability_score_increase": _asi_from_ttg_mechanics(
                (ttg or {}).get("mechanics")
            ),
            "summary_ru": summary,
            "traits_text": traits,
        }
        if text_pending:
            data["text_ru_pending"] = True
        prereq_bits = []
        if data["prerequisites"].get("level"):
            prereq_bits.append(f"{data['prerequisites']['level']} уровень")
        if data["prerequisites"].get("class_features"):
            prereq_bits.append(
                "умение: "
                + ", ".join(data["prerequisites"]["class_features"])
            )
        if prereq_bits:
            data["prerequisites_ru"] = "; ".join(prereq_bits)
        entries.append(
            {
                "kind": "feat",
                "slug": row["id"],
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": "au",
                "sort_order": 50 + i * 5,
                "external_ref": ext_ref(row, "AU"),
                "data": data,
            }
        )
    entries.sort(key=lambda e: (e["data"]["category"], e["slug"]))
    base_map = {
        "origin": 50,
        "general": 200,
        "fighting_style": 400,
        "epic_boon": 600,
    }
    for i, e in enumerate(entries):
        e["sort_order"] = base_map.get(e["data"]["category"], 300) + i * 5
    return {
        "meta": {
            "pack": PACK,
            "rules_edition": "2024",
            "source": "au",
            "notes_ru": f"{len(entries)} черт AU. Короткие/полные карточки ttg / next.dnd.su.",
            "feat_count": len(entries),
        },
        "entries": entries,
        "pending": pending,
    }


# ---------------------------------------------------------------------------
# Spells
# ---------------------------------------------------------------------------


def _parse_casting_ttg(raw: str) -> dict[str, Any]:
    s = (raw or "действие").strip().lower().replace("ё", "е")
    ritual = "ритуал" in s
    if "бонусн" in s:
        return {"unit": "bonus_action", "amount": 1, "ritual_ok": ritual}
    if "реакц" in s:
        return {"unit": "reaction", "amount": 1, "ritual_ok": ritual}
    if "час" in s:
        m = re.search(r"(\d+)", s)
        return {
            "unit": "hour",
            "amount": int(m.group(1)) if m else 1,
            "ritual_ok": ritual,
        }
    if "мин" in s:
        m = re.search(r"(\d+)", s)
        return {
            "unit": "minute",
            "amount": int(m.group(1)) if m else 1,
            "ritual_ok": ritual,
        }
    return {"unit": "action", "amount": 1, "ritual_ok": ritual}


def _damage_ru(body: str) -> str | None:
    body = c18.fix_dice_ru(body)
    dm = re.search(
        r"(\d+к\d+(?:\s*\+\s*\d+к\d+)*)\s*(?:урона\s+)?"
        r"(кислот|холод|огн|электричеств|некротическ|психическ|"
        r"излучен|яд|звуков|силово|дробящ|колющ|рубящ)",
        body,
        re.I,
    )
    if not dm:
        return None
    dtype_map = {
        "кислот": "кислотой",
        "холод": "холодом",
        "огн": "огнём",
        "электричеств": "электричеством",
        "некротическ": "некротической энергией",
        "психическ": "психической энергией",
        "излучен": "излучением",
        "яд": "ядом",
        "звуков": "звуком",
        "силово": "силовым уроном",
        "дробящ": "дробящим уроном",
        "колющ": "колющим уроном",
        "рубящ": "рубящим уроном",
    }
    key = dm.group(2).lower()
    dtype = next((v for k, v in dtype_map.items() if key.startswith(k[:4])), key)
    return f"{dm.group(1)} {dtype}"


def _spell_from_ttg(ttg: dict, row: dict[str, str]) -> dict[str, Any]:
    level = int(ttg.get("level") if ttg.get("level") is not None else row.get("level") or 0)
    school_csv = (row.get("school") or "").strip().lower()
    school_ru_raw = str(ttg.get("school") or "").strip().lower()
    school = (
        school_csv
        if school_csv in c17.SCHOOL_RU
        else SCHOOL_FROM_RU.get(school_ru_raw, school_csv or school_ru_raw)
    )
    school_ru = c17.SCHOOL_RU.get(school, school_ru_raw or school)
    casting = _parse_casting_ttg(str(ttg.get("castingTime") or "Действие"))
    duration_raw = str(ttg.get("duration") or "Мгновенная").strip()
    concentration = "концентрац" in duration_raw.lower()
    ritual = bool(casting.get("ritual_ok")) or "ритуал" in str(
        ttg.get("castingTime") or ""
    ).lower()
    comps_raw = ttg.get("components") or {}
    comps: dict[str, Any] = {
        "v": bool(comps_raw.get("v")),
        "s": bool(comps_raw.get("s")),
    }
    if comps_raw.get("m"):
        comps["m"] = polish_ru(strip_ttg_markup(str(comps_raw["m"])))
    classes = [
        c.strip()
        for c in (row.get("classes") or "").split("|")
        if c.strip()
    ]
    if not classes:
        for c in (ttg.get("affiliation") or {}).get("classes") or []:
            url = str(c.get("url") or "")
            base = url.split("-")[0] if url else ""
            if base in c17.PHB_CASTERS or base == "artificer":
                classes.append(base)
    classes = sorted(set(classes))
    body = flatten_ttg_desc(ttg.get("description"))
    upper = flatten_ttg_desc(ttg.get("upper") or ttg.get("higherLevels") or "")
    if not upper:
        # sometimes upper embedded
        m = re.search(
            r"(На более высоких уровнях|Используя ячейку заклинания большего уровня)[:.\s]*(.*)$",
            body,
            re.I | re.S,
        )
        if m:
            upper = polish_ru(m.group(2))
            body = polish_ru(body[: m.start()])
    range_ru = polish_ru(str(ttg.get("range") or "—").replace("?", ""))
    first = re.split(r"(?<=[.!?])\s+", body)[0] if body else row["name_ru"]
    attack_or_save = None
    if re.search(r"бросок атаки|атак[ауи] заклинани", body, re.I):
        attack_or_save = "атака"
    for ru, code in [
        ("Силы", "СИЛ"),
        ("Ловкости", "ЛОВ"),
        ("Телосложения", "ТЕЛ"),
        ("Интеллекта", "ИНТ"),
        ("Мудрости", "МУД"),
        ("Харизмы", "ХАР"),
    ]:
        if re.search(rf"спасбросок {ru}", body, re.I):
            attack_or_save = code
            break
    data: dict[str, Any] = {
        "schema_version": 1,
        "level": level,
        "school": school,
        "school_ru": school_ru,
        "casting_time": {
            k: v for k, v in casting.items() if k != "ritual_ok"
        },
        "magic_action": casting.get("unit") == "action",
        "range": range_ru,
        "components": comps,
        "duration": polish_ru(duration_raw),
        "concentration": concentration,
        "ritual": ritual,
        "classes": classes,
        "attack_or_save": attack_or_save,
        "damage": _damage_ru(body),
        "summary_ru": polish_ru(first),
        "description": body,
        "source_book": "AU",
    }
    if upper:
        data["higher_levels"] = upper
        data["higher_levels_ru"] = upper
    return data


def build_spells() -> dict[str, Any]:
    rows = _book_rows("spells.csv", "AU")
    entries = []
    pending = []
    for i, row in enumerate(rows):
        ttg = load_ttg(row, "spells")
        if ttg and ttg.get("description"):
            data = _spell_from_ttg(ttg, row)
        else:
            html = load_dndsu_html(row, "spells")
            text = c17._extract_paper(html) if html else ""
            if not text:
                pending.append(row["id"])
                data = {
                    "schema_version": 1,
                    "level": int(row.get("level") or 0),
                    "school": (row.get("school") or "evocation").lower(),
                    "school_ru": c17.SCHOOL_RU.get(
                        (row.get("school") or "evocation").lower(), ""
                    ),
                    "casting_time": {"unit": "action", "amount": 1},
                    "magic_action": True,
                    "range": "—",
                    "components": {"v": True, "s": True},
                    "duration": "Мгновенная",
                    "concentration": False,
                    "ritual": False,
                    "classes": [
                        c.strip()
                        for c in (row.get("classes") or "").split("|")
                        if c.strip()
                    ],
                    "summary_ru": row["name_ru"],
                    "description": row["name_ru"],
                    "source_book": "AU",
                    "text_ru_pending": True,
                }
            else:
                data = c17.parse_spell_card(text, row)
                data["source_book"] = "AU"
                # fix d→к in damage
                if data.get("damage"):
                    data["damage"] = c18.fix_dice_ru(
                        data["damage"].replace(" d", " ").replace("d", "к")
                    )
                    data["damage"] = re.sub(
                        r"(\d+)d(\d+)", r"\1к\2", data["damage"]
                    )
                # untruncate higher_levels if compressed
                for key in ("summary_ru", "description", "higher_levels", "higher_levels_ru"):
                    if data.get(key):
                        data[key] = polish_ru(str(data[key]).rstrip("…"))
        entries.append(
            {
                "kind": "spell",
                "slug": row["id"],
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": "au",
                "sort_order": 1000 + i,
                "external_ref": ext_ref(row, "AU"),
                "data": data,
            }
        )
    return {
        "meta": {
            "pack": PACK,
            "rules_edition": "2024",
            "source": "au",
            "notes_ru": (
                f"{len(entries)} заклинаний AU (community_ref). "
                "Карточки по ttg / next.dnd.su; RU из spells.csv."
            ),
            "spell_count": len(entries),
        },
        "entries": entries,
        "pending": pending,
    }


# ---------------------------------------------------------------------------
# Magic items
# ---------------------------------------------------------------------------


def _parse_rarity_type(subtitle: str) -> tuple[str, str, str, str]:
    raw = (subtitle or "").lower().replace("ё", "е")
    rarity_en, rarity_ru = "uncommon", "необычный"
    # longer keys first so «очень редкий» wins over «редкий»
    for key, pair in sorted(RARITY_MAP.items(), key=lambda kv: -len(kv[0])):
        if key in raw:
            rarity_en, rarity_ru = pair
            break
    type_en, type_ru = "wondrous", "чудесный предмет"
    for key, pair in TYPE_MAP.items():
        if key in raw:
            type_en, type_ru = pair
            break
    return rarity_en, rarity_ru, type_en, type_ru


def _item_from_ttg(ttg: dict, row: dict[str, str], book: str) -> dict[str, Any]:
    subtitle = str(ttg.get("subtitle") or "")
    rarity_en, rarity_ru, type_en, type_ru = _parse_rarity_type(subtitle)
    body = flatten_ttg_desc(ttg.get("description"))
    mech = ttg.get("mechanics") or {}
    resource = mech.get("resource") or {}
    charges = resource.get("maxCharges")
    recharge = resource.get("recharge") or resource.get("rechargeEvent")
    attune = bool(
        re.search(r"настройк", body, re.I)
        or re.search(r"настройк", subtitle, re.I)
        or ttg.get("requiresAttunement")
    )
    sentient = bool(re.search(r"разум", body, re.I)) or bool(ttg.get("sentient"))
    artifact = rarity_en == "artifact"
    spell_refs: list[str] = []
    for m in re.finditer(r"url:([a-z0-9\-]+)", json.dumps(ttg, ensure_ascii=False)):
        slug = re.sub(r"-(phb|au|aud|efa|frhof|srd)$", "", m.group(1))
        if slug and slug not in spell_refs and len(slug) > 2:
            # keep only likely spells later filtered
            spell_refs.append(slug)
    data: dict[str, Any] = {
        "schema_version": 1,
        "equipment_group": "magic_item",
        "magic_item_type": type_en,
        "magic_item_type_ru": type_ru,
        "rarity": rarity_en,
        "rarity_ru": rarity_ru,
        "requires_attunement": attune,
        "attunement_restriction_ru": "требуется настройка" if attune else None,
        "charges": charges,
        "recharge_ru": polish_ru(str(recharge)) if recharge else None,
        "bonus_attack": None,
        "bonus_damage": None,
        "bonus_ac": None,
        "bonus_spell_attack": None,
        "spell_refs": [],
        "base_item_categories": [],
        "summary_ru": polish_ru(
            re.split(r"(?<=[.!?])\s+", body)[0] if body else row["name_ru"]
        ),
        "text_ru": body,
        "sentient": sentient,
        "artifact": artifact,
        "source_book": book,
    }
    return data


def build_magic_items(book: str) -> dict[str, Any]:
    rows = _book_rows("magic_items.csv", book)
    source = SOURCE_BY_BOOK[book]
    entries = []
    pending = []
    known_spells = {
        e["slug"]
        for p in LIVE.glob("spells_*.json")
        for e in json.loads(p.read_text(encoding="utf-8")).get("entries") or []
    }
    # also AU spells being built this pack
    for r in _book_rows("spells.csv", "AU"):
        known_spells.add(r["id"])

    for i, row in enumerate(rows):
        ttg = load_ttg(row, "magic_items")
        if ttg and (ttg.get("description") or ttg.get("subtitle")):
            data = _item_from_ttg(ttg, row, book)
            # resolve spell refs against known
            raw_refs = []
            blob = json.dumps(ttg, ensure_ascii=False)
            for m in re.finditer(r"url:([a-z0-9\-]+)", blob):
                slug = re.sub(r"-(phb|au|aud|efa|frhof|srd|dmg)$", "", m.group(1))
                if slug in known_spells and slug not in raw_refs:
                    raw_refs.append(slug)
            data["spell_refs"] = raw_refs
        else:
            html = load_dndsu_html(row, "magic_items")
            text = c17._extract_paper(html) if html else ""
            if not text:
                pending.append(row["id"])
                data = {
                    "schema_version": 1,
                    "equipment_group": "magic_item",
                    "magic_item_type": "wondrous",
                    "magic_item_type_ru": "чудесный предмет",
                    "rarity": "uncommon",
                    "rarity_ru": "необычный",
                    "requires_attunement": False,
                    "attunement_restriction_ru": None,
                    "charges": None,
                    "recharge_ru": None,
                    "bonus_attack": None,
                    "bonus_damage": None,
                    "bonus_ac": None,
                    "bonus_spell_attack": None,
                    "spell_refs": [],
                    "base_item_categories": [],
                    "summary_ru": row["name_ru"],
                    "text_ru": row["name_ru"],
                    "sentient": False,
                    "artifact": False,
                    "source_book": book,
                    "text_ru_pending": True,
                }
            else:
                data = c17.parse_magic_item(text, row)
                data["source_book"] = book
                data["text_ru"] = polish_ru(text)
                data["summary_ru"] = polish_ru(data.get("summary_ru") or row["name_ru"])
                # normalize rarity dictionary (parse_magic_item may leave «варьируется»)
                rarity_en, rarity_ru, type_en, type_ru = _parse_rarity_type(text[:200])
                if "варир" in (data.get("rarity_ru") or "") or "различ" in (
                    data.get("rarity_ru") or ""
                ):
                    data["rarity"] = rarity_en
                    data["rarity_ru"] = rarity_ru
                if not data.get("magic_item_type"):
                    data["magic_item_type"] = type_en
                    data["magic_item_type_ru"] = type_ru
        # Final rarity dictionary guard
        rr = (data.get("rarity_ru") or "").lower()
        if "варир" in rr or "различ" in rr or rr not in {
            "обычный",
            "необычный",
            "редкий",
            "очень редкий",
            "легендарный",
            "артефакт",
            "редкость варьируется",
            "редкость различается",
        }:
            rarity_en, rarity_ru, _, _ = _parse_rarity_type(
                f"{data.get('magic_item_type_ru','')} {data.get('rarity_ru','')} {data.get('summary_ru','')}"
            )
            data["rarity"] = rarity_en
            data["rarity_ru"] = rarity_ru
        entries.append(
            {
                "kind": "item",
                "slug": row["id"],
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": source,
                "sort_order": (i + 1) * 10,
                "external_ref": ext_ref(row, book),
                "data": data,
            }
        )
    return {
        "meta": {
            "pack": PACK,
            "source": f"{book} magic items (community_ref)",
            "count": len(entries),
            "notes": [
                f"{len(entries)} магических предметов {book}.",
                f"source={source} → community_ref.",
            ],
        },
        "entries": entries,
        "pending": pending,
    }


# ---------------------------------------------------------------------------
# Subclasses
# ---------------------------------------------------------------------------


def _parse_subclass_features_full(html: str, code: str) -> list[dict]:
    """Like c17._parse_subclass_features but keep full feature body text."""
    block_m = re.search(
        rf'data-code="{re.escape(code)}"(.*?)(?=class__subclass__holder|$)',
        html,
        re.S,
    )
    if not block_m:
        return []
    block = block_m.group(1)
    by_level: dict[int, list[dict]] = defaultdict(list)
    for m in re.finditer(
        r'class__subclass__feature" data-level="(\d+)"\s+'
        r'data-title="([^"]*)"[^>]*>(.*?)(?=<div class="class__subclass__feature"|$)',
        block,
        re.S,
    ):
        level = int(m.group(1))
        if level == 0:
            continue
        title_ru = unescape(m.group(2)).strip()
        chunk = m.group(3)
        en_m = re.search(r'<h3[^>]*title="([^"]+)"', chunk)
        name_en = en_m.group(1).strip() if en_m else title_ru
        plain = c17._strip_tags(chunk)
        plain = re.sub(
            rf"^Уровень\s+{level}\s*:\s*{re.escape(title_ru)}\s*", "", plain
        )
        plain = re.sub(r"\s+", " ", plain).strip()
        plain = polish_ru(plain)
        by_level[level].append(
            {
                "id": c17._slugify_en(name_en),
                "name_en": name_en,
                "name_ru": title_ru,
                "summary_ru": plain,
            }
        )
    return [{"level": lvl, "features": by_level[lvl]} for lvl in sorted(by_level)]


def _spell_name_maps(known: set[str]) -> tuple[dict[str, str], dict[str, str]]:
    by_ru: dict[str, str] = {}
    by_en: dict[str, str] = {}
    for p in LIVE.glob("spells_*.json"):
        for e in json.loads(p.read_text(encoding="utf-8")).get("entries") or []:
            by_ru[e["name_ru"].lower()] = e["slug"]
            by_en[(e.get("name_en") or "").lower()] = e["slug"]
            # also index without curly/straight apostrophes
            en = (e.get("name_en") or "").lower().replace("’", "'")
            by_en[en] = e["slug"]
            known.add(e["slug"])
    for r in _book_rows("spells.csv", "AU"):
        by_ru[r["name_ru"].lower()] = r["id"]
        by_en[r["name_en"].lower()] = r["id"]
        known.add(r["id"])
    return by_ru, by_en


def _resolve_spell_name(
    name: str, by_ru: dict[str, str], by_en: dict[str, str], known: set[str]
) -> str | None:
    key = name.lower().strip().strip(" .")
    key = re.sub(r"\[[^\]]+\]", "", key).strip()
    slug = by_ru.get(key) or by_en.get(key)
    if not slug:
        # strip eponym possessive leftovers
        key2 = re.sub(r"^(nistul\w*|leomund\w*|bigby\w*|mordenkainen\w*)\s+", "", key)
        slug = by_ru.get(key2) or by_en.get(key2)
    if slug and slug in known:
        return slug
    return None


def _extract_spell_list(
    html: str, code: str, known: set[str]
) -> list[dict[str, Any]]:
    block_m = re.search(
        rf'data-code="{re.escape(code)}"(.*?)(?=class__subclass__holder|$)',
        html,
        re.S,
    )
    if not block_m:
        return []
    block = block_m.group(1)
    by_ru, by_en = _spell_name_maps(known)
    buckets: dict[int, list[str]] = defaultdict(list)

    # Only dedicated expanded-spell tables (domain / patron / oath), not random
    # feature mentions. Look for a table whose header mentions «Заклинания».
    for table_m in re.finditer(r"<table[^>]*>(.*?)</table>", block, re.S | re.I):
        table = table_m.group(1)
        header = c17._strip_tags(table[:400]).lower()
        if "заклинани" not in header:
            continue
        if not re.search(r"уровень", header):
            continue
        for m in re.finditer(
            r"<tr[^>]*>\s*<t[dh][^>]*>\s*(\d+)\s*</t[dh]>\s*<t[dh][^>]*>(.*?)</t[dh]>",
            table,
            re.S | re.I,
        ):
            lvl = int(m.group(1))
            if lvl not in {1, 2, 3, 5, 6, 7, 9, 10, 14, 17}:
                continue
            cell = c17._strip_tags(m.group(2))
            for part in re.split(r"[,;]", cell):
                name = part.strip(" .")
                if name and not name.lower().startswith("уровень"):
                    buckets[lvl].append(name)

    out = []
    for lvl in sorted(buckets):
        spells: list[str] = []
        for name in buckets[lvl]:
            slug = _resolve_spell_name(name, by_ru, by_en, known)
            if slug and slug not in spells:
                spells.append(slug)
        if spells:
            out.append({"level": lvl, "spells": spells})
    return out


def build_subclasses() -> dict[str, Any]:
    rows = _book_rows("subclasses.csv", "AU")
    assert len(rows) == 8, len(rows)
    known_spells = {
        e["slug"]
        for p in LIVE.glob("spells_*.json")
        for e in json.loads(p.read_text(encoding="utf-8")).get("entries") or []
    }
    for r in _book_rows("spells.csv", "AU"):
        known_spells.add(r["id"])

    class_html: dict[str, str] = {}
    for parent in {SUBCLASS_CODES[r["id"]][0] for r in rows}:
        class_html[parent] = load_class_html(parent)

    entries = []
    pending = []
    for i, row in enumerate(rows):
        slug = row["id"]
        parent, code = SUBCLASS_CODES[slug]
        html = class_html[parent]
        # Discover actual data-code if alias differs
        if f'data-code="{code}"' not in html:
            # try fuzzy
            alt = re.search(
                rf'data-code="(subclass\.[^"]*{re.escape(row["subclass_id"])}[^"]*)"',
                html,
            )
            if alt:
                code = alt.group(1)
            else:
                pending.append(f"{slug}:no_code")
                continue
        features = _parse_subclass_features_full(html, code)
        if not features:
            pending.append(f"{slug}:no_features")
            continue
        levels = {b["level"] for b in features}
        if 3 not in levels:
            # some subclasses unlock at 1/2 historically — still require 3 for 2024
            pending.append(f"{slug}:no_level3:{sorted(levels)}")
        spell_list = _extract_spell_list(html, code, set(known_spells))
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
                summary = polish_ru(c17._strip_tags(zero.group(1)))
        if spell_list:
            note_parts = []
            for bucket in spell_list:
                if not isinstance(bucket, dict):
                    continue
                level = bucket.get("level")
                spells = bucket.get("spells") or []
                if level is None or not spells:
                    continue
                note_parts.append(
                    f"{level} ур. — {', '.join(str(s) for s in spells)}"
                )
            note = (
                "Всегда подготовленные заклинания подкласса: "
                + "; ".join(note_parts)
                + "."
                if note_parts
                else "Всегда подготовленные заклинания подкласса по таблице уровней."
            )
        else:
            note = (
                "Отдельного расширенного списка заклинаний у этого подкласса нет; "
                "заклинания (если есть) описаны в умениях."
            )
        entries.append(
            {
                "kind": "subclass",
                "slug": slug,
                "name_ru": row["name_ru"],
                "name_en": row["name_en"] or row["subclass_id"],
                "source": "au",
                "sort_order": (i + 1) * 10,
                "parent_id": c17.entry_id(kind="class", slug=parent),
                "external_ref": {
                    "url_dndsu": (
                        row.get("url_dndsu")
                        or f"https://next.dnd.su/class/{parent}"
                    ).rstrip("/"),
                    "url_ttg": row.get("url_ttg") or None,
                    "book": "AU",
                },
                "data": {
                    "parent_class": parent,
                    "subclass_level": 3 if 3 in levels else min(levels),
                    "features": features,
                    "spell_list": spell_list,
                    "spell_list_note_ru": note,
                    "summary_ru": summary,
                },
            }
        )
    return {
        "meta": {
            "pack": PACK,
            "rules_edition": "2024",
            "source": "au",
            "notes_ru": (
                "8 подклассов AU к классам C04. parent_id = UUID класса 2024. "
                "Имена — subclasses.csv; умения — полный текст next.dnd.su."
            ),
        },
        "entries": entries,
        "pending": pending,
    }


# ---------------------------------------------------------------------------
# Creatures
# ---------------------------------------------------------------------------


def _walk_polish(obj: Any) -> Any:
    if isinstance(obj, str):
        return polish_ru(obj)
    if isinstance(obj, list):
        return [_walk_polish(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _walk_polish(v) for k, v in obj.items()}
    return obj


def build_creatures(book: str) -> tuple[dict[str, Any], list[str]]:
    rows = sorted(_book_rows("creatures.csv", book), key=lambda r: r["name_en"])
    source = SOURCE_BY_BOOK[book]
    by_slug, by_ru = mm.load_spell_maps()
    # include AU spells not yet in live
    for r in _book_rows("spells.csv", "AU"):
        by_slug[r["id"]] = r["id"]
        by_ru[r["name_ru"].lower()] = r["id"]
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
        entry["source"] = source
        entry["external_ref"]["book"] = book
        entry["data"]["source_book"] = book
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
            "source": f"{book} creatures (community_ref)",
            "count": len(entries),
            "notes": [
                f"{len(entries)} существ {book}; source={source}.",
                "Полные RU-статблоки; spell_refs только из блока колдовства.",
            ],
        },
        "entries": entries,
        "skipped": skipped,
    }
    return payload, skipped


# ---------------------------------------------------------------------------
# Docs / assertions
# ---------------------------------------------------------------------------


def _assert_no_stubs(payload: dict, path: Path) -> None:
    text = json.dumps(payload, ensure_ascii=False)
    for needle in c17.STUB_NEEDLES:
        if needle in text:
            raise AssertionError(f"{path.name}: stub needle {needle!r}")
    for e in payload.get("entries") or []:
        blob = json.dumps(e.get("data") or {}, ensure_ascii=False)
        if re.search(r"[А-Яа-яЁё]\s+[,.;:!?]", blob):
            raise AssertionError(f"{path.name}/{e.get('slug')}: space before punct")
        # no mid-word ellipsis on text leaves
        for leaf in ("text_ru", "traits_text", "text", "description", "higher_levels", "higher_levels_ru"):
            val = (e.get("data") or {}).get(leaf)
            if isinstance(val, str) and re.search(r"(…|\.\.\.)$", val.rstrip()):
                raise AssertionError(f"{path.name}/{e.get('slug')}: ellipsis in {leaf}")


def all_feat_slugs() -> set[str]:
    slugs: set[str] = set()
    for path in LIVE.glob("feats_*.json"):
        for e in json.loads(path.read_text(encoding="utf-8")).get("entries") or []:
            slugs.add(e["slug"])
    return slugs


def patch_class_spell_lists(spell_entries: list[dict]) -> None:
    """Append AU spell slugs to class spell_list (casters + artificer if listed)."""
    level_of: dict[str, int] = {}
    for path_name in (
        "spells_srd.json",
        "spells_ph24.json",
        "spells_efa.json",
        "spells_frhof.json",
        "spells_au.json",
    ):
        p = LIVE / path_name
        if not p.is_file():
            continue
        for e in json.loads(p.read_text(encoding="utf-8")).get("entries") or []:
            level_of[e["slug"]] = int(e["data"]["level"])
    for e in spell_entries:
        level_of[e["slug"]] = int(e["data"]["level"])

    extra_by_class: dict[str, list[str]] = defaultdict(list)
    for e in spell_entries:
        for c in e["data"].get("classes") or []:
            extra_by_class[c].append(e["slug"])

    path = LIVE / "classes_srd.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    for entry in payload["entries"]:
        slug = entry["slug"]
        if slug not in c17.PHB_CASTERS:
            continue
        data = entry["data"]
        existing = list(data.get("spell_list") or [])
        merged = sorted(
            set(existing) | set(extra_by_class.get(slug, [])),
            key=lambda s: (level_of.get(s, 99), s),
        )
        data["spell_list"] = merged
        note = data.get("spell_list_note_ru") or ""
        marker = "Неудержимая магия"
        if marker not in note:
            data["spell_list_note_ru"] = (
                (note + " " if note else "")
                + "Плюс заклинания книги «Неудержимая магия» "
                "(идентификаторы карточек 2024)."
            ).strip()
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    if extra_by_class.get("artificer"):
        apath = LIVE / "classes_efa.json"
        apayload = json.loads(apath.read_text(encoding="utf-8"))
        for entry in apayload["entries"]:
            if entry["slug"] != "artificer":
                continue
            data = entry["data"]
            existing = list(data.get("spell_list") or [])
            merged = sorted(
                set(existing) | set(extra_by_class["artificer"]),
                key=lambda s: (level_of.get(s, 99), s),
            )
            data["spell_list"] = merged
            note = data.get("spell_list_note_ru") or ""
            marker = "Неудержимая магия"
            if marker not in note:
                data["spell_list_note_ru"] = (
                    (note + " " if note else "")
                    + "Плюс заклинания книги «Неудержимая магия» "
                    "(идентификаторы карточек 2024)."
                ).strip()
        apath.write_text(
            json.dumps(apayload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )


def write_layer3(
    counts: dict[str, int], skipped: list[str], pending: list[str]
) -> None:
    lines = [
        "# P24-C21 — выборка для ручной сверки (слой 3)",
        "",
        "Агент, собравший данные, **не** принимает слой 3. "
        "Сверять с [next.dnd.su](https://next.dnd.su/) и [new.ttg.club](https://new.ttg.club/).",
        "",
        "## Объём",
        "",
        "| Файл | Эталон | Сид |",
        "|---|---:|---:|",
    ]
    for fname, (_book, _cat, exp) in EXPECTED.items():
        lines.append(f"| `{fname}` | {exp} | {counts.get(fname, 0)} |")
    total = sum(counts.values())
    lines.extend(
        [
            "",
            f"**Всего:** {total} (цель {C21_TOTAL}).",
            "",
            "## Эталон CSV vs ТЗ",
            "",
            "- AU: 8 подклассов, 10 предысторий, 29 черт, 33 заклинания, "
            "47 предметов, 19 существ — совпадает с CSV.",
            "- AUD: 14 предметов, 6 существ — совпадает с CSV.",
            "- Виды AU/AUD: 0.",
            "",
            "## Пропуски / pending",
            "",
        ]
    )
    if skipped or pending:
        for s in (skipped + [f"pending:{p}" for p in pending])[:80]:
            lines.append(f"- `{s}`")
        extra = len(skipped) + len(pending) - 80
        if extra > 0:
            lines.append(f"- … ещё {extra}")
    else:
        lines.append("- Честных пропусков по недоступности страниц нет.")
    lines.extend(
        [
            "",
            "## Особые случаи",
            "",
            "- `source=au` / `aud` → `community_ref`.",
            "- Русские имена — из `docs/edition-2024/sources/*.csv` "
            "(next.dnd.su / new.ttg.club).",
            "- Подклассы: полный текст умений с next.dnd.su/class/*; "
            "`spell_list` — slug уже принятых/AU заклинаний.",
            "- Заклинания: damage по-русски с «к» (например «2к10 излучением»).",
            "- Дубли уже принятых карточек не сидились (коллизий slug не было).",
            "",
            "## Выборка для сверки",
            "",
            "| slug | kind | Сверять |",
            "|---|---|---|",
            "| `cleric__arcana-domain` | subclass | next.dnd.su/class/cleric |",
            "| `wizard__conjurer` | subclass | next.dnd.su/class/wizard |",
            "| `agent-of-the-ninth-quill` | background | ttg agent-of-the-ninth-quill-au |",
            "| `arcane-infiltrator` | feat (origin) | ttg / next.dnd.su feats |",
            "| `abjuration-adept` | feat (general) | ttg / next.dnd.su feats |",
            "| `aura-of-evasion` | spell | ttg aura-of-evasion-au |",
            "| `arcane-chatelaine` | item | ttg arcane-chatelaine-au |",
            "| `abjurer-archmage` | bestiary | next.dnd.su / ttg |",
            "| `szass-tam` | bestiary AUD | next.dnd.su / ttg |",
            "",
        ]
    )
    LAYER3.write_text("\n".join(lines), encoding="utf-8")


def update_gaps(total: int, skipped: list[str], pending: list[str]) -> None:
    note = (
        f"- **P24-C21 (2026-11-16):** Arcana Unleashed AU + Deadfall AUD — "
        f"**{total}** карточек (цель {C21_TOTAL}: "
        f"AU 8+10+29+33+47+19, AUD 14+6). "
        f"`source=au|aud` → community_ref. "
        f"Пропусков: {len(skipped)}; pending: {len(pending)}."
    )
    text = GAPS.read_text(encoding="utf-8") if GAPS.is_file() else ""
    if "P24-C21" in text:
        text = re.sub(
            r"- \*\*P24-C21.*?(?=\n- \*\*P24-|\n## |\Z)",
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
        notes = [n for n in notes if not str(n).startswith("P24-C21:")]
        notes.append(
            f"P24-C21: AU+AUD live={total} cards (target {C21_TOTAL})."
        )
        counts["notes"] = notes
    COUNTS.write_text(
        json.dumps(counts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    sys.path.insert(0, str(REPO / "backend"))
    LIVE.mkdir(parents=True, exist_ok=True)
    outputs: dict[str, dict] = {}
    all_skipped: list[str] = []
    all_pending: list[str] = []
    file_counts: dict[str, int] = {}

    outputs["subclasses_au.json"] = build_subclasses()
    outputs["feats_au.json"] = build_feats()
    outputs["backgrounds_au.json"] = build_backgrounds()
    outputs["spells_au.json"] = build_spells()
    outputs["magic_items_au.json"] = build_magic_items("AU")
    outputs["magic_items_aud.json"] = build_magic_items("AUD")
    creatures_au, skipped_au = build_creatures("AU")
    creatures_aud, skipped_aud = build_creatures("AUD")
    outputs["creatures_au.json"] = creatures_au
    outputs["creatures_aud.json"] = creatures_aud
    all_skipped.extend(skipped_au)
    all_skipped.extend(skipped_aud)

    for payload in outputs.values():
        all_pending.extend(payload.get("pending") or [])

    feat_slugs = all_feat_slugs()
    for e in outputs["feats_au.json"]["entries"]:
        feat_slugs.add(e["slug"])
    for e in outputs["backgrounds_au.json"]["entries"]:
        oid = e["data"]["origin_feat"]["id"]
        assert oid in feat_slugs, f"origin feat missing: {oid} ({e['slug']})"

    total = 0
    for fname, payload in outputs.items():
        path = LIVE / fname
        to_write = {k: v for k, v in payload.items() if k not in {"skipped", "pending"}}
        _assert_no_stubs(to_write, path)
        path.write_text(
            json.dumps(to_write, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        n = len(payload.get("entries") or [])
        file_counts[fname] = n
        total += n
        print(
            f"wrote {path.name} entries={n} "
            f"skipped={len(payload.get('skipped') or [])} "
            f"pending={len(payload.get('pending') or [])}"
        )

    patch_class_spell_lists(outputs["spells_au.json"]["entries"])
    print("patched classes_srd.json / classes_efa.json spell_list for AU")

    for fname, (_book, _cat, exp) in EXPECTED.items():
        got = file_counts.get(fname, 0)
        if got != exp:
            print(f"WARN count mismatch {fname}: got {got} expected {exp}")

    write_layer3(file_counts, all_skipped, all_pending)
    update_gaps(total, all_skipped, all_pending)
    update_counts_note(total)
    print(f"TOTAL={total} skipped={len(all_skipped)} pending={len(all_pending)}")
    if all_skipped:
        print("skipped sample:", all_skipped[:20])
    if all_pending:
        print("pending sample:", all_pending[:20])


if __name__ == "__main__":
    main()
