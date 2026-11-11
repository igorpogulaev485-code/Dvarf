/** npx tsx src/shared/dnd/martialArts.selfcheck.ts */
import {
  damageDieFaces,
  effectiveMartialArtsDamage,
  isMonkUnarmedAttack,
  isMonkWeaponName,
  martialArtsDieFromFeatures,
  monkAttackAbility,
  syncMonkUnarmedAttack,
} from './martialArts'
import type { UnlockedFeature } from './classFeatures'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

assert(isMonkWeaponName('Короткий меч'), 'shortsword is monk weapon')
assert(isMonkWeaponName('Боевой посох'), 'quarterstaff is monk weapon')
assert(!isMonkWeaponName('Длинный меч'), 'longsword is not monk weapon')
assert(!isMonkWeaponName('Палица'), 'greatclub is not monk weapon')

assert(damageDieFaces('1к6') === 6, '1к6 faces')
assert(damageDieFaces('1к10') === 10, '1к10 faces')
assert(
  effectiveMartialArtsDamage({
    weaponDamage: '1к6',
    martialArtsDie: '1к10',
  }) === '1к10',
  'MA die replaces shortsword at L20',
)
assert(
  effectiveMartialArtsDamage({
    weaponDamage: '1к8',
    martialArtsDie: '1к6',
  }) === '1к8',
  'keep better weapon die when MA smaller',
)
assert(
  effectiveMartialArtsDamage({
    weaponDamage: '1к4',
    martialArtsDie: '1к10',
    forceMartialArts: true,
  }) === '1к10',
  'unarmed forces MA die',
)

assert(
  monkAttackAbility({ str: 8, dex: 20, weaponAbility: 'str' }) === 'dex',
  'Dex for unarmed when higher',
)
assert(
  monkAttackAbility({ str: 18, dex: 14, weaponAbility: 'str' }) === 'str',
  'Str when higher',
)

const features = [
  {
    id: 'martial_arts',
    scaleValue: '1к10',
  },
] as UnlockedFeature[]
assert(martialArtsDieFromFeatures(features) === '1к10', 'die from feature')

const synced = syncMonkUnarmedAttack({
  weapons: [{ id: 'w1', name: 'Короткий меч' }],
  martialArtsDie: '1к10',
  str: 8,
  dex: 20,
})
assert(synced.length === 2, 'unarmed card added')
assert(isMonkUnarmedAttack(synced[1]!), 'unarmed id')
assert(
  syncMonkUnarmedAttack({
    weapons: synced,
    martialArtsDie: null,
    str: 8,
    dex: 20,
  }).length === 1,
  'unarmed stripped without MA',
)

console.log('martialArts.selfcheck: ok')
