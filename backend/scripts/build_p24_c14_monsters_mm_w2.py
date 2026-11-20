#!/usr/bin/env python3
"""P24-C14: build creatures_mm24_w2.json from scraped next.dnd.su pages.

Wave 2 = MM24 srd=false with name_en >= «Kuo-toa Archpriest».
source=mm24 → content_layer=community_ref. Short RU cards only.
"""

from __future__ import annotations

import csv
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "docs" / "edition-2024" / "sources"
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"
SCRAPED = Path("/tmp/p24-c14/scraped.json")
CSV_PATH = SOURCES / "creatures.csv"
OUT_JSON = LIVE / "creatures_mm24_w2.json"
LAYER3 = SOURCES / "P24-C14-layer3-review.md"
GAPS = SOURCES / "gaps.md"
COUNTS = SOURCES / "counts.json"
CUTOFF = "Kuo-toa Archpriest"

SIZE_RU = {
    "крошечный": "tiny",
    "крошечная": "tiny",
    "крошечное": "tiny",
    "маленький": "small",
    "маленькая": "small",
    "маленькое": "small",
    "средний": "medium",
    "средняя": "medium",
    "среднее": "medium",
    "большой": "large",
    "большая": "large",
    "большое": "large",
    "огромный": "huge",
    "огромная": "huge",
    "огромное": "huge",
    "гигантский": "gargantuan",
    "гигантская": "gargantuan",
    "гигантское": "gargantuan",
}
SIZE_LABEL = {
    "tiny": "крошечный",
    "small": "маленький",
    "medium": "средний",
    "large": "большой",
    "huge": "огромный",
    "gargantuan": "гигантский",
}
# Feminine size adjective for agreement with feminine type nouns in summary.
SIZE_LABEL_FEM = {
    "tiny": "крошечная",
    "small": "маленькая",
    "medium": "средняя",
    "large": "большая",
    "huge": "огромная",
    "gargantuan": "гигантская",
}
SIZE_LABEL_NEUT = {
    "tiny": "крошечное",
    "small": "маленькое",
    "medium": "среднее",
    "large": "большое",
    "huge": "огромное",
    "gargantuan": "гигантское",
}
# Grammatical gender of type noun in Russian (for «средняя аберрация»).
TYPE_GENDER = {
    "aberration": "f",  # аберрация
    "beast": "m",  # зверь
    "celestial": "m",  # небожитель
    "construct": "m",  # конструкт
    "dragon": "m",  # дракон
    "elemental": "m",  # элементаль
    "fey": "f",  # фея
    "fiend": "n",  # исчадие
    "giant": "m",  # великан
    "humanoid": "m",  # гуманоид
    "monstrosity": "n",  # чудовище
    "ooze": "f",  # слизь
    "plant": "n",  # растение
    "undead": "f",  # нежить
}
TYPE_RU = {
    "аберрация": "aberration",
    "зверь": "beast",
    "небожитель": "celestial",
    "конструкт": "construct",
    "дракон": "dragon",
    "элементаль": "elemental",
    "фея": "fey",
    "исчадие": "fiend",
    "великан": "giant",
    "гуманоид": "humanoid",
    "чудовище": "monstrosity",
    "слизь": "ooze",
    "растение": "plant",
    "нежить": "undead",
}
TYPE_LABEL = {v: k.capitalize() if k != "аберрация" else "Аберрация" for k, v in TYPE_RU.items()}
# Prefer CSV capitalization for type_ru display
TYPE_LABEL.update(
    {
        "aberration": "Аберрация",
        "beast": "Зверь",
        "celestial": "Небожитель",
        "construct": "Конструкт",
        "dragon": "Дракон",
        "elemental": "Элементаль",
        "fey": "Фея",
        "fiend": "Исчадие",
        "giant": "Великан",
        "humanoid": "Гуманоид",
        "monstrosity": "Чудовище",
        "ooze": "Слизь",
        "plant": "Растение",
        "undead": "Нежить",
    }
)

