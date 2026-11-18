/**
 * P24-M02B-wizard: AU + FRHoF book subclass helpers for rules_edition === '2024'.
 * Does not feed the 2014 pack (callers must branch on edition).
 */

import type { FeatureChoiceDef } from './classFeatures'
import {
  getFeaturePick,
  getFeaturePickList,
  type FeaturePicksState,
} from './featurePicks'
import { parseFeatureResourceId } from './featureResources'
import type { SheetResource } from './rest'
import { clampResource } from './rest'

export const M02B_WIZARD_BOOK_SLUGS = [
  'wizard__conjurer',
  'wizard__enchanter',
  'wizard__necromancer',
  'wizard__transmuter',
  'wizard__bladesinger',
] as const

export type M02bWizardBookSlug = (typeof M02B_WIZARD_BOOK_SLUGS)[number]

export function isM02bWizardBookSubclass(slug: string | null | undefined): boolean {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
  return (M02B_WIZARD_BOOK_SLUGS as readonly string[]).includes(key)
}

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL for this pack)                                    */
/* ------------------------------------------------------------------ */

export const ENCHANTING_CONVERSATIONALIST_NAME_RU = 'Чарующий оратор'
export const TRANSMUTER_STONE_NAME_RU = 'Камень преобразования'
export const TRAINING_IN_WAR_AND_SONG_NAME_RU = 'Учение песни и войны'
export const BLADESONG_NAME_RU = 'Песнь клинка'
export const SONG_OF_DEFENSE_NAME_RU = 'Песнь защиты'
export const SONG_OF_VICTORY_NAME_RU = 'Песнь победы'
export const BENIGN_TRANSPOSITION_NAME_RU = 'Безопасный перенос'
export const HYPNOTIC_PRESENCE_NAME_RU = 'Гипнотизирующее присутствие'
export const UNDEAD_THRALLS_NAME_RU = 'Неживые слуги'

/* ------------------------------------------------------------------ */
/* Feature choice ids                                                  */
/* ------------------------------------------------------------------ */

export const ENCHANTING_CONVERSATIONALIST_FEATURE_ID = 'enchanting-conversationalist'
export const TRAINING_IN_WAR_AND_SONG_FEATURE_ID = 'training-in-war-and-song'
export const TRANSMUTER_STONE_FEATURE_ID = 'transmuter-s-stone'
export const TRANSMUTER_STONE_BENEFIT_PICK_ID = 'transmuter_stone_benefit'
export const TRANSMUTER_STONE_BENEFIT_2_PICK_ID = 'transmuter_stone_benefit_2'

export const ENCHANTER_ORATOR_SKILLS_2024 = ['intimidation', 'deception', 'persuasion'] as const
export const BLADESINGER_WAR_SONG_SKILLS_2024 = [
  'acrobatics',
  'athletics',
  'performance',
  'persuasion',
] as const

export const enchantingConversationalistChoice2024: FeatureChoiceDef = {
  id: ENCHANTING_CONVERSATIONALIST_FEATURE_ID,
  label_ru: ENCHANTING_CONVERSATIONALIST_NAME_RU,
  max_picks: 1,
  options: [...ENCHANTER_ORATOR_SKILLS_2024],
  option_labels_ru: {
    intimidation: 'Запугивание',
    deception: 'Обман',
    persuasion: 'Убеждение',
  },
}

export const trainingInWarAndSongChoice2024: FeatureChoiceDef = {
  id: TRAINING_IN_WAR_AND_SONG_FEATURE_ID,
  label_ru: TRAINING_IN_WAR_AND_SONG_NAME_RU,
  max_picks: 1,
  options: [...BLADESINGER_WAR_SONG_SKILLS_2024],
  option_labels_ru: {
    acrobatics: 'Акробатика',
    athletics: 'Атлетика',
    performance: 'Выступление',
    persuasion: 'Убеждение',
  },
}

/** L3 stone: one benefit. Resistance subtypes are separate options. */
export const TRANSMUTER_STONE_BENEFITS_2024 = [
  'darkvision',
  'speed',
  'resist_acid',
  'resist_cold',
  'resist_fire',
  'resist_lightning',
  'resist_thunder',
  'resist_poison',
] as const

/** L10 potent stone extras. */
export const TRANSMUTER_STONE_POTENT_EXTRA_2024 = [
  'mighty_build',
  'tremorsense',
] as const

export const transmuterStoneBenefitChoice2024: FeatureChoiceDef = {
  id: TRANSMUTER_STONE_BENEFIT_PICK_ID,
  label_ru: TRANSMUTER_STONE_NAME_RU,
  max_picks: 1,
  options: [...TRANSMUTER_STONE_BENEFITS_2024],
  option_labels_ru: {
    darkvision: 'Тёмное зрение 60 фт.',
    speed: 'Скорость +10 фт.',
    resist_acid: 'Сопротивление кислоте',
    resist_cold: 'Сопротивление холоду',
    resist_fire: 'Сопротивление огню',
    resist_lightning: 'Сопротивление электричеству',
    resist_thunder: 'Сопротивление звуку',
    resist_poison: 'Сопротивление яду',
  },
}

