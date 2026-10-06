import { useCallback, useEffect, useState } from 'react'
import {
  listSessions,
  logout,
  revokeAllSessions,
  revokeOtherSessions,
  revokeSession,
  type AuthSession,
} from '../../shared/api/auth'
import { ApiRequestError, clearTokens } from '../../shared/api/client'
import { Button, Stack, Text } from '../../ui'

type SessionsPanelProps = {
  onLoggedOut: () => void
}

function formatWhen(value: string): string {
  try {
    return new Date(value).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function shortAgent(value: string | null): string {
  if (!value) {
    return 'Неизвестное устройство'
  }
  const lower = value.toLowerCase()
  if (lower.includes('android')) return 'Android'
  if (lower.includes('iphone') || lower.includes('ipad')) return 'iOS'
  if (lower.includes('mac os') || lower.includes('macintosh')) return 'macOS'
  if (lower.includes('windows')) return 'Windows'
  if (lower.includes('linux')) return 'Linux'
  return value.slice(0, 48)
}

export function SessionsPanel({ onLoggedOut }: SessionsPanelProps) {
  const [items, setItems] = useState<AuthSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | 'others' | 'all' | 'logout' | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listSessions()
      setItems(result.items)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить сессии')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleLogout() {
    setPendingId('logout')
    setError(null)
    try {
      await logout()
    } catch {
      // still clear local tokens
    } finally {
      clearTokens()
      onLoggedOut()
    }
  }

  async function handleRevoke(session: AuthSession) {
    setPendingId(session.id)
    setError(null)
    try {
      await revokeSession(session.id)
      if (session.current) {
        clearTokens()
        onLoggedOut()
        return
      }
      await reload()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось завершить сессию')
    } finally {
      setPendingId(null)
    }
  }

  async function handleRevokeOthers() {
    setPendingId('others')
    setError(null)
    try {
      await revokeOtherSessions()
      await reload()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось завершить сессии')
    } finally {
      setPendingId(null)
    }
  }

  async function handleRevokeAll() {
    setPendingId('all')
    setError(null)
    try {
      await revokeAllSessions()
      clearTokens()
      onLoggedOut()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось завершить сессии')
      setPendingId(null)
    }
  }

  return (
    <Stack gap={14}>
      <Text tone="muted">
        Здесь видны устройства, где вы вошли. Можно завершить чужую или все сессии.
      </Text>

      {loading ? <Text tone="muted">Загружаем сессии…</Text> : null}
      {error ? <Text tone="danger">{error}</Text> : null}

      {!loading && items.length === 0 ? (
        <Text tone="muted">Активных сессий нет — войдите снова.</Text>
      ) : null}

      <Stack gap={10}>
        {items.map((session) => (
          <div key={session.id} className="session-row">
            <div className="session-row__meta">
              <Text className="session-row__title">
                {shortAgent(session.user_agent)}
                {session.current ? ' · текущая' : ''}
              </Text>
              <Text tone="muted">
                {session.ip_address ? `${session.ip_address} · ` : ''}
                вход {formatWhen(session.created_at)} · активность {formatWhen(session.last_seen_at)}
              </Text>
            </div>
            <Button
              variant={session.current ? 'ghost' : 'secondary'}
              disabled={pendingId !== null}
              onClick={() => void handleRevoke(session)}
            >
              {pendingId === session.id
                ? '…'
                : session.current
                  ? 'Выйти'
                  : 'Завершить'}
            </Button>
          </div>
        ))}
      </Stack>

      <Stack gap={8}>
        <Button
          variant="secondary"
          disabled={pendingId !== null || items.filter((item) => !item.current).length === 0}
          onClick={() => void handleRevokeOthers()}
        >
          {pendingId === 'others' ? 'Завершаем…' : 'Завершить остальные'}
        </Button>
        <Button
          variant="danger"
          disabled={pendingId !== null || items.length === 0}
          onClick={() => void handleRevokeAll()}
        >
          {pendingId === 'all' ? 'Выходим…' : 'Выйти везде'}
        </Button>
        <Button
          variant="ghost"
          disabled={pendingId !== null}
          onClick={() => void handleLogout()}
        >
          {pendingId === 'logout' ? 'Выходим…' : 'Выйти только здесь'}
        </Button>
      </Stack>
    </Stack>
  )
}
