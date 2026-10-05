import { Link } from 'react-router-dom'
import { Button, Text } from '../../ui'

type AppHeaderProps = {
  title: string
  subtitle?: string
  onOfficialSite: () => void
}

export function AppHeader({ title, subtitle, onOfficialSite }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <Text as="h1">{title}</Text>
        {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
      </div>
      <div className="app-header__actions">
        <Link className="ui-button ui-button--ghost" to="/cabinet">
          Личный кабинет
        </Link>
        <Button variant="secondary" onClick={onOfficialSite}>
          Официальный сайт
        </Button>
      </div>
    </header>
  )
}
