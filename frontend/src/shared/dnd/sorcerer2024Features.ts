/**
 * Sorcerer 2024 (PHB): Innate Sorcery, Font of Magic, Metamagic limits,
 * Sorcerous Restoration, Sorcery Incarnate, Arcane Apotheosis, subclass helpers.
 *
 * Callers branch on `rules_edition === '2024'`; nothing here feeds the 2014 pack.
 * Names follow next.dnd.su (not short summary_ru cards / not 2014 labels).
 */

import {
  METAMAGIC_2024,
  metamagicById2024,
  metamagicKnownLimit2024,
  type MetamagicDef2024,
} from './edition2024ClassOptions'
import { parseFeatureResourceId } from './featureResources'
import { resolveWildMagicSurge2024, rollD100 } from './wildMagicSurgesSorcerer2024'
import { addFlexibleSpellSlot, clampSlot, type SpellSlotState } from './spells'
import { FLEXIBLE_CASTING_SLOT_COST } from './sorcererMetamagic'
import { clampResource, type SheetResource } from './rest'
import { STACKABLE_METAMAGIC_IDS } from './metamagicCast'
import { setFeaturePick, type FeaturePicksState } from './featurePicks'
import {
  BEASTS_OF_ILL_OMEN_NAME_RU,
  BURNING_LIFE_NAME_RU,
  CROWN_OF_SPELLFIRE_NAME_RU,
  RADIANT_FLAME_NAME_RU,
  RESTORE_SP_COST_BOOK,
  SHADOW_WALK_NAME_RU,
  SPELLFIRE_BURST_NAME_RU,
  STRENGTH_OF_THE_GRAVE_NAME_RU,
  SUMMON_BEAST_SPIRIT_NAME_RU,
  SUSTAINING_FLAMES_NAME_RU,
  UMBRAL_FORM_NAME_RU,
  burningLifeMaxDice2024,
  rollDie,
  spellfireBurstDie2024,
  spellfireBurstTempHpBonus2024,
  strengthOfTheGraveDc2024,
  strengthOfTheGraveHp2024,
} from './sorcererBook2024Features'

export const INNATE_SORCERY_NAME_RU = 'Врождённое чародейство'
export const FONT_OF_MAGIC_NAME_RU = 'Источник магии'
export const METAMAGIC_NAME_RU = 'Метамагия'
export const SORCEROUS_RESTORATION_NAME_RU = 'Чародейское восстановление'
export const SORCERY_INCARNATE_NAME_RU = 'Воплощение чародейства'
export const ARCANE_APOTHEOSIS_NAME_RU = 'Апофеоз чародейства'
export const SPELLCASTING_NAME_RU = 'Сотворение заклинаний'

export const INNATE_SORCERY_FEATURE_ID = 'innate-sorcery'
export const FONT_OF_MAGIC_FEATURE_ID = 'font-of-magic'
export const METAMAGIC_FEATURE_ID = 'metamagic'
export const SORCEROUS_RESTORATION_FEATURE_ID = 'sorcerous-restoration'
export const SORCERY_INCARNATE_FEATURE_ID = 'sorcery-incarnate'
export const ARCANE_APOTHEOSIS_FEATURE_ID = 'arcane-apotheosis'

/** Create-slot cost table (same numbers as 2014 Flexible Casting; min level is 2024). */
export const CREATE_SLOT_COST_2024: Record<number, { cost: number; minSorcererLevel: number }> = {
  1: { cost: 2, minSorcererLevel: 2 },
  2: { cost: 3, minSorcererLevel: 3 },
  3: { cost: 5, minSorcererLevel: 5 },
  4: { cost: 6, minSorcererLevel: 7 },
  5: { cost: 7, minSorcererLevel: 9 },
}

export const RESTORE_SP_COST = {
  dragonWings: 3,
  tranceOfOrder: 5,
  warpingExplosion: 5,
  clockworkCavalcade: 7,
  crownOfSpellfire: 5,
  umbralForm: 6,
} as const

export const REVELATION_OPTIONS_2024 = [
  {
    id: 'aquatic',
    nameRu: 'Адаптация к воде',
    summaryRu: 'Плавание ×2 скорости; дыхание под водой.',
  },
  {
    id: 'flight',
    nameRu: 'Блестящий полёт',
    summaryRu: 'Скорость полёта = скорость; парение.',
  },
  {
    id: 'see-invisible',
    nameRu: 'Видеть невидимое',
    summaryRu: 'Видеть невидимое 60 фт., кроме полного укрытия.',
  },
  {
    id: 'wormlike',
    nameRu: 'Червеобразное перемещение',
    summaryRu: 'Щель в 1 дюйм; 5 фт. чтобы выйти из немагических пут / Схваченный.',
  },
] as const

export const ELEMENTAL_AFFINITY_TYPES_2024 = [
  { id: 'acid', nameRu: 'Кислота' },
  { id: 'fire', nameRu: 'Огонь' },
  { id: 'cold', nameRu: 'Холод' },
  { id: 'lightning', nameRu: 'Электричество' },
  { id: 'poison', nameRu: 'Яд' },
] as const

export type Sorcerer2024Flags = {
  rulesEdition: '2024'
  sorcererLevel: number
  innateSorceryActive: boolean
  hasSorceryIncarnate: boolean
  hasArcaneApotheosis: boolean
  metamagicKnown: string[]
  freeMetamagicThisTurnUsed: boolean
  castLeveledSpellThisTurn: boolean
}

export function isSorcererClassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return key === '' || key === 'sorcerer' || /чародей/.test(key)
}

export function sorcerer2024Context(input: {
  rulesEdition: string | null | undefined
  sorcererLevel: number
  innateSorceryActive?: boolean
  metamagicKnown?: string[]
  freeMetamagicThisTurnUsed?: boolean
  castLeveledSpellThisTurn?: boolean
}): Sorcerer2024Flags | null {
  if (input.rulesEdition !== '2024') return null
  const level = Math.max(0, Math.floor(input.sorcererLevel || 0))
  if (level < 1) return null
  return {
    rulesEdition: '2024',
    sorcererLevel: level,
    innateSorceryActive: Boolean(input.innateSorceryActive),
    hasSorceryIncarnate: level >= 7,
    hasArcaneApotheosis: level >= 20,
    metamagicKnown: [...(input.metamagicKnown ?? [])],
    freeMetamagicThisTurnUsed: Boolean(input.freeMetamagicThisTurnUsed),
    castLeveledSpellThisTurn: Boolean(input.castLeveledSpellThisTurn),
  }
}

