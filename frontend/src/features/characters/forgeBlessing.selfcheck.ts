/**
 * Forge Blessing pin persist + strip rules.
 * Run: npx tsx src/features/characters/forgeBlessing.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { createInventoryItem } from './inventory'
import {
  applyForgeBlessing,
  forgeBlessingKind,
  healForgeBlessingPoolDesync,
  itemHasForgeBlessing,
  listForgeBlessingCandidates,
  looksMagical,
  reassignForgeBlessing,
  resolveForgeBlessingPinState,
  resolveForgeBlessingPinnedTarget,
  stripForgeBlessing,
  withForgeBlessingPoolSpentIfPinned,
} from './forgeBlessing'

const plate = {
  ...createInventoryItem(),
  id: 'plate',
  name: 'Латы',
  armor_kind: 'heavy' as const,
}
const mace = {
  ...createInventoryItem(),
  id: 'mace',
  name: 'Булава',
  weapon_grip: 'one_hand' as const,
}

assert.equal(
  resolveForgeBlessingPinState([plate], null).status,
  'idle',
  'no pin → idle',
)
assert.equal(
  resolveForgeBlessingPinState([plate], 'plate').status,
  'ready',
  'pin on blessable → ready',
)
assert.equal(
  resolveForgeBlessingPinnedTarget([plate], 'plate'),
  'plate',
  'ready pin is apply target',
)

const applied = applyForgeBlessing([plate, mace], 'plate')
assert.equal(applied.ok, true, 'apply plate')
if (!applied.ok) throw new Error('apply failed')
assert.equal(itemHasForgeBlessing(applied.items[0]!), true, 'mark on plate')

const active = resolveForgeBlessingPinState(applied.items, 'plate')
assert.equal(active.status, 'active', 'pinned blessed item → active')
assert.equal(
  resolveForgeBlessingPinnedTarget(applied.items, 'plate'),
  null,
  'active pin is not a candidate target',
)

const pool = {
  id: 'cleric:entry:blessing_of_the_forge:x',
  used: 0,
  max: 1,
  activeLabel: null as string | null,
}
const spent = withForgeBlessingPoolSpentIfPinned([pool], active, 'закреплено')
assert.equal(spent.changed, true, 'force spent when pin active')
assert.equal(spent.resources[0]?.used, 1, 'used → max')

const strippedWhilePinned = stripForgeBlessing(applied.items)
assert.equal(strippedWhilePinned.changed, true, 'strip helper still works')
// Product path: do not call strip when pin active — simulate keep mark.
assert.equal(
  itemHasForgeBlessing(applied.items[0]!),
  true,
  'original items still marked until strip applied',
)

const reassigned = reassignForgeBlessing(applied.items, 'mace')
assert.equal(reassigned.ok, true, 'reassign to mace')
if (!reassigned.ok) throw new Error('reassign failed')
assert.equal(itemHasForgeBlessing(reassigned.items[0]!), false, 'plate cleared')
assert.equal(itemHasForgeBlessing(reassigned.items[1]!), true, 'mace marked')

const missing = resolveForgeBlessingPinState(reassigned.items, 'gone')
assert.equal(missing.status, 'missing', 'missing pin id')

const adamantine = {
  ...createInventoryItem(),
  id: 'ada',
  name: 'Адамантиновый доспех (Латы)',
  armor_kind: 'heavy' as const,
  catalog_slug: 'adamantine_armor',
  base_armor_slug: 'plate_armor',
  effects: [
    { type: 'sheet_flag' as const, flag: 'critical_hit_immunity', value: true },
  ],
}
assert.equal(looksMagical(adamantine), true, 'adamantine is magical')
assert.equal(forgeBlessingKind(adamantine), null, 'adamantine not blessable')
assert.equal(
  listForgeBlessingCandidates([adamantine, plate]).some((row) => row.id === 'ada'),
  false,
  'adamantine not a candidate',
)

const desyncPool = {
  id: 'feat:cleric:blessing_of_the_forge:x',
  used: 1,
  max: 1,
  activeLabel: 'Благословение кузницы: «Адамантиновый доспех (Латы)» закреплено' as
    | string
    | null,
}
const healed = healForgeBlessingPoolDesync([desyncPool], [adamantine, plate])
assert.equal(healed.changed, true, 'desync healed')
assert.equal(healed.resources[0]?.used, 0, 'charge freed')
assert.equal(healed.resources[0]?.activeLabel, undefined, 'label cleared')

const stillMarked = healForgeBlessingPoolDesync(
  [{ ...desyncPool, used: 1 }],
  applied.items,
)
assert.equal(stillMarked.changed, false, 'mark present → keep spent')

console.log('forgeBlessing.selfcheck: ok')
