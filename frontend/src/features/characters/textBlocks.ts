import { asRecord } from './sheetTypes'

export type TextBlock = {
  key: string
  defaultLabel: string
  customLabel: string | null
  isHidden: boolean
  value: string
  isCustom: boolean
  /** Links to `play.resources[].id` — LSS-style pips on a feature/note block. */
  resourceId: string | null
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
      resourceId: null,
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
    resourceId:
      typeof obj.resourceId === 'string' && obj.resourceId.trim()
        ? obj.resourceId.trim()
        : null,
  }
}

function readOrder(sheet: Record<string, unknown>, keys: string[]): string[] {
  const raw = sheet.text_blocks_order
  if (!Array.isArray(raw)) {
    return keys
  }
  const available = new Set(keys)
  const ordered: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string' || !available.has(item)) continue
    ordered.push(item)
    available.delete(item)
  }
  // Append any keys missing from saved order (new defaults / custom notes)
  for (const key of keys) {
    if (available.has(key)) ordered.push(key)
  }
  return ordered
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

  const byKey = new Map<string, TextBlock>()

  for (const item of DEFAULT_TEXT_BLOCKS) {
    byKey.set(
      item.key,
      readBlock(
        item.key,
        item.defaultLabel,
        textBlocks[item.key] ?? legacyFallback[item.key] ?? '',
        false,
      ),
    )
  }

  const known = new Set(DEFAULT_TEXT_BLOCKS.map((item) => item.key))
  for (const [key, raw] of Object.entries(textBlocks)) {
    if (known.has(key)) continue
    byKey.set(key, readBlock(key, 'Заметка', raw, true))
  }

  // Also pick up LSS-style custom notes from legacy text.*
  for (const [key, raw] of Object.entries(legacyText)) {
    if (known.has(key) || textBlocks[key] != null) continue
    if (!key.startsWith('notes')) continue
    byKey.set(key, readBlock(key, 'Заметка', raw, true))
  }

  const order = readOrder(sheet, [...byKey.keys()])
  return order.map((key) => byKey.get(key)!).filter(Boolean)
}

export function textBlocksToSheet(blocks: TextBlock[]): Record<string, unknown> {
  const text_blocks: Record<string, unknown> = {}
  const text_blocks_order = blocks.map((block) => block.key)
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
      resourceId: block.resourceId,
    }
    if (block.key in features_text) features_text[block.key] = block.value
    if (block.key in personality) personality[block.key] = block.value
    if (block.key in notes) notes[block.key] = block.value
  }

  return { text_blocks, text_blocks_order, features_text, personality, notes }
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
    resourceId: null,
  }
}

export function moveTextBlock(
  blocks: TextBlock[],
  key: string,
  direction: 'up' | 'down',
): TextBlock[] {
  const index = blocks.findIndex((item) => item.key === key)
  if (index < 0) return blocks
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= blocks.length) return blocks
  const next = [...blocks]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
