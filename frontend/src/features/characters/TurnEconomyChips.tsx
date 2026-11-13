import {
  TURN_MARK_LABELS,
  type TurnEconomyMarkKey,
  type TurnEconomyState,
} from '../../shared/dnd/turnEconomy'

const MARKS: TurnEconomyMarkKey[] = [
  'action',
  'bonus',
  'reaction',
  'object_interaction',
]

type Props = {
  state: TurnEconomyState
  onToggle: (mark: TurnEconomyMarkKey) => void
  /** L-20: кликабельная отметка «Движение» (для Точного прицеливания). */
  onToggleMoved?: () => void
  /** Visual-only stub, если нет onToggleMoved. */
  showMovementStub?: boolean
  className?: string
  chipClassName?: string
  ariaLabel?: string
}

function isOn(state: TurnEconomyState, mark: TurnEconomyMarkKey): boolean {
  if (mark === 'action') return state.action
  if (mark === 'bonus') return state.bonus
  if (mark === 'reaction') return state.reaction
  return state.objectInteraction
}

/** Чипы отметок хода (лист и стол). */
export function TurnEconomyChips({
  state,
  onToggle,
  onToggleMoved,
  showMovementStub = false,
  className = 'chip-row',
  chipClassName = 'sheet-chip',
  ariaLabel = 'Отметки хода',
}: Props) {
  return (
    <div className={className} role="group" aria-label={ariaLabel}>
      {MARKS.map((mark) => {
        const on = isOn(state, mark)
        return (
          <button
            key={mark}
            type="button"
            className={`${chipClassName}${on ? ' is-on' : ''}`}
            aria-pressed={on}
            title={
              on
                ? 'Потрачено — нажмите, чтобы снять'
                : 'Свободно — нажмите, чтобы отметить'
            }
            onClick={() => onToggle(mark)}
          >
            {TURN_MARK_LABELS[mark]}
          </button>
        )
      })}
      {onToggleMoved ? (
        <button
          type="button"
          className={`${chipClassName}${state.moved ? ' is-on' : ''}`}
          aria-pressed={state.moved}
          title={
            state.moved
              ? 'Уже двигался — нажмите, чтобы снять'
              : 'Отметить перемещение в этот ход'
          }
          onClick={onToggleMoved}
        >
          Движение
        </button>
      ) : showMovementStub ? (
        <span
          className={`${chipClassName} is-stub`}
          title="Перемещение не учитываем (пока нет онлайн-карты)"
        >
          Движение
        </span>
      ) : null}
      {state.steadyAim ? (
        <span
          className={`${chipClassName} is-on`}
          title="Точное прицеливание: преимущество на следующую атаку, скорость 0"
        >
          Прицел
        </span>
      ) : null}
    </div>
  )
}
