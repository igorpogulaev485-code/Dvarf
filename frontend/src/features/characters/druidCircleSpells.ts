/**
 * Druid circle "always prepared" spells: Wildfire (TCoE) and Circle of the
 * Land tables (PHB). They count as druid spells and do not use the prepare
 * budget. Tagged class_slug=druid for multiclass cast profiles.
 */

import { resolveSubclassFeatureSlug } from '../../shared/dnd/classFeatures'
import { DRUID_LAND_TYPES } from '../../shared/dnd/druidLandChoices'
import { getFeaturePick, type FeaturePicksState } from '../../shared/dnd/featurePicks'
import { alwaysPreparedSpellNameRu } from '../../shared/dnd/alwaysPreparedSpellNamesRu'
import { enrichAlwaysPreparedSheetSpell } from './alwaysPreparedSpellEnrichment'
import {
  asAlwaysPreparedSpell,
  createSheetSpell,
  spellKeyFromName,
  subclassSpellId,
  type SheetSpell,
  type SpellsState,
} from './spells'

export type DruidCircleSpell = {
  name: string
  level: number
  fromClassLevel: number
}

/** Circle of Wildfire (TCoE) — Circle Spells. */
export const WILDFIRE_CIRCLE_SPELLS: DruidCircleSpell[] = [
  { name: 'Burning Hands', level: 1, fromClassLevel: 2 },
  { name: 'Cure Wounds', level: 1, fromClassLevel: 2 },
  { name: 'Flaming Sphere', level: 2, fromClassLevel: 3 },
  { name: 'Scorching Ray', level: 2, fromClassLevel: 3 },
  { name: 'Plant Growth', level: 3, fromClassLevel: 5 },
  { name: 'Revivify', level: 3, fromClassLevel: 5 },
  { name: 'Aura of Life', level: 4, fromClassLevel: 7 },
  { name: 'Fire Shield', level: 4, fromClassLevel: 7 },
  { name: 'Flame Strike', level: 5, fromClassLevel: 9 },
  { name: 'Mass Cure Wounds', level: 5, fromClassLevel: 9 },
]

/**
 * PHB Circle of the Land. Unlocked at druid levels 3 / 5 / 7 / 9.
 * Underdark 5 is Gaseous Form + Stinking Cloud (not Gust of Wind / Lightning Bolt).
 */
