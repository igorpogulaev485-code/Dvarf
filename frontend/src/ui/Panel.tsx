import type { ReactNode } from 'react'

type PanelProps = {
  title?: string
  /** Optional control next to the title. */
  titleAside?: ReactNode
  /** Hover tip node rendered inside the title (parent gets `.has-onboarding-tip`). */
  titleTip?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({ title, titleAside, titleTip, children, className = '' }: PanelProps) {
  const heading =
    title && (titleAside || titleTip) ? (
      <div className="ui-panel__heading">
        <h2 className={`ui-panel__title${titleTip ? ' has-onboarding-tip' : ''}`.trim()}>
          {title}
          {titleTip}
        </h2>
        {titleAside}
      </div>
    ) : title ? (
      <h2 className="ui-panel__title">{title}</h2>
    ) : (
      titleAside
    )

  return (
    <section className={`ui-panel ${className}`.trim()}>
      {heading}
      {children}
    </section>
  )
}
