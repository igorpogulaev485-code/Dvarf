#!/usr/bin/env python3
"""P24-C17: build Forgotten Realms: Heroes of Faerûn (FRHoF) catalog waves.

Sources: docs/edition-2024/sources/*.csv (book=FRHoF);
mechanics short cards from next.dnd.su (ttg.club for name cross-check).
Does not copy long book prose. source=frhof → content_layer community_ref.
Does not enable the 2024 create flag. Does not touch 2014 catalog.
C12 bastions skipped.
"""

from __future__ import annotations

import csv
import json
import re
import subprocess
import time
import uuid
from collections import defaultdict
from html import unescape
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "docs" / "edition-2024" / "sources"
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"
CACHE = Path("/tmp/p24-c17/cache")

UA = "DvarfCatalogBot/1.0 (+https://creed20.tech; P24-C17 FRHoF reference scrape)"
CATALOG_NAMESPACE = uuid.NAMESPACE_URL

STUB_NEEDLES = (
    "Предложено: Способность",
    "Краткая механика",
    "по справочнику",
    "(см. список)",
    "в карточке (ссылки",
)

SCHOOL_RU = {
    "abjuration": "ограждение",
    "conjuration": "вызов",
    "divination": "прорицание",
    "enchantment": "очарование",
    "evocation": "воплощение",
    "illusion": "иллюзия",
    "necromancy": "некромантия",
    "transmutation": "преобразование",
}
SCHOOL_EN = {v: k for k, v in SCHOOL_RU.items()}
CLASS_RU_TO_EN = {
    "бард": "bard",
    "жрец": "cleric",
    "друид": "druid",
    "паладин": "paladin",
    "следопыт": "ranger",
    "чародей": "sorcerer",
    "колдун": "warlock",
    "волшебник": "wizard",
    "изобретатель": "artificer",
    "артефактор": "artificer",
}
ABILITY_RU = {
    "сила": "str",
    "ловкость": "dex",
    "телосложение": "con",
    "интеллект": "int",
    "мудрость": "wis",
    "харизма": "cha",
}
SKILL_RU = {
    "акробатика": "acrobatics",
    "атлетика": "athletics",
    "внимание": "perception",
    "восприятие": "perception",
    "выживание": "survival",
    "выступление": "performance",
    "запугивание": "intimidation",
    "история": "history",
    "ловкость рук": "sleight_of_hand",
    "магия": "arcana",
    "тайная магия": "arcana",
    "медицина": "medicine",
    "обман": "deception",
    "обращение с животными": "animal_handling",
    "природа": "nature",
    "проницательность": "insight",
    "расследование": "investigation",
    "религия": "religion",
    "скрытность": "stealth",
    "убеждение": "persuasion",
}
SKILL_EN_TO_RU = {v: k for k, v in SKILL_RU.items()}
SKILL_EN_TO_RU["arcana"] = "тайная магия"
ABILITY_CODE_TO_RU = {
    "str": "СИЛ",
    "dex": "ЛОВ",
    "con": "ТЕЛ",
    "int": "ИНТ",
    "wis": "МУД",
    "cha": "ХАР",
}
CAT_LABEL = {
    "origin": "Черта происхождения",
    "general": "Универсальная черта",
    "fighting_style": "Боевой стиль",
    "epic_boon": "Эпический дар",
}
FEAT_NAME_TO_SLUG = {
    "Агент Арфистов": "harper-agent",
    "Одарённый": "skilled",
    "Лекарь": "healer",
    "Посвящённый Культа дракона": "cult-of-the-dragon-initiate",
    "Птенец Изумрудного анклава": "emerald-enclave-fledgling",
    "Крепкий": "tough",
    "Посвящённый в магию (Волшебник)": "magic-initiate",
    "Посвящённый в магию (Друид)": "magic-initiate",
    "Посвящённый в магию": "magic-initiate",
    "Бдительный": "alert",
    "Новичок Латной перчатки": "tyro-of-the-gauntlet",
    "Агент Альянса лордов": "lords-alliance-agent",
    "Везучий": "lucky",
    "Мастеровой": "crafter",
    "Новобранец Пурпурного дракона": "purple-dragon-rook",
    "Неистово атакующий": "savage-attacker",
    "Искра чаропламени": "spellfire-spark",
    "Бандит Жентарима": "zhentarim-ruffian",
    "Музыкант": "musician",
    "Дебошир": "tavern-brawler",
}
FEAT_NAME_EN = {
    "harper-agent": "Harper Agent",
    "skilled": "Skilled",
    "healer": "Healer",
    "cult-of-the-dragon-initiate": "Cult of the Dragon Initiate",
    "emerald-enclave-fledgling": "Emerald Enclave Fledgling",
    "tough": "Tough",
    "magic-initiate": "Magic Initiate",
    "alert": "Alert",
    "tyro-of-the-gauntlet": "Tyro of the Gauntlet",
    "lords-alliance-agent": "Lords' Alliance Agent",
    "lucky": "Lucky",
    "crafter": "Crafter",
    "purple-dragon-rook": "Purple Dragon Rook",
    "savage-attacker": "Savage Attacker",
    "spellfire-spark": "Spellfire Spark",
    "zhentarim-ruffian": "Zhentarim Ruffian",
    "musician": "Musician",
    "tavern-brawler": "Tavern Brawler",
}
SUBCLASS_CODES = {
    "bard__college-of-the-moon": ("bard", "subclass.college-of-the-moon"),
    "cleric__knowledge-domain": ("cleric", "subclass.knowledge-domain"),
    "fighter__banneret": ("fighter", "subclass.banneret"),
    "paladin__oath-of-the-noble-genies": (
        "paladin",
        "subclass.oath-of-the-noble-genies",
    ),
    "ranger__winter-walker": ("ranger", "subclass.winter-walker"),
    "rogue__scion-of-the-three": ("rogue", "subclass.scion-of-the-three"),
    "sorcerer__spellfire-sorcery": ("sorcerer", "subclass.spellfire-sorcery"),
    "wizard__bladesinger": ("wizard", "subclass.bladesinger"),
}
PHB_CASTERS = {
    "bard",
    "cleric",
    "druid",
    "paladin",
    "ranger",
    "sorcerer",
    "warlock",
    "wizard",
}
RARITY_MAP = {
    "обычное": "common",
    "обычный": "common",
    "необычное": "uncommon",
    "необычный": "uncommon",
    "редкое": "rare",
    "редкий": "rare",
    "очень редкое": "very_rare",
    "очень редкий": "very_rare",
    "легендарное": "legendary",
    "легендарный": "legendary",
    "артефакт": "artifact",
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
    "жетон": ("wondrous", "чудесный предмет"),
}


