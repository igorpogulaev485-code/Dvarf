/**
 * B-09: Mythic Odysseys of Theros piety (MOT ch.1–2) + supernatural gifts.
 * Sheet path: sheet.piety. Rewards are kind:'piety' effects / feature casts.
 */

export const PIETY_THRESHOLDS = {
  devotee: 3,
  votary: 10,
  disciple: 25,
  champion: 50,
} as const

export type PietyRank = keyof typeof PIETY_THRESHOLDS

export const PIETY_RANKS: PietyRank[] = [
  'devotee',
  'votary',
  'disciple',
  'champion',
]

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type TherosGodSlug =
  | 'athreos'
  | 'heliod'
  | 'iroas'
  | 'karametra'
  | 'keranos'
  | 'klothys'
  | 'kruphix'
  | 'mogis'
  | 'nylea'
  | 'purphoros'
  | 'thassa'
  | 'pharika'
  | 'phenax'
  | 'erebos'
  | 'ephara'

export type SupernaturalGiftSlug = 'heroic_destiny' | 'oracle'

export type PietyJournalEntry = {
  at: string
  by_user_id: string | null
  by_name: string | null
  delta: number
  comment: string | null
  score_after: number
  reason?: string | null
}

export type PietyState = {
  god: TherosGodSlug | null
  score: number
  journal: PietyJournalEntry[]
  /** Chosen ability for champion (+2 and +2 max). */
  champion_ability: AbilityKey | null
  /** How much + was applied to the base score (0 or 2); reversed when score < 50. */
  champion_applied: number
  gift: SupernaturalGiftSlug | null
}

export type TherosGodDef = {
  slug: TherosGodSlug
  nameRu: string
  nameEn: string
  championAbilities: AbilityKey[]
  championTitleRu: string
}

/** MOT: when you choose a god as a beginning character, piety is 1. */
export const PIETY_STARTING_SCORE = 1

export const THEROS_GODS: TherosGodDef[] = [
  {
    slug: 'athreos',
    nameRu: 'Атрей',
    nameEn: 'Athreos',
    championAbilities: ['int', 'wis'],
    championTitleRu: 'Поборник перехода',
  },
  {
    slug: 'heliod',
    nameRu: 'Гелиод',
    nameEn: 'Heliod',
    championAbilities: ['str', 'wis'],
    championTitleRu: 'Поборник солнца',
  },
  {
    slug: 'iroas',
    nameRu: 'Ирой',
    nameEn: 'Iroas',
    championAbilities: ['str', 'cha'],
    championTitleRu: 'Поборник победы',
  },
  {
    slug: 'karametra',
    nameRu: 'Караметра',
    nameEn: 'Karametra',
    championAbilities: ['con', 'wis'],
    championTitleRu: 'Поборник урожая',
  },
  {
    slug: 'keranos',
    nameRu: 'Керан',
    nameEn: 'Keranos',
    championAbilities: ['int', 'wis'],
    championTitleRu: 'Поборник бури',
  },
  {
    slug: 'klothys',
    nameRu: 'Клотида',
    nameEn: 'Klothys',
    championAbilities: ['str', 'wis'],
    championTitleRu: 'Поборник предназначения',
  },
  {
    slug: 'kruphix',
    nameRu: 'Круфикс',
    nameEn: 'Kruphix',
    championAbilities: ['con', 'int'],
    championTitleRu: 'Поборник горизонтов',
  },
  {
    slug: 'mogis',
    nameRu: 'Могий',
    nameEn: 'Mogis',
    championAbilities: ['str', 'con'],
    championTitleRu: 'Поборник резни',
  },
  {
    slug: 'nylea',
    nameRu: 'Нилея',
    nameEn: 'Nylea',
    championAbilities: ['dex', 'wis'],
    championTitleRu: 'Поборник охоты',
  },
  {
    slug: 'purphoros',
    nameRu: 'Пирфор',
    nameEn: 'Purphoros',
    championAbilities: ['str', 'int'],
    championTitleRu: 'Поборник кузни',
  },
  {
    slug: 'thassa',
    nameRu: 'Тасса',
    nameEn: 'Thassa',
    championAbilities: ['dex', 'int'],
    championTitleRu: 'Поборник моря',
  },
  {
    slug: 'pharika',
    nameRu: 'Фарика',
    nameEn: 'Pharika',
    championAbilities: ['dex', 'wis'],
    championTitleRu: 'Поборник болезни',
  },
  {
    slug: 'phenax',
    nameRu: 'Фенакс',
    nameEn: 'Phenax',
    championAbilities: ['dex', 'cha'],
    championTitleRu: 'Поборник обмана',
  },
  {
    slug: 'erebos',
    nameRu: 'Эреб',
    nameEn: 'Erebos',
    championAbilities: ['con', 'wis'],
    championTitleRu: 'Поборник мёртвых',
  },
  {
    slug: 'ephara',
    nameRu: 'Эфара',
    nameEn: 'Ephara',
    championAbilities: ['int', 'cha'],
    championTitleRu: 'Поборник полиса',
  },
]

