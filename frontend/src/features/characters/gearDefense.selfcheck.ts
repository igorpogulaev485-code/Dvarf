/**
 * I04: conditional AC, one best formula, resistances, spell-save advantage.
 * Run: npx tsx src/features/characters/gearDefense.selfcheck.ts
 */
import { computeArmorClass, mageArmorCompetingFormula } from '../../shared/dnd/armor'
import { adjustIncomingDamage } from '../../shared/dnd/damageTypes'
import { classicAutoArmorClass } from '../classicSheet/classicDerivedCombat'
import { sampleClassic2014Character } from '../classicSheet/sampleClassicCharacter'
import type { CharacterDetail } from '../../shared/api/characters'
import { createAttunementSlot } from './attunement'
import {
  aggregateGearEffects,
  formatResistanceSummary,
  formatSaveAdvantageNote,
  resolveGearAcBonus,
  sheetDamageProfile,
} from './gearEffects'
import { createInventoryItem, equippedArmorPieces, type InventoryItem } from './inventory'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function worn(partial: Partial<InventoryItem> & { id: string; name: string }): InventoryItem {
  return {
    ...createInventoryItem(),
    equipped: true,
    requires_attunement: true,
    ...partial,
  }
}

function acOf(input: {
  items: InventoryItem[]
  dex: number
  wis?: number
  con?: number
  monk?: boolean
  mageArmor?: boolean
}): number {
  const gear = aggregateGearEffects({
    items: input.items,
    attunements: input.items
      .filter((item) => item.requires_attunement)
      .map((item) => createAttunementSlot({ item_id: item.id, name: item.name })),
  })
  const pieces = equippedArmorPieces(input.items)
  const mods = {
    dex: input.dex,
    wis: input.wis ?? 0,
    con: input.con ?? 0,
    str: 0,
    int: 0,
    cha: 0,
  }
  const unarmoredDefense =
    pieces.armor || !input.monk
      ? null
      : { labelRu: 'Защита без доспехов', secondMod: 'wis' as const }
  const mage = input.mageArmor ? mageArmorCompetingFormula('Доспех мага') : null
  const extraFormulas = pieces.armor ? [] : [...gear.acFormulas, ...(mage ? [mage] : [])]
  const base = computeArmorClass({
    dexMod: input.dex,
    abilityMods: mods,
    armor: pieces.armor,
    shield: pieces.shield,
    unarmoredDefense,
    extraFormulas,
  })
  const gearAc = resolveGearAcBonus(gear, {
    wearingArmor: Boolean(pieces.armor),
    wearingShield: Boolean(pieces.shield),
  })
  return base.ac + gearAc.total
}

const bracers = worn({
  id: 'bracers',
  name: 'Наручи защиты',
  wear_slot: 'arms',
  effects: [{ type: 'ac_bonus', value: 2, condition: 'no_armor_no_shield' }],
})
const plate = worn({
  id: 'plate',
  name: 'Латы',
  armor_kind: 'heavy',
  base_ac: 18,
  requires_attunement: false,
})
const shield = worn({
  id: 'shield',
  name: 'Щит',
  armor_kind: 'shield',
  base_ac: 2,
  wear_slot: 'shield',
  requires_attunement: false,
})

assert(acOf({ items: [bracers], dex: 3, wis: 3, monk: true }) === 18, 'monk + bracers = 18')
assert(acOf({ items: [plate, bracers], dex: 0 }) === 18, 'plate + bracers stays 18')
assert(acOf({ items: [shield, bracers], dex: 3 }) === 15, 'shield blocks bracers')

const robe = worn({
  id: 'robe',
  name: 'Мантия архимага',
  wear_slot: 'robe',
  effects: [
    { type: 'ac_formula', base: 15, label: 'Мантия архимага' },
    { type: 'save_advantage', against: 'magic' },
    { type: 'spellcasting_bonus', value: 2, applies_to: 'both' },
  ],
})
assert(acOf({ items: [robe], dex: 2 }) === 17, 'robe 15+DEX = 17')
assert(acOf({ items: [robe], dex: 2, mageArmor: true }) === 17, 'robe beats mage armor')

const dwarven = worn({
  id: 'dwarven',
  name: 'Дварфийские латы',
  armor_kind: 'heavy',
  base_ac: 18,
  magic_bonus: 2,
  requires_attunement: false,
  effects: [{ type: 'ac_bonus', value: 2 }],
})
assert(acOf({ items: [dwarven], dex: 0 }) === 20, 'dwarven plate = 20, not 22')

const ring = worn({
  id: 'ring',
  name: 'Кольцо защиты',
  wear_slot: 'ring',
  effects: [
    { type: 'ac_bonus', value: 1 },
    { type: 'save_bonus', value: 1 },
  ],
})
const cloak = worn({
  id: 'cloak',
  name: 'Плащ защиты',
  wear_slot: 'cloak',
  effects: [
    { type: 'ac_bonus', value: 1 },
    { type: 'save_bonus', value: 1 },
  ],
})
assert(acOf({ items: [plate, ring, cloak], dex: 1 }) === 20, 'plate + ring + cloak = 20')
const saves = aggregateGearEffects({
  items: [ring, cloak],
  attunements: [ring, cloak].map((item) =>
    createAttunementSlot({ item_id: item.id, name: item.name }),
  ),
})
assert((saves.saveBonuses.all ?? 0) === 2, 'ring and cloak still add +2 to saves')

