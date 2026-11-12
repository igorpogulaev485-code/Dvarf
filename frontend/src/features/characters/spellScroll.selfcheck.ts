/** Run: npx tsx src/features/characters/spellScroll.selfcheck.ts */
import { createInventoryItem } from './inventory'
import { isAutoCombatConsumable } from './combatConsumables'
import {
  applyScrollSpellChoice,
  bindScrollSpell,
  consumeScrollItem,
  formatScrollDisplayName,
  isCastableSpellScroll,
  isSpellScrollCatalogSlug,
  isSpellScrollItem,
  listBoundSpellScrolls,
  scrollReadGate,
  spellScrollCastStats,
  spellScrollLevelCap,
  spellScrollOffListCheckDc,
  SCROLL_NOT_ON_CLASS_LIST,
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

const cleric5 = [{ listSlug: 'cleric', ability: 'wis' as const, maxSpellLevel: 3 }]
const cleric3 = [{ listSlug: 'cleric', ability: 'wis' as const, maxSpellLevel: 2 }]
assert(
  scrollReadGate({
    spellLevel: 1,
    spellClasses: ['cleric'],
    casters: cleric5,
    thiefRogue13: false,
  }).status === 'cast',
  'guiding bolt on list',
)
const fireball = scrollReadGate({
  spellLevel: 3,
  spellClasses: ['sorcerer', 'wizard'],
  casters: cleric5,
  thiefRogue13: false,
})
assert(fireball.status === 'blocked' && fireball.reason === SCROLL_NOT_ON_CLASS_LIST, 'fireball blocked')
const guardians = scrollReadGate({
  spellLevel: 3,
  spellClasses: ['cleric'],
  casters: cleric3,
  thiefRogue13: false,
})
assert(
  guardians.status === 'check' && guardians.ability === 'wis' && guardians.dc === 13,
  'spirit guardians check',
)
const thief = scrollReadGate({
  spellLevel: 1,
  spellClasses: ['wizard'],
  casters: [],
  thiefRogue13: true,
})
assert(thief.status === 'check' && thief.ability === 'int' && thief.dc === 11, 'thief uses Int')

const locked = bindScrollSpell(bound, {
  catalog_id: 'other',
  name: 'Огненный шар',
  level: 3,
})
assert(locked.scroll_spell?.name === 'Обнаружение магии', 'choice is locked')
const stackBlank = { ...blank, id: 'stack', qty: 3 }
const split = applyScrollSpellChoice(stackBlank.qty ? [stackBlank] : [], 'stack', {
  catalog_id: 'shield',
  name: 'Щит',
  level: 1,
})
assert(split.length === 2, 'stack splits')
assert(split[0]!.qty === 2 && !split[0]!.scroll_spell, 'rest stays blank')
assert(split[1]!.qty === 1 && split[1]!.scroll_spell?.name === 'Щит', 'one copy bound')

console.log('spellScroll.selfcheck: ok')
