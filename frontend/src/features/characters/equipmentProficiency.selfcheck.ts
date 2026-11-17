/**
 * Magic +1 variants must keep PHB base proficiency (wizard light crossbow, fighter longsword).
 * Run: npx tsx src/features/characters/equipmentProficiency.selfcheck.ts
 */
import assert from 'node:assert/strict'
import {
  isWeaponProficient,
  resolveWeaponCategory,
  stripMagicBonusSuffix,
} from './equipmentProficiency'
import { buildAttackBonusParts } from './attackBonusBreakdown'

assert.equal(stripMagicBonusSuffix('Лёгкий арбалет +1'), 'Лёгкий арбалет')
assert.equal(stripMagicBonusSuffix('Длинный меч +1'), 'Длинный меч')

assert.equal(
  resolveWeaponCategory({ name: 'Лёгкий арбалет +1' }),
  'simple',
  'crossbow +1 is simple',
)
assert.equal(
  resolveWeaponCategory({
    name: 'Оружие +1',
    baseWeaponSlug: 'crossbow_light',
  }),
  'simple',
  'weapon_1 + crossbow_light via slug',
)
assert.equal(
  resolveWeaponCategory({ name: 'Длинный меч +1' }),
  'martial',
  'longsword +1 is martial',
)

const wizardWeapons = { simple: true, martial: false, extras: [] as string[] }
const fighterWeapons = { simple: true, martial: true, extras: [] as string[] }

assert.equal(
  isWeaponProficient({ name: 'Лёгкий арбалет +1', weapons: wizardWeapons }),
  true,
  'wizard proficient with light crossbow +1',
)
assert.equal(
  isWeaponProficient({
    name: 'Оружие +1',
    weapons: wizardWeapons,
    baseWeaponSlug: 'crossbow_light',
  }),
  true,
  'wizard proficient via base_weapon_slug',
)
assert.equal(
  isWeaponProficient({ name: 'Длинный меч +1', weapons: wizardWeapons }),
  false,
  'wizard not proficient with longsword +1',
)
assert.equal(
  isWeaponProficient({ name: 'Длинный меч +1', weapons: fighterWeapons }),
  true,
  'fighter proficient with longsword +1',
)

// Wizard 5, DEX 10 (+0), PB +3, magic +1 → attack +4
const wizardParts = buildAttackBonusParts({
  abilityKey: 'dex',
  abilityMod: 0,
  proficient: true,
  proficiencyBonus: 3,
  magicBonus: 1,
  styleBonus: 0,
  infusionBonus: 0,
  effectBonus: 0,
})
const wizardTotal = wizardParts.reduce((sum, part) => sum + part.value, 0)
assert.equal(wizardTotal, 4, `wizard crossbow +1 attack expected +4, got ${wizardTotal}`)

// Fighter 3, STR 16 (+3), PB +2, magic +1 → attack +6
const fighterParts = buildAttackBonusParts({
  abilityKey: 'str',
  abilityMod: 3,
  proficient: true,
  proficiencyBonus: 2,
  magicBonus: 1,
  styleBonus: 0,
  infusionBonus: 0,
  effectBonus: 0,
})
const fighterTotal = fighterParts.reduce((sum, part) => sum + part.value, 0)
assert.equal(fighterTotal, 6, `fighter longsword +1 attack expected +6, got ${fighterTotal}`)

import { reconcileDruidStartWeapons } from './classEffects'

const keepSimple = reconcileDruidStartWeapons({
  classGrants: [],
  weapons: { simple: true, martial: false, extras: [] },
})
assert.equal(keepSimple.changed, false, 'empty classGrants must not rewrite weapons')
assert.equal(keepSimple.weapons.simple, true, 'wizard simple proficiency must survive')

console.log('equipmentProficiency.selfcheck: ok')
