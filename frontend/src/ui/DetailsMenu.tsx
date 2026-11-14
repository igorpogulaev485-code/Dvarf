import type { DetailsHTMLAttributes, ReactNode } from 'react'

type DetailsMenuProps = Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'children'> & {
  /** Visible summary / trigger label. */
  summary: ReactNode
  children: ReactNode
  summaryClassName?: string
  panelClassName?: string
}

/**
 * Kit popover menu built on `<details>` — panel floats over layout
 * (does not reflow siblings). Used by master toolbar «Награды» / «Ещё».
 */
export function DetailsMenu({
  summary,
  children,
  className = '',
  summaryClassName = '',
  panelClassName = '',
  ...rootProps
}: DetailsMenuProps) {
  return (
    <details className={`ui-menu ${className}`.trim()} {...rootProps}>
      <summary className={`ui-menu__summary ${summaryClassName}`.trim()}>{summary}</summary>
      <div className={`ui-menu__panel ${panelClassName}`.trim()}>{children}</div>
    </details>
  )
}
