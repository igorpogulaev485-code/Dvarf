/**
 * C-03: Conjure * picker rules — type + CR only (strict filter, C03-2).
 * Familiar / ranger beast pickers stay open (Н13).
 */

import {
  conjureAnimalsCounts,
  conjureCelestialCrMax,
  conjureElementalCrMax,
  conjureFeyCrMax,
  conjureWoodlandOrMinorCounts,
} from '../../shared/dnd/summonSpellPreview'
import { createPackCompanion } from './companionPack'
import { createCompanion, type CompanionEntry } from './companions'
import { mergeBestiaryPickIntoCompanion } from './bestiaryCompanionStats'
import type { BestiaryFormPick } from './wildShape'

export type ConjureSpellKind =
  | 'conjure_animals'
  | 'conjure_woodland_beings'
  | 'conjure_minor_elementals'
  | 'conjure_elemental'
  | 'conjure_fey'
  | 'conjure_celestial'

export { conjureWoodlandOrMinorCounts, conjureWoodlandOrMinorMultiplier } from '../../shared/dnd/summonSpellPreview'

export function parseCrNumber(cr: string | null | undefined): number {
  const raw = (cr ?? '').trim().toLowerCase().replace(',', '.')
  if (!raw) return Number.POSITIVE_INFINITY
  if (raw === '0' || raw === '—') return 0
  if (raw === '1/8' || raw === '⅛') return 0.125
  if (raw === '1/4' || raw === '¼') return 0.25
  if (raw === '1/2' || raw === '½') return 0.5
  const n = Number(raw)
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY
}

function typeMatches(pickType: string, allowed: string[]): boolean {
  const t = pickType.trim().toLowerCase()
  return allowed.some((a) => t === a || t.includes(a))
}

export type ConjureFilter = {
  types: string[]
  /** Max CR inclusive. */
  crMax: number
  /** Optional: also allow beast for conjure fey «spirit in beast form». */
  alsoBeastAsSpirit?: boolean
}

export function conjureFilterForSpell(
  kind: ConjureSpellKind,
  slotLevel: number,
): ConjureFilter {
  if (kind === 'conjure_animals') {
    return { types: ['beast'], crMax: 2 }
  }
  if (kind === 'conjure_woodland_beings') {
    return { types: ['fey'], crMax: 2 }
  }
  if (kind === 'conjure_minor_elementals') {
    return { types: ['elemental'], crMax: 2 }
  }
  if (kind === 'conjure_elemental') {
    return { types: ['elemental'], crMax: conjureElementalCrMax(slotLevel) }
  }
  if (kind === 'conjure_fey') {
    return {
      types: ['fey'],
      crMax: conjureFeyCrMax(slotLevel),
      alsoBeastAsSpirit: true,
    }
  }
  return { types: ['celestial'], crMax: conjureCelestialCrMax(slotLevel) }
}

export function pickMatchesConjureFilter(
  pick: BestiaryFormPick,
  filter: ConjureFilter,
): boolean {
  const cr = parseCrNumber(pick.cr)
  if (cr > filter.crMax + 1e-9) return false
  if (typeMatches(pick.type, filter.types)) return true
  if (filter.alsoBeastAsSpirit && typeMatches(pick.type, ['beast'])) return true
  return false
}

/** Max creatures for a chosen CR band (group conjures). */
export function conjureCountForCr(
  kind: ConjureSpellKind,
  slotLevel: number,
  cr: string,
): number {
  const value = parseCrNumber(cr)
  if (kind === 'conjure_animals') {
    const c = conjureAnimalsCounts(slotLevel)
    if (value <= 0.25) return c.crQuarter
    if (value <= 0.5) return c.crHalf
    if (value <= 1) return c.cr1
    if (value <= 2) return c.cr2
    return 0
  }
  if (kind === 'conjure_woodland_beings' || kind === 'conjure_minor_elementals') {
    const c = conjureWoodlandOrMinorCounts(slotLevel)
    if (value <= 0.25) return c.crQuarter
    if (value <= 0.5) return c.crHalf
    if (value <= 1) return c.cr1
    if (value <= 2) return c.cr2
    return 0
  }
  return 1
}