ALIGN_MAP = {
    "принципиальный добрый": "законно-добрый",
    "законно-добрый": "законно-добрый",
    "нейтральный добрый": "нейтрально-добрый",
    "нейтрально-добрый": "нейтрально-добрый",
    "хаотичный добрый": "хаотично-добрый",
    "хаотично-добрый": "хаотично-добрый",
    "принципиальный нейтральный": "законно-нейтральный",
    "законно-нейтральный": "законно-нейтральный",
    "нейтральный": "нейтральный",
    "хаотичный нейтральный": "хаотично-нейтральный",
    "хаотично-нейтральный": "хаотично-нейтральный",
    "принципиальный злой": "законно-злой",
    "законно-злой": "законно-злой",
    "нейтральный злой": "нейтрально-злой",
    "нейтрально-злой": "нейтрально-злой",
    "хаотичный злой": "хаотично-злой",
    "хаотично-злой": "хаотично-злой",
    "без мировоззрения": "без мировоззрения",
    "любое": "любое",
    "любое мировоззрение": "любое мировоззрение",
}

SKILL_NORM = {
    "восприятие": "Внимательность",
    "внимательность": "Внимательность",
    "тайная магия": "Магия",
    "магия": "Магия",
    "природа": "Природа",
    "скрытность": "Скрытность",
    "проницательность": "Проницательность",
    "религия": "Религия",
    "обман": "Обман",
    "убеждение": "Убеждение",
    "акробатика": "Акробатика",
    "атлетика": "Атлетика",
    "история": "История",
    "медицина": "Медицина",
    "выживание": "Выживание",
    "ловкость рук": "Ловкость рук",
    "запугивание": "Запугивание",
    "анализ": "Анализ",
    "выступление": "Выступление",
    "уход за животными": "Уход за животными",
}

DAMAGE_NORM = {
    "кислотн": "кислотный",
    "дробящ": "дробящий",
    "холодн": "холодный",
    "огненн": "огненный",
    "огн": "огненный",
    "силов": "силовой",
    "электрич": "электрический",
    "некротич": "некротический",
    "колющ": "колющий",
    "ядовит": "ядовитый",
    "яд": "ядовитый",
    "психич": "психический",
    "излучающ": "излучающий",
    "рубящ": "рубящий",
    "звуков": "звуковой",
}

CONDITION_NORM = {
    "ослепл": "ослеплённый",
    "очар": "очарованный",
    "оглох": "оглохший",
    "истощ": "истощение",
    "испуг": "испуганный",
    "схвач": "схваченный",
    "недееспособ": "недееспособный",
    "невидим": "невидимый",
    "паралич": "парализованный",
    "окамен": "окаменевший",
    "отравл": "отравленный",
    "опрокин": "опрокинутый",
    "опутан": "опутанный",
    "ошелом": "ошеломлённый",
    "бессознат": "бессознательный",
}

# Common gear phrases → C03 slug
GEAR_RU = {
    "кинжал": "dagger",
    "короткий меч": "shortsword",
    "длинный меч": "longsword",
    "скимитар": "scimitar",
    "рапира": "rapier",
    "боевой топор": "battleaxe",
    "одноручный топор": "handaxe",
    "секира": "greataxe",
    "двуручный меч": "greatsword",
    "булава": "mace",
    "боевой молот": "warhammer",
    "молот": "maul",
    "копье": "spear",
    "копьё": "spear",
    "метательное копье": "javelin",
    "метательное копьё": "javelin",
    "трезубец": "trident",
    "глефа": "glaive",
    "алебарда": "halberd",
    "пика": "pike",
    "кнут": "whip",
    "дубинка": "club",
    "боевой посох": "quarterstaff",
    "посох": "staff",
    "длинный лук": "longbow",
    "короткий лук": "shortbow",
    "лёгкий арбалет": "light-crossbow",
    "легкий арбалет": "light-crossbow",
    "тяжёлый арбалет": "heavy-crossbow",
    "тяжелый арбалет": "heavy-crossbow",
    "одноручный арбалет": "hand-crossbow",
    "щит": "shield",
    "кольчуга": "chain-mail",
    "чешуйчатый доспех": "scale-mail",
    "латы": "plate-armor",
    "кожаный доспех": "leather-armor",
    "клепаный кожаный доспех": "studded-leather-armor",
    "полулаты": "half-plate-armor",
    "кираса": "breastplate",
    "кольчужная рубаха": "chain-shirt",
    "скрытый доспех": "hide-armor",
    "шипованный доспех": "splint-armor",
    "кольчатый доспех": "ring-mail",
    "священный символ": "holy-symbol",
    "мешочек с компонентами": "component-pouch",
}