def entry_id(*, kind: str, slug: str) -> str:
    return str(
        uuid.uuid5(CATALOG_NAMESPACE, f"dvarf:catalog:2024:{kind}:{slug}")
    )


def _csv_rows(name: str) -> list[dict[str, str]]:
    with (SOURCES / name).open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _frhof(name: str) -> list[dict[str, str]]:
    return [r for r in _csv_rows(name) if r.get("book") == "FRHoF"]


def _strip_tags(html: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    text = re.sub(r"</p>", "\n", text, flags=re.I)
    text = re.sub(r"</li>", "\n", text, flags=re.I)
    text = re.sub(r"</h\d>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n+", "\n", text)
    return text.strip()


def _extract_paper(html: str) -> str:
    m = re.search(
        r'class="[^"]*\bpaper-1\b[^"]*\bactive\b[^"]*"[^>]*>(.*?)</div>\s*</div>\s*</div>',
        html,
        re.S | re.I,
    )
    if not m:
        m = re.search(
            r'class="[^"]*\bactive\b[^"]*\bpaper-1\b[^"]*"[^>]*>(.*?)</div>\s*</div>\s*</div>',
            html,
            re.S | re.I,
        )
    if not m:
        m = re.search(
            r'class="[^"]*\bpaper-1\b[^"]*\bcard\b[^"]*"[^>]*>(.*?)</div>\s*</div>\s*</div>',
            html,
            re.S | re.I,
        )
    if not m:
        m2 = re.search(
            r'class="[^"]*feat__description[^"]*"[^>]*>(.*?)</div>',
            html,
            re.S | re.I,
        )
        if m2:
            return _strip_tags(m2.group(1))
        return ""
    return _strip_tags(m.group(1))


def fetch(url: str, dest: Path) -> str:
    if dest.is_file() and dest.stat().st_size > 1000:
        return dest.read_text(encoding="utf-8", errors="replace")
    dest.parent.mkdir(parents=True, exist_ok=True)
    url = (url or "").rstrip("/")
    if not url:
        return ""
    for attempt in range(4):
        try:
            proc = subprocess.run(
                [
                    "curl",
                    "-sL",
                    "--max-time",
                    "45",
                    "-A",
                    "Mozilla/5.0",
                    "-o",
                    str(dest),
                    "-w",
                    "%{http_code}",
                    "--retry",
                    "2",
                    url,
                ],
                capture_output=True,
                text=True,
                timeout=60,
            )
            code = (proc.stdout or "").strip()
            if code == "200" and dest.is_file() and dest.stat().st_size > 1000:
                time.sleep(0.05)
                return dest.read_text(encoding="utf-8", errors="replace")
        except Exception:
            pass
        time.sleep(1.2 * (attempt + 1))
    return dest.read_text(encoding="utf-8", errors="replace") if dest.is_file() else ""


def _compress_ru(s: str, limit: int = 140) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    # Drop stub-ish phrases if they sneak in.
    for needle in STUB_NEEDLES:
        s = s.replace(needle, "")
    s = re.sub(r"\s+([,.;:!?])", r"\1", s)
    if len(s) > limit:
        return s[: limit - 1].rstrip() + "…"
    return s


def _ability_code(word: str | None) -> str | None:
    if not word:
        return None
    w = word.lower().strip()
    if w in ABILITY_RU:
        return ABILITY_RU[w]
    for stem, code in (
        ("сил", "str"),
        ("ловкост", "dex"),
        ("телосложен", "con"),
        ("интеллект", "int"),
        ("мудрост", "wis"),
        ("харизм", "cha"),
    ):
        if w.startswith(stem):
            return code
    return None


def _slugify_en(name: str) -> str:
    s = name.lower().strip()
    s = s.replace("'", "").replace("'", "").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "feature"


# ---------------------------------------------------------------------------
# Backgrounds
# ---------------------------------------------------------------------------


def _parse_skills(raw: str) -> list[str]:
    raw = raw.replace(" и ", ", ")
    out: list[str] = []
    for part in re.split(r"[,;/]", raw):
        p = part.strip().lower()
        if not p:
            continue
        code = SKILL_RU.get(p)
        if code and code not in out:
            out.append(code)
    return out


def _parse_abilities(raw: str) -> list[str]:
    out: list[str] = []
    for part in re.split(r"[,;/]| и ", raw):
        code = _ability_code(part.strip())
        if code and code not in out:
            out.append(code)
    return out


def _origin_feat(feat_ru: str) -> dict:
    feat_ru = feat_ru.strip()
    slug = FEAT_NAME_TO_SLUG.get(feat_ru)
    variant = None
    if "Волшебник" in feat_ru:
        variant = "wizard"
    elif "Друид" in feat_ru:
        variant = "druid"
    elif "Жрец" in feat_ru:
        variant = "cleric"
    elif "Бард" in feat_ru:
        variant = "bard"
    if not slug:
        raise KeyError(f"unknown origin feat: {feat_ru}")
    # Resolve RU name without parenthetical for card label
    name_ru = re.sub(r"\s*\([^)]*\)\s*$", "", feat_ru).strip()
    out = {
        "id": slug,
        "slug": slug,
        "name_ru": name_ru,
        "name_en": FEAT_NAME_EN.get(slug, slug),
    }
    if variant:
        out["variant"] = variant
    return out


def build_backgrounds() -> dict:
    rows = _frhof("backgrounds.csv")
    assert len(rows) == 18, len(rows)
    # Fill missing EN for Harper
    name_en_fix = {"arfist": "Harper"}
    entries = []
    for i, row in enumerate(rows):
        slug = row["id"]
        url = (row.get("url_dndsu") or "").rstrip("/")
        html = fetch(url, CACHE / "backgrounds" / f"{slug}.html") if url else ""
        text = _extract_paper(html) if html else ""
        ab = re.search(r"Характеристики:\s*([^\n]+)", text)
        feat = re.search(r"Черта:\s*([^\n]+)", text)
        skills = re.search(r"Навыки:\s*([^\n]+)", text)
        tools = re.search(r"Инструменты:\s*([^\n]+)", text)
        gear = re.search(r"Снаряжение:\s*([^\n]+)", text)
        if not (ab and feat and skills and tools and gear):
            raise RuntimeError(f"background parse failed: {slug}")
        abilities = _parse_abilities(ab.group(1))
        assert len(abilities) == 3, (slug, abilities)
        origin = _origin_feat(feat.group(1).strip())
        skill_list = _parse_skills(skills.group(1))
        assert len(skill_list) == 2, (slug, skill_list)
        tool_raw = tools.group(1).strip()
        pack = _compress_ru(gear.group(1).strip(), 280)
        name_ru = row["name_ru"]
        name_en = row.get("name_en") or name_en_fix.get(slug) or slug
        abi_ru = "/".join(ABILITY_CODE_TO_RU[a] for a in abilities)
        skills_ru = ", ".join(SKILL_EN_TO_RU.get(s, s) for s in skill_list)
        traits = (
            f"{name_ru} (Герои Фаэруна): "
            f"{abi_ru} (+2/+1 или +1/+1/+1). "
            f"Черта: {origin['name_ru']}. "
            f"Навыки: {skills_ru}. "
            f"Инструмент: {tool_raw}. Пакет или 50 зм."
        )
        entries.append(
            {
                "kind": "background",
                "slug": slug,
                "name_ru": name_ru,
                "name_en": name_en,
                "source": "frhof",
                "sort_order": (i + 1) * 10,
                "external_ref": {
                    "url_dndsu": url or None,
                    "url_ttg": row.get("url_ttg") or None,
                    "book": "FRHoF",
                },
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
            "pack": "P24-C17",
            "rules_edition": "2024",
            "source": "frhof",
            "notes_ru": (
                "18 предысторий FRHoF. ASI + origin_feat. "
                "RU: backgrounds.csv / next.dnd.su."
            ),
        },
        "entries": entries,
    }


# ---------------------------------------------------------------------------
# Feats
# ---------------------------------------------------------------------------


def _clean_feat_text(text: str) -> str:
    t = text.replace("\r", "")
    t = re.sub(r"\[[A-Za-z][A-Za-z0-9'’\- ]*\]", "", t)
    t = re.sub(r"Распечатать", "", t, flags=re.I)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n+", "\n", t).strip()
    lines = [ln.strip() for ln in t.split("\n") if ln.strip()]
    # Drop comments section
    kept = []
    for ln in lines:
        if ln.startswith("Комментарии"):
            break
        kept.append(ln)
    return "\n".join(kept)


def parse_feat_card(text: str, csv_row: dict[str, str]) -> dict:
    category = (csv_row.get("feat_category") or "general").strip()
    prereq: dict = {}
    prereq_ru = None
    cleaned = _clean_feat_text(text)

    m = re.search(
        r"\((?:Требования|Requirement)[^:]*:\s*([^)]+)\)",
        cleaned,
        re.I,
    )
    if m:
        prereq_ru = m.group(1).strip()
        raw = prereq_ru.lower()
        lm = re.search(r"(\d+)\s*уров", raw)
        if lm:
            prereq["level"] = int(lm.group(1))
        if "боевой стиль" in raw:
            prereq["fighting_style_feature"] = True
        if "накладыва" in raw:
            prereq["spellcasting_feature"] = True
        abilities = []
        seen: set[str] = set()
        for ru in (
            "сила",
            "ловкость",
            "телосложение",
            "интеллект",
            "мудрость",
            "харизма",
        ):
            am = re.search(rf"{ru}\s*(\d+)\+", raw)
            if am:
                code = ABILITY_RU[ru]
                if code not in seen:
                    abilities.append({"ability": code, "min": int(am.group(1))})
                    seen.add(code)
        if abilities:
            if " или " in raw and len(abilities) >= 2:
                prereq["ability_or"] = abilities
            else:
                prereq["ability"] = abilities[0] if len(abilities) == 1 else abilities

    if category == "epic_boon" and "level" not in prereq:
        prereq["level"] = 19
        prereq_ru = prereq_ru or "Уровень 19+"
    if category == "general" and "level" not in prereq:
        prereq["level"] = 4
        prereq_ru = ("Уровень 4+; " + prereq_ru) if prereq_ru else "Уровень 4+"

    asi = None
    bump = re.search(
        r"Увеличьте значение ваш(?:ей|его)\s+"
        r"([А-Яа-яЁё]+)"
        r"(?:\s*,\s*([А-Яа-яЁё]+))?"
        r"(?:\s+или\s+([А-Яа-яЁё]+))?"
        r"\s+на\s+1",
        cleaned,
        re.I,
    )
    if bump:
        opts = []
        for g in bump.groups():
            code = _ability_code(g)
            if code and code not in opts:
                opts.append(code)
        if opts:
            asi = {
                "amount": 1,
                "from": opts,
                "cap": 20 if category != "epic_boon" else 30,
            }
    if category == "epic_boon" and asi is None:
        # many FRHoF boons: any ability +1
        if re.search(r"одной из ваших характеристик на 1", cleaned, re.I):
            asi = {"amount": 1, "from": "any", "cap": 30}

    repeatable = bool(re.search(r"повторн|можно взять снова", cleaned, re.I))

    body = cleaned
    body = re.sub(
        r"^(?:Универсальная черта|Общая черта|Черта Происхождения|"
        r"Черта происхождения|Черта Боевого стиля|Эпический дар|"
        r"Дар\b)[^\n]*\n?",
        "",
        body,
        count=1,
        flags=re.I,
    )
    # Drop leading name line
    name_ru = (csv_row.get("name_ru") or "").strip()
    lines = [ln for ln in body.split("\n") if ln.strip()]
    if lines and name_ru and lines[0].startswith(name_ru):
        lines = lines[1:]
    body = "\n".join(lines).strip()

    bullets: list[str] = []
    mben = re.search(
        r"Вы получаете следующие преимущества:\s*(.*)", body, re.S | re.I
    )
    if mben:
        block = mben.group(1).strip()
        chunks = re.split(r"\n(?=[А-ЯЁ][^.\n]{0,50}\.\s*\n)", block)
        for chunk in chunks:
            chunk = chunk.strip()
            if not chunk:
                continue
            tm = re.match(r"^([^\n]+?)\.\s*\n?(.*)$", chunk, re.S)
            if tm:
                title = tm.group(1).strip().rstrip(".")
                rest = re.sub(r"\s+", " ", tm.group(2)).strip()
                first = re.split(r"(?<=[.!?])\s+", rest)[0] if rest else ""
                if first:
                    bullets.append(_compress_ru(f"{title}: {first}", 150))
                else:
                    bullets.append(_compress_ru(title, 80))
            else:
                bullets.append(_compress_ru(chunk, 150))
            if len(bullets) >= 3:
                break
    else:
        para = re.sub(r"\s+", " ", body).strip()
        if name_ru and para.startswith(name_ru):
            para = para[len(name_ru) :].strip()
        para = re.sub(
            r"^(?:Черта Происхождения|Черта происхождения|Черта Боевого стиля|"
            r"Универсальная черта|Эпический дар)"
            r"(?:\s*\([^)]*\))?\s*",
            "",
            para,
            flags=re.I,
        )
        sents = re.split(r"(?<=[.!?])\s+", para)
        for s in sents:
            s = s.strip()
            if not s:
                continue
            bullets.append(_compress_ru(s, 160))
            if len(bullets) >= 2:
                break

    if not bullets:
        bullets = [_compress_ru(body or name_ru or "", 160)]

    summary = "; ".join(bullets)
    if len(summary) > 280:
        summary = summary[:277].rstrip() + "…"

    label = CAT_LABEL.get(category, "Черта")
    traits = f"{label} (Герои Фаэруна)"
    if prereq_ru:
        traits += f", {prereq_ru}"
    traits += f": {summary}"

    data = {
        "category": category,
        "prerequisites": prereq,
        "repeatable": repeatable,
        "ability_score_increase": asi,
        "summary_ru": summary,
        "traits_text": traits,
    }
    if prereq_ru:
        data["prerequisites_ru"] = prereq_ru
    return data


def build_feats() -> dict:
    rows = _frhof("feats.csv")
    assert len(rows) == 34, len(rows)
    entries = []
    for i, row in enumerate(rows):
        slug = row["id"]
        url = (row.get("url_dndsu") or "").rstrip("/")
        html = fetch(url, CACHE / "feats" / f"{slug}.html") if url else ""
        text = _extract_paper(html) if html else ""
        if not text:
            text = f"{row['name_ru']} [{row.get('name_en') or ''}]"
        data = parse_feat_card(text, row)
        ext = {"book": "FRHoF"}
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
                "slug": slug,
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": "frhof",
                "sort_order": sort_base + i,
                "external_ref": ext,
                "data": data,
            }
        )
    entries.sort(key=lambda e: (e["data"]["category"], e["slug"]))
    for i, e in enumerate(entries):
        e["sort_order"] = (
            {
                "origin": 50,
                "general": 200,
                "fighting_style": 400,
                "epic_boon": 600,
            }.get(e["data"]["category"], 300)
            + i
        )
    return {
        "meta": {
            "pack": "P24-C17",
            "rules_edition": "2024",
            "source": "frhof",
            "notes_ru": (
                "34 черты FRHoF (происхождение, универсальные, эпические дары). "
                "Короткие карточки по next.dnd.su; RU из feats.csv."
            ),
            "feat_count": len(entries),
        },
        "entries": entries,
    }


