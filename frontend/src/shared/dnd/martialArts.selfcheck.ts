/** npx tsx src/shared/dnd/martialArts.selfcheck.ts */
import {
  damageDieFaces,
  effectiveMartialArtsDamage,
  isMonkUnarmedAttack,
  isMonkWeapon2024,
  isMonkWeaponName,
  martialArtsDieFromFeatures,
  martialArtsDieFromScales,
  monkAttackAbility,
  resolveMartialArtsDie,
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
// 2014 list unchanged when edition omitted / 2014.
assert(!isMonkWeaponName('Ятаган'), 'scimitar not 2014 monk weapon')
assert(isMonkWeapon2024('Ятаган'), 'scimitar is 2024 Light martial')
assert(isMonkWeaponName('Ятаган', '2024'), 'scimitar via edition gate')
assert(isMonkWeapon2024('Боевой посох'), 'quarterstaff simple melee 2024')
assert(!isMonkWeapon2024('Длинный меч'), 'longsword not Light')
assert(!isMonkWeapon2024('Короткий лук'), 'ranged not monk weapon 2024')

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
assert(
  martialArtsDieFromScales({ 'monk:martial_arts_die': '1d8' }) === '1к8',
  'die from scales normalizes d→к',
)
assert(
  resolveMartialArtsDie({
    features: [{ id: 'martial_arts', scaleValue: null } as UnlockedFeature],
    rulesEdition: '2024',
    scales: { 'monk:martial_arts_die': '1d10' },
  }) === '1к10',
  '2024 falls back to scales',
)
assert(
  resolveMartialArtsDie({
    features: [{ id: 'martial_arts', scaleValue: null } as UnlockedFeature],
    rulesEdition: '2014',
    scales: { 'monk:martial_arts_die': '1d10' },
  }) === null,
  '2014 does not use 2024 scales fallback',
)

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
