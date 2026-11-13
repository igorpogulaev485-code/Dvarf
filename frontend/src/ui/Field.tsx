import type { ReactNode } from 'react'

type FieldProps = {
  label: string
  htmlFor?: string
  children: ReactNode
  hint?: string
  /** Hide label visually (a11y) — kit variant. */
  labelSrOnly?: boolean
  className?: string
}

export function Field({
  label,
  htmlFor,
  children,
  hint,
  labelSrOnly = false,
  className = '',
}: FieldProps) {
  return (
    <label className={`ui-field ${className}`.trim()} htmlFor={htmlFor}>
      <span className={`ui-field__label${labelSrOnly ? ' ui-field__label--sr' : ''}`}>
        {label}
      </span>
      {children}
      {hint ? <span className="ui-field__hint">{hint}</span> : null}
    </label>
  )
}