# ---------------------------------------------------------------------------
# Spells
# ---------------------------------------------------------------------------


def _parse_casting(raw: str) -> dict:
    raw_l = (raw or "").lower().strip()
    if "бонус" in raw_l:
        return {"unit": "bonus", "amount": 1}
    if "реакц" in raw_l:
        out: dict = {"unit": "reaction", "amount": 1}
        m = re.search(r"реакци[^.]*[,:—\-]\s*(.+)", raw, re.I)
        if m:
            out["condition"] = m.group(1).strip()
        return out
    if "минут" in raw_l:
        am = re.search(r"(\d+)", raw_l)
        return {"unit": "minute", "amount": int(am.group(1)) if am else 1}
    if "час" in raw_l:
        am = re.search(r"(\d+)", raw_l)
        return {"unit": "hour", "amount": int(am.group(1)) if am else 1}
    return {"unit": "action", "amount": 1}


def _parse_components(raw: str) -> dict:
    raw = raw or ""
    comps: dict = {
        "v": bool(re.search(r"\bВ\b|V", raw)),
        "s": bool(re.search(r"\bС\b|\bC\b|S", raw)),
    }
    mm = re.search(r"М\s*\(([^)]+)\)|M\s*\(([^)]+)\)", raw, re.I)
    if mm:
        comps["m"] = (mm.group(1) or mm.group(2) or "").strip()
    elif re.search(r"\bМ\b|\bM\b", raw):
        comps["m"] = True
    return comps


