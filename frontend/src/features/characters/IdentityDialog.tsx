import type { ReactNode } from 'react'
import type { CharacterDetail } from '../../shared/api/characters'
import { Dialog, Text } from '../../ui'
import { CharacterAvatarControl } from './CharacterAvatarControl'

type IdentityDialogProps = {
  open: boolean
  onClose: () => void
  character: CharacterDetail
  onAvatarChanged: (character: CharacterDetail) => void
  children: ReactNode
}

/** Avatar click / header identity → pad (ЕЩЁ scene removed). */
export function IdentityDialog({
  open,
  onClose,
  character,
  onAvatarChanged,
  children,
}: IdentityDialogProps) {
  return (
    <Dialog
      open={open}
      title="Основное"
      size="xl"
      primaryLabel="Готово"
      onPrimary={onClose}
      secondaryLabel="Закрыть"
      onSecondary={onClose}
    >
      <div className="identity-dialog">
        <section className="identity-dialog__avatar" aria-label="Аватар">
          <div className="identity-dialog__avatar-copy">
            <strong>Аватар</strong>
            <Text tone="muted">JPEG / PNG / WebP. Клик по лицу или «Загрузить».</Text>
          </div>
          <CharacterAvatarControl
            character={character}
            size="md"
            showActions
            onChanged={onAvatarChanged}
          />
        </section>
        <div className="identity-dialog__form">{children}</div>
      </div>
    </Dialog>
  )
}
