/**
 * T3: локация + задействованные страницы на сессии; клик → превью.
 */
import type { SessionLorePage } from '../../shared/api/lobbies'
import { Button, Text } from '../../ui'
import { pageKindLabel } from './settingKinds'

type Props = {
  locationPage: SessionLorePage | null
  involvedPages: SessionLorePage[]
  isOwner: boolean
  busy?: boolean
  hasSetting: boolean
  onOpenPage: (pageId: string) => void
  onEdit?: () => void
}

export function SessionLorePanel({
  locationPage,
  involvedPages,
  isOwner,
  busy,
  hasSetting,
  onOpenPage,
  onEdit,
}: Props) {
  if (!hasSetting) return null
  const empty = !locationPage && involvedPages.length === 0
  if (empty && !isOwner) return null

  return (
    <div className="session-lore-panel" aria-label="Лор сессии">
      <div className="session-lore-panel__head">
        <Text as="h3" className="session-lore-panel__title">
          Лор за столом
        </Text>
        {isOwner && onEdit ? (
          <Button type="button" variant="ghost" disabled={busy} onClick={onEdit}>
            {empty ? 'Привязать' : 'Изменить'}
          </Button>
        ) : null}
      </div>
      {empty ? (
        <Text tone="muted">Локация и НПС/квесты сессии — для превью без ухода в вики.</Text>
      ) : (
        <div className="session-lore-panel__chips">
          {locationPage ? (
            <button
              type="button"
              className="session-lore-chip session-lore-chip--location"
              disabled={busy}
              onClick={() => onOpenPage(locationPage.id)}
              title={`Локация · ${pageKindLabel(locationPage.page_kind)}`}
            >
              <span className="session-lore-chip__kind">локация</span>
              {locationPage.title}
            </button>
          ) : null}
          {involvedPages.map((p) => (
            <button
              key={p.id}
              type="button"
              className="session-lore-chip"
              disabled={busy}
              onClick={() => onOpenPage(p.id)}
              title={pageKindLabel(p.page_kind)}
            >
              <span className="session-lore-chip__kind">
                {pageKindLabel(p.page_kind)}
              </span>
              {p.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
