#!/usr/bin/env python3
"""Inject Tasha optional class features into 2014 feature packs (backend + frontend).

Idempotent: skips ids that already exist. Marks known existing optionals.
Run from repo root: python3 backend/scripts/inject_tcoe_optional_features.py
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend" / "data" / "classes" / "features"
FRONTEND = ROOT / "frontend" / "src" / "shared" / "dnd" / "data"


def feat(
    *,
    id: str,
    level: int,
    name_ru: str,
    name_en: str,
    summary_ru: str,
    kind: str = "passive",
    desk: str | None = None,
    resource: dict[str, Any] | None = None,
    replaces: str | None = None,
    body_ru: str | None = None,
) -> dict[str, Any]:
    row: dict[str, Any] = {
        "id": id,
        "level": level,
        "name_ru": name_ru,
        "name_en": name_en,
        "summary_ru": summary_ru,
        "kind": kind,
        "optional": True,
        "source_book": "tcoe",
    }
    if desk:
        row["desk"] = desk
    if resource:
        row["resource"] = resource
    if replaces:
        row["replaces"] = replaces
    if body_ru:
        row["body_ru"] = body_ru
    return row


# Tasha ch.1 optional class features (additive or PHB-alternative).
OPTIONAL_BY_CLASS: dict[str, list[dict[str, Any]]] = {
    "barbarian": [
        feat(
            id="primal_knowledge",
            level=3,
            name_ru="Изначальные знания",
            name_en="Primal Knowledge",
            summary_ru=(
                "Tasha (optional): на 3 / 10 ур. получи владение ещё одним навыком из списка варвара. "
                "В ярости проверки Жив./Запуг./Вним./Атлетика можно делать Силой."
            ),
        ),
        feat(
            id="instinctive_pounce",
            level=7,
            name_ru="Инстинктивный прыжок",
            name_en="Instinctive Pounce",
            summary_ru=(
                "Tasha (optional): входя в ярость бонусным действием, можешь переместиться "
                "на расстояние до половины скорости."
            ),
            kind="bonus",
            desk="combat",
        ),
    ],
    "bard": [
        feat(
            id="magical_inspiration",
            level=2,
            name_ru="Магическое вдохновение",
            name_en="Magical Inspiration",
            summary_ru=(
                "Tasha (optional): существо с твоей костью BI при заклинании лечения/урона "
                "может добавить бросок кости к лечению или урону по одной цели — затем кость тратится."
            ),
            kind="passive",
        ),
        feat(
            id="bardic_versatility",
            level=4,
            name_ru="Универсальность барда",
            name_en="Bardic Versatility",
            summary_ru=(
                "Tasha (optional): когда берёшь ASI, можешь заменить одну компетентность "
                "или одно известное заклинание барда на другое того же уровня."
            ),
        ),
    ],
    "cleric": [
        feat(
            id="cantrip_versatility_cleric",
            level=4,
            name_ru="Универсальность заговора",
            name_en="Cantrip Versatility",
            summary_ru=(
                "Tasha (optional): когда берёшь ASI, можешь заменить один известный заговор жреца "
                "на другой из списка жреца."
            ),
        ),
        feat(
            id="blessed_strikes",
            level=8,
            name_ru="Благословенные удары",
            name_en="Blessed Strikes",
            summary_ru=(
                "Tasha (optional): альтернатива Divine Strike / Potent Spellcasting домена. "
                "Раз в ход +1к8 урона излучением к атаке оружием или к урону заговора жреца."
            ),
            kind="passive",
            desk="combat",
            replaces="divine_strike_or_potent_spellcasting",
        ),
    ],
    "druid": [
        feat(
            id="cantrip_versatility_druid",
            level=4,
            name_ru="Универсальность заговора",
            name_en="Cantrip Versatility",
            summary_ru=(
                "Tasha (optional): когда берёшь ASI, можешь заменить один известный заговор друида "
                "на другой из списка друида."
            ),
        ),
    ],
    "fighter": [
        feat(
            id="martial_versatility_fighter",
            level=4,
            name_ru="Боевая универсальность",
            name_en="Martial Versatility",
            summary_ru=(
                "Tasha (optional): когда берёшь ASI, можешь заменить один боевой стиль "
                "на другой, доступный воину."
            ),
        ),
    ],
    "monk": [
        feat(
            id="dedicated_weapon",
            level=2,
            name_ru="Выбранное оружие",
            name_en="Dedicated Weapon",
            summary_ru=(
                "Tasha (optional): коротким отдыхом / 1 ч. тренировки сделай простое/воинское оружие "
                "без тяжёлого и особого — оружием монаха (пока владеешь им)."
            ),
            kind="passive",
            desk="combat",
        ),
        feat(
            id="ki_fueled_attack",
            level=3,
            name_ru="Атака на ци",
            name_en="Ki-Fueled Attack",
            summary_ru=(
                "Tasha (optional): если в свой ход потратил ци как действие/бонусное, "
                "бонусным можешь сделать одну безоружную атаку или атаку оружием монаха."
            ),
            kind="bonus",
            desk="combat",
        ),
        feat(
            id="quickened_healing",
            level=4,
            name_ru="Ускоренное исцеление",
            name_en="Quickened Healing",
            summary_ru=(
                "Tasha (optional): действием потрать 2 ци — восстанови хиты = кость БИ + бонус мастерства."
            ),
            kind="action",
            resource={
                "uses": 0,
                "recharge": "short_rest",
                "pool_id": "ki",
                "pool_name_ru": "Ки",
                "track": "spend",
                "spend_cost": 2,
            },
        ),
        feat(
            id="focused_aim",
            level=5,
            name_ru="Сосредоточенный прицел",
            name_en="Focused Aim",
            summary_ru=(
                "Tasha (optional): при промахе атакой потрать 1–3 ци — +2 к броску за каждую "
                "(можно довести до попадания)."
            ),
            kind="passive",
            desk="combat",
            resource={
                "uses": 0,
                "recharge": "short_rest",
                "pool_id": "ki",
                "pool_name_ru": "Ки",
                "track": "spend",
                "spend_cost": 1,
            },
        ),
    ],
    "paladin": [
        feat(
            id="cd_harness_divine_power",
            level=3,
            name_ru="Праведное восстановление",
            name_en="Harness Divine Power",
            summary_ru=(
                "Tasha (optional): бонусным Channel Divinity — восстановить одну потраченную ячейку "
                "(ур. ≤ половины ур. паладина, вверх). Число раз = бонус мастерства / долгий отдых."
            ),
            kind="bonus",
            resource={
                "uses": 1,
                "recharge": "short_rest",
                "pool_id": "channel_divinity",
                "pool_name_ru": "Божественный канал",
                "track": "spend",
            },
        ),
        feat(
            id="martial_versatility_paladin",
            level=4,
            name_ru="Боевая универсальность",
            name_en="Martial Versatility",
            summary_ru=(
                "Tasha (optional): когда берёшь ASI, можешь заменить один боевой стиль "
                "на другой, доступный паладину."
            ),
        ),
    ],
    "ranger": [
        feat(
            id="deft_explorer",
            level=1,
            name_ru="Ловкий исследователь",
            name_en="Deft Explorer",
            summary_ru=(
                "Tasha (optional): альтернатива «Исследователь природы». Canny (компетентность + язык), "
                "Roving (скорость +5 / лазание+плавание на 6), Tireless (вр. хиты PB×, сброс истощения на 10)."
            ),
            replaces="natural_explorer",
        ),
        feat(
            id="favored_foe",
            level=1,
            name_ru="Избранный противник",
            name_en="Favored Foe",
            summary_ru=(
                "Tasha (optional): альтернатива «Избранный враг». Пометь цель при попадании "
                "(конц. без слота, PB раз / долгий) — +1к4 (+1к6 / +1к8) урона раз в ход."
            ),
            kind="passive",
            desk="combat",
            replaces="favored_enemy",
            resource={
                "uses": 0,
                "uses_from": "proficiency_bonus",
                "recharge": "long_rest",
                "pool_id": "favored_foe",
                "pool_name_ru": "Избранный противник",
                "track": "spend",
            },
            body_ru="Урон метки: 1к4 (1), 1к6 (6), 1к8 (14). Концентрация до 1 мин.",
        ),
        feat(
            id="spellcasting_focus_ranger",
            level=2,
            name_ru="Фокус заклинаний",
            name_en="Spellcasting Focus",
            summary_ru=(
                "Tasha (optional): можешь использовать друидический фокус как фокус заклинаний следопыта."
            ),
        ),
        feat(
            id="primal_awareness_tasha",
            level=3,
            name_ru="Первобытная осведомлённость (Tasha)",
            name_en="Primal Awareness",
            summary_ru=(
                "Tasha (optional): альтернатива PHB Primeval Awareness. Получаешь Speaks with Animals "
                "и всегда-готовые ритуалы по таблице (бесплатный каст 1× / долгий на заклинание)."
            ),
            replaces="primeval_awareness",
        ),
        feat(
            id="martial_versatility_ranger",
            level=4,
            name_ru="Боевая универсальность",
            name_en="Martial Versatility",
            summary_ru=(
                "Tasha (optional): когда берёшь ASI, можешь заменить один боевой стиль "
                "на другой, доступный следопыту."
            ),
        ),
        feat(
            id="natures_veil",
            level=10,
            name_ru="Природная завеса",
            name_en="Nature's Veil",
            summary_ru=(
                "Tasha (optional): альтернатива «Скрытность на виду». Бонусным — невидимость "
                "до начала следующего хода. PB раз / долгий отдых."
            ),
            kind="bonus",
            desk="combat",
            replaces="hide_in_plain_sight",
            resource={
                "uses": 0,
                "uses_from": "proficiency_bonus",
                "recharge": "long_rest",
                "pool_id": "natures_veil",
                "pool_name_ru": "Природная завеса",
                "track": "spend",
            },
        ),
    ],
    "rogue": [
        feat(
            id="steady_aim",
            level=3,
            name_ru="Точное прицеливание",
            name_en="Steady Aim",
            summary_ru=(
                "Tasha (optional): бонусным — преимущество на следующую атаку в этот ход, "
                "если ещё не перемещался; после этого скорость 0 до конца хода."
            ),
            kind="bonus",
            desk="combat",
        ),
    ],
    "sorcerer": [
        feat(
            id="sorcerous_versatility",
            level=4,
            name_ru="Чародейская универсальность",
            name_en="Sorcerous Versatility",
            summary_ru=(
                "Tasha (optional): когда берёшь ASI, можешь заменить один заговор чародея "
                "или одну метамагию."
            ),
        ),
        feat(
            id="magical_guidance",
            level=5,
            name_ru="Магическое наставление",
            name_en="Magical Guidance",
            summary_ru=(
                "Tasha (optional): при провале проверки характеристики можешь потратить 1 очко "
                "чародейства и перебросить d20; новый результат обязателен."
            ),
            kind="passive",
            resource={
                "uses": 0,
                "recharge": "long_rest",
                "pool_id": "sorcery_points",
                "pool_name_ru": "Очки чародейства",
                "track": "spend",
                "spend_cost": 1,
            },
        ),
    ],
    "warlock": [
        feat(
            id="eldritch_versatility",
            level=4,
            name_ru="Мистическая универсальность",
            name_en="Eldritch Versatility",
            summary_ru=(
                "Tasha (optional): когда берёшь ASI, можешь заменить один заговор колдуна, "
                "одно воззвание или (если есть) выбор договора Пакт."
            ),
        ),
    ],
    "wizard": [
        feat(
            id="cantrip_formulas",
            level=3,
            name_ru="Формулы заговоров",
            name_en="Cantrip Formulas",
            summary_ru=(
                "Tasha (optional): коротким отдыхом можешь заменить один известный заговор волшебника "
                "на другой из списка волшебника."
            ),
        ),
    ],
}

# Existing rows that are already Tasha optionals — stamp flags only.
STAMP_OPTIONAL: dict[str, list[str]] = {
    "cleric": ["cd_harness_divine_power"],
    "druid": ["wild_companion"],
}


def sort_features(features: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        features,
        key=lambda f: (
            int(f.get("level") or 1),
            0 if not f.get("optional") else 1,
            str(f.get("id") or ""),
        ),
    )


def patch_pack(path: Path, class_slug: str) -> tuple[int, int]:
    data = json.loads(path.read_text(encoding="utf-8"))
    features: list[dict[str, Any]] = list(data.get("features") or [])
    by_id = {str(f.get("id")): f for f in features if isinstance(f, dict)}

    stamped = 0
    for fid in STAMP_OPTIONAL.get(class_slug, []):
        row = by_id.get(fid)
        if not row:
            continue
        changed = False
        if row.get("optional") is not True:
            row["optional"] = True
            changed = True
        if row.get("source_book") != "tcoe":
            row["source_book"] = "tcoe"
            changed = True
        if changed:
            stamped += 1

    added = 0
    for row in OPTIONAL_BY_CLASS.get(class_slug, []):
        fid = row["id"]
        if fid in by_id:
            # Ensure flags even if content already present.
            existing = by_id[fid]
            if existing.get("optional") is not True:
                existing["optional"] = True
                stamped += 1
            if existing.get("source_book") != "tcoe":
                existing["source_book"] = "tcoe"
            continue
        features.append(row)
        by_id[fid] = row
        added += 1

    data["features"] = sort_features(features)
    meta = data.get("meta")
    if isinstance(meta, dict):
        notes = str(meta.get("notes_ru") or "")
        marker = "TCoE optional class features"
        if marker not in notes:
            meta["notes_ru"] = (notes + " · " if notes else "") + marker + "."
        src = str(meta.get("source") or "")
        if "tcoe" not in src.lower():
            meta["source"] = (src + "+tcoe") if src else "tcoe"

    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return added, stamped


def main() -> None:
    total_added = 0
    total_stamped = 0
    for class_slug in sorted(
        set(OPTIONAL_BY_CLASS) | set(STAMP_OPTIONAL),
    ):
        for folder in (BACKEND, FRONTEND):
            path = folder / f"{class_slug}_2014.json"
            if not path.exists():
                raise SystemExit(f"missing pack: {path}")
            added, stamped = patch_pack(path, class_slug)
            total_added += added
            total_stamped += stamped
            print(f"{path.relative_to(ROOT)}: +{added} stamp={stamped}")
    print(f"done: added={total_added} stamped={total_stamped}")


if __name__ == "__main__":
    main()
