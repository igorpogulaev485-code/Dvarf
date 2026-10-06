import {
  canSpendPactSlot,
  levelLabel,
  slotsRemaining,
} from '../../shared/dnd/spells'
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
  const usePact =
    !isCantrip && canSpendPactSlot(spells.pact_slots, spell.level)
  const canCast = isCantrip || usePact || remaining > 0
  const pactRemaining = spells.pact_slots
    ? Math.max(0, spells.pact_slots.max - spells.pact_slots.used)
    : 0

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
        ) : usePact && spells.pact_slots ? (
          <Text tone="muted">
            Будет потрачена 1 pact-ячейка {spells.pact_slots.level}-го уровня. Останется{' '}
            {pactRemaining - 1} из {spells.pact_slots.max}.
          </Text>
        ) : canCast ? (
          <Text tone="muted">
            Будет потрачена 1 ячейка {spell.level}-го уровня. Останется {remaining - 1} из{' '}
            {slot?.max ?? 0}.
          </Text>
        ) : (
          <Text tone="danger">
            Нет свободных ячеек {spell.level}-го уровня
            {spells.pact_slots ? ' и подходящего pact' : ''}. Верни пипс или сделай отдых.
          </Text>
        )}
      </Stack>
    </Dialog>
  )
}
