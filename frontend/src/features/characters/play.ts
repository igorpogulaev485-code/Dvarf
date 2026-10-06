import {
  FALLBACK_CONDITIONS,
  type ConditionRef,
} from '../../shared/dnd/conditions'
import {
  clampExhaustion,
  clampResource,
  type ResourceReset,
  type SheetResource,
} from '../../shared/dnd/rest'
import { asRecord, readNumber } from './sheetTypes'

export type PlayState = {
  conditions: ConditionRef[]
  exhaustion: number
  resources: SheetResource[]
}

export function createResource(partial?: Partial<SheetResource>): SheetResource {
  return clampResource({
    id:
      partial?.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `res-${Date.now()}`),
    name: partial?.name ?? '',
    max: partial?.max ?? 1,
    used: partial?.used ?? 0,
    reset: partial?.reset ?? 'long',
  })
}

function readCondition(raw: unknown, index: number): ConditionRef | null {
  if (typeof raw === 'string' && raw.trim()) {
    const slug = raw.trim()
    const fallback = FALLBACK_CONDITIONS.find((item) => item.slug === slug)
    return {
      slug,
      name: fallback?.name_ru ?? slug,
      catalog_id: null,
    }
  }
  const row = asRecord(raw)
  const slug =
    typeof row.slug === 'string' && row.slug.trim()
      ? row.slug.trim()
      : typeof row.name === 'string' && row.name.trim()
        ? row.name.trim()
        : `condition-${index}`
  const name =
    typeof row.name === 'string' && row.name.trim()
      ? row.name.trim()
      : FALLBACK_CONDITIONS.find((item) => item.slug === slug)?.name_ru ?? slug
  return {
    slug,
    name,
    catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
  }
}

function readReset(value: unknown): ResourceReset {
  if (value === 'short' || value === 'long' || value === 'manual') return value
  return 'long'
}

function readResource(raw: unknown, index: number): SheetResource {
  const row = asRecord(raw)
  return clampResource({
    id: typeof row.id === 'string' ? row.id : `res-${index}`,
    name: typeof row.name === 'string' ? row.name : '',
    max: readNumber(row.max, 1),
    used: readNumber(row.used, 0),
    reset: readReset(row.reset),
  })
}

export function readPlay(sheet: Record<string, unknown>): PlayState {
  const combat = asRecord(sheet.combat)
  const conditionsRaw = Array.isArray(combat.conditions) ? combat.conditions : []
  const conditions = conditionsRaw
    .map((item, index) => readCondition(item, index))
    .filter((item): item is ConditionRef => item != null)

  const resourcesRaw = sheet.resources
  let resources: SheetResource[] = []
  if (Array.isArray(resourcesRaw)) {
    resources = resourcesRaw.map((item, index) => readResource(item, index))
  } else {
    const asObj = asRecord(resourcesRaw)
    resources = Object.entries(asObj).map(([key, value], index) => {
      const row = asRecord(value)
      return readResource(
        {
          id: typeof row.id === 'string' ? row.id : key,
          name: typeof row.name === 'string' ? row.name : key,
          max: row.max,
          used: row.used,
          reset: row.reset,
        },
        index,
      )
    })
  }

  return {
    conditions,
    exhaustion: clampExhaustion(readNumber(combat.exhaustion, 0)),
    resources,
  }
}

export function playToSheet(play: PlayState): {
  combatPatch: { conditions: ConditionRef[]; exhaustion: number }
  resources: SheetResource[]
} {
  return {
    combatPatch: {
      conditions: play.conditions.map((item) => ({
        slug: item.slug,
        name: item.name,
        catalog_id: item.catalog_id,
      })),
      exhaustion: clampExhaustion(play.exhaustion),
    },
    resources: play.resources.map((item) => clampResource(item)),
  }
}

export const RESET_LABELS: Record<ResourceReset, string> = {
  short: 'короткий',
  long: 'длинный',
  manual: 'вручную',
}
