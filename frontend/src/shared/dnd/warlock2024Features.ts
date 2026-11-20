/**
 * Warlock 2024 (PHB): Magical Cunning, Contact Patron, Mystic Arcanum, Eldritch Master,
 * Eldritch Invocations helpers, subclass feature uses (Archfey / Celestial / Fiend / Great Old One).
 *
 * Callers branch on `rules_edition === '2024'`; nothing here feeds the 2014 pack
 * (`warlockInvocations.ts`, `pack04SorcererWarlock.ts`, `warlock_2014.json`).
 * Names follow next.dnd.su.
 */

import {
  ELDRITCH_INVOCATIONS_2024,
  invocationById2024,
  warlockInvocationLimit2024,
  type InvocationDef2024,
} from './edition2024ClassOptions'
import {
  getFeaturePick,
  getFeaturePickList,
  setFeaturePick,
  type FeaturePicksState,
} from './featurePicks'
import { parseFeatureResourceId } from './featureResources'
import { clampResource, type SheetResource } from './rest'
import {
  FORM_OF_DREAD_ACTIVE_PICK,
  FORM_OF_DREAD_FEAR_TURN_PICK,
  FORM_OF_DREAD_FEATURE_ID,
  FORM_OF_DREAD_NAME_RU,
  FORM_OF_DREAD_POOL_ID,
  formOfDreadTempHp2024,
  GRAVE_TOUCHED_DAMAGE_SWAP_TURN_PICK,
  GRAVE_TOUCHED_EXTRA_DIE_TURN_PICK,
  GRAVE_TOUCHED_FEATURE_ID,
  GRAVE_TOUCHED_NAME_RU,
  NECROTIC_HUSK_FEATURE_ID,
  NECROTIC_HUSK_NAME_RU,
  NECROTIC_HUSK_POOL_ID,
  necroticHuskDamageDice2024,
  necroticHuskHp2024,
  rollDie,
  SEMBLANCE_OF_LIFE_FEATURE_ID,
  SEMBLANCE_OF_LIFE_NAME_RU,
  SEMBLANCE_OF_LIFE_POOL_ID,
  semblanceSpellLevel2024,
  SUPERIOR_DREAD_FEATURE_ID,
  SUPERIOR_DREAD_NAME_RU,
  VESTIGE_POWER_FEATURE_ID,
  VESTIGE_POWER_NAME_RU,
  VESTIGE_RECOVERY_FEATURE_ID,
  VESTIGE_RECOVERY_NAME_RU,
  VESTIGE_RECOVERY_POOL_ID,
} from './warlockBook2024Features'

export {
  FORM_OF_DREAD_FEATURE_ID,
  FORM_OF_DREAD_NAME_RU,
  GRAVE_TOUCHED_FEATURE_ID,
  GRAVE_TOUCHED_NAME_RU,
  NECROTIC_HUSK_FEATURE_ID,
  NECROTIC_HUSK_NAME_RU,
  SEMBLANCE_OF_LIFE_FEATURE_ID,
  SEMBLANCE_OF_LIFE_NAME_RU,
  SUPERIOR_DREAD_FEATURE_ID,
  SUPERIOR_DREAD_NAME_RU,
  VESTIGE_POWER_FEATURE_ID,
  VESTIGE_POWER_NAME_RU,
  VESTIGE_RECOVERY_FEATURE_ID,
  VESTIGE_RECOVERY_NAME_RU,
} from './warlockBook2024Features'

export const ELDRITCH_INVOCATIONS_NAME_RU = 'Таинственные воззвания'
export const PACT_MAGIC_NAME_RU = 'Магия договора'
export const MAGICAL_CUNNING_NAME_RU = 'Магическая искусность'
export const CONTACT_PATRON_NAME_RU = 'Связь с покровителем'
export const MYSTIC_ARCANUM_NAME_RU = 'Таинственный арканум'
export const ELDRITCH_MASTER_NAME_RU = 'Таинственный мастер'

export const STEPS_OF_THE_FEY_NAME_RU = 'Шаг феи'
export const MISTY_ESCAPE_NAME_RU = 'Туманное исчезновение'
export const BEGUILING_DEFENSES_NAME_RU = 'Чарующая защита'
export const BEWITCHING_MAGIC_NAME_RU = 'Завораживающая магия'
export const AWAKENED_MIND_NAME_RU = 'Пробуждённый разум'
export const PSYCHIC_SPELLS_NAME_RU = 'Психические заклинания'
export const CLAIRVOYANT_COMBATANT_NAME_RU = 'Провидящий боец'
export const ELDRITCH_HEX_NAME_RU = 'Мистический сглаз'
export const THOUGHT_SHIELD_NAME_RU = 'Ментальный щит'
export const CREATE_THRALL_NAME_RU = 'Порабощение'
export const DARK_ONES_BLESSING_NAME_RU = 'Благословение темнейшего'
export const DARK_ONES_OWN_LUCK_NAME_RU = 'Удача темнейшего'
export const FIENDISH_RESILIENCE_NAME_RU = 'Устойчивость исчадия'
export const HURL_THROUGH_HELL_NAME_RU = 'Бросок через преисподнюю'
export const HEALING_LIGHT_NAME_RU = 'Лечащий свет'
export const RADIANT_SOUL_NAME_RU = 'Сияющая душа'
export const CELESTIAL_RESILIENCE_NAME_RU = 'Небесная стойкость'
export const SEARING_VENGEANCE_NAME_RU = 'Опаляющее возмездие'

export const CONTACT_OTHER_PLANE_ID = 'contact-other-plane'
export const CONTACT_OTHER_PLANE_NAME_RU = 'Связь с иным планом'

export const MAGICAL_CUNNING_FEATURE_ID = 'magical-cunning'
export const CONTACT_PATRON_FEATURE_ID = 'contact-patron'
export const MYSTIC_ARCANUM_FEATURE_ID = 'mystic-arcanum'
export const ELDRITCH_MASTER_FEATURE_ID = 'eldritch-master'

export const PACT_OF_THE_TOME_INVOCATION_ID_2024 = 'pact-of-the-tome'
export const PACT_TOME_RITUALS_FEATURE_ID_2024 = 'pact_tome_rituals'
export const PACT_TOME_CANTRIPS_LIMIT_2024 = 3
export const PACT_TOME_RITUALS_LIMIT_2024 = 2
export const BOOK_OF_SHADOWS_NAME_RU = 'Книга теней'
export const FIENDISH_RESILIENCE_PICK_ID_2024 = 'fiendish_resilience'
export const FIEND_PATRON_SUBCLASS_SLUG_2024 = 'warlock__fiend-patron'
export const FIENDISH_RESILIENCE_MIN_LEVEL_2024 = 10

export function hasPactOfTheTome2024(invocations: readonly string[] | null | undefined): boolean {
  return (invocations ?? []).includes(PACT_OF_THE_TOME_INVOCATION_ID_2024)
}

export const PACT_TOME_CANTRIPS_FEATURE_ID_2024 = 'pact_tome_cantrips'

export function readPactTomePicks2024(
  picks: FeaturePicksState,
  classEntryId: string,
): { cantrips: string[]; rituals: string[] } {
  return {
    cantrips: getFeaturePickList(picks, classEntryId, PACT_TOME_CANTRIPS_FEATURE_ID_2024).slice(
      0,
      PACT_TOME_CANTRIPS_LIMIT_2024,
    ),
    rituals: getFeaturePickList(picks, classEntryId, PACT_TOME_RITUALS_FEATURE_ID_2024).slice(
      0,
      PACT_TOME_RITUALS_LIMIT_2024,
    ),
  }
}