def _parse_duration(raw: str) -> tuple[str, bool]:
    raw = (raw or "").strip()
    conc = bool(re.search(r"концентрац|concentration", raw, re.I))
    disp = re.sub(r"\s*\(?\s*[Кк]онцентрация\.?\s*\)?", "", raw).strip()
    disp = disp or raw or "мгновенно"
    return disp, conc


def parse_spell_card(text: str, csv_row: dict[str, str]) -> dict:
    level = int(csv_row.get("level") or 0)
    school_csv = (csv_row.get("school") or "").strip().lower()
    school = (
        school_csv
        if school_csv in SCHOOL_RU
        else SCHOOL_EN.get(school_csv, school_csv)
    )
    school_ru = SCHOOL_RU.get(school, school)

    text = re.sub(r"\[[A-Za-z][A-Za-z0-9'’\- ]*\]", "", text)
    text = re.sub(r"Распечатать", "", text, flags=re.I)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n+", "\n", text).strip()
    # Drop comments
    text = re.split(r"\nКомментарии\b", text)[0].strip()

    ct_m = re.search(r"Время сотворения\s*:\s*([^\n]+)", text)
    rng_m = re.search(r"Дистанция\s*:\s*([^\n?]+)", text)
    comp_m = re.search(r"Компоненты\s*:\s*([^\n]+)", text)
    dur_m = re.search(r"Длительность\s*:\s*([^\n]+)", text)
    cls_m = re.search(r"Классы\s*:\s*([^\n]+)", text)

    casting = _parse_casting(ct_m.group(1) if ct_m else "действие")
    range_ru = (rng_m.group(1).strip() if rng_m else "—").replace("?", "").strip()
    comps = _parse_components(comp_m.group(1) if comp_m else "В, С")
    duration, concentration = _parse_duration(
        dur_m.group(1) if dur_m else "мгновенно"
    )
    ritual = bool(re.search(r"\bритуал\b", text, re.I))

    classes: list[str] = []
    if cls_m:
        for part in re.split(r"[,;/]| и ", cls_m.group(1)):
            p = part.strip().lower()
            en = CLASS_RU_TO_EN.get(p)
            if en:
                classes.append(en)
    if not classes:
        classes = [
            c.strip()
            for c in (csv_row.get("classes") or "").split("|")
            if c.strip()
        ]
    # Prefer CSV class list as authoritative for FRHoF (includes ranger etc.)
    csv_classes = [
        c.strip() for c in (csv_row.get("classes") or "").split("|") if c.strip()
    ]
    if csv_classes:
        classes = csv_classes
    classes = sorted(set(classes))

    body = text
    if cls_m:
        body = text[cls_m.end() :].strip()
    body = re.sub(
        r"Используя ячейку заклинания большего уровня\..*", "", body, flags=re.S
    )
    body = re.sub(r"\s+", " ", body).strip()
    sents = re.split(r"(?<=[.!?])\s+", body)
    keep = []
    for s in sents:
        s = s.strip()
        if not s:
            continue
        keep.append(_compress_ru(s, 160))
        if len(keep) >= 2:
            break
    summary = " ".join(keep) if keep else (
        f"{'Заговор' if level == 0 else f'{level} круг'} ({school_ru})."
    )
    if len(summary) > 280:
        summary = summary[:277].rstrip() + "…"

    attack_or_save = None
    if re.search(r"бросок атаки|атак[ауи] заклинани", body, re.I):
        attack_or_save = "атака"
    for ru, code in [
        ("Силы", "СИЛ"),
        ("Ловкости", "ЛОВ"),
        ("Телосложения", "ТЕЛ"),
        ("Интеллекта", "ИНТ"),
        ("Мудрости", "МДР"),
        ("Харизмы", "ХАР"),
    ]:
        if re.search(rf"спасбросок {ru}", body, re.I):
            attack_or_save = code
            break

    damage = None
    dm = re.search(
        r"(\d+к\d+|\d+d\d+)\s*(?:урона\s+)?(кислот|холод|огн|электричеств|"
        r"некротическ|психическ|излучен|яд|звуков|силово|дробящ|колющ|рубящ)",
        body,
        re.I,
    )
    if dm:
        dtype_map = {
            "кислот": "кислота",
            "холод": "холод",
            "огн": "огонь",
            "электричеств": "электричество",
            "некротическ": "некротический",
            "психическ": "психический",
            "излучен": "излучение",
            "яд": "яд",
            "звуков": "звук",
            "силово": "силовой",
            "дробящ": "дробящий",
            "колющ": "колющий",
            "рубящ": "рубящий",
        }
        key = dm.group(2).lower()
        dtype = next(
            (v for k, v in dtype_map.items() if key.startswith(k[:4])), key
        )
        dice = dm.group(1).replace("к", "d")
        damage = f"{dice} {dtype}"

    data = {
        "schema_version": 1,
        "level": level,
        "school": school,
        "school_ru": school_ru,
        "casting_time": casting,
        "magic_action": casting.get("unit") == "action",
        "range": range_ru,
        "components": comps,
        "duration": duration,
        "concentration": concentration,
        "ritual": ritual,
        "classes": classes,
        "attack_or_save": attack_or_save,
        "damage": damage,
        "summary_ru": summary,
        "description": summary,
        "source_book": "FRHoF",
    }
    hl = re.search(
        r"Используя ячейку заклинания большего уровня\.\s*([^\n]+)",
        text,
    )
    if hl:
        note = _compress_ru(hl.group(1).strip(), 180)
        data["higher_levels"] = note
        data["higher_levels_ru"] = note
    return data


