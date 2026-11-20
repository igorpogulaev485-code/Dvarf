import type { ReactNode } from 'react'
import { displayDiceNotation } from '../shared/dnd/diceNotation'

function withDiceCopy(node: ReactNode): ReactNode {
  if (typeof node === 'string') return displayDiceNotation(node)
  if (Array.isArray(node)) return node.map(withDiceCopy)
  return node
}

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
      title={title ? displayDiceNotation(title) : title}
      role={role}
      data-testid={dataTestId}
    >
      {withDiceCopy(children)}
    </Tag>
  )
}
