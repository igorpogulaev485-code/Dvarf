import { useEffect, useRef } from 'react'

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
  /** L-06: точка «новое» на вкладке Дневник */
  journalHasNew?: boolean
  /** L-07: непрочитанные чаты / письма / шёпоты */
  chatsBadgeCount?: number
}

export function LobbyHubTabs({
  active,
  onChange,
  journalHasNew = false,
  chatsBadgeCount = 0,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const scroller = scrollRef.current
    const activeEl = activeRef.current
    if (!scroller || !activeEl) return
    // На ≥768 табы wrap — докрутка не нужна
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      return
    }
    const target =
      activeEl.offsetLeft - Math.max(0, (scroller.clientWidth - activeEl.offsetWidth) / 2)
    scroller.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [active])

  return (
    <nav className="lobby-hub-tabs" aria-label="Разделы лобби">
      <div className="lobby-hub-tabs__edge lobby-hub-tabs__edge--start" aria-hidden />
      <div className="lobby-hub-tabs__scroll" ref={scrollRef}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            ref={active === tab.id ? activeRef : undefined}
            className={`lobby-hub-tab${active === tab.id ? ' is-active' : ''}`}
            aria-current={active === tab.id ? 'page' : undefined}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {tab.id === 'journal' && journalHasNew ? (
              <span className="lobby-hub-tab__dot" aria-label="Есть новое в дневнике" />
            ) : null}
            {tab.id === 'chats' && chatsBadgeCount > 0 ? (
              <span className="chat-badge" aria-label={`Непрочитано: ${chatsBadgeCount}`}>
                {chatsBadgeCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="lobby-hub-tabs__edge lobby-hub-tabs__edge--end" aria-hidden />
    </nav>
  )
}

export const LOBBY_HUB_TABS = TABS
