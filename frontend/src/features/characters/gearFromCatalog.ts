/**
 * Catalog entry → inventory row (+ optional attack cards for weapons).
 * Used by GearPickerDialog and any «добавить из справочника» flow.
 */

import type { CatalogEntry } from '../../shared/api/catalog'
import {
  formatGearCostRu,
  GEAR_RARITY_LABEL_RU,
  gearCostToGp,
  parseArmorCatalogData,
  parseItemCatalogData,
  parseWeaponCatalogData,
  type GearRarity,
  type ItemCategory,
} from '../../shared/dnd/gearCatalog'
import type { WeaponAttack } from './AttacksPanel'
import { resolveWeaponGrip } from './heldEquip'
import { classifySpellTooling, inferFocusKind } from './spellFocus'
import {
  armorFieldsFromCatalog,
  createInventoryItem,
  equipInventoryItem,
  type InventoryItem,
} from './inventory'
import { buildStartingWeaponAttacks } from './startingGearAttacks'

export type GearPickerKindFilter = 'all' | 'weapon' | 'armor' | 'item'

/** Optional item_category chips inside the gear picker (W1 tools/mounts). */
export type GearPickerItemCategoryFilter =
  | 'all'
  | 'tool'
  | 'mount'
  | 'tack'
  | 'vehicle'
  | 'pack'
  | 'other'

export const GEAR_ITEM_CATEGORY_LABEL_RU: Record<
  Exclude<GearPickerItemCategoryFilter, 'all'>,
  string
> = {
  tool: 'Инструменты',
  mount: 'Скакуны',
  tack: 'Сбруя',
  vehicle: 'Транспорт',
  pack: 'Наборы',
  other: 'Прочее',
}

export type GearCatalogSummary = {
  kind: 'weapon' | 'armor' | 'item'
  name_ru: string
  rarity: GearRarity
  rarity_label: string
  weight_lb: number | null
  cost_label: string
  requires_attunement: boolean
  item_category: ItemCategory | null
  family_slug: string
  family_label_ru: string
  variant_key: string
  variant_label_ru: string
  magic_bonus: number
  description_ru: string
  /** Short meta line for list rows. */
  meta_line: string
}

/** Rarity sort key for picker lists (mundane → artifact). */
export const GEAR_RARITY_RANK: Record<GearRarity, number> = {
  mundane: 0,
  common: 1,
  uncommon: 2,
  rare: 3,
  very_rare: 4,
  legendary: 5,
  artifact: 6,
}

export function summarizeGearEntry(entry: CatalogEntry): GearCatalogSummary | null {
  if (entry.kind !== 'weapon' && entry.kind !== 'armor' && entry.kind !== 'item') {
    return null
  }
  const data = entry.data ?? {}
  if (entry.kind === 'weapon') {
    const parsed = parseWeaponCatalogData(data)
    const bits = [
      parsed.damage ? `${parsed.damage} ${parsed.damage_type}`.trim() : '',
      parsed.weight_lb != null ? `${parsed.weight_lb} фнт` : '',
      formatGearCostRu(parsed.cost),
      parsed.requires_attunement ? 'настройка' : '',
      parsed.magic_bonus ? `+${parsed.magic_bonus}` : '',
    ].filter(Boolean)
    return {
      kind: 'weapon',
      name_ru: entry.name_ru,
      rarity: parsed.rarity,
      rarity_label: GEAR_RARITY_LABEL_RU[parsed.rarity],
      weight_lb: parsed.weight_lb,
      cost_label: formatGearCostRu(parsed.cost),
      requires_attunement: parsed.requires_attunement,
      item_category: null,
      family_slug: parsed.family_slug,
      family_label_ru: parsed.family_label_ru,
      variant_key: parsed.variant_key,
      variant_label_ru: parsed.variant_label_ru,
      magic_bonus: parsed.magic_bonus,
      description_ru: parsed.description_ru?.trim() || '',
      meta_line: bits.join(' · '),
    }
  }
  if (entry.kind === 'armor') {
    const parsed = parseArmorCatalogData(data)
    const armorKindRu =
      parsed.armor_kind === 'light'
        ? 'лёгкий'
        : parsed.armor_kind === 'medium'
          ? 'средний'
          : parsed.armor_kind === 'heavy'
            ? 'тяжёлый'
            : parsed.armor_kind === 'shield'
              ? 'щит'
              : ''
    const bits = [
      armorKindRu,
      parsed.base_ac != null
        ? parsed.armor_kind === 'shield'
          ? `+${parsed.base_ac}`
          : `КД ${parsed.base_ac}`
        : '',
      parsed.magic_bonus ? `+${parsed.magic_bonus}` : '',
      parsed.weight_lb != null ? `${parsed.weight_lb} фнт` : '',
      formatGearCostRu(parsed.cost),
      parsed.requires_attunement ? 'настройка' : '',
    ].filter(Boolean)
    return {
      kind: 'armor',
      name_ru: entry.name_ru,
      rarity: parsed.rarity,
      rarity_label: GEAR_RARITY_LABEL_RU[parsed.rarity],
      weight_lb: parsed.weight_lb,
      cost_label: formatGearCostRu(parsed.cost),
      requires_attunement: parsed.requires_attunement,
      item_category: null,
      family_slug: parsed.family_slug,
      family_label_ru: parsed.family_label_ru,
      variant_key: parsed.variant_key,
      variant_label_ru: parsed.variant_label_ru,
      magic_bonus: parsed.magic_bonus,
      description_ru: parsed.description_ru?.trim() || '',
      meta_line: bits.join(' · '),
    }
  }
  const parsed = parseItemCatalogData(data)
  const categoryLabel =
    parsed.item_category === 'tool'
      ? GEAR_ITEM_CATEGORY_LABEL_RU.tool
      : parsed.item_category === 'mount'
        ? GEAR_ITEM_CATEGORY_LABEL_RU.mount
        : parsed.item_category === 'tack'
          ? GEAR_ITEM_CATEGORY_LABEL_RU.tack
          : parsed.item_category === 'vehicle'
            ? GEAR_ITEM_CATEGORY_LABEL_RU.vehicle
            : parsed.item_category === 'pack'
              ? GEAR_ITEM_CATEGORY_LABEL_RU.pack
              : parsed.item_category !== 'other'
                ? parsed.item_category
                : ''
  const bits = [
    categoryLabel,
    parsed.weight_lb != null ? `${parsed.weight_lb} фнт` : '',
    formatGearCostRu(parsed.cost),
    parsed.contents.length > 0 ? `набор ×${parsed.contents.length}` : '',
    parsed.requires_attunement ? 'настройка' : '',
  ].filter(Boolean)
  return {
    kind: 'item',
    name_ru: entry.name_ru,
    rarity: parsed.rarity,
    rarity_label: GEAR_RARITY_LABEL_RU[parsed.rarity],
    weight_lb: parsed.weight_lb,
    cost_label: formatGearCostRu(parsed.cost),
    requires_attunement: parsed.requires_attunement,
    item_category: parsed.item_category,
    family_slug: parsed.family_slug,
    family_label_ru: parsed.family_label_ru,
    variant_key: parsed.variant_key,
    variant_label_ru: parsed.variant_label_ru,
    magic_bonus: 0,
    description_ru: parsed.description_ru?.trim() || '',
    meta_line: bits.join(' · '),
  }
}

