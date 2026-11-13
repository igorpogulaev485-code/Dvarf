/**
 * T3 / S-01: локация + задействованные страницы; без сеттинга — только «Привязать сеттинг».
 */
import type { SessionLorePage, WikiCombatPage } from '../../shared/api/lobbies'
import { Button, Text } from '../../ui'
import { pageKindLabel, QUEST_STATUS_LABELS, type QuestStatus } from './settingKinds'

type Props = {
  locationPage: SessionLorePage | null
  involvedPages: SessionLorePage[]
  isOwner: boolean
  busy?: boolean
  hasSetting: boolean
  onOpenPage: (pageId: string) => void
  onEdit?: () => void
  onBindSetting?: () => void
  onQuestStatus?: (page: SessionLorePage) => void
  /** W-03: бои под текущей локацией. */
  combatPages?: WikiCombatPage[]
  onPickCombat?: (page: WikiCombatPage) => void
}

function questStatusLabel(status: string | null | undefined): string {
  if (!status) return ''
  return QUEST_STATUS_LABELS[status as QuestStatus] ?? status
}

export function SessionLorePanel({
  locationPage,
  involvedPages,
  isOwner,
  busy,
  hasSetting,
  onOpenPage,
  onEdit,
  onBindSetting,
  onQuestStatus,
  combatPages,
  onPickCombat,
}: Props) {
  if (!hasSetting) {
    if (!isOwner || !onBindSetting) return null
    return (
      <div className="session-lore-panel session-lore-panel--bind" aria-label="Лор сессии">
        <Button type="button" variant="secondary" disabled={busy} onClick={onBindSetting}>
          Привязать сеттинг
        </Button>
      </div>
    )
  }

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
            <span key={p.id} className="session-lore-chip-wrap">
              <button
                type="button"
                className={`session-lore-chip${p.page_kind === 'quest' ? ' session-lore-chip--quest' : ''}`}
                disabled={busy}
                onClick={() => onOpenPage(p.id)}
                title={pageKindLabel(p.page_kind)}
              >
                <span className="session-lore-chip__kind">
                  {pageKindLabel(p.page_kind)}
                  {p.page_kind === 'quest' && p.quest_status
                    ? ` · ${questStatusLabel(p.quest_status)}`
                    : ''}
                </span>
                {p.title}
              </button>
              {isOwner && p.page_kind === 'quest' && onQuestStatus ? (
                <button
                  type="button"
                  className="session-lore-chip__status"
                  disabled={busy}
                  title="Сменить статус квеста"
                  onClick={() => onQuestStatus(p)}
                >
                  статус
                </button>
              ) : null}
            </span>
          ))}
        </div>
      )}
      {combatPages && combatPages.length > 0 && onPickCombat ? (
        <div className="session-lore-panel__combats">
          <Text as="h4" className="session-lore-panel__title">
            Бои этой локации
          </Text>
          <div className="session-lore-panel__chips">
            {combatPages.map((p) => (
              <button
                key={p.id}
                type="button"
                className="session-lore-chip"
                disabled={busy}
                title={p.parent_title ? `под «${p.parent_title}»` : 'Бой из вики'}
                onClick={() => onPickCombat(p)}
              >
                <span className="session-lore-chip__kind">бой</span>
                {p.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
