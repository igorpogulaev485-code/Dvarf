import { useState } from 'react'
import {
  revealSessionEvent,
  type SessionEvent,
} from '../../shared/api/lobbies'
import { DiceFaces, RevealButton, Text } from '../../ui'

export type FeedFilter = 'all' | 'combat' | 'rolls'

type Props = {
  events: SessionEvent[]
  emptyHint?: string
  filter?: FeedFilter
  onFilterChange?: (next: FeedFilter) => void
  /** Ведущий может раскрывать скрытые броски. */
  canReveal?: boolean
  sessionId?: string | null
  onEventUpdated?: (event: SessionEvent) => void
}

function formatTime(iso: string): string {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return new Date(iso).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone,
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

function localizeFeedCopy(text: string): string {
  return text
    .replace(/\b(\d+)\s*XP\b/g, '$1 опыта')
    .replace(/\bXP\b/g, 'Опыт')
    .replace(/\b1d20\b/gi, '1к20')
    .replace(/\bd20\b/gi, '1к20')
}

function facesFromPayload(payload: Record<string, unknown>) {
  const raw = payload.dice
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const sides = Number(row.sides)
      const value = Number(row.value)
      if (!Number.isFinite(sides) || !Number.isFinite(value)) return null
      const label =
        typeof row.label === 'string' && row.label.trim()
          ? row.label.trim()
          : undefined
      return {
        sides,
        value,
        dropped: Boolean(row.dropped),
        nat:
          row.nat === '20' || row.nat === '1'
            ? (row.nat as '20' | '1')
            : undefined,
        ...(label ? { label } : {}),
      }
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
}

export function SessionEventFeed({
  events,
  emptyHint = 'Пока тихо — бросьте куб или дождитесь событий за столом.',
  filter,
  onFilterChange,
  canReveal = false,
  sessionId = null,
  onEventUpdated,
}: Props) {
  const [revealingId, setRevealingId] = useState<string | null>(null)

  async function onReveal(ev: SessionEvent) {
    if (!sessionId || !canReveal) return
    setRevealingId(ev.id)
    try {
      const next = await revealSessionEvent(sessionId, ev.id)
      onEventUpdated?.(next)
    } catch {
      // коротко — без подробностей сети
    } finally {
      setRevealingId(null)
    }
  }

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
            const stub = Boolean(payload.hidden_stub) || (
              Boolean(payload.master_hidden) &&
              !payload.revealed &&
              ev.total == null
            )
            const title = stub
              ? 'Мастер бросил скрыто'
              : withDiceMark(localizeFeedCopy(ev.title), physical)
            const faces = stub ? [] : facesFromPayload(payload)
            const canRevealThis =
              canReveal &&
              Boolean(payload.master_hidden) &&
              !Boolean(payload.revealed) &&
              !stub
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
                    {ev.is_master_roll && !stub ? (
                      <span className="session-event-feed__badge" title="Бросок мастера">
                        мастер
                      </span>
                    ) : null}
                    {payload.is_hidden ? (
                      <span className="session-event-feed__badge" title="Скрытый бросок">
                        скрыто
                      </span>
                    ) : null}
                    {stub ? (
                      <span className="session-event-feed__badge" title="Скрытый бросок мастера">
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
                  {!stub && (ev.formula || ev.breakdown) ? (
                    <Text tone="muted" className="session-event-feed__formula">
                      {[ev.formula, ev.breakdown]
                        .filter(Boolean)
                        .map((line) => localizeFeedCopy(String(line)))
                        .join(' · ')}
                      {physical ? ' 🎲' : ''}
                    </Text>
                  ) : null}
                  {!stub && faces.length > 0 ? (
                    <DiceFaces
                      className="session-event-feed__faces"
                      faces={faces}
                      modifierTotal={
                        typeof payload.modifier_total === 'number'
                          ? payload.modifier_total
                          : null
                      }
                    />
                  ) : null}
                  {canRevealThis ? (
                    <div style={{ marginTop: 6 }}>
                      <RevealButton
                        busy={revealingId === ev.id}
                        onClick={() => void onReveal(ev)}
                        data-testid="roll-reveal"
                      />
                    </div>
                  ) : null}
                </div>
                {!stub && ev.total != null ? (
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
