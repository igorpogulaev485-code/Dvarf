import { useEffect, useMemo, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { totalCharacterLevel } from '../../shared/dnd/classLevels'
import {
  applyHpMaxBonusChange,
  clampHpMaxBonus,
  effectiveHpMax,
} from '../../shared/dnd/hp'
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
  hpMaxBonus: number
  hpCurrent: number | null
  onApply: (next: {
    hpMax: number
    hpMaxBonus: number
    hpCurrent: number
  }) => void
  onClose: () => void
}

type Mode = 'rules' | 'manual'

export function MaxHpByLevelsDialog({
  open,
  classes,
  constitutionMod,
  hitDie,
  hpMax,
  hpMaxBonus,
  hpCurrent,
  onApply,
  onClose,
}: MaxHpByLevelsDialogProps) {
  const [mode, setMode] = useState<Mode>('rules')
  const [manualTotal, setManualTotal] = useState<number | null>(hpMax)
  const [bonus, setBonus] = useState(hpMaxBonus)
  const [fillCurrent, setFillCurrent] = useState(true)
  const [raiseWithBonus, setRaiseWithBonus] = useState(true)

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
    setBonus(clampHpMaxBonus(hpMaxBonus))
    setRaiseWithBonus(true)
    const prevEffective = effectiveHpMax(hpMax, hpMaxBonus)
    const wasFull =
      prevEffective != null && hpCurrent != null && hpCurrent >= prevEffective
    setFillCurrent(hpCurrent == null || wasFull)
  }, [open, built?.total, hpMax, hpMaxBonus, hpCurrent])

  const rulesTotal = built?.total ?? null
  const nextBase =
    mode === 'rules'
      ? (rulesTotal ?? hpMax)
      : manualTotal == null
        ? null
        : Math.max(1, Math.floor(manualTotal))
  const nextBonus = clampHpMaxBonus(bonus)
  const nextEffective = effectiveHpMax(nextBase, nextBonus)
  const canApply = nextBase != null && nextEffective != null

  const nextCurrent = (() => {
    if (nextBase == null || nextEffective == null) return null
    if (fillCurrent) return nextEffective
    return applyHpMaxBonusChange({
      hpCurrent,
      hpMax: nextBase,
      previousBonus: hpMaxBonus,
      nextBonus,
      raiseCurrentWithBonus: raiseWithBonus,
    })
  })()

  const level = totalCharacterLevel(classes)
  const conLabel = `${constitutionMod >= 0 ? '+' : ''}${constitutionMod}`
  const prevEffective = effectiveHpMax(hpMax, hpMaxBonus)

  return (
    <Dialog
      open={open}
      title="Максимум HP"
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      primaryDisabled={!canApply}
      onPrimary={() => {
        if (!canApply || nextBase == null || nextCurrent == null) return
        onApply({
          hpMax: nextBase,
          hpMaxBonus: nextBonus,
          hpCurrent: nextCurrent,
        })
      }}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted" className="hp-levels__lead">
          Ур. {level} · ТЕЛ {conLabel}. База — по уровням; бонус — временный баф к максимуму
          (Aid и т.п.), сбрасывается после продолжительного отдыха вместе с временными HP.
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
            Вручную
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
                База: <strong>{built.total}</strong>
                {hpMax != null ? ` · было ${hpMax}` : ''}
              </p>
            </div>
          ) : hpMax != null ? (
            <Text tone="muted">
              Кость хитов не задана — база останется {hpMax}. Задай кость или вкладку «Вручную».
            </Text>
          ) : (
            <Text tone="muted">
              Нужна кость хитов (класс или блок отдыха) — иначе вкладка «Вручную».
            </Text>
          )
        ) : (
          <Field label="Базовый максимум" hint="Уровни, броски костей или хоумбрю">
            <NumberInput
              min={1}
              emptyValue={null}
              value={manualTotal}
              onValueChange={setManualTotal}
            />
          </Field>
        )}

        <Field
          label="Временный бонус к макс."
          hint="Сбрасывается после продолжительного отдыха (как временные HP)"
        >
          <div className="hp-levels__bonus-row">
            <NumberInput
              min={0}
              emptyValue={0}
              value={bonus}
              onValueChange={(value) => setBonus(clampHpMaxBonus(value ?? 0))}
            />
            {nextBonus > 0 ? (
              <button
                type="button"
                className="linkish"
                onClick={() => setBonus(0)}
              >
                Сбросить
              </button>
            ) : null}
          </div>
        </Field>

        {nextEffective != null ? (
          <p className="hp-levels__effective">
            В бою: <strong>{nextEffective}</strong>
            {nextBonus > 0 ? ` (база ${nextBase} · +${nextBonus})` : ''}
            {prevEffective != null && prevEffective !== nextEffective
              ? ` · было ${prevEffective}`
              : ''}
          </p>
        ) : null}

        <label className="hp-levels__fill">
          <input
            type="checkbox"
            checked={fillCurrent}
            onChange={(event) => setFillCurrent(event.target.checked)}
          />
          <span>
            Текущие = эффективный макс.
            {nextEffective != null && nextCurrent != null
              ? ` (${hpCurrent ?? '—'} → ${nextCurrent})`
              : ''}
          </span>
        </label>

        {!fillCurrent ? (
          <label className="hp-levels__fill">
            <input
              type="checkbox"
              checked={raiseWithBonus}
              onChange={(event) => setRaiseWithBonus(event.target.checked)}
            />
            <span>При росте бонуса поднять текущие на ту же величину</span>
          </label>
        ) : null}
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
