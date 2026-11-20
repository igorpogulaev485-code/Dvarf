/**
 * Rogue 20 Stroke of Luck.
 * 2014: ability check d20 → 20; attack miss → hit.
 * 2024: any failed D20 Test → the d20 counts as 20 (modifier still applies).
 */

export type StrokeOfLuckKind = 'check' | 'attack' | 'save'

const CHECK_RE =
  /^(?<label>.+?):\s*(?<total>-?\d+)\s*\(d20:(?<die>\d+)(?:\/(?<other>\d+))?(?:\s+(?<mode>преим\.|помеха))?\s*(?<mod>[+-]\d+)(?:\s·\s(?<floor>[^)]+))?\)(?<rest>.*)$/

export function strokeOfLuckKind(text: string): StrokeOfLuckKind | null {
  const line = text.trim()
  if (!line || line.includes('· удача')) return null
  if (line.startsWith('Спас ·') || line.startsWith('Спасбросок') || /^Спас\b/i.test(line)) {
    return 'save'
  }
  if (line.includes('· урон')) return 'attack'
  if (line.startsWith('Проверка ·') || line.includes('Проверка')) return 'check'
  // Skill checks are ability checks (PHB): «Атлетика: 7 (d20:3 +4)».
  if (CHECK_RE.test(line) && !line.includes('· урон')) return 'check'
  return null
}

function applyD20AsTwenty(text: string): string | null {
  const line = text.trim()
  const match = line.match(CHECK_RE)
  if (!match?.groups) return null
  const die = Number(match.groups.die)
  if (die === 20) return null
  const mod = Number(match.groups.mod)
  const total = 20 + mod
  const mode = match.groups.mode ? ` ${match.groups.mode}` : ''
  const other = match.groups.other ? `/${match.groups.other}` : ''
  const was = match.groups.total
  const rest = match.groups.rest ?? ''
  return `${match.groups.label}: ${total} (d20:20${other}${mode} ${match.groups.mod} · удача, было ${was})${rest}`
}

export function applyStrokeOfLuck(
  text: string,
  rulesEdition: string | null | undefined = '2014',
): string | null {
  const kind = strokeOfLuckKind(text)
  if (!kind) return null
  const line = text.trim()
  const is2024 = String(rulesEdition || '') === '2024'

  if (is2024) {
    // 2024: any D20 Test → treat the die as 20 (including attacks and saves).
    if (kind === 'attack') {
      const asTwenty = applyD20AsTwenty(line)
      if (asTwenty) return asTwenty
      // Fallback when attack line shape is not CHECK_RE-compatible.
      if (line.includes('критическое попадание')) return null
      return `${line} · d20=20 (удача)`
    }
    return applyD20AsTwenty(line)
  }

  // 2014: attack miss → hit; check d20 → 20. Saves are not eligible.
  if (kind === 'save') return null
  if (kind === 'attack') {
    if (line.includes('критическое попадание')) return null
    return `${line} · попадание (удача)`
  }
  return applyD20AsTwenty(line)
}
