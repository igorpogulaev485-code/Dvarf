/** PHB 2014 fighting styles shared by Fighter / Paladin / Ranger / College of Swords. */

export type FightingStyleId =
  | 'archery'
  | 'defense'
  | 'dueling'
  | 'great_weapon_fighting'
  | 'protection'
  | 'two_weapon_fighting'

export type FightingStyleDef = {
  id: FightingStyleId
  nameRu: string
  nameEn: string
  summaryRu: string
  /** Defense: +1 AC while wearing armor. */
  acBonusWhileArmored?: number
}

export const FIGHTING_STYLES: Record<FightingStyleId, FightingStyleDef> = {
  archery: {
    id: 'archery',
    nameRu: 'Стрельба',
    nameEn: 'Archery',
    summaryRu: '+2 к броскам атаки дальнобойным оружием.',
  },
  defense: {
    id: 'defense',
    nameRu: 'Оборона',
    nameEn: 'Defense',
    summaryRu: '+1 КД, пока носишь доспех.',
    acBonusWhileArmored: 1,
  },
  dueling: {
    id: 'dueling',
    nameRu: 'Дуэлянт',
    nameEn: 'Dueling',
    summaryRu: '+2 урона, когда в одной руке одно оружие ближнего боя (без второго оружия).',
  },
  great_weapon_fighting: {
    id: 'great_weapon_fighting',
    nameRu: 'Сражение большим оружием',
    nameEn: 'Great Weapon Fighting',
    summaryRu: 'При уроне двуручным/универсальным оружием ближнего боя: 1 или 2 на кости урона можно перебросить.',
  },
  protection: {
    id: 'protection',
    nameRu: 'Защита',
    nameEn: 'Protection',
    summaryRu: 'Реакция со щитом: помеха на атаку по союзнику в 5 фт.',
  },
  two_weapon_fighting: {
    id: 'two_weapon_fighting',
    nameRu: 'Сражение двумя оружиями',
    nameEn: 'Two-Weapon Fighting',
    summaryRu: 'К бонусной атаке вторым оружием добавляешь модификатор характеристики.',
  },
}

export const PALADIN_FIGHTING_STYLES: FightingStyleId[] = [
  'defense',
  'dueling',
  'great_weapon_fighting',
  'protection',
]

export const FIGHTER_FIGHTING_STYLES: FightingStyleId[] = [
  'archery',
  'defense',
  'dueling',
  'great_weapon_fighting',
  'protection',
  'two_weapon_fighting',
]

export const RANGER_FIGHTING_STYLES: FightingStyleId[] = [
  'archery',
  'defense',
  'dueling',
  'two_weapon_fighting',
]

/** College of Swords (XGtE). */
export const BARD_SWORDS_FIGHTING_STYLES: FightingStyleId[] = [
  'dueling',
  'two_weapon_fighting',
]

export function fightingStyleById(id: string | null | undefined): FightingStyleDef | null {
  if (!id) return null
  return FIGHTING_STYLES[id as FightingStyleId] ?? null
}

export function fightingStyleAcBonus(input: {
  styleId: string | null | undefined
  wearingArmor: boolean
}): number {
  const style = fightingStyleById(input.styleId)
  if (!style?.acBonusWhileArmored) return 0
  if (!input.wearingArmor) return 0
  return style.acBonusWhileArmored
}
