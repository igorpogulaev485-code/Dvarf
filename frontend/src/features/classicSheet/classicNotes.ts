import type { CharacterDetail } from '../../shared/api/characters'
import {
  blockTextPartsPlain,
  createCustomTextBlock,
  displayLabel,
  readTextBlocks,
  withBlockPlainText,
  type TextBlock,
} from '../characters/textBlocks'
import { asRecord } from '../characters/sheetTypes'
import { mergeClassicTextBlocks, type ClassicPatch } from './fromApi'

/** How many note cards to aim for on one Letter page. */
export const CLASSIC_NOTES_PER_PAGE = 6

function isCustomNoteKey(key: string): boolean {
  return /^notes-\d+$/.test(key)
}

/** Visible custom notes from the interactive sheet (`notes-N`). */
export function listClassicNotes(character: CharacterDetail): TextBlock[] {
  return readTextBlocks(asRecord(character.sheet)).filter(
    (block) => isCustomNoteKey(block.key) && !block.isHidden,
  )
}

export function classicNoteLabel(block: TextBlock): string {
  return displayLabel(block)
}

/** Editable plain text — text parts only, so spoilers/resources stay intact. */
export function classicNoteText(block: TextBlock): string {
  return blockTextPartsPlain(block)
}

/** Same as interactive «Добавить блок» — creates `notes-N`. */
export function addClassicNote(character: CharacterDetail): ClassicPatch {
  const blocks = readTextBlocks(asRecord(character.sheet))
  const created = createCustomTextBlock(blocks)
  return mergeClassicTextBlocks(character, [...blocks, created])
}

export function setClassicNoteText(
  character: CharacterDetail,
  key: string,
  plain: string,
): ClassicPatch {
  const blocks = readTextBlocks(asRecord(character.sheet))
  const index = blocks.findIndex((block) => block.key === key)
  if (index < 0) return {}
  const next = [...blocks]
  next[index] = withBlockPlainText(next[index], plain)
  return mergeClassicTextBlocks(character, next)
}

export function setClassicNoteLabel(
  character: CharacterDetail,
  key: string,
  label: string,
): ClassicPatch {
  const blocks = readTextBlocks(asRecord(character.sheet))
  const index = blocks.findIndex((block) => block.key === key)
  if (index < 0) return {}
  const next = [...blocks]
  const trimmed = label.trim()
  next[index] = {
    ...next[index],
    customLabel: trimmed || next[index].customLabel,
  }
  return mergeClassicTextBlocks(character, next)
}

export function chunkClassicNotePages(notes: TextBlock[]): TextBlock[][] {
  if (notes.length === 0) return []
  const pages: TextBlock[][] = []
  for (let i = 0; i < notes.length; i += CLASSIC_NOTES_PER_PAGE) {
    pages.push(notes.slice(i, i + CLASSIC_NOTES_PER_PAGE))
  }
  return pages
}

/** First N slots for a Letter notes grid (null = empty card). */
export function paddedClassicNoteSlots(
  notes: TextBlock[],
  slots = CLASSIC_NOTES_PER_PAGE,
): Array<TextBlock | null> {
  const rows: Array<TextBlock | null> = notes.slice(0, slots)
  while (rows.length < slots) rows.push(null)
  return rows
}
