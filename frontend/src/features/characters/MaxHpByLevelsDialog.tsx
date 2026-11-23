import { useEffect, useMemo, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { totalCharacterLevel } from '../../shared/dnd/classLevels'
import {
  buildMaxHpByLevels,
  hitDieForClass,
  type MaxHpLevelRow,
} from '../../shared/dnd/multiclassRules'
import { hitDieSides, type HitDie } from '../../shared/dnd/hitDice'
import { Dialog, Field, NumberInput, Stack, Text } from '../../ui'

export type MaxHpExtraBonusRow = {
  /** Display label, e.g. «Дварфийская стойкость». */
  label: string
  /** Flat +HP amount (already total, not per-level). */
  amount: number
}

type MaxHpByLevelsDialogProps = {
  open: boolean
  classes: ClassLevelEntry[]
  constitutionMod: number
  hitDie: HitDie | null
  hpMax: number | null
  hpCurrent: number | null
  /** B-05: Draconic Resilience +1 HP per sorcerer level. */
  draconicResilience?: boolean
  /** Hill/Gold Dwarf Dwarven Toughness +1 HP per level (2014 / main #498). */
  dwarvenToughness?: boolean
  /**
   * Flat edition/species bonuses shown as explicit lines after per-level rows
   * (e.g. 2024 «+N Дварфийская стойкость»).
   */
  extraFlatBonuses?: MaxHpExtraBonusRow[]
  onApply: (next: { hpMax: number; hpCurrent: number }) => void
  onClose: () => void
  /** Desktop etalon: «Назад к паду хитов» reopens the HP pad. */
  onBackToPad?: () => void
}

type Mode = 'rules' | 'manual'

export function MaxHpByLevelsDialog({
  open,
  classes,
  constitutionMod,
  hitDie,
  hpMax,
  hpCurrent,
  draconicResilience = false,
  dwarvenToughness = false,
  extraFlatBonuses = [],
  onApply,
  onClose,
  onBackToPad,
}: MaxHpByLevelsDialogProps) {
  const [mode, setMode] = useState<Mode>('rules')
  const [manualTotal, setManualTotal] = useState<number | null>(hpMax)
  const [fillCurrent, setFillCurrent] = useState(true)

  const extras = useMemo(
    () =>
      (extraFlatBonuses ?? []).filter(
        (row) => row && row.label.trim() && Number.isFinite(row.amount) && row.amount !== 0,
      ),
    [extraFlatBonuses],
  )
  const extrasTotal = useMemo(
    () => extras.reduce((sum, row) => sum + Math.floor(row.amount), 0),
    [extras],
  )

  const built = useMemo(
    () =>
      buildMaxHpByLevels({
        classes,
        constitutionMod,
        fallbackDie: hitDie,
        draconicResilience,
        dwarvenToughness,
      }),
    [classes, constitutionMod, hitDie, draconicResilience, dwarvenToughness],
  )

  const rulesTotal = built == null ? null : built.total + extrasTotal

  useEffect(() => {
    if (!open) return
    setMode('rules')
    setManualTotal(rulesTotal ?? hpMax)
    const wasFull =
      hpMax != null && hpCurrent != null && hpCurrent >= hpMax
    setFillCurrent(hpCurrent == null || wasFull)
  }, [open, rulesTotal, hpMax, hpCurrent])

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

  if (typeof document !== 'undefined' && document.documentElement.dataset.deskWindows === '1') {
    const named = classes.filter((row) => row.name.trim() && row.level > 0)
    const classRows = named.map((row, index) => {
      const token = hitDieForClass({ className: row.name }) ?? hitDie ?? 'd8'
      const die = hitDieSides(token)
      const avg = Math.ceil((die + 1) / 2)
      const hp = index === 0 ? die + (row.level - 1) * avg : row.level * avg
      const range = row.level === 1 ? '1 ур.' : `1–${row.level} ур.`
      const formula = index === 0 ? `${die}+${row.level - 1}×${avg}` : `${row.level}×${avg}`
      return { label: `${row.name.trim()} ${range} · к${die}`, hp, formula }
    })
    const conTotal = constitutionMod * level
    const dwarf = dwarvenToughness ? level : 0
    const total = classRows.reduce((sum, row) => sum + row.hp, 0) + conTotal + dwarf + extrasTotal
    const formula = `${classRows.map((row) => row.formula).join(' + ')} + Тел ${conTotal} = ${total}`
    return (
      <Dialog
        open={open}
        title="Макс. хиты по уровням"
        primaryLabel="Закрыть"
        onPrimary={onClose}
        showActions={false}
        showClose
        onDismiss={onClose}
        className="desk-max-hp"
      >
        <p className="pad-lead">Разборка максимума хитов.</p>
        <ul className="breakdown live">
          {classRows.map((row) => (
            <li key={row.label}>
              <span>{row.label}</span>
              <b className="num">{row.hp}</b>
            </li>
          ))}
          <li>
            <span>
              Модификатор Телосложения ({conLabel}) × {level} ур.
            </span>
            <b className="num">{conTotal}</b>
          </li>
          <li>
            <span>Стойкость дварфа (горный дварф)</span>
            <b className="num">{dwarf}</b>
          </li>
          <li>
            <span>Черты и прочие бонусы</span>
            <b className="num">{extrasTotal}</b>
          </li>
          <li>
            <span>Итого</span>
            <b className="num">{total}</b>
          </li>
        </ul>
        <p className="pad-note">
          Горный дварф не получает «Стойкость дварфа» (+1 хит/уровень есть у холмового). Итог
          сходится: {formula}.
        </p>
        <div className="pad-row">
          <button type="button" className="btn" onClick={onBackToPad ?? onClose}>
            Назад к паду хитов
          </button>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      title="Макс. хиты по уровням"
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
              {extras.length > 0 ? (
                <ul className="hp-levels__list hp-levels__list--extras">
                  {extras.map((row) => (
                    <li key={row.label} className="hp-levels__row hp-levels__row--extra">
                      <span className="hp-levels__label">{row.label}</span>
                      <span className="hp-levels__meta">бонус вида</span>
                      <span className="hp-levels__gain">
                        +{Math.floor(row.amount)} {row.label}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="hp-levels__total">
                Итого макс. хиты: <strong>{rulesTotal}</strong>
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
          <Field label="Максимум хитов" hint="Свой итог, если бросал кости или хоумбрю">
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
            Выставить текущие хиты = макс.
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
