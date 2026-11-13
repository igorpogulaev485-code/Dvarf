/**
 * O-02 selfcheck: Tasha class features at the table.
 * Run: npx --yes tsx src/shared/dnd/o02TashaFeatures.selfcheck.ts
 */
import { unlockFeaturesForClasses } from './classFeatures.ts'
import {
  applyKiFueledAttack,
  blessedStrikesRider,
  canKiFueledAttack,
  canUseBlessedStrikes,
  canUseFavoredFoeDamage,
  focusedAimBonus,
  favoredFoeDamageDie,
  HARNESS_DIVINE_POWER_TIMING,
  harnessBonusGate,
  hasO02Feature,
  INSTINCTIVE_POUNCE_HINT,
  MAGICAL_GUIDANCE_SHEET_NAME,
  markBlessedStrikesUsed,
  markFavoredFoeDamageUsed,
  markKiSpent,
  o02TableGate,
  PRIMAL_AWARENESS_SPELLS,
  primalKnowledgeAbilityOverride,
  quickenedHealingAmount,
} from './o02TashaFeatures.ts'
import {
  applyFeatureSpend,
  emptyTurnEconomy,
  readTurnEconomy,
  serializeTurnEconomy,
} from './turnEconomy.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// ——— TCE table gate ———
assert(!o02TableGate(null), 'outside lobby: no table buttons')
assert(!o02TableGate(false), 'lobby without tce: hide')
assert(o02TableGate(true), 'lobby with tce: show')

// ——— Ki-Fueled Attack ———
{
  let te = emptyTurnEconomy()
  assert(!canKiFueledAttack(te).ok, 'no ki spend → no attack')
  te = markKiSpent(te, 'bonus')
  te = applyFeatureSpend(te, 'bonus')
  assert(!canKiFueledAttack(te).ok, 'ki as bonus → no second bonus attack')
  te = emptyTurnEconomy()
  te = markKiSpent(te, 'action')
  te = applyFeatureSpend(te, 'action')
  assert(canKiFueledAttack(te).ok, 'ki as action → bonus attack ok')
  te = applyKiFueledAttack(te)
  assert(te.bonus === true, 'ki-fueled spends bonus')
  assert(!canKiFueledAttack(te).ok, 'bonus already spent')
}

// ——— Focused Aim ———
assert(focusedAimBonus(1) === 2, '+2 for 1 ki')
assert(focusedAimBonus(2) === 4, '+4 for 2 ki')
assert(focusedAimBonus(3) === 6, '+6 for 3 ki')
assert(focusedAimBonus(9) === 6, 'cap 3 ki')

// ——— Quickened Healing ———
{
  const fixed = quickenedHealingAmount('1к8', 3, () => 0.99)
  assert(fixed.amount === 8 + 3, 'MA die + PB')
  assert(fixed.label.includes('Ускоренное исцеление'), 'heal label')
}

// ——— Harness timing ———
assert(HARNESS_DIVINE_POWER_TIMING === 'bonus', 'HDP is bonus')
{
  let te = emptyTurnEconomy()
  assert(harnessBonusGate(te).ok, 'bonus free')
  te = applyFeatureSpend(te, 'bonus')
  assert(!harnessBonusGate(te).ok, 'bonus busy → refuse')
}

// ——— Blessed Strikes ———
{
  const rider = blessedStrikesRider({
    features: [{ id: 'blessed_strikes' }],
    tceAllowed: true,
  })
  assert(rider?.dice === '1d8', 'blessed 1d8')
  assert(
    blessedStrikesRider({
      features: [{ id: 'blessed_strikes' }, { id: 'divine_strike_life' }],
      tceAllowed: true,
    }) == null,
    'no stack with divine strike',
  )
  assert(
    blessedStrikesRider({
      features: [{ id: 'blessed_strikes' }],
      tceAllowed: false,
    }) == null,
    'tce off hides rider',
  )
  let te = emptyTurnEconomy()
  assert(canUseBlessedStrikes(te), 'once/turn free')
  te = markBlessedStrikesUsed(te)
  assert(!canUseBlessedStrikes(te), 'once/turn spent')
}

