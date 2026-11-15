/**
 * Lightweight self-check: npx --yes tsx src/features/characters/inventoryPacks.selfcheck.ts
 */
import { asWeighableItems, createInventoryItem } from './inventory.ts'
import {
  collapsePack,
  expandPack,
  findCatalogPackEntry,
  hasPackContents,
  hasSoftCollapsedChildren,
  hydrateCollapsedPackMeta,
  hydrateItemWeightFromCatalog,
  isExpandedPack,
  sumContentsWeightLb,
  type ResolvedPackContent,
} from './inventoryPacks.ts'
import { startingGearWeightLb } from '../../shared/dnd/startingGearWeights.ts'
import { itemsWeightLb } from '../../shared/dnd/weight.ts'
import { focusOptionsFromCatalog } from './focusCatalog.ts'
import type { CatalogEntry } from '../../shared/api/catalog.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// --- unique ids: minting several items in one tick must not collide ---
const minted = Array.from({ length: 20 }, () => createInventoryItem().id)
assert(new Set(minted).size === minted.length, 'createInventoryItem ids must be unique')

// --- hasPackContents: empty pack category is not enough ---
assert(!hasPackContents({ item_category: 'pack' }), 'empty pack category ≠ expandable')
assert(
  hasPackContents({
    item_category: 'pack',
    contents: [{ slug: 'rations', name_ru: 'Рационы', qty: 10 }],
  }),
  'contents make pack expandable',
)

// --- alias: dungeoneer must not resolve to explorer ---
const catalog = [
  {
    id: 'exp',
    slug: 'explorers_pack',
    name_ru: 'Набор путешественника',
    data: {
      item_category: 'pack',
      contents: [{ slug: 'rations', name_ru: 'Рационы', qty: 10, weight_lb: 2 }],
    },
  },
  {
    id: 'dun',
    slug: 'dungeoneers_pack',
    name_ru: 'Набор исследователя подземелий',
    data: {
      item_category: 'pack',
      contents: [{ slug: 'rope', name_ru: 'Верёвка', qty: 1, weight_lb: 10 }],
    },
  },
]
assert(
  findCatalogPackEntry({ name: 'Набор исследователя подземелий' }, catalog)?.slug ===
    'dungeoneers_pack',
  'dungeoneer alias must win over explorer substring',
)
assert(
  findCatalogPackEntry({ name: 'Набор исследователя' }, catalog)?.slug === 'explorers_pack',
  'explorer grant alias',
)

// --- expand is keyed by instance id; duplicate ids must not expand ---
const packA = createInventoryItem()
packA.name = 'Набор путешественника'
packA.weight_lb = 10
packA.qty = 1
const packB = createInventoryItem()
packB.id = packA.id // simulate legacy collision
packB.name = 'Кинжал'
packB.weight_lb = 1
const contents: ResolvedPackContent[] = [
  { name_ru: 'Рационы', qty: 10, weight_lb: 2, catalog_id: null, slug: 'rations' },
]
const refused = expandPack({ items: [packA, packB], packId: packA.id, contents })
assert(
  refused.every((row) => !row.parent_id),
  'expand must refuse when pack id is not unique',
)

// --- expand one pack; only that pack opens; nested qty changes total ---
const pack = createInventoryItem()
pack.name = 'Набор путешественника'
pack.weight_lb = 59
const dagger = createInventoryItem()
dagger.name = 'Кинжал'
dagger.weight_lb = 1
const items = expandPack({
  items: [pack, dagger],
  packId: pack.id,
  contents,
})
assert(isExpandedPack(items, pack.id), 'pack expands')
assert(!isExpandedPack(items, dagger.id), 'other slots stay closed')
assert(
  items.filter((row) => row.parent_id === pack.id).length === 1,
  'one child row',
)
const before = itemsWeightLb(asWeighableItems(items))
const withMore = items.map((row) =>
  row.parent_id === pack.id ? { ...row, qty: row.qty + 5 } : row,
)
const after = itemsWeightLb(asWeighableItems(withMore))
assert(after === before + 5 * 2, `nested qty must move total: before=${before} after=${after}`)
assert(sumContentsWeightLb(contents) === 20, 'sumContentsWeightLb')

// --- soft collapse keeps children; re-expand restores edited qty ---
const waterskinContents: ResolvedPackContent[] = [
  { name_ru: 'Бурдюк', qty: 1, weight_lb: 5, catalog_id: null, slug: 'waterskin' },
  { name_ru: 'Рационы', qty: 10, weight_lb: 2, catalog_id: null, slug: 'rations' },
]
const packSoft = createInventoryItem()
packSoft.name = 'Набор путешественника'
packSoft.weight_lb = 25
const opened = expandPack({
  items: [packSoft],
  packId: packSoft.id,
  contents: waterskinContents,
})
const edited = opened.map((row) =>
  row.parent_id === packSoft.id && row.name === 'Бурдюк' ? { ...row, qty: 9 } : row,
)
const collapsed = collapsePack({ items: edited, packId: packSoft.id })
assert(!isExpandedPack(collapsed, packSoft.id), 'soft collapse hides UI')
assert(hasSoftCollapsedChildren(collapsed, packSoft.id), 'children survive collapse')
assert(
  collapsed.filter((row) => row.parent_id === packSoft.id).length === 2,
  'soft collapse must not delete children',
)
const reopened = expandPack({
  items: collapsed,
  packId: packSoft.id,
  contents: waterskinContents, // catalog still says qty 1 — must be ignored
})
assert(isExpandedPack(reopened, packSoft.id), 're-expand opens UI')
const skin = reopened.find(
  (row) => row.parent_id === packSoft.id && row.name === 'Бурдюк',
)
assert(skin?.qty === 9, `re-expand must keep edited qty, got ${skin?.qty}`)

