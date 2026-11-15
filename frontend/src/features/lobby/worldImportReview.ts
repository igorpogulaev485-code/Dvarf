/**
 * W-API-11: чистая логика фильтров сверки, группировки книг и статуса для узкого экрана.
 * Без DOM / React — selfcheck рядом.
 */

import type {
  WorldImportDiffEntry,
  WorldImportDiffStatus,
  WorldImportDraftItem,
  WorldImportDraftLink,
  WorldImportJob,
} from '../../shared/api/worldImports'

export type WorldImportReviewFilter =
  | 'all'
  | 'conflict'
  | 'ai_suggestion'
  | 'missing_in_source'
  | 'new'
  | 'update'
  | 'character'
  | 'book'

export type WorldImportReviewGroupKind = 'book' | 'character' | 'type'

export type WorldImportReviewGroup = {
  id: string
  kind: WorldImportReviewGroupKind
  title: string
  collapsedByDefault: boolean
  entries: WorldImportDiffEntry[]
}

export const REVIEW_FILTER_LABELS: Record<WorldImportReviewFilter, string> = {
  all: 'Все',
  conflict: 'Конфликты',
  ai_suggestion: 'Предложения ИИ',
  missing_in_source: 'Нет в источнике',
  new: 'Новые',
  update: 'Обновления',
  character: 'Персонажи',
  book: 'Книги',
}

export const DIFF_STATUS_LABELS: Record<WorldImportDiffStatus, string> = {
  new: 'новое',
  update: 'обновление',
  unchanged: 'без изменений',
  conflict: 'конфликт',
  missing_in_source: 'нет в источнике',
  ai_suggestion: 'предложение ИИ',
  error: 'ошибка',
}

const BOOK_TYPES = new Set(['player_book', 'book', 'player_book_chapter', 'book_chapter'])
const CHARACTER_TYPES = new Set(['party_character', 'character', 'pc'])

export function isBookEntry(entry: WorldImportDiffEntry): boolean {
  if (BOOK_TYPES.has(entry.item_type)) return true
  return (
    entry.source_key.includes('/player-books/') ||
    entry.source_key.includes('/books/') ||
    entry.item_type.includes('book')
  )
}

export function isCharacterEntry(entry: WorldImportDiffEntry): boolean {
  if (CHARACTER_TYPES.has(entry.item_type)) return true
  return (
    entry.source_key.includes('/party/characters/') ||
    entry.item_type.includes('character')
  )
}

export function filterDiffEntries(
  entries: WorldImportDiffEntry[],
  filter: WorldImportReviewFilter,
): WorldImportDiffEntry[] {
  if (filter === 'all') return entries.slice()
  if (filter === 'character') return entries.filter(isCharacterEntry)
  if (filter === 'book') return entries.filter(isBookEntry)
  return entries.filter((e) => e.status === filter)
}

function bookPackId(entry: WorldImportDiffEntry): string {
  const parts = entry.source_key.split('/')
  const booksIdx = parts.findIndex((p) => p === 'player-books' || p === 'books')
  if (booksIdx >= 0 && parts[booksIdx + 1]) {
    return `book:${parts.slice(0, booksIdx + 2).join('/')}`
  }
  return `book:${entry.item_type}`
}

function bookPackTitle(entry: WorldImportDiffEntry): string {
  const parts = entry.source_key.split('/')
  const booksIdx = parts.findIndex((p) => p === 'player-books' || p === 'books')
  if (booksIdx >= 0 && parts[booksIdx + 1]) {
    return `Книга: ${parts[booksIdx + 1]}`
  }
  return 'Книги для игроков'
}

/**
 * Книги — свёрнутые пачки; персонажи — отдельная группа; остальное по типу.
 */
