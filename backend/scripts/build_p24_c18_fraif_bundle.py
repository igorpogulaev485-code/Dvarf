#!/usr/bin/env python3
"""P24-C18: FRAiF + ABH + LFL + NsF live catalog waves (111 cards).

Sources: docs/edition-2024/sources/*.csv (book in FRAiF, ABH, LFL, NsF).
Pages: /tmp/p24-c18/cache (dndsu HTML + ttg JSON); curl only if missing.
source=fraif|abh|lfl|nsf → content_layer=community_ref. Short RU only.
"""

from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
import time
from collections import Counter
from html import unescape
from pathlib import Path
from typing import Any

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

import build_p24_c13_monsters_mm_w1 as mm  # noqa: E402
from scrape_p24_c13_monsters import parse_page  # noqa: E402

import build_p24_c17_frhof as c17  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "docs" / "edition-2024" / "sources"
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"
CACHE = Path("/tmp/p24-c18/cache")
DNDSU = CACHE / "dndsu"
TTG = CACHE / "ttg"
LAYER3 = SOURCES / "P24-C18-layer3-review.md"
GAPS = SOURCES / "gaps.md"
COUNTS = SOURCES / "counts.json"

PACK = "P24-C18"
BOOKS = ("FRAiF", "ABH", "LFL", "NsF")
SOURCE_BY_BOOK = {
    "FRAiF": "fraif",
    "ABH": "abh",
    "LFL": "lfl",
    "NsF": "nsf",
}
BOOK_RU = {
    "FRAiF": "Приключения в Фаэруне",
    "ABH": "Книга голода Астариона",
    "LFL": "Первый свет Лорвина",
    "NsF": "Падение Нетерила",
}
EXPECTED = {
    "creatures_fraif.json": ("FRAiF", "creatures", 40),
    "magic_items_fraif.json": ("FRAiF", "magic_items", 12),
    "backgrounds_abh.json": ("ABH", "backgrounds", 3),
    "feats_abh.json": ("ABH", "feats", 16),
    "creatures_abh.json": ("ABH", "creatures", 5),
    "species_lfl.json": ("LFL", "species", 7),
    "backgrounds_lfl.json": ("LFL", "backgrounds", 2),
    "feats_lfl.json": ("LFL", "feats", 2),
    "creatures_lfl.json": ("LFL", "creatures", 8),
    "magic_items_nsf.json": ("NsF", "magic_items", 8),
    "creatures_nsf.json": ("NsF", "creatures", 8),
}

SPECIES_TYPE_RU = {
    "гуманоид": "humanoid",
    "фея": "fey",
    "аберрация": "aberration",
    "элементаль": "elemental",
    "зверь": "beast",
    "небожитель": "celestial",
    "конструкт": "construct",
    "исчадие": "fiend",
}
SIZE_RU_MAP = {
    "крошеч": "tiny",
    "маленьк": "small",
    "средн": "medium",
    "больш": "large",
    "огромн": "huge",
    "гигантск": "gargantuan",
}


def _csv_rows(name: str) -> list[dict[str, str]]:
    with (SOURCES / name).open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _book_rows(name: str, book: str) -> list[dict[str, str]]:
    return [r for r in _csv_rows(name) if r.get("book") == book]


def _norm(s: str) -> str:
    return (s or "").lower().replace("ё", "е").strip()


def fix_dice_ru(text: str) -> str:
    if not text:
        return text
    t = re.sub(r"(\d+)\s*[dD]\s*(\d+)", r"\1к\2", text)
    t = re.sub(r"(\d+)\s*D\s*(\d+)", r"\1к\2", t)
    return t


def polish_ru(text: str, *, limit: int | None = None) -> str:
    t = c17._compress_ru(fix_dice_ru(text))
    t = mm.clean_ru_text(t)
    t = re.sub(r";\.", ";", t)
    t = re.sub(r"\.;", ".", t)
    if limit and len(t) > limit:
        return t[: limit - 1].rstrip() + "…"
    return t


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
    if dest.is_file():
        return json.loads(dest.read_text(encoding="utf-8"))
    return None


