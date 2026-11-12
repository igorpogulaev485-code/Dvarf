import { Link } from 'react-router-dom'
import type { JournalEntry, SessionSummary } from '../../shared/api/lobbies'
import { Button, Text } from '../../ui'
import {
  canOpenAtTable,
  resolveOpenSessionForEntry,
  tableHrefForEntry,
} from './journalTableBridge'
import { segmentJournalBody } from './journalHidden'
import { useAuthedMediaUrl } from './useAuthedMediaUrl'

type Props = {
  entry: JournalEntry
  isOwner?: boolean
  busy?: boolean
  /** Открытые/все сессии лобби — для «Открыть за столом» (T5) */
  sessions?: SessionSummary[]
  onDelete?: (id: string) => void
  onPublish?: (id: string) => void
  onUnpublish?: (id: string) => void
  onRevealHidden?: (id: string) => void
}

function typeLabel(type: string): string {
  if (type === 'chapter') return 'Глава'
  if (type === 'setting_link') return 'Вики'
  if (type === 'image') return 'Картинка'
  if (type === 'session_summary') return 'Итог сессии'
  if (type === 'quest_status') return 'Квест'
  return 'Пост'
}

function settingHref(entry: JournalEntry): string {
  if (!entry.setting_id) return '#'
  if (entry.page_id) return `/settings/${entry.setting_id}?page=${entry.page_id}`
  return `/settings/${entry.setting_id}`
}

function settingLabel(entry: JournalEntry): string {
  if (entry.page_title && entry.setting_name) {
    return `${entry.setting_name} · ${entry.page_title}`
  }
  return entry.page_title || entry.setting_name || 'Открыть сеттинг'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function JournalBody({ body, isOwner }: { body: string; isOwner: boolean }) {
  if (!body.trim()) return null
  if (!isOwner) {
    return <Text className="journal-entry__body">{body}</Text>
  }
  const parts = segmentJournalBody(body)
  const hasHidden = parts.some((p) => p.kind === 'hidden')
  if (!hasHidden) {
    return <Text className="journal-entry__body">{body}</Text>
  }
  return (
    <Text className="journal-entry__body">
      {parts.map((part, i) =>
        part.kind === 'hidden' ? (
          <mark key={i} className="journal-entry__hidden">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </Text>
  )
}

export function JournalEntryCard({
  entry,
  isOwner = false,
  busy = false,
  sessions = [],
  onDelete,
  onPublish,
  onUnpublish,
  onRevealHidden,
}: Props) {
  const openSession =
    canOpenAtTable(entry) ? resolveOpenSessionForEntry(entry, sessions) : null
  const tableHref = openSession ? tableHrefForEntry(entry, openSession) : null
  const imageSrc = useAuthedMediaUrl(
    entry.media_preview_url || entry.media_url || entry.image_url,
  )
  const isDraft = Boolean(entry.is_draft)

  return (
    <article
      id={`journal-entry-${entry.id}`}
      className={`journal-entry journal-entry--${entry.entry_type}${isDraft ? ' is-draft' : ''}`}
    >
      <div className="journal-entry__meta">
        <span className="journal-entry__type">{typeLabel(entry.entry_type)}</span>
        {isDraft ? <span className="journal-entry__draft-badge">Черновик</span> : null}
        <Text tone="muted" className="journal-entry__date">
          {formatDate(entry.created_at)}
        </Text>
      </div>

      {entry.title ? (
        <Text as="h3" className="journal-entry__title">
          {entry.title}
        </Text>
      ) : null}

      {entry.chapter_title ? (
        <Text tone="muted" className="journal-entry__session">
          Глава: {entry.chapter_title}
        </Text>
      ) : null}

      {(entry.entry_type === 'setting_link' || entry.entry_type === 'quest_status') &&
      entry.setting_id ? (
        <Text>
          <Link to={settingHref(entry)}>{settingLabel(entry)}</Link>
        </Text>
      ) : null}

      {(entry.entry_type === 'session_summary' || entry.entry_type === 'quest_status') &&
      entry.from_session_name ? (
        <Text tone="muted" className="journal-entry__session">
          Сессия: {entry.from_session_name}
        </Text>
      ) : null}

      {(entry.entry_type === 'image' || entry.media_id) && imageSrc ? (
        <a
          className="journal-entry__image-link"
          href={entry.media_url || entry.image_url || imageSrc}
          target="_blank"
          rel="noreferrer"
        >
          <img
            className="journal-entry__image"
            src={imageSrc}
            alt={entry.title || 'Картинка дневника'}
          />
        </a>
      ) : null}

      <JournalBody body={entry.body} isOwner={isOwner} />

      {tableHref ||
      (isOwner && (onDelete || onPublish || onUnpublish || onRevealHidden)) ? (
        <div className="journal-entry__actions">
          {tableHref ? (
            <Link className="journal-entry__table-link" to={tableHref}>
              Открыть за столом
              {openSession?.name ? ` · ${openSession.name}` : ''}
            </Link>
          ) : null}
          {isOwner && isDraft && onPublish ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => onPublish(entry.id)}
            >
              Опубликовать
            </Button>
          ) : null}
          {isOwner && !isDraft && onUnpublish ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => onUnpublish(entry.id)}
            >
              В черновик
            </Button>
          ) : null}
          {isOwner && entry.has_hidden_segments && onRevealHidden ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => onRevealHidden(entry.id)}
            >
              Раскрыть скрытое
            </Button>
          ) : null}
          {isOwner && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => onDelete(entry.id)}
            >
              Удалить
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
