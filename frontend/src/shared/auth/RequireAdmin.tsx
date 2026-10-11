import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { getMe } from '../api/auth'
import { ApiRequestError, getAccessToken } from '../api/client'
import { Text } from '../../ui'

type RequireAdminProps = {
  children: ReactNode
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const location = useLocation()
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'unauth'>('loading')

  useEffect(() => {
    if (!getAccessToken()) {
      setState('unauth')
      return
    }
    let active = true
    getMe()
      .then((me) => {
        if (!active) return
        setState(me.is_admin ? 'ok' : 'forbidden')
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiRequestError && err.status === 401) {
          setState('unauth')
          return
        }
        setState('forbidden')
      })
    return () => {
      active = false
    }
  }, [])

  if (state === 'unauth') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (state === 'loading') {
    return (
      <main className="page page--app">
        <Text tone="muted">Проверяем доступ…</Text>
      </main>
    )
  }

  if (state === 'forbidden') {
    return (
      <main className="page page--app">
        <Text as="h1">Нет доступа</Text>
        <Text tone="muted">Админ-раздел доступен только администратору.</Text>
        <p>
          <Link className="back-link" to="/characters">
            ← К персонажам
          </Link>
        </p>
      </main>
    )
  }

  return children
}
