/**
 * P24-M02B-warlock: AU Vestige Patron + RTW Undead book subclass helpers.
 * Callers must branch on rules_edition === '2024'; does not feed the 2014 pack.
 */

import { proficiencyBonusForLevel2024 } from './edition2024Classes'
import { alwaysPreparedForSubclass2024 } from './edition2024Subclasses'

export const M02B_WARLOCK_BOOK_SLUGS = [
  'warlock__vestige-patron',
  'warlock__undead',
] as const

export type M02bWarlockBookSlug = (typeof M02B_WARLOCK_BOOK_SLUGS)[number]

export function isM02bWarlockBookSubclass(slug: string | null | undefined): boolean {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
  return (M02B_WARLOCK_BOOK_SLUGS as readonly string[]).includes(key)
}

export function isVestigePatron2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === 'warlock__vestige-patron'
}

export function isUndeadPatron2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === 'warlock__undead'
}

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL for this pack)                                    */
/* ------------------------------------------------------------------ */

export const VESTIGE_PATRON_NAME_RU = 'Предтеча'
export const UNDEAD_PATRON_NAME_RU = 'Нежить'

export const VESTIGE_SPELLS_NAME_RU = 'Заклинания Предтечи'
export const VESTIGE_COMPANION_NAME_RU = 'Спутник-предтеча'
export const VESTIGE_POWER_NAME_RU = 'Мощь предтечи'
export const VESTIGE_RECOVERY_NAME_RU = 'Восстановление предтечи'
export const SEMBLANCE_OF_LIFE_NAME_RU = 'Подобие жизни'
export const VESTIGE_STRIKE_NAME_RU = 'Удар предтечи'
export const DIVINE_POWER_NAME_RU = 'Божественная сила'

export const UNDEAD_PATRON_SPELLS_NAME_RU = 'Заклинания покровителя-Нежити'
export const FORM_OF_DREAD_NAME_RU = 'Аватар ужаса'
export const GRAVE_TOUCHED_NAME_RU = 'Прикосновение могилы'
export const NECROTIC_HUSK_NAME_RU = 'Некротическая оболочка'
export const SUPERIOR_DREAD_NAME_RU = 'Совершенный ужас'

export const LIFE_IMPRINT_NAME_RU = 'Отпечаток жизни'
export const FEARLESS_FORM_NAME_RU = 'Бесстрашный облик'
export const DREADFUL_AVATAR_NAME_RU = 'Ужасающий аватар'
export const MAGICAL_NECROSIS_NAME_RU = 'Магический некроз'
export const MONSTROUS_NECROSIS_NAME_RU = 'Чудовищный некроз'
export const UNDEAD_ENDURANCE_NAME_RU = 'Выносливость неживых'
export const NECROTIC_RESILIENCE_NAME_RU = 'Некротическая устойчивость'
export const PROFANE_REVIVAL_NAME_RU = 'Нечестивое оживление'
export const DREAD_DEFENSE_NAME_RU = 'Защита ужасом'
export const GHOSTLY_FLIGHT_NAME_RU = 'Призрачный полёт'
export const DEFILED_MAGIC_NAME_RU = 'Осквернённая магия'

export const FORBIDDEN_VESTIGE_ECHO_NAME_RU = 'Спутник-отголосок'
export const FORBIDDEN_FORM_OF_DREAD_2014_NAME_RU = 'Облик ужаса'

/* ------------------------------------------------------------------ */
/* Feature / pool ids                                                  */
/* ------------------------------------------------------------------ */

export const VESTIGE_SPELLS_FEATURE_ID = 'vestige-spells'
export const VESTIGE_COMPANION_FEATURE_ID = 'vestige-companion'
export const VESTIGE_POWER_FEATURE_ID = 'vestige-power'
export const VESTIGE_RECOVERY_FEATURE_ID = 'vestige-recovery'
export const SEMBLANCE_OF_LIFE_FEATURE_ID = 'semblance-of-life'

export const UNDEAD_PATRON_SPELLS_FEATURE_ID = 'undead-patron-spells'
export const FORM_OF_DREAD_FEATURE_ID = 'form-of-dread'
export const GRAVE_TOUCHED_FEATURE_ID = 'grave-touched'
export const NECROTIC_HUSK_FEATURE_ID = 'necrotic-husk'
export const SUPERIOR_DREAD_FEATURE_ID = 'superior-dread'

export const VESTIGE_COMPANION_POOL_ID = 'vestige_companion'
export const VESTIGE_RECOVERY_POOL_ID = 'vestige_recovery'
export const SEMBLANCE_OF_LIFE_POOL_ID = 'semblance_of_life'
export const FORM_OF_DREAD_POOL_ID = 'form_of_dread'
export const NECROTIC_HUSK_POOL_ID = 'necrotic_husk'