export function metamagicPickGainAtLevel2024(level: number): number {
  if (level === 2) return 2
  if (level === 10 || level === 17) return 2
  return 0
}

export function metamagicKnownLimitOrZero(level: number): number {
  return metamagicKnownLimit2024(level)
}

/** How many metamagic options to keep after level-down (player must choose if over). */
export function metamagicTrimNeeded2024(known: string[], newLevel: number): number {
  const cap = metamagicKnownLimit2024(newLevel)
  return Math.max(0, known.length - cap)
}

export function sorceryPointsMax2024(sorcererLevel: number): number {
  const lv = Math.max(0, Math.floor(sorcererLevel || 0))
  return lv >= 2 ? lv : 0
}

/** True for PHB 2024 Draconic Sorcery subclass slugs / names. */
export function isDraconicSorcerySubclass2024(
  subclassSlug: string | null | undefined,
): boolean {
  const key = (subclassSlug ?? '').trim().toLowerCase().replace(/_/g, '-')
  return key.includes('draconic')
}

/**
 * PHB 2024 / next.dnd.su Draconic Resilience HP:
 * +3 at sorcerer 3, then +1 per later sorcerer level → total bonus = sorcerer level.
 */
export function draconicResilienceHpTotal2024(input: {
  sorcererLevel: number
  subclassSlug: string | null | undefined
}): number {
  if (!isDraconicSorcerySubclass2024(input.subclassSlug)) return 0
  const lv = Math.max(0, Math.floor(input.sorcererLevel || 0))
  if (lv < 3) return 0
  return lv
}

/** Incremental HP when sorcerer class level changes (2024 only). */
export function draconicResilienceHpDelta2024(input: {
  newLevel: number
  oldLevel: number
  subclassSlug: string | null | undefined
}): number {
  return (
    draconicResilienceHpTotal2024({
      sorcererLevel: input.newLevel,
      subclassSlug: input.subclassSlug,
    }) -
    draconicResilienceHpTotal2024({
      sorcererLevel: input.oldLevel,
      subclassSlug: input.subclassSlug,
    })
  )
}

export function sorcerousRestorationMaxPoints2024(sorcererLevel: number): number {
  return Math.floor(Math.max(0, sorcererLevel) / 2)
}

export type FontOfMagicResult =
  | { ok: true; feedLineRu: string; sorceryUsed: number; slots: Record<string, SpellSlotState> }
  | { ok: false; reasonRu: string }

export function convertSlotToPoints2024(input: {
  slots: Record<string, SpellSlotState>
  slotLevel: number
  sorceryMax: number
  sorceryUsed: number
}): FontOfMagicResult {
  const level = Math.floor(input.slotLevel)
  if (level < 1 || level > 9) return { ok: false, reasonRu: 'Выбери ячейку 1–9 круга' }
  const key = String(level)
  const current = clampSlot(input.slots[key] ?? { max: 0, used: 0 })
  if (current.max - current.used <= 0) {
    return { ok: false, reasonRu: `Нет свободной ячейки ${level} круга` }
  }
  if (input.sorceryUsed <= 0) {
    return { ok: false, reasonRu: 'Очки чародейства уже полные' }
  }
  const gained = Math.min(level, input.sorceryUsed)
  const clampedUsed = Math.max(0, input.sorceryUsed - gained)
  return {
    ok: true,
    feedLineRu: `Источник магии: ячейка ${level} → +${gained} очк. чародейства`,
    sorceryUsed: clampedUsed,
    slots: {
      ...input.slots,
      [key]: clampSlot({ ...current, used: current.used + 1, flexible: current.flexible }),
    },
  }
}

export function createSlotFromPoints2024(input: {
  slots: Record<string, SpellSlotState>
  slotLevel: number
  sorcererLevel: number
  sorceryMax: number
  sorceryUsed: number
}): FontOfMagicResult {
  const level = Math.floor(input.slotLevel)
  const row = CREATE_SLOT_COST_2024[level]
  if (!row) return { ok: false, reasonRu: 'Создать можно ячейку не выше 5 круга' }
  if (input.sorcererLevel < row.minSorcererLevel) {
    return {
      ok: false,
      reasonRu: `Ячейка ${level} круга доступна с ${row.minSorcererLevel} уровня чародея`,
    }
  }
  const remaining = Math.max(0, input.sorceryMax - input.sorceryUsed)
  if (remaining < row.cost) {
    return { ok: false, reasonRu: `Недостаточно очков (нужно ${row.cost}, есть ${remaining})` }
  }
  const next = addFlexibleSpellSlot(input.slots, level)
  if (!next) return { ok: false, reasonRu: 'Не удалось создать ячейку' }
  return {
    ok: true,
    feedLineRu: `Источник магии: создана ячейка ${level} круга (−${row.cost} очк.; исчезает после долгого отдыха)`,
    sorceryUsed: input.sorceryUsed + row.cost,
    slots: next,
  }
}

export function applySorcerousRestoration2024(input: {
  sorcererLevel: number
  sorceryMax: number
  sorceryUsed: number
  restorationUsed: number
  restorationMax: number
}): { ok: true; pointsRegained: number; sorceryUsed: number; restorationUsed: number; feedLineRu: string } | { ok: false; reasonRu: string } {
  if (input.sorcererLevel < 5) {
    return { ok: false, reasonRu: 'Чародейское восстановление с 5 уровня' }
  }
  if (input.restorationUsed >= input.restorationMax) {
    return { ok: false, reasonRu: 'Чародейское восстановление уже использовано (до долгого отдыха)' }
  }
  if (input.sorceryUsed <= 0) {
    return { ok: false, reasonRu: 'Нет потраченных очков чародейства' }
  }
  const cap = sorcerousRestorationMaxPoints2024(input.sorcererLevel)
  const regain = Math.min(cap, input.sorceryUsed)
  if (regain <= 0) return { ok: false, reasonRu: 'Нечего восстанавливать' }
  return {
    ok: true,
    pointsRegained: regain,
    sorceryUsed: input.sorceryUsed - regain,
    restorationUsed: input.restorationUsed + 1,
    feedLineRu: `Чародейское восстановление: +${regain} очк. (не больше половины уровня = ${cap})`,
  }
}

export type InnateSorceryActivateResult =
  | {
      ok: true
      feedLineRu: string
      innateUsed: number
      sorceryUsed: number
      viaIncarnate: boolean
    }
  | { ok: false; reasonRu: string }

