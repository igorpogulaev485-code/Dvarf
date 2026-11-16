import { useCallback, useEffect, useState } from 'react'
import {
  acceptAdminCatalogDraft,
  getAdminCatalogEntry,
  listAdminCatalog,
  listAdminCatalogNameFeedback,
  rejectAdminCatalogDraft,
  rollbackAdminCatalogRevision,
  upsertAdminCatalogDraft,
  withdrawAdminCatalogDraft,
  type AdminCatalogDetail,
  type AdminCatalogListItem,
  type AdminCatalogNameFeedbackItem,
} from '../../shared/api/admin'
import { ApiRequestError } from '../../shared/api/client'
import {
  Button,
  Chip,
  ChipStack,
  Dialog,
  EmptyState,
  Field,
  Input,
  Panel,
  Select,
  Stack,
  Text,
} from '../../ui'

const KIND_OPTIONS = [
  { value: '', label: 'Все типы' },
  { value: 'race', label: 'раса' },
  { value: 'class', label: 'класс' },
  { value: 'subclass', label: 'подкласс' },
  { value: 'background', label: 'предыстория' },
  { value: 'feat', label: 'черта' },
  { value: 'spell', label: 'заклинание' },
  { value: 'weapon', label: 'оружие' },
  { value: 'armor', label: 'доспех' },
  { value: 'item', label: 'предмет' },
  { value: 'bestiary', label: 'бестиарий' },
  { value: 'condition', label: 'состояние' },
  { value: 'alignment', label: 'мировоззрение' },
  { value: 'skill', label: 'навык' },
]

const EDITION_OPTIONS = [
  { value: '', label: 'Все редакции' },
  { value: '2014', label: '2014' },
  { value: '2024', label: '2024' },
]

const LAYER_OPTIONS = [
  { value: '', label: 'Все слои' },
  { value: 'srd', label: 'SRD' },
  { value: 'community_ref', label: 'книга вне SRD' },
  { value: 'user_import', label: 'импорт игрока' },
  { value: 'homebrew', label: 'хомбрю' },
]

const PENDING_OPTIONS = [
  { value: '', label: 'Черновик: все' },
  { value: 'yes', label: 'Есть черновик' },
  { value: 'no', label: 'Без черновика' },
]