def strip_ttg_markup(text: str) -> str:
    """Keep visible label from {@tag Label|…} / {@tag Label}; drop tag chrome."""

    def _tag_label(m: re.Match[str]) -> str:
        inner = m.group(1)
        # {@spell Огонь фей [Faerie Fire]|url:…} → Огонь фей
        if "|" in inner:
            inner = inner.split("|", 1)[0]
        # drop leading tag name
        parts = inner.split(None, 1)
        if len(parts) == 2 and parts[0].isalpha() and parts[0].islower():
            label = parts[1]
        else:
            label = inner
        label = re.sub(r"\[[^\]]*\]", "", label).strip()
        return label

    t = text or ""
    t = re.sub(r"\{@([^}]+)\}", _tag_label, t)
    t = re.sub(r"\{[^{}]*\}", "", t)
    t = unescape(t)
    t = re.sub(r"\s+", " ", t).strip()
    return polish_ru(t)


def feat_catalog_for_origins() -> dict[str, dict[str, str]]:
    """name_ru → row from ABH+LFL feats.csv (and built slugs)."""
    out: dict[str, dict[str, str]] = {}
    for book in ("ABH", "LFL"):
        for row in _book_rows("feats.csv", book):
            out[row["name_ru"].strip()] = row
            short = re.sub(r"\s*\([^)]*\)\s*$", "", row["name_ru"]).strip()
            if short:
                out[short] = row
    return out


def origin_feat_from_text(feat_raw: str, feat_by_ru: dict[str, dict[str, str]]) -> dict:
    feat_raw = re.sub(r"\s+", " ", feat_raw or "").strip()
    feat_raw = re.sub(r"\[.*?\]", "", feat_raw).strip()
    for key in (feat_raw, re.sub(r"\s*\([^)]*\)\s*$", "", feat_raw).strip()):
        if key in feat_by_ru:
            row = feat_by_ru[key]
            return {
                "id": row["id"],
                "slug": row["id"],
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
            }
    raise KeyError(f"unknown origin feat: {feat_raw!r}")


def build_backgrounds(book: str) -> dict[str, Any]:
    source = SOURCE_BY_BOOK[book]
    rows = _book_rows("backgrounds.csv", book)
    feat_by_ru = feat_catalog_for_origins()
    entries: list[dict] = []
    for i, row in enumerate(rows):
        html = load_dndsu_html(row, "backgrounds")
        text = c17._extract_paper(html) if html else ""
        ab = re.search(r"Характеристики:\s*([^\n]+)", text)
        feat = re.search(r"Черта:\s*([^\n]+)", text)
        skills = re.search(r"Навыки:\s*([^\n]+)", text)
        tools = re.search(r"Инструменты:\s*([^\n]+)", text)
        gear = re.search(r"Снаряжение:\s*([^\n]+)", text)
        if not (ab and feat and skills and tools and gear):
            raise RuntimeError(f"background parse failed: {row['id']}")
        abilities = c17._parse_abilities(ab.group(1))
        assert len(abilities) == 3, (row["id"], abilities)
        origin = origin_feat_from_text(feat.group(1), feat_by_ru)
        skill_list = c17._parse_skills(skills.group(1))
        assert len(skill_list) == 2, (row["id"], skill_list)
        tool_raw = polish_ru(tools.group(1).strip())
        pack = polish_ru(gear.group(1).strip(), limit=280)
        abi_ru = "/".join(c17.ABILITY_CODE_TO_RU[a] for a in abilities)
        skills_ru = ", ".join(
            c17.SKILL_EN_TO_RU.get(s, s) for s in skill_list
        )
        traits = (
            f"{row['name_ru']} ({BOOK_RU[book]}): {abi_ru} (+2/+1 или +1/+1/+1). "
            f"Черта: {origin['name_ru']}. Навыки: {skills_ru}. "
            f"Инструмент: {tool_raw}. Пакет или 50 зм."
        )
        traits = polish_ru(traits, limit=420)
        ext: dict[str, Any] = {"book": book}
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
                "source": source,
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
            "source": source,
            "notes_ru": (
                f"{len(entries)} предысторий {book}. ASI + origin_feat. "
                f"RU: backgrounds.csv / next.dnd.su."
            ),
        },
        "entries": entries,
    }


