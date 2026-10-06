import type { ReactNode } from 'react'

type FieldProps = {
  label: string
  htmlFor?: string
  children: ReactNode
  hint?: string
}

export function Field({ label, htmlFor, children, hint }: FieldProps) {
  return (
    <label className="ui-field" htmlFor={htmlFor}>
      <span className="ui-field__label">{label}</span>
      {children}
      {hint ? <span className="ui-field__hint">{hint}</span> : null}
    </label>
  )
}
