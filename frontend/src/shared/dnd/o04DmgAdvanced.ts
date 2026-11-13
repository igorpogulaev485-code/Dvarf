/**
 * O-04: правила мастера DMG — разрубание, шок, раны, мораль, очки героя,
 * эпический героизм, кости мастерства. Таблицы — DMG 2014 гл. 9 (не выдуманные).
 */

/** Запас очков героя: 5 на 1 ур.; при повышении = 5 + ⌊уровень/2⌋. */
export function heroPointsMaxForLevel(level: number): number {
  const lv = Math.max(1, Math.min(20, Math.floor(Number(level) || 1)))
  if (lv <= 1) return 5
  return 5 + Math.floor(lv / 2)
}

export const HERO_POINTS_RESOURCE_ID = 'hero_points'

/** БМ → кость мастерства (таблица DMG). */
export function proficiencyDieSides(proficiencyBonus: number): number | null {
  const pb = Math.max(0, Math.floor(Number(proficiencyBonus) || 0))
  if (pb <= 1) return null
  if (pb === 2) return 4
  if (pb === 3) return 6
  if (pb === 4) return 8
  if (pb === 5) return 10
  if (pb >= 6) return 12
  return null
}

export function proficiencyDieLabel(proficiencyBonus: number): string | null {
  const sides = proficiencyDieSides(proficiencyBonus)
  return sides == null ? null : `к${sides}`
}

/** Бросок кости мастерства (1…sides). */
export function rollProficiencyDie(
  proficiencyBonus: number,
  rng: () => number = Math.random,
): { sides: number; roll: number } | null {
  const sides = proficiencyDieSides(proficiencyBonus)
  if (sides == null) return null
  const roll = 1 + Math.floor(rng() * sides)
  return { sides, roll }
}

/**
 * Вклад мастерства в бросок атаки/проверки/спасброска.
 * При включённых костях — вместо фиксированного БМ; Сл и «половина БМ» оставляй числом.
 */
export function proficiencyRollContribution(opts: {
  proficient: boolean
  proficiencyBonus: number
  diceEnabled: boolean
  /** Уже выпавшее (режим «Кубики на столе»). */
  forcedRoll?: number | null
  rng?: () => number
}): { value: number; label: string; usedDice: boolean; sides?: number } {
  if (!opts.proficient) {
    return { value: 0, label: '', usedDice: false }
  }
  const pb = Math.max(0, Math.floor(opts.proficiencyBonus))
  if (!opts.diceEnabled) {
    return { value: pb, label: `БМ ${pb >= 0 ? '+' : ''}${pb}`, usedDice: false }
  }
  const sides = proficiencyDieSides(pb)
  if (sides == null) {
    return { value: pb, label: `БМ +${pb}`, usedDice: false }
  }
  const forced = opts.forcedRoll
  const roll =
    forced != null && Number.isFinite(forced)
      ? Math.max(1, Math.min(sides, Math.floor(forced)))
      : 1 + Math.floor((opts.rng ?? Math.random)() * sides)
  return {
    value: roll,
    label: `кость мастер. к${sides}=${roll}`,
    usedDice: true,
    sides,
  }
}

/** Эпический героизм ↔ суровый реализм — взаимоисключение. */
export function mutuallyExclusiveRestFlags(next: {
  key: 'gritty_rest' | 'dmg_epic_heroism'
  value: boolean
  current: { gritty_rest: boolean; dmg_epic_heroism: boolean }
}): { gritty_rest: boolean; dmg_epic_heroism: boolean } {
  if (!next.value) {
    return {
      gritty_rest: next.key === 'gritty_rest' ? false : next.current.gritty_rest,
      dmg_epic_heroism:
        next.key === 'dmg_epic_heroism' ? false : next.current.dmg_epic_heroism,
    }
  }
  if (next.key === 'gritty_rest') {
    return { gritty_rest: true, dmg_epic_heroism: false }
  }
  return { gritty_rest: false, dmg_epic_heroism: true }
}

