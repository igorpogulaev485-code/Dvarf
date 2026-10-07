/** Background catalog → picks → applied package (skills/tools/languages). */

export type BackgroundToolPicksDef = {
  count: number
  labelRu: string
  options: string[]
}

export type BackgroundGrantDef = {
  slug: string
  labelRu: string
  summaryRu: string
  featureRu: string
  skills: string[]
  tools: string[]
  toolPicks: BackgroundToolPicksDef | null
  languagePicks: number
  grantedFeatSlug: string | null
}

export type BackgroundGrantPicks = {
  languages: string[]
  tools: string[]
}

export type AppliedBackgroundGrant = {
  slug: string
  nameRu: string
  skills: string[]
  tools: string[]
  languages: string[]
  featureRu: string
  summaryRu: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return uniqueStrings(raw.filter((item): item is string => typeof item === 'string'))
}

export function emptyBackgroundPicks(): BackgroundGrantPicks {
  return { languages: [], tools: [] }
}

export function backgroundNeedsSetup(def: BackgroundGrantDef): boolean {
  return def.languagePicks > 0 || Boolean(def.toolPicks && def.toolPicks.count > 0)
}

export function backgroundGrantDefFromCatalog(input: {
  slug: string
  nameRu: string
  data: Record<string, unknown> | null | undefined
}): BackgroundGrantDef {
  const data = asRecord(input.data)
  const toolPicksRaw = asRecord(data.tool_picks ?? data.toolPicks)
  const toolOptions = parseStringList(toolPicksRaw.options)
  const toolCount = Math.max(0, Math.floor(readNumber(toolPicksRaw.count, 0)))
  const toolPicks =
    toolCount > 0
      ? {
          count: toolCount,
          labelRu:
            readString(toolPicksRaw.label_ru) ??
            readString(toolPicksRaw.labelRu) ??
            'Инструмент',
          options: toolOptions,
        }
      : null

  return {
    slug: input.slug,
    labelRu: input.nameRu,
    summaryRu: readString(data.summary_ru) ?? readString(data.summaryRu) ?? '',
    featureRu: readString(data.feature_ru) ?? readString(data.featureRu) ?? '',
    skills: parseStringList(data.skills),
    tools: parseStringList(data.tools),
    toolPicks,
    languagePicks: Math.max(
      0,
      Math.floor(readNumber(data.language_picks ?? data.languagePicks, 0)),
    ),
    grantedFeatSlug:
      readString(data.granted_feat_slug) ?? readString(data.grantedFeatSlug),
  }
}

export function validateBackgroundPicks(input: {
  def: BackgroundGrantDef
  picks: BackgroundGrantPicks
}): string | null {
  const { def, picks } = input
  if (picks.languages.length !== def.languagePicks) {
    return `Выбери ${def.languagePicks} языка`
  }
  if (def.toolPicks) {
    if (picks.tools.length !== def.toolPicks.count) {
      return `Выбери: ${def.toolPicks.labelRu}`
    }
  }
  return null
}

export function buildAppliedBackgroundGrant(input: {
  def: BackgroundGrantDef
  picks: BackgroundGrantPicks
}): AppliedBackgroundGrant {
  const { def, picks } = input
  return {
    slug: def.slug,
    nameRu: def.labelRu,
    skills: [...def.skills],
    tools: uniqueStrings([...def.tools, ...picks.tools]),
    languages: [...picks.languages],
    featureRu: def.featureRu,
    summaryRu: def.summaryRu,
  }
}

export function readAppliedBackgroundGrant(raw: unknown): AppliedBackgroundGrant | null {
  const row = asRecord(raw)
  const slug = readString(row.slug)
  const nameRu = readString(row.nameRu) ?? readString(row.name_ru)
  if (!slug || !nameRu) return null
  return {
    slug,
    nameRu,
    skills: parseStringList(row.skills),
    tools: parseStringList(row.tools),
    languages: parseStringList(row.languages),
    featureRu: readString(row.featureRu) ?? readString(row.feature_ru) ?? '',
    summaryRu: readString(row.summaryRu) ?? readString(row.summary_ru) ?? '',
  }
}