export const LAND_CIRCLE_SPELLS: Record<string, DruidCircleSpell[]> = {
  arctic: [
    { name: 'Hold Person', level: 2, fromClassLevel: 3 },
    { name: 'Spike Growth', level: 2, fromClassLevel: 3 },
    { name: 'Sleet Storm', level: 3, fromClassLevel: 5 },
    { name: 'Slow', level: 3, fromClassLevel: 5 },
    { name: 'Freedom of Movement', level: 4, fromClassLevel: 7 },
    { name: 'Ice Storm', level: 4, fromClassLevel: 7 },
    { name: 'Commune with Nature', level: 5, fromClassLevel: 9 },
    { name: 'Cone of Cold', level: 5, fromClassLevel: 9 },
  ],
  coast: [
    { name: 'Mirror Image', level: 2, fromClassLevel: 3 },
    { name: 'Misty Step', level: 2, fromClassLevel: 3 },
    { name: 'Water Breathing', level: 3, fromClassLevel: 5 },
    { name: 'Water Walk', level: 3, fromClassLevel: 5 },
    { name: 'Control Water', level: 4, fromClassLevel: 7 },
    { name: 'Freedom of Movement', level: 4, fromClassLevel: 7 },
    { name: 'Conjure Elemental', level: 5, fromClassLevel: 9 },
    { name: 'Scrying', level: 5, fromClassLevel: 9 },
  ],
  desert: [
    { name: 'Blur', level: 2, fromClassLevel: 3 },
    { name: 'Silence', level: 2, fromClassLevel: 3 },
    { name: 'Create Food and Water', level: 3, fromClassLevel: 5 },
    { name: 'Protection from Energy', level: 3, fromClassLevel: 5 },
    { name: 'Blight', level: 4, fromClassLevel: 7 },
    { name: 'Hallucinatory Terrain', level: 4, fromClassLevel: 7 },
    { name: 'Insect Plague', level: 5, fromClassLevel: 9 },
    { name: 'Wall of Stone', level: 5, fromClassLevel: 9 },
  ],
  forest: [
    { name: 'Barkskin', level: 2, fromClassLevel: 3 },
    { name: 'Spider Climb', level: 2, fromClassLevel: 3 },
    { name: 'Call Lightning', level: 3, fromClassLevel: 5 },
    { name: 'Plant Growth', level: 3, fromClassLevel: 5 },
    { name: 'Divination', level: 4, fromClassLevel: 7 },
    { name: 'Freedom of Movement', level: 4, fromClassLevel: 7 },
    { name: 'Commune with Nature', level: 5, fromClassLevel: 9 },
    { name: 'Tree Stride', level: 5, fromClassLevel: 9 },
  ],
  grassland: [
    { name: 'Invisibility', level: 2, fromClassLevel: 3 },
    { name: 'Pass without Trace', level: 2, fromClassLevel: 3 },
    { name: 'Daylight', level: 3, fromClassLevel: 5 },
    { name: 'Haste', level: 3, fromClassLevel: 5 },
    { name: 'Divination', level: 4, fromClassLevel: 7 },
    { name: 'Freedom of Movement', level: 4, fromClassLevel: 7 },
    { name: 'Dream', level: 5, fromClassLevel: 9 },
    { name: 'Insect Plague', level: 5, fromClassLevel: 9 },
  ],
  mountain: [
    { name: 'Spider Climb', level: 2, fromClassLevel: 3 },
    { name: 'Spike Growth', level: 2, fromClassLevel: 3 },
    { name: 'Lightning Bolt', level: 3, fromClassLevel: 5 },
    { name: 'Meld into Stone', level: 3, fromClassLevel: 5 },
    { name: 'Stone Shape', level: 4, fromClassLevel: 7 },
    { name: 'Stoneskin', level: 4, fromClassLevel: 7 },
    { name: 'Passwall', level: 5, fromClassLevel: 9 },
    { name: 'Wall of Stone', level: 5, fromClassLevel: 9 },
  ],
  swamp: [
    { name: 'Acid Arrow', level: 2, fromClassLevel: 3 },
    { name: 'Darkness', level: 2, fromClassLevel: 3 },
    { name: 'Water Walk', level: 3, fromClassLevel: 5 },
    { name: 'Stinking Cloud', level: 3, fromClassLevel: 5 },
    { name: 'Freedom of Movement', level: 4, fromClassLevel: 7 },
    { name: 'Locate Creature', level: 4, fromClassLevel: 7 },
    { name: 'Insect Plague', level: 5, fromClassLevel: 9 },
    { name: 'Scrying', level: 5, fromClassLevel: 9 },
  ],
  underdark: [
    { name: 'Spider Climb', level: 2, fromClassLevel: 3 },
    { name: 'Web', level: 2, fromClassLevel: 3 },
    { name: 'Gaseous Form', level: 3, fromClassLevel: 5 },
    { name: 'Stinking Cloud', level: 3, fromClassLevel: 5 },
    { name: 'Greater Invisibility', level: 4, fromClassLevel: 7 },
    { name: 'Stone Shape', level: 4, fromClassLevel: 7 },
    { name: 'Cloudkill', level: 5, fromClassLevel: 9 },
    { name: 'Insect Plague', level: 5, fromClassLevel: 9 },
  ],
}

/** Old Underdark rows that must leave the sheet once the PHB table is applied. */
const OBSOLETE_LAND_SPELL_NAMES = ['Gust of Wind', 'Lightning Bolt']

