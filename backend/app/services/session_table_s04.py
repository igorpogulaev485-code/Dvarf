"""S-04: атаки врагов, лента боя, кубики на столе, цели, флаги campaign_rules."""

from __future__ import annotations

import re
from typing import Any, Literal
from uuid import UUID

from app.services import session_combat as scmb
from app.services import session_sides as sides
from app.services.campaign_rules import homebrew_enabled
from app.services.session_table_s03 import normalize_damage_type

# Последствия fumble_on_1 (каталог L-08) — мастер выбирает одно.
FUMBLE_CONSEQUENCES: tuple[dict[str, str], ...] = (
    {
        "id": "drop_weapon",
        "label": "Уронил оружие",
    },
    {
        "id": "hit_ally",
        "label": "Задел ближайшего союзника",
    },
    {
        "id": "lose_reaction",
        "label": "Потерял реакцию до следующего хода",
    },
)

_DAMAGE_TYPE_RU: dict[str, str] = {
    "bludgeoning": "дробящего",
    "piercing": "колющего",
    "slashing": "рубящего",
    "fire": "огня",
    "cold": "холода",
    "lightning": "электричества",
    "thunder": "звука",
    "acid": "кислоты",
    "poison": "яда",
    "psychic": "психического",
    "necrotic": "некротического",
    "radiant": "лучистого",
    "force": "силового",
}

_DAMAGE_WORD_TO_TYPE: dict[str, str] = {
    "дробящего": "bludgeoning",
    "дробящий": "bludgeoning",
    "колющего": "piercing",
    "колющий": "piercing",
    "рубящего": "slashing",
    "рубящий": "slashing",
    "огня": "fire",
    "огнём": "fire",
    "огнем": "fire",
    "холода": "cold",
    "электричества": "lightning",
    "звука": "thunder",
    "кислоты": "acid",
    "яда": "poison",
    "психического": "psychic",
    "некротического": "necrotic",
    "лучистого": "radiant",
    "силового": "force",
}

_ATTACK_BONUS_RE = re.compile(
    r"([+\u2212\-−]?\s*\d+)\s*к\s*попаданию",
    re.IGNORECASE,
)
_DAMAGE_HIT_RE = re.compile(
    r"Попадание:\s*(?:(\d+)\s*\()?\s*(\d+)\s*[кdD](\d+)(?:\s*\+\s*(\d+))?\s*\)?"
    r"\s*([а-яёa-z]+)?",
    re.IGNORECASE,
)
_DAMAGE_SIMPLE_RE = re.compile(
    r"(\d+)\s*[кdD](\d+)(?:\s*\+\s*(\d+))?\s+([а-яё]+)",
    re.IGNORECASE,
)
_SAVE_DC_RE = re.compile(
    r"спасброск[аеиу]\s+([А-Яа-яA-Za-z]+)\s+со\s+Сл\s+(\d+)",
    re.IGNORECASE,
)
_SAVE_DC_ALT_RE = re.compile(
    r"Сл\s+(\d+).*?спасброск",
    re.IGNORECASE,
)

ABILITY_RU: dict[str, str] = {
    "силы": "str",
    "сила": "str",
    "ловкости": "dex",
    "ловкость": "dex",
    "телосложения": "con",
    "телосложение": "con",
    "интеллекта": "int",
    "интеллект": "int",
    "мудрости": "wis",
    "мудрость": "wis",
    "харизмы": "cha",
    "харизма": "cha",
    "strength": "str",
    "dexterity": "dex",
    "constitution": "con",
    "intelligence": "int",
    "wisdom": "wis",
    "charisma": "cha",
}


def homebrew_flag(campaign_rules: object | None, key: str, default: bool = False) -> bool:
    """Обёртка над L-08 homebrew_enabled с явным default, если ключа нет в каталоге."""
    if key not in (
        "potion_bonus_self",
        "inspiration_stack",
        "flanking_advantage",
        "gunpowder_exploding",
        "hidden_death_saves",
        "fumble_on_1",
        "group_initiative",
        "reroll_initiative_each_round",
        "gritty_rest",
        "feat_at_level_1",
        "encumbrance",
    ):
        return default
    return bool(homebrew_enabled(campaign_rules, key))


