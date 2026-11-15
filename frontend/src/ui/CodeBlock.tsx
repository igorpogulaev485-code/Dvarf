import type { ReactNode } from 'react'

export type CodeBlockOverflow = 'scroll' | 'wrap'

type CodeBlockProps = {
  children: ReactNode
  /**
   * scroll (default) — длинные строки внутри блока с горизонтальной прокруткой.
   * wrap — перенос длинных строк (pre-wrap).
   */
  overflow?: CodeBlockOverflow
  className?: string
  /** Якорь для скринов / навигации. */
  id?: string
}

/**
 * Kit atom: блок кода (`<pre><code>`).
 * На узком экране не раздувает страницу — scroll или wrap внутри рамки.
 */
export function CodeBlock({
  children,
  overflow = 'scroll',
  className = '',
  id,
}: CodeBlockProps) {
  const overflowClass =
    overflow === 'wrap' ? 'ui-code-block--wrap' : 'ui-code-block--scroll'
  return (
    <pre
      id={id}
      className={`ui-code-block ${overflowClass} ${className}`.trim()}
    >
      <code className="ui-code-block__code">{children}</code>
    </pre>
  )
}
