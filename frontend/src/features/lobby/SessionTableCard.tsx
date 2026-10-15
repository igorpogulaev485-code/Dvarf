import { Link } from 'react-router-dom'
import type { SessionSeat } from '../../shared/api/lobbies'
import { Text } from '../../ui'
import {
  normalizeVisibilityProfile,
  type VisibilityProfile,
} from './visibilityProfile'

type Props = {
  seat: SessionSeat
  visibility: VisibilityProfile
  sheetLabel?: string
  /** Мастер / владелец видит полные числа даже если игрокам скрыто */
  revealAll?: boolean
}

function hpTone(current: number | null, max: number | null): 'ok' | 'warn' | 'down' | 'unknown' {
  if (max == null || max <= 0 || current == null) return 'unknown'
  if (current <= 0) return 'down'
  if (current / max <= 0.5) return 'warn'
  return 'ok'
}

function hpColorLabel(current: number | null, max: number | null): string {
  const tone = hpTone(current, max)
  if (tone === 'ok') return 'Здоров'
  if (tone === 'warn') return 'Ранен'
  if (tone === 'down') return 'Без сознания'
  return '—'
}

/** Полная карточка за столом с учётом профиля видимости лобби. */
export function SessionTableCard({
  seat,
  visibility,
  sheetLabel = 'Лист',
  revealAll = false,
}: Props) {
  const profile = normalizeVisibilityProfile(visibility)
  const fields = profile.fields
  const show = (sectionEnabled: boolean, mode: string) =>
    revealAll || (sectionEnabled && mode !== 'off')

  const showName = revealAll || (fields.identity.enabled && fields.identity.name !== 'off')
  const showRaceClass =
    revealAll || (fields.identity.enabled && fields.identity.race_class !== 'off')
  const showHpSection = revealAll || fields.health.enabled
  const hpMode = revealAll ? 'active' : fields.health.hp
  const showAc = show(fields.combat.enabled, fields.combat.ac)
  const showPassives = show(fields.abilities.enabled, fields.abilities.passives)
  const showInspiration = show(fields.resources.enabled, fields.resources.inspiration)

  const tone = hpTone(seat.hp_current, seat.hp_max)
  const initial = (seat.character_name.trim().charAt(0) || '?').toUpperCase()

  return (
    <article className="session-table-card">
      <div className={`session-table-card__hp session-table-card__hp--${tone}`} aria-hidden />
      <div className="session-table-card__body">
        <div className="session-table-card__top">
          {revealAll || (fields.identity.enabled && fields.identity.portrait !== 'off') ? (
            <div className="session-table-card__avatar" aria-hidden>
              {initial}
            </div>
          ) : null}
          <div className="session-table-card__meta">
            {showName ? (
              <Text as="h3" className="session-table-card__name">
                {seat.character_name}
                {showInspiration && seat.inspiration ? (
                  <span className="session-table-card__insp" title="Вдохновение">
                    ★
                  </span>
                ) : null}
              </Text>
            ) : (
              <Text as="h3" className="session-table-card__name">
                Персонаж
              </Text>
            )}
            {showRaceClass ? (
              <Text tone="muted" className="session-table-card__sub">
                ур. {seat.character_level}
                {[seat.character_race_name, seat.character_class_name]
                  .filter(Boolean)
                  .map((part) => ` · ${part}`)
                  .join('')}
              </Text>
            ) : null}
          </div>
        </div>

        {showHpSection && hpMode !== 'off' ? (
          <Text tone="muted" className="session-table-card__stat">
            {hpMode === 'color_only' && !revealAll
              ? `HP · ${hpColorLabel(seat.hp_current, seat.hp_max)}`
              : seat.hp_max != null
                ? `HP ${seat.hp_current ?? 0}/${seat.hp_max}`
                : 'HP —'}
          </Text>
        ) : null}

        <div className="session-table-card__stats">
          {showAc && seat.ac != null ? (
            <span className="session-table-card__chip">КД {seat.ac}</span>
          ) : null}
          {showPassives && seat.passive_perception != null ? (
            <span className="session-table-card__chip" title="Пассивная внимательность">
              👁 {seat.passive_perception}
            </span>
          ) : null}
          {showPassives && seat.passive_insight != null ? (
            <span className="session-table-card__chip" title="Пассивная проницательность">
              ◎ {seat.passive_insight}
            </span>
          ) : null}
          {showPassives && seat.passive_investigation != null ? (
            <span className="session-table-card__chip" title="Пассивное расследование">
              ? {seat.passive_investigation}
            </span>
          ) : null}
        </div>

        <div className="session-table-card__actions">
          <Link className="ui-button ui-button--ghost" to={`/characters/${seat.character_id}`}>
            {sheetLabel}
          </Link>
        </div>
      </div>
    </article>
  )
}