def build_spells() -> dict:
    rows = _frhof("spells.csv")
    assert len(rows) == 19, len(rows)
    entries = []
    for row in rows:
        slug = row["id"]
        url = (row.get("url_dndsu") or "").rstrip("/")
        html = fetch(url, CACHE / "spells" / f"{slug}.html") if url else ""
        text = _extract_paper(html) if html else ""
        data = parse_spell_card(text or row["name_ru"], row)
        ext = {"book": "FRHoF"}
        if row.get("url_dndsu"):
            ext["url_dndsu"] = row["url_dndsu"].rstrip("/")
        if row.get("url_ttg"):
            ext["url_ttg"] = row["url_ttg"]
        entries.append(
            {
                "kind": "spell",
                "slug": slug,
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": "frhof",
                "sort_order": 0,
                "external_ref": ext,
                "data": data,
            }
        )
    entries.sort(key=lambda e: (e["data"]["level"], e["slug"]))
    for i, e in enumerate(entries):
        e["sort_order"] = e["data"]["level"] * 1000 + i
    return {
        "meta": {
            "pack": "P24-C17",
            "rules_edition": "2024",
            "source": "frhof",
            "notes_ru": (
                "19 заклинаний FRHoF (community_ref). Короткие карточки по "
                "next.dnd.su; RU из spells.csv. Полный текст книги не копируем."
            ),
            "spell_count": len(entries),
        },
        "entries": entries,
    }


