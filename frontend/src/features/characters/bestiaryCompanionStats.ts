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

/**
 * Compact MM prose («Укус … +4 … 1к8 + 2») into a Combat-parseable line
 * («Укус +4 1к8+2»). Lines without dice/bonus are kept as-is.
 */
export function compactCompanionAttackLine(actionsText: string): string {
  const text = actionsText.trim()
  if (!text) return ''
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const bonus = line.match(/\+(\d+)/)
      const dice = line.match(/(\d+)\s*[dк]\s*(\d+)(?:\s*([+-]\s*\d+))?/i)
      if (!bonus || !dice) return line
      const nameRaw = line.split(/:|Рукопашн|\+/i)[0]?.trim() || 'Атака'
      const shortName = nameRaw.replace(/\s*\(.*$/, '').trim() || 'Атака'
      const flat = dice[3] ? Number(String(dice[3]).replace(/\s+/g, '')) : 0
      const dmg =
        flat === 0
          ? `${dice[1]}к${dice[2]}`
          : `${dice[1]}к${dice[2]}${flat > 0 ? '+' : ''}${flat}`
      return `${shortName} +${bonus[1]} ${dmg}`
    })
    .join('\n')
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
  const rawActions = input.pick.actions_text || input.companion.actions
  const actions = compactCompanionAttackLine(rawActions) || rawActions
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
      speed_fly: input.pick.speed_fly ?? input.companion.stats.speed_fly,
      speed_swim: input.pick.speed_swim ?? input.companion.stats.speed_swim,
      speed_climb: input.pick.speed_climb ?? input.companion.stats.speed_climb,
      str: input.pick.str ?? input.companion.stats.str,
      dex: input.pick.dex ?? input.companion.stats.dex,
      con: input.pick.con ?? input.companion.stats.con,
      resistances: input.pick.resistances ?? input.companion.stats.resistances,
      immunities: input.pick.immunities ?? input.companion.stats.immunities,
    },
    actions,
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
