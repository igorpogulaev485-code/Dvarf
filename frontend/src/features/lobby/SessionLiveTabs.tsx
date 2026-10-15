export type SessionLiveTabId = 'table' | 'feed'

const TABS: Array<{ id: SessionLiveTabId; label: string }> = [
  { id: 'table', label: 'Стол' },
  { id: 'feed', label: 'Лента' },
]

type Props = {
  active: SessionLiveTabId
  onChange: (id: SessionLiveTabId) => void
}

export function SessionLiveTabs({ active, onChange }: Props) {
  return (
    <nav className="session-live-tabs" aria-label="Живой стол">
      <div className="session-live-tabs__scroll">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`session-live-tab${active === tab.id ? ' is-active' : ''}`}
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
