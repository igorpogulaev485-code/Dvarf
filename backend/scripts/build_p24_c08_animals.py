#!/usr/bin/env python3
"""P24-C08: build animals_srd.json (SRD 5.2.1 Animals section).

Mechanics: SRD 5.2.1 Animals (markdown, CC-BY 4.0).
RU names: docs/edition-2024/sources/creatures.csv (next.dnd.su / ttg).
Monsters A–Z already in C07 — do not duplicate those slugs.

Short Russian cards only — no long SRD prose. Does not copy 2014 stats.
beast_tags: wild_shape_ok (Beast, CR≤1; fly unlocked at druid 8), mount.
"""

from __future__ import annotations

import csv
import importlib.util
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "docs" / "edition-2024" / "sources"
LIVE = REPO / "backend" / "data" / "srd" / "2024" / "live"
MD_PATH = Path("/tmp/p24-c08/animals.md")
CSV_PATH = SOURCES / "creatures.csv"
OUT_JSON = LIVE / "animals_srd.json"
GAPS = SOURCES / "gaps.md"
COUNTS = SOURCES / "counts.json"
LAYER3 = SOURCES / "P24-C08-layer3-review.md"
CHANGELOG = REPO / "docs" / "changelog" / "P24-C08.md"

SRD_ANIMAL_COUNT = 95
SRD_MONSTER_COUNT = 235

# Classic SRD mounts (data tag only — no table automation).
MOUNT_SLUGS = frozenset(
    {
        "camel",
        "draft-horse",
        "elephant",
        "mule",
        "pony",
        "riding-horse",
        "warhorse",
    }
)

# Extra animal trait/action RU names beyond C07 map.
NAME_RU_ANIMAL: dict[str, str] = {
    "keen hearing and smell": "Острый слух и нюх",
    "keen sight": "Острое зрение",
    "keen smell": "Острый нюх",
    "keen hearing": "Острый слух",
    "charge": "Натиск",
    "relentless": "Неукротимость",
    "beast of burden": "Вьючное животное",
    "hold breath": "Задержка дыхания",
    "water breathing": "Водное дыхание",
    "blood frenzy": "Кровавое бешенство",
    "pack tactics": "Тактика стаи",
    "pounce": "Наскок",
    "rampage": "Буйство",
    "running leap": "Прыжок с разбега",
    "spider climb": "Паучье лазание",
    "web sense": "Чувство паутины",
    "web walker": "Хождение по паутине",
    "flyby": "Пролёт",
    "eavesdropper": "Подслушиватель",
    "mimicry": "Мимикрия",
    "illumination": "Свечение",
    "grasping tentacles": "Хватающие щупальца",
    "ink cloud": "Чернильное облако",
    "underwater camouflage": "Подводный камуфляж",
    "standing leap": "Прыжок с места",
    "bite": "Укус",
    "claws": "Когти",
    "claw": "Коготь",
    "hooves": "Копыта",
    "gore": "Бодание",
    "sting": "Жало",
    "tail": "Хвост",
    "trunk": "Хобот",
    "tentacles": "Щупальца",
    "tentacle": "Щупальце",
    "beak": "Клюв",
    "talons": "Когти",
    "constrict": "Сжимание",
    "multiattack": "Мультиатака",
    "blast": "Взрыв",
    "trample": "Топот",
    "swallow": "Проглатывание",
}

