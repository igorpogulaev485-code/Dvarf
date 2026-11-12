/** PHB 2014 fighting styles shared by Fighter / Paladin / Ranger / College of Swords. */

export type FightingStyleId =
  | 'archery'
  | 'defense'
  | 'dueling'
  | 'great_weapon_fighting'
  | 'protection'
  | 'two_weapon_fighting'
  | 'druidic_warrior'

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
  druidic_warrior: {
    id: 'druidic_warrior',
    nameRu: 'Воин-друид',
    nameEn: 'Druidic Warrior',
    summaryRu:
      'TCE: два заговора друида как заклинания следопыта (МУД), вне лимита. При новом уровне следопыта можно заменить один.',
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
  'druidic_warrior',
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

/**
 * Archery: +2 to attack rolls with ranged weapons (PHB).
 * Thrown melee (handaxe/javelin as a throw) are not ranged weapons.
 */
const RANGED_WEAPON_NAME_RE =
  /лук|арбалет|пращ|дротик|сеть|blowgun|bow|crossbow|sling|dart|\bnet\b/i

export function isRangedWeaponAttackName(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  return RANGED_WEAPON_NAME_RE.test(trimmed)
}

export function fightingStyleAttackBonus(input: {
  styleId: string | null | undefined
  /** Attack / weapon display name (RU or EN). */
  weaponName: string
  /** Optional catalog flag when known. */
  ranged?: boolean | null
}): number {
  const style = fightingStyleById(input.styleId)
  if (!style || style.id !== 'archery') return 0
  const ranged =
    input.ranged === true ||
    (input.ranged !== false && isRangedWeaponAttackName(input.weaponName))
  return ranged ? 2 : 0
}

/** Highest archery bonus among every style the character already has. */
export function fightingStyleAttackBonusFromIds(input: {
  styleIds: Array<string | null | undefined>
  weaponName: string
  ranged?: boolean | null
}): number {
  let best = 0
  for (const styleId of input.styleIds) {
    best = Math.max(
      best,
      fightingStyleAttackBonus({
        styleId,
        weaponName: input.weaponName,
        ranged: input.ranged,
      }),
    )
  }
  return best
}

/** Defense is +1 AC if any taken style is Defense and armor is worn. */
export function fightingStyleAcBonusFromIds(input: {
  styleIds: Array<string | null | undefined>
  wearingArmor: boolean
}): number {
  if (!input.wearingArmor) return 0
  return input.styleIds.some((id) => id === 'defense') ? 1 : 0
}

/**
 * Dueling: +2 damage when attacking with a one-handed melee weapon while
 * not holding another weapon (shield OK). PHB Fighting Style.
 */
export function fightingStyleDamageBonus(input: {
  styleId: string | null | undefined
  /** Current attack is one-handed melee (not two-handed, not ranged). */
  oneHandedMelee: boolean
  /** Another weapon is also equipped / held (not a shield). */
  holdingAnotherWeapon: boolean
}): number {
  const style = fightingStyleById(input.styleId)
  if (!style || style.id !== 'dueling') return 0
  if (!input.oneHandedMelee) return 0
  if (input.holdingAnotherWeapon) return 0
  return 2
}

export function fightingStyleDamageBonusFromIds(input: {
  styleIds: Array<string | null | undefined>
  oneHandedMelee: boolean
  holdingAnotherWeapon: boolean
}): number {
  let best = 0
  for (const styleId of input.styleIds) {
    best = Math.max(
      best,
      fightingStyleDamageBonus({
        styleId,
        oneHandedMelee: input.oneHandedMelee,
        holdingAnotherWeapon: input.holdingAnotherWeapon,
      }),
    )
  }
  return best
}

/** Count equipped weapons (not shields) for Dueling eligibility. */
export function countEquippedWeapons(
  items: Array<{
    equipped?: boolean
    armor_kind?: string | null
    weapon_grip?: string | null
    name?: string
    wear_slot?: string | null
  }>,
): number {
  let n = 0
  for (const item of items) {
    if (!item.equipped) continue
    if (item.armor_kind === 'shield') continue
    const grip = item.weapon_grip
    if (grip === 'one_hand' || grip === 'two_hand' || grip === 'versatile') {
      n += 1
      continue
    }
    const slot = item.wear_slot
    if (slot === 'held_main' || slot === 'held_off') {
      // Held non-shield without grip still counts if name looks like a weapon.
      if (/меч|топор|кинжал|булав|молот|копь|рапир|секир|дубин|посох|лук|арбалет/i.test(item.name || '')) {
        n += 1
      }
    }
  }
  return n
}
