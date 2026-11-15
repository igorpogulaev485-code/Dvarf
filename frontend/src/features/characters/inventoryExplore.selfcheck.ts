/**
 * EXP-01: glance/edit gating helpers for the explore inventory scene.
 * Run: npx --yes tsx src/features/characters/inventoryExplore.selfcheck.ts
 */

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

/** Mirrors InventoryPanel: edit only after «Изменить», never just because nested. */
function isEditing(itemId: string, editingIds: Set<string>, _nested: boolean): boolean {
  return editingIds.has(itemId)
}

/** Mirrors InventoryPanel: details only for the open accordion id. */
function isDetailsOpen(itemId: string, openId: string | null, _nested: boolean): boolean {
  return openId === itemId
}

const packId = 'pack-1'
const childId = 'child-1'
const editingIds = new Set<string>()

assert(
  !isEditing(childId, editingIds, true),
  'nested glance must not open edit fields / Удалить',
)
assert(
  !isDetailsOpen(childId, packId, true),
  'nested under open pack stays glance until clicked',
)

editingIds.add(packId)
assert(isEditing(packId, editingIds, false), 'после Изменить — поля видны')
assert(
  !isEditing(childId, editingIds, true),
  'edit pack does not force child edit',
)

assert(isDetailsOpen(packId, packId, false), 'pack view open')
assert(
  !isDetailsOpen(packId, null, false),
  'свернуть clears openId → one glance row',
)

console.log('inventoryExplore.selfcheck: ok (view vs edit vs collapse gating)')
