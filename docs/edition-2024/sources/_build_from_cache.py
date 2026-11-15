#!/usr/bin/env python3
"""One-shot builder for P24-00 reference lists from /tmp/p24-00 caches.

Not part of runtime product. Re-run only with fresh site dumps in /tmp/p24-00.
"""
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CACHE = Path("/tmp/p24-00")
TODAY = "2026-11-15"

# Official books of the 2024-era release plan (canonical codes).
BOOK_TITLE = {
    "PH24": "Player's Handbook 2024",
    "DMG24": "Dungeon Master's Guide 2024",
    "MM24": "Monster Manual 2024",
    "EFA": "Eberron: Forge of the Artificer",
    "FRHoF": "Forgotten Realms: Heroes of Faerûn",
    "FRAiF": "Forgotten Realms: Adventures in Faerûn",
    "NsF": "Netheril's Fall",
    "ABH": "Astarion's Book of Hungers",
    "LFL": "Lorwyn: First Light",
    "RTW": "Ravenloft: The Horrors Within",
    "DDBD": "Dragon Delves",
    "AU": "Arcana Unleashed",
    "AUD": "Arcana Unleashed: Deadfall",
    "SRD": "SRD 5.2.1",
}
OFFICIAL = set(BOOK_TITLE)

# dnd.su numeric source id -> code
DND_SOURCE_MAP = {int(k): v for k, v in json.loads((CACHE / "dnd_source_map.json").read_text()).items()}

# ttg label -> canonical
TTG_BOOK = {
    "PHB": "PH24",
    "DMG": "DMG24",
    "MM": "MM24",
    "EFA": "EFA",
    "FRHOF": "FRHoF",
    "FRAIF": "FRAiF",
    "NF": "NsF",
    "ABH": "ABH",
    "LFL": "LFL",
    "RHW": "RTW",
    "RTW": "RTW",
    "DDBD": "DDBD",
    "AU": "AU",
    "AUD": "AUD",
    "SRD": "SRD",
    "WoW": "WOW",
    "WOW": "WOW",
}

# Non-official labels / groups to exclude from reference lists
EXCLUDE_TTG_LABELS = {
    "WoW", "WOW", "PUG", "MG", "GHPG", "GHMG", "FEQ", "VTMBBB", "PL", "DRP",
    "HBTD", "FFG", "UAPU", "UAA", "UAEU", "UAVO", "UA2VOU", "UAUO", "UAUO2",
    "UAHS", "UAFRS", "UAMS", "UAEU",
}
EXCLUDE_DND_CODES = {
    "WOW", "HB", "UA", "SITE", "HB:PUG", "HB:RTOC", "HB:SOA", "HB:DD",
}
EXCLUDE_DND_PREFIXES = ("HB", "UA", "AL", "PS:", "MC")

FEAT_CAT = {
    "Черта происхождения": "origin",
    "Универсальная черта": "general",
    "Боевой стиль": "fighting_style",
    "Эпический дар": "epic_boon",
    "Драконья метка": "dragonmark",
    "Тёмный дар": "dark_gift",
}
FEAT_CAT_EN = {
    "origin": "Origin",
    "general": "General",
    "fighting_style": "Fighting Style",
    "epic_boon": "Epic Boon",
    "dragonmark": "Dragonmark",
    "dark_gift": "Dark Gift",
}

CLASS_MAP = {
    "12": "bard", "11": "barbarian", "14": "fighter", "21": "wizard", "22": "druid",
    "13": "cleric", "23": "artificer", "20": "warlock", "15": "monk", "16": "paladin",
    "17": "ranger", "18": "rogue", "19": "sorcerer",
}
SCHOOL_MAP = {
    "1": "evocation", "2": "conjuration", "3": "illusion", "4": "necromancy",
    "5": "abjuration", "6": "enchantment", "7": "transmutation", "8": "divination",
}
SCHOOL_RU_TO_EN = {
    "Воплощение": "evocation", "Вызов": "conjuration", "Иллюзия": "illusion",
    "Некромантия": "necromancy", "Ограждение": "abjuration", "Очарование": "enchantment",
    "Преобразование": "transmutation", "Прорицание": "divination",
}

MASTERYS = json.loads((CACHE / "dnd/weapons_mastery.json").read_text())
MASTERY_BY_ID = {w["id"]: w for w in MASTERYS}

SRD_NAMES = {n.lower().replace("’", "'") for n in json.loads((CACHE / "srd_names.json").read_text())["all_lower"]}