def _norm(s: str) -> str:
    return (s or "").lower().replace("ё", "е").strip()


def load_spell_maps() -> tuple[dict[str, str], dict[str, str]]:
    by_slug: dict[str, str] = {}
    by_ru: dict[str, str] = {}
    for fname in ("spells_srd.json", "spells_ph24.json"):
        payload = json.loads((LIVE / fname).read_text(encoding="utf-8"))
        for e in payload["entries"]:
            slug = e["slug"]
            by_slug[slug] = slug
            ru = _norm(e.get("name_ru") or "")
            if ru:
                by_ru[ru] = slug
            en = _norm(e.get("name_en") or "")
            if en:
                by_ru[en] = slug  # rarely needed
    return by_slug, by_ru


def load_gear_slugs() -> set[str]:
    known: set[str] = set()
    for fname in ("weapons_srd.json", "armor_srd.json", "equipment_srd.json"):
        payload = json.loads((LIVE / fname).read_text(encoding="utf-8"))
        known.update(e["slug"] for e in payload["entries"])
    return known


def parse_size_type_align(raw: str, csv_type: str) -> tuple[str, str, str | None, str]:
    t = re.sub(r"\?", "", raw or "")
    t = re.sub(r"\s+", " ", t).strip()
    # size
    size = "medium"
    size_ru = "средний"
    for label, key in SIZE_RU.items():
        if _norm(t).startswith(_norm(label)) or f" или {_norm(label)}" in _norm(t):
            # prefer first size token
            m = re.match(r"^([А-Яа-яЁё]+)", t)
            if m and _norm(m.group(1)) in SIZE_RU:
                size = SIZE_RU[_norm(m.group(1))]
                size_ru = SIZE_LABEL[size]
            break
    m = re.match(r"^([А-Яа-яЁё]+)", t)
    if m and _norm(m.group(1)) in SIZE_RU:
        size = SIZE_RU[_norm(m.group(1))]
        size_ru = SIZE_LABEL[size]

    # type from CSV preferred
    type_en = TYPE_RU.get(_norm(csv_type)) if csv_type else None
    subtype = None
    if not type_en:
        for label, key in TYPE_RU.items():
            if label in _norm(t):
                type_en = key
                break
    type_en = type_en or "monstrosity"
    type_ru = TYPE_LABEL.get(type_en, csv_type or type_en)
    # subtype in parens
    sm = re.search(r"\(([^)]+)\)", t)
    if sm:
        subtype = sm.group(1).strip()

    # alignment — last comma-separated chunk after type
    align = "без мировоззрения"
    # strip size words and type words, take trailing alignment phrase
    parts = [p.strip() for p in t.split(",") if p.strip()]
    if len(parts) >= 2:
        cand = parts[-1]
        # remove leading type word if stuck
        cand2 = re.sub(
            r"^(Аберрация|Зверь|Небожитель|Конструкт|Дракон|Элементаль|Фея|Исчадие|"
            r"Великан|Гуманоид|Чудовище|Слизь|Растение|Нежить)\s+",
            "",
            cand,
            flags=re.I,
        ).strip()
        # normalize grammatical gender endings roughly
        key = _norm(cand2)
        key = (
            key.replace("принципиальное", "принципиальный")
            .replace("принципиальная", "принципиальный")
            .replace("нейтральное", "нейтральный")
            .replace("нейтральная", "нейтральный")
            .replace("хаотичное", "хаотичный")
            .replace("хаотичная", "хаотичный")
            .replace("злое", "злой")
            .replace("злая", "злой")
            .replace("доброе", "добрый")
            .replace("добрая", "добрый")
        )
        # "нейтральный злой" etc.
        align = ALIGN_MAP.get(key, ALIGN_MAP.get(key.replace("  ", " "), cand2.lower()))
        if align == cand2.lower() and key in ALIGN_MAP:
            align = ALIGN_MAP[key]
        # direct multi-word
        for ak, av in ALIGN_MAP.items():
            if ak in key:
                align = av
                break
        if "без мировоззрен" in key:
            align = "без мировоззрения"
    return size, size_ru, subtype, align