def parse_action_stats(action: dict | None) -> dict[str, Any]:
    """Структурированные поля действия + разбор text_ru бестиария."""
    action = action if isinstance(action, dict) else {}
    name = str(action.get("name_ru") or action.get("name") or "").strip()
    text = str(action.get("text_ru") or action.get("text") or "").strip()

    attack_bonus = _as_optional_int(action.get("attack_bonus"))
    damage_dice = _clean_str(action.get("damage_dice") or action.get("damage_formula"))
    raw_dtype = action.get("damage_type")
    damage_type = normalize_damage_type(raw_dtype if isinstance(raw_dtype, str) else None)
    if damage_type is None and isinstance(raw_dtype, str):
        damage_type = _DAMAGE_WORD_TO_TYPE.get(raw_dtype.strip().lower())
    save_dc = _as_optional_int(action.get("save_dc"))
    save_ability = _normalize_ability(action.get("save_ability"))

    if attack_bonus is None and text:
        m = _ATTACK_BONUS_RE.search(text)
        if m:
            raw_bonus = (
                m.group(1)
                .replace(" ", "")
                .replace("\u2212", "-")
                .replace("−", "-")
            )
            try:
                attack_bonus = int(raw_bonus)
            except ValueError:
                attack_bonus = None

    if (not damage_dice or not damage_type) and text:
        m = _DAMAGE_HIT_RE.search(text)
        if not m:
            m = _DAMAGE_SIMPLE_RE.search(text)
            if m:
                n, sides, bonus, word = m.group(1), m.group(2), m.group(3), m.group(4)
                if not damage_dice:
                    damage_dice = f"{n}к{sides}" + (f"+{bonus}" if bonus else "")
                if not damage_type and word:
                    damage_type = _DAMAGE_WORD_TO_TYPE.get(word.lower())
        else:
            n, sides = m.group(2), m.group(3)
            bonus = m.group(4)
            word = (m.group(5) or "").lower()
            if not damage_dice:
                damage_dice = f"{n}к{sides}" + (f"+{bonus}" if bonus else "")
            if not damage_type and word:
                # «дробящего» / «урона» — следующее слово может быть типом
                damage_type = _DAMAGE_WORD_TO_TYPE.get(word)
                if damage_type is None and word in {"урона", "урон"}:
                    # ищем тип дальше в строке
                    for ru, key in _DAMAGE_WORD_TO_TYPE.items():
                        if ru in text.lower():
                            damage_type = key
                            break

    if save_dc is None and text:
        m = _SAVE_DC_RE.search(text)
        if m:
            save_ability = save_ability or _normalize_ability(m.group(1))
            save_dc = int(m.group(2))
        else:
            m2 = _SAVE_DC_ALT_RE.search(text)
            if m2:
                save_dc = int(m2.group(1))

    kind = "attack" if attack_bonus is not None else ("save" if save_dc is not None else "other")
    return {
        "name_ru": name,
        "text_ru": text,
        "attack_bonus": attack_bonus,
        "damage_dice": damage_dice,
        "damage_type": damage_type,
        "save_dc": save_dc,
        "save_ability": save_ability,
        "kind": kind,
    }


def enrich_action_block(item: dict) -> dict:
    """Сохранить структурированные поля в JSON действия combatant."""
    stats = parse_action_stats(item)
    out = {
        "name_ru": stats["name_ru"],
        "text_ru": stats["text_ru"],
        "name_en": (
            str(item["name_en"]).strip()
            if isinstance(item, dict) and item.get("name_en")
            else None
        ),
    }
    if stats["attack_bonus"] is not None:
        out["attack_bonus"] = stats["attack_bonus"]
    if stats["damage_dice"]:
        out["damage_dice"] = stats["damage_dice"]
    if stats["damage_type"]:
        out["damage_type"] = stats["damage_type"]
    if stats["save_dc"] is not None:
        out["save_dc"] = stats["save_dc"]
    if stats["save_ability"]:
        out["save_ability"] = stats["save_ability"]
    return out


def roll_damage_dice(expr: str | None, *, rng=None) -> tuple[int, str]:
    """Простой разбор NdM+K / NкM+K. Возвращает (total, breakdown)."""
    if not expr:
        return 0, ""
    cleaned = (
        str(expr)
        .strip()
        .lower()
        .replace("d", "к")
        .replace(" ", "")
        .replace("−", "-")
        .replace("—", "-")
    )
    m = re.fullmatch(r"(\d+)к(\d+)([+-]\d+)?", cleaned)
    if not m:
        # чистое число
        try:
            n = int(cleaned)
            return n, str(n)
        except ValueError:
            return 0, ""
    count, sides, bonus_s = int(m.group(1)), int(m.group(2)), m.group(3)
    count = max(1, min(40, count))
    sides = max(2, min(100, sides))
    parts: list[int] = []
    for _ in range(count):
        if rng is not None:
            parts.append(1 + int(rng() * sides) % sides)  # pragma: no cover - injected
        else:
            parts.append(_roll_die(sides))
    bonus = int(bonus_s) if bonus_s else 0
    total = sum(parts) + bonus
    breakdown = "+".join(str(p) for p in parts) + (f"{bonus_s}" if bonus_s else "")
    return total, breakdown


