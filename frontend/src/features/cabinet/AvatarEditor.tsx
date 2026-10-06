import { useRef, useState } from 'react'
import { deleteAvatar, uploadAvatar, type User } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Stack, Text } from '../../ui'
import { ProfileAvatar } from './ProfileAvatar'

type AvatarEditorProps = {
  user: User
  onChanged: (user: User) => void
}

const ACCEPT = 'image/jpeg,image/png,image/webp'

function isUploadedAvatar(url: string | null): boolean {
  return Boolean(url && url.startsWith('/uploads/avatars/'))
}

export function AvatarEditor({ user, onChanged }: AvatarEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) {
      return
    }
    setError(null)
    setPending(true)
    try {
      const updated = await uploadAvatar(file)
      onChanged(updated)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить аватар')
    } finally {
      setPending(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  async function handleDelete() {
    setError(null)
    setPending(true)
    try {
      const updated = await deleteAvatar()
      onChanged(updated)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось удалить аватар')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="cabinet-avatar-block">
      <ProfileAvatar user={user} />
      <Stack gap={8}>
        <Text tone="muted">JPEG, PNG или WebP, до 2 МБ. Картинка обрежется до 256×256.</Text>
        <div className="cabinet-avatar-actions">
          <input
            ref={inputRef}
            id="cabinet-avatar-file"
            className="visually-hidden"
            type="file"
            accept={ACCEPT}
            disabled={pending}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? 'Загружаем…' : 'Загрузить фото'}
          </Button>
          {isUploadedAvatar(user.avatar_url) ? (
            <Button type="button" variant="ghost" disabled={pending} onClick={handleDelete}>
              Удалить
            </Button>
          ) : null}
        </div>
        {error ? <Text tone="danger">{error}</Text> : null}
      </Stack>
    </div>
  )
}
