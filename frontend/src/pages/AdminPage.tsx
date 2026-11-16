import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  changeAdminPassword,
  getAdminStatus,
  listAdminAccounts,
  setupAdminPassword,
  type AdminAccountItem,
  type AdminStatus,
} from '../shared/api/admin'
import { ApiRequestError } from '../shared/api/client'
import { AppLegalFooter } from '../shared/brand/creed20'
import {
  Button,
  Chip,
  ChipStack,
  Dialog,
  EmptyState,
  Field,
  Input,
  Panel,
  PasswordInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Toast,
} from '../ui'

/** Узкий экран: сегменты из 5 длинных названий сжимаются — kit Select, как в кабинете/лобби. */
function useCompactAdminNav(maxWidthPx = 1100): boolean {
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

type AdminSection = 'accounts' | 'help' | 'metrics' | 'feedback' | 'catalog'

const SECTION_OPTIONS: { id: AdminSection; label: string }[] = [
  { id: 'accounts', label: 'Аккаунты' },
  { id: 'help', label: 'Помощь' },
  { id: 'metrics', label: 'Метрики' },
  { id: 'feedback', label: 'Обратная связь' },
  { id: 'catalog', label: 'Справочники' },
]

const LIVE_SECTIONS = new Set<AdminSection>(['accounts'])

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

function loginMethodsLabel(item: AdminAccountItem): string {
  const parts: string[] = []
  if (item.login_methods.has_password) parts.push('пароль')
  if (item.login_methods.yandex) parts.push('Яндекс')
  if (item.login_methods.vk) parts.push('VK')
  return parts.length ? parts.join(', ') : '—'
}

export function AdminPage() {
  const navigate = useNavigate()
  const compactNav = useCompactAdminNav()
  const [status, setStatus] = useState<AdminStatus | null>(null)
  const [section, setSection] = useState<AdminSection>('accounts')
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState<'missing' | 'forbidden' | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [accounts, setAccounts] = useState<AdminAccountItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [pwdOpen, setPwdOpen] = useState(false)
  const [pwdMode, setPwdMode] = useState<'setup' | 'change'>('setup')
  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdBusy, setPwdBusy] = useState(false)

  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    getAdminStatus()
      .then((next) => {
        if (!active) return
        setStatus(next)
        setDenied(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiRequestError && err.status === 401) {
          navigate('/login', { replace: true, state: { from: '/admin' } })
          return
        }
        if (err instanceof ApiRequestError && err.status === 404) {
          setDenied('missing')
          return
        }
        if (err instanceof ApiRequestError && err.status === 403) {
          setDenied('forbidden')
          return
        }
        setDenied('missing')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [navigate])

  const loadAccounts = useCallback(
    async (q: string, pageNum: number) => {
      setAccountsLoading(true)
      try {
        const data = await listAdminAccounts({
          q: q || undefined,
          page: pageNum,
          page_size: 20,
        })
        setAccounts(data.items)
        setTotal(data.total)
        setPage(data.page)
      } catch (err: unknown) {
        if (err instanceof ApiRequestError && err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setToast(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить аккаунты')
      } finally {
        setAccountsLoading(false)
      }
    },
    [navigate],
  )

  useEffect(() => {
    if (!status || section !== 'accounts') return
    void loadAccounts(query, page)
  }, [status, section, query, page, loadAccounts])

  if (denied === 'missing') {
    return <Navigate to="/" replace />
  }

  if (denied === 'forbidden') {
    return (
      <main className="page page--app">
        <Stack gap={16}>
          <Text as="h1">Нет доступа</Text>
          <Text tone="muted">Этот раздел недоступен для вашего аккаунта.</Text>
          <Link className="back-link" to="/characters">
            ← К персонажам
          </Link>
        </Stack>
      </main>
    )
  }

  if (loading || !status) {
    return (
      <main className="page page--app">
        <Text tone="muted">Загружаем админку…</Text>
      </main>
    )
  }

  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const sectionTitle =
    SECTION_OPTIONS.find((item) => item.id === section)?.label || 'Раздел'

  async function submitPassword() {
    setPwdBusy(true)
    try {
      if (pwdMode === 'setup') {
        const res = await setupAdminPassword(pwdNew, pwdConfirm)
        setToast(res.message)
        setStatus((prev) => (prev ? { ...prev, admin_password_set: true } : prev))
      } else {
        const res = await changeAdminPassword(pwdCurrent, pwdNew, pwdConfirm)
        setToast(res.message)
      }
      setPwdOpen(false)
      setPwdCurrent('')
      setPwdNew('')
      setPwdConfirm('')
    } catch (err: unknown) {
      setToast(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить пароль')
    } finally {
      setPwdBusy(false)
    }
  }

  return (
    <main className="page page--app">
      <Stack gap={20}>
        <header className="cabinet-header">
          <Link className="back-link" to="/cabinet">
            ← В кабинет
          </Link>
          <Stack gap={6}>
            <Text as="h1">Админка</Text>
            <Text tone="muted">
              {status.display_name ? `Вы вошли как ${status.display_name}` : 'Закрытый раздел'}
            </Text>
          </Stack>
        </header>

        {!status.admin_password_set ? (
          <Panel title="Пароль админки">
            <Stack gap={12}>
              <Text>
                Сначала задайте отдельный пароль админки. Он не совпадает с паролем входа и нужен
                для опасных действий.
              </Text>
              <div>
                <Button
                  variant="primary"
                  onClick={() => {
                    setPwdMode('setup')
                    setPwdOpen(true)
                  }}
                >
                  Задать пароль админки
                </Button>
              </div>
            </Stack>
          </Panel>
        ) : (
          <Stack gap={8}>
            <ChipStack>
              <Chip>Пароль админки задан</Chip>
            </ChipStack>
            <div>
              <Button
                variant="ghost"
                onClick={() => {
                  setPwdMode('change')
                  setPwdOpen(true)
                }}
              >
                Сменить пароль админки
              </Button>
            </div>
          </Stack>
        )}

        {compactNav ? (
          <Field label="Раздел">
            <Select
              aria-label="Разделы админки"
              value={section}
              onChange={(event) => setSection(event.target.value as AdminSection)}
            >
              {SECTION_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <SegmentedControl
            aria-label="Разделы админки"
            value={section}
            onChange={setSection}
            options={SECTION_OPTIONS}
          />
        )}

        {section === 'accounts' && LIVE_SECTIONS.has(section) ? (
          <Panel title="Аккаунты">
            <Stack gap={16}>
              <Stack gap={8}>
                <Field label="Поиск">
                  <Input
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    placeholder="Почта, имя или идентификатор"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setPage(1)
                        setQuery(searchDraft.trim())
                      }
                    }}
                  />
                </Field>
                <div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPage(1)
                      setQuery(searchDraft.trim())
                    }}
                  >
                    Найти
                  </Button>
                </div>
              </Stack>

              {accountsLoading ? <Text tone="muted">Загружаем список…</Text> : null}

              {!accountsLoading && accounts.length === 0 ? (
                <EmptyState
                  title="Никого не нашли"
                  description="Измените запрос или сбросьте поиск"
                />
              ) : null}

              <Stack gap={12}>
                {accounts.map((item) => {
                  const open = expandedId === item.id
                  return (
                    <Panel
                      key={item.id}
                      title={item.display_name || item.email || 'Без имени'}
                      titleAside={
                        <Button
                          variant="ghost"
                          onClick={() => setExpandedId(open ? null : item.id)}
                        >
                          {open ? 'Свернуть' : 'Подробнее'}
                        </Button>
                      }
                    >
                      <Stack gap={8}>
                        <Text tone="muted">
                          Регистрация: {formatDate(item.created_at)}
                          {' · '}
                          {item.email || 'почта не указана'}
                          {item.email
                            ? item.email_verified
                              ? ' (подтверждена)'
                              : ' (не подтверждена)'
                            : ''}
                        </Text>
                        <Text tone="muted">
                          Вход: {loginMethodsLabel(item)} · активность:{' '}
                          {formatDate(item.last_seen_at)}
                        </Text>
                        <Text>
                          Персонажи: всего {item.characters.total} (2014:{' '}
                          {item.characters.edition_2014}, 2024: {item.characters.edition_2024},
                          черновики: {item.characters.drafts})
                        </Text>
                        <Text>
                          Лобби: своих {item.lobbies.owned}, как игрок {item.lobbies.as_player}
                        </Text>
                        {open ? (
                          <Stack gap={8}>
                            <Text tone="muted">Идентификатор: {item.id}</Text>
                            <ChipStack>
                              <Chip inactive>Помощь · скоро</Chip>
                              <Chip inactive>Сообщения · скоро</Chip>
                            </ChipStack>
                          </Stack>
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
              ) : null}
            </Stack>
          </Panel>
        ) : (
          <Panel title={sectionTitle}>
            <EmptyState
              title="Раздел появится в следующей пачке"
              description="Сейчас доступен только список аккаунтов"
            />
          </Panel>
        )}

        <AppLegalFooter />
      </Stack>

      <Dialog
        open={pwdOpen}
        title={pwdMode === 'setup' ? 'Задать пароль админки' : 'Сменить пароль админки'}
        primaryLabel={pwdMode === 'setup' ? 'Сохранить' : 'Сменить'}
        secondaryLabel="Отмена"
        busy={pwdBusy}
        primaryDisabled={
          pwdBusy ||
          pwdNew.length < 8 ||
          pwdNew !== pwdConfirm ||
          (pwdMode === 'change' && !pwdCurrent)
        }
        onPrimary={() => {
          void submitPassword()
        }}
        onSecondary={() => {
          if (pwdBusy) return
          setPwdOpen(false)
          setPwdCurrent('')
          setPwdNew('')
          setPwdConfirm('')
        }}
      >
        <Stack gap={12}>
          <Text tone="muted">
            Пароль админки хранится только как хеш и не совпадает с паролем входа.
          </Text>
          {pwdMode === 'change' ? (
            <Field label="Текущий пароль админки">
              <PasswordInput
                value={pwdCurrent}
                onChange={(e) => setPwdCurrent(e.target.value)}
                autoComplete="off"
              />
            </Field>
          ) : null}
          <Field label="Новый пароль админки">
            <PasswordInput
              value={pwdNew}
              onChange={(e) => setPwdNew(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Повтор пароля">
            <PasswordInput
              value={pwdConfirm}
              onChange={(e) => setPwdConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </Stack>
      </Dialog>

      {toast ? <Toast message={toast} onClose={closeToast} /> : null}
    </main>
  )
}
