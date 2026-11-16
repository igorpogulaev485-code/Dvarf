import type { TextareaHTMLAttributes } from 'react'
import type { InputSize } from './Input'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Kit control rhythm; default matches Input. */
  size?: InputSize
}

/**
 * Kit `<textarea>` — те же классы `ui-input`, плюс `ui-textarea` (resize, min-height).
 */
export function Textarea({
  className = '',
  size = 'md',
  rows = 5,
  ...props
}: TextareaProps) {
  const sizeClass = `ui-input--${size}`
  return (
    <textarea
      className={`ui-input ui-textarea ${sizeClass} ${className}`.trim()}
      rows={rows}
      {...props}
    />
  )
}