export type RestDurationVariant = 'normal' | 'gritty' | 'epic'

export function restDurationVariant(flags: {
  gritty_rest?: boolean
  dmg_epic_heroism?: boolean
}): RestDurationVariant {
  // Взаимоисключение: если оба (ошибка данных) — эпический не применяем вместе с gritty;
  // UI снимает второй, но на всякий случай приоритет у явно включённого одного.
  if (flags.dmg_epic_heroism && !flags.gritty_rest) return 'epic'
  if (flags.gritty_rest && !flags.dmg_epic_heroism) return 'gritty'
  if (flags.dmg_epic_heroism && flags.gritty_rest) return 'epic'
  return 'normal'
}

export function restDurationLabels(variant: RestDurationVariant): {
  shortLabel: string
  longLabel: string
  shortHint: string
  longHint: string
  chipShort: string
  chipLong: string
} {
  if (variant === 'gritty') {
    return {
      shortLabel: 'Короткий отдых (8 часов)',
      longLabel: 'Долгий отдых (7 дней)',
      shortHint: 'Суровый реализм: короткий отдых — 8 часов.',
      longHint: 'Суровый реализм: долгий отдых — 7 дней.',
      chipShort: 'Короткий (8 ч)',
      chipLong: 'Продолжительный (7 дн.)',
    }
  }
  if (variant === 'epic') {
    return {
      shortLabel: 'Короткий отдых (5 минут)',
      longLabel: 'Долгий отдых (1 час)',
      shortHint: 'Эпический героизм: короткий отдых — 5 минут.',
      longHint: 'Эпический героизм: долгий отдых — 1 час.',
      chipShort: 'Короткий (5 мин)',
      chipLong: 'Продолжительный (1 ч)',
    }
  }
  return {
    shortLabel: 'Короткий отдых',
    longLabel: 'Долгий отдых',
    shortHint: 'Короткий отдых: кости хитов и сброс ресурсов «короткий».',
    longHint: 'Долгий отдых: полные HP, ячейки, ресурсы и −1 истощение.',
    chipShort: 'Короткий',
    chipLong: 'Продолжительный',
  }
}

/** Разрубание: остаток урона после добивания рукопашной. */
export function cleaveOverflow(opts: {
  enabled: boolean
  meleeWeapon: boolean
  hpBefore: number
  damage: number
}): { overflow: number; qualifies: boolean } {
  if (!opts.enabled || !opts.meleeWeapon) {
    return { overflow: 0, qualifies: false }
  }
  const before = Math.max(0, Math.floor(opts.hpBefore))
  const dmg = Math.max(0, Math.floor(opts.damage))
  if (before <= 0 || dmg < before) {
    return { overflow: 0, qualifies: false }
  }
  const overflow = dmg - before
  return { overflow, qualifies: overflow > 0 }
}

/** Вторая цель подходит, если исходный бросок атаки ≥ её КД. */
export function cleaveAttackWouldHit(attackTotal: number, targetAc: number | null): boolean {
  if (targetAc == null || !Number.isFinite(targetAc)) return false
  return Math.floor(attackTotal) >= Math.floor(targetAc)
}

/** Массивный урон: урон из одного источника ≥ половины максимума. */
export function triggersMassiveDamage(opts: {
  enabled: boolean
  damage: number
  hpMax: number | null
}): boolean {
  if (!opts.enabled) return false
  const max = opts.hpMax
  if (max == null || !Number.isFinite(max) || max <= 0) return false
  const threshold = Math.ceil(max / 2)
  return Math.floor(opts.damage) >= threshold
}

export const MASSIVE_DAMAGE_DC = 15

export type SystemShockRow = {
  /** Inclusive roll range on d10. */
  min: number
  max: number
  nameRu: string
  effectRu: string
  /** Apply mechanical side-effects the sheet/table can express. */
  apply: 'drop_0' | 'drop_0_stable' | 'stunned' | 'no_reactions_disadvantage' | 'no_reactions'
}

