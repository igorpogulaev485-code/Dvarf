import { Link } from 'react-router-dom'
import type { LobbyMember } from '../../shared/api/lobbies'
import { Button, Text } from '../../ui'

type Props = {
  member: LobbyMember
  busy?: boolean
  onRemove?: () => void
}

function hpTone(current: number | null, max: number | null): 'ok' | 'warn' | 'down' | 'unknown' {
  if (max == null || max <= 0 || current == null) return 'unknown'
  const ratio = current / max
  if (current <= 0) return 'down'
  if (ratio <= 0.5) return 'warn'
  return 'ok'
}

/** Упрощённая карточка состава лобби (не полный стол сессии). */
export function LobbyMemberMiniCard({ member, busy, onRemove }: Props) {
  const subtitle = [member.character_race_name, member.character_class_name]
    .filter(Boolean)
    .join(' · ')
  const tone = hpTone(member.hp_current, member.hp_max)
  const initial = (member.character_name.trim().charAt(0) || '?').toUpperCase()

  return (
    <article className="lobby-member-card">
      <div className={`lobby-member-card__hp lobby-member-card__hp--${tone}`} aria-hidden />
      <div className="lobby-member-card__body">
        <div className="lobby-member-card__avatar" aria-hidden>
          {initial}
        </div>
        <div className="lobby-member-card__meta">
          <Text as="h3" className="lobby-member-card__name">
            {member.character_name}
          </Text>
          <Text tone="muted" className="lobby-member-card__sub">
            ур. {member.character_level}
            {subtitle ? ` · ${subtitle}` : ''}
          </Text>
          {member.hp_max != null ? (
            <Text tone="muted" className="lobby-member-card__hp-text">
              HP {member.hp_current ?? 0}/{member.hp_max}
            </Text>
          ) : null}
        </div>
        <div className="lobby-member-card__actions">
          <Link className="ui-button ui-button--ghost" to={`/characters/${member.character_id}`}>
            Лист
          </Link>
          {onRemove ? (
            <Button type="button" variant="secondary" disabled={busy} onClick={onRemove}>
              Убрать
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