def clean_ru_text(text: str) -> str:
    t = re.sub(r"\s+", " ", text or "").strip()
    t = re.sub(r"\s+([.,:;!?])", r"\1", t)
    t = re.sub(r"\(\s+", "(", t)
    t = re.sub(r"\s+\)", ")", t)
    t = re.sub(r"\bспабросок\b", "спасбросок", t, flags=re.I)
    t = re.sub(r"\bспаброска\b", "спасброска", t, flags=re.I)
    t = re.sub(r"\bспаброске\b", "спасброске", t, flags=re.I)
    t = re.sub(r"\bспаброском\b", "спасброском", t, flags=re.I)
    t = re.sub(r"\bспаброски\b", "спасброски", t, flags=re.I)
    t = re.sub(r"\bспаброску\b", "спасброску", t, flags=re.I)
    return t.strip()


def short_text(text: str, *, limit: int = 220) -> str:
    t = clean_ru_text(text)
    if len(t) <= limit:
        return t
    # keep attack mechanics head
    cut = t[: limit - 1].rsplit(" ", 1)[0]
    return cut.rstrip(".,;:") + "…"


def summary_size_type(size: str, type_en: str, type_ru: str) -> str:
    """«средняя аберрация» / «средний гуманоид» — size agrees, type lowercased."""
    type_word = (type_ru or TYPE_LABEL.get(type_en, type_en)).strip()
    # «рой (…)» — masculine noun regardless of wrapped creature type.
    if type_word.lower().startswith("рой"):
        gender = "m"
    else:
        gender = TYPE_GENDER.get(type_en, "m")
    if gender == "f":
        size_word = SIZE_LABEL_FEM.get(size, "средняя")
    elif gender == "n":
        size_word = SIZE_LABEL_NEUT.get(size, "среднее")
    else:
        size_word = SIZE_LABEL.get(size, "средний")
    # Inside the phrase type is lowercase (except if already a proper name).
    if type_word:
        type_word = type_word[:1].lower() + type_word[1:]
    return f"{size_word} {type_word}"


def norm_damage_list(items: list[str]) -> list[str]:
    out: list[str] = []
    for raw in items:
        s = raw.strip()
        if not s:
            continue
        low = _norm(s)
        matched = None
        for pref, canon in DAMAGE_NORM.items():
            if pref in low:
                matched = canon
                break
        out.append(matched or s.lower())
    # dedupe
    seen: set[str] = set()
    uniq: list[str] = []
    for x in out:
        if x not in seen:
            seen.add(x)
            uniq.append(x)
    return uniq


def norm_conditions(items: list[str]) -> list[str]:
    out: list[str] = []
    for raw in items:
        s = raw.strip()
        if not s:
            continue
        low = _norm(s)
        matched = None
        for pref, canon in CONDITION_NORM.items():
            if pref in low:
                matched = canon
                break
        out.append(matched or s.lower())
    seen: set[str] = set()
    uniq: list[str] = []
    for x in out:
        if x not in seen:
            seen.add(x)
            uniq.append(x)
    return uniq


def norm_skills(skills: dict[str, int]) -> dict[str, int]:
    out: dict[str, int] = {}
    for name, val in (skills or {}).items():
        key = SKILL_NORM.get(_norm(name), name.strip().capitalize())
        out[key] = int(val)
    return out


def feature_entries(raw_list: list[dict], *, shorten: bool = False) -> list[dict]:
    out: list[dict] = []
    for feat in raw_list or []:
        name_ru = clean_ru_text(feat.get("name_ru") or "").strip()
        if not name_ru:
            continue
        text = feat.get("text_ru") or ""
        if shorten:
            # Rays / recharge options: keep full short mechanics (already compact).
            en = str(feat.get("name_en") or "")
            is_rayish = (
                "луч" in name_ru.lower()
                or en[:1].isdigit()
                or "ray" in en.lower()
            )
            limit = 480 if is_rayish else 240
            text = short_text(text, limit=limit)
        else:
            text = clean_ru_text(text)
        item: dict[str, Any] = {
            "name_ru": name_ru,
            "text_ru": text,
            "name_ru_pending": bool(re.search(r"[A-Za-z]", name_ru)),
        }
        if feat.get("name_en"):
            item["name_en"] = feat["name_en"]
        out.append(item)
    return out


