import { Link } from 'react-router-dom'
import type { JournalEntry } from '../../shared/api/lobbies'
import { Button, Text } from '../../ui'

type Props = {
  entry: JournalEntry
  isOwner?: boolean
  busy?: boolean
  onDelete?: (id: string) => void
}

function typeLabel(type: string): string {
  if (type === 'chapter') return 'Глава'
  if (type === 'setting_link') return 'Сеттинг'
  if (type === 'image') return 'Картинка'
  if (type === 'session_summary') return 'Итог сессии'
  return 'Пост'
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

export function JournalEntryCard({ entry, isOwner = false, busy = false, onDelete }: Props) {
  return (
    <article className={`journal-entry journal-entry--${entry.entry_type}`}>
      <div className="journal-entry__meta">
        <span className="journal-entry__type">{typeLabel(entry.entry_type)}</span>
        <Text tone="muted" className="journal-entry__date">
          {formatDate(entry.created_at)}
        </Text>
      </div>

      {entry.title ? (
        <Text as="h3" className="journal-entry__title">
          {entry.title}
        </Text>
      ) : null}

      {entry.entry_type === 'setting_link' && entry.setting_id ? (
        <Text>
          <Link to={`/settings/${entry.setting_id}`}>
            {entry.setting_name || 'Открыть сеттинг'}
          </Link>
        </Text>
      ) : null}

      {entry.entry_type === 'session_summary' && entry.from_session_name ? (
        <Text tone="muted" className="journal-entry__session">
          Сессия: {entry.from_session_name}
        </Text>
      ) : null}

      {entry.entry_type === 'image' && entry.image_url ? (
        <a
          className="journal-entry__image-link"
          href={entry.image_url}
          target="_blank"
          rel="noreferrer"
        >
          <img
            className="journal-entry__image"
            src={entry.image_url}
            alt={entry.title || 'Картинка дневника'}
          />
        </a>
      ) : null}

      {entry.body.trim() ? (
        <Text className="journal-entry__body">{entry.body}</Text>
      ) : null}

      {isOwner && onDelete ? (
        <div className="journal-entry__actions">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => onDelete(entry.id)}
          >
            Удалить
          </Button>
        </div>
      ) : null}
    </article>
  )
}
