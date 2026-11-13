import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /** Kit control rhythm (Ilya usability): sm 32 / md 36 / lg 44. */
  size?: ButtonSize
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const sizeClass = size === 'md' ? '' : `ui-button--${size}`
  return (
    <button
      type={type}
      className={`ui-button ui-button--${variant} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}
