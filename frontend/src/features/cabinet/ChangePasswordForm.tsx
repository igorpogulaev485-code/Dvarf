import { useState } from 'react'
import type { FormEvent } from 'react'
import { changePassword } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Field, PasswordInput, Stack, Text } from '../../ui'

type ChangePasswordFormProps = {
  onChanged?: () => void
}

export function ChangePasswordForm({ onChanged }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword.length < 8) {
      setError('Новый пароль должен быть не короче 8 символов')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Новый пароль и подтверждение не совпадают')
      return
    }
    if (currentPassword === newPassword) {
      setError('Новый пароль должен отличаться от текущего')
      return
    }

    setPending(true)
    try {
      const result = await changePassword(currentPassword, newPassword)
      setSuccess(result.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onChanged?.()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось сменить пароль')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap={14}>
        <Field label="Текущий пароль" htmlFor="cabinet-current-password">
          <PasswordInput
            id="cabinet-current-password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </Field>
        <Field label="Новый пароль" htmlFor="cabinet-new-password" hint="Минимум 8 символов">
          <PasswordInput
            id="cabinet-new-password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </Field>
        <Field label="Повторите новый пароль" htmlFor="cabinet-confirm-password">
          <PasswordInput
            id="cabinet-confirm-password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </Field>
        {error ? <Text tone="danger">{error}</Text> : null}
        {success ? <Text tone="success">{success}</Text> : null}
        <Button type="submit" disabled={pending}>
          {pending ? 'Сохраняем…' : 'Сменить пароль'}
        </Button>
      </Stack>
    </form>
  )
}
