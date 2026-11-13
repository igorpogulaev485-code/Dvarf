import { Dialog, Stack, Text } from '../../ui'

type Props = {
  open: boolean
  busy?: boolean
  characterName: string
  hint?: string | null
  onDeclare: () => void
  onSkip: () => void
}

/**
 * S-04: окно игроку после урона — объявить реакцию или пропустить.
 * «Щит» и эффекты — существующий B-02; здесь только снятие waiting_reaction.
 */
export function ReactionPromptDialog({
  open,
  busy = false,
  characterName,
  hint,
  onDeclare,
  onSkip,
}: Props) {
  return (
    <Dialog
      open={open}
      title="Реакция"
      primaryLabel="Объявить реакцию"
      secondaryLabel="Пропустить"
      busy={busy}
      onPrimary={onDeclare}
      onSecondary={onSkip}
    >
      <Stack gap={10}>
        <Text>
          {characterName}: {hint || 'Есть ли реакция на этот урон?'}
        </Text>
        <Text tone="muted">
          Пока окно открыто, ход врага не закрывается. Щит и подобные — через эффекты на листе.
        </Text>
      </Stack>
    </Dialog>
  )
}
