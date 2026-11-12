/**
 * I06: +N weapon/armor/ammo pick a PHB base. Wand and pact rod use I03 bonuses.
 * Run from frontend/: npx tsx src/features/characters/gearBaseChoice.selfcheck.ts
 */
import type { CatalogEntry } from '../../shared/api/catalog.ts'
import { computeArmorClass } from '../../shared/dnd/armor.ts'
import { createClassLevel } from '../../shared/dnd/classLevels.ts'
import { findWeaponPreset } from '../../shared/dnd/weaponPresets.ts'
import { spellAttackBonus, spellSaveDc } from '../../shared/dnd/spells.ts'
import { createAttunementSlot } from './attunement.ts'
import type { AttunementCharacter } from './attunementRules.ts'
import { armorGivesStealthDisadvantage } from './deskRolls.ts'
import {
  aggregateGearEffects,
  appendSpellCastModifiers,
} from './gearEffects.ts'
import { inventoryItemFromCatalog } from './gearFromCatalog.ts'
import {
  applyBaseToGear,
  itemNeedsBaseChoice,
  weaponBase,
} from './gearBaseChoice.ts'
import { withSpellCastBonuses } from './modifiers.ts'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

function entry(partial: Partial<CatalogEntry> & Pick<CatalogEntry, 'kind' | 'slug' | 'name_ru' | 'data'>): CatalogEntry {
  return {
    id: partial.id ?? `id-${partial.slug}`,
    kind: partial.kind,
    slug: partial.slug,
    name_ru: partial.name_ru,
    name_en: partial.name_en ?? partial.slug,
    rules_edition: '2014',
    parent_id: null,
    source: 'DMG 2014',
    external_ref: null,
    data: partial.data,
    sort_order: 1,
    is_active: true,
    created_at: '',
    updated_at: '',
  }
}

const weaponPlus = entry({
  kind: 'weapon',
  slug: 'weapon_1',
  name_ru: 'Оружие +1',
  data: {
    ability: 'str',
    damage: '1к8',
    damage_type: 'рубящий',
    category: 'martial',
    properties: ['versatile'],
    weight_lb: 3,
    rarity: 'uncommon',
    magic_bonus: 1,
    family_slug: 'weapon_bonus',
    variant_key: '1',
    effects: [
      { type: 'attack_bonus', value: 1 },
      { type: 'damage_bonus', value: 1 },
    ],
    allowed_base_weapon: ['dagger', 'longsword'],
  },
})

const dagger = inventoryItemFromCatalog({ entry: weaponPlus, baseSlug: 'dagger' })
assert(dagger, 'dagger add')
assert(dagger.item.name === 'Кинжал +1', `name ${dagger.item.name}`)
assert(dagger.item.base_weapon_slug === 'dagger', 'base slug')
assert(dagger.item.catalog_slug === 'weapon_1', 'catalog stays the +1 family')
assert(dagger.attacks.length === 1, 'one attack card')
assert(dagger.attacks[0].damage === '1к4', `damage ${dagger.attacks[0].damage}`)
assert(dagger.attacks[0].damage_type === 'колющий', 'piercing')
assert(dagger.attacks[0].ability === 'dex', 'finesse ability')
const preset = findWeaponPreset(dagger.item.name)
assert(preset?.labelRu === 'Кинжал', 'dagger name still resolves the preset')
const daggerBase = weaponBase('dagger')
assert(daggerBase?.properties.includes('finesse'), 'finesse')
assert(daggerBase?.properties.includes('light'), 'light')
assert(daggerBase?.properties.includes('thrown'), 'thrown')
dagger.item.equipped = true
dagger.attacks[0].held = true
const daggerGear = aggregateGearEffects({
  items: [dagger.item],
  attunements: [],
})
assert(daggerGear.byItem[dagger.item.id]?.attackBonus === 1, 'attack +1')
assert(daggerGear.byItem[dagger.item.id]?.damageBonus === 1, 'damage +1')

const armorPlus = entry({
  kind: 'armor',
  slug: 'armor_1',
  name_ru: 'Доспех +1',
  data: {
    armor_kind: 'heavy',
    base_ac: 18,
    max_dex_bonus: 0,
    strength_requirement: 15,
    stealth_disadvantage: true,
    weight_lb: 65,
    rarity: 'rare',
    magic_bonus: 1,
    family_slug: 'armor_bonus',
    variant_key: '1',
    effects: [{ type: 'ac_bonus', value: 1 }],
    allowed_base_armor: ['chain_mail', 'plate_armor', 'leather_armor'],
  },
})
const mail = inventoryItemFromCatalog({ entry: armorPlus, baseSlug: 'chain_mail', equipArmor: true })
assert(mail, 'mail add')
assert(mail.item.name === 'Кольчуга +1', `armor name ${mail.item.name}`)
assert(mail.item.base_ac === 16, `ac ${mail.item.base_ac}`)
assert(mail.item.strength_requirement === 13, `str ${mail.item.strength_requirement}`)
assert(mail.item.stealth_disadvantage === true, 'stealth flag')
assert(mail.item.armor_kind === 'heavy', 'heavy')
const worn = computeArmorClass({
  dexMod: 2,
  armor: { kind: 'heavy', baseAc: mail.item.base_ac ?? 0, maxDexBonus: 0, name: mail.item.name },
  shield: null,
})
mail.item.equipped = true
const mailGear = aggregateGearEffects({ items: [mail.item], attunements: [] })
assert(worn.ac + mailGear.acBonus === 17, `AC ${worn.ac}+${mailGear.acBonus}`)
assert(
  armorGivesStealthDisadvantage({
    armorKind: 'heavy',
    armorName: mail.item.name,
    stealthDisadvantage: mail.item.stealth_disadvantage,
  }),
  'chain stealth',
)