/** Bonus action: spend a use, or 2 SP via Sorcery Incarnate when uses are empty. */
export function activateInnateSorcery2024(input: {
  sorcererLevel: number
  innateMax: number
  innateUsed: number
  innateActive: boolean
  sorceryMax: number
  sorceryUsed: number
}): InnateSorceryActivateResult {
  if (input.innateActive) {
    return { ok: false, reasonRu: 'Врождённое чародейство уже действует' }
  }
  const remainingUses = Math.max(0, input.innateMax - input.innateUsed)
  if (remainingUses > 0) {
    return {
      ok: true,
      viaIncarnate: false,
      innateUsed: input.innateUsed + 1,
      sorceryUsed: input.sorceryUsed,
      feedLineRu:
        'Врождённое чародейство: 1 мин — Сл заклинаний чародея +1; атаки заклинаниями с преимуществом',
    }
  }
  if (input.sorcererLevel < 7) {
    return { ok: false, reasonRu: 'Нет использований Врождённого чародейства' }
  }
  const remainingSp = Math.max(0, input.sorceryMax - input.sorceryUsed)
  if (remainingSp < 2) {
    return {
      ok: false,
      reasonRu: `Воплощение чародейства: нужно 2 очка (есть ${remainingSp})`,
    }
  }
  return {
    ok: true,
    viaIncarnate: true,
    innateUsed: input.innateUsed,
    sorceryUsed: input.sorceryUsed + 2,
    feedLineRu:
      'Воплощение чародейства: Врождённое чародейство за 2 очка (1 мин; до двух метамагий на заклинание)',
  }
}

export function endInnateSorcery2024(): { feedLineRu: string } {
  return { feedLineRu: 'Врождённое чародейство завершено' }
}

export type MetamagicCastSelection2024 = {
  primaryId: string | null
  secondaryId: string | null
  /** Free apotheosis slot consumed for primary or secondary. */
  freeApotheosisOn: 'primary' | 'secondary' | null
  transmutedType?: string | null
}

export type MetamagicCastCheck2024 =
  | {
      ok: true
      cost: number
      applied: string[]
      feedLinesRu: string[]
      freeMetamagicThisTurnUsed: boolean
    }
  | { ok: false; reasonRu: string }

export function maxMetamagicOnCast2024(flags: Sorcerer2024Flags): number {
  if (flags.innateSorceryActive && flags.hasSorceryIncarnate) return 2
  return 1
}

export function resolveMetamagicOnCast2024(input: {
  flags: Sorcerer2024Flags
  selection: MetamagicCastSelection2024
  spell: {
    level: number
    casting_time?: string | null
  }
}): MetamagicCastCheck2024 {
  const { flags, selection, spell } = input
  const ids = [selection.primaryId, selection.secondaryId].filter(Boolean) as string[]
  if (ids.length === 0) {
    return {
      ok: true,
      cost: 0,
      applied: [],
      feedLinesRu: [],
      freeMetamagicThisTurnUsed: flags.freeMetamagicThisTurnUsed,
    }
  }
  const unique = [...new Set(ids)]
  if (unique.length !== ids.length) {
    return { ok: false, reasonRu: 'Нельзя применить один и тот же вариант дважды' }
  }
  const max = maxMetamagicOnCast2024(flags)
  if (unique.length > max) {
    return {
      ok: false,
      reasonRu:
        max === 1
          ? 'На заклинание можно только один вариант метамагии (кроме Усиленного/Ищущего)'
          : 'При Воплощении — не больше двух вариантов метамагии',
    }
  }

  // Stacking: only empowered/seeking may join another when max would otherwise be 1.
  if (unique.length === 2 && max === 1) {
    const [a, b] = unique
    const aStack = STACKABLE_METAMAGIC_IDS.has(a)
    const bStack = STACKABLE_METAMAGIC_IDS.has(b)
    if (!(aStack || bStack)) {
      return {
        ok: false,
        reasonRu: 'Второй вариант разрешён только для Усиленного или Ищущего заклинания',
      }
    }
  }

  let cost = 0
  const feed: string[] = []
  let freeUsed = flags.freeMetamagicThisTurnUsed
  let freeAssigned = false

  for (const id of unique) {
    if (!flags.metamagicKnown.includes(id)) {
      return { ok: false, reasonRu: `Метамагия «${id}» не выбрана` }
    }
    const def = metamagicById2024(id)
    if (!def) return { ok: false, reasonRu: `Неизвестная метамагия: ${id}` }

    if (id === 'quickened') {
      if (flags.castLeveledSpellThisTurn) {
        return {
          ok: false,
          reasonRu: 'Ускоренное нельзя: в этом ходу уже сотворено заклинание 1+ круга',
        }
      }
      const time = (spell.casting_time ?? '').toLowerCase()
      if (!/действ|action/i.test(time) || /бонус|bonus|реакц|reaction/i.test(time)) {
        return { ok: false, reasonRu: 'Ускоренное: нужно время сотворения «действие»' }
      }
    }

    const useFree =
      !freeAssigned &&
      flags.hasArcaneApotheosis &&
      flags.innateSorceryActive &&
      !freeUsed &&
      ((selection.freeApotheosisOn === 'primary' && id === selection.primaryId) ||
        (selection.freeApotheosisOn === 'secondary' && id === selection.secondaryId) ||
        selection.freeApotheosisOn == null)
    if (useFree) {
      freeAssigned = true
      freeUsed = true
      feed.push(`Апофеоз: «${def.nameRu}» без траты очков`)
    } else {
      cost += def.cost
      feed.push(`Метамагия «${def.nameRu}» (−${def.cost})`)
    }
  }

  return {
    ok: true,
    cost,
    applied: unique,
    feedLinesRu: feed,
    freeMetamagicThisTurnUsed: freeUsed,
  }
}

export function listMetamagic2024(): MetamagicDef2024[] {
  return [...METAMAGIC_2024]
}

