/** L-05: task checkboxes `- [ ]` / `- [x]` in note body. */

const TASK_LINE = /^(\s*)[-*]\s+\[([ xX])\](\s+)(.*)$/

export function toggleTaskAtLine(body: string, lineIndex: number): string | null {
  const lines = body.split('\n')
  if (lineIndex < 0 || lineIndex >= lines.length) return null
  const match = TASK_LINE.exec(lines[lineIndex] ?? '')
  if (!match) return null
  const checked = match[2] === 'x' || match[2] === 'X'
  const next = checked ? ' ' : 'x'
  lines[lineIndex] = `${match[1]}- [${next}]${match[3]}${match[4]}`
  return lines.join('\n')
}

export type NoteBodySegment =
  | { type: 'text'; text: string }
  | { type: 'task'; lineIndex: number; checked: boolean; text: string; raw: string }

/** Разбить тело на текст и строки-задачи (для рендера с кликом). */
export function segmentNoteBody(body: string): NoteBodySegment[] {
  const lines = (body || '').split('\n')
  const segments: NoteBodySegment[] = []
  let textBuf: string[] = []

  const flushText = () => {
    if (textBuf.length === 0) return
    segments.push({ type: 'text', text: textBuf.join('\n') })
    textBuf = []
  }

  lines.forEach((line, lineIndex) => {
    const match = TASK_LINE.exec(line)
    if (match) {
      flushText()
      const checked = match[2] === 'x' || match[2] === 'X'
      segments.push({
        type: 'task',
        lineIndex,
        checked,
        text: match[4] ?? '',
        raw: line,
      })
    } else {
      textBuf.push(line)
    }
  })
  flushText()
  return segments
}