export const transmuterStoneBenefit2Choice2024: FeatureChoiceDef = {
  id: TRANSMUTER_STONE_BENEFIT_2_PICK_ID,
  label_ru: `${TRANSMUTER_STONE_NAME_RU} (2-е)`,
  max_picks: 1,
  options: [...TRANSMUTER_STONE_BENEFITS_2024, ...TRANSMUTER_STONE_POTENT_EXTRA_2024],
  option_labels_ru: {
    ...transmuterStoneBenefitChoice2024.option_labels_ru,
    mighty_build: 'Могучее сложение',
    tremorsense: 'Чувство вибрации 30 фт.',
  },
}

export function readEnchantingOratorSkill(
  picks: FeaturePicksState,
  classEntryId: string,
): string | null {
  const raw =
    getFeaturePick(picks, classEntryId, ENCHANTING_CONVERSATIONALIST_FEATURE_ID) ??
    getFeaturePick(picks, classEntryId, 'enchanting_conversationalist')
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
  return (ENCHANTER_ORATOR_SKILLS_2024 as readonly string[]).includes(key) ? key : null
}

export function readBladesingerWarSongSkill(
  picks: FeaturePicksState,
  classEntryId: string,
): string | null {
  const raw =
    getFeaturePick(picks, classEntryId, TRAINING_IN_WAR_AND_SONG_FEATURE_ID) ??
    getFeaturePick(picks, classEntryId, 'training_in_war_and_song')
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
  return (BLADESINGER_WAR_SONG_SKILLS_2024 as readonly string[]).includes(key) ? key : null
}

export function readTransmuterStoneBenefits(
  picks: FeaturePicksState,
  classEntryId: string,
  wizardLevel: number,
): string[] {
  const first =
    getFeaturePick(picks, classEntryId, TRANSMUTER_STONE_BENEFIT_PICK_ID) ??
    getFeaturePick(picks, classEntryId, TRANSMUTER_STONE_FEATURE_ID) ??
    getFeaturePick(picks, classEntryId, 'transmuters_stone')
  const out: string[] = []
  if (first) out.push(String(first).trim())
  if (wizardLevel >= 10) {
    const second = getFeaturePick(picks, classEntryId, TRANSMUTER_STONE_BENEFIT_2_PICK_ID)
    if (second) out.push(String(second).trim())
  }
  return out.filter(Boolean)
}

/** Skill keys granted by book-subclass feature picks (plain proficiency). */
export function wizardBookSkillGrants2024(input: {
  subclassSlug: string | null | undefined
  classEntryId: string
  featurePicks: FeaturePicksState
  wizardLevel: number
}): string[] {
  if (input.wizardLevel < 3) return []
  const slug = String(input.subclassSlug || '')
    .trim()
    .toLowerCase()
  const out: string[] = []
  if (slug === 'wizard__enchanter') {
    const skill = readEnchantingOratorSkill(input.featurePicks, input.classEntryId)
    if (skill) out.push(skill)
  }
  if (slug === 'wizard__bladesinger') {
    const skill = readBladesingerWarSongSkill(input.featurePicks, input.classEntryId)
    if (skill) out.push(skill)
  }
  return out
}

/** INT (min +1) bonus to the orator skill check. */
export function enchantingOratorSkillBonus2024(input: {
  subclassSlug: string | null | undefined
  classEntryId: string
  featurePicks: FeaturePicksState
  wizardLevel: number
  intelligenceScore: number
  skillKey: string
}): number {
  if (input.wizardLevel < 3) return 0
  if (String(input.subclassSlug || '').toLowerCase() !== 'wizard__enchanter') return 0
  const picked = readEnchantingOratorSkill(input.featurePicks, input.classEntryId)
  if (!picked || picked !== input.skillKey) return 0
  const mod = Math.floor((Math.max(1, input.intelligenceScore) - 10) / 2)
  return Math.max(1, mod)
}

/* ------------------------------------------------------------------ */
/* Bladesong 2024 (do not reuse 2014 bladesongBonuses silently)        */
/* ------------------------------------------------------------------ */

export type BladesongBonuses2024 = {
  active: boolean
  ac: number
  speed: number
  concentrationSave: number
  acrobaticsAdvantage: boolean
  /** When active, proficient weapon attacks may use Intelligence. */
  weaponAbility: 'int' | null
}

function resourceByPool(resources: SheetResource[], poolId: string): SheetResource | null {
  return (
    resources.find((row) => parseFeatureResourceId(row.id)?.poolId === poolId) ?? null
  )
}