/** Card buttons on ClassFeaturesPanel (edition 2024 only). */
export const SORCERER_2024_CARD_BUTTONS: Record<string, string> = {
  'innate-sorcery': 'Включить…',
  innate_sorcery: 'Включить…',
  'font-of-magic': 'Очки ↔ ячейки…',
  font_of_magic: 'Очки ↔ ячейки…',
  'sorcerous-restoration': 'Восстановить очки…',
  sorcerous_restoration: 'Восстановить очки…',
  'sorcery-incarnate': 'Воплощение…',
  sorcery_incarnate: 'Воплощение…',
  'arcane-apotheosis': 'Апофеоз (правило)',
  arcane_apotheosis: 'Апофеоз (правило)',
  'telepathic-speech': 'Связь…',
  telepathic_speech: 'Связь…',
  'tides-of-chaos': 'Волны хаоса…',
  tides_of_chaos: 'Волны хаоса…',
  'wild-magic-surge': 'Всплеск…',
  wild_magic_surge: 'Всплеск…',
  'bend-luck': 'Искривление…',
  bend_luck: 'Искривление…',
  'controlled-chaos': 'Контролируемый хаос',
  controlled_chaos: 'Контролируемый хаос',
  'tamed-surge': 'Укрощённый всплеск…',
  tamed_surge: 'Укрощённый всплеск…',
  'restore-balance': 'Восстановить баланс…',
  restore_balance: 'Восстановить баланс…',
  'bastion-of-law': 'Бастион закона…',
  bastion_of_law: 'Бастион закона…',
  'trance-of-order': 'Транс…',
  trance_of_order: 'Транс…',
  'clockwork-cavalcade': 'Кавалькада…',
  clockwork_cavalcade: 'Кавалькада…',
  'revelation-in-flesh': 'Откровение…',
  revelation_in_flesh: 'Откровение…',
  'warping-explosion': 'Искажающий взрыв…',
  warping_explosion: 'Искажающий взрыв…',
  'dragon-wings': 'Крылья…',
  dragon_wings: 'Крылья…',
  'dragon-companion': 'Дракон-спутник…',
  dragon_companion: 'Дракон-спутник…',
  'elemental-affinity': 'Родство со стихией…',
  elemental_affinity: 'Родство со стихией…',
  'psionic-sorcery': 'Псионическое чародейство',
  psionic_sorcery: 'Псионическое чародейство',
  'spellfire-burst': 'Прорыв…',
  spellfire_burst: 'Прорыв…',
  'absorb-spells': 'Поглощение…',
  absorb_spells: 'Поглощение…',
  'crown-of-spellfire': 'Корона…',
  crown_of_spellfire: 'Корона…',
  'power-of-shadow': 'Сила могилы…',
  power_of_shadow: 'Сила могилы…',
  'beasts-of-ill-omen': 'Звери…',
  beasts_of_ill_omen: 'Звери…',
  'shadow-walk': 'Хождение…',
  shadow_walk: 'Хождение…',
  'umbral-form': 'Форма тени…',
  umbral_form: 'Форма тени…',
}

export function sorcerer2024UseFeatureId(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.replace(/_/g, '-')
  const aliases: Record<string, string> = {
    'innate-sorcery': 'innate-sorcery',
    'font-of-magic': 'font-of-magic',
    'sorcerous-restoration': 'sorcerous-restoration',
    'sorcery-incarnate': 'sorcery-incarnate',
    'arcane-apotheosis': 'arcane-apotheosis',
    'telepathic-speech': 'telepathic-speech',
    'tides-of-chaos': 'tides-of-chaos',
    'wild-magic-surge': 'wild-magic-surge',
    'bend-luck': 'bend-luck',
    'tamed-surge': 'tamed-surge',
    'restore-balance': 'restore-balance',
    'bastion-of-law': 'bastion-of-law',
    'trance-of-order': 'trance-of-order',
    'clockwork-cavalcade': 'clockwork-cavalcade',
    'revelation-in-flesh': 'revelation-in-flesh',
    'warping-explosion': 'warping-explosion',
    'dragon-wings': 'dragon-wings',
    'dragon-companion': 'dragon-companion',
    'elemental-affinity': 'elemental-affinity',
    'spellfire-burst': 'spellfire-burst',
    'absorb-spells': 'absorb-spells',
    'crown-of-spellfire': 'crown-of-spellfire',
    'power-of-shadow': 'power-of-shadow',
    'beasts-of-ill-omen': 'beasts-of-ill-omen',
    'shadow-walk': 'shadow-walk',
    'umbral-form': 'umbral-form',
  }
  return aliases[key] ?? null
}

export function restoreFeatureUseWithSorcery2024(input: {
  featureId: string
  featureUsed: number
  sorceryMax: number
  sorceryUsed: number
}): { ok: true; cost: number; sorceryUsed: number; featureUsed: number; feedLineRu: string } | { ok: false; reasonRu: string } {
  const key = input.featureId.replace(/_/g, '-')
  const costs: Record<string, number> = {
    'dragon-wings': RESTORE_SP_COST.dragonWings,
    'trance-of-order': RESTORE_SP_COST.tranceOfOrder,
    'warping-explosion': RESTORE_SP_COST.warpingExplosion,
    'clockwork-cavalcade': RESTORE_SP_COST.clockworkCavalcade,
    'crown-of-spellfire': RESTORE_SP_COST.crownOfSpellfire,
    'umbral-form': RESTORE_SP_COST.umbralForm,
  }
  const cost = costs[key]
  if (cost == null) return { ok: false, reasonRu: 'Это умение нельзя восстановить очками' }
  if (input.featureUsed <= 0) return { ok: false, reasonRu: 'Использование уже доступно' }
  const remaining = Math.max(0, input.sorceryMax - input.sorceryUsed)
  if (remaining < cost) {
    return { ok: false, reasonRu: `Нужно ${cost} очков (есть ${remaining})` }
  }
  return {
    ok: true,
    cost,
    sorceryUsed: input.sorceryUsed + cost,
    featureUsed: Math.max(0, input.featureUsed - 1),
    feedLineRu: `Использование восстановлено за ${cost} очк. чародейства`,
  }
}

export function findSorceryResource(
  resources: SheetResource[],
  poolHints: string[] = ['sorcery_points'],
): SheetResource | null {
  for (const hint of poolHints) {
    const hit = resources.find(
      (r) =>
        parseFeatureResourceId(r.id)?.poolId === hint ||
        r.id.includes(`:${hint}:`) ||
        /очк.*чародей|sorcery/i.test(r.name),
    )
    if (hit) return hit
  }
  return null
}

export function findInnateSorceryResource(resources: SheetResource[]): SheetResource | null {
  return (
    resources.find(
      (r) =>
        parseFeatureResourceId(r.id)?.poolId === 'innate_sorcery_uses' ||
        r.id.includes(':innate_sorcery') ||
        /врождённ.*чародей/i.test(r.name),
    ) ?? null
  )
}

export function findSorcerousRestorationResource(resources: SheetResource[]): SheetResource | null {
  return (
    resources.find(
      (r) =>
        parseFeatureResourceId(r.id)?.poolId === 'sorcerous_restoration' ||
        r.id.includes(':sorcerous_restoration') ||
        /чародейское восстановление/i.test(r.name),
    ) ?? null
  )
}

