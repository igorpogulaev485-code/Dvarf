/** P24-M03: client-side step validation + ASI overlay for AbilitiesStep. */

import type { AbilityScores } from '../../shared/dnd/multiclassRules'
import { ABILITY_ORDER, type AbilityKey } from '../../shared/dnd/pointBuy'
import { WEAPON_MASTERY_CLASS_RULES, masteryLimitForClass } from '../../shared/dnd/weaponMastery'
import { ELDRITCH_INVOCATIONS_2024 } from '../../shared/dnd/edition2024ClassOptions'
import { SKILL_DEFS } from '../characters/sheetTypes'
import type { CatalogEntry } from '../../shared/api/catalog'
import {
  classL1Spellcasting,
  entryData,
  type Create2024State,
  type Create2024StepId,
} from './createPipeline2024Types'

const ARTISAN_TOOL_IDS = [
  'alchemists-supplies',
  'brewers-supplies',
  'calligraphers-supplies',
  'carpenters-tools',
  'cartographers-tools',
  'cobblers-tools',
  'cooks-utensils',
  'glassblowers-tools',
  'jewelers-tools',
  'leatherworkers-tools',
  'masons-tools',
  'painters-supplies',
  'potters-tools',
  'smiths-tools',
  'tinkers-tools',
  'weavers-tools',
  'woodcarvers-tools',
]

const GAMING_SET_IDS = [
  'dice-set',
  'dragonchess-set',
  'playing-card-set',
  'three-dragon-ante-set',
]

const MUSICAL_INSTRUMENT_IDS = [
  'bagpipes',
  'drum',
  'dulcimer',
  'flute',
  'horn',
  'lute',
  'lyre',
  'pan-flute',
  'shawm',
  'viol',
]

const DRAGONBORN_DAMAGE = ['acid', 'cold', 'fire', 'lightning', 'poison'] as const

export function skillLabelRu(id: string): string {
  return SKILL_DEFS.find((row) => row.key === id)?.label ?? id
}

export function backgroundAsiOverlay(state: Create2024State): Partial<AbilityScores> {
  const out: Partial<AbilityScores> = {}
  for (const key of ABILITY_ORDER) {
    const bonus = state.backgroundAsi[key]
    if (bonus) out[key] = bonus
  }
  return out
}

export function backgroundAsiTrio(bg: CatalogEntry | null | undefined): AbilityKey[] {
  const asi = entryData(bg).asi
  if (!asi || typeof asi !== 'object') return []
  const abilities = (asi as { abilities?: unknown }).abilities
  if (!Array.isArray(abilities)) return []
  return abilities
    .map((x) => String(x).toLowerCase())
    .filter((x): x is AbilityKey => (ABILITY_ORDER as readonly string[]).includes(x))
}

