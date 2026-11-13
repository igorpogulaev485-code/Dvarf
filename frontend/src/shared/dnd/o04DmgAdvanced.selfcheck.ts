/**
 * O-04 selfcheck: очки героя, кости мастерства, отдых, разрубание, шок, раны, мораль.
 * Run: npx --yes tsx src/shared/dnd/o04DmgAdvanced.selfcheck.ts
 */
import {
  LINGERING_INJURIES_TABLE,
  SYSTEM_SHOCK_TABLE,
  cleaveAttackWouldHit,
  cleaveOverflow,
  heroPointsMaxForLevel,
  lookupLingeringInjury,
  lookupSystemShock,
  mutuallyExclusiveRestFlags,
  proficiencyDieSides,
  proficiencyRollContribution,
  resolveMoraleSave,
  restDurationLabels,
  restDurationVariant,
  triggersMassiveDamage,
} from './o04DmgAdvanced.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(heroPointsMaxForLevel(1) === 5, 'hero L1 = 5')
assert(heroPointsMaxForLevel(5) === 7, 'hero L5 = 5+2')
assert(heroPointsMaxForLevel(4) === 7, 'hero L4 = 5+2')
assert(heroPointsMaxForLevel(10) === 10, 'hero L10 = 5+5')

assert(proficiencyDieSides(2) === 4, 'PB2 → d4')
assert(proficiencyDieSides(3) === 6, 'PB3 → d6')
assert(proficiencyDieSides(4) === 8, 'PB4 → d8')
assert(proficiencyDieSides(5) === 10, 'PB5 → d10')
assert(proficiencyDieSides(6) === 12, 'PB6 → d12')

const fixed = proficiencyRollContribution({
  proficient: true,
  proficiencyBonus: 3,
  diceEnabled: false,
})
assert(fixed.value === 3 && !fixed.usedDice, 'fixed PB when dice off')

const diced = proficiencyRollContribution({
  proficient: true,
  proficiencyBonus: 3,
  diceEnabled: true,
  forcedRoll: 4,
})
assert(diced.value === 4 && diced.usedDice && diced.sides === 6, 'forced d6=4')

const excl = mutuallyExclusiveRestFlags({
  key: 'dmg_epic_heroism',
  value: true,
  current: { gritty_rest: true, dmg_epic_heroism: false },
})
assert(excl.dmg_epic_heroism && !excl.gritty_rest, 'epic clears gritty')

const excl2 = mutuallyExclusiveRestFlags({
  key: 'gritty_rest',
  value: true,
  current: { gritty_rest: false, dmg_epic_heroism: true },
})
assert(excl2.gritty_rest && !excl2.dmg_epic_heroism, 'gritty clears epic')

assert(restDurationVariant({ dmg_epic_heroism: true }) === 'epic', 'variant epic')
assert(restDurationVariant({ gritty_rest: true }) === 'gritty', 'variant gritty')
assert(restDurationLabels('epic').shortLabel.includes('5'), 'epic short 5 min')
assert(restDurationLabels('epic').longLabel.includes('1'), 'epic long 1 h')

const cleave = cleaveOverflow({
  enabled: true,
  meleeWeapon: true,
  hpBefore: 4,
  damage: 10,
})
assert(cleave.qualifies && cleave.overflow === 6, 'cleave overflow 6')
assert(
  !cleaveOverflow({ enabled: true, meleeWeapon: false, hpBefore: 4, damage: 10 }).qualifies,
  'ranged no cleave',
)
assert(cleaveAttackWouldHit(15, 14), 'hit AC')
assert(!cleaveAttackWouldHit(13, 14), 'miss AC')

assert(
  triggersMassiveDamage({ enabled: true, damage: 10, hpMax: 20 }),
  'half max triggers',
)
assert(
  !triggersMassiveDamage({ enabled: true, damage: 9, hpMax: 20 }),
  'below half no trigger',
)
assert(
  !triggersMassiveDamage({ enabled: false, damage: 20, hpMax: 20 }),
  'flag off',
)

assert(lookupSystemShock(1).apply === 'drop_0', 'shock 1')
assert(lookupSystemShock(3).apply === 'drop_0_stable', 'shock 2-3')
assert(lookupSystemShock(10).apply === 'no_reactions', 'shock 8-10')
assert(SYSTEM_SHOCK_TABLE.length === 5, '5 shock bands')

assert(lookupLingeringInjury(1).key === 'lose_eye', 'injury eye')
assert(lookupLingeringInjury(6).key === 'internal_injury', 'injury internal')
assert(lookupLingeringInjury(20).key === 'minor_scar', 'injury minor')
assert(LINGERING_INJURIES_TABLE.length === 9, '9 injury bands')

const moraleFail = resolveMoraleSave({ saveTotal: 9 })
assert(!moraleFail.success && moraleFail.outcome === 'flee', 'morale fail flee')
const moraleOk = resolveMoraleSave({ saveTotal: 10 })
assert(moraleOk.success && moraleOk.outcome === 'hold', 'morale hold')
const overwhelm = resolveMoraleSave({ saveTotal: 20, overwhelming: true })
assert(!overwhelm.success && overwhelm.outcome === 'flee', 'overwhelm auto fail')

console.log('o04DmgAdvanced.selfcheck: ok')
