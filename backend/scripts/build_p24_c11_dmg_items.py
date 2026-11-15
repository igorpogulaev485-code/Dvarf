#!/usr/bin/env python3
"""P24-C11: build magic_items_dmg24.json from DMG24 srd=false reference rows.

RU names: docs/edition-2024/sources/magic_items.csv (next.dnd.su).
Type/rarity/attunement: scraped from next.dnd.su item pages (ttg.club for cross-check).
Short RU summaries only — no long DMG prose. source=dmg24 → community_ref.
Named SRD eponyms link via data.srd_alias (separate cards, no merge).
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
SCRAPED = Path("/tmp/p24-c11/scraped.json")
CSV_PATH = SOURCES / "magic_items.csv"
OUT_JSON = LIVE / "magic_items_dmg24.json"
LAYER3 = SOURCES / "P24-C11-layer3-review.md"

CAT_RU = {
    "armor": "доспех",
    "weapon": "оружие",
    "wondrous": "чудесный предмет",
    "potion": "зелье",
    "ring": "кольцо",
    "rod": "жезл",
    "staff": "посох",
    "wand": "палочка",
    "scroll": "свиток",
}
RARITY_RU = {
    "common": "обычный",
    "uncommon": "необычный",
    "rare": "редкий",
    "very_rare": "очень редкий",
    "legendary": "легендарный",
    "artifact": "артефакт",
    "varies": "редкость различается",
}

# Named DMG forms of SRD-stripped cards (separate slug + srd_alias).
SRD_ALIASES: dict[str, str] = {
    "apparatus-of-kwalish": "apparatus-of-the-crab",
    "orb-of-dragonkind": "dragon-orb",
    "quaals-feather-token": "feather-token",
    "hewards-handy-haversack": "handy-haversack",
    "daerns-instant-fortress": "instant-fortress",
    "iron-bands-of-bilarro": "iron-bands",
    "nolzurs-marvelous-pigments": "marvelous-pigments",
    "deck-of-many-things": "mysterious-deck",
    "quiver-of-ehlonna": "efficient-quiver",
    "potion-of-healing__dmg24": "potion-of-healing",
}

# Family/parent index rows kept as varies cards (SRD has expanded children).
FAMILY_PARENTS = {
    "ammunition-1-2-or-3",
    "armor-1-2-or-3",
    "weapon-1-2-or-3",
    "shield-1-2-or-3",
    "wand-of-the-war-mage-1-2-or-3",
    "spell-scroll",
    "potion-of-healing__dmg24",
    "potion-of-giant-strength",
    "quaals-feather-token",
    "rod-of-the-pact-keeper",
    "wraps-of-unarmed-power",
    "enspelled-armor",
    "enspelled-staff",
    "enspelled-weapon",
}

SENTIENT = {
    "axe-of-the-dwarvish-lords",
    "blackrazor",
    "book-of-vile-darkness",
    "demonomicon-of-iggwilv",
    "eye-and-hand-of-vecna",
    "moonblade",
    "sword-of-kas",
    "talking-doll",
    "wand-of-orcus",
    "wave",
    "whelm",
}

CURSED = {
    "sword-of-vengeance",
    "eye-and-hand-of-vecna",
    "book-of-vile-darkness",
}

WEAPON_RU_TO_SLUG = {
    "боевой топор": "battleaxe",
    "духовая трубка": "blowgun",
    "дубинка": "club",
    "кинжал": "dagger",
    "дротик": "dart",
    "цеп": "flail",
    "глефа": "glaive",
    "секира": "greataxe",
    "палица": "greatclub",
    "двуручный меч": "greatsword",
    "алебарда": "halberd",
    "одноручный арбалет": "hand-crossbow",
    "одноручный топор": "handaxe",
    "тяжёлый арбалет": "heavy-crossbow",
    "метательное копьё": "javelin",
    "кавалерийское копьё": "lance",
    "лёгкий арбалет": "light-crossbow",
    "лёгкий молот": "light-hammer",
    "длинный лук": "longbow",
    "длинный меч": "longsword",
    "булава": "mace",
    "молот": "maul",
    "моргенштерн": "morningstar",
    "мушкет": "musket",
    "пика": "pike",
    "пистоль": "pistol",
    "боевой посох": "quarterstaff",
    "рапира": "rapier",
    "скимитар": "scimitar",
    "короткий лук": "shortbow",
    "короткий меч": "shortsword",
    "серп": "sickle",
    "праща": "sling",
    "копьё": "spear",
    "трезубец": "trident",
    "клевец": "war-pick",
    "боевой молот": "warhammer",
    "кнут": "whip",
}

ARMOR_RU_TO_KIND = {
    "лёгкий": "armor:light",
    "легкий": "armor:light",
    "средний": "armor:medium",
    "тяжёлый": "armor:heavy",
    "тяжелый": "armor:heavy",
    "щит": "armor:shield",
}


def _norm(s: str) -> str:
    return (
        (s or "")
        .lower()
        .replace("ё", "е")
        .replace("’", "'")
        .replace("‘", "'")
        .strip()
    )


def _attunement_restriction(raw: str | None, *, type_line: str = "") -> str | None:
    if not raw:
        return None
    t = raw.strip()
    # Family rarity noise sometimes lands inside the paren — drop it.
    if re.search(r"\+\d", t) or "необычн" in t.lower() and "требуется" in t.lower() and "," in t:
        # Prefer a clean class restriction from the end of the type line.
        m2 = re.search(r"требуется настройка\s+([^)]+?)\)?\s*$", type_line, re.I)
        if m2:
            t = "требуется настройка " + m2.group(1).strip()
        else:
            return None
    m = re.match(r"(?i)^требуется настройка(?:\s+(.+))?$", t)
    if not m:
        # Already a short label
        rest = t
    else:
        rest = (m.group(1) or "").strip()
        if not rest:
            return None
    repl = {
        "бардом": "бард",
        "друидом": "друид",
        "колдуном": "колдун",
        "волшебником": "волшебник",
        "заклинателем": "заклинатель",
        "жрецом": "жрец",
        "паладином": "паладин",
        "следопытом": "следопыт",
        "дварфом": "дварф",
        "существом по выбору клинка": "существо по выбору клинка",
        "существом, настроенным на пояс дварфов": "существо, настроенное на Пояс дварфов",
    }
    out = rest
    for a, b in sorted(repl.items(), key=lambda kv: -len(kv[0])):
        out = re.sub(re.escape(a), b, out, flags=re.I)
    out = re.sub(r"\s+", " ", out).strip(" ,;")
    # Drop leading "или" leftovers
    out = re.sub(r"^или\s+", "", out, flags=re.I)
    if re.search(r"\+\d", out):
        return None
    return out or None


def _base_categories(type_line: str, magic_type: str) -> list[str]:
    low = _norm(type_line)
    out: list[str] = []
    paren = re.search(r"\(([^)]+)\)", type_line)
    inner = paren.group(1) if paren else ""
    inner_l = _norm(inner)

    if "боеприпас" in inner_l or "боеприпас" in low:
        out.append("ammunition")
    if magic_type == "armor":
        if "щит" in inner_l and "лёгк" not in inner_l and "средн" not in inner_l:
            out.append("armor:shield")
        kinds = []
        for ru, tok in ARMOR_RU_TO_KIND.items():
            if ru in inner_l and tok != "armor:shield":
                kinds.append(tok)
        if kinds:
            out.extend(kinds)
        elif "любой" in inner_l or "лёгк" in inner_l or "средн" in inner_l or "тяж" in inner_l:
            out.extend(["armor:light", "armor:medium", "armor:heavy"])
        elif "лат" in inner_l:
            out.append("plate-armor")
        elif "кольчуг" in inner_l:
            out.append("chain-mail")
    if magic_type == "weapon":
        if "простое или воинское" in inner_l or "простое или воинск" in inner_l:
            out.extend(["weapon:simple", "weapon:martial"])
        elif "любое" in inner_l and "рукопашн" in inner_l:
            out.extend(["weapon:simple", "weapon:martial"])
        elif "любое" in inner_l:
            out.append("weapon:any")
        else:
            # specific weapon names, possibly "or"-lists
            parts = re.split(r",| или |/|;", inner)
            for part in parts:
                p = _norm(part)
                p = re.sub(r"^(любой|любое|любая)\s+", "", p)
                for ru, slug in WEAPON_RU_TO_SLUG.items():
                    if ru in p:
                        out.append(slug)
                        break
    # de-dupe preserve order
    seen: set[str] = set()
    uniq: list[str] = []
    for t in out:
        if t not in seen:
            seen.add(t)
            uniq.append(t)
    return uniq


def _bonus_from_name(name_en: str, slug: str) -> dict[str, int | None]:
    m = re.search(r"\+(\d)\b", name_en) or re.search(r"-(\d)$", slug)
    if not m:
        # family parents
        if re.search(r"\+1,\s*\+2,\s*or\s*\+3", name_en, re.I) or slug.endswith("-1-2-or-3"):
            return {
                "bonus_attack": None,
                "bonus_damage": None,
                "bonus_ac": None,
                "bonus_spell_attack": None,
            }
        return {
            "bonus_attack": None,
            "bonus_damage": None,
            "bonus_ac": None,
            "bonus_spell_attack": None,
        }
    n = int(m.group(1))
    low = name_en.lower()
    slug_l = slug.lower()
    if "armor" in low or "shield" in low or slug_l.startswith("armor") or slug_l.startswith("shield"):
        return {
            "bonus_attack": None,
            "bonus_damage": None,
            "bonus_ac": n,
            "bonus_spell_attack": None,
        }
    if "wand of the war mage" in low or "rod of the pact keeper" in low:
        return {
            "bonus_attack": None,
            "bonus_damage": None,
            "bonus_ac": None,
            "bonus_spell_attack": n,
        }
    if "wraps of unarmed" in low:
        return {
            "bonus_attack": n,
            "bonus_damage": n,
            "bonus_ac": None,
            "bonus_spell_attack": None,
        }
    # weapon / ammo / wraps
    return {
        "bonus_attack": n,
        "bonus_damage": n,
        "bonus_ac": None,
        "bonus_spell_attack": None,
    }


CAT_TOKEN_RU = {
    "ammunition": "боеприпасы",
    "weapon:any": "любое оружие",
    "weapon:simple": "простое оружие",
    "weapon:martial": "воинское оружие",
    "weapon:melee": "рукопашное оружие",
    "weapon:ranged": "дальнобойное оружие",
    "armor:light": "лёгкий доспех",
    "armor:medium": "средний доспех",
    "armor:heavy": "тяжёлый доспех",
    "armor:shield": "щит",
    "armor:any": "любой доспех",
    "plate-armor": "латный доспех",
    "chain-mail": "кольчужный доспех",
}
WEAPON_SLUG_RU = {v: k for k, v in WEAPON_RU_TO_SLUG.items()}


def _cats_ru(cats: list[str]) -> str:
    labels = []
    for c in cats:
        if c in CAT_TOKEN_RU:
            labels.append(CAT_TOKEN_RU[c])
        elif c in WEAPON_SLUG_RU:
            labels.append(WEAPON_SLUG_RU[c])
        else:
            labels.append(c.replace(":", " "))
    return ", ".join(labels)


def _short_summary(
    *,
    name_ru: str,
    typ_ru: str,
    rar_ru: str,
    att: bool,
    restr: str | None,
    cats: list[str],
    cursed: bool,
    sentient: bool,
    alias: str | None,
    family: bool,
) -> str:
    parts = [f"{typ_ru.capitalize()}, {rar_ru}"]
    if att:
        if restr:
            parts.append(f"настройка: {restr}")
        else:
            parts.append("требуется настройка")
    if cats:
        parts.append("база: " + _cats_ru(cats))
    if cursed:
        parts.append("проклятый")
    if sentient:
        parts.append("разумный")
    if alias:
        parts.append("именная версия предмета из открытых правил")
    if family:
        parts.append("семейство вариантов по редкости или уровню")
    # Own short words — not book prose. No Latin in display fields.
    return f"{name_ru}: " + "; ".join(parts) + "."


def _dmg24_rows() -> list[dict[str, str]]:
    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    return [
        r
        for r in rows
        if r.get("book") == "DMG24" and str(r.get("srd", "")).lower() == "false"
    ]


def build() -> dict[str, Any]:
    scraped = json.loads(SCRAPED.read_text(encoding="utf-8"))
    srd_slugs = {
        e["slug"]
        for e in json.loads((LIVE / "magic_items_srd.json").read_text(encoding="utf-8"))[
            "entries"
        ]
    }
    spell_slugs = {
        e["slug"]
        for e in json.loads((LIVE / "spells_srd.json").read_text(encoding="utf-8"))[
            "entries"
        ]
    }
    # PHB beyond SRD spells (C10) also valid targets
    ph24 = LIVE / "spells_ph24.json"
    if ph24.is_file():
        spell_slugs |= {
            e["slug"] for e in json.loads(ph24.read_text(encoding="utf-8"))["entries"]
        }

    rows = _dmg24_rows()
    assert len(rows) == 196, len(rows)
    entries: list[dict[str, Any]] = []
    pending_text = 0
    pending_name = 0

    for i, row in enumerate(sorted(rows, key=lambda r: r["name_en"].lower()), start=1):
        slug = row["id"]
        info = scraped[slug]
        if "error" in info:
            raise RuntimeError(f"missing scrape for {slug}: {info['error']}")
        typ = info["magic_item_type"]
        rar = info["rarity"]
        assert typ in CAT_RU, (slug, typ)
        assert rar in RARITY_RU, (slug, rar)
        att = bool(info.get("requires_attunement"))
        type_line = info.get("type_line") or ""
        restr = _attunement_restriction(info.get("attunement_raw"), type_line=type_line)
        cats = _base_categories(type_line, typ)
        bonuses = _bonus_from_name(row["name_en"], slug)
        alias = SRD_ALIASES.get(slug)
        if alias:
            assert alias in srd_slugs, (slug, alias)
        cursed = slug in CURSED
        sentient = slug in SENTIENT
        family = slug in FAMILY_PARENTS
        # Descriptions on next.dnd.su exist for these pages; keep short own-words
        # summaries. Mark text_ru_pending only when meta/type line is the only signal
        # and name looks unfinished (rare) — currently none from scrape quality.
        text_pending = False
        name_pending = bool(re.search(r"[A-Za-z]{3,}", row["name_ru"])) and not re.search(
            r"[А-Яа-яЁё]", row["name_ru"]
        )
        if name_pending:
            pending_name += 1
        if text_pending:
            pending_text += 1

        summary = _short_summary(
            name_ru=row["name_ru"],
            typ_ru=CAT_RU[typ],
            rar_ru=RARITY_RU[rar],
            att=att,
            restr=restr,
            cats=cats,
            cursed=cursed,
            sentient=sentient,
            alias=alias,
            family=family,
        )

        data: dict[str, Any] = {
            "schema_version": 1,
            "equipment_group": "magic_item",
            "magic_item_type": typ,
            "magic_item_type_ru": CAT_RU[typ],
            "rarity": rar,
            "rarity_ru": RARITY_RU[rar],
            "requires_attunement": att,
            "attunement_restriction_ru": restr,
            "charges": None,
            "recharge_ru": None,
            "bonus_attack": bonuses["bonus_attack"],
            "bonus_damage": bonuses["bonus_damage"],
            "bonus_ac": bonuses["bonus_ac"],
            "bonus_spell_attack": bonuses["bonus_spell_attack"],
            "cursed": cursed,
            "sentient": sentient,
            "spell_refs": [],
            "base_item_categories": cats,
            "name_ru_pending": name_pending,
            "text_ru_pending": text_pending,
            "summary_ru": summary,
        }
        if alias:
            data["srd_alias"] = alias
        # Light artifact / sentient markers as structured data (no book prose).
        if rar == "artifact":
            data["artifact"] = True
        if sentient:
            data["sentient_traits"] = {
                "note_ru": "Разумный предмет; характеристики и мировоззрение задаёт мастер."
            }

        # Validate spell_refs empty or resolvable (none filled by default).
        for sid in data["spell_refs"]:
            assert sid in spell_slugs, (slug, sid)

        entries.append(
            {
                "kind": "item",
                "slug": slug,
                "name_ru": row["name_ru"],
                "name_en": row["name_en"],
                "source": "dmg24",
                "sort_order": i * 10,
                "external_ref": {
                    "url_dndsu": row.get("url_dndsu") or None,
                    "url_ttg": row.get("url_ttg") or None,
                    "book": "DMG24",
                },
                "data": data,
            }
        )

    types = Counter(e["data"]["magic_item_type"] for e in entries)
    rares = Counter(e["data"]["rarity"] for e in entries)
    payload = {
        "meta": {
            "pack": "P24-C11",
            "source": "DMG 2024 beyond SRD (community_ref)",
            "count": len(entries),
            "notes": [
                "Short RU summaries only; no long DMG prose.",
                "RU names from magic_items.csv (next.dnd.su); type/rarity/attunement from next.dnd.su pages.",
                "Named SRD eponyms linked via data.srd_alias.",
                "source=dmg24 → content_layer community_ref.",
            ],
            "by_type": dict(sorted(types.items())),
            "by_rarity": dict(sorted(rares.items())),
            "srd_alias_count": sum(1 for e in entries if e["data"].get("srd_alias")),
            "text_ru_pending": pending_text,
            "name_ru_pending": pending_name,
            "sentient": sorted(SENTIENT & {e["slug"] for e in entries}),
            "cursed": sorted(CURSED & {e["slug"] for e in entries}),
        },
        "entries": entries,
    }
    OUT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # Layer-3 review sample (A–Z first 12 + artifacts)
    sample = entries[:12] + [e for e in entries if e["data"]["rarity"] == "artifact"]
    seen: set[str] = set()
    lines = [
        "# P24-C11 — выборка для ручной сверки (слой 3)",
        "",
        f"Всего карточек DMG24 сверх SRD: **{len(entries)}**.",
        "",
        "| slug | name_ru | type | rarity | attune | srd_alias |",
        "|---|---|---|---|---|---|",
    ]
    for e in sample:
        if e["slug"] in seen:
            continue
        seen.add(e["slug"])
        d = e["data"]
        lines.append(
            f"| `{e['slug']}` | {e['name_ru']} | {d['magic_item_type']} | {d['rarity']} | "
            f"{'да' if d['requires_attunement'] else 'нет'}"
            f"{(' (' + d['attunement_restriction_ru'] + ')') if d.get('attunement_restriction_ru') else ''} | "
            f"{d.get('srd_alias') or '—'} |"
        )
    lines.extend(
        [
            "",
            "## Источник русских имён",
            "",
            "- `docs/edition-2024/sources/magic_items.csv` (next.dnd.su), сверка ttg.club.",
            "- Короткие `summary_ru` своими словами; длинный текст DMG не копировался.",
            "",
            f"По типам: `{dict(types)}`",
            f"По редкости: `{dict(rares)}`",
            f"`text_ru_pending`: {pending_text}; `name_ru_pending`: {pending_name}.",
            "",
        ]
    )
    LAYER3.write_text("\n".join(lines), encoding="utf-8")
    print(
        f"wrote {OUT_JSON} count={len(entries)} types={dict(types)} rares={dict(rares)} "
        f"alias={payload['meta']['srd_alias_count']} pending_text={pending_text}"
    )
    return payload


if __name__ == "__main__":
    build()