export const FORM_OF_DREAD_ACTIVE_PICK = 'form_of_dread_active'
export const FORM_OF_DREAD_FEAR_TURN_PICK = 'form_of_dread_fear_used_this_turn'
export const GRAVE_TOUCHED_DAMAGE_SWAP_TURN_PICK = 'grave_touched_damage_swap_used_this_turn'
export const GRAVE_TOUCHED_EXTRA_DIE_TURN_PICK = 'grave_touched_extra_die_used_this_turn'
export const DIVINE_POWER_USED_PICK = 'vestige_divine_power_used'

/* ------------------------------------------------------------------ */
/* Vestige domain + companion type                                     */
/* ------------------------------------------------------------------ */

export const VESTIGE_DOMAIN_OPTIONS_2024 = [
  { id: 'war', slug: 'cleric__war-domain', nameRu: 'Война' },
  { id: 'life', slug: 'cleric__life-domain', nameRu: 'Жизнь' },
  { id: 'trickery', slug: 'cleric__trickery-domain', nameRu: 'Обман' },
  { id: 'light', slug: 'cleric__light-domain', nameRu: 'Свет' },
] as const

export type VestigeDomain2024 = (typeof VESTIGE_DOMAIN_OPTIONS_2024)[number]['id']

export const VESTIGE_COMPANION_TYPE_OPTIONS_2024 = [
  { id: 'fiend', nameRu: 'Исчадие', damageTypeRu: 'огнём', resistanceRu: 'огонь' },
  { id: 'celestial', nameRu: 'Небожитель', damageTypeRu: 'излучением', resistanceRu: 'излучение' },
  { id: 'undead', nameRu: 'Нежить', damageTypeRu: 'некротическим', resistanceRu: 'некротический' },
] as const

export type VestigeCompanionType2024 = (typeof VESTIGE_COMPANION_TYPE_OPTIONS_2024)[number]['id']

export function isVestigeDomain2024(raw: string | null | undefined): raw is VestigeDomain2024 {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
  return VESTIGE_DOMAIN_OPTIONS_2024.some((row) => row.id === key)
}

export function isVestigeCompanionType2024(
  raw: string | null | undefined,
): raw is VestigeCompanionType2024 {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
  return VESTIGE_COMPANION_TYPE_OPTIONS_2024.some((row) => row.id === key)
}

export function vestigeDomainSlug2024(domain: VestigeDomain2024): string {
  return VESTIGE_DOMAIN_OPTIONS_2024.find((row) => row.id === domain)!.slug
}

export function vestigeDomainLabelRu2024(raw: string | null | undefined): string | null {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
  return VESTIGE_DOMAIN_OPTIONS_2024.find((row) => row.id === key)?.nameRu ?? null
}

export function vestigeCompanionTypeLabelRu2024(raw: string | null | undefined): string | null {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
  return VESTIGE_COMPANION_TYPE_OPTIONS_2024.find((row) => row.id === key)?.nameRu ?? null
}

/** Always-prepared from chosen Cleric domain table (warlock level gates). */
export function vestigeAlwaysPrepared2024(input: {
  warlockLevel: number
  domain: string | null | undefined
}): string[] {
  if (!isVestigeDomain2024(input.domain)) return []
  return alwaysPreparedForSubclass2024(
    vestigeDomainSlug2024(input.domain),
    Math.max(0, Math.floor(input.warlockLevel)),
  )
}

export function undeadAlwaysPrepared2024(warlockLevel: number): string[] {
  return alwaysPreparedForSubclass2024('warlock__undead', Math.max(0, Math.floor(warlockLevel)))
}

/* ------------------------------------------------------------------ */
/* Vestige companion stat block (next.dnd.su / AU)                      */
/* ------------------------------------------------------------------ */

export type VestigeCompanionStats2024 = {
  nameRu: string
  typeRu: string
  ac: number
  initiative: number
  hp: number
  hitDice: number
  speed: string
  speedFly: number
  resistanceRu: string
  attackBonus: number
  strikeDamageDie: string
  strikeDamageBonus: number
  damageTypeRu: string
  divinePowerNoteRu: string
  actionsRu: string
  notesRu: string
}

