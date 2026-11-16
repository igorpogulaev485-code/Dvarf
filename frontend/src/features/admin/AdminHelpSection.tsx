import { useCallback, useEffect, useState } from 'react'
import {
  adminBlockUser,
  adminChangeEmail,
  adminDeleteUser,
  adminMarkEmailVerified,
  adminResendVerification,
  adminRevokeAllSessions,
  adminRevokeSession,
  adminSendPasswordReset,
  adminUnblockUser,
  adminUnlinkOAuth,
  getAdminAccount,
  listAdminAccountSessions,
  listAdminAccounts,
  type AdminAccountItem,
  type AdminSessionItem,
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
  PasswordInput,
  Stack,
  Text,
} from '../../ui'

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

type DangerKind =
  | 'email'
  | 'resend'
  | 'verify'
  | 'reset'
  | 'revokeOne'
  | 'revokeAll'
  | 'unlinkYandex'
  | 'unlinkVk'
  | 'block'
  | 'unblock'
  | 'delete'

type Props = {
  initialUserId?: string | null
  passwordSet: boolean
  onToast: (message: string) => void
  onOpenPasswordSetup: () => void
}

export function AdminHelpSection({
  initialUserId = null,
  passwordSet,
  onToast,
  onOpenPasswordSetup,
}: Props) {
  const [query, setQuery] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [candidates, setCandidates] = useState<AdminAccountItem[]>([])
  const [account, setAccount] = useState<AdminAccountItem | null>(null)
  const [sessions, setSessions] = useState<AdminSessionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)

  const [danger, setDanger] = useState<DangerKind | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newEmailConfirm, setNewEmailConfirm] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadAccount = useCallback(
    async (userId: string) => {
      setLoading(true)
      try {
        const next = await getAdminAccount(userId)
        setAccount(next)
        setSessionsLoading(true)
        try {
          const sess = await listAdminAccountSessions(userId)
          setSessions(sess.items)
        } catch (err: unknown) {
          setSessions([])
          onToast(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить сессии')
        } finally {
          setSessionsLoading(false)
        }
      } catch (err: unknown) {
        setAccount(null)
        onToast(err instanceof ApiRequestError ? err.message : 'Не удалось открыть карточку')
      } finally {
        setLoading(false)
      }
    },
    [onToast],
  )

  useEffect(() => {
    if (initialUserId) {
      void loadAccount(initialUserId)
    }
  }, [initialUserId, loadAccount])

  async function searchAccounts(rawQuery?: string) {
    const q = (rawQuery ?? query).trim()
    setQuery(q)
    setLoading(true)
    try {
      const data = await listAdminAccounts({ q: q || undefined, page: 1, page_size: 20 })
      setCandidates(data.items)
      if (data.items.length === 1) {
        await loadAccount(data.items[0].id)
      }
    } catch (err: unknown) {
      onToast(err instanceof ApiRequestError ? err.message : 'Не удалось найти аккаунты')
    } finally {
      setLoading(false)
    }
  }

  function closeDanger() {
    if (busy) return
    setDanger(null)
    setAdminPassword('')
    setNewEmail('')
    setNewEmailConfirm('')
    setDeleteConfirm('')
    setSessionToRevoke(null)
  }

  function openDanger(kind: DangerKind, sessionId?: string) {
    if (!passwordSet) {
      onToast('Сначала задайте пароль админки')
      onOpenPasswordSetup()
      return
    }
    setAdminPassword('')
    setNewEmail('')
    setNewEmailConfirm('')
    setDeleteConfirm('')
    setSessionToRevoke(sessionId || null)
    setDanger(kind)
  }

  async function submitDanger() {
    if (!account || !danger) return
    setBusy(true)
    try {
      let message = ''
      switch (danger) {
        case 'email':
          message = (
            await adminChangeEmail(account.id, newEmail, newEmailConfirm, adminPassword)
          ).message
          break
        case 'resend':
          message = (await adminResendVerification(account.id, adminPassword)).message
          break
        case 'verify':
          message = (await adminMarkEmailVerified(account.id, adminPassword)).message
          break
        case 'reset':
          message = (await adminSendPasswordReset(account.id, adminPassword)).message
          break
        case 'revokeOne':
          if (!sessionToRevoke) throw new Error('session')
          message = (await adminRevokeSession(account.id, sessionToRevoke, adminPassword)).message
          break
        case 'revokeAll':
          message = (await adminRevokeAllSessions(account.id, adminPassword)).message
          break
        case 'unlinkYandex':
          message = (await adminUnlinkOAuth(account.id, 'yandex', adminPassword)).message
          break
        case 'unlinkVk':
          message = (await adminUnlinkOAuth(account.id, 'vk', adminPassword)).message
          break
        case 'block':
          message = (await adminBlockUser(account.id, adminPassword)).message
          break
        case 'unblock':
          message = (await adminUnblockUser(account.id, adminPassword)).message
          break
        case 'delete':
          message = (await adminDeleteUser(account.id, deleteConfirm, adminPassword)).message
          setAccount(null)
          setSessions([])
          setCandidates((prev) => prev.filter((item) => item.id !== account.id))
          onToast(message)
          closeDanger()
          setBusy(false)
          return
        default:
          break
      }
      onToast(message)
      closeDanger()
      await loadAccount(account.id)
    } catch (err: unknown) {
      onToast(err instanceof ApiRequestError ? err.message : 'Не удалось выполнить действие')
    } finally {
      setBusy(false)
    }
  }

  const dangerTitle: Record<DangerKind, string> = {
    email: 'Смена почты',
    resend: 'Повтор письма подтверждения',
    verify: 'Отметить почту подтверждённой',
    reset: 'Письмо сброса пароля',
    revokeOne: 'Завершить сессию',
    revokeAll: 'Завершить все сессии',
    unlinkYandex: 'Отвязать Яндекс',
    unlinkVk: 'Отвязать VK',
    block: 'Заблокировать аккаунт',
    unblock: 'Разблокировать аккаунт',
    delete: 'Удалить аккаунт',
  }

  const primaryDisabled =
    busy ||
    !adminPassword ||
    (danger === 'email' && (!newEmail || newEmail !== newEmailConfirm)) ||
    (danger === 'delete' && !deleteConfirm)

  return (
    <Panel title="Помощь">
      <Stack gap={16}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <Field label="Найти аккаунт">
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Почта, имя или идентификатор"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void searchAccounts(searchDraft)
                  }
                }}
              />
            </Field>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              void searchAccounts(searchDraft)
            }}
          >
            Найти
          </Button>
        </div>

        {loading && !account ? <Text tone="muted">Загружаем…</Text> : null}

        {!account && candidates.length > 0 ? (
          <Stack gap={8}>
            <Text tone="muted">Выберите аккаунт:</Text>
            {candidates.map((item) => (
              <Panel
                key={item.id}
                title={item.display_name || item.email || 'Без имени'}
                titleAside={
                  <Button variant="ghost" onClick={() => void loadAccount(item.id)}>
                    Открыть помощь
                  </Button>
                }
              >
                <Text tone="muted">
                  {item.email || 'почта не указана'}
                  {item.is_blocked ? ' · заблокирован' : ''}
                </Text>
              </Panel>
            ))}
          </Stack>
        ) : null}

        {!account && !loading && candidates.length === 0 ? (
          <EmptyState
            title="Выберите человека"
            description="Найдите аккаунт по почте или имени — или откройте помощь из списка «Аккаунты»"
          />
        ) : null}

        {account ? (
          <Stack gap={16}>
            <Panel title={account.display_name || account.email || 'Аккаунт'}>
              <Stack gap={8}>
                <ChipStack>
                  {account.is_blocked ? (
                    <Chip>Заблокирован</Chip>
                  ) : (
                    <Chip inactive>Не заблокирован</Chip>
                  )}
                  {account.email_verified ? (
                    <Chip inactive>Почта подтверждена</Chip>
                  ) : (
                    <Chip inactive>Почта не подтверждена</Chip>
                  )}
                </ChipStack>
                <Text>
                  Почта: {account.email || 'не указана'}
                </Text>
                <Text tone="muted">Вход: {loginMethodsLabel(account)}</Text>
                <Text tone="muted">
                  Персонажи: всего {account.characters.total} (2014:{' '}
                  {account.characters.edition_2014}, 2024: {account.characters.edition_2024},
                  черновики: {account.characters.drafts}) · своих лобби:{' '}
                  {account.lobbies.owned}
                </Text>
                <Text tone="muted">Id аккаунта: {account.id}</Text>
              </Stack>
            </Panel>

            <Panel title="Почта и пароль">
              <Stack gap={8}>
                <ChipStack>
                  <Button variant="secondary" onClick={() => openDanger('email')}>
                    Сменить почту
                  </Button>
                  {!account.email_verified && account.email ? (
                    <Button variant="secondary" onClick={() => openDanger('resend')}>
                      Повторить подтверждение
                    </Button>
                  ) : null}
                  {!account.email_verified && account.email ? (
                    <Button variant="secondary" onClick={() => openDanger('verify')}>
                      Отметить подтверждённой
                    </Button>
                  ) : null}
                  {account.login_methods.has_password && account.email ? (
                    <Button variant="secondary" onClick={() => openDanger('reset')}>
                      Письмо сброса пароля
                    </Button>
                  ) : null}
                </ChipStack>
              </Stack>
            </Panel>

            <Panel title="Способы входа">
              <Stack gap={8}>
                <Text tone="muted">{loginMethodsLabel(account)}</Text>
                <ChipStack>
                  {account.login_methods.yandex ? (
                    <Button variant="secondary" onClick={() => openDanger('unlinkYandex')}>
                      Отвязать Яндекс
                    </Button>
                  ) : null}
                  {account.login_methods.vk ? (
                    <Button variant="secondary" onClick={() => openDanger('unlinkVk')}>
                      Отвязать VK
                    </Button>
                  ) : null}
                </ChipStack>
              </Stack>
            </Panel>

            <Panel title="Сессии входа">
              <Stack gap={12}>
                {sessionsLoading ? <Text tone="muted">Загружаем сессии…</Text> : null}
                {!sessionsLoading && sessions.length === 0 ? (
                  <Text tone="muted">Активных сессий нет</Text>
                ) : null}
                {sessions.map((session) => (
                  <Panel key={session.id} title={formatDate(session.last_seen_at)}>
                    <Stack gap={8}>
                      <Text tone="muted">
                        Создана: {formatDate(session.created_at)}
                      </Text>
                      <Text tone="muted">
                        Устройство: {session.user_agent || '—'}
                      </Text>
                      <Text tone="muted">Адрес: {session.ip_address || '—'}</Text>
                      <div>
                        <Button
                          variant="ghost"
                          onClick={() => openDanger('revokeOne', session.id)}
                        >
                          Завершить
                        </Button>
                      </div>
                    </Stack>
                  </Panel>
                ))}
                {sessions.length > 0 ? (
                  <div>
                    <Button variant="secondary" onClick={() => openDanger('revokeAll')}>
                      Завершить все сессии
                    </Button>
                  </div>
                ) : null}
              </Stack>
            </Panel>

            <Panel title="Блокировка и удаление">
              <Stack gap={8}>
                <ChipStack>
                  {account.is_blocked ? (
                    <Button variant="secondary" onClick={() => openDanger('unblock')}>
                      Разблокировать
                    </Button>
                  ) : (
                    <Button variant="danger" onClick={() => openDanger('block')}>
                      Заблокировать
                    </Button>
                  )}
                  <Button variant="danger" onClick={() => openDanger('delete')}>
                    Удалить аккаунт
                  </Button>
                </ChipStack>
              </Stack>
            </Panel>
          </Stack>
        ) : null}
      </Stack>

      <Dialog
        open={danger !== null}
        title={danger ? dangerTitle[danger] : ''}
        primaryLabel={
          danger === 'delete'
            ? 'Удалить навсегда'
            : danger === 'block'
              ? 'Заблокировать'
              : 'Подтвердить'
        }
        primaryVariant={
          danger === 'delete' || danger === 'block' ? 'danger' : 'primary'
        }
        secondaryLabel="Отмена"
        busy={busy}
        primaryDisabled={primaryDisabled}
        onPrimary={() => {
          void submitDanger()
        }}
        onSecondary={closeDanger}
      >
        <Stack gap={12}>
          {danger === 'email' ? (
            <>
              <Text tone="muted">
                Письмо со ссылкой уйдёт на новый адрес. Почта в аккаунте изменится только после
                перехода по ссылке.
              </Text>
              <Field label="Новая почта">
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  autoComplete="off"
                />
              </Field>
              <Field label="Повтор новой почты">
                <Input
                  value={newEmailConfirm}
                  onChange={(e) => setNewEmailConfirm(e.target.value)}
                  autoComplete="off"
                />
              </Field>
            </>
          ) : null}

          {danger === 'block' ? (
            <Text>
              Вход будет закрыт, персонажи и лобби останутся. Все сессии завершатся сразу.
            </Text>
          ) : null}

          {danger === 'delete' && account ? (
            <>
              <Text>
                Действие безвозвратное. Будут стерты персонажи человека (
                {account.characters.total}) и лобби, где он хозяин ({account.lobbies.owned}).
                Другие игроки этих лобби стол потеряют.
              </Text>
              <Field
                label={
                  account.email
                    ? 'Введите почту удаляемого'
                    : 'Введите имя аккаунта или слово «удалить»'
                }
              >
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  autoComplete="off"
                />
              </Field>
            </>
          ) : null}

          {danger === 'resend' || danger === 'verify' || danger === 'reset' ? (
            <Text tone="muted">Нужен пароль админки. Ссылки и токены на экране не показываем.</Text>
          ) : null}

          <Field label="Пароль админки">
            <PasswordInput
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              autoComplete="off"
            />
          </Field>
        </Stack>
      </Dialog>
    </Panel>
  )
}
