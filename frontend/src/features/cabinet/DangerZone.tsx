import { useState } from 'react'
import type { FormEvent } from 'react'
import { deleteAccount, type User } from '../../shared/api/auth'
import { ApiRequestError, clearTokens } from '../../shared/api/client'
import { Button, Field, Input, PasswordInput, Stack, Text } from '../../ui'

type DangerZoneProps = {
  user: User
  onDeleted: () => void
}

export function DangerZone({ user, onDeleted }: DangerZoneProps) {
  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const hasPassword = user.providers.includes('password')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!user.email) {
      setError('У аккаунта нет email — удаление через кабинет недоступно')
      return
    }
    if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setError('Введите текущий email полностью для подтверждения')
      return
    }
    if (hasPassword && !password) {
      setError('Укажите пароль')
      return
    }

    setPending(true)
    try {
      await deleteAccount(confirmEmail.trim(), hasPassword ? password : null)
      clearTokens()
      onDeleted()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось удалить аккаунт')
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap={14}>
        <Text tone="danger">
          Удаление аккаунта необратимо: пропадут персонажи, профиль и привязки входа.
        </Text>
        <Field label="Введите текущий email для подтверждения" htmlFor="danger-confirm-email">
          <Input
            id="danger-confirm-email"
            type="email"
            autoComplete="off"
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
            placeholder={user.email ?? 'email@mail.ru'}
          />
        </Field>
        {hasPassword ? (
          <Field label="Пароль" htmlFor="danger-password">
            <PasswordInput
              id="danger-password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
        ) : null}
        {error ? <Text tone="danger">{error}</Text> : null}
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? 'Удаляем…' : 'Удалить аккаунт навсегда'}
        </Button>
      </Stack>
    </form>
  )
}
