/**
 * W-API-11: экраны мастера — залить мир, токены, тумблер, сверка, confirm/отмена.
 * Только UI-кит (Panel / Button / Field / Chip / Dialog / Stack / Text). Без CSS-переопределений.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiRequestError } from '../../shared/api/client'
import {
  cancelWorldImport,
  confirmWorldImport,
  createWorldApiToken,
  createWorldImportJob,
  getWorldImportDiff,
  getWorldImportSettings,
  importWorldFromGit,
  listWorldApiTokens,
  listWorldImportConfirmations,
  listWorldImportDraftItems,
  listWorldImportDraftLinks,
  listWorldImports,
  mcpWorldImportUrl,
  patchWorldImportSettings,
  rejectWorldImportDraftItem,
  revokeWorldApiToken,
  undoWorldImport,
  uploadWorldImportZip,
  worldImportAttachmentUrl,
  type ConflictResolution,
  type WorldApiToken,
  type WorldApiTokenCreated,
  type WorldImportConfirmation,
  type WorldImportDiff,
  type WorldImportDraftItem,
  type WorldImportDraftLink,
  type WorldImportJob,
  type WorldImportSettings,
} from '../../shared/api/worldImports'
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
} from '../../ui'
import {
  DIFF_STATUS_LABELS,
  REVIEW_FILTER_LABELS,
  actorKindLabel,
  emptyCharacterSheetFields,
  filterDiffEntries,
  formatQuotaMb,
  groupReviewEntries,
  isCharacterEntry,
  jobStatusBanner,
  linksForSourceKey,
  officeHolderLabel,
  type WorldImportReviewFilter,
} from './worldImportReview'

type Props = {
  lobbyId: string
  settingId: string
  /** Мастер / владелец сеттинга. */
  canManage: boolean
  /** Узкий экран: только статус (полная сверка — десктоп). */
  compact?: boolean
  onToast: (message: string) => void
  onError: (message: string) => void
  /** После confirm — обновить вики. */
  onConfirmed?: () => void
}

function useIsNarrow(forced?: boolean): boolean {
  const [narrow, setNarrow] = useState(() => {
    if (typeof forced === 'boolean') return forced
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 959px)').matches
  })
  useEffect(() => {
    if (typeof forced === 'boolean') {
      setNarrow(forced)
      return
    }
    const mq = window.matchMedia('(max-width: 959px)')
    const onChange = () => setNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [forced])
  return narrow
}