export function bladesongBonuses2024(input: {
  rulesEdition: string | null | undefined
  subclassSlug: string | null | undefined
  resources: SheetResource[]
  intelligenceScore: number
  wizardLevel: number
}): BladesongBonuses2024 {
  const empty: BladesongBonuses2024 = {
    active: false,
    ac: 0,
    speed: 0,
    concentrationSave: 0,
    acrobaticsAdvantage: false,
    weaponAbility: null,
  }
  if (input.rulesEdition !== '2024') return empty
  if (String(input.subclassSlug || '').toLowerCase() !== 'wizard__bladesinger') return empty
  if (input.wizardLevel < 3) return empty
  const row = resourceByPool(input.resources, 'bladesong')
  if (!row?.activeLabel) return empty
  const mod = Math.floor((Math.max(1, input.intelligenceScore) - 10) / 2)
  const bonus = Math.max(1, mod)
  return {
    active: true,
    ac: bonus,
    speed: 10,
    concentrationSave: bonus,
    acrobaticsAdvantage: true,
    weaponAbility: 'int',
  }
}

/** After Arcane Recovery: restore one spent Bladesong use (2024 only). */
export function regainOneBladesongUse2024(
  resources: SheetResource[],
  classEntryId: string,
): SheetResource[] {
  const row =
    resources.find((item) => {
      const parsed = parseFeatureResourceId(item.id)
      return parsed?.poolId === 'bladesong' && parsed.classEntryId === classEntryId
    }) ?? resources.find((item) => parseFeatureResourceId(item.id)?.poolId === 'bladesong')
  if (!row || row.used <= 0) return resources
  return resources.map((item) =>
    item.id === row.id ? clampResource({ ...item, used: Math.max(0, item.used - 1) }) : item,
  )
}

/** Song of Defense: reduce damage by slotLevel × 5 while Bladesong is active. */
export function songOfDefenseReduce2024(slotLevel: number): number {
  const level = Math.max(1, Math.floor(slotLevel) || 1)
  return level * 5
}

export function isBladesongActive2024(resources: SheetResource[]): boolean {
  return Boolean(resourceByPool(resources, 'bladesong')?.activeLabel)
}

/** Extra Attack (L6): two attacks; one may be a wizard action cantrip. */
export const BLADESINGER_EXTRA_ATTACK_RULE_RU_2024 =
  'Действие Атака — две атаки; вместо одной можно сотворить заговор Волшебника со временем сотворения «действие».'

export const BLADESINGER_SONG_OF_VICTORY_RULE_RU_2024 =
  'После заклинания со временем «действие» — бонусным действием одна атака оружием.'

export const BLADESINGER_WEAPON_FOCUS_RULE_RU_2024 =
  'Рукопашное оружие, которым владеете, считается заклинательной фокусировкой Волшебника.'

/** Equipped non-ranged weapon → arcane focus (Training in War and Song, 2024 only). */
export function markBladesingerMeleeFocusItems2024<
  T extends {
    name: string
    equipped?: boolean
    qty?: number | null
    spell_tooling?: string | null
    focus_kind?: string | null
    armor_kind?: string | null
    weapon_grip?: string | null
  },
>(items: T[], enabled: boolean): T[] {
  if (!enabled) return items
  let changed = false
  const next = items.map((item) => {
    if ((item.qty ?? 1) <= 0) return item
    if (!item.equipped) return item
    if (item.armor_kind && item.armor_kind !== 'none') return item
    if (item.spell_tooling === 'component_pouch') return item
    if (!isBladesingerMeleeWeaponCandidate(item)) return item
    if (item.spell_tooling === 'focus' && item.focus_kind === 'arcane') return item
    changed = true
    return { ...item, spell_tooling: 'focus' as const, focus_kind: 'arcane' as const }
  })
  return changed ? next : items
}

function isBladesingerMeleeWeaponCandidate(item: {
  name: string
  weapon_grip?: string | null
  armor_kind?: string | null
}): boolean {
  if (item.armor_kind === 'shield') return false
  const grip = item.weapon_grip
  const looksHeld = grip === 'one_hand' || grip === 'two_hand'
  // Lazy import avoided: mirror weaponPresets ranged check via name heuristics + grip.
  const name = String(item.name || '').toLowerCase()
  const rangedHint =
    /лук|арбалет|дротик|пращ|сеть|blowgun|bow|crossbow|dart|sling|net|пистолет|ружь/.test(
      name,
    )
  if (rangedHint) return false
  if (looksHeld) return true
  // Fallback: common melee RU names without stored grip.
  return /меч|рапир|кинжал|топор|молот|булав|копь|трезуб|посох|дубин|ятаган|глеф|алебард|морген|кистень|кнут/.test(
    name,
  )
}

/* ------------------------------------------------------------------ */
/* Transmuter stone labels                                             */
/* ------------------------------------------------------------------ */

export function transmuterStoneBenefitLabelRu(id: string): string {
  const map = transmuterStoneBenefit2Choice2024.option_labels_ru ?? {}
  return map[id] ?? id
}

export function listTransmuterStonePicks(
  picks: FeaturePicksState,
  classEntryId: string,
): string[] {
  return getFeaturePickList(picks, classEntryId, TRANSMUTER_STONE_BENEFIT_PICK_ID)
}
