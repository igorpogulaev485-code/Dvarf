/**
 * Spell focus / component pouch — derived flags for the spells block.
 * Sync once on inventory change; cast path reads O(1) flags.
 */

export type SpellTooling = 'none' | 'focus' | 'component_pouch'

export type SpellFocusFlags = {
  has_spell_focus: boolean
  has_component_pouch: boolean
}

export type SpellToolingItem = {
  name: string
  qty?: number
  spell_tooling?: SpellTooling | null
  /** Catalog slug when known. */
  catalog_slug?: string | null
  item_category?: string | null
}

const POUCH_SLUGS = new Set(['component_pouch', 'components_pouch', 'componentspouch'])

const FOCUS_SLUGS = new Set([
  'crystal',
  'orb',
  'rod',
  'staff',
  'wand',
  'sprig_of_mistletoe',
  'totem',
  'wooden_staff',
  'yew_wand',
  'arcane_focus',
  'druidic_focus',
  'holy_symbol',
  'amulet',
  'emblem',
  'reliquary',
])

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Classify one inventory row (prefers stored spell_tooling). */
export function classifySpellTooling(item: SpellToolingItem): SpellTooling {
  if (item.spell_tooling === 'focus' || item.spell_tooling === 'component_pouch') {
    return item.spell_tooling
  }
  if (item.spell_tooling === 'none') return 'none'

  const slug = (item.catalog_slug ?? '').toLowerCase()
  if (POUCH_SLUGS.has(slug)) return 'component_pouch'
  if (FOCUS_SLUGS.has(slug)) return 'focus'

  const name = normalize(item.name)
  if (!name) return 'none'
  if (
    name.includes('мешочек с компонент') ||
    name.includes('сумка с компонент') ||
    name.includes('компонентская сумка') ||
    name.includes('component pouch')
  ) {
    return 'component_pouch'
  }
  if (
    name.includes('магический фокус') ||
    name.includes('фокус заклинателя') ||
    name.includes('фокус друида') ||
    name.includes('друидический фокус') ||
    name.includes('священный символ') ||
    name.includes('arcane focus') ||
    name.includes('druidic focus') ||
    name.includes('holy symbol')
  ) {
    return 'focus'
  }
  // Catalog category focus, but pouch is also tagged focus in backfill — name already caught.
  if (item.item_category === 'focus') return 'focus'
  return 'none'
}

/** Single O(n) pass — call only when inventory items change. */
export function syncSpellFocusFlags(items: SpellToolingItem[]): SpellFocusFlags {
  let has_spell_focus = false
  let has_component_pouch = false
  for (const item of items) {
    if ((item.qty ?? 1) <= 0) continue
    const kind = classifySpellTooling(item)
    if (kind === 'component_pouch') has_component_pouch = true
    else if (kind === 'focus') has_spell_focus = true
    if (has_spell_focus && has_component_pouch) break
  }
  return { has_spell_focus, has_component_pouch }
}

/** Free (no gp) material is covered by focus or pouch. */
export function hasFreeMaterialCoverage(flags: SpellFocusFlags): boolean {
  return flags.has_spell_focus || flags.has_component_pouch
}

/** Merge flags into spells state; returns same ref when unchanged. */
export function withSpellFocusFlags<
  T extends { has_spell_focus?: boolean; has_component_pouch?: boolean },
>(spells: T, items: SpellToolingItem[]): T {
  const flags = syncSpellFocusFlags(items)
  if (
    Boolean(spells.has_spell_focus) === flags.has_spell_focus &&
    Boolean(spells.has_component_pouch) === flags.has_component_pouch
  ) {
    return spells
  }
  return { ...spells, ...flags }
}

export function readSpellTooling(value: unknown): SpellTooling | null {
  if (value === 'focus' || value === 'component_pouch' || value === 'none') return value
  return null
}
