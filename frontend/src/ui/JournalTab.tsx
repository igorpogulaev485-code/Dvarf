import type { ButtonHTMLAttributes } from 'react'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'role'> & {
  selected?: boolean
  label: string
}

/** Вкладка журнала бросков («Мои» / «Стол»). */
export function JournalTab({
  selected = false,
  label,
  className = '',
  ...rest
}: Props) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      className={`ui-journal-tab${selected ? ' is-on' : ''} ${className}`.trim()}
      {...rest}
    >
      {label}
    </button>
  )
}
