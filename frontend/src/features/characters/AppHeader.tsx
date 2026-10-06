import { Link } from 'react-router-dom'
import { ProfileAvatar } from '../cabinet/ProfileAvatar'
import type { User } from '../../shared/api/auth'
import { Button, Text } from '../../ui'

type AppHeaderProps = {
  title: string
  subtitle?: string
  user?: Pick<User, 'avatar_url' | 'display_name' | 'email' | 'full_name'> | null
  onOfficialSite: () => void
}

export function AppHeader({ title, subtitle, user, onOfficialSite }: AppHeaderProps) {
  const nickname = user?.display_name?.trim() || user?.email || 'Профиль'

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <Text as="h1">{title}</Text>
        {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
      </div>
      <div className="app-header__actions">
        {user ? (
          <Link className="app-header__user" to="/cabinet" title="Личный кабинет">
            <ProfileAvatar user={user} size="sm" />
            <span className="app-header__user-name">{nickname}</span>
          </Link>
        ) : (
          <Link className="ui-button ui-button--ghost" to="/cabinet">
            Личный кабинет
          </Link>
        )}
        <Button variant="secondary" onClick={onOfficialSite}>
          Официальный сайт
        </Button>
      </div>
    </header>
  )
}
