/**
 * /dev/sc05-gm-toolbar-preview — tip-каркас тулбара мастера SC-05 для скринов (без бэкенда).
 * ?setting=1 — сеттинг привязан · ?combat=1 — бой идёт
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SessionLorePanel } from '../features/lobby/SessionLorePanel'
import type { SessionLorePage, SessionSeat } from '../shared/api/lobbies'
import { Button, Panel, Stack, Text } from '../ui'

const SEATS: SessionSeat[] = [
  {
    character_id: 'c1',
    character_name: 'Араин',
    character_level: 5,
    character_class_name: 'Следопыт',
    character_race_name: 'Эльф',
    hp_current: 38,
    hp_max: 44,
    ac: 16,
    conditions: [],
    effects: [],
    companions: [],
    seated_at: '2026-11-13T10:00:00Z',
  },
  {
    character_id: 'c2',
    character_name: 'Моррен',
    character_level: 5,
    character_class_name: 'Клирик',
    character_race_name: 'Дварф',
    hp_current: 40,
    hp_max: 40,
    ac: 18,
    conditions: [],
    effects: [],
    companions: [],
    seated_at: '2026-11-13T10:00:00Z',
  },
]

const LOCATION: SessionLorePage = {
  id: 'loc1',
  title: 'Таверна «Медный котёл»',
  page_kind: 'location',
  revealed: true,
  quest_status: null,
}

export function Sc05GmToolbarPreviewPage() {
  const [params] = useSearchParams()
  const hasSetting = params.get('setting') !== '0'
  const combatActive = params.get('combat') === '1'
  const [toast, setToast] = useState('')

  return (
    <main className="page page--app page--lobby-hub" data-sc05-preview>
      <Stack gap={14}>
        <Text tone="muted">
          /dev/sc05-gm-toolbar-preview · мастер · SC-05
          {combatActive ? ' · бой' : ''}
          {hasSetting ? ' · сеттинг' : ' · без сеттинга'}
        </Text>
        {toast ? (
          <p className="ui-text" role="status">
            {toast}
          </p>
        ) : null}
        <Panel title="Живой стол — тулбар мастера">
          <div className="session-live-desk">
            <div className={`session-live-desk__center session-center--master-desk`}>
              <Stack gap={12}>
                <div
                  className="session-center-slot session-center-slot--master-hint session-master-mobile-hint"
                  role="note"
                >
                  С телефона — бой и враги; награды и вики — в меню
                </div>

                <div className="session-center-slot session-center-slot--lore">
                  <SessionLorePanel
                    hasSetting={hasSetting}
                    settingName={hasSetting ? 'Забытые королевства' : null}
                    locationPage={hasSetting ? LOCATION : null}
                    involvedPages={[]}
                    isOwner
                    compact
                    onOpenPage={() => setToast('Превью страницы лора')}
                    onEdit={() => setToast('Локация / лор')}
                    onBindSetting={() => setToast('Привязать сеттинг')}
                  />
                </div>

                <div
                  className="session-center-slot session-center-slot--toolbar session-table-toolbar session-table-toolbar--master"
                  data-onboarding="lobby-master-toolbar"
                  data-sc05-gm-toolbar
                >
                  <div
                    className="session-toolbar-group session-toolbar-group--primary"
                    aria-label="Бой"
                    data-sc05-primary
                  >
                    {!combatActive ? (
                      <Button type="button" variant="primary" onClick={() => setToast('Старт боя')}>
                        Бой
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => setToast('Завершить бой')}
                      >
                        Завершить бой
                      </Button>
                    )}
                    <Button type="button" variant="secondary" onClick={() => setToast('+ Враги')}>
                      + Враги
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="session-toolbar-mobile-only"
                      onClick={() => setToast('Кто пришёл')}
                    >
                      Кто пришёл
                    </Button>
                  </div>

                  <details
                    className={`session-toolbar-more session-toolbar-rewards${
                      !combatActive ? ' session-toolbar-group--rewards-spotlight' : ''
                    }`}
                    data-sc05-rewards
                  >
                    <summary className="session-toolbar-more__summary">Награды</summary>
                    <div className="session-toolbar-more__body">
                      <div className="session-toolbar-group" aria-label="Награды">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setToast('Опыт')}
                        >
                          Опыт
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setToast('Добыча')}
                        >
                          Добыча
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setToast('Выдать')}
                        >
                          Выдать
                        </Button>
                      </div>
                    </div>
                  </details>

                  <details className="session-toolbar-more" data-sc05-more>
                    <summary className="session-toolbar-more__summary">Ещё действия</summary>
                    <div className="session-toolbar-more__body">
                      <Text
                        tone="muted"
                        className="session-toolbar-mobile-only session-toolbar-more__desk-note"
                      >
                        Генератор и вики удобнее с компьютера.
                      </Text>
                      <div className="session-toolbar-group" aria-label="Сюжет и вики">
                        <span className="session-toolbar-group__caption">Сюжет</span>
                        <Button type="button" variant="secondary" onClick={() => setToast('Из вики')}>
                          Из вики
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setToast('Генератор')}
                        >
                          Генератор
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setToast('Настройки стола')}
                        >
                          Настройки стола
                        </Button>
                      </div>
                    </div>
                  </details>
                </div>

                <div className="session-center-slot session-center-slot--cards">
                  <div className="session-table-grid">
                    {SEATS.map((seat) => (
                      <div key={seat.character_id} className="session-table-card">
                        <Text as="h3" className="session-table-card__name">
                          {seat.character_name}
                        </Text>
                        <Text tone="muted">
                          {seat.character_class_name} {seat.character_level}
                        </Text>
                        <Text>
                          HP {seat.hp_current}/{seat.hp_max} · КД {seat.ac}
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>
              </Stack>
            </div>
          </div>
        </Panel>
      </Stack>
    </main>
  )
}
