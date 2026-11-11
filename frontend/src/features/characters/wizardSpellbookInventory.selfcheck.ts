/** Run: npx tsx src/features/characters/wizardSpellbookInventory.selfcheck.ts */
import { readSpells } from './spells'
import {
  isSpellbookInventoryItem,
  syncWizardSpellbookWithInventory,
  wizardHasUsableSpellbook,
} from './wizardSpellbookInventory'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(
  isSpellbookInventoryItem({ id: '1', name: 'Книга заклинаний' }),
  'ru name',
)
assert(
  isSpellbookInventoryItem({ id: '2', name: 'Tome', catalog_slug: 'spellbook' }),
  'slug',
)
assert(!isSpellbookInventoryItem({ id: '3', name: 'Кинжал' }), 'not book')

const empty = readSpells({})
const bound = syncWizardSpellbookWithInventory({
  isWizard: true,
  spells: empty,
  items: [{ id: 'book-1', name: 'Книга заклинаний', catalog_slug: 'spellbook' }],
})
assert(bound.changed, 'bind changed')
assert(bound.spells.wizard_spellbook?.primaryBookItemId === 'book-1', 'primary set')
assert(wizardHasUsableSpellbook(bound.spells), 'usable')

const lost = syncWizardSpellbookWithInventory({
  isWizard: true,
  spells: bound.spells,
  items: [],
})
assert(lost.spells.wizard_spellbook?.bookLost === true, 'lost when removed')
assert(!wizardHasUsableSpellbook(lost.spells), 'not usable when lost')

const noAutoWhileLost = syncWizardSpellbookWithInventory({
  isWizard: true,
  spells: lost.spells,
  items: [{ id: 'book-2', name: 'Книга заклинаний' }],
})
assert(
  noAutoWhileLost.spells.wizard_spellbook?.bookLost === true,
  'no auto-bind while lost',
)
assert(
  noAutoWhileLost.spells.wizard_spellbook?.primaryBookItemId == null,
  'primary stays null until replace UI',
)

const nonWizard = syncWizardSpellbookWithInventory({
  isWizard: false,
  spells: empty,
  items: [{ id: 'book-1', name: 'Книга заклинаний' }],
})
assert(!nonWizard.changed, 'cleric ignores book item')

console.log('wizardSpellbookInventory.selfcheck: ok')