/** Book of Shadows save: exactly 3 cantrips + 2 rituals, otherwise null. */
export function savePactTomePicks2024(
  picks: FeaturePicksState,
  classEntryId: string,
  cantrips: readonly string[],
  rituals: readonly string[],
): FeaturePicksState | null {
  const c = [...new Set(cantrips)]
  const r = [...new Set(rituals)]
  if (c.length !== PACT_TOME_CANTRIPS_LIMIT_2024) return null
  if (r.length !== PACT_TOME_RITUALS_LIMIT_2024) return null
  const withCantrips = setFeaturePick(
    picks,
    classEntryId,
    PACT_TOME_CANTRIPS_FEATURE_ID_2024,
    c.join(','),
  )
  return setFeaturePick(withCantrips, classEntryId, PACT_TOME_RITUALS_FEATURE_ID_2024, r.join(','))
}

/** Fiendish Resilience re-pick on rest: Fiend Patron, warlock level 10+. */
export function canRepickFiendishResilience2024(input: {
  subclassSlug: string | null | undefined
  warlockLevel: number
}): boolean {
  return (
    input.subclassSlug === FIEND_PATRON_SUBCLASS_SLUG_2024 &&
    input.warlockLevel >= FIENDISH_RESILIENCE_MIN_LEVEL_2024
  )
}

/** Pact Magic slots as stored on the sheet (`pact_slots`). */
export type WarlockPactSlots2024 = { max: number; used: number; level: number } | null

/** Max temp HP for 2024 False Life (2d4 + 4 at the base slot level). */
export const FALSE_LIFE_MAX_TEMP_HP_2024 = 12

export const FIENDISH_RESILIENCE_TYPES_2024 = [
  { id: 'acid', nameRu: 'Кислота' },
  { id: 'bludgeoning', nameRu: 'Дробящий' },
  { id: 'cold', nameRu: 'Холод' },
  { id: 'fire', nameRu: 'Огонь' },
  { id: 'lightning', nameRu: 'Электричество' },
  { id: 'necrotic', nameRu: 'Некротический' },
  { id: 'piercing', nameRu: 'Колющий' },
  { id: 'poison', nameRu: 'Яд' },
  { id: 'psychic', nameRu: 'Психический' },
  { id: 'radiant', nameRu: 'Излучение' },
  { id: 'slashing', nameRu: 'Рубящий' },
  { id: 'thunder', nameRu: 'Звук' },
] as const

export const STEPS_OF_THE_FEY_MODES_2024 = [
  { id: 'refreshing', nameRu: 'Освежающий шаг', minLevel: 3, summaryRu: '1к10 врем. хитов себе или существу в 10 фт.' },
  { id: 'taunting', nameRu: 'Провоцирующий шаг', minLevel: 3, summaryRu: 'Существа в 5 фт. от точки: спас Мдр или помеха атак по другим.' },
  { id: 'concealing', nameRu: 'Скрывающий шаг', minLevel: 6, summaryRu: 'Невидимость до начала следующего хода.' },
  { id: 'terrifying', nameRu: 'Ужасающий шаг', minLevel: 6, summaryRu: 'Спас Мдр или 2к10 психического урона.' },
] as const

export type StepsOfTheFeyMode2024 = (typeof STEPS_OF_THE_FEY_MODES_2024)[number]['id']

export function stepsOfTheFeyModeAlias2024(mode: string | null | undefined): string {
  const key = (mode ?? '').trim().toLowerCase()
  if (key === 'provoking') return 'taunting'
  if (key === 'disappearing') return 'concealing'
  if (key === 'dreadful') return 'terrifying'
  return key
}

export type AtWillInvocationCast2024 = {
  nameRu: string
  spellRu: string
  noteRu: string
  oncePerLong?: boolean
}

/** Invocations that grant an at-will / slot-free cast and want a card button. */
export const AT_WILL_INVOCATION_CASTS_2024: Record<string, AtWillInvocationCast2024> = {
  'armor-of-shadows': { nameRu: 'Доспех теней', spellRu: 'Доспех мага', noteRu: 'на себя без ячейки' },
  'ascendant-step': { nameRu: 'Восходящий шаг', spellRu: 'Левитация', noteRu: 'на себя без ячейки' },
  'fiendish-vigor': { nameRu: 'Мощь Исчадия', spellRu: 'Псевдожизнь', noteRu: 'на себя без ячейки' },
  'mask-of-many-faces': { nameRu: 'Маска многих лиц', spellRu: 'Маскировка', noteRu: 'без ячейки' },
  'master-of-myriad-forms': { nameRu: 'Мастер бесчисленных обликов', spellRu: 'Смена обличия', noteRu: 'без ячейки' },
  'misty-visions': { nameRu: 'Туманные видения', spellRu: 'Безмолвный образ', noteRu: 'без ячейки' },
  'one-with-shadows': { nameRu: 'Один среди теней', spellRu: 'Невидимость', noteRu: 'на себя без ячейки (в тусклом свете или тьме)' },
  'otherworldly-leap': { nameRu: 'Потусторонний прыжок', spellRu: 'Прыжок', noteRu: 'на себя без ячейки' },
  'visions-of-distant-realms': { nameRu: 'Видения дальних земель', spellRu: 'Магический глаз', noteRu: 'без ячейки' },
  'whispers-of-the-grave': { nameRu: 'Могильный шёпот', spellRu: 'Разговор с мёртвыми', noteRu: 'без ячейки' },
  'gift-of-the-depths': {
    nameRu: 'Дар глубин',
    spellRu: 'Подводное дыхание',
    noteRu: 'один раз за долгий отдых без ячейки (отметь вручную)',
    oncePerLong: true,
  },
}

export type Warlock2024Flags = {
  rulesEdition: '2024'
  warlockLevel: number
  hasMagicalCunning: boolean
  hasContactPatron: boolean
  hasEldritchMaster: boolean
  arcanumCircles: number[]
  invocationLimit: number
  invocationsKnown: string[]
  subclassSlug: string | null
}

export function isWarlockClassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return key === 'warlock' || /колдун|варлок/.test(key)
}

export function warlock2024Context(input: {
  rulesEdition: string | null | undefined
  warlockLevel: number
  invocationsKnown?: string[]
  subclassSlug?: string | null
}): Warlock2024Flags | null {
  if (input.rulesEdition !== '2024') return null
  const level = Math.max(0, Math.floor(input.warlockLevel || 0))
  if (level < 1) return null
  return {
    rulesEdition: '2024',
    warlockLevel: level,
    hasMagicalCunning: level >= 2,
    hasContactPatron: level >= 9,
    hasEldritchMaster: level >= 20,
    arcanumCircles: arcanumCirclesForWarlockLevel2024(level),
    invocationLimit: warlockInvocationLimit2024(level),
    invocationsKnown: [...(input.invocationsKnown ?? [])],
    subclassSlug: input.subclassSlug ?? null,
  }
}

/* ------------------------------------------------------------------ */
/* Invocations                                                         */
/* ------------------------------------------------------------------ */

/** New invocation picks gained when reaching `level` (level 1 grants the first). */
export function invocationPickGainAtLevel2024(level: number): number {
  const lv = Math.floor(level || 0)
  if (lv < 1) return 0
  if (lv === 1) return warlockInvocationLimit2024(1)
  return Math.max(0, warlockInvocationLimit2024(lv) - warlockInvocationLimit2024(lv - 1))
}

