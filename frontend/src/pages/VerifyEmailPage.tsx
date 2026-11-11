import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '../shared/api/auth'
import { ApiRequestError } from '../shared/api/client'
import { Button, Panel, Stack, Text } from '../ui'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = useMemo(() => params.get('token')?.trim() || '', [params])
  const [pending, setPending] = useState(Boolean(token))
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      return
    }
    let active = true
    setPending(true)
    verifyEmail(token)
      .then(() => {
        if (!active) {
          return
        }
        setMessage('Email подтверждён. Добро пожаловать в Dvarf!')
      })
      .catch((err: unknown) => {
        if (!active) {
          return
        }
        setError(
          err instanceof ApiRequestError
            ? err.message
            : 'Не удалось подтвердить email',
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
          <Text as="h1">Подтверждение регистрации</Text>
          <Text tone="muted">Вы перешли по ссылке из письма.</Text>
        </Stack>

        <Panel title="Активация аккаунта">
          <Stack gap={12}>
            {!token ? (
              <Text tone="danger">
                В ссылке нет токена. Запросите новое письмо на экране входа.
              </Text>
            ) : null}
            {pending ? <Text tone="muted">Подтверждаем…</Text> : null}
            {error ? <Text tone="danger">{error}</Text> : null}
            {message ? <Text tone="success">{message}</Text> : null}
            <Button
              variant={message ? 'primary' : 'ghost'}
              onClick={() => navigate(message ? '/characters' : '/login')}
            >
              {message ? 'К персонажам' : 'На вход'}
            </Button>
          </Stack>
        </Panel>
      </Stack>
    </main>
  )
}
