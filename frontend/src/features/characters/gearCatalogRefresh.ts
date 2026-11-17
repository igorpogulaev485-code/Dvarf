/**
 * I23 — live refresh of catalog-backed inventory rules on the client (mirrors
 * backend `refresh_inventory_from_catalog` / `_copy_rules`).
 * Player fields (name, qty, notes, equipped, attunement link, charge pools) stay intact.
 */

import type { CatalogEntry } from '../../shared/api/catalog'
import {
  parseArmorCatalogData,
  parseItemCatalogData,
  parseWeaponCatalogData,
  type GearEffect,
} from '../../shared/dnd/gearCatalog'
import type { InventoryItem } from './inventory'
import { armorFieldsFromCatalog, readAttunementAlternatives } from './inventory'

function readSlugList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const list = value
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .map((item) => item.trim())
  return list.length ? list : undefined
}

function copyAttunementRules(item: InventoryItem, data: Record<string, unknown>) {
  if (typeof data.family_slug === 'string' && data.family_slug.trim()) {
    item.family_slug = data.family_slug.trim()
  }
  if (typeof data.variant_key === 'string' && data.variant_key.trim()) {
    item.variant_key = data.variant_key.trim()
  }
  if (data.single_attunement_family === true) item.single_attunement_family = true
  else if (data.single_attunement_family === false) item.single_attunement_family = undefined
  if (data.alignment_color_gate === true) item.alignment_color_gate = true
  else if (data.alignment_color_gate === false) item.alignment_color_gate = undefined
  if (data.attunement_spellcaster === true) item.attunement_spellcaster = true
  else if (data.attunement_spellcaster === false) item.attunement_spellcaster = undefined
  const alternatives = readAttunementAlternatives(data.attunement_alternatives)
  if (alternatives) item.attunement_alternatives = alternatives
  if (data.is_spell_focus === true) item.is_spell_focus = true
  const classes = readSlugList(data.attunement_classes)
  const races = readSlugList(data.attunement_races)
  const alignments = readSlugList(data.attunement_alignments)
  if (classes) item.attunement_classes = classes
  if (races) item.attunement_races = races
  if (alignments) item.attunement_alignments = alignments
}

function effectsEqual(a: GearEffect[] | undefined, b: GearEffect[] | undefined): boolean {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? [])
}

function resolveCatalogEntry(
  item: InventoryItem,
  byId: Map<string, CatalogEntry>,
  bySlug: Map<string, CatalogEntry[]>,
): CatalogEntry | null {
  if (item.catalog_id) {
    const hit = byId.get(item.catalog_id)
    if (hit) return hit
  }
  const slug = item.catalog_slug?.trim()
  if (!slug) return null
  const matches = bySlug.get(slug) ?? []
  return matches.length === 1 ? matches[0]! : null
}

/** Apply current catalog rules onto one inventory row. Returns null when unchanged. */
export function refreshInventoryItemFromCatalog(
  item: InventoryItem,
  entry: CatalogEntry,
): InventoryItem | null {
  if (item.parent_id) return null
  const data = (entry.data ?? {}) as Record<string, unknown>
  const next: InventoryItem = { ...item }

  let effects: GearEffect[] = []
  let requiresAttunement = false
  let wearSlot = item.wear_slot
  let magicBonus: number | null = item.magic_bonus ?? null

  if (entry.kind === 'weapon') {
    const parsed = parseWeaponCatalogData(data)
    effects = parsed.effects
    requiresAttunement = parsed.requires_attunement
    wearSlot = parsed.wear_slot
    magicBonus = parsed.magic_bonus || null
  } else if (entry.kind === 'armor') {
    const parsed = parseArmorCatalogData(data)
    effects = parsed.effects
    requiresAttunement = parsed.requires_attunement
    wearSlot = parsed.wear_slot
    magicBonus = parsed.magic_bonus || null
    const chosenBase = Boolean(data.allowed_base_armor) && Boolean(item.base_armor_slug)
    if (!chosenBase) {
      const armor = armorFieldsFromCatalog(entry)
      if (armor.armor_kind != null) next.armor_kind = armor.armor_kind
      if (armor.base_ac !== undefined) next.base_ac = armor.base_ac ?? null
      if (armor.max_dex_bonus !== undefined) next.max_dex_bonus = armor.max_dex_bonus ?? null
      if (armor.strength_requirement !== undefined) {
        next.strength_requirement = armor.strength_requirement ?? null
      }
    }
  } else if (entry.kind === 'item') {
    const parsed = parseItemCatalogData(data)
    effects = parsed.effects
    requiresAttunement = parsed.requires_attunement
    wearSlot = parsed.wear_slot
    magicBonus = 0
  } else {
    return null
  }

  next.effects = effects
  next.requires_attunement = requiresAttunement
  next.wear_slot = wearSlot
  next.magic_bonus = magicBonus
  copyAttunementRules(next, data)

  if (!next.catalog_slug?.trim()) {
    next.catalog_slug = entry.slug
  }

  const changed =
    !effectsEqual(item.effects, next.effects) ||
    item.requires_attunement !== next.requires_attunement ||
    item.wear_slot !== next.wear_slot ||
  (item.magic_bonus ?? null) !== (next.magic_bonus ?? null) ||
    item.armor_kind !== next.armor_kind ||
    item.base_ac !== next.base_ac ||
    item.max_dex_bonus !== next.max_dex_bonus ||
    item.strength_requirement !== next.strength_requirement ||
    item.family_slug !== next.family_slug ||
    item.variant_key !== next.variant_key ||
    item.single_attunement_family !== next.single_attunement_family ||
    item.alignment_color_gate !== next.alignment_color_gate ||
    item.attunement_spellcaster !== next.attunement_spellcaster ||
    JSON.stringify(item.attunement_classes ?? []) !== JSON.stringify(next.attunement_classes ?? []) ||
    JSON.stringify(item.attunement_races ?? []) !== JSON.stringify(next.attunement_races ?? []) ||
    JSON.stringify(item.attunement_alignments ?? []) !==
      JSON.stringify(next.attunement_alignments ?? []) ||
    JSON.stringify(item.attunement_alternatives ?? []) !==
      JSON.stringify(next.attunement_alternatives ?? []) ||
    (item.catalog_slug ?? '') !== (next.catalog_slug ?? '')

  return changed ? next : null
}

export function refreshInventoryItemsFromCatalog(
  items: InventoryItem[],
  catalog: CatalogEntry[],
): InventoryItem[] {
  const byId = new Map<string, CatalogEntry>()
  const bySlug = new Map<string, CatalogEntry[]>()
  for (const row of catalog) {
    if (row.kind !== 'weapon' && row.kind !== 'armor' && row.kind !== 'item') continue
    byId.set(row.id, row)
    const slug = row.slug.trim()
    const prev = bySlug.get(slug) ?? []
    bySlug.set(slug, [...prev, row])
  }

  let changed = false
  const next = items.map((item) => {
    const entry = resolveCatalogEntry(item, byId, bySlug)
    if (!entry) return item
    const refreshed = refreshInventoryItemFromCatalog(item, entry)
    if (!refreshed) return item
    changed = true
    return refreshed
  })
  return changed ? next : items
}