def build_feats(book: str) -> dict[str, Any]:
    source = SOURCE_BY_BOOK[book]
    rows = _book_rows("feats.csv", book)
    entries = []
    for i, row in enumerate(rows):
        html = load_dndsu_html(row, "feats")
        text = c17._extract_paper(html) if html else ""
        if not text:
            text = f"{row['name_ru']} [{row.get('name_en') or ''}]"
        data = c17.parse_feat_card(text, row)
        for key in ("summary_ru", "traits_text", "prerequisites_ru"):
            if data.get(key):
                data[key] = polish_ru(data[key], limit=320 if key == "summary_ru" else 360)
        book_ru = BOOK_RU[book]
        # Book tag in traits_text (C17 parse stamps «Герои Фаэруна»)
        data["traits_text"] = re.sub(
            r"\(Герои Фаэруна\)",
            f"({book_ru})",
            data.get("traits_text") or "",
        )
        if f"({book_ru})" not in (data.get("traits_text") or ""):
            label = c17.CAT_LABEL.get(data["category"], "Черта")
            data["traits_text"] = polish_ru(
                f"{label} ({book_ru}): {data.get('summary_ru', row['name_ru'])}",
                limit=360,
            )
        ext: dict[str, Any] = {"book": book}
        if row.get("url_dndsu"):
            ext["url_dndsu"] = row["url_dndsu"].rstrip("/")
        if row.get("url_ttg"):
            ext["url_ttg"] = row["url_ttg"]
        cat = data["category"]
        sort_base = {
            "origin": 50,
            "general": 200,
            "fighting_style": 400,
            "epic_boon": 600,
        }.get(cat, 300)
        entries.append(
            {
                "kind": "feat",
                "slug": row["id"],
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": source,
                "sort_order": sort_base + i,
                "external_ref": ext,
                "data": data,
            }
        )
    entries.sort(key=lambda e: (e["data"]["category"], e["slug"]))
    for i, e in enumerate(entries):
        base = {
            "origin": 50,
            "general": 200,
            "fighting_style": 400,
            "epic_boon": 600,
        }.get(e["data"]["category"], 300)
        e["sort_order"] = base + i * 5
    return {
        "meta": {
            "pack": PACK,
            "rules_edition": "2024",
            "source": source,
            "notes_ru": f"{len(entries)} черт {book}. Короткие карточки next.dnd.su.",
            "feat_count": len(entries),
        },
        "entries": entries,
    }


def parse_species_dndsu(html: str, row: dict[str, str]) -> dict[str, Any]:
    text = c17._strip_tags(html)
    creature_type = "humanoid"
    size = "medium"
    speed = 30
    size_options: list[str] = []
    darkvision = None
    for m in re.finditer(
        r"<li><b>(Тип существа|Размер|Скорость)</b>:\s*([^<]+)</li>",
        html,
        re.I,
    ):
        label, val = m.group(1).lower(), unescape(m.group(2)).strip()
        if "тип" in label:
            low = _norm(val.split(",")[0])
            for ru, en in SPECIES_TYPE_RU.items():
                if ru in low:
                    creature_type = en
                    break
        elif "размер" in label:
            for stem, key in SIZE_RU_MAP.items():
                if stem in _norm(val):
                    size = key
                    size_options.append(key)
            if "или" in _norm(val):
                if "маленьк" in _norm(val):
                    size_options.append("small")
                if "средн" in _norm(val):
                    size_options.append("medium")
        elif "скорость" in label:
            sm = re.search(r"(\d+)", val)
            if sm:
                speed = int(sm.group(1))
    if not size_options:
        size_options = [size]
    traits: list[str] = []
    trait_bits: list[str] = []
    for m in re.finditer(
        r"article-body__feature-name'[^>]*id=\"([^\"]+)\"[^>]*>"
        r"([^<]+)</span>\.\s*(.*?)</p>",
        html,
        re.S | re.I,
    ):
        tid = m.group(1).strip()
        name_ru = unescape(m.group(2)).strip()
        body = c17._strip_tags(m.group(3))
        body = polish_ru(body, limit=160)
        traits.append(tid)
        trait_bits.append(f"{name_ru}: {body}" if body else name_ru)
    if "darkvision" in traits or re.search(r"Тёмн\w+ зрен", html, re.I):
        dm = re.search(r"(\d+)\s*фут", html)
        if dm:
            darkvision = int(dm.group(1))
    type_word = creature_type
    size_slash = "/".join(dict.fromkeys(size_options))
    traits_text = (
        f"{row['name_ru']} ({row.get('book') or 'LFL'}): "
        f"{type_word}, {size_slash}, {speed} фт. "
        + " ".join(trait_bits[:5])
    )
    traits_text = polish_ru(traits_text, limit=520)
    return {
        "creature_type": creature_type,
        "size": size,
        "size_options": list(dict.fromkeys(size_options)),
        "speed": speed,
        "darkvision": darkvision,
        "ability_bonuses": {},
        "languages": [],
        "languages_choose": 0,
        "traits": traits,
        "traits_text": traits_text,
    }


