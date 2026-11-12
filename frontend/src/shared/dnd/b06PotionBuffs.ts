/**
 * B-06: map inventory consumable catalog_id → duration buff slug / build opts.
 */
import { buildBuffEffect, type ActiveEffect } from './activeEffects'
import { giantStrengthFloor } from './b06BuffSpecs'

const POTION_SLUG_ALIASES: Record<string, string> = {
  potion_of_giant_strength: 'potion_of_giant_strength',
  potion_of_giant_strength_hill: 'potion_of_giant_strength_hill',
  potion_of_giant_strength_frost: 'potion_of_giant_strength_frost',
  potion_of_giant_strength_stone: 'potion_of_giant_strength_stone',
  potion_of_giant_strength_fire: 'potion_of_giant_strength_fire',
  potion_of_giant_strength_cloud: 'potion_of_giant_strength_cloud',
  potion_of_giant_strength_storm: 'potion_of_giant_strength_storm',
  potion_of_resistance: 'potion_of_resistance',
  potion_of_resistance_fire: 'potion_of_resistance_fire',
  potion_of_resistance_cold: 'potion_of_resistance_cold',
  potion_of_resistance_poison: 'potion_of_resistance_poison',
  potion_of_resistance_acid: 'potion_of_resistance_acid',
  potion_of_resistance_force: 'potion_of_resistance_force',
  potion_of_resistance_lightning: 'potion_of_resistance_lightning',
  potion_of_resistance_necrotic: 'potion_of_resistance_necrotic',
  potion_of_resistance_psychic: 'potion_of_resistance_psychic',
  potion_of_resistance_radiant: 'potion_of_resistance_radiant',
  potion_of_resistance_thunder: 'potion_of_resistance_thunder',
  potion_of_heroism: 'potion_of_heroism',
  potion_of_flying: 'potion_of_flying',
  potion_of_climbing: 'potion_of_climbing',
  potion_of_speed: 'potion_of_speed',
  potion_of_invisibility: 'potion_of_invisibility',
  potion_of_growth: 'potion_of_growth',
  potion_of_gaseous_form: 'potion_of_gaseous_form',
  potion_of_water_breathing: 'potion_of_water_breathing',
  potion_of_mind_reading: 'potion_of_mind_reading',
  potion_of_giant_size: 'potion_of_giant_size',
  potion_of_maximum_power: 'potion_of_maximum_power',
}

export function normalizePotionCatalogId(
  catalogId: string | null | undefined,
): string | null {
  const id = String(catalogId ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  if (!id) return null
  if (POTION_SLUG_ALIASES[id]) return POTION_SLUG_ALIASES[id]
  if (id.startsWith('potion_of_resistance_')) return id
  if (id.startsWith('potion_of_giant_strength')) return id
  return null
}

export function isDurationPotionCatalogId(
  catalogId: string | null | undefined,
): boolean {
  return normalizePotionCatalogId(catalogId) != null
}

export function buildPotionBuffEffect(input: {
  catalogId?: string | null
  name?: string | null
  sourceCharacterId?: string | null
  sourceName?: string | null
  /** Current hp max — used for potion_of_giant_size ×2. */
  hpMax?: number | null
  rng?: () => number
}): ActiveEffect | null {
  const slug = normalizePotionCatalogId(input.catalogId)
  if (!slug) return null
  const rng = input.rng ?? Math.random

  let option: string | null = null
  let slotLevel: number | null = null

  if (slug === 'potion_of_giant_strength' || slug.startsWith('potion_of_giant_strength_')) {
    option = slug
  }
  if (slug === 'potion_of_resistance') {
    option = 'fire'
  } else if (slug.startsWith('potion_of_resistance_')) {
    option = slug.slice('potion_of_resistance_'.length)
  }
  if (slug === 'potion_of_growth') {
    slotLevel = 1 + Math.floor(rng() * 4)
  }

  const effect = buildBuffEffect({
    slug,
    name: input.name ?? undefined,
    catalogId: slug,
    sourceCharacterId: input.sourceCharacterId,
    sourceName: input.sourceName,
    linkedConcentration: false,
    option,
    slotLevel,
  })
  if (!effect) return null
  effect.kind = 'item'

  if (slug === 'potion_of_giant_size') {
    const max = Math.max(0, Math.floor(input.hpMax ?? 0))
    if (max > 0) {
      effect.mods = [
        ...(effect.mods ?? []),
        { target: 'hp_max', op: 'add', value: max, condition: 'giant_size_double' },
      ]
    }
  }

  // Ensure giant strength parent carries the right floor via option.
  if (slug === 'potion_of_giant_strength') {
    const floor = giantStrengthFloor(option)
    effect.mods = (effect.mods ?? []).map((mod) =>
      mod.target === 'ability_score' && mod.condition === 'str'
        ? { ...mod, value: floor }
        : mod,
    )
  }

  return effect
}
