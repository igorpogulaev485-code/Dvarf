import { GuestInvite } from '../features/shell/GuestInvite'
import { AppShell, type ShellSection } from '../features/shell/AppShell'

type ShellAuthPageProps = {
  nextPath?: string | null
}

function sectionOf(nextPath: string | null | undefined): ShellSection {
  if (!nextPath) return 'chars'
  if (nextPath.startsWith('/lobbies')) return 'lobby'
  if (nextPath.startsWith('/cabinet')) return 'cabinet'
  if (nextPath.startsWith('/site')) return 'site'
  return 'chars'
}

const COPY: Record<ShellSection, { title: string; subtitle: string }> = {
  chars: {
    title: 'Мои персонажи',
    subtitle: 'Войдите, чтобы открыть зал летописей.',
  },
  lobby: {
    title: 'Лобби',
    subtitle: 'Войдите, чтобы занять место за столом.',
  },
  site: {
    title: 'Сайт КриD20',
    subtitle: 'Официальный свод ещё готовится. Ниже — летопись того, что уже делается за створками.',
  },
  cabinet: {
    title: 'Личный кабинет',
    subtitle: 'Войдите, чтобы открыть кабинет.',
  },
}

export function ShellAuthPage({ nextPath = null }: ShellAuthPageProps) {
  const section = sectionOf(nextPath)
  const copy = COPY[section]

  return (
    <AppShell
      section={section}
      title={copy.title}
      subtitle={copy.subtitle}
      initialAuth="login"
      nextPath={nextPath}
    >
      {section === 'chars' ? (
        <GuestInvite
          title="Зал летописей"
          lead="Твои герои ждут в зале летописей. Имена ещё не названы у порога — войдите, и страницы откроются."
        />
      ) : null}
      {section === 'lobby' ? (
        <GuestInvite
          title="Стол ещё пуст"
          lead="За столом ещё пусто. Мастер уже ждёт, но без вашего имени места не занять. Войдите или запишитесь в книгу."
          extra={{ to: '/join', label: 'Ввести код' }}
        />
      ) : null}
      {section === 'cabinet' ? (
        <GuestInvite
          title="Личный кабинет"
          lead="Профиль, безопасность и оформление откроются после входа."
        />
      ) : null}
    </AppShell>
  )
}