CANNED_TEXT_ANIMAL: dict[str, str] = {
    "keen hearing and smell": "Преимущество к проверкам Внимательности по слуху или запаху.",
    "keen sight": "Преимущество к проверкам Внимательности по зрению.",
    "keen smell": "Преимущество к проверкам Внимательности по запаху.",
    "keen hearing": "Преимущество к проверкам Внимательности по слуху.",
    "pack tactics": "Есть преимущество к атаке по цели, если в 5 фт от цели есть дееспособный союзник.",
    "flyby": "Не провоцирует атаку, когда улетает из досягаемости врага.",
    "charge": "Если сближается и затем бодает — доп. урон и цель может упасть.",
    "beast of burden": "Считается крупнее на одну категорию при определении грузоподъёмности.",
    "hold breath": "Может задерживать дыхание (см. карточку).",
    "water breathing": "Дышит только водой.",
    "blood frenzy": "Преимущество к атаке по цели, у которой нет всех хитов.",
    "relentless": "Раз в день при снижении до 0 хитов может остаться с 1 хитом (порог урона).",
    "spider climb": "Может лазить по трудным поверхностям, включая потолки, без проверки.",
    "web walker": "Игнорирует ограничения движения от паутины.",
    "web sense": "Пока касается паутины, знает положение других касающихся её существ.",
    "running leap": "С разбега прыгает дальше обычного.",
    "standing leap": "Прыгает в длину/высоту без разбега (см. карточку).",
    "underwater camouflage": "Преимущество к Скрытности под водой.",
    "ink cloud": "Выпускает чернила; область сильно заслонённая, существо может уйти.",
    "illumination": "Излучает яркий/тусклый свет (см. карточку).",
    "mimicry": "Подражает звукам; проверка Проницательности против Обмана зверя.",
    "eavesdropper": "Может передавать услышанное хозяину (см. карточку).",
    "amphibious": "Дышит воздухом и водой.",
    "multiattack": "Несколько атак за действие «Атака» (см. список).",
}


