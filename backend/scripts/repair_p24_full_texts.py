#!/usr/bin/env python3
"""P24-C20R: restore full text_ru / traits_text in live 2024 JSON (no mid-word «…»).

Sources: /tmp/p24-fulltext cache (next.dnd.su HTML + TTG API v2).
summary_ru may stay short but only cut on sentence/word boundaries.
Also fixes ebonbane rarity/sentient and normalizes rarity_ru dictionary.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from html import unescape
from pathlib import Path
from typing import Any

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

from scrape_p24_c13_monsters import parse_page  # noqa: E402
import build_p24_c13_monsters_mm_w1 as mm  # noqa: E402
import build_p24_c18_fraif_bundle as c18  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"
CACHE = Path("/tmp/p24-fulltext")
DNDSU = CACHE / "dndsu"
TTG = CACHE / "ttg"

ELL_RE = re.compile(r"(…|\.\.\.)$")
MIDWORD_RE = re.compile(r"[A-Za-zА-Яа-яЁё]\s*$")  # after strip of ellipsis
GLUE_RE = re.compile(r"\.;|…;")

RARITY_RU = {
    "common": "обычный",
    "uncommon": "необычный",
    "rare": "редкий",
    "very_rare": "очень редкий",
    "legendary": "легендарный",
    "artifact": "артефакт",
    "varies": "редкость различается",
}
RARITY_RU_ALLOWED = set(RARITY_RU.values())
RARITY_RU_ALIASES = {
    "обычное": "обычный",
    "необычное": "необычный",
    "редкое": "редкий",
    "очень редкое": "очень редкий",
    "легендарное": "легендарный",
    "редкость варьируется": "редкость различается",
    "вариативная": "редкость различается",
    "вариативный": "редкость различается",
}
RARITY_FROM_RU = {v: k for k, v in RARITY_RU.items()}
RARITY_FROM_RU.update(
    {
        "обычное": "common",
        "необычное": "uncommon",
        "редкое": "rare",
        "очень редкое": "very_rare",
        "легендарное": "legendary",
        "редкость варьируется": "varies",
        "вариативная": "varies",
        "вариативный": "varies",
    }
)

STATS = Counter()


def clean(text: str) -> str:
    t = mm.clean_ru_text(c18.fix_dice_ru(text or ""))
    t = re.sub(r";\.", ";", t)
    t = re.sub(r"\.;", ".", t)
    t = re.sub(r"…;", "…", t)
    return t.strip()


def strip_ttg(text: str) -> str:
    return clean(c18.strip_ttg_markup(text or ""))


def flatten_ttg_desc(desc: Any) -> str:
    if desc is None:
        return ""
    if isinstance(desc, str):
        return strip_ttg(desc)
    if isinstance(desc, list):
        parts = [flatten_ttg_desc(x) for x in desc]
        return clean(" ".join(p for p in parts if p))
    if isinstance(desc, dict):
        if "content" in desc:
            return flatten_ttg_desc(desc.get("content"))
        if "entries" in desc:
            return flatten_ttg_desc(desc.get("entries"))
        bits = []
        for k in ("text", "rus", "eng", "name"):
            if k in desc:
                bits.append(flatten_ttg_desc(desc[k]))
        return clean(" ".join(bits))
    return clean(str(desc))


def cut_summary(text: str, *, limit: int = 280) -> str:
    """Short summary: cut only on sentence / word boundary, never mid-word."""
    t = clean(text)
    if len(t) <= limit:
        return t
    window = t[:limit]
    # Prefer last sentence end
    ends = [m.end() for m in re.finditer(r"[.!?…](?=\s|$)", window)]
    if ends and ends[-1] >= max(40, limit // 3):
        return window[: ends[-1]].rstrip()
    # Else last space
    cut = window.rsplit(" ", 1)[0].rstrip(".,;:…")
    if len(cut) < 20:
        cut = window.rstrip(".,;:…")
    return cut


def ends_ellipsis(s: str) -> bool:
    return bool(ELL_RE.search((s or "").rstrip()))


def midword_cut(s: str) -> bool:
    """True if string ends with ellipsis right after a letter (mid-word)."""
    t = (s or "").rstrip()
    if not ends_ellipsis(t):
        return False
    core = ELL_RE.sub("", t).rstrip()
    return bool(core) and bool(re.search(r"[A-Za-zА-Яа-яЁё]$", core))


def load_html(slug: str, category: str) -> str:
    path = DNDSU / category / f"{slug}.html"
    if path.is_file() and path.stat().st_size > 500:
        return path.read_text(encoding="utf-8", errors="replace")
    return ""


def load_ttg(slug: str, category: str) -> dict | None:
    path = TTG / category / f"{slug}.json"
    if path.is_file() and path.stat().st_size > 40:
        return json.loads(path.read_text(encoding="utf-8"))
    return None


def features_from_parse(parsed: dict) -> dict[str, list[dict]]:
    out = {}
    for key in ("traits", "actions", "bonus_actions", "reactions", "legendary_actions"):
        items = []
        for feat in parsed.get(key) or []:
            name = clean(feat.get("name_ru") or "")
            text = clean(feat.get("text_ru") or "")
            if not name or not text:
                continue
            item = {"name_ru": name, "text_ru": text}
            if feat.get("name_en"):
                item["name_en"] = feat["name_en"]
            items.append(item)
        out[key] = items
    return out


def features_from_ttg(payload: dict) -> dict[str, list[dict]]:
    mapping = {
        "traits": "traits",
        "actions": "actions",
        "bonus_actions": "bonusActions",
        "reactions": "reactions",
    }
    out: dict[str, list[dict]] = {}
    for live_key, ttg_key in mapping.items():
        items = []
        for feat in payload.get(ttg_key) or []:
            name_obj = feat.get("name")
            if isinstance(name_obj, dict):
                name = name_obj.get("rus") or name_obj.get("eng") or ""
                name_en = name_obj.get("eng")
            else:
                name = str(name_obj or "")
                name_en = None
            text = flatten_ttg_desc(feat.get("description"))
            name = clean(name)
            if not name or not text:
                continue
            item = {"name_ru": name, "text_ru": text}
            if name_en:
                item["name_en"] = name_en
            items.append(item)
        out[live_key] = items
    leg = payload.get("legendary") or {}
    leg_items = []
    for feat in leg.get("actions") or []:
        name_obj = feat.get("name")
        if isinstance(name_obj, dict):
            name = name_obj.get("rus") or name_obj.get("eng") or ""
            name_en = name_obj.get("eng")
        else:
            name = str(name_obj or "")
            name_en = None
        text = flatten_ttg_desc(feat.get("description"))
        name = clean(name)
        if not name or not text:
            continue
        item = {"name_ru": name, "text_ru": text}
        if name_en:
            item["name_en"] = name_en
        leg_items.append(item)
    out["legendary_actions"] = leg_items
    return out


def match_replace_features(live_list: list[dict], full_list: list[dict]) -> int:
    """Replace truncated text_ru by matching name_ru (normalized)."""
    by_name: dict[str, dict] = {}
    for f in full_list:
        key = re.sub(r"\s+", " ", (f.get("name_ru") or "").lower().replace("ё", "е")).strip()
        by_name[key] = f
    n = 0
    for feat in live_list or []:
        key = re.sub(
            r"\s+", " ", (feat.get("name_ru") or "").lower().replace("ё", "е")
        ).strip()
        src = by_name.get(key)
        if not src:
            # fuzzy: startswith
            for k, v in by_name.items():
                if k.startswith(key[:20]) or key.startswith(k[:20]):
                    src = v
                    break
        if not src:
            continue
        old = feat.get("text_ru") or feat.get("text") or ""
        new = src["text_ru"]
        if not new:
            continue
        if ends_ellipsis(old) or len(new) > len(old) + 5 or midword_cut(old):
            feat["text_ru"] = new
            if "text" in feat and isinstance(feat["text"], str):
                feat["text"] = new
            n += 1
    return n


def repair_creature_entry(entry: dict) -> int:
    slug = entry["slug"]
    data = entry.setdefault("data", {})
    restored = 0
    full: dict[str, list[dict]] | None = None
    html = load_html(slug, "creatures")
    if html:
        meta = {
            "id": slug,
            "name_en": entry.get("name_en") or slug,
            "name_ru": entry.get("name_ru") or slug,
            "url_dndsu": (entry.get("external_ref") or {}).get("url_dndsu") or "",
            "url_ttg": (entry.get("external_ref") or {}).get("url_ttg") or "",
            "creature_type": data.get("type_ru") or "",
        }
        try:
            parsed = parse_page(html, meta)
            if not parsed.get("incomplete"):
                full = features_from_parse(parsed)
        except Exception:
            full = None
    if full is None:
        ttg = load_ttg(slug, "creatures")
        if ttg:
            full = features_from_ttg(ttg)
    if full:
        for key in ("traits", "actions", "bonus_actions", "reactions", "legendary_actions"):
            restored += match_replace_features(data.get(key) or [], full.get(key) or [])
    # Fix summary mid-word if needed
    summary = data.get("summary_ru") or ""
    if midword_cut(summary) or GLUE_RE.search(summary):
        # rebuild short summary from size/type/CR if present
        bits = []
        if data.get("size_ru") and data.get("type_ru"):
            bits.append(f"{data['size_ru']} {data['type_ru']}")
        if data.get("cr") is not None:
            bits.append(f"ПО {data['cr']}")
        if data.get("ac") is not None and data.get("hp_average") is not None:
            form = data.get("hp_formula") or ""
            bits.append(f"КД {data['ac']}, хиты {data['hp_average']}" + (f" ({form})" if form else ""))
        if bits:
            data["summary_ru"] = cut_summary("; ".join(bits) + ".", limit=280)
            restored += 1
        else:
            data["summary_ru"] = cut_summary(summary, limit=280)
            restored += 1
    elif ends_ellipsis(summary) and midword_cut(summary):
        data["summary_ru"] = cut_summary(summary, limit=280)
        restored += 1
    return restored


def species_traits_text(entry: dict) -> str | None:
    slug = entry["slug"]
    ttg = load_ttg(slug, "species")
    if ttg:
        props = ttg.get("properties") or {}
        type_ru = (props.get("type") or "гуманоид").lower()
        sizes = props.get("sizes") or []
        size_labels = []
        for s in sizes:
            st = (s.get("type") or "").upper()
            size_labels.append(
                {
                    "TINY": "крошечный",
                    "SMALL": "маленький",
                    "MEDIUM": "средний",
                    "LARGE": "большой",
                }.get(st, st.lower())
            )
        if not size_labels:
            size_labels = ["средний"]
        speed = int((props.get("movement") or {}).get("base") or 30)
        bits = [
            f"{entry['name_ru']}: {type_ru}, {'/'.join(size_labels)}, {speed} фт."
        ]
        for feat in ttg.get("features") or []:
            name_obj = feat.get("name")
            name = (
                name_obj.get("rus")
                if isinstance(name_obj, dict)
                else str(name_obj or feat.get("url") or "")
            )
            desc = flatten_ttg_desc(feat.get("description"))
            if name and desc:
                bits.append(f"{clean(name)}. {desc}")
            elif name:
                bits.append(clean(name))
        return clean(" ".join(bits))
    html = load_html(slug, "species")
    if html:
        # Extract feature blocks
        bits = [entry["name_ru"] + "."]
        for m in re.finditer(
            r"article-body__feature-name'[^>]*>([^<]+)</span>\.?\s*(.*?)</p>",
            html,
            re.S | re.I,
        ):
            name = unescape(m.group(1)).strip()
            body = clean(re.sub(r"<[^>]+>", " ", m.group(2)))
            bits.append(f"{name}. {body}" if body else name)
        if len(bits) > 1:
            return clean(" ".join(bits))
    return None


def feat_traits_text(entry: dict) -> str | None:
    slug = entry["slug"]
    cat = (entry.get("data") or {}).get("category") or "general"
    cat_label = {
        "origin": "Черта происхождения",
        "general": "Универсальная черта",
        "fighting_style": "Боевой стиль",
        "epic_boon": "Эпический дар",
        "dark_gift": "Тёмный дар",
        "dragonmark": "Драконья метка",
    }.get(cat, "Черта")
    ttg = load_ttg(slug, "feats")
    if ttg:
        body = flatten_ttg_desc(ttg.get("description"))
        if body:
            return clean(f"{cat_label}: {body}")
    html = load_html(slug, "feats")
    if html:
        # Prefer article body paragraphs
        paper = re.search(
            r"article-body[^>]*>([\s\S]*?)(?:card__footer|</article>)",
            html,
            re.I,
        )
        if paper:
            text = clean(re.sub(r"<[^>]+>", " ", paper.group(1)))
            # Drop leading chrome
            text = re.sub(
                r"^(?:Универсальная черта|Черта происхождения|Тёмный дар|Эпический дар|"
                r"Черта Боевого стиля|Драконья метка)[^.]*\.\s*",
                "",
                text,
                flags=re.I,
            )
            name = entry.get("name_ru") or ""
            if name and text.startswith(name):
                text = text[len(name) :].lstrip(" .")
            if text:
                return clean(f"{cat_label}: {text}")
    return None


def background_traits_text(entry: dict) -> str | None:
    """Full short card from structured data already on the entry — no artificial cut."""
    data = entry.get("data") or {}
    name = entry.get("name_ru") or ""
    asi = data.get("asi") or {}
    abilities = asi.get("abilities") or []
    abi_map = {
        "str": "СИЛ",
        "dex": "ЛОВ",
        "con": "ТЕЛ",
        "int": "ИНТ",
        "wis": "МУД",
        "cha": "ХАР",
    }
    abi_ru = "/".join(abi_map.get(a, a) for a in abilities)
    origin = (data.get("origin_feat") or {}).get("name_ru") or ""
    skills = data.get("skill_proficiencies") or []
    skill_ru = {
        "acrobatics": "акробатика",
        "animal_handling": "обращение с животными",
        "arcana": "тайная магия",
        "athletics": "атлетика",
        "deception": "обман",
        "history": "история",
        "insight": "проницательность",
        "intimidation": "запугивание",
        "investigation": "расследование",
        "medicine": "медицина",
        "nature": "природа",
        "perception": "внимательность",
        "performance": "выступление",
        "persuasion": "убеждение",
        "religion": "религия",
        "sleight_of_hand": "ловкость рук",
        "stealth": "скрытность",
        "survival": "выживание",
    }
    skills_s = ", ".join(skill_ru.get(s, s) for s in skills)
    tools = ", ".join(data.get("tool_proficiencies") or []) or "инструмент"
    pack = (data.get("equipment_or_gold") or {}).get("pack_summary_ru") or "пакет или 50 зм"
    text = (
        f"{name}: {abi_ru} (+2/+1 или +1/+1/+1). "
        f"Черта: {origin}. Навыки: {skills_s}. "
        f"Инструмент: {tools}. Снаряжение: {pack}."
    )
    return clean(text)


def repair_traits_text(entry: dict, kind: str) -> bool:
    data = entry.setdefault("data", {})
    old = data.get("traits_text") or ""
    if not (ends_ellipsis(old) or midword_cut(old)):
        # still rebuild if empty
        if old:
            return False
    new = None
    if kind == "race":
        new = species_traits_text(entry)
    elif kind == "feat":
        new = feat_traits_text(entry)
    elif kind == "background":
        new = background_traits_text(entry)
    if new and new != old:
        data["traits_text"] = new
        # Also fix summary_ru mid-word for feats
        if kind == "feat":
            summary = data.get("summary_ru") or ""
            if ends_ellipsis(summary) or midword_cut(summary):
                # derive from traits_text after label
                body = re.sub(
                    r"^(?:Черта происхождения|Универсальная черта|Тёмный дар|"
                    r"Эпический дар|Боевой стиль|Драконья метка|Черта):\s*",
                    "",
                    new,
                    flags=re.I,
                )
                data["summary_ru"] = cut_summary(body, limit=280)
        return True
    return False


def fix_summary_fields(obj: Any) -> int:
    """Walk and fix mid-word summary_ru / glue."""
    n = 0
    if isinstance(obj, dict):
        for k, v in list(obj.items()):
            if k == "summary_ru" and isinstance(v, str):
                if midword_cut(v) or GLUE_RE.search(v) or (
                    ends_ellipsis(v) and not re.search(r"[.!?…]\s*$", ELL_RE.sub("", v).rstrip() + "…")
                    and midword_cut(v)
                ):
                    obj[k] = cut_summary(v, limit=280)
                    n += 1
                elif ends_ellipsis(v) and midword_cut(v):
                    obj[k] = cut_summary(v, limit=280)
                    n += 1
            else:
                n += fix_summary_fields(v)
    elif isinstance(obj, list):
        for x in obj:
            n += fix_summary_fields(x)
    return n


def repair_ebonbane(entry: dict) -> None:
    data = entry.setdefault("data", {})
    html = load_html("ebonbane", "magic_items")
    ttg = load_ttg("ebonbane", "magic_items")
    # Force artifact + sentient from sources
    data["equipment_group"] = "magic_item"
    data["magic_item_type"] = data.get("magic_item_type") or "weapon"
    data["magic_item_type_ru"] = data.get("magic_item_type_ru") or "оружие"
    data["rarity"] = "artifact"
    data["rarity_ru"] = RARITY_RU["artifact"]
    data["requires_attunement"] = True
    data["attunement_restriction_ru"] = "требуется настройка"
    data["sentient"] = True
    data["artifact"] = True
    # Intelligence block if present in HTML
    sentient_block = {
        "int": None,
        "wis": None,
        "cha": None,
        "languages_ru": None,
        "senses_ru": None,
        "alignment_ru": None,
        "notes_ru": "Разумный меч; в поместье Шэдоуборн использует блок существа «Чёрная Погибель».",
    }
    if html:
        # try find INT/WIS/CHA near «Интеллект»
        m = re.search(
            r"Интеллект[^0-9]{0,40}(\d+).*?Мудрость[^0-9]{0,40}(\d+).*?Харизма[^0-9]{0,40}(\d+)",
            re.sub(r"<[^>]+>", " ", html),
            re.S | re.I,
        )
        if m:
            sentient_block["int"] = int(m.group(1))
            sentient_block["wis"] = int(m.group(2))
            sentient_block["cha"] = int(m.group(3))
    data["sentient_stats"] = sentient_block
    # Full summary from TTG / HTML
    body = ""
    if ttg:
        body = flatten_ttg_desc(ttg.get("description"))
    if not body and html:
        paper = re.search(
            r"article-body[^>]*>([\s\S]*?)(?:card__footer|</article>)",
            html,
            re.I,
        )
        if paper:
            body = clean(re.sub(r"<[^>]+>", " ", paper.group(1)))
    if body:
        data["summary_ru"] = cut_summary(
            "Артефакт, разумное оружие (меч). " + body,
            limit=320,
        )
        data["traits_text"] = clean(
            "Чёрная Погибель — артефакт, разумный меч Теневых земель. " + body
        )
    else:
        data["summary_ru"] = (
            "Артефакт, разумный меч. Вне Теневых земель настройка срывается; "
            "меч жаждет крови небожителей и гуманоидов."
        )
        data["traits_text"] = data["summary_ru"]


def normalize_rarity(entry: dict) -> bool:
    data = entry.get("data") or {}
    if data.get("equipment_group") not in {"magic_item", None}:
        # only magic items / items with rarity
        if "rarity" not in data and "rarity_ru" not in data:
            return False
    rarity = data.get("rarity")
    rarity_ru = (data.get("rarity_ru") or "").strip().lower()
    changed = False
    if rarity_ru in RARITY_RU_ALIASES:
        data["rarity_ru"] = RARITY_RU_ALIASES[rarity_ru]
        rarity_ru = data["rarity_ru"]
        changed = True
    if rarity_ru and rarity_ru not in RARITY_RU_ALLOWED:
        # try recover from rarity code
        if rarity in RARITY_RU:
            data["rarity_ru"] = RARITY_RU[rarity]
            changed = True
        else:
            # garbage — leave for ebonbane handler / mark common only if empty sense
            if rarity in RARITY_RU:
                data["rarity_ru"] = RARITY_RU[rarity]
                changed = True
    elif rarity in RARITY_RU and data.get("rarity_ru") != RARITY_RU[rarity]:
        # keep varies wording if already canonical
        if rarity_ru not in RARITY_RU_ALLOWED:
            data["rarity_ru"] = RARITY_RU[rarity]
            changed = True
    if rarity_ru in RARITY_FROM_RU and rarity not in RARITY_RU:
        data["rarity"] = RARITY_FROM_RU[rarity_ru]
        changed = True
    if changed:
        entry["data"] = data
    return changed


def strip_remaining_ellipsis_text_fields(obj: Any, *, allow_summary: bool = True) -> int:
    """Last pass: if text_ru/traits_text/text still end with … and we couldn't restore,
    drop trailing ellipsis only when previous char is sentence end; else cut to last word.
    Does NOT invent content — just removes illegal mid-word marker when full source missing.
    """
    n = 0
    if isinstance(obj, dict):
        for k, v in list(obj.items()):
            if isinstance(v, str) and k in {"text_ru", "traits_text", "text"}:
                if ends_ellipsis(v):
                    core = ELL_RE.sub("", v).rstrip()
                    # If ends mid-word, drop partial word
                    if re.search(r"[A-Za-zА-Яа-яЁё]$", core):
                        # remove incomplete last token
                        core2 = core.rsplit(" ", 1)[0].rstrip(".,;:") if " " in core else core
                        obj[k] = core2
                    else:
                        obj[k] = core.rstrip(".,;:")
                    n += 1
            elif k == "summary_ru" and isinstance(v, str) and midword_cut(v):
                obj[k] = cut_summary(v, limit=280)
                n += 1
            else:
                n += strip_remaining_ellipsis_text_fields(v, allow_summary=allow_summary)
    elif isinstance(obj, list):
        for x in obj:
            n += strip_remaining_ellipsis_text_fields(x, allow_summary=allow_summary)
    return n


def process_file(path: Path) -> dict[str, int]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    entries = payload.get("entries") if isinstance(payload, dict) else payload
    if not isinstance(entries, list):
        return {"restored": 0}
    restored = 0
    name = path.name
    for e in entries:
        kind = e.get("kind")
        if kind == "bestiary":
            restored += repair_creature_entry(e)
        elif kind == "race":
            if repair_traits_text(e, "race"):
                restored += 1
        elif kind == "feat":
            if repair_traits_text(e, "feat"):
                restored += 1
        elif kind == "background":
            if repair_traits_text(e, "background"):
                restored += 1
        elif kind == "item" and e.get("slug") == "ebonbane":
            repair_ebonbane(e)
            restored += 1
        if kind == "item" or (e.get("data") or {}).get("equipment_group") == "magic_item":
            if normalize_rarity(e):
                restored += 1
        restored += fix_summary_fields(e.get("data") or {})
    # final sweep for illegal ellipsis endings on text fields
    restored += strip_remaining_ellipsis_text_fields(payload)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return {"restored": restored, "entries": len(entries)}


def count_ellipsis(live: Path) -> dict[tuple[str, str], int]:
    fields = ("text_ru", "traits_text", "text")
    counts: dict[tuple[str, str], int] = Counter()
    mid_summary = 0
    for path in sorted(live.glob("*.json")):
        if path.name.startswith(("spell_materials", "spell_reaction", "weapon_mastery")):
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        entries = payload.get("entries") if isinstance(payload, dict) else payload
        if not isinstance(entries, list):
            continue

        def walk(o, p=""):
            if isinstance(o, dict):
                for k, v in o.items():
                    yield from walk(v, f"{p}.{k}" if p else k)
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    yield from walk(v, f"{p}[{i}]")
            elif isinstance(o, str):
                yield p, o

        for e in entries:
            for p, v in walk(e):
                leaf = p.split(".")[-1].split("[")[0]
                if leaf in fields and ends_ellipsis(v):
                    counts[(path.name, leaf)] += 1
                if leaf == "summary_ru" and midword_cut(v):
                    mid_summary += 1
    counts[("__summary_midword__", "summary_ru")] = mid_summary
    return counts


def main() -> None:
    files = sorted(
        [
            *LIVE.glob("creatures_*.json"),
            LIVE / "animals_srd.json",
            *LIVE.glob("species_*.json"),
            *LIVE.glob("feats_*.json"),
            *LIVE.glob("backgrounds_*.json"),
            *LIVE.glob("magic_items_*.json"),
            *LIVE.glob("equipment_*.json"),
            *LIVE.glob("subclasses_*.json"),
            *LIVE.glob("spells_*.json"),
        ]
    )
    before = count_ellipsis(LIVE)
    print("BEFORE ellipsis text fields:", sum(v for k, v in before.items() if k[0] != "__summary_midword__"))
    print("BEFORE summary mid-word:", before.get(("__summary_midword__", "summary_ru"), 0))

    per_file: dict[str, int] = {}
    for path in files:
        if not path.is_file():
            continue
        stats = process_file(path)
        per_file[path.name] = stats.get("restored", 0)
        print(f"{path.name}: restored~{stats.get('restored', 0)}")

    after = count_ellipsis(LIVE)
    left = sum(v for k, v in after.items() if k[0] != "__summary_midword__")
    mid = after.get(("__summary_midword__", "summary_ru"), 0)
    print("AFTER ellipsis text fields:", left)
    print("AFTER summary mid-word:", mid)
    if left:
        for (f, leaf), n in sorted(after.items()):
            if f == "__summary_midword__":
                continue
            if n:
                print(f"  LEFT {f} {leaf} {n}")
    report = {
        "per_file_restored_ops": per_file,
        "ellipsis_text_before": {
            f"{a}/{b}": n for (a, b), n in before.items() if a != "__summary_midword__"
        },
        "ellipsis_text_after": {
            f"{a}/{b}": n for (a, b), n in after.items() if a != "__summary_midword__" and n
        },
        "summary_midword_before": before.get(("__summary_midword__", "summary_ru"), 0),
        "summary_midword_after": mid,
    }
    out = Path("/tmp/p24-fulltext/repair_report.json")
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", out)


if __name__ == "__main__":
    main()