def patch_class_spell_lists(spell_entries: list[dict]) -> None:
    """Append FRHoF spell slugs to class spell_list (casters + artificer if any)."""
    level_of: dict[str, int] = {}
    for path_name in ("spells_srd.json", "spells_ph24.json", "spells_efa.json"):
        p = LIVE / path_name
        if not p.is_file():
            continue
        for e in json.loads(p.read_text(encoding="utf-8"))["entries"]:
            level_of[e["slug"]] = int(e["data"]["level"])
    for e in spell_entries:
        level_of[e["slug"]] = int(e["data"]["level"])

    extra_by_class: dict[str, list[str]] = defaultdict(list)
    for e in spell_entries:
        for c in e["data"].get("classes") or []:
            extra_by_class[c].append(e["slug"])

    # SRD/PHB casters
    path = LIVE / "classes_srd.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    for entry in payload["entries"]:
        slug = entry["slug"]
        if slug not in PHB_CASTERS:
            continue
        data = entry["data"]
        existing = list(data.get("spell_list") or [])
        merged = sorted(
            set(existing) | set(extra_by_class.get(slug, [])),
            key=lambda s: (level_of.get(s, 99), s),
        )
        data["spell_list"] = merged
        note = data.get("spell_list_note_ru") or ""
        marker = "Герои Фаэруна"
        if marker not in note:
            data["spell_list_note_ru"] = (
                (note + " " if note else "")
                + "Плюс заклинания книги «Герои Фаэруна» (идентификаторы карточек 2024)."
            ).strip()
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # Artificer EFA if FRHoF lists it (currently none expected)
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
        apath.write_text(
            json.dumps(apayload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )


# ---------------------------------------------------------------------------
# Equipment
# ---------------------------------------------------------------------------


def parse_equipment_card(text: str, csv_row: dict[str, str]) -> dict:
    text = re.sub(r"\[[A-Za-z][A-Za-z0-9'’\- ]*\]", "", text)
    text = re.sub(r"Распечатать", "", text, flags=re.I)
    text = re.split(r"\nКомментарии\b", text)[0]
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n+", "\n", text).strip()

    cat = (csv_row.get("equipment_group") or "equipment").strip()
    if cat == "toolkit":
        group = "musical_instrument"
    else:
        group = "equipment"

    cost = None
    cm = re.search(r"Стоимость:\s*(\d+)\s*ЗМ", text, re.I)
    if cm:
        cost = {"amount": int(cm.group(1)), "unit": "gp"}

    weight = None
    wm = re.search(r"Вес:\s*([\d.,]+)\s*фнт", text, re.I)
    if wm:
        weight = float(wm.group(1).replace(",", "."))

    utilize = None
    um = re.search(r"Использование\s*:\s*([^\n]+)", text, re.I)
    if um:
        utilize = _compress_ru(um.group(1).strip(), 180)

    # Body after header chrome
    body = text
    for marker in ("Использование :", "Использование:", "Вес:", "Стоимость:"):
        idx = body.find(marker)
        if idx >= 0:
            # take after that line
            nl = body.find("\n", idx)
            if nl >= 0:
                body = body[nl + 1 :]
    body = re.sub(r"\s+", " ", body).strip()
    # Drop leading name
    name_ru = csv_row["name_ru"]
    if body.startswith(name_ru):
        body = body[len(name_ru) :].strip()
    body = re.sub(
        r"^(?:Инструмент|Предмет снаряжения|Снаряжение)\s*",
        "",
        body,
        flags=re.I,
    ).strip()
    sents = re.split(r"(?<=[.!?])\s+", body)
    summary_parts = []
    for s in sents:
        s = s.strip()
        if not s:
            continue
        if s.lower().startswith("вариант"):
            summary_parts.append(_compress_ru(s, 120))
            continue
        summary_parts.append(_compress_ru(s, 160))
        if len(summary_parts) >= 2:
            break
    if group == "musical_instrument" and utilize:
        # Prefer utilize + variant note for instruments with thin flavor text.
        summary_parts = [
            _compress_ru(f"Музыкальный инструмент. Использование: {utilize}", 180)
        ] + [p for p in summary_parts if p.lower().startswith("вариант")][:1]
    if not summary_parts:
        summary_parts = [f"{name_ru} — снаряжение FRHoF."]
    summary = " ".join(summary_parts)
    if len(summary) > 280:
        summary = summary[:277].rstrip() + "…"

    data: dict = {
        "equipment_group": group,
        "summary_ru": summary,
        "weight_lb": weight,
        "cost": cost,
    }
    if utilize:
        data["utilize_ru"] = utilize
        if group == "musical_instrument":
            data["tool_ability"] = "charisma"
    return data


def build_equipment() -> dict:
    rows = _frhof("equipment.csv")
    assert len(rows) == 12, len(rows)
    entries = []
    for i, row in enumerate(rows):
        slug = row["id"]
        url = (row.get("url_dndsu") or "").rstrip("/")
        html = fetch(url, CACHE / "equipment" / f"{slug}.html") if url else ""
        text = _extract_paper(html) if html else ""
        data = parse_equipment_card(text or row["name_ru"], row)
        ext = {"book": "FRHoF"}
        if row.get("url_dndsu"):
            ext["url_dndsu"] = row["url_dndsu"].rstrip("/")
        if row.get("url_ttg"):
            ext["url_ttg"] = row["url_ttg"]
        entries.append(
            {
                "kind": "item",
                "slug": slug,
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": "frhof",
                "sort_order": (i + 1) * 10,
                "external_ref": ext,
                "data": data,
            }
        )
    return {
        "meta": {
            "pack": "P24-C17",
            "rules_edition": "2024",
            "source": "frhof",
            "notes_ru": (
                "12 предметов снаряжения FRHoF (включая инструменты). "
                "kind=item; source=frhof → community_ref."
            ),
        },
        "entries": entries,
    }


# ---------------------------------------------------------------------------
# Magic items
# ---------------------------------------------------------------------------


def parse_magic_item(text: str, csv_row: dict[str, str]) -> dict:
    text = re.sub(r"\[[A-Za-z][A-Za-z0-9'’\- ]*\]", "", text)
    text = re.sub(r"Распечатать", "", text, flags=re.I)
    text = re.split(r"\nКомментарии\b", text)[0]
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n+", "\n", text).strip()

    type_ru = "чудесный предмет"
    rarity_ru = "обычный"
    header = re.search(
        r"(Кольцо|Чудесный предмет|Оружие|Доспех|Жезл|Посох)[,\s]+([а-яё ]+)",
        text,
        re.I,
    )
    if header:
        type_ru = header.group(1).strip().lower()
        rarity_ru = header.group(2).strip().lower()

    rarity = RARITY_MAP.get(rarity_ru, "common")
    mtype, mtype_ru = TYPE_MAP.get(type_ru, ("wondrous", type_ru))

    attune = bool(re.search(r"настройк", text, re.I))
    charges = None
    ch = re.search(r"(\d+)\s*заряд", text, re.I)
    if ch:
        charges = int(ch.group(1))

    # Body after rarity/cost line
    body = text
    cm = re.search(r"Рекомендованная стоимость:[^\n]*\n?", text)
    if cm:
        body = text[cm.end() :].strip()
    else:
        # after rarity line
        if header:
            body = text[header.end() :].strip()
    body = re.sub(r"\s+", " ", body).strip()
    name_ru = csv_row["name_ru"]
    if body.startswith(name_ru):
        body = body[len(name_ru) :].strip()
    sents = re.split(r"(?<=[.!?])\s+", body)
    keep = []
    for s in sents:
        s = s.strip()
        if not s:
            continue
        keep.append(_compress_ru(s, 180))
        if len(keep) >= 2:
            break
    summary = " ".join(keep) if keep else f"{name_ru} — магический предмет FRHoF."
    if len(summary) > 320:
        summary = summary[:317].rstrip() + "…"

    return {
        "schema_version": 1,
        "equipment_group": "magic_item",
        "magic_item_type": mtype,
        "magic_item_type_ru": mtype_ru,
        "rarity": rarity,
        "rarity_ru": rarity_ru,
        "requires_attunement": attune,
        "attunement_restriction_ru": "требуется настройка" if attune else None,
        "charges": charges,
        "recharge_ru": "заряды восстанавливаются на рассвете"
        if charges
        else None,
        "bonus_attack": None,
        "bonus_damage": None,
        "bonus_ac": None,
        "bonus_spell_attack": None,
        "spell_refs": [],
        "base_item_categories": [],
        "summary_ru": summary,
        "sentient": False,
        "artifact": rarity == "artifact",
    }


def build_magic_items() -> dict:
    rows = _frhof("magic_items.csv")
    assert len(rows) == 2, len(rows)
    entries = []
    for i, row in enumerate(rows):
        slug = row["id"]
        url = (row.get("url_dndsu") or "").rstrip("/")
        html = fetch(url, CACHE / "magic_items" / f"{slug}.html") if url else ""
        text = _extract_paper(html) if html else ""
        data = parse_magic_item(text or row["name_ru"], row)
        ext = {"book": "FRHoF"}
        if row.get("url_dndsu"):
            ext["url_dndsu"] = row["url_dndsu"].rstrip("/")
        if row.get("url_ttg"):
            ext["url_ttg"] = row["url_ttg"]
        entries.append(
            {
                "kind": "item",
                "slug": slug,
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": "frhof",
                "sort_order": (i + 1) * 10,
                "external_ref": ext,
                "data": data,
            }
        )
    return {
        "meta": {
            "pack": "P24-C17",
            "source": "FRHoF magic items (community_ref)",
            "count": len(entries),
            "notes": [
                "2 магических предмета FRHoF.",
                "source=frhof → community_ref.",
            ],
        },
        "entries": entries,
    }


# ---------------------------------------------------------------------------
# Subclasses
# ---------------------------------------------------------------------------


def _parse_subclass_features(html: str, code: str) -> list[dict]:
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
        # English from title= on h3 if present
        en_m = re.search(r'<h3[^>]*title="([^"]+)"', chunk)
        name_en = en_m.group(1).strip() if en_m else title_ru
        # Prefer first feature-name span + first sentence
        feat_spans = re.findall(
            r"article-body__feature-name[^>]*>(.*?)</span>\s*\.?\s*(.*?)</p>",
            chunk,
            re.S | re.I,
        )
        if feat_spans and level:
            # If multiple named sub-features on same level ability, compress all
            # into one summary for the parent feature title.
            bits = []
            for title_html, body_html in feat_spans[:3]:
                t = _strip_tags(title_html).strip().rstrip(".")
                b = _strip_tags(body_html).strip()
                first = re.split(r"(?<=[.!?])\s+", b)[0] if b else ""
                if t and first:
                    bits.append(_compress_ru(f"{t}: {first}", 140))
                elif t:
                    bits.append(_compress_ru(t, 80))
            summary = "; ".join(bits) if bits else _compress_ru(
                _strip_tags(chunk), 160
            )
        else:
            plain = _strip_tags(chunk)
            plain = re.sub(rf"^Уровень\s+{level}\s*:\s*{re.escape(title_ru)}\s*", "", plain)
            plain = re.sub(r"\s+", " ", plain).strip()
            first = re.split(r"(?<=[.!?])\s+", plain)[0] if plain else title_ru
            summary = _compress_ru(first, 160)

        by_level[level].append(
            {
                "id": _slugify_en(name_en),
                "name_en": name_en,
                "name_ru": title_ru,
                "summary_ru": summary,
            }
        )

    features = []
    for level in sorted(by_level):
        features.append({"level": level, "features": by_level[level]})
    return features


def build_subclasses() -> dict:
    rows = _frhof("subclasses.csv")
    assert len(rows) == 8, len(rows)
    # Cache class pages
    class_html: dict[str, str] = {}
    for parent in {
        SUBCLASS_CODES[r["id"]][0]
        for r in rows
        if r["id"] in SUBCLASS_CODES
    }:
        class_html[parent] = fetch(
            f"https://next.dnd.su/class/{parent}",
            CACHE / "classes" / f"{parent}.html",
        )

    entries = []
    for i, row in enumerate(rows):
        slug = row["id"]
        parent, code = SUBCLASS_CODES[slug]
        html = class_html[parent]
        features = _parse_subclass_features(html, code)
        if not features:
            raise RuntimeError(f"no features for {slug}")
        levels = {b["level"] for b in features}
        assert 3 in levels, (slug, levels)
        # short overall summary from level-0 blurb
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
                summary = _compress_ru(_strip_tags(zero.group(1)), 160)
        entries.append(
            {
                "kind": "subclass",
                "slug": slug,
                "name_ru": row["name_ru"],
                "name_en": row["name_en"] or row["subclass_id"],
                "source": "frhof",
                "sort_order": (i + 1) * 10,
                "parent_id": entry_id(kind="class", slug=parent),
                "external_ref": {
                    "url_dndsu": (row.get("url_dndsu") or f"https://next.dnd.su/class/{parent}").rstrip("/"),
                    "url_ttg": row.get("url_ttg") or None,
                    "book": "FRHoF",
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
                    "summary_ru": summary,
                },
            }
        )
    return {
        "meta": {
            "pack": "P24-C17",
            "rules_edition": "2024",
            "source": "frhof",
            "notes_ru": (
                "8 подклассов FRHoF к классам C04. parent_id = UUID класса 2024. "
                "Имена — subclasses.csv; умения — короткие карточки по next.dnd.su."
            ),
        },
        "entries": entries,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def _assert_no_stubs(payload: dict, path: Path) -> None:
    text = json.dumps(payload, ensure_ascii=False)
    for needle in STUB_NEEDLES:
        if needle in text:
            raise AssertionError(f"{path.name}: stub needle {needle!r}")
    # space before punctuation
    if re.search(r"\s+[,.;:!?]", text):
        # allow inside URLs? check RU fields only
        for e in payload.get("entries") or []:
            blob = json.dumps(e.get("data") or {}, ensure_ascii=False)
            if re.search(r"[А-Яа-яЁё]\s+[,.;:!?]", blob):
                raise AssertionError(f"{path.name}/{e.get('slug')}: space before punct")


def main() -> None:
    assert _frhof("species.csv") == []
    assert _frhof("creatures.csv") == []

    backgrounds = build_backgrounds()
    feats = build_feats()
    spells = build_spells()
    equipment = build_equipment()
    magic_items = build_magic_items()
    subclasses = build_subclasses()

    # Resolve origin feats against feat catalog (FRHoF + prior waves)
    feat_slugs = {e["slug"] for e in feats["entries"]}
    for path_name in ("feats_srd.json", "feats_ph24.json", "feats_efa.json"):
        for e in json.loads((LIVE / path_name).read_text(encoding="utf-8"))[
            "entries"
        ]:
            feat_slugs.add(e["slug"])
    for e in backgrounds["entries"]:
        oid = e["data"]["origin_feat"]["id"]
        assert oid in feat_slugs, f"origin feat missing: {oid} ({e['slug']})"

    outs = {
        "backgrounds_frhof.json": backgrounds,
        "feats_frhof.json": feats,
        "spells_frhof.json": spells,
        "equipment_frhof.json": equipment,
        "magic_items_frhof.json": magic_items,
        "subclasses_frhof.json": subclasses,
    }
    for name, payload in outs.items():
        path = LIVE / name
        _assert_no_stubs(payload, path)
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"wrote {path} entries={len(payload['entries'])}")

    patch_class_spell_lists(spells["entries"])
    print("patched classes_srd.json spell_list (+ artificer if needed)")

    # CSV name_en fix for arfist
    bg_csv = SOURCES / "backgrounds.csv"
    lines = bg_csv.read_text(encoding="utf-8").splitlines(keepends=True)
    new_lines = []
    for line in lines:
        if line.startswith("arfist,,") or line.startswith("arfist,,"):
            line = line.replace("arfist,,Арфист,", "arfist,Harper,Арфист,", 1)
        new_lines.append(line)
    bg_csv.write_text("".join(new_lines), encoding="utf-8")

    # counts note
    counts_path = SOURCES / "counts.json"
    counts = json.loads(counts_path.read_text(encoding="utf-8"))
    note = (
        "P24-C17: FRHoF live waves seeded "
        "(8+18+34+19+12+2=93); source=frhof; species/creatures FRHoF=0."
    )
    notes = counts.setdefault("notes", [])
    if note not in notes:
        notes.append(note)
    counts_path.write_text(
        json.dumps(counts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("updated counts.json note")


if __name__ == "__main__":
    main()
