import { NavLink } from 'react-router-dom'
import { Button, Text } from '../../ui'

type AppHeaderProps = {
  title: string
  subtitle?: string
  onOfficialSite: () => void
}

const NAV = [
  { to: '/characters', label: 'Персонажи', end: false },
  { to: '/lobbies', label: 'Лобби', end: false },
] as const

export function AppHeader({ title, subtitle, onOfficialSite }: AppHeaderProps) {
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
        <NavLink className="ui-button ui-button--ghost" to="/cabinet">
          Личный кабинет
        </NavLink>
        <Button variant="secondary" onClick={onOfficialSite}>
          Официальный сайт
        </Button>
      </div>
    </header>
  )
}