# Known English names for subclasses (slug -> en), when slug alone is ugly.
SUBCLASS_EN = {
    "battlemaster": "Battle Master",
    "eldritch-knight": "Eldritch Knight",
    "psi-warrior": "Psi Warrior",
    "champion": "Champion",
    "banneret": "Banneret",
    "arcane-archer": "Arcane Archer",
    "berserker": "Path of the Berserker",
    "wild-heart": "Path of the Wild Heart",
    "world-tree": "Path of the World Tree",
    "zealot": "Path of the Zealot",
    "valor": "College of Valor",
    "lore": "College of Lore",
    "glamour": "College of Glamour",
    "dance": "College of Dance",
    "college-of-the-moon": "College of the Moon",
    "college-of-the-spirits": "College of Spirits",
    "war-domain": "War Domain",
    "life-domain": "Life Domain",
    "trickery-domain": "Trickery Domain",
    "light-domain": "Light Domain",
    "knowledge-domain": "Knowledge Domain",
    "grave-domain": "Grave Domain",
    "arcana-domain": "Arcana Domain",
    "stars": "Circle of the Stars",
    "land": "Circle of the Land",
    "moon": "Circle of the Moon",
    "sea": "Circle of the Sea",
    "warrior-of-the-hand": "Warrior of the Open Hand",
    "warrior-of-shadow": "Warrior of Shadow",
    "warrior-of-mercy": "Warrior of Mercy",
    "warrior-of-the-elements": "Warrior of the Elements",
    "warrior-of-the-mystic-arts": "Warrior of the Mystic Arts",
    "oath-of-devotion": "Oath of Devotion",
    "oath-of-glory": "Oath of Glory",
    "oath-of-vengeance": "Oath of Vengeance",
    "oath-of-the-ancients": "Oath of the Ancients",
    "oath-of-the-noble-genies": "Oath of the Noble Genies",
    "hunter-ranger": "Hunter",
    "beastmaster": "Beast Master",
    "fey-wanderer": "Fey Wanderer",
    "gloom-stalker": "Gloom Stalker",
    "winter-walker": "Winter Walker",
    "hollow-warden": "Hollow Warden",
    "thief": "Thief",
    "soulknife": "Soulknife",
    "arcane-trickster": "Arcane Trickster",
    "assassin": "Assassin",
    "scion-of-the-three": "Scion of the Three",
    "phantom": "Phantom",
    "aberrant-sorcery": "Aberrant Sorcery",
    "draconic-sorcery": "Draconic Sorcery",
    "clockwork-sorcery": "Clockwork Sorcery",
    "wild-magic-sorcery": "Wild Magic Sorcery",
    "spellfire-sorcery": "Spellfire Sorcery",
    "shadow-sorcery": "Shadow Sorcery",
    "archfey": "Archfey Patron",
    "greate-old-one-patron": "Great Old One Patron",
    "fiend-patron": "Fiend Patron",
    "celestial-patron": "Celestial Patron",
    "undead": "Undead Patron",
    "vestige-patron": "Vestige Patron",
    "evoker": "Evoker",
    "illusionist": "Illusionist",
    "necromancer": "Necromancer",
    "abjurer": "Abjurer",
    "enchanter": "Enchanter",
    "transmuter": "Transmuter",
    "conjurer": "Conjurer",
    "diviner": "Diviner",
    "bladesinger": "Bladesinger",
    "alchemist": "Alchemist",
    "artillerist": "Artillerist",
    "battle-smith": "Battle Smith",
    "armorer": "Armorer",
    "cartographer": "Cartographer",
    "reanimator": "Reanimator",
}


def slugify_en(name: str) -> str:
    s = name.lower().replace("’", "'").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def title_from_slug(slug: str) -> str:
    return SUBCLASS_EN.get(slug) or " ".join(p.capitalize() for p in slug.split("-"))


def is_excluded_dnd_code(code: str) -> bool:
    if not code:
        return True
    if code in EXCLUDE_DND_CODES or code in {"WOW"}:
        return True
    if code.startswith(EXCLUDE_DND_PREFIXES):
        return True
    # multi codes like "RTW, ABH"
    parts = [p.strip() for p in code.replace(",", " ").split() if p.strip()]
    if parts and all(p not in OFFICIAL and DND_SOURCE_MAP.get(_safe_int(p), p) not in OFFICIAL for p in parts):
        # if none official
        mapped = [normalize_dnd_book(p) for p in parts]
        return not any(m in OFFICIAL for m in mapped)
    return False


def _safe_int(x):
    try:
        return int(x)
    except Exception:
        return None


