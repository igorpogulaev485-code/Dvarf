import type { CombatantMember } from '../../shared/api/lobbies'
import {
  normalizeVisibilityProfile,
  type VisibilityProfile,
} from './visibilityProfile'

export type MemberHpTone = 'ok' | 'warn' | 'down'

/** Те же пороги, что у сводки карточки: >50% / ≤50% / 0. */
export function memberHpTone(current: number, max: number): MemberHpTone {
  if (current <= 0) return 'down'
  if (max > 0 && current / max <= 0.5) return 'warn'
  return 'ok'
}

/** Подписи цветного HP для игрока. Мастер по-прежнему видит цифры. */
export function memberHpColorLabel(tone: MemberHpTone): string {
  if (tone === 'ok') return 'Здоров'
  if (tone === 'warn') return 'Ранен'
  return 'Повержен'
}

export type PackRosterLine = {
  id: string
  name: string
  tone: MemberHpTone
  /** null — профиль скрывает здоровье */
  status: string | null
  showsExactHp: boolean
}

/**
 * Строка состава для зрителя.
 * Мастер (`revealExactHp`) всегда видит точные хиты.
 * Игрок — режим `health.hp` профиля: цифры, цвет («Здоров / Ранен / Повержен») или ничего.
 * КД, скорость, статблок и выбор цели сюда не входят.
 */
export function packMemberRosterLine(
  member: CombatantMember,
  visibility: VisibilityProfile | unknown,
  opts: { revealExactHp: boolean },
): PackRosterLine {
  const tone = memberHpTone(member.hp_current, member.hp_max)
  const base = { id: member.id, name: member.name, tone }
  if (opts.revealExactHp) {
    return {
      ...base,
      status: `HP ${member.hp_current}/${member.hp_max}`,
      showsExactHp: true,
    }
  }
  const hp = normalizeVisibilityProfile(visibility).fields.health.hp
  if (hp === 'off') {
    return { ...base, status: null, showsExactHp: false }
  }
  if (hp === 'active') {
    return {
      ...base,
      status: `HP ${member.hp_current}/${member.hp_max}`,
      showsExactHp: true,
    }
  }
  return {
    ...base,
    status: memberHpColorLabel(tone),
    showsExactHp: false,
  }
}

type RosterProps = {
  members: CombatantMember[]
  visibility?: VisibilityProfile | unknown
  revealExactHp: boolean
  /** Мастер выбирает цель урона. Игрок только читает статус. */
  interactive: boolean
  selectedMemberId?: string | null
  busy?: boolean
  onSelect?: (id: string) => void
}

export function PackRosterList({
  members,
  visibility,
  revealExactHp,
  interactive,
  selectedMemberId = null,
  busy,
  onSelect,
}: RosterProps) {
  return (
    <ul className="session-enemy-roster">
      {members.map((member) => {
        const line = packMemberRosterLine(member, visibility, { revealExactHp })
        const dead = line.tone === 'down'
        const selected = interactive && selectedMemberId === member.id
        const body = (
          <div className="session-enemy-roster__who">
            <span className="session-enemy-roster__name">{line.name}</span>
            {line.status ? (
              <span
                className={`session-table-card__chip session-table-card__chip--hp is-${line.tone}`}
              >
                {line.status}
              </span>
            ) : null}
            {interactive && dead ? (
              <span className="session-condition-tag">Мёртв</span>
            ) : null}
            {selected && !dead ? (
              <span className="session-enemy-roster__pick">цель</span>
            ) : null}
          </div>
        )
        return (
          <li key={member.id}>
            {interactive ? (
              <button
                type="button"
                className={`session-enemy-roster__row${dead ? ' is-dead' : ''}${
                  selected ? ' is-selected' : ''
                }`}
                disabled={busy}
                onClick={() => onSelect?.(member.id)}
              >
                {body}
              </button>
            ) : (
              <div
                className={`session-enemy-roster__row is-readonly${dead ? ' is-dead' : ''}`}
              >
                {body}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
