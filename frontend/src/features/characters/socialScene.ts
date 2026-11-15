/**
 * SOC-01 helpers for the «Общение» scene — pure logic for view/filters/physique.
 * Appearance text (`appearance` block) merges into the physique row; it is not a
 * separate list card when physique UI is shown.
 */
import type { PhysiqueFields } from './identity'
import {
  blockHasResource,
  displayLabel,
  type TextBlock,
} from './textBlocks'
import { stripDvarfInternalMarkers } from '../../shared/dnd/backgroundGrants'

export type SocialFilter = 'all' | 'personality' | 'notes' | 'resource' | 'hidden'

export const SOCIAL_FILTERS: Array<{ id: SocialFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'personality', label: 'Личность' },
  { id: 'notes', label: 'Заметки' },
  { id: 'resource', label: 'С ресурсом' },
  { id: 'hidden', label: 'Скрытые' },
]

/** Personality keys shown as cards (appearance merges into physique). */
export const PERSONALITY_CARD_KEYS = new Set([
  'personality',
  'ideals',
  'bonds',
  'flaws',
  'background',
  'quests',
])

export const APPEARANCE_KEY = 'appearance'

const FEATURE_KEYS = new Set(['traits', 'features', 'feats'])

export const PHYSIQUE_FIELDS: Array<{
  key: keyof PhysiqueFields
  label: string
  placeholder: string
}> = [
  { key: 'height', label: 'Рост', placeholder: '4 фута' },
  { key: 'weight', label: 'Вес', placeholder: '160 фунтов' },
  { key: 'age', label: 'Возраст', placeholder: '150' },
  { key: 'eyes', label: 'Глаза', placeholder: 'Зелёные' },
  { key: 'skin', label: 'Кожа', placeholder: 'Светлая' },
  { key: 'hair', label: 'Волосы', placeholder: 'Каштановые' },
]

export function socialBucket(block: TextBlock): 'personality' | 'features' | 'notes' {
  if (block.isCustom) return 'notes'
  if (block.key === APPEARANCE_KEY || PERSONALITY_CARD_KEYS.has(block.key)) {
    return 'personality'
  }
  if (FEATURE_KEYS.has(block.key)) return 'features'
  return 'notes'
}

/** True only for real trimmed values — placeholders are never "filled". */
export function isPhysiqueValueFilled(value: string): boolean {
  return Boolean(value.trim())
}

export function countFilledPhysique(physique: PhysiqueFields): number {
  return PHYSIQUE_FIELDS.filter((row) => isPhysiqueValueFilled(physique[row.key])).length
}

export function filledPhysiquePairs(
  physique: PhysiqueFields,
): Array<{ label: string; value: string }> {
  return PHYSIQUE_FIELDS.flatMap((row) => {
    const value = physique[row.key].trim()
    if (!value) return []
    return [{ label: row.label, value }]
  })
}

export function appearancePlain(block: TextBlock | undefined): string {
  if (!block) return ''
  return stripDvarfInternalMarkers(block.value).replace(/\s+/g, ' ').trim()
}

export function physiqueHasContent(
  physique: PhysiqueFields | undefined,
  appearanceBlock: TextBlock | undefined,
): boolean {
  if (physique && countFilledPhysique(physique) > 0) return true
  return Boolean(appearancePlain(appearanceBlock))
}

export function physiqueGlancePreview(
  physique: PhysiqueFields | undefined,
  appearanceBlock: TextBlock | undefined,
  max = 110,
): string {
  const bits = physique ? filledPhysiquePairs(physique).map((row) => row.value) : []
  const text = appearancePlain(appearanceBlock)
  if (text) bits.push(text)
  if (bits.length === 0) return ''
  const flat = bits.join(' · ')
  if (flat.length <= max) return flat
  return `${flat.slice(0, max - 1)}…`
}

export function blockHasPlayerContent(block: TextBlock): boolean {
  if (blockHasResource(block)) return true
  return Boolean(stripDvarfInternalMarkers(block.value).replace(/\s+/g, ' ').trim())
}

