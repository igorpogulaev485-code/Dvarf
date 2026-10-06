#!/usr/bin/env python3
"""Fetch SRD 5.1 (2014) from dnd5eapi.co into backend/data/srd/2014/catalog.json."""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any

BASE = "https://www.dnd5eapi.co/api/2014"
OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "srd" / "2014"
NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")
SOURCE = "srd-5.1"

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

# Temporary RU labels for common picker entries; rest keep English until translation pass.
NAME_RU = {
    "human": "Человек",
    "elf": "Эльф",
    "dwarf": "Дварф",
    "halfling": "Полурослик",
    "dragonborn": "Драконорожденный",
    "gnome": "Гном",
    "half_elf": "Полуэльф",
    "half_orc": "Полуорк",
    "tiefling": "Тифлинг",
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
    "acolyte": "Послушник",
    "dagger": "Кинжал",
    "mace": "Булава",
    "quarterstaff": "Боевой посох",
    "handaxe": "Ручной топор",
    "javelin": "Метательное копье",
    "warhammer": "Боевой молот",
    "longsword": "Длинный меч",
    "shortsword": "Короткий меч",
    "shortbow": "Короткий лук",
    "light_crossbow": "Арбалет, лёгкий",
    "club": "Дубинка",
    "greatsword": "Двуручный меч",
    "battleaxe": "Боевой топор",
    "longbow": "Длинный лук",
    "shield": "Щит",
    "leather_armor": "Кожаный доспех",
    "padded_armor": "Стёганый доспех",
    "studded_leather_armor": "Клёпаный кожаный",
    "hide_armor": "Шкурный доспех",
    "chain_shirt": "Кольчужная рубаха",
    "scale_mail": "Чешуйчатый доспех",
    "breastplate": "Кираса",
    "half_plate_armor": "Полулаты",
    "ring_mail": "Колечный доспех",
    "chain_mail": "Кольчуга",
    "splint_armor": "Наборный доспех",
    "plate_armor": "Латы",
}


def slugify(index: str) -> str:
    return index.replace("-", "_")[:80]


def stable_id(kind: str, slug: str) -> str:
    return str(uuid.uuid5(NAMESPACE, f"srd-5.1:{kind}:{slug}"))


def get_json(path: str) -> Any:
    url = path if path.startswith("http") else f"{BASE}{path}"
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code == 429 and attempt < 4:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise
        except TimeoutError:
            if attempt < 4:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise
    raise RuntimeError(f"failed to fetch {url}")


def list_results(path: str) -> list[dict[str, Any]]:
    payload = get_json(path)
    return list(payload.get("results") or [])


def entry(
    *,
    kind: str,
    index: str,
    name_en: str,
    sort_order: int,
    data: dict[str, Any] | None = None,
    external_ref: dict[str, Any] | None = None,
) -> dict[str, Any]:
    slug = slugify(index)
    return {
        "id": stable_id(kind, slug),
        "kind": kind,
        "slug": slug,
        "name_ru": NAME_RU.get(slug, name_en),
        "name_en": name_en,
        "rules_edition": "2014",
        "parent_id": None,
        "source": SOURCE,
        "external_ref": external_ref or {"api": f"/api/2014/{kind if kind != 'class' else 'classes'}/{index}"},
        "data": data or {},
        "sort_order": sort_order,
        "is_active": True,
    }


def map_damage_type(name: str | None) -> str:
    if not name:
        return ""
    key = name.lower()
    return DAMAGE_TYPE_RU.get(key, name)


def weapon_data(raw: dict[str, Any]) -> dict[str, Any]:
    props = {p.get("index") for p in (raw.get("properties") or []) if isinstance(p, dict)}
    damage = raw.get("damage") or {}
    damage_type = ""
    if isinstance(damage.get("damage_type"), dict):
        damage_type = map_damage_type(damage["damage_type"].get("name"))
    ability = "str"
    if raw.get("weapon_range") == "Ranged" or "finesse" in props:
        ability = "dex"
    category = (raw.get("weapon_category") or "simple").lower()
    return {
        "ability": ability,
        "damage": damage.get("damage_dice") or "",
        "damage_type": damage_type,
        "category": category,
        "finesse": "finesse" in props,
        "ranged": raw.get("weapon_range") == "Ranged",
        "weight_lb": raw.get("weight"),
        "properties": sorted(p for p in props if p),
    }


def armor_data(raw: dict[str, Any]) -> dict[str, Any]:
    armor = raw.get("armor_class") or {}
    category = (raw.get("armor_category") or "").lower()
    if category == "shield":
        kind = "shield"
        base_ac = armor.get("base", 2)
    elif category == "light":
        kind = "light"
        base_ac = armor.get("base")
    elif category == "medium":
        kind = "medium"
        base_ac = armor.get("base")
    elif category == "heavy":
        kind = "heavy"
        base_ac = armor.get("base")
    else:
        kind = "none"
        base_ac = armor.get("base")
    return {
        "armor_kind": kind,
        "base_ac": base_ac,
        "weight_lb": raw.get("weight"),
        "stealth_disadvantage": bool(raw.get("stealth_disadvantage")),
    }


