import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from 'react'

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
