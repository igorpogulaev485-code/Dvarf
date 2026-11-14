/**
 * SCN-01: «Новый ход» + «Кубики на столе» — компактно в тулбаре сцены
 * (рядом с норм/преим./помеха/броски), без отдельной строки-карточки.
 */
import { HoverTipCard } from '../onboarding/ValueTip'
import { TURN_TIPS } from '../onboarding/valueTips.ru'
import { useTurnEconomy } from './TurnEconomyContext'

type SceneTurnControlsProps = {
  /** Absolute beginner (dnd_new): hover tip on «Новый ход». */
  showValueTips?: boolean
  /** Extra class on the root (desktop roll-mode vs mobile). */
  className?: string
  /** Button class — matches surrounding roll-mode chips. */
  buttonClassName?: string
}

/**
 * Renders only when TurnEconomyProvider is above.
 * Outside combat → «Новый ход»; in combat on your turn → «Начало хода».
 * Dice toggle always available (locked when master forced table dice).
 */
export function SceneTurnControls({
  showValueTips = false,
  className = 'scene-turn-controls',
  buttonClassName = 'play-desk__roll-mode-btn',
}: SceneTurnControlsProps) {
  const te = useTurnEconomy()
  if (!te) return null

  const showBeginButton = !te.combatActive || te.yourTurn
  const compact = buttonClassName.includes('mobile-combat-roll')
  const beginLabel = te.combatActive
    ? compact
      ? 'ход'
      : 'Начало хода'
    : compact
      ? 'ход'
      : 'Новый ход'
  const beginTitle = te.combatActive
    ? 'Сбросить отметки действия / бонусного / реакции'
    : 'Сбросить отметки хода (действие, бонусное, реакция…)'
  const diceLabel = compact ? 'куб.' : 'кубики'

  return (
    <div
      className={className}
      role="group"
      aria-label="Ход и кубики"
      data-scn01-scene-turn="1"
    >
      {showBeginButton ? (
        <span className={showValueTips ? 'has-onboarding-tip' : undefined}>
          <button
            type="button"
            className={`${buttonClassName} scene-turn-controls__begin`}
            title={beginTitle}
            aria-label={te.combatActive ? 'Начало хода' : 'Новый ход'}
            onClick={() => te.beginMyTurn()}
          >
            {beginLabel}
          </button>
          {showValueTips ? <HoverTipCard tip={TURN_TIPS.newTurn} /> : null}
        </span>
      ) : null}
      <label
        className={`${buttonClassName} scene-turn-controls__dice${
          te.diceOnTable ? ' is-on' : ''
        }${te.diceLockedByMaster ? ' is-locked' : ''}`}
        title={
          te.diceLockedByMaster
            ? 'Включено мастером на столе'
            : 'Бросок живыми кубиками: Попал/Промах или своё число, без цифрового броска'
        }
      >
        <input
          type="checkbox"
          className="scene-turn-controls__dice-input"
          checked={te.diceOnTable}
          disabled={te.diceLockedByMaster}
          onChange={(e) => te.setPersonalDiceOnTable(e.target.checked)}
          aria-label="Кубики на столе"
        />
        <span>{diceLabel}</span>
        {te.diceLockedByMaster ? (
          <span className="scene-turn-controls__hint">мастер</span>
        ) : null}
      </label>
    </div>
  )
}
