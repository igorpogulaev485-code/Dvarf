import { asRecord } from './sheetTypes'

/** Inline inserts inside a text/note block (LSS-inspired, not a copy). */
export type TextBlockPart =
  | { id: string; kind: 'text'; value: string }
  | { id: string; kind: 'resource'; resourceId: string }
  | { id: string; kind: 'spoiler'; title: string; body: string; open: boolean }
  | { id: string; kind: 'divider'; label: string }

export type TextBlock = {
  key: string
  defaultLabel: string
  customLabel: string | null
  isHidden: boolean
  /**
   * Plain-text summary of text parts — glance preview + legacy
   * features_text / personality / notes mirrors.
   */
  value: string
  isCustom: boolean
  /** First resource part id (compat with older readers). */
  resourceId: string | null
  parts: TextBlockPart[]
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

function newPartId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `part-${crypto.randomUUID()}`
  }
  return `part-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

export function createTextPart(value = ''): TextBlockPart {
  return { id: newPartId(), kind: 'text', value }
}

export function createResourcePart(resourceId: string): TextBlockPart {
  return { id: newPartId(), kind: 'resource', resourceId }
}

export function createSpoilerPart(
  title = 'Спойлер',
  body = '',
  open = false,
): TextBlockPart {
  return { id: newPartId(), kind: 'spoiler', title, body, open }
}

export function createDividerPart(label = ''): TextBlockPart {
  return { id: newPartId(), kind: 'divider', label }
}

export function partsPlainText(parts: TextBlockPart[]): string {
  return parts
    .map((part) => {
      if (part.kind === 'text') return part.value
      if (part.kind === 'spoiler') {
        const title = part.title.trim()
        const body = part.body.trim()
        if (title && body) return `${title}: ${body}`
        return title || body
      }
      return ''
    })
    .filter((chunk) => chunk.trim())
    .join('\n')
}

export function firstResourceId(parts: TextBlockPart[]): string | null {
  for (const part of parts) {
    if (part.kind === 'resource') return part.resourceId
  }
  return null
}

export function listResourceIds(parts: TextBlockPart[]): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    if (part.kind !== 'resource') continue
    if (!part.resourceId || seen.has(part.resourceId)) continue
    seen.add(part.resourceId)
    ids.push(part.resourceId)
  }
  return ids
}

export function blockHasResource(block: TextBlock): boolean {
  return listResourceIds(block.parts).length > 0 || Boolean(block.resourceId)
}

function syncDerived(block: Omit<TextBlock, 'value' | 'resourceId'> & {
  value?: string
  resourceId?: string | null
}): TextBlock {
  return {
    ...block,
    value: partsPlainText(block.parts),
    resourceId: firstResourceId(block.parts),
  }
}

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

function readPart(raw: unknown, index: number): TextBlockPart | null {
  const obj = asRecord(raw)
  const id =
    typeof obj.id === 'string' && obj.id.trim()
      ? obj.id.trim()
      : `part-legacy-${index}`
  const kind = obj.kind
  if (kind === 'text') {
    return {
      id,
      kind: 'text',
      value: typeof obj.value === 'string' ? obj.value : '',
    }
  }
  if (kind === 'resource') {
    const resourceId =
      typeof obj.resourceId === 'string' && obj.resourceId.trim()
        ? obj.resourceId.trim()
        : ''
    if (!resourceId) return null
    return { id, kind: 'resource', resourceId }
  }
  if (kind === 'spoiler') {
    return {
      id,
      kind: 'spoiler',
      title: typeof obj.title === 'string' ? obj.title : 'Спойлер',
      body: typeof obj.body === 'string' ? obj.body : '',
      open: Boolean(obj.open),
    }
  }
  if (kind === 'divider') {
    return {
      id,
      kind: 'divider',
      label: typeof obj.label === 'string' ? obj.label : '',
    }
  }
  return null
}

/** Migrate legacy value + resourceId into parts[]. */
export function migrateLegacyParts(
  value: string,
  resourceId: string | null,
): TextBlockPart[] {
  const parts: TextBlockPart[] = []
  if (resourceId) parts.push(createResourcePart(resourceId))
  parts.push(createTextPart(value))
  return parts
}

function readBlock(
  key: string,
  defaultLabel: string,
  raw: unknown,
  isCustom: boolean,
): TextBlock {
  if (typeof raw === 'string') {
    return syncDerived({
      key,
      defaultLabel,
      customLabel: null,
      isHidden: false,
      isCustom,
      parts: migrateLegacyParts(raw, null),
    })
  }
  const obj = asRecord(raw)
  const value = readStringValue(obj.value !== undefined ? obj.value : obj)
  const resourceId =
    typeof obj.resourceId === 'string' && obj.resourceId.trim()
      ? obj.resourceId.trim()
      : null
  const customLabel =
    typeof obj.customLabel === 'string' && obj.customLabel.trim()
      ? obj.customLabel
      : null
  const isHidden = Boolean(obj.isHidden)

  let parts: TextBlockPart[] = []
  if (Array.isArray(obj.parts)) {
    parts = obj.parts
      .map((item, index) => readPart(item, index))
      .filter((item): item is TextBlockPart => Boolean(item))
  }
  if (parts.length === 0) {
    parts = migrateLegacyParts(value, resourceId)
  } else if (resourceId && !parts.some((p) => p.kind === 'resource')) {
    // Older dual-write: parts without resource, but resourceId set.
    parts = [createResourcePart(resourceId), ...parts]
  }

  return syncDerived({
    key,
    defaultLabel,
    customLabel,
    isHidden,
    isCustom,
    parts,
  })
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
    const synced = syncDerived(block)
    text_blocks[block.key] = {
      customLabel: synced.customLabel,
      isHidden: synced.isHidden,
      value: synced.value,
      resourceId: synced.resourceId,
      parts: synced.parts,
    }
    if (block.key in features_text) features_text[block.key] = synced.value
    if (block.key in personality) personality[block.key] = synced.value
    if (block.key in notes) notes[block.key] = synced.value
  }

  return { text_blocks, text_blocks_order, features_text, personality, notes }
}

export function createCustomTextBlock(existing: TextBlock[]): TextBlock {
  const used = new Set(existing.map((item) => item.key))
  let index = 1
  while (used.has(`notes-${index}`)) index += 1
  return syncDerived({
    key: `notes-${index}`,
    defaultLabel: 'Заметка',
    customLabel: `Заметка ${index}`,
    isHidden: false,
    isCustom: true,
    parts: [createTextPart('')],
  })
}

export function updateBlockParts(
  block: TextBlock,
  parts: TextBlockPart[],
): TextBlock {
  return syncDerived({ ...block, parts })
}

export function patchBlockPart(
  block: TextBlock,
  partId: string,
  patch: Partial<TextBlockPart>,
): TextBlock {
  const parts = block.parts.map((part) => {
    if (part.id !== partId) return part
    if (part.kind === 'text' && (!patch.kind || patch.kind === 'text')) {
      return {
        ...part,
        value:
          typeof (patch as { value?: string }).value === 'string'
            ? (patch as { value: string }).value
            : part.value,
      }
    }
    if (part.kind === 'resource' && (!patch.kind || patch.kind === 'resource')) {
      return {
        ...part,
        resourceId:
          typeof (patch as { resourceId?: string }).resourceId === 'string'
            ? (patch as { resourceId: string }).resourceId
            : part.resourceId,
      }
    }
    if (part.kind === 'spoiler' && (!patch.kind || patch.kind === 'spoiler')) {
      const p = patch as Partial<Extract<TextBlockPart, { kind: 'spoiler' }>>
      return {
        ...part,
        title: typeof p.title === 'string' ? p.title : part.title,
        body: typeof p.body === 'string' ? p.body : part.body,
        open: typeof p.open === 'boolean' ? p.open : part.open,
      }
    }
    if (part.kind === 'divider' && (!patch.kind || patch.kind === 'divider')) {
      return {
        ...part,
        label:
          typeof (patch as { label?: string }).label === 'string'
            ? (patch as { label: string }).label
            : part.label,
      }
    }
    return part
  })
  return syncDerived({ ...block, parts })
}

export function removeBlockPart(block: TextBlock, partId: string): TextBlock {
  const parts = block.parts.filter((part) => part.id !== partId)
  return syncDerived({
    ...block,
    parts: parts.length > 0 ? parts : [createTextPart('')],
  })
}

export function appendBlockPart(
  block: TextBlock,
  part: TextBlockPart,
): TextBlock {
  return syncDerived({ ...block, parts: [...block.parts, part] })
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

/** Insert `fromKey` before `toKey` (ability-rail style drag). */
export function moveTextBlockBefore(
  blocks: TextBlock[],
  fromKey: string,
  toKey: string,
): TextBlock[] {
  if (fromKey === toKey) return blocks
  const from = blocks.find((item) => item.key === fromKey)
  if (!from) return blocks
  const without = blocks.filter((item) => item.key !== fromKey)
  const index = without.findIndex((item) => item.key === toKey)
  if (index < 0) return blocks
  const next = [...without]
  next.splice(index, 0, from)
  return next
}
