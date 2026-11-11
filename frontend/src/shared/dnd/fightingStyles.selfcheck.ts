/**
 * Run: npx --yes tsx src/shared/dnd/fightingStyles.selfcheck.ts
 */
import {
  fightingStyleAttackBonus,
  fightingStyleAcBonus,
  isRangedWeaponAttackName,
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

console.log('fightingStyles.selfcheck: ok')
