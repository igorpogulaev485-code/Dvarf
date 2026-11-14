import type { ButtonHTMLAttributes, ReactNode } from 'react'

type XpTrackProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  level: number
  /** 0..1 fill ratio; ignored when milestones. */
  ratio?: number
  remainLabel: ReactNode
  milestones?: boolean
}

/**
 * Kit XP band — level · bar · «N / M XP · до ур. K — X».
 * Etalon accepted Игорь 14.11.2026.
 */
export function XpTrack({
  level,
  ratio = 0,
  remainLabel,
  milestones = false,
  className = '',
  children,
  ...rootProps
}: XpTrackProps) {
  const safeRatio = Math.max(0, Math.min(1, ratio))
  return (
    <button
      type="button"
      className={`ui-xp-track play-desk-header__xp${
        milestones ? ' is-milestones' : ''
      } ${className}`.trim()}
      {...rootProps}
    >
      {children}
      <span className="ui-xp-track__level play-desk-header__xp-level">
        ур. {level}
      </span>
      {milestones ? null : (
        <span
          className="ui-xp-track__bar play-desk-header__xp-bar"
          aria-hidden
        >
          <i style={{ width: `${Math.round(safeRatio * 100)}%` }} />
        </span>
      )}
      <span className="ui-xp-track__remain play-desk-header__xp-remain">
        {remainLabel}
      </span>
    </button>
  )
}