// --- focus filter: class family must not leak magic «any» ---
const fakeEntries = [
  {
    id: '1',
    kind: 'item',
    slug: 'sprig_of_mistletoe',
    name_ru: 'Веточка омелы',
    data: { item_category: 'focus' },
  },
  {
    id: '2',
    kind: 'item',
    slug: 'staff_of_power',
    name_ru: 'Посох силы',
    data: { item_category: 'focus' },
  },
  {
    id: '3',
    kind: 'item',
    slug: 'crystal',
    name_ru: 'Кристалл',
    data: { item_category: 'focus' },
  },
  {
    id: '4',
    kind: 'item',
    slug: 'totem',
    name_ru: 'Тотем',
    data: { item_category: 'focus' },
  },
] as unknown as CatalogEntry[]

const druid = focusOptionsFromCatalog(fakeEntries, 'druidic', { phbStartingOnly: true })
assert(
  druid.every((row) => row.focus_kind === 'druidic'),
  'druidic family only',
)
assert(
  druid.some((row) => row.slug === 'sprig_of_mistletoe') &&
    druid.some((row) => row.slug === 'totem'),
  'PHB druidic variants present',
)
assert(
  !druid.some((row) => row.slug === 'staff_of_power' || row.slug === 'crystal'),
  'magic / arcane must not appear for druid starting focus',
)

// --- EXP-01: hydrate pack + single grant row with null weight ---
const hydrateCatalog = [
  {
    id: 'scholars',
    slug: 'scholars_pack',
    name_ru: 'Набор учёного',
    data: {
      item_category: 'pack',
      weight_lb: null,
      contents: [
        { slug: 'backpack', name_ru: 'Рюкзак', qty: 1 },
        { slug: 'book', name_ru: 'Книга', qty: 1 },
      ],
    },
  },
  {
    id: 'backpack',
    slug: 'backpack',
    name_ru: 'Рюкзак',
    data: { weight_lb: 5 },
  },
  {
    id: 'book',
    slug: 'book',
    name_ru: 'Книга',
    data: { weight_lb: 5 },
  },
  {
    id: 'rapier',
    slug: 'rapier',
    name_ru: 'Рапира',
    data: { weight_lb: 2 },
  },
  {
    id: 'vestments',
    slug: 'vestments',
    name_ru: 'Облачение',
    data: { weight_lb: 0 },
  },
]
const barePack = createInventoryItem()
barePack.name = 'Набор учёного'
barePack.weight_lb = null
const packHydrated = hydrateCollapsedPackMeta(barePack, hydrateCatalog)
assert(packHydrated?.weight_lb === 10, `pack hydrate weight, got ${packHydrated?.weight_lb}`)
assert(packHydrated?.container_kind === 'pack', 'pack hydrate marks container')

const bareRapier = createInventoryItem()
bareRapier.name = 'Рапира'
bareRapier.weight_lb = null
const rapierHydrated = hydrateItemWeightFromCatalog(bareRapier, hydrateCatalog)
assert(rapierHydrated?.weight_lb === 2, `rapier hydrate, got ${rapierHydrated?.weight_lb}`)

const bareRobe = createInventoryItem()
bareRobe.name = 'Ряса'
bareRobe.weight_lb = null
const robeHydrated = hydrateItemWeightFromCatalog(bareRobe, hydrateCatalog)
assert(robeHydrated?.weight_lb === 0, `ряса alias → vestments 0, got ${robeHydrated?.weight_lb}`)

assert(startingGearWeightLb('Кинжал') === 1, 'starting table dagger')
assert(startingGearWeightLb('Магический фокус') == null, 'generic focus has no fixed weight')

// --- EXP-01: pack view vs edit is UI state (editingIds), not nested flag ---
// Soft collapse hides children again after expand.
const viewPack = createInventoryItem()
viewPack.name = 'Набор учёного'
viewPack.weight_lb = 10
const viewOpened = expandPack({
  items: [viewPack],
  packId: viewPack.id,
  contents: [
    { name_ru: 'Рюкзак', qty: 1, weight_lb: 5, catalog_id: 'backpack', slug: 'backpack' },
    { name_ru: 'Книга', qty: 1, weight_lb: 5, catalog_id: 'book', slug: 'book' },
  ],
})
assert(isExpandedPack(viewOpened, viewPack.id), 'pack open for view shows children')
assert(
  viewOpened.filter((row) => row.parent_id === viewPack.id).length === 2,
  'view lists contents',
)
const viewCollapsed = collapsePack({ items: viewOpened, packId: viewPack.id })
assert(!isExpandedPack(viewCollapsed, viewPack.id), 'свернуть hides nested')
assert(
  hasSoftCollapsedChildren(viewCollapsed, viewPack.id),
  'свернуть keeps children for re-open',
)

console.log(
  'inventoryPacks.selfcheck: ok (unique ids; expand scoped; nested weight; soft collapse qty; focus family; EXP-01 hydrate)',
)