/** Таблица «Системный шок» DMG 2014 (d10). */
export const SYSTEM_SHOCK_TABLE: SystemShockRow[] = [
  {
    min: 1,
    max: 1,
    nameRu: 'Падение до 0 хитов',
    effectRu: 'Существо опускается до 0 хитов.',
    apply: 'drop_0',
  },
  {
    min: 2,
    max: 3,
    nameRu: 'Падение до 0, стабильно',
    effectRu: 'Существо опускается до 0 хитов, но стабильно.',
    apply: 'drop_0_stable',
  },
  {
    min: 4,
    max: 5,
    nameRu: 'Ошеломление',
    effectRu: 'Существо ошеломлено до конца своего следующего хода.',
    apply: 'stunned',
  },
  {
    min: 6,
    max: 7,
    nameRu: 'Без реакций и с помехой',
    effectRu:
      'Существо не может совершать реакции и совершает броски атаки и проверки характеристик с помехой до конца своего следующего хода.',
    apply: 'no_reactions_disadvantage',
  },
  {
    min: 8,
    max: 10,
    nameRu: 'Без реакций',
    effectRu: 'Существо не может совершать реакции до конца своего следующего хода.',
    apply: 'no_reactions',
  },
]

export function lookupSystemShock(d10: number): SystemShockRow {
  const n = Math.max(1, Math.min(10, Math.floor(d10)))
  const row = SYSTEM_SHOCK_TABLE.find((r) => n >= r.min && n <= r.max)
  return row ?? SYSTEM_SHOCK_TABLE[SYSTEM_SHOCK_TABLE.length - 1]
}

export function rollSystemShock(rng: () => number = Math.random): {
  roll: number
  row: SystemShockRow
} {
  const roll = 1 + Math.floor(rng() * 10)
  return { roll, row: lookupSystemShock(roll) }
}

export type LingeringInjuryRow = {
  min: number
  max: number
  key: string
  nameRu: string
  effectRu: string
  permanent: boolean
}

/**
 * Таблица незаживающих ран DMG 2014 (d20).
 * Имена — как принято в рус. переводе / 5e14 («Незаживающие раны»).
 */