def _roll_die(sides: int) -> int:
    # reuse combat d20 entropy via random in session_combat
    import random

    return random.randint(1, max(2, sides))


def resolve_attack_roll(
    *,
    attack_bonus: int,
    mode: str,
    attack_total: int | None = None,
    attack_natural: int | None = None,
    advantage: bool = False,
    disadvantage: bool = False,
) -> dict[str, Any]:
    """Цифровой бросок или ручной ввод. table_* обрабатываются снаружи."""
    if mode == "manual":
        total = int(attack_total if attack_total is not None else 0)
        natural = attack_natural if attack_natural is not None else None
        return {
            "natural": natural,
            "total": total,
            "bonus": attack_bonus,
            "advantage": advantage,
            "disadvantage": disadvantage,
            "physical": True,
        }

    natural, breakdown = scmb.roll_d20(advantage=advantage, disadvantage=disadvantage)
    total = natural + int(attack_bonus)
    return {
        "natural": natural,
        "total": total,
        "bonus": attack_bonus,
        "breakdown": breakdown,
        "advantage": advantage,
        "disadvantage": disadvantage,
        "physical": False,
    }


def format_feed_line(
    *,
    actor: str,
    target: str | None,
    action_name: str,
    outcome: str | None = None,
    damage: int | None = None,
    damage_type: str | None = None,
    physical: bool = False,
    hide_enemy_ac: bool = False,
    enemy_ac: int | None = None,
    show_ac_to_master: bool = False,
) -> str:
    """Одна строка журнала: «Огр → Торин: Дубина, попал 🎲, 13 дробящего»."""
    dice_mark = " 🎲" if physical else ""
    left = f"{actor} → {target}" if target else actor
    bits = [action_name]
    if outcome:
        bits.append(f"{outcome}{dice_mark}")
    elif physical:
        bits[-1] = f"{bits[-1]}{dice_mark}"
    if damage is not None and damage >= 0:
        type_ru = _DAMAGE_TYPE_RU.get(damage_type or "", "") if damage_type else ""
        if not type_ru and damage_type:
            type_ru = str(damage_type)
        bits.append(f"{damage} {type_ru}".strip() if type_ru else str(damage))
    if show_ac_to_master and enemy_ac is not None and not hide_enemy_ac:
        bits.append(f"КД {enemy_ac}")
    return f"{left}: {', '.join(bits)}"


def event_category(event_type: str, payload: dict | None = None) -> Literal["combat", "roll", "other"]:
    payload = payload or {}
    if event_type == "roll":
        if payload.get("combat_journal") or payload.get("category") == "combat":
            return "combat"
        return "roll"
    if event_type in {"combat", "combat_journal", "reaction"}:
        return "combat"
    if payload.get("category") == "combat":
        return "combat"
    return "other"


def filter_events_by_feed(
    events: list[Any],
    *,
    feed_filter: str,
) -> list[Any]:
    """feed_filter: all | combat | rolls."""
    if feed_filter in ("", "all", None):
        return list(events)
    out = []
    for ev in events:
        et = getattr(ev, "event_type", None) or (ev.get("event_type") if isinstance(ev, dict) else "")
        payload = getattr(ev, "payload", None) or (ev.get("payload") if isinstance(ev, dict) else {}) or {}
        cat = event_category(str(et), payload if isinstance(payload, dict) else {})
        if feed_filter == "combat" and cat == "combat":
            out.append(ev)
        elif feed_filter == "rolls" and cat in {"roll", "combat"} and (
            str(et) == "roll" or payload.get("is_roll")
        ):
            out.append(ev)
        elif feed_filter == "rolls" and str(et) == "roll":
            out.append(ev)
    return out


