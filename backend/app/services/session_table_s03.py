"""S-03: полоска хитов, типизированный урон, G12, «Изучить», вдохновение.

Чистые хелперы без БД — удобно тестировать и стыковать с lobby.py.
"""

from __future__ import annotations

from typing import Any

# Пороги полоски: >50% цел/здоров, ≤50% ранен, ≤1/3 тяжело ранен, 0 без сознания.
HP_WARN_RATIO = 0.5
HP_CRITICAL_RATIO = 1.0 / 3.0

DAMAGE_TYPES = frozenset(
    {
        "acid",
        "cold",
        "fire",
        "force",
        "lightning",
        "necrotic",
        "poison",
        "psychic",
        "radiant",
        "thunder",
        "bludgeoning",
        "piercing",
        "slashing",
    }
)

_DAMAGE_ALIASES: dict[str, str] = {
    "acid": "acid",
    "кислота": "acid",
    "кислотой": "acid",
    "кислотный": "acid",
    "cold": "cold",
    "холод": "cold",
    "холодом": "cold",
    "fire": "fire",
    "огонь": "fire",
    "огнём": "fire",
    "огнем": "fire",
    "огню": "fire",
    "force": "force",
    "силовое": "force",
    "силовое поле": "force",
    "силовым полем": "force",
    "lightning": "lightning",
    "электричество": "lightning",
    "электричеством": "lightning",
    "молния": "lightning",
    "молнией": "lightning",
    "necrotic": "necrotic",
    "некротический": "necrotic",
    "некротическая энергия": "necrotic",
    "некротической энергией": "necrotic",
    "poison": "poison",
    "яд": "poison",
    "ядом": "poison",
    "psychic": "psychic",
    "психическая энергия": "psychic",
    "психической энергией": "psychic",
    "психический": "psychic",
    "radiant": "radiant",
    "излучение": "radiant",
    "излучением": "radiant",
    "thunder": "thunder",
    "звук": "thunder",
    "звуком": "thunder",
    "bludgeoning": "bludgeoning",
    "дробящий": "bludgeoning",
    "дробящим": "bludgeoning",
    "piercing": "piercing",
    "колющий": "piercing",
    "колющим": "piercing",
    "slashing": "slashing",
    "рубящий": "slashing",
    "рубящим": "slashing",
}

DAMAGE_TYPE_LABEL_RU: dict[str, str] = {
    "acid": "кислота",
    "cold": "холод",
    "fire": "огонь",
    "force": "силовое поле",
    "lightning": "электричество",
    "necrotic": "некротическая энергия",
    "poison": "яд",
    "psychic": "психическая энергия",
    "radiant": "излучение",
    "thunder": "звук",
    "bludgeoning": "дробящий",
    "piercing": "колющий",
    "slashing": "рубящий",
}

# Тип существа (RU / EN / slug) → навык «Изучить».
STUDY_SKILL_BY_CREATURE_TYPE: dict[str, dict[str, str]] = {
    "гуманоид": {"skill": "investigation", "skill_ru": "Анализ"},
    "humanoid": {"skill": "investigation", "skill_ru": "Анализ"},
    "великан": {"skill": "investigation", "skill_ru": "Анализ"},
    "giant": {"skill": "investigation", "skill_ru": "Анализ"},
    "зверь": {"skill": "animal_handling", "skill_ru": "Уход за животными"},
    "beast": {"skill": "animal_handling", "skill_ru": "Уход за животными"},
    "растение": {"skill": "nature", "skill_ru": "Природа"},
    "plant": {"skill": "nature", "skill_ru": "Природа"},
    "монстр": {"skill": "nature", "skill_ru": "Природа"},
    "monstrosity": {"skill": "nature", "skill_ru": "Природа"},
    "нежить": {"skill": "religion", "skill_ru": "Религия"},
    "undead": {"skill": "religion", "skill_ru": "Религия"},
    "небожитель": {"skill": "religion", "skill_ru": "Религия"},
    "celestial": {"skill": "religion", "skill_ru": "Религия"},
    "исчадие": {"skill": "religion", "skill_ru": "Религия"},
    "fiend": {"skill": "religion", "skill_ru": "Религия"},
    "аберрация": {"skill": "arcana", "skill_ru": "Магия"},
    "aberration": {"skill": "arcana", "skill_ru": "Магия"},
    "конструкт": {"skill": "arcana", "skill_ru": "Магия"},
    "construct": {"skill": "arcana", "skill_ru": "Магия"},
    "элементаль": {"skill": "arcana", "skill_ru": "Магия"},
    "elemental": {"skill": "arcana", "skill_ru": "Магия"},
    "слизь": {"skill": "nature", "skill_ru": "Природа"},
    "ooze": {"skill": "nature", "skill_ru": "Природа"},
    "дракон": {"skill": "history", "skill_ru": "История"},
    "dragon": {"skill": "history", "skill_ru": "История"},
    "фея": {"skill": "arcana", "skill_ru": "Магия"},
    "fey": {"skill": "arcana", "skill_ru": "Магия"},
}

