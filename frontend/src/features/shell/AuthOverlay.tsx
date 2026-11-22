import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getMe, type User } from '../../shared/api/auth'
import { setTokens } from '../../shared/api/client'
import {
  EmailAuthForm,
  ForgotPasswordForm,
  OAuthButtons,
} from '../auth'
import { Stack, Text } from '../../ui'
import {
  readShellAuthReturn,
  shellStayPath,
  writeShellAuthReturn,
  type ShellAuthMode,
} from './shellContext'

type AuthOverlayProps = {
  mode: ShellAuthMode
  nextPath?: string | null
  /** Page that opened the panel, when it is not the current URL (phone «Кабинет»). */
  returnTo?: string | null
  onClose: () => void
  onMode: (mode: ShellAuthMode) => void
  onAuthed: (user: User) => void
}

const TITLES: Record<ShellAuthMode, string> = {
  login: 'Вход',
  register: 'Регистрация',
  forgot: 'Забыли пароль',
}

export function AuthOverlay({ mode, nextPath, returnTo = null, onClose, onMode, onAuthed }: AuthOverlayProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [oauthMessage, setOauthMessage] = useState<string | null>(null)
  const onAuthedRef = useRef(onAuthed)
  onAuthedRef.current = onAuthed
  const afterAuth =
    nextPath || returnTo || shellStayPath(location.pathname) || readShellAuthReturn() || '/characters'

  useEffect(() => {
    if (nextPath) return
    const stay = returnTo || shellStayPath(location.pathname)
    if (stay) writeShellAuthReturn(stay)
  }, [nextPath, returnTo, location.pathname])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const oauthProvider = params.get('oauth')
    const oauthError = params.get('oauth_error')

    if (oauthError) {
      setOauthMessage(oauthError)
      window.history.replaceState({}, '', '/login')
      return
    }

    if (!accessToken || !refreshToken) {
      return
    }

    setTokens(accessToken, refreshToken)
    window.history.replaceState({}, '', '/login')
    getMe()
      .then((me) => {
        if (oauthProvider === 'yandex') {
          setOauthMessage('Вход через Яндекс выполнен успешно')
        } else if (oauthProvider) {
          setOauthMessage(`Вход через ${oauthProvider} выполнен успешно`)
        }
        onAuthedRef.current(me)
        writeShellAuthReturn(null)
        navigate(afterAuth, { replace: true })
      })
      .catch(() => {
        setOauthMessage('Не удалось восстановить сессию после OAuth')
      })
  }, [afterAuth, navigate])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="auth-overlay" role="presentation">
      <button type="button" className="auth-overlay__backdrop" aria-label="Закрыть" onClick={onClose} />
      <section className="auth-overlay__panel" role="dialog" aria-modal="true" aria-labelledby="auth-overlay-title">
        <header className="auth-overlay__head">
          <h2 id="auth-overlay-title">{TITLES[mode]}</h2>
          <button type="button" className="auth-overlay__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </header>
        <Stack gap={12}>
          {mode === 'login' || mode === 'register' ? (
            <>
              <div className="mode-switch">
                <button
                  type="button"
                  className={mode === 'register' ? 'is-active' : ''}
                  onClick={() => onMode('register')}
                >
                  Регистрация
                </button>
                <button
                  type="button"
                  className={mode === 'login' ? 'is-active' : ''}
                  onClick={() => onMode('login')}
                >
                  Вход
                </button>
              </div>
              <OAuthButtons layout="labels" onMessage={setOauthMessage} />
              {oauthMessage ? <Text tone="muted">{oauthMessage}</Text> : null}
              <EmailAuthForm
                mode={mode}
                onSuccess={(user) => {
                  onAuthed(user)
                  writeShellAuthReturn(null)
                  navigate(afterAuth, { replace: true })
                }}
                onForgotPassword={() => onMode('forgot')}
              />
            </>
          ) : (
            <ForgotPasswordForm onBackToLogin={() => onMode('login')} />
          )}
        </Stack>
      </section>
    </div>
  )
}
