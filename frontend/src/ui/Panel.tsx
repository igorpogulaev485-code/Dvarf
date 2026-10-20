import type { ReactNode } from 'react'

type PanelProps = {
  title?: string
  /** Optional control next to the title (e.g. onboarding «?»). */
  titleAside?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({ title, titleAside, children, className = '' }: PanelProps) {
  return (
    <section className={`ui-panel ${className}`.trim()}>
      {title && titleAside ? (
        <div className="ui-panel__heading">
          <h2 className="ui-panel__title">{title}</h2>
          {titleAside}
        </div>
      ) : title ? (
        <h2 className="ui-panel__title">{title}</h2>
      ) : (
        titleAside
      )}
      {children}
    </section>
  )
}
