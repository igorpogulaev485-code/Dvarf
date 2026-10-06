#!/usr/bin/env python3
"""Fetch SRD 5.2 (2024) from Open5e API into backend/data/srd/2024/catalog.json."""

from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any

BASE = "https://api.open5e.com/v2"
OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "srd" / "2024"
NAMESPACE = uuid.UUID("6ba7b811-9dad-11d1-80b4-00c04fd430c8")
SOURCE = "srd-5.2"
DOC = "srd-2024"

DAMAGE_TYPE_RU = {
    "bludgeoning": "дробящий",
    "piercing": "колющий",
    "slashing": "рубящий",
    "acid": "кислота",
    "cold": "холод",
    "fire": "огонь",
    "force": "силовой",
    "lightning": "электричество",
    "necrotic": "некротический",
    "poison": "яд",
    "psychic": "психический",
    "radiant": "излучение",
    "thunder": "звук",
}

NAME_RU = {
    "human": "Человек",
    "elf": "Эльф",
    "dwarf": "Дварф",
    "halfling": "Полурослик",
    "dragonborn": "Драконорожденный",
    "gnome": "Гном",
    "orc": "Орк",
    "tiefling": "Тифлинг",
    "goliath": "Голиаф",
    "barbarian": "Варвар",
    "bard": "Бард",
    "cleric": "Жрец",
    "druid": "Друид",
    "fighter": "Воин",
    "monk": "Монах",
    "paladin": "Паладин",
    "ranger": "Следопыт",
    "rogue": "Плут",
    "sorcerer": "Чародей",
    "warlock": "Колдун",
    "wizard": "Волшебник",
}


def key_to_slug(key: str) -> str:
    # srd-2024_longsword -> longsword
    raw = key.split("_", 1)[-1] if "_" in key else key
    return raw.replace("-", "_")[:80]


def stable_id(kind: str, slug: str) -> str:
    return str(uuid.uuid5(NAMESPACE, f"srd-5.2:{kind}:{slug}"))


def get_json(url: str) -> Any:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "DvarfSRDIngest/1.0 (+https://github.com/igorpogulaev485-code/Dvarf)",
            "Accept": "application/json",
        },
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception:
            if attempt >= 4:
                raise
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(url)


def iter_pages(endpoint: str, extra: dict[str, str] | None = None) -> list[dict[str, Any]]:
    params = {"document__key": DOC, "limit": "100"}
    if extra:
        params.update(extra)
    url = f"{BASE}/{endpoint}/?{urllib.parse.urlencode(params)}"
    rows: list[dict[str, Any]] = []
    while url:
        payload = get_json(url)
        rows.extend(payload.get("results") or [])
        url = payload.get("next")
        time.sleep(0.05)
    return rows


def entry(
    *,
    kind: str,
    key: str,
    name_en: str,
    sort_order: int,
    data: dict[str, Any] | None = None,
    parent_id: str | None = None,
) -> dict[str, Any]:
    slug = key_to_slug(key)
    return {
        "id": stable_id(kind, slug),
        "kind": kind,
        "slug": slug,
        "name_ru": NAME_RU.get(slug, name_en),
        "name_en": name_en,
        "rules_edition": "2024",
        "parent_id": parent_id,
        "source": SOURCE,
        "external_ref": {"open5e_key": key, "document": DOC},
        "data": data or {},
        "sort_order": sort_order,
        "is_active": True,
    }


def map_damage(name: str | None) -> str:
    if not name:
        return ""
    return DAMAGE_TYPE_RU.get(name.lower(), name)


def weapon_data(raw: dict[str, Any]) -> dict[str, Any]:
    props = []
    finesse = False
    for p in raw.get("properties") or []:
        prop = (p or {}).get("property") or {}
        name = (prop.get("name") or "").lower()
        if name:
            props.append(name)
        if name == "finesse":
            finesse = True
    ranged = bool(raw.get("range")) and int(raw.get("range") or 0) > 0
    ability = "dex" if finesse or ranged else "str"
    return {
        "ability": ability,
        "damage": raw.get("damage_dice") or "",
        "damage_type": map_damage(((raw.get("damage_type") or {}).get("name"))),
        "category": "simple" if raw.get("is_simple") else "martial",
        "finesse": finesse,
        "ranged": ranged,
        "properties": props,
    }


def armor_data(raw: dict[str, Any]) -> dict[str, Any]:
    category = (raw.get("category") or "").lower()
    if category == "shield":
        kind = "shield"
    elif category in {"light", "medium", "heavy"}:
        kind = category
    else:
        kind = "none"
    return {
        "armor_kind": kind,
        "base_ac": raw.get("ac_base"),
        "stealth_disadvantage": bool(raw.get("grants_stealth_disadvantage")),
    }


