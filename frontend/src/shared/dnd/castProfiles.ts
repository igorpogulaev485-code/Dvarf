/**
 * Multiclass spell cast profiles (M1).
 * Each caster class (and third-caster overlay) gets its own ability / budgets / DC·attack.
 * Combat UI should resolve stats from the spell's class association, not a single casting_ability.
 */

import type { ClassLevelEntry } from './classLevels'
import {
  classCasterDef,
  maxSpellLevelForClassAlone,
  prepareLimitFromClass,
  resolveClassCasterSlug,
  resolveSpellLearnBudget,
  resolveSubclassCasterOverlays,
  spellLearnModeForSlug,
  type SpellLearnBudget,
  type SpellLearnMode,
  type SubclassCasterOverlay,
} from './casterProgression'
import {
  SPELLCASTING_ABILITY_LABELS,
  spellAttackBonus,
  spellSaveDc,
  type SpellcastingAbility,
} from './spells'

export type SpellCastProfileKind = 'class' | 'third'

export type SpellCastProfile = {
  /** Stable key: classEntryId (class / third host). */
  id: string
  kind: SpellCastProfileKind
  slug: string
  labelRu: string
  ability: SpellcastingAbility
  mode: SpellLearnMode | null
  aloneMaxLevel: number
  cantripsBudget: number
  leveledKnownBudget: number | null
  maxPrepared: number | null
  /** Base DC before scoped item bonuses (M3). */
  saveDc: number
  /** Base attack bonus before scoped item bonuses (M3). */
  attackBonus: number
}

export type BuildCastProfilesInput = {
  classes: ClassLevelEntry[]
  abilityModFor: (ability: SpellcastingAbility) => number
  proficiencyBonus: number
  subclassCasters?: SubclassCasterOverlay[]
  /** Flat extras (global). Scoped bonuses land in M3. */
  dcExtra?: number
  attackExtra?: number
}

function clampPb(pb: number): number {
  return Math.max(0, Math.floor(pb) || 0)
}

function profileStats(
  ability: SpellcastingAbility,
  abilityModFor: (ability: SpellcastingAbility) => number,
  proficiencyBonus: number,
  dcExtra: number,
  attackExtra: number,
): { saveDc: number; attackBonus: number } {
  const mod = abilityModFor(ability)
  const pb = clampPb(proficiencyBonus)
  return {
    saveDc: spellSaveDc(mod, pb) + dcExtra,
    attackBonus: spellAttackBonus(mod, pb) + attackExtra,
  }
}

/**
 * Build one profile per contributing caster class (and EK/AT third overlays).
 * Order follows `classes` sheet order.
 */
export function buildCastProfiles(input: BuildCastProfilesInput): SpellCastProfile[] {
  const classes = input.classes.filter((row) => row.name.trim() && row.level > 0)
  if (classes.length === 0) return []

  const dcExtra = input.dcExtra ?? 0
  const attackExtra = input.attackExtra ?? 0
  const overlays = resolveSubclassCasterOverlays(classes, input.subclassCasters ?? [])
  const out: SpellCastProfile[] = []

  for (const row of classes) {
    const slug = resolveClassCasterSlug(row.name)
    const def = classCasterDef(slug)
    const overlay = overlays.find((item) => item.classEntryId === row.id)

    if (def && def.progression !== 'none' && def.ability) {
      const budget = resolveSpellLearnBudget({
        classes: [row],
        abilityModFor: input.abilityModFor,
        subclassCasters: input.subclassCasters,
      })
      const mode = spellLearnModeForSlug(slug)
      const aloneMaxLevel = maxSpellLevelForClassAlone(def.progression, row.level)
      const maxPrepared =
        def.prepare != null
          ? prepareLimitFromClass({
              prepare: def.prepare,
              level: row.level,
              abilityMod: input.abilityModFor(def.ability),
              progression: def.progression,
            })
          : null
      const stats = profileStats(
        def.ability,
        input.abilityModFor,
        input.proficiencyBonus,
        dcExtra,
        attackExtra,
      )
      out.push({
        id: row.id,
        kind: 'class',
        slug: def.slug,
        labelRu: def.labelRu,
        ability: def.ability,
        mode,
        aloneMaxLevel,
        cantripsBudget: budget?.cantrips ?? 0,
        leveledKnownBudget: budget?.leveledKnown ?? null,
        maxPrepared,
        saveDc: stats.saveDc,
        attackBonus: stats.attackBonus,
      })
    }

    // Third-caster archetype on fighter/rogue (no base Spellcasting on the class).
    if (overlay?.progression === 'third' && overlay.ability) {
      if (def && def.progression !== 'none') {
        // Host already has its own casting (unusual); skip duplicate third profile.
        continue
      }
      const level = Math.max(0, Math.floor(row.level))
      const cantrips = level >= 10 ? 3 : level >= 3 ? 2 : 0
      const known = level >= 3 ? Math.max(0, Math.floor((level - 1) / 2)) : 0
      const aloneMaxLevel = maxSpellLevelForClassAlone('third', row.level)
      const hostSlug = resolveClassCasterSlug(row.name) ?? 'third'
      const stats = profileStats(
        overlay.ability,
        input.abilityModFor,
        input.proficiencyBonus,
        dcExtra,
        attackExtra,
      )
      out.push({
        id: row.id,
        kind: 'third',
        slug: hostSlug,
        labelRu: `${row.name.trim()} (⅓)`,
        ability: overlay.ability,
        mode: 'known',
        aloneMaxLevel,
        cantripsBudget: cantrips,
        leveledKnownBudget: known,
        maxPrepared: null,
        saveDc: stats.saveDc,
        attackBonus: stats.attackBonus,
      })
    }
  }

  return out
}

