/**
 * I03: one spell-modifier list for the panel, the cast dialog, and the classic blank.
 * Run from frontend/: npx tsx src/features/characters/spellCastBonuses.selfcheck.ts
 */
import { createClassLevel } from '../../shared/dnd/classLevels.ts'
import { aggregateInfusionBonuses } from '../../shared/dnd/infusionEffects.ts'
import { emptyFeaturePicks, setFeaturePick } from '../../shared/dnd/featurePicks.ts'
import { setActiveInfusionBindings } from '../../shared/dnd/infusionsActive.ts'
import { spellAttackBonus, spellSaveDc } from '../../shared/dnd/spells.ts'
import { createAttunementSlot } from './attunement.ts'
import { artificerFocusGate } from './artificerFocus.ts'
import {
  aggregateGearEffects,
  appendSpellCastModifiers,
  type SpellcastingGearLine,
} from './gearEffects.ts'
import { createInventoryItem, type InventoryItem } from './inventory.ts'
import { withSpellCastBonuses } from './modifiers.ts'
import { syncSpellFocusFlags } from './spellFocus.ts'
import type { AttunementCharacter } from './attunementRules.ts'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

function item(partial: Partial<InventoryItem> & Pick<InventoryItem, 'name'>): InventoryItem {
  return {
    ...createInventoryItem(),
    equipped: true,
    requires_attunement: true,
    qty: 1,
    ...partial,
  }
}

const gate = (name: string, level: number): AttunementCharacter => ({
  classes: [createClassLevel({ name, level })],
  raceCatalogId: 'human',
  raceSlug: 'human',
  raceParentSlug: null,
  alignmentSlug: 'neutral_good',
  alignmentUnresolved: false,
})

function totals(
  lines: SpellcastingGearLine[],
  classSlug: string | null,
  infusion = 0,
): { attack: number; dc: number } {
  const modifiers = appendSpellCastModifiers({
    modifiers: [],
    gear: { spellcastingLines: lines },
    infusionSpellAttack: infusion,
  })
  const boosted = withSpellCastBonuses({
    baseDc: spellSaveDc(3, 3),
    baseAttack: spellAttackBonus(3, 3),
    modifiers,
    vars: {},
    classSlug,
  })
  return { attack: boosted.attack ?? 0, dc: boosted.dc ?? 0 }
}

function activeLines(row: InventoryItem, character: AttunementCharacter): SpellcastingGearLine[] {
  const gear = aggregateGearEffects({
    items: [row],
    attunements: [createAttunementSlot({ item_id: row.id, name: row.name })],
    gate: character,
  })
  return gear.spellcastingLines
}

const devout = item({
  name: 'Амулет благочестия +1',
  catalog_slug: 'amulet_of_the_devout_1',
  wear_slot: 'neck',
  attunement_classes: ['cleric', 'paladin'],
  is_spell_focus: true,
  effects: [
    {
      type: 'spellcasting_bonus',
      value: 1,
      applies_to: 'both',
      requires_held: false,
      class_scoped: true,
    },
  ],
})
const cleric = gate('Жрец', 5)
const devoutLines = activeLines(devout, cleric)
const clericCast = totals(devoutLines, 'cleric')
assert(clericCast.attack === 7 && clericCast.dc === 15, `devout cleric ${clericCast.attack}/${clericCast.dc}`)
const otherClass = totals(devoutLines, 'wizard')
assert(otherClass.attack === 6 && otherClass.dc === 14, 'devout does not buff wizard spells')
const unlabeled = totals(devoutLines, null)
assert(unlabeled.attack === 6 && unlabeled.dc === 14, 'class bonus skips spells without a class')

const stowed = { ...devout, equipped: false }
assert(activeLines(stowed, cleric).length === 0, 'worn bonus stops when the amulet is off')

const tool = item({
  name: 'Универсальный инструмент +1',
  catalog_slug: 'all_purpose_tool_1',
  wear_slot: 'none',
  attunement_classes: ['artificer'],
  effects: [
    {
      type: 'spellcasting_bonus',
      value: 1,
      applies_to: 'both',
      requires_held: true,
      class_scoped: true,
    },
  ],
})
const artificer = gate('Изобретатель', 5)
const heldTool = totals(activeLines(tool, artificer), 'artificer')
assert(heldTool.attack === 7 && heldTool.dc === 15, `tool in hand ${heldTool.attack}/${heldTool.dc}`)
assert(activeLines({ ...tool, equipped: false }, artificer).length === 0, 'tool stowed drops the bonus')

