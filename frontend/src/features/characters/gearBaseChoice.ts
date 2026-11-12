/**
 * Magic armor, shields, weapons and ammunition whose card does not fix a
 * PHB base. The player picks one allowed base; stats come from that base
 * and the magic effects stay on the catalog row.
 */

import type { AbilityKey } from './sheetTypes'
import type { WeaponAttack } from './AttacksPanel'
import { resolveWeaponGrip } from './heldEquip'
import type { ArmorKind } from '../../shared/dnd/armor'
import type { InventoryItem } from './inventory'

export type WeaponBase = {
  slug: string
  nameRu: string
  ability: AbilityKey
  damage: string
  damageType: string
  properties: string[]
  weightLb: number
  versatile: string
  ranged: boolean
}

export type ArmorBase = {
  slug: string
  nameRu: string
  kind: Exclude<ArmorKind, 'none'>
  baseAc: number
  maxDex: number | null
  strength: number | null
  stealth: boolean
  weightLb: number
}

export type AmmoBase = {
  slug: string
  nameRu: string
  pluralRu: string
  weightLb: number
  bundleQty: number
  launcherSlug: string
}

/** PHB 2014 weapon rows. Stats match the gear catalog slugs. */
export const PHB_WEAPON_BASES: WeaponBase[] = [
  { slug: 'club', nameRu: 'Дубинка', ability: 'str', damage: '1к4', damageType: 'дробящий', properties: ['light', 'monk'], weightLb: 2, versatile: '', ranged: false },
  { slug: 'dagger', nameRu: 'Кинжал', ability: 'dex', damage: '1к4', damageType: 'колющий', properties: ['finesse', 'light', 'monk', 'thrown'], weightLb: 1, versatile: '', ranged: false },
  { slug: 'greatclub', nameRu: 'Палица', ability: 'str', damage: '1к8', damageType: 'дробящий', properties: ['two-handed'], weightLb: 10, versatile: '', ranged: false },
  { slug: 'handaxe', nameRu: 'Ручной топор', ability: 'str', damage: '1к6', damageType: 'рубящий', properties: ['light', 'monk', 'thrown'], weightLb: 2, versatile: '', ranged: false },
  { slug: 'javelin', nameRu: 'Метательное копьё', ability: 'str', damage: '1к6', damageType: 'колющий', properties: ['monk', 'thrown'], weightLb: 2, versatile: '', ranged: false },
  { slug: 'light_hammer', nameRu: 'Лёгкий молот', ability: 'str', damage: '1к4', damageType: 'дробящий', properties: ['light', 'monk', 'thrown'], weightLb: 2, versatile: '', ranged: false },
  { slug: 'mace', nameRu: 'Булава', ability: 'str', damage: '1к6', damageType: 'дробящий', properties: ['monk'], weightLb: 4, versatile: '', ranged: false },
  { slug: 'quarterstaff', nameRu: 'Боевой посох', ability: 'str', damage: '1к6', damageType: 'дробящий', properties: ['monk', 'versatile'], weightLb: 4, versatile: '1к8', ranged: false },
  { slug: 'sickle', nameRu: 'Серп', ability: 'str', damage: '1к4', damageType: 'рубящий', properties: ['light', 'monk'], weightLb: 2, versatile: '', ranged: false },
  { slug: 'spear', nameRu: 'Копьё', ability: 'str', damage: '1к6', damageType: 'колющий', properties: ['monk', 'thrown', 'versatile'], weightLb: 3, versatile: '1к8', ranged: false },
  { slug: 'crossbow_light', nameRu: 'Лёгкий арбалет', ability: 'dex', damage: '1к8', damageType: 'колющий', properties: ['ammunition', 'loading', 'two-handed'], weightLb: 5, versatile: '', ranged: true },
  { slug: 'dart', nameRu: 'Дротик', ability: 'dex', damage: '1к4', damageType: 'колющий', properties: ['finesse', 'thrown'], weightLb: 0.25, versatile: '', ranged: true },
  { slug: 'shortbow', nameRu: 'Короткий лук', ability: 'dex', damage: '1к6', damageType: 'колющий', properties: ['ammunition', 'two-handed'], weightLb: 2, versatile: '', ranged: true },
  { slug: 'sling', nameRu: 'Праща', ability: 'dex', damage: '1к4', damageType: 'дробящий', properties: ['ammunition'], weightLb: 0, versatile: '', ranged: true },
  { slug: 'battleaxe', nameRu: 'Боевой топор', ability: 'str', damage: '1к8', damageType: 'рубящий', properties: ['versatile'], weightLb: 4, versatile: '1к10', ranged: false },
  { slug: 'flail', nameRu: 'Цеп', ability: 'str', damage: '1к8', damageType: 'дробящий', properties: [], weightLb: 2, versatile: '', ranged: false },
  { slug: 'glaive', nameRu: 'Глефа', ability: 'str', damage: '1к10', damageType: 'рубящий', properties: ['heavy', 'reach', 'two-handed'], weightLb: 6, versatile: '', ranged: false },
  { slug: 'greataxe', nameRu: 'Секира', ability: 'str', damage: '1к12', damageType: 'рубящий', properties: ['heavy', 'two-handed'], weightLb: 7, versatile: '', ranged: false },
  { slug: 'greatsword', nameRu: 'Двуручный меч', ability: 'str', damage: '2к6', damageType: 'рубящий', properties: ['heavy', 'two-handed'], weightLb: 6, versatile: '', ranged: false },
  { slug: 'halberd', nameRu: 'Алебарда', ability: 'str', damage: '1к10', damageType: 'рубящий', properties: ['heavy', 'reach', 'two-handed'], weightLb: 6, versatile: '', ranged: false },
  { slug: 'lance', nameRu: 'Длинное копьё', ability: 'str', damage: '1к12', damageType: 'колющий', properties: ['reach', 'special'], weightLb: 6, versatile: '', ranged: false },
  { slug: 'longsword', nameRu: 'Длинный меч', ability: 'str', damage: '1к8', damageType: 'рубящий', properties: ['versatile'], weightLb: 3, versatile: '1к10', ranged: false },
  { slug: 'maul', nameRu: 'Молот', ability: 'str', damage: '2к6', damageType: 'дробящий', properties: ['heavy', 'two-handed'], weightLb: 10, versatile: '', ranged: false },
  { slug: 'morningstar', nameRu: 'Моргенштерн', ability: 'str', damage: '1к8', damageType: 'колющий', properties: [], weightLb: 4, versatile: '', ranged: false },
  { slug: 'pike', nameRu: 'Пика', ability: 'str', damage: '1к10', damageType: 'колющий', properties: ['heavy', 'reach', 'two-handed'], weightLb: 18, versatile: '', ranged: false },
  { slug: 'rapier', nameRu: 'Рапира', ability: 'dex', damage: '1к8', damageType: 'колющий', properties: ['finesse'], weightLb: 2, versatile: '', ranged: false },
  { slug: 'scimitar', nameRu: 'Скимитар', ability: 'dex', damage: '1к6', damageType: 'рубящий', properties: ['finesse', 'light'], weightLb: 3, versatile: '', ranged: false },
  { slug: 'shortsword', nameRu: 'Короткий меч', ability: 'dex', damage: '1к6', damageType: 'колющий', properties: ['finesse', 'light', 'monk'], weightLb: 2, versatile: '', ranged: false },
  { slug: 'trident', nameRu: 'Трезубец', ability: 'str', damage: '1к6', damageType: 'колющий', properties: ['thrown', 'versatile'], weightLb: 4, versatile: '1к8', ranged: false },
  { slug: 'war_pick', nameRu: 'Боевая кирка', ability: 'str', damage: '1к8', damageType: 'колющий', properties: [], weightLb: 2, versatile: '', ranged: false },
  { slug: 'warhammer', nameRu: 'Боевой молот', ability: 'str', damage: '1к8', damageType: 'дробящий', properties: ['versatile'], weightLb: 2, versatile: '1к10', ranged: false },
  { slug: 'whip', nameRu: 'Кнут', ability: 'dex', damage: '1к4', damageType: 'рубящий', properties: ['finesse', 'reach'], weightLb: 3, versatile: '', ranged: false },
  { slug: 'blowgun', nameRu: 'Духовая трубка', ability: 'dex', damage: '1', damageType: 'колющий', properties: ['ammunition', 'loading'], weightLb: 1, versatile: '', ranged: true },
  { slug: 'crossbow_hand', nameRu: 'Ручной арбалет', ability: 'dex', damage: '1к6', damageType: 'колющий', properties: ['ammunition', 'light', 'loading'], weightLb: 3, versatile: '', ranged: true },
  { slug: 'crossbow_heavy', nameRu: 'Тяжёлый арбалет', ability: 'dex', damage: '1к10', damageType: 'колющий', properties: ['ammunition', 'heavy', 'loading', 'two-handed'], weightLb: 18, versatile: '', ranged: true },
  { slug: 'longbow', nameRu: 'Длинный лук', ability: 'dex', damage: '1к8', damageType: 'колющий', properties: ['ammunition', 'heavy', 'two-handed'], weightLb: 2, versatile: '', ranged: true },
  { slug: 'net', nameRu: 'Сеть', ability: 'dex', damage: '', damageType: '', properties: ['special', 'thrown'], weightLb: 3, versatile: '', ranged: true },
]

