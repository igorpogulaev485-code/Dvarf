import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import { openProductSite } from '../shared/brand/creed20'
import {
  CombatPageEditor,
  emptyCombatPageFields,
  normalizeCombatPageFields,
  type CombatPageFields,
} from '../features/lobby/CombatPageEditor'
import { SettingMentionBody } from '../features/lobby/SettingMentionBody'
import { SettingQuickCreateDialog } from '../features/lobby/SettingQuickCreateDialog'
import { WikiMentionAssist } from '../features/lobby/WikiMentionAssist'
import { WikiPageHistoryPanel } from '../features/lobby/WikiPageHistoryPanel'
import { WikiPageMediaPanel } from '../features/lobby/WikiPageMediaPanel'
import { useLobbyRealtime } from '../features/lobby/useLobbyRealtime'
import { getAccessToken } from '../shared/api/client'
import { lobbyWsUrl } from '../shared/api/chat'
import { SETTING_LINK_PRESETS } from '../features/lobby/settingLinkPresets'
import {
  COMBAT_PARENT_KINDS,
  QUEST_STATUS_LABELS,
  SETTING_PAGE_KIND_LABELS,
  SETTING_PAGE_KINDS,
  pageKindLabel,
  type QuestStatus,
  type SettingPageKind,
} from '../features/lobby/settingKinds'
import {
  buildSettingPageTree,
  collectPageTags,
  filterSettingPages,
  linksForPage,
  normalizeClientTags,
  templateForPage,
  type SettingPageNode,
} from '../features/lobby/settingPages'
import {
  pushRecentPageId,
  readRecentPageIds,
  readSettingFilter,
  writeSettingFilter,
} from '../features/lobby/settingRecent'
import { ApiRequestError } from '../shared/api/client'
import { SettingArtifactsPanel } from '../features/lobby/SettingArtifactsPanel'
import { SettingWikiReader } from '../features/lobby/SettingWikiReader'
import {
  TEMPLATE_CARD_KINDS,
  type SettingPageKind as KindForCard,
} from '../features/lobby/settingKinds'
import {
  bulkCreateSettingPages,
  copyWikiPages,
  createSettingArtifact,
  createSettingPage,
  createSettingPageLink,
  deleteSettingArtifact,
  deleteSettingPage,
  deleteSettingPageLink,
  getLobby,
  getSetting,
  listLobbies,
  listWikiTrash,
  restoreSetting,
  restoreSettingPage,
  updateSetting,
  updateSettingArtifact,
  updateSettingPage,
  type SettingDetail,
  type SettingPageTemplateField,
  type SettingSummary,
  type SettingTrashItem,
} from '../shared/api/lobbies'
import { Button, Field, Input, Panel, Stack, Text, Toast } from '../ui'

