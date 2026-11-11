/** Run: npx --yes tsx src/shared/dnd/gearCatalogCharges.selfcheck.ts */
import { parseItemCatalogData } from './gearCatalog.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const wand = parseItemCatalogData({
  rarity: 'rare',
  requires_attunement: true,
  item_category: 'wondrous',
  charges: { max: 7, restore: 'midnight', recharge_dice: '1d6+1' },
  effects: [{ type: 'resource', id: 'wand_goo', max: 7, restore: 'midnight' }],
})

assert(wand.rarity === 'rare', 'rarity')
assert(wand.requires_attunement === true, 'attunement')
assert(wand.charges?.max === 7, 'max')
assert(wand.charges?.restore === 'midnight', 'midnight must not collapse to manual')
assert(wand.charges?.recharge_dice === '1d6+1', 'dice')

const unknown = parseItemCatalogData({
  charges: { max: 1, restore: 'whenever' },
})
assert(unknown.charges?.restore === 'manual', 'unknown restore stays manual')

console.log('gearCatalogCharges.selfcheck: ok')
