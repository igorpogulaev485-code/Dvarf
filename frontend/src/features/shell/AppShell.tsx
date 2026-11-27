import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { getMe, type User } from '../../shared/api/auth'
import { getAccessToken } from '../../shared/api/client'
import { AppLegalFooter, Creed20Wordmark } from '../../shared/brand/creed20'
import { ProfileAvatar } from '../cabinet/ProfileAvatar'
import { HelpDrawer } from '../onboarding'
import { AuthOverlay } from './AuthOverlay'
import { ShellDice } from './ShellDice'
import {
  ShellAuthProvider,
  shellStayPath,
  writeShellAuthReturn,
  type ShellAuthMode,
} from './shellContext'

export type ShellSection = 'chars' | 'lobby' | 'site' | 'cabinet'

type AppShellProps = {
  title: string
  subtitle?: string
  section: ShellSection
  user?: User | null
  children: ReactNode
  /** When set, the book uses the page's own help (so restart-tips stay on that page). */
  onHelp?: () => void
  initialAuth?: ShellAuthMode | null
  nextPath?: string | null
  onAuthed?: (user: User) => void
  /** Hide the shell dice. Auth pages that are not the app shell should leave it on. */
  showDice?: boolean
}

const NAV = [
  { to: '/characters', section: 'chars' as const, label: 'Персонажи', icon: 'person' },
  { to: '/lobbies', section: 'lobby' as const, label: 'Лобби', icon: 'people' },
  { to: '/site', section: 'site' as const, label: 'Сайт КриD20', short: 'КриD20', icon: 'globe' },
] as const

function NavIcon({ name }: { name: 'person' | 'people' | 'globe' | 'user' }) {
  if (name === 'person') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19c1.2-3.2 3.6-4.8 6.5-4.8S17.8 15.8 19 19" />
      </svg>
    )
  }
  if (name === 'people') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="9" cy="8" r="2.6" />
        <path d="M4.4 19c.8-2.7 2.6-4.1 4.6-4.1s3.8 1.4 4.6 4.1" />
        <circle cx="16.4" cy="8.5" r="2.2" />
        <path d="M13.8 19c.5-2.2 1.8-3.3 3.4-3.3 1.7 0 3 1.1 3.5 3.3" />
      </svg>
    )
  }
  if (name === 'globe') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16" />
        <path d="M12 4c2.4 2.2 3.6 5 3.6 8s-1.2 5.8-3.6 8c-2.4-2.2-3.6-5-3.6-8s1.2-5.8 3.6-8Z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19c1.2-3.2 3.6-4.8 6.5-4.8S17.8 15.8 19 19" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 6.2C10 4.8 7.3 4.5 4.8 6v12.4c2.5-1.4 5.2-1.1 7.2.3" />
      <path d="M12 6.2c2-1.4 4.7-1.7 7.2-.2v12.4c-2.5-1.4-5.2-1.1-7.2.3" />
      <path d="M12 6.2v12.7" />
    </svg>
  )
}