def spell_data(raw: dict[str, Any]) -> dict[str, Any]:
    classes = [
        c.get("index")
        for c in (raw.get("classes") or [])
        if isinstance(c, dict) and c.get("index")
    ]
    attack_or_save = "—"
    if raw.get("attack_type"):
        attack_or_save = "атака"
    elif raw.get("dc"):
        dc_type = ((raw.get("dc") or {}).get("dc_type") or {}).get("name") or ""
        attack_or_save = dc_type[:3].upper() if dc_type else "спас"
    damage = ""
    dmg = raw.get("damage")
    if isinstance(dmg, list) and dmg:
        first = dmg[0]
        at_slot = first.get("damage_at_slot_level") or {}
        at_char = first.get("damage_at_character_level") or {}
        if at_slot:
            damage = str(at_slot.get(str(raw.get("level") or 1)) or next(iter(at_slot.values()), ""))
        elif at_char:
            damage = str(at_char.get("1") or next(iter(at_char.values()), ""))
        dtype = ((first.get("damage_type") or {}).get("name")) if isinstance(first, dict) else None
        if dtype and damage:
            damage = f"{damage} {map_damage_type(dtype)}"
        elif dtype:
            damage = map_damage_type(dtype)
    casting = raw.get("casting_time") or ""
    if casting == "1 action":
        casting = "Д"
    elif casting == "1 bonus action":
        casting = "БД"
    elif casting == "1 reaction":
        casting = "Р"
    return {
        "level": int(raw.get("level") or 0),
        "school": ((raw.get("school") or {}).get("index") or ""),
        "casting_time": casting,
        "range": raw.get("range") or "",
        "attack_or_save": attack_or_save,
        "damage": damage,
        "concentration": bool(raw.get("concentration")),
        "ritual": bool(raw.get("ritual")),
        "classes": classes,
        "components": raw.get("components") or [],
    }


def fetch_detail(url_path: str) -> dict[str, Any]:
    if url_path.startswith("/api/2014"):
        return get_json(url_path[len("/api/2014") :])
    return get_json(url_path)


def build_catalog() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for i, item in enumerate(list_results("/races"), start=1):
        rows.append(
            entry(
                kind="race",
                index=item["index"],
                name_en=item["name"],
                sort_order=i * 10,
                external_ref={"api": item["url"]},
            )
        )

    for i, item in enumerate(list_results("/classes"), start=1):
        rows.append(
            entry(
                kind="class",
                index=item["index"],
                name_en=item["name"],
                sort_order=i * 10,
                data={"hit_die": None},
                external_ref={"api": item["url"]},
            )
        )
        detail = fetch_detail(item["url"])
        rows[-1]["data"]["hit_die"] = detail.get("hit_die")
        time.sleep(0.05)

    for i, item in enumerate(list_results("/backgrounds"), start=1):
        rows.append(
            entry(
                kind="background",
                index=item["index"],
                name_en=item["name"],
                sort_order=i * 10,
                external_ref={"api": item["url"]},
            )
        )

    for i, item in enumerate(list_results("/alignments"), start=1):
        rows.append(
            entry(
                kind="alignment",
                index=item["index"],
                name_en=item["name"],
                sort_order=i * 10,
                external_ref={"api": item["url"]},
            )
        )

    for i, item in enumerate(list_results("/skills"), start=1):
        rows.append(
            entry(
                kind="skill",
                index=item["index"],
                name_en=item["name"],
                sort_order=i * 10,
                external_ref={"api": item["url"]},
            )
        )

    for i, item in enumerate(list_results("/feats"), start=1):
        rows.append(
            entry(
                kind="feat",
                index=item["index"],
                name_en=item["name"],
                sort_order=i * 10,
                external_ref={"api": item["url"]},
            )
        )

    for i, item in enumerate(list_results("/conditions"), start=1):
        rows.append(
            entry(
                kind="condition",
                index=item["index"],
                name_en=item["name"],
                sort_order=i * 10,
                data={"slug": slugify(item["index"])},
                external_ref={"api": item["url"]},
            )
        )

    weapons = get_json("/equipment-categories/weapon").get("equipment") or []
    for i, item in enumerate(weapons, start=1):
        detail = fetch_detail(item["url"])
        rows.append(
            entry(
                kind="weapon",
                index=item["index"],
                name_en=item["name"],
                sort_order=i * 10,
                data=weapon_data(detail),
                external_ref={"api": item["url"]},
            )
        )
        time.sleep(0.03)

    armors = get_json("/equipment-categories/armor").get("equipment") or []
    for i, item in enumerate(armors, start=1):
        detail = fetch_detail(item["url"])
        # Skip if this is somehow not armor-shaped
        if detail.get("equipment_category", {}).get("index") not in {"armor", None} and not detail.get(
            "armor_category"
        ):
            continue
        if not detail.get("armor_category") and detail.get("weapon_category"):
            continue
        rows.append(
            entry(
                kind="armor",
                index=item["index"],
                name_en=item["name"],
                sort_order=i * 10,
                data=armor_data(detail),
                external_ref={"api": item["url"]},
            )
        )
        time.sleep(0.03)

    gear = get_json("/equipment-categories/adventuring-gear").get("equipment") or []
    for i, item in enumerate(gear, start=1):
        detail = fetch_detail(item["url"])
        rows.append(
            entry(
                kind="item",
                index=item["index"],
                name_en=item["name"],
                sort_order=i * 10,
                data={"weight_lb": detail.get("weight")},
                external_ref={"api": item["url"]},
            )
        )
        time.sleep(0.03)

    spells = list_results("/spells")
    for i, item in enumerate(spells, start=1):
        detail = fetch_detail(item["url"])
        rows.append(
            entry(
                kind="spell",
                index=item["index"],
                name_en=item["name"],
                sort_order=i * 10,
                data=spell_data(detail),
                external_ref={"api": item["url"]},
            )
        )
        if i % 25 == 0:
            print(f"spells {i}/{len(spells)}", file=sys.stderr)
        time.sleep(0.03)

    # Deduplicate by (kind, slug, edition)
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
    print("Fetching SRD 5.1 from dnd5eapi…", file=sys.stderr)
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
