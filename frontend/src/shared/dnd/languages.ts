/** Canonical language names (2014). Aliases collapse onto the picker label. */

const LANGUAGE_ALIASES: Record<string, string> = {
  aquan: 'Акван',
  акван: 'Акван',
  водяной: 'Акван',
  'водяной язык': 'Акван',
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

/** «Водяной» / Aquan → «Акван». Other names stay as written. */
export function canonicalLanguageName(name: string): string {
  const normalized = normalizeName(name)
  if (!normalized) return ''
  return LANGUAGE_ALIASES[normalized.toLowerCase()] ?? normalized
}

export function canonicalLanguageList(names: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const name of names) {
    const canonical = canonicalLanguageName(name)
    if (!canonical) continue
    const key = canonical.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(canonical)
  }
  return result
}