export function WorldImportPanel({
  lobbyId,
  settingId,
  canManage,
  compact,
  onToast,
  onError,
  onConfirmed,
}: Props) {
  const narrow = useIsNarrow(compact)
  const zipRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [jobs, setJobs] = useState<WorldImportJob[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [diff, setDiff] = useState<WorldImportDiff | null>(null)
  const [draftItems, setDraftItems] = useState<WorldImportDraftItem[]>([])
  const [draftLinks, setDraftLinks] = useState<WorldImportDraftLink[]>([])
  const [confirmations, setConfirmations] = useState<WorldImportConfirmation[]>([])
  const [importSettings, setImportSettings] = useState<WorldImportSettings | null>(null)
  const [tokens, setTokens] = useState<WorldApiToken[]>([])
  const [freshSecret, setFreshSecret] = useState<WorldApiTokenCreated | null>(null)
  const [gitUrl, setGitUrl] = useState('')
  const [filter, setFilter] = useState<WorldImportReviewFilter>('all')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({})
  const [selectedAi, setSelectedAi] = useState<Record<string, boolean>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [undoOpen, setUndoOpen] = useState(false)
  const [aiWarnOpen, setAiWarnOpen] = useState(false)

  const activeJob = useMemo(
    () => jobs.find((j) => j.id === jobId) ?? jobs[0] ?? null,
    [jobs, jobId],
  )
  const banner = jobStatusBanner(activeJob)

  const filtered = useMemo(
    () => filterDiffEntries(diff?.entries ?? [], filter),
    [diff, filter],
  )
  const groups = useMemo(() => groupReviewEntries(filtered), [filtered])

  const draftById = useMemo(() => {
    const map = new Map<string, WorldImportDraftItem>()
    for (const it of draftItems) map.set(it.id, it)
    return map
  }, [draftItems])

  async function reloadAll(preferredJobId?: string | null) {
    const [jobList, settings, tokenList] = await Promise.all([
      listWorldImports(settingId),
      getWorldImportSettings(settingId),
      canManage ? listWorldApiTokens(lobbyId, settingId) : Promise.resolve([]),
    ])
    setJobs(jobList)
    setImportSettings(settings)
    setTokens(tokenList.filter((t) => !t.revoked_at))
    const nextId = preferredJobId ?? jobId ?? jobList[0]?.id ?? null
    setJobId(nextId)
    if (!nextId) {
      setDiff(null)
      setDraftItems([])
      setDraftLinks([])
      setConfirmations([])
      return
    }
    const [d, items, links, confs] = await Promise.all([
      getWorldImportDiff(settingId, nextId),
      listWorldImportDraftItems(settingId, nextId),
      listWorldImportDraftLinks(settingId, nextId),
      listWorldImportConfirmations(settingId, nextId),
    ])
    setDiff(d)
    setDraftItems(items)
    setDraftLinks(links)
    setConfirmations(confs)
    const nextCollapsed: Record<string, boolean> = {}
    for (const g of groupReviewEntries(d.entries)) {
      if (g.collapsedByDefault) nextCollapsed[g.id] = true
    }
    setCollapsed((prev) => ({ ...nextCollapsed, ...prev }))
  }

  useEffect(() => {
    if (!canManage && !compact) return
    void (async () => {
      setBusy(true)
      try {
        await reloadAll()
      } catch (err) {
        onError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить импорт')
      } finally {
        setBusy(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / ids
  }, [settingId, lobbyId, canManage])

  async function run(fn: () => Promise<void>, okMessage?: string) {
    setBusy(true)
    try {
      await fn()
      if (okMessage) onToast(okMessage)
    } catch (err) {
      onError(err instanceof ApiRequestError ? err.message : 'Ошибка импорта мира')
    } finally {
      setBusy(false)
    }
  }

  async function onZip(file: File | null) {
    if (!file || !canManage) return
    await run(async () => {
      const job = await createWorldImportJob(settingId, {
        source_kind: 'zip',
        idempotencyKey: `zip-${file.name}-${file.size}-${Date.now()}`,
      })
      const result = await uploadWorldImportZip(settingId, job.id, file, '2014')
      await reloadAll(result.job.id)
    }, 'Архив разобран в черновик сверки')
  }

  async function onGit() {
    const url = gitUrl.trim()
    if (!url || !canManage) return
    await run(async () => {
      const result = await importWorldFromGit(settingId, url, {
        idempotencyKey: `git-${url}-${Date.now()}`,
      })
      await reloadAll(result.job.id)
    }, 'Git-ссылка разобрана в черновик')
  }

  async function onCreateToken() {
    await run(async () => {
      const created = await createWorldApiToken(lobbyId, settingId)
      setFreshSecret(created)
      const list = await listWorldApiTokens(lobbyId, settingId)
      setTokens(list.filter((t) => !t.revoked_at))
    }, 'Токен создан — скопируйте секрет сейчас')
  }

  async function onRevokeToken(tokenId: string) {
    if (!confirm('Отозвать токен? ИИ и внешние клиенты больше не смогут заливать.')) return
    await run(async () => {
      await revokeWorldApiToken(lobbyId, settingId, tokenId)
      const list = await listWorldApiTokens(lobbyId, settingId)
      setTokens(list.filter((t) => !t.revoked_at))
      if (freshSecret?.id === tokenId) setFreshSecret(null)
    }, 'Токен отозван')
  }

  async function onToggleAi(next: boolean) {
    if (next) {
      setAiWarnOpen(true)
      return
    }
    await run(async () => {
      const s = await patchWorldImportSettings(settingId, false)
      setImportSettings(s)
    }, 'Автоподтверждение ИИ выключено')
  }

  async function confirmAiToggleOn() {
    setAiWarnOpen(false)
    await run(async () => {
      const s = await patchWorldImportSettings(settingId, true)
      setImportSettings(s)
    }, 'ИИ может подтверждать — журнал пишется')
  }

  async function doConfirm() {
    if (!activeJob) return
    setConfirmOpen(false)
    const conflict_resolutions = Object.entries(resolutions).map(([draft_item_id, resolution]) => ({
      draft_item_id,
      resolution,
    }))
    const aiIds = new Set(
      Object.entries(selectedAi)
        .filter(([, on]) => on)
        .map(([id]) => id),
    )
    await run(async () => {
      // Без item_ids сервер берёт proposed/conflict/accepted, но не ai_suggestion.
      // Если мастер принял предложения ИИ — передаём явный список: обычные + выбранные ИИ.
      let item_ids: string[] | undefined
      if (aiIds.size > 0) {
        const regular = draftItems
          .filter(
            (it) =>
              it.item_type !== 'ai_suggestion' &&
              (it.status === 'proposed' ||
                it.status === 'conflict' ||
                it.status === 'accepted'),
          )
          .map((it) => it.id)
        item_ids = [...new Set([...regular, ...aiIds])]
      }
      const out = await confirmWorldImport(settingId, activeJob.id, {
        item_ids,
        conflict_resolutions: conflict_resolutions.length ? conflict_resolutions : undefined,
      })
      await reloadAll(out.job.id)
      onConfirmed?.()
    }, 'Импорт подтверждён — страницы в вики (игрокам не раскрыты)')
  }

  async function doUndo() {
    if (!activeJob) return
    setUndoOpen(false)
    await run(async () => {
      await undoWorldImport(settingId, activeJob.id)
      await reloadAll(activeJob.id)
      onConfirmed?.()
    }, 'Подтверждение отменено')
  }

  async function doCancel() {
    if (!activeJob) return
    if (!confirm('Отменить черновик заливки? Канон не трогаем.')) return
    await run(async () => {
      await cancelWorldImport(settingId, activeJob.id)
      await reloadAll(activeJob.id)
    }, 'Черновик отменён')
  }

  async function onRejectAi(itemId: string) {
    if (!activeJob) return
    await run(async () => {
      await rejectWorldImportDraftItem(settingId, activeJob.id, itemId)
      await reloadAll(activeJob.id)
    }, 'Предложение отклонено')
  }

  if (!canManage) {
    return (
      <Panel title="Импорт мира">
        <Text tone="muted">Заливка мира доступна только мастеру лобби.</Text>
      </Panel>
    )
  }

  if (narrow) {
    return (
      <Panel title="Импорт мира">
        <Stack gap={12}>
          <Text tone={banner.tone}>{banner.text}</Text>
          <Text tone="muted">Правила 2014. Полная сверка — на широком экране.</Text>
          {activeJob?.last_confirmed_at ? (
            <Text tone="muted">
              Последнее подтверждение:{' '}
              {new Date(activeJob.last_confirmed_at).toLocaleString('ru-RU')}
            </Text>
          ) : null}
        </Stack>
      </Panel>
    )
  }

  const filterOptions = (
    Object.keys(REVIEW_FILTER_LABELS) as WorldImportReviewFilter[]
  ).map((id) => ({ id, label: REVIEW_FILTER_LABELS[id] }))

  return (
    <>
      <Panel title="Залить мир">
        <Stack gap={16}>
          <Text>
            Черновик сверки для этого сеттинга. Правила <strong>2014</strong>. После подтверждения
            страницы появятся в вики, но игрокам не раскроются сами.
          </Text>
          <Text tone={banner.tone}>{banner.text}</Text>

          <Stack gap={8}>
            <Text as="h3">Zip или файлы</Text>
            <input
              ref={zipRef}
              type="file"
              accept=".zip,application/zip"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                void onZip(f)
                if (zipRef.current) zipRef.current.value = ''
              }}
            />
            <div className="inline-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => zipRef.current?.click()}
              >
                {busy ? 'Загружаем…' : 'Загрузить zip'}
              </Button>
            </div>
          </Stack>

          <Stack gap={8}>
            <Field label="Публичная git-ссылка (HTTPS)">
              <Input
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                placeholder="https://github.com/… или gitlab.com/…"
                disabled={busy}
              />
            </Field>
            <div className="inline-actions">
              <Button type="button" variant="secondary" disabled={busy || !gitUrl.trim()} onClick={() => void onGit()}>
                Залить по ссылке
              </Button>
            </div>
          </Stack>

          <Stack gap={8}>
            <Text as="h3">MCP по адресу</Text>
            <Text tone="muted">
              Инструкция: подключите клиент к адресу ниже и передайте токен импорта в заголовке
              Authorization. В каталоги ChatGPT/Claude ничего не публикуем.
            </Text>
            <Field label="Адрес MCP">
              <Input value={mcpWorldImportUrl()} readOnly />
            </Field>
            <Text tone="muted">
              Документация: <code>docs/world-import.md</code>, MCP:{' '}
              <code>docs/world-import-mcp.md</code>
            </Text>
          </Stack>
        </Stack>
      </Panel>

      <Panel title="Токен API импорта">
        <Stack gap={12}>
          <Text tone="muted">
            Секрет показывается один раз. Потом в списке остаётся только префикс. Токен привязан к
            этому лобби и сеттингу.
          </Text>
          {freshSecret ? (
            <Stack gap={8}>
              <Text tone="warn">Скопируйте сейчас — больше секрет не покажем:</Text>
              <Field label="Секрет">
                <Input value={freshSecret.secret} readOnly />
              </Field>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(freshSecret.secret)
                  onToast('Секрет скопирован')
                }}
              >
                Копировать секрет
              </Button>
            </Stack>
          ) : null}
          <div className="inline-actions">
            <Button type="button" disabled={busy} onClick={() => void onCreateToken()}>
              Выписать токен
            </Button>
          </div>
          {tokens.length === 0 ? (
            <Text tone="muted">Активных токенов нет.</Text>
          ) : (
            tokens.map((t) => (
              <div className="list-row" key={t.id}>
                <div>
                  <Text>
                    <code>{t.token_prefix}…</code>
                  </Text>
                  <Text tone="muted">
                    создан {new Date(t.created_at).toLocaleString('ru-RU')}
                    {t.last_used_at
                      ? ` · использован ${new Date(t.last_used_at).toLocaleString('ru-RU')}`
                      : ''}
                  </Text>
                </div>
                <div className="list-row__actions">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={busy}
                    onClick={() => void onRevokeToken(t.id)}
                  >
                    Отозвать
                  </Button>
                </div>
              </div>
            ))
          )}
        </Stack>
      </Panel>

      <Panel title="Автоподтверждение ИИ">
        <Stack gap={12}>
          <ToggleChip
            main="ИИ может подтверждать"
            rest={
              importSettings?.ai_can_confirm
                ? 'Включено — пишет в журнал'
                : 'Выключено по умолчанию'
            }
            checked={Boolean(importSettings?.ai_can_confirm)}
            disabled={busy}
            onChange={(next) => void onToggleAi(next)}
          />
          <Text tone="muted">
            Токен API этот тумблер не включает. Кто подтвердил — видно в журнале ниже.
          </Text>
        </Stack>
      </Panel>

      {confirmations.length > 0 ? (
        <Panel title="Кто подтвердил">
          <Stack gap={8}>
            {confirmations.map((c) => (
              <div className="list-row" key={c.id}>
                <div>
                  <Text>
                    {actorKindLabel(c.actor_kind)}
                    {c.undone_at ? ' · отменено' : ''}
                  </Text>
                  <Text tone="muted">{new Date(c.confirmed_at).toLocaleString('ru-RU')}</Text>
                </div>
              </div>
            ))}
          </Stack>
        </Panel>
      ) : null}

      <Panel
        title="Сверка"
        titleAside={
          activeJob ? (
            <Text tone="muted">
              {activeJob.source_kind} · правила {activeJob.rules_edition}
            </Text>
          ) : null
        }
      >
        <Stack gap={14}>
          {!activeJob ? (
            <Text tone="muted">Залейте zip или git-ссылку — здесь появится сверка.</Text>
          ) : (
            <>
              <SegmentedControl
                aria-label="Фильтр сверки"
                size="sm"
                options={filterOptions}
                value={filter}
                onChange={setFilter}
              />
              {diff?.counts ? (
                <Text tone="muted">
                  {Object.entries(diff.counts)
                    .map(([k, n]) => `${DIFF_STATUS_LABELS[k as keyof typeof DIFF_STATUS_LABELS] ?? k}: ${n}`)
                    .join(' · ')}
                </Text>
              ) : null}

              {groups.length === 0 ? (
                <Text tone="muted">По этому фильтру пунктов нет.</Text>
              ) : (
                groups.map((group) => {
                  const isCollapsed = collapsed[group.id] ?? group.collapsedByDefault
                  return (
                    <Stack gap={8} key={group.id}>
                      <div className="inline-actions">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setCollapsed((prev) => ({
                              ...prev,
                              [group.id]: !isCollapsed,
                            }))
                          }
                        >
                          {isCollapsed ? '▸' : '▾'} {group.title}
                        </Button>
                      </div>
                      {!isCollapsed
                        ? group.entries.map((entry) => {
                            const item = entry.draft_item_id
                              ? draftById.get(entry.draft_item_id)
                              : undefined
                            const officeLinks = entry.draft_item_id
                              ? linksForSourceKey(draftLinks, entry.source_key).filter(
                                  (l) => l.office_title,
                                )
                              : []
                            const emptyFields =
                              item && isCharacterEntry(entry)
                                ? emptyCharacterSheetFields(item)
                                : []
                            const attachmentId =
                              typeof item?.proposal?.attachment_id === 'string'
                                ? item.proposal.attachment_id
                                : typeof item?.proposal?.pdf_attachment_id === 'string'
                                  ? item.proposal.pdf_attachment_id
                                  : null
                            return (
                              <div className="list-row" key={`${entry.source_key}-${entry.status}`}>
                                <div>
                                  <Text>
                                    {entry.title || entry.source_key}{' '}
                                    <Text as="span" tone="muted">
                                      · {DIFF_STATUS_LABELS[entry.status] ?? entry.status}
                                    </Text>
                                  </Text>
                                  {entry.message ? <Text tone="muted">{entry.message}</Text> : null}
                                  {entry.hint ? <Text tone="muted">{entry.hint}</Text> : null}
                                  {officeLinks.map((l) => (
                                    <Text key={l.id} tone="muted">
                                      Должность «{l.office_title}»: {officeHolderLabel(l.office_holder_status)}
                                      {l.succession_order != null
                                        ? ` · порядок смены ${l.succession_order}`
                                        : ''}
                                    </Text>
                                  ))}
                                  {emptyFields.length > 0 ? (
                                    <Text tone="warn">
                                      Пустые поля листа: {emptyFields.join(', ')}
                                    </Text>
                                  ) : null}
                                  {attachmentId ? (
                                    <Text>
                                      <a
                                        className="ui-button ui-button--ghost"
                                        href={worldImportAttachmentUrl(lobbyId, attachmentId)}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Открыть PDF листа
                                      </a>
                                    </Text>
                                  ) : null}
                                  {entry.status === 'conflict' && entry.draft_item_id ? (
                                    <div className="inline-actions">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                          resolutions[entry.draft_item_id] === 'keep_ours'
                                            ? 'primary'
                                            : 'secondary'
                                        }
                                        onClick={() =>
                                          setResolutions((prev) => ({
                                            ...prev,
                                            [entry.draft_item_id!]: 'keep_ours',
                                          }))
                                        }
                                      >
                                        Оставить наше
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                          resolutions[entry.draft_item_id] === 'take_source'
                                            ? 'primary'
                                            : 'secondary'
                                        }
                                        onClick={() =>
                                          setResolutions((prev) => ({
                                            ...prev,
                                            [entry.draft_item_id!]: 'take_source',
                                          }))
                                        }
                                      >
                                        Взять из источника
                                      </Button>
                                    </div>
                                  ) : null}
                                  {entry.status === 'ai_suggestion' && entry.draft_item_id ? (
                                    <div className="inline-actions">
                                      <ToggleChip
                                        main="Принять"
                                        rest="в подтверждение"
                                        checked={Boolean(selectedAi[entry.draft_item_id])}
                                        onChange={(on) =>
                                          setSelectedAi((prev) => ({
                                            ...prev,
                                            [entry.draft_item_id!]: on,
                                          }))
                                        }
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="danger"
                                        disabled={busy}
                                        onClick={() => void onRejectAi(entry.draft_item_id!)}
                                      >
                                        Отклонить
                                      </Button>
                                    </div>
                                  ) : null}
                                  {entry.status === 'missing_in_source' ? (
                                    <Text tone="warn">
                                      В источнике больше нет — сами не удаляем, решите вручную.
                                    </Text>
                                  ) : null}
                                </div>
                              </div>
                            )
                          })
                        : null}
                    </Stack>
                  )
                })
              )}

              <div className="inline-actions">
                <Button
                  type="button"
                  disabled={busy || !activeJob || activeJob.status === 'confirmed'}
                  onClick={() => setConfirmOpen(true)}
                >
                  Подтвердить
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || !activeJob || activeJob.status !== 'confirmed'}
                  onClick={() => setUndoOpen(true)}
                >
                  Отменить подтверждение
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy || !activeJob || activeJob.status === 'cancelled'}
                  onClick={() => void doCancel()}
                >
                  Отменить черновик
                </Button>
              </div>
              <Text tone="muted">
                Квота медиа лобби — в настройках комнаты ({formatQuotaMb(0, 200 * 1024 * 1024)} лимит
                по умолчанию). PDF листов идут отдельным вложением импорта.
              </Text>
            </>
          )}
        </Stack>
      </Panel>

      <Dialog
        open={confirmOpen}
        title="Подтвердить заливку?"
        primaryLabel="Да, записать в вики"
        secondaryLabel="Назад"
        primaryVariant="primary"
        onPrimary={() => void doConfirm()}
        onSecondary={() => setConfirmOpen(false)}
        busy={busy}
      >
        <Stack gap={8}>
          <Text>
            Черновик станет страницами и сущностями сеттинга. Игрокам ничего само не раскроется.
          </Text>
          <Text tone="muted">Правила 2014. Это действие можно потом отменить.</Text>
        </Stack>
      </Dialog>

      <Dialog
        open={undoOpen}
        title="Отменить подтверждение?"
        primaryLabel="Да, откатить"
        secondaryLabel="Оставить"
        primaryVariant="danger"
        onPrimary={() => void doUndo()}
        onSecondary={() => setUndoOpen(false)}
        busy={busy}
      >
        <Text>Последнее подтверждение будет отменено. Черновик задания останется для сверки.</Text>
      </Dialog>

      <Dialog
        open={aiWarnOpen}
        title="Включить автоподтверждение ИИ?"
        primaryLabel="Включить"
        secondaryLabel="Оставить выкл."
        primaryVariant="danger"
        onPrimary={() => void confirmAiToggleOn()}
        onSecondary={() => setAiWarnOpen(false)}
        busy={busy}
      >
        <Stack gap={8}>
          <Text>
            ИИ с токеном сможет сам подтверждать заливку в канон. Кто подтвердил — пишется в журнал.
          </Text>
          <Text tone="warn">Включайте только если доверяете подключению. По умолчанию выключено.</Text>
        </Stack>
      </Dialog>
    </>
  )
}