const LAND_IDS = new Set(DRUID_LAND_TYPES.map((row) => row.id))

const CIRCLE_SPELLS: Record<string, { labelRu: string; spells: DruidCircleSpell[] }> = {
  circle_of_wildfire: {
    labelRu: 'Круг дикого огня',
    spells: WILDFIRE_CIRCLE_SPELLS,
  },
}

export type DruidLandGrantPick = {
  classEntryId: string
  slug?: string | null
  picks?: Record<string, string | string[] | undefined> | null
}

/** Feature card «Заклинания круга» wins; the archetype dialog pick is the fallback. */
export function resolveDruidLandType(input: {
  classEntryId: string
  featurePicks?: FeaturePicksState | null
  grantPicks?: Record<string, string | string[] | undefined> | null
}): string | null {
  const picks = input.featurePicks
  const fromFeature = picks
    ? getFeaturePick(picks, input.classEntryId, 'circle_spells_land') ||
      getFeaturePick(picks, input.classEntryId, 'land_type')
    : null
  if (fromFeature && LAND_IDS.has(fromFeature)) return fromFeature
  const raw = input.grantPicks?.land_type
  if (typeof raw === 'string' && LAND_IDS.has(raw)) return raw
  return null
}

export function landCircleSpells(landId: string | null | undefined): DruidCircleSpell[] {
  if (!landId || !LAND_IDS.has(landId)) return []
  return LAND_CIRCLE_SPELLS[landId] ?? []
}

export function druidCircleSpellsForSlug(
  slug: string | null | undefined,
): { slug: string; labelRu: string; spells: DruidCircleSpell[] } | null {
  if (!slug) return null
  const key = resolveSubclassFeatureSlug(slug) || slug.trim().toLowerCase()
  const pack = CIRCLE_SPELLS[key]
  if (!pack) return null
  return { slug: key, ...pack }
}

function spellId(classEntryId: string, slug: string, name: string): string {
  const key = spellKeyFromName(name)
  return subclassSpellId(classEntryId, slug, key || name)
}

function managedCircleSpellIds(classEntryId: string): Set<string> {
  const ids = new Set<string>()
  for (const [slug, pack] of Object.entries(CIRCLE_SPELLS)) {
    for (const row of pack.spells) ids.add(spellId(classEntryId, slug, row.name))
  }
  for (const rows of Object.values(LAND_CIRCLE_SPELLS)) {
    for (const row of rows) ids.add(spellId(classEntryId, 'circle_of_the_land', row.name))
  }
  for (const name of OBSOLETE_LAND_SPELL_NAMES) {
    ids.add(spellId(classEntryId, 'circle_of_the_land', name))
  }
  return ids
}

function componentKey(spell: SheetSpell): string {
  const components = spell.components
  if (!components) return ''
  return `${components.v ? 'v' : ''}${components.s ? 's' : ''}${components.m ? 'm' : ''}`
}

function circleRowChanged(existing: SheetSpell | undefined, created: SheetSpell): boolean {
  if (!existing) return true
  return (
    existing.name !== created.name ||
    existing.level !== created.level ||
    (existing.catalog_id ?? null) !== (created.catalog_id ?? null) ||
    existing.concentration !== created.concentration ||
    (existing.duration ?? '') !== (created.duration ?? '') ||
    componentKey(existing) !== componentKey(created) ||
    existing.class_slug !== 'druid' ||
    !existing.prepared_locked
  )
}