TRAIT_SLUG_RU = {
    "тип существа": "creature-type",
    "тёмное зрение": "darkvision",
    "темное зрение": "darkvision",
    "наследие фей": "fey-ancestry",
    "ярость маленьких": "fury-of-the-small",
    "мелкая ярость": "fury-of-the-small",
    "ловкий побег": "nimble-escape",
    "шустрый побег": "nimble-escape",
    "эльфийское происхождение": "elven-lineage",
    "обострённые чувства": "keen-senses",
    "обостренные чувства": "keen-senses",
    "транс": "trance",
    "магия фей": "fey-magic",
    "полёт": "flight",
    "полет": "flight",
    "сопротивление к огню": "fire-resistance",
    "сопротивление огню": "fire-resistance",
    "прикосновение к пламени": "reach-to-the-blaze",
    "храбрый": "brave",
    "проворство полурослика": "halfling-nimbleness",
    "удачливый": "luck",
    "природная скрытность": "naturally-stealthy",
    "происхождение киткинов": "kithkin-lineage",
    "изменить себя": "shape-self",
    "формование": "shape-self",
    "очаровательный имитатор": "delightful-imitator",
    "непредсказуемое движение": "unpredictable-movement",
    "магия холодного пламени": "cold-fire-magic",
    "магия ледяного огня": "cold-fire-magic",
    "сопротивление холоду": "cold-resistance",
    "происхождение феери": "faerie-lineage",
    "происхождение фейри": "faerie-lineage",
    "происхождение фэйри": "faerie-lineage",
}
TYPE_RU_LABEL = {
    "humanoid": "гуманоид",
    "fey": "фея",
    "aberration": "аберрация",
    "elemental": "элементаль",
    "beast": "зверь",
    "celestial": "небожитель",
    "construct": "конструкт",
    "fiend": "исчадие",
}
SIZE_RU_LABEL = {
    "tiny": "крошечный",
    "small": "маленький",
    "medium": "средний",
    "large": "большой",
    "huge": "огромный",
    "gargantuan": "гигантский",
}


def _trait_slug(name_ru: str) -> str:
    key = _norm(name_ru)
    if key in TRAIT_SLUG_RU:
        return TRAIT_SLUG_RU[key]
    # Cyrillic → latin transliteration for stable machine ids
    table = str.maketrans(
        {
            "а": "a",
            "б": "b",
            "в": "v",
            "г": "g",
            "д": "d",
            "е": "e",
            "ё": "e",
            "ж": "zh",
            "з": "z",
            "и": "i",
            "й": "y",
            "к": "k",
            "л": "l",
            "м": "m",
            "н": "n",
            "о": "o",
            "п": "p",
            "р": "r",
            "с": "s",
            "т": "t",
            "у": "u",
            "ф": "f",
            "х": "h",
            "ц": "ts",
            "ч": "ch",
            "ш": "sh",
            "щ": "sch",
            "ъ": "",
            "ы": "y",
            "ь": "",
            "э": "e",
            "ю": "yu",
            "я": "ya",
        }
    )
    slug = key.translate(table)
    slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")
    return slug or "trait"


