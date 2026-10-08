#!/usr/bin/env python3
"""Fetch remaining official 2014 spells (non-homebrew) not yet in catalog.

Writes: backend/data/srd/2014/spells_rest_books_v1.json
"""

from __future__ import annotations

import json
import re
import time
import urllib.request
from html import unescape
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "backend/data/srd/2014/catalog.json"
OUT = ROOT / "backend/data/srd/2014/spells_rest_books_v1.json"
INDEX_URL = "https://5e14.dnd.su/piece/spells/index-list/"
BASE = "https://5e14.dnd.su"

# Skip PHB/XGE — already waved. Homebrew excluded.
BOOK_BY_ID = {
    117: "TCE",
    107: "EEPC",
    116: "EGW",
    115: "AI",
    152: "FTD",
    155: "SCC",
    108: "SCAG",
    153: "LLOK",
    207: "BMT",
    120: "IDROTF",
    160: "SAS",
    205: "PSA",
    112: "GGTR",
}
HOMEBREW = {179, 156, 210, 310, 190}
DONE_WAVES = {102, 109}  # PHB, XGE

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
POSSESSIVE = (
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
    "abidalzims",
    "abidalzim",
)


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())


def core(s: str) -> str:
    n = norm(s)
    for p in POSSESSIVE:
        if n.startswith(p):
            return n[len(p) :]
    return n


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (name or "").lower()).strip("_") or "spell"


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "DvarfSpellImport/1.0", "Accept-Language": "ru,en"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", errors="replace")


def strip_tags(html: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    text = re.sub(r"</p>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"[ \t]+\n", "\n", re.sub(r"[ \t]+", " ", unescape(text))).strip()


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
    out: dict = {"v": "В" in raw or "V" in up, "s": "С" in raw or "S" in up}
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


def primary_book(srcs: set[int]) -> tuple[int, str] | None:
    off = srcs - HOMEBREW - DONE_WAVES
    if not off:
        # only PHB/XGE leftover? skip
        return None
    for sid in (
        117,
        107,
        116,
        115,
        152,
        155,
        108,
        153,
        207,
        120,
        160,
        205,
        112,
    ):
        if sid in off:
            return sid, BOOK_BY_ID[sid]
    sid = sorted(off)[0]
    return sid, BOOK_BY_ID.get(sid, f"SRC{sid}")


def parse_page(html: str, card: dict, book: str, source_label: str) -> dict:
    params = {
        k.strip(): strip_tags(v)
        for k, v in re.findall(
            r"<li[^>]*>\s*<strong>([^<]+)</strong>\s*:?\s*(.*?)</li>", html, re.S
        )
    }
    desc_m = re.search(r'itemprop="description"[^>]*>(.*?)</div>', html, re.S) or re.search(
        r'<div class="subsection desc"[^>]*>(.*?)</div>', html, re.S
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

    level_raw = params.get("Уровень") or card.get("level") or "1"
    school_ru = (params.get("Школа") or card.get("school") or "").lower()
    casting = params.get("Время накладывания:") or params.get("Время накладывания") or "1 действие"
    range_ = params.get("Дистанция:") or params.get("Дистанция") or ""
    comps = params.get("Компоненты:") or params.get("Компоненты") or ""
    duration = params.get("Длительность:") or params.get("Длительность") or ""
    classes_raw = params.get("Классы:") or params.get("Классы") or ""
    concentration = "концентрац" in duration.lower()
    ritual = "ритуал" in (params.get("Уровень") or "").lower()
    if "ритуал" in html[html.find("card-title") : html.find("card-title") + 800].lower():
        ritual = True

    name_en = card.get("title_en") or ""
    name_ru = card.get("title") or name_en
    slug = slugify(name_en)
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
        "id": str(uuid5(NAMESPACE_URL, f"dvarf:catalog:spell:2014:{slug}")),
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


def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    ours = set()
    for e in catalog:
        if e.get("kind") != "spell":
            continue
        ours.add(core(e.get("name_en") or ""))
        ours.add(core(e.get("slug") or ""))
        ours.add(norm(e.get("name_en") or ""))
        ours.add(norm(e.get("slug") or ""))

    raw = fetch(INDEX_URL)
    cards = json.loads(re.search(r"window\.LIST\s*=\s*(\{.*\})\s*;?\s*</script>", raw, re.S).group(1))[
        "cards"
    ]

    todo: list[tuple[str, str, dict]] = []
    for c in cards:
        srcs = set(c.get("filter_source") or [])
        if srcs and srcs <= HOMEBREW:
            continue
        if core(c.get("title_en") or "") in ours or norm(c.get("title_en") or "") in ours:
            continue
        pb = primary_book(srcs)
        if not pb:
            continue
        _sid, book = pb
        todo.append((book, f"{book.lower()}-2014", c))

    print(f"remaining to fetch: {len(todo)}")
    out: list[dict] = []
    errors: list[str] = []
    for i, (book, label, card) in enumerate(todo, 1):
        link = card.get("link") or ""
        try:
            html = fetch(BASE + link)
            entry = parse_page(html, card, book, label)
            if core(entry["name_en"]) in ours or norm(entry["slug"]) in ours:
                print(f"[{i}/{len(todo)}] skip dupe {entry['slug']}")
                continue
            out.append(entry)
            ours.add(core(entry["name_en"]))
            ours.add(norm(entry["slug"]))
            print(f"[{i}/{len(todo)}] ok {book} {entry['slug']}")
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{link}: {exc}")
            print(f"[{i}/{len(todo)}] FAIL {link}: {exc}")
        time.sleep(0.35)

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(out)} → {OUT}")
    if errors:
        print("errors", len(errors))
        for e in errors[:15]:
            print(" ", e)


if __name__ == "__main__":
    main()
