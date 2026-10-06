import { Field, NumberInput } from '../../ui'
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
  ac: number | null
  speed: number | null
  initiativeOverride: number | null
  inspiration: boolean
  exhaustion: number
  isDying: boolean
  deathSuccesses: number
  deathFails: number
  conditionNames: string[]
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
  ac,
  speed,
  initiativeOverride,
  inspiration,
  exhaustion,
  isDying,
  deathSuccesses,
  deathFails,
  conditionNames,
  onChange,
}: CombatStickyHeaderProps) {
  const autoInitiative = abilityModifier(abilities.dex)
  const subtitle = [raceName, className].filter(Boolean).join(' — ') || 'Черновик'
  const conditionsLabel =
    conditionNames.length > 0 ? conditionNames.join(', ') : 'нет состояний'

  return (
    <section className="combat-sticky" aria-label="Боевой статус">
      <div className="combat-sticky__identity">
        <div>
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
          >
            Вдохновение
          </button>
          <span
            className={`combat-chip combat-chip--static${exhaustion > 0 ? ' is-on' : ''}`}
            title="Меняется в блоке «Состояния и ресурсы»"
          >
            Истощение {exhaustion}
          </span>
          {isDying ? (
            <span className="combat-chip combat-chip--static is-danger" title="Спасброски от смерти">
              Смерть {deathSuccesses}/{deathFails}
            </span>
          ) : null}
        </div>
      </div>
      <p className="combat-sticky__conditions" title={conditionsLabel}>
        {conditionsLabel}
      </p>

      <div className="combat-sticky__stats">
        <Field label="КД">
          <NumberInput value={ac} onValueChange={(value) => onChange({ ac: value })} />
        </Field>
        <Field label="Скорость">
          <NumberInput value={speed} onValueChange={(value) => onChange({ speed: value })} />
        </Field>
        <Field label="HP" hint={hpTemp > 0 ? `врем. +${hpTemp}` : undefined}>
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
        </Field>
        <Field
          label="Инициатива"
          hint={
            initiativeOverride == null
              ? `от ЛОВ ${formatModifier(autoInitiative)}`
              : 'задано вручную'
          }
        >
          <div className="combat-sticky__init">
            <NumberInput
              value={initiativeOverride ?? autoInitiative}
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
        </Field>
      </div>
    </section>
  )
}
