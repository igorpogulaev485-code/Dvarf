/**
 * College features that are pure rules (no lobby buff engine).
 * VRGtR spirits, XGE glamour/swords/whispers, TCE eloquence/creation, PHB song of rest.
 */

import { maxSpellLevelForClassAlone } from './casterProgression'
import type { UnlockedFeature } from './classFeatures'
import { proficiencyBonusForTotalLevel } from './classFeatures'

export const MANTLE_CONCENTRATION_ID = 'feature:mantle_of_majesty'
export const MANTLE_COMMAND_SPELL_ID = 'feature-spell:mantle_of_majesty:command'
export const SPIRIT_SESSION_SPELL_PREFIX = 'feature-spell:spirit_session:'
export const PERFORMANCE_ITEM_MARK = 'performance-of-creation'
export const DANCING_ITEM_FEATURE = 'animating_performance'

export function isMantleCommandSpell(spell: { id: string }): boolean {
  return spell.id === MANTLE_COMMAND_SPELL_ID
}

export function isSpiritSessionSpell(spell: { id: string }): boolean {
  return spell.id.startsWith(SPIRIT_SESSION_SPELL_PREFIX)
}

/** VRGtR Spiritual Focus: +1d6 from bard level 6. The die does not become a d8. */
export function spiritualFocusDie(classLevel: number): 6 | null {
  return classLevel >= 6 ? 6 : null
}

export function bardicInspirationDieSides(label: string | null | undefined): number {
  const match = label?.match(/к\s*(\d+)/i)
  const sides = match ? Number(match[1]) : 6
  if (sides === 8 || sides === 10 || sides === 12) return sides
  return 6
}

/** PHB Song of Rest die is on the feature scale (1к6 / 1к8 / 1к10 / 1к12), not the BI die. */
export function songOfRestDie(
  features: Array<Pick<UnlockedFeature, 'id' | 'scaleValue'>>,
): { sides: number; label: string } | null {
  const row = features.find((feature) => feature.id === 'song_of_rest')
  const label = row?.scaleValue?.trim()
  if (!label) return null
  const match = label.match(/(\d+)\s*к\s*(\d+)/i)
  if (!match) return null
  return { sides: Number(match[2]), label }
}

export function hitDieHealWithSong(hitDieHeal: number, songRoll: number | null): number {
  return Math.max(0, Math.floor(hitDieHeal)) + Math.max(0, Math.floor(songRoll ?? 0))
}

/** Silver Tongue: a Persuasion or Deception d20 of 9 or lower is treated as 10 before modifiers. */
export function silverTongueApplies(skillKey: string, hasFeature: boolean): boolean {
  if (!hasFeature) return false
  return skillKey === 'deception' || skillKey === 'persuasion'
}

export type SpiritTale = {
  roll: number
  nameRu: string
  effectRu: string
}

/** Short VRGtR Spirit Tales table (the die is the Bardic Inspiration die). */
export const SPIRIT_TALES: readonly SpiritTale[] = [
  {
    roll: 1,
    nameRu: 'Сказ о хитром звере',
    effectRu: '10 минут: цель может Отходить бонусным действием, скорость ходьбы +10 фт.',
  },
  {
    roll: 2,
    nameRu: 'Сказ о знаменитом дуэлянте',
    effectRu: 'Рукопашная атака заклинанием. Попадание: силовые = две кости вдохновения + Хар.',
  },
  {
    roll: 3,
    nameRu: 'Сказ о любимых друзьях',
    effectRu: 'Цель и существо в 5 фт. получают временные хиты = кость вдохновения + Хар.',
  },
  {
    roll: 4,
    nameRu: 'Сказ о беглеце',
    effectRu: 'Цель реакцией телепортируется на 30 фт. и может взять с собой существ до мод. Хар.',
  },
  {
    roll: 5,
    nameRu: 'Сказ о мстителе',
    effectRu: '1 минута: попавший по цели ближней атакой получает силовые = кость вдохновения.',
  },
  {
    roll: 6,
    nameRu: 'Сказ о путешественнике',
    effectRu: 'Временные хиты = кость + уровень барда. Пока они есть: скорость +10 и +1 КД.',
  },
  {
    roll: 7,
    nameRu: 'Сказ об обольстителе',
    effectRu: 'Спас Мудрости, иначе психический урон = две кости и недееспособность до конца следующего хода.',
  },
  {
    roll: 8,
    nameRu: 'Сказ о фантоме',
    effectRu: 'Невидимость до конца следующего хода или до попадания. При попадании: некротический урон = кость, цель испугана.',
  },
  {
    roll: 9,
    nameRu: 'Сказ о громиле',
    effectRu: 'Существа на выбор в 30 фт.: спас Силы, иначе звук = три кости и сбиты с ног. Успех — половина, без падения.',
  },
  {
    roll: 10,
    nameRu: 'Сказ о драконе',
    effectRu: 'Конус 30 фт.: спас Ловкости, иначе огонь = четыре кости вдохновения.',
  },
  {
    roll: 11,
    nameRu: 'Сказ об ангеле',
    effectRu: 'Лечение = две кости + Хар. Снимает одно: ослепление, глухота, паралич, окаменение или отравление.',
  },
  {
    roll: 12,
    nameRu: 'Сказ о повелителе разума',
    effectRu: 'Подчинение чудовища на 1 минуту без концентрации. Цель автоматически проваливает спас.',
  },
]

