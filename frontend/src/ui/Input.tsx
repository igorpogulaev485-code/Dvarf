import type { InputHTMLAttributes } from 'react'

export type InputSize = 'sm' | 'md' | 'lg'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Kit control rhythm; default matches legacy field padding. */
  size?: InputSize
  /** Compact width for amount / «Число» fields — placeholder stays readable. */
  narrow?: boolean
}

export function Input({
  className = '',
  size,
  narrow = false,
  ...props
}: InputProps) {
  const sizeClass = size ? `ui-input--${size}` : ''
  const narrowClass = narrow ? 'ui-input--narrow' : ''
  return (
    <input
      className={`ui-input ${sizeClass} ${narrowClass} ${className}`.trim()}
      {...props}
    />
  )
}
