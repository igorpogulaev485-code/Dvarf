import type { CharacterDetail } from '../../shared/api/characters'
import {
  blockPlainText,
  createCustomTextBlock,
  displayLabel,
  readTextBlocks,
  textBlocksToSheet,
  withBlockPlainText,
  type TextBlock,
} from '../characters/textBlocks'
import { asRecord } from '../characters/sheetTypes'
import { cloneSheet, type ClassicPatch } from './fromApi'

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

export function classicNoteText(block: TextBlock): string {
  return blockPlainText(block)
}

/** Merge full text-block write-back without dropping classic-only note mirrors. */
function mergeTextBlocks(character: CharacterDetail, blocks: TextBlock[]): ClassicPatch {
  const sheet = cloneSheet(asRecord(character.sheet))
  const packed = textBlocksToSheet(blocks)
  const prevNotes = asRecord(sheet.notes)
  const nextNotes = asRecord(packed.notes)

  sheet.text_blocks = packed.text_blocks
  sheet.text_blocks_order = packed.text_blocks_order
  sheet.features_text = {
    ...asRecord(sheet.features_text),
    ...asRecord(packed.features_text),
  }
  sheet.personality = {
    ...asRecord(sheet.personality),
    ...asRecord(packed.personality),
  }
  sheet.notes = {
    ...prevNotes,
    ...nextNotes,
  }
  return { sheet }
}

/** Same as interactive «Добавить блок» — creates `notes-N`. */
export function addClassicNote(character: CharacterDetail): ClassicPatch {
  const blocks = readTextBlocks(asRecord(character.sheet))
  const created = createCustomTextBlock(blocks)
  return mergeTextBlocks(character, [...blocks, created])
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
  return mergeTextBlocks(character, next)
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
  return mergeTextBlocks(character, next)
}

export function chunkClassicNotePages(notes: TextBlock[]): TextBlock[][] {
  if (notes.length === 0) return [[]]
  const pages: TextBlock[][] = []
  for (let i = 0; i < notes.length; i += CLASSIC_NOTES_PER_PAGE) {
    pages.push(notes.slice(i, i + CLASSIC_NOTES_PER_PAGE))
  }
  return pages
}
