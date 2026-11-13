import { useTurnEconomy } from './TurnEconomyContext'
import { STEADY_AIM_HINT } from '../../shared/dnd/turnEconomy'
import { canKiFueledAttack } from '../../shared/dnd/o02TashaFeatures'

export type O03MasterRuleFlags = {
  disarm?: boolean
  mark?: boolean
  overrun?: boolean
  tumble?: boolean
  climbBigger?: boolean
  identifySpell?: boolean
  falling?: boolean
  noLongRest?: boolean
  /** Метка уже стоит — показать «Провоцированная по метке». */
  hasMarkedTarget?: boolean
  markOppAvailable?: boolean
}

type Props = {
  /** Есть умение «Хитрое действие» (плут). */
  hasCunningAction: boolean
  /** L-20: «Точное прицеливание» (TCE, плут 3+). */
  hasSteadyAim?: boolean
  /** O-02: «Атака на ци» (монах, TCE). */
  hasKiFueledAttack?: boolean
  /** O-01: Перехват (TCE fighting style). */
  hasInterception?: boolean
  /** O-01: Сражение вслепую — пометка слепого зрения. */
  hasBlindFighting?: boolean
  /** O-01: Дар мастера цепи — бонусная атака фамильяра / реакция. */
  hasChainMaster?: boolean
  /** O-01: Порицание талисмана — реакция. */
  hasTalismanRebuke?: boolean
  /** O-01: открыть диалог Захват/Толчок. */
  onGrappleShove?: () => void
  /** O-03: флаги правил мастера и колбэки кнопок. */
  o03?: O03MasterRuleFlags
  onO03Disarm?: () => void
  onO03Mark?: () => void
  onO03MarkOpportunity?: () => void
  onO03Overrun?: () => void
  onO03Tumble?: () => void
  onO03ClimbBigger?: () => void
  onO03IdentifySpell?: () => void
  onO03Falling?: () => void
  onO03NoLongRest?: () => void
  /** Предложить бросок навыка после траты (не обязательный автобросок). */
  onOfferSkill?: (skillKey: 'investigation' | 'perception' | 'stealth') => void
  onToast?: (message: string) => void
  className?: string
}

/**
 * T-02 Э9 / L-20 / O-01: «Поиск», «Хитрое действие», «Точное прицеливание»,
 * «Захват / Толчок», Перехват и кнопки воззваний TCE.
 */
