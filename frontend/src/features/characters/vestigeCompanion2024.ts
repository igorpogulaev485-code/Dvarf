/**
 * AU 2024 Vestige Patron: sync «Спутник-предтеча» naparnik from class_options_2024.
 * Stats: vestigeCompanionStats2024 in warlockBook2024Features.
 */

import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import type { ClassOptions2024State } from '../../shared/dnd/edition2024ClassOptions'
import { type FeaturePicksState, getFeaturePick } from '../../shared/dnd/featurePicks'
import {
  DIVINE_POWER_NAME_RU,
  isVestigeCompanionType2024,
  isVestigePatron2024,
  VESTIGE_COMPANION_FEATURE_ID,
  VESTIGE_COMPANION_NAME_RU,
  VESTIGE_PATRON_NAME_RU,
  vestigeCompanionStats2024,
  type VestigeCompanionType2024,
} from '../../shared/dnd/warlockBook2024Features'
import type { RulesEdition } from '../../shared/api/characters'
import {
  createCompanion,
  mergeCompanionResources,
  type CompanionEntry,
  type CompanionResource,
} from './companions'

const FEATURE_IDS = ['vestige-companion', 'vestige_companion'] as const

export const DIVINE_POWER_RESOURCE_ID = 'divine_power'

export function readVestigeCompanionTypePick2024(input: {
  featurePicks: FeaturePicksState
  classEntryId: string
  classOptions2024?: ClassOptions2024State | null
}): VestigeCompanionType2024 | null {
  const fromOpts = String(input.classOptions2024?.vestige_companion_type ?? '')
    .trim()
    .toLowerCase()
  if (isVestigeCompanionType2024(fromOpts)) return fromOpts
  const fromPick = String(
    getFeaturePick(input.featurePicks, input.classEntryId, 'vestige_companion_type') ||
      getFeaturePick(input.featurePicks, input.classEntryId, 'vestige-companion-type') ||
      '',
  )
    .trim()
    .toLowerCase()
  return isVestigeCompanionType2024(fromPick) ? fromPick : null
}

function normalizeSubclassKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
}

function findVestigeHost(
  classes: ClassLevelEntry[],
): { classEntryId: string; subclassSlug: string; level: number } | null {
  for (const row of classes) {
    const raw = String(row.subclass_catalog_id || row.subclass_name || '').trim()
    const slug = normalizeSubclassKey(raw)
    const isVestige =
      isVestigePatron2024(raw) ||
      slug === 'warlock--vestige-patron' ||
      slug.endsWith('vestige-patron') ||
      /предтеч/i.test(raw)
    if (!isVestige) continue
    const level = Math.max(1, Math.floor(row.level || 1))
    if (level < 3) continue
    return {
      classEntryId: row.id,
      subclassSlug: 'warlock__vestige-patron',
      level,
    }
  }
  return null
}

function isVestigeCompanionRow(row: CompanionEntry, classEntryId?: string): boolean {
  const feature = String(row.source?.feature ?? '')
  if (!FEATURE_IDS.includes(feature as (typeof FEATURE_IDS)[number])) return false
  if (classEntryId && row.source?.classEntryId && row.source.classEntryId !== classEntryId) {
    return false
  }
  return true
}

export function divinePowerResource2024(warlockLevel: number): CompanionResource {
  // L6+: Magical Cunning / short rest restore Divine Power (AU Vestige Power).
  const reset: CompanionResource['reset'] = warlockLevel >= 6 ? 'short' : 'long'
  return {
    id: DIVINE_POWER_RESOURCE_ID,
    name: DIVINE_POWER_NAME_RU,
    max: 1,
    used: 0,
    reset,
  }
}

/** Magical Cunning (warlock 6+): restore Divine Power on vestige companions. */
export function restoreVestigeDivinePowerOnCompanions(
  companions: CompanionEntry[],
): { companions: CompanionEntry[]; changed: boolean } {
  let changed = false
  const next = companions.map((row) => {
    if (!isVestigeCompanionRow(row)) return row
    const resources = row.resources.map((res) => {
      if (res.id !== DIVINE_POWER_RESOURCE_ID || res.used <= 0) return res
      changed = true
      return { ...res, used: 0 }
    })
    return resources === row.resources ? row : { ...row, resources }
  })
  return { companions: next, changed }
}