def normalize_dnd_book(code: str) -> str | None:
    if not code:
        return None
    code = code.strip()
    if code in OFFICIAL:
        return code
    # numeric
    n = _safe_int(code)
    if n is not None:
        raw = DND_SOURCE_MAP.get(n)
        if raw in OFFICIAL:
            return raw
        if raw == "WOW" or (raw and raw.startswith(("HB", "UA"))):
            return None
        return raw if raw in OFFICIAL else None
    # multi "RTW, ABH" -> prefer first official
    for part in re.split(r"[,/]", code):
        part = part.strip()
        if part in OFFICIAL:
            return part
    return None


def normalize_ttg_book(label: str | None) -> str | None:
    if not label:
        return None
    if label in EXCLUDE_TTG_LABELS:
        return None
    return TTG_BOOK.get(label)


def in_srd(name_en: str) -> bool:
    if not name_en:
        return False
    key = name_en.lower().replace("’", "'")
    if key in SRD_NAMES:
        return True
    # strip parenthetical / trailing
    key2 = re.sub(r"\s*\(.*?\)\s*", "", key).strip()
    return key2 in SRD_NAMES


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for r in sorted(rows, key=lambda x: (x.get("book") or "", x.get("id") or "")):
            w.writerow(r)


def load_list(name: str):
    return json.loads((CACHE / f"dnd/{name}.list.json").read_text())["cards"]


def sources_of(card) -> list[int]:
    out = []
    for x in card.get("filter_source") or []:
        try:
            out.append(int(x))
        except Exception:
            pass
    return out


def primary_book_from_sources(srcs: list[int], prefer: list[str] | None = None) -> str | None:
    # Prefer category-appropriate official book when a card has several sources.
    mapped = []
    for s in srcs:
        code = DND_SOURCE_MAP.get(s)
        if code in OFFICIAL:
            mapped.append(code)
    order = prefer or [
        "PH24", "DMG24", "MM24", "EFA", "FRHoF", "FRAiF", "NsF", "ABH", "LFL",
        "RTW", "AU", "AUD", "DDBD", "SRD",
    ]
    for pref in order:
        if pref in mapped:
            return pref
    return mapped[0] if mapped else None


TTG_LABEL_TO_BOOK = {
    "PHB": "PH24", "DMG": "DMG24", "MM": "MM24", "EFA": "EFA", "FRHOF": "FRHoF",
    "FRAIF": "FRAiF", "NF": "NsF", "ABH": "ABH", "LFL": "LFL", "RHW": "RTW",
    "RTW": "RTW", "DDBD": "DDBD", "AU": "AU", "AUD": "AUD", "SRD": "SRD",
}
BOOK_TO_TTG_SUFFIX = {
    "PH24": {"phb"}, "DMG24": {"dmg"}, "MM24": {"mm"}, "EFA": {"efa"},
    "FRHoF": {"frhof"}, "FRAiF": {"fraif"}, "NsF": {"nf"}, "ABH": {"abh"},
    "LFL": {"lfl"}, "RTW": {"rhw", "rtw"}, "DDBD": {"ddbd"}, "AU": {"au"},
    "AUD": {"aud"}, "SRD": {"srd"},
}


def ttg_index(path: str) -> dict[str, list[dict]]:
    """Index by normalized English name → list of ttg cards (may differ by book)."""
    p = CACHE / "ttg/api" / path
    if not p.exists():
        return {}
    data = json.loads(p.read_text())
    if not isinstance(data, list):
        return {}
    out: dict[str, list[dict]] = {}
    for it in data:
        eng = ((it.get("name") or {}).get("eng") or "").strip()
        if not eng:
            continue
        label = (((it.get("source") or {}).get("name") or {}).get("label") or "")
        if label in EXCLUDE_TTG_LABELS or label.startswith("UA"):
            continue
        key = eng.lower().replace("’", "'")
        out.setdefault(key, []).append(it)
    return out


def ttg_lookup(index: dict[str, list[dict]], name_en: str, book: str | None = None) -> dict | None:
    if not name_en:
        return None
    cands = index.get(name_en.lower().replace("’", "'")) or []
    if not cands:
        return None
    if book:
        want = BOOK_TO_TTG_SUFFIX.get(book, set())
        for it in cands:
            slug = (it.get("url") or "").split("/")[-1]
            suf = slug.split("-")[-1].lower() if "-" in slug else ""
            label = (((it.get("source") or {}).get("name") or {}).get("label") or "")
            mapped = TTG_LABEL_TO_BOOK.get(label)
            if suf in want or mapped == book:
                return it
        return None  # do not attach wrong-book / UA ttg URL
    # Prefer Basic-group official when book not specified
    for it in cands:
        group = (((it.get("source") or {}).get("group") or {}).get("label") or "")
        if group == "Basic":
            return it
    return cands[0]


