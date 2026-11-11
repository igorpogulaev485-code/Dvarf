/** C6: рендер текста с @mentions / [[…]]. */
import type { SettingPage } from '../../shared/api/lobbies'
import { Text } from '../../ui'
import { segmentMentionBody } from './settingMentions'

type Props = {
  body: string
  pages: SettingPage[]
  isOwner: boolean
  onOpenPage?: (pageId: string) => void
}

export function SettingMentionBody({ body, pages, isOwner, onOpenPage }: Props) {
  if (!body.trim()) {
    return <Text tone="muted">Пусто.</Text>
  }
  const segments = segmentMentionBody(body, pages, { isOwner })
  return (
    <div className="setting-mention-body">
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.text}</span>
        }
        if (seg.hidden) {
          return (
            <span key={i} className="setting-mention setting-mention--unknown">
              неизвестно
            </span>
          )
        }
        if (seg.page && onOpenPage) {
          return (
            <button
              key={i}
              type="button"
              className="setting-mention"
              onClick={() => onOpenPage(seg.page!.id)}
            >
              {seg.page.title}
            </button>
          )
        }
        return (
          <span key={i} className="setting-mention setting-mention--missing" title="Страница не найдена">
            {seg.title}
          </span>
        )
      })}
    </div>
  )
}