def parse_species_ttg(payload: dict, row: dict[str, str]) -> dict[str, Any]:
    props = payload.get("properties") or {}
    type_ru = (props.get("type") or "Гуманоид").lower()
    creature_type = SPECIES_TYPE_RU.get(_norm(type_ru.split()[0]), "humanoid")
    size_options: list[str] = []
    for s in props.get("sizes") or []:
        st = (s.get("type") or "").upper()
        if st == "MEDIUM":
            size_options.append("medium")
        elif st == "SMALL":
            size_options.append("small")
        elif st == "TINY":
            size_options.append("tiny")
    if not size_options:
        # fallback from free-text size
        raw = _norm(str(props.get("size") or ""))
        for stem, key in SIZE_RU_MAP.items():
            if stem in raw:
                size_options.append(key)
        if not size_options:
            size_options = ["medium"]
    # Prefer medium as primary when both small/medium offered (EFA pattern),
    # else first listed.
    size = "medium" if "medium" in size_options else size_options[0]
    size_options = list(dict.fromkeys(size_options))
    speed = int((props.get("movement") or {}).get("base") or 30)
    darkvision = props.get("darkVision")
    if darkvision is None:
        darkvision = props.get("darkvision")
    if darkvision is not None:
        try:
            darkvision = int(darkvision)
        except (TypeError, ValueError):
            darkvision = None
        if darkvision is not None and darkvision <= 0:
            darkvision = None
    traits: list[str] = []
    trait_bits: list[str] = []
    for feat in payload.get("features") or []:
        name_obj = feat.get("name")
        if isinstance(name_obj, dict):
            name = (name_obj.get("rus") or name_obj.get("eng") or "").strip()
        else:
            name = str(name_obj or feat.get("url") or "").strip()
        if not name:
            continue
        # Skip duplicate «Тип существа» header that only restates creature type
        # when already captured in creature_type — keep it if it adds goblinoid etc.
        slug = _trait_slug(name)
        if slug in traits:
            continue
        traits.append(slug)
        desc = feat.get("description")
        if isinstance(desc, list):
            desc_text = " ".join(
                strip_ttg_markup(x) if isinstance(x, str) else "" for x in desc
            )
        else:
            desc_text = strip_ttg_markup(str(desc or ""))
        first = re.split(r"(?<=[.!?])\s+", desc_text)[0] if desc_text else ""
        trait_bits.append(polish_ru(f"{name}: {first}", limit=140) if first else name)
    type_label = TYPE_RU_LABEL.get(creature_type, creature_type)
    size_label = "/".join(SIZE_RU_LABEL.get(s, s) for s in size_options)
    traits_text = (
        f"{row['name_ru']} ({BOOK_RU['LFL']}): {type_label}, {size_label}, {speed} фт. "
        + " ".join(trait_bits[:5])
    )
    return {
        "creature_type": creature_type,
        "size": size,
        "size_options": size_options,
        "speed": speed,
        "darkvision": darkvision,
        "ability_bonuses": {},
        "languages": [],
        "languages_choose": 0,
        "traits": traits,
        "traits_text": polish_ru(traits_text, limit=520),
    }


def build_species() -> dict[str, Any]:
    """Prefer TTG JSON for all LFL species (stable darkvision / feature names)."""
    rows = _book_rows("species.csv", "LFL")
    entries = []
    for i, row in enumerate(rows):
        payload = load_ttg_json(row, "species")
        if not payload:
            raise RuntimeError(f"species missing ttg: {row['id']}")
        data = parse_species_ttg(payload, row)
        ext = {
            "url_dndsu": (row.get("url_dndsu") or "").rstrip("/") or None,
            "url_ttg": row.get("url_ttg") or None,
            "book": "LFL",
        }
        entries.append(
            {
                "kind": "race",
                "slug": row["id"],
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": "lfl",
                "sort_order": (i + 1) * 10,
                "external_ref": ext,
                "data": data,
            }
        )
    return {
        "meta": {
            "pack": PACK,
            "rules_edition": "2024",
            "source": "lfl",
            "notes_ru": "7 видов LFL по TTG API v2 (darkvision/traits); RU-имена из species.csv.",
        },
        "entries": entries,
    }


def build_magic_items(book: str) -> dict[str, Any]:
    source = SOURCE_BY_BOOK[book]
    rows = _book_rows("magic_items.csv", book)
    entries = []
    for i, row in enumerate(rows):
        html = load_dndsu_html(row, "magic_items")
        text = c17._extract_paper(html) if html else ""
        data = c17.parse_magic_item(text or row["name_ru"], row)
        data["summary_ru"] = polish_ru(data.get("summary_ru") or "", limit=320)
        ext: dict[str, Any] = {"book": book}
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
                "source": source,
                "sort_order": (i + 1) * 10,
                "external_ref": ext,
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
    }


