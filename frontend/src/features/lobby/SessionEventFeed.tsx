import type { SessionEvent } from '../../shared/api/lobbies'
import { Text } from '../../ui'

type Props = {
  events: SessionEvent[]
  emptyHint?: string
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}

export function SessionEventFeed({
  events,
  emptyHint = 'Пока тихо — бросьте куб или дождитесь событий за столом.',
}: Props) {
  if (events.length === 0) {
    return <Text tone="muted">{emptyHint}</Text>
  }

  return (
    <ul className="session-event-feed" aria-live="polite">
      {events.map((ev) => (
        <li key={ev.id} className="session-event-feed__item">
          <div className="session-event-feed__head">
            <Text as="span" className="session-event-feed__who">
              {ev.character_name || (ev.is_master_roll ? 'Мастер' : '—')}
            </Text>
            <Text tone="muted" className="session-event-feed__time">
              {formatTime(ev.created_at)}
            </Text>
          </div>
          <div className="session-event-feed__body">
            <Text className="session-event-feed__title">
              {ev.title}
              {ev.is_master_roll ? (
                <span className="session-event-feed__badge" title="Бросок мастера">
                  мастер
                </span>
              ) : null}
              {ev.event_type === 'reveal' ? (
                <span className="session-event-feed__badge" title="Раскрытие сеттинга">
                  мир
                </span>
              ) : null}
              {ev.event_type === 'quest_status' ? (
                <span className="session-event-feed__badge" title="Статус квеста">
                  квест
                </span>
              ) : null}
            </Text>
            {ev.formula || ev.breakdown ? (
              <Text tone="muted" className="session-event-feed__formula">
                {[ev.formula, ev.breakdown].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </div>
          {ev.total != null ? (
            <div className="session-event-feed__total" aria-label={`Итого ${ev.total}`}>
              {ev.total}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
