"""B8: извлечение агрегатов пати из Character.sheet (+ поля модели).

Прокси для пробелов листа — см. docs/B8_ENCOUNTER_GENERATOR.md §A.
Не тянет SQLAlchemy: вход — снимки, удобно для тестов и будущего API.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Iterable

from app.dnd.party_power import PartyPowerSignals, compute_party_power

# Грубая «норма» для сравнения (не таблица класса — калибровочный якорь).
_EXPECTED_HP = {lvl: 5 + lvl * 6 for lvl in range(1, 21)}
_EXPECTED_AC = {
    lvl: 13
    + (0 if lvl < 4 else 1 if lvl < 8 else 2 if lvl < 12 else 3 if lvl < 16 else 4)
    for lvl in range(1, 21)
}

_CONSUMABLE_RE = re.compile(
    r"зелье|potion|свиток|scroll|эликсир|elixir|осколок|пыль|oil|масло",
    re.I,
)
_RANGED_WEAPON_RE = re.compile(
    r"лук|арбалет|пращ|дротик|javelin|bow|crossbow|sling|dart|пистолет|ружьё|ружье|gun",
    re.I,
)
_FLY_SPELL_RE = re.compile(r"пол[её]т|fly|левитац", re.I)
_RANGE_FT_RE = re.compile(r"(\d+)\s*(?:фт|ft)", re.I)
_RESIST_SPELL_RE = re.compile(
    r"поглощени[ея]\s+стихий|absorb\s+elements|защита\s+от\s+энергии|"
    r"protection\s+from\s+energy|огненный\s+щит|fire\s+shield|"
    r"каменная\s+кожа|stoneskin|неуязвимость|invulnerability",
    re.I,
)
_RESIST_RACE_RE = re.compile(
    r"тифлинг|tiefling|драконорожд|dragonborn|ааркокра|генasi|дженази|"
    r"огненн|ледян|каменн|воздушн",
    re.I,
)


@dataclass(frozen=True, slots=True)
class PartyMemberSnapshot:
    level: int
    hp_max: int | None
    sheet: dict[str, Any]
    # активные бафы с сессии (если уже на seat)
    seat_effects: tuple[str, ...] = ()
    race_name: str | None = None
    class_name: str | None = None


@dataclass(frozen=True, slots=True)
class PartyAnalysis:
    signals: PartyPowerSignals
    party_power: float
    levels: tuple[int, ...]
    anti_air_ok: bool
    notes: tuple[str, ...]


def analyze_party(members: Iterable[PartyMemberSnapshot]) -> PartyAnalysis:
    rows = list(members)
    if not rows:
        signals = PartyPowerSignals()
        return PartyAnalysis(
            signals=signals,
            party_power=compute_party_power(signals),
            levels=(),
            anti_air_ok=False,
            notes=("empty_party",),
        )

    levels = tuple(max(1, min(20, int(m.level))) for m in rows)
    hp_actual = 0
    hp_expected = 0
    ac_deltas: list[float] = []
    slot_scores: list[float] = []
    resource_scores: list[float] = []
    attune_counts: list[float] = []
    consumable_scores: list[float] = []
    companions = 0
    has_buff = False
    dpr_scores: list[float] = []
    resist_scores: list[float] = []
    anti_air = False
    notes: list[str] = []

    for m in rows:
        lvl = max(1, min(20, int(m.level)))
        sheet = m.sheet if isinstance(m.sheet, dict) else {}
        combat = _as_dict(sheet.get("combat"))

        hp = m.hp_max if isinstance(m.hp_max, int) else _as_int(combat.get("hp_max"))
        if hp is None:
            hp = _EXPECTED_HP[lvl]
            notes.append("hp_fallback")
        hp_actual += max(1, hp)
        hp_expected += _EXPECTED_HP[lvl]

        ac = _as_int(combat.get("ac"))
        if ac is not None:
            ac_deltas.append(float(ac - _EXPECTED_AC[lvl]))

        slot_scores.append(_slot_richness(sheet))
        resource_scores.append(_resource_ready(sheet))
        attune_counts.append(_attunement_count(sheet))
        consumable_scores.append(_consumable_ready(sheet))
        companions += _companion_count(sheet)
        if _has_concentration_buff(sheet, m.seat_effects):
            has_buff = True
        dpr_scores.append(_dpr_proxy(sheet))
        resist_scores.append(
            _resistance_proxy(sheet, race_name=m.race_name, class_name=m.class_name)
        )
        if _member_anti_air_ok(sheet):
            anti_air = True

    n = len(rows)
    signals = PartyPowerSignals(
        hp_ratio=(hp_actual / hp_expected) if hp_expected else 1.0,
        ac_delta=(sum(ac_deltas) / len(ac_deltas)) if ac_deltas else 0.0,
        slot_richness=sum(slot_scores) / n,
        resource_ready=sum(resource_scores) / n,
        attunement_avg=sum(attune_counts) / n,
        consumable_ready=sum(consumable_scores) / n,
        companion_count=companions,
        has_concentration_buff=has_buff,
        dpr_quantile=_quantile01(dpr_scores),
        resistance_proxy=_quantile01(resist_scores),
    )
    if not anti_air:
        notes.append("anti_air_weak")

    return PartyAnalysis(
        signals=signals,
        party_power=compute_party_power(signals),
        levels=levels,
        anti_air_ok=anti_air,
        notes=tuple(notes),
    )


def _as_dict(raw: object) -> dict[str, Any]:
    return raw if isinstance(raw, dict) else {}


def _as_int(raw: object) -> int | None:
    if isinstance(raw, bool):
        return None
    if isinstance(raw, int):
        return raw
    if isinstance(raw, float) and raw.is_integer():
        return int(raw)
    return None


def _slot_richness(sheet: dict[str, Any]) -> float:
    """0..1: сумма max слотов / грубый потолок кастера того же уровня."""
    spells = _as_dict(sheet.get("spells"))
    slots = _as_dict(spells.get("slots"))
    total = 0
    for lvl in range(1, 10):
        row = _as_dict(slots.get(str(lvl)))
        total += max(0, _as_int(row.get("max")) or 0)
    pact = _as_dict(spells.get("pact_slots"))
    total += max(0, _as_int(pact.get("max")) or 0)
    # потолок «полный кастер ~15 слотов к mid/high» — мягкая нормализация
    return max(0.0, min(1.0, total / 15.0))


def _resource_ready(sheet: dict[str, Any]) -> float:
    raw = sheet.get("resources")
    items: list[dict[str, Any]] = []
    if isinstance(raw, list):
        items = [x for x in raw if isinstance(x, dict)]
    elif isinstance(raw, dict):
        items = [v for v in raw.values() if isinstance(v, dict)]
    if not items:
        return 0.0
    ratios: list[float] = []
    for row in items:
        mx = max(1, _as_int(row.get("max")) or 1)
        used = max(0, _as_int(row.get("used")) or 0)
        ratios.append(max(0.0, min(1.0, (mx - used) / mx)))
    return sum(ratios) / len(ratios)


def _attunement_count(sheet: dict[str, Any]) -> float:
    raw = sheet.get("attunements")
    if not isinstance(raw, list):
        return 0.0
    filled = 0
    for row in raw:
        if not isinstance(row, dict):
            continue
        name = str(row.get("name") or "").strip()
        item_id = str(row.get("item_id") or "").strip()
        if name or item_id:
            filled += 1
    return float(min(3, filled))


def _consumable_ready(sheet: dict[str, Any]) -> float:
    inv = _as_dict(sheet.get("inventory"))
    items = inv.get("items")
    if not isinstance(items, list):
        return 0.0
    score = 0.0
    for row in items:
        if not isinstance(row, dict):
            continue
        kind = str(row.get("item_kind") or "").strip().lower()
        name = str(row.get("name") or "")
        notes = str(row.get("notes") or "")
        is_consumable = kind == "consumable" or (
            not kind and (_CONSUMABLE_RE.search(name) or _CONSUMABLE_RE.search(notes))
        )
        if not is_consumable:
            continue
        qty = max(0, _as_int(row.get("qty")) or 0)
        score += min(1.0, qty / 3.0) * 0.34
    return max(0.0, min(1.0, score))


def _resistance_proxy(
    sheet: dict[str, Any],
    *,
    race_name: str | None = None,
    class_name: str | None = None,
) -> float:
    """0..1: раса/спеллы/аттюн намекают на сопротивления (нет поля на листе)."""
    score = 0.0
    identity = _as_dict(sheet.get("identity"))
    race_blob = " ".join(
        str(x)
        for x in (
            race_name,
            class_name,
            identity.get("race_name"),
            identity.get("race"),
            sheet.get("race_name"),
        )
        if x
    )
    # classes may carry race via character model — also scan traits text blocks
    if _RESIST_RACE_RE.search(race_blob):
        score += 0.35
    spells = _as_dict(sheet.get("spells"))
    known = spells.get("known")
    if isinstance(known, list):
        for row in known:
            if not isinstance(row, dict) or row.get("prepared") is False:
                continue
            name = str(row.get("name") or "")
            if _RESIST_SPELL_RE.search(name):
                score += 0.25
                break
    attune = sheet.get("attunements")
    if isinstance(attune, list):
        for row in attune:
            if not isinstance(row, dict):
                continue
            blob = f"{row.get('name') or ''} {row.get('notes') or ''}"
            if re.search(r"сопрот|resist|иммун|immune|защита от", blob, re.I):
                score += 0.2
                break
    combat = _as_dict(sheet.get("combat"))
    raw_res = combat.get("damage_resistances") or combat.get("resistances")
    if isinstance(raw_res, list) and raw_res:
        score += min(0.4, 0.15 * len(raw_res))
    elif isinstance(raw_res, str) and raw_res.strip():
        score += 0.25
    return max(0.0, min(1.0, score))


def _companion_count(sheet: dict[str, Any]) -> int:
    raw = sheet.get("companions")
    if not isinstance(raw, list):
        return 0
    n = 0
    for row in raw:
        if not isinstance(row, dict):
            continue
        name = str(row.get("name") or "").strip()
        if name:
            n += 1
    return n


def _has_concentration_buff(sheet: dict[str, Any], seat_effects: tuple[str, ...]) -> bool:
    combat = _as_dict(sheet.get("combat"))
    if combat.get("concentration"):
        return True
    effects = combat.get("effects")
    if isinstance(effects, list) and any(
        isinstance(e, dict) and str(e.get("name") or "").strip() for e in effects
    ):
        return True
    return any(bool(x.strip()) for x in seat_effects)


def _parse_damage_avg(expr: str) -> float:
    """Грубая средняя: '2d6+3' → 10; пусто → 0."""
    text = (expr or "").lower().replace(" ", "")
    if not text:
        return 0.0
    total = 0.0
    for dice in re.finditer(r"(\d*)d(\d+)", text):
        n = int(dice.group(1) or "1")
        sides = int(dice.group(2))
        total += n * (sides + 1) / 2.0
    for bonus in re.finditer(r"([+-]\d+)(?!d)", text):
        total += int(bonus.group(1))
    if total == 0.0:
        m = re.search(r"(\d+)", text)
        if m:
            total = float(m.group(1))
    return max(0.0, total)


def _dpr_proxy(sheet: dict[str, Any]) -> float:
    """Сумма средних уронов атак + подготовленных спеллов с damage (не DPR/раунд)."""
    total = 0.0
    weapons = sheet.get("weapons")
    if isinstance(weapons, list):
        for row in weapons:
            if isinstance(row, dict):
                total += _parse_damage_avg(str(row.get("damage") or ""))
    spells = _as_dict(sheet.get("spells"))
    known = spells.get("known")
    if isinstance(known, list):
        for row in known:
            if not isinstance(row, dict):
                continue
            if row.get("prepared") is False:
                continue
            total += _parse_damage_avg(str(row.get("damage") or ""))
    # нормализация «сильный лист ~40+»
    return max(0.0, min(1.0, total / 40.0))


def _member_anti_air_ok(sheet: dict[str, Any]) -> bool:
    """Есть ranged / fly — range_kind на атаке или эвристика имени/спеллов."""
    weapons = sheet.get("weapons")
    if isinstance(weapons, list):
        for row in weapons:
            if not isinstance(row, dict):
                continue
            kind = str(row.get("range_kind") or "").strip().lower()
            if kind in {"ranged", "thrown"}:
                return True
            name = str(row.get("name") or "")
            if _RANGED_WEAPON_RE.search(name):
                return True
    spells = _as_dict(sheet.get("spells"))
    known = spells.get("known")
    if isinstance(known, list):
        for row in known:
            if not isinstance(row, dict):
                continue
            if row.get("prepared") is False:
                continue
            name = str(row.get("name") or "")
            rng = str(row.get("range") or "")
            if _FLY_SPELL_RE.search(name):
                return True
            m = _RANGE_FT_RE.search(rng)
            if m and int(m.group(1)) >= 30 and str(row.get("damage") or "").strip():
                return True
    return False


def _quantile01(values: list[float]) -> float:
    if not values:
        return 0.0
    return max(0.0, min(1.0, sum(values) / len(values)))