/** Re-export cost map used by 2014 dialog so 2024 dialog can share UI shape. */
export { FLEXIBLE_CASTING_SLOT_COST }

export type Sorcerer2024UseInput = {
  featureId: string
  resourceId: string | null
  resources: SheetResource[]
  classEntryId: string
  slots: Record<string, SpellSlotState>
  sorcererLevel: number
  /** Current sorcery points pool used count. */
  sorceryUsed: number
  /** Sorcery points max. */
  sorceryMax: number
  mode?: string | null
  slotLevel?: number
  amount?: number
  target?: string | null
  /** Wild surge: pick row by low bound (tamed). */
  chosenSurgeLow?: number | null
  /** Wild surge: controlled chaos — roll twice, pick index. */
  surgePickIndex?: number | null
  surgeRolls?: number[] | null
  /** Revelation in flesh option id. */
  revelationId?: string | null
  elementalType?: string | null
  featurePicks?: FeaturePicksState | null
  /** Innate sorcery currently active on sheet. */
  innateActive?: boolean
  controlledChaos?: boolean
  /** CHA modifier (for Spellfire / Strength of the Grave). */
  chaMod?: number
  /** Book innate overlays: crown / umbral. */
  innateOverlay?: 'none' | 'crown' | 'umbral' | null
  /** Spellfire burst mode. */
  burstMode?: 'sustaining' | 'radiant-fire' | 'radiant-radiant' | null
  /** Beasts of Ill Omen: skip concentration. */
  noConcentration?: boolean
  /** Absorb Spells: target failed Counterspell save. */
  counterspellFailed?: boolean
  /** Strength of the Grave: damage that dropped HP to 0. */
  damageTaken?: number
  /** Crown burning life: number of hit dice to spend. */
  hitDiceCount?: number
}

export type SorcererFeatureUseResult = {
  ok: boolean
  message: string
  resources: SheetResource[]
  slots: Record<string, SpellSlotState> | null
  featurePicks: FeaturePicksState | null
  concentrationName: string | null
  activeLabels: string[]
  spendSlotLevel?: number
  restoreSlotLevel?: number
  innateActive?: boolean
  tempHpGain?: number
  hpSet?: number
  companionSpawn?: {
    template: 'summon_beast'
    nameRu: string
    noConcentration: boolean
    noteRu: string
  } | null
  damageRollRu?: string
  damageReduce?: number
}

function normFeatureId(featureId: string): string {
  return featureId.replace(/_/g, '-')
}

function poolRow(
  input: Sorcerer2024UseInput,
  poolId: string,
): SheetResource | null {
  if (input.resourceId) {
    const byId = input.resources.find((row) => row.id === input.resourceId)
    if (byId) return byId
  }
  return (
    input.resources.find((row) => {
      const parsed = parseFeatureResourceId(row.id)
      return parsed?.poolId === poolId && parsed.classEntryId === input.classEntryId
    }) ??
    input.resources.find((row) => parseFeatureResourceId(row.id)?.poolId === poolId) ??
    null
  )
}

function patchRow(
  resources: SheetResource[],
  id: string,
  patch: (row: SheetResource) => SheetResource,
): SheetResource[] {
  return resources.map((row) => (row.id === id ? clampResource(patch(row)) : row))
}

function patchSorceryUsed(
  resources: SheetResource[],
  classEntryId: string,
  sorceryUsed: number,
): SheetResource[] {
  return resources.map((row) => {
    const parsed = parseFeatureResourceId(row.id)
    if (parsed?.poolId !== 'sorcery_points') return row
    if (parsed.classEntryId !== classEntryId) return row
    return clampResource({ ...row, used: Math.max(0, Math.min(row.max, sorceryUsed)) })
  })
}

function done(
  input: Sorcerer2024UseInput,
  message: string,
  extra: Partial<SorcererFeatureUseResult> = {},
): SorcererFeatureUseResult {
  return {
    ok: true,
    message,
    resources: input.resources,
    slots: null,
    featurePicks: input.featurePicks ?? null,
    concentrationName: null,
    activeLabels: [],
    ...extra,
  }
}

function refuse(input: Sorcerer2024UseInput, message: string): SorcererFeatureUseResult {
  return { ...done(input, message), ok: false }
}

