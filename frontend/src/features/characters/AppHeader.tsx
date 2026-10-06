import { NavLink } from 'react-router-dom'
import { ProfileAvatar } from '../cabinet/ProfileAvatar'
import type { User } from '../../shared/api/auth'
import { Button, Text } from '../../ui'

type AppHeaderProps = {
  title: string
  subtitle?: string
  user?: Pick<User, 'avatar_url' | 'display_name' | 'email' | 'full_name'> | null
  onOfficialSite: () => void
}

const NAV = [
  { to: '/characters', label: 'Персонажи', end: false },
  { to: '/lobbies', label: 'Лобби', end: false },
] as const

export function AppHeader({ title, subtitle, user, onOfficialSite }: AppHeaderProps) {
  const nickname = user?.display_name?.trim() || user?.email || 'Профиль'

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <Text as="h1">{title}</Text>
        {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
        <nav className="app-nav" aria-label="Разделы">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? 'app-nav__link is-active' : 'app-nav__link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="app-header__actions">
        {user ? (
          <NavLink className="app-header__user" to="/cabinet" title="Личный кабинет">
            <ProfileAvatar user={user} size="sm" />
            <span className="app-header__user-name">{nickname}</span>
          </NavLink>
        ) : (
          <NavLink className="ui-button ui-button--ghost" to="/cabinet">
            Личный кабинет
          </NavLink>
        )}
        <Button variant="secondary" onClick={onOfficialSite}>
          Официальный сайт
        </Button>
      </div>
    </header>
  )
}
