import { Button, Text } from '../../ui'
import { useTurnEconomy } from './TurnEconomyContext'

/**
 * T-01 / SCN-01: статус боя над сценами (не LOCK-шапка виталов).
 * Ход/кубики — в SceneTurnControls (тулбар сцены).
 * Вне боя не рендерится — без отдельной строки-карточки.
 */
export function TurnEconomyStrip() {
  const te = useTurnEconomy()
  if (!te?.combatActive) return null

  const {
    yourTurn,
    combatRound: round,
    combatActiveName: activeName,
    combatTurnsUntil: turnsUntil,
    initiativePending,
    openInitiativeRoll,
  } = te

  return (
    <div
      className="turn-economy-strip turn-economy-strip--combat-status"
      role="region"
      aria-label="Ход"
      data-scn01-combat-status="1"
    >
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
          <Button type="button" onClick={openInitiativeRoll}>
            Бросить инициативу
          </Button>
        ) : null}
      </div>
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