def ttg_url(category: str, it: dict | None) -> str:
    if not it:
        return ""
    return f"https://new.ttg.club/{category}/{it['url']}"


def dnd_abs(href: str) -> str:
    if not href:
        return ""
    if href.startswith("http"):
        return href
    return "https://next.dnd.su" + href


# ---------- builders ----------

excluded_rows: list[dict] = []
discrepancies: list[dict] = []


def note_excluded(category, id_, name_en, name_ru, reason, source, url=""):
    excluded_rows.append({
        "category": category, "id": id_, "name_en": name_en, "name_ru": name_ru,
        "reason": reason, "source": source, "url": url,
    })


def _norm_ru(s: str) -> str:
    s = (s or "").strip().lower().replace("ё", "е").replace("’", "'")
    s = re.sub(r"\s+", " ", s)
    return s


def compare_names(category, id_, name_en, ru_dnd, ru_ttg):
    if not ru_dnd or not ru_ttg:
        return ru_dnd or ru_ttg
    a, b = ru_dnd.strip(), ru_ttg.strip()
    if a == b or _norm_ru(a) == _norm_ru(b):
        return a
    # propose: prefer dnd.su (larger 2024 coverage / owner primary), note both
    proposed = a
    discrepancies.append({
        "category": category,
        "id": id_,
        "name_en": name_en,
        "dndsu": a,
        "ttg": b,
        "proposed": proposed,
        "why": "Предложено имя next.dnd.su как первичного списка состава 2024; ttg сохранён для сверки Игорем.",
    })
    return proposed


def build_species():
    from bs4 import BeautifulSoup
    soup = BeautifulSoup((CACHE / "dnd/species.html").read_text(errors="replace"), "lxml")
    ttg = ttg_index("species.json")
    rows = []
    for div in soup.select("div.tile"):
        a = div.select_one("a.tile-wrapper")
        if not a:
            continue
        href = a.get("href", "")
        rid = href.rstrip("/").split("/")[-1]
        ru = (a.select_one(".article_title").get_text(strip=True) if a.select_one(".article_title") else "")
        en = (a.select_one(".article_title_en").get_text(strip=True) if a.select_one(".article_title_en") else "")
        src_el = a.select_one(".article_source")
        code = (src_el.get_text(strip=True) if src_el else "")
        # RTW, ABH dual
        books = []
        for part in re.split(r"[,/]", code):
            b = normalize_dnd_book(part.strip())
            if b:
                books.append(b)
        if not books:
            note_excluded("species", rid, en, ru, f"неофициальная/неизвестная книга: {code}", "dnd.su", dnd_abs(href))
            continue
        book = books[0]
        tit = ttg_lookup(ttg, en, book)
        ru = compare_names("species", rid, en, ru, ((tit.get("name") or {}).get("rus") if tit else ""))
        rows.append({
            "id": rid, "name_en": en, "name_ru": ru, "book": book, "category": "species",
            "url_dndsu": dnd_abs(href), "url_ttg": ttg_url("species", tit),
            "srd": str(in_srd(en)).lower(),
        })
    # also mark ttg-only excluded unofficial
    for it in json.loads((CACHE / "ttg/api/species.json").read_text()):
        label = ((it.get("source") or {}).get("name") or {}).get("label")
        eng = (it.get("name") or {}).get("eng") or ""
        rus = (it.get("name") or {}).get("rus") or ""
        if normalize_ttg_book(label) is None:
            note_excluded("species", it.get("url"), eng, rus, f"ttg неофициальный источник {label}", "ttg.club", ttg_url("species", it))
    return rows


