/** Named race trait cards for the abilities panel (catalog.data.trait_cards). */

export type RaceTraitCard = {
  id: string
  nameRu: string
  summaryRu: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function readRaceTraitCards(raw: unknown): RaceTraitCard[] {
  if (!Array.isArray(raw)) return []
  const out: RaceTraitCard[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const row = asRecord(item)
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    const nameRu =
      typeof row.name_ru === 'string'
        ? row.name_ru.trim()
        : typeof row.nameRu === 'string'
          ? row.nameRu.trim()
          : ''
    const summaryRu =
      typeof row.summary_ru === 'string'
        ? row.summary_ru.trim()
        : typeof row.summaryRu === 'string'
          ? row.summaryRu.trim()
          : ''
    if (!id || !nameRu || seen.has(id)) continue
    seen.add(id)
    out.push({ id, nameRu, summaryRu })
  }
  return out
}

/** Fallback cards when ledger has traitsText but no structured trait_cards. */
export function raceTraitCardsFromText(traitsText: string): RaceTraitCard[] {
  const text = traitsText.trim()
  if (!text) return []
  return [
    {
      id: 'race_traits_blob',
      nameRu: 'Черты расы',
      summaryRu: text,
    },
  ]
}
