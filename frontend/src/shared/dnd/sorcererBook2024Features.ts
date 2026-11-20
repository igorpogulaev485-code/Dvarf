/**
 * P24-M02B-sorcerer: FRHoF Spellfire + RTW Shadow book subclass helpers.
 * Callers must branch on rules_edition === '2024'; does not feed the 2014 pack.
 */

export const M02B_SORCERER_BOOK_SLUGS = [
  'sorcerer__spellfire-sorcery',
  'sorcerer__shadow-sorcery',
] as const

export type M02bSorcererBookSlug = (typeof M02B_SORCERER_BOOK_SLUGS)[number]

export function isM02bSorcererBookSubclass(slug: string | null | undefined): boolean {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
  return (M02B_SORCERER_BOOK_SLUGS as readonly string[]).includes(key)
}

export function isSpellfireSorcery2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === 'sorcerer__spellfire-sorcery'
}

export function isShadowSorcery2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === 'sorcerer__shadow-sorcery'
}

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL for this pack)                                    */
/* ------------------------------------------------------------------ */

export const SPELLFIRE_SORCERY_NAME_RU = 'Чародейство чаропламени'
export const SPELLFIRE_BURST_NAME_RU = 'Прорыв чаропламени'
export const SUSTAINING_FLAMES_NAME_RU = 'Поддерживающие огни'
export const RADIANT_FLAME_NAME_RU = 'Сияющее пламя'
export const SPELLFIRE_SPELLS_NAME_RU = 'Заклинания чаропламени'
export const ABSORB_SPELLS_NAME_RU = 'Поглощение заклинаний'
export const HONED_SPELLFIRE_NAME_RU = 'Освоенное чаропламя'
export const CROWN_OF_SPELLFIRE_NAME_RU = 'Корона чаропламени'
export const BURNING_LIFE_NAME_RU = 'Горящая жизнь'
export const SPELLFIRE_FLIGHT_NAME_RU = 'Полёт'
export const SPELL_AVOIDANCE_NAME_RU = 'Избежание заклятий'

export const SHADOW_SORCERY_NAME_RU = 'Теневое чародейство'
export const POWER_OF_SHADOW_NAME_RU = 'Сила тени'
export const EYES_OF_DARKNESS_NAME_RU = 'Глаза тьмы'
export const STRENGTH_OF_THE_GRAVE_NAME_RU = 'Сила могилы'
export const SHADOW_SPELLS_NAME_RU = 'Заклинания теней'
export const BEASTS_OF_ILL_OMEN_NAME_RU = 'Звери дурных знамений'
export const SHADOW_WALK_NAME_RU = 'Хождение по теням'
export const UMBRAL_FORM_NAME_RU = 'Форма абсолютной тени'
export const UMBRAL_RESILIENCE_NAME_RU = 'Теневая устойчивость'
export const INCORPOREAL_MOVEMENT_NAME_RU = 'Бестелесное перемещение'
export const SUMMON_BEAST_SPIRIT_NAME_RU = 'Призыв духа зверя'

export const SPELLFIRE_BURST_FEATURE_ID = 'spellfire-burst'
export const ABSORB_SPELLS_FEATURE_ID = 'absorb-spells'
export const HONED_SPELLFIRE_FEATURE_ID = 'honed-spellfire'
export const CROWN_OF_SPELLFIRE_FEATURE_ID = 'crown-of-spellfire'
export const POWER_OF_SHADOW_FEATURE_ID = 'power-of-shadow'
export const BEASTS_OF_ILL_OMEN_FEATURE_ID = 'beasts-of-ill-omen'
export const SHADOW_WALK_FEATURE_ID = 'shadow-walk'
export const UMBRAL_FORM_FEATURE_ID = 'umbral-form'

/** Resource pool ids (hot bar / once-per-turn gate). */
export const SPELLFIRE_BURST_POOL_ID = 'spellfire_burst'
export const SHADOW_WALK_POOL_ID = 'shadow_walk'
export const SPELLFIRE_BURST_TURN_PICK_KEY = 'spellfire_burst_used_this_turn'

export const RESTORE_SP_COST_BOOK = {
  crownOfSpellfire: 5,
  umbralForm: 6,
  beastsOfIllOmen: 3,
} as const

export const EYES_OF_DARKNESS_DARKVISION_FT = 120
export const EYES_OF_DARKNESS_BLINDSIGHT_FT = 10

export type SpellfireBurstMode = 'sustaining' | 'radiant-fire' | 'radiant-radiant'

export function spellfireBurstDie2024(sorcererLevel: number): '1d4' | '1d8' {
  return sorcererLevel >= 14 ? '1d8' : '1d4'
}

export function spellfireBurstTempHpBonus2024(input: {
  sorcererLevel: number
  chaMod: number
  dieRoll: number
}): number {
  const cha = Math.floor(input.chaMod)
  const roll = Math.max(1, Math.floor(input.dieRoll))
  const levelBonus = input.sorcererLevel >= 14 ? Math.max(0, Math.floor(input.sorcererLevel)) : 0
  return roll + cha + levelBonus
}

export function strengthOfTheGraveHp2024(input: {
  chaMod: number
  sorcererLevel: number
}): number {
  return Math.max(1, Math.floor(input.chaMod) + Math.max(1, Math.floor(input.sorcererLevel)))
}

export function strengthOfTheGraveDc2024(damageTaken: number): number {
  return 5 + Math.max(0, Math.floor(damageTaken))
}

export function burningLifeMaxDice2024(chaMod: number): number {
  return Math.max(1, Math.floor(chaMod))
}

export function rollDie(sides: number): number {
  const n = Math.max(2, Math.floor(sides))
  return 1 + Math.floor(Math.random() * n)
}
