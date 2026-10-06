import { useState } from 'react'
import type { FormEvent } from 'react'
import { requestEmailChange } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { EMAIL_ERROR_TEXT, isValidEmail } from '../../shared/lib/email'
import { Button, Field, Input, Stack, Text } from '../../ui'

type ChangeEmailFormProps = {
  currentEmail: string | null
}

export function ChangeEmailForm({ currentEmail }: ChangeEmailFormProps) {
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [debugUrl, setDebugUrl] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!currentEmail) {
    return (
      <Text tone="muted">
        У аккаунта нет текущей почты — смена email недоступна.
      </Text>
    )
  }

  const emailNow = currentEmail

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setDebugUrl(null)

    const value = newEmail.trim()
    if (!value) {
      setError('Укажите новый email')
      return
    }
    if (!isValidEmail(value)) {
      setError(EMAIL_ERROR_TEXT)
      return
    }
    if (value.toLowerCase() === emailNow.toLowerCase()) {
      setError('Новый email совпадает с текущим')
      return
    }

    setPending(true)
    try {
      const result = await requestEmailChange(value)
      setMessage(result.message)
      setDebugUrl(result.debug_confirm_url)
      setNewEmail('')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось запросить смену email')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap={14}>
        <Text tone="muted">
          Ссылка подтверждения уйдёт на <strong>{emailNow}</strong>. Email сменится только после
          перехода по ссылке.
        </Text>
        <Field label="Новый email" htmlFor="cabinet-new-email">
          <Input
            id="cabinet-new-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="new@mail.ru"
          />
        </Field>
        {error ? <Text tone="danger">{error}</Text> : null}
        {message ? <Text tone="success">{message}</Text> : null}
        {debugUrl ? (
          <Stack gap={6}>
            <Text tone="muted">Ссылка для разработки (вместо письма):</Text>
            <a className="back-link" href={debugUrl}>
              Подтвердить смену email
            </a>
          </Stack>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? 'Отправляем…' : 'Отправить ссылку на текущую почту'}
        </Button>
      </Stack>
    </form>
  )
}
