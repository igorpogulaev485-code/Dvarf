import { getMe, logout, type User } from '../../shared/api/auth'
import { ApiRequestError, getAccessToken } from '../../shared/api/client'
import { Button, Stack, Text } from '../../ui'
import { useEffect, useState } from 'react'

type AuthSessionPanelProps = {
  user: User | null
  onUserChange: (user: User | null) => void
}

export function AuthSessionPanel({ user, onUserChange }: AuthSessionPanelProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user || !getAccessToken()) {
      return
    }

    let active = true
    setLoading(true)
    getMe()
      .then((me) => {
        if (active) {
          onUserChange(me)
        }
      })
      .catch((err: unknown) => {
        if (!active) {
          return
        }
        if (err instanceof ApiRequestError) {
          setError(err.message)
        }
        onUserChange(null)
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [user, onUserChange])

  async function handleLogout() {
    setError(null)
    await logout()
    onUserChange(null)
  }

  if (loading) {
    return <Text tone="muted">Loading session...</Text>
  }

  if (!user) {
    return (
      <Stack gap={8}>
        <Text tone="muted">Not signed in</Text>
        {error ? <Text tone="danger">{error}</Text> : null}
      </Stack>
    )
  }

  return (
    <Stack gap={10}>
      <Text>
        Signed in as <strong>{user.email || user.display_name || user.id}</strong>
      </Text>
      <Text tone="muted">Providers: {user.providers.join(', ') || 'none'}</Text>
      <Button variant="ghost" onClick={handleLogout}>
        Logout
      </Button>
    </Stack>
  )
}
