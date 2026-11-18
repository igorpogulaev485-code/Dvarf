"""P24-M02a+: class option catalogs and validation (2024).

Eldritch Invocations, Metamagic, Artificer replicate plans, Cunning/Brutal Strike,
Rage extension, Paladin Divine Sense as Channel Divinity option.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from app.dnd.edition_2024_classes import (
    Edition2024ClassError,
    normalize_class_slug,
)


@dataclass(frozen=True)
class InvocationDef:
    id: str
    name_en: str
    name_ru: str
    min_level: int = 1
    requires_invocation: str | None = None  # e.g. thirsting-blade
    requires_pact: str | None = None  # blade|chain|tome
    requires_damage_cantrip: bool = False
    repeatable: bool = False
    summary_ru: str = ""


@dataclass(frozen=True)
class MetamagicDef:
    id: str
    name_en: str
    name_ru: str
    cost: int
    summary_ru: str
    stackable_with_other: bool = False


@dataclass(frozen=True)
class StrikeOption:
    id: str
    name_en: str
    name_ru: str
    cost_dice: int  # sneak attack d6 removed, or brutal extra
    save: str | None  # dex|con|None
    min_level: int = 5
    summary_ru: str = ""
    requires_kit: str | None = None


# —— Eldritch Invocations (SRD 5.2.1, 28) ——
ELDRITCH_INVOCATIONS_2024: tuple[InvocationDef, ...] = (
    InvocationDef("agonizing-blast", "Agonizing Blast", "Мучительный взрыв", min_level=2, requires_damage_cantrip=True, repeatable=True, summary_ru="К броскам урона выбранного заговора колдуна — мод. Харизмы."),
    InvocationDef("armor-of-shadows", "Armor of Shadows", "Доспех теней", summary_ru="«Доспех мага» на себя без ячейки; КД обновляется, пока эффект активен."),
    InvocationDef("ascendant-step", "Ascendant Step", "Восходящий шаг", min_level=5, summary_ru="«Левитация» на себя без ячейки."),
    InvocationDef("devils-sight", "Devil's Sight", "Дьявольское зрение", min_level=2, summary_ru="Нормально видно в тусклом свете и темноте (магической и нет) 120 фт."),
    InvocationDef("devouring-blade", "Devouring Blade", "Пожирающий клинок", min_level=12, requires_invocation="thirsting-blade", summary_ru="«Жаждущий клинок» даёт две доп. атаки (итого три)."),
    InvocationDef("eldritch-mind", "Eldritch Mind", "Мистический разум", summary_ru="Преимущество на спасброски Тел. для концентрации."),
    InvocationDef("eldritch-smite", "Eldritch Smite", "Мистическая кара", min_level=5, requires_pact="blade", summary_ru="1/ход при попадании оружием договора: ячейка → 1к8 силового + 1к8/круг; можно опрокинуть."),
    InvocationDef("eldritch-spear", "Eldritch Spear", "Мистическое копьё", min_level=2, requires_damage_cantrip=True, repeatable=True, summary_ru="Дальность выбранного заговора +30 фт. × уровень колдуна."),
    InvocationDef("fiendish-vigor", "Fiendish Vigor", "Мощь Исчадия", min_level=2, summary_ru="«Псевдожизнь» на себя без ячейки; временные хиты по максимуму костей."),
    InvocationDef("gaze-of-two-minds", "Gaze of Two Minds", "Взор двух умов", min_level=5, summary_ru="Бонусом — чужие чувства; каст из пространства союзника в пределах 60 фт."),
    InvocationDef("gift-of-the-depths", "Gift of the Depths", "Дар глубин", min_level=5, summary_ru="Дыхание под водой и плавание = Скорости; «Подводное дыхание» 1/долгий без ячейки."),
    InvocationDef("gift-of-the-protectors", "Gift of the Protectors", "Дар защитников", min_level=9, requires_pact="tome", summary_ru="Страница имён: 0 хитов → 1 хит (1/долгий на всю страницу)."),
    InvocationDef("investment-of-the-chain-master", "Investment of the Chain Master", "Облачение хозяина цепи", min_level=5, requires_pact="chain", summary_ru="Усиление фамильяра договора цепи."),
    InvocationDef("lessons-of-the-first-ones", "Lessons of the First Ones", "Уроки древних", min_level=2, repeatable=True, summary_ru="Одна черта происхождения; повторяемое — другая черта."),
    InvocationDef("lifedrinker", "Lifedrinker", "Пьющий жизни", min_level=9, requires_pact="blade", summary_ru="1/ход: +1к6 (излучение/некрот./психика) и можно потратить Кость хитов."),
    InvocationDef("mask-of-many-faces", "Mask of Many Faces", "Маска многих лиц", min_level=2, summary_ru="«Маскировка» без ячейки."),
    InvocationDef("master-of-myriad-forms", "Master of Myriad Forms", "Мастер бесчисленных обликов", min_level=5, summary_ru="«Смена обличия» без ячейки."),
    InvocationDef("misty-visions", "Misty Visions", "Туманные видения", min_level=2, summary_ru="«Безмолвный образ» без ячейки."),
    InvocationDef("one-with-shadows", "One with Shadows", "Один среди теней", min_level=5, summary_ru="В тусклом/тьме — «Невидимость» на себя без ячейки."),
    InvocationDef("otherworldly-leap", "Otherworldly Leap", "Потусторонний прыжок", min_level=2, summary_ru="«Прыжок» на себя без ячейки."),
    InvocationDef("pact-of-the-blade", "Pact of the Blade", "Договор клинка", summary_ru="Оружие договора; владение; фокусировка; атака/урон от Харизмы; смена типа урона."),
    InvocationDef("pact-of-the-chain", "Pact of the Chain", "Договор цепи", summary_ru="«Обретение фамильяра» действием Магия без ячейки; особые формы."),
    InvocationDef("pact-of-the-tome", "Pact of the Tome", "Договор гримуара", summary_ru="Книга теней: 3 заговора и 2 ритуала 1 круга любого класса; фокусировка."),
    InvocationDef("repelling-blast", "Repelling Blast", "Отталкивающий заряд", min_level=2, requires_damage_cantrip=True, repeatable=True, summary_ru="При попадании заговором атакой — оттолкнуть до 10 фт. (Большой или меньше)."),
    InvocationDef("thirsting-blade", "Thirsting Blade", "Жаждущий клинок", min_level=5, requires_pact="blade", summary_ru="Доп. атака только оружием договора (действие Атака — две атаки)."),
    InvocationDef("visions-of-distant-realms", "Visions of Distant Realms", "Видения дальних земель", min_level=9, summary_ru="«Магический глаз» без ячейки."),
    InvocationDef("whispers-of-the-grave", "Whispers of the Grave", "Могильный шёпот", min_level=7, summary_ru="«Разговор с мёртвыми» без ячейки."),
    InvocationDef("witch-sight", "Witch Sight", "Ведьмачий взор", min_level=15, summary_ru="Истинное зрение 30 фт."),
)

DIVINE_ORDER_OPTIONS_2024 = frozenset({"protector", "thaumaturge"})
BLESSED_STRIKES_OPTIONS_2024 = frozenset({"divine_strike", "potent_spellcasting"})
BLESSED_STRIKES_MIN_LEVEL_2024 = 7
PRIMAL_ORDER_OPTIONS_2024 = frozenset({"magician", "warden"})
ELEMENTAL_FURY_OPTIONS_2024 = frozenset({"potent_spellcasting", "primal_strike"})
ELEMENTAL_FURY_MIN_LEVEL_2024 = 7
LAND_TERRAINS_2024 = frozenset({"arid", "polar", "temperate", "tropical"})
LAND_CHOICE_MIN_LEVEL_2024 = 3

HUNTERS_PREY_OPTIONS_2024 = frozenset({"colossus_slayer", "horde_breaker"})
DEFENSIVE_TACTICS_OPTIONS_2024 = frozenset({"escape_the_horde", "multiattack_defense"})
PRIMAL_COMPANION_TYPES_2024 = frozenset({"land", "sea", "sky"})
OTHERWORLDLY_GLAMOUR_SKILLS_2024 = frozenset({"performance", "deception", "persuasion"})
RANGER_SUBCLASS_BEASTMASTER_2024 = "ranger__beastmaster"
RANGER_SUBCLASS_HUNTER_2024 = "ranger__hunter-ranger"
RANGER_SUBCLASS_FEY_2024 = "ranger__fey-wanderer"
RANGER_CONCLAVE_PICK_MIN_LEVEL_2024 = 3
RANGER_DEFENSIVE_TACTICS_MIN_LEVEL_2024 = 7

INVOCATIONS_BY_ID = {row.id: row for row in ELDRITCH_INVOCATIONS_2024}

# Warlock invocation known count by level (from class table eldritch_invocations).
def warlock_invocation_limit(level: int) -> int:
    row_limits = {
        1: 1, 2: 3, 3: 3, 4: 3, 5: 5, 6: 5, 7: 6, 8: 6, 9: 7, 10: 7,
        11: 7, 12: 8, 13: 8, 14: 8, 15: 9, 16: 9, 17: 9, 18: 10, 19: 10, 20: 10,
    }
    lv = max(1, min(20, int(level or 1)))
    return row_limits[lv]


# —— Metamagic (PHB 2024 / next.dnd.su: 2 at L2, +2 at L10, +2 at L17) ——
METAMAGIC_2024: tuple[MetamagicDef, ...] = (
    MetamagicDef("careful", "Careful Spell", "Аккуратное заклинание", 1, "До Хар. существ автоуспех на спас; без половины урона."),
    MetamagicDef("distant", "Distant Spell", "Далёкое заклинание", 1, "Дистанция ×2; касание → 30 фт."),
    MetamagicDef("empowered", "Empowered Spell", "Усиленное заклинание", 1, "Перебросить до Хар. костей урона.", stackable_with_other=True),
    MetamagicDef("extended", "Extended Spell", "Продлённое заклинание", 1, "Длительность ×2 (≤24 ч.); преимущество к концентрации."),
    MetamagicDef("heightened", "Heightened Spell", "Непреодолимое заклинание", 2, "Одна цель — помеха на спасброски от этого заклинания."),
    MetamagicDef("quickened", "Quickened Spell", "Ускоренное заклинание", 2, "Время «действие» → бонусное (с лимитом заклинаний 1+ круга в ход)."),
    MetamagicDef("seeking", "Seeking Spell", "Ищущее заклинание", 1, "Промах атаки заклинания — переброс d20.", stackable_with_other=True),
    MetamagicDef("subtle", "Subtle Spell", "Неуловимое заклинание", 1, "Без V/S/M (кроме расходуемых/с ценой)."),
    MetamagicDef("transmuted", "Transmuted Spell", "Преобразованное заклинание", 1, "Сменить тип урона (звук/кислота/огонь/холод/электричество/яд)."),
    MetamagicDef("twinned", "Twinned Spell", "Удвоенное заклинание", 1, "Повысить фактический круг на 1 для доп. цели."),
)
METAMAGIC_BY_ID = {row.id: row for row in METAMAGIC_2024}


def metamagic_known_limit(sorcerer_level: int) -> int:
    """PHB 2024 / next.dnd.su: 2 at L2, +2 at L10 (4), +2 at L17 (6)."""
    lv = max(0, int(sorcerer_level or 0))
    if lv < 2:
        return 0
    if lv >= 17:
        return 6
    if lv >= 10:
        return 4
    return 2


# —— Cunning Strike (SRD base + Devious Strikes) ——
CUNNING_STRIKE_2024: tuple[StrikeOption, ...] = (
    StrikeOption("poison", "Poison", "Яд", 1, "con", 5, "Спас Тел. или Отравлен 1 мин.", requires_kit="poisoners-kit"),
    StrikeOption("trip", "Trip", "Подножка", 1, "dex", 5, "Большое или меньше: спас Лов. или Опрокинут."),
    StrikeOption("withdraw", "Withdraw", "Отход", 1, None, 5, "Перемещение до половины скорости без провоцированных."),
    StrikeOption("daze", "Daze", "Оглушение", 2, "con", 14, "Спас Тел. или на след. ходу только движение ИЛИ действие ИЛИ бонусное."),
    StrikeOption("knock-out", "Knock Out", "Нокаут", 6, "con", 14, "Спас Тел. или Бессознателен 1 мин. / до урона."),
    StrikeOption("obscure", "Obscure", "Затмение", 3, "dex", 14, "Спас Лов. или Слепота до конца своего след. хода."),
)
CUNNING_BY_ID = {row.id: row for row in CUNNING_STRIKE_2024}

# —— Brutal Strike ——
BRUTAL_STRIKE_2024: tuple[StrikeOption, ...] = (
    StrikeOption("forceful-blow", "Forceful Blow", "Мощный удар", 0, None, 9, "Толчок 15 фт + перемещение наполовину к цели без OA. Extra 1d10."),
    StrikeOption("hamstring-blow", "Hamstring Blow", "Калечащий удар", 0, None, 9, "Скорость цели −15 фт до начала вашего следующего хода. Extra 1d10."),
    StrikeOption("staggering-blow", "Staggering Blow", "Потрясающий удар", 0, None, 13, "Помеха на след. спас; без OA до начала вашего следующего хода."),
    StrikeOption("sundering-blow", "Sundering Blow", "Расшатывающий удар", 0, None, 13, "+5 к следующему броску атаки по цели другим существом."),
)
BRUTAL_BY_ID = {row.id: row for row in BRUTAL_STRIKE_2024}


def brutal_strike_extra_dice(barbarian_level: int) -> int:
    return 2 if barbarian_level >= 17 else 1


def brutal_strike_max_effects(barbarian_level: int) -> int:
    return 2 if barbarian_level >= 17 else 1


# —— Artificer replicate plans (common SRD items by typical level gates) ——
@dataclass(frozen=True)
class ReplicatePlanDef:
    id: str
    name_ru: str
    min_level: int
    rarity: str


# Curated SRD-ish plans for sheet picks (EFA «Replicate Magic Item»).
ARTIFICER_REPLICATE_PLANS: tuple[ReplicatePlanDef, ...] = (
    ReplicatePlanDef("alchemy-jug", "Алхимический кувшин", 2, "uncommon"),
    ReplicatePlanDef("bag-of-holding", "Сумка хранения", 2, "uncommon"),
    ReplicatePlanDef("cap-of-water-breathing", "Шапка водного дыхания", 2, "uncommon"),
    ReplicatePlanDef("goggles-of-night", "Очки ночного зрения", 2, "uncommon"),
    ReplicatePlanDef("lantern-of-revealing", "Фонарь выявления", 2, "uncommon"),
    ReplicatePlanDef("rope-of-climbing", "Верёвка лазания", 2, "uncommon"),
    ReplicatePlanDef("sending-stones", "Камни послания", 2, "uncommon"),
    ReplicatePlanDef("wand-of-magic-detection", "Жезл обнаружения магии", 2, "uncommon"),
    ReplicatePlanDef("boots-of-the-winding-path", "Сапоги извилистого пути", 6, "uncommon"),
    ReplicatePlanDef("helm-of-awareness", "Шлем бдительности", 6, "uncommon"),
    ReplicatePlanDef("radiant-weapon", "Сияющее оружие", 6, "rare"),
    ReplicatePlanDef("repulsion-shield", "Щит отталкивания", 6, "rare"),
    ReplicatePlanDef("spell-refueling-ring", "Кольцо подпитки заклинаний", 6, "uncommon"),
    ReplicatePlanDef("boots-of-speed", "Сапоги скорости", 10, "rare"),
    ReplicatePlanDef("winged-boots", "Крылатые сапоги", 10, "uncommon"),
    ReplicatePlanDef("belt-of-hill-giant-strength", "Пояс силы холмового великана", 14, "rare"),
    ReplicatePlanDef("amulet-of-health", "Амулет здоровья", 14, "rare"),
    ReplicatePlanDef("armor-of-resistance", "Доспех сопротивления", 14, "rare"),
)
PLANS_BY_ID = {row.id: row for row in ARTIFICER_REPLICATE_PLANS}

PACT_INVOCATION_IDS = {
    "blade": "pact-of-the-blade",
    "chain": "pact-of-the-chain",
    "tome": "pact-of-the-tome",
}


def _class_level(classes: Sequence[Mapping[str, Any]], slug: str) -> int:
    total = 0
    for row in classes:
        s = normalize_class_slug(
            str(row.get("slug") or row.get("catalog_slug") or row.get("name") or "")
        )
        if s == slug:
            total += max(0, int(row.get("level") or 0))
    return total


def validate_eldritch_invocations(
    picks: Sequence[str],
    *,
    warlock_level: int,
) -> list[str]:
    limit = warlock_invocation_limit(warlock_level)
    cleaned: list[str] = []
    for raw in picks:
        iid = str(raw).strip().lower().replace("_", "-")
        if not iid:
            continue
        if iid not in INVOCATIONS_BY_ID:
            raise Edition2024ClassError(
                f"Неизвестное воззвание: {raw}",
                code="invocation_unknown",
            )
        cleaned.append(iid)
    if len(cleaned) > limit:
        raise Edition2024ClassError(
            f"Слишком много воззваний ({len(cleaned)} > {limit})",
            code="invocation_limit",
        )
    # Non-repeatable uniqueness
    seen: set[str] = set()
    for iid in cleaned:
        inv = INVOCATIONS_BY_ID[iid]
        if not inv.repeatable and iid in seen:
            raise Edition2024ClassError(
                f"Воззвание «{inv.name_ru}» нельзя брать повторно",
                code="invocation_duplicate",
            )
        seen.add(iid)
        if warlock_level < inv.min_level:
            raise Edition2024ClassError(
                f"«{inv.name_ru}» требует колдуна {inv.min_level}+",
                code="invocation_level",
            )
        if inv.requires_invocation and inv.requires_invocation not in cleaned:
            raise Edition2024ClassError(
                f"«{inv.name_ru}» требует {inv.requires_invocation}",
                code="invocation_prereq",
            )
        if inv.requires_pact:
            pact_id = PACT_INVOCATION_IDS[inv.requires_pact]
            if pact_id not in cleaned:
                raise Edition2024ClassError(
                    f"«{inv.name_ru}» требует договор ({inv.requires_pact})",
                    code="invocation_pact",
                )
    return cleaned


def validate_metamagic(picks: Sequence[str], *, sorcerer_level: int) -> list[str]:
    limit = metamagic_known_limit(sorcerer_level)
    cleaned: list[str] = []
    for raw in picks:
        mid = str(raw).strip().lower().replace("_", "-")
        # allow careful_spell style
        mid = mid.replace("-spell", "").replace("_spell", "")
        aliases = {
            "careful-spell": "careful",
            "distant-spell": "distant",
            "empowered-spell": "empowered",
            "extended-spell": "extended",
            "heightened-spell": "heightened",
            "quickened-spell": "quickened",
            "seeking-spell": "seeking",
            "subtle-spell": "subtle",
            "transmuted-spell": "transmuted",
            "twinned-spell": "twinned",
        }
        mid = aliases.get(mid, mid)
        if not mid:
            continue
        if mid not in METAMAGIC_BY_ID:
            raise Edition2024ClassError(
                f"Неизвестная метамагия: {raw}",
                code="metamagic_unknown",
            )
        if mid in cleaned:
            raise Edition2024ClassError(
                f"Метамагия «{mid}» уже выбрана",
                code="metamagic_duplicate",
            )
        cleaned.append(mid)
    if sorcerer_level < 2 and cleaned:
        raise Edition2024ClassError(
            "Метамагия доступна с 2 уровня чародея",
            code="metamagic_level",
        )
    if len(cleaned) > limit:
        raise Edition2024ClassError(
            f"Слишком много вариантов метамагии ({len(cleaned)} > {limit})",
            code="metamagic_limit",
        )
    return cleaned


def validate_replicate_plans(
    picks: Sequence[str],
    *,
    artificer_level: int,
    plans_known_limit: int,
) -> list[str]:
    cleaned: list[str] = []
    for raw in picks:
        pid = str(raw).strip().lower().replace("_", "-")
        if not pid:
            continue
        plan = PLANS_BY_ID.get(pid)
        if not plan:
            raise Edition2024ClassError(
                f"Неизвестный план реплики: {raw}",
                code="replicate_unknown",
            )
        if artificer_level < plan.min_level:
            raise Edition2024ClassError(
                f"«{plan.name_ru}» с {plan.min_level} ур. артефактора",
                code="replicate_level",
            )
        if pid in cleaned:
            continue
        cleaned.append(pid)
    if len(cleaned) > plans_known_limit:
        raise Edition2024ClassError(
            f"Слишком много схем ({len(cleaned)} > {plans_known_limit})",
            code="replicate_limit",
        )
    return cleaned


def apply_metamagic_spend(
    *,
    known: Sequence[str],
    option_id: str,
    sorcery_points_max: int,
    sorcery_points_used: int,
) -> dict[str, Any]:
    oid = str(option_id).strip().lower().replace("_", "-")
    oid = oid.replace("-spell", "")
    if oid not in known and oid not in METAMAGIC_BY_ID:
        raise Edition2024ClassError("Метамагия не выбрана", code="metamagic_not_known")
    if oid not in known:
        raise Edition2024ClassError("Этот вариант метамагии не известен", code="metamagic_not_known")
    meta = METAMAGIC_BY_ID[oid]
    remaining = max(0, sorcery_points_max - sorcery_points_used)
    if remaining < meta.cost:
        raise Edition2024ClassError(
            f"Недостаточно очков чародейства ({remaining} < {meta.cost})",
            code="metamagic_no_points",
        )
    return {
        "option_id": oid,
        "name_ru": meta.name_ru,
        "cost": meta.cost,
        "new_used": sorcery_points_used + meta.cost,
        "feed_line_ru": f"Метамагия «{meta.name_ru}» (−{meta.cost} очк. чародейства)",
        "stackable_with_other": meta.stackable_with_other,
    }


def resolve_cunning_strike(
    *,
    option_ids: Sequence[str],
    rogue_level: int,
    sneak_attack_dice: int,
    dex_mod: int,
    proficiency_bonus: int,
    has_poisoners_kit: bool = False,
) -> dict[str, Any]:
    if rogue_level < 5:
        raise Edition2024ClassError("Хитрый удар с 5 ур. плута", code="cunning_level")
    max_opts = 2 if rogue_level >= 11 else 1
    cleaned = [str(x).strip().lower().replace("_", "-") for x in option_ids if str(x).strip()]
    if len(cleaned) > max_opts:
        raise Edition2024ClassError(
            f"Можно до {max_opts} эффектов Хитрого удара",
            code="cunning_count",
        )
    cost = 0
    effects: list[dict[str, Any]] = []
    dc = 8 + dex_mod + proficiency_bonus
    for oid in cleaned:
        opt = CUNNING_BY_ID.get(oid)
        if not opt:
            raise Edition2024ClassError(f"Неизвестный Хитрый удар: {oid}", code="cunning_unknown")
        if rogue_level < opt.min_level:
            raise Edition2024ClassError(
                f"«{opt.name_ru}» с {opt.min_level} ур.",
                code="cunning_option_level",
            )
        if opt.requires_kit == "poisoners-kit" and not has_poisoners_kit:
            raise Edition2024ClassError(
                "Для «Яда» нужен набор отравителя",
                code="cunning_kit",
            )
        cost += opt.cost_dice
        effects.append(
            {
                "id": opt.id,
                "name_ru": opt.name_ru,
                "save": opt.save,
                "dc": dc if opt.save else None,
                "summary_ru": opt.summary_ru,
            }
        )
    if cost > sneak_attack_dice:
        raise Edition2024ClassError(
            f"Недостаточно костей Скрытой атаки ({sneak_attack_dice}d6 < {cost}d6)",
            code="cunning_dice",
        )
    return {
        "dice_spent": cost,
        "sneak_attack_dice_remaining": sneak_attack_dice - cost,
        "effects": effects,
        "feed_line_ru": "Хитрый удар: "
        + ", ".join(e["name_ru"] for e in effects)
        + f" (−{cost}d6 Скрытой атаки)",
    }


def resolve_brutal_strike(
    *,
    option_ids: Sequence[str],
    barbarian_level: int,
    reckless_used: bool,
    attack_has_advantage: bool,
    attack_has_disadvantage: bool,
) -> dict[str, Any]:
    if barbarian_level < 9:
        raise Edition2024ClassError("Жестокий удар с 9 ур. варвара", code="brutal_level")
    if not reckless_used:
        raise Edition2024ClassError(
            "Жестокий удар требует Безрассудной атаки",
            code="brutal_reckless",
        )
    if attack_has_disadvantage:
        raise Edition2024ClassError(
            "Жестокий удар нельзя при помехе на атаку",
            code="brutal_disadvantage",
        )
    if not attack_has_advantage:
        raise Edition2024ClassError(
            "Нужно отказаться от преимущества на эту атаку",
            code="brutal_advantage",
        )
    max_fx = brutal_strike_max_effects(barbarian_level)
    cleaned = [str(x).strip().lower().replace("_", "-") for x in option_ids if str(x).strip()]
    if not cleaned or len(cleaned) > max_fx:
        raise Edition2024ClassError(
            f"Выберите 1–{max_fx} эффекта Жестокого удара",
            code="brutal_count",
        )
    effects = []
    for oid in cleaned:
        opt = BRUTAL_BY_ID.get(oid)
        if not opt:
            raise Edition2024ClassError(f"Неизвестный Жестокий удар: {oid}", code="brutal_unknown")
        if barbarian_level < opt.min_level:
            raise Edition2024ClassError(
                f"«{opt.name_ru}» с {opt.min_level} ур.",
                code="brutal_option_level",
            )
        effects.append({"id": opt.id, "name_ru": opt.name_ru, "summary_ru": opt.summary_ru})
    dice = brutal_strike_extra_dice(barbarian_level)
    return {
        "forgo_advantage": True,
        "extra_damage_dice": dice,
        "extra_damage": f"{dice}d10",
        "effects": effects,
        "feed_line_ru": f"Жестокий удар (+{dice}d10, без преимущества): "
        + ", ".join(e["name_ru"] for e in effects),
    }


def resolve_rage_start(*, wearing_heavy_armor: bool) -> dict[str, Any]:
    if wearing_heavy_armor:
        raise Edition2024ClassError(
            "Ярость нельзя начать в тяжёлом доспехе",
            code="rage_heavy_armor",
        )
    return {
        "active": True,
        "rounds_extended": 0,
        "max_minutes": 10,
        "feed_line_ru": "Ярость начата (до конца следующего хода; продление атакой/спасом/бонусным)",
    }


def resolve_rage_extend(
    *,
    rage_state: Mapping[str, Any],
    reason: str,
    wearing_heavy_armor: bool = False,
    incapacitated: bool = False,
) -> dict[str, Any]:
    if not rage_state.get("active"):
        raise Edition2024ClassError("Ярость не активна", code="rage_inactive")
    if wearing_heavy_armor or incapacitated:
        raise Edition2024ClassError("Ярость прервана", code="rage_ended")
    reason_n = str(reason).strip().lower()
    if reason_n not in {"attack", "save", "bonus", "атака", "спас", "бонусное"}:
        raise Edition2024ClassError(
            "Продление ярости: атака, спас цели или бонусное действие",
            code="rage_extend_reason",
        )
    extended = int(rage_state.get("rounds_extended") or 0) + 1
    # ~10 minutes ≈ 100 rounds; soft cap for sheet tracking
    if extended > 100:
        raise Edition2024ClassError("Ярость истекла (10 минут)", code="rage_expired")
    return {
        "active": True,
        "rounds_extended": extended,
        "max_minutes": 10,
        "feed_line_ru": f"Ярость продлена ({reason_n}) до конца следующего хода",
    }


def resolve_divine_sense_channel(
    *,
    channel_remaining: int,
) -> dict[str, Any]:
    if channel_remaining <= 0:
        raise Edition2024ClassError(
            "Нет применений Проведения божественности",
            code="channel_empty",
        )
    return {
        "option_id": "divine_sense",
        "name_ru": "Божественное чувство",
        "duration_minutes": 10,
        "range_ft": 60,
        "detects": ["celestial", "fiend", "undead", "hallow"],
        "timing": "bonus",
        "feed_line_ru": "Проведение: Божественное чувство (бонусное, 10 мин., 60 фт.)",
        "spend_channel": 1,
    }


def validate_class_options_update(
    *,
    rules_edition: str,
    previous: Any,
    incoming: Any,
    sheet: Mapping[str, Any] | None,
) -> dict[str, Any] | None:
    if str(rules_edition).strip() != "2024":
        if incoming:
            raise Edition2024ClassError(
                "class_options_2024 только для редакции 2024",
                code="class_options_2014_forbidden",
            )
        return None

    classes = []
    if isinstance(sheet, Mapping) and isinstance(sheet.get("classes"), list):
        classes = sheet["classes"]  # type: ignore[index]

    warlock_lv = _class_level(classes, "warlock")
    sorcerer_lv = _class_level(classes, "sorcerer")
    artificer_lv = _class_level(classes, "artificer")
    cleric_lv = _class_level(classes, "cleric")
    druid_lv = _class_level(classes, "druid")

    src = incoming if isinstance(incoming, Mapping) else {}
    prev = previous if isinstance(previous, Mapping) else {}

    def _pick_list(key: str) -> list[Any]:
        if key in src:
            raw = src.get(key)
            return list(raw) if isinstance(raw, (list, tuple)) else []
        raw = prev.get(key)
        return list(raw) if isinstance(raw, (list, tuple)) else []

    invocations = (
        validate_eldritch_invocations(
            _pick_list("eldritch_invocations"),
            warlock_level=warlock_lv,
        )
        if warlock_lv
        else []
    )

    metamagic = (
        validate_metamagic(
            _pick_list("metamagic"),
            sorcerer_level=sorcerer_lv,
        )
        if sorcerer_lv
        else []
    )

    # plans known limit from class table
    plans_limit = 0
    if artificer_lv:
        from app.dnd.edition_2024_classes import class_level_row

        row = class_level_row("artificer", artificer_lv)
        plans_limit = int((row or {}).get("resources", {}).get("replicate_plans_known") or 0)

    plans = (
        validate_replicate_plans(
            _pick_list("replicate_plans"),
            artificer_level=artificer_lv or 1,
            plans_known_limit=max(plans_limit, 0),
        )
        if artificer_lv and plans_limit
        else []
    )

    rage_src = src.get("rage") if "rage" in src else prev.get("rage")
    rage = rage_src if isinstance(rage_src, Mapping) else {}
    rage_out = {
        "active": bool(rage.get("active")),
        "rounds_extended": int(rage.get("rounds_extended") or 0),
        "max_minutes": 10,
    }

    order_src = src.get("divine_order") if "divine_order" in src else prev.get("divine_order")
    order = str(order_src or "").strip().lower()
    strikes_src = (
        src.get("blessed_strikes") if "blessed_strikes" in src else prev.get("blessed_strikes")
    )
    strikes = str(strikes_src or "").strip().lower()
    primal_src = src.get("primal_order") if "primal_order" in src else prev.get("primal_order")
    primal_order = str(primal_src or "").strip().lower()
    fury_src = (
        src.get("elemental_fury") if "elemental_fury" in src else prev.get("elemental_fury")
    )
    elemental_fury = str(fury_src or "").strip().lower()
    land_src = src.get("land_choice") if "land_choice" in src else prev.get("land_choice")
    land_choice = str(land_src or "").strip().lower()

    active_src = (
        src.get("replicate_active") if "replicate_active" in src else prev.get("replicate_active")
    )
    replicate_active: list[dict[str, Any]] = []
    if isinstance(active_src, (list, tuple)):
        for i, row in enumerate(active_src):
            if not isinstance(row, Mapping):
                continue
            pid = str(row.get("plan_id") or row.get("planId") or "").strip().lower().replace("_", "-")
            if not pid:
                continue
            replicate_active.append(
                {
                    "plan_id": pid,
                    "attuned": bool(row.get("attuned")),
                    "seq": int(row.get("seq") if row.get("seq") is not None else i),
                }
            )

    spell_src = (
        src.get("spell_storing_spell")
        if "spell_storing_spell" in src
        else prev.get("spell_storing_spell")
    )
    spell_storing = str(spell_src or "").strip().lower().replace("_", "-") or None

    result: dict[str, Any] = {
        "eldritch_invocations": invocations,
        "metamagic": metamagic,
        "replicate_plans": plans,
        "replicate_active": replicate_active,
        "spell_storing_spell": spell_storing,
        "rage": rage_out,
        "catalog": {
            "invocations": [
                {
                    "id": r.id,
                    "name_ru": r.name_ru,
                    "min_level": r.min_level,
                    "requires_pact": r.requires_pact,
                    "requires_invocation": r.requires_invocation,
                    "summary_ru": r.summary_ru,
                }
                for r in ELDRITCH_INVOCATIONS_2024
            ],
            "metamagic": [
                {
                    "id": r.id,
                    "name_ru": r.name_ru,
                    "cost": r.cost,
                    "summary_ru": r.summary_ru,
                }
                for r in METAMAGIC_2024
            ],
            "cunning_strike": [
                {
                    "id": r.id,
                    "name_ru": r.name_ru,
                    "cost_dice": r.cost_dice,
                    "save": r.save,
                    "min_level": r.min_level,
                    "summary_ru": r.summary_ru,
                }
                for r in CUNNING_STRIKE_2024
            ],
            "brutal_strike": [
                {
                    "id": r.id,
                    "name_ru": r.name_ru,
                    "min_level": r.min_level,
                    "summary_ru": r.summary_ru,
                }
                for r in BRUTAL_STRIKE_2024
            ],
            "replicate_plans": [
                {
                    "id": r.id,
                    "name_ru": r.name_ru,
                    "min_level": r.min_level,
                    "rarity": r.rarity,
                }
                for r in ARTIFICER_REPLICATE_PLANS
            ],
            "limits": {
                "warlock_invocations": warlock_invocation_limit(warlock_lv) if warlock_lv else 0,
                "metamagic_known": metamagic_known_limit(sorcerer_lv),
                "replicate_plans_known": plans_limit,
            },
        },
    }
    if cleric_lv and order in DIVINE_ORDER_OPTIONS_2024:
        result["divine_order"] = order
    if (
        cleric_lv >= BLESSED_STRIKES_MIN_LEVEL_2024
        and strikes in BLESSED_STRIKES_OPTIONS_2024
    ):
        result["blessed_strikes"] = strikes
    if druid_lv and primal_order in PRIMAL_ORDER_OPTIONS_2024:
        result["primal_order"] = primal_order
    if (
        druid_lv >= ELEMENTAL_FURY_MIN_LEVEL_2024
        and elemental_fury in ELEMENTAL_FURY_OPTIONS_2024
    ):
        result["elemental_fury"] = elemental_fury
    if (
        druid_lv >= LAND_CHOICE_MIN_LEVEL_2024
        and land_choice in LAND_TERRAINS_2024
    ):
        result["land_choice"] = land_choice
    return result


def strip_class_options_from_sheet_for_2014(sheet: dict[str, Any]) -> dict[str, Any]:
    out = dict(sheet)
    out.pop("class_options_2024", None)
    return out


def sneak_attack_dice_from_scale(value: Any) -> int:
    text = str(value or "")
    # "3d6" / "1d6"
    if "d" in text.lower():
        try:
            return max(0, int(text.lower().split("d")[0]))
        except ValueError:
            return 0
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return 0