def build_classes():
    from bs4 import BeautifulSoup
    soup = BeautifulSoup((CACHE / "dnd/class.html").read_text(errors="replace"), "lxml")
    ttg = ttg_index("classes.json")
    rows = []
    for a in soup.select("a.tile-wrapper.class"):
        href = a.get("href", "")
        rid = href.rstrip("/").split("/")[-1]
        ru = a.select_one(".article_title").get_text(strip=True)
        en = a.select_one(".article_title_en").get_text(strip=True)
        src = a.select_one(".article_source").get_text(strip=True)
        # map long title to code
        book = None
        for code, title in BOOK_TITLE.items():
            if title.lower() in src.lower() or src.lower() in title.lower():
                book = code
                break
        if "Player's Handbook 2024" in src:
            book = "PH24"
        if "Eberron: Forge of the Artificer" in src:
            book = "EFA"
        if "World of Warcraft" in src or "Pugilist" in src:
            note_excluded("classes", rid, en, ru, f"неофициальный класс: {src}", "dnd.su", dnd_abs(href))
            continue
        if not book:
            note_excluded("classes", rid, en, ru, f"книга не из плана: {src}", "dnd.su", dnd_abs(href))
            continue
        tit = ttg_lookup(ttg, en, book)
        ru = compare_names("classes", rid, en, ru, ((tit.get("name") or {}).get("rus") if tit else ""))
        rows.append({
            "id": rid, "name_en": en, "name_ru": ru, "book": book, "category": "classes",
            "url_dndsu": dnd_abs(href), "url_ttg": ttg_url("classes", tit),
            "srd": str(in_srd(en)).lower(),
        })
    return rows


def build_subclasses():
    raw = json.loads((CACHE / "dnd/subclasses.parsed.json").read_text())
    rows = []
    for s in raw:
        src_html = s.get("source_raw") or ""
        m = re.search(r'title="([^"]+)"', src_html)
        title = m.group(1) if m else ""
        book = None
        if "Homebrew" in title or title.startswith("HB") or "Drakkenheim" in title:
            note_excluded("subclasses", s["id"], title_from_slug(s["id"]), s["name_ru"], f"homebrew/3rd: {title}", "dnd.su", "")
            continue
        if "World of Warcraft" in title:
            note_excluded("subclasses", s["id"], title_from_slug(s["id"]), s["name_ru"], "World of Warcraft", "dnd.su", "")
            continue
        for code, bt in BOOK_TITLE.items():
            if bt.lower() in title.lower() or title.lower() in bt.lower():
                book = code
                break
        # fuzzy short names
        mapping = {
            "Player's Handbook 2024": "PH24",
            "Eberron: Forge of the Artificer": "EFA",
            "Forgotten Realms: Heroes of Faerun": "FRHoF",
            "Forgotten Realms: Heroes of Faerûn": "FRHoF",
            "Ravenloft: The Horrors Within": "RTW",
            "Arcana Unleashed": "AU",
        }
        if title in mapping:
            book = mapping[title]
        if not book:
            note_excluded("subclasses", s["id"], title_from_slug(s["id"]), s["name_ru"], f"книга не из плана: {title}", "dnd.su", "")
            continue
        en = title_from_slug(s["id"])
        # fix greate typo in id keep as site slug but english correct
        if s["id"] == "greate-old-one-patron":
            en = "Great Old One Patron"
        rows.append({
            "id": f"{s['class_id']}__{s['id']}",
            "class_id": s["class_id"],
            "subclass_id": s["id"],
            "name_en": en,
            "name_ru": s["name_ru"],
            "book": book,
            "category": "subclasses",
            "url_dndsu": dnd_abs(f"/class/{s['class_id']}"),
            "url_ttg": "",
            "srd": str(in_srd(en) or in_srd(en.replace(" Patron", "").replace(" Domain", "").replace("College of ", "").replace("Circle of ", "").replace("Path of the ", "").replace("Oath of ", "").replace("Warrior of the ", "").replace("Warrior of ", ""))).lower(),
        })
    return rows


def build_backgrounds():
    bgs = json.loads((CACHE / "dnd/backgrounds.parsed.json").read_text())
    ttg = ttg_index("backgrounds.json")
    rows = []
    for b in bgs:
        book = normalize_dnd_book(b["source_code"])
        if not book:
            note_excluded("backgrounds", b["id"], b["name_en"], b["name_ru"], f"книга {b['source_code']}", "dnd.su", dnd_abs(b["href"]))
            continue
        tit = ttg_lookup(ttg, b["name_en"], book)
        ru = compare_names("backgrounds", b["id"], b["name_en"], b["name_ru"], ((tit.get("name") or {}).get("rus") if tit else ""))
        rows.append({
            "id": b["id"], "name_en": b["name_en"], "name_ru": ru, "book": book, "category": "backgrounds",
            "url_dndsu": dnd_abs(b["href"]), "url_ttg": ttg_url("backgrounds", tit),
            "srd": str(in_srd(b["name_en"])).lower(),
        })
    return rows