export const PHB_ARMOR_BASES: ArmorBase[] = [
  { slug: 'padded_armor', nameRu: 'Стёганый доспех', kind: 'light', baseAc: 11, maxDex: null, strength: null, stealth: true, weightLb: 8 },
  { slug: 'leather_armor', nameRu: 'Кожаный доспех', kind: 'light', baseAc: 11, maxDex: null, strength: null, stealth: false, weightLb: 10 },
  { slug: 'studded_leather_armor', nameRu: 'Проклёпанный кожаный доспех', kind: 'light', baseAc: 12, maxDex: null, strength: null, stealth: false, weightLb: 13 },
  { slug: 'hide_armor', nameRu: 'Шкурный доспех', kind: 'medium', baseAc: 12, maxDex: 2, strength: null, stealth: false, weightLb: 12 },
  { slug: 'chain_shirt', nameRu: 'Кольчужная рубаха', kind: 'medium', baseAc: 13, maxDex: 2, strength: null, stealth: false, weightLb: 20 },
  { slug: 'scale_mail', nameRu: 'Чешуйчатый доспех', kind: 'medium', baseAc: 14, maxDex: 2, strength: null, stealth: true, weightLb: 45 },
  { slug: 'breastplate', nameRu: 'Кираса', kind: 'medium', baseAc: 14, maxDex: 2, strength: null, stealth: false, weightLb: 20 },
  { slug: 'half_plate_armor', nameRu: 'Полулаты', kind: 'medium', baseAc: 15, maxDex: 2, strength: null, stealth: true, weightLb: 40 },
  { slug: 'ring_mail', nameRu: 'Колечный доспех', kind: 'heavy', baseAc: 14, maxDex: 0, strength: null, stealth: true, weightLb: 40 },
  { slug: 'chain_mail', nameRu: 'Кольчуга', kind: 'heavy', baseAc: 16, maxDex: 0, strength: 13, stealth: true, weightLb: 55 },
  { slug: 'splint_armor', nameRu: 'Наборный доспех', kind: 'heavy', baseAc: 17, maxDex: 0, strength: 15, stealth: true, weightLb: 60 },
  { slug: 'plate_armor', nameRu: 'Латы', kind: 'heavy', baseAc: 18, maxDex: 0, strength: 15, stealth: true, weightLb: 65 },
  { slug: 'shield', nameRu: 'Щит', kind: 'shield', baseAc: 2, maxDex: null, strength: null, stealth: false, weightLb: 6 },
]

