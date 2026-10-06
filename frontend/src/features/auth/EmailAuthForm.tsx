import { useState } from 'react'
import type { FormEvent } from 'react'
import { login, register, type User } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { EMAIL_ERROR_TEXT, isValidEmail } from '../../shared/lib/email'
import { Button, Field, Input, PasswordInput, Stack, Text } from '../../ui'

type EmailAuthFormProps = {
  mode: 'login' | 'register'
  onSuccess: (user: User) => void
  onForgotPassword?: () => void
}

export function EmailAuthForm({ mode, onSuccess, onForgotPassword }: EmailAuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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

    if (!validateEmailField(email)) {
      return
    }

    if (mode === 'register' && password.length < 8) {
      setError('Пароль должен быть не короче 8 символов')
      return
    }

    setPending(true)

    try {
      const result =
        mode === 'register'
          ? await register(email.trim(), password)
          : await login(email.trim(), password)
      onSuccess(result.user)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 422) {
          setEmailError(EMAIL_ERROR_TEXT)
          setError(null)
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
        <Field
          label="Email"
          htmlFor={`${mode}-email`}
          hint="Формат: name@mail.ru"
        >
          <Input
            id={`${mode}-email`}
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
        <Field
          label="Пароль"
          htmlFor={`${mode}-password`}
          hint={mode === 'register' ? 'Минимум 8 символов' : undefined}
        >
          <PasswordInput
            id={`${mode}-password`}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            required
            minLength={mode === 'register' ? 8 : 1}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? <Text tone="danger">{error}</Text> : null}
        <Button type="submit" disabled={pending}>
          {pending ? '...' : mode === 'register' ? 'Зарегистрироваться' : 'Войти'}
        </Button>
        {mode === 'login' && onForgotPassword ? (
          <Button type="button" variant="ghost" onClick={onForgotPassword}>
            Забыли пароль?
          </Button>
        ) : null}
      </Stack>
    </form>
  )
}
