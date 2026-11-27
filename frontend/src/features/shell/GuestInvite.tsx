import { Link } from 'react-router-dom'
import { Button, Stack, Text } from '../../ui'
import { useShellAuth } from './shellContext'

type GuestInviteProps = {
  title: string
  lead: string
  /** Extra prod action, for example join-by-code. Not a second login. */
  extra?: { to: string; label: string }
}

export function GuestInvite({ title, lead, extra }: GuestInviteProps) {
  const { openAuth } = useShellAuth()

  return (
    <section className="guest-invite">
      <Stack gap={10}>
        <Text as="h2">{title}</Text>
        <Text>{lead}</Text>
        <div className="guest-invite__actions">
          <Button type="button" onClick={() => openAuth('login')}>
            Войти
          </Button>
          <Button type="button" variant="secondary" onClick={() => openAuth('register')}>
            Создать аккаунт
          </Button>
          {extra ? (
            <Link className="ui-button ui-button--ghost" to={extra.to}>
              {extra.label}
            </Link>
          ) : null}
        </div>
      </Stack>
    </section>
  )
}