def _load_c07():
    path = Path(__file__).resolve().parent / "build_p24_c07_monsters.py"
    spec = importlib.util.spec_from_file_location("build_p24_c07_monsters", path)
    if spec is None or spec.loader is None:
        raise SystemExit(f"Cannot load {path}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


def cr_value(cr: str) -> float:
    cr = str(cr).strip()
    if "/" in cr:
        a, b = cr.split("/", 1)
        return float(a) / float(b)
    return float(cr)


def compute_beast_tags(
    *,
    slug: str,
    type_key: str,
    cr: str,
    speed: dict[str, Any],
    subtype: str | None = None,
) -> list[str]:
    """Data-only tags for ranger beast / wild shape / mounts (no runtime logic)."""
    tags: list[str] = []
    is_swarm = bool(subtype and "swarm" in str(subtype).lower())
    # SRD 2024 Wild Shape: Beast stat blocks, max CR 1 (druid 8); Fly from level 8.
    # Swim is not restricted like in 2014. Swarms are not typical wild-shape forms.
    if (
        type_key == "beast"
        and not is_swarm
        and cr_value(cr) <= 1.0 + 1e-9
    ):
        tags.append("wild_shape_ok")
    if slug in MOUNT_SLUGS:
        tags.append("mount")
    # Helpful markers for later filters (still data-only).
    if speed.get("fly"):
        tags.append("has_fly")
    if speed.get("swim"):
        tags.append("has_swim")
    return tags


def extract_blocks_h2(text: str) -> dict[str, str]:
    names = re.findall(r"^## (.+)$", text, re.M)
    out: dict[str, str] = {}
    for name in names:
        m = re.search(
            rf"^## {re.escape(name)}\n(.+?)(?=^## |\Z)",
            text,
            re.M | re.S,
        )
        if not m:
            raise ValueError(f"block missing: {name}")
        out[name] = m.group(0)
    return out


def parse_animal_block(
    c07: Any,
    name_en: str,
    block: str,
    csv_row: dict[str, str],
    trait_map: dict[str, str],
    spell_slugs: set[str],
    gear_by_en: dict[str, str],
    sort_order: int,
) -> dict[str, Any]:
    # Animals MD uses ### Traits / ### Actions (monsters use ####).
    block_norm = re.sub(
        r"^### (Traits|Actions|Bonus Actions|Reactions|Legendary Actions)\s*$",
        r"#### \1",
        block,
        flags=re.M,
    )
    card = c07.parse_monster_block(
        name_en,
        block_norm,
        csv_row,
        trait_map,
        spell_slugs,
        gear_by_en,
        sort_order=sort_order,
        text_map=None,
    )
    data = card["data"]
    data["srd_section"] = "animals"

    # "Swarm of Tiny Beasts" → type beast (parser otherwise keeps plural "beasts").
    if str(data.get("type") or "").lower() in {"beasts", "beast"}:
        data["type"] = "beast"
        if data.get("subtype") and "swarm" in str(data.get("subtype")).lower():
            data["type_ru"] = "рой (зверь)"
        else:
            data["type_ru"] = csv_row.get("creature_type") or "Зверь"

    # Re-paraphrase trait/action names with animal dictionary; fix canned texts.
    merged_names = {**NAME_RU_ANIMAL, **{k.lower(): v for k, v in trait_map.items()}}
    for key in ("traits", "actions", "bonus_actions", "reactions", "legendary_actions"):
        items = data.get(key) or []
        for item in items:
            en = str(item.get("name_en") or "")
            base = re.sub(r"\s*\([^)]*\)\s*$", "", en).strip().lower()
            if base in NAME_RU_ANIMAL:
                usage = ""
                m = re.search(r"(\([^)]*\))\s*$", en.strip())
                if m:
                    usage = m.group(1)
                    usage = re.sub(r"\bDay\b", "день", usage, flags=re.I)
                    usage = re.sub(r"\bor\b", "или", usage, flags=re.I)
                    usage = usage.replace("/Day", "/день").replace("/day", "/день")
                item["name_ru"] = f"{NAME_RU_ANIMAL[base]}{(' ' + usage) if usage else ''}".strip()
                item["name_ru_pending"] = False
            elif item.get("name_ru_pending") and base in merged_names:
                item["name_ru"] = merged_names[base]
                item["name_ru_pending"] = False
            if base in CANNED_TEXT_ANIMAL:
                item["text_ru"] = CANNED_TEXT_ANIMAL[base]
            elif base in c07.CANNED_TEXT_RU:
                item["text_ru"] = c07.CANNED_TEXT_RU[base]

    tags = compute_beast_tags(
        slug=card["slug"],
        type_key=str(data.get("type") or ""),
        cr=str(data.get("cr") or "0"),
        speed=data.get("speed") or {},
        subtype=data.get("subtype"),
    )
    data["beast_tags"] = tags

    # Refresh summary with tags hint
    summary_bits = [
        f"{data.get('size_ru')} {data.get('type_ru')}, ПО {data.get('cr')}",
        f"КД {data.get('ac')}, хиты {data.get('hp_average')} ({data.get('hp_formula')})",
        (
            f"инициатива {data['initiative']['mod']:+d} "
            f"(ср. {data['initiative']['score']}), БМ +{data.get('proficiency_bonus')}"
        ),
    ]
    if "wild_shape_ok" in tags:
        summary_bits.append("дикий облик")
    if "mount" in tags:
        summary_bits.append("ездовое")
    data["summary_ru"] = "; ".join(summary_bits) + "."
    return card


def update_gaps() -> None:
    note = (
        "- **P24-C08 (2026-11-15):** сид раздела SRD 5.2.1 **Animals** "
        f"({SRD_ANIMAL_COUNT} карточек) в `animals_srd.json`. "
        f"Без пересечения slug с Monsters C07 ({SRD_MONSTER_COUNT}). "
        "Поле `beast_tags`: `wild_shape_ok` (зверь, ПО≤1, не рой), `mount`, "
        "`has_fly` / `has_swim` — данные без логики стола.\n"
    )
    text = GAPS.read_text(encoding="utf-8")
    # Match the C08 bullet only (C07 text also mentions «P24-C08»).
    if re.search(r"^- \*\*P24-C08\b", text, re.M):
        text = re.sub(
            r"^- \*\*P24-C08.*?(?=\n- \*\*P24-|\n## |\Z)",
            note.rstrip() + "\n",
            text,
            count=1,
            flags=re.M | re.S,
        )
    else:
        text = text.rstrip() + "\n" + note
    GAPS.write_text(text, encoding="utf-8")


def update_counts() -> None:
    data = json.loads(COUNTS.read_text(encoding="utf-8"))
    notes = data.setdefault("notes", [])
    note = (
        f"P24-C08: animals_srd={SRD_ANIMAL_COUNT}; "
        f"total SRD bestiary={SRD_MONSTER_COUNT + SRD_ANIMAL_COUNT}."
    )
    notes = [n for n in notes if not str(n).startswith("P24-C08:")]
    notes.append(note)
    data["notes"] = notes
    sc = data.setdefault("srd_creatures", {})
    sc["monsters"] = SRD_MONSTER_COUNT
    sc["animals"] = SRD_ANIMAL_COUNT
    sc["total_srd"] = SRD_MONSTER_COUNT + SRD_ANIMAL_COUNT
    sc["animals_seeded"] = True
    COUNTS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_layer3(cards: list[dict[str, Any]]) -> None:
    want = {
        "wolf",
        "riding-horse",
        "brown-bear",
        "giant-eagle",
        "allosaurus",
        "bat",
        "warhorse",
        "octopus",
        "mammoth",
        "flying-snake",
    }
    sample = [c for c in cards if c["slug"] in want]
    by_type: dict[str, list] = {}
    for c in cards:
        by_type.setdefault(c["data"]["type"], []).append(c)
    for items in by_type.values():
        if items[0] not in sample:
            sample.append(items[0])
    lines = [
        "# P24-C08 — выборка для слоя 3 (ручная сверка)",
        "",
        "Сверять с SRD 5.2.1 Animals и next.dnd.su / new.ttg.club (имена).",
        "Агент-сборщик слой 3 не принимает.",
        "",
        "| slug | name_en | name_ru | CR | тип | beast_tags | источник |",
        "|---|---|---|---|---|---|---|",
    ]
    for c in sample[:24]:
        tags = ", ".join(c["data"].get("beast_tags") or []) or "—"
        lines.append(
            f"| `{c['slug']}` | {c['name_en']} | {c['name_ru']} | {c['data']['cr']} | "
            f"{c['data']['type_ru']} | {tags} | SRD PDF / next.dnd.su |"
        )
    LAYER3.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_changelog(cards: list[dict[str, Any]], by_type: Counter, by_cr: Counter) -> None:
    wild = sum(1 for c in cards if "wild_shape_ok" in (c["data"].get("beast_tags") or []))
    mounts = sum(1 for c in cards if "mount" in (c["data"].get("beast_tags") or []))
    lines = [
        "# P24-C08 — Бестиарий SRD 2024 (Animals)",
        "",
        "Дата: 2026-11-15.",
        "",
        "## Сделано",
        "",
        f"- Живая волна `animals_srd.json`: **{len(cards)}** карточек `kind=bestiary`, "
        "`rules_edition=2024`, `srd_section=animals`.",
        "- Без пересечения slug с `creatures_srd.json` (C07 Monsters).",
        "- Поля 2024: инициатива, БМ, опыт, моды/спасы, краткие RU-черты/действия.",
        f"- `beast_tags`: wild_shape_ok={wild}, mount={mounts} (данные, без логики стола).",
        "- Миграция `p24c08anim01` (после `p24c07best01`), идемпотентный сид.",
        "",
        "## Количества по типу",
        "",
    ]
    for t, n in by_type.most_common():
        lines.append(f"- {t}: {n}")
    lines += ["", "## Количества по ПО", ""]
    for cr, n in sorted(by_cr.items(), key=lambda x: cr_value(x[0])):
        lines.append(f"- ПО {cr}: {n}")
    lines += [
        "",
        "## Не в этой пачке",
        "",
        "- Генератор встреч / стол (M04).",
        "- Флаг открытия 2024.",
        "- Логика дикого облика / зверя следопыта (только теги).",
        "",
    ]
    CHANGELOG.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    if not MD_PATH.is_file() or MD_PATH.stat().st_size < 1000:
        raise SystemExit(f"Missing SRD animals markdown at {MD_PATH}")

    c07 = _load_c07()
    text = MD_PATH.read_text(encoding="utf-8")
    blocks = extract_blocks_h2(text)
    assert len(blocks) == SRD_ANIMAL_COUNT, len(blocks)

    name_by_slug: dict[str, str] = {}
    for n in blocks:
        name_by_slug[c07.slugify(n)] = n

    csv_animals = {
        r["id"]: r
        for r in csv.DictReader(CSV_PATH.open(encoding="utf-8"))
        if str(r.get("srd", "")).lower() == "true" and r.get("srd_section") == "animals"
    }
    assert len(csv_animals) == SRD_ANIMAL_COUNT, len(csv_animals)
    missing = sorted(set(name_by_slug) - set(csv_animals))
    extra = sorted(set(csv_animals) - set(name_by_slug))
    if missing or extra:
        raise SystemExit(f"CSV/MD mismatch missing={missing} extra={extra}")

    # Monsters already seeded — no slug overlap.
    monsters = json.loads((LIVE / "creatures_srd.json").read_text(encoding="utf-8"))
    monster_slugs = {e["slug"] for e in monsters["entries"]}
    overlap = sorted(set(name_by_slug) & monster_slugs)
    if overlap:
        raise SystemExit(f"Slug overlap with C07: {overlap}")

    trait_map: dict[str, str] = {}
    if c07.TRAIT_2014.is_file():
        trait_map = {
            k.lower(): v
            for k, v in json.loads(c07.TRAIT_2014.read_text(encoding="utf-8")).items()
        }
    spell_slugs = c07.load_spell_slugs()
    gear_by_en, _ = c07.load_gear_maps()

    cards: list[dict[str, Any]] = []
    errors: list[str] = []
    for i, (slug, name_en) in enumerate(
        sorted(name_by_slug.items(), key=lambda x: x[1].lower())
    ):
        try:
            card = parse_animal_block(
                c07,
                name_en,
                blocks[name_en],
                csv_animals[slug],
                trait_map,
                spell_slugs,
                gear_by_en,
                sort_order=10 + i * 10,
            )
            cards.append(card)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{slug}: {exc}")
    if errors:
        print("PARSE ERRORS", len(errors))
        for e in errors[:40]:
            print(" ", e)
        raise SystemExit(1)

    assert len(cards) == SRD_ANIMAL_COUNT

    payload = {
        "meta": {
            "pack": "P24-C08",
            "source": "SRD 5.2.1 Animals",
            "count": len(cards),
            "notes": [
                "Только раздел Animals; Monsters A–Z — C07.",
                "Короткие RU-карточки; длинный текст SRD не копируем.",
                "Статы 2014 не подставлялись.",
                "beast_tags: wild_shape_ok / mount / has_fly / has_swim (данные).",
                "gear_refs → C03, spell_refs → C05 где удалось сопоставить.",
            ],
        },
        "entries": cards,
    }
    OUT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    update_gaps()
    update_counts()
    write_layer3(cards)
    by_cr = Counter(c["data"]["cr"] for c in cards)
    by_type = Counter(c["data"]["type"] for c in cards)
    write_changelog(cards, by_type, by_cr)

    pending = sum(1 for c in cards if c["data"].get("name_ru_pending"))
    wild = sum(1 for c in cards if "wild_shape_ok" in (c["data"].get("beast_tags") or []))
    mounts = sum(1 for c in cards if "mount" in (c["data"].get("beast_tags") or []))
    print(
        json.dumps(
            {
                "seeded": len(cards),
                "by_type": dict(by_type),
                "by_cr": dict(by_cr),
                "name_ru_pending": pending,
                "wild_shape_ok": wild,
                "mount": mounts,
                "overlap_with_c07": 0,
                "out": str(OUT_JSON),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