/** How many invocations must be dropped after a level change. */
export function invocationTrimNeeded2024(known: string[], newLevel: number): number {
  return Math.max(0, known.length - warlockInvocationLimit2024(newLevel))
}

const PACT_INVOCATION_BY_BOON: Record<NonNullable<InvocationDef2024['requiresPact']>, string> = {
  blade: 'pact-of-the-blade',
  chain: 'pact-of-the-chain',
  tome: 'pact-of-the-tome',
}

/** Known invocations that would lose a prerequisite if `removeId` were dropped. */
export function invocationsDependingOn2024(known: string[], removeId: string): string[] {
  const rest = known.filter((id) => id !== removeId)
  const dependents: string[] = []
  for (const id of rest) {
    const def = invocationById2024(id)
    if (!def) continue
    if (def.requiresInvocation === removeId) {
      dependents.push(id)
      continue
    }
    if (def.requiresPact && PACT_INVOCATION_BY_BOON[def.requiresPact] === removeId) {
      dependents.push(id)
    }
  }
  return dependents
}

export type InvocationReplaceCheck2024 =
  | { ok: true }
  | { ok: false; reasonRu: string; blockedBy: string[] }

export function validateInvocationReplace2024(input: {
  known: string[]
  removeId: string
  addId?: string | null
  warlockLevel?: number
}): InvocationReplaceCheck2024 {
  const { known, removeId, addId } = input
  if (!known.includes(removeId)) {
    return { ok: false, reasonRu: 'Это воззвание не выбрано', blockedBy: [] }
  }
  const dependents = invocationsDependingOn2024(known, removeId)
  if (dependents.length > 0) {
    const names = dependents.map((id) => invocationById2024(id)?.nameRu ?? id).join(', ')
    const removedName = invocationById2024(removeId)?.nameRu ?? removeId
    return {
      ok: false,
      reasonRu: `Нельзя убрать «${removedName}»: нужно для ${names}`,
      blockedBy: dependents,
    }
  }
  if (!addId) return { ok: true }
  const def = invocationById2024(addId)
  if (!def) return { ok: false, reasonRu: `Неизвестное воззвание: ${addId}`, blockedBy: [] }
  const removeAt = known.indexOf(removeId)
  const after = known.filter((_, index) => index !== removeAt)
  if (!def.repeatable && after.includes(addId)) {
    return { ok: false, reasonRu: `«${def.nameRu}» уже выбрано`, blockedBy: [] }
  }
  if (input.warlockLevel != null && input.warlockLevel < def.minLevel) {
    return {
      ok: false,
      reasonRu: `«${def.nameRu}» доступно с ${def.minLevel} уровня колдуна`,
      blockedBy: [],
    }
  }
  if (def.requiresPact && !after.includes(PACT_INVOCATION_BY_BOON[def.requiresPact])) {
    const pact = invocationById2024(PACT_INVOCATION_BY_BOON[def.requiresPact])
    return {
      ok: false,
      reasonRu: `«${def.nameRu}» требует «${pact?.nameRu ?? def.requiresPact}»`,
      blockedBy: [],
    }
  }
  if (def.requiresInvocation && !after.includes(def.requiresInvocation)) {
    const req = invocationById2024(def.requiresInvocation)
    return {
      ok: false,
      reasonRu: `«${def.nameRu}» требует «${req?.nameRu ?? def.requiresInvocation}»`,
      blockedBy: [],
    }
  }
  return { ok: true }
}

/** Why `addId` cannot be picked right now (Russian text), or null when it can. */
export function invocationUnavailableReason2024(input: {
  known: string[]
  addId: string
  warlockLevel: number
}): string | null {
  const def = invocationById2024(input.addId)
  if (!def) return `Неизвестное воззвание: ${input.addId}`
  if (!def.repeatable && input.known.includes(input.addId)) return null
  if (input.warlockLevel < def.minLevel) return `Доступно с ${def.minLevel} уровня колдуна`
  if (def.requiresPact && !input.known.includes(PACT_INVOCATION_BY_BOON[def.requiresPact])) {
    const pact = invocationById2024(PACT_INVOCATION_BY_BOON[def.requiresPact])
    return `Нужно «${pact?.nameRu ?? def.requiresPact}»`
  }
  if (def.requiresInvocation && !input.known.includes(def.requiresInvocation)) {
    const req = invocationById2024(def.requiresInvocation)
    return `Нужно «${req?.nameRu ?? def.requiresInvocation}»`
  }
  return null
}

export function listInvocations2024(): InvocationDef2024[] {
  return [...ELDRITCH_INVOCATIONS_2024]
}

/* ------------------------------------------------------------------ */
/* Pure calculators                                                    */
/* ------------------------------------------------------------------ */

/** Circles with a Mystic Arcanum pick at this warlock level: 11→6, 13→7, 15→8, 17→9. */
export function arcanumCirclesForWarlockLevel2024(level: number): number[] {
  const lv = Math.floor(level || 0)
  const out: number[] = []
  if (lv >= 11) out.push(6)
  if (lv >= 13) out.push(7)
  if (lv >= 15) out.push(8)
  if (lv >= 17) out.push(9)
  return out
}

export function arcanumUnlockLevel2024(circle: number): number | null {
  const table: Record<number, number> = { 6: 11, 7: 13, 8: 15, 9: 17 }
  return table[circle] ?? null
}

/** Always-prepared spell ids granted by Contact Patron (L9). */
export function contactPatronAlwaysPrepared2024(level: number): string[] {
  return Math.floor(level || 0) >= 9 ? [CONTACT_OTHER_PLANE_ID] : []
}

/** Dark One's Blessing temp HP: Charisma modifier + warlock level (minimum 1). */
export function darkOnesBlessingTempHp2024(input: {
  chaMod: number
  warlockLevel: number
}): number {
  return Math.max(1, Math.floor(input.chaMod) + Math.floor(input.warlockLevel))
}

export const DARK_ONES_BLESSING_NOTE_RU =
  'Врем. хиты = Хар + ур. колдуна (мин. 1), когда ты или союзник в пределах 10 фт. опускаете врага до 0 хитов'

/** Celestial Resilience (L6): temp HP after a rest — self and up to five allies. */
export function celestialResilienceTempHp2024(input: {
  chaMod: number
  warlockLevel: number
}): { self: number; allies: number } {
  const lv = Math.floor(input.warlockLevel)
  const cha = Math.floor(input.chaMod)
  return {
    self: Math.max(1, lv + cha),
    allies: Math.max(1, Math.floor(lv / 2) + cha),
  }
}

/** Healing Light: at most max(1, CHA mod) dice per use. */
export function healingLightMaxDicePerUse2024(chaMod: number): number {
  return Math.max(1, Math.floor(chaMod))
}

export type MagicalCunningCheck2024 =
  | { ok: true; restored: number; pact: NonNullable<WarlockPactSlots2024>; feedLineRu: string }
  | { ok: false; reasonRu: string }

/**
 * Magical Cunning (L2): 1 minute rite, regain up to half of max Pact slots (round up).
 * Eldritch Master (L20): regain all expended Pact slots.
 */