def resolve_spells(
    scraped: dict, by_slug: dict[str, str], by_ru: dict[str, str]
) -> list[str]:
    """Only links collected from Spellcasting / Колдовство blocks by the scraper."""
    if not scraped.get("has_spellcasting"):
        return []
    found: list[str] = []
    for slug in scraped.get("spell_slugs") or []:
        if slug in by_slug:
            found.append(slug)
        elif slug.replace("_", "-") in by_slug:
            found.append(slug.replace("_", "-"))
    for name in scraped.get("spell_names_ru") or []:
        slug = by_ru.get(_norm(name))
        if slug:
            found.append(slug)
    seen: set[str] = set()
    out: list[str] = []
    for s in found:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out


def resolve_gear(scraped: dict, known: set[str]) -> list[str]:
    blob = " ".join(
        [
            *(f.get("name_ru") or "" for f in scraped.get("actions") or []),
            *(f.get("text_ru") or "" for f in scraped.get("actions") or []),
            *(f.get("name_ru") or "" for f in scraped.get("traits") or []),
        ]
    )
    low = _norm(blob)
    found: list[str] = []
    for ru, slug in sorted(GEAR_RU.items(), key=lambda kv: -len(kv[0])):
        if _norm(ru) in low and slug in known:
            found.append(slug)
    seen: set[str] = set()
    out: list[str] = []
    for s in found:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out


def build_entry(
    scraped: dict,
    *,
    sort_order: int,
    by_slug: dict[str, str],
    by_ru: dict[str, str],
    gear_known: set[str],
) -> dict[str, Any]:
    size, size_ru, subtype, align = parse_size_type_align(
        scraped.get("size_type_alignment") or "",
        scraped.get("creature_type_csv") or "",
    )
    spells = resolve_spells(scraped, by_slug, by_ru)
    gear = resolve_gear(scraped, gear_known)
    cr = str(scraped["cr"])
    pb = int(scraped["proficiency_bonus"])
    xp = int(scraped["xp"])
    init = scraped["initiative"]
    type_csv = scraped.get("creature_type_csv") or ""
    type_en = TYPE_RU.get(_norm(type_csv))
    if not type_en:
        sta = _norm(scraped.get("size_type_alignment") or "")
        type_en = next((TYPE_RU[k] for k in TYPE_RU if k in sta), "monstrosity")
    type_ru = type_csv or TYPE_LABEL[type_en]
    size_type = summary_size_type(size, type_en, type_ru)
    has_cast = bool(scraped.get("has_spellcasting") and spells)
    summary = (
        f"{size_type}, ПО {cr}; КД {scraped['ac']}, "
        f"хиты {scraped['hp_average']} ({scraped['hp_formula']}); "
        f"инициатива {init['mod']:+d} (ср. {init['score']}), БМ +{pb}"
        + ("; есть заклинания." if has_cast else ".")
    )

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
        "skills": norm_skills(scraped.get("skills") or {}),
        "senses": scraped.get("senses") or {},
        "languages": scraped.get("languages") or [],
        "source_book": "MM24",
        "srd_section": "monsters",
        "summary_ru": summary,
        "name_ru_pending": bool(
            re.search(r"[A-Za-z]", scraped.get("name_ru") or "")
            or not (scraped.get("name_ru") or "").strip()
        ),
        "gear_refs": gear,
        "spell_refs": spells,
        "traits": feature_entries(scraped.get("traits") or []),
        "actions": feature_entries(scraped.get("actions") or []),
        "bonus_actions": feature_entries(scraped.get("bonus_actions") or []),
        "reactions": feature_entries(scraped.get("reactions") or []),
        "legendary_actions": feature_entries(scraped.get("legendary_actions") or []),
    }
    if scraped.get("damage_vulnerabilities"):
        data["damage_vulnerabilities"] = norm_damage_list(
            scraped["damage_vulnerabilities"]
        )
    if scraped.get("damage_resistances"):
        data["damage_resistances"] = norm_damage_list(scraped["damage_resistances"])
    if scraped.get("damage_immunities"):
        data["damage_immunities"] = norm_damage_list(scraped["damage_immunities"])
    if scraped.get("condition_immunities"):
        data["condition_immunities"] = norm_conditions(
            scraped["condition_immunities"]
        )
    if scraped.get("legendary_actions_uses") is not None:
        data["legendary_actions_uses"] = scraped["legendary_actions_uses"]
    if scraped.get("legendary_actions_uses_lair") is not None:
        data["legendary_actions_uses_lair"] = scraped["legendary_actions_uses_lair"]
    if scraped.get("legendary_actions_note_ru"):
        data["legendary_actions_note_ru"] = scraped["legendary_actions_note_ru"]
    # drop empty optional lists
    for k in ("bonus_actions", "reactions", "legendary_actions", "traits"):
        if not data.get(k):
            data.pop(k, None)

    return {
        "kind": "bestiary",
        "slug": scraped["id"],
        "name_ru": scraped["name_ru"],
        "name_en": scraped["name_en"],
        "source": "mm24",
        "sort_order": sort_order,
        "external_ref": {
            "url_dndsu": scraped.get("url_dndsu") or "",
            "url_ttg": scraped.get("url_ttg") or "",
            "book": "MM24",
        },
        "data": data,
    }


