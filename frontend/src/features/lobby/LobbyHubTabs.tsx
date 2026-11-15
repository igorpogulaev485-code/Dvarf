import { useEffect, useRef, useState } from 'react'
import { Button } from '../../ui'

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
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  function updateEdges() {
    const scroller = scrollRef.current
    if (!scroller) return
    const max = scroller.scrollWidth - scroller.clientWidth
    if (max <= 2) {
      setCanLeft(false)
      setCanRight(false)
      return
    }
    setCanLeft(scroller.scrollLeft > 2)
    setCanRight(scroller.scrollLeft < max - 2)
  }

  useEffect(() => {
    const scroller = scrollRef.current
    const activeEl = activeRef.current
    if (!scroller || !activeEl) return
    // На ≥768 табы wrap — докрутка не нужна
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      setCanLeft(false)
      setCanRight(false)
      return
    }
    // LOBBY-FIX: после layout (иначе offsetWidth=0) докрутить активную вкладку в кадр.
    const sync = () => {
      activeEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' })
      updateEdges()
    }
    const raf = window.requestAnimationFrame(() => {
      sync()
      window.setTimeout(sync, 50)
    })
    return () => window.cancelAnimationFrame(raf)
  }, [active])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    updateEdges()
    scroller.addEventListener('scroll', updateEdges, { passive: true })
    window.addEventListener('resize', updateEdges)
    return () => {
      scroller.removeEventListener('scroll', updateEdges)
      window.removeEventListener('resize', updateEdges)
    }
  }, [])

  function nudge(dir: -1 | 1) {
    const scroller = scrollRef.current
    if (!scroller) return
    scroller.scrollBy({ left: dir * Math.max(120, scroller.clientWidth * 0.7), behavior: 'smooth' })
  }

  return (
    <nav className="lobby-hub-tabs" aria-label="Разделы лобби" data-can-left={canLeft || undefined} data-can-right={canRight || undefined}>
      <div className="lobby-hub-tabs__edge lobby-hub-tabs__edge--start" aria-hidden />
      {canLeft ? (
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="lobby-hub-tabs__nudge lobby-hub-tabs__nudge--start"
          aria-label="Предыдущие вкладки"
          onClick={() => nudge(-1)}
        >
          ‹
        </Button>
      ) : null}
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
      {canRight ? (
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="lobby-hub-tabs__nudge lobby-hub-tabs__nudge--end"
          aria-label="Следующие вкладки"
          onClick={() => nudge(1)}
        >
          ›
        </Button>
      ) : null}
      <div className="lobby-hub-tabs__edge lobby-hub-tabs__edge--end" aria-hidden />
    </nav>
  )
}

export const LOBBY_HUB_TABS = TABS
