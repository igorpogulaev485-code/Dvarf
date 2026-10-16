import { useRef, useState } from 'react'
import {
  deleteCharacterAvatar,
  uploadCharacterAvatar,
  type CharacterDetail,
} from '../../shared/api/characters'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Text } from '../../ui'

const ACCEPT = 'image/jpeg,image/png,image/webp'

type CharacterAvatarControlProps = {
  character: CharacterDetail
  onChanged: (character: CharacterDetail) => void
  size?: 'sm' | 'md'
  showActions?: boolean
  /** When set, face button opens this instead of the file picker (upload via actions). */
  onOpen?: () => void
  faceHint?: string
}

function isUploadedCharacterAvatar(url: string | null): boolean {
  return Boolean(url && url.startsWith('/uploads/character-avatars/'))
}

export function CharacterAvatarControl({
  character,
  onChanged,
  size = 'md',
  showActions = true,
  onOpen,
  faceHint,
}: CharacterAvatarControlProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const initial = (character.name ?? '').trim().slice(0, 1).toUpperCase() || '?'
  const hint =
    faceHint ?? (pending ? '…' : onOpen ? 'основное' : 'фото')

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setPending(true)
    try {
      const updated = await uploadCharacterAvatar(character.id, file)
      onChanged(updated)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить аватар')
    } finally {
      setPending(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete() {
    setError(null)
    setPending(true)
    try {
      const updated = await deleteCharacterAvatar(character.id)
      onChanged(updated)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось удалить аватар')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={`char-avatar char-avatar--${size}`}>
      <button
        type="button"
        className="char-avatar__face"
        disabled={pending && !onOpen}
        title={onOpen ? 'Открыть основное' : 'Сменить аватарку персонажа'}
        onClick={() => {
          if (onOpen) {
            onOpen()
            return
          }
          inputRef.current?.click()
        }}
      >
        {character.avatar_url ? (
          <img src={character.avatar_url} alt="" />
        ) : (
          <span aria-hidden="true">{initial}</span>
        )}
        <span className="char-avatar__hint">{pending && !onOpen ? '…' : hint}</span>
      </button>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept={ACCEPT}
        disabled={pending}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      {showActions ? (
        <div className="char-avatar__actions">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? 'Загружаем…' : 'Загрузить'}
          </Button>
          {isUploadedCharacterAvatar(character.avatar_url) ? (
            <Button type="button" variant="ghost" disabled={pending} onClick={handleDelete}>
              Удалить
            </Button>
          ) : null}
        </div>
      ) : null}
      {error ? <Text tone="danger">{error}</Text> : null}
    </div>
  )
}
