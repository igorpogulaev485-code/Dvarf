/**
 * Catalog-backed spell focus options + custom-name defaults.
 * Used by inventory UI and class starting-gear focus picks.
 */

import type { CatalogEntry } from '../../shared/api/catalog'
import {
  gearCostToGp,
  parseItemCatalogData,
} from '../../shared/dnd/gearCatalog'
import {
  FOCUS_VARIANT_SUGGESTIONS,
  inferFocusKind,
  inferSpellTooling,
  type FocusKind,
} from './spellFocus'

/** Custom / homebrew focus: no market price, light enough to carry. */
export const CUSTOM_FOCUS_COST_GP = 0
export const CUSTOM_FOCUS_WEIGHT_LB = 1

export type FocusCatalogOption = {
  slug: string
  name_ru: string
  catalog_id: string
  cost_gp: number | null
  weight_lb: number | null
  focus_kind: FocusKind
}

export type FocusSelection = {
  name: string
  catalog_id: string | null
  cost_gp: number | null
  weight_lb: number | null
  focus_kind: FocusKind
  /** True when player typed their own look (not a catalog row). */
  custom: boolean
}

const ARCANE_SLUGS = new Set(
  FOCUS_VARIANT_SUGGESTIONS.arcane.map((row) => row.slug).filter(Boolean) as string[],
)
const DRUIDIC_SLUGS = new Set(
  FOCUS_VARIANT_SUGGESTIONS.druidic.map((row) => row.slug).filter(Boolean) as string[],
)
const HOLY_SLUGS = new Set(
  FOCUS_VARIANT_SUGGESTIONS.holy.map((row) => row.slug).filter(Boolean) as string[],
)

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Detect generic focus placeholder in class/BG starting gear. */
export function detectFocusPlaceholder(name: string): FocusKind | null {
  const key = normalize(name)
  if (!key) return null
  if (
    key.includes('мешочек') ||
    key.includes('сумка с компонент') ||
    key.includes('компонентская')
  ) {
    return null
  }
  if (key.includes('священный символ') || key === 'священный символ') return 'holy'
  if (key.includes('фокус друида') || key.includes('друидический фокус')) return 'druidic'
  if (
    key.includes('магический фокус') ||
    key.includes('фокус заклинателя') ||
    key === 'arcane focus'
  ) {
    return 'arcane'
  }
  // Bare «фокус» in package summaries (druid B).
  if (key === 'фокус' || key.endsWith(' + фокус') || key.includes('фокус')) {
    if (key.includes('друид')) return 'druidic'
    return 'any'
  }
  return null
}

export function isFocusPlaceholderItem(name: string): boolean {
  return detectFocusPlaceholder(name) != null
}

function kindForSlug(slug: string): FocusKind {
  if (ARCANE_SLUGS.has(slug)) return 'arcane'
  if (DRUIDIC_SLUGS.has(slug)) return 'druidic'
  if (HOLY_SLUGS.has(slug)) return 'holy'
  return inferFocusKind({ name: '', catalog_slug: slug }) ?? 'any'
}

/** Build focus options from catalog item rows (kind=item). */
export function focusOptionsFromCatalog(
  entries: CatalogEntry[],
  family: FocusKind | null | undefined,
): FocusCatalogOption[] {
  const out: FocusCatalogOption[] = []
  for (const entry of entries) {
    if (entry.kind !== 'item') continue
    const parsed = parseItemCatalogData(entry.data ?? {})
    const tooling = inferSpellTooling({
      name: entry.name_ru,
      catalog_slug: entry.slug,
      item_category: parsed.item_category,
    })
    if (tooling !== 'focus') continue
    // Pouch is category focus in backfill — skip.
    if (entry.slug === 'component_pouch') continue
    const focus_kind =
      inferFocusKind({
        name: entry.name_ru,
        catalog_slug: entry.slug,
        item_category: parsed.item_category,
      }) ?? kindForSlug(entry.slug)
    if (family && family !== 'any' && focus_kind !== family && focus_kind !== 'any') {
      continue
    }
    out.push({
      slug: entry.slug,
      name_ru: entry.name_ru,
      catalog_id: entry.id,
      cost_gp: gearCostToGp(parsed.cost),
      weight_lb: parsed.weight_lb,
      focus_kind,
    })
  }
  out.sort((a, b) => a.name_ru.localeCompare(b.name_ru, 'ru'))
  return out
}

export function selectionFromCatalogOption(
  option: FocusCatalogOption,
): FocusSelection {
  return {
    name: option.name_ru,
    catalog_id: option.catalog_id,
    cost_gp: option.cost_gp,
    weight_lb: option.weight_lb,
    focus_kind: option.focus_kind,
    custom: false,
  }
}

/** Own look — cost 0, minimal adequate weight. */
export function selectionFromCustomName(
  name: string,
  focus_kind: FocusKind = 'any',
): FocusSelection {
  const trimmed = name.trim() || 'Свой фокус'
  return {
    name: trimmed,
    catalog_id: null,
    cost_gp: CUSTOM_FOCUS_COST_GP,
    weight_lb: CUSTOM_FOCUS_WEIGHT_LB,
    focus_kind,
    custom: true,
  }
}

export function applyFocusSelectionToItemFields(selection: FocusSelection): {
  name: string
  catalog_id: string | null
  cost_gp: number | null
  weight_lb: number | null
  spell_tooling: 'focus'
  focus_kind: FocusKind
} {
  return {
    name: selection.name,
    catalog_id: selection.catalog_id,
    cost_gp: selection.custom ? CUSTOM_FOCUS_COST_GP : selection.cost_gp,
    weight_lb: selection.custom
      ? CUSTOM_FOCUS_WEIGHT_LB
      : selection.weight_lb ?? CUSTOM_FOCUS_WEIGHT_LB,
    spell_tooling: 'focus',
    focus_kind: selection.focus_kind,
  }
}
