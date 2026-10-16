import {
  FALLBACK_CONDITIONS,
  type ConditionRef,
} from '../../shared/dnd/conditions'
import {
  clearConcentration,
  readConcentration,
  type ConcentrationState,
} from '../../shared/dnd/concentration'
import { guessResourceAppliesToAllies } from '../../shared/dnd/allyTargets'
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

export type PlayEffect = {
  id: string
  name: string
  source_character_id: string | null
  source_name: string | null
  linked_concentration: boolean
}

export type PlayState = {
  conditions: ConditionRef[]
  effects: PlayEffect[]
  exhaustion: number
  resources: SheetResource[]
  hpTemp: number
  hitDie: HitDie | null
  hitDiceCurrent: number
  isDying: boolean
  deathSuccesses: number
  deathFails: number
  concentration: ConcentrationState | null
}

export type { ConcentrationState }

export function createResource(partial?: Partial<SheetResource>): SheetResource {
  const name = partial?.name ?? ''
  return clampResource({
    id:
      partial?.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `res-${Date.now()}`),
    name,
    max: partial?.max ?? 1,
    used: partial?.used ?? 0,
    reset: partial?.reset ?? 'long',
    applies_to_allies:
      partial?.applies_to_allies ?? guessResourceAppliesToAllies(name),
  })
}

function readEffect(raw: unknown, index: number): PlayEffect | null {
  const row = asRecord(raw)
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  if (!name) return null
  return {
    id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : `fx-${index}`,
    name,
    source_character_id:
      typeof row.source_character_id === 'string' ? row.source_character_id : null,
    source_name: typeof row.source_name === 'string' ? row.source_name.trim() || null : null,
    linked_concentration: Boolean(row.linked_concentration),
  }
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
  const name = typeof row.name === 'string' ? row.name : ''
  const appliesExplicit = row.applies_to_allies
  return clampResource({
    id: typeof row.id === 'string' ? row.id : `res-${index}`,
    name,
    max: readNumber(row.max, 1),
    used: readNumber(row.used, 0),
    reset: readReset(row.reset),
    applies_to_allies:
      typeof appliesExplicit === 'boolean'
        ? appliesExplicit
        : guessResourceAppliesToAllies(name),
    source_item_id: typeof row.source_item_id === 'string' ? row.source_item_id : null,
  })
}

export function readPlay(sheet: Record<string, unknown>, level = 1): PlayState {
  const combat = asRecord(sheet.combat)
  const conditionsRaw = Array.isArray(combat.conditions) ? combat.conditions : []
  const conditions = conditionsRaw
    .map((item, index) => readCondition(item, index))
    .filter((item): item is ConditionRef => item != null)

  const effectsRaw = Array.isArray(combat.effects) ? combat.effects : []
  const effects = effectsRaw
    .map((item, index) => readEffect(item, index))
    .filter((item): item is PlayEffect => item != null)

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

  return {
    conditions,
    effects,
    exhaustion: clampExhaustion(readNumber(combat.exhaustion, 0)),
    resources,
    hpTemp: Math.max(0, Math.floor(readNumber(combat.hp_temp, 0))),
    hitDie: isHitDie(combat.hit_die) ? combat.hit_die : null,
    hitDiceCurrent: clampHitDiceCurrent(
      hitDiceRaw ?? hitDiceMax,
      hitDiceMax,
    ),
    isDying: Boolean(combat.is_dying),
    deathSuccesses: clampDeathMarks(readNumber(combat.death_successes, 0)),
    deathFails: clampDeathMarks(readNumber(combat.death_fails, 0)),
    concentration: readConcentration(combat.concentration),
  }
}

export function playToSheet(play: PlayState): {
  combatPatch: {
    conditions: ConditionRef[]
    effects: PlayEffect[]
    exhaustion: number
    hp_temp: number
    hit_die: HitDie | null
    hp_dice_current: number
    is_dying: boolean
    death_successes: number
    death_fails: number
    concentration: ConcentrationState | null
  }
  resources: SheetResource[]
} {
  return {
    combatPatch: {
      conditions: play.conditions.map((item) => ({
        slug: item.slug,
        name: item.name,
        catalog_id: item.catalog_id,
      })),
      effects: play.effects.map((item) => ({
        id: item.id,
        name: item.name,
        source_character_id: item.source_character_id,
        source_name: item.source_name,
        linked_concentration: item.linked_concentration,
      })),
      exhaustion: clampExhaustion(play.exhaustion),
      hp_temp: Math.max(0, Math.floor(play.hpTemp)),
      hit_die: play.hitDie,
      hp_dice_current: Math.max(0, Math.floor(play.hitDiceCurrent)),
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

export const RESET_LABELS: Record<ResourceReset, string> = {
  short: 'короткий',
  long: 'продолжительный',
  manual: 'вручную',
}
