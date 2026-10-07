import { useEffect, useRef, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import type { HitDie } from '../../shared/dnd/hitDice'
import { NumberInput, NumberPadDialog } from '../../ui'
import type { ConcentrationState } from './play'
import { MaxHpByLevelsDialog } from './MaxHpByLevelsDialog'
import {
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'

type CombatStickyHeaderProps = {
  name: string
  raceName: string
  className: string
  level: number
  abilities: Record<AbilityKey, number>
  classes: ClassLevelEntry[]
  hitDie: HitDie | null
  constitutionMod: number
  hpCurrent: number | null
  hpMax: number | null
  hpTemp: number
  /** Manual AC override; null = use autoAc from armor. */
  acOverride: number | null
  autoAc: number
  acHint: string
  speed: number | null
  initiativeOverride: number | null
  inspiration: boolean
  exhaustion: number
  isDying: boolean
  deathSuccesses: number
  deathFails: number
  conditionNames: string[]
  concentration: ConcentrationState | null
  onClearConcentration?: () => void
  onChange: (patch: {
    hpCurrent?: number | null
    hpMax?: number | null
    ac?: number | null
    speed?: number | null
    initiativeOverride?: number | null
    inspiration?: boolean
  }) => void
}

export function CombatStickyHeader({
  name,
  raceName,
  className,
  level,
  abilities,
  classes,
  hitDie,
  constitutionMod,
  hpCurrent,
  hpMax,
  hpTemp,
  acOverride,
  autoAc,
  acHint,
  speed,
  initiativeOverride,
  inspiration,
  exhaustion,
  isDying,
  deathSuccesses,
  deathFails,
  conditionNames,
  concentration,
  onClearConcentration,
  onChange,
}: CombatStickyHeaderProps) {
  const autoInitiative = abilityModifier(abilities.dex)
  const subtitle = [raceName, className].filter(Boolean).join(' — ') || 'Черновик'
  const hasConditions = conditionNames.length > 0
  const conditionsLabel = hasConditions ? conditionNames.join(', ') : ''
  const acTitle = acOverride == null ? acHint : 'задано вручную'
  const initTitle =
    initiativeOverride == null
      ? `от ЛОВ ${formatModifier(autoInitiative)}`
      : 'задано вручную'
  const hpTitle = hpTemp > 0 ? `врем. +${hpTemp}` : undefined
  const [hpPulse, setHpPulse] = useState(false)
  const [currentPadOpen, setCurrentPadOpen] = useState(false)
  const [maxDialogOpen, setMaxDialogOpen] = useState(false)
  const prevHpRef = useRef(hpCurrent)

  useEffect(() => {
    const prev = prevHpRef.current
    prevHpRef.current = hpCurrent
    if (prev == null || hpCurrent == null) return
    if (hpCurrent <= prev) return
    setHpPulse(true)
    const timer = window.setTimeout(() => setHpPulse(false), 900)
    return () => window.clearTimeout(timer)
  }, [hpCurrent])

  const currentValue = hpCurrent ?? 0
  const maxValue = hpMax

  return (
    <section className="combat-sticky" aria-label="Боевой статус">
      <div className="combat-sticky__identity">
        <div className="combat-sticky__who">
          <h1 className="combat-sticky__name">{name || 'Без имени'}</h1>
          <p className="combat-sticky__sub">
            {subtitle} · ур. {level}
          </p>
        </div>
        <div className="combat-sticky__chips">
          <button
            type="button"
            className={`combat-chip${inspiration ? ' is-on' : ''}`}
            onClick={() => onChange({ inspiration: !inspiration })}
            aria-pressed={inspiration}
            title="Вдохновение"
          >
            <span className="combat-chip__full">Вдохновение</span>
            <span className="combat-chip__short" aria-hidden>
              Вдохн.
            </span>
          </button>
          <span
            className={`combat-chip combat-chip--static${exhaustion > 0 ? ' is-on' : ''}`}
            title="Меняется в блоке «Состояния и ресурсы»"
          >
            <span className="combat-chip__full">Истощение {exhaustion}</span>
            <span className="combat-chip__short" aria-hidden>
              Ист. {exhaustion}
            </span>
          </span>
          {isDying ? (
            <span
              className="combat-chip combat-chip--static is-danger"
              title="Спасброски от смерти"
            >
              Смерть {deathSuccesses}/{deathFails}
            </span>
          ) : null}
        </div>
      </div>

      {hasConditions ? (
        <p className="combat-sticky__conditions" title={conditionsLabel}>
          {conditionsLabel}
        </p>
      ) : null}

      {concentration ? (
        <div className="combat-sticky__concentration">
          <span>
            Конц.: <strong>{concentration.name}</strong>
          </span>
          {onClearConcentration ? (
            <button type="button" className="linkish" onClick={onClearConcentration}>
              Снять
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="combat-sticky__stats">
        <label className="combat-stat" title={acTitle}>
          <span className="combat-stat__label">КД</span>
          <div className="combat-sticky__init">
            <NumberInput
              value={acOverride ?? autoAc}
              aria-label="Класс доспеха"
              onValueChange={(value) => {
                if (value == null || value === autoAc) {
                  onChange({ ac: null })
                  return
                }
                onChange({ ac: value })
              }}
            />
            {acOverride != null ? (
              <button
                type="button"
                className="combat-sticky__reset"
                onClick={() => onChange({ ac: null })}
              >
                авто
              </button>
            ) : null}
          </div>
        </label>

        <label className="combat-stat">
          <span className="combat-stat__label">Скор.</span>
          <NumberInput
            value={speed}
            aria-label="Скорость"
            onValueChange={(value) => onChange({ speed: value })}
          />
        </label>

        <div
          className={`combat-stat${hpPulse ? ' combat-stat--pulse' : ''}`}
          title={hpTitle}
        >
          <span className="combat-stat__label">HP</span>
          <div className="combat-sticky__hp">
            <button
              type="button"
              className="combat-hp-open"
              aria-label={`Текущие HP ${hpCurrent ?? 'не заданы'}. Прибавить или отнять`}
              onClick={() => setCurrentPadOpen(true)}
            >
              <span className="combat-hp-open__value">
                {hpCurrent == null ? '—' : hpCurrent}
              </span>
              <span className="combat-hp-open__hint">±</span>
            </button>
            <span className="combat-sticky__hp-sep">/</span>
            <button
              type="button"
              className="combat-hp-open combat-hp-open--max"
              aria-label={`Максимум HP ${hpMax ?? 'не задан'}. Собрать по уровням`}
              onClick={() => setMaxDialogOpen(true)}
            >
              <span className="combat-hp-open__value">
                {hpMax == null ? '—' : hpMax}
              </span>
              <span className="combat-hp-open__hint">ур.</span>
            </button>
          </div>
        </div>

        <label className="combat-stat" title={initTitle}>
          <span className="combat-stat__label">Иниц.</span>
          <div className="combat-sticky__init">
            <NumberInput
              value={initiativeOverride ?? autoInitiative}
              aria-label="Инициатива"
              onValueChange={(value) => {
                if (value == null || value === autoInitiative) {
                  onChange({ initiativeOverride: null })
                  return
                }
                onChange({ initiativeOverride: value })
              }}
            />
            {initiativeOverride != null ? (
              <button
                type="button"
                className="combat-sticky__reset"
                onClick={() => onChange({ initiativeOverride: null })}
              >
                авто
              </button>
            ) : null}
          </div>
        </label>
      </div>

      <NumberPadDialog
        open={currentPadOpen}
        title="Текущие HP"
        current={currentValue}
        min={0}
        max={maxValue ?? undefined}
        addLabel="Вылечить"
        subtractLabel="Урон"
        onClose={() => setCurrentPadOpen(false)}
        onAdd={(delta) => {
          const next = currentValue + delta
          const capped = maxValue == null ? next : Math.min(maxValue, next)
          onChange({ hpCurrent: Math.max(0, capped) })
        }}
        onSubtract={(delta) => {
          onChange({ hpCurrent: Math.max(0, currentValue - delta) })
        }}
        header={
          <p className="combat-hp-pad-header">
            сейчас {hpCurrent ?? 0}
            {hpMax != null ? ` / ${hpMax}` : ' · макс не задан'}
            {hpTemp > 0 ? ` · врем. +${hpTemp}` : ''}
          </p>
        }
      />

      <MaxHpByLevelsDialog
        open={maxDialogOpen}
        classes={classes}
        constitutionMod={constitutionMod}
        hitDie={hitDie}
        hpMax={hpMax}
        hpCurrent={hpCurrent}
        onClose={() => setMaxDialogOpen(false)}
        onApply={({ hpMax: nextMax, hpCurrent: nextCurrent }) => {
          onChange({ hpMax: nextMax, hpCurrent: nextCurrent })
          setMaxDialogOpen(false)
        }}
      />
    </section>
  )
}