export type GearAddResult = {
  item: InventoryItem
  attacks: WeaponAttack[]
  /** True when armor/shield should be auto-equipped. */
  equip: boolean
}

function newAttackId(inventoryItemId: string, index: number, cardCount: number): string {
  const base = `pick-eq:${inventoryItemId}`
  return cardCount <= 1 ? base : `${base}:${index}`
}

/** Build inventory row (+ weapon attacks) from a catalog entry. */
export function inventoryItemFromCatalog(input: {
  entry: CatalogEntry
  qty?: number
  equipArmor?: boolean
}): GearAddResult | null {
  const { entry } = input
  if (entry.kind !== 'weapon' && entry.kind !== 'armor' && entry.kind !== 'item') {
    return null
  }
  const qty = Math.max(1, Math.floor(input.qty ?? 1))
  const created = createInventoryItem()
  created.name = entry.name_ru
  created.catalog_id = entry.id
  created.qty = qty
  created.notes = 'Из справочника'

  if (entry.kind === 'weapon') {
    const parsed = parseWeaponCatalogData(entry.data ?? {})
    created.weight_lb = parsed.weight_lb
    created.cost_gp = gearCostToGp(parsed.cost)
    created.weapon_grip = resolveWeaponGrip({
      name: entry.name_ru,
      data: entry.data ?? {},
    })
    created.spell_tooling = 'none'
    created.wear_slot = parsed.wear_slot
    created.requires_attunement = parsed.requires_attunement
    created.effects = parsed.effects
    // Carried in pack by default — draw («В руках») is a separate action.
    created.equipped = false
    const built = buildStartingWeaponAttacks({
      name: entry.name_ru,
      qty,
      makeId: (index, cardCount) => newAttackId(created.id, index, cardCount),
      inventoryItemId: created.id,
      held: false,
    })
    // Prefer catalog damage/ability when preset missed or is empty.
    const attacks: WeaponAttack[] = built.attacks.map((attack) => ({
      ...attack,
      catalog_id: entry.id,
      ability: parsed.ability || attack.ability,
      damage: parsed.damage || attack.damage,
      damage_type: parsed.damage_type || attack.damage_type,
      source_kind: 'weapon',
      inventory_item_id: created.id,
      held: false,
    }))
    // If preset didn't resolve, still add one attack from catalog stats when present.
    if (attacks.length === 0 && (parsed.damage || parsed.damage_type)) {
      attacks.push({
        id: newAttackId(created.id, 0, 1),
        name: entry.name_ru,
        catalog_id: entry.id,
        source_kind: 'weapon',
        ability: parsed.ability,
        is_proficient: true,
        damage: parsed.damage,
        damage_type: parsed.damage_type,
        qty: qty > 1 ? qty : null,
        inventory_item_id: created.id,
        held: false,
      })
    }
    return { item: created, attacks, equip: false }
  }

  if (entry.kind === 'armor') {
    const armor = armorFieldsFromCatalog(entry)
    const parsed = parseArmorCatalogData(entry.data ?? {})
    created.armor_kind = armor.armor_kind ?? 'none'
    created.base_ac = armor.base_ac ?? null
    created.weight_lb = armor.weight_lb ?? null
    created.max_dex_bonus = armor.max_dex_bonus ?? null
    created.strength_requirement = armor.strength_requirement ?? null
    created.cost_gp = gearCostToGp(parsed.cost)
    created.spell_tooling = 'none'
    created.wear_slot = parsed.wear_slot
    created.requires_attunement = parsed.requires_attunement
    created.effects = parsed.effects
    const equip =
      input.equipArmor !== false &&
      (created.armor_kind === 'light' ||
        created.armor_kind === 'medium' ||
        created.armor_kind === 'heavy' ||
        created.armor_kind === 'shield')
    return { item: created, attacks: [], equip }
  }

  const parsed = parseItemCatalogData(entry.data ?? {})
  let weight = parsed.weight_lb
  if ((weight == null || weight === 0) && parsed.contents.length > 0) {
    // Collapsed pack bulk unknown until catalog children resolve — leave null;
    // InventoryPanel hydrate fills from contents when catalog loads.
    weight = parsed.weight_lb
  }
  created.weight_lb = weight
  created.cost_gp = gearCostToGp(parsed.cost)
  created.spell_tooling = classifySpellTooling({
    name: entry.name_ru,
    catalog_slug: entry.slug,
    item_category: parsed.item_category,
  })
  created.focus_kind =
    created.spell_tooling === 'focus'
      ? inferFocusKind({
          name: entry.name_ru,
          catalog_slug: entry.slug,
          item_category: parsed.item_category,
        }) ?? 'any'
      : null
  created.wear_slot = parsed.wear_slot
  created.requires_attunement = parsed.requires_attunement
  created.effects = parsed.effects
  created.container_kind =
    parsed.item_category === 'pack' || parsed.contents.length > 0
      ? 'pack'
      : parsed.item_category === 'tool'
        ? 'kit'
        : parsed.item_category === 'container'
          ? 'container'
          : 'none'
  return { item: created, attacks: [], equip: false }
}