export function originFeatSlug(bg: CatalogEntry | null | undefined): string | null {
  const feat = entryData(bg).origin_feat
  if (!feat || typeof feat !== 'object') return null
  const row = feat as { slug?: string; id?: string }
  return String(row.slug || row.id || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-') || null
}

export function toolChoicePool(bg: CatalogEntry | null | undefined): string[] | null {
  const data = entryData(bg)
  const fixed = Array.isArray(data.tool_proficiencies)
    ? data.tool_proficiencies.map((x) => String(x))
    : []
  const choices = data.tool_choices
  if (fixed.length && !choices) return null
  if (!choices || typeof choices !== 'object') return null
  const row = choices as {
    from?: unknown
    category?: string
    from_category?: string
    from_group?: string
  }
  if (Array.isArray(row.from) && row.from.length) {
    return row.from.map((x) => String(x))
  }
  const category = String(row.category || row.from_category || row.from_group || '').toLowerCase()
  if (category.includes('artisan')) return [...ARTISAN_TOOL_IDS]
  if (category.includes('gaming')) return [...GAMING_SET_IDS]
  if (category.includes('musical') || category.includes('instrument')) {
    return [...MUSICAL_INSTRUMENT_IDS]
  }
  return null
}

export function backgroundNeedsToolPick(bg: CatalogEntry | null | undefined): boolean {
  return toolChoicePool(bg) != null
}

export function weaponMasteryLimit(classSlug: string | null): number {
  if (!classSlug) return 0
  const rule = WEAPON_MASTERY_CLASS_RULES[classSlug]
  if (!rule?.enabled) return 0
  return masteryLimitForClass(rule, 1)
}

export function classSkillNeed(classEntry: CatalogEntry | null | undefined): {
  count: number
  from: string[]
} {
  const choices = entryData(classEntry).skill_choices
  if (!choices || typeof choices !== 'object') return { count: 0, from: [] }
  const row = choices as { count?: number; from?: unknown; from_any?: boolean }
  const count = Number(row.count || 0)
  const fromAny = Boolean(row.from_any)
  const from = Array.isArray(row.from) ? row.from.map((x) => String(x)) : []
  if (fromAny || !from.length) {
    return { count, from: SKILL_DEFS.map((s) => s.key) }
  }
  return { count, from }
}

export function classStartingPacks(
  classEntry: CatalogEntry | null | undefined,
): Array<{ id: string; label_ru?: string; summary_ru?: string; coins_gp?: number }> {
  const packs = entryData(classEntry).starting_equipment
  if (!Array.isArray(packs)) return []
  return packs
    .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
    .map((p) => ({
      id: String(p.id || ''),
      label_ru: typeof p.label_ru === 'string' ? p.label_ru : undefined,
      summary_ru: typeof p.summary_ru === 'string' ? p.summary_ru : undefined,
      coins_gp: typeof p.coins_gp === 'number' ? p.coins_gp : undefined,
    }))
    .filter((p) => p.id)
}

export function speciesSizeOptions(species: CatalogEntry | null | undefined): string[] {
  const data = entryData(species)
  const opts = Array.isArray(data.size_options)
    ? data.size_options.map((x) => String(x).toLowerCase())
    : []
  if (opts.length) return opts
  if (data.size) return [String(data.size).toLowerCase()]
  return ['medium']
}

export function speciesLineages(
  species: CatalogEntry | null | undefined,
): Array<{ id: string; name_ru: string; summary_ru?: string }> {
  const data = entryData(species)
  const rows = Array.isArray(data.lineages) ? data.lineages : []
  return rows
    .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object'))
    .map((r) => ({
      id: String(r.id || r.slug || '')
        .trim()
        .toLowerCase()
        .replace(/_/g, '-'),
      name_ru: String(r.name_ru || r.id || ''),
      summary_ru: typeof r.summary_ru === 'string' ? r.summary_ru : undefined,
    }))
    .filter((r) => r.id)
}

export function speciesNeedsLineage(species: CatalogEntry | null | undefined): boolean {
  const data = entryData(species)
  return Boolean(data.lineage_required) || speciesLineages(species).length > 0
}

export function speciesNeedsAncestry(species: CatalogEntry | null | undefined): boolean {
  return Boolean(entryData(species).draconic_ancestry)
}

export function dragonbornDamageOptions(): readonly string[] {
  return DRAGONBORN_DAMAGE
}

export function l1Invocations(): typeof ELDRITCH_INVOCATIONS_2024 {
  return ELDRITCH_INVOCATIONS_2024.filter((row) => row.minLevel <= 1)
}

export function fightingStyleFeats(feats: CatalogEntry[]): CatalogEntry[] {
  return feats.filter((f) => {
    const cat = entryData(f).category
    return cat === 'fighting_style'
  })
}

function uniqueCount(ids: string[], need: number): boolean {
  return ids.length === need && new Set(ids).size === need
}

export function canAdvanceCreate2024Step(
  step: Create2024StepId,
  state: Create2024State,
  ctx: {
    classEntry: CatalogEntry | null
    backgroundEntry: CatalogEntry | null
    speciesEntry: CatalogEntry | null
    languageChoiceCount: number
  },
): boolean {
  const { classEntry, backgroundEntry, speciesEntry, languageChoiceCount } = ctx

  switch (step) {
    case 'class': {
      if (!state.classSlug || !classEntry) return false
      const skills = classSkillNeed(classEntry)
      if (!uniqueCount(state.classSkillIds, skills.count)) return false
      if (!state.classSkillIds.every((id) => skills.from.includes(id))) return false
      const wm = weaponMasteryLimit(state.classSlug)
      if (wm > 0 && !uniqueCount(state.weaponMasteryIds, wm)) return false
      if (state.classSlug === 'fighter' && !state.fightingStyleSlug) return false
      if (state.classSlug === 'cleric') {
        const order = String(state.classOptionPicks.divine_order || '')
        if (order !== 'protector' && order !== 'thaumaturge') return false
      }
      if (state.classSlug === 'druid') {
        const order = String(state.classOptionPicks.primal_order || '')
        if (order !== 'magician' && order !== 'warden') return false
      }
      if (state.classSlug === 'rogue') {
        const expertise = Array.isArray(state.classOptionPicks.expertise)
          ? (state.classOptionPicks.expertise as string[])
          : []
        if (!uniqueCount(expertise, 2)) return false
      }
      if (state.classSlug === 'warlock') {
        const inv = Array.isArray(state.classOptionPicks.eldritch_invocations)
          ? (state.classOptionPicks.eldritch_invocations as string[])
          : []
        if (!uniqueCount(inv, 1)) return false
      }
      return true
    }
    case 'background': {
      if (!state.backgroundSlug || !backgroundEntry) return false
      const trio = backgroundAsiTrio(backgroundEntry)
      if (trio.length !== 3) return false
      if (state.backgroundAsiMode === '+2/+1') {
        const plus2 = trio.filter((k) => state.backgroundAsi[k] === 2)
        const plus1 = trio.filter((k) => state.backgroundAsi[k] === 1)
        if (plus2.length !== 1 || plus1.length !== 1) return false
      } else {
        if (!trio.every((k) => state.backgroundAsi[k] === 1)) return false
      }
      if (backgroundNeedsToolPick(backgroundEntry) && !state.backgroundToolId) return false
      const feat = originFeatSlug(backgroundEntry)
      if (feat === 'magic-initiate') {
        if (!state.originFeatList) return false
        if (!uniqueCount(state.originFeatCantrips, 2)) return false
        if (!state.originFeatSpellId) return false
      }
      if (feat === 'skilled') {
        if (!uniqueCount(state.originFeatSkilled, 3)) return false
      }
      return true
    }
    case 'species': {
      if (!state.speciesSlug || !speciesEntry) return false
      const sizes = speciesSizeOptions(speciesEntry)
      if (sizes.length > 1 && !state.speciesSize) return false
      if (speciesNeedsLineage(speciesEntry) && !state.speciesLineageId) return false
      if (speciesNeedsAncestry(speciesEntry) && !state.speciesAncestryId) return false
      return true
    }
    case 'abilities': {
      const scores = ABILITY_ORDER.map((k) => state.baseAbilities[k])
      if (scores.some((v) => !v || v < 3)) return false
      if (state.abilityMethod === 'standard_array') {
        const expected = [15, 14, 13, 12, 10, 8]
        if ([...scores].sort((a, b) => b - a).join() !== expected.join()) return false
      }
      // Cap 20 after background ASI overlay.
      const overlay = backgroundAsiOverlay(state)
      for (const key of ABILITY_ORDER) {
        if (state.baseAbilities[key] + (overlay[key] ?? 0) > 20) return false
      }
      return true
    }
    case 'languages':
      return uniqueCount(state.languageIds, languageChoiceCount || 2)
    case 'equipment': {
      const packs = classStartingPacks(classEntry)
      if (!packs.some((p) => p.id === state.classEquipment)) return false
      return state.backgroundEquipment === 'pack' || state.backgroundEquipment === 'gold'
    }
    case 'spells': {
      const sc = classL1Spellcasting(classEntry)
      if (!sc) return true
      return (
        uniqueCount(state.cantripIds, sc.cantrips) &&
        uniqueCount(state.preparedSpellIds, sc.prepared_spells)
      )
    }
    case 'summary':
      return Boolean(state.characterName.trim())
    default:
      return false
  }
}

export function nextCreate2024Step(
  step: Create2024StepId,
  steps: readonly Create2024StepId[],
): Create2024StepId | null {
  const idx = steps.indexOf(step)
  if (idx < 0 || idx >= steps.length - 1) return null
  return steps[idx + 1] ?? null
}

export function prevCreate2024Step(
  step: Create2024StepId,
  steps: readonly Create2024StepId[],
): Create2024StepId | null {
  const idx = steps.indexOf(step)
  if (idx <= 0) return null
  return steps[idx - 1] ?? null
}

export function toggleUniquePick(list: string[], id: string, max: number): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id)
  if (list.length >= max) return [...list.slice(0, max - 1), id]
  return [...list, id]
}

export function setAsiPlus2Plus1(
  _trio: AbilityKey[],
  plus2: AbilityKey,
  plus1: AbilityKey,
): Partial<Record<AbilityKey, number>> {
  if (plus2 === plus1) return { [plus2]: 2 }
  return { [plus2]: 2, [plus1]: 1 }
}

export function setAsiFlat1(trio: AbilityKey[]): Partial<Record<AbilityKey, number>> {
  return Object.fromEntries(trio.map((k) => [k, 1])) as Partial<Record<AbilityKey, number>>
}
