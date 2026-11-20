/** Run: npx tsx --tsconfig tsconfig.app.json src/shared/dnd/spellBudgets2024.selfcheck.ts */
import assert from 'node:assert/strict'
import { createClassLevel } from './classLevels'
import { resolveSpellLearnBudget } from './casterProgression'
import { overlayLearnBudget2024 } from './spellBudgets2024'

const sorcerer = [
  createClassLevel({
    name: 'Чародей',
    catalog_id: 'sorcerer',
    level: 5,
    subclass_name: 'Драконье чародейство',
    subclass_catalog_id: 'sorcerer__draconic-sorcery',
  }),
]

const raw = resolveSpellLearnBudget({
  classes: sorcerer,
  abilityModFor: () => 2,
})
assert.ok(raw, 'sorcerer budget')
assert.equal(raw!.mode, 'known', '2014 base mode stays known')

const over = overlayLearnBudget2024(raw, sorcerer)
assert.ok(over)
assert.equal(over!.mode, 'prepared_list', '2024 flips sorcerer to prepared_list')
assert.equal(over!.leveledKnown, null)
assert.equal(over!.maxPrepared, 9, 'L5 prepared_spells = 9')
assert.equal(over!.cantrips, 5)

console.log('spellBudgets2024 selfcheck: ok')
