import type { SessionEvent } from '../../shared/api/lobbies'
import { Text } from '../../ui'

export type FeedFilter = 'all' | 'combat' | 'rolls'

type Props = {
  events: SessionEvent[]
  emptyHint?: string
  filter?: FeedFilter
  onFilterChange?: (next: FeedFilter) => void
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

function withDiceMark(title: string, physical: boolean): string {
  if (!physical) return title
  if (title.includes('🎲')) return title
  return `${title} 🎲`
}

export function SessionEventFeed({
  events,
  emptyHint = 'Пока тихо — бросьте куб или дождитесь событий за столом.',
  filter,
  onFilterChange,
}: Props) {
  return (
    <div className="session-event-feed-wrap">
      {onFilterChange && filter ? (
        <div className="session-feed-filters" role="tablist" aria-label="Фильтр ленты">
          {(
            [
              ['all', 'Всё'],
              ['combat', 'Бой'],
              ['rolls', 'Броски'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              className={`session-feed-filter-btn${filter === id ? ' is-on' : ''}`}
              onClick={() => onFilterChange(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {events.length === 0 ? (
        <Text tone="muted">{emptyHint}</Text>
      ) : (
        <ul className="session-event-feed" aria-live="polite">
          {events.map((ev) => {
            const payload = (ev.payload ?? {}) as Record<string, unknown>
            const physical = Boolean(payload.physical_dice)
            const title = withDiceMark(ev.title, physical)
            return (
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
                    {title}
                    {ev.is_master_roll ? (
                      <span className="session-event-feed__badge" title="Бросок мастера">
                        мастер
                      </span>
                    ) : null}
                    {payload.is_hidden ? (
                      <span className="session-event-feed__badge" title="Скрытый бросок">
                        скрыто
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
                    {ev.event_type === 'combat' || payload.combat_journal ? (
                      <span className="session-event-feed__badge" title="Журнал боя">
                        бой
                      </span>
                    ) : null}
                  </Text>
                  {ev.formula || ev.breakdown ? (
                    <Text tone="muted" className="session-event-feed__formula">
                      {[ev.formula, ev.breakdown].filter(Boolean).join(' · ')}
                      {physical ? ' 🎲' : ''}
                    </Text>
                  ) : null}
                </div>
                {ev.total != null ? (
                  <div className="session-event-feed__total" aria-label={`Итого ${ev.total}`}>
                    {ev.total}
                    {physical ? ' 🎲' : ''}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