const grimoire = item({
  name: 'Тайный гримуар +1',
  attunement_classes: ['wizard'],
  effects: [
    {
      type: 'spellcasting_bonus',
      value: 1,
      applies_to: 'both',
      requires_held: true,
      class_scoped: true,
    },
  ],
})
const book = activeLines(grimoire, gate('Волшебник', 5))
const wizardCast = totals(book, 'wizard')
const artFromBook = totals(book, 'artificer')
assert(wizardCast.attack === 7 && wizardCast.dc === 15, 'grimoire buffs wizard spells')
assert(artFromBook.attack === 6 && artFromBook.dc === 14, 'grimoire does not buff artificer spells')

const staff = item({
  name: 'Посох силы',
  catalog_slug: 'staff_of_power',
  wear_slot: 'held_main',
  attunement_classes: ['sorcerer', 'warlock', 'wizard'],
  is_spell_focus: true,
  spell_tooling: 'none',
  effects: [
    { type: 'attack_bonus', value: 2 },
    { type: 'damage_bonus', value: 2 },
    { type: 'spellcasting_bonus', value: 2, applies_to: 'attack', requires_held: true },
  ],
})
const wizard = gate('Волшебник', 5)
const staffGear = aggregateGearEffects({
  items: [staff],
  attunements: [createAttunementSlot({ item_id: staff.id, name: staff.name })],
  gate: wizard,
})
const staffCast = totals(staffGear.spellcastingLines, 'wizard')
assert(staffCast.attack === 8 && staffCast.dc === 14, `staff of power ${staffCast.attack}/${staffCast.dc}`)
assert(staffGear.byItem[staff.id]?.attackBonus === 2, 'staff weapon attack +2')
assert(staffGear.byItem[staff.id]?.damageBonus === 2, 'staff weapon damage +2')
const staffSpell = totals(staffGear.spellcastingLines, null)
assert(staffSpell.attack === 8, 'unscoped staff bonus reaches an item spell')

const focusFlags = syncSpellFocusFlags([staff])
assert(focusFlags.has_spell_focus, 'staff of power covers a free material component')
const hat = item({
  name: 'Шляпа волшебства',
  spell_tooling: 'none',
  effects: [
    {
      type: 'custom_note',
      text: 'Вы можете использовать эту шляпу как заклинательную фокусировку для своих заклинаний волшебника.',
    },
  ],
})
assert(syncSpellFocusFlags([hat]).has_spell_focus, 'card text marks the hat as a focus')

const focusGate = artificerFocusGate({
  classSlug: 'artificer',
  material: '',
  items: [staff],
  arcaneArmor: false,
  arcaneFirearm: false,
})
assert(!focusGate.ok, 'a staff does not replace an artificer tool')
const toolGate = artificerFocusGate({
  classSlug: 'artificer',
  material: '',
  items: [tool],
  arcaneArmor: false,
  arcaneFirearm: false,
})
assert(toolGate.ok, 'the all-purpose tool still counts for the artificer')

const stacked = totals([...devoutLines, ...staffGear.spellcastingLines], 'cleric', 1)
assert(stacked.attack === 10 && stacked.dc === 15, `amulet + staff + infusion ${stacked.attack}/${stacked.dc}`)

const artClass = createClassLevel({ name: 'Изобретатель', level: 5 })
let picks = emptyFeaturePicks()
picks = setFeaturePick(picks, artClass.id, 'infuse_item', 'enhanced_arcane_focus')
picks = setActiveInfusionBindings(picks, artClass.id, [
  { infusionId: 'enhanced_arcane_focus', target: 'self', itemId: 'wand' },
])
const wand = { id: 'wand', name: 'Волшебная палочка', equipped: true }
const infused = aggregateInfusionBonuses({
  featurePicks: picks,
  classes: [artClass],
  wearingArmor: false,
  wearingShield: false,
  items: [wand],
  attunedItemIds: new Set(['wand']),
})
assert(infused.spellAttackBonus === 1, `focus infusion +1, got ${infused.spellAttackBonus}`)
const infusedCast = totals([], 'artificer', infused.spellAttackBonus)
assert(infusedCast.attack === 7 && infusedCast.dc === 14, 'infusion raises attack only')
const stowedWand = aggregateInfusionBonuses({
  featurePicks: picks,
  classes: [artClass],
  wearingArmor: false,
  wearingShield: false,
  items: [{ ...wand, equipped: false }],
  attunedItemIds: new Set(['wand']),
})
assert(stowedWand.spellAttackBonus === 0, 'stowed focus infusion adds nothing')
const unattunedWand = aggregateInfusionBonuses({
  featurePicks: picks,
  classes: [artClass],
  wearingArmor: false,
  wearingShield: false,
  items: [wand],
  attunedItemIds: new Set(),
})
assert(unattunedWand.spellAttackBonus === 0, 'unattuned focus infusion adds nothing')

console.log('spellCastBonuses.selfcheck ok')
