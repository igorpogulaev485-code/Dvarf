import { useState } from 'react'
import type { FormEvent } from 'react'
import { resetPassword } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Field, PasswordInput, Stack, Text } from '../../ui'

type ResetPasswordFormProps = {
  token: string
  onSuccess: () => void
  onBackToLogin: () => void
}

export function ResetPasswordForm({ token, onSuccess, onBackToLogin }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!token.trim()) {
      setError('Ссылка восстановления недействительна')
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
        <Text tone="muted">Придумайте новый пароль для входа в Dvarf.</Text>
        <Field label="Новый пароль" htmlFor="reset-password" hint="Минимум 8 символов">
          <PasswordInput
            id="reset-password"
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