export function AppShell({
  title,
  subtitle,
  section,
  user = null,
  children,
  onHelp,
  initialAuth = null,
  nextPath = null,
  onAuthed,
  showDice = true,
}: AppShellProps) {
  const location = useLocation()
  const [authMode, setAuthMode] = useState<ShellAuthMode | null>(initialAuth)
  const [authReturn, setAuthReturn] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [diceOpen, setDiceOpen] = useState(false)
  const [sessionUser, setSessionUser] = useState<User | null>(user ?? null)
  const nickname = sessionUser?.display_name?.trim() || sessionUser?.email || 'Профиль'

  useEffect(() => {
    setSessionUser(user ?? null)
  }, [user])

  useEffect(() => {
    if (user || !getAccessToken()) return
    let active = true
    getMe()
      .then((me) => {
        if (active) setSessionUser(me)
      })
      .catch(() => {
        if (active) setSessionUser(null)
      })
    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-v2', '')
    const mq = window.matchMedia('(max-width: 959px)')
    const sync = () => root.setAttribute('data-width', mq.matches ? 'phone' : 'desktop')
    sync()
    mq.addEventListener('change', sync)
    return () => {
      root.removeAttribute('data-v2')
      root.removeAttribute('data-width')
      mq.removeEventListener('change', sync)
    }
  }, [])

  function openAuth(mode: ShellAuthMode = 'login', returnTo?: string) {
    if (nextPath) {
      setAuthReturn(null)
      writeShellAuthReturn(null)
    } else {
      const stay = returnTo || shellStayPath(location.pathname)
      setAuthReturn(stay)
      writeShellAuthReturn(stay)
    }
    setAuthMode(mode)
  }

  function closeAuth() {
    setAuthMode(null)
    setAuthReturn(null)
    writeShellAuthReturn(null)
  }

  function openHelp() {
    if (onHelp) {
      onHelp()
      return
    }
    setHelpOpen(true)
  }

  return (
    <ShellAuthProvider value={{ openAuth }}>
      <div className={`app-shell app-shell--${section}`}>
        <aside className="sidebar app-shell__side">
          <NavLink className="app-shell__brand" to="/site" aria-label="Сайт КриD20">
            <Creed20Wordmark />
          </NavLink>
          <nav className="app-shell__nav" aria-label="Разделы">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `app-shell__nav-item${isActive ? ' is-active' : ''}`
                }
                aria-current={section === item.section ? 'page' : undefined}
              >
                <span className="app-shell__nav-ico">
                  <NavIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="app-shell__main">
          <header className="app-shell__head">
            <div className="app-shell__titles">
              <h1>{title}</h1>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
            <div className="app-shell__tools">
              <button type="button" className="app-shell__book" aria-label="Справка" title="Справка" onClick={openHelp}>
                <BookIcon />
              </button>
              {sessionUser ? (
                <NavLink className="app-shell__pill" to="/cabinet" title="Личный кабинет">
                  <ProfileAvatar user={sessionUser} size="sm" />
                  <span className="app-shell__pill-name">{nickname}</span>
                </NavLink>
              ) : (
                <button type="button" className="app-shell__pill" onClick={() => openAuth('login')}>
                  <span className="app-shell__pill-ghost" aria-hidden>
                    <NavIcon name="user" />
                  </span>
                  <span className="app-shell__pill-name">Войти</span>
                </button>
              )}
            </div>
          </header>
          <div className="app-shell__body">{children}</div>
          <AppLegalFooter />
        </div>

        <nav className="app-shell__tabbar" aria-label="Основная навигация">
          {NAV.slice(0, 2).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `app-shell__tab${isActive ? ' is-active' : ''}`}
            >
              <span className="app-shell__tab-ico">
                <NavIcon name={item.icon} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span id="shell-tab-dice-slot" className="app-shell__tab-dice" />
          {sessionUser ? (
            <NavLink
              to="/cabinet"
              className={({ isActive }) => `app-shell__tab${isActive ? ' is-active' : ''}`}
              aria-label="Личный кабинет"
            >
              <span className="app-shell__tab-ico app-shell__tab-avatar">
                <ProfileAvatar user={sessionUser} size="sm" />
              </span>
              <span>Кабинет</span>
            </NavLink>
          ) : (
            <button type="button" className={`app-shell__tab${section === 'cabinet' ? ' is-active' : ''}`} aria-label="Личный кабинет" onClick={() => openAuth('login', '/cabinet')}>
              <span className="app-shell__tab-ico">
                <NavIcon name="user" />
              </span>
              <span>Кабинет</span>
            </button>
          )}
          <NavLink
            to="/site"
            className={({ isActive }) => `app-shell__tab${isActive ? ' is-active' : ''}`}
            aria-label="Сайт КриD20"
          >
            <span className="app-shell__tab-ico">
              <NavIcon name="globe" />
            </span>
            <span>КриD20</span>
          </NavLink>
        </nav>

        {showDice ? (
          <ShellDice
            open={diceOpen}
            onToggle={() => setDiceOpen((value) => !value)}
            onClose={() => setDiceOpen(false)}
          />
        ) : null}

        {authMode ? (
          <AuthOverlay
            mode={authMode}
            nextPath={nextPath}
            returnTo={authReturn}
            onClose={closeAuth}
            onMode={setAuthMode}
            onAuthed={(next) => {
              setSessionUser(next)
              onAuthed?.(next)
              setAuthMode(null)
            }}
          />
        ) : null}

        {onHelp ? null : (
          <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
        )}
      </div>
    </ShellAuthProvider>
  )
}
