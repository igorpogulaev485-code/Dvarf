import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonEdge = 'end'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /** Kit control rhythm (Ilya usability): sm 32 / md 36 / lg 44. */
  size?: ButtonSize
  /** Dock to the trailing edge of a card/row (matches --radius-card). */
  edge?: ButtonEdge
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  edge,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const sizeClass = size === 'md' ? '' : `ui-button--${size}`
  const edgeClass = edge === 'end' ? 'ui-button--edge-end' : ''
  return (
    <button
      type={type}
      className={`ui-button ui-button--${variant} ${sizeClass} ${edgeClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}
