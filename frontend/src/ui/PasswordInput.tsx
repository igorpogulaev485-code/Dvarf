import { useState } from 'react'
import type { InputHTMLAttributes } from 'react'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c5 0 9.3 3.1 11 7-1 2.3-2.7 4.2-4.8 5.4" />
        <path d="M6.1 6.1C4.2 7.4 2.7 9.3 1.9 12c1.7 3.9 6 7 10.1 7 1.4 0 2.7-.3 3.9-.8" />
      </svg>
    )
  }

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1.9 12C3.6 8.1 7.9 5 12 5s8.4 3.1 10.1 7c-1.7 3.9-6 7-10.1 7S3.6 15.9 1.9 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function PasswordInput({ className = '', ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="ui-password-input">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`ui-input ui-password-input__field ${className}`.trim()}
      />
      <button
        type="button"
        className="ui-password-input__toggle"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        aria-pressed={visible}
        tabIndex={0}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  )
}