export function isConjurePickSpell(slug: string | null | undefined): boolean {
  return (
    slug === 'conjure_animals' ||
    slug === 'conjure_woodland_beings' ||
    slug === 'conjure_minor_elementals' ||
    slug === 'conjure_elemental' ||
    slug === 'conjure_fey' ||
    slug === 'conjure_celestial'
  )
}

export function applyConjureBestiaryPick(input: {
  companions: CompanionEntry[]
  kind: ConjureSpellKind
  spellName: string
  spellId?: string
  slotLevel: number
  pick: BestiaryFormPick
  count: number
}): { companions: CompanionEntry[]; name: string; refreshed: boolean } {
  const feature = `spell:${input.kind}`
  const source = {
    kind: 'spell' as const,
    labelRu: `Заклинание: ${input.spellName}`,
    feature,
    spellId: input.spellId,
  }
  const fairyMark =
    input.kind === 'conjure_animals'
      ? 'тип: фея (дух в облике зверя)'
      : ''
  const count = Math.max(1, Math.floor(input.count))
  const existing = input.companions.find(
    (row) =>
      row.source?.kind === 'spell' &&
      (row.source.feature === feature || row.source.spellId === input.spellId),
  )

  if (count === 1) {
    const base = createCompanion({
      id: existing?.id,
      kind: 'other',
      name: input.pick.name_ru,
      nature: 'summoned',
      active: true,
      initiativeMode: 'own_initiative',
      commandCost: 'none',
      source,
      notes: `${source.labelRu}${fairyMark ? ` · ${fairyMark}` : ''}`,
    })
    const merged = mergeBestiaryPickIntoCompanion({ companion: base, pick: input.pick })
    const card: CompanionEntry = {
      ...merged,
      pack: null,
      notes: fairyMark
        ? merged.notes.includes(fairyMark)
          ? merged.notes
          : `${merged.notes}${merged.notes.trim() ? ' · ' : ''}${fairyMark}`
        : merged.notes,
      initiativeMode: 'own_initiative',
      commandCost: 'none',
      active: true,
      death: null,
    }
    if (existing) {
      return {
        companions: input.companions.map((row) =>
          row.id === existing.id ? { ...card, id: existing.id } : row,
        ),
        name: card.name,
        refreshed: true,
      }
    }
    return {
      companions: [...input.companions, card],
      name: card.name,
      refreshed: false,
    }
  }

  const packCard = createPackCompanion({
    unitNameRu: input.pick.name_ru,
    count,
    unitHpMax: input.pick.hp,
    ac: input.pick.ac,
    speed: input.pick.speed_walk,
    dex: input.pick.dex,
    str: input.pick.str,
    con: input.pick.con,
    actions: input.pick.actions_text,
    notes: `${source.labelRu}${fairyMark ? ` · ${fairyMark}` : ''} · команда голосом бесплатно`,
    source,
    nature: 'summoned',
    initiativeMode: 'own_initiative',
    commandCost: 'none',
    bestiary_ref: input.pick.catalog_id ?? input.pick.slug,
    bestiary_name_ru: input.pick.name_ru,
  })

  if (existing) {
    return {
      companions: input.companions.map((row) =>
        row.id === existing.id ? { ...packCard, id: existing.id } : row,
      ),
      name: packCard.name,
      refreshed: true,
    }
  }
  return {
    companions: [...input.companions, packCard],
    name: packCard.name,
    refreshed: false,
  }
}

/** Replace legacy empty «Призванные звери» stub notes after a real pick. */
export function isLegacyConjureStub(row: CompanionEntry): boolean {
  if (row.source?.kind !== 'spell') return false
  const feature = (row.source.feature ?? '').toLowerCase()
  if (!feature.startsWith('spell:conjure_')) return false
  const emptyStats =
    (row.stats.hp == null || row.stats.hp === 0) &&
    row.stats.ac == null &&
    !row.pack
  return emptyStats || /статы.*мастер|статы зверей — у мастера/i.test(row.notes + row.actions)
}
