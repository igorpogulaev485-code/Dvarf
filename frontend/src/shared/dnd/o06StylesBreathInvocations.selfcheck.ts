/**
 * O-06 selfcheck: GWF reroll, TWF mod, Protection, breath dice, agonizing beams.
 * Run: npx --yes tsx src/shared/dnd/o06StylesBreathInvocations.selfcheck.ts
 */
import {
  applyGreatWeaponFightingReroll,
  agonizingBlastDamageBonus,
  breathWeaponSaveDc,
  canProtectionReaction,
  canTwoWeaponBonusAttack,
  eldritchBlastBeamCount,
  formatEldritchBlastDamagePreview,
  ftdBreathDiceCount,
  hasFightingStyle,
  isEldritchBlastSpell,
  markTwoWeaponBonusReady,
  phbBreathDiceCount,
  resolveDragonbornAncestryBreath,
  twoWeaponBonusDamageAbilityMod,
  weaponIsLightMelee,
  weaponQualifiesForGreatWeaponFighting,
} from './o06StylesBreathInvocations.ts'
import { emptyTurnEconomy, applyAttackSpend } from './turnEconomy.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// —— O06-1: GWF weapon dice only ——
assert(
  weaponQualifiesForGreatWeaponFighting({ weaponName: 'Двуручный меч' }),
  'greatsword qualifies',
)
assert(
  !weaponQualifiesForGreatWeaponFighting({ weaponName: 'Короткий меч' }),
  'shortsword no GWF',
)
assert(hasFightingStyle(['great_weapon_fighting'], 'great_weapon_fighting'), 'style id')

const gwf = applyGreatWeaponFightingReroll({
  parts: [1, 6],
  sides: 6,
  rng: () => 0.99, // → 6
})
assert(gwf.changed && gwf.parts[0] === 6 && gwf.parts[1] === 6, 'reroll 1→6 keep 6')
assert(gwf.notes.some((n) => n.includes('1→6')), 'note 1→6')

const noGwf = applyGreatWeaponFightingReroll({ parts: [3, 4], sides: 6, rng: () => 0 })
assert(!noGwf.changed, 'no reroll on 3–4')

// —— O06-2: TWF damage mod ——
assert(
  twoWeaponBonusDamageAbilityMod({ abilityMod: 3, hasTwoWeaponFightingStyle: false }) === 0,
  'no style → no +mod',
)
assert(
  twoWeaponBonusDamageAbilityMod({ abilityMod: -1, hasTwoWeaponFightingStyle: false }) === -1,
  'no style → keep negative',
)
assert(
  twoWeaponBonusDamageAbilityMod({ abilityMod: 3, hasTwoWeaponFightingStyle: true }) === 3,
  'style → +mod',
)
assert(weaponIsLightMelee('Короткий меч'), 'shortsword light')
assert(!weaponIsLightMelee('Длинный меч'), 'longsword not light')

let te = applyAttackSpend(emptyTurnEconomy())
te = markTwoWeaponBonusReady(te)
const twfOk = canTwoWeaponBonusAttack(te, {
  hasDualWielder: false,
  heldMelee: [
    { name: 'Короткий меч', light: true, oneHanded: true },
    { name: 'Короткий меч', light: true, oneHanded: true },
  ],
})
assert(twfOk.ok, 'TWF bonus ok with two lights')

const twfLong = canTwoWeaponBonusAttack(te, {
  hasDualWielder: false,
  heldMelee: [
    { name: 'Длинный меч', light: false, oneHanded: true },
    { name: 'Длинный меч', light: false, oneHanded: true },
  ],
})
assert(!twfLong.ok, 'two longswords without dual wielder blocked')

const twfDual = canTwoWeaponBonusAttack(te, {
  hasDualWielder: true,
  heldMelee: [
    { name: 'Длинный меч', light: false, oneHanded: true },
    { name: 'Длинный меч', light: false, oneHanded: true },
  ],
})
assert(twfDual.ok, 'dual wielder allows longswords')

// —— O06-3: Protection ——
const prot = canProtectionReaction(emptyTurnEconomy(), {
  hasProtectionStyle: true,
  shieldInHand: true,
})
assert(prot.ok, 'protection ok')
assert(
  !canProtectionReaction(emptyTurnEconomy(), {
    hasProtectionStyle: true,
    shieldInHand: false,
  }).ok,
  'no shield',
)

// —— O06-4: Breath ——
const red = resolveDragonbornAncestryBreath({
  raceSlug: 'dragonborn',
  ancestryId: 'red',
})
assert(red?.damage === 'огонь' && red.shape === 'cone', 'red PHB cone fire')
assert(phbBreathDiceCount(1) === 2, 'PHB L1 = 2d6')
assert(phbBreathDiceCount(6) === 3, 'PHB L6 = 3d6')
assert(phbBreathDiceCount(11) === 4, 'PHB L11 = 4d6')
assert(phbBreathDiceCount(16) === 5, 'PHB L16 = 5d6')
assert(ftdBreathDiceCount(1) === 1, 'FTD L1 = 1d10')
assert(ftdBreathDiceCount(5) === 2, 'FTD L5 = 2d10')
assert(breathWeaponSaveDc({ conMod: 2, proficiencyBonus: 2 }) === 12, 'DC 8+2+2')

// —— O06-5: Invocations ——
assert(isEldritchBlastSpell({ name: 'Мистический заряд' }), 'EB name')
assert(isEldritchBlastSpell({ slug: 'eldritch_blast' }), 'EB slug')
assert(eldritchBlastBeamCount(5) === 2, '2 beams at 5')
assert(
  agonizingBlastDamageBonus({
    knownInvocationIds: ['agonizing_blast'],
    chaMod: 4,
    spellName: 'Мистический заряд',
  }) === 4,
  'agonizing +4',
)
assert(
  agonizingBlastDamageBonus({
    knownInvocationIds: ['agonizing_blast'],
    chaMod: 4,
    spellName: 'Огненный снаряд',
  }) === 0,
  'agonizing not on fire bolt',
)
const preview = formatEldritchBlastDamagePreview({
  characterLevel: 5,
  chaMod: 4,
  hasAgonizing: true,
})
assert(preview.includes('1к10+4') && preview.includes('×2'), `preview ${preview}`)

console.log('o06StylesBreathInvocations.selfcheck: ok')