/** Header display: merge only when final DC and attack match (Ilya review). */
export function mergeCastProfilesForDisplay(
  profiles: SpellCastProfile[],
): Array<SpellCastProfile & { mergedFrom?: string[] }> {
  const result: Array<SpellCastProfile & { mergedFrom?: string[] }> = []
  for (const profile of profiles) {
    const twin = result.find(
      (row) =>
        row.ability === profile.ability &&
        row.saveDc === profile.saveDc &&
        row.attackBonus === profile.attackBonus,
    )
    if (!twin) {
      result.push({ ...profile })
      continue
    }
    twin.mergedFrom = [...(twin.mergedFrom ?? [twin.labelRu]), profile.labelRu]
    twin.labelRu = twin.mergedFrom.join(' · ')
  }
  return result
}

export type SpellCastAssociation = {
  class_slug?: string | null
  class_entry_id?: string | null
  /** Explicit ability on grant rows (race/feat), when present. */
  casting_ability?: SpellcastingAbility | null
  source_kind?: string | null
  prepare_source_label?: string | null
}

export type ResolvedSpellCastStats = {
  ability: SpellcastingAbility | null
  saveDc: number | null
  attackBonus: number | null
  sourceLabel: string
  profile: SpellCastProfile | null
}

/**
 * Resolve DC / attack for one spell from its class association + profiles.
 */
export function resolveSpellCastStats(input: {
  spell: SpellCastAssociation
  profiles: SpellCastProfile[]
  abilityModFor: (ability: SpellcastingAbility) => number
  proficiencyBonus: number
  /** Legacy sheet casting_ability when spell has no class tag. */
  fallbackAbility?: SpellcastingAbility | null
  dcExtra?: number
  attackExtra?: number
}): ResolvedSpellCastStats {
  const { spell, profiles } = input
  const dcExtra = input.dcExtra ?? 0
  const attackExtra = input.attackExtra ?? 0

  let profile: SpellCastProfile | null = null
  if (spell.class_entry_id) {
    profile = profiles.find((row) => row.id === spell.class_entry_id) ?? null
  }
  if (!profile && spell.class_slug) {
    profile =
      profiles.find((row) => row.slug === spell.class_slug && row.kind === 'class') ??
      profiles.find((row) => row.slug === spell.class_slug) ??
      null
  }

  const ability: SpellcastingAbility | null =
    spell.casting_ability ??
    profile?.ability ??
    input.fallbackAbility ??
    profiles[0]?.ability ??
    null

  if (!ability) {
    return {
      ability: null,
      saveDc: null,
      attackBonus: null,
      sourceLabel: spell.prepare_source_label?.trim() || '—',
      profile,
    }
  }

  if (profile && profile.ability === ability) {
    return {
      ability,
      saveDc: profile.saveDc,
      attackBonus: profile.attackBonus,
      sourceLabel:
        spell.prepare_source_label?.trim() ||
        `${profile.labelRu} · ${SPELLCASTING_ABILITY_LABELS[ability]}`,
      profile,
    }
  }

  const stats = profileStats(
    ability,
    input.abilityModFor,
    input.proficiencyBonus,
    dcExtra,
    attackExtra,
  )
  const sourceLabel =
    spell.prepare_source_label?.trim() ||
    (profile
      ? `${profile.labelRu} · ${SPELLCASTING_ABILITY_LABELS[ability]}`
      : SPELLCASTING_ABILITY_LABELS[ability])

  return {
    ability,
    saveDc: stats.saveDc,
    attackBonus: stats.attackBonus,
    sourceLabel,
    profile,
  }
}

