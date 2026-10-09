#!/usr/bin/env python3
"""Fetch official 2014 spells from 5e14.dnd.su into schema v1 JSON.

Examples:
  python3 backend/scripts/fetch_spell_wave.py --source-id 102 --book PHB --out spells_phb_gap_v1.json
  python3 backend/scripts/fetch_spell_wave.py --source-id 109 --book XGE --out spells_xge_v1.json
"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.request
from html import unescape
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "backend/data/srd/2014/catalog.json"
INDEX_URL = "https://5e14.dnd.su/piece/spells/index-list/"
BASE = "https://5e14.dnd.su"

SCHOOL_MAP = {
    "воплощение": "evocation",
    "ограждение": "abjuration",
    "вызов": "conjuration",
    "прорицание": "divination",
    "очарование": "enchantment",
    "иллюзия": "illusion",
    "некромантия": "necromancy",
    "преобразование": "transmutation",
}

CLASS_MAP = {
    "бард": "bard",
    "жрец": "cleric",
    "друид": "druid",
    "паладин": "paladin",
    "следопыт": "ranger",
    "чародей": "sorcerer",
    "колдун": "warlock",
    "волшебник": "wizard",
    "изобретатель": "artificer",
}

POSSESSIVE_PREFIXES = (
    "melfs",
    "mordenkainens",
    "leomunds",
    "otilukes",
    "bigbys",
    "evards",
    "drawmijs",
    "tashas",
    "rarys",
    "ottos",
    "nystuls",
    "tensers",
    "maximilians",
    "abi_dalzims",
    "abidalzims",
)


def norm_en(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (name or "").lower())


def core_name(name: str) -> str:
    n = norm_en(name)
    for prefix in POSSESSIVE_PREFIXES:
        if n.startswith(prefix):
            return n[len(prefix) :]
    return n


def slugify_en(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", (name or "").lower()).strip("_")
    return s or "spell"


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "DvarfSpellImport/1.0 (+local catalog fill)",
            "Accept-Language": "ru,en",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", errors="replace")


def load_index() -> list[dict]:
    raw = fetch(INDEX_URL)
    m = re.search(r"window\.LIST\s*=\s*(\{.*\})\s*;?\s*</script>", raw, re.S)
    if not m:
        raise RuntimeError("LIST not found on spell index")
    return json.loads(m.group(1))["cards"]


def strip_tags(html: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    text = re.sub(r"</p>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    return re.sub(r"[ \t]+\n", "\n", re.sub(r"[ \t]+", " ", text)).strip()


def parse_casting_time(raw: str) -> dict | str:
    t = raw.lower()
    if "бонусн" in t:
        return {"unit": "bonus", "amount": 1}
    if "реакц" in t:
        out: dict = {"unit": "reaction", "amount": 1}
        if "," in raw:
            out["condition"] = raw.split(",", 1)[-1].strip()
        return out
    if "час" in t:
        m = re.search(r"(\d+)", t)
        return {"unit": "hour", "amount": int(m.group(1)) if m else 1}
    if "мин" in t:
        m = re.search(r"(\d+)", t)
        return {"unit": "minute", "amount": int(m.group(1)) if m else 1}
    if "действ" in t or t.strip().startswith("1"):
        return {"unit": "action", "amount": 1}
    return raw


def parse_components(raw: str) -> dict:
    up = raw.upper()
    out: dict = {
        "v": "В" in raw or "V" in up,
        "s": "С" in raw or "S" in up,
    }
    m = re.search(r"[МM]\s*\(([^)]+)\)", raw)
    if m:
        out["m"] = m.group(1).strip()
    elif re.search(r"(^|[^А-ЯA-Z])[МM]([^а-яa-z]|$)", raw):
        out["m"] = ""
    return out


def parse_classes(raw: str) -> list[str]:
    out: list[str] = []
    for part in re.split(r"[,;]", raw):
        key = part.strip().lower()
        if not key:
            continue
        for ru, slug in CLASS_MAP.items():
            if ru in key:
                out.append(slug)
                break
    return sorted(set(out))


def parse_level(raw: str) -> int:
    if "заговор" in raw.lower() or raw.strip() in {"0", "Заговор"}:
        return 0
    m = re.search(r"(\d+)", raw)
    return int(m.group(1)) if m else 1


def parse_spell_page(html: str, card: dict, book: str, source_label: str) -> dict:
    params = {
        k.strip(): strip_tags(v)
        for k, v in re.findall(
            r"<li[^>]*>\s*<strong>([^<]+)</strong>\s*:?\s*(.*?)</li>",
            html,
            re.S,
        )
    }
    desc_m = re.search(
        r'itemprop="description"[^>]*>(.*?)</div>',
        html,
        re.S,
    ) or re.search(
        r'<div class="subsection desc"[^>]*>(.*?)</div>',
        html,
        re.S,
    )
    full = strip_tags(desc_m.group(1)) if desc_m else ""
    higher = ""
    desc = full
    for marker in ("На больших уровнях.", "На более высоких уровнях.", "At Higher Levels."):
        if marker in full:
            desc, higher = full.split(marker, 1)
            higher = (marker + " " + higher).strip()
            desc = desc.strip()
            break

    level_raw = params.get("Уровень") or params.get("Level") or card.get("level") or "1"
    school_ru = (params.get("Школа") or card.get("school") or "").lower()
    casting = params.get("Время накладывания:") or params.get("Время накладывания") or "1 действие"
    range_ = params.get("Дистанция:") or params.get("Дистанция") or ""
    comps = params.get("Компоненты:") or params.get("Компоненты") or ""
    duration = params.get("Длительность:") or params.get("Длительность") or ""
    classes_raw = params.get("Классы:") or params.get("Классы") or ""

    concentration = "концентрац" in duration.lower()
    ritual = "ритуал" in (params.get("Уровень") or "").lower()
    title_slice = html[html.find("card-title") : html.find("card-title") + 800].lower()
    if "ритуал" in title_slice:
        ritual = True

    name_en = card.get("title_en") or ""
    name_ru = card.get("title") or name_en
    slug = slugify_en(name_en)
    entry_id = str(uuid5(NAMESPACE_URL, f"dvarf:catalog:spell:2014:{slug}"))

    data = {
        "schema_version": 1,
        "level": parse_level(str(level_raw)),
        "school": SCHOOL_MAP.get(school_ru, school_ru or "evocation"),
        "casting_time": parse_casting_time(casting),
        "range": range_,
        "components": parse_components(comps),
        "duration": duration,
        "concentration": concentration,
        "ritual": ritual,
        "classes": parse_classes(classes_raw),
        "source_book": book,
        "description": desc,
    }
    if higher:
        data["higher_levels"] = higher

    return {
        "id": entry_id,
        "kind": "spell",
        "slug": slug,
        "name_ru": name_ru,
        "name_en": name_en,
        "rules_edition": "2014",
        "parent_id": None,
        "source": source_label,
        "external_ref": {"dnd_su": card.get("link")},
        "data": data,
    }


def known_cores(catalog: list[dict]) -> set[str]:
    cores: set[str] = set()
    for e in catalog:
        if e.get("kind") != "spell":
            continue
        cores.add(core_name(e.get("name_en") or ""))
        cores.add(core_name(e.get("slug") or ""))
        cores.add(norm_en(e.get("name_en") or ""))
        cores.add(norm_en(e.get("slug") or ""))
    return cores


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-id", type=int, required=True)
    parser.add_argument("--book", required=True, help="PHB / XGE / TCE / …")
    parser.add_argument(
        "--out",
        required=True,
        help="Filename under backend/data/srd/2014/",
    )
    parser.add_argument("--source-label", default=None)
    args = parser.parse_args()
    book = args.book.upper()
    source_label = args.source_label or f"{book.lower()}-2014"
    out_path = ROOT / "backend/data/srd/2014" / args.out

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    ours = known_cores(catalog)

    cards = [
        c
        for c in load_index()
        if args.source_id in (c.get("filter_source") or [])
    ]
    missing = [
        c
        for c in cards
        if core_name(c.get("title_en") or "") not in ours
        and norm_en(c.get("title_en") or "") not in ours
    ]
    print(f"{book} cards={len(cards)} missing≈{len(missing)}")

    out: list[dict] = []
    errors: list[str] = []
    for i, card in enumerate(missing, 1):
        link = card.get("link") or ""
        url = BASE + link
        try:
            html = fetch(url)
            entry = parse_spell_page(html, card, book, source_label)
            # final slug collision guard
            if core_name(entry["name_en"]) in ours or norm_en(entry["slug"]) in ours:
                print(f"[{i}/{len(missing)}] skip dupe {entry['slug']}")
                continue
            out.append(entry)
            ours.add(core_name(entry["name_en"]))
            ours.add(norm_en(entry["slug"]))
            print(f"[{i}/{len(missing)}] ok {entry['slug']}")
        except Exception as exc:  # noqa: BLE001
            msg = f"{link}: {exc}"
            errors.append(msg)
            print(f"[{i}/{len(missing)}] FAIL {msg}")
        time.sleep(0.35)

    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(out)} → {out_path}")
    if errors:
        print(f"errors {len(errors)}")
        for e in errors[:20]:
            print(" ", e)


if __name__ == "__main__":
    main()