// ——— Favored Foe ———
assert(favoredFoeDamageDie(1) === '1d4', 'foe L1')
assert(favoredFoeDamageDie(6) === '1d6', 'foe L6')
assert(favoredFoeDamageDie(14) === '1d8', 'foe L14')
{
  let te = emptyTurnEconomy()
  assert(canUseFavoredFoeDamage(te), 'foe dmg free')
  te = markFavoredFoeDamageUsed(te)
  assert(!canUseFavoredFoeDamage(te), 'foe dmg spent')
}

// ——— Primal Awareness table ———
assert(PRIMAL_AWARENESS_SPELLS.length === 5, '5 PA spells')
assert(PRIMAL_AWARENESS_SPELLS[0]?.name === 'Speak with Animals', 'speak animals')
assert(PRIMAL_AWARENESS_SPELLS[4]?.fromClassLevel === 17, 'commune at 17')

// ——— Primal Knowledge ———
assert(
  primalKnowledgeAbilityOverride({
    skillKey: 'athletics',
    raging: true,
    hasPrimalKnowledge: true,
    tceAllowed: true,
  }) === 'str',
  'athletics → str in rage',
)
assert(
  primalKnowledgeAbilityOverride({
    skillKey: 'athletics',
    raging: false,
    hasPrimalKnowledge: true,
    tceAllowed: true,
  }) == null,
  'no override out of rage',
)
assert(
  primalKnowledgeAbilityOverride({
    skillKey: 'stealth',
    raging: true,
    hasPrimalKnowledge: true,
    tceAllowed: true,
  }) == null,
  'stealth not in list',
)
assert(INSTINCTIVE_POUNCE_HINT.includes('половины скорости'), 'pounce hint')
assert(MAGICAL_GUIDANCE_SHEET_NAME === 'Магическое наставление', 'sheet name kept')

// ——— Serialize O-02 flags ———
{
  let te = markKiSpent(emptyTurnEconomy(), 'action')
  te = markBlessedStrikesUsed(te)
  te = markFavoredFoeDamageUsed(te)
  const raw = serializeTurnEconomy(te)
  const back = readTurnEconomy(raw)
  assert(back.kiSpentAs === 'action', 'read kiSpentAs')
  assert(back.blessedStrikesUsed, 'read blessed')
  assert(back.favoredFoeDamageUsed, 'read favored foe')
}

// ——— Unlock presence (optional TCE features in catalog) ———
{
  const monk = unlockFeaturesForClasses({
    classes: [
      {
        id: 'm1',
        name: 'Монах',
        catalog_id: null,
        level: 5,
        subclass_name: '',
        subclass_catalog_id: null,
      },
    ],
    characterLevel: 5,
  })
  assert(hasO02Feature(monk, 'ki_fueled_attack'), 'monk ki_fueled')
  assert(hasO02Feature(monk, 'focused_aim'), 'monk focused_aim')
  assert(hasO02Feature(monk, 'quickened_healing'), 'monk quickened')

  const cleric = unlockFeaturesForClasses({
    classes: [
      {
        id: 'c1',
        name: 'Жрец',
        catalog_id: null,
        level: 2,
        subclass_name: 'Домен жизни',
        subclass_catalog_id: null,
      },
    ],
    characterLevel: 2,
    subclassSlugByEntryId: { c1: 'life_domain' },
  })
  const hdp = cleric.find((f) => f.id === 'cd_harness_divine_power')
  assert(hdp?.kind === 'bonus', 'HDP kind is bonus')
  assert(/бонусн/i.test(hdp?.summary_ru ?? ''), 'HDP summary says bonus')
}

console.log('o02TashaFeatures.selfcheck: ok')