/**
 * Heuristic backfill for sheets created before class_slug existed.
 * Prefer explicit feature/subclass labels; otherwise leave null (player/fix later).
 */
export function inferClassSlugForSpell(
  spell: {
    class_slug?: string | null
    source_kind?: string | null
    prepare_source_label?: string | null
    id?: string
  },
  profiles: SpellCastProfile[],
): string | null {
  if (spell.class_slug) return spell.class_slug
  if (profiles.length === 1 && profiles[0]!.kind === 'class') {
    // Mono-caster: safe default for catalog/custom rows without a tag.
    if (
      !spell.source_kind ||
      spell.source_kind === 'catalog' ||
      spell.source_kind === 'custom' ||
      spell.source_kind === 'subclass' ||
      spell.source_kind === 'feature'
    ) {
      return profiles[0]!.slug
    }
  }

  const label = (spell.prepare_source_label ?? '').toLowerCase()
  for (const profile of profiles) {
    if (label.includes(profile.labelRu.toLowerCase())) return profile.slug
    if (label.includes(profile.slug)) return profile.slug
  }

  // Pact of the Tome / warlock features → warlock when that profile exists.
  if (
    (label.includes('гримуар') ||
      label.includes('tome') ||
      label.includes('договор') ||
      spell.id?.startsWith('feature-spell:pact')) &&
    profiles.some((row) => row.slug === 'warlock')
  ) {
    return 'warlock'
  }

  return null
}

export function backfillSpellClassFields<T extends SpellCastAssociation & { id?: string }>(
  known: T[],
  profiles: SpellCastProfile[],
): T[] {
  let changed = false
  const next = known.map((spell) => {
    if (spell.class_slug) return spell
    const slug = inferClassSlugForSpell(spell, profiles)
    if (!slug) return spell
    const profile = profiles.find((row) => row.slug === slug)
    changed = true
    return {
      ...spell,
      class_slug: slug,
      ...(profile && !spell.class_entry_id ? { class_entry_id: profile.id } : {}),
    }
  })
  return changed ? next : known
}

/**
 * Per-class learn budgets (M2). Prefer this over resolveSpellLearnBudget for MC.
 * Order follows sheet class order / cast profiles.
 */
export function resolveSpellLearnBudgets(input: BuildCastProfilesInput): SpellLearnBudget[] {
  return buildCastProfiles(input).map((profile) => ({
    mode: profile.mode ?? 'known',
    slug: profile.slug,
    labelRu: profile.labelRu,
    cantrips: profile.cantripsBudget,
    leveledKnown: profile.leveledKnownBudget,
    maxPrepared: profile.maxPrepared,
  }))
}

export function totalCantripsBudget(budgets: SpellLearnBudget[]): number {
  return budgets.reduce((sum, row) => sum + Math.max(0, row.cantrips), 0)
}

/** Short class label for meta chips. */
export function shortCastProfileLabel(labelRu: string): string {
  const t = labelRu.trim()
  if (t.length <= 12) return t
  // «Изобретатель» → keep; long multiclass thirds already short.
  return t
}

/**
 * Named cantrip meta: «Изобретатель 4/4 · Колдун 3/3».
 * `countsBySlug` from sheet known (player cantrips only).
 */
export function formatNamedCantripBudgets(
  budgets: SpellLearnBudget[],
  countsBySlug: Record<string, number>,
  options?: { tomeExtra?: number },
): string | null {
  if (budgets.length === 0) return null
  const parts = budgets.map((row) => {
    const used = countsBySlug[row.slug] ?? 0
    return `${shortCastProfileLabel(row.labelRu)} ${used}/${row.cantrips}`
  })
  if (options?.tomeExtra && options.tomeExtra > 0) {
    parts.push(`Гримуар ${options.tomeExtra}`)
  }
  return parts.join(' · ')
}

