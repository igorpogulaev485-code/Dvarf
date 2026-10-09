/** Run: npx tsx src/shared/dnd/spellLearnBudget.selfcheck.ts */
import {
  resolveSpellLearnBudget,
  spellLearnModeForSlug,
  wizardSpellbookLeveledCap,
} from './casterProgression'
import { createClassLevel } from './classLevels'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(spellLearnModeForSlug('wizard') === 'spellbook', 'wizard mode')
assert(spellLearnModeForSlug('cleric') === 'prepared_list', 'cleric mode')
assert(spellLearnModeForSlug('bard') === 'known', 'bard mode')
assert(wizardSpellbookLeveledCap(1) === 6, 'book L1')
assert(wizardSpellbookLeveledCap(5) === 14, 'book L5')

const wiz = resolveSpellLearnBudget({
  classes: [createClassLevel({ name: 'Волшебник', level: 1 })],
  abilityModFor: () => 3,
})
assert(wiz?.mode === 'spellbook', 'wiz budget mode')
assert(wiz?.cantrips === 3, 'wiz cantrips')
assert(wiz?.leveledKnown === 6, 'wiz book')
assert(wiz?.maxPrepared === 3 + 1, 'wiz prepare INT+level')

const cleric = resolveSpellLearnBudget({
  classes: [createClassLevel({ name: 'Жрец', level: 1 })],
  abilityModFor: () => 2,
})
assert(cleric?.mode === 'prepared_list', 'cleric')
assert(cleric?.leveledKnown == null, 'cleric full list')
assert(cleric?.cantrips === 3, 'cleric cantrips')
assert(cleric?.maxPrepared === 2 + 1, 'cleric prepare')

const bard = resolveSpellLearnBudget({
  classes: [createClassLevel({ name: 'Бард', level: 1 })],
  abilityModFor: () => 2,
})
assert(bard?.mode === 'known', 'bard')
assert(bard?.cantrips === 2, 'bard cantrips')
assert(bard?.leveledKnown === 4, 'bard known')
assert(bard?.maxPrepared == null, 'bard no prepare')

console.log('spellLearnBudget.selfcheck: ok')
