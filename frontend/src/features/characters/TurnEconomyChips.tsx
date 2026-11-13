import {
  TURN_MARK_LABELS,
  markClearBlocked,
  movementClearBlocked,
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
  /** L-21: мастер может снимать свои/чужие отметки; игрок — нет. */
  asGm?: boolean
  /** Только просмотр (чипы без клика). */
  readOnly?: boolean
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
  asGm = false,
  readOnly = false,
  className = 'chip-row',
  chipClassName = 'sheet-chip',
  ariaLabel = 'Отметки хода',
}: Props) {
  return (
    <div className={className} role="group" aria-label={ariaLabel}>
      {MARKS.map((mark) => {
        const on = isOn(state, mark)
        const locked = readOnly || (on && markClearBlocked(state, mark, { asGm }))
        return (
          <button
            key={mark}
            type="button"
            className={`${chipClassName}${on ? ' is-on' : ''}${locked ? ' is-locked' : ''}`}
            aria-pressed={on}
            disabled={locked}
            title={
              locked
                ? state.surprised
                  ? 'Врасплох — до конца первого хода'
                  : readOnly
                    ? TURN_MARK_LABELS[mark]
                    : 'Отметку мастера снимает только мастер'
                : on
                  ? 'Потрачено — нажмите, чтобы снять'
                  : 'Свободно — нажмите, чтобы отметить'
            }
            onClick={() => {
              if (locked) return
              onToggle(mark)
            }}
          >
            {TURN_MARK_LABELS[mark]}
          </button>
        )
      })}
      {onToggleMoved ? (
        <button
          type="button"
          className={`${chipClassName}${state.moved ? ' is-on' : ''}${
            state.moved && movementClearBlocked(state, { asGm }) ? ' is-locked' : ''
          }`}
          aria-pressed={state.moved}
          disabled={Boolean(
            readOnly || (state.moved && movementClearBlocked(state, { asGm })),
          )}
          title={
            state.moved && movementClearBlocked(state, { asGm })
              ? state.surprised
                ? 'Врасплох — до конца первого хода'
                : 'Отметку мастера снимает только мастер'
              : state.moved
                ? 'Уже двигался — нажмите, чтобы снять'
                : 'Отметить перемещение в этот ход'
          }
          onClick={onToggleMoved}
        >
          Движение
        </button>
      ) : showMovementStub ? (
        <span
          className={`${chipClassName}${state.moved ? ' is-on' : ''} is-stub`}
          title={
            state.surprised
              ? 'Врасплох'
              : 'Перемещение не учитываем (пока нет онлайн-карты)'
          }
        >
          Движение
        </span>
      ) : null}
      {state.surprised ? (
        <span
          className={`${chipClassName} is-on`}
          title="Застигнут врасплох до конца первого хода"
        >
          врасплох
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
