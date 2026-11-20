import { useMemo, useState } from 'react'
import {
  FLEXIBLE_CASTING_SLOT_COST,
  metamagicById,
  metamagicSpendCost,
  type MetamagicDef,
} from '../../shared/dnd/sorcererMetamagic'
import {
  CREATE_SLOT_COST_2024,
  createSlotFromPoints2024,
  convertSlotToPoints2024,
  FONT_OF_MAGIC_NAME_RU,
} from '../../shared/dnd/sorcerer2024Features'
import { metamagicById2024 } from '../../shared/dnd/edition2024ClassOptions'
import { addFlexibleSpellSlot, clampSlot, type SpellSlotState } from '../../shared/dnd/spells'
import type { SheetResource } from '../../shared/dnd/rest'
import { Button, Dialog, Field, Stack, Text } from '../../ui'

type SorceryPointsSpendDialogProps = {
  open: boolean
  resource: SheetResource | null
  metamagicIds: string[]
  slots: Record<string, SpellSlotState>
  rulesEdition?: string
  sorcererLevel?: number
  onSetUsed: (used: number) => void
  onSlotsChange: (slots: Record<string, SpellSlotState>) => void
  onToast: (message: string) => void
  onClose: () => void
}

type SpendOption = {
  id: string
  nameRu: string
  summaryRu: string
  cost: number
  variableTwin?: boolean
}

export function SorceryPointsSpendDialog({
  open,
  resource,
  metamagicIds,
  slots,
  rulesEdition,
  sorcererLevel = 1,
  onSetUsed,
  onSlotsChange,
  onToast,
  onClose,
}: SorceryPointsSpendDialogProps) {
  const is2024 = rulesEdition === '2024'
  const remaining = resource ? Math.max(0, resource.max - resource.used) : 0
  const [twinLevel, setTwinLevel] = useState(1)
  const options = useMemo((): SpendOption[] => {
    if (is2024) {
      const rows: SpendOption[] = []
      for (const id of metamagicIds) {
        const def = metamagicById2024(id)
        if (!def) continue
        rows.push({
          id: def.id,
          nameRu: def.nameRu,
          summaryRu: def.summaryRu,
          cost: def.cost,
        })
      }
      return rows
    }
    const rows: MetamagicDef[] = []
    for (const id of metamagicIds) {
      const def = metamagicById(id)
      if (def) rows.push(def)
    }
    return rows.map((def) => ({
      id: def.id,
      nameRu: def.nameRu,
      summaryRu: def.summaryRu,
      cost: def.costPoints != null ? def.costPoints : metamagicSpendCost(def, twinLevel),
      variableTwin: def.costPoints == null && def.id === 'twinned',
    }))
  }, [metamagicIds, is2024, twinLevel])

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
    if (is2024) {
      const result = createSlotFromPoints2024({
        slots,
        slotLevel: level,
        sorcererLevel,
        sorceryMax: resource.max,
        sorceryUsed: resource.used,
      })
      if (!result.ok) {
        onToast(result.reasonRu)
        return
      }
      onSetUsed(result.sorceryUsed)
      onSlotsChange(result.slots)
      onToast(result.feedLineRu)
      onClose()
      return
    }
    const cost = FLEXIBLE_CASTING_SLOT_COST[level]
    if (cost == null) return
    if (cost > remaining) {
      onToast(`Не хватает очков (нужно ${cost}, есть ${remaining})`)
      return
    }
    const next = addFlexibleSpellSlot(slots, level)
    if (!next) return
    onSetUsed(Math.min(resource.max, resource.used + cost))
    onSlotsChange(next)
    onToast(`Гибкое колдовство: новая ячейка ${level} ур. (−${cost} очк.)`)
    onClose()
  }

  function slotToPoints(level: number) {
    if (!resource) return
    if (is2024) {
      const result = convertSlotToPoints2024({
        slots,
        slotLevel: level,
        sorceryMax: resource.max,
        sorceryUsed: resource.used,
      })
      if (!result.ok) {
        onToast(result.reasonRu)
        return
      }
      onSlotsChange(result.slots)
      onSetUsed(result.sorceryUsed)
      onToast(result.feedLineRu)
      onClose()
      return
    }
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
    onSetUsed(Math.max(0, resource.used - level))
    onToast(`Гибкое колдовство: ячейка ${level} → +${level} очк.`)
    onClose()
  }

  const flexTitle = is2024 ? FONT_OF_MAGIC_NAME_RU : 'Гибкое колдовство'
  const metaHint = is2024
    ? 'Нет выбранных вариантов — возьми метамагию в способностях (с 2 ур. чародея).'
    : 'Нет выбранных вариантов — возьми метамагию в способностях (с 3 ур. чародея).'

  return (
    <Dialog
      open={open}
      title={resource?.name?.trim() || 'Очки чародейства'}
      size="wide"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Сейчас {remaining}/{resource?.max ?? 0}.{' '}
          {is2024
            ? 'Выбери метамагию или Источник магии.'
            : 'Выбери метамагию или гибкое колдовство.'}
        </Text>

        <div>
          <Text>
            <strong>Метамагия</strong>
          </Text>
          {options.length === 0 ? (
            <Text tone="muted">{metaHint}</Text>
          ) : (
            <div className="sorcery-spend-list">
              {options.map((def) => {
                const cost = def.cost
                return (
                  <div key={def.id} className="sorcery-spend-row">
                    <div className="sorcery-spend-row__text">
                      <b>{def.nameRu}</b>
                      <span>
                        {cost} очк. · {def.summaryRu}
                      </span>
                      {def.variableTwin ? (
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
            <strong>{flexTitle}</strong>
          </Text>
          <Text tone="muted">
            Очки создают новую ячейку до 5 круга, даже если круг полон. Она исчезает после
            долгого отдыха. Ячейка → очки (= уровень ячейки).
          </Text>
          <div className="sorcery-spend-flex">
            {[1, 2, 3, 4, 5].map((level) => {
              const cost = is2024
                ? (CREATE_SLOT_COST_2024[level]?.cost ?? 99)
                : FLEXIBLE_CASTING_SLOT_COST[level]!
              const minLv = is2024 ? CREATE_SLOT_COST_2024[level]?.minSorcererLevel : 0
              const disabled =
                cost > remaining || (is2024 && minLv != null && sorcererLevel < minLv)
              return (
                <Button
                  key={`make-${level}`}
                  type="button"
                  variant="secondary"
                  disabled={disabled}
                  title={
                    is2024 && minLv
                      ? `Мин. ${minLv} ур. чародея`
                      : 'Создать дополнительную ячейку'
                  }
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