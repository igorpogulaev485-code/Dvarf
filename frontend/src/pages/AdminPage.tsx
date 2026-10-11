import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  adminChangeEmail,
  listAdminAccounts,
  type AdminAccountStats,
} from '../shared/api/admin'
import { ApiRequestError } from '../shared/api/client'
import { EMAIL_ERROR_TEXT, isValidEmail } from '../shared/lib/email'
import {
  Button,
  Field,
  Input,
  Panel,
  PasswordInput,
  Stack,
  Text,
  Toast,
} from '../ui'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type EmailFormState = {
  newEmail: string
  confirmEmail: string
  adminPassword: string
  pending: boolean
  error: string | null
  message: string | null
  debugUrl: string | null
}

const emptyEmailForm = (): EmailFormState => ({
  newEmail: '',
  confirmEmail: '',
  adminPassword: '',
  pending: false,
  error: null,
  message: null,
  debugUrl: null,
})

export function AdminPage() {
  const [items, setItems] = useState<AdminAccountStats[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [forms, setForms] = useState<Record<string, EmailFormState>>({})

  const closeToast = useCallback(() => setToast(null), [])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    listAdminAccounts(100, 0)
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiRequestError
            ? err.message
            : 'Не удалось загрузить аккаунты',
        )
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function formFor(id: string): EmailFormState {
    return forms[id] ?? emptyEmailForm()
  }

  function patchForm(id: string, patch: Partial<EmailFormState>) {
    setForms((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? emptyEmailForm()), ...patch },
    }))
  }

  async function handleEmailSubmit(account: AdminAccountStats, event: FormEvent) {
    event.preventDefault()
    const form = formFor(account.id)
    const next = form.newEmail.trim()
    const confirm = form.confirmEmail.trim()

    if (!next || !confirm) {
      patchForm(account.id, { error: 'Укажите новый email дважды', message: null })
      return
    }
    if (!isValidEmail(next) || !isValidEmail(confirm)) {
      patchForm(account.id, { error: EMAIL_ERROR_TEXT, message: null })
      return
    }
    if (next.toLowerCase() !== confirm.toLowerCase()) {
      patchForm(account.id, {
        error: 'Новый email и подтверждение не совпадают',
        message: null,
      })
      return
    }
    if (!form.adminPassword) {
      patchForm(account.id, {
        error: 'Введите свой пароль администратора',
        message: null,
      })
      return
    }

    patchForm(account.id, { pending: true, error: null, message: null, debugUrl: null })
    try {
      const result = await adminChangeEmail(
        account.id,
        next,
        confirm,
        form.adminPassword,
      )
      patchForm(account.id, {
        pending: false,
        message: result.message,
        debugUrl: result.debug_confirm_url,
        newEmail: '',
        confirmEmail: '',
        adminPassword: '',
      })
      setToast('Запрос на смену email создан')
      load()
    } catch (err) {
      patchForm(account.id, {
        pending: false,
        error:
          err instanceof ApiRequestError
            ? err.message
            : 'Не удалось запросить смену email',
      })
    }
  }

  return (
    <main className="page page--app page--admin">
      <Stack gap={20}>
        <Link className="back-link" to="/characters">
          ← К персонажам
        </Link>

        <Stack gap={6}>
          <Text as="h1">Админка</Text>
          <Text tone="muted">
            Статистика аккаунтов и крайние случаи (смена email). Личные данные не для
            повседневного просмотра.
          </Text>
        </Stack>

        {loading ? <Text tone="muted">Загружаем…</Text> : null}
        {error ? <Text tone="danger">{error}</Text> : null}

        {!loading && !error ? (
          <Panel title={`Аккаунты · ${total}`}>
            {items.length === 0 ? (
              <Text tone="muted">Пока нет аккаунтов</Text>
            ) : (
              <ul className="admin-account-list">
                {items.map((account) => {
                  const form = formFor(account.id)
                  const open = openId === account.id
                  const label =
                    account.display_name?.trim() || account.email || account.id.slice(0, 8)

                  return (
                    <li key={account.id} className="admin-account">
                      <div className="admin-account__head">
                        <div>
                          <Text as="h3">{label}</Text>
                          <Text tone="muted" className="admin-account__meta">
                            {account.email ?? 'email не задан'}
                            {account.email_verified ? '' : ' · email не подтверждён'}
                          </Text>
                        </div>
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => setOpenId(open ? null : account.id)}
                        >
                          {open ? 'Скрыть' : 'Сменить email'}
                        </Button>
                      </div>

                      <dl className="admin-stats">
                        <div>
                          <dt>Дата реги</dt>
                          <dd>{formatDate(account.created_at)}</dd>
                        </div>
                        <div>
                          <dt>Персы 2014</dt>
                          <dd>{account.characters_2014}</dd>
                        </div>
                        <div>
                          <dt>Персы 2024</dt>
                          <dd>{account.characters_2024}</dd>
                        </div>
                        <div>
                          <dt>Персы всего</dt>
                          <dd>{account.characters_total}</dd>
                        </div>
                        <div>
                          <dt>Свои лобби</dt>
                          <dd>{account.lobbies_owned}</dd>
                        </div>
                        <div>
                          <dt>Лобби как игрок</dt>
                          <dd>{account.lobbies_as_player}</dd>
                        </div>
                      </dl>

                      {open ? (
                        <form
                          className="admin-email-form"
                          onSubmit={(event) => void handleEmailSubmit(account, event)}
                          noValidate
                        >
                          <Text tone="muted">
                            Ссылка подтверждения уйдёт на <strong>новый</strong> email
                            (старый может быть недоступен). Смена применится только после
                            перехода по ссылке. Нужен ваш пароль админа.
                          </Text>
                          <Field label="Новый email" htmlFor={`admin-email-${account.id}`}>
                            <Input
                              id={`admin-email-${account.id}`}
                              type="email"
                              autoComplete="off"
                              value={form.newEmail}
                              onChange={(e) =>
                                patchForm(account.id, { newEmail: e.target.value })
                              }
                            />
                          </Field>
                          <Field
                            label="Повторите новый email"
                            htmlFor={`admin-email2-${account.id}`}
                          >
                            <Input
                              id={`admin-email2-${account.id}`}
                              type="email"
                              autoComplete="off"
                              value={form.confirmEmail}
                              onChange={(e) =>
                                patchForm(account.id, { confirmEmail: e.target.value })
                              }
                            />
                          </Field>
                          <Field
                            label="Ваш пароль админа"
                            htmlFor={`admin-pass-${account.id}`}
                          >
                            <PasswordInput
                              id={`admin-pass-${account.id}`}
                              autoComplete="current-password"
                              value={form.adminPassword}
                              onChange={(e) =>
                                patchForm(account.id, { adminPassword: e.target.value })
                              }
                            />
                          </Field>
                          {form.error ? <Text tone="danger">{form.error}</Text> : null}
                          {form.message ? <Text>{form.message}</Text> : null}
                          {form.debugUrl ? (
                            <Text tone="muted">
                              Dev-ссылка:{' '}
                              <a href={form.debugUrl}>{form.debugUrl}</a>
                            </Text>
                          ) : null}
                          <Button type="submit" disabled={form.pending}>
                            {form.pending ? 'Отправляем…' : 'Запросить смену email'}
                          </Button>
                        </form>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        ) : null}
      </Stack>

      {toast ? <Toast message={toast} onClose={closeToast} /> : null}
    </main>
  )
}
