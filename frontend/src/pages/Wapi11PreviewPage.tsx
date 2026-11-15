/**
 * /dev/wapi11-preview — кадры W-API-11 без бэкенда (kit only).
 * ?scene=entry|upload|review|characters|toggle|confirm|status
 * ?narrow=1 — узкий статус (390).
 * Нейтральные выдуманные имена (не учебный мир).
 */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Button,
  Dialog,
  Field,
  Input,
  Panel,
  SegmentedControl,
  Stack,
  Text,
  ToggleChip,
} from '../ui'
import {
  DIFF_STATUS_LABELS,
  REVIEW_FILTER_LABELS,
  filterDiffEntries,
  groupReviewEntries,
  jobStatusBanner,
  type WorldImportReviewFilter,
} from '../features/lobby/worldImportReview'
import type { WorldImportDiffEntry, WorldImportJob } from '../shared/api/worldImports'

const FIXTURE_JOB: WorldImportJob = {
  id: 'job-1',
  setting_id: 'set-1',
  lobby_id: 'lob-1',
  author_id: 'u-1',
  status: 'ready_for_review',
  rules_edition: '2014',
  source_kind: 'zip',
  idempotency_key: null,
  source_ref: 'demo-world.zip',
  last_confirmed_at: null,
  created_at: '2026-11-15T12:00:00Z',
  updated_at: '2026-11-15T12:05:00Z',
}

const FIXTURE_ENTRIES: WorldImportDiffEntry[] = [
  {
    draft_item_id: 'd1',
    source_key: 'world/locations/quiet-harbor.md',
    item_type: 'location',
    status: 'new',
    title: 'Тихая гавань',
    page_id: null,
    message: 'Новая локация',
    hint: '',
  },
  {
    draft_item_id: 'd2',
    source_key: 'world/npcs/old-miller.md',
    item_type: 'npc',
    status: 'conflict',
    title: 'Старый мельник',
    page_id: null,
    message: 'Конфликт: правили и источник, и канон',
    hint: 'Нужно решение: «взять наше» или «взять из источника»',
  },
  {
    draft_item_id: 'd3',
    source_key: 'world/player-books/chapters/harbor-tales-01.md',
    item_type: 'player_book_chapter',
    status: 'new',
    title: 'Сказки гавани',
    page_id: null,
    message: '',
    hint: '',
  },
  {
    draft_item_id: 'd4',
    source_key: 'world/player-books/chapters/harbor-tales-02.md',
    item_type: 'player_book_chapter',
    status: 'update',
    title: 'Другая глава',
    page_id: null,
    message: '',
    hint: '',
  },
  {
    draft_item_id: 'd5',
    source_key: 'campaign/party/characters/mira.md',
    item_type: 'party_character',
    status: 'new',
    title: 'Мира',
    page_id: null,
    message: 'Персонаж партии + PDF',
    hint: 'Пустые поля листа: Предыстория',
  },
  {
    draft_item_id: 'd6',
    source_key: 'world/lore/copper-compass.md',
    item_type: 'ai_suggestion',
    status: 'ai_suggestion',
    title: 'Медный компас?',
    page_id: null,
    message: 'Предложение из прозы',
    hint: 'Решает мастер',
  },
  {
    draft_item_id: null,
    source_key: 'world/npcs/gone.md',
    item_type: 'npc',
    status: 'missing_in_source',
    title: 'Пропал',
    page_id: null,
    message: 'Нет в источнике',
    hint: 'Сами не удаляем',
  },
]

