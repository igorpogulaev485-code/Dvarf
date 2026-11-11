/**
 * Cast a bound spell scroll: fixed DMG DC/attack, consume on confirm.
 */
import { useMemo } from 'react'
import { levelLabel } from '../../shared/dnd/spells'
import { Dialog, Stack, Text } from '../../ui'
import type { InventoryItem } from './inventory'
import {
  isCastableSpellScroll,
  spellScrollCastStats,
  spellScrollOffListCheckDc,
} from './spellScroll'

type CastScrollDialogProps = {
  open: boolean
  item: InventoryItem | null
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function CastScrollDialog({
  open,
  item,
  busy = false,
  onConfirm,
  onClose,
}: CastScrollDialogProps) {
  const binding = item?.scroll_spell ?? null
  const stats = useMemo(
    () => (binding ? spellScrollCastStats(binding.level) : null),
    [binding],
  )
  const canCast = Boolean(item && isCastableSpellScroll(item) && binding && stats)

  if (!item || !binding || !stats) return null

  return (
    <Dialog
      open={open}
      title="Каст со свитка"
      primaryLabel={busy ? 'Кастуем…' : 'Кастовать и израсходовать'}
      secondaryLabel="Отмена"
      onPrimary={() => {
        if (!canCast || busy) return
        onConfirm()
      }}
      onSecondary={onClose}
      busy={busy}
      primaryDisabled={!canCast || busy}
    >
      <Stack gap={10}>
        <Text>
          <strong>{binding.name}</strong>
          {' · '}
          {levelLabel(binding.level)}
          {binding.ritual ? ' · ритуал' : ''}
          {binding.concentration ? ' · концентрация' : ''}
          {binding.school ? ` · ${binding.school}` : ''}
        </Text>
        <Text tone="muted">
          Свиток ({stats.rarityRu}): Сл спас. {stats.saveDc} · атака +{stats.attackBonus}.
          Ячейка не тратится; свиток уничтожается при прочтении.
        </Text>
        <Text tone="muted">
          Если заклинания нет в списке класса — проверка способности Сл{' '}
          {spellScrollOffListCheckDc(binding.level)} (мастер).
        </Text>
        <Text>
          Останется после каста: ×{Math.max(0, item.qty - 1)}
        </Text>
      </Stack>
    </Dialog>
  )
}