export function vestigeCompanionStats2024(input: {
  type: VestigeCompanionType2024
  warlockLevel: number
  chaMod: number
  characterLevel: number
  spellAttackBonus?: number
}): VestigeCompanionStats2024 {
  const level = Math.max(1, Math.min(20, Math.floor(input.warlockLevel)))
  const cha = Math.floor(input.chaMod)
  const pb = proficiencyBonusForLevel2024(Math.max(1, input.characterLevel))
  const typeRow = VESTIGE_COMPANION_TYPE_OPTIONS_2024.find((row) => row.id === input.type)!
  const attack =
    input.spellAttackBonus != null
      ? Math.floor(input.spellAttackBonus)
      : pb + cha
  const hp = 4 + level * 4
  const divineByType: Record<VestigeCompanionType2024, string> = {
    fiend:
      'Инфернальная рокировка: вы и предтеча в пределах 60 фт. телепортируетесь, меняясь местами.',
    celestial:
      'Целительное касание: цель восстанавливает 2к8 + мод. Хар. хитов и снимает Оглохший / Ослеплённый / Отравленный.',
    undead:
      'Проклятое воззвание: существо в 30 фт. 1 минуту с помехой атакует вас и предтечу.',
  }
  return {
    nameRu: VESTIGE_COMPANION_NAME_RU,
    typeRu: typeRow.nameRu,
    ac: 13 + cha,
    initiative: 2,
    hp,
    hitDice: level,
    speed: '5 фт., полёт 30 фт. (парит)',
    speedFly: 30,
    resistanceRu: typeRow.resistanceRu,
    attackBonus: attack,
    strikeDamageDie: '1d6',
    strikeDamageBonus: 3 + cha,
    damageTypeRu: typeRow.damageTypeRu,
    divinePowerNoteRu: divineByType[input.type],
    // One attack line (no `;`) so companionAttacks keeps the name «Удар предтечи».
    // Divine Power stays on its own sentence — shown via notes when chips hide raw actions.
    actionsRu:
      `${VESTIGE_STRIKE_NAME_RU} +${attack} 1к6+${3 + cha} ${typeRow.damageTypeRu} (5 фт. или 60 фт.). ` +
      `${DIVINE_POWER_NAME_RU} (1/день): ${divineByType[input.type]}`,
    notesRu:
      `Связь договора: +БВ (${pb}) к проверкам и спасброскам предтечи. ` +
      `Сопротивление: ${typeRow.resistanceRu}. Иммунитеты: Испуганный, Опрокинутый, Очарованный. ` +
      `${DIVINE_POWER_NAME_RU} (1/день): ${divineByType[input.type]}`,
  }
}

export function semblanceSpellLevel2024(warlockLevel: number): number {
  return Math.max(1, Math.min(9, Math.floor(Math.floor(warlockLevel) / 2)))
}

/* ------------------------------------------------------------------ */
/* Form of Dread / Undead formulas                                     */
/* ------------------------------------------------------------------ */

export function formOfDreadUses2024(chaMod: number): number {
  return Math.max(1, Math.floor(chaMod))
}

export function formOfDreadTempHp2024(input: {
  warlockLevel: number
  d10Roll: number
}): number {
  return Math.max(1, Math.floor(input.d10Roll)) + Math.max(1, Math.floor(input.warlockLevel))
}

export function necroticHuskDamageDice2024(): string {
  return '2d10'
}

export function necroticHuskHp2024(warlockLevel: number): number {
  return Math.max(1, Math.floor(warlockLevel) * 2)
}

export function rollDie(sides: number): number {
  const n = Math.max(2, Math.floor(sides))
  return 1 + Math.floor(Math.random() * n)
}

/** Feature gates used by sheet / tests. */
/** Merge Vestige domain into landChoiceByEntryId map (domain id → always-prepared). */
export function mergeVestigeDomainIntoLandChoiceMap2024(input: {
  classes: Array<{ id: string; level?: number; subclass_catalog_id?: string | null; subclass_name?: string | null }>
  subclassSlugByEntryId?: Record<string, string | null | undefined>
  classOptions2024?: { vestige_domain?: string | null } | null
  landChoiceByEntryId?: Record<string, string | null | undefined>
}): Record<string, string | null | undefined> {
  const out: Record<string, string | null | undefined> = {
    ...(input.landChoiceByEntryId || {}),
  }
  const domain = String(input.classOptions2024?.vestige_domain || '')
    .trim()
    .toLowerCase()
  if (!isVestigeDomain2024(domain)) return out
  for (const row of input.classes) {
    const slug = String(
      input.subclassSlugByEntryId?.[row.id] || row.subclass_catalog_id || '',
    )
      .trim()
      .toLowerCase()
    if (!isVestigePatron2024(slug)) continue
    if (Math.max(1, Math.floor(row.level || 1)) < 3) continue
    out[row.id] = domain
  }
  return out
}

export function warlockBookFeatureIdsAtLevel2024(input: {
  subclassSlug: string | null | undefined
  warlockLevel: number
}): string[] {
  const lv = Math.max(0, Math.floor(input.warlockLevel))
  if (isVestigePatron2024(input.subclassSlug)) {
    const out: string[] = []
    if (lv >= 3) out.push(VESTIGE_SPELLS_FEATURE_ID, VESTIGE_COMPANION_FEATURE_ID)
    if (lv >= 6) out.push(VESTIGE_POWER_FEATURE_ID)
    if (lv >= 10) out.push(VESTIGE_RECOVERY_FEATURE_ID)
    if (lv >= 14) out.push(SEMBLANCE_OF_LIFE_FEATURE_ID)
    return out
  }
  if (isUndeadPatron2024(input.subclassSlug)) {
    const out: string[] = []
    if (lv >= 3) out.push(UNDEAD_PATRON_SPELLS_FEATURE_ID, FORM_OF_DREAD_FEATURE_ID)
    if (lv >= 6) out.push(GRAVE_TOUCHED_FEATURE_ID)
    if (lv >= 10) out.push(NECROTIC_HUSK_FEATURE_ID)
    if (lv >= 14) out.push(SUPERIOR_DREAD_FEATURE_ID)
    return out
  }
  return []
}