const GOD_BY_SLUG = Object.fromEntries(
  THEROS_GODS.map((g) => [g.slug, g]),
) as Record<TherosGodSlug, TherosGodDef>

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.floor(score))
}

export function emptyPiety(): PietyState {
  return {
    god: null,
    score: 0,
    journal: [],
    champion_ability: null,
    champion_applied: 0,
    gift: null,
  }
}

export function isTherosGodSlug(value: unknown): value is TherosGodSlug {
  return typeof value === 'string' && value in GOD_BY_SLUG
}

export function godDef(slug: TherosGodSlug | null | undefined): TherosGodDef | null {
  if (!slug || !isTherosGodSlug(slug)) return null
  return GOD_BY_SLUG[slug]
}

export function readPiety(raw: unknown): PietyState {
  const row = asRecord(raw)
  const god = isTherosGodSlug(row.god) ? row.god : null
  const gift =
    row.gift === 'heroic_destiny' || row.gift === 'oracle' ? row.gift : null
  const champion =
    typeof row.champion_ability === 'string' &&
    ABILITY_KEYS.includes(row.champion_ability as AbilityKey)
      ? (row.champion_ability as AbilityKey)
      : null
  const journalRaw = Array.isArray(row.journal) ? row.journal : []
  const journal: PietyJournalEntry[] = []
  for (const item of journalRaw) {
    const j = asRecord(item)
    const delta =
      typeof j.delta === 'number' && Number.isFinite(j.delta) ? Math.floor(j.delta) : 0
    const scoreAfter =
      typeof j.score_after === 'number' && Number.isFinite(j.score_after)
        ? Math.floor(j.score_after)
        : 0
    journal.push({
      at: typeof j.at === 'string' ? j.at : '',
      by_user_id: typeof j.by_user_id === 'string' ? j.by_user_id : null,
      by_name: typeof j.by_name === 'string' ? j.by_name : null,
      delta,
      comment: typeof j.comment === 'string' ? j.comment : null,
      score_after: scoreAfter,
      reason: typeof j.reason === 'string' ? j.reason : null,
    })
  }
  return {
    god,
    score: clampScore(typeof row.score === 'number' ? row.score : 0),
    journal,
    champion_ability: champion,
    champion_applied:
      typeof row.champion_applied === 'number' && Number.isFinite(row.champion_applied)
        ? Math.max(0, Math.floor(row.champion_applied))
        : 0,
    gift,
  }
}

/** Choose a god: MOT starting piety is 1. */
export function chooseGod(piety: PietyState, god: TherosGodSlug, at?: string): PietyState {
  if (piety.god === god) return piety
  // MOT changing gods: lose old benefits; new piety starts at 1.
  const nextScore = PIETY_STARTING_SCORE
  const entry: PietyJournalEntry = {
    at: at || new Date().toISOString(),
    by_user_id: null,
    by_name: null,
    delta: nextScore - piety.score,
    comment: piety.god
      ? `Смена бога: ${godDef(piety.god)?.nameRu ?? piety.god} → ${godDef(god)?.nameRu ?? god}`
      : `Выбран бог: ${godDef(god)?.nameRu ?? god}`,
    score_after: nextScore,
    reason: piety.god ? 'change_god' : 'choose_god',
  }
  return {
    ...piety,
    god,
    score: nextScore,
    champion_ability: null,
    champion_applied: 0,
    journal: [...piety.journal, entry],
  }
}

/**
 * Player may change god when score is 0, or when changing (MOT → score 1).
 * Safe minimum from pack: if score > 0 and not an explicit change-god flow,
 * block. We allow MOT change (resets to 1).
 */
export function canPlayerSetGod(_piety: PietyState): boolean {
  return true // MOT allows change; score resets to 1
}

export function applyPietyDelta(
  piety: PietyState,
  input: {
    delta: number
    byUserId?: string | null
    byName?: string | null
    comment?: string | null
    at?: string
  },
): PietyState {
  const delta = Math.floor(input.delta)
  if (!delta) return piety
  const score = clampScore(piety.score + delta)
  const entry: PietyJournalEntry = {
    at: input.at || new Date().toISOString(),
    by_user_id: input.byUserId ?? null,
    by_name: input.byName ?? null,
    delta,
    comment: input.comment ?? null,
    score_after: score,
    reason: 'master_award',
  }
  return {
    ...piety,
    score,
    journal: [...piety.journal, entry],
  }
}

