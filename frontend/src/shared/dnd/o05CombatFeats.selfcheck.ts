/**
 * O-05 selfcheck: силовые удары, бонус GWM, Налётчик, TCE gate.
 * Run: npx --yes tsx src/shared/dnd/o05CombatFeats.selfcheck.ts
 */
import {
  appendFlatDamage,
  canChargerBonus,
  canGwmBonusAttack,
  canOrcishFuryBonus,
  canShieldMasterShove,
  healerFeatHealAmount,
  isSpellAttackName,
  markDashedThisTurn,
  markMeleeWeaponCritOrKill,
  markWeaponHitThisTurn,
  martialAdeptExtraDie,
  o05TceVisible,
  powerAttackModifiers,
  rangedLongRangeDisadvantage,
  rangedPointBlankDisadvantage,
  resolvePowerAttackKind,
  tavernBrawlerUnarmedDamage,
  weaponIsHeavy,
} from './o05CombatFeats.ts'
import { emptyTurnEconomy, applyAttackSpend } from './turnEconomy.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// —— O05-1: −5/+10 only on heavy melee / ranged weapon, not cantrip ——
assert(weaponIsHeavy('Двуручный меч'), 'greatsword heavy')
assert(!weaponIsHeavy('Короткий меч'), 'shortsword not heavy')

const gwmOn = resolvePowerAttackKind({
  attackName: 'Двуручный меч',
  hasGreatWeaponMaster: true,
  hasSharpshooter: false,
  powerAttackOn: true,
  proficient: true,
})
assert(gwmOn === 'gwm', 'GWM on heavy melee')
assert(powerAttackModifiers(gwmOn).attackDelta === -5, '−5 atk')
assert(powerAttackModifiers(gwmOn).damageDelta === 10, '+10 dmg')

assert(
  resolvePowerAttackKind({
    attackName: 'Короткий меч',
    hasGreatWeaponMaster: true,
    hasSharpshooter: false,
    powerAttackOn: true,
  }) === null,
  'GWM off light melee',
)

assert(
  resolvePowerAttackKind({
    attackName: 'Огненный снаряд',
    hasGreatWeaponMaster: true,
    hasSharpshooter: true,
    powerAttackOn: true,
  }) === null,
  'no power attack on fire bolt',
)
assert(isSpellAttackName('Огненный снаряд'), 'fire bolt is spell')
assert(isSpellAttackName('Мистический заряд'), 'EB is spell')

const ssOn = resolvePowerAttackKind({
  attackName: 'Длинный лук',
  hasGreatWeaponMaster: false,
  hasSharpshooter: true,
  powerAttackOn: true,
})
assert(ssOn === 'sharpshooter', 'SS on longbow')

assert(
  !rangedLongRangeDisadvantage({ hasSharpshooter: true, longRangeMarked: true }),
  'SS ignores long range dis',
)
assert(
  rangedLongRangeDisadvantage({ hasSharpshooter: false, longRangeMarked: true }),
  'long range dis without SS',
)

assert(
  rangedPointBlankDisadvantage({
    attackName: 'Ручной арбалет',
    within5ft: true,
    hasCrossbowExpert: false,
    hasGunner: false,
  }),
  'point blank dis',
)
assert(
  !rangedPointBlankDisadvantage({
    attackName: 'Ручной арбалет',
    within5ft: true,
    hasCrossbowExpert: true,
    hasGunner: false,
  }),
  'crossbow expert ignores',
)
assert(
  !rangedPointBlankDisadvantage({
    attackName: 'Длинный лук',
    within5ft: true,
    hasCrossbowExpert: false,
    hasGunner: true,
  }),
  'gunner ignores any ranged',
)

// —— O05-2: GWM bonus after crit/kill ——
let te = emptyTurnEconomy()
assert(!canGwmBonusAttack(te, true).ok, 'no GWM bonus before crit')
te = markMeleeWeaponCritOrKill(te)
assert(canGwmBonusAttack(te, true).ok, 'GWM bonus after crit/kill')
te = { ...te, bonus: true }
assert(!canGwmBonusAttack(te, true).ok, 'blocked when bonus spent')

// —— O05-3: Charger needs dash ——
te = emptyTurnEconomy()
assert(!canChargerBonus(te, true).ok, 'charger needs dash')
te = markDashedThisTurn(te)
assert(canChargerBonus(te, true).ok, 'charger after dash')

te = applyAttackSpend(emptyTurnEconomy())
assert(te.attackActionThisTurn, 'attack marks attackActionThisTurn')

assert(tavernBrawlerUnarmedDamage('1') === '1к4', 'tavern unarmed floor')
assert(tavernBrawlerUnarmedDamage('1к8') === '1к8', 'keep better die')

const heal = healerFeatHealAmount(5, () => 0.5)
assert(heal.amount === 4 + 4 + 5, 'healer 1d6+4+HD')

// —— O05-4: Martial Adept die ——
assert(
  martialAdeptExtraDie({ hasMartialAdept: true, hasClassSuperiorityPool: true }) ===
    1,
  'adept +1 with BM',
)
assert(
  martialAdeptExtraDie({ hasMartialAdept: true, hasClassSuperiorityPool: false }) ===
    0,
  'adept alone uses feat pool',
)

// —— O05-5: TCE gate ——
assert(o05TceVisible(true), 'tce on')
assert(!o05TceVisible(false), 'tce off')
te = emptyTurnEconomy()
te = markWeaponHitThisTurn(te)
assert(canOrcishFuryBonus(te, true).ok, 'orcish fury after hit')

// —— O05-6: Shield Master ——
te = applyAttackSpend(emptyTurnEconomy())
assert(
  canShieldMasterShove(te, { hasFeat: true, shieldInHand: true }).ok,
  'shield shove after attack',
)
assert(
  !canShieldMasterShove(te, { hasFeat: true, shieldInHand: false }).ok,
  'no shield no shove',
)

assert(appendFlatDamage('1к12+3', 10) === '1к12+3+10', 'append dmg')

console.log('o05CombatFeats.selfcheck: ok')