export const PHB_AMMO_BASES: AmmoBase[] = [
  { slug: 'arrow', nameRu: 'Стрела', pluralRu: 'Стрелы', weightLb: 1, bundleQty: 20, launcherSlug: 'longbow' },
  { slug: 'crossbow_bolt', nameRu: 'Арбалетный болт', pluralRu: 'Арбалетные болты', weightLb: 1.5, bundleQty: 20, launcherSlug: 'crossbow_heavy' },
  { slug: 'blowgun_needle', nameRu: 'Игла для духовой трубки', pluralRu: 'Иглы духовой трубки', weightLb: 1, bundleQty: 50, launcherSlug: 'blowgun' },
  { slug: 'sling_bullet', nameRu: 'Снаряд для пращи', pluralRu: 'Снаряды пращи', weightLb: 1.5, bundleQty: 20, launcherSlug: 'sling' },
]

const WEAPON_BY_SLUG = new Map(PHB_WEAPON_BASES.map((row) => [row.slug, row]))
const ARMOR_BY_SLUG = new Map(PHB_ARMOR_BASES.map((row) => [row.slug, row]))
const AMMO_BY_SLUG = new Map(PHB_AMMO_BASES.map((row) => [row.slug, row]))

const PLUS_FAMILIES = new Set([
  'weapon_bonus',
  'armor_bonus',
  'ammunition_bonus',
  'shield_bonus',
])

