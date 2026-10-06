import { asRecord } from './sheetTypes'

export type TextBlock = {
  key: string
  defaultLabel: string
  customLabel: string | null
  isHidden: boolean
  value: string
  isCustom: boolean
}

export const DEFAULT_TEXT_BLOCKS: Array<{ key: string; defaultLabel: string }> = [
  { key: 'traits', defaultLabel: 'Умения и особенности' },
  { key: 'features', defaultLabel: 'Классовые умения' },
  { key: 'feats', defaultLabel: 'Черты' },
  { key: 'personality', defaultLabel: 'Черты характера' },
  { key: 'ideals', defaultLabel: 'Идеалы' },
  { key: 'bonds', defaultLabel: 'Привязанности' },
  { key: 'flaws', defaultLabel: 'Слабости' },
  { key: 'appearance', defaultLabel: 'Внешность' },
  { key: 'background', defaultLabel: 'Предыстория' },
  { key: 'quests', defaultLabel: 'Цели и задачи' },
]

function readStringValue(raw: unknown): string {
  if (typeof raw === 'string') return raw
  const obj = asRecord(raw)
  if (typeof obj.value === 'string') return obj.value
  // TipTap/ProseMirror dump — extract plain text lightly
  const doc = asRecord(obj.value).data ?? obj.data
  if (doc && typeof doc === 'object') {
    try {
      return JSON.stringify(doc)
    } catch {
      return ''
    }
  }
  return ''
}

function readBlock(
  key: string,
  defaultLabel: string,
  raw: unknown,
  isCustom: boolean,
): TextBlock {
  if (typeof raw === 'string') {
    return {
      key,
      defaultLabel,
      customLabel: null,
      isHidden: false,
      value: raw,
      isCustom,
    }
  }
  const obj = asRecord(raw)
  return {
    key,
    defaultLabel,
    customLabel: typeof obj.customLabel === 'string' && obj.customLabel.trim()
      ? obj.customLabel
      : null,
    isHidden: Boolean(obj.isHidden),
    value: readStringValue(obj.value !== undefined ? obj.value : obj),
    isCustom,
  }
}

export function displayLabel(block: TextBlock): string {
  return block.customLabel?.trim() || block.defaultLabel
}

export function readTextBlocks(sheet: Record<string, unknown>): TextBlock[] {
  const textBlocks = asRecord(sheet.text_blocks)
  const featuresText = asRecord(sheet.features_text)
  const personality = asRecord(sheet.personality)
  const notes = asRecord(sheet.notes)
  const legacyText = asRecord(sheet.text)

  const legacyFallback: Record<string, unknown> = {
    traits: featuresText.traits ?? legacyText.traits,
    features: featuresText.features ?? legacyText.features,
    feats: featuresText.feats ?? legacyText.feats,
    personality: personality.personality ?? legacyText.personality,
    ideals: personality.ideals ?? legacyText.ideals,
    bonds: personality.bonds ?? legacyText.bonds,
    flaws: personality.flaws ?? legacyText.flaws,
    appearance: notes.appearance ?? legacyText.appearance,
    background: notes.background ?? legacyText.background,
    quests: notes.quests ?? legacyText.quests,
  }

  const blocks = DEFAULT_TEXT_BLOCKS.map((item) =>
    readBlock(
      item.key,
      item.defaultLabel,
      textBlocks[item.key] ?? legacyFallback[item.key] ?? '',
      false,
    ),
  )

  const known = new Set(DEFAULT_TEXT_BLOCKS.map((item) => item.key))
  for (const [key, raw] of Object.entries(textBlocks)) {
    if (known.has(key)) continue
    blocks.push(readBlock(key, 'Заметка', raw, true))
  }

  // Also pick up LSS-style custom notes from legacy text.*
  for (const [key, raw] of Object.entries(legacyText)) {
    if (known.has(key) || textBlocks[key] != null) continue
    if (!key.startsWith('notes')) continue
    blocks.push(readBlock(key, 'Заметка', raw, true))
  }

  return blocks
}

export function textBlocksToSheet(blocks: TextBlock[]): Record<string, unknown> {
  const text_blocks: Record<string, unknown> = {}
  const features_text: Record<string, string> = {
    traits: '',
    features: '',
    feats: '',
  }
  const personality: Record<string, string> = {
    personality: '',
    ideals: '',
    bonds: '',
    flaws: '',
  }
  const notes: Record<string, string> = {
    appearance: '',
    background: '',
    quests: '',
    free: '',
  }

  for (const block of blocks) {
    text_blocks[block.key] = {
      customLabel: block.customLabel,
      isHidden: block.isHidden,
      value: block.value,
    }
    if (block.key in features_text) features_text[block.key] = block.value
    if (block.key in personality) personality[block.key] = block.value
    if (block.key in notes) notes[block.key] = block.value
  }

  return { text_blocks, features_text, personality, notes }
}

export function createCustomTextBlock(existing: TextBlock[]): TextBlock {
  const used = new Set(existing.map((item) => item.key))
  let index = 1
  while (used.has(`notes-${index}`)) index += 1
  return {
    key: `notes-${index}`,
    defaultLabel: 'Заметка',
    customLabel: `Заметка ${index}`,
    isHidden: false,
    value: '',
    isCustom: true,
  }
}
