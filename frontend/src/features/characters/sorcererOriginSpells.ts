/**
 * Sorcerer origin spells that do not count against spells known
 * (XGE Divine/Shadow, TCE Aberrant/Clockwork, Dragonlance Lunar).
 */

import { resolveSubclassFeatureSlug } from '../../shared/dnd/classFeatures'
import {
  getFeaturePick,
  setFeaturePick,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import {
  ABERRANT_MIND_SPELLS,
  CLOCKWORK_SOUL_SPELLS,
  DIVINE_AFFINITY_SPELL,
  LUNAR_SPELLS,
  MOON_FIRE_CANTRIP,
  SHADOW_DARKNESS,
  divineAffinityCatalogValue,
  divineAffinityFromStores,
  lunarFirstLevelSpell,
  lunarPhaseCatalogValue,
  lunarPhaseFromStores,
  type DivineAffinity,
  type LunarPhase,
  type OriginSpellRow,
} from '../../shared/dnd/pack04SorcererWarlock'
import { enrichAlwaysPreparedSheetSpell } from './alwaysPreparedSpellEnrichment'
import {
  asAlwaysPreparedSpell,
  createSheetSpell,
  spellKeyFromName,
  subclassSpellId,
  type SheetSpell,
  type SpellsState,
} from './spells'

const SORCERER_RE = /чародей|sorcerer/i

type GrantRow = {
  classEntryId: string
  slug: string
  picks: Record<string, string | string[]>
}

type OriginPack = {
  slug: string
  labelRu: string
  spells: OriginSpellRow[]
}

const FIXED_PACKS: Record<string, OriginPack> = {
  aberrant_mind: {
    slug: 'aberrant_mind',
    labelRu: 'Аберрантный разум',
    spells: ABERRANT_MIND_SPELLS,
  },
  clockwork_soul: {
    slug: 'clockwork_soul',
    labelRu: 'Заводная душа',
    spells: CLOCKWORK_SOUL_SPELLS,
  },
}

function isSorcerer(name: string): boolean {
  return SORCERER_RE.test(name.trim())
}

function managedIds(classEntryId: string): Set<string> {
  const ids = new Set<string>()
  const packs = [
    ...Object.values(FIXED_PACKS),
    { slug: 'divine_soul', spells: Object.values(DIVINE_AFFINITY_SPELL).map((name) => ({ name })) },
    { slug: 'shadow_magic', spells: [SHADOW_DARKNESS] },
    { slug: 'lunar_sorcery', spells: [...LUNAR_SPELLS, MOON_FIRE_CANTRIP] },
  ]
  for (const pack of packs) {
    for (const row of pack.spells) {
      const key = spellKeyFromName(row.name)
      ids.add(subclassSpellId(classEntryId, pack.slug, key || row.name))
    }
  }
  return ids
}

function materialize(
  classEntryId: string,
  slug: string,
  labelRu: string,
  row: OriginSpellRow,
  existing: SheetSpell | undefined,
  grant: SheetSpell['grant_cast'] | null,
): SheetSpell {
  const key = spellKeyFromName(row.name)
  const id = subclassSpellId(classEntryId, slug, key || row.name)
  const keepName =
    existing?.name && existing.name.trim() && existing.name !== row.name
      ? existing.name
      : ''
  const base = asAlwaysPreparedSpell(
    {
      ...(existing ?? createSheetSpell()),
      id,
      name: keepName,
      level: row.level,
      catalog_id: existing?.catalog_id ?? null,
      class_slug: 'sorcerer',
      class_entry_id: classEntryId,
    },
    {
      source_kind: 'subclass',
      label: labelRu,
      class_slug: 'sorcerer',
      class_entry_id: classEntryId,
    },
  )
  const enriched = enrichAlwaysPreparedSheetSpell(base, row.name)
  if (!grant) {
    if (!enriched.grant_cast) return enriched
    const { grant_cast: _drop, ...rest } = enriched
    return rest
  }
  const prevUsed = existing?.grant_cast?.used ?? grant.used
  return {
    ...enriched,
    grant_cast: {
      ...grant,
      used: Math.min(grant.max, Math.max(0, prevUsed)),
    },
  }
}

function lunarGrant(
  row: OriginSpellRow,
  phase: LunarPhase | null,
  classLevel: number,
  existing: SheetSpell | undefined,
): SheetSpell['grant_cast'] | null {
  if (!row.phase || row.level !== 1 || !phase) return null
  const unlocked = classLevel >= 6 || row.phase === phase
  if (!unlocked) return null
  if (classLevel < 6 && row.phase !== phase) return null
  return {
    max: 1,
    used: existing?.grant_cast?.used ?? 0,
    reset: 'long',
    label: row.phase === 'full_moon' ? 'Полная луна' : row.phase === 'new_moon' ? 'Новая луна' : 'Серп',
  }
}

function rowsForOrigin(input: {
  slug: string
  classLevel: number
  affinity: DivineAffinity | null
  phase: LunarPhase | null
}): Array<{ packSlug: string; labelRu: string; row: OriginSpellRow; grant: boolean }> {
  const level = input.classLevel
  if (input.slug === 'aberrant_mind' || input.slug === 'clockwork_soul') {
    const pack = FIXED_PACKS[input.slug]
    if (!pack) return []
    return pack.spells
      .filter((row) => row.fromClassLevel <= level)
      .map((row) => ({ packSlug: pack.slug, labelRu: pack.labelRu, row, grant: false }))
  }
  if (input.slug === 'divine_soul' && input.affinity) {
    const name = DIVINE_AFFINITY_SPELL[input.affinity]
    return [
      {
        packSlug: 'divine_soul',
        labelRu: 'Божественная душа',
        row: { name, level: 1, fromClassLevel: 1 },
        grant: false,
      },
    ]
  }
  if (input.slug === 'shadow_magic' && level >= SHADOW_DARKNESS.fromClassLevel) {
    return [
      {
        packSlug: 'shadow_magic',
        labelRu: 'Теневая магия',
        row: SHADOW_DARKNESS,
        grant: false,
      },
    ]
  }
  if (input.slug === 'lunar_sorcery') {
    const rows = [MOON_FIRE_CANTRIP, ...LUNAR_SPELLS].filter((row) => row.fromClassLevel <= level)
    return rows.map((row) => ({
      packSlug: 'lunar_sorcery',
      labelRu: 'Лунное чародейство',
      row,
      grant: true,
    }))
  }
  return []
}

function alignStores<T extends GrantRow>(input: {
  featurePicks: FeaturePicksState
  grants: T[]
  classEntryId: string
  slug: string
}): { featurePicks: FeaturePicksState; grants: T[]; changed: boolean } {
  let featurePicks = input.featurePicks
  let changed = false
  const grants = input.grants.map((grant) => ({ ...grant, picks: { ...grant.picks } }))
  const grant = grants.find(
    (row) => row.classEntryId === input.classEntryId && row.slug === input.slug,
  )
  if (input.slug === 'lunar_sorcery') {
    const phase = lunarPhaseFromStores({
      featurePicks,
      classEntryId: input.classEntryId,
      grantPicks: grant?.picks,
    })
    if (phase) {
      const current = getFeaturePick(featurePicks, input.classEntryId, 'lunar_embodiment')
      if (current !== phase) {
        featurePicks = setFeaturePick(featurePicks, input.classEntryId, 'lunar_embodiment', phase)
        changed = true
      }
      if (grant) {
        const catalog = lunarPhaseCatalogValue(phase)
        if (grant.picks.lunar_phase !== catalog) {
          grant.picks.lunar_phase = catalog
          changed = true
        }
      }
    }
  }
  if (input.slug === 'divine_soul') {
    const affinity = divineAffinityFromStores({
      featurePicks,
      classEntryId: input.classEntryId,
      grantPicks: grant?.picks,
    })
    if (affinity) {
      const featureValue = affinity
      const current = getFeaturePick(featurePicks, input.classEntryId, 'divine_magic')
      if (current !== featureValue) {
        featurePicks = setFeaturePick(
          featurePicks,
          input.classEntryId,
          'divine_magic',
          featureValue,
        )
        changed = true
      }
      if (grant) {
        const catalog = divineAffinityCatalogValue(affinity)
        if (grant.picks.divine_affinity !== catalog) {
          grant.picks.divine_affinity = catalog
          changed = true
        }
      }
    }
  }
  return { featurePicks, grants, changed }
}

export function syncSorcererOriginSpells<T extends GrantRow>(input: {
  spells: SpellsState
  classes: Array<{ id: string; name: string; level: number; subclass_name: string }>
  subclassSlugByEntryId?: Record<string, string | null | undefined>
  featurePicks: FeaturePicksState
  subclassGrants: T[]
}): {
  spells: SpellsState
  featurePicks: FeaturePicksState
  subclassGrants: T[]
  changed: boolean
} {
  let known = [...input.spells.known]
  let featurePicks = input.featurePicks
  let grants = input.subclassGrants
  let changed = false

  for (const row of input.classes) {
    if (!isSorcerer(row.name) || row.level <= 0) continue
    const slug =
      resolveSubclassFeatureSlug(
        input.subclassSlugByEntryId?.[row.id] || row.subclass_name,
      ) || null
    const aligned = alignStores({
      featurePicks,
      grants,
      classEntryId: row.id,
      slug: slug ?? '',
    })
    featurePicks = aligned.featurePicks
    grants = aligned.grants
    if (aligned.changed) changed = true

    const managed = managedIds(row.id)
    known = known.filter((spell) => !managed.has(spell.id))
    if (!slug) continue

    const grant = grants.find((item) => item.classEntryId === row.id && item.slug === slug)
    const phase = lunarPhaseFromStores({
      featurePicks,
      classEntryId: row.id,
      grantPicks: grant?.picks,
    })
    const affinity = divineAffinityFromStores({
      featurePicks,
      classEntryId: row.id,
      grantPicks: grant?.picks,
    })
    const classLevel = Math.min(20, Math.max(1, Math.floor(row.level)))
    for (const item of rowsForOrigin({ slug, classLevel, affinity, phase })) {
      const key = spellKeyFromName(item.row.name)
      const id = subclassSpellId(row.id, item.packSlug, key || item.row.name)
      const existing = input.spells.known.find((spell) => spell.id === id)
      const grantCast = item.grant
        ? lunarGrant(item.row, phase, classLevel, existing)
        : null
      // Before level 6 only the active phase's 1st-level spell is free.
      // From Waxing and Waning each phase keeps its own charge, but the
      // cast path still requires the phase to be current.
      const created = materialize(
        row.id,
        item.packSlug,
        item.labelRu,
        item.row,
        existing,
        item.grant && item.row.level === 1 ? grantCast : null,
      )
      known.push(created)
    }
  }

  const signature = (rows: SheetSpell[]) =>
    rows
      .map(
        (spell) =>
          `${spell.id}|${spell.name}|${spell.level}|${spell.damage ?? ''}|${spell.range ?? ''}|${spell.attack_or_save ?? ''}|${spell.grant_cast?.label ?? ''}|${spell.grant_cast?.max ?? ''}|${spell.grant_cast?.used ?? ''}`,
      )
      .join('\n')
  if (signature(known) !== signature(input.spells.known)) changed = true

  if (!changed) {
    return {
      spells: input.spells,
      featurePicks: input.featurePicks,
      subclassGrants: input.subclassGrants,
      changed: false,
    }
  }
  return {
    spells: { ...input.spells, known },
    featurePicks,
    subclassGrants: grants,
    changed: true,
  }
}

/** Free lunar cast is only legal while that phase is the current one. */
export function lunarFreeCastBlocked(input: {
  spell: SheetSpell
  phase: LunarPhase | null
  classLevel: number
}): boolean {
  const grant = input.spell.grant_cast
  if (!grant || grant.max <= 0) return false
  const phaseOfGrant: LunarPhase | null =
    grant.label === 'Полная луна'
      ? 'full_moon'
      : grant.label === 'Новая луна'
        ? 'new_moon'
        : grant.label === 'Серп'
          ? 'crescent_moon'
          : null
  if (!phaseOfGrant) return false
  if (!input.spell.id.includes(':lunar_sorcery:')) return false
  const first = lunarFirstLevelSpell(phaseOfGrant)
  if (!first) return false
  const key = spellKeyFromName(first.name)
  if (!input.spell.id.endsWith(`:${key}`)) return false
  return input.phase !== phaseOfGrant
}
