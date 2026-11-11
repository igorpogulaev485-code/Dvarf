import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { confirmEmailChange } from '../shared/api/auth'
import { ApiRequestError } from '../shared/api/client'
import { Button, Panel, Stack, Text } from '../ui'

export function ConfirmEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = useMemo(() => params.get('token')?.trim() || '', [params])
  const [pending, setPending] = useState(Boolean(token))
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      return
    }
    let active = true
    setPending(true)
    confirmEmailChange(token)
      .then((result) => {
        if (!active) {
          return
        }
        setMessage(result.message)
        setNewEmail(result.user.email)
      })
      .catch((err: unknown) => {
        if (!active) {
          return
        }
        setError(
          err instanceof ApiRequestError
            ? err.message
            : 'Не удалось подтвердить смену email',
        )
      })
      .finally(() => {
        if (active) {
          setPending(false)
        }
      })
    return () => {
      active = false
    }
  }, [token])

  return (
    <main className="page page--auth-debug">
      <Stack gap={20}>
        <Stack gap={6}>
          <Text as="h1">Подтверждение email</Text>
          <Text tone="muted">Вы перешли по ссылке из письма на текущую почту.</Text>
        </Stack>

        <Panel title="Смена email">
          <Stack gap={12}>
            {!token ? (
              <Text tone="danger">В ссылке нет токена. Запросите новую ссылку в личном кабинете.</Text>
            ) : null}
            {pending ? <Text tone="muted">Подтверждаем…</Text> : null}
            {error ? <Text tone="danger">{error}</Text> : null}
            {message ? (
              <Stack gap={8}>
                <Text tone="success">{message}</Text>
                {newEmail ? <Text>Новый email: {newEmail}</Text> : null}
              </Stack>
            ) : null}
            <Button
              variant={message ? 'primary' : 'ghost'}
              onClick={() => navigate(message ? '/cabinet' : '/login')}
            >
              {message ? 'В личный кабинет' : 'На вход'}
            </Button>
          </Stack>
        </Panel>
      </Stack>
    </main>
  )
}
