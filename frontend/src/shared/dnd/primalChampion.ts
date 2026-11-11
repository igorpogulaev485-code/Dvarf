/**
 * PHB 2014 Barbarian 20, Primal Champion: Strength and Constitution increase
 * by 4. Their maximum becomes 24 (other abilities stay at 20).
 * Applied once per class row. Scores already above 20 are left alone so a
 * manual workaround is not stacked again.
 */

export type PrimalChampionGrant = {
  classEntryId: string
  str: number
  con: number
}

type ClassRow = {
  id: string
  name: string
  catalog_id: string | null
  level: number
}

type ChampionDraft = {
  classes: ClassRow[]
  abilities: { str: number; con: number }
  primalChampion: PrimalChampionGrant | null
}

function clampScore(score: number, max: number): number {
  const ceiling = Math.max(1, Math.min(30, Math.floor(max)))
  if (!Number.isFinite(score)) return 10
  return Math.max(1, Math.min(ceiling, Math.floor(score)))
}

export function readPrimalChampion(raw: unknown): PrimalChampionGrant | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.classEntryId !== 'string' || !row.classEntryId) return null
  const str = typeof row.str === 'number' && Number.isFinite(row.str) ? Math.floor(row.str) : 0
  const con = typeof row.con === 'number' && Number.isFinite(row.con) ? Math.floor(row.con) : 0
  return { classEntryId: row.classEntryId, str, con }
}

export function isPrimalChampionClass(cls: ClassRow): boolean {
  if (Math.floor(cls.level) < 20) return false
  const hay = `${cls.name} ${cls.catalog_id ?? ''}`.toLowerCase()
  return hay.includes('варвар') || hay.includes('barbarian')
}

export function syncPrimalChampion<T extends ChampionDraft>(
  draft: T,
  maxes: { str: number; con: number },
): T {
  const barb = draft.classes.find(isPrimalChampionClass) ?? null
  const grant = draft.primalChampion

  if (!barb) {
    if (!grant || (grant.str === 0 && grant.con === 0)) {
      if (!grant) return draft
      return { ...draft, primalChampion: null }
    }
    return {
      ...draft,
      abilities: {
        ...draft.abilities,
        str: clampScore(draft.abilities.str - grant.str, maxes.str),
        con: clampScore(draft.abilities.con - grant.con, maxes.con),
      },
      primalChampion: null,
    }
  }

  if (grant?.classEntryId === barb.id) return draft

  let str = draft.abilities.str
  let con = draft.abilities.con
  if (grant && (grant.str !== 0 || grant.con !== 0)) {
    str = clampScore(str - grant.str, 30)
    con = clampScore(con - grant.con, 30)
  }
  const strAdd = str <= 20 ? 4 : 0
  const conAdd = con <= 20 ? 4 : 0
  const nextStr = clampScore(str + strAdd, maxes.str)
  const nextCon = clampScore(con + conAdd, maxes.con)
  return {
    ...draft,
    abilities: { ...draft.abilities, str: nextStr, con: nextCon },
    primalChampion: {
      classEntryId: barb.id,
      str: nextStr - str,
      con: nextCon - con,
    },
  }
}