DEFAULT_STUDY_SKILL = {"skill": "investigation", "skill_ru": "Анализ"}

# Поля статблока, которые G12 не отдаёт игроку до «Показать» / «Изучить».
STATBLOCK_KEYS = (
    "ac",
    "speed",
    "cr",
    "source_book",
    "dex_mod",
    "xp",
    "traits",
    "actions",
    "bonus_actions",
    "reactions",
    "legendary_actions",
    "damage_resistances",
    "damage_immunities",
    "damage_vulnerabilities",
    "condition_immunities",
)


def normalize_damage_type(raw: str | None) -> str | None:
    if not raw:
        return None
    text = raw.strip().lower().replace("ё", "е")
    if not text:
        return None
    if text in DAMAGE_TYPES:
        return text
    return _DAMAGE_ALIASES.get(text)


def _token_matches(entry: str, damage_type: str) -> bool:
    norm = normalize_damage_type(entry)
    if norm == damage_type:
        return True
    low = entry.strip().lower().replace("ё", "е")
    label = DAMAGE_TYPE_LABEL_RU.get(damage_type, "")
    return bool(label) and label in low


def adjust_incoming_damage(
    amount: int,
    damage_type: str | None,
    *,
    resistances: list[str] | None = None,
    immunities: list[str] | None = None,
    vulnerabilities: list[str] | None = None,
) -> tuple[int, str]:
    """Иммунитет → 0; сопротивление → ⌊n/2⌋; уязвимость → ×2. Сопр.+уязв. гасятся."""
    amount = max(0, int(amount))
    if amount == 0 or not damage_type:
        return amount, ""
    dtype = normalize_damage_type(damage_type) or damage_type
    resists = list(resistances or [])
    immunes = list(immunities or [])
    vulns = list(vulnerabilities or [])
    label = DAMAGE_TYPE_LABEL_RU.get(dtype, dtype)
    if any(_token_matches(x, dtype) for x in immunes):
        return 0, f"Иммунитет ({label}): {amount} → 0"
    has_resist = any(_token_matches(x, dtype) for x in resists)
    has_vuln = any(_token_matches(x, dtype) for x in vulns)
    if has_resist and has_vuln:
        return amount, f"Сопротивление и уязвимость ({label}) взаимно гасятся: {amount}"
    if has_resist:
        next_amt = amount // 2
        return next_amt, f"Сопротивление ({label}): {amount} → {next_amt}"
    if has_vuln:
        next_amt = amount * 2
        return next_amt, f"Уязвимость ({label}): {amount} → {next_amt}"
    return amount, ""


def apply_damage_through_temp_hp(
    hp_current: int,
    hp_temp: int,
    damage: int,
    *,
    hp_max: int,
) -> tuple[int, int]:
    """Сначала временные хиты, потом обычные. damage < 0 — лечение (не через temp)."""
    hp_max = max(1, int(hp_max))
    cur = max(0, int(hp_current))
    temp = max(0, int(hp_temp))
    dmg = int(damage)
    if dmg < 0:
        heal = -dmg
        return min(hp_max, cur + heal), temp
    if dmg == 0:
        return cur, temp
    if temp > 0:
        absorbed = min(temp, dmg)
        temp -= absorbed
        dmg -= absorbed
    cur = max(0, cur - dmg)
    return cur, temp