def build_feats():
    cards = load_list("feats")
    ttg = ttg_index("feats.json")
    rows = []
    for c in cards:
        srcs = sources_of(c)
        book = primary_book_from_sources(srcs)
        link = c.get("link") or ""
        rid = link.rstrip("/").split("/")[-1]
        rid = re.sub(r"^\d+-", "", rid)
        en = c.get("title_en") or ""
        ru = c.get("title") or ""
        if not book:
            codes = [DND_SOURCE_MAP.get(s, str(s)) for s in srcs]
            note_excluded("feats", rid, en, ru, f"неофициальные источники: {codes}", "dnd.su", dnd_abs(link))
            continue
        feat_cat = FEAT_CAT.get(c.get("type_order") or c.get("item_icon_title") or "", "general")
        # TTG category cross-check
        tit = ttg_lookup(ttg, en, book)
        ru = compare_names("feats", rid, en, ru, ((tit.get("name") or {}).get("rus") if tit else ""))
        rows.append({
            "id": rid, "name_en": en, "name_ru": ru, "book": book, "category": "feats",
            "feat_category": feat_cat,
            "feat_category_ru": c.get("type_order") or "",
            "url_dndsu": dnd_abs(link), "url_ttg": ttg_url("feats", tit),
            "srd": str(in_srd(en)).lower(),
        })
    return rows


def build_spells():
    cards = load_list("spells")
    ttg = ttg_index("spells.json")
    rows = []
    for c in cards:
        srcs = sources_of(c)
        book = primary_book_from_sources(srcs)
        link = c.get("link") or ""
        rid = re.sub(r"^\d+-", "", link.rstrip("/").split("/")[-1])
        en = c.get("title_en") or ""
        ru = c.get("title") or ""
        if not book:
            codes = [DND_SOURCE_MAP.get(s, str(s)) for s in srcs]
            note_excluded("spells", rid, en, ru, f"неофициальные источники: {codes}", "dnd.su", dnd_abs(link))
            continue
        classes = []
        for cid in c.get("filter_class") or []:
            name = CLASS_MAP.get(str(cid))
            if name and not name.startswith("wow"):
                classes.append(name)
        school = SCHOOL_RU_TO_EN.get(c.get("school") or "", "")
        if not school:
            for fid in c.get("filter_school") or []:
                school = SCHOOL_MAP.get(str(fid), school)
        tit = ttg_lookup(ttg, en, book)
        ru = compare_names("spells", rid, en, ru, ((tit.get("name") or {}).get("rus") if tit else ""))
        rows.append({
            "id": rid, "name_en": en, "name_ru": ru, "book": book, "category": "spells",
            "level": c.get("level", ""),
            "school": school or (c.get("school") or ""),
            "classes": "|".join(sorted(set(classes))),
            "url_dndsu": dnd_abs(link), "url_ttg": ttg_url("spells", tit),
            "srd": str(in_srd(en)).lower(),
        })
    return rows


def build_equipment_split():
    eq = json.loads((CACHE / "dnd/equipment.parsed.json").read_text())
    ttg_items = ttg_index("items.json")
    weapons, armor, gear = [], [], []
    for e in eq:
        g = e["group"]
        en = e["name_en"]
        ru = e["name_ru"]
        rid = e["id"]
        tit = ttg_lookup(ttg_items, en, "PH24")
        ru = compare_names("equipment", rid, en, ru, ((tit.get("name") or {}).get("rus") if tit else ""))
        base = {
            "id": rid, "name_en": en, "name_ru": ru, "book": "PH24",
            "url_dndsu": dnd_abs(e["href"]), "url_ttg": ttg_url("items", tit),
            "srd": str(in_srd(en)).lower(),
            "equipment_group": g,
        }
        if "weapon" in g:
            w = MASTERY_BY_ID.get(rid, {})
            weapons.append({
                **base, "category": "weapons",
                "mastery": w.get("mastery_en") or "",
                "mastery_ru": w.get("mastery_ru") or "",
            })
        elif g in {"light_armor", "medium_armor", "heavy_armor", "shield"}:
            armor.append({**base, "category": "armor"})
        else:
            gear.append({**base, "category": "equipment"})
    return weapons, armor, gear


