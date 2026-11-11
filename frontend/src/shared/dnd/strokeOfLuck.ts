/**
 * PHB Rogue 20 Stroke of Luck.
 * Ability check: the d20 is treated as 20 (modifier still applies).
 * Attack: a miss becomes a hit. The sheet does not know AC, so the player
 * marks an attack line after they see a miss.
 */

export type StrokeOfLuckKind = 'check' | 'attack'

const CHECK_RE =
  /^(?<label>.+?):\s*(?<total>-?\d+)\s*\(d20:(?<die>\d+)(?:\/(?<other>\d+))?(?:\s+(?<mode>преим\.|помеха))?\s*(?<mod>[+-]\d+)(?:\s·\s(?<floor>[^)]+))?\)(?<rest>.*)$/

export function strokeOfLuckKind(text: string): StrokeOfLuckKind | null {
  const line = text.trim()
  if (!line || line.includes('· удача')) return null
  if (line.startsWith('Спас ·') || line.startsWith('Спасбросок')) return null
  if (line.includes('· урон')) return 'attack'
  if (line.startsWith('Проверка ·') || line.includes('Проверка')) return 'check'
  // Skill checks are ability checks (PHB): «Атлетика: 7 (d20:3 +4)».
  if (CHECK_RE.test(line) && !line.includes('· урон')) return 'check'
  return null
}

export function applyStrokeOfLuck(text: string): string | null {
  const kind = strokeOfLuckKind(text)
  if (!kind) return null
  const line = text.trim()
  if (kind === 'attack') {
    if (line.includes('критическое попадание')) return null
    return `${line} · попадание (удача)`
  }
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
