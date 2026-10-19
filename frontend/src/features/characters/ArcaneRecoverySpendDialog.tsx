import { useMemo, useState } from 'react'
import {
  ARCANE_RECOVERY_MAX_SLOT_LEVEL,
  applyArcaneRecovery,
  arcaneRecoveryBudget,
  recoverySelectionCost,
  spentSlotsAtLevel,
} from '../../shared/dnd/arcaneRecovery'
import { FEATURE_RESOURCE_PREFIX } from '../../shared/dnd/featureResources'
import type { SheetResource } from '../../shared/dnd/rest'
import { clampSlot, type SpellSlotState } from '../../shared/dnd/spells'
import { Button, Dialog, Stack, Text } from '../../ui'

type ArcaneRecoverySpendDialogProps = {
  open: boolean
  resource: SheetResource | null
  /** Wizard class level for this class entry (ceil(level/2) budget). */
  wizardLevel: number
  slots: Record<string, SpellSlotState>
  onRecover: (slots: Record<string, SpellSlotState>, label: string) => void
  onToast: (message: string) => void
  onClose: () => void
}

function parseArcaneRecoveryResourceId(
  id: string,
): { classSlug: string; classEntryId: string } | null {
  if (!id.startsWith(FEATURE_RESOURCE_PREFIX)) return null
  const rest = id.slice(FEATURE_RESOURCE_PREFIX.length)
  const parts = rest.split(':')
  if (parts.length < 3) return null
  const classSlug = parts[0]!
  const poolId = parts.slice(1, -1).join(':')
  const classEntryId = parts[parts.length - 1]!
  if (poolId !== 'arcane_recovery') return null
  return { classSlug, classEntryId }
}

export function ArcaneRecoverySpendDialog({
  open,
  resource,
  wizardLevel,
  slots,
  onRecover,
  onToast,
  onClose,
}: ArcaneRecoverySpendDialogProps) {
  const remainingCharges = resource
    ? Math.max(0, resource.max - resource.used)
    : 0
  const budget = arcaneRecoveryBudget(wizardLevel)
  const [recoverByLevel, setRecoverByLevel] = useState<Record<number, number>>(
    {},
  )
  const parsed = resource ? parseArcaneRecoveryResourceId(resource.id) : null

  const selectionCost = useMemo(
    () => recoverySelectionCost(recoverByLevel),
    [recoverByLevel],
  )

  function setCount(level: number, count: number) {
    const spent = spentSlotsAtLevel(slots, level)
    const nextCount = Math.max(0, Math.min(spent, Math.floor(count)))
    setRecoverByLevel((prev) => {
      const next = { ...prev }
      if (nextCount <= 0) delete next[level]
      else next[level] = nextCount
      return next
    })
  }

  function confirm() {
    if (remainingCharges <= 0) {
      onToast('Магическое восстановление уже использовано (до прод. отдыха)')
      return
    }
    const result = applyArcaneRecovery({
      slots,
      wizardLevel,
      recoverByLevel,
    })
    if (!result.ok) {
      onToast(result.reason)
      return
    }
    const parts = Object.entries(recoverByLevel)
      .filter(([, n]) => n > 0)
      .map(([lvl, n]) => `${n}×${lvl}`)
      .join(', ')
    onRecover(result.slots, `Восстановлено: ${parts} (сумма ${result.cost})`)
    setRecoverByLevel({})
  }

  return (
    <Dialog
      open={open}
      title="Магическое восстановление"
      size="wide"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Лимит суммы уровней ячеек: <strong>{budget}</strong> (½ ур. волшебника
          {wizardLevel ? ` · ур. ${wizardLevel}` : ''}, вверх). Без ячеек 6+. Раз в
          день после короткого отдыха.
          {parsed ? '' : ''}
        </Text>
        <Text tone="muted">
          Заряд умения: {remainingCharges}/{resource?.max ?? 0} · выбрано{' '}
          {selectionCost}/{budget}
        </Text>

        <div className="sorcery-spend-list">
          {Array.from({ length: ARCANE_RECOVERY_MAX_SLOT_LEVEL }, (_, i) => {
            const level = i + 1
            const spent = spentSlotsAtLevel(slots, level)
            const slot = clampSlot(slots[String(level)] ?? { max: 0, used: 0 })
            const picked = recoverByLevel[level] ?? 0
            const otherCost = selectionCost - level * picked
            const maxAffordable = Math.floor(
              Math.max(0, budget - otherCost) / level,
            )
            const maxPick = Math.min(spent, maxAffordable + picked)
            return (
              <div key={level} className="sorcery-spend-row">
                <div className="sorcery-spend-row__text">
                  <b>{level} ур.</b>
                  <span>
                    Потрачено {spent}/{slot.max}
                    {spent <= 0 ? ' · нечего возвращать' : ''}
                  </span>
                </div>
                <div className="sorcery-spend-flex">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={picked <= 0 || remainingCharges <= 0}
                    onClick={() => setCount(level, picked - 1)}
                  >
                    −
                  </Button>
                  <Text>
                    <strong>{picked}</strong>
                  </Text>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      remainingCharges <= 0 ||
                      picked >= maxPick ||
                      spent <= 0
                    }
                    onClick={() => setCount(level, picked + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <Button
          type="button"
          disabled={remainingCharges <= 0 || selectionCost <= 0}
          onClick={confirm}
        >
          Восстановить (потратить заряд)
        </Button>
      </Stack>
    </Dialog>
  )
}