/**
 * Per-class prepare meta: «Жрец 4/9 · Паладин 2/6».
 * Only rows with a prepare cap. Optional always-prepared count as a separate chip.
 */
export function formatNamedPrepareBudgets(
  budgets: SpellLearnBudget[],
  countsBySlug: Record<string, number>,
  options?: { alwaysPrepared?: number },
): string | null {
  const prepareRows = budgets.filter(
    (row) => row.maxPrepared != null && row.maxPrepared > 0,
  )
  if (prepareRows.length === 0) return null
  const parts = prepareRows.map((row) => {
    const used = countsBySlug[row.slug] ?? 0
    return `${shortCastProfileLabel(row.labelRu)} ${used}/${row.maxPrepared}`
  })
  if (options?.alwaysPrepared && options.alwaysPrepared > 0) {
    parts.push(`всегда ${options.alwaysPrepared}`)
  }
  return `подг. ${parts.join(' · ')}`
}

/** One grimoire shelf = one caster profile (M5). */
export type GrimoireShelfSource = {
  slug: string
  labelRu: string
  mode: SpellLearnMode | null
  aloneMaxLevel: number
}

export function buildGrimoireShelfSources(
  profiles: SpellCastProfile[],
): GrimoireShelfSource[] {
  const seen = new Set<string>()
  const out: GrimoireShelfSource[] = []
  for (const row of profiles) {
    const slug = row.slug.trim().toLowerCase()
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    out.push({
      slug,
      labelRu: row.labelRu,
      mode: row.mode,
      aloneMaxLevel: row.aloneMaxLevel,
    })
  }
  return out
}

/**
 * Catalog row belongs on a shelf if it is on that class list and
 * level ≤ that class’s alone-max (cantrips always when on list).
 */
export function catalogSpellMatchesShelf(
  catalogClassSlugs: string[],
  spellLevel: number,
  shelf: GrimoireShelfSource,
): boolean {
  const onList = catalogClassSlugs.some(
    (slug) => slug.trim().toLowerCase() === shelf.slug,
  )
  if (!onList) return false
  if (spellLevel <= 0) return true
  return spellLevel <= shelf.aloneMaxLevel
}

export function catalogSpellMatchesAnyShelf(
  catalogClassSlugs: string[],
  spellLevel: number,
  shelves: GrimoireShelfSource[],
): boolean {
  return shelves.some((shelf) =>
    catalogSpellMatchesShelf(catalogClassSlugs, spellLevel, shelf),
  )
}

export function describeGrimoireShelves(shelves: GrimoireShelfSource[]): string {
  if (shelves.length === 0) return ''
  return shelves
    .map((shelf) =>
      shelf.aloneMaxLevel > 0
        ? `${shelf.labelRu} 1–${shelf.aloneMaxLevel}`
        : `${shelf.labelRu} · заговоры`,
    )
    .join(' · ')
}

/**
 * Same catalog/name known under multiple class_slug → dual-cast options (M3).
 */
export function findDualCastSiblings<
  T extends {
    id: string
    name: string
    catalog_id?: string | null
    class_slug?: string | null
    level: number
  },
>(known: T[], spell: T): T[] {
  const catalog = (spell.catalog_id ?? '').trim()
  const name = spell.name.trim().toLowerCase()
  const siblings = known.filter((row) => {
    if (row.id === spell.id) return true
    if (row.level !== spell.level) return false
    if (catalog && row.catalog_id && row.catalog_id === catalog) return true
    return Boolean(name) && row.name.trim().toLowerCase() === name
  })
  const slugs = new Set(
    siblings.map((row) => (row.class_slug ?? '').trim().toLowerCase()).filter(Boolean),
  )
  if (slugs.size < 2) return [spell]
  return siblings
}

export function resolveSpellAcquisitionSlug(input: {
  catalogClassSlugs: string[]
  profiles: SpellCastProfile[]
  classFilter?: string
}): string | null {
  const filter = input.classFilter?.trim() || 'all'
  if (filter !== 'all' && input.profiles.some((row) => row.slug === filter)) {
    return filter
  }
  const hits = input.profiles.filter((row) =>
    input.catalogClassSlugs.map((s) => s.toLowerCase()).includes(row.slug.toLowerCase()),
  )
  if (hits.length === 0) return input.profiles[0]?.slug ?? null
  return hits[0]!.slug
}