export function applyMagicalCunning2024(input: {
  warlockLevel: number
  pact: WarlockPactSlots2024
  cunningUsed: number
  cunningMax: number
}): MagicalCunningCheck2024 {
  if (input.cunningUsed >= input.cunningMax) {
    return { ok: false, reasonRu: 'Магическая искусность уже использована (до долгого отдыха)' }
  }
  const pact = input.pact
  if (!pact || pact.max <= 0) {
    return { ok: false, reasonRu: 'Нет ячеек Магии договора' }
  }
  const used = Math.min(pact.max, Math.max(0, pact.used))
  if (used <= 0) {
    return { ok: false, reasonRu: 'Нет потраченных ячеек Магии договора' }
  }
  const full = input.warlockLevel >= 20
  const restored = full ? used : Math.min(used, Math.ceil(pact.max / 2))
  return {
    ok: true,
    restored,
    pact: { ...pact, used: used - restored },
    feedLineRu: full
      ? `Магическая искусность (Таинственный мастер): восстановлено ячеек договора — все (${restored})`
      : `Магическая искусность: восстановлено ячеек договора — ${restored} (до половины максимума, округляя вверх)`,
  }
}

export type PactRecoverCheck2024 =
  | { ok: true; pact: NonNullable<WarlockPactSlots2024>; featureUsed: number }
  | { ok: false; reasonRu: string }

/** Regain a once-per-rest feature by expending one Pact Magic slot. */
export function recoverFeatureWithPactSlot2024(input: {
  pact: WarlockPactSlots2024
  featureUsed: number
}): PactRecoverCheck2024 {
  if (input.featureUsed <= 0) return { ok: false, reasonRu: 'Использование уже доступно' }
  const pact = input.pact
  if (!pact || pact.max <= 0) return { ok: false, reasonRu: 'Нет ячеек Магии договора' }
  if (pact.used >= pact.max) return { ok: false, reasonRu: 'Нет свободных ячеек Магии договора' }
  return {
    ok: true,
    pact: { ...pact, used: pact.used + 1 },
    featureUsed: 0,
  }
}

/* ------------------------------------------------------------------ */
/* Card buttons / feature id routing                                   */
/* ------------------------------------------------------------------ */

/** Card buttons on ClassFeaturesPanel (edition 2024 only). */
export const WARLOCK_2024_CARD_BUTTONS: Record<string, string> = {
  'magical-cunning': 'Восстановить ячейки…',
  magical_cunning: 'Восстановить ячейки…',
  'contact-patron': 'Связаться…',
  contact_patron: 'Связаться…',
  'mystic-arcanum': 'Арканум…',
  mystic_arcanum: 'Арканум…',
  'mystic-arcanum-6': 'Арканум 6…',
  mystic_arcanum_6: 'Арканум 6…',
  'mystic-arcanum-7': 'Арканум 7…',
  mystic_arcanum_7: 'Арканум 7…',
  'mystic-arcanum-8': 'Арканум 8…',
  mystic_arcanum_8: 'Арканум 8…',
  'mystic-arcanum-9': 'Арканум 9…',
  mystic_arcanum_9: 'Арканум 9…',
  'eldritch-master': 'Мастер (правило)',
  eldritch_master: 'Мастер (правило)',
  'steps-of-the-fey': 'Шаг…',
  steps_of_the_fey: 'Шаг…',
  'misty-escape': 'Исчезновение…',
  misty_escape: 'Исчезновение…',
  'beguiling-defenses': 'Защита…',
  beguiling_defenses: 'Защита…',
  'bewitching-magic': 'Завораживающая магия',
  bewitching_magic: 'Завораживающая магия',
  'awakened-mind': 'Телепатия',
  awakened_mind: 'Телепатия',
  'eldritch-hex': 'Сглаз…',
  eldritch_hex: 'Сглаз…',
  'thought-shield': 'Ментальный щит',
  thought_shield: 'Ментальный щит',
  'create-thrall': 'Порабощение…',
  create_thrall: 'Порабощение…',
  'clairvoyant-combatant': 'Провидеть…',
  clairvoyant_combatant: 'Провидеть…',
  'healing-light': 'Лечить…',
  healing_light: 'Лечить…',
  'dark-ones-own-luck': 'Удача…',
  dark_ones_own_luck: 'Удача…',
  'dark-ones-blessing': 'Благословение…',
  dark_ones_blessing: 'Благословение…',
  'fiendish-resilience': 'Устойчивость…',
  fiendish_resilience: 'Устойчивость…',
  'hurl-through-hell': 'Бросок…',
  hurl_through_hell: 'Бросок…',
  'searing-vengeance': 'Возмездие…',
  searing_vengeance: 'Возмездие…',
  'celestial-resilience': 'Стойкость…',
  celestial_resilience: 'Стойкость…',
  'armor-of-shadows': 'Доспех теней…',
  armor_of_shadows: 'Доспех теней…',
  'fiendish-vigor': 'Мощь Исчадия',
  fiendish_vigor: 'Мощь Исчадия',
  'ascendant-step': 'Левитация',
  ascendant_step: 'Левитация',
  'mask-of-many-faces': 'Маскировка',
  mask_of_many_faces: 'Маскировка',
  'master-of-myriad-forms': 'Смена обличия',
  master_of_myriad_forms: 'Смена обличия',
  'misty-visions': 'Безмолвный образ',
  misty_visions: 'Безмолвный образ',
  'one-with-shadows': 'Невидимость',
  one_with_shadows: 'Невидимость',
  'otherworldly-leap': 'Прыжок',
  otherworldly_leap: 'Прыжок',
  'visions-of-distant-realms': 'Магический глаз',
  visions_of_distant_realms: 'Магический глаз',
  'whispers-of-the-grave': 'Разговор с мёртвыми',
  whispers_of_the_grave: 'Разговор с мёртвыми',
  'gift-of-the-depths': 'Подводное дыхание',
  gift_of_the_depths: 'Подводное дыхание',
  'form-of-dread': 'Аватар ужаса…',
  form_of_dread: 'Аватар ужаса…',
  'grave-touched': 'Прикосновение могилы…',
  grave_touched: 'Прикосновение могилы…',
  'necrotic-husk': 'Некротическая оболочка…',
  necrotic_husk: 'Некротическая оболочка…',
  'superior-dread': 'Совершенный ужас',
  superior_dread: 'Совершенный ужас',
  'vestige-power': 'Мощь предтечи',
  vestige_power: 'Мощь предтечи',
  'vestige-recovery': 'Восстановление…',
  vestige_recovery: 'Восстановление…',
  'semblance-of-life': 'Подобие жизни…',
  semblance_of_life: 'Подобие жизни…',
}

const MYSTIC_ARCANUM_ALIAS = /^mystic-arcanum-([6-9])$/

/** Circle encoded in a feature id (`mystic_arcanum_7` → 7). */
export function warlock2024ArcanumCircleFromId(
  featureId: string | null | undefined,
): number | null {
  if (!featureId) return null
  const match = MYSTIC_ARCANUM_ALIAS.exec(featureId.replace(/_/g, '-'))
  return match ? Number(match[1]) : null
}

