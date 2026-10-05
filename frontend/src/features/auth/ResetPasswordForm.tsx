import { useState } from 'react'
import type { FormEvent } from 'react'
import { resetPassword } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Field, Input, Stack, Text } from '../../ui'

type ResetPasswordFormProps = {
  initialToken?: string
  onSuccess: () => void
  onBackToLogin: () => void
}

export function ResetPasswordForm({
  initialToken = '',
  onSuccess,
  onBackToLogin,
}: ResetPasswordFormProps) {
  const [token, setToken] = useState(initialToken)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!token.trim()) {
      setError('Укажите код восстановления')
      return
    }
    if (password.length < 8) {
      setError('Пароль должен быть не короче 8 символов')
      return
    }

    setPending(true)
    try {
      const result = await resetPassword(token.trim(), password)
      setMessage(result.message)
      onSuccess()
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message)
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
          Введите код из заглушки и новый пароль. После подключения почты код будет приходить
          письмом.
        </Text>
        <Field label="Код восстановления" htmlFor="reset-token">
          <Input
            id="reset-token"
            value={token}
            required
            onChange={(event) => setToken(event.target.value)}
          />
        </Field>
        <Field label="Новый пароль" htmlFor="reset-password" hint="Минимум 8 символов">
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? <Text tone="danger">{error}</Text> : null}
        {message ? <Text tone="success">{message}</Text> : null}
        <Button type="submit" disabled={pending}>
          {pending ? '...' : 'Сохранить новый пароль'}
        </Button>
        <Button type="button" variant="ghost" onClick={onBackToLogin}>
          Назад ко входу
        </Button>
      </Stack>
    </form>
  )
}
