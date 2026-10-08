import {
  clampConditionLevel,
  resolveConditionName,
  type ConditionRef,
} from '../../shared/dnd/conditions'
import {
  clearConcentration,
  readConcentration,
  type ConcentrationState,
} from '../../shared/dnd/concentration'
import {
  primaryHitDie,
  readHitDicePools,
  totalHitDiceCurrent,
  type ClassHitDicePool,
} from '../../shared/dnd/classHitDice'
import {
  clampDeathMarks,
  clampHitDiceCurrent,
  isHitDie,
  type HitDie,
} from '../../shared/dnd/hitDice'
import {
  clampExhaustion,
  clampResource,
  type ResourceReset,
  type SheetResource,
} from '../../shared/dnd/rest'
import { asRecord, readNullableNumber, readNumber } from './sheetTypes'

export type PlayState = {
  conditions: ConditionRef[]
  exhaustion: number
  resources: SheetResource[]
  hpTemp: number
  /** @deprecated Prefer hitDiceByClass; kept as derived summary for sticky header / legacy. */
  hitDie: HitDie | null
  /** @deprecated Prefer hitDiceByClass totals. */
  hitDiceCurrent: number
  /** Per-class hit-dice pools (PHB multiclass). */
  hitDiceByClass: ClassHitDicePool[]
  isDying: boolean
  deathSuccesses: number
  deathFails: number
  concentration: ConcentrationState | null
}

export type { ConcentrationState }

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
    return {
      slug,
      name: resolveConditionName({ slug }),
      catalog_id: null,
      level: clampConditionLevel(slug, 1),
    }
  }
  const row = asRecord(raw)
  const slug =
    typeof row.slug === 'string' && row.slug.trim()
      ? row.slug.trim()
      : typeof row.name === 'string' && row.name.trim()
        ? row.name.trim()
        : `condition-${index}`
  const nameRaw = typeof row.name === 'string' ? row.name : null
  const levelRaw = readNullableNumber(row.level)
  return {
    slug,
    name: resolveConditionName({ slug, name: nameRaw }),
    catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
    level: clampConditionLevel(slug, levelRaw ?? 1),
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

export function readPlay(sheet: Record<string, unknown>, level = 1): PlayState {
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

  const hitDiceMax = Math.max(1, Math.floor(level))
  const hitDiceRaw = readNullableNumber(combat.hp_dice_current)
  const poolsFromSheet = readHitDicePools(combat.hit_dice_by_class)
  const legacyDie = isHitDie(combat.hit_die) ? combat.hit_die : null
  const legacyCurrent = clampHitDiceCurrent(hitDiceRaw ?? hitDiceMax, hitDiceMax)
  const hitDiceByClass = poolsFromSheet ?? []
  const derivedCurrent =
    hitDiceByClass.length > 0 ? totalHitDiceCurrent(hitDiceByClass) : legacyCurrent
  const derivedDie =
    hitDiceByClass.length > 0 ? primaryHitDie(hitDiceByClass) : legacyDie

  return {
    conditions,
    exhaustion: clampExhaustion(readNumber(combat.exhaustion, 0)),
    resources,
    hpTemp: Math.max(0, Math.floor(readNumber(combat.hp_temp, 0))),
    hitDie: derivedDie,
    hitDiceCurrent: derivedCurrent,
    hitDiceByClass,
    isDying: Boolean(combat.is_dying),
    deathSuccesses: clampDeathMarks(readNumber(combat.death_successes, 0)),
    deathFails: clampDeathMarks(readNumber(combat.death_fails, 0)),
    concentration: readConcentration(combat.concentration),
  }
}

export function playToSheet(play: PlayState): {
  combatPatch: {
    conditions: ConditionRef[]
    exhaustion: number
    hp_temp: number
    hit_die: HitDie | null
    hp_dice_current: number
    hit_dice_by_class: ClassHitDicePool[]
    is_dying: boolean
    death_successes: number
    death_fails: number
    concentration: ConcentrationState | null
  }
  resources: SheetResource[]
} {
  const pools = play.hitDiceByClass ?? []
  const hitDie = pools.length > 0 ? primaryHitDie(pools) : play.hitDie
  const hitDiceCurrent =
    pools.length > 0 ? totalHitDiceCurrent(pools) : Math.max(0, Math.floor(play.hitDiceCurrent))
  return {
    combatPatch: {
      conditions: play.conditions.map((item) => ({
        slug: item.slug,
        name: item.name,
        catalog_id: item.catalog_id,
        level: item.level ?? null,
      })),
      exhaustion: clampExhaustion(play.exhaustion),
      hp_temp: Math.max(0, Math.floor(play.hpTemp)),
      hit_die: hitDie,
      hp_dice_current: hitDiceCurrent,
      hit_dice_by_class: pools,
      is_dying: play.isDying,
      death_successes: clampDeathMarks(play.deathSuccesses),
      death_fails: clampDeathMarks(play.deathFails),
      concentration: play.concentration
        ? {
            spell_id: play.concentration.spell_id,
            name: play.concentration.name,
          }
        : clearConcentration(),
    },
    resources: play.resources.map((item) => clampResource(item)),
  }
}

export function withSyncedHitDiceSummary(play: PlayState): PlayState {
  const pools = play.hitDiceByClass ?? []
  if (pools.length === 0) return play
  return {
    ...play,
    hitDie: primaryHitDie(pools),
    hitDiceCurrent: totalHitDiceCurrent(pools),
    hitDiceByClass: pools,
  }
}

export function emptyHitDiceTotals(level: number): {
  hitDie: HitDie | null
  hitDiceCurrent: number
  hitDiceByClass: ClassHitDicePool[]
} {
  const max = Math.max(0, Math.floor(level))
  return {
    hitDie: null,
    hitDiceCurrent: max,
    hitDiceByClass: [],
  }
}

export const RESET_LABELS: Record<ResourceReset, string> = {
  short: 'короткий',
  long: 'продолжительный',
  manual: 'вручную',
}