function formatEkaterinburg(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ru-RU', {
      timeZone: 'Asia/Yekaterinburg',
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

type Props = {
  isFullAdmin: boolean
  onToast: (message: string) => void
}

export function AdminCatalogSection({ isFullAdmin, onToast }: Props) {
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('')
  const [edition, setEdition] = useState('')
  const [layer, setLayer] = useState('')
  const [pendingFilter, setPendingFilter] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<AdminCatalogListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminCatalogDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [draftRu, setDraftRu] = useState('')
  const [draftEn, setDraftEn] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmAccept, setConfirmAccept] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const [confirmRollbackId, setConfirmRollbackId] = useState<string | null>(null)
  const [nameFeedback, setNameFeedback] = useState<AdminCatalogNameFeedbackItem[]>([])

  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listAdminCatalog({
        q: query || undefined,
        kind: kind || undefined,
        edition: edition || undefined,
        layer: layer || undefined,
        has_pending: pendingFilter === 'yes' ? true : pendingFilter === 'no' ? false : undefined,
        page,
        page_size: pageSize,
      })
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      onToast(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить справочник')
    } finally {
      setLoading(false)
    }
  }, [query, kind, edition, layer, pendingFilter, page, onToast])

  const loadDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true)
      try {
        const data = await getAdminCatalogEntry(id)
        setDetail(data)
        setDraftRu(data.pending?.name_ru || data.name_ru_live)
        setDraftEn(data.pending?.name_en || data.name_en_live || '')
      } catch (err) {
        onToast(err instanceof ApiRequestError ? err.message : 'Не удалось открыть карточку')
        setDetail(null)
      } finally {
        setDetailLoading(false)
      }
    },
    [onToast],
  )

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    void loadDetail(selectedId)
  }, [selectedId, loadDetail])

  useEffect(() => {
    let active = true
    listAdminCatalogNameFeedback({ page: 1, page_size: 5 })
      .then((data) => {
        if (active) setNameFeedback(data.items)
      })
      .catch(() => {
        /* раздел справочников работает и без ленты сообщений */
      })
    return () => {
      active = false
    }
  }, [])

  async function saveDraft() {
    if (!detail || !detail.can_edit_draft) return
    setBusy(true)
    try {
      const updated = await upsertAdminCatalogDraft(
        detail.id,
        draftRu.trim(),
        draftEn.trim() || null,
      )
      setDetail(updated)
      onToast('Черновик сохранён — на проверку')
      void loadList()
    } catch (err) {
      onToast(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить черновик')
    } finally {
      setBusy(false)
    }
  }

  async function withdrawDraft() {
    if (!detail || !detail.can_withdraw) return
    setBusy(true)
    try {
      const updated = await withdrawAdminCatalogDraft(detail.id)
      setDetail(updated)
      setDraftRu(updated.name_ru_live)
      setDraftEn(updated.name_en_live || '')
      onToast('Черновик отозван')
      void loadList()
    } catch (err) {
      onToast(err instanceof ApiRequestError ? err.message : 'Не удалось отозвать черновик')
    } finally {
      setBusy(false)
    }
  }

  async function doAccept() {
    if (!detail) return
    setBusy(true)
    try {
      const updated = await acceptAdminCatalogDraft(detail.id)
      setDetail(updated)
      setConfirmAccept(false)
      onToast('Название принято — игроки увидят его в справочнике')
      void loadList()
    } catch (err) {
      onToast(err instanceof ApiRequestError ? err.message : 'Не удалось принять')
    } finally {
      setBusy(false)
    }
  }

  async function doReject() {
    if (!detail) return
    setBusy(true)
    try {
      const updated = await rejectAdminCatalogDraft(detail.id)
      setDetail(updated)
      setConfirmReject(false)
      onToast('Черновик отклонён')
      void loadList()
    } catch (err) {
      onToast(err instanceof ApiRequestError ? err.message : 'Не удалось отклонить')
    } finally {
      setBusy(false)
    }
  }

  async function doRollback(revisionId: string) {
    if (!detail) return
    setBusy(true)
    try {
      const updated = await rollbackAdminCatalogRevision(detail.id, revisionId)
      setDetail(updated)
      setConfirmRollbackId(null)
      onToast('Правка откачена')
      void loadList()
    } catch (err) {
      onToast(err instanceof ApiRequestError ? err.message : 'Не удалось откатить')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap={16}>
      <Panel title="Справочники">
        <Stack gap={12}>
          <Stack gap={8}>
            <Field label="Поиск">
              <Input
                value={queryDraft}
                onChange={(e) => setQueryDraft(e.target.value)}
                placeholder="Русское или английское имя, слаг, id"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1)
                    setQuery(queryDraft.trim())
                  }
                }}
              />
            </Field>
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  setPage(1)
                  setQuery(queryDraft.trim())
                }}
              >
                Найти
              </Button>
            </div>
          </Stack>

          <Stack gap={8}>
            <Field label="Тип">
              <Select
                aria-label="Тип записи"
                value={kind}
                onChange={(e) => {
                  setPage(1)
                  setKind(e.target.value)
                }}
              >
                {KIND_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Редакция">
              <Select
                aria-label="Редакция"
                value={edition}
                onChange={(e) => {
                  setPage(1)
                  setEdition(e.target.value)
                }}
              >
                {EDITION_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all-ed'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Слой">
              <Select
                aria-label="Слой содержимого"
                value={layer}
                onChange={(e) => {
                  setPage(1)
                  setLayer(e.target.value)
                }}
              >
                {LAYER_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all-layer'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Черновик">
              <Select
                aria-label="Фильтр черновика"
                value={pendingFilter}
                onChange={(e) => {
                  setPage(1)
                  setPendingFilter(e.target.value)
                }}
              >
                {PENDING_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all-pending'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
          </Stack>

          {loading ? <Text tone="muted">Загружаем список…</Text> : null}

          {!loading && items.length === 0 ? (
            <EmptyState title="Ничего не нашли" description="Измените фильтры или запрос" />
          ) : null}

          <Stack gap={8}>
            {items.map((item) => {
              const open = selectedId === item.id
              return (
                <Panel
                  key={item.id}
                  title={item.name_ru_live}
                  titleAside={
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedId(open ? null : item.id)}
                    >
                      {open ? 'Свернуть' : 'Открыть'}
                    </Button>
                  }
                >
                  <Stack gap={6}>
                    <Text tone="muted">
                      {item.kind_label} · {item.rules_edition} · {item.slug}
                      {!item.is_active ? ' · неактивна' : ''}
                    </Text>
                    <ChipStack>
                      <Chip>{item.content_layer_label}</Chip>
                      {item.has_pending ? <Chip>черновик</Chip> : null}
                      {item.names_differ ? <Chip>имя отличается от сида</Chip> : null}
                    </ChipStack>
                    {item.names_differ ? (
                      <Text tone="muted">В сиде: {item.name_ru_seed}</Text>
                    ) : null}
                    {item.has_pending && item.pending_name_ru ? (
                      <Text tone="muted">Черновик: {item.pending_name_ru}</Text>
                    ) : null}
                    <Text tone="muted">Обновлено: {formatEkaterinburg(item.updated_at)}</Text>

                    {open ? (
                      detailLoading || !detail || detail.id !== item.id ? (
                        <Text tone="muted">Загружаем карточку…</Text>
                      ) : (
                        <Stack gap={12}>
                          <Text>
                            В игре: {detail.name_ru_live}
                            {detail.name_en_live ? ` / ${detail.name_en_live}` : ''}
                          </Text>
                          <Text tone="muted">
                            В сиде: {detail.name_ru_seed}
                            {detail.name_en_seed ? ` / ${detail.name_en_seed}` : ''}
                          </Text>
                          <Text tone="muted">
                            Источник: {detail.source || '—'} · слой: {detail.content_layer_label}
                          </Text>
                          {detail.parent_name_ru ? (
                            <Text tone="muted">Родитель: {detail.parent_name_ru}</Text>
                          ) : null}
                          <Text tone="muted">Слаг (только чтение): {detail.slug}</Text>

                          {detail.can_edit_draft ? (
                            <Stack gap={8}>
                              <Field label="Русское название (черновик)">
                                <Input
                                  value={draftRu}
                                  onChange={(e) => setDraftRu(e.target.value)}
                                  maxLength={160}
                                />
                              </Field>
                              <Field label="Английское название (необязательно)">
                                <Input
                                  value={draftEn}
                                  onChange={(e) => setDraftEn(e.target.value)}
                                  maxLength={160}
                                  placeholder="Пустое поле не затирает живое английское имя"
                                />
                              </Field>
                              <ChipStack>
                                <Button
                                  variant="primary"
                                  disabled={busy || !draftRu.trim()}
                                  onClick={() => void saveDraft()}
                                >
                                  Сохранить черновик
                                </Button>
                                {detail.can_withdraw ? (
                                  <Button
                                    variant="ghost"
                                    disabled={busy}
                                    onClick={() => void withdrawDraft()}
                                  >
                                    Отозвать черновик
                                  </Button>
                                ) : null}
                              </ChipStack>
                            </Stack>
                          ) : detail.pending ? (
                            <Text tone="muted">
                              Черновик на проверку: {detail.pending.name_ru}
                              {detail.pending.author_name
                                ? ` (автор: ${detail.pending.author_name})`
                                : ''}
                            </Text>
                          ) : null}

                          {isFullAdmin && detail.pending ? (
                            <ChipStack>
                              {detail.can_accept ? (
                                <Button
                                  variant="primary"
                                  disabled={busy}
                                  onClick={() => setConfirmAccept(true)}
                                >
                                  Принять
                                </Button>
                              ) : null}
                              {detail.can_reject ? (
                                <Button
                                  variant="danger"
                                  disabled={busy}
                                  onClick={() => setConfirmReject(true)}
                                >
                                  Отклонить
                                </Button>
                              ) : null}
                            </ChipStack>
                          ) : null}

                          <Stack gap={8}>
                            <Text as="h3">Журнал правок</Text>
                            {detail.revisions.length === 0 ? (
                              <Text tone="muted">Пока пусто</Text>
                            ) : (
                              detail.revisions.map((rev) => (
                                <Panel key={rev.id} title={rev.status_label}>
                                  <Stack gap={6}>
                                    <Text>
                                      {rev.name_ru}
                                      {rev.name_en ? ` / ${rev.name_en}` : ''}
                                    </Text>
                                    {rev.previous_name_ru ? (
                                      <Text tone="muted">
                                        Было: {rev.previous_name_ru}
                                        {rev.previous_name_en
                                          ? ` / ${rev.previous_name_en}`
                                          : ''}
                                      </Text>
                                    ) : null}
                                    <Text tone="muted">
                                      {rev.author_name ? `Автор: ${rev.author_name} · ` : ''}
                                      {formatEkaterinburg(rev.created_at)}
                                      {rev.reviewed_at
                                        ? ` · рассмотрено ${formatEkaterinburg(rev.reviewed_at)}`
                                        : ''}
                                      {rev.reviewer_name ? ` (${rev.reviewer_name})` : ''}
                                    </Text>
                                    {rev.can_rollback ? (
                                      <div>
                                        <Button
                                          variant="danger"
                                          disabled={busy}
                                          onClick={() => setConfirmRollbackId(rev.id)}
                                        >
                                          Откатить
                                        </Button>
                                      </div>
                                    ) : null}
                                  </Stack>
                                </Panel>
                              ))
                            )}
                          </Stack>
                        </Stack>
                      )
                    ) : null}
                  </Stack>
                </Panel>
              )
            })}
          </Stack>

          {totalPages > 1 ? (
            <Stack gap={8}>
              <Text tone="muted">
                Страница {page} из {totalPages} · всего {total}
              </Text>
              <ChipStack>
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Назад
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Вперёд
                </Button>
              </ChipStack>
            </Stack>
          ) : (
            <Text tone="muted">Всего записей: {total}</Text>
          )}
        </Stack>
      </Panel>

      {nameFeedback.length > 0 ? (
        <Panel title="Сообщения про названия">
          <Stack gap={8}>
            <Text tone="muted">
              Тема «Название в справочнике». Почта и ссылка на аккаунт скрыты.
            </Text>
            {nameFeedback.map((msg) => (
              <Panel key={msg.id} title={msg.status_label}>
                <Stack gap={6}>
                  <Text>{msg.body}</Text>
                  <Text tone="muted">
                    {msg.is_anonymous
                      ? 'Анонимно'
                      : msg.author_name || 'Автор скрыт'}{' '}
                    · {formatEkaterinburg(msg.created_at)}
                  </Text>
                </Stack>
              </Panel>
            ))}
          </Stack>
        </Panel>
      ) : null}

      <Dialog
        open={confirmAccept}
        title="Принять название?"
        primaryLabel="Принять"
        secondaryLabel="Отмена"
        busy={busy}
        onPrimary={() => void doAccept()}
        onSecondary={() => {
          if (!busy) setConfirmAccept(false)
        }}
      >
        <Text>После принятия игроки увидят новое имя в справочнике и в поиске.</Text>
      </Dialog>

      <Dialog
        open={confirmReject}
        title="Отклонить черновик?"
        primaryLabel="Отклонить"
        secondaryLabel="Отмена"
        busy={busy}
        primaryVariant="danger"
        onPrimary={() => void doReject()}
        onSecondary={() => {
          if (!busy) setConfirmReject(false)
        }}
      >
        <Text>Живое имя в игре не изменится.</Text>
      </Dialog>

      <Dialog
        open={Boolean(confirmRollbackId)}
        title="Откатить принятую правку?"
        primaryLabel="Откатить"
        secondaryLabel="Отмена"
        busy={busy}
        primaryVariant="danger"
        onPrimary={() => {
          if (confirmRollbackId) void doRollback(confirmRollbackId)
        }}
        onSecondary={() => {
          if (!busy) setConfirmRollbackId(null)
        }}
      >
        <Text>
          Живым снова станет предыдущее принятое имя или сидовое, если принятых больше нет.
        </Text>
      </Dialog>
    </Stack>
  )
}
