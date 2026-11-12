/** W-02: история последних 20 правок + «Вернуть эту версию». */
import { useEffect, useState } from 'react'
import {
  listSettingPageVersions,
  restoreSettingPageVersion,
  type SettingDetail,
  type SettingPageVersion,
} from '../../shared/api/lobbies'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Text } from '../../ui'

type Props = {
  pageId: string
  open: boolean
  onRestored: (detail: SettingDetail) => void
}

export function WikiPageHistoryPanel({ pageId, open, onRestored }: Props) {
  const [rows, setRows] = useState<SettingPageVersion[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !pageId) return
    let cancelled = false
    setBusy(true)
    setError(null)
    void listSettingPageVersions(pageId)
      .then((list) => {
        if (!cancelled) setRows(list)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить историю')
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, pageId])

  if (!open) return null

  async function restore(versionId: string) {
    setBusy(true)
    setError(null)
    try {
      const next = await restoreSettingPageVersion(pageId, versionId)
      onRestored(next)
      const list = await listSettingPageVersions(pageId)
      setRows(list)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось вернуть версию')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wiki-history-panel">
      <Text as="h3">История правок</Text>
      {error ? <Text tone="danger">{error}</Text> : null}
      {busy && rows.length === 0 ? <Text tone="muted">Загрузка…</Text> : null}
      {rows.length === 0 && !busy ? <Text tone="muted">Пока нет сохранённых версий.</Text> : null}
      <ul className="wiki-history-panel__list">
        {rows.map((row) => {
          const snap = row.snapshot as { title?: string; body?: string }
          return (
            <li key={row.id} className="wiki-history-panel__row">
              <div>
                <Text>
                  {new Date(row.created_at).toLocaleString('ru-RU')} · {row.author_name || '—'}
                </Text>
                <Text tone="muted">{snap.title || 'Без названия'}</Text>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void restore(row.id)}
              >
                Вернуть эту версию
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
