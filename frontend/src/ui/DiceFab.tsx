import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ForwardedRef,
} from 'react'

type DiceFabProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Visual pressed / open state. */
  active?: boolean
  /** Lift above mobile bottom scene nav. */
  liftForMobileNav?: boolean
}

/** Compact d20 FAB — kit atom for free dice roller entry. */
export const DiceFab = forwardRef(function DiceFab(
  {
    active = false,
    liftForMobileNav = false,
    className = '',
    type = 'button',
    'aria-label': ariaLabel = 'Бросок кубиков',
    ...props
  }: DiceFabProps,
  ref: ForwardedRef<HTMLButtonElement>,
) {
  const activeClass = active ? ' is-on' : ''
  const liftClass = liftForMobileNav ? ' ui-dice-fab--mobile-nav' : ''
  return (
    <button
      ref={ref}
      type={type}
      className={`ui-dice-fab fab-dice no-print${activeClass}${liftClass} ${className}`.trim()}
      aria-label={ariaLabel}
      aria-pressed={active}
      {...props}
    >
      <svg
        className="ui-dice-fab__icon"
        viewBox="0 0 32 32"
        width="22"
        height="22"
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M16 2.2 28.5 9v14L16 29.8 3.5 23V9L16 2.2zm0 2.5L6.2 10.1v11.8L16 27.3l9.8-5.4V10.1L16 4.7z"
        />
        <circle cx="16" cy="16" r="2.2" fill="currentColor" />
        <circle cx="11.2" cy="12.2" r="1.4" fill="currentColor" />
        <circle cx="20.8" cy="12.2" r="1.4" fill="currentColor" />
        <circle cx="11.2" cy="19.8" r="1.4" fill="currentColor" />
        <circle cx="20.8" cy="19.8" r="1.4" fill="currentColor" />
      </svg>
    </button>
  )
})
