/** Ability score ceilings (PHB 2014): base 20, raised by class/features/items. */

import type { ClassLevelEntry } from './classLevels'

export const ABILITY_SCORE_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
export type AbilityScoreKey = (typeof ABILITY_SCORE_KEYS)[number]

/** PHB default — permanent scores normally cannot exceed this. */
export const DEFAULT_ABILITY_SCORE_MAX = 20

/** Absolute system hard cap (Ioun/tome/epic homebrew). */
export const HARD_ABILITY_SCORE_CEILING = 30

export type AbilityMaxSource = {
  ability: AbilityScoreKey
  max: number
  label: string
}

export type AbilityMaxResolved = {
  max: number
  sources: string[]
  /** True when something raised the ceiling above PHB 20. */
  raised: boolean
}

/** Minimal inventory shape — avoids coupling to the sheet inventory module. */
export type AbilityCapInventoryItem = {
  id: string
  name: string
  qty: number
  equipped: boolean
  item_kind: string
  requires_attunement?: boolean
  magic_mods?: Record<string, unknown> | null
  artifact_snapshot?: Record<string, unknown> | null
}

type ClassMaxFeature = {
  label: string
  abilities: Partial<Record<AbilityScoreKey, number>>
  match: (cls: ClassLevelEntry) => boolean
}

function looksLike(name: string, catalogId: string | null, ...needles: string[]): boolean {
  const hay = `${name} ${catalogId ?? ''}`.toLowerCase()
  return needles.some((n) => hay.includes(n.toLowerCase()))
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/**
 * Structured class/archetype raises. Matched by class name / catalog_id / level.
 */
export const CLASS_ABILITY_MAX_FEATURES: ClassMaxFeature[] = [
  {
    // Barbarian 20 — Primal Champion: STR & CON max 24
    label: 'Первобытный чемпион',
    abilities: { str: 24, con: 24 },
    match: (cls) =>
      cls.level >= 20 &&
      looksLike(cls.name, cls.catalog_id, 'варвар', 'barbarian'),
  },
]

function clampCeiling(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ABILITY_SCORE_MAX
  return Math.max(1, Math.min(HARD_ABILITY_SCORE_CEILING, Math.floor(value)))
}

/** Collect max raises from class levels (archetype/capstone features). */
export function abilityMaxSourcesFromClasses(
  classes: ClassLevelEntry[],
): AbilityMaxSource[] {
  const out: AbilityMaxSource[] = []
  for (const cls of classes) {
    for (const feature of CLASS_ABILITY_MAX_FEATURES) {
      if (!feature.match(cls)) continue
      for (const key of ABILITY_SCORE_KEYS) {
        const max = feature.abilities[key]
        if (max == null) continue
        out.push({
          ability: key,
          max: clampCeiling(max),
          label: `${feature.label} (${cls.name || 'класс'})`,
        })
      }
    }
  }
  return out
}

function isItemActive(item: AbilityCapInventoryItem, attunedItemIds: Set<string>): boolean {
  if (item.qty <= 0) return false
  if (item.requires_attunement) return attunedItemIds.has(item.id)
  if (item.item_kind === 'magic') return item.equipped !== false
  return item.equipped
}

/** max_score from setting-artifact snapshot abilities on inventory items. */
export function abilityMaxSourcesFromInventory(
  items: AbilityCapInventoryItem[],
  attunedItemIds: Set<string>,
): AbilityMaxSource[] {
  const out: AbilityMaxSource[] = []
  for (const item of items) {
    if (!isItemActive(item, attunedItemIds)) continue
    const snap = item.artifact_snapshot ? asRecord(item.artifact_snapshot) : {}
    const abilities = Array.isArray(snap.abilities) ? snap.abilities : []
    for (const raw of abilities) {
      const ab = asRecord(raw)
      if (ab.kind !== 'passive') continue
      if (ab.bonus_target !== 'ability') continue
      if (ab.max_score == null) continue
      const key = String(ab.ability_key || 'str') as AbilityScoreKey
      if (!ABILITY_SCORE_KEYS.includes(key)) continue
      out.push({
        ability: key,
        max: clampCeiling(readNumber(ab.max_score, DEFAULT_ABILITY_SCORE_MAX)),
        label: item.name || 'Артефакт',
      })
    }
    const mods = item.magic_mods ? asRecord(item.magic_mods) : {}
    const abilityMax = asRecord(mods.ability_max ?? mods.abilityMax)
    for (const key of ABILITY_SCORE_KEYS) {
      if (abilityMax[key] == null) continue
      out.push({
        ability: key,
        max: clampCeiling(readNumber(abilityMax[key], DEFAULT_ABILITY_SCORE_MAX)),
        label: item.name || 'Предмет',
      })
    }
  }
  return out
}

/** Explicit overrides stored on sheet.abilities[key].max_score (baked on grant). */
export function abilityMaxSourcesFromSheetStored(
  stored: Partial<Record<AbilityScoreKey, number | null | undefined>>,
): AbilityMaxSource[] {
  const out: AbilityMaxSource[] = []
  for (const key of ABILITY_SCORE_KEYS) {
    const raw = stored[key]
    if (raw == null || !Number.isFinite(raw) || raw <= 0) continue
    out.push({
      ability: key,
      max: clampCeiling(raw),
      label: 'на листе',
    })
  }
  return out
}

/**
 * Resolve effective permanent score ceiling per ability.
 * Temporary combat buffs do NOT raise this — they sit on top as effects.
 */
export function resolveAbilityMaxes(input: {
  classes: ClassLevelEntry[]
  inventoryItems: AbilityCapInventoryItem[]
  attunedItemIds: Set<string>
  sheetStored?: Partial<Record<AbilityScoreKey, number | null | undefined>>
}): Record<AbilityScoreKey, AbilityMaxResolved> {
  const sources = [
    ...abilityMaxSourcesFromClasses(input.classes),
    ...abilityMaxSourcesFromInventory(input.inventoryItems, input.attunedItemIds),
    ...abilityMaxSourcesFromSheetStored(input.sheetStored ?? {}),
  ]

  const result = Object.fromEntries(
    ABILITY_SCORE_KEYS.map((key) => [
      key,
      {
        max: DEFAULT_ABILITY_SCORE_MAX,
        sources: [] as string[],
        raised: false,
      } satisfies AbilityMaxResolved,
    ]),
  ) as Record<AbilityScoreKey, AbilityMaxResolved>

  for (const src of sources) {
    const row = result[src.ability]
    if (src.max > row.max) {
      row.max = src.max
      row.sources = [src.label]
    } else if (src.max === row.max && src.max > DEFAULT_ABILITY_SCORE_MAX) {
      if (!row.sources.includes(src.label)) row.sources.push(src.label)
    }
  }

  for (const key of ABILITY_SCORE_KEYS) {
    result[key].raised = result[key].max > DEFAULT_ABILITY_SCORE_MAX
  }
  return result
}

export function clampAbilityScore(
  score: number,
  max: number = DEFAULT_ABILITY_SCORE_MAX,
): number {
  const ceiling = clampCeiling(max)
  if (!Number.isFinite(score)) return 10
  return Math.max(1, Math.min(ceiling, Math.floor(score)))
}
