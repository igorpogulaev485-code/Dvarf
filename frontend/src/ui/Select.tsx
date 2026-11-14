import type { SelectHTMLAttributes } from 'react'
import type { InputSize } from './Input'

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  /** Kit control rhythm — same heights as Input / NumberInput. */
  size?: InputSize
}

/**
 * Kit native `<select>` — uses `ui-input` size classes so page CSS
 * never has to override control height.
 */
export function Select({ className = '', size = 'md', children, ...props }: SelectProps) {
  const sizeClass = `ui-input--${size}`
  return (
    <select className={`ui-input ui-select ${sizeClass} ${className}`.trim()} {...props}>
      {children}
    </select>
  )
}
