import { useTurnEconomy } from './TurnEconomyContext'
import { STEADY_AIM_HINT } from '../../shared/dnd/turnEconomy'

type Props = {
  /** Есть умение «Хитрое действие» (плут). */
  hasCunningAction: boolean
  /** L-20: «Точное прицеливание» (TCE, плут 3+). */
  hasSteadyAim?: boolean
  /** Предложить бросок навыка после траты (не обязательный автобросок). */
  onOfferSkill?: (skillKey: 'investigation' | 'perception' | 'stealth') => void
  className?: string
}

/**
 * T-02 Э9 / L-20: «Поиск», «Хитрое действие» (Засада / Отход / Рывок), «Точное прицеливание».
 */
export function TurnEconomyCombatActions({
  hasCunningAction,
  hasSteadyAim = false,
  onOfferSkill,
  className = 'chip-row',
}: Props) {
  const turnEco = useTurnEconomy()
  if (!turnEco) return null

  const searchGate = turnEco.canSearch()
  const hideGate = turnEco.canHide(hasCunningAction)
  const steadyGate = hasSteadyAim ? turnEco.canSteadyAim() : { ok: false as const, reason: '', mark: 'bonus' as const }
  const cunningGate = hasCunningAction ? turnEco.canCunningBonus() : { ok: false as const, reason: '', mark: 'bonus' as const }

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

      {hasCunningAction ? (
        <div className="chip-row" role="group" aria-label="Хитрое действие">
          <span className="sheet-chip is-stub" title="Хитрое действие (плут)">
            Хитрое действие
          </span>
          <button
            type="button"
            className="sheet-chip"
            disabled={!hideGate.ok}
            title={
              hideGate.ok
                ? 'Хитрое действие: Засада · тратит бонусное · затем можно бросить Скрытность'
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
          <button
            type="button"
            className="sheet-chip"
            disabled={!cunningGate.ok}
            title={
              cunningGate.ok
                ? 'Хитрое действие: Отход · бонусное · без карты только отметка и лента'
                : cunningGate.reason
            }
            onClick={() => {
              if (!turnEco.canCunningBonus().ok) return
              turnEco.spendCunningBonus('disengage')
            }}
          >
            Отход
          </button>
          <button
            type="button"
            className="sheet-chip"
            disabled={!cunningGate.ok}
            title={
              cunningGate.ok
                ? 'Хитрое действие: Рывок · бонусное · без карты только отметка и лента'
                : cunningGate.reason
            }
            onClick={() => {
              if (!turnEco.canCunningBonus().ok) return
              turnEco.spendCunningBonus('dash')
            }}
          >
            Рывок
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="sheet-chip"
          disabled={!hideGate.ok}
          title={
            hideGate.ok
              ? 'Тратит действие · затем можно бросить Скрытность'
              : hideGate.reason
          }
          onClick={() => {
            const gate = turnEco.canHide(false)
            if (!gate.ok || !gate.timing) return
            turnEco.spendHide(gate.timing)
            onOfferSkill?.('stealth')
          }}
        >
          Засада
        </button>
      )}

      {hasSteadyAim ? (
        <button
          type="button"
          className={`sheet-chip${turnEco.turnEconomy.steadyAim ? ' is-on' : ''}`}
          disabled={!steadyGate.ok}
          title={steadyGate.ok ? STEADY_AIM_HINT : steadyGate.reason}
          onClick={() => {
            if (!turnEco.canSteadyAim().ok) return
            turnEco.spendSteadyAim()
          }}
        >
          Точное прицеливание
        </button>
      ) : null}

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