export type BaseChoiceKind = 'weapon' | 'armor' | 'ammo'

export type BaseChoice = {
  kind: BaseChoiceKind
  slugs: string[]
}

export type BaseOption = {
  slug: string
  nameRu: string
}

function readSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const row of value) {
    if (typeof row !== 'string') continue
    const slug = row.trim()
    if (slug && !out.includes(slug)) out.push(slug)
  }
  return out
}

export function weaponBase(slug: string | null | undefined): WeaponBase | null {
  if (!slug) return null
  return WEAPON_BY_SLUG.get(slug) ?? null
}

export function armorBase(slug: string | null | undefined): ArmorBase | null {
  if (!slug) return null
  return ARMOR_BY_SLUG.get(slug) ?? null
}

export function ammoBase(slug: string | null | undefined): AmmoBase | null {
  if (!slug) return null
  return AMMO_BY_SLUG.get(slug) ?? null
}

export function baseChoiceFromData(
  data: Record<string, unknown> | null | undefined,
): BaseChoice | null {
  if (!data) return null
  const weapon = readSlugs(data.allowed_base_weapon)
  if (weapon.length) return { kind: 'weapon', slugs: weapon }
  const armor = readSlugs(data.allowed_base_armor)
  if (armor.length) return { kind: 'armor', slugs: armor }
  const ammo = readSlugs(data.allowed_base_ammo)
  if (ammo.length) return { kind: 'ammo', slugs: ammo }
  return null
}

export function baseChoiceFromItem(item: InventoryItem): BaseChoice | null {
  return baseChoiceFromData({
    allowed_base_weapon: item.allowed_base_weapon,
    allowed_base_armor: item.allowed_base_armor,
    allowed_base_ammo: item.allowed_base_ammo,
  })
}

export function baseOptions(choice: BaseChoice): BaseOption[] {
  const out: BaseOption[] = []
  for (const slug of choice.slugs) {
    if (choice.kind === 'weapon') {
      const row = weaponBase(slug)
      if (row) out.push({ slug, nameRu: row.nameRu })
    } else if (choice.kind === 'armor') {
      const row = armorBase(slug)
      if (row) out.push({ slug, nameRu: row.nameRu })
    } else {
      const row = ammoBase(slug)
      if (row) out.push({ slug, nameRu: row.pluralRu })
    }
  }
  return out
}

export function currentBaseSlug(item: InventoryItem): string {
  return item.base_weapon_slug || item.base_armor_slug || item.base_ammo_slug || ''
}

export function itemNeedsBaseChoice(item: InventoryItem): boolean {
  const choice = baseChoiceFromItem(item)
  if (!choice) return false
  return !currentBaseSlug(item)
}

export function baseChoiceLabel(kind: BaseChoiceKind): string {
  if (kind === 'armor') return 'Базовый доспех'
  if (kind === 'ammo') return 'Базовый боеприпас'
  return 'Базовое оружие'
}

export function ammoBundleQty(slug: string): number {
  return ammoBase(slug)?.bundleQty ?? 1
}

function plusSuffix(item: InventoryItem): string | null {
  const family = item.family_slug || ''
  if (!PLUS_FAMILIES.has(family)) return null
  const fromVariant = Number(item.variant_key)
  if (Number.isFinite(fromVariant) && fromVariant > 0) return `+${Math.floor(fromVariant)}`
  const bonus = item.magic_bonus ?? 0
  if (bonus > 0) return `+${bonus}`
  return null
}

export function displayNameForBase(input: {
  item: InventoryItem
  baseName: string
  catalogName?: string
  ammoPlural?: string
}): string {
  const plus = plusSuffix(input.item)
  if (plus) {
    const head =
      input.item.family_slug === 'ammunition_bonus' && input.ammoPlural
        ? input.ammoPlural
        : input.baseName
    return `${head} ${plus}`
  }
  const stem = (input.catalogName ?? input.item.name ?? '')
    .replace(/\s+\([^)]+\)\s*$/, '')
    .trim()
  return stem ? `${stem} (${input.baseName})` : input.baseName
}

function copyLists(item: InventoryItem, data: Record<string, unknown> | null | undefined): void {
  const choice = baseChoiceFromData(data)
  if (!choice) return
  if (choice.kind === 'weapon') item.allowed_base_weapon = choice.slugs
  if (choice.kind === 'armor') item.allowed_base_armor = choice.slugs
  if (choice.kind === 'ammo') item.allowed_base_ammo = choice.slugs
  if (data?.clear_stealth_disadvantage === true) item.clear_stealth_disadvantage = true
  if (data?.clear_strength_requirement === true) item.clear_strength_requirement = true
}

