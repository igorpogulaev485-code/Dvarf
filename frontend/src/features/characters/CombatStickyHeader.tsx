import { useEffect, useRef, useState } from 'react'
import { NumberInput } from '../../ui'
import type { ConcentrationState } from './play'
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

        <label
          className={`combat-stat${hpPulse ? ' combat-stat--pulse' : ''}`}
          title={hpTitle}
        >
          <span className="combat-stat__label">HP</span>
          <div className="combat-sticky__hp">
            <NumberInput
              value={hpCurrent}
              aria-label="Текущие HP"
              onValueChange={(value) => onChange({ hpCurrent: value })}
            />
            <span className="combat-sticky__hp-sep">/</span>
            <NumberInput
              value={hpMax}
              aria-label="Максимум HP"
              onValueChange={(value) => onChange({ hpMax: value })}
            />
          </div>
        </label>

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
    </section>
  )
}
