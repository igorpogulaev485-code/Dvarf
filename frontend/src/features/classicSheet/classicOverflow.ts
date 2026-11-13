import type { SheetSpell } from '../characters/spells'
import type { CompanionEntry } from '../characters/companions'
import { CLASSIC_COMPANION_SLOTS } from './classicCompanions'
import { CLASSIC_NOTES_PER_PAGE } from './classicNotes'
import { SPELL_LINE_COUNTS, spellsAtLevel } from './classicSpells'

/**
 * First page uses official line counts; overflow goes to continuation pages.
 * With pencil blanks, first page is padded to official count.
 */
export function spellLinesForPage(
  known: SheetSpell[],
  level: number,
  pageIndex: number,
  pencilBlanks: boolean,
): Array<SheetSpell | null> {
  const atLevel = spellsAtLevel(known, level)
  const firstCount = SPELL_LINE_COUNTS[level] ?? 9
  if (pageIndex === 0) {
    const rows: Array<SheetSpell | null> = atLevel.slice(0, firstCount)
    if (pencilBlanks || atLevel.length <= firstCount) {
      while (rows.length < firstCount) rows.push(null)
    }
    return rows
  }
  const start = firstCount + (pageIndex - 1) * firstCount
  const slice = atLevel.slice(start, start + firstCount)
  if (slice.length === 0) return []
  if (pencilBlanks) {
    const rows: Array<SheetSpell | null> = [...slice]
    while (rows.length < firstCount) rows.push(null)
    return rows
  }
  return slice
}

/** How many spell continuation pages (excluding the official first page). */
export function spellOverflowPageCount(known: SheetSpell[], levels: number[]): number {
  let max = 0
  for (const level of levels) {
    const atLevel = spellsAtLevel(known, level)
    const first = SPELL_LINE_COUNTS[level] ?? 9
    if (atLevel.length <= first) continue
    const extra = Math.ceil((atLevel.length - first) / first)
    if (extra > max) max = extra
  }
  return max
}

export function chunkCompanionPages(
  companions: CompanionEntry[],
  pencilBlanks: boolean,
): Array<Array<CompanionEntry | null>> {
  if (companions.length === 0) {
    if (!pencilBlanks) return []
    return [Array.from({ length: CLASSIC_COMPANION_SLOTS }, () => null)]
  }
  const pages: Array<Array<CompanionEntry | null>> = []
  for (let i = 0; i < companions.length; i += CLASSIC_COMPANION_SLOTS) {
    const slice = companions.slice(i, i + CLASSIC_COMPANION_SLOTS)
    const rows: Array<CompanionEntry | null> = [...slice]
    const isLast = i + CLASSIC_COMPANION_SLOTS >= companions.length
    if (pencilBlanks || (!isLast && rows.length < CLASSIC_COMPANION_SLOTS)) {
      while (rows.length < CLASSIC_COMPANION_SLOTS) rows.push(null)
    } else if (isLast && pencilBlanks) {
      while (rows.length < CLASSIC_COMPANION_SLOTS) rows.push(null)
    }
    pages.push(rows)
  }
  return pages
}

/** Extra empty note pages from print settings (+ optional pencil spare). */
export function buildExtraEmptyNotePages(
  existingNoteCount: number,
  extraPages: number,
  pencilBlanks: boolean,
): number {
  const requested = Math.max(0, Math.floor(extraPages))
  if (pencilBlanks) {
    const lastPageFull =
      existingNoteCount > 0 && existingNoteCount % CLASSIC_NOTES_PER_PAGE === 0
    const noNotes = existingNoteCount === 0
    const spare = noNotes || lastPageFull ? 1 : 0
    return Math.max(requested, spare)
  }
  return requested
}

/**
 * Split long plain text into continuation chunks by approximate character budget.
 * Used when autofit at min pt still overflows a fixed print box.
 */
export function chunkOverflowText(text: string, charsPerPage: number): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.length <= charsPerPage) return [trimmed]
  const pages: string[] = []
  let rest = trimmed
  while (rest.length > 0) {
    if (rest.length <= charsPerPage) {
      pages.push(rest)
      break
    }
    let cut = rest.lastIndexOf('\n', charsPerPage)
    if (cut < charsPerPage * 0.4) cut = rest.lastIndexOf(' ', charsPerPage)
    if (cut < charsPerPage * 0.4) cut = charsPerPage
    pages.push(rest.slice(0, cut).trimEnd())
    rest = rest.slice(cut).trimStart()
  }
  return pages
}