function pushCircleSpell(input: {
  known: SheetSpell[]
  original: SheetSpell[]
  classEntryId: string
  slug: string
  labelRu: string
  row: DruidCircleSpell
}): { known: SheetSpell[]; changed: boolean } {
  const id = spellId(input.classEntryId, input.slug, input.row.name)
  const existing = input.original.find((spell) => spell.id === id)
  const enriched = enrichAlwaysPreparedSheetSpell(
    {
      ...(existing ?? createSheetSpell()),
      id,
      name: '',
      level: input.row.level,
      catalog_id: existing?.catalog_id ?? null,
      class_slug: 'druid',
      class_entry_id: input.classEntryId,
    },
    input.row.name,
  )
  const nameRu = enriched.name || alwaysPreparedSpellNameRu(input.row.name)
  const created = asAlwaysPreparedSpell(
    {
      ...enriched,
      id,
      name: nameRu,
      level: input.row.level,
      class_slug: 'druid',
      class_entry_id: input.classEntryId,
    },
    {
      source_kind: 'subclass',
      label: input.labelRu,
      class_slug: 'druid',
      class_entry_id: input.classEntryId,
    },
  )
  input.known.push(created)
  return { known: input.known, changed: circleRowChanged(existing, created) }
}

/**
 * Ensure circle spells match the active druid archetype, land pick and level.
 * Safe on sheet load: adds missing rows, drops obsolete circle rows, and
 * fills catalog fields (concentration, components, duration) onto the row.
 */
export function syncDruidCircleSpells(input: {
  spells: SpellsState
  classes: Array<{
    id: string
    name: string
    level: number
    subclass_name: string
  }>
  subclassSlugByEntryId?: Record<string, string | null | undefined>
  featurePicks?: FeaturePicksState | null
  subclassGrants?: DruidLandGrantPick[] | null
}): { spells: SpellsState; changed: boolean } {
  let known = [...input.spells.known]
  let changed = false
  const grants = input.subclassGrants ?? []

  for (const row of input.classes) {
    const isDruid = /друид|druid/i.test(row.name.trim())
    if (!isDruid || row.level <= 0) continue

    const slug =
      input.subclassSlugByEntryId?.[row.id] ||
      resolveSubclassFeatureSlug(row.subclass_name) ||
      null
    const grant = grants.find((item) => item.classEntryId === row.id)
    const pack = druidCircleSpellsForSlug(slug)
    const managed = managedCircleSpellIds(row.id)
    const before = known.length
    known = known.filter((spell) => !managed.has(spell.id))
    if (known.length !== before) changed = true

    const classLevel = Math.min(20, Math.max(1, Math.floor(row.level)))
    if (pack) {
      for (const spellRow of pack.spells) {
        if (spellRow.fromClassLevel > classLevel) continue
        const pushed = pushCircleSpell({
          known,
          original: input.spells.known,
          classEntryId: row.id,
          slug: pack.slug,
          labelRu: pack.labelRu,
          row: spellRow,
        })
        known = pushed.known
        if (pushed.changed) changed = true
      }
    }

    if (slug === 'circle_of_the_land') {
      const land = resolveDruidLandType({
        classEntryId: row.id,
        featurePicks: input.featurePicks,
        grantPicks: grant?.picks ?? null,
      })
      const label = land
        ? `Круг земли · ${DRUID_LAND_TYPES.find((item) => item.id === land)?.nameRu ?? land}`
        : 'Круг земли'
      for (const spellRow of landCircleSpells(land)) {
        if (spellRow.fromClassLevel > classLevel) continue
        const pushed = pushCircleSpell({
          known,
          original: input.spells.known,
          classEntryId: row.id,
          slug: 'circle_of_the_land',
          labelRu: label,
          row: spellRow,
        })
        known = pushed.known
        if (pushed.changed) changed = true
      }
    }
  }

  if (!changed) return { spells: input.spells, changed: false }
  if (sameCircleRows(known, input.spells.known)) {
    return { spells: input.spells, changed: false }
  }
  return { spells: { ...input.spells, known }, changed: true }
}

function sameCircleRows(next: SheetSpell[], prev: SheetSpell[]): boolean {
  if (next.length !== prev.length) return false
  const prevById = new Map(prev.map((spell) => [spell.id, spell]))
  if (prevById.size !== prev.length) return false
  for (const spell of next) {
    const old = prevById.get(spell.id)
    if (!old || circleRowChanged(old, spell)) return false
  }
  return true
}