export function warlock2024UseFeatureId(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.replace(/_/g, '-')
  if (MYSTIC_ARCANUM_ALIAS.test(key)) return MYSTIC_ARCANUM_FEATURE_ID
  const known = new Set([
    'magical-cunning',
    'contact-patron',
    'mystic-arcanum',
    'eldritch-master',
    'steps-of-the-fey',
    'misty-escape',
    'beguiling-defenses',
    'bewitching-magic',
    'awakened-mind',
    'eldritch-hex',
    'thought-shield',
    'create-thrall',
    'clairvoyant-combatant',
    'healing-light',
    'dark-ones-own-luck',
    'dark-ones-blessing',
    'fiendish-resilience',
    'hurl-through-hell',
    'searing-vengeance',
    'celestial-resilience',
    'armor-of-shadows',
    FORM_OF_DREAD_FEATURE_ID,
    'form-of-dread-end',
    'form-of-dread-fear',
    GRAVE_TOUCHED_FEATURE_ID,
    NECROTIC_HUSK_FEATURE_ID,
    SUPERIOR_DREAD_FEATURE_ID,
    VESTIGE_POWER_FEATURE_ID,
    VESTIGE_RECOVERY_FEATURE_ID,
    SEMBLANCE_OF_LIFE_FEATURE_ID,
    ...Object.keys(AT_WILL_INVOCATION_CASTS_2024),
  ])
  return known.has(key) ? key : null
}

/* ------------------------------------------------------------------ */
/* Resource lookup                                                     */
/* ------------------------------------------------------------------ */

export function findWarlockPool2024(
  resources: SheetResource[],
  poolId: string,
  classEntryId?: string,
): SheetResource | null {
  const matches = (row: SheetResource) => parseFeatureResourceId(row.id)?.poolId === poolId
  if (classEntryId) {
    const exact = resources.find((row) => {
      const parsed = parseFeatureResourceId(row.id)
      return parsed?.poolId === poolId && parsed.classEntryId === classEntryId
    })
    if (exact) return exact
  }
  return resources.find(matches) ?? null
}

export function findMagicalCunningResource(resources: SheetResource[]): SheetResource | null {
  return findWarlockPool2024(resources, 'magical_cunning')
}

export function findContactPatronResource(resources: SheetResource[]): SheetResource | null {
  return findWarlockPool2024(resources, 'contact_patron')
}

export function findMysticArcanumResource(
  resources: SheetResource[],
  circle: number,
): SheetResource | null {
  return findWarlockPool2024(resources, `mystic_arcanum_${circle}`)
}

export function findHealingLightResource(resources: SheetResource[]): SheetResource | null {
  return findWarlockPool2024(resources, 'healing_light')
}

/* ------------------------------------------------------------------ */
/* Apply                                                               */
/* ------------------------------------------------------------------ */

export type Warlock2024UseInput = {
  featureId: string
  resourceId: string | null
  resources: SheetResource[]
  classEntryId: string
  warlockLevel: number
  chaMod?: number
  pactSlots: WarlockPactSlots2024
  /** Feature-specific mode: cast/return (arcanum), refreshing/…, recover, on/off. */
  mode?: string | null
  /** Mystic Arcanum circle (6–9) when the card is the generic feature. */
  circle?: number | null
  /** Healing Light dice count. */
  amount?: number
  /** Damage type for Fiendish Resilience. */
  choice?: string | null
  target?: string | null
  featurePicks?: FeaturePicksState | null
}

export type WarlockFeatureUseResult = {
  ok: boolean
  message: string
  resources: SheetResource[]
  /** Present only when the call changed Pact Magic slots. */
  pact_slots?: WarlockPactSlots2024
  featurePicks: FeaturePicksState | null
  concentrationName: string | null
  activeLabels: string[]
  tempHp?: number
  /** Allies' temp HP (Celestial Resilience). */
  allyTempHp?: number
  /** Absolute HP set (Necrotic Husk revival). */
  hpSet?: number
  /** Delta to play.exhaustion (Necrotic Husk). */
  exhaustionDelta?: number
  /** Condition slugs to remove when tracked (Form of Dread clears frightened). */
  conditionsEnded?: string[]
  /** Magical Cunning L6+: restore Divine Power on vestige companion. */
  restoreVestigeDivinePower?: boolean
  /** Vestige Recovery: set vestige companion HP to max. */
  healVestigeCompanion?: boolean
  diceExpression?: string | null
  acNoteRu?: string | null
  restoredPactSlots?: number
}

function normFeatureId(featureId: string): string {
  return featureId.replace(/_/g, '-')
}

function poolRow(input: Warlock2024UseInput, poolId: string): SheetResource | null {
  if (input.resourceId) {
    const byId = input.resources.find((row) => row.id === input.resourceId)
    if (byId && parseFeatureResourceId(byId.id)?.poolId === poolId) return byId
  }
  return findWarlockPool2024(input.resources, poolId, input.classEntryId)
}

function patchRow(
  resources: SheetResource[],
  id: string,
  patch: (row: SheetResource) => SheetResource,
): SheetResource[] {
  return resources.map((row) => (row.id === id ? clampResource(patch(row)) : row))
}

function done(
  input: Warlock2024UseInput,
  message: string,
  extra: Partial<WarlockFeatureUseResult> = {},
): WarlockFeatureUseResult {
  return {
    ok: true,
    message,
    resources: input.resources,
    featurePicks: input.featurePicks ?? null,
    concentrationName: null,
    activeLabels: [],
    ...extra,
  }
}

function refuse(input: Warlock2024UseInput, message: string): WarlockFeatureUseResult {
  return { ...done(input, message), ok: false }
}

function spendOne(
  input: Warlock2024UseInput,
  poolId: string,
  missingRu: string,
  exhaustedRu: string,
): { ok: true; row: SheetResource; resources: SheetResource[] } | { ok: false; result: WarlockFeatureUseResult } {
  const row = poolRow(input, poolId)
  if (!row) return { ok: false, result: refuse(input, missingRu) }
  if (row.used >= row.max) return { ok: false, result: refuse(input, exhaustedRu) }
  return {
    ok: true,
    row,
    resources: patchRow(input.resources, row.id, (item) => ({ ...item, used: item.used + 1 })),
  }
}

function recoverWithPact(
  input: Warlock2024UseInput,
  poolId: string,
  nameRu: string,
): WarlockFeatureUseResult {
  const row = poolRow(input, poolId)
  if (!row) return refuse(input, `Ресурс «${nameRu}» не найден`)
  const recovered = recoverFeatureWithPactSlot2024({ pact: input.pactSlots, featureUsed: row.used })
  if (!recovered.ok) return refuse(input, recovered.reasonRu)
  return done(input, `${nameRu}: использование восстановлено за ячейку Магии договора`, {
    resources: patchRow(input.resources, row.id, (item) => ({
      ...item,
      used: recovered.featureUsed,
    })),
    pact_slots: recovered.pact,
  })
}

function cunning(input: Warlock2024UseInput): WarlockFeatureUseResult {
  const row = poolRow(input, 'magical_cunning')
  if (!row) return refuse(input, 'Ресурс «Магическая искусность» не найден')
  const result = applyMagicalCunning2024({
    warlockLevel: input.warlockLevel,
    pact: input.pactSlots,
    cunningUsed: row.used,
    cunningMax: row.max,
  })
  if (!result.ok) return refuse(input, result.reasonRu)
  const level = Math.max(0, Math.floor(input.warlockLevel))
  const vestigeHook = level >= 6
  const vestigeNote = vestigeHook
    ? ` · ${VESTIGE_POWER_NAME_RU}: «Божественная сила» спутника-предтечи восстановлена (если есть).`
    : ''
  return done(input, `${result.feedLineRu}${vestigeNote}`, {
    resources: patchRow(input.resources, row.id, (item) => ({ ...item, used: item.used + 1 })),
    pact_slots: result.pact,
    restoredPactSlots: result.restored,
    ...(vestigeHook ? { restoreVestigeDivinePower: true } : {}),
  })
}

