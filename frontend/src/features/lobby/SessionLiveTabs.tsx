export type SessionLiveTabId = 'table' | 'feed' | 'more'

const TABS: Array<{ id: SessionLiveTabId; label: string }> = [
  { id: 'table', label: 'Стол' },
  { id: 'feed', label: 'Лента' },
  { id: 'more', label: 'Ещё' },
]

type Props = {
  active: SessionLiveTabId
  onChange: (id: SessionLiveTabId) => void
  moreBadge?: number
}

export function SessionLiveTabs({ active, onChange, moreBadge = 0 }: Props) {
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
            {tab.id === 'more' && moreBadge > 0 ? (
              <span className="chat-badge">{moreBadge}</span>
            ) : null}
          </button>
        ))}
      </div>
    </nav>
  )
}