/** Personality cards that stay empty (appearance excluded — lives in physique). */
export function emptyPersonalityBlocks(blocks: TextBlock[]): TextBlock[] {
  return blocks.filter(
    (block) =>
      !block.isHidden &&
      !block.isCustom &&
      PERSONALITY_CARD_KEYS.has(block.key) &&
      !blockHasPlayerContent(block),
  )
}

export function filledPersonalityBlocks(blocks: TextBlock[]): TextBlock[] {
  return blocks.filter(
    (block) =>
      !block.isHidden &&
      !block.isCustom &&
      PERSONALITY_CARD_KEYS.has(block.key) &&
      blockHasPlayerContent(block),
  )
}

export function emptyPersonalityLine(blocks: TextBlock[]): string {
  const labels = emptyPersonalityBlocks(blocks).map((block) => displayLabel(block))
  if (labels.length === 0) return ''
  return `Не заполнено: ${labels.join(' · ')} · заполнить`
}

/** Multi-line glance (2–3 lines) for a filled block — no editor chrome. */
export function blockViewPreview(value: string, maxLines = 3, maxChars = 220): string {
  const flat = stripDvarfInternalMarkers(value).replace(/\r\n/g, '\n').trim()
  if (!flat) return ''
  const lines = flat.split('\n').map((line) => line.trim()).filter(Boolean)
  const clipped = lines.slice(0, maxLines).join('\n')
  if (clipped.length <= maxChars) {
    if (lines.length > maxLines) return `${clipped}…`
    return clipped
  }
  return `${clipped.slice(0, maxChars - 1)}…`
}

export function listBlocksForFilter(
  blocks: TextBlock[],
  filter: SocialFilter,
): TextBlock[] {
  return blocks.filter((block) => {
    // Appearance always merges into physique — never a list card here.
    if (block.key === APPEARANCE_KEY) return false
    if (filter === 'all') {
      return !block.isHidden && socialBucket(block) !== 'features'
    }
    if (filter === 'hidden') return block.isHidden
    if (filter === 'resource') {
      return (
        blockHasResource(block) &&
        !block.isHidden &&
        socialBucket(block) !== 'features'
      )
    }
    if (filter === 'personality') {
      // Empty personality rows are collapsed into the summary line.
      return (
        !block.isHidden &&
        socialBucket(block) === 'personality' &&
        PERSONALITY_CARD_KEYS.has(block.key) &&
        blockHasPlayerContent(block)
      )
    }
    return !block.isHidden && socialBucket(block) === 'notes'
  })
}

export function filterChipVisible(
  filter: SocialFilter,
  blocks: TextBlock[],
  opts: { hasPhysiqueUi: boolean },
): boolean {
  if (filter === 'all') {
    return (
      blocks.some(
        (block) =>
          !block.isHidden &&
          block.key !== APPEARANCE_KEY &&
          socialBucket(block) !== 'features',
      ) ||
      emptyPersonalityBlocks(blocks).length > 0 ||
      opts.hasPhysiqueUi
    )
  }
  if (filter === 'personality') {
    return (
      opts.hasPhysiqueUi ||
      emptyPersonalityBlocks(blocks).length > 0 ||
      filledPersonalityBlocks(blocks).length > 0
    )
  }
  if (filter === 'notes') {
    return blocks.some(
      (block) => !block.isHidden && socialBucket(block) === 'notes',
    )
  }
  if (filter === 'resource') {
    return blocks.some(
      (block) =>
        blockHasResource(block) &&
        !block.isHidden &&
        socialBucket(block) !== 'features',
    )
  }
  // hidden
  return blocks.some((block) => block.isHidden)
}

export function visibleSocialFilters(
  blocks: TextBlock[],
  opts: { hasPhysiqueUi: boolean },
): Array<{ id: SocialFilter; label: string }> {
  return SOCIAL_FILTERS.filter((row) => filterChipVisible(row.id, blocks, opts))
}
