import type { CombatantMember } from '../../shared/api/lobbies'
import {
  bandFromRatio,
  hpBand,
  hpLabelEnemy,
  type HpBand,
} from './sessionHpBand'
import {
  normalizeVisibilityProfile,
  type VisibilityProfile,
} from './visibilityProfile'

export type MemberHpTone = HpBand

/** Те же пороги S-03: >50% / ≤50% / ≤1/3 / 0. */
export function memberHpTone(current: number, max: number): MemberHpTone {
  return hpBand(current, max)
}

/** Подписи цветного HP для врага (G12). */
export function memberHpColorLabel(tone: MemberHpTone): string {
  return hpLabelEnemy(tone)
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
 * G12: без открытия статблока игрок не видит точные хиты (даже при профиле «активно»).
 */
export function packMemberRosterLine(
  member: CombatantMember,
  visibility: VisibilityProfile | unknown,
  opts: { revealExactHp: boolean; statblockVisible?: boolean },
): PackRosterLine {
  const numbersHidden = Boolean(member.hp_numbers_hidden)
  const band =
    member.hp_band ??
    (member.hp_ratio != null
      ? bandFromRatio(member.hp_ratio)
      : memberHpTone(member.hp_current, member.hp_max))
  const base = { id: member.id, name: member.name, tone: band as MemberHpTone }
  const canExact =
    opts.revealExactHp ||
    (opts.statblockVisible === true &&
      normalizeVisibilityProfile(visibility).fields.health.hp === 'active')
  if (canExact && !numbersHidden) {
    return {
      ...base,
      status: `HP ${member.hp_current}/${member.hp_max}`,
      showsExactHp: true,
    }
  }
  const hp = normalizeVisibilityProfile(visibility).fields.health.hp
  if (!opts.revealExactHp && (numbersHidden || opts.statblockVisible === false)) {
    if (hp === 'off') return { ...base, status: null, showsExactHp: false }
    return {
      ...base,
      status: member.hp_label || memberHpColorLabel(band as MemberHpTone),
      showsExactHp: false,
    }
  }
  if (hp === 'off') {
    return { ...base, status: null, showsExactHp: false }
  }
  if (hp === 'active' && !numbersHidden) {
    return {
      ...base,
      status: `HP ${member.hp_current}/${member.hp_max}`,
      showsExactHp: true,
    }
  }
  return {
    ...base,
    status: member.hp_label || memberHpColorLabel(band as MemberHpTone),
    showsExactHp: false,
  }
}

type RosterProps = {
  members: CombatantMember[]
  visibility?: VisibilityProfile | unknown
  revealExactHp: boolean
  statblockVisible?: boolean
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
  statblockVisible,
  interactive,
  selectedMemberId,
  busy,
  onSelect,
}: RosterProps) {
  return (
    <ul className="session-enemy-card__roster">
      {members.map((m) => {
        const line = packMemberRosterLine(m, visibility, {
          revealExactHp,
          statblockVisible,
        })
        const selected = selectedMemberId === m.id
        const content = (
          <>
            <span className={`session-enemy-card__roster-dot is-${line.tone}`} />
            <span className="session-enemy-card__roster-name">{line.name}</span>
            {line.status ? (
              <span className="session-enemy-card__roster-hp">{line.status}</span>
            ) : null}
          </>
        )
        if (!interactive) {
          return (
            <li
              key={m.id}
              className={`session-enemy-card__roster-item is-${line.tone} is-readonly`}
            >
              {content}
            </li>
          )
        }
        return (
          <li key={m.id}>
            <button
              type="button"
              className={`session-enemy-card__roster-item is-${line.tone}${
                selected ? ' is-selected' : ''
              }`}
              disabled={busy}
              onClick={() => onSelect?.(m.id)}
            >
              {content}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
