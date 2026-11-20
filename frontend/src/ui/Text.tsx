import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { displayDiceNotation } from '../shared/dnd/diceNotation'

const SKIP_DICE_COPY = new Set(['input', 'textarea', 'select', 'option'])

/** Show «к» in text nodes. Leave form controls alone so editors keep stored «d». */
function withDiceCopy(node: ReactNode): ReactNode {
  if (typeof node === 'string') return displayDiceNotation(node)
  if (Array.isArray(node)) return node.map(withDiceCopy)
  if (!isValidElement(node)) return node
  const type = node.type
  if (typeof type === 'string' && SKIP_DICE_COPY.has(type)) return node
  const props = node.props as { children?: ReactNode; title?: unknown }
  const title =
    typeof props.title === 'string' ? displayDiceNotation(props.title) : props.title
  const children = props.children != null ? withDiceCopy(props.children) : props.children
  if (title === props.title && children === props.children) return node
  return cloneElement(node as ReactElement<{ children?: ReactNode; title?: unknown }>, {
    ...(title !== props.title ? { title } : null),
    ...(children !== props.children ? { children } : null),
  })
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
