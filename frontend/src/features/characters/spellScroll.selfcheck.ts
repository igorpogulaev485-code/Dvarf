/** Run: npx tsx src/features/characters/spellScroll.selfcheck.ts */
import { createInventoryItem } from './inventory'
import {
  bindScrollSpell,
  consumeScrollItem,
  formatScrollDisplayName,
  isSpellScrollCatalogSlug,
  isSpellScrollItem,
  listBoundSpellScrolls,
  spellScrollLevelCap,
} from './spellScroll'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(isSpellScrollCatalogSlug('spell_scroll_1'), 'slug 1')
assert(isSpellScrollCatalogSlug('spell_scroll_cantrip'), 'slug cantrip')
assert(!isSpellScrollCatalogSlug('spellbook'), 'not spellbook')

const blank = createInventoryItem()
blank.name = 'Свиток 1 уровня'
blank.catalog_slug = 'spell_scroll_1'
assert(isSpellScrollItem(blank), 'is scroll')
assert(spellScrollLevelCap(blank) === 1, 'cap 1')

const cantripBlank = { ...blank, catalog_slug: 'spell_scroll_cantrip', name: 'Свиток заговора' }
assert(spellScrollLevelCap(cantripBlank) === 0, 'cap cantrip')

const bound = bindScrollSpell(blank, {
  catalog_id: 'spell-detect-magic',
  slug: 'detect_magic',
  name: 'Обнаружение магии',
  level: 1,
  school: 'divination',
  ritual: true,
})
assert(bound.scroll_spell?.name === 'Обнаружение магии', 'bound name')
assert(bound.name === formatScrollDisplayName('Обнаружение магии', 1), 'display name')
assert(listBoundSpellScrolls([bound, blank]).length === 1, 'only bound listed')

const stack = [{ ...bound, qty: 2 }]
const afterOne = consumeScrollItem(stack, bound.id)
assert(afterOne.length === 1 && afterOne[0]!.qty === 1, 'qty 2→1')
const afterTwo = consumeScrollItem(afterOne, bound.id)
assert(afterTwo.length === 0, 'removed at 0')

console.log('spellScroll.selfcheck: ok')
