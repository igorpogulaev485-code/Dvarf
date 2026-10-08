/**
 * Spell focus / component pouch — type-driven flags for the spells block.
 *
 * Source of truth for cast: inventory rows with spell_tooling === 'focus' | 'component_pouch'.
 * Name can be anything («глаз бехолдера») — only the type matters.
 * Catalog / grant names only *infer* the type when the field is still empty.
 */

export type SpellTooling = 'none' | 'focus' | 'component_pouch'

/** PHB focus families — drive suggested variants, not cast eligibility. */
export type FocusKind = 'arcane' | 'druidic' | 'holy' | 'any'

export type SpellFocusFlags = {
  has_spell_focus: boolean
  has_component_pouch: boolean
}

export type SpellToolingItem = {
  name: string
  qty?: number
  spell_tooling?: SpellTooling | null
  focus_kind?: FocusKind | null
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

export const FOCUS_KIND_LABEL_RU: Record<FocusKind, string> = {
  arcane: 'Магический (arcane)',
  druidic: 'Друидический',
  holy: 'Священный символ',
  any: 'Любой / свой',
}

export const SPELL_TOOLING_LABEL_RU: Record<SpellTooling, string> = {
  none: '—',
  focus: 'Фокус',
  component_pouch: 'Мешочек компонентов',
}

/** Suggested PHB variants by family — optional; player may invent their own look. */
export const FOCUS_VARIANT_SUGGESTIONS: Record<
  Exclude<FocusKind, 'any'>,
  Array<{ labelRu: string; slug?: string }>
> = {
  arcane: [
    { labelRu: 'Кристалл', slug: 'crystal' },
    { labelRu: 'Сфера', slug: 'orb' },
    { labelRu: 'Жезл', slug: 'rod' },
    { labelRu: 'Посох', slug: 'staff' },
    { labelRu: 'Волшебная палочка', slug: 'wand' },
  ],
  druidic: [
    { labelRu: 'Веточка омелы', slug: 'sprig_of_mistletoe' },
    { labelRu: 'Тотем', slug: 'totem' },
    { labelRu: 'Деревянный посох', slug: 'wooden_staff' },
    { labelRu: 'Тисовая палочка', slug: 'yew_wand' },
  ],
  holy: [
    { labelRu: 'Амулет', slug: 'amulet' },
    { labelRu: 'Эмблема', slug: 'emblem' },
    { labelRu: 'Реликварий', slug: 'reliquary' },
  ],
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function readSpellTooling(value: unknown): SpellTooling | null {
  if (value === 'focus' || value === 'component_pouch' || value === 'none') return value
  return null
}

export function readFocusKind(value: unknown): FocusKind | null {
  if (value === 'arcane' || value === 'druidic' || value === 'holy' || value === 'any') {
    return value
  }
  return null
}

export function inferFocusKind(item: SpellToolingItem): FocusKind | null {
  const slug = (item.catalog_slug ?? '').toLowerCase()
  if (
    slug === 'crystal' ||
    slug === 'orb' ||
    slug === 'rod' ||
    slug === 'staff' ||
    slug === 'wand' ||
    slug === 'arcane_focus'
  ) {
    return 'arcane'
  }
  if (
    slug === 'sprig_of_mistletoe' ||
    slug === 'totem' ||
    slug === 'wooden_staff' ||
    slug === 'yew_wand' ||
    slug === 'druidic_focus'
  ) {
    return 'druidic'
  }
  if (
    slug === 'holy_symbol' ||
    slug === 'amulet' ||
    slug === 'emblem' ||
    slug === 'reliquary'
  ) {
    return 'holy'
  }
  const name = normalize(item.name)
  if (name.includes('друид') || name.includes('омел') || name.includes('тотем')) {
    return 'druidic'
  }
  if (name.includes('священ') || name.includes('символ') || name.includes('амулет')) {
    return 'holy'
  }
  if (name.includes('магический фокус') || name.includes('фокус заклинателя')) {
    return 'arcane'
  }
  return null
}

/**
 * Infer type from catalog/grant when spell_tooling is still unset.
 * Never overrides an explicit player choice (including «none»).
 */
export function inferSpellTooling(item: SpellToolingItem): SpellTooling {
  const slug = (item.catalog_slug ?? '').toLowerCase()
  if (POUCH_SLUGS.has(slug)) return 'component_pouch'
  if (FOCUS_SLUGS.has(slug)) return 'focus'

  const name = normalize(item.name)
  if (!name) {
    if (item.item_category === 'focus') return 'focus'
    return 'none'
  }
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
  // Catalog category focus (pouch already caught by name/slug).
  if (item.item_category === 'focus') return 'focus'
  return 'none'
}

/**
 * Resolve type for sync/cast: explicit spell_tooling wins.
 * Custom-named «глаз бехолдера» with spell_tooling=focus → counts as focus.
 */
export function resolveSpellTooling(item: SpellToolingItem): SpellTooling {
  if (
    item.spell_tooling === 'focus' ||
    item.spell_tooling === 'component_pouch' ||
    item.spell_tooling === 'none'
  ) {
    return item.spell_tooling
  }
  return inferSpellTooling(item)
}

/** @deprecated use resolveSpellTooling — kept for call sites. */
export function classifySpellTooling(item: SpellToolingItem): SpellTooling {
  return resolveSpellTooling(item)
}

/** Single O(n) pass — looks at *type*, not display name. */
export function syncSpellFocusFlags(items: SpellToolingItem[]): SpellFocusFlags {
  let has_spell_focus = false
  let has_component_pouch = false
  for (const item of items) {
    if ((item.qty ?? 1) <= 0) continue
    const kind = resolveSpellTooling(item)
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

export function focusSuggestionsFor(kind: FocusKind | null | undefined): Array<{
  labelRu: string
  slug?: string
}> {
  if (!kind || kind === 'any') {
    return [
      ...FOCUS_VARIANT_SUGGESTIONS.arcane,
      ...FOCUS_VARIANT_SUGGESTIONS.druidic,
      ...FOCUS_VARIANT_SUGGESTIONS.holy,
    ]
  }
  return FOCUS_VARIANT_SUGGESTIONS[kind]
}
