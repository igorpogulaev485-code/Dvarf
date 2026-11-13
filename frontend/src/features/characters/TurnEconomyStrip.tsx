import { TurnEconomyChips } from './TurnEconomyChips'
import { TurnEconomyCombatActions } from './TurnEconomyCombatActions'
import type { TurnEconomyMarkKey, TurnEconomyState } from '../../shared/dnd/turnEconomy'
import { Button, Text } from '../../ui'

type Props = {
  /** Бой активен в открытой сессии — полоска видна. */
  combatActive: boolean
  yourTurn: boolean
  round: number
  activeName: string | null
  turnsUntil: number | null
  initiativePending: boolean
  turnEconomy: TurnEconomyState
  onToggleMark: (mark: TurnEconomyMarkKey) => void
  onBeginTurn: () => void
  onRollInitiative: () => void
  /** Вне боя — кнопка «Новый ход». */
  showNewTurnButton: boolean
  diceOnTable: boolean
  diceLockedByMaster: boolean
  onDiceOnTableChange: (next: boolean) => void
  hasCunningAction?: boolean
  onOfferSkill?: (skillKey: 'investigation' | 'perception' | 'stealth') => void
}

/**
 * T-01: отдельная полоска над сценами (не LOCK-шапка виталов).
 */
export function TurnEconomyStrip({
  combatActive,
  yourTurn,
  round,
  activeName,
  turnsUntil,
  initiativePending,
  turnEconomy,
  onToggleMark,
  onBeginTurn,
  onRollInitiative,
  showNewTurnButton,
  diceOnTable,
  diceLockedByMaster,
  onDiceOnTableChange,
  hasCunningAction = false,
  onOfferSkill,
}: Props) {
  // Вне боя: без полоски «Твой ход», только «Новый ход» + личные кубики.
  if (!combatActive) {
    if (!showNewTurnButton) return null
    return (
      <div className="turn-economy-strip turn-economy-strip--idle" role="region" aria-label="Новый ход">
        <div className="turn-economy-strip__row">
          <Button type="button" variant="secondary" onClick={onBeginTurn}>
            Новый ход
          </Button>
          <label
            className={`turn-economy-strip__dice${diceLockedByMaster ? ' is-locked' : ''}`}
            title="Бросок живыми кубиками: Попал/Промах или своё число, без цифрового броска"
          >
            <input
              type="checkbox"
              checked={diceOnTable}
              disabled={diceLockedByMaster}
              onChange={(e) => onDiceOnTableChange(e.target.checked)}
            />
            Кубики на столе
          </label>
        </div>
      </div>
    )
  }

  return (
    <div className="turn-economy-strip" role="region" aria-label="Ход и отметки">
      <div className="turn-economy-strip__status">
        {initiativePending ? (
          <Text as="p" className="turn-economy-strip__headline">
            Ждём инициативу
          </Text>
        ) : yourTurn ? (
          <Text as="p" className="turn-economy-strip__headline">
            Твой ход · раунд {round}
          </Text>
        ) : (
          <Text as="p" className="turn-economy-strip__headline">
            Ходит: {activeName || '—'}
            {turnsUntil != null && turnsUntil > 0
              ? ` · через ${turnsUntil} ${turnsLabel(turnsUntil)}`
              : ''}
            {` · раунд ${round}`}
          </Text>
        )}
        {initiativePending ? (
          <Button type="button" onClick={onRollInitiative}>
            Бросить инициативу
          </Button>
        ) : null}
      </div>

      <div className="turn-economy-strip__row">
        <TurnEconomyChips state={turnEconomy} onToggle={onToggleMark} />
        {yourTurn ? (
          <Button type="button" variant="secondary" onClick={onBeginTurn}>
            Начало моего хода
          </Button>
        ) : null}
        <label
          className={`turn-economy-strip__dice${diceLockedByMaster ? ' is-locked' : ''}`}
          title={
            diceLockedByMaster
              ? 'Включено мастером на столе'
              : 'Бросок живыми кубиками: Попал/Промах или своё число, без цифрового броска'
          }
        >
          <input
            type="checkbox"
            checked={diceOnTable}
            disabled={diceLockedByMaster}
            onChange={(e) => onDiceOnTableChange(e.target.checked)}
          />
          Кубики на столе
          {diceLockedByMaster ? (
            <span className="turn-economy-strip__hint">включено мастером</span>
          ) : null}
        </label>
      </div>
      {yourTurn ? (
        <TurnEconomyCombatActions
          hasCunningAction={hasCunningAction}
          onOfferSkill={onOfferSkill}
        />
      ) : null}
    </div>
  )
}

function turnsLabel(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'ход'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 > 20)) return 'хода'
  return 'ходов'
}