def spell_data(raw: dict[str, Any]) -> dict[str, Any]:
    classes = []
    for c in raw.get("classes") or []:
        if isinstance(c, dict) and c.get("key"):
            classes.append(key_to_slug(c["key"]))
        elif isinstance(c, dict) and c.get("name"):
            classes.append(c["name"].lower())
    casting = raw.get("casting_time") or ""
    if casting == "action":
        casting = "Д"
    elif casting in {"bonus", "bonus action", "bonus_action"}:
        casting = "БД"
    elif casting == "reaction":
        casting = "Р"
    attack_or_save = "—"
    if raw.get("attack_roll"):
        attack_or_save = "атака"
    elif raw.get("saving_throw_ability"):
        ability = str(raw.get("saving_throw_ability"))
        attack_or_save = ability[:3].upper()
    damage = raw.get("damage_roll") or ""
    dtypes = raw.get("damage_types") or []
    if isinstance(dtypes, list) and dtypes:
        first = dtypes[0]
        name = first.get("name") if isinstance(first, dict) else str(first)
        if damage:
            damage = f"{damage} {map_damage(name)}"
        else:
            damage = map_damage(name)
    range_val = raw.get("range_text") or raw.get("range") or ""
    if isinstance(range_val, (int, float)):
        range_val = f"{int(range_val)} feet"
    school = raw.get("school") or {}
    school_key = school.get("key") if isinstance(school, dict) else ""
    return {
        "level": int(raw.get("level") or 0),
        "school": school_key or "",
        "casting_time": casting,
        "range": str(range_val),
        "attack_or_save": attack_or_save,
        "damage": damage,
        "concentration": bool(raw.get("concentration")),
        "ritual": bool(raw.get("ritual")),
        "classes": classes,
    }


def build_catalog() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for i, item in enumerate(iter_pages("species"), start=1):
        if item.get("is_subspecies"):
            continue
        rows.append(
            entry(
                kind="race",
                key=item["key"],
                name_en=item["name"],
                sort_order=i * 10,
            )
        )

    class_id_by_key: dict[str, str] = {}
    classes = iter_pages("classes")
    bases = [c for c in classes if not c.get("subclass_of")]
    subs = [c for c in classes if c.get("subclass_of")]
    for i, item in enumerate(bases, start=1):
        row = entry(
            kind="class",
            key=item["key"],
            name_en=item["name"],
            sort_order=i * 10,
            data={"hit_die": item.get("hit_dice")},
        )
        class_id_by_key[item["key"]] = row["id"]
        rows.append(row)
    for i, item in enumerate(subs, start=1):
        parent_key = (item.get("subclass_of") or {}).get("key")
        rows.append(
            entry(
                kind="subclass",
                key=item["key"],
                name_en=item["name"],
                sort_order=1000 + i * 10,
                parent_id=class_id_by_key.get(parent_key),
                data={"parent_class_key": parent_key},
            )
        )

    for i, item in enumerate(iter_pages("backgrounds"), start=1):
        rows.append(
            entry(
                kind="background",
                key=item["key"],
                name_en=item["name"],
                sort_order=i * 10,
            )
        )

    for i, item in enumerate(iter_pages("skills"), start=1):
        rows.append(
            entry(
                kind="skill",
                key=item["key"],
                name_en=item["name"],
                sort_order=i * 10,
            )
        )

    for i, item in enumerate(iter_pages("feats"), start=1):
        rows.append(
            entry(
                kind="feat",
                key=item["key"],
                name_en=item["name"],
                sort_order=i * 10,
            )
        )

    for i, item in enumerate(iter_pages("weapons"), start=1):
        rows.append(
            entry(
                kind="weapon",
                key=item["key"],
                name_en=item["name"],
                sort_order=i * 10,
                data=weapon_data(item),
            )
        )

    for i, item in enumerate(iter_pages("armor"), start=1):
        rows.append(
            entry(
                kind="armor",
                key=item["key"],
                name_en=item["name"],
                sort_order=i * 10,
                data=armor_data(item),
            )
        )

    for i, item in enumerate(iter_pages("items"), start=1):
        # Skip if also represented as weapon/armor keys heavily; keep adventuring items.
        rows.append(
            entry(
                kind="item",
                key=item["key"],
                name_en=item["name"],
                sort_order=i * 10,
                data={"weight_lb": item.get("weight")},
            )
        )

    spells = iter_pages("spells")
    for i, item in enumerate(spells, start=1):
        rows.append(
            entry(
                kind="spell",
                key=item["key"],
                name_en=item["name"],
                sort_order=i * 10,
                data=spell_data(item),
            )
        )
        if i % 50 == 0:
            print(f"spells {i}/{len(spells)}", file=sys.stderr)

    # Conditions are missing under document=srd-2024 in Open5e; seed SRD-compatible set.
    conditions = [
        "Blinded",
        "Charmed",
        "Deafened",
        "Exhaustion",
        "Frightened",
        "Grappled",
        "Incapacitated",
        "Invisible",
        "Paralyzed",
        "Petrified",
        "Poisoned",
        "Prone",
        "Restrained",
        "Stunned",
        "Unconscious",
    ]
    for i, name in enumerate(conditions, start=1):
        slug = name.lower()
        rows.append(
            {
                "id": stable_id("condition", slug),
                "kind": "condition",
                "slug": slug,
                "name_ru": name,
                "name_en": name,
                "rules_edition": "2024",
                "parent_id": None,
                "source": SOURCE,
                "external_ref": {"note": "seeded from SRD condition list"},
                "data": {"slug": slug},
                "sort_order": i * 10,
                "is_active": True,
            }
        )

    seen: set[tuple[str, str]] = set()
    unique: list[dict[str, Any]] = []
    for row in rows:
        key = (row["kind"], row["slug"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(row)
    return unique


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print("Fetching SRD 5.2 from Open5e…", file=sys.stderr)
    catalog = build_catalog()
    out = OUT_DIR / "catalog.json"
    out.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    by_kind: dict[str, int] = {}
    for row in catalog:
        by_kind[row["kind"]] = by_kind.get(row["kind"], 0) + 1
    print(f"Wrote {len(catalog)} entries -> {out}", file=sys.stderr)
    for kind, count in sorted(by_kind.items()):
        print(f"  {kind}: {count}", file=sys.stderr)


if __name__ == "__main__":
    main()