export function TurnEconomyCombatActions({
  hasCunningAction,
  hasSteadyAim = false,
  hasKiFueledAttack = false,
  hasInterception = false,
  hasBlindFighting = false,
  hasChainMaster = false,
  hasTalismanRebuke = false,
  onGrappleShove,
  o03,
  onO03Disarm,
  onO03Mark,
  onO03MarkOpportunity,
  onO03Overrun,
  onO03Tumble,
  onO03ClimbBigger,
  onO03IdentifySpell,
  onO03Falling,
  onO03NoLongRest,
  onOfferSkill,
  onToast,
  className = 'chip-row',
}: Props) {
  const turnEco = useTurnEconomy()
  if (!turnEco) return null

  const searchGate = turnEco.canSearch()
  const hideGate = turnEco.canHide(hasCunningAction)
  const steadyGate = hasSteadyAim ? turnEco.canSteadyAim() : { ok: false as const, reason: '', mark: 'bonus' as const }
  const cunningGate = hasCunningAction ? turnEco.canCunningBonus() : { ok: false as const, reason: '', mark: 'bonus' as const }
  const attackGate = turnEco.canAttack()
  const actionGate = turnEco.canFeature('action')
  const reactionGate = turnEco.canFeature('reaction')
  const bonusGate = turnEco.canFeature('bonus')
  const kiFueledGate = hasKiFueledAttack
    ? canKiFueledAttack(turnEco.turnEconomy)
    : { ok: false as const, reason: '', mark: 'bonus' as const }

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

      {hasKiFueledAttack ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!kiFueledGate.ok}
          title={
            kiFueledGate.ok
              ? 'Атака на ци: бонусная безоружная или атака оружием монаха'
              : kiFueledGate.reason
          }
          onClick={() => {
            const gate = canKiFueledAttack(turnEco.turnEconomy)
            if (!gate.ok) {
              onToast?.(gate.reason)
              return
            }
            turnEco.spendFeature('bonus')
            onToast?.(
              'Атака на ци: бонусная безоружная атака или атака оружием монаха',
            )
          }}
        >
          Атака на ци
        </button>
      ) : null}

      {onGrappleShove ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!attackGate.ok}
          title={
            attackGate.ok
              ? 'Захват или толчок вместо одной атаки (не всё действие)'
              : attackGate.reason
          }
          onClick={() => {
            if (!turnEco.canAttack().ok) return
            onGrappleShove()
          }}
        >
          Захват / Толчок
        </button>
      ) : null}

      {o03?.disarm && onO03Disarm ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!attackGate.ok}
          title={
            attackGate.ok
              ? 'Обезоруживание: вместо одной атаки · урона нет'
              : attackGate.reason
          }
          onClick={() => {
            if (!turnEco.canAttack().ok) return
            onO03Disarm()
          }}
        >
          Обезоруживание
        </button>
      ) : null}

      {o03?.mark && onO03Mark ? (
        <button
          type="button"
          className="sheet-chip"
          title="Метка: пометить цель рукопашной атаки"
          onClick={() => onO03Mark()}
        >
          Метка
        </button>
      ) : null}

      {o03?.mark && o03.hasMarkedTarget && onO03MarkOpportunity ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!o03.markOppAvailable}
          title={
            o03.markOppAvailable
              ? 'Провоцированная по метке: преимущество, не тратит реакцию (1/ход)'
              : 'Уже использована в этот ход или реакция запрещена'
          }
          onClick={() => onO03MarkOpportunity()}
        >
          Провоцированная по метке
        </button>
      ) : null}

      {o03?.overrun && onO03Overrun ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!actionGate.ok && !bonusGate.ok}
          title="Пробегание: действие или бонусное · Атлетика vs Атлетика"
          onClick={() => onO03Overrun()}
        >
          Пробегание
        </button>
      ) : null}

      {o03?.tumble && onO03Tumble ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!actionGate.ok && !bonusGate.ok}
          title="Кувырок: действие или бонусное · Акробатика vs Акробатика"
          onClick={() => onO03Tumble()}
        >
          Кувырок
        </button>
      ) : null}

      {o03?.climbBigger && onO03ClimbBigger ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!actionGate.ok}
          title={
            actionGate.ok
              ? 'Взбирание на большее существо · действие'
              : actionGate.reason
          }
          onClick={() => {
            if (!turnEco.canFeature('action').ok) return
            onO03ClimbBigger()
          }}
        >
          Взбирание
        </button>
      ) : null}

      {o03?.identifySpell && onO03IdentifySpell ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!reactionGate.ok}
          title={
            reactionGate.ok
              ? 'Распознать заклинание: реакция · Анализ Сл 15+ур.'
              : reactionGate.reason
          }
          onClick={() => {
            if (!turnEco.canFeature('reaction').ok) return
            onO03IdentifySpell()
          }}
        >
          Распознать заклинание
        </button>
      ) : null}

      {o03?.falling && onO03Falling ? (
        <button
          type="button"
          className="sheet-chip"
          title="Калькулятор падения: 1к6 / 10 фт, макс. 20к6"
          onClick={() => onO03Falling()}
        >
          Падение
        </button>
      ) : null}

      {o03?.noLongRest && onO03NoLongRest ? (
        <button
          type="button"
          className="sheet-chip"
          title="Прошло 24 часа без длинного отдыха → спас Тел"
          onClick={() => onO03NoLongRest()}
        >
          24 ч без отдыха
        </button>
      ) : null}

      {hasBlindFighting ? (
        <button
          type="button"
          className="sheet-chip"
          title="Сражение вслепую: слепое зрение 10 фт (без карты)"
          onClick={() => {
            onToast?.(
              'Сражение вслепую: слепое зрение 10 фт — видишь в 10 фт даже ослеплённым или в темноте; невидимое — если оно не спряталось',
            )
          }}
        >
          Слепое зрение 10 фт
        </button>
      ) : null}

      {hasInterception ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!reactionGate.ok}
          title={
            reactionGate.ok
              ? 'Перехват: реакция · союзник в 5 фт получил попадание · снизить урон на 1к10+БМ'
              : reactionGate.reason
          }
          onClick={() => {
            if (!turnEco.canFeature('reaction').ok) return
            turnEco.spendFeature('reaction')
            onToast?.(
              'Перехват: реакция · снизь урон союзнику на 1к10+БМ (не ниже 0). В руках — щит или простое/воинское оружие.',
            )
          }}
        >
          Перехват
        </button>
      ) : null}

      {hasChainMaster ? (
        <>
          <button
            type="button"
            className="sheet-chip"
            disabled={!bonusGate.ok}
            title={
              bonusGate.ok
                ? 'Дар мастера цепи: бонусным приказать фамильяру действие «Атака»'
                : bonusGate.reason
            }
            onClick={() => {
              if (!turnEco.canFeature('bonus').ok) return
              turnEco.spendFeature('bonus')
              onToast?.('Дар мастера цепи: фамильяр совершает действие «Атака» (бонусное)')
            }}
          >
            Атака фамильяра
          </button>
          <button
            type="button"
            className="sheet-chip"
            disabled={!reactionGate.ok}
            title={
              reactionGate.ok
                ? 'Дар мастера цепи: реакцией дать фамильяру сопротивление к полученному урону'
                : reactionGate.reason
            }
            onClick={() => {
              if (!turnEco.canFeature('reaction').ok) return
              turnEco.spendFeature('reaction')
              onToast?.(
                'Дар мастера цепи: реакция · фамильяр получает сопротивление к этому урону',
              )
            }}
          >
            Сопр. фамильяра
          </button>
        </>
      ) : null}

      {hasTalismanRebuke ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!reactionGate.ok}
          title={
            reactionGate.ok
              ? 'Порицание талисмана: реакция · урон психической = БМ и толчок на 10 фт'
              : reactionGate.reason
          }
          onClick={() => {
            if (!turnEco.canFeature('reaction').ok) return
            turnEco.spendFeature('reaction')
            onToast?.(
              'Порицание талисмана: реакция · урон психической энергией = БМ, толчок на 10 фт от носителя',
            )
          }}
        >
          Порицание талисмана
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