def build_magic_items():
    cards = load_list("items")
    ttg = ttg_index("magic_items.json")
    rows = []
    for c in cards:
        srcs = sources_of(c)
        book = primary_book_from_sources(
            srcs,
            prefer=["DMG24", "PH24", "AUD", "AU", "EFA", "FRHoF", "FRAiF", "NsF", "ABH", "LFL", "RTW", "DDBD", "MM24", "SRD"],
        )
        link = c.get("link") or ""
        rid = re.sub(r"^\d+-", "", link.rstrip("/").split("/")[-1])
        en = c.get("title_en") or ""
        ru = c.get("title") or ""
        if not book:
            codes = [DND_SOURCE_MAP.get(s, str(s)) for s in srcs]
            note_excluded("magic_items", rid, en, ru, f"неофициальные источники: {codes}", "dnd.su", dnd_abs(link))
            continue
        tit = ttg_lookup(ttg, en, book)
        ru = compare_names("magic_items", rid, en, ru, ((tit.get("name") or {}).get("rus") if tit else ""))
        # Disambiguate same English slug published under different books/URLs.
        uniq = rid
        if any(r["id"] == uniq for r in rows):
            uniq = f"{rid}__{book.lower()}"
        rows.append({
            "id": uniq, "name_en": en, "name_ru": ru, "book": book, "category": "magic_items",
            "url_dndsu": dnd_abs(link), "url_ttg": ttg_url("magic-items", tit),
            "srd": str(in_srd(en)).lower(),
        })
    return rows


def build_creatures():
    cards = load_list("bestiary")
    ttg = ttg_index("bestiary.json")
    rows = []
    for c in cards:
        srcs = sources_of(c)
        book = primary_book_from_sources(
            srcs,
            prefer=["MM24", "PH24", "RTW", "FRAiF", "FRHoF", "AUD", "AU", "EFA", "NsF", "ABH", "LFL", "DDBD", "DMG24", "SRD"],
        )
        link = c.get("link") or ""
        rid = re.sub(r"^\d+-", "", link.rstrip("/").split("/")[-1])
        en = c.get("title_en") or ""
        ru = c.get("title") or ""
        if not book:
            codes = [DND_SOURCE_MAP.get(s, str(s)) for s in srcs]
            note_excluded("creatures", rid, en, ru, f"неофициальные источники: {codes}", "dnd.su", dnd_abs(link))
            continue
        tit = ttg_lookup(ttg, en, book)
        ru = compare_names("creatures", rid, en, ru, ((tit.get("name") or {}).get("rus") if tit else ""))
        rows.append({
            "id": rid, "name_en": en, "name_ru": ru, "book": book, "category": "creatures",
            "creature_type": c.get("type_order") or "",
            "url_dndsu": dnd_abs(link), "url_ttg": ttg_url("bestiary", tit),
            "srd": str(in_srd(en)).lower(),
        })
    return rows


def build_glossary():
    entries = json.loads((CACHE / "dnd/glossary.parsed.json").read_text())
    ttg = ttg_index("glossary.json")
    rows = []
    for e in entries:
        rid = e["id"]
        en = e["name_en"]
        ru = re.sub(r"#\s*⤒", "", e["name_ru"]).strip()
        tit = ttg_lookup(ttg, en, "PH24") if en else None
        if tit:
            ru = compare_names("glossary", rid, en, ru, ((tit.get("name") or {}).get("rus") if tit else ""))
        sub = e.get("section") or "general"
        if sub == "conditions" or rid in {
            "blinded-condition", "charmed", "deafened", "exhaustion", "frightened",
            "grappled", "incapacitated", "invisible", "paralyzed", "petrified",
            "poisoned", "prone", "restrained", "stunned", "unconscious",
        }:
            sub = "condition"
        used = {r["id"] for r in rows}
        # Prefer English slug; site sometimes reuses data-uri for different entries.
        uniq = slugify_en(en) if en else rid
        if not uniq:
            uniq = rid or f"entry-{len(rows)}"
        if uniq in used:
            uniq = f"{uniq}__{rid}" if rid and f"{uniq}__{rid}" not in used else f"{uniq}__{len(rows)}"
        rows.append({
            "id": uniq, "name_en": en, "name_ru": ru, "book": "PH24", "category": "glossary",
            "glossary_section": sub,
            "url_dndsu": dnd_abs(e["href"] if e["href"].startswith("/") else f"/glossary/{rid}"),
            "url_ttg": ttg_url("glossary", tit),
            "srd": str(in_srd(en)).lower(),
        })
    return rows


def build_bastions():
    # Both sites: no usable facility list on access date.
    return []


def build_counts(catalog: dict[str, list[dict]]) -> dict:
    out = {"by_category": {}, "by_category_book": {}, "generated": TODAY, "notes": []}
    for cat, rows in catalog.items():
        out["by_category"][cat] = len(rows)
        bc = Counter(r["book"] for r in rows)
        # Only non-zero books — zeros live in gaps.md (e.g. DDBD, bastions).
        out["by_category_book"][cat] = dict(sorted((k, v) for k, v in bc.items() if v))
    out["notes"].append("DDBD (Dragon Delves): 0 записей на обоих сайтах на дату опроса.")
    out["notes"].append("bastions: 0 — разделы пусты/недоступны (см. gaps.md).")
    return out


