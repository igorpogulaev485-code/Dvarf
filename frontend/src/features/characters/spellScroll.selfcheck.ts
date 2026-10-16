/** Run: npx tsx src/features/characters/spellScroll.selfcheck.ts */
import { createInventoryItem } from './inventory'
import { isAutoCombatConsumable } from './combatConsumables'
import {
  bindScrollSpell,
  consumeScrollItem,
  formatScrollDisplayName,
  isCastableSpellScroll,
  isSpellScrollCatalogSlug,
  isSpellScrollItem,
  listBoundSpellScrolls,
  spellScrollCastStats,
  spellScrollLevelCap,
  spellScrollOffListCheckDc,
} from './spellScroll'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(isSpellScrollCatalogSlug('spell_scroll_1'), 'slug 1')
assert(isSpellScrollCatalogSlug('spell_scroll_cantrip'), 'slug cantrip')
assert(isSpellScrollCatalogSlug('spell_scroll_9'), 'slug 9')
assert(!isSpellScrollCatalogSlug('spellbook'), 'not spellbook')

const blank = createInventoryItem()
blank.name = 'Свиток 1 уровня'
blank.catalog_slug = 'spell_scroll_1'
assert(isSpellScrollItem(blank), 'is scroll')
assert(spellScrollLevelCap(blank) === 1, 'cap 1')

const cantripBlank = { ...blank, catalog_slug: 'spell_scroll_cantrip', name: 'Свиток заговора' }
assert(spellScrollLevelCap(cantripBlank) === 0, 'cap cantrip')

for (const level of [4, 5, 6, 7, 8, 9] as const) {
  const high = {
    ...blank,
    catalog_slug: `spell_scroll_${level}`,
    name: `Свиток ${level} уровня`,
  }
  assert(spellScrollLevelCap(high) === level, `cap ${level}`)
}

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

assert(isCastableSpellScroll(bound), 'castable when bound')
assert(isAutoCombatConsumable(bound), 'bound scroll is combat consumable')
assert(
  isAutoCombatConsumable({ name: 'Свиток 2 уровня', notes: '', qty: 1 }),
  'unbound scroll name still auto (ammo-like)',
)

const stats3 = spellScrollCastStats(3)
assert(stats3.saveDc === 15 && stats3.attackBonus === 7, 'L3 scroll stats')
assert(spellScrollOffListCheckDc(3) === 13, 'off-list DC 10+3')

console.log('spellScroll.selfcheck: ok')
