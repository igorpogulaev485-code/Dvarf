import type { ReactNode } from 'react'

type PanelProps = {
  title?: string
  children: ReactNode
  className?: string
}

export function Panel({ title, children, className = '' }: PanelProps) {
  return (
    <section className={`ui-panel ${className}`.trim()}>
      {title ? <h2 className="ui-panel__title">{title}</h2> : null}
      {children}
    </section>
  )
}
