import { useMemo, useState } from 'react'
import {
  FLEXIBLE_CASTING_SLOT_COST,
  metamagicById,
  metamagicSpendCost,
  type MetamagicDef,
} from '../../shared/dnd/sorcererMetamagic'
import { clampSlot, type SpellSlotState } from '../../shared/dnd/spells'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Dialog, Field, Stack, Text } from '../../ui'

type SorceryPointsSpendDialogProps = {
  open: boolean
  resource: SheetResource | null
  metamagicIds: string[]
  slots: Record<string, SpellSlotState>
  onSetUsed: (used: number) => void
  onSlotsChange: (slots: Record<string, SpellSlotState>) => void
  onToast: (message: string) => void
  onClose: () => void
}

export function SorceryPointsSpendDialog({
  open,
  resource,
  metamagicIds,
  slots,
  onSetUsed,
  onSlotsChange,
  onToast,
  onClose,
}: SorceryPointsSpendDialogProps) {
  const remaining = resource ? Math.max(0, resource.max - resource.used) : 0
  const options = useMemo(() => {
    const rows: MetamagicDef[] = []
    for (const id of metamagicIds) {
      const def = metamagicById(id)
      if (def) rows.push(def)
    }
    return rows
  }, [metamagicIds])
  const [twinLevel, setTwinLevel] = useState(1)

  function spend(cost: number, label: string) {
    if (!resource) return
    if (cost > remaining) {
      onToast(`Не хватает очков (нужно ${cost}, есть ${remaining})`)
      return
    }
    onSetUsed(Math.min(resource.max, resource.used + cost))
    onToast(`${label}: −${cost} очк. чародейства`)
    onClose()
  }

  function createSlot(level: number) {
    if (!resource) return
    const cost = FLEXIBLE_CASTING_SLOT_COST[level]
    if (cost == null) return
    if (cost > remaining) {
      onToast(`Не хватает очков (нужно ${cost}, есть ${remaining})`)
      return
    }
    const key = String(level)
    const current = clampSlot(slots[key] ?? { max: 0, used: 0 })
    // Recover one spent slot, or temporarily bump max if none spent.
    const next =
      current.used > 0
        ? clampSlot({ ...current, used: current.used - 1 })
        : clampSlot({ max: current.max + 1, used: current.used })
    onSetUsed(Math.min(resource.max, resource.used + cost))
    onSlotsChange({ ...slots, [key]: next })
    onToast(`Гибкое колдовство: ячейка ${level} ур. (−${cost} очк.)`)
    onClose()
  }

  function slotToPoints(level: number) {
    if (!resource) return
    const key = String(level)
    const current = clampSlot(slots[key] ?? { max: 0, used: 0 })
    const available = Math.max(0, current.max - current.used)
    if (available <= 0) {
      onToast(`Нет свободной ячейки ${level} ур.`)
      return
    }
    onSlotsChange({
      ...slots,
      [key]: clampSlot({ ...current, used: current.used + 1 }),
    })
    // Gain SP equal to slot level (PHB).
    onSetUsed(Math.max(0, resource.used - level))
    onToast(`Гибкое колдовство: ячейка ${level} → +${level} очк.`)
    onClose()
  }

  return (
    <Dialog
      open={open}
      title="Очки чародейства"
      size="wide"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Сейчас {remaining}/{resource?.max ?? 0}. Выбери метамагию или гибкое колдовство.
        </Text>

        <div>
          <Text>
            <strong>Метамагия</strong>
          </Text>
          {options.length === 0 ? (
            <Text tone="muted">
              Нет выбранных вариантов — возьми метамагию в способностях (с 3 ур. чародея).
            </Text>
          ) : (
            <div className="sorcery-spend-list">
              {options.map((def) => {
                const cost =
                  def.costPoints != null
                    ? def.costPoints
                    : metamagicSpendCost(def, twinLevel)
                return (
                  <div key={def.id} className="sorcery-spend-row">
                    <div className="sorcery-spend-row__text">
                      <b>{def.nameRu}</b>
                      <span>
                        {def.costRu} очк. · {def.summaryRu}
                      </span>
                      {def.costPoints == null ? (
                        <Field label="Ур. ячейки для Разделённого">
                          <select
                            className="play-select"
                            value={twinLevel}
                            onChange={(event) => setTwinLevel(Number(event.target.value))}
                          >
                            <option value={1}>заговор / 1 ур.</option>
                            {[2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                              <option key={level} value={level}>
                                {level} ур.
                              </option>
                            ))}
                          </select>
                        </Field>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={cost > remaining}
                      onClick={() => spend(cost, def.nameRu)}
                    >
                      −{cost}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <Text>
            <strong>Гибкое колдовство</strong>
          </Text>
          <Text tone="muted">Очки → ячейка (бонусным) или ячейка → очки (= уровень ячейки).</Text>
          <div className="sorcery-spend-flex">
            {[1, 2, 3, 4, 5].map((level) => {
              const cost = FLEXIBLE_CASTING_SLOT_COST[level]!
              return (
                <Button
                  key={`make-${level}`}
                  type="button"
                  variant="secondary"
                  disabled={cost > remaining}
                  onClick={() => createSlot(level)}
                >
                  Ячейка {level} (−{cost})
                </Button>
              )
            })}
          </div>
          <div className="sorcery-spend-flex" style={{ marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((level) => {
              const slot = clampSlot(slots[String(level)] ?? { max: 0, used: 0 })
              const free = Math.max(0, slot.max - slot.used)
              return (
                <Button
                  key={`burn-${level}`}
                  type="button"
                  variant="secondary"
                  disabled={free <= 0}
                  onClick={() => slotToPoints(level)}
                >
                  {level} ур. → +{level} очк.
                </Button>
              )
            })}
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={remaining <= 0}
          onClick={() => spend(1, 'Потратить 1 очко')}
        >
          Просто −1 очко
        </Button>
      </Stack>
    </Dialog>
  )
}