def build_combat_targets(
    *,
    seats: list[dict],
    combatants: list[dict],
    combat_state: dict,
    see_hidden: bool,
    viewer_user_id: UUID | None = None,
) -> list[dict]:
    """
    Контракт для T-01/T-02 и атаки врага.
    side / is_ally — S-05: сторона из очереди; is_ally относительно зрителя.
    """
    filtered_state, visible_combatants = scmb.filter_combat_for_viewer(
        combat_state, combatants, see_hidden=see_hidden
    )
    # Сторона актёра: ПК зрителя (истинная для механики; видимая — для чужих масок).
    viewer_side = sides.SIDE_PARTY
    viewer_uid = str(viewer_user_id) if viewer_user_id else None
    for seat in seats:
        if viewer_uid and str(seat.get("user_id") or "") == viewer_uid:
            pc_entry = sides.find_entry_for_ref(
                combat_state,
                kind="pc",
                ref_id=str(seat.get("character_id") or seat.get("id") or ""),
            )
            viewer_side = sides.true_side(pc_entry, kind_fallback="pc")
            break
    else:
        # мастер / без места: «свои» = Партия (атака врага целится в !is_ally)
        viewer_side = sides.SIDE_PARTY

    targets: list[dict] = []

    def _row_side_and_ally(kind: str, ref_id: str, companion_id: str | None = None) -> tuple[str, bool]:
        entry = sides.find_entry_for_ref(
            combat_state, kind=kind, ref_id=ref_id, companion_id=companion_id
        )
        # Видимая сторона для UI; is_ally по истине для мастера/сервера,
        # для игрока скрытый предатель остаётся «своим» в списке до раскрытия.
        vis = sides.visible_side(entry, see_hidden=see_hidden, kind_fallback=kind)
        if see_hidden:
            ally = sides.is_ally_of(
                viewer_side, entry, use_true=True, kind_fallback=kind
            )
        else:
            ally = sides.is_same_side(viewer_side, vis) or sides.is_ally_of(
                viewer_side, entry, use_true=False, see_hidden=False, kind_fallback=kind
            )
            # если у зрителя истинная сторона уже не party — считаем по истине
            if viewer_side != sides.SIDE_PARTY:
                ally = sides.is_ally_of(
                    viewer_side, entry, use_true=True, kind_fallback=kind
                )
        return vis, ally

    for seat in seats:
        cid = str(seat.get("character_id") or seat.get("id") or "")
        if not cid:
            continue
        conditions = list(seat.get("conditions") or [])
        side, is_ally = _row_side_and_ally("pc", cid)
        targets.append(
            {
                "id": cid,
                "kind": "pc",
                "ref_id": cid,
                "name": str(seat.get("character_name") or seat.get("name") or "Герой"),
                "hp_current": seat.get("hp_current"),
                "hp_max": seat.get("hp_max"),
                "ac": seat.get("ac"),
                "conditions": conditions,
                "side": side,
                "is_ally": is_ally,
                "user_id": str(seat["user_id"]) if seat.get("user_id") else None,
                "companion_id": None,
                "member_id": None,
            }
        )
        for companion in seat.get("companions") or []:
            if not isinstance(companion, dict):
                continue
            comp_id = str(companion.get("id") or "")
            if not comp_id:
                continue
            c_side, c_ally = _row_side_and_ally("companion", cid, comp_id)
            targets.append(
                {
                    "id": f"{cid}:{comp_id}",
                    "kind": "companion",
                    "ref_id": cid,
                    "companion_id": comp_id,
                    "name": str(companion.get("name") or "Напарник"),
                    "hp_current": companion.get("hp_current"),
                    "hp_max": companion.get("hp_max"),
                    "ac": companion.get("ac"),
                    "conditions": list(companion.get("conditions") or []),
                    "side": c_side,
                    "is_ally": c_ally,
                    "user_id": str(seat["user_id"]) if seat.get("user_id") else None,
                    "member_id": None,
                }
            )

    for c in visible_combatants:
        cid = str(c.get("id") or "")
        if not cid:
            continue
        # сторона врага: entry или поле combatant
        enemy_entry = sides.find_entry_for_ref(combat_state, kind="enemy", ref_id=cid)
        side_src = enemy_entry if enemy_entry is not None else {
            "kind": "enemy",
            "side": c.get("side") or sides.SIDE_ENEMIES,
            "side_hidden": c.get("side_hidden"),
        }
        e_vis = sides.visible_side(side_src, see_hidden=see_hidden, kind_fallback="enemy")
        if see_hidden:
            e_ally = sides.is_ally_of(
                viewer_side, side_src, use_true=True, kind_fallback="enemy"
            )
        else:
            e_ally = sides.is_same_side(viewer_side, e_vis)
        members = c.get("members") if isinstance(c.get("members"), list) else []
        if members:
            for m in members:
                if not isinstance(m, dict):
                    continue
                mid = str(m.get("id") or "")
                if int(m.get("hp_current") or 0) <= 0:
                    continue
                targets.append(
                    {
                        "id": f"{cid}:{mid}" if mid else cid,
                        "kind": "enemy",
                        "ref_id": cid,
                        "member_id": mid or None,
                        "name": str(m.get("name") or c.get("name") or "Враг"),
                        "hp_current": m.get("hp_current") if see_hidden or c.get("statblock_revealed") else None,
                        "hp_max": m.get("hp_max") if see_hidden or c.get("statblock_revealed") else None,
                        "ac": c.get("ac") if see_hidden else None,
                        "conditions": list(c.get("conditions") or []),
                        "side": e_vis,
                        "is_ally": e_ally,
                        "user_id": None,
                        "companion_id": None,
                    }
                )
        else:
            targets.append(
                {
                    "id": cid,
                    "kind": "enemy",
                    "ref_id": cid,
                    "member_id": None,
                    "name": str(c.get("name") or "Враг"),
                    "hp_current": c.get("hp_current") if see_hidden or c.get("statblock_revealed") else None,
                    "hp_max": c.get("hp_max") if see_hidden or c.get("statblock_revealed") else None,
                    "ac": c.get("ac") if see_hidden else None,
                    "conditions": list(c.get("conditions") or []),
                    "side": e_vis,
                    "is_ally": e_ally,
                    "user_id": None,
                    "companion_id": None,
                }
            )
    del filtered_state
    return targets