def build_glossary_ru(catalog: dict[str, list[dict]]):
    rows = []
    seen = set()
    for cat, items in catalog.items():
        for r in items:
            key = (r["id"], cat)
            if key in seen:
                continue
            seen.add(key)
            rows.append({
                "id": r["id"],
                "category": cat,
                "name_en": r.get("name_en", ""),
                "name_ru": r.get("name_ru", ""),
                "book": r.get("book", ""),
            })
    return rows


def main():
    catalog = {}
    catalog["species"] = build_species()
    catalog["classes"] = build_classes()
    catalog["subclasses"] = build_subclasses()
    catalog["backgrounds"] = build_backgrounds()
    catalog["feats"] = build_feats()
    catalog["spells"] = build_spells()
    weapons, armor, gear = build_equipment_split()
    catalog["weapons"] = weapons
    catalog["armor"] = armor
    catalog["equipment"] = gear
    catalog["magic_items"] = build_magic_items()
    catalog["creatures"] = build_creatures()
    catalog["bastions"] = build_bastions()
    catalog["glossary"] = build_glossary()

    # Write category CSVs
    common = ["id", "name_en", "name_ru", "book", "category", "url_dndsu", "url_ttg", "srd"]
    schemas = {
        "species": common,
        "classes": common,
        "subclasses": ["id", "class_id", "subclass_id", "name_en", "name_ru", "book", "category", "url_dndsu", "url_ttg", "srd"],
        "backgrounds": common,
        "feats": common + ["feat_category", "feat_category_ru"],
        "spells": common + ["level", "school", "classes"],
        "weapons": common + ["mastery", "mastery_ru", "equipment_group"],
        "armor": common + ["equipment_group"],
        "equipment": common + ["equipment_group"],
        "magic_items": common,
        "creatures": common + ["creature_type"],
        "bastions": common,
        "glossary": common + ["glossary_section"],
    }
    for cat, rows in catalog.items():
        write_csv(ROOT / f"{cat}.csv", schemas[cat], rows)

    counts = build_counts(catalog)
    (ROOT / "counts.json").write_text(json.dumps(counts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    gloss = build_glossary_ru(catalog)
    write_csv(ROOT / "glossary_ru.csv", ["id", "category", "name_en", "name_ru", "book"], gloss)

    # discrepancies.md
    lines = [
        "# Расхождения русских названий (P24-00)",
        "",
        f"Дата сверки: {TODAY}. Источники: next.dnd.su и new.ttg.club.",
        "",
        f"Всего расхождений: **{len(discrepancies)}**.",
        "",
        "Правило: агент не выбирает молча — ниже оба варианта и предложенное имя (для решения Игоря).",
        "",
    ]
    if not discrepancies:
        lines.append("Расхождений по совпавшим английским именам не найдено (или пара не нашлась на одном из сайтов).")
    else:
        lines += ["| Категория | id | EN | dnd.su | ttg.club | Предложено | Почему |", "|---|---|---|---|---|---|---|"]
        for d in discrepancies:
            lines.append(
                f"| {d['category']} | `{d['id']}` | {d['name_en']} | {d['dndsu']} | {d['ttg']} | **{d['proposed']}** | {d['why']} |"
            )
    (ROOT / "discrepancies.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # excluded.md
    elines = [
        "# Отсечённое (неофициальное / вне плана) — P24-00",
        "",
        f"Дата: {TODAY}. В эталонные списки не входит.",
        "",
        f"Всего отсечено: **{len(excluded_rows)}**.",
        "",
        "| Категория | id | EN | RU | Причина | Источник | URL |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in sorted(excluded_rows, key=lambda x: (x["category"], x["id"] or "")):
        elines.append(
            f"| {r['category']} | `{r['id']}` | {r['name_en']} | {r['name_ru']} | {r['reason']} | {r['source']} | {r['url']} |"
        )
    (ROOT / "excluded.md").write_text("\n".join(elines) + "\n", encoding="utf-8")

    print("CATEGORIES")
    for cat, rows in catalog.items():
        print(f"  {cat}: {len(rows)}")
    print("discrepancies", len(discrepancies))
    print("excluded", len(excluded_rows))


if __name__ == "__main__":
    main()
