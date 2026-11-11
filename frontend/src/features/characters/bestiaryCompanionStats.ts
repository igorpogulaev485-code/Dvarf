/**
 * Merge bestiary catalog rows into companion / form stats.
 * Wildfire Spirit: HP always 5 + 5×druidLevel (TCE), never raw catalog average alone.
 */

import type { BestiaryCatalogData } from '../../shared/dnd/bestiaryCatalog'
import type { CompanionEntry } from './companions'
import type { BestiaryFormPick } from './wildShape'

/** TCE Wildfire Spirit: 5 + five times your druid level (20 → 105, 9 → 50). */
export function wildfireSpiritHp(druidLevel: number): number {
  const level = Math.max(1, Math.floor(druidLevel) || 1)
  return 5 + 5 * level
}

export function bestiaryDataToPick(input: {
  slug: string
  name_ru: string
  catalog_id?: string | null
  data: BestiaryCatalogData
}): BestiaryFormPick {
  const speed = input.data.speed || {}
  const actions = (input.data.actions || [])
    .map((a) => `${a.name_ru}: ${a.text_ru}`)
    .join('\n')
  return {
    slug: input.slug,
    name_ru: input.name_ru,
    catalog_id: input.catalog_id ?? null,
    cr: input.data.cr || '0',
    type: input.data.type,
    ac: input.data.ac,
    hp: input.data.hp_average,
    speed_walk: speed.walk ?? 0,
    speed_swim: speed.swim,
    speed_fly: speed.fly,
    speed_climb: speed.climb,
    str: input.data.abilities?.str,
    dex: input.data.abilities?.dex,
    con: input.data.abilities?.con,
    resistances: joinList(input.data.damage_resistances),
    immunities: joinList(input.data.damage_immunities),
    actions_text: actions,
  }
}

function joinList(values: string[] | undefined): string | undefined {
  const text = (values ?? []).map((row) => row.trim()).filter(Boolean).join(', ')
  return text || undefined
}

/** Overlay catalog pick onto companion stats (optional HP override for scaled spirits). */
export function mergeBestiaryPickIntoCompanion(input: {
  companion: CompanionEntry
  pick: BestiaryFormPick
  /** When set, replaces pick.hp (Wildfire scaling). */
  hpOverride?: number
}): CompanionEntry {
  const hp =
    input.hpOverride != null
      ? Math.max(1, Math.floor(input.hpOverride))
      : input.pick.hp
  return {
    ...input.companion,
    name: input.companion.name.trim() || input.pick.name_ru,
    bestiary_ref: input.pick.catalog_id ?? input.pick.slug,
    bestiary_name_ru: input.pick.name_ru,
    stats: {
      hp,
      hp_max: hp,
      ac: input.pick.ac,
      speed: input.pick.speed_walk,
    },
    actions: input.pick.actions_text || input.companion.actions,
  }
}

/** Tiny familiar defaults when no catalog pick (Find Familiar / Wild Companion). */
export const FAMILIAR_FALLBACK_PICK: BestiaryFormPick = {
  slug: 'owl',
  name_ru: 'Фамильяр',
  cr: '0',
  type: 'beast',
  ac: 11,
  hp: 1,
  speed_walk: 5,
  speed_fly: 60,
  actions_text: 'Не атакует; телепатия; передача касания.',
}
