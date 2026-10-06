import type { ReactNode } from 'react'

type TextProps = {
  children: ReactNode
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3'
  tone?: 'default' | 'muted' | 'danger' | 'success'
  className?: string
}

export function Text({
  children,
  as: Tag = 'p',
  tone = 'default',
  className = '',
}: TextProps) {
  return (
    <Tag className={`ui-text ui-text--${tone} ${className}`.trim()}>{children}</Tag>
  )
}
