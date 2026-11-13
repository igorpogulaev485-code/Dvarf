import assert from 'node:assert/strict'
import {
  buildNeedsSetupItems,
  isAlignmentEmptyForSetup,
  isIncompleteCompanionForSetup,
  listSpellSetupItems,
} from './needsSetup'
import { createCompanion } from './companions'
import type { SheetSpell } from './spells'
import type { SpellLearnBudget } from '../../shared/dnd/casterProgression'

assert.equal(
  isAlignmentEmptyForSetup({ alignment: '', alignmentText: '' }),
  true,
  'empty alignment',
)
assert.equal(
  isAlignmentEmptyForSetup({ alignment: 'lawful_good', alignmentText: '' }),
  false,
  'slug fills alignment',
)
assert.equal(
  isAlignmentEmptyForSetup({ alignment: '', alignmentText: 'своё' }),
  false,
  'free text fills alignment',
)

const incomplete = createCompanion({
  name: 'Баллиста',
  kind: 'eldritch_cannon',
  source: { kind: 'manual' },
})
incomplete.stats.ac = null
incomplete.stats.hp = null
incomplete.stats.hp_max = null
assert.equal(isIncompleteCompanionForSetup(incomplete), true, 'no hp/ac')

const complete = createCompanion({
  name: 'Защитник',
  kind: 'steel_defender',
  source: { kind: 'manual' },
})
complete.stats.ac = 15
complete.stats.hp = 20
complete.stats.hp_max = 20
assert.equal(isIncompleteCompanionForSetup(complete), false, 'filled')

const budgets: SpellLearnBudget[] = [
  {
    mode: 'prepared_list',
    slug: 'cleric',
    labelRu: 'Жрец',
    cantrips: 3,
    leveledKnown: null,
    maxPrepared: 5,
  },
]

function stubSpell(partial: Partial<SheetSpell> & Pick<SheetSpell, 'id' | 'name' | 'level'>): SheetSpell {
  return {
    catalog_id: null,
    prepared: false,
    notes: '',
    casting_time: '',
    range: '',
    attack_or_save: '',
    damage: '',
    concentration: false,
    ...partial,
  }
}

const known: SheetSpell[] = [
  stubSpell({
    id: 's1',
    name: 'Sacred Flame',
    level: 0,
    prepared: true,
    class_slug: 'cleric',
  }),
  stubSpell({
    id: 's2',
    name: 'Cure Wounds',
    level: 1,
    prepared: true,
    class_slug: 'cleric',
  }),
]
const spellItems = listSpellSetupItems({ learnBudgets: budgets, known })
assert.ok(
  spellItems.some((row) => row.id === 'spells:prep:cleric' && row.label.includes('ещё 4')),
  'prepare shortfall',
)
assert.ok(
  spellItems.some((row) => row.id === 'spells:cantrip:cleric' && row.label.includes('ещё 2')),
  'cantrip shortfall',
)

const items = buildNeedsSetupItems({
  unlocked: [],
  featurePicks: { values: {} },
  classAsi: [],
  learnBudgets: budgets,
  known,
  alignment: '',
  alignmentText: '',
  companions: [incomplete, complete],
})
assert.ok(items.some((row) => row.kind === 'alignment'), 'alignment item')
assert.ok(
  items.some((row) => row.kind === 'companion' && row.targetId === incomplete.id),
  'companion',
)
assert.equal(
  items.some((row) => row.targetId === complete.id),
  false,
  'complete companion skipped',
)
assert.ok(items.length >= 4, `expected several items, got ${items.length}`)

console.log('needsSetup.selfcheck: ok')
