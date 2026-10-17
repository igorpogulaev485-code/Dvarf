import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import { SettingMentionBody } from '../features/lobby/SettingMentionBody'
import { SettingQuickCreateDialog } from '../features/lobby/SettingQuickCreateDialog'
import {
  QUEST_STATUS_LABELS,
  SETTING_PAGE_KIND_LABELS,
  SETTING_PAGE_KINDS,
  pageKindLabel,
  type QuestStatus,
  type SettingPageKind,
} from '../features/lobby/settingKinds'
import {
  buildSettingPageTree,
  filterSettingPages,
  linksForPage,
  templateForPage,
  type SettingPageNode,
} from '../features/lobby/settingPages'
import { ApiRequestError } from '../shared/api/client'
import {
  bulkCreateSettingPages,
  createSession,
  createSettingPage,
  createSettingPageLink,
  deleteSettingPage,
  deleteSettingPageLink,
  getSetting,
  updateSetting,
  updateSettingPage,
  type SettingDetail,
  type SettingPageTemplateField,
} from '../shared/api/lobbies'
import { Button, Field, Input, Panel, Stack, Text, Toast } from '../ui'

export function SettingDetailPage() {
  const { settingId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const pageFromQuery = searchParams.get('page')
  const navigate = useNavigate()
  const [setting, setSetting] = useState<SettingDetail | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [draftGmBody, setDraftGmBody] = useState('')
  const [draftFields, setDraftFields] = useState<Record<string, string>>({})
  const [draftKind, setDraftKind] = useState<SettingPageKind>('note')
  const [draftQuestStatus, setDraftQuestStatus] = useState<QuestStatus | ''>('')
  const [settingName, setSettingName] = useState('')
  const [linkTargetId, setLinkTargetId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<SettingPageKind | 'all'>('all')
  const [quickOpen, setQuickOpen] = useState(false)
  const [createMissingMentions, setCreateMissingMentions] = useState(false)
  const [bodyPreview, setBodyPreview] = useState(false)

  const filteredPages = useMemo(
    () =>
      filterSettingPages(setting?.pages ?? [], {
        query: searchQuery,
        kind: kindFilter,
      }),
    [setting?.pages, searchQuery, kindFilter],
  )

  const tree = useMemo(() => buildSettingPageTree(filteredPages), [filteredPages])

  const selected = useMemo(
    () => setting?.pages.find((p) => p.id === selectedId) ?? null,
    [setting, selectedId],
  )

  const activeTemplate = useMemo(
    () => templateForPage(setting?.templates ?? [], selected),
    [setting?.templates, selected],
  )

  const pageLinks = useMemo(
    () => linksForPage(setting?.links ?? [], selectedId ?? ''),
    [setting?.links, selectedId],
  )

  const linkCandidates = useMemo(() => {
    if (!setting || !selectedId) return []
    const linked = new Set(
      (setting.links ?? [])
        .filter((l) => l.from_page_id === selectedId)
        .map((l) => l.to_page_id),
    )
    return setting.pages.filter((p) => p.id !== selectedId && !linked.has(p.id))
  }, [setting, selectedId])

  useEffect(() => {
    let active = true
    getSetting(settingId)
      .then((item) => {
        if (!active) return
        setSetting(item)
        setSettingName(item.name)
        const fromQuery =
          pageFromQuery && item.pages.some((p) => p.id === pageFromQuery)
            ? pageFromQuery
            : null
        const first = fromQuery ?? item.pages[0]?.id ?? null
        setSelectedId(first)
        const page = item.pages.find((p) => p.id === first)
        applyDraftFromPage(page ?? null)
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiRequestError && err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(err instanceof ApiRequestError ? err.message : 'Сеттинг не найден')
      })
    return () => {
      active = false
    }
  }, [navigate, settingId, pageFromQuery])

  useEffect(() => {
    if (!selected) return
    applyDraftFromPage(selected)
    setLinkTargetId('')
  }, [selected?.id])

  function applyDraftFromPage(page: SettingDetail['pages'][number] | null) {
    setDraftTitle(page?.title ?? '')
    setDraftBody(page?.body ?? '')
    setDraftGmBody(page?.gm_body ?? '')
    setDraftKind(page?.page_kind ?? 'note')
    setDraftQuestStatus(page?.quest_status ?? '')
    const nextFields: Record<string, string> = {}
    for (const [k, v] of Object.entries(page?.fields ?? {})) {
      nextFields[k] = v == null ? '' : String(v)
    }
    setDraftFields(nextFields)
  }

  function applyDetail(next: SettingDetail, preferPageId?: string | null) {
    setSetting(next)
    setSettingName(next.name)
    const pick =
      (preferPageId && next.pages.some((p) => p.id === preferPageId) && preferPageId) ||
      (selectedId && next.pages.some((p) => p.id === selectedId) && selectedId) ||
      next.pages[0]?.id ||
      null
    setSelectedId(pick)
    const page = next.pages.find((p) => p.id === pick)
    applyDraftFromPage(page ?? null)
  }

  async function saveMeta(e: FormEvent) {
    e.preventDefault()
    if (!setting) return
    setBusy(true)
    setError(null)
    try {
      await updateSetting(setting.id, { name: settingName })
      const next = await getSetting(setting.id)
      applyDetail(next, selectedId)
      setToast('Название сохранено')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  async function savePage() {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const next = await updateSettingPage(selected.id, {
        title: draftTitle,
        body: draftBody,
        gm_body: draftGmBody,
        page_kind: draftKind,
        fields: draftFields,
        quest_status: draftKind === 'quest' ? draftQuestStatus || 'planned' : undefined,
        clear_quest_status: draftKind !== 'quest',
        create_missing_mentions: createMissingMentions,
      })
      applyDetail(next, selected.id)
      setToast('Страница сохранена')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить страницу')
    } finally {
      setBusy(false)
    }
  }

  async function addPage(parentId: string | null) {
    if (!setting) return
    setBusy(true)
    setError(null)
    try {
      const next = await createSettingPage(setting.id, {
        title: parentId ? 'Новый раздел' : 'Новая страница',
        body: '',
        parent_id: parentId,
        page_kind: 'note',
      })
      const created = next.pages
        .filter((p) => p.parent_id === parentId)
        .sort((a, b) => b.sort_order - a.sort_order)[0]
      applyDetail(next, created?.id ?? null)
      setToast('Страница добавлена')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось добавить')
    } finally {
      setBusy(false)
    }
  }

  async function handleQuickCreate(payload: {
    page_kind: SettingPageKind
    template_id: string | null
    parent_id: string | null
    titles: string[]
  }) {
    if (!setting) return
    setBusy(true)
    setError(null)
    try {
      let next: SettingDetail
      if (payload.titles.length === 1) {
        next = await createSettingPage(setting.id, {
          title: payload.titles[0],
          parent_id: payload.parent_id,
          page_kind: payload.page_kind,
          template_id: payload.template_id,
        })
      } else {
        next = await bulkCreateSettingPages(setting.id, {
          titles: payload.titles,
          parent_id: payload.parent_id,
          page_kind: payload.page_kind,
          template_id: payload.template_id,
        })
      }
      const created = next.pages
        .filter((p) => payload.titles.includes(p.title))
        .sort((a, b) => b.sort_order - a.sort_order)[0]
      applyDetail(next, created?.id ?? null)
      setQuickOpen(false)
      setToast(
        payload.titles.length > 1
          ? `Создано: ${payload.titles.length}`
          : 'Страница создана',
      )
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось создать')
    } finally {
      setBusy(false)
    }
  }

  async function removePage() {
    if (!selected || !setting) return
    if (setting.pages.length <= 1) {
      setToast('Нельзя удалить последнюю страницу')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const next = await deleteSettingPage(selected.id)
      applyDetail(next, null)
      setToast('Страница удалена')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось удалить')
    } finally {
      setBusy(false)
    }
  }

  async function addLink() {
    if (!selected || !linkTargetId) return
    setBusy(true)
    setError(null)
    try {
      const next = await createSettingPageLink(selected.id, { to_page_id: linkTargetId })
      applyDetail(next, selected.id)
      setLinkTargetId('')
      setToast('Связь добавлена')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось связать')
    } finally {
      setBusy(false)
    }
  }

  async function removeLink(linkId: string) {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const next = await deleteSettingPageLink(linkId)
      applyDetail(next, selected.id)
      setToast('Связь удалена')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось удалить связь')
    } finally {
      setBusy(false)
    }
  }

  async function setRevealed(revealed: boolean, subtree: boolean) {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const next = await updateSettingPage(selected.id, {
        revealed,
        reveal_subtree: subtree,
      })
      applyDetail(next, selected.id)
      setToast(
        subtree
          ? revealed
            ? 'Ветка раскрыта игрокам'
            : 'Ветка скрыта'
          : revealed
            ? 'Страница раскрыта игрокам'
            : 'Страница скрыта',
      )
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось изменить видимость')
    } finally {
      setBusy(false)
    }
  }

  const isOwner = setting?.is_owner ?? false
  const schemaFields: SettingPageTemplateField[] = activeTemplate?.schema ?? []

  if (!setting && !error) {
    return (
      <main className="page page--app">
        <Text tone="muted">Загрузка…</Text>
      </main>
    )
  }

  if (!setting) {
    return (
      <main className="page page--app">
        <Text tone="danger">{error}</Text>
      </main>
    )
  }

  return (
    <main className="page page--app">
      <Stack gap={20}>
        <AppHeader
          title={setting.name}
          subtitle={isOwner ? 'Сеттинг — вики мира' : 'Сеттинг — раскрытые страницы'}
          onOfficialSite={() => setToast('Официальный сайт скоро появится')}
        />
        <Text>
          <Link to={`/lobbies/${setting.lobby_id}`}>← В лобби</Link>
        </Text>
        {error ? <Text tone="danger">{error}</Text> : null}

        <Panel title="Сеттинг">
          {isOwner ? (
            <form className="stack-form" onSubmit={saveMeta}>
              <Field label="Название">
                <Input value={settingName} onChange={(e) => setSettingName(e.target.value)} />
              </Field>
              <div className="inline-actions">
                <Button type="submit" disabled={busy}>
                  Сохранить название
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      const session = await createSession(setting.lobby_id, {
                        setting_id: setting.id,
                        name: `${setting.name} — сессия`,
                      })
                      navigate(`/sessions/${session.id}`)
                    } catch (err) {
                      setError(
                        err instanceof ApiRequestError
                          ? err.message
                          : 'Не удалось открыть сессию',
                      )
                      setBusy(false)
                    }
                  }}
                >
                  Открыть сессию в этом сеттинге
                </Button>
              </div>
            </form>
          ) : (
            <Text tone="muted">Мастер ещё не раскрыл всё — ниже только то, что видно игрокам.</Text>
          )}
        </Panel>

        <div className="setting-wiki">
          <aside className="setting-wiki__nav">
            <div className="setting-wiki__nav-head">
              <Text as="h3">Страницы</Text>
              {isOwner ? (
                <div className="inline-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setQuickOpen(true)}
                  >
                    Быстро
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void addPage(null)}
                  >
                    + Корень
                  </Button>
                </div>
              ) : null}
            </div>
            <Field label="Поиск">
              <Input
                value={searchQuery}
                placeholder="Название…"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Field>
            <div className="setting-wiki-kind-filters" role="group" aria-label="Тип страницы">
              <button
                type="button"
                className={`setting-wiki-kind-chip${kindFilter === 'all' ? ' is-on' : ''}`}
                onClick={() => setKindFilter('all')}
              >
                Все
              </button>
              {SETTING_PAGE_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={`setting-wiki-kind-chip${kindFilter === kind ? ' is-on' : ''}`}
                  onClick={() => setKindFilter(kind)}
                >
                  {SETTING_PAGE_KIND_LABELS[kind]}
                </button>
              ))}
            </div>
            {tree.length === 0 ? (
              <Text tone="muted">
                {searchQuery || kindFilter !== 'all'
                  ? 'Ничего не найдено.'
                  : 'Пока ничего не раскрыто.'}
              </Text>
            ) : (
              <ul className="setting-wiki-tree">
                {tree.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    selectedId={selectedId}
                    busy={busy}
                    isOwner={isOwner}
                    onSelect={(id) => setSelectedId(id)}
                    onAddChild={(id) => void addPage(id)}
                  />
                ))}
              </ul>
            )}
          </aside>

          <section className="setting-wiki__editor">
            {selected ? (
              <Stack gap={12}>
                <Field label="Заголовок страницы">
                  <Input
                    value={draftTitle}
                    disabled={busy || !isOwner}
                    onChange={(e) => setDraftTitle(e.target.value)}
                  />
                </Field>
                {isOwner ? (
                  <Field label="Тип">
                    <select
                      className="ui-input"
                      value={draftKind}
                      disabled={busy}
                      onChange={(e) => {
                        const next = e.target.value as SettingPageKind
                        setDraftKind(next)
                        if (next === 'quest' && !draftQuestStatus) {
                          setDraftQuestStatus('planned')
                        }
                      }}
                    >
                      {SETTING_PAGE_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {SETTING_PAGE_KIND_LABELS[kind]}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <Text tone="muted">Тип: {pageKindLabel(selected.page_kind)}</Text>
                )}
                {draftKind === 'quest' || selected.page_kind === 'quest' ? (
                  <Field label="Статус квеста">
                    <select
                      className="ui-input"
                      value={draftQuestStatus || selected.quest_status || 'planned'}
                      disabled={busy || !isOwner}
                      onChange={(e) =>
                        setDraftQuestStatus(e.target.value as QuestStatus)
                      }
                    >
                      {(Object.keys(QUEST_STATUS_LABELS) as QuestStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {QUEST_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
                {schemaFields.length > 0 ? (
                  <div className="setting-wiki-fields">
                    <Text as="h3">Поля шаблона</Text>
                    {schemaFields.map((field) => {
                      if (!isOwner && field.gm_only) return null
                      const value = draftFields[field.key] ?? ''
                      return (
                        <Field
                          key={field.key}
                          label={
                            field.gm_only ? `${field.label} (мастер)` : field.label
                          }
                        >
                          {field.type === 'long' ? (
                            <textarea
                              className="ui-input ui-textarea"
                              rows={3}
                              value={value}
                              disabled={busy || !isOwner}
                              onChange={(e) =>
                                setDraftFields((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                            />
                          ) : field.type === 'select' && field.options?.length ? (
                            <select
                              className="ui-input"
                              value={value}
                              disabled={busy || !isOwner}
                              onChange={(e) =>
                                setDraftFields((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                            >
                              <option value="">—</option>
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={value}
                              disabled={busy || !isOwner}
                              onChange={(e) =>
                                setDraftFields((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                            />
                          )}
                        </Field>
                      )
                    })}
                  </div>
                ) : null}
                <Field
                  label="Текст"
                  hint={
                    isOwner
                      ? '@Имя или [[Точное название]] — ссылка на страницу; скрытое → «неизвестно» у игрока'
                      : undefined
                  }
                >
                  {isOwner && !bodyPreview ? (
                    <textarea
                      className="ui-input ui-textarea"
                      rows={10}
                      value={draftBody}
                      disabled={busy}
                      onChange={(e) => setDraftBody(e.target.value)}
                      placeholder={'География…\nУпоминание: @Капитан_Вера или [[Рассветный порт]]'}
                    />
                  ) : (
                    <SettingMentionBody
                      body={isOwner ? draftBody : selected.body}
                      pages={setting.pages}
                      isOwner={isOwner}
                      onOpenPage={(id) => setSelectedId(id)}
                    />
                  )}
                </Field>
                {isOwner ? (
                  <div className="inline-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setBodyPreview((v) => !v)}
                    >
                      {bodyPreview ? 'Редактировать текст' : 'Превью упоминаний'}
                    </Button>
                    <label className="setting-wiki-reveal__toggle">
                      <input
                        type="checkbox"
                        checked={createMissingMentions}
                        disabled={busy}
                        onChange={(e) => setCreateMissingMentions(e.target.checked)}
                      />
                      <span>Создавать отсутствующие @упоминания</span>
                    </label>
                  </div>
                ) : null}

                {isOwner ? (
                  <div className="setting-wiki-gm-block">
                    <Field
                      label="Заметки мастера"
                      hint="Видно только тебе — даже если страница раскрыта игрокам"
                    >
                      <textarea
                        className="ui-input ui-textarea"
                        rows={5}
                        value={draftGmBody}
                        disabled={busy}
                        onChange={(e) => setDraftGmBody(e.target.value)}
                        placeholder="Секреты, статусы, что сказать за столом…"
                      />
                    </Field>
                  </div>
                ) : null}
                {isOwner ? (
                  <>
                    <div className="setting-wiki-reveal">
                      <label className="setting-wiki-reveal__toggle">
                        <input
                          type="checkbox"
                          checked={selected.revealed}
                          disabled={busy}
                          onChange={(e) => void setRevealed(e.target.checked, false)}
                        />
                        <span>Раскрыто игрокам</span>
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void setRevealed(!selected.revealed, true)}
                      >
                        {selected.revealed ? 'Скрыть ветку' : 'Раскрыть ветку'}
                      </Button>
                    </div>
                    <div className="inline-actions">
                      <Button type="button" disabled={busy} onClick={() => void savePage()}>
                        Сохранить страницу
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void addPage(selected.id)}
                      >
                        + Дочерняя
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy || setting.pages.length <= 1}
                        onClick={() => void removePage()}
                      >
                        Удалить
                      </Button>
                    </div>
                  </>
                ) : null}

                <div className="setting-wiki-links">
                  <Text as="h3">Связи →</Text>
                  {pageLinks.outgoing.length === 0 ? (
                    <Text tone="muted">Пока нет переходов с этой страницы.</Text>
                  ) : (
                    <ul className="setting-wiki-links__list">
                      {pageLinks.outgoing.map((link) => (
                        <li
                          key={link.id}
                          className={`setting-wiki-links__row${
                            link.kind === 'mention' ? ' is-mention' : ''
                          }`}
                        >
                          <button
                            type="button"
                            className="setting-wiki-links__jump"
                            disabled={busy}
                            onClick={() => setSelectedId(link.to_page_id)}
                            title={link.kind === 'mention' ? 'Из текста (@ / [[…]])' : undefined}
                          >
                            {link.kind === 'mention' ? '@ ' : ''}
                            {link.label || link.to_title || 'Без названия'}
                          </button>
                          {isOwner ? (
                            <button
                              type="button"
                              className="setting-wiki-links__remove"
                              disabled={busy}
                              title="Убрать связь"
                              onClick={() => void removeLink(link.id)}
                            >
                              ×
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                  {isOwner ? (
                    <div className="setting-wiki-links__add">
                      <select
                        className="ui-input"
                        value={linkTargetId}
                        disabled={busy || linkCandidates.length === 0}
                        onChange={(e) => setLinkTargetId(e.target.value)}
                      >
                        <option value="">
                          {linkCandidates.length === 0
                            ? 'Некуда связать'
                            : 'Страница для связи…'}
                        </option>
                        {linkCandidates.map((p) => (
                          <option key={p.id} value={p.id}>
                            {pageKindLabel(p.page_kind)} · {p.title || 'Без названия'}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || !linkTargetId}
                        onClick={() => void addLink()}
                      >
                        Связать
                      </Button>
                    </div>
                  ) : null}

                  <Text as="h3">Ссылаются сюда</Text>
                  {pageLinks.incoming.length === 0 ? (
                    <Text tone="muted">Бэклинков пока нет.</Text>
                  ) : (
                    <ul className="setting-wiki-links__list">
                      {pageLinks.incoming.map((link) => (
                        <li key={link.id} className="setting-wiki-links__row">
                          <button
                            type="button"
                            className="setting-wiki-links__jump"
                            disabled={busy}
                            onClick={() => setSelectedId(link.from_page_id)}
                          >
                            {link.from_title || 'Без названия'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Stack>
            ) : (
              <Text tone="muted">
                {isOwner
                  ? 'Выбери страницу слева или добавь через «Быстро».'
                  : 'Нет раскрытых страниц.'}
              </Text>
            )}
          </section>
        </div>
      </Stack>
      <SettingQuickCreateDialog
        open={quickOpen && isOwner}
        busy={busy}
        templates={setting.templates ?? []}
        parentOptions={setting.pages.map((p) => ({ id: p.id, title: p.title }))}
        defaultParentId={selectedId}
        onClose={() => setQuickOpen(false)}
        onCreate={(payload) => void handleQuickCreate(payload)}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}

function TreeNode({
  node,
  depth,
  selectedId,
  busy,
  isOwner,
  onSelect,
  onAddChild,
}: {
  node: SettingPageNode
  depth: number
  selectedId: string | null
  busy: boolean
  isOwner: boolean
  onSelect: (id: string) => void
  onAddChild: (id: string) => void
}) {
  const on = node.id === selectedId
  return (
    <li>
      <div
        className={`setting-wiki-tree__row${on ? ' is-on' : ''}${
          isOwner && node.revealed ? ' is-revealed' : ''
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <button
          type="button"
          className="setting-wiki-tree__link"
          disabled={busy}
          onClick={() => onSelect(node.id)}
        >
          <span className="setting-wiki-tree__kind" title={pageKindLabel(node.page_kind)}>
            {SETTING_PAGE_KIND_LABELS[node.page_kind]?.slice(0, 1) ?? '?'}
          </span>
          {node.title || 'Без названия'}
          {isOwner && node.revealed ? (
            <span className="setting-wiki-tree__eye" title="Раскрыто игрокам">
              ·
            </span>
          ) : null}
        </button>
        {isOwner ? (
          <button
            type="button"
            className="setting-wiki-tree__add"
            disabled={busy}
            title="Дочерняя страница"
            onClick={() => onAddChild(node.id)}
          >
            +
          </button>
        ) : null}
      </div>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              busy={busy}
              isOwner={isOwner}
              onSelect={onSelect}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