/** Append catalog gear into inventory (+ attacks), optionally auto-equip armor. */
export function applyGearAdd(input: {
  items: InventoryItem[]
  weapons: WeaponAttack[]
  result: GearAddResult
}): { items: InventoryItem[]; weapons: WeaponAttack[] } {
  let items = [...input.items, input.result.item]
  if (input.result.equip) {
    items = equipInventoryItem(items, input.result.item.id, true)
  }
  return {
    items,
    weapons: [...input.weapons, ...input.result.attacks],
  }
}

export type GearFamilyGroup = {
  family_slug: string
  family_label_ru: string
  entries: CatalogEntry[]
}

function rarityRankOf(entry: CatalogEntry): number {
  const summary = summarizeGearEntry(entry)
  if (!summary) return 0
  return GEAR_RARITY_RANK[summary.rarity] ?? 0
}

/** Group catalog rows that share family_slug; singles stay as one-entry groups. */
export function groupGearByFamily(entries: CatalogEntry[]): GearFamilyGroup[] {
  const families = new Map<string, GearFamilyGroup>()
  const singles: GearFamilyGroup[] = []
  for (const entry of entries) {
    const summary = summarizeGearEntry(entry)
    if (!summary) continue
    // Family stub rows ("+1, +2 или +3") — hide; use concrete variants.
    if (summary.variant_key === 'varies') continue
    if (!summary.family_slug) {
      singles.push({
        family_slug: entry.slug,
        family_label_ru: entry.name_ru,
        entries: [entry],
      })
      continue
    }
    const prev = families.get(summary.family_slug)
    if (prev) {
      prev.entries.push(entry)
      if (!prev.family_label_ru && summary.family_label_ru) {
        prev.family_label_ru = summary.family_label_ru
      }
    } else {
      families.set(summary.family_slug, {
        family_slug: summary.family_slug,
        family_label_ru: summary.family_label_ru || entry.name_ru,
        entries: [entry],
      })
    }
  }
  const grouped = [...families.values()].map((group) => ({
    ...group,
    entries: [...group.entries].sort((a, b) => {
      const byRarity = rarityRankOf(a) - rarityRankOf(b)
      if (byRarity !== 0) return byRarity
      return a.sort_order - b.sort_order
    }),
  }))
  return [...grouped, ...singles].sort((a, b) => {
    const aRank = Math.min(...a.entries.map(rarityRankOf))
    const bRank = Math.min(...b.entries.map(rarityRankOf))
    if (aRank !== bRank) return aRank - bRank
    return a.family_label_ru.localeCompare(b.family_label_ru, 'ru')
  })
}