/** Remember which bases the card allows. Does not pick one. */
export function stampBaseChoiceMeta(
  item: InventoryItem,
  data: Record<string, unknown> | null | undefined,
): void {
  copyLists(item, data)
}

function newAttackId(itemId: string): string {
  return `pick-eq:${itemId}`
}

function writeAttacks(
  itemId: string,
  attacks: WeaponAttack[],
  patch: Pick<WeaponAttack, 'name' | 'ability' | 'damage' | 'damage_type' | 'held'>,
): WeaponAttack[] {
  const linked = attacks.filter((row) => row.inventory_item_id === itemId)
  const rest = attacks.filter((row) => row.inventory_item_id !== itemId)
  if (linked.length === 0) {
    rest.push({
      id: newAttackId(itemId),
      name: patch.name,
      catalog_id: null,
      source_kind: 'weapon',
      ability: patch.ability,
      is_proficient: true,
      damage: patch.damage,
      damage_type: patch.damage_type,
      inventory_item_id: itemId,
      held: patch.held,
    })
    return rest
  }
  return [
    ...rest,
    ...linked.map((row) => ({
      ...row,
      name: patch.name,
      ability: patch.ability,
      damage: patch.damage,
      damage_type: patch.damage_type,
      held: patch.held,
    })),
  ]
}

/**
 * Fold a chosen PHB base into an inventory row and its attack cards.
 * Returns null when the slug is not allowed for this item.
 */
export function applyBaseToGear(input: {
  item: InventoryItem
  attacks: WeaponAttack[]
  baseSlug: string
  catalogName?: string
}): { item: InventoryItem; attacks: WeaponAttack[] } | null {
  const choice = baseChoiceFromItem(input.item)
  const slug = input.baseSlug.trim()
  if (!choice || !slug || !choice.slugs.includes(slug)) return null
  const item: InventoryItem = { ...input.item }

  if (choice.kind === 'weapon') {
    const base = weaponBase(slug)
    if (!base) return null
    const name = displayNameForBase({
      item,
      baseName: base.nameRu,
      catalogName: input.catalogName,
    })
    item.name = name
    item.base_weapon_slug = slug
    item.base_armor_slug = null
    item.base_ammo_slug = null
    item.weight_lb = base.weightLb
    item.armor_kind = 'none'
    item.weapon_grip = resolveWeaponGrip({ name })
    const attacks = writeAttacks(item.id, input.attacks, {
      name,
      ability: base.ability,
      damage: base.damage,
      damage_type: base.damageType,
      held: Boolean(item.equipped),
    })
    return { item, attacks }
  }

  if (choice.kind === 'armor') {
    const base = armorBase(slug)
    if (!base) return null
    const name = displayNameForBase({
      item,
      baseName: base.nameRu,
      catalogName: input.catalogName,
    })
    item.name = name
    item.base_armor_slug = slug
    item.base_weapon_slug = null
    item.base_ammo_slug = null
    item.armor_kind = base.kind
    item.base_ac = base.baseAc
    item.max_dex_bonus = base.maxDex
    item.weight_lb = base.weightLb
    item.strength_requirement = item.clear_strength_requirement ? null : base.strength
    item.stealth_disadvantage = item.clear_stealth_disadvantage ? false : base.stealth
    if (base.kind === 'shield') item.weapon_grip = null
    return { item, attacks: input.attacks }
  }

  const ammo = ammoBase(slug)
  const launcher = ammo ? weaponBase(ammo.launcherSlug) : null
  if (!ammo || !launcher) return null
  const name = displayNameForBase({
    item,
    baseName: ammo.pluralRu,
    catalogName: input.catalogName,
    ammoPlural: ammo.pluralRu,
  })
  item.name = name
  item.base_ammo_slug = slug
  item.base_weapon_slug = null
  item.base_armor_slug = null
  item.armor_kind = 'none'
  item.weapon_grip = null
  item.weight_lb = ammo.weightLb
  const cardName = `${launcher.nameRu} + ${name}`
  const attacks = writeAttacks(item.id, input.attacks, {
    name: cardName,
    ability: launcher.ability,
    damage: launcher.damage,
    damage_type: launcher.damageType,
    held: (item.qty ?? 0) > 0,
  })
  return { item, attacks }
}
