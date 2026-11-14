import type { HTMLAttributes, ReactNode } from 'react'

type ChipStackProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  /** Tools column (coins / rest) vs status chips (insp / exhaustion). */
  variant?: 'status' | 'tools'
}

/**
 * Kit vertical stack of equal-height header chips (Вдохн./Истощ. or зм/Отдых).
 * Etalon accepted Игорь 14.11.2026.
 */
export function ChipStack({
  children,
  variant = 'status',
  className = '',
  ...rootProps
}: ChipStackProps) {
  const face =
    variant === 'tools'
      ? 'ui-chip-stack ui-chip-stack--tools play-desk-header__right-tools'
      : 'ui-chip-stack play-desk-header__stack'
  return (
    <div className={`${face} ${className}`.trim()} {...rootProps}>
      {children}
    </div>
  )
}