def hp_band(current: int | None, maximum: int | None) -> str:
    """ok | warn | critical | down | unknown"""
    if maximum is None or maximum <= 0 or current is None:
        return "unknown"
    if current <= 0:
        return "down"
    ratio = current / maximum
    if ratio <= HP_CRITICAL_RATIO:
        return "critical"
    if ratio <= HP_WARN_RATIO:
        return "warn"
    return "ok"


def hp_label_hero(band: str) -> str:
    if band == "ok":
        return "Здоров"
    if band == "warn":
        return "Ранен"
    if band == "critical":
        return "Тяжело ранен"
    if band == "down":
        return "Без сознания"
    return "—"


def hp_label_enemy(band: str) -> str:
    if band == "ok":
        return "Цел"
    if band == "warn":
        return "Ранен"
    if band == "critical":
        return "Тяжело ранен"
    if band == "down":
        return "Без сознания"
    return "—"


def study_skill_for_creature_type(type_ru: str | None) -> dict[str, str]:
    if not type_ru:
        return dict(DEFAULT_STUDY_SKILL)
    key = type_ru.strip().lower().replace("ё", "е")
    # «Великан (туманный)» → великан
    head = key.split("(")[0].strip().split(",")[0].strip()
    for candidate in (key, head):
        found = STUDY_SKILL_BY_CREATURE_TYPE.get(candidate)
        if found:
            return dict(found)
    return dict(DEFAULT_STUDY_SKILL)


def default_study_dc(cr: str | None, override: int | None = None) -> int:
    if override is not None:
        return max(1, min(40, int(override)))
    if cr is None or str(cr).strip() == "":
        return 10
    text = str(cr).strip().replace(",", ".")
    try:
        if "/" in text:
            a, b = text.split("/", 1)
            value = float(a) / float(b)
        else:
            value = float(text)
    except ValueError:
        return 10
    return max(1, min(40, 10 + int(value)))


def viewer_sees_statblock(
    row: dict[str, Any],
    *,
    see_hidden: bool,
    user_id: str | None,
) -> bool:
    if see_hidden:
        return True
    if bool(row.get("statblock_revealed")):
        return True
    if not user_id:
        return False
    studied = row.get("studied_by") or []
    return str(user_id) in {str(x) for x in studied}


def parse_inspiration_after_roll(
    visibility_profile: object = None,
    *,
    campaign_rules: object = None,
) -> bool:
    """S-03 / L-08: вдохновение после броска. Источник правды — campaign_rules, иначе visibility."""
    from app.services.campaign_rules import parse_inspiration_after_roll as _parse

    return _parse(campaign_rules=campaign_rules, visibility_profile=visibility_profile)


def set_inspiration_after_roll(visibility_profile: dict, value: bool) -> dict:
    next_profile = dict(visibility_profile or {})
    next_profile["inspiration_after_roll"] = bool(value)
    return next_profile


def defenses_from_sheet_combat(combat: dict | None) -> dict[str, list[str]]:
    combat = combat if isinstance(combat, dict) else {}
    out: dict[str, list[str]] = {
        "damage_resistances": [],
        "damage_immunities": [],
        "damage_vulnerabilities": [],
    }
    for key in out:
        raw = combat.get(key) or combat.get(key.replace("damage_", ""))
        if isinstance(raw, list):
            for item in raw:
                if isinstance(item, str) and item.strip():
                    out[key].append(item.strip())
                elif isinstance(item, dict):
                    t = item.get("damage_type") or item.get("type") or item.get("name")
                    if isinstance(t, str) and t.strip():
                        out[key].append(t.strip())
    return out


def tick_effects_rounds(effects: list[dict], *, rounds_passed: int = 1) -> list[dict]:
    """Снимает эффекты с remaining_rounds после N раундов очереди."""
    if rounds_passed <= 0 or not effects:
        return list(effects or [])
    kept: list[dict] = []
    for effect in effects:
        if not isinstance(effect, dict):
            continue
        duration = effect.get("duration")
        if not isinstance(duration, dict):
            kept.append(effect)
            continue
        unit = str(duration.get("unit") or "").lower()
        if unit not in ("round", "rounds", "раунд", "раунды"):
            kept.append(effect)
            continue
        remaining = duration.get("remaining_rounds")
        if remaining is None:
            remaining = duration.get("value")
        try:
            left = int(remaining)
        except (TypeError, ValueError):
            kept.append(effect)
            continue
        left -= rounds_passed
        if left <= 0:
            continue
        next_effect = dict(effect)
        next_duration = dict(duration)
        next_duration["remaining_rounds"] = left
        next_effect["duration"] = next_duration
        kept.append(next_effect)
    return kept


