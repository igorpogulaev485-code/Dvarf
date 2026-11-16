import { useCallback, useEffect, useRef, useState } from 'react'
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
  DetailsMenu,
  Dialog,
  EmptyState,
  Field,
  Input,
  Pagination,
  Panel,
  ScrollRow,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '../../ui'
import { useAdminPaging } from './useAdminPaging'

const KIND_OPTIONS = [
  { value: '', label: 'Все типы' },
  { value: 'race', label: 'Раса' },
  { value: 'class', label: 'Класс' },
  { value: 'subclass', label: 'Подкласс' },
  { value: 'background', label: 'Предыстория' },
  { value: 'feat', label: 'Черта' },
  { value: 'spell', label: 'Заклинание' },
  { value: 'weapon', label: 'Оружие' },
  { value: 'armor', label: 'Доспех' },
  { value: 'item', label: 'Предмет' },
  { value: 'bestiary', label: 'Бестиарий' },
  { value: 'condition', label: 'Состояние' },
  { value: 'alignment', label: 'Мировоззрение' },
  { value: 'skill', label: 'Навык' },
]

const EDITION_OPTIONS: { id: string; label: string }[] = [
  { id: '', label: 'Все' },
  { id: '2014', label: '2014' },
  { id: '2024', label: '2024' },
]

const LAYER_OPTIONS = [
  { value: '', label: 'Все слои' },
  { value: 'srd', label: 'Базовые правила' },
  { value: 'community_ref', label: 'книга вне базовых правил' },
  { value: 'user_import', label: 'импорт игрока' },
  { value: 'homebrew', label: 'Свой контент' },
]

const PENDING_OPTIONS: { id: string; label: string }[] = [
  { id: '', label: 'Все' },
  { id: 'yes', label: 'Есть' },
  { id: 'no', label: 'Нет' },
]

function useCompactFilters(maxWidthPx = 960): boolean {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`)
    const apply = () => setCompact(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [maxWidthPx])
  return compact
}

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
  const compact = useCompactFilters()
  const { page, pageSize, setPage, setPageSize, resetPage } = useAdminPaging()
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('')
  const [edition, setEdition] = useState('')
  const [layer, setLayer] = useState('')
  const [pendingFilter, setPendingFilter] = useState('')
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
  const filtersKey = `${query}|${kind}|${edition}|${layer}|${pendingFilter}`
  const prevFiltersKey = useRef(filtersKey)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    if (prevFiltersKey.current === filtersKey) return
    prevFiltersKey.current = filtersKey
    resetPage()
  }, [filtersKey, resetPage])

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
  }, [query, kind, edition, layer, pendingFilter, page, pageSize, onToast])
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

  const layerSelect = (
    <Field label="Слой">
      <Select
        aria-label="Слой содержимого"
        size="sm"
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
  )

  return (
    <Stack gap={16}>
      <Panel title="Справочники">
        <Stack gap={12}>
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'flex-end',
            }}
          >
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <Field label="Поиск">
                <Input
                  value={queryDraft}
                  onChange={(e) => setQueryDraft(e.target.value)}
                  placeholder="Русское или английское имя, код записи, id"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setPage(1)
                      setQuery(queryDraft.trim())
                    }
                  }}
                />
              </Field>
            </div>
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

          <Stack gap={8}>
            <Field label="Редакция">
              <SegmentedControl
                aria-label="Редакция"
                size="sm"
                value={edition}
                onChange={(id) => {
                  setPage(1)
                  setEdition(id)
                }}
                options={EDITION_OPTIONS}
              />
            </Field>
            <Field label="Черновик">
              <SegmentedControl
                aria-label="Фильтр черновика"
                size="sm"
                value={pendingFilter}
                onChange={(id) => {
                  setPage(1)
                  setPendingFilter(id)
                }}
                options={PENDING_OPTIONS}
              />
            </Field>
          </Stack>

          {compact ? (
            <Stack gap={8}>
              <div style={{ maxWidth: 280 }}>
                <Field label="Тип">
                  <Select
                    aria-label="Тип записи"
                    size="sm"
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
              </div>
              <DetailsMenu summary="Ещё фильтры">
                <Stack gap={8}>{layerSelect}</Stack>
              </DetailsMenu>
            </Stack>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'flex-end',
              }}
            >
              <div style={{ flex: '0 1 220px', maxWidth: 240, minWidth: 140 }}>
                <Field label="Тип">
                  <Select
                    aria-label="Тип записи"
                    size="sm"
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
              </div>
              <div style={{ flex: '0 1 260px', maxWidth: 280, minWidth: 160 }}>
                {layerSelect}
              </div>
            </div>
          )}

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
                      {item.kind_label} · {item.rules_edition}
                      {item.name_ru_live ? '' : ` · ${item.slug}`}
                      {!item.is_active ? ' · неактивна' : ''}
                    </Text>
                    <ScrollRow>
                      <Chip inactive>{item.content_layer_label}</Chip>
                      {item.has_pending ? <Chip inactive>Черновик</Chip> : null}
                      {item.names_differ ? (
                        <Chip inactive>имя отличается от исходного</Chip>
                      ) : null}
                    </ScrollRow>
                    {item.names_differ ? (
                      <Text tone="muted">Исходное название: {item.name_ru_seed}</Text>
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
                            Исходное название: {detail.name_ru_seed}
                            {detail.name_en_seed ? ` / ${detail.name_en_seed}` : ''}
                          </Text>
                          <Text tone="muted">
                            Источник: {detail.source || '—'} · слой: {detail.content_layer_label}
                          </Text>
                          {detail.parent_name_ru ? (
                            <Text tone="muted">Родитель: {detail.parent_name_ru}</Text>
                          ) : null}
                          <Text tone="muted">Код записи (только чтение): {detail.slug}</Text>

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

          {total > 0 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
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
          Живым снова станет предыдущее принятое имя или исходное, если принятых больше нет.
        </Text>
      </Dialog>
    </Stack>
  )
}
