import { useEffect, useMemo, useState } from 'react'
import type { CombatTarget } from '../lobby/combatTargets'
import { Button, Dialog, Stack, Text } from '../../ui'

export type TargetPickFilter = 'foes' | 'allies' | 'all'

type Props = {
  open: boolean
  title: string
  targets: CombatTarget[]
  filter: TargetPickFilter
  mobile?: boolean
  busy?: boolean
  onClose: () => void
  onPick: (target: CombatTarget | null) => void
  /** Режим «кубики на столе» для атаки. */
  diceOnTable?: boolean
  onTableHit?: (target: CombatTarget) => void
  onTableMiss?: (target: CombatTarget) => void
}

/**
 * T-01: выбор цели из контракта S-04.
 * Мобильный — нижняя шторка (класс), ПК — диалог у кнопки.
 */
export function CombatTargetPicker({
  open,
  title,
  targets,
  filter,
  mobile: _mobile = false,
  busy = false,
  onClose,
  onPick,
  diceOnTable = false,
  onTableHit,
  onTableMiss,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) setSelectedId(null)
  }, [open])

  const list = useMemo(() => {
    if (filter === 'foes') return targets.filter((t) => !t.is_ally)
    if (filter === 'allies') return targets.filter((t) => t.is_ally)
    return targets
  }, [targets, filter])

  const selected = list.find((t) => t.id === selectedId) ?? null

  return (
    <Dialog
      open={open}
      title={title}
      primaryLabel={diceOnTable ? 'Готово' : 'Выбрать'}
      secondaryLabel="Без цели"
      busy={busy}
      primaryDisabled={diceOnTable ? !selected : false}
      onSecondary={() => {
        onPick(null)
        onClose()
      }}
      onPrimary={() => {
        if (diceOnTable) {
          onClose()
          return
        }
        onPick(selected)
        onClose()
      }}
      size="default"
    >
      <Stack gap={10}>
        {list.length === 0 ? (
          <Text tone="muted">Нет подходящих целей в текущем бою.</Text>
        ) : (
          <ul className="combat-target-picker__list">
            {list.map((t) => {
              const on = t.id === selectedId
              const cond =
                Array.isArray(t.conditions) && t.conditions.length
                  ? ` · ${t.conditions.length} сост.`
                  : ''
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`combat-target-picker__item${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    disabled={busy}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <b>{t.name}</b>
                    <span className="combat-target-picker__meta">
                      {t.kind === 'enemy' ? 'враг' : t.kind === 'companion' ? 'напарник' : 'герой'}
                      {cond}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {diceOnTable && selected ? (
          <div className="combat-target-picker__table-actions">
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                onTableHit?.(selected)
                onClose()
              }}
            >
              Попал
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                onTableMiss?.(selected)
                onClose()
              }}
            >
              Промах
            </Button>
          </div>
        ) : null}
        {!diceOnTable ? (
          <Text tone="muted">Можно закрыть без цели — бросок всё равно запишется.</Text>
        ) : (
          <Text tone="muted">Кубики на столе: отметьте результат без цифрового броска.</Text>
        )}
      </Stack>
    </Dialog>
  )
}
