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
  /** Desktop etalon body draws its own avatar row. */
  hideAvatar?: boolean
  showClose?: boolean
}

/** Avatar click / header identity → pad (ЕЩЁ scene removed). */
export function IdentityDialog({
  open,
  onClose,
  character,
  onAvatarChanged,
  children,
  hideAvatar = false,
  showClose = false,
}: IdentityDialogProps) {
  return (
    <Dialog
      open={open}
      title="Основное"
      size="xl"
      primaryLabel={hideAvatar ? 'Закрыть' : 'Готово'}
      primaryVariant={hideAvatar ? 'secondary' : 'primary'}
      onPrimary={onClose}
      secondaryLabel={hideAvatar ? undefined : 'Закрыть'}
      onSecondary={hideAvatar ? undefined : onClose}
      onDismiss={hideAvatar ? onClose : undefined}
      showClose={showClose}
    >
      <div className="identity-dialog">
        {hideAvatar ? null : (
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
        )}
        <div className="identity-dialog__form">{children}</div>
      </div>
    </Dialog>
  )
}