export function applySorcerer2024FeatureUse(
  input: Sorcerer2024UseInput,
): SorcererFeatureUseResult {
  const fid = normFeatureId(input.featureId)
  const slotLevel = Math.floor(input.slotLevel ?? 0)
  const sorceryRow = findSorceryResource(input.resources)
  const sorceryUsed = sorceryRow
    ? sorceryRow.used
    : Math.max(0, input.sorceryUsed)
  const sorceryMax = sorceryRow?.max ?? input.sorceryMax

  switch (fid) {
    case 'innate-sorcery': {
      if (input.mode === 'end') {
        const row = poolRow(input, 'innate_sorcery_uses') ?? findInnateSorceryResource(input.resources)
        let resources = input.resources
        if (row) {
          resources = patchRow(input.resources, row.id, (item) => ({
            ...item,
            activeLabel: undefined,
          }))
        }
        // Clear crown / umbral active labels if present.
        for (const poolId of ['crown_of_spellfire', 'umbral_form']) {
          const overlay = poolRow({ ...input, resources }, poolId)
          if (overlay?.activeLabel) {
            resources = patchRow(resources, overlay.id, (item) => ({
              ...item,
              activeLabel: undefined,
            }))
          }
        }
        return done(input, endInnateSorcery2024().feedLineRu, {
          resources,
          innateActive: false,
          activeLabels: [],
        })
      }
      const row = poolRow(input, 'innate_sorcery_uses') ?? findInnateSorceryResource(input.resources)
      const innateActive = Boolean(row?.activeLabel || input.innateActive)
      const activated = activateInnateSorcery2024({
        sorcererLevel: input.sorcererLevel,
        innateMax: row?.max ?? 2,
        innateUsed: row?.used ?? 0,
        innateActive,
        sorceryMax,
        sorceryUsed,
      })
      if (!activated.ok) return refuse(input, activated.reasonRu)
      let resources = input.resources
      if (row && !activated.viaIncarnate) {
        resources = patchRow(resources, row.id, (item) => ({
          ...item,
          used: activated.innateUsed,
          activeLabel: 'Врождённое чародейство (1 мин)',
        }))
      } else if (row && activated.viaIncarnate) {
        resources = patchRow(resources, row.id, (item) => ({
          ...item,
          activeLabel: 'Врождённое чародейство (1 мин)',
        }))
      }
      resources = patchSorceryUsed(resources, input.classEntryId, activated.sorceryUsed)
      const labels = ['Врождённое чародейство']
      let feed = activated.feedLineRu
      const overlay = input.innateOverlay ?? 'none'
      if (overlay === 'crown') {
        const crown = poolRow({ ...input, resources }, 'crown_of_spellfire')
        if (!crown) return refuse(input, `${CROWN_OF_SPELLFIRE_NAME_RU}: нет ресурса (нужен 18 ур.)`)
        if (crown.used >= crown.max) {
          return refuse(input, `${CROWN_OF_SPELLFIRE_NAME_RU}: использовано до долгого отдыха`)
        }
        resources = patchRow(resources, crown.id, (item) => ({
          ...item,
          used: item.used + 1,
          activeLabel: `${CROWN_OF_SPELLFIRE_NAME_RU} (с Врождённым)`,
        }))
        labels.push(CROWN_OF_SPELLFIRE_NAME_RU, BURNING_LIFE_NAME_RU, 'Полёт 60', 'Избежание заклятий')
        feed = `${feed}. ${CROWN_OF_SPELLFIRE_NAME_RU}: полёт 60 (парение), Горящая жизнь, Избежание заклятий`
      } else if (overlay === 'umbral') {
        const umbral = poolRow({ ...input, resources }, 'umbral_form')
        if (!umbral) return refuse(input, `${UMBRAL_FORM_NAME_RU}: нет ресурса (нужен 18 ур.)`)
        if (umbral.used >= umbral.max) {
          return refuse(input, `${UMBRAL_FORM_NAME_RU}: использовано до долгого отдыха`)
        }
        resources = patchRow(resources, umbral.id, (item) => ({
          ...item,
          used: item.used + 1,
          activeLabel: `${UMBRAL_FORM_NAME_RU} (с Врождённым)`,
        }))
        labels.push(UMBRAL_FORM_NAME_RU, 'Теневая устойчивость', 'Бестелесное перемещение')
        feed = `${feed}. ${UMBRAL_FORM_NAME_RU}: сопротивление (кроме силового/излучения), бестелесное перемещение`
      }
      return done(input, feed, {
        resources,
        innateActive: true,
        activeLabels: labels,
      })
    }

    case 'font-of-magic': {
      if (input.mode === 'convert' || input.mode === 'to-points') {
        const converted = convertSlotToPoints2024({
          slots: input.slots,
          slotLevel,
          sorceryMax,
          sorceryUsed,
        })
        if (!converted.ok) return refuse(input, converted.reasonRu)
        return done(input, converted.feedLineRu, {
          slots: converted.slots,
          resources: patchSorceryUsed(input.resources, input.classEntryId, converted.sorceryUsed),
        })
      }
      const created = createSlotFromPoints2024({
        slots: input.slots,
        slotLevel,
        sorcererLevel: input.sorcererLevel,
        sorceryMax,
        sorceryUsed,
      })
      if (!created.ok) return refuse(input, created.reasonRu)
      return done(input, created.feedLineRu, {
        slots: created.slots,
        resources: patchSorceryUsed(input.resources, input.classEntryId, created.sorceryUsed),
      })
    }

    case 'sorcerous-restoration': {
      const row = poolRow(input, 'sorcerous_restoration') ?? findSorcerousRestorationResource(input.resources)
      const restored = applySorcerousRestoration2024({
        sorcererLevel: input.sorcererLevel,
        sorceryMax,
        sorceryUsed,
        restorationUsed: row?.used ?? 0,
        restorationMax: row?.max ?? 1,
      })
      if (!restored.ok) return refuse(input, restored.reasonRu)
      let resources = patchSorceryUsed(input.resources, input.classEntryId, restored.sorceryUsed)
      if (row) {
        resources = patchRow(resources, row.id, (item) => ({
          ...item,
          used: restored.restorationUsed,
        }))
      }
      return done(input, restored.feedLineRu, { resources })
    }

    case 'wild-magic-surge':
    case 'controlled-chaos': {
      const rolls =
        input.surgeRolls && input.surgeRolls.length > 0
          ? input.surgeRolls
          : undefined
      const controlled = fid === 'controlled-chaos' || Boolean(input.controlledChaos)
      let resolved = resolveWildMagicSurge2024({
        controlledChaos: controlled,
        rolls,
      })
      if (controlled && rolls && rolls.length >= 2 && input.surgePickIndex != null) {
        const pick = rolls[Math.max(0, Math.min(rolls.length - 1, input.surgePickIndex))]!
        resolved = resolveWildMagicSurge2024({ rolls: [pick] })
        resolved = {
          ...resolved,
          feedLineRu: `Контролируемый хаос (${rolls.join(' / ')} → ${pick}): ${resolved.chosen.effectRu}`,
        }
      }
      return done(input, resolved.feedLineRu)
    }

    case 'tamed-surge': {
      const low = input.chosenSurgeLow
      if (low == null) return refuse(input, 'Выбери строку таблицы')
      try {
        const resolved = resolveWildMagicSurge2024({ chosenLow: low })
        return done(input, resolved.feedLineRu)
      } catch (e) {
        return refuse(input, e instanceof Error ? e.message : 'Нельзя выбрать эту строку')
      }
    }

    case 'tides-of-chaos': {
      const row = poolRow(input, 'tides_of_chaos') ?? poolRow(input, 'tides-of-chaos')
      if (!row) return refuse(input, 'Ресурс «Волны хаоса» не найден')
      if (row.used >= row.max) return refuse(input, 'Волны хаоса уже использованы до долгого отдыха')
      return done(input, 'Волны хаоса: отметь преимущество на бросках до применения всплеска.', {
        resources: patchRow(input.resources, row.id, (item) => ({ ...item, used: item.used + 1 })),
      })
    }

    case 'revelation-in-flesh': {
      const option = REVELATION_OPTIONS_2024.find((row) => row.id === input.revelationId)
      if (!option) return refuse(input, 'Выбери вариант откровения')
      const cost = Math.max(1, Math.min(4, Math.floor(input.amount ?? 1)))
      const remaining = Math.max(0, sorceryMax - sorceryUsed)
      if (remaining < cost) {
        return refuse(input, `Нужно ${cost} очк. (есть ${remaining})`)
      }
      return done(
        input,
        `Откровение во плоти: ${option.nameRu} (бонусное действие, 10 мин; −${cost} очк.)`,
        {
          resources: patchSorceryUsed(input.resources, input.classEntryId, sorceryUsed + cost),
          activeLabels: [option.nameRu],
        },
      )
    }

    case 'dragon-wings':
    case 'trance-of-order':
    case 'warping-explosion':
    case 'clockwork-cavalcade': {
      const row = poolRow(input, fid.replace(/-/g, '_')) ?? poolRow(input, fid)
      if (!row) return refuse(input, 'Ресурс умения не найден')
      const restored = restoreFeatureUseWithSorcery2024({
        featureId: fid,
        featureUsed: row.used,
        sorceryMax,
        sorceryUsed,
      })
      if (!restored.ok) return refuse(input, restored.reasonRu)
      return done(input, restored.feedLineRu, {
        resources: patchRow(
          patchSorceryUsed(input.resources, input.classEntryId, restored.sorceryUsed),
          row.id,
          (item) => ({ ...item, used: restored.featureUsed }),
        ),
      })
    }

    case 'elemental-affinity': {
      const type = (input.elementalType ?? '').trim()
      if (!type) return refuse(input, 'Выбери тип стихии')
      const picks = input.featurePicks ?? { values: {} }
      const next = setFeaturePick(picks, input.classEntryId, 'elemental_affinity', type)
      const label =
        ELEMENTAL_AFFINITY_TYPES_2024.find((row) => row.id === type)?.nameRu ?? type
      return done(input, `Родство со стихией: ${label}`, { featurePicks: next })
    }

    case 'telepathic-speech': {
      const row = poolRow(input, 'telepathic_speech') ?? poolRow(input, 'telepathic-speech')
      if (input.mode === 'end') {
        if (!row) return refuse(input, 'Ресурс не найден')
        return done(input, 'Телепатическая речь завершена', {
          resources: patchRow(input.resources, row.id, (item) => ({
            ...item,
            activeLabel: undefined,
          })),
        })
      }
      if (!row) return refuse(input, 'Ресурс не найден')
      if (row.used >= row.max) return refuse(input, 'Использовано до долгого отдыха')
      const target = (input.target ?? '').trim()
      return done(
        input,
        `Телепатическая речь${target ? ` с ${target}` : ''}: одинаково понимаете языки 10 мин.`,
        {
          resources: patchRow(input.resources, row.id, (item) => ({
            ...item,
            used: item.used + 1,
            activeLabel: 'Телепатическая речь',
          })),
          activeLabels: ['Телепатическая речь'],
        },
      )
    }

    case 'bastion-of-law': {
      const cost = Math.max(1, Math.min(5, Math.floor(input.amount ?? 1)))
      const remaining = Math.max(0, sorceryMax - sorceryUsed)
      if (remaining < cost) {
        return refuse(input, `Нужно ${cost} очк. (есть ${remaining})`)
      }
      const target = (input.target ?? '').trim() || 'союзник'
      return done(
        input,
        `Бастион закона для ${target}: 1к8 + ${cost} абля, заряды = очкам (−${cost} очк.)`,
        {
          resources: patchSorceryUsed(input.resources, input.classEntryId, sorceryUsed + cost),
        },
      )
    }

    case 'bend-luck': {
      const cost = Math.max(1, Math.min(2, Math.floor(input.amount ?? 1)))
      const remaining = Math.max(0, sorceryMax - sorceryUsed)
      if (remaining < cost) return refuse(input, `Нужно ${cost} очк. (есть ${remaining})`)
      const target = (input.target ?? '').trim() || 'бросок'
      return done(input, `Искривление удачи (${target}): +/−1к4 за ${cost} очк.`, {
        resources: patchSorceryUsed(input.resources, input.classEntryId, sorceryUsed + cost),
      })
    }

    case 'restore-balance': {
      const row = poolRow(input, 'restore_balance')
      if (!row) return refuse(input, 'Ресурс не найден')
      if (row.used >= row.max) return refuse(input, 'Восстановление баланса использовано')
      return done(input, 'Восстановление баланса: существо перебросит d20 с преимуществом/помехой.', {
        resources: patchRow(input.resources, row.id, (item) => ({ ...item, used: item.used + 1 })),
      })
    }

    case 'arcane-apotheosis':
      return done(
        input,
        'Апофеоз чародейства: при Врождённом чародействе одна метамагия в ход без траты очков (отмечай при касте).',
      )

    case 'sorcery-incarnate':
      return done(
        input,
        'Воплощение чародейства: если нет использований Врождённого чародейства — активируй его за 2 очка (через «Врождённое чародейство»).',
      )

    case 'dragon-companion':
    case 'psionic-sorcery':
      return done(input, 'Отметь эффект вручную на столе — диалог только подсказка.')

    case 'spellfire-burst': {
      const chaMod = Math.floor(input.chaMod ?? 0)
      const mode = input.burstMode ?? input.mode ?? 'sustaining'
      const die = spellfireBurstDie2024(input.sorcererLevel)
      const sides = die === '1d8' ? 8 : 4
      const roll = rollDie(sides)
      if (mode === 'sustaining') {
        const temp = spellfireBurstTempHpBonus2024({
          sorcererLevel: input.sorcererLevel,
          chaMod,
          dieRoll: roll,
        })
        const honed =
          input.sorcererLevel >= 14 ? ` (+ур. ${input.sorcererLevel})` : ''
        return done(
          input,
          `${SPELLFIRE_BURST_NAME_RU} — ${SUSTAINING_FLAMES_NAME_RU}: ${temp} врем. хитов (${die}+Хар${honed}). 1/ход после траты очка.`,
          { tempHpGain: temp, activeLabels: [SPELLFIRE_BURST_NAME_RU] },
        )
      }
      const dtype = mode === 'radiant-radiant' ? 'излучением' : 'огнём'
      return done(
        input,
        `${SPELLFIRE_BURST_NAME_RU} — ${RADIANT_FLAME_NAME_RU}: ${roll} урона ${dtype} (${die}, без атаки/спаса). 1/ход после траты очка.`,
        { damageRollRu: `${roll} ${dtype}`, activeLabels: [SPELLFIRE_BURST_NAME_RU] },
      )
    }

    case 'absorb-spells': {
      if (input.mode === 'restore' || input.counterspellFailed) {
        const gained = rollDie(4)
        const nextUsed = Math.max(0, sorceryUsed - gained)
        return done(
          input,
          `Поглощение заклинаний: цель провалила спас от Контрзаклинания — +${gained} очк. (1к4).`,
          {
            resources: patchSorceryUsed(input.resources, input.classEntryId, nextUsed),
          },
        )
      }
      return done(
        input,
        'Поглощение заклинаний: Контрзаклинание всегда подготовлено. При провале спаса цели — восстановить 1к4 очков.',
      )
    }

    case 'crown-of-spellfire': {
      if (input.mode === 'restore') {
        const row = poolRow(input, 'crown_of_spellfire')
        if (!row) return refuse(input, 'Ресурс не найден')
        const restored = restoreFeatureUseWithSorcery2024({
          featureId: 'crown-of-spellfire',
          featureUsed: row.used,
          sorceryMax,
          sorceryUsed,
        })
        if (!restored.ok) return refuse(input, restored.reasonRu)
        let resources = patchSorceryUsed(
          input.resources,
          input.classEntryId,
          restored.sorceryUsed,
        )
        resources = patchRow(resources, row.id, (item) => ({
          ...item,
          used: restored.featureUsed,
        }))
        return done(input, restored.feedLineRu, { resources })
      }
      if (input.mode === 'burning-life') {
        const maxDice = burningLifeMaxDice2024(input.chaMod ?? 1)
        const count = Math.max(1, Math.min(maxDice, Math.floor(input.hitDiceCount ?? 1)))
        let total = 0
        for (let i = 0; i < count; i += 1) total += rollDie(input.sorcererLevel >= 1 ? 6 : 6)
        return done(
          input,
          `${BURNING_LIFE_NAME_RU}: −${total} урона (${count} кости хитов, макс. ${maxDice}).`,
          { damageReduce: total },
        )
      }
      return done(
        input,
        `${CROWN_OF_SPELLFIRE_NAME_RU}: включите вместе с Врождённым чародейством (или восстановите за ${RESTORE_SP_COST_BOOK.crownOfSpellfire} очк.).`,
      )
    }

    case 'power-of-shadow': {
      if (
        input.mode === 'grave' ||
        input.mode === 'grave-success' ||
        input.mode === 'grave-fail' ||
        input.mode === 'strength-of-the-grave'
      ) {
        const row = poolRow(input, 'power_of_shadow')
        if (!row) return refuse(input, 'Ресурс не найден')
        if (row.used >= row.max) {
          return refuse(input, `${STRENGTH_OF_THE_GRAVE_NAME_RU}: уже использована до долгого отдыха`)
        }
        const damage = Math.max(0, Math.floor(input.damageTaken ?? 0))
        const dc = strengthOfTheGraveDc2024(damage)
        if (input.mode === 'grave-fail') {
          return done(input, `${STRENGTH_OF_THE_GRAVE_NAME_RU}: спас провален (Сл ${dc}).`)
        }
        const hp = strengthOfTheGraveHp2024({
          chaMod: input.chaMod ?? 0,
          sorcererLevel: input.sorcererLevel,
        })
        return done(
          input,
          `${STRENGTH_OF_THE_GRAVE_NAME_RU}: успех против Сл ${dc} — хиты = ${hp} (Хар+ур.).`,
          {
            resources: patchRow(input.resources, row.id, (item) => ({
              ...item,
              used: item.used + 1,
            })),
            hpSet: hp,
          },
        )
      }
      return done(
        input,
        'Сила тени: Глаза тьмы (ТЗ 120, слепое 10, видеть сквозь свою Тьму). Сила могилы — при падении до 0.',
      )
    }

    case 'beasts-of-ill-omen': {
      const cost = RESTORE_SP_COST_BOOK.beastsOfIllOmen
      const remaining = Math.max(0, sorceryMax - sorceryUsed)
      if (remaining < cost) return refuse(input, `Нужно ${cost} очк. (есть ${remaining})`)
      const noConc = Boolean(input.noConcentration || input.mode === 'no-concentration')
      const note = noConc
        ? 'без концентрации, 1 мин; враги с помехой на спас от ваших заклинаний в 5 фт.'
        : 'концентрация; враги с помехой на спас от ваших заклинаний в 5 фт.'
      return done(
        input,
        `${BEASTS_OF_ILL_OMEN_NAME_RU}: ${SUMMON_BEAST_SPIRIT_NAME_RU} (−${cost} очк., ${note})`,
        {
          resources: patchSorceryUsed(input.resources, input.classEntryId, sorceryUsed + cost),
          companionSpawn: {
            template: 'summon_beast',
            nameRu: `${SUMMON_BEAST_SPIRIT_NAME_RU} (тени)`,
            noConcentration: noConc,
            noteRu: note,
          },
          concentrationName: noConc ? null : SUMMON_BEAST_SPIRIT_NAME_RU,
          activeLabels: [BEASTS_OF_ILL_OMEN_NAME_RU],
        },
      )
    }

    case 'shadow-walk': {
      return done(
        input,
        `${SHADOW_WALK_NAME_RU}: бонусным телепорт ≤120 фт. (вы и цель — тусклый свет/темнота).`,
        { activeLabels: [SHADOW_WALK_NAME_RU] },
      )
    }

    case 'umbral-form': {
      if (input.mode === 'restore') {
        const row = poolRow(input, 'umbral_form')
        if (!row) return refuse(input, 'Ресурс не найден')
        const restored = restoreFeatureUseWithSorcery2024({
          featureId: 'umbral-form',
          featureUsed: row.used,
          sorceryMax,
          sorceryUsed,
        })
        if (!restored.ok) return refuse(input, restored.reasonRu)
        let resources = patchSorceryUsed(
          input.resources,
          input.classEntryId,
          restored.sorceryUsed,
        )
        resources = patchRow(resources, row.id, (item) => ({
          ...item,
          used: restored.featureUsed,
        }))
        return done(input, restored.feedLineRu, { resources })
      }
      if (input.mode === 'end') {
        const row = poolRow(input, 'umbral_form')
        if (!row) return refuse(input, 'Ресурс не найден')
        return done(input, `${UMBRAL_FORM_NAME_RU} завершена`, {
          resources: patchRow(input.resources, row.id, (item) => ({
            ...item,
            activeLabel: undefined,
          })),
        })
      }
      return done(
        input,
        `${UMBRAL_FORM_NAME_RU}: включите вместе с Врождённым чародейством (или восстановите за ${RESTORE_SP_COST_BOOK.umbralForm} очк.).`,
      )
    }

    default:
      return refuse(input, `Умение «${input.featureId}» не настроено в диалоге 2024`)
  }
}

export function rollWildMagicSurgePair2024(): number[] {
  return [rollD100(), rollD100()]
}