def maybe_apply_gunpowder_exploding(
    *,
    parts: list[int],
    sides: int,
    proficiency_bonus: int,
    enabled: bool,
) -> tuple[list[int], int]:
    """Крючок gunpowder_exploding: максимумы кубов перебрасываются (лимит = PB)."""
    if not enabled or proficiency_bonus <= 0:
        return parts, sum(parts)
    extra: list[int] = []
    rerolls = 0
    for p in list(parts):
        cur = p
        while cur == sides and rerolls < proficiency_bonus:
            cur = _roll_die(sides)
            extra.append(cur)
            rerolls += 1
            if cur != sides:
                break
    all_parts = parts + extra
    return all_parts, sum(all_parts)


def should_reroll_initiative(campaign_rules: object | None) -> bool:
    return homebrew_flag(campaign_rules, "reroll_initiative_each_round", False)


def group_initiative_enabled(campaign_rules: object | None) -> bool:
    return homebrew_flag(campaign_rules, "group_initiative", False)


def flanking_gives_advantage(campaign_rules: object | None) -> bool:
    return homebrew_flag(campaign_rules, "flanking_advantage", False)


def fumble_on_natural_1(campaign_rules: object | None) -> bool:
    return homebrew_flag(campaign_rules, "fumble_on_1", False)


def potion_bonus_self_enabled(campaign_rules: object | None) -> bool:
    """Крючок T-01 — экономику хода не строим."""
    return homebrew_flag(campaign_rules, "potion_bonus_self", False)


def gritty_rest_enabled(campaign_rules: object | None) -> bool:
    """Крючок S-07."""
    return homebrew_flag(campaign_rules, "gritty_rest", False)


def _as_optional_int(value: object) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _clean_str(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _normalize_ability(value: object) -> str | None:
    if value is None:
        return None
    raw = str(value).strip().lower()
    if raw in {"str", "dex", "con", "int", "wis", "cha"}:
        return raw
    return ABILITY_RU.get(raw)


# silence unused import warning if roll_d20 re-export needed by tests
__all__ = [
    "FUMBLE_CONSEQUENCES",
    "parse_action_stats",
    "enrich_action_block",
    "roll_damage_dice",
    "resolve_attack_roll",
    "format_feed_line",
    "filter_events_by_feed",
    "build_combat_targets",
    "homebrew_flag",
    "maybe_apply_gunpowder_exploding",
    "should_reroll_initiative",
    "group_initiative_enabled",
    "flanking_gives_advantage",
    "fumble_on_natural_1",
    "potion_bonus_self_enabled",
    "gritty_rest_enabled",
    "event_category",
]
