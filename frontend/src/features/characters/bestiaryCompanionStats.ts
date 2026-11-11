/**
 * Merge bestiary catalog rows into companion / form stats.
 * Wildfire Spirit: HP always 10 + 5×druidLevel (ttg), never raw catalog average alone.
 */

import type { BestiaryCatalogData } from '../../shared/dnd/bestiaryCatalog'
import type { CompanionEntry } from './companions'
import type { BestiaryFormPick } from './wildShape'

/** TCE / ttg: Wildfire Spirit hit points. */
export function wildfireSpiritHp(druidLevel: number): number {
  const level = Math.max(1, Math.floor(druidLevel) || 1)
  return 10 + 5 * level
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
    actions_text: actions,
  }
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
