import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import { ApiRequestError } from '../shared/api/client'
import {
  createSession,
  getSetting,
  updateSetting,
  type SettingSummary,
} from '../shared/api/lobbies'
import { Button, Field, Input, Panel, Stack, Text, Toast } from '../ui'

export function SettingDetailPage() {
  const { settingId = '' } = useParams()
  const navigate = useNavigate()
  const [setting, setSetting] = useState<SettingSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    getSetting(settingId)
      .then((item) => {
        if (active) setSetting(item)
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

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!setting) return
    setBusy(true)
    setError(null)
    try {
      const next = await updateSetting(setting.id, {
        name: setting.name,
        world_notes: setting.world_notes,
      })
      setSetting(next)
      setToast('Сохранено')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить')
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
          subtitle="Сеттинг — мир и заметки мастера"
          onOfficialSite={() => setToast('Официальный сайт скоро появится')}
        />
        <Text>
          <Link to={`/lobbies/${setting.lobby_id}`}>← В лобби</Link>
        </Text>
        {error ? <Text tone="danger">{error}</Text> : null}
        <Panel title="Мир">
          <form className="stack-form" onSubmit={save}>
            <Field label="Название">
              <Input
                value={setting.name}
                onChange={(e) => setSetting({ ...setting, name: e.target.value })}
              />
            </Field>
            <Field label="Заметки о мире" hint="Позже можно будет открыть игрокам">
              <textarea
                className="ui-input ui-textarea"
                rows={10}
                value={setting.world_notes}
                onChange={(e) => setSetting({ ...setting, world_notes: e.target.value })}
                placeholder="География, фракции, тон…"
              />
            </Field>
            <div className="inline-actions">
              <Button type="submit" disabled={busy}>
                Сохранить
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
                      err instanceof ApiRequestError ? err.message : 'Не удалось открыть сессию',
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
      </Stack>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