export function spiritTaleByRoll(roll: number): SpiritTale | null {
  return SPIRIT_TALES.find((row) => row.roll === roll) ?? null
}

export function formatSpiritTaleToast(input: {
  sides: number
  rolls: number[]
  chosen: SpiritTale
}): string {
  const dice = input.rolls.map((roll) => `${roll}`).join('/')
  return `Сказания извне: (1d${input.sides}: ${dice}) · ${input.chosen.nameRu}. ${input.chosen.effectRu}`
}

/** VRGtR Spirit Session: up to proficiency bonus participants, including the bard. */
export function spiritSessionParticipantCap(characterLevel: number): number {
  return proficiencyBonusForTotalLevel(characterLevel)
}

/**
 * Spell circle is limited by the number of participants and by the circles the bard can cast.
 * School must be divination or necromancy (checked by the caller).
 */
export function spiritSessionMaxSpellLevel(input: {
  participants: number
  bardLevel: number
}): number {
  const cap = maxSpellLevelForClassAlone('full', input.bardLevel)
  const people = Math.max(0, Math.floor(input.participants))
  return Math.max(0, Math.min(cap, people))
}

export function isSpiritSessionSchool(school: string): boolean {
  const key = school.trim().toLowerCase()
  return key === 'divination' || key === 'necromancy' || key === 'прорицание' || key === 'некромантия'
}

/** TCoE Performance of Creation: gp ≤ 20 × bard level until Creative Crescendo removes the cap. */
export function performanceGpCap(bardLevel: number): number | null {
  if (bardLevel >= 14) return null
  return Math.max(0, Math.floor(bardLevel) * 20)
}

export type CreationSize = 'tiny' | 'small' | 'medium' | 'large'

export function performanceSizeAllowed(bardLevel: number, size: CreationSize): boolean {
  if (size === 'large') return bardLevel >= 14
  return size === 'tiny' || size === 'small' || size === 'medium'
}

export function performanceItemCount(bardLevel: number, charismaMod: number): number {
  if (bardLevel < 14) return 1
  return Math.max(2, charismaMod)
}

/** TCoE Dancing Item: one Large-or-smaller object, 1 hour. */
export function dancingItemHp(bardLevel: number): number {
  return 10 + 5 * Math.max(1, Math.floor(bardLevel))
}

export function pack05CustomSpendFeature(featureId: string): boolean {
  return (
    featureId === 'mantle_of_majesty' ||
    featureId === 'spirit_session' ||
    featureId === 'performance_of_creation' ||
    featureId === 'animating_performance' ||
    featureId === 'tales_from_beyond'
  )
}

export function stripSpiritSessionSpells<T extends { id: string }>(known: T[]): T[] {
  return known.filter((spell) => !isSpiritSessionSpell(spell))
}

export function stripMantleCommand<T extends { id: string }>(known: T[]): T[] {
  return known.filter((spell) => !isMantleCommandSpell(spell))
}