def _walk_polish(obj: Any) -> Any:
    if isinstance(obj, str):
        return polish_ru(obj)
    if isinstance(obj, list):
        return [_walk_polish(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _walk_polish(v) for k, v in obj.items()}
    return obj


def build_creatures(book: str) -> tuple[dict[str, Any], list[str]]:
    source = SOURCE_BY_BOOK[book]
    rows = sorted(_book_rows("creatures.csv", book), key=lambda r: r["name_en"])
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
        entry["source"] = source
        entry["external_ref"]["book"] = book
        entry["data"]["source_book"] = book
        entry = _walk_polish(entry)
        # spell_refs must resolve (already filtered)
        if parsed.get("has_spellcasting"):
            for sp in entry["data"].get("spell_refs") or []:
                if sp not in by_slug:
                    skipped.append(f"{slug}:bad_spell_ref:{sp}")
                    entry = None  # type: ignore
                    break
        if entry:
            entries.append(entry)
    payload = {
        "meta": {
            "pack": PACK,
            "source": f"{book} creatures (community_ref)",
            "count": len(entries),
            "notes": [
                f"{len(entries)} существ {book}; source={source}.",
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
        "# P24-C18 — выборка для ручной сверки (слой 3)",
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
            f"**Всего:** {total} (цель 111).",
            "",
            "## Пропуски",
            "",
        ]
    )
    if skipped:
        for s in skipped[:40]:
            lines.append(f"- `{s}`")
        if len(skipped) > 40:
            lines.append(f"- … ещё {len(skipped) - 40}")
    else:
        lines.append("- Честных пропусков по недоступности страниц нет (кэш P24-C18).")
    lines.extend(
        [
            "",
            "## Особые случаи",
            "",
            "- `elf__lfl`: только ttg (`url_dndsu` пустой в CSV).",
            "- Origin feats ABH/LFL: `Черта:` со страниц предысторий → id из feats.csv.",
            "- `source` коды: fraif / abh / lfl / nsf → `community_ref`.",
            "",
        ]
    )
    LAYER3.write_text("\n".join(lines), encoding="utf-8")


def update_gaps(total: int, skipped: list[str]) -> None:
    note = (
        f"- **P24-C18 (2026-11-16):** FRAiF+ABH+LFL+NsF live waves — "
        f"**{total}** карточек (цель 111). "
        f"`source` fraif/abh/lfl/nsf → community_ref. "
        f"Пропусков: {len(skipped)}."
    )
    text = GAPS.read_text(encoding="utf-8") if GAPS.is_file() else ""
    if "P24-C18" in text:
        text = re.sub(
            r"- \*\*P24-C18.*?(?=\n- \*\*P24-|\n## |\Z)",
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
        notes = [n for n in notes if not str(n).startswith("P24-C18:")]
        notes.append(
            f"P24-C18: FRAiF+ABH+LFL+NsF live={total} cards (target 111)."
        )
        counts["notes"] = notes
    COUNTS.write_text(
        json.dumps(counts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    LIVE.mkdir(parents=True, exist_ok=True)
    outputs: dict[str, dict] = {}
    all_skipped: list[str] = []
    file_counts: dict[str, int] = {}

    outputs["backgrounds_abh.json"] = build_backgrounds("ABH")
    outputs["backgrounds_lfl.json"] = build_backgrounds("LFL")
    outputs["feats_abh.json"] = build_feats("ABH")
    outputs["feats_lfl.json"] = build_feats("LFL")
    outputs["species_lfl.json"] = build_species()
    outputs["magic_items_fraif.json"] = build_magic_items("FRAiF")
    outputs["magic_items_nsf.json"] = build_magic_items("NsF")

    for book, key in (
        ("FRAiF", "creatures_fraif.json"),
        ("ABH", "creatures_abh.json"),
        ("LFL", "creatures_lfl.json"),
        ("NsF", "creatures_nsf.json"),
    ):
        payload, skipped = build_creatures(book)
        outputs[key] = payload
        all_skipped.extend(skipped)

    feat_slugs = all_feat_slugs()
    for slug in outputs["feats_abh.json"]["entries"] + outputs["feats_lfl.json"]["entries"]:
        feat_slugs.add(slug["slug"])
    for bg_file in ("backgrounds_abh.json", "backgrounds_lfl.json"):
        for e in outputs[bg_file]["entries"]:
            oid = e["data"]["origin_feat"]["id"]
            assert oid in feat_slugs, f"origin feat missing: {oid} ({e['slug']})"

    total = 0
    for fname, payload in outputs.items():
        path = LIVE / fname
        _assert_no_stubs(payload, path)
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        n = len(payload.get("entries") or [])
        file_counts[fname] = n
        total += n
        sk = payload.get("skipped") or []
        print(f"wrote {path.name} entries={n} skipped={len(sk)}")

    for fname, (_book, _cat, exp) in EXPECTED.items():
        got = file_counts.get(fname, 0)
        if got != exp:
            print(f"WARN count mismatch {fname}: got {got} expected {exp}")

    write_layer3(file_counts, all_skipped)
    update_gaps(total, all_skipped)
    update_counts_note(total)
    print(f"TOTAL={total} skipped={len(all_skipped)}")
    if all_skipped:
        print("skipped sample:", all_skipped[:15])


if __name__ == "__main__":
    main()