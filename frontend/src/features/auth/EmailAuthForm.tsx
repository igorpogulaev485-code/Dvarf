import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  login,
  register,
  resendVerification,
  type User,
} from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { EMAIL_ERROR_TEXT, isValidEmail } from '../../shared/lib/email'
import { Button, Field, Input, PasswordInput, Stack, Text } from '../../ui'

type EmailAuthFormProps = {
  mode: 'login' | 'register'
  onSuccess: (user: User) => void
  onForgotPassword?: () => void
}

export function EmailAuthForm({ mode, onSuccess, onForgotPassword }: EmailAuthFormProps) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [registerMessage, setRegisterMessage] = useState<string | null>(null)
  const [debugVerifyUrl, setDebugVerifyUrl] = useState<string | null>(null)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [pending, setPending] = useState(false)
  const [resendPending, setResendPending] = useState(false)

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
    setRegisterMessage(null)
    setDebugVerifyUrl(null)
    setNeedsVerification(false)

    if (mode === 'register') {
      const name = displayName.trim()
      if (name.length < 2) {
        setError('Укажите никнейм не короче 2 символов')
        return
      }
    }

    if (!validateEmailField(email)) {
      return
    }

    if (mode === 'register' && password.length < 8) {
      setError('Пароль должен быть не короче 8 символов')
      return
    }

    setPending(true)

    try {
      if (mode === 'register') {
        const result = await register(email.trim(), password, displayName.trim())
        setRegisterMessage(result.message)
        setDebugVerifyUrl(result.debug_verify_url)
      } else {
        const result = await login(email.trim(), password)
        onSuccess(result.user)
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 422) {
          setEmailError(EMAIL_ERROR_TEXT)
          setError(null)
        } else if (err.code === 'email_not_verified') {
          setNeedsVerification(true)
          setError(err.message)
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

  async function handleResend() {
    setResendPending(true)
    setError(null)
    try {
      const result = await resendVerification(email.trim())
      setRegisterMessage(result.message)
      setDebugVerifyUrl(result.debug_verify_url)
      setNeedsVerification(false)
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : 'Не удалось отправить письмо ещё раз',
      )
    } finally {
      setResendPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap={14}>
        {mode === 'register' ? (
          <Field
            label="Никнейм"
            htmlFor={`${mode}-display-name`}
            hint="Обязательно, так вас будут видеть в Dvarf"
          >
            <Input
              id={`${mode}-display-name`}
              autoComplete="nickname"
              required
              minLength={2}
              maxLength={128}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Например, Thorin"
            />
          </Field>
        ) : null}

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
        {registerMessage ? <Text tone="success">{registerMessage}</Text> : null}
        {debugVerifyUrl ? (
          <Stack gap={6}>
            <Text tone="muted">Ссылка для разработки (вместо письма):</Text>
            <a className="back-link" href={debugVerifyUrl}>
              Подтвердить email
            </a>
          </Stack>
        ) : null}
        {needsVerification ? (
          <Button type="button" variant="secondary" onClick={handleResend} disabled={resendPending}>
            {resendPending ? 'Отправляем…' : 'Отправить письмо ещё раз'}
          </Button>
        ) : null}
        <Button type="submit" disabled={pending || Boolean(registerMessage && mode === 'register')}>
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
