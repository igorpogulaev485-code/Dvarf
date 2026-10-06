import { levelLabel, slotsRemaining } from '../../shared/dnd/spells'
import { Dialog, Stack, Text } from '../../ui'
import type { SheetSpell, SpellsState } from './spells'

type CastSpellDialogProps = {
  open: boolean
  spell: SheetSpell | null
  spells: SpellsState
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function CastSpellDialog({
  open,
  spell,
  spells,
  busy = false,
  onConfirm,
  onClose,
}: CastSpellDialogProps) {
  if (!spell) {
    return null
  }

  const isCantrip = spell.level <= 0
  const slot = isCantrip ? null : spells.slots[String(spell.level)]
  const remaining = slot ? slotsRemaining(slot) : 0
  const canCast = isCantrip || remaining > 0

  return (
    <Dialog
      open={open}
      title={isCantrip ? 'Использовать заговор?' : 'Кастовать заклинание?'}
      primaryLabel={canCast ? (busy ? 'Кастуем…' : 'Каст') : 'Нет ячеек'}
      secondaryLabel="Отмена"
      onPrimary={() => {
        if (!canCast || busy) return
        onConfirm()
      }}
      onSecondary={onClose}
      busy={busy || !canCast}
    >
      <Stack gap={10}>
        <Text>
          <strong>{spell.name || 'Без названия'}</strong>
          {' · '}
          {levelLabel(spell.level)}
          {spell.concentration ? ' · концентрация' : ''}
        </Text>
        {spell.damage || spell.attack_or_save || spell.range ? (
          <Text tone="muted">
            {[spell.casting_time, spell.range, spell.attack_or_save, spell.damage]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
        {isCantrip ? (
          <Text tone="muted">Заговоры не тратят ячейки.</Text>
        ) : canCast ? (
          <Text tone="muted">
            Будет потрачена 1 ячейка {spell.level}-го уровня. Останется {remaining - 1} из{' '}
            {slot?.max ?? 0}.
          </Text>
        ) : (
          <Text tone="danger">
            Нет свободных ячеек {spell.level}-го уровня. Верни пипс или отдохни (rest — позже).
          </Text>
        )}
      </Stack>
    </Dialog>
  )
}