def update_gaps(count: int, first_name: str, last_name: str) -> None:
    note = (
        f"- **P24-C14 (2026-11-15):** волна 2 MM24 сверх SRD (`srd=false`, "
        f"`name_en` ≥ «{CUTOFF}»): {count} карточек, source=`mm24` → community_ref. "
        f"Первое: {first_name}; последнее: {last_name}. "
        f"Доправка C07 (summary + spell_refs). C12 (бастионы) пропущена."
    )
    text = GAPS.read_text(encoding="utf-8") if GAPS.is_file() else ""
    if "P24-C14" in text:
        text = re.sub(
            r"- \*\*P24-C14.*?(?=\n- \*\*P24-|\n## |\Z)",
            note + "\n",
            text,
            count=1,
            flags=re.S,
        )
    else:
        text = text.rstrip() + "\n\n" + note + "\n"
    GAPS.write_text(text, encoding="utf-8")


def update_counts(count: int) -> None:
    payload = json.loads(COUNTS.read_text(encoding="utf-8")) if COUNTS.is_file() else {}
    notes = payload.get("notes") or []
    if isinstance(notes, list):
        notes = [n for n in notes if not str(n).startswith("P24-C14:")]
        notes.append(
            f"P24-C14: creatures_mm24_w2={count} (MM24 srd=false, name_en >= {CUTOFF})."
        )
        payload["notes"] = notes
    COUNTS.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_layer3(entries: list[dict], skipped: list[str]) -> None:
    by_type = Counter(e["data"]["type"] for e in entries)
    by_cr = Counter(e["data"]["cr"] for e in entries)
    lines = [
        "# P24-C14 — выборка для ручной сверки (слой 3)",
        "",
        f"Волна 2 MM24 сверх SRD: **{len(entries)}** карточек "
        f"(с «{CUTOFF}» до конца алфавита).",
        "",
        "| slug | name_ru | type | CR | PB | spells | gear |",
        "|---|---|---|---|---|---|---|",
    ]
    sample_slugs = {
        "kuo-toa-archpriest",
        "mind-flayer",
        "mind-flayer-arcanist",
        "shadow-dragon",
        "spectator",
        "sphinx-of-secrets",
        "vampire-umbral-lord",
        "yuan-ti-abomination",
        "yuan-ti-malison-type-3",
    }
    sample = entries[:12] + [e for e in entries if e["slug"] in sample_slugs]
    seen: set[str] = set()
    for e in sample:
        if e["slug"] in seen:
            continue
        seen.add(e["slug"])
        d = e["data"]
        lines.append(
            f"| `{e['slug']}` | {e['name_ru']} | {d['type']} | {d['cr']} | "
            f"+{d['proficiency_bonus']} | {len(d.get('spell_refs') or [])} | "
            f"{len(d.get('gear_refs') or [])} |"
        )
    lines.extend(
        [
            "",
            "## Источник русских имён",
            "",
            "- `docs/edition-2024/sources/creatures.csv` (next.dnd.su), сверка ttg.club.",
            "- Статы: страницы next.dnd.su редакции 2024; короткие `summary_ru`/`text_ru` своими словами.",
            "",
            f"По типам: `{dict(by_type)}`",
            f"По ПО: `{dict(sorted(by_cr.items(), key=lambda kv: (float(kv[0].split('/')[0])/float(kv[0].split('/')[1]) if '/' in kv[0] else float(kv[0]), kv[0])))}`",
            f"`name_ru_pending`: {sum(1 for e in entries if e['data'].get('name_ru_pending'))}.",
            "",
            f"Первое существо волны: **{entries[0]['name_en']}** (`{entries[0]['slug']}`).",
            f"Последнее существо волны: **{entries[-1]['name_en']}** (`{entries[-1]['slug']}`).",
            "",
        ]
    )
    if skipped:
        lines.extend(
            [
                "## Пропуски (неполная страница / недоступно)",
                "",
                ", ".join(f"`{s}`" for s in skipped),
                "",
            ]
        )
    LAYER3.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    scraped_payload = json.loads(SCRAPED.read_text(encoding="utf-8"))
    scraped_map: dict[str, dict] = scraped_payload["entries"]
    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        csv_rows = list(csv.DictReader(f))
    wave = sorted(
        [
            r
            for r in csv_rows
            if r.get("book") == "MM24"
            and str(r.get("srd", "")).lower() == "false"
            and r["name_en"] >= CUTOFF
        ],
        key=lambda r: r["name_en"],
    )
    by_slug, by_ru = load_spell_maps()
    gear_known = load_gear_slugs()
    entries: list[dict] = []
    skipped: list[str] = []
    for i, row in enumerate(wave):
        slug = row["id"]
        sc = scraped_map.get(slug)
        if not sc or sc.get("incomplete"):
            skipped.append(slug)
            continue
        # ensure CSV RU/EN
        sc["name_ru"] = row["name_ru"]
        sc["name_en"] = row["name_en"]
        sc["creature_type_csv"] = row.get("creature_type") or sc.get("creature_type_csv")
        sc["url_dndsu"] = row.get("url_dndsu") or sc.get("url_dndsu")
        sc["url_ttg"] = row.get("url_ttg") or sc.get("url_ttg")
        entries.append(
            build_entry(
                sc,
                sort_order=(i + 1) * 10,
                by_slug=by_slug,
                by_ru=by_ru,
                gear_known=gear_known,
            )
        )

    payload = {
        "meta": {
            "pack": "P24-C14",
            "source": "MM24 beyond SRD (wave 2)",
            "count": len(entries),
            "cutoff": CUTOFF,
            "notes": [
                "Существа MM24 с srd=false, name_en ≥ «Kuo-toa Archpriest».",
                "source=mm24 → content_layer=community_ref.",
                "Статы с next.dnd.su (редакция 2024); 2014 не подставлялись.",
                "Короткие RU-карточки; spell_refs → C05/C10, gear_refs → C03.",
                "C12 (бастионы) пропущена; волна 1 — P24-C13.",
            ],
        },
        "entries": entries,
        "skipped": skipped,
    }
    OUT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    update_gaps(
        len(entries),
        entries[0]["name_en"] if entries else "?",
        entries[-1]["name_en"] if entries else "?",
    )
    update_counts(len(entries))
    write_layer3(entries, skipped)
    by_type = Counter(e["data"]["type"] for e in entries)
    by_cr = Counter(e["data"]["cr"] for e in entries)
    print(f"wrote {OUT_JSON} count={len(entries)} skipped={skipped}")
    print("types", dict(by_type))
    print("cr", dict(sorted(by_cr.items(), key=lambda kv: kv[0])))
    with_spells = sum(1 for e in entries if e["data"].get("spell_refs"))
    with_gear = sum(1 for e in entries if e["data"].get("gear_refs"))
    print(f"with_spells={with_spells} with_gear={with_gear}")


if __name__ == "__main__":
    main()
