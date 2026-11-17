/**
 * PHB 2024 Beast Master: sync «Первичный спутник» naparnik from feature_picks / class_options.
 * Stats: SRD 5.2 (next.dnd.su) — see primalCompanionStats2024 in ranger2024Features.
 */

import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import type { ClassOptions2024State } from '../../shared/dnd/edition2024ClassOptions'
import { type FeaturePicksState } from '../../shared/dnd/featurePicks'
import {
  isPrimalCompanionType2024,
  RANGER_SUBCLASS_SLUGS_2024,
  readPrimalCompanionType2024,
} from '../../shared/dnd/ranger2024Features'
import type { RulesEdition } from '../../shared/api/characters'
import {
  companionFromTemplate,
  resolveCompanionTemplate,
  type CompanionTemplateContext,
} from './companionTemplates'
import { type CompanionEntry } from './companions'

const FEATURE_IDS = ['primal-companion', 'primal_companion'] as const

export function readPrimalCompanionPick2024(input: {
  featurePicks: FeaturePicksState
  classEntryId: string
  classOptions2024?: ClassOptions2024State | null
}): string | null {
  const fromPick = readPrimalCompanionType2024(input.featurePicks, input.classEntryId)
  if (fromPick) return fromPick
  const fromOpts = String(input.classOptions2024?.primal_companion ?? '').trim().toLowerCase()
  return isPrimalCompanionType2024(fromOpts) ? fromOpts : null
}

function normalizeSubclassKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
}

function findBeastMasterRow(
  classes: ClassLevelEntry[],
): { classEntryId: string; subclassSlug: string; level: number } | null {
  const target = normalizeSubclassKey(RANGER_SUBCLASS_SLUGS_2024.beastmaster)
  for (const row of classes) {
    const raw = String(row.subclass_catalog_id || row.subclass_name || '').trim()
    const slug = normalizeSubclassKey(raw)
    const isBeast =
      slug === target ||
      slug.endsWith('beastmaster') ||
      slug.includes('beast-master') ||
      /повелитель\s*зверей/i.test(raw)
    if (!isBeast) continue
    const level = Math.max(1, Math.floor(row.level || 1))
    if (level < 3) continue
    return {
      classEntryId: row.id,
      subclassSlug: RANGER_SUBCLASS_SLUGS_2024.beastmaster,
      level,
    }
  }
  return null
}

export function syncPrimalCompanion2024(input: {
  companions: CompanionEntry[]
  classes: ClassLevelEntry[]
  featurePicks: FeaturePicksState
  classOptions2024?: ClassOptions2024State | null
  rulesEdition?: RulesEdition | string | null
  characterLevel: number
  wisMod: number
}): { companions: CompanionEntry[]; changed: boolean } {
  if (input.rulesEdition !== '2024') {
    return { companions: input.companions, changed: false }
  }
  const host = findBeastMasterRow(input.classes)
  if (!host) {
    const before = input.companions.length
    const kept = input.companions.filter(
      (row) => !FEATURE_IDS.includes(String(row.source?.feature ?? '') as (typeof FEATURE_IDS)[number]),
    )
    return { companions: kept, changed: kept.length !== before }
  }

  const type = readPrimalCompanionPick2024({
    featurePicks: input.featurePicks,
    classEntryId: host.classEntryId,
    classOptions2024: input.classOptions2024,
  })
  if (!type) {
    return { companions: input.companions, changed: false }
  }

  const ctx: CompanionTemplateContext = {
    hostClassLevel: host.level,
    characterLevel: Math.max(1, input.characterLevel),
    hostWisMod: input.wisMod,
    spellMod: input.wisMod,
    rulesEdition: '2024',
  }
  const template = resolveCompanionTemplate({
    choiceId: 'primal-companion',
    pickValue: type,
    ctx,
  })
  if (!template) {
    return { companions: input.companions, changed: false }
  }

  const source = {
    kind: 'subclass' as const,
    labelRu: 'Повелитель зверей',
    classEntryId: host.classEntryId,
    subclassSlug: host.subclassSlug,
    feature: 'primal-companion',
  }

  const existing = input.companions.find(
    (row) =>
      row.source?.classEntryId === host.classEntryId &&
      FEATURE_IDS.includes(String(row.source?.feature ?? '') as (typeof FEATURE_IDS)[number]),
  )

  const built = companionFromTemplate({
    template,
    name: existing?.name?.trim() ? existing.name : template.defaultName,
    source,
  })
  const nextRow: CompanionEntry = {
    ...built,
    id: existing?.id ?? built.id,
    active: existing ? existing.active || (existing.stats.hp ?? 1) > 0 : true,
    stats: {
      ...built.stats,
      hp: existing?.stats.hp != null && existing.stats.hp > 0 ? existing.stats.hp : built.stats.hp,
    },
    notes: built.notes,
    actions: built.actions,
  }

  const others = input.companions.filter((row) => row.id !== existing?.id)
  const duplicatePrimal = others.filter(
    (row) =>
      row.source?.classEntryId === host.classEntryId &&
      FEATURE_IDS.includes(String(row.source?.feature ?? '') as (typeof FEATURE_IDS)[number]),
  )
  const withoutDupes = others.filter((row) => !duplicatePrimal.includes(row))
  const next = [...withoutDupes, nextRow]
  const changed =
    !existing ||
    duplicatePrimal.length > 0 ||
    existing.stats.ac !== nextRow.stats.ac ||
    existing.stats.hp_max !== nextRow.stats.hp_max ||
    existing.actions !== nextRow.actions ||
    existing.notes !== nextRow.notes

  return { companions: next, changed }
}