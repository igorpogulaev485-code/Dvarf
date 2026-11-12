"""L-08: campaign_rules JSON for lobby — defaults, normalize, catalog, helpers."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

# Ровно 11 домашних ключей (решение 12.11). Крит «максимум + бросок» не входит.
HOMEBREW_KEYS: tuple[str, ...] = (
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
)

# Справочник подсказок: короткое имя + описание + источник. Тот же набор ключей на фронте.
HOMEBREW_CATALOG: dict[str, dict[str, str]] = {
    "potion_bonus_self": {
        "label": "Зелье бонусным действием",
        "tip": (
            "Выпить зелье лечения самому — бонусное действие. "
            "Напоить другого персонажа — полноценное действие."
        ),
        "source": "Домашнее (популярное)",
    },
    "inspiration_stack": {
        "label": "Вдохновение копится",
        "tip": (
            "Вдохновение за отыгрыш копится, а не затирается. "
            "Мастер задаёт максимум (по умолчанию 3)."
        ),
        "source": "Домашнее",
    },
    "flanking_advantage": {
        "label": "Фланкирование",
        "tip": (
            "Союзник на противоположной стороне цели (цель не недееспособна) "
            "даёт преимущество на атаки ближнего боя. Без карты позиции "
            "отмечаются вручную."
        ),
        "source": "DMG 2014 (вариант)",
    },
    "gunpowder_exploding": {
        "label": "Порох (exploding)",
        "tip": (
            "Кубы урона огнестрела при максимуме перебрасываются и добавляются "
            "(включая скрытую атаку и крит). Перебросов за атаку не больше "
            "бонуса мастерства."
        ),
        "source": "Kobold Press",
    },
    "hidden_death_saves": {
        "label": "Скрытые спасброски от смерти",
        "tip": (
            "Спасброски от смерти видит только мастер (и сомастер) "
            "и владелец умирающего персонажа."
        ),
        "source": "Домашнее / карточка S-03",
    },
    "fumble_on_1": {
        "label": "Провал на 1",
        "tip": (
            "Естественная 1 на броске атаки — неудача. Мастер выбирает "
            "последствие: уронил оружие, задел ближайшего союзника или "
            "потерял реакцию до следующего хода."
        ),
        "source": "Домашнее",
    },
    "group_initiative": {
        "label": "Групповая инициатива",
        "tip": (
            "Враги одного типа ходят одним блоком. Игроки ходят в любом "
            "порядке в своём окне инициативы."
        ),
        "source": "Домашнее",
    },
    "reroll_initiative_each_round": {
        "label": "Инициатива каждый раунд",
        "tip": "Инициатива перебрасывается в начале каждого раунда боя.",
        "source": "Домашнее / DMG вариант",
    },
    "gritty_rest": {
        "label": "Суровый реализм",
        "tip": "Короткий отдых — 8 часов. Длинный отдых — 7 дней.",
        "source": "DMG 2014",
    },
    "feat_at_level_1": {
        "label": "Черта на 1 уровне",
        "tip": (
            "Каждый персонаж получает черту на 1 уровне. "
            "Лист предлагает выбор при создании (крючок L-16)."
        ),
        "source": "Домашнее",
    },
    "encumbrance": {
        "label": "Нагрузка (вариант PHB)",
        "tip": (
            "Учёт веса и грузоподъёмности: >5×Сил — скорость −10 фт, "
            ">10×Сил — −20 фт и помеха на проверки/атаки/спасброски "
            "с Силой, Ловкостью и Телосложением."
        ),
        "source": "PHB 2014 (вариант «Нагрузка»)",
    },
}

ABILITY_METHODS: tuple[str, ...] = (
    "standard_array",
    "point_buy",
    "roll",
    "any",
)

STARTING_KIT_MODES: tuple[str, ...] = (
    "class_equipment",
    "class_gold",
    "fixed_gold",
)

DEFAULT_START_RULES: dict[str, Any] = {
    "level": 1,
    "ability_method": "any",
    "allowed_sources": ["phb"],
    "starting_kit": {"mode": "class_equipment"},
    "banned_races": [],
    "banned_classes": [],
}

DEFAULT_CAMPAIGN_RULES: dict[str, Any] = {
    "edition_2014": {
        "feats_instead_of_asi": True,
        "multiclass": True,
        "hp_on_level_up": "average",  # average | roll
    },
    "homebrew": {
        "potion_bonus_self": False,
        "inspiration_stack": False,
        "inspiration_stack_max": 3,
        "flanking_advantage": False,
        "gunpowder_exploding": False,
        "hidden_death_saves": True,
        "fumble_on_1": False,
        "group_initiative": False,
        "reroll_initiative_each_round": False,
        "gritty_rest": False,
        "feat_at_level_1": False,
        "encumbrance": False,
    },
    "progression": {
        "mode": "xp",  # xp | milestones
        # S-06: копилка остатка XP между выдачами (не колонка Alembic)
        "xp_remainder": 0,
    },
    # S-03: раньше жило в visibility_profile
    "inspiration_after_roll": False,
    # КД врагов для игроков (дефолт скрыт). Броски мастера — через event_history.
    "enemies_ac_visible": False,
    "custom_rules": [],
    # L-16: правила старта (уровень, метод, книги, набор, запреты)
    "start": deepcopy(DEFAULT_START_RULES),
}


def default_campaign_rules() -> dict[str, Any]:
    return deepcopy(DEFAULT_CAMPAIGN_RULES)


def _as_bool(value: Any, default: bool) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"1", "true", "yes", "on", "да"}:
            return True
        if lowered in {"0", "false", "no", "off", "нет"}:
            return False
    return default


def _as_int(value: Any, default: int, *, min_v: int = 1, max_v: int = 20) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(min_v, min(max_v, n))


def _slug_list(raw: Any, *, limit: int = 200) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in raw:
        slug = str(item or "").strip().lower()
        if not slug or slug in seen:
            continue
        seen.add(slug)
        out.append(slug[:80])
        if len(out) >= limit:
            break
    return out


def normalize_start_rules(raw: object | None) -> dict[str, Any]:
    """Normalize campaign_rules.start with L-16 defaults."""
    from app.services.book_sources import canonicalize_source

    base = deepcopy(DEFAULT_START_RULES)
    if not isinstance(raw, dict):
        return base

    base["level"] = _as_int(raw.get("level"), 1, min_v=1, max_v=20)

    method = raw.get("ability_method")
    if method in ABILITY_METHODS:
        base["ability_method"] = method

    sources_raw = raw.get("allowed_sources")
    if isinstance(sources_raw, list):
        cleaned: list[str] = []
        seen: set[str] = set()
        for item in sources_raw:
            canon = canonicalize_source(item) or str(item or "").strip().lower()
            if not canon or canon in seen:
                continue
            seen.add(canon)
            cleaned.append(canon)
        base["allowed_sources"] = cleaned or ["phb"]
    else:
        base["allowed_sources"] = ["phb"]

    kit = raw.get("starting_kit")
    if isinstance(kit, dict):
        mode = kit.get("mode")
        if mode == "fixed_gold":
            gp = _as_int(kit.get("gp"), 0, min_v=0, max_v=1_000_000)
            base["starting_kit"] = {"mode": "fixed_gold", "gp": gp}
        elif mode in ("class_equipment", "class_gold"):
            base["starting_kit"] = {"mode": mode}
        else:
            base["starting_kit"] = {"mode": "class_equipment"}
    else:
        base["starting_kit"] = {"mode": "class_equipment"}

    base["banned_races"] = _slug_list(raw.get("banned_races"))
    base["banned_classes"] = _slug_list(raw.get("banned_classes"))
    return base


def normalize_campaign_rules(raw: object | None) -> dict[str, Any]:
    """Normalize arbitrary JSON into the L-08+L-16 shape with defaults."""
    base = default_campaign_rules()
    if not isinstance(raw, dict):
        return base

    edition = raw.get("edition_2014")
    if isinstance(edition, dict):
        base["edition_2014"]["feats_instead_of_asi"] = _as_bool(
            edition.get("feats_instead_of_asi"),
            True,
        )
        base["edition_2014"]["multiclass"] = _as_bool(edition.get("multiclass"), True)
        hp_mode = edition.get("hp_on_level_up")
        if hp_mode in ("average", "roll"):
            base["edition_2014"]["hp_on_level_up"] = hp_mode

    home = raw.get("homebrew")
    if isinstance(home, dict):
        for key in HOMEBREW_KEYS:
            if key == "inspiration_stack":
                base["homebrew"][key] = _as_bool(home.get(key), False)
                continue
            default = bool(DEFAULT_CAMPAIGN_RULES["homebrew"][key])
            base["homebrew"][key] = _as_bool(home.get(key), default)
        base["homebrew"]["inspiration_stack_max"] = _as_int(
            home.get("inspiration_stack_max"),
            3,
            min_v=1,
            max_v=20,
        )

    prog = raw.get("progression")
    if isinstance(prog, dict):
        mode = prog.get("mode")
        if mode in ("xp", "milestones"):
            base["progression"]["mode"] = mode
        # S-06: остаток XP — сохраняем при нормализации
        try:
            rem = int(prog.get("xp_remainder") or 0)
        except (TypeError, ValueError):
            rem = 0
        base["progression"]["xp_remainder"] = max(0, rem)

    if "inspiration_after_roll" in raw:
        base["inspiration_after_roll"] = _as_bool(raw.get("inspiration_after_roll"), False)

    if "enemies_ac_visible" in raw:
        base["enemies_ac_visible"] = _as_bool(raw.get("enemies_ac_visible"), False)

    custom = raw.get("custom_rules")
    if isinstance(custom, list):
        cleaned: list[str] = []
        for row in custom:
            if isinstance(row, str):
                text = row.strip()
                if text:
                    cleaned.append(text[:500])
            elif isinstance(row, dict):
                text = str(row.get("text") or row.get("title") or "").strip()
                if text:
                    cleaned.append(text[:500])
        base["custom_rules"] = cleaned[:50]

    # L-16: start всегда нормализован (дефолт если ключа нет)
    base["start"] = normalize_start_rules(raw.get("start"))

    return base


def merge_campaign_rules(current: object | None, incoming: dict[str, Any]) -> dict[str, Any]:
    """Merge PATCH payload with existing rules so L-08/S-06 keys are not wiped."""
    cur = normalize_campaign_rules(current)
    if not isinstance(incoming, dict):
        return cur
    merged = deepcopy(cur)

    for key in (
        "edition_2014",
        "homebrew",
        "progression",
        "start",
    ):
        part = incoming.get(key)
        if isinstance(part, dict):
            base_part = merged.get(key) if isinstance(merged.get(key), dict) else {}
            next_part = dict(base_part)
            next_part.update(part)
            # S-06: если PATCH не прислал xp_remainder — оставить копилку
            if key == "progression" and "xp_remainder" not in part:
                next_part["xp_remainder"] = cur["progression"]["xp_remainder"]
            merged[key] = next_part

    for key in ("inspiration_after_roll", "enemies_ac_visible", "custom_rules"):
        if key in incoming:
            merged[key] = incoming[key]

    return normalize_campaign_rules(merged)


def migrate_inspiration_from_visibility(
    rules: dict[str, Any],
    visibility_profile: object | None,
) -> dict[str, Any]:
    """Copy S-03 flag from visibility_profile when campaign_rules has no explicit value."""
    out = normalize_campaign_rules(rules)
    if not isinstance(visibility_profile, dict):
        return out
    if "inspiration_after_roll" in (rules or {} if isinstance(rules, dict) else {}):
        return out
    if "inspiration_after_roll" in visibility_profile:
        out["inspiration_after_roll"] = _as_bool(
            visibility_profile.get("inspiration_after_roll"),
            False,
        )
    return out


def parse_inspiration_after_roll(
    campaign_rules: object | None = None,
    visibility_profile: object | None = None,
) -> bool:
    """S-03: prefer campaign_rules, fall back to visibility_profile. Default off."""
    if isinstance(campaign_rules, dict) and "inspiration_after_roll" in campaign_rules:
        return _as_bool(campaign_rules.get("inspiration_after_roll"), False)
    if isinstance(visibility_profile, dict) and "inspiration_after_roll" in visibility_profile:
        return _as_bool(visibility_profile.get("inspiration_after_roll"), False)
    # Normalized defaults
    if isinstance(campaign_rules, dict):
        return _as_bool(
            normalize_campaign_rules(campaign_rules).get("inspiration_after_roll"),
            False,
        )
    return False


def sync_inspiration_to_visibility(
    visibility_profile: dict | None,
    value: bool,
) -> dict:
    """Keep visibility_profile.inspiration_after_roll in sync for older readers."""
    next_profile = dict(visibility_profile or {})
    next_profile["inspiration_after_roll"] = bool(value)
    return next_profile


def homebrew_enabled(rules: object | None, key: str) -> bool:
    normalized = normalize_campaign_rules(rules)
    return bool(normalized.get("homebrew", {}).get(key))


def catalog_public() -> list[dict[str, str]]:
    """List of 11 homebrew entries for API / tests."""
    rows: list[dict[str, str]] = []
    for key in HOMEBREW_KEYS:
        meta = HOMEBREW_CATALOG[key]
        rows.append(
            {
                "key": key,
                "label": meta["label"],
                "tip": meta["tip"],
                "source": meta["source"],
            }
        )
    return rows