const badge = worn({
  id: 'badge',
  name: 'Значок стражи',
  effects: [{ type: 'ac_bonus', value: 2, condition: 'no_shield' }],
})
assert(acOf({ items: [badge], dex: 1 }) === 13, 'badge +2 without a shield')
assert(acOf({ items: [shield], dex: 1 }) === 13, 'shield alone is +2')
assert(acOf({ items: [badge, shield], dex: 1 }) === 13, 'badge does not stack on a shield')

const fireRing = worn({
  id: 'fire-ring',
  name: 'Кольцо сопротивления (огонь)',
  wear_slot: 'ring',
  effects: [{ type: 'resistance', damage_type: 'fire' }],
})
const withRing = sheetDamageProfile({
  raceSlug: 'human',
  gear: aggregateGearEffects({
    items: [fireRing],
    attunements: [createAttunementSlot({ item_id: fireRing.id, name: fireRing.name })],
  }),
})
assert(formatResistanceSummary(withRing) === 'огонь', 'fire ring lists огонь')
assert(
  adjustIncomingDamage({ amount: 10, type: 'fire', nonmagical: false, profile: withRing }).amount ===
    5,
  'fire 10 → 5',
)
const bare = sheetDamageProfile({
  gear: aggregateGearEffects({ items: [], attunements: [] }),
})
assert(
  adjustIncomingDamage({ amount: 10, type: 'fire', nonmagical: false, profile: bare }).amount === 10,
  'without the ring fire stays 10',
)

const tiefling = sheetDamageProfile({
  raceSlug: 'tiefling',
  raceResistances: ['огонь'],
  gear: aggregateGearEffects({
    items: [fireRing],
    attunements: [createAttunementSlot({ item_id: fireRing.id, name: fireRing.name })],
  }),
})
assert(tiefling.resistances.length === 1, 'race and ring are one resistance')
assert(
  adjustIncomingDamage({ amount: 10, type: 'fire', nonmagical: false, profile: tiefling }).amount ===
    5,
  'tiefling + ring still halves, not zero',
)
const tieflingOnly = sheetDamageProfile({ raceSlug: 'tiefling_asmodeus' })
assert(formatResistanceSummary(tieflingOnly) === 'огонь', 'tiefling slug fallback is fire')

const potion = worn({
  id: 'potion',
  name: 'Зелье сопротивления огню',
  requires_attunement: false,
  effects: [{ type: 'resistance', damage_type: 'fire', temporary: true }],
})
const sipped = sheetDamageProfile({
  gear: aggregateGearEffects({ items: [potion], attunements: [] }),
})
assert(sipped.resistances.length === 0, 'potion resistance waits for the buff pack')

const staff = worn({
  id: 'staff',
  name: 'Посох мага',
  wear_slot: 'held_main',
  effects: [{ type: 'save_advantage', against: 'spells' }],
})
const staffGear = aggregateGearEffects({
  items: [staff],
  attunements: [createAttunementSlot({ item_id: staff.id, name: staff.name })],
})
assert(
  formatSaveAdvantageNote(staffGear.saveAdvantages) === 'Преимущество против заклинаний: Посох мага',
  'staff save note',
)
const robeGear = aggregateGearEffects({
  items: [robe],
  attunements: [createAttunementSlot({ item_id: robe.id, name: robe.name })],
})
assert(
  formatSaveAdvantageNote(robeGear.saveAdvantages).includes('магических эффектов'),
  'robe covers magical effects',
)

const silentWeapon = worn({
  id: 'sword',
  name: 'Меч +1',
  weapon_grip: 'one_hand',
  wear_slot: 'held_main',
  magic_bonus: 1,
  requires_attunement: false,
  effects: [],
})
const swordGear = aggregateGearEffects({ items: [silentWeapon], attunements: [] })
assert(swordGear.byItem.sword?.attackBonus === 1, 'magic_bonus fills a missing attack')
assert(swordGear.byItem.sword?.damageBonus === 1, 'magic_bonus fills a missing damage')
const loud = aggregateGearEffects({
  items: [
    worn({
      id: 'loud',
      name: 'Меч +1 уже в эффектах',
      weapon_grip: 'one_hand',
      magic_bonus: 1,
      requires_attunement: false,
      effects: [
        { type: 'attack_bonus', value: 1 },
        { type: 'damage_bonus', value: 1 },
      ],
    }),
  ],
  attunements: [],
})
assert(loud.byItem.loud?.attackBonus === 1, 'existing attack effect is not doubled')

const classicPlate: CharacterDetail = {
  ...sampleClassic2014Character,
  sheet: {
    ...sampleClassic2014Character.sheet,
    combat: {
      ...(sampleClassic2014Character.sheet as { combat: Record<string, unknown> }).combat,
      ac: null,
    },
    inventory: {
      coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      notes: '',
      items: [plate, ring, cloak],
    },
    attunements: [ring, cloak].map((item) => ({
      id: item.id,
      item_id: item.id,
      name: item.name,
      notes: '',
    })),
  },
}
assert(classicAutoArmorClass(classicPlate) === 20, 'classic blank matches plate + ring + cloak')

console.log('gearDefense.selfcheck ok')
