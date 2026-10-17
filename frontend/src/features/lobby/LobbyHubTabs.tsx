export type LobbyHubTabId =
  | 'roster'
  | 'journal'
  | 'notes'
  | 'chats'
  | 'sessions'
  | 'setting'
  | 'settings'

const TABS: Array<{ id: LobbyHubTabId; label: string }> = [
  { id: 'roster', label: 'Состав' },
  { id: 'journal', label: 'Дневник' },
  { id: 'notes', label: 'Заметки' },
  { id: 'chats', label: 'Чаты' },
  { id: 'sessions', label: 'Сессии' },
  { id: 'setting', label: 'Сеттинг' },
  { id: 'settings', label: 'Настройки' },
]

type Props = {
  active: LobbyHubTabId
  onChange: (id: LobbyHubTabId) => void
}

export function LobbyHubTabs({ active, onChange }: Props) {
  return (
    <nav className="lobby-hub-tabs" aria-label="Разделы лобби">
      <div className="lobby-hub-tabs__scroll">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`lobby-hub-tab${active === tab.id ? ' is-active' : ''}`}
            aria-current={active === tab.id ? 'page' : undefined}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

export const LOBBY_HUB_TABS = TABS