export function Wapi11PreviewPage() {
  const [params] = useSearchParams()
  const scene = (params.get('scene') || 'entry') as string
  const narrow = params.get('narrow') === '1'
  const [filter, setFilter] = useState<WorldImportReviewFilter>(
    scene === 'characters' ? 'character' : 'all',
  )
  const [aiOn, setAiOn] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(scene === 'confirm')
  const [undoOpen, setUndoOpen] = useState(false)
  const [aiWarnOpen, setAiWarnOpen] = useState(scene === 'toggle')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    'book:world/player-books/chapters': true,
  })

  const banner = jobStatusBanner(
    scene === 'status' && params.get('done') === '1'
      ? { ...FIXTURE_JOB, status: 'confirmed', last_confirmed_at: '2026-11-15T13:00:00Z' }
      : FIXTURE_JOB,
  )

  const filtered = useMemo(() => filterDiffEntries(FIXTURE_ENTRIES, filter), [filter])
  const groups = useMemo(() => groupReviewEntries(filtered), [filtered])

  const filterOptions = (Object.keys(REVIEW_FILTER_LABELS) as WorldImportReviewFilter[]).map(
    (id) => ({ id, label: REVIEW_FILTER_LABELS[id] }),
  )

  return (
    <main
      className="page page--app"
      data-wapi11-preview
      data-scene={scene}
      data-narrow={narrow || undefined}
    >
      <Stack gap={16}>
        <Text tone="muted">
          /dev/wapi11-preview · W-API-11 · {scene}
          {narrow ? ' · узкий' : ' · 1440'}
        </Text>

        {(scene === 'entry' || scene === 'upload' || scene === 'status') && (
          <Panel title="Сеттинг">
            <Stack gap={12}>
              <Field label="Название">
                <Input value="Северный берег" readOnly />
              </Field>
              <div className="inline-actions">
                <Button type="button" variant="secondary">
                  Открыть сессию в этом сеттинге
                </Button>
                <Button type="button" variant="secondary">
                  Залить мир
                </Button>
              </div>
            </Stack>
          </Panel>
        )}

        {(scene === 'status' || narrow) && (
          <Panel title="Импорт мира">
            <Stack gap={12}>
              <Text tone={banner.tone}>{banner.text}</Text>
              <Text tone="muted">Правила 2014. Полная сверка — на широком экране.</Text>
            </Stack>
          </Panel>
        )}

        {!narrow && (scene === 'upload' || scene === 'entry') && (
          <Panel title="Залить мир">
            <Stack gap={16}>
              <Text>
                Черновик сверки для этого сеттинга. Правила <strong>2014</strong>.
              </Text>
              <Text tone={banner.tone}>{banner.text}</Text>
              <Stack gap={8}>
                <Text as="h3">Zip или файлы</Text>
                <div className="inline-actions">
                  <Button type="button" variant="secondary">
                    Загрузить zip
                  </Button>
                </div>
              </Stack>
              <Field label="Публичная git-ссылка (HTTPS)">
                <Input value="https://github.com/example/world" readOnly />
              </Field>
              <div className="inline-actions">
                <Button type="button" variant="secondary">
                  Залить по ссылке
                </Button>
              </div>
              <Stack gap={8}>
                <Text as="h3">MCP по адресу</Text>
                <Field label="Адрес MCP">
                  <Input value="https://creed20.tech/mcp/world-import" readOnly />
                </Field>
                <div className="inline-actions">
                  <Button type="button" variant="secondary">
                    Как подключить API и MCP →
                  </Button>
                </div>
              </Stack>
            </Stack>
          </Panel>
        )}

        {!narrow && (scene === 'upload' || scene === 'toggle') && (
          <Panel title="Токен API импорта">
            <Stack gap={12}>
              <Text tone="warn">Скопируйте сейчас — больше секрет не покажем:</Text>
              <Field label="Секрет">
                <Input value="wapi_••••••••••••••••" readOnly />
              </Field>
              <div className="inline-actions">
                <Button type="button">Выписать токен</Button>
              </div>
              <div className="list-row">
                <div>
                  <Text>
                    <code>wapi_ab12…</code>
                  </Text>
                  <Text tone="muted">создан 15.11.2026</Text>
                </div>
                <div className="list-row__actions">
                  <Button type="button" variant="danger" size="sm">
                    Отозвать
                  </Button>
                </div>
              </div>
            </Stack>
          </Panel>
        )}

        {!narrow && (scene === 'toggle' || scene === 'confirm' || scene === 'review') && (
          <Panel title="Автоподтверждение ИИ">
            <Stack gap={12}>
              <ToggleChip
                main="ИИ может подтверждать"
                rest={aiOn ? 'Включено — пишет в журнал' : 'Выключено по умолчанию'}
                checked={aiOn}
                onChange={(next) => {
                  if (next) setAiWarnOpen(true)
                  else setAiOn(false)
                }}
              />
              <Text tone="muted">Токен API этот тумблер не включает.</Text>
            </Stack>
          </Panel>
        )}

        {!narrow &&
          (scene === 'review' || scene === 'characters' || scene === 'confirm') && (
            <Panel title="Сверка" titleAside={<Text tone="muted">zip · правила 2014</Text>}>
              <Stack gap={14}>
                <SegmentedControl
                  aria-label="Фильтр сверки"
                  size="sm"
                  options={filterOptions}
                  value={filter}
                  onChange={setFilter}
                />
                {groups.map((group) => {
                  const isCollapsed = collapsed[group.id] ?? group.collapsedByDefault
                  return (
                    <Stack gap={8} key={group.id}>
                      <div className="inline-actions">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setCollapsed((prev) => ({ ...prev, [group.id]: !isCollapsed }))
                          }
                        >
                          {isCollapsed ? '▸' : '▾'} {group.title}
                        </Button>
                      </div>
                      {!isCollapsed
                        ? group.entries.map((entry) => (
                            <div className="list-row" key={entry.source_key}>
                              <div>
                                <Text>
                                  {entry.title}{' '}
                                  <Text as="span" tone="muted">
                                    · {DIFF_STATUS_LABELS[entry.status]}
                                  </Text>
                                </Text>
                                {entry.message ? <Text tone="muted">{entry.message}</Text> : null}
                                {entry.hint ? <Text tone="muted">{entry.hint}</Text> : null}
                                {entry.status === 'conflict' ? (
                                  <div className="inline-actions">
                                    <Button type="button" size="sm" variant="secondary">
                                      Оставить наше
                                    </Button>
                                    <Button type="button" size="sm">
                                      Взять из источника
                                    </Button>
                                  </div>
                                ) : null}
                                {entry.status === 'ai_suggestion' ? (
                                  <div className="inline-actions">
                                    <ToggleChip
                                      main="Принять"
                                      rest="в подтверждение"
                                      checked={false}
                                      onChange={() => undefined}
                                    />
                                    <Button type="button" size="sm" variant="danger">
                                      Отклонить
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))
                        : null}
                    </Stack>
                  )
                })}
                <div className="inline-actions">
                  <Button type="button" onClick={() => setConfirmOpen(true)}>
                    Подтвердить
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setUndoOpen(true)}>
                    Отменить подтверждение
                  </Button>
                </div>
              </Stack>
            </Panel>
          )}

        <Panel title="Кто подтвердил">
          <div className="list-row">
            <div>
              <Text>Мастер</Text>
              <Text tone="muted">15.11.2026, 16:40</Text>
            </div>
          </div>
        </Panel>
      </Stack>

      <Dialog
        open={confirmOpen && scene !== 'toggle'}
        title="Подтвердить заливку?"
        primaryLabel="Да, записать в вики"
        secondaryLabel="Назад"
        onPrimary={() => setConfirmOpen(false)}
        onSecondary={() => setConfirmOpen(false)}
      >
        <Stack gap={8}>
          <Text>Черновик станет страницами сеттинга. Игрокам ничего само не раскроется.</Text>
          <Text tone="muted">Правила 2014. Это действие можно потом отменить.</Text>
        </Stack>
      </Dialog>

      <Dialog
        open={undoOpen}
        title="Отменить подтверждение?"
        primaryLabel="Да, откатить"
        secondaryLabel="Оставить"
        primaryVariant="danger"
        onPrimary={() => setUndoOpen(false)}
        onSecondary={() => setUndoOpen(false)}
      >
        <Text>Последнее подтверждение будет отменено.</Text>
      </Dialog>

      <Dialog
        open={aiWarnOpen}
        title="Включить автоподтверждение ИИ?"
        primaryLabel="Включить"
        secondaryLabel="Оставить выкл."
        primaryVariant="danger"
        onPrimary={() => {
          setAiOn(true)
          setAiWarnOpen(false)
        }}
        onSecondary={() => setAiWarnOpen(false)}
      >
        <Stack gap={8}>
          <Text>ИИ с токеном сможет сам подтверждать заливку в канон.</Text>
          <Text tone="warn">Включайте только если доверяете подключению. По умолчанию выключено.</Text>
        </Stack>
      </Dialog>
    </main>
  )
}
