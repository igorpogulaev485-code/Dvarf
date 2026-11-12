import { useRef, useState } from 'react'
import {
  deleteLobbyMedia,
  getLobbyMediaUsage,
  uploadLobbyMedia,
  type LobbyMedia,
  type LobbyMediaUsage,
} from '../../shared/api/lobbies'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Panel, Stack, Text } from '../../ui'

type Props = {
  lobbyId: string
  usage: LobbyMediaUsage
  canUpload: boolean
  onUsageChange: (next: LobbyMediaUsage) => void
  onToast: (message: string) => void
  onError: (message: string) => void
}

function formatMb(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1).replace(/\.0$/, '')
}

export function LobbyMediaQuotaPanel({
  lobbyId,
  usage,
  canUpload,
  onUsageChange,
  onToast,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [lastUpload, setLastUpload] = useState<LobbyMedia | null>(null)

  async function refreshUsage() {
    const next = await getLobbyMediaUsage(lobbyId)
    onUsageChange(next)
  }

  async function onPick(file: File | null) {
    if (!file || !canUpload) return
    setBusy(true)
    try {
      const row = await uploadLobbyMedia(lobbyId, file, { type: 'other' })
      setLastUpload(row)
      await refreshUsage()
      onToast('Картинка загружена (WebP)')
    } catch (err) {
      onError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить картинку')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function onDeleteLast() {
    if (!lastUpload || !canUpload) return
    setBusy(true)
    try {
      const next = await deleteLobbyMedia(lobbyId, lastUpload.id)
      setLastUpload(null)
      onUsageChange(next)
      onToast('Картинка удалена')
    } catch (err) {
      onError(err instanceof ApiRequestError ? err.message : 'Не удалось удалить картинку')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Картинки лобби">
      <Stack gap={12}>
        <Text>
          Занято {formatMb(usage.used_mb)} из {formatMb(usage.limit_mb)} МБ
        </Text>
        <Text tone="muted">Картинки сжимаются до WebP (длинная сторона до 1600 px, превью 400 px).</Text>
        {canUpload ? (
          <div className="inline-actions">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? 'Загружаем…' : 'Загрузить картинку'}
            </Button>
            {lastUpload ? (
              <Button type="button" variant="danger" disabled={busy} onClick={() => void onDeleteLast()}>
                Удалить последнюю
              </Button>
            ) : null}
          </div>
        ) : (
          <Text tone="muted">Загружать могут мастер и сомастер.</Text>
        )}
      </Stack>
    </Panel>
  )
}
