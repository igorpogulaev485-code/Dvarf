import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from 'react'
import { DetailsMenu } from './DetailsMenu'

type VitalFace = {
  icon?: ReactNode
  value: ReactNode
  label: ReactNode
  children?: ReactNode
  className?: string
  title?: string
  'aria-label'?: string
}

type VitalTileButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VitalFace & {
    as?: 'button'
  }

type VitalTileDivProps = HTMLAttributes<HTMLDivElement> &
  VitalFace & {
    as: 'div'
  }

export type VitalTileProps = VitalTileButtonProps | VitalTileDivProps

/**
 * Kit stat tile — icon above value, caption below (Скор. / Иниц. / БМ).
 * Variants via className: `play-desk-vital--shield`, `--speed`, `--jump`, …
 * Etalon accepted Игорь 14.11.2026.
 */
export function VitalTile(props: VitalTileProps) {
  const {
    icon,
    value,
    label,
    children,
    className = '',
    as = 'button',
    ...rest
  } = props
  const face = `ui-vital play-desk-vital ${className}`.trim()
  const body = (
    <>
      {icon}
      <b>{value}</b>
      <span className="ui-vital__label play-desk-vital__label-row">{label}</span>
      {children}
    </>
  )
  if (as === 'div') {
    const divProps = rest as HTMLAttributes<HTMLDivElement>
    return (
      <div className={face} {...divProps}>
        {body}
      </div>
    )
  }
  const btnProps = rest as ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button type="button" className={face} {...btnProps}>
      {body}
    </button>
  )
}

export type VitalTileMenuProps = {
  icon?: ReactNode
  value: ReactNode
  label: ReactNode
  /** Corner badge, e.g. `+3` for extra movement modes. */
  badge?: ReactNode
  /** Popover body (kit DetailsMenu panel). */
  menu: ReactNode
  className?: string
  summaryClassName?: string
  panelClassName?: string
  title?: string
  'aria-label'?: string
  role?: string
}

/**
 * Compact vital that opens kit DetailsMenu on tap.
 * Face stays one tile tall (icon / value / label); extras live in `badge` + menu.
 * Phone speed tile: walk on face, alt modes as +N → full list in panel.
 */
export function VitalTileMenu({
  icon,
  value,
  label,
  badge,
  menu,
  className = '',
  summaryClassName = '',
  panelClassName = '',
  title,
  'aria-label': ariaLabel,
  role,
}: VitalTileMenuProps) {
  return (
    <DetailsMenu
      className={`ui-vital-menu ${className}`.trim()}
      summaryClassName={`ui-vital-menu__summary ${summaryClassName}`.trim()}
      panelClassName={`ui-vital-menu__panel ${panelClassName}`.trim()}
      summary={
        <>
          {icon}
          <b className="ui-vital__value">{value}</b>
          <span className="ui-vital__label">{label}</span>
          {badge != null && badge !== false && badge !== '' ? (
            <span className="ui-vital__badge" aria-hidden>
              {badge}
            </span>
          ) : null}
        </>
      }
      title={title}
      aria-label={ariaLabel}
      role={role}
    >
      {menu}
    </DetailsMenu>
  )
}
