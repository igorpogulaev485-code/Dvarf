import { useTurnEconomy } from './TurnEconomyContext'

type Props = {
  /** Есть умение «Хитрое действие» (плут). */
  hasCunningAction: boolean
  /** Предложить бросок навыка после траты (не обязательный автобросок). */
  onOfferSkill?: (skillKey: 'investigation' | 'perception' | 'stealth') => void
  className?: string
}

/**
 * T-02 Э9: «Поиск» и «Засада» — тратят действие (Засада у плута — бонусное).
 * Обычный чип навыка по-прежнему ничего не тратит.
 */
export function TurnEconomyCombatActions({
  hasCunningAction,
  onOfferSkill,
  className = 'chip-row',
}: Props) {
  const turnEco = useTurnEconomy()
  if (!turnEco) return null

  const searchGate = turnEco.canSearch()
  const hideGate = turnEco.canHide(hasCunningAction)

  return (
    <div className={className} role="group" aria-label="Действия боя">
      <button
        type="button"
        className="sheet-chip"
        disabled={!searchGate.ok}
        title={
          searchGate.ok
            ? 'Тратит действие · затем можно бросить Анализ или Внимательность'
            : searchGate.reason
        }
        onClick={() => {
          const gate = turnEco.canSearch()
          if (!gate.ok) return
          turnEco.spendSearch()
          onOfferSkill?.('investigation')
        }}
      >
        Поиск
      </button>
      <button
        type="button"
        className="sheet-chip"
        disabled={!hideGate.ok}
        title={
          hideGate.ok
            ? hasCunningAction && hideGate.timing === 'bonus'
              ? 'Хитрое действие: тратит бонусное · затем можно бросить Скрытность'
              : 'Тратит действие · затем можно бросить Скрытность'
            : hideGate.reason
        }
        onClick={() => {
          const gate = turnEco.canHide(hasCunningAction)
          if (!gate.ok || !gate.timing) return
          turnEco.spendHide(gate.timing)
          onOfferSkill?.('stealth')
        }}
      >
        Засада
      </button>
      {turnEco.turnEconomy.extraActions > 0 ? (
        <span
          className="sheet-chip is-on"
          title="Дополнительное действие от «Всплеска действий»"
        >
          Доп. действие ×{turnEco.turnEconomy.extraActions}
        </span>
      ) : null}
    </div>
  )
}
