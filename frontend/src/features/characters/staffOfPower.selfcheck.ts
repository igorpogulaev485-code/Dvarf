/**
 * Staff of Power — catalog equip/attune pipeline (I05 engine, no duplicate mechanics).
 * Run from frontend/: npx tsx src/features/characters/staffOfPower.selfcheck.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import type { CatalogEntry } from '../../shared/api/catalog.ts'
import { findWeaponPreset } from '../../shared/dnd/weaponPresets.ts'
import { createAttunementSlot } from './attunement.ts'
import { aggregateGearEffects } from './gearEffects.ts'
import { inventoryItemFromCatalog } from './gearFromCatalog.ts'
import { equipInventoryItem, createInventoryItem } from './inventory.ts'
import { refreshInventoryItemFromCatalog } from './gearCatalogRefresh.ts'
import { syncGearGrantSpells, syncGearResources } from './gearGrantsSync.ts'
import type { SpellsState } from './spells.ts'
import { canShowEquipChip, equipLabel, isHeldItem } from './heldEquip.ts'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

function emptySpells(): SpellsState {
  return { ability: 'int', known: [], slots: {}, ritual_casting: false }
}

const root = join(process.cwd(), '../backend/data/srd/2014')
function load(name: string) {
  return JSON.parse(readFileSync(join(root, name), 'utf8'))
}

const polish = load('gear_dmg_polish_v1.json')
const insert = (polish.inserts || []).find((r: { slug?: string }) => r.slug === 'staff_of_power')
assert(insert, 'staff insert')
const mergeData = { ...(insert.data || {}) }
for (const wave of [
  'gear_i02_attunement_v1.json',
  'gear_i03_spellcasting_v1.json',
  'gear_i05_charges_v1.json',
]) {
  const row = (load(wave).updates || []).find(
    (r: { slug?: string }) => r.slug === 'staff_of_power',
  )
  if (row?.data) Object.assign(mergeData, row.data)
}
if (mergeData.effects_from_i05) delete mergeData.effects_from_i05

const entry = {
  id: insert.id,
  kind: 'item',
  slug: 'staff_of_power',
  name_ru: 'Посох силы',
  name_en: 'Staff of Power',
  rules_edition: '2014',
  source: 'DMG 2014',
  sort_order: 9470,
  is_active: true,
  data: mergeData,
} as CatalogEntry

const added = inventoryItemFromCatalog({ entry })
assert(added, 'catalog add')
const staff = added.item
assert(staff.wear_slot === 'held_main', 'held_main slot')
assert(isHeldItem(staff), 'held item')
assert(canShowEquipChip(staff), 'equip chip')
assert(equipLabel(staff).on === 'В руках', 'hold labels')
assert(findWeaponPreset(staff.name) == null, 'not a weapon preset row')

function gearState(
  items: typeof staff[],
  attunements: ReturnType<typeof createAttunementSlot>[],
) {
  return aggregateGearEffects({ items, attunements })
}

let items = [staff]
let attunements: ReturnType<typeof createAttunementSlot>[] = []

let gear = gearState(items, attunements)
assert(gear.acBonus === 0, 'just added inactive')
assert(gear.grantSpells.length === 0, 'no grants until active')

items = equipInventoryItem(items, staff.id, true)
gear = gearState(items, attunements)
assert(gear.acBonus === 0, 'equip only still needs attune')

attunements = [createAttunementSlot({ item_id: staff.id, name: staff.name })]
gear = gearState(items, attunements)
assert(gear.acBonus === 2, `ac ${gear.acBonus}`)
assert(gear.saveBonuses.all === 2, `saves ${gear.saveBonuses.all}`)
assert(gear.spellcastingLines.some((l) => l.value === 2 && l.appliesTo === 'attack'), 'sc attack')
assert(gear.grantSpells.length === 9, `grants ${gear.grantSpells.length}`)
assert(
  gear.grantSpells.every((g) => g.pool === 'charges' && g.resourceKey),
  'grants linked to resource',
)

const resources = syncGearResources([], gear)
const pool = resources.find((r) => r.name.includes('Посох') || r.id.includes('staff'))
assert(pool && pool.max === 20, `pool max ${pool?.max}`)
assert(pool.rechargeDice === '2d8+4', `recharge ${pool?.rechargeDice}`)

const spells = syncGearGrantSpells(emptySpells(), gear)
assert(spells.known.length === 9, `known ${spells.known.length}`)
assert(
  spells.known.every((s) => s.item_cast && s.item_cast.charges != null),
  'item_cast rows',
)

items = equipInventoryItem(items, staff.id, false)
gear = gearState(items, attunements)
assert(gear.acBonus === 0, 'unequip clears bonuses')

const free = {
  ...createInventoryItem(),
  name: 'Посох силы',
  equipped: true,
  requires_attunement: true,
}
gear = gearState([free], [createAttunementSlot({ item_id: free.id, name: free.name })])
assert(gear.acBonus === 0, 'free-text name no effects')

const stale = {
  ...staff,
  equipped: true,
  effects: [
    { type: 'ac_bonus', value: 2 },
    { type: 'save_bonus', value: 2 },
    { type: 'grant_spell', slug: 'magic_missile', uses: 20 },
  ],
}
const refreshed = refreshInventoryItemFromCatalog(stale, entry)
assert(refreshed && (refreshed.effects?.length ?? 0) >= 9, 'I23 refresh restores I05 effects')

// weapon_1 + crossbow_light (I06 base choice, not a second charges engine)
const weaponPlus = {
  id: 'w1',
  kind: 'weapon' as const,
  slug: 'weapon_1',
  name_ru: 'Оружие +1',
  name_en: 'weapon_1',
  rules_edition: '2014' as const,
  source: 'DMG',
  sort_order: 1,
  is_active: true,
  data: {
    ability: 'dex',
    damage: '1к8',
    damage_type: 'колющий',
    magic_bonus: 1,
    allowed_base_weapon: ['crossbow_light'],
    effects: [
      { type: 'attack_bonus', value: 1 },
      { type: 'damage_bonus', value: 1 },
    ],
  },
} as CatalogEntry
const xbow = inventoryItemFromCatalog({ entry: weaponPlus, baseSlug: 'crossbow_light' })
assert(xbow, 'crossbow add')
xbow.item.equipped = true
if (xbow.attacks[0]) xbow.attacks[0].held = true
const xbowGear = aggregateGearEffects({ items: [xbow.item], attunements: [] })
assert(xbowGear.byItem[xbow.item.id]?.attackBonus === 1, 'crossbow attack +1')
assert(xbowGear.byItem[xbow.item.id]?.damageBonus === 1, 'crossbow damage +1')

console.log('staffOfPower.selfcheck: ok')