function canEditWikiHint(setting: SettingDetail | null | undefined): boolean {
  return Boolean(setting?.can_edit_wiki ?? setting?.is_owner)
}

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
  const [draftCombatFields, setDraftCombatFields] = useState<CombatPageFields>(
    emptyCombatPageFields,
  )
  const [draftParentId, setDraftParentId] = useState<string>('')
  const [draftKind, setDraftKind] = useState<SettingPageKind>('note')
  const [draftQuestStatus, setDraftQuestStatus] = useState<QuestStatus | ''>('')
  const [settingName, setSettingName] = useState('')
  const [linkTargetId, setLinkTargetId] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [linkBidirectional, setLinkBidirectional] = useState(true)
  const [linkGmOnly, setLinkGmOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<SettingPageKind | 'all'>('all')
  const [tagFilter, setTagFilter] = useState('')
  const [draftTags, setDraftTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [quickOpen, setQuickOpen] = useState(false)
  const [bodyPreview, setBodyPreview] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [editingNames, setEditingNames] = useState<string[]>([])
  const [trashItems, setTrashItems] = useState<SettingTrashItem[]>([])
  const [copySources, setCopySources] = useState<SettingSummary[]>([])
  const [copySourcePageId, setCopySourcePageId] = useState('')
  const [copyIncludeSubtree, setCopyIncludeSubtree] = useState(false)

  const allTags = useMemo(
    () => setting?.all_tags?.length
      ? setting.all_tags
      : collectPageTags(setting?.pages ?? []),
    [setting?.all_tags, setting?.pages],
  )

  const filteredPages = useMemo(
    () =>
      filterSettingPages(setting?.pages ?? [], {
        query: searchQuery,
        kind: kindFilter,
        tag: tagFilter,
      }),
    [setting?.pages, searchQuery, kindFilter, tagFilter],
  )

  const recentPages = useMemo(() => {
    if (!setting) return []
    const byId = new Map(setting.pages.map((p) => [p.id, p]))
    return recentIds.map((id) => byId.get(id)).filter(Boolean) as SettingDetail['pages']
  }, [setting, recentIds])

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
    const saved = readSettingFilter(settingId)
    if (saved) {
      if (saved.kind === 'all' || (SETTING_PAGE_KINDS as readonly string[]).includes(saved.kind)) {
        setKindFilter(saved.kind as SettingPageKind | 'all')
      }
      setTagFilter(saved.tag)
    }
    setRecentIds(readRecentPageIds(settingId))
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
        if (first) {
          setRecentIds(pushRecentPageId(settingId, first))
        }
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
    if (!settingId) return
    writeSettingFilter(settingId, { kind: kindFilter, tag: tagFilter })
  }, [settingId, kindFilter, tagFilter])

  useEffect(() => {
    if (!selected) return
    applyDraftFromPage(selected)
    setLinkTargetId('')
    if (settingId && selected.id) {
      setRecentIds(pushRecentPageId(settingId, selected.id))
    }
  }, [selected?.id, settingId])

  function applyDraftFromPage(page: SettingDetail['pages'][number] | null) {
    setDraftTitle(page?.title ?? '')
    setDraftBody(page?.body ?? '')
    setDraftGmBody(page?.gm_body ?? '')
    setDraftKind(page?.page_kind ?? 'note')
    setDraftQuestStatus(page?.quest_status ?? '')
    setDraftTags(page?.tags ?? [])
    setDraftParentId(page?.parent_id ?? '')
    setTagDraft('')
    if ((page?.page_kind ?? 'note') === 'combat') {
      setDraftCombatFields(normalizeCombatPageFields(page?.fields ?? {}))
      setDraftFields({})
      return
    }
    const nextFields: Record<string, string> = {}
    for (const [k, v] of Object.entries(page?.fields ?? {})) {
      if (v != null && typeof v === 'object') continue
      nextFields[k] = v == null ? '' : String(v)
    }
    setDraftFields(nextFields)
    setDraftCombatFields(emptyCombatPageFields())
  }

  function addDraftTag(raw: string) {
    const next = normalizeClientTags([...draftTags, raw])
    setDraftTags(next)
    setTagDraft('')
  }

  function removeDraftTag(tag: string) {
    setDraftTags((prev) => prev.filter((t) => t.toLowerCase() !== tag.toLowerCase()))
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

  async function savePage(forceOverwrite = false) {
    if (!selected) return
    if (draftKind === 'combat' && !draftParentId) {
      setError('Страница «Бой» нужна под локацией или квестом')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const fields =
        draftKind === 'combat'
          ? {
              ...draftCombatFields,
              loot: {
                items: draftCombatFields.loot.items.filter((it) => it.name.trim()),
                coins: draftCombatFields.loot.coins,
              },
            }
          : draftFields
      const next = await updateSettingPage(selected.id, {
        title: draftTitle,
        body: draftBody,
        gm_body: draftGmBody,
        page_kind: draftKind,
        fields,
        parent_id: draftParentId || null,
        clear_parent: !draftParentId,
        quest_status: draftKind === 'quest' ? draftQuestStatus || 'planned' : undefined,
        clear_quest_status: draftKind !== 'quest',
        tags: normalizeClientTags(draftTags),
        expected_updated_at: selected.updated_at,
        force_overwrite: forceOverwrite,
      })
      applyDetail(next, selected.id)
      setConflictOpen(false)
      setToast('Страница сохранена')
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        setConflictOpen(true)
        setError('Страницу уже изменили. Перезаписать или посмотреть серверную версию?')
      } else {
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить страницу')
      }
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
    if (payload.page_kind === 'combat' && !payload.parent_id) {
      setError('Страница «Бой» нужна под локацией или квестом')
      return
    }
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
          fields:
            payload.page_kind === 'combat' ? emptyCombatPageFields() : undefined,
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
      setToast('Страница в корзине (30 дней)')
      void refreshTrash(setting.lobby_id)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось удалить')
    } finally {
      setBusy(false)
    }
  }

  async function refreshTrash(lobbyId: string) {
    try {
      const res = await listWikiTrash(lobbyId)
      setTrashItems(res.items)
    } catch {
      // корзина только для редакторов; молча
    }
  }

  async function loadCopySources(lobbyId: string) {
    try {
      const all = await listLobbies()
      const others: SettingSummary[] = []
      for (const row of all) {
        if (row.id === lobbyId) continue
        try {
          const detail = await getLobby(row.id)
          if (!detail.can_edit_wiki) continue
          for (const s of detail.settings) others.push(s)
        } catch {
          // skip
        }
      }
      setCopySources(others)
    } catch {
      setCopySources([])
    }
  }

  useEffect(() => {
    if (!setting?.lobby_id || !canEditWikiHint(setting)) return
    void refreshTrash(setting.lobby_id)
    void loadCopySources(setting.lobby_id)
  }, [setting?.lobby_id, setting?.can_edit_wiki, setting?.is_owner])

  useLobbyRealtime(setting?.lobby_id, (data) => {
    if (!selectedId) return
    if (data.type === 'wiki_editing' && data.page_id === selectedId) {
      const name = String(data.display_name || 'Мастер')
      setEditingNames((prev) => (prev.includes(name) ? prev : [...prev, name]))
    }
    if (data.type === 'wiki_editing_stop' && data.page_id === selectedId) {
      const name = String(data.display_name || '')
      setEditingNames((prev) => prev.filter((n) => n !== name))
    }
  })

  // Heartbeat «сейчас правит» пока открыт редактор страницы.
  useEffect(() => {
    if (!setting?.lobby_id || !selectedId || !canEditWikiHint(setting)) return
    const token = getAccessToken()
    if (!token) return
    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(lobbyWsUrl(setting.lobby_id, token))
    } catch {
      return
    }
    const pageId = selectedId
    const send = () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'wiki_editing', page_id: pageId }))
      }
    }
    ws.onopen = () => {
      send()
    }
    const timer = setInterval(send, 15000)
    return () => {
      clearInterval(timer)
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'wiki_editing_stop', page_id: pageId }))
      }
      ws?.close()
    }
  }, [setting?.lobby_id, selectedId, setting?.can_edit_wiki, setting?.is_owner])

  async function addLink() {
    if (!selected || !linkTargetId) return
    setBusy(true)
    setError(null)
    try {
      const next = await createSettingPageLink(selected.id, {
        to_page_id: linkTargetId,
        label: linkLabel.trim(),
        visibility: linkGmOnly ? 'gm' : 'all',
        bidirectional: linkBidirectional,
      })
      applyDetail(next, selected.id)
      setLinkTargetId('')
      setLinkLabel('')
      setToast(linkBidirectional ? 'Связь ↔ добавлена' : 'Связь добавлена')
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

  const canEditWiki = Boolean(setting?.can_edit_wiki ?? setting?.is_owner)
  const canSeeHidden = Boolean(setting?.can_see_hidden ?? setting?.is_owner)
  const isOwner = canEditWiki
  const schemaFields: SettingPageTemplateField[] = activeTemplate?.schema ?? []
  const readerUserKey = setting ? `lobby:${setting.lobby_id}` : 'anon'
  const existingMentionTitles = useMemo(() => {
    const set = new Set<string>()
    for (const p of setting?.pages ?? []) set.add(p.title.trim().toLowerCase())
    return set
  }, [setting?.pages])

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
          subtitle={canEditWiki ? 'Сеттинг — вики мира' : 'Сеттинг — раскрытые страницы'}
          onOfficialSite={openProductSite}
        />
        <Text>
          <Link to={`/lobbies/${setting.lobby_id}`}>← В лобби</Link>
        </Text>
        {error ? <Text tone="danger">{error}</Text> : null}
        {setting.in_trash ? (
          <Panel title="Корзина">
            <Text>Сеттинг в корзине. Сессии остаются привязаны. Восстановите в течение 30 дней.</Text>
            {canEditWiki ? (
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true)
                    try {
                      await restoreSetting(setting.id)
                      const next = await getSetting(setting.id)
                      applyDetail(next, selectedId)
                      setToast('Сеттинг восстановлен')
                      void refreshTrash(setting.lobby_id)
                    } catch (err) {
                      setError(
                        err instanceof ApiRequestError ? err.message : 'Не удалось восстановить',
                      )
                    } finally {
                      setBusy(false)
                    }
                  })()
                }}
              >
                Восстановить сеттинг
              </Button>
            ) : null}
          </Panel>
        ) : null}

        <Panel title="Сеттинг">
          {canEditWiki ? (
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
                  onClick={() => {
                    navigate(`/lobbies/${setting.lobby_id}#sessions`, {
                      state: { sessionSettingId: setting.id },
                    })
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

        {!canEditWiki ? (
          <Panel title="Чтение вики">
            <SettingWikiReader
              setting={setting}
              userKey={readerUserKey}
              canEditWiki={false}
              canSeeHidden={canSeeHidden}
            />
          </Panel>
        ) : null}

        {isOwner && trashItems.length > 0 ? (
          <Panel title="Корзина вики">
            <ul className="wiki-history-panel__list">
              {trashItems.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="wiki-history-panel__row">
                  <Text>
                    {item.kind === 'setting' ? 'Сеттинг' : 'Страница'}: {item.title}
                  </Text>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      void (async () => {
                        setBusy(true)
                        try {
                          if (item.kind === 'setting') {
                            await restoreSetting(item.id)
                            const next = await getSetting(setting.id)
                            applyDetail(next, selectedId)
                          } else {
                            const next = await restoreSettingPage(item.id)
                            applyDetail(next, item.id)
                          }
                          setToast('Восстановлено из корзины')
                          void refreshTrash(setting.lobby_id)
                        } catch (err) {
                          setError(
                            err instanceof ApiRequestError
                              ? err.message
                              : 'Не удалось восстановить',
                          )
                        } finally {
                          setBusy(false)
                        }
                      })()
                    }}
                  >
                    Восстановить
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {isOwner ? (
          <SettingArtifactsPanel
            artifacts={setting.artifacts ?? []}
            busy={busy}
            onCreate={async (payload) => {
              setBusy(true)
              setError(null)
              try {
                const next = await createSettingArtifact(setting.id, payload)
                applyDetail(next, selectedId)
                setToast(`Артефакт «${payload.name}» создан`)
              } catch (err) {
                setError(
                  err instanceof ApiRequestError ? err.message : 'Не удалось создать артефакт',
                )
                throw err
              } finally {
                setBusy(false)
              }
            }}
            onUpdate={async (id, payload) => {
              setBusy(true)
              setError(null)
              try {
                const next = await updateSettingArtifact(id, payload)
                applyDetail(next, selectedId)
                setToast('Артефакт сохранён')
              } catch (err) {
                setError(
                  err instanceof ApiRequestError ? err.message : 'Не удалось сохранить',
                )
                throw err
              } finally {
                setBusy(false)
              }
            }}
            onDelete={async (id) => {
              setBusy(true)
              setError(null)
              try {
                const next = await deleteSettingArtifact(id)
                applyDetail(next, selectedId)
                setToast('Артефакт удалён')
              } catch (err) {
                setError(
                  err instanceof ApiRequestError ? err.message : 'Не удалось удалить',
                )
                throw err
              } finally {
                setBusy(false)
              }
            }}
          />
        ) : null}

        {canEditWiki ? (
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
                placeholder="Название, текст или тег…"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Field>
            {recentPages.length > 0 ? (
              <div className="setting-wiki-recent" aria-label="Недавние">
                <Text tone="muted" className="setting-wiki-recent__label">
                  Недавние
                </Text>
                <div className="setting-wiki-recent__list">
                  {recentPages.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`setting-wiki-recent__chip${selectedId === p.id ? ' is-on' : ''}`}
                      onClick={() => setSelectedId(p.id)}
                    >
                      {p.title || 'Без названия'}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
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
            {allTags.length > 0 ? (
              <div className="setting-wiki-kind-filters" role="group" aria-label="Теги">
                <button
                  type="button"
                  className={`setting-wiki-kind-chip${tagFilter === '' ? ' is-on' : ''}`}
                  onClick={() => setTagFilter('')}
                >
                  Любой тег
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`setting-wiki-kind-chip setting-wiki-tag-chip${tagFilter.toLowerCase() === tag.toLowerCase() ? ' is-on' : ''}`}
                    onClick={() =>
                      setTagFilter((prev) =>
                        prev.toLowerCase() === tag.toLowerCase() ? '' : tag,
                      )
                    }
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            ) : null}
            {tree.length === 0 ? (
              <Text tone="muted">
                {searchQuery || kindFilter !== 'all' || tagFilter
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
                {TEMPLATE_CARD_KINDS.includes(selected.page_kind as KindForCard) &&
                schemaFields.some((f) => !f.gm_only) ? (
                  <div className="setting-wiki-reader__card" aria-label="Поля шаблона">
                    {schemaFields
                      .filter((f) => !f.gm_only)
                      .map((field) => {
                        const raw = draftFields[field.key] ?? selected.fields?.[field.key]
                        const value =
                          raw == null || raw === '' ? '—' : String(raw)
                        return (
                          <div key={field.key} className="setting-wiki-reader__card-row">
                            <span className="setting-wiki-reader__card-label">{field.label}</span>
                            <span>{value}</span>
                          </div>
                        )
                      })}
                  </div>
                ) : null}
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
                        if (next === 'combat') {
                          setDraftCombatFields((prev) =>
                            prev.waves.length
                              ? prev
                              : emptyCombatPageFields(),
                          )
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
                {isOwner && draftKind === 'combat' ? (
                  <Field
                    label="Родитель"
                    hint="Только локация или квест — игроки бой не видят"
                  >
                    <select
                      className="ui-input"
                      value={draftParentId}
                      disabled={busy}
                      onChange={(e) => setDraftParentId(e.target.value)}
                    >
                      <option value="">Выбери локацию или квест</option>
                      {setting.pages
                        .filter(
                          (p) =>
                            p.id !== selected.id &&
                            COMBAT_PARENT_KINDS.includes(p.page_kind),
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {SETTING_PAGE_KIND_LABELS[p.page_kind]} ·{' '}
                            {p.title || 'Без названия'}
                          </option>
                        ))}
                    </select>
                  </Field>
                ) : null}
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
                <div className="setting-wiki-tags">
                  <Text as="h3">Теги</Text>
                  <div className="setting-wiki-tags__list">
                    {(isOwner ? draftTags : selected.tags ?? []).length === 0 ? (
                      <Text tone="muted">Нет тегов</Text>
                    ) : (
                      (isOwner ? draftTags : selected.tags ?? []).map((tag) => (
                        <span key={tag} className="setting-wiki-tags__chip">
                          #{tag}
                          {isOwner ? (
                            <button
                              type="button"
                              className="setting-wiki-tags__remove"
                              disabled={busy}
                              aria-label={`Убрать ${tag}`}
                              onClick={() => removeDraftTag(tag)}
                            >
                              ×
                            </button>
                          ) : null}
                        </span>
                      ))
                    )}
                  </div>
                  {isOwner ? (
                    <div className="setting-wiki-tags__add">
                      <Input
                        value={tagDraft}
                        disabled={busy}
                        placeholder="порт, культ…"
                        list="setting-wiki-tag-suggestions"
                        onChange={(e) => setTagDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault()
                            if (tagDraft.trim()) addDraftTag(tagDraft)
                          }
                        }}
                      />
                      <datalist id="setting-wiki-tag-suggestions">
                        {allTags.map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy || !tagDraft.trim()}
                        onClick={() => addDraftTag(tagDraft)}
                      >
                        + Тег
                      </Button>
                    </div>
                  ) : null}
                </div>
                {draftKind === 'combat' || selected.page_kind === 'combat' ? (
                  isOwner ? (
                    <CombatPageEditor
                      value={draftCombatFields}
                      estimate={selected.combat_estimate}
                      busy={busy}
                      onChange={setDraftCombatFields}
                    />
                  ) : (
                    <Text tone="muted">Страница боя видна только мастеру.</Text>
                  )
                ) : schemaFields.length > 0 ? (
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
                  </div>
                ) : null}
                {isOwner ? (
                  <WikiMentionAssist
                    settingId={setting.id}
                    body={draftBody}
                    existingTitles={existingMentionTitles}
                    busy={busy}
                    onCreated={(next, pageId) => {
                      applyDetail(next, pageId)
                      setToast('Страница создана из упоминания')
                    }}
                  />
                ) : null}
                {isOwner && selected ? (
                  <WikiPageMediaPanel
                    lobbyId={setting.lobby_id}
                    pageId={selected.id}
                    pageKind={draftKind}
                    media={selected.media ?? []}
                    canEdit
                    onChanged={(media) => {
                      setSetting((prev) => {
                        if (!prev) return prev
                        return {
                          ...prev,
                          pages: prev.pages.map((p) =>
                            p.id === selected.id ? { ...p, media } : p,
                          ),
                        }
                      })
                    }}
                  />
                ) : null}
                {editingNames.length > 0 ? (
                  <Text tone="muted">Сейчас правит: {editingNames.join(', ')}</Text>
                ) : null}
                {conflictOpen ? (
                  <div className="wiki-conflict-banner">
                    <Text>Конфликт правок — страница изменилась на сервере.</Text>
                    <div className="inline-actions">
                      <Button type="button" disabled={busy} onClick={() => void savePage(true)}>
                        Перезаписать
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => {
                          void (async () => {
                            const next = await getSetting(setting.id)
                            applyDetail(next, selected?.id)
                            setConflictOpen(false)
                            setToast('Загружена серверная версия — сравните с черновиком выше')
                          })()
                        }}
                      >
                        Посмотреть разницу
                      </Button>
                    </div>
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
                    {draftKind === 'combat' || selected.page_kind === 'combat' ? (
                      <Text tone="muted">
                        Страница «Бой» всегда скрыта от игроков — раскрытие недоступно.
                      </Text>
                    ) : (
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
                    )}
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
                        disabled={busy}
                        onClick={() => setHistoryOpen((v) => !v)}
                      >
                        {historyOpen ? 'Скрыть историю' : 'История'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy || setting.pages.length <= 1}
                        onClick={() => void removePage()}
                      >
                        В корзину
                      </Button>
                    </div>
                    <WikiPageHistoryPanel
                      pageId={selected.id}
                      open={historyOpen}
                      onRestored={(next) => {
                        applyDetail(next, selected.id)
                        setToast('Версия возвращена')
                      }}
                    />
                    {copySources.length > 0 ? (
                      <div className="wiki-copy-panel">
                        <Text as="h3">Копия из другого лобби</Text>
                        <Field label="Страница-источник (id)">
                          <Input
                            value={copySourcePageId}
                            onChange={(e) => setCopySourcePageId(e.target.value)}
                            placeholder="UUID страницы из своего лобби"
                          />
                        </Field>
                        <label className="setting-wiki-reveal__toggle">
                          <input
                            type="checkbox"
                            checked={copyIncludeSubtree}
                            onChange={(e) => setCopyIncludeSubtree(e.target.checked)}
                          />
                          <span>Вместе с веткой</span>
                        </label>
                        <Text tone="muted">
                          Доступно {copySources.length} сеттинг(ов) с правом правки вики.
                        </Text>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy || !copySourcePageId.trim()}
                          onClick={() => {
                            void (async () => {
                              setBusy(true)
                              setError(null)
                              try {
                                const next = await copyWikiPages(setting.id, {
                                  source_page_id: copySourcePageId.trim(),
                                  include_subtree: copyIncludeSubtree,
                                  target_parent_id: selected.id,
                                })
                                applyDetail(next, selected.id)
                                setToast('Копия создана (независимая)')
                              } catch (err) {
                                setError(
                                  err instanceof ApiRequestError
                                    ? err.message
                                    : 'Не удалось скопировать',
                                )
                              } finally {
                                setBusy(false)
                              }
                            })()
                          }}
                        >
                          Скопировать сюда
                        </Button>
                      </div>
                    ) : null}
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
                          }${link.visibility === 'gm' ? ' is-gm-only' : ''}`}
                        >
                          <button
                            type="button"
                            className="setting-wiki-links__jump"
                            disabled={busy}
                            onClick={() => setSelectedId(link.to_page_id)}
                            title={
                              link.kind === 'mention'
                                ? 'Из текста (@ / [[…]])'
                                : link.visibility === 'gm'
                                  ? 'Только мастер'
                                  : undefined
                            }
                          >
                            {link.visibility === 'gm' ? '🔒 ' : ''}
                            {link.kind === 'mention' ? '@ ' : ''}
                            {link.label
                              ? `${link.label}: ${link.to_title || '…'}`
                              : link.to_title || 'Без названия'}
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
                      <select
                        className="ui-input"
                        value={linkLabel}
                        disabled={busy}
                        onChange={(e) => setLinkLabel(e.target.value)}
                      >
                        <option value="">Подпись…</option>
                        {SETTING_LINK_PRESETS.map((p) => (
                          <option key={p.label} value={p.label}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={linkLabel}
                        disabled={busy}
                        placeholder="или свой текст"
                        onChange={(e) => setLinkLabel(e.target.value)}
                      />
                      <label className="setting-wiki-reveal__toggle">
                        <input
                          type="checkbox"
                          checked={linkBidirectional}
                          disabled={busy}
                          onChange={(e) => setLinkBidirectional(e.target.checked)}
                        />
                        <span>↔ двусторонняя</span>
                      </label>
                      <label className="setting-wiki-reveal__toggle">
                        <input
                          type="checkbox"
                          checked={linkGmOnly}
                          disabled={busy}
                          onChange={(e) => setLinkGmOnly(e.target.checked)}
                        />
                        <span>только мастер</span>
                      </label>
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
        ) : null}
      </Stack>
      <SettingQuickCreateDialog
        open={quickOpen && isOwner}
        busy={busy}
        templates={setting.templates ?? []}
        parentOptions={setting.pages.map((p) => ({
          id: p.id,
          title: p.title,
          page_kind: p.page_kind,
        }))}
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
