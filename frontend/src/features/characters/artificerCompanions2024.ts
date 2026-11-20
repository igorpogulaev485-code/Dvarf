/**
 * EFA 2024 Artificer companions: Eldritch Cannon / Steel Defender sync.
 * Callers must pass rulesEdition === '2024'; 2014 paths stay on Tasha templates.
 */

import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  ARTIFICER_SUBCLASS_SLUGS_2024,
  ELDRITCH_CANNON_NAME_RU,
  STEEL_DEFENDER_NAME_RU,
} from '../../shared/dnd/artificer2024Features'
import type { RulesEdition } from '../../shared/api/characters'
import {
  companionFromTemplate,
  resolveCompanionTemplate,
  type CompanionTemplateContext,
} from './companionTemplates'
import { type CompanionEntry } from './companions'

const CANNON_FEATURES = ['eldritch-cannon', 'eldritch_cannon'] as const
const DEFENDER_FEATURES = ['steel-defender', 'steel_defender', 'steel_defender_name'] as const

function normalizeSubclassKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
}

function findArtificerSubclassRow(
  classes: ClassLevelEntry[],
  targetSlug: string,
  nameRuHint: RegExp,
): { classEntryId: string; subclassSlug: string; level: number } | null {
  const target = normalizeSubclassKey(targetSlug)
  for (const row of classes) {
    const raw = String(row.subclass_catalog_id || row.subclass_name || '').trim()
    const slug = normalizeSubclassKey(raw)
    const match =
      slug === target
      || slug.endsWith(target.split('__')[1] || target)
      || nameRuHint.test(raw)
    if (!match) continue
    const level = Math.max(1, Math.floor(row.level || 1))
    if (level < 3) continue
    return { classEntryId: row.id, subclassSlug: targetSlug, level }
  }
  return null
}

function syncOne(input: {
  companions: CompanionEntry[]
  host: { classEntryId: string; subclassSlug: string; level: number }
  feature: string
  choiceId: string
  pickValue: string
  labelRu: string
  characterLevel: number
  intMod: number
  featureIds: readonly string[]
}): { companions: CompanionEntry[]; changed: boolean } {
  const ctx: CompanionTemplateContext = {
    hostClassLevel: input.host.level,
    characterLevel: Math.max(1, input.characterLevel),
    hostIntMod: input.intMod,
    spellMod: input.intMod,
    rulesEdition: '2024',
  }
  const template = resolveCompanionTemplate({
    choiceId: input.choiceId,
    pickValue: input.pickValue,
    ctx,
  })
  if (!template) {
    return { companions: input.companions, changed: false }
  }

  const source = {
    kind: 'subclass' as const,
    labelRu: input.labelRu,
    classEntryId: input.host.classEntryId,
    subclassSlug: input.host.subclassSlug,
    feature: input.feature,
  }

  const existing = input.companions.find(
    (row) =>
      row.source?.classEntryId === input.host.classEntryId &&
      input.featureIds.includes(String(row.source?.feature ?? '') as (typeof input.featureIds)[number]),
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
  }

  const others = input.companions.filter((row) => row.id !== existing?.id)
  const next = [...others, nextRow]
  const changed =
    !existing
    || existing.stats.ac !== nextRow.stats.ac
    || existing.stats.hp_max !== nextRow.stats.hp_max
    || existing.actions !== nextRow.actions
    || existing.notes !== nextRow.notes

  return { companions: next, changed }
}

export function syncEldritchCannon2024(input: {
  companions: CompanionEntry[]
  classes: ClassLevelEntry[]
  rulesEdition?: RulesEdition | string | null
  characterLevel: number
  intMod: number
}): { companions: CompanionEntry[]; changed: boolean } {
  if (input.rulesEdition !== '2024') {
    return { companions: input.companions, changed: false }
  }
  const host = findArtificerSubclassRow(
    input.classes,
    ARTIFICER_SUBCLASS_SLUGS_2024.artillerist,
    /артиллерист/i,
  )
  if (!host) {
    const before = input.companions.length
    const kept = input.companions.filter(
      (row) => !CANNON_FEATURES.includes(String(row.source?.feature ?? '') as (typeof CANNON_FEATURES)[number]),
    )
    return { companions: kept, changed: kept.length !== before }
  }
  return syncOne({
    companions: input.companions,
    host,
    feature: 'eldritch-cannon',
    choiceId: 'eldritch-cannon',
    pickValue: 'activation',
    labelRu: ELDRITCH_CANNON_NAME_RU,
    characterLevel: input.characterLevel,
    intMod: input.intMod,
    featureIds: CANNON_FEATURES,
  })
}

export function syncSteelDefender2024(input: {
  companions: CompanionEntry[]
  classes: ClassLevelEntry[]
  rulesEdition?: RulesEdition | string | null
  characterLevel: number
  intMod: number
}): { companions: CompanionEntry[]; changed: boolean } {
  if (input.rulesEdition !== '2024') {
    return { companions: input.companions, changed: false }
  }
  const host = findArtificerSubclassRow(
    input.classes,
    ARTIFICER_SUBCLASS_SLUGS_2024.battleSmith,
    /боевой\s*кузнец/i,
  )
  if (!host) {
    const before = input.companions.length
    const kept = input.companions.filter(
      (row) =>
        !DEFENDER_FEATURES.includes(String(row.source?.feature ?? '') as (typeof DEFENDER_FEATURES)[number]),
    )
    return { companions: kept, changed: kept.length !== before }
  }
  return syncOne({
    companions: input.companions,
    host,
    feature: 'steel-defender',
    choiceId: 'steel-defender',
    pickValue: 'steel_defender',
    labelRu: STEEL_DEFENDER_NAME_RU,
    characterLevel: input.characterLevel,
    intMod: input.intMod,
    featureIds: DEFENDER_FEATURES,
  })
}

/** Apply both EFA companion syncs. */
export function syncArtificerCompanions2024(input: {
  companions: CompanionEntry[]
  classes: ClassLevelEntry[]
  rulesEdition?: RulesEdition | string | null
  characterLevel: number
  intMod: number
}): { companions: CompanionEntry[]; changed: boolean } {
  const cannon = syncEldritchCannon2024(input)
  const defender = syncSteelDefender2024({ ...input, companions: cannon.companions })
  return {
    companions: defender.companions,
    changed: cannon.changed || defender.changed,
  }
}
