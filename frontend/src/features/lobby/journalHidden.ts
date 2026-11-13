/** Клиентская подсветка скрытых кусков для мастера (сервер маскирует игроку). */

export const HIDDEN_OPEN = '{{скрыто}}'
export const HIDDEN_CLOSE = '{{/скрыто}}'

const HIDDEN_RE = /\{\{скрыто\}\}([\s\S]*?)\{\{\/скрыто\}\}/g

export function wrapSelectionAsHidden(text: string, start: number, end: number): string {
  const a = Math.max(0, Math.min(start, end))
  const b = Math.max(0, Math.max(start, end))
  return `${text.slice(0, a)}${HIDDEN_OPEN}${text.slice(a, b)}${HIDDEN_CLOSE}${text.slice(b)}`
}

export type JournalBodyPart =
  | { kind: 'text'; text: string }
  | { kind: 'hidden'; text: string }

export function segmentJournalBody(body: string): JournalBodyPart[] {
  const parts: JournalBodyPart[] = []
  let last = 0
  const re = new RegExp(HIDDEN_RE.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) != null) {
    if (m.index > last) {
      parts.push({ kind: 'text', text: body.slice(last, m.index) })
    }
    parts.push({ kind: 'hidden', text: m[1] ?? '' })
    last = m.index + m[0].length
  }
  if (last < body.length) {
    parts.push({ kind: 'text', text: body.slice(last) })
  }
  return parts
}