export function syncVestigeCompanion2024(input: {
  companions: CompanionEntry[]
  classes: ClassLevelEntry[]
  featurePicks: FeaturePicksState
  classOptions2024?: ClassOptions2024State | null
  rulesEdition?: RulesEdition | string | null
  characterLevel: number
  chaMod: number
  spellAttackBonus?: number
}): { companions: CompanionEntry[]; changed: boolean } {
  if (input.rulesEdition !== '2024') {
    return { companions: input.companions, changed: false }
  }
  const host = findVestigeHost(input.classes)
  if (!host) {
    const before = input.companions.length
    const kept = input.companions.filter((row) => !isVestigeCompanionRow(row))
    return { companions: kept, changed: kept.length !== before }
  }

  const type = readVestigeCompanionTypePick2024({
    featurePicks: input.featurePicks,
    classEntryId: host.classEntryId,
    classOptions2024: input.classOptions2024,
  })
  if (!type) {
    return { companions: input.companions, changed: false }
  }

  const stats = vestigeCompanionStats2024({
    type,
    warlockLevel: host.level,
    chaMod: input.chaMod,
    characterLevel: Math.max(1, input.characterLevel),
    spellAttackBonus: input.spellAttackBonus,
  })

  const source = {
    kind: 'subclass' as const,
    labelRu: VESTIGE_PATRON_NAME_RU,
    classEntryId: host.classEntryId,
    subclassSlug: host.subclassSlug,
    feature: VESTIGE_COMPANION_FEATURE_ID,
  }

  const existing = input.companions.find((row) => isVestigeCompanionRow(row, host.classEntryId))
  const divine = divinePowerResource2024(host.level)
  const resources = existing
    ? mergeCompanionResources(existing.resources, [divine])
    : [divine]
  const cunningNote =
    host.level >= 6
      ? ' Мощь предтечи: «Божественная сила» также восстанавливается коротким отдыхом и «Магической искусностью».'
      : ''

  const built = createCompanion({
    id: existing?.id,
    kind: 'ally',
    role: 'ally',
    name: existing?.name?.trim() ? existing.name : VESTIGE_COMPANION_NAME_RU,
    nature: 'summoned',
    control: 'bonus_action_command',
    initiativeMode: 'with_master',
    commandCost: 'bonus',
    active: existing ? existing.active || (existing.stats.hp ?? 1) > 0 : true,
    source,
    stats: {
      hp: existing?.stats.hp != null && existing.stats.hp > 0 ? existing.stats.hp : stats.hp,
      hp_max: stats.hp,
      ac: stats.ac,
      speed: 5,
      speed_fly: stats.speedFly,
      resistances: stats.resistanceRu,
      immunities: 'Испуганный, Опрокинутый, Очарованный',
    },
    resources,
    actions: stats.actionsRu,
    notes: `${stats.notesRu} Скорость: ${stats.speed}.${cunningNote}`,
  })

  const others = input.companions.filter((row) => row.id !== existing?.id)
  const duplicate = others.filter((row) => isVestigeCompanionRow(row, host.classEntryId))
  const withoutDupes = others.filter((row) => !duplicate.includes(row))
  const next = [...withoutDupes, built]
  const changed =
    !existing ||
    duplicate.length > 0 ||
    existing.stats.ac !== built.stats.ac ||
    existing.stats.hp_max !== built.stats.hp_max ||
    existing.actions !== built.actions ||
    existing.notes !== built.notes ||
    existing.resources.length !== built.resources.length ||
    existing.resources.some(
      (res, i) =>
        res.id !== built.resources[i]?.id ||
        res.max !== built.resources[i]?.max ||
        res.reset !== built.resources[i]?.reset,
    )

  return { companions: next, changed }
}
