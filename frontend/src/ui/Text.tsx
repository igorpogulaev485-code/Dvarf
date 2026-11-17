import type { ReactNode } from 'react'

type TextProps = {
  children: ReactNode
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5'
  tone?: 'default' | 'muted' | 'danger' | 'success' | 'warn'
  className?: string
  title?: string
  role?: string
  'data-testid'?: string
}

export function Text({
  children,
  as: Tag = 'p',
  tone = 'default',
  className = '',
  title,
  role,
  'data-testid': dataTestId,
}: TextProps) {
  return (
    <Tag
      className={`ui-text ui-text--${tone} ${className}`.trim()}
      title={title}
      role={role}
      data-testid={dataTestId}
    >
      {children}
    </Tag>
  )
}