export function unlockedRanks(score: number): PietyRank[] {
  const s = clampScore(score)
  return PIETY_RANKS.filter((rank) => s >= PIETY_THRESHOLDS[rank])
}

export function isRankUnlocked(score: number, rank: PietyRank): boolean {
  return clampScore(score) >= PIETY_THRESHOLDS[rank]
}

export function rewardSlug(god: TherosGodSlug, rank: PietyRank): string {
  return `piety_${god}_${rank}`
}

export function oracleRewardSlug(rank: PietyRank): string {
  return `piety_oracle_${rank}`
}

/** Active reward slugs for the sheet (hidden when below threshold, not deleted). */
export function activeRewardSlugs(piety: PietyState): string[] {
  if (piety.gift === 'oracle') {
    return unlockedRanks(piety.score).map(oracleRewardSlug)
  }
  if (!piety.god) return []
  return unlockedRanks(piety.score).map((rank) => rewardSlug(piety.god!, rank))
}

export function championAbilityOptions(piety: PietyState): AbilityKey[] {
  if (piety.gift === 'oracle') return ['int', 'wis']
  const god = godDef(piety.god)
  return god?.championAbilities ?? []
}

/**
 * Sync champion +2 / max+2.
 * When score >= 50 and ability chosen: ensure champion_applied === 2 and bump score.
 * When score < 50: reverse applied bonus.
 */
export function syncPietyChampion<
  T extends {
    piety: PietyState
    abilities: Record<AbilityKey, number>
  },
>(draft: T): T {
  const piety = draft.piety
  const atChampion = isRankUnlocked(piety.score, 'champion')
  const ability = piety.champion_ability
  const options = championAbilityOptions(piety)
  const choiceValid = Boolean(ability && options.includes(ability))

  // Below threshold or no valid pick: reverse any applied +N, keep remembered choice.
  if (!atChampion || !choiceValid) {
    if (piety.champion_applied <= 0) return draft
    const nextAbilities = { ...draft.abilities }
    if (ability) {
      nextAbilities[ability] = Math.max(
        1,
        (nextAbilities[ability] ?? 10) - piety.champion_applied,
      )
    }
    return {
      ...draft,
      abilities: nextAbilities,
      piety: { ...piety, champion_applied: 0 },
    }
  }

  if (piety.champion_applied === 2) return draft
  const nextAbilities = { ...draft.abilities }
  const add = 2 - piety.champion_applied
  nextAbilities[ability!] = Math.min(30, (nextAbilities[ability!] ?? 10) + add)
  return {
    ...draft,
    abilities: nextAbilities,
    piety: { ...piety, champion_applied: 2 },
  }
}

export function setChampionAbility(
  piety: PietyState,
  ability: AbilityKey | null,
): PietyState {
  const options = championAbilityOptions(piety)
  if (ability && !options.includes(ability)) return piety
  if (piety.champion_ability === ability) return piety
  // Changing pick while applied requires re-sync by caller (reverse then apply).
  return {
    ...piety,
    champion_ability: ability,
    champion_applied: 0,
  }
}

/**
 * Absolute max for the chosen champion ability while rank is unlocked.
 * Base PHB 20 + 2 = 22 (MOT: increase score by 2 and max by 2).
 */
export function pietyAbilityMaxes(
  piety: PietyState,
): Partial<Record<AbilityKey, number>> {
  if (!isRankUnlocked(piety.score, 'champion')) return {}
  const ability = piety.champion_ability
  if (!ability) return {}
  const options = championAbilityOptions(piety)
  if (!options.includes(ability)) return {}
  return { [ability]: 22 }
}

export function setSupernaturalGift(
  piety: PietyState,
  gift: SupernaturalGiftSlug | null,
): PietyState {
  if (piety.gift === gift) return piety
  return {
    ...piety,
    gift,
    champion_ability: null,
    champion_applied: 0,
  }
}

export function rankLabelRu(rank: PietyRank, god: TherosGodSlug | null, gift: SupernaturalGiftSlug | null): string {
  if (gift === 'oracle') {
    const oracle: Record<PietyRank, string> = {
      devotee: 'Авгур',
      votary: 'Провидец',
      disciple: 'Сивилла',
      champion: 'Божественный оракул',
    }
    return oracle[rank]
  }
  const g = godDef(god)
  const rankRu: Record<PietyRank, string> = {
    devotee: 'Послушник',
    votary: 'Служитель',
    disciple: 'Последователь',
    champion: g?.championTitleRu ?? 'Поборник',
  }
  if (rank === 'champion') return rankRu.champion
  return g ? `${rankRu[rank]} ${g.nameRu}` : rankRu[rank]
}