def condition_reminders_for_master(
    combatants: list[dict],
    *,
    current_round: int,
) -> list[dict]:
    """Напоминания о длительности состояний (не авто-снятие)."""
    reminders: list[dict] = []
    for row in combatants:
        name = str(row.get("name") or "Враг")
        for cond in row.get("conditions") or []:
            if not isinstance(cond, dict):
                continue
            rounds = cond.get("duration_rounds")
            if rounds is None:
                continue
            try:
                left = int(rounds)
            except (TypeError, ValueError):
                continue
            started = cond.get("started_round")
            try:
                started_i = int(started) if started is not None else None
            except (TypeError, ValueError):
                started_i = None
            due = False
            if started_i is not None:
                due = current_round >= started_i + left
            reminders.append(
                {
                    "combatant_id": str(row.get("id") or ""),
                    "name": name,
                    "condition": str(cond.get("name") or cond.get("slug") or ""),
                    "duration_rounds": left,
                    "due": due,
                    "note": str(cond.get("duration_note") or "").strip() or None,
                }
            )
    return reminders


def redact_combatant_row(
    row: dict[str, Any],
    *,
    see_hidden: bool,
    user_id: str | None,
) -> dict[str, Any]:
    """G12: копия боеца для зрителя. Числа HP до открытия — тоже скрыты."""
    visible = viewer_sees_statblock(row, see_hidden=see_hidden, user_id=user_id)
    out = dict(row)
    cur = int(row.get("hp_current") or 0)
    mx = max(1, int(row.get("hp_max") or 1))
    band = hp_band(cur, mx)
    out["hp_band"] = band
    out["hp_label"] = hp_label_enemy(band)
    out["hp_ratio"] = max(0.0, min(1.0, cur / mx))
    out["statblock_visible"] = visible
    out["statblock_revealed"] = bool(row.get("statblock_revealed"))

    studied_by = [str(x) for x in (row.get("studied_by") or [])]
    out["studied_by_me"] = bool(user_id and str(user_id) in studied_by)

    snapshots = row.get("study_snapshots") if isinstance(row.get("study_snapshots"), dict) else {}
    snap = snapshots.get(str(user_id)) if user_id else None
    if isinstance(snap, dict):
        out["study_snapshot"] = {
            "hp_current": int(snap.get("hp_current") or 0),
            "hp_max": int(snap.get("hp_max") or 1),
            "at": snap.get("at"),
        }
    else:
        out["study_snapshot"] = None

    pending = row.get("pending_study") if isinstance(row.get("pending_study"), dict) else None
    if pending and (see_hidden or (user_id and str(pending.get("user_id")) == str(user_id))):
        out["pending_study"] = dict(pending)
    else:
        out["pending_study"] = None

    if visible:
        return out

    # Скрыть статблок и точные хиты (G12 поверх профиля видимости).
    for key in STATBLOCK_KEYS:
        if key in ("damage_resistances", "damage_immunities", "damage_vulnerabilities", "condition_immunities"):
            out[key] = []
        elif key in (
            "traits",
            "actions",
            "bonus_actions",
            "reactions",
            "legendary_actions",
        ):
            out[key] = []
        else:
            out[key] = None
    out["xp"] = None
    out["xp_claimed_count"] = 0
    # Полоска без чисел: отдаём band через hp, но обнуляем точные значения в API.
    out["hp_current"] = 0
    out["hp_max"] = max(1, int(row.get("hp_max") or 1))
    out["_hp_numbers_hidden"] = True
    members = []
    for m in row.get("members") or []:
        if not isinstance(m, dict):
            continue
        mb = hp_band(int(m.get("hp_current") or 0), int(m.get("hp_max") or 1))
        members.append(
            {
                "id": m.get("id"),
                "name": m.get("name"),
                "hp_current": 0,
                "hp_max": max(1, int(m.get("hp_max") or 1)),
                "hp_band": mb,
                "hp_label": hp_label_enemy(mb),
                "hp_numbers_hidden": True,
            }
        )
    out["members"] = members
    return out
