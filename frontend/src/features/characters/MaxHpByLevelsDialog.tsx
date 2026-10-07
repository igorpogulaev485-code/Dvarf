import { useEffect, useMemo, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { totalCharacterLevel } from '../../shared/dnd/classLevels'
import {
  buildMaxHpByLevels,
  type MaxHpLevelRow,
} from '../../shared/dnd/multiclassRules'
import type { HitDie } from '../../shared/dnd/hitDice'
import { Dialog, Field, NumberInput, Stack, Text } from '../../ui'

type MaxHpByLevelsDialogProps = {
  open: boolean
  classes: ClassLevelEntry[]
  constitutionMod: number
  hitDie: HitDie | null
  hpMax: number | null
  hpCurrent: number | null
  onApply: (next: { hpMax: number; hpCurrent: number }) => void
  onClose: () => void
}

type Mode = 'rules' | 'manual'

export function MaxHpByLevelsDialog({
  open,
  classes,
  constitutionMod,
  hitDie,
  hpMax,
  hpCurrent,
  onApply,
  onClose,
}: MaxHpByLevelsDialogProps) {
  const [mode, setMode] = useState<Mode>('rules')
  const [manualTotal, setManualTotal] = useState<number | null>(hpMax)
  const [fillCurrent, setFillCurrent] = useState(true)

  const built = useMemo(
    () =>
      buildMaxHpByLevels({
        classes,
        constitutionMod,
        fallbackDie: hitDie,
      }),
    [classes, constitutionMod, hitDie],
  )

  useEffect(() => {
    if (!open) return
    setMode('rules')
    setManualTotal(built?.total ?? hpMax)
    const wasFull =
      hpMax != null && hpCurrent != null && hpCurrent >= hpMax
    setFillCurrent(hpCurrent == null || wasFull)
  }, [open, built?.total, hpMax, hpCurrent])

  const rulesTotal = built?.total ?? null
  const nextMax =
    mode === 'rules'
      ? rulesTotal
      : manualTotal == null
        ? null
        : Math.max(1, Math.floor(manualTotal))
  const canApply = nextMax != null && Number.isFinite(nextMax)

  const nextCurrent = (() => {
    if (nextMax == null) return null
    if (fillCurrent) return nextMax
    if (hpCurrent == null) return nextMax
    return Math.min(nextMax, Math.max(0, hpCurrent))
  })()

  const level = totalCharacterLevel(classes)
  const conLabel = `${constitutionMod >= 0 ? '+' : ''}${constitutionMod}`

  return (
    <Dialog
      open={open}
      title="Макс. HP по уровням"
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      primaryDisabled={!canApply}
      onPrimary={() => {
        if (!canApply || nextMax == null || nextCurrent == null) return
        onApply({ hpMax: nextMax, hpCurrent: nextCurrent })
      }}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Собрать максимум хитов по PHB: ур. 1 исходного класса — максимум кости + ТЕЛ ({conLabel});
          каждый следующий уровень (и 1-й уровень мультикласса) — среднее кости + ТЕЛ. Сейчас персонаж
          ур. {level}.
        </Text>

        <div className="chip-row">
          <button
            type="button"
            className={`sheet-chip${mode === 'rules' ? ' is-on' : ''}`}
            onClick={() => setMode('rules')}
          >
            По правилам
          </button>
          <button
            type="button"
            className={`sheet-chip${mode === 'manual' ? ' is-on' : ''}`}
            onClick={() => {
              setMode('manual')
              setManualTotal(rulesTotal ?? hpMax)
            }}
          >
            Вручную итог
          </button>
        </div>

        {mode === 'rules' ? (
          built ? (
            <div className="hp-levels">
              <ul className="hp-levels__list">
                {built.rows.map((row, index) => (
                  <HpLevelRowView key={`${row.label}-${index}`} row={row} />
                ))}
              </ul>
              <p className="hp-levels__total">
                Итого макс. HP: <strong>{built.total}</strong>
                {hpMax != null ? ` · было ${hpMax}` : ''}
              </p>
            </div>
          ) : (
            <Text tone="muted">
              Нужна кость хитов класса (выбери класс или задай кость в блоке отдыха) — иначе только
              ручной итог.
            </Text>
          )
        ) : (
          <Field label="Максимум HP" hint="Свой итог, если бросал кости или хоумбрю">
            <NumberInput
              min={1}
              emptyValue={null}
              value={manualTotal}
              onValueChange={setManualTotal}
            />
          </Field>
        )}

        <label className="hp-levels__fill">
          <input
            type="checkbox"
            checked={fillCurrent}
            onChange={(event) => setFillCurrent(event.target.checked)}
          />
          <span>
            Выставить текущие HP = макс.
            {nextMax != null && nextCurrent != null
              ? ` (${hpCurrent ?? '—'} → ${nextCurrent})`
              : ''}
          </span>
        </label>
      </Stack>
    </Dialog>
  )
}

function HpLevelRowView({ row }: { row: MaxHpLevelRow }) {
  return (
    <li className="hp-levels__row">
      <span className="hp-levels__label">{row.label}</span>
      <span className="hp-levels__meta">
        {row.kind === 'max' ? `макс ${row.die}` : `ср. ${row.die}`}
      </span>
      <span className="hp-levels__gain">+{row.gain}</span>
    </li>
  )
}
