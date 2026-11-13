/** W-02: картинки страницы вики через L-02 (wiki / map). */
import { useRef, useState } from 'react'
import {
  deleteLobbyMedia,
  getLobbyMediaUsage,
  uploadLobbyMedia,
  type LobbyMedia,
  type LobbyMediaUsage,
  type SettingPageKind,
} from '../../shared/api/lobbies'
import { ApiRequestError } from '../../shared/api/client'
import { useAuthedMediaUrl } from './useAuthedMediaUrl'
import { Button, Text } from '../../ui'

type Props = {
  lobbyId: string
  pageId: string
  pageKind: SettingPageKind
  media: LobbyMedia[]
  canEdit: boolean
  onChanged: (media: LobbyMedia[], usage: LobbyMediaUsage | null) => void
}

function MediaThumb({ media, label }: { media: LobbyMedia; label: string }) {
  const url = useAuthedMediaUrl(media.preview_url || media.url)
  if (!url) return <Text tone="muted">{label}: …</Text>
  return (
    <figure className="wiki-media-thumb">
      <img src={url} alt={media.original_filename || label} />
      <figcaption>
        {label}
        {media.is_primary ? ' · главная' : ''}
      </figcaption>
    </figure>
  )
}

export function WikiPageMediaPanel({
  lobbyId,
  pageId,
  pageKind,
  media,
  canEdit,
  onChanged,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wiki = media.filter((m) => m.type === 'wiki')
  const maps = media.filter((m) => m.type === 'map')

  async function upload(file: File, type: 'wiki' | 'map', isPrimary: boolean) {
    setBusy(true)
    setError(null)
    try {
      const row = await uploadLobbyMedia(lobbyId, file, {
        type,
        attachedToId: pageId,
        isPrimary,
      })
      const usage = await getLobbyMediaUsage(lobbyId)
      const next = [...media.filter((m) => m.id !== row.id), row]
      onChanged(next, usage)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setBusy(true)
    setError(null)
    try {
      const usage = await deleteLobbyMedia(lobbyId, id)
      onChanged(
        media.filter((m) => m.id !== id),
        usage,
      )
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось удалить')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wiki-media-panel">
      <Text as="h3">Картинки</Text>
      {error ? <Text tone="danger">{error}</Text> : null}
      <div className="wiki-media-panel__grid">
        {wiki.map((m) => (
          <div key={m.id} className="wiki-media-panel__item">
            <MediaThumb media={m} label="Картинка" />
            {canEdit ? (
              <Button type="button" variant="ghost" disabled={busy} onClick={() => void remove(m.id)}>
                Удалить
              </Button>
            ) : null}
          </div>
        ))}
        {pageKind === 'location'
          ? maps.map((m) => (
              <div key={m.id} className="wiki-media-panel__item">
                <MediaThumb media={m} label="Карта" />
                {canEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void remove(m.id)}
                  >
                    Удалить карту
                  </Button>
                ) : null}
              </div>
            ))
          : null}
      </div>
      {canEdit ? (
        <div className="inline-actions">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void upload(f, 'wiki', wiki.length === 0)
            }}
          />
          <Button type="button" variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
            Загрузить картинку
          </Button>
          {pageKind === 'location' ? (
            <>
              <input
                ref={mapRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void upload(f, 'map', true)
                }}
              />
              <Button type="button" variant="secondary" disabled={busy} onClick={() => mapRef.current?.click()}>
                Загрузить карту
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