export function groupReviewEntries(entries: WorldImportDiffEntry[]): WorldImportReviewGroup[] {
  const books: WorldImportDiffEntry[] = []
  const characters: WorldImportDiffEntry[] = []
  const rest: WorldImportDiffEntry[] = []

  for (const entry of entries) {
    if (isCharacterEntry(entry)) characters.push(entry)
    else if (isBookEntry(entry)) books.push(entry)
    else rest.push(entry)
  }

  const groups: WorldImportReviewGroup[] = []

  if (characters.length > 0) {
    groups.push({
      id: 'characters',
      kind: 'character',
      title: `Персонажи партии (${characters.length})`,
      collapsedByDefault: false,
      entries: characters,
    })
  }

  const bookBuckets = new Map<string, WorldImportDiffEntry[]>()
  for (const entry of books) {
    const id = bookPackId(entry)
    const list = bookBuckets.get(id) ?? []
    list.push(entry)
    bookBuckets.set(id, list)
  }
  for (const [id, list] of bookBuckets) {
    groups.push({
      id,
      kind: 'book',
      title: `${bookPackTitle(list[0]!)} (${list.length})`,
      collapsedByDefault: true,
      entries: list,
    })
  }

  const byType = new Map<string, WorldImportDiffEntry[]>()
  for (const entry of rest) {
    const key = entry.item_type || 'other'
    const list = byType.get(key) ?? []
    list.push(entry)
    byType.set(key, list)
  }
  for (const [type, list] of byType) {
    groups.push({
      id: `type:${type}`,
      kind: 'type',
      title: `${typeLabel(type)} (${list.length})`,
      collapsedByDefault: false,
      entries: list,
    })
  }

  return groups
}

export function typeLabel(itemType: string): string {
  const map: Record<string, string> = {
    location: 'Локации',
    npc: 'НПС',
    faction: 'Фракции',
    quest: 'Квесты',
    lore: 'Лор',
    session: 'Сессии',
    note: 'Заметки',
    setting_creature: 'Существа сеттинга',
    setting_item: 'Предметы сеттинга',
    artifact: 'Артефакты',
    artifact_set: 'Сеты артефактов',
    ai_suggestion: 'Предложения ИИ',
    party_character: 'Персонажи партии',
    player_book: 'Книги',
    player_book_chapter: 'Главы книг',
  }
  return map[itemType] ?? itemType
}

/** Короткая подпись статуса задания для узкого экрана. */
export function jobStatusBanner(job: WorldImportJob | null | undefined): {
  tone: 'default' | 'muted' | 'warn' | 'success' | 'danger'
  text: string
} {
  if (!job) {
    return { tone: 'muted', text: 'Заливки ещё не было' }
  }
  switch (job.status) {
    case 'ready_for_review':
      return { tone: 'warn', text: 'Заливка ждёт сверки' }
    case 'confirmed':
      return { tone: 'success', text: 'Подтверждено' }
    case 'parsing':
    case 'received':
      return { tone: 'muted', text: 'Идёт разбор…' }
    case 'cancelled':
      return { tone: 'muted', text: 'Заливка отменена' }
    case 'failed':
      return { tone: 'danger', text: 'Разбор не удался' }
    default:
      return { tone: 'muted', text: `Статус: ${job.status}` }
  }
}

export function actorKindLabel(kind: string): string {
  if (kind === 'ai_token') return 'ИИ (токен)'
  if (kind === 'user') return 'Мастер'
  return kind
}

export function officeHolderLabel(status: string | null | undefined): string {
  if (status === 'current') return 'текущий'
  if (status === 'former' || status === 'past') return 'бывший'
  return status || '—'
}

/** Пустые поля листа персонажа из proposal — показать мастеру. */
export function emptyCharacterSheetFields(
  item: WorldImportDraftItem | null | undefined,
): string[] {
  if (!item) return []
  const prop = item.proposal || {}
  const sheet =
    (prop.sheet as Record<string, unknown> | undefined) ||
    (prop.character_sheet as Record<string, unknown> | undefined) ||
    {}
  const labels: Record<string, string> = {
    name: 'Имя',
    class_name: 'Класс',
    race_name: 'Раса',
    level: 'Уровень',
    background: 'Предыстория',
    alignment: 'Мировоззрение',
  }
  const empty: string[] = []
  for (const [key, label] of Object.entries(labels)) {
    const v = sheet[key] ?? prop[key]
    if (v == null || String(v).trim() === '') empty.push(label)
  }
  const deferred = prop.deferred_homebrew
  if (Array.isArray(deferred) && deferred.length > 0) {
    empty.push(`Отложено до хоумбрю: ${deferred.map(String).join(', ')}`)
  }
  return empty
}

export function linksForSourceKey(
  links: WorldImportDraftLink[],
  sourceKey: string,
): WorldImportDraftLink[] {
  return links.filter(
    (l) => l.from_source_key === sourceKey || l.to_source_key === sourceKey,
  )
}

export function formatQuotaMb(usedBytes: number, limitBytes: number): string {
  const used = usedBytes / (1024 * 1024)
  const limit = limitBytes / (1024 * 1024)
  const fmt = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')
  return `${fmt(used)} из ${fmt(limit)} МБ`
}
