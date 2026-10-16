import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import {
  buildSettingPageTree,
  linksForPage,
  type SettingPageNode,
} from '../features/lobby/settingPages'
import { ApiRequestError } from '../shared/api/client'
import {
  createSession,
  createSettingPage,
  createSettingPageLink,
  deleteSettingPage,
  deleteSettingPageLink,
  getSetting,
  updateSetting,
  updateSettingPage,
  type SettingDetail,
} from '../shared/api/lobbies'
import { Button, Field, Input, Panel, Stack, Text, Toast } from '../ui'

export function SettingDetailPage() {
  const { settingId = '' } = useParams()
  const navigate = useNavigate()
  const [setting, setSetting] = useState<SettingDetail | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [settingName, setSettingName] = useState('')
  const [linkTargetId, setLinkTargetId] = useState('')

  const tree = useMemo(
    () => buildSettingPageTree(setting?.pages ?? []),
    [setting?.pages],
  )

  const selected = useMemo(
    () => setting?.pages.find((p) => p.id === selectedId) ?? null,
    [setting, selectedId],
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
        const first = item.pages[0]?.id ?? null
        setSelectedId(first)
        const page = item.pages.find((p) => p.id === first)
        setDraftTitle(page?.title ?? '')
        setDraftBody(page?.body ?? '')
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
  }, [navigate, settingId])

  useEffect(() => {
    if (!selected) return
    setDraftTitle(selected.title)
    setDraftBody(selected.body)
    setLinkTargetId('')
  }, [selected?.id])

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
    setDraftTitle(page?.title ?? '')
    setDraftBody(page?.body ?? '')
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
          subtitle="Сеттинг — вики мира"
          onOfficialSite={() => setToast('Официальный сайт скоро появится')}
        />
        <Text>
          <Link to={`/lobbies/${setting.lobby_id}`}>← В лобби</Link>
        </Text>
        {error ? <Text tone="danger">{error}</Text> : null}

        <Panel title="Сеттинг">
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
        </Panel>

        <div className="setting-wiki">
          <aside className="setting-wiki__nav">
            <div className="setting-wiki__nav-head">
              <Text as="h3">Страницы</Text>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => void addPage(null)}
              >
                + Корень
              </Button>
            </div>
            <ul className="setting-wiki-tree">
              {tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={selectedId}
                  busy={busy}
                  onSelect={(id) => setSelectedId(id)}
                  onAddChild={(id) => void addPage(id)}
                />
              ))}
            </ul>
          </aside>

          <section className="setting-wiki__editor">
            {selected ? (
              <Stack gap={12}>
                <Field label="Заголовок страницы">
                  <Input
                    value={draftTitle}
                    disabled={busy}
                    onChange={(e) => setDraftTitle(e.target.value)}
                  />
                </Field>
                <Field label="Текст" hint="C3: раскрытие игрокам — позже">
                  <textarea
                    className="ui-input ui-textarea"
                    rows={14}
                    value={draftBody}
                    disabled={busy}
                    onChange={(e) => setDraftBody(e.target.value)}
                    placeholder="География, фракции, НПС…"
                  />
                </Field>
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

                <div className="setting-wiki-links">
                  <Text as="h3">Связи →</Text>
                  {pageLinks.outgoing.length === 0 ? (
                    <Text tone="muted">Пока нет переходов с этой страницы.</Text>
                  ) : (
                    <ul className="setting-wiki-links__list">
                      {pageLinks.outgoing.map((link) => (
                        <li key={link.id} className="setting-wiki-links__row">
                          <button
                            type="button"
                            className="setting-wiki-links__jump"
                            disabled={busy}
                            onClick={() => setSelectedId(link.to_page_id)}
                          >
                            {link.label || link.to_title || 'Без названия'}
                          </button>
                          <button
                            type="button"
                            className="setting-wiki-links__remove"
                            disabled={busy}
                            title="Убрать связь"
                            onClick={() => void removeLink(link.id)}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
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
                          {p.title || 'Без названия'}
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
              <Text tone="muted">Выбери страницу слева или добавь корневую.</Text>
            )}
          </section>
        </div>
      </Stack>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}

function TreeNode({
  node,
  depth,
  selectedId,
  busy,
  onSelect,
  onAddChild,
}: {
  node: SettingPageNode
  depth: number
  selectedId: string | null
  busy: boolean
  onSelect: (id: string) => void
  onAddChild: (id: string) => void
}) {
  const on = node.id === selectedId
  return (
    <li>
      <div
        className={`setting-wiki-tree__row${on ? ' is-on' : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <button
          type="button"
          className="setting-wiki-tree__link"
          disabled={busy}
          onClick={() => onSelect(node.id)}
        >
          {node.title || 'Без названия'}
        </button>
        <button
          type="button"
          className="setting-wiki-tree__add"
          disabled={busy}
          title="Дочерняя страница"
          onClick={() => onAddChild(node.id)}
        >
          +
        </button>
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
              onSelect={onSelect}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
