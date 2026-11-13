/**
 * Run: npx --yes tsx src/shared/dnd/fightingStyles.selfcheck.ts
 */
import {
  fightingStyleAttackBonus,
  fightingStyleAcBonus,
  fightingStyleDamageBonusFromIds,
  fightingStyleThrownDamageBonusFromIds,
  FIGHTER_FIGHTING_STYLES,
  PALADIN_FIGHTING_STYLES,
  RANGER_FIGHTING_STYLES,
  fightingStyleById,
  isRangedWeaponAttackName,
  unarmedFightingDie,
} from './fightingStyles.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(isRangedWeaponAttackName('Длинный лук'), 'longbow is ranged')
assert(isRangedWeaponAttackName('Легкий арбалет'), 'crossbow is ranged')
assert(!isRangedWeaponAttackName('Короткий меч'), 'shortsword is melee')
assert(!isRangedWeaponAttackName('Метательный топорик'), 'handaxe name not ranged weapon')

assert(
  fightingStyleAttackBonus({ styleId: 'archery', weaponName: 'Длинный лук' }) === 2,
  'archery +2 on longbow',
)
assert(
  fightingStyleAttackBonus({ styleId: 'archery', weaponName: 'Короткий меч' }) === 0,
  'archery 0 on shortsword',
)
assert(
  fightingStyleAttackBonus({ styleId: 'defense', weaponName: 'Длинный лук' }) === 0,
  'defense does not boost attack',
)
assert(
  fightingStyleAcBonus({ styleId: 'defense', wearingArmor: true }) === 1,
  'defense +1 AC',
)
assert(
  fightingStyleDamageBonusFromIds({
    styleIds: ['dueling'],
    oneHandedMelee: true,
    holdingAnotherWeapon: false,
  }) === 2,
  'dueling +2',
)

assert(
  fightingStyleThrownDamageBonusFromIds({
    styleIds: ['thrown_weapon_fighting'],
    weaponName: 'Метательный топорик',
    thrownRanged: true,
  }) === 2,
  'thrown style +2',
)
assert(unarmedFightingDie({ styleIds: ['unarmed_fighting'], holdingWeaponOrShield: false }) === '1d8', 'unarmed d8')
assert(unarmedFightingDie({ styleIds: ['unarmed_fighting'], holdingWeaponOrShield: true }) === '1d6', 'unarmed d6')
assert(fightingStyleById('blessed_warrior')?.nameRu === 'Благословенный воин', 'blessed name')
assert(FIGHTER_FIGHTING_STYLES.includes('interception'), 'fighter interception')
assert(PALADIN_FIGHTING_STYLES.includes('blessed_warrior'), 'paladin blessed')
assert(RANGER_FIGHTING_STYLES.includes('druidic_warrior'), 'ranger druidic kept')

console.log('fightingStyles.selfcheck: ok')