export function applyWarlock2024FeatureUse(input: Warlock2024UseInput): WarlockFeatureUseResult {
  const fid = warlock2024UseFeatureId(input.featureId) ?? normFeatureId(input.featureId)
  const chaMod = Math.floor(input.chaMod ?? 0)
  const level = Math.max(0, Math.floor(input.warlockLevel))

  const atWill = AT_WILL_INVOCATION_CASTS_2024[fid]

  switch (fid) {
    case 'magical-cunning':
      return cunning(input)

    case 'eldritch-master': {
      if (level < 20) return refuse(input, 'Таинственный мастер доступен с 20 уровня колдуна')
      if (input.mode === 'cunning') return cunning(input)
      return done(
        input,
        'Таинственный мастер: Магическая искусность восстанавливает все потраченные ячейки Магии договора.',
      )
    }

    case 'contact-patron': {
      if (level < 9) return refuse(input, 'Связь с покровителем с 9 уровня колдуна')
      const spent = spendOne(
        input,
        'contact_patron',
        'Ресурс «Связь с покровителем» не найден',
        'Связь с покровителем уже использована (до долгого отдыха)',
      )
      if (!spent.ok) return spent.result
      return done(
        input,
        'Связь с покровителем: «Связь с иным планом» без ячейки и компонентов; спасбросок автоматически успешен.',
        { resources: spent.resources },
      )
    }

    case 'mystic-arcanum': {
      const available = arcanumCirclesForWarlockLevel2024(level)
      const circle =
        input.circle ??
        warlock2024ArcanumCircleFromId(input.featureId) ??
        (available.length === 1 ? available[0]! : null)
      if (circle == null) return refuse(input, 'Выбери круг Таинственного арканума')
      if (!available.includes(circle)) {
        const unlock = arcanumUnlockLevel2024(circle)
        return refuse(
          input,
          unlock
            ? `Арканум ${circle} круга доступен с ${unlock} уровня колдуна`
            : `Нет арканума ${circle} круга`,
        )
      }
      const row = poolRow(input, `mystic_arcanum_${circle}`)
      if (!row) return refuse(input, `Ресурс «Таинственный арканум (${circle} круг)» не найден`)
      if (input.mode === 'return') {
        if (row.used <= 0) return refuse(input, 'Арканум этого круга ещё не потрачен')
        return done(input, `Таинственный арканум ${circle} круга: использование возвращено`, {
          resources: patchRow(input.resources, row.id, (item) => ({
            ...item,
            used: Math.max(0, item.used - 1),
          })),
        })
      }
      if (row.used >= row.max) {
        return refuse(input, `Арканум ${circle} круга уже использован (до долгого отдыха)`)
      }
      return done(
        input,
        `Таинственный арканум ${circle} круга: заклинание выбранного круга без ячейки (раз за долгий отдых)`,
        {
          resources: patchRow(input.resources, row.id, (item) => ({ ...item, used: item.used + 1 })),
        },
      )
    }

    case 'steps-of-the-fey':
    case 'misty-escape': {
      const requested = stepsOfTheFeyModeAlias2024(input.mode)
      const fallback = fid === 'misty-escape' ? 'concealing' : 'refreshing'
      const modeId = requested || fallback
      const mode = STEPS_OF_THE_FEY_MODES_2024.find((row) => row.id === modeId)
      if (!mode) return refuse(input, 'Выбери вариант шага')
      if (fid === 'misty-escape' && level < 6) {
        return refuse(input, 'Туманное исчезновение с 6 уровня колдуна')
      }
      if (level < mode.minLevel) {
        return refuse(input, `«${mode.nameRu}» доступен с ${mode.minLevel} уровня колдуна`)
      }
      const spent = spendOne(
        input,
        'steps_of_the_fey',
        'Ресурс «Шаг феи» не найден',
        'Шаг феи: использования закончились (до долгого отдыха)',
      )
      if (!spent.ok) return spent.result
      const head =
        fid === 'misty-escape'
          ? 'Туманное исчезновение (реакция, «Туманный шаг»)'
          : 'Шаг феи («Туманный шаг» бонусным действием)'
      return done(input, `${head}: ${mode.nameRu} — ${mode.summaryRu}`, {
        resources: spent.resources,
        ...(mode.id === 'refreshing' ? { diceExpression: '1к10' } : {}),
        ...(mode.id === 'terrifying' ? { diceExpression: '2к10' } : {}),
      })
    }

    case 'beguiling-defenses': {
      if (level < 10) return refuse(input, 'Чарующая защита с 10 уровня колдуна')
      if (input.mode === 'recover') return recoverWithPact(input, 'beguiling_defenses', 'Чарующая защита')
      const spent = spendOne(
        input,
        'beguiling_defenses',
        'Ресурс «Чарующая защита» не найден',
        'Чарующая защита уже использована (восстановить: ячейка договора)',
      )
      if (!spent.ok) return spent.result
      return done(
        input,
        'Чарующая защита (реакция): пытающееся очаровать тебя существо делает спас Мдр; при провале очаровано тобой на 1 мин или до получения урона.',
        { resources: spent.resources },
      )
    }

    case 'bewitching-magic':
      if (level < 14) return refuse(input, 'Завораживающая магия с 14 уровня колдуна')
      return done(
        input,
        'Завораживающая магия: после заклинания Очарования или Иллюзии (ячейкой) сотвори «Туманный шаг» без ячейки в рамках того же действия.',
      )

    case 'awakened-mind':
      return done(
        input,
        'Пробуждённый разум: телепатия с существом в 30 фт. (язык не нужен, вы должны видеть друг друга).',
      )

    case 'eldritch-hex':
      if (level < 10) return refuse(input, 'Мистический сглаз с 10 уровня колдуна')
      return done(
        input,
        'Мистический сглаз: «Сглаз» всегда подготовлен; пока цель под «Сглазом», у неё помеха на спасброски выбранной характеристики.',
      )

    case 'thought-shield':
      if (level < 10) return refuse(input, 'Ментальный щит с 10 уровня колдуна')
      return done(
        input,
        'Ментальный щит: мысли закрыты от телепатии/чтения; сопротивление психическому; при получении психического урона атакующий получает столько же.',
      )

    case 'create-thrall':
      if (level < 14) return refuse(input, 'Порабощение с 14 уровня колдуна')
      return done(
        input,
        'Порабощение: «Вызов аберрации» без концентрации на 1 минуту + временные хиты аберрации; доп. психический урон по цели под «Сглазом».',
      )

    case 'clairvoyant-combatant': {
      if (level < 6) return refuse(input, 'Провидящий боец с 6 уровня колдуна')
      if (input.mode === 'recover') {
        return recoverWithPact(input, 'clairvoyant_combatant', 'Провидящий боец')
      }
      const spent = spendOne(
        input,
        'clairvoyant_combatant',
        'Ресурс «Провидящий боец» не найден',
        'Провидящий боец использован (короткий/долгий отдых или ячейка договора)',
      )
      if (!spent.ok) return spent.result
      return done(
        input,
        'Провидящий боец: цель атаки делает спас Мдр; при провале ты атакуешь с преимуществом, а цель — с помехой по тебе.',
        { resources: spent.resources },
      )
    }

    case 'healing-light': {
      const row = poolRow(input, 'healing_light')
      if (!row) return refuse(input, 'Ресурс «Лечащий свет» не найден')
      const left = Math.max(0, row.max - row.used)
      if (left <= 0) return refuse(input, 'Кости Лечащего света закончились (до долгого отдыха)')
      const cap = healingLightMaxDicePerUse2024(chaMod)
      const dice = Math.floor(input.amount ?? 1)
      if (dice < 1) return refuse(input, 'Потрать хотя бы одну кость')
      if (dice > cap) return refuse(input, `За раз не больше ${cap} к6 (мод. Харизмы, мин. 1)`)
      if (dice > left) return refuse(input, `Осталось костей: ${left}`)
      const target = (input.target ?? '').trim()
      return done(
        input,
        `Лечащий свет${target ? ` → ${target}` : ''}: ${dice}к6 хитов (бонусное действие, существо в 60 фт.)`,
        {
          resources: patchRow(input.resources, row.id, (item) => ({
            ...item,
            used: item.used + dice,
          })),
          diceExpression: `${dice}к6`,
        },
      )
    }

    case 'dark-ones-own-luck': {
      if (level < 6) return refuse(input, 'Удача темнейшего с 6 уровня колдуна')
      const spent = spendOne(
        input,
        'dark_ones_own_luck',
        'Ресурс «Удача темнейшего» не найден',
        'Удача темнейшего: использования закончились (до долгого отдыха)',
      )
      if (!spent.ok) return spent.result
      return done(input, 'Удача темнейшего: +1к10 к проверке характеристики или спасброску.', {
        resources: spent.resources,
        diceExpression: '1к10',
      })
    }

    case 'dark-ones-blessing': {
      const tempHp = darkOnesBlessingTempHp2024({ chaMod, warlockLevel: level })
      return done(input, `Благословение темнейшего: +${tempHp} врем. хитов. ${DARK_ONES_BLESSING_NOTE_RU}.`, {
        tempHp,
      })
    }

    case 'fiendish-resilience': {
      if (level < 10) return refuse(input, 'Устойчивость исчадия с 10 уровня колдуна')
      const type = (input.choice ?? '').trim()
      const row = FIENDISH_RESILIENCE_TYPES_2024.find((item) => item.id === type)
      if (!row) return refuse(input, 'Выбери тип урона (кроме силового)')
      const picks = input.featurePicks ?? { values: {} }
      return done(
        input,
        `Устойчивость исчадия: сопротивление урону «${row.nameRu}» (до смены после отдыха)`,
        {
          featurePicks: setFeaturePick(picks, input.classEntryId, 'fiendish_resilience', row.id),
          activeLabels: [`Сопротивление: ${row.nameRu}`],
        },
      )
    }

    case 'hurl-through-hell': {
      if (level < 14) return refuse(input, 'Бросок через преисподнюю с 14 уровня колдуна')
      if (input.mode === 'recover') {
        return recoverWithPact(input, 'hurl_through_hell', 'Бросок через преисподнюю')
      }
      const spent = spendOne(
        input,
        'hurl_through_hell',
        'Ресурс «Бросок через преисподнюю» не найден',
        'Бросок через преисподнюю использован (восстановить: ячейка договора)',
      )
      if (!spent.ok) return spent.result
      return done(
        input,
        'Бросок через преисподнюю: после попадания цель уходит через Нижние планы; в конце твоего следующего хода возвращается и получает 8к10 психического урона (кроме исчадий).',
        { resources: spent.resources },
      )
    }

    case 'searing-vengeance': {
      if (level < 14) return refuse(input, 'Опаляющее возмездие с 14 уровня колдуна')
      const spent = spendOne(
        input,
        'searing_vengeance',
        'Ресурс «Опаляющее возмездие» не найден',
        'Опаляющее возмездие уже использовано (до долгого отдыха)',
      )
      if (!spent.ok) return spent.result
      return done(
        input,
        'Опаляющее возмездие: вместо спасброска от смерти — хиты до половины максимума; существа в 30 фт. получают 2к8 + мод. Хар. излучения и Ослеплены до конца хода.',
        { resources: spent.resources, diceExpression: '2к8' },
      )
    }

    case 'celestial-resilience': {
      if (level < 10) return refuse(input, 'Небесная стойкость с 10 уровня колдуна')
      const temp = celestialResilienceTempHp2024({ chaMod, warlockLevel: level })
      return done(
        input,
        `Небесная стойкость: ты +${temp.self} врем. хитов, до пяти существ +${temp.allies} (после короткого/долгого отдыха)`,
        { tempHp: temp.self, allyTempHp: temp.allies },
      )
    }

    case 'armor-of-shadows': {
      const picks = input.featurePicks ?? { values: {} }
      const on = getFeaturePick(picks, input.classEntryId, 'armor_of_shadows') === 'on'
      const wantOn = input.mode === 'on' ? true : input.mode === 'off' ? false : !on
      const next = setFeaturePick(picks, input.classEntryId, 'armor_of_shadows', wantOn ? 'on' : null)
      if (!wantOn) {
        return done(input, 'Доспех теней: эффект снят', { featurePicks: next, activeLabels: [] })
      }
      return done(input, 'Доспех теней: «Доспех мага» на себя — КД = 13 + мод. Ловкости (8 ч).', {
        featurePicks: next,
        activeLabels: ['Доспех теней'],
        acNoteRu: 'КД = 13 + мод. Ловкости',
      })
    }

    case 'fiendish-vigor': {
      return done(
        input,
        `Мощь Исчадия: «Псевдожизнь» на себя без ячейки — по максимуму костей (2к4 + 4 → ${FALSE_LIFE_MAX_TEMP_HP_2024} врем. хитов на базовом круге).`,
        { tempHp: FALSE_LIFE_MAX_TEMP_HP_2024 },
      )
    }

    case 'form-of-dread': {
      if (level < 3) return refuse(input, `${FORM_OF_DREAD_NAME_RU} с 3 уровня колдуна`)
      if (input.mode === 'end') {
        const picks = input.featurePicks ?? { values: {} }
        const next = setFeaturePick(picks, input.classEntryId, FORM_OF_DREAD_ACTIVE_PICK, null)
        return done(input, `${FORM_OF_DREAD_NAME_RU}: облик завершён.`, {
          featurePicks: next,
          activeLabels: [],
        })
      }
      if (input.mode === 'fear') {
        const picks = input.featurePicks ?? { values: {} }
        if (getFeaturePick(picks, input.classEntryId, FORM_OF_DREAD_ACTIVE_PICK) !== 'on') {
          return refuse(input, `${FORM_OF_DREAD_NAME_RU} не активен`)
        }
        if (getFeaturePick(picks, input.classEntryId, FORM_OF_DREAD_FEAR_TURN_PICK) === 'on') {
          return refuse(input, 'Ужас аватара уже отмечен в этом ходу')
        }
        const next = setFeaturePick(
          picks,
          input.classEntryId,
          FORM_OF_DREAD_FEAR_TURN_PICK,
          'on',
        )
        return done(
          input,
          `${FORM_OF_DREAD_NAME_RU}: раз за ход — существо в 60 фт., видевшее тебя, делает спас Мдр или пугается до конца твоего следующего хода.`,
          { featurePicks: next },
        )
      }
      const spent = spendOne(
        input,
        FORM_OF_DREAD_POOL_ID,
        `Ресурс «${FORM_OF_DREAD_NAME_RU}» не найден`,
        `${FORM_OF_DREAD_NAME_RU}: использования закончились (до долгого отдыха)`,
      )
      if (!spent.ok) return spent.result
      const d10 = rollDie(10)
      const tempHp = formOfDreadTempHp2024({ warlockLevel: level, d10Roll: d10 })
      let picks = input.featurePicks ?? { values: {} }
      picks = setFeaturePick(picks, input.classEntryId, FORM_OF_DREAD_ACTIVE_PICK, 'on')
      picks = setFeaturePick(picks, input.classEntryId, FORM_OF_DREAD_FEAR_TURN_PICK, null)
      return done(
        input,
        `${FORM_OF_DREAD_NAME_RU}: активирован на 1 минуту · врем. хиты ${tempHp} (1к10+ур. = ${d10}+${level}) · иммунитет к «Испуганный» · снимает «Испуганный», если был.`,
        {
          resources: spent.resources,
          featurePicks: picks,
          tempHp,
          conditionsEnded: ['frightened'],
          activeLabels: [FORM_OF_DREAD_NAME_RU],
          diceExpression: '1к10',
        },
      )
    }

    case 'form-of-dread-end': {
      const picks = input.featurePicks ?? { values: {} }
      const next = setFeaturePick(picks, input.classEntryId, FORM_OF_DREAD_ACTIVE_PICK, null)
      return done(input, `${FORM_OF_DREAD_NAME_RU}: облик завершён.`, {
        featurePicks: next,
        activeLabels: [],
      })
    }

    case 'form-of-dread-fear': {
      const picks = input.featurePicks ?? { values: {} }
      if (getFeaturePick(picks, input.classEntryId, FORM_OF_DREAD_ACTIVE_PICK) !== 'on') {
        return refuse(input, `${FORM_OF_DREAD_NAME_RU} не активен`)
      }
      if (getFeaturePick(picks, input.classEntryId, FORM_OF_DREAD_FEAR_TURN_PICK) === 'on') {
        return refuse(input, 'Ужас аватара уже отмечен в этом ходу')
      }
      const next = setFeaturePick(picks, input.classEntryId, FORM_OF_DREAD_FEAR_TURN_PICK, 'on')
      return done(
        input,
        `${FORM_OF_DREAD_NAME_RU}: раз за ход — существо в 60 фт. делает спас Мдр или пугается.`,
        { featurePicks: next },
      )
    }

    case 'grave-touched': {
      if (level < 6) return refuse(input, `${GRAVE_TOUCHED_NAME_RU} с 6 уровня колдуна`)
      const picks = input.featurePicks ?? { values: {} }
      if (input.mode === 'extra-die') {
        if (getFeaturePick(picks, input.classEntryId, GRAVE_TOUCHED_EXTRA_DIE_TURN_PICK) === 'on') {
          return refuse(input, 'Доп. кость «Прикосновения могилы» уже отмечена в этом ходу')
        }
        const next = setFeaturePick(
          picks,
          input.classEntryId,
          GRAVE_TOUCHED_EXTRA_DIE_TURN_PICK,
          'on',
        )
        return done(
          input,
          `${GRAVE_TOUCHED_NAME_RU}: раз за ход — +1к8 некротического урона к одной атаке.`,
          { featurePicks: next, diceExpression: '1к8' },
        )
      }
      if (getFeaturePick(picks, input.classEntryId, GRAVE_TOUCHED_DAMAGE_SWAP_TURN_PICK) === 'on') {
        return refuse(input, 'Смена типа урона уже отмечена в этом ходу')
      }
      const next = setFeaturePick(
        picks,
        input.classEntryId,
        GRAVE_TOUCHED_DAMAGE_SWAP_TURN_PICK,
        'on',
      )
      return done(
        input,
        `${GRAVE_TOUCHED_NAME_RU}: раз за ход — один бросок урона атаки или заклинания становится некротическим.`,
        { featurePicks: next },
      )
    }

    case 'necrotic-husk': {
      if (level < 10) return refuse(input, `${NECROTIC_HUSK_NAME_RU} с 10 уровня колдуна`)
      const spent = spendOne(
        input,
        NECROTIC_HUSK_POOL_ID,
        `Ресурс «${NECROTIC_HUSK_NAME_RU}» не найден`,
        `${NECROTIC_HUSK_NAME_RU} уже использована (до короткого/долгого отдыха)`,
      )
      if (!spent.ok) return spent.result
      const hp = necroticHuskHp2024(level)
      const dice = necroticHuskDamageDice2024()
      return done(
        input,
        `${NECROTIC_HUSK_NAME_RU}: вместо падения на 0 — хиты ${hp} (2×ур.); эманация ${dice} некротического (спас Тел); +1 истощение.`,
        {
          resources: spent.resources,
          hpSet: hp,
          exhaustionDelta: 1,
          diceExpression: dice,
        },
      )
    }

    case 'superior-dread': {
      if (level < 14) return refuse(input, `${SUPERIOR_DREAD_NAME_RU} с 14 уровня колдуна`)
      return done(
        input,
        `${SUPERIOR_DREAD_NAME_RU} (пассивно): пока «${FORM_OF_DREAD_NAME_RU}» активен — полёт, сопротивление некротическому, и доп. эффекты аватара (см. карточку).`,
      )
    }

    case 'vestige-power': {
      if (level < 6) return refuse(input, `${VESTIGE_POWER_NAME_RU} с 6 уровня колдуна`)
      return done(
        input,
        `${VESTIGE_POWER_NAME_RU}: «Божественная сила» спутника-предтечи восстанавливается коротким отдыхом и «Магической искусностью».`,
        { restoreVestigeDivinePower: true },
      )
    }

    case 'vestige-recovery': {
      if (level < 10) return refuse(input, `${VESTIGE_RECOVERY_NAME_RU} с 10 уровня колдуна`)
      const spent = spendOne(
        input,
        VESTIGE_RECOVERY_POOL_ID,
        `Ресурс «${VESTIGE_RECOVERY_NAME_RU}» не найден`,
        `${VESTIGE_RECOVERY_NAME_RU} уже использовано (до долгого отдыха)`,
      )
      if (!spent.ok) return spent.result
      const pact = input.pactSlots
      if (!pact || pact.max <= 0) return refuse(input, 'Нет ячеек Магии договора')
      if (pact.used >= pact.max) return refuse(input, 'Нет свободных ячеек Магии договора')
      return done(
        input,
        `${VESTIGE_RECOVERY_NAME_RU}: потрачена 1 ячейка договора — спутник-предтеча полностью исцелён и телепортируется к тебе (или наоборот, по правилу).`,
        {
          resources: spent.resources,
          pact_slots: { ...pact, used: pact.used + 1 },
          healVestigeCompanion: true,
        },
      )
    }

    case 'semblance-of-life': {
      if (level < 14) return refuse(input, `${SEMBLANCE_OF_LIFE_NAME_RU} с 14 уровня колдуна`)
      const spent = spendOne(
        input,
        SEMBLANCE_OF_LIFE_POOL_ID,
        `Ресурс «${SEMBLANCE_OF_LIFE_NAME_RU}» не найден`,
        `${SEMBLANCE_OF_LIFE_NAME_RU} уже использовано (до долгого отдыха)`,
      )
      if (!spent.ok) return spent.result
      const circle = semblanceSpellLevel2024(level)
      return done(
        input,
        `${SEMBLANCE_OF_LIFE_NAME_RU}: дух-предтеча в облике заклинания ${circle} круга (½ ур. колдуна) — отметьте на столе.`,
        { resources: spent.resources },
      )
    }

    default: {
      if (atWill) {
        return done(
          input,
          `${atWill.nameRu}: «${atWill.spellRu}» ${atWill.noteRu}.`,
        )
      }
      return refuse(input, `Умение «${input.featureId}» не настроено в диалоге 2024`)
    }
  }
}
