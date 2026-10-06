import { useState } from 'react'
import type { FormEvent } from 'react'
import { forgotPassword } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { EMAIL_ERROR_TEXT, isValidEmail } from '../../shared/lib/email'
import { Button, Field, Input, Stack, Text } from '../../ui'

type ForgotPasswordFormProps = {
  onBackToLogin: () => void
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function validateEmailField(value: string): boolean {
    if (!value.trim()) {
      setEmailError('Укажите email')
      return false
    }
    if (!isValidEmail(value)) {
      setEmailError(EMAIL_ERROR_TEXT)
      return false
    }
    setEmailError(null)
    return true
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setDebugResetUrl(null)

    if (!validateEmailField(email)) {
      return
    }

    setPending(true)
    try {
      const result = await forgotPassword(email.trim())
      setMessage(result.message)
      if (result.debug_reset_url) {
        setDebugResetUrl(result.debug_reset_url)
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 422) {
          setEmailError(EMAIL_ERROR_TEXT)
        } else {
          setError(err.message)
        }
      } else {
        setError('Произошла непредвиденная ошибка')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap={14}>
        <Text tone="muted">
          Укажите email аккаунта. Мы отправим ссылку для смены пароля. Сейчас почта в заглушке —
          ссылка покажется здесь.
        </Text>
        <Field label="Email" htmlFor="forgot-email" hint="Формат: name@mail.ru">
          <Input
            id="forgot-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@mail.ru"
            required
            value={email}
            aria-invalid={emailError ? true : undefined}
            className={emailError ? 'ui-input--invalid' : undefined}
            onChange={(event) => {
              const next = event.target.value
              setEmail(next)
              if (emailError) {
                validateEmailField(next)
              }
            }}
            onBlur={() => {
              if (email.trim()) {
                validateEmailField(email)
              }
            }}
          />
          {emailError ? <Text tone="danger">{emailError}</Text> : null}
        </Field>
        {error ? <Text tone="danger">{error}</Text> : null}
        {message ? <Text tone="success">{message}</Text> : null}
        {debugResetUrl ? (
          <Stack gap={8}>
            <Text tone="muted">Отладочная ссылка (вместо письма):</Text>
            <a className="debug-link" href={debugResetUrl}>
              {debugResetUrl}
            </a>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                window.location.assign(debugResetUrl)
              }}
            >
              Открыть форму нового пароля
            </Button>
          </Stack>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? '...' : 'Отправить ссылку'}
        </Button>
        <Button type="button" variant="ghost" onClick={onBackToLogin}>
          Назад ко входу
        </Button>
      </Stack>
    </form>
  )
}
