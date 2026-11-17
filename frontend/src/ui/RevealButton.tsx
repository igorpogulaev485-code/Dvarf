import type { ButtonHTMLAttributes } from 'react'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  busy?: boolean
}

/** Кнопка «Раскрыть» скрытый бросок мастера. */
export function RevealButton({
  busy = false,
  disabled,
  className = '',
  children = 'Раскрыть',
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={`ui-reveal-btn ${className}`.trim()}
      disabled={disabled || busy}
      {...rest}
    >
      {busy ? 'Раскрываем…' : children}
    </button>
  )
}