const mithral = entry({
  kind: 'armor',
  slug: 'mithral_armor',
  name_ru: 'Мифриловый доспех',
  data: {
    armor_kind: 'medium',
    base_ac: 13,
    rarity: 'uncommon',
    effects: [],
    allowed_base_armor: ['plate_armor', 'chain_mail'],
    clear_stealth_disadvantage: true,
    clear_strength_requirement: true,
  },
})
const mithralPlate = inventoryItemFromCatalog({ entry: mithral, baseSlug: 'plate_armor' })
assert(mithralPlate, 'mithral')
assert(mithralPlate.item.strength_requirement == null, 'mithral clears strength')
assert(mithralPlate.item.stealth_disadvantage === false, 'mithral clears stealth')
assert(mithralPlate.item.base_ac === 18, 'plate ac under mithral')
assert(
  !armorGivesStealthDisadvantage({
    armorKind: 'heavy',
    armorName: mithralPlate.item.name,
    stealthDisadvantage: false,
  }),
  'mithral plate is not noisy',
)

const ammoPlus = entry({
  kind: 'item',
  slug: 'ammunition_2',
  name_ru: 'Боеприпас +2',
  data: {
    item_category: 'ammo',
    rarity: 'rare',
    magic_bonus: 2,
    family_slug: 'ammunition_bonus',
    variant_key: '2',
    effects: [
      { type: 'attack_bonus', value: 2 },
      { type: 'damage_bonus', value: 2 },
    ],
    allowed_base_ammo: ['arrow', 'crossbow_bolt'],
  },
})
const arrows = inventoryItemFromCatalog({ entry: ammoPlus, qty: 20, baseSlug: 'arrow' })
assert(arrows, 'arrows')
assert(arrows.item.name === 'Стрелы +2', `ammo name ${arrows.item.name}`)
assert(arrows.item.qty === 20, 'bundle')
assert(arrows.item.base_ammo_slug === 'arrow', 'ammo base')
assert(arrows.attacks.length === 1, 'launcher card')
assert(arrows.attacks[0].name === 'Длинный лук + Стрелы +2', arrows.attacks[0].name)
assert(arrows.attacks[0].damage === '1к8', 'longbow die')
assert(arrows.attacks[0].held === true, 'ammo card is live while the stack remains')
const ammoGear = aggregateGearEffects({ items: [arrows.item], attunements: [] })
assert(ammoGear.byItem[arrows.item.id]?.attackBonus === 2, 'ammo attack +2')
assert(ammoGear.byItem[arrows.item.id]?.damageBonus === 2, 'ammo damage +2')

const bare = inventoryItemFromCatalog({ entry: weaponPlus })
assert(bare && itemNeedsBaseChoice(bare.item), 'unset base asks to be chosen')
const picked = applyBaseToGear({ item: bare.item, attacks: bare.attacks, baseSlug: 'longsword', catalogName: 'Оружие +1' })
assert(picked?.item.name === 'Длинный меч +1', 'later choice renames')
assert(picked?.item.base_weapon_slug === 'longsword', 'later choice stores the base')

function gate(name: string, level: number): AttunementCharacter {
  return {
    classes: [createClassLevel({ name, level })],
    raceCatalogId: 'human',
    raceSlug: 'human',
    raceParentSlug: null,
    alignmentSlug: 'neutral_good',
    alignmentUnresolved: false,
  }
}

function castTotals(slug: string, className: string) {
  const row = inventoryItemFromCatalog({
    entry: entry({
      kind: 'item',
      slug,
      name_ru: slug,
      data:
        slug.startsWith('wand')
          ? {
              rarity: 'uncommon',
              requires_attunement: true,
              attunement_spellcaster: true,
              wear_slot: 'held_main',
              effects: [{ type: 'spellcasting_bonus', value: 1, applies_to: 'attack' }],
            }
          : {
              rarity: 'uncommon',
              requires_attunement: true,
              attunement_classes: ['warlock'],
              wear_slot: 'held_main',
              effects: [
                { type: 'spellcasting_bonus', value: 1, applies_to: 'both', class_scoped: true },
              ],
            },
    }),
  })
  assert(row, slug)
  row.item.equipped = true
  const gear = aggregateGearEffects({
    items: [row.item],
    attunements: [createAttunementSlot({ item_id: row.item.id, name: row.item.name })],
    gate: gate(className, 5),
  })
  const modifiers = appendSpellCastModifiers({
    modifiers: [],
    gear: { spellcastingLines: gear.spellcastingLines },
  })
  return withSpellCastBonuses({
    baseDc: spellSaveDc(3, 3),
    baseAttack: spellAttackBonus(3, 3),
    modifiers,
    vars: {},
    classSlug: className === 'wizard' ? 'wizard' : 'warlock',
  })
}

const wand = castTotals('wand_of_the_war_mage_1', 'wizard')
assert(wand.attack === 7 && wand.dc === 14, `wand ${wand.attack}/${wand.dc}`)
const rod = castTotals('rod_of_the_pact_keeper_1', 'warlock')
assert(rod.attack === 7 && rod.dc === 15, `rod ${rod.attack}/${rod.dc}`)

console.log('gearBaseChoice selfcheck ok')