export const LINGERING_INJURIES_TABLE: LingeringInjuryRow[] = [
  {
    min: 1,
    max: 1,
    key: 'lose_eye',
    nameRu: 'Потеря глаза',
    effectRu:
      'Помеха на проверки Мудрости (Внимательность), полагающиеся на зрение, и на броски дальнобойных атак. Заклинание вроде «Регенерация» восстанавливает глаз. Если глаз не осталось — вы ослеплены.',
    permanent: true,
  },
  {
    min: 2,
    max: 2,
    key: 'lose_arm',
    nameRu: 'Потеря руки или кисти',
    effectRu:
      'Вы больше не можете держать ничего двумя руками и можете держать только один предмет за раз. Заклинание вроде «Регенерация» восстанавливает конечность.',
    permanent: true,
  },
  {
    min: 3,
    max: 3,
    key: 'lose_foot',
    nameRu: 'Потеря ступни или ноги',
    effectRu:
      'Скорость пешком уменьшена вдвое; нужна трость/костыль или протез. После действия «Рывок» вы падаете ничком. Помеха на проверки Ловкости для баланса. «Регенерация» восстанавливает конечность.',
    permanent: true,
  },
  {
    min: 4,
    max: 4,
    key: 'limp',
    nameRu: 'Хромота',
    effectRu:
      'Скорость пешком −5 футов. После «Рывка» — спасбросок Ловкости Сл 10, при провале падаете ничком. Магическое лечение восстанавливает ногу.',
    permanent: true,
  },
  {
    min: 5,
    max: 7,
    key: 'internal_injury',
    nameRu: 'Внутренняя травма',
    effectRu:
      'Всякий раз, когда вы пытаетесь совершить действие в бою, совершите спасбросок Телосложения Сл 15. При провале теряете действие и не можете использовать реакции до начала своего следующего хода. Лечится магией или десятью днями полного отдыха.',
    permanent: true,
  },
  {
    min: 8,
    max: 10,
    key: 'broken_ribs',
    nameRu: 'Сломанные рёбра',
    effectRu:
      'Как «Внутренняя травма», но Сл спасброска 10. Лечится магией или десятью днями полного отдыха.',
    permanent: true,
  },
  {
    min: 11,
    max: 13,
    key: 'horrible_scar',
    nameRu: 'Ужасный шрам',
    effectRu:
      'Обезображивание трудно скрыть. Помеха на проверки Харизмы (Убеждение) и преимущество на проверки Харизмы (Запугивание). Лечение 6+ круга («Исцеление», «Регенерация») снимает шрам.',
    permanent: true,
  },
  {
    min: 14,
    max: 16,
    key: 'festering_wound',
    nameRu: 'Гноящаяся рана',
    effectRu:
      'Максимум хитов −1 каждые 24 часа, пока рана есть; при максимуме 0 — смерть. Лечится магией или уходом: проверка Мудрости (Медицина) Сл 15 раз в сутки; после десяти успехов рана затягивается.',
    permanent: true,
  },
  {
    min: 17,
    max: 20,
    key: 'minor_scar',
    nameRu: 'Незначительный шрам',
    effectRu:
      'Шрам без штрафов. Лечение 6+ круга («Исцеление», «Регенерация») снимает шрам.',
    permanent: true,
  },
]

export function lookupLingeringInjury(d20: number): LingeringInjuryRow {
  const n = Math.max(1, Math.min(20, Math.floor(d20)))
  const row = LINGERING_INJURIES_TABLE.find((r) => n >= r.min && n <= r.max)
  return row ?? LINGERING_INJURIES_TABLE[LINGERING_INJURIES_TABLE.length - 1]
}

export function rollLingeringInjury(rng: () => number = Math.random): {
  roll: number
  row: LingeringInjuryRow
} {
  const roll = 1 + Math.floor(rng() * 20)
  return { roll, row: lookupLingeringInjury(roll) }
}

export function lingeringInjuryConditionSlug(key: string): string {
  return `lingering_injury:${key}`
}

/** Типичные поводы морали DMG (чекбоксы-подсказки, не автодетект). */
export const MORALE_TRIGGER_HINTS: { id: string; labelRu: string }[] = [
  { id: 'surprised', labelRu: 'Существо застигнуто врасплох' },
  { id: 'half_hp', labelRu: 'Впервые в бою ≤ половины хитов' },
  { id: 'no_harm', labelRu: 'Нет способа навредить противнику в свой ход' },
  { id: 'group_surprised', labelRu: 'Вся группа застигнута врасплох' },
  { id: 'leader_down', labelRu: 'Вожак убит / недееспособен / пленён / вне боя' },
  { id: 'half_group', labelRu: 'Группа сократилась вдвое без потерь у противника' },
]

export const MORALE_DC = 10

export type MoraleOutcome = 'flee' | 'surrender' | 'hold'

export function resolveMoraleSave(opts: {
  saveTotal: number
  dc?: number
  overwhelming?: boolean
}): { success: boolean; dc: number; outcome: MoraleOutcome } {
  const dc = opts.dc ?? MORALE_DC
  if (opts.overwhelming) {
    return { success: false, dc, outcome: 'flee' }
  }
  const success = opts.saveTotal >= dc
  return { success, dc, outcome: success ? 'hold' : 'flee' }
}

export function moraleConditionSlug(outcome: MoraleOutcome): string | null {
  if (outcome === 'flee') return 'morale_fleeing'
  if (outcome === 'surrender') return 'morale_surrendered'
  return null
}
