import { useTurnEconomy } from './TurnEconomyContext'
import { STEADY_AIM_HINT } from '../../shared/dnd/turnEconomy'
import { canKiFueledAttack } from '../../shared/dnd/o02TashaFeatures'
import {
  GWM_BONUS_ATTACK_HINT,
  canChargerBonus,
  canCrossbowExpertBonus,
  canGwmBonusAttack,
  canOrcishFuryBonus,
  canShieldMasterShove,
  canTavernBrawlerGrapple,
  canTelekineticShove,
  markChargerBonusUsed,
  markCrossbowExpertBonusUsed,
  markGwmBonusUsed,
  markOrcishFuryBonusUsed,
  o05TceVisible,
} from '../../shared/dnd/o05CombatFeats'

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

export type O04MasterRuleFlags = {
  cleave?: boolean
  massiveDamage?: boolean
  lingeringInjuries?: boolean
  morale?: boolean
  heroPoints?: boolean
  proficiencyDice?: boolean
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
  /** O-05: боевые черты. */
  o05?: {
    greatWeaponMaster?: boolean
    charger?: boolean
    crossbowExpert?: boolean
    holdingHandCrossbow?: boolean
    tavernBrawler?: boolean
    healer?: boolean
    hasHealerKit?: boolean
    grappler?: boolean
    shieldMaster?: boolean
    shieldInHand?: boolean
    telekinetic?: boolean
    orcishFury?: boolean
    tceAllowed?: boolean
  }
  onO05GwmBonus?: () => void
  onO05ChargerAttack?: () => void
  onO05ChargerShove?: () => void
  onO05CrossbowBonus?: () => void
  onO05TavernGrapple?: () => void
  onO05HealerStabilize?: () => void
  onO05HealerHeal?: () => void
  onO05GrapplerPin?: () => void
  onO05ShieldShove?: () => void
  onO05Telekinetic?: () => void
  onO05OrcishFury?: () => void
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
  /** O-04: флаги и кнопки. */
  o04?: O04MasterRuleFlags
  onO04LingeringInjury?: () => void
  onO04Morale?: () => void
  onO04HeroPoints?: () => void
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
  o05,
  onO05GwmBonus,
  onO05ChargerAttack,
  onO05ChargerShove,
  onO05CrossbowBonus,
  onO05TavernGrapple,
  onO05HealerStabilize,
  onO05HealerHeal,
  onO05GrapplerPin,
  onO05ShieldShove,
  onO05Telekinetic,
  onO05OrcishFury,
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
  o04,
  onO04LingeringInjury,
  onO04Morale,
  onO04HeroPoints,
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

  const te = turnEco.turnEconomy
  const tceOn = o05TceVisible(o05?.tceAllowed)
  const gwmGate = o05?.greatWeaponMaster
    ? canGwmBonusAttack(te, true)
    : { ok: false as const, reason: '', mark: 'bonus' as const }
  const chargerGate = o05?.charger
    ? canChargerBonus(te, true)
    : { ok: false as const, reason: '', mark: 'bonus' as const }
  const xbowGate = o05?.crossbowExpert
    ? canCrossbowExpertBonus(te, {
        hasFeat: true,
        holdingHandCrossbow: Boolean(o05.holdingHandCrossbow),
      })
    : { ok: false as const, reason: '', mark: 'bonus' as const }
  const tavernGate = o05?.tavernBrawler
    ? canTavernBrawlerGrapple(te, true)
    : { ok: false as const, reason: '', mark: 'bonus' as const }
  const shieldGate = o05?.shieldMaster
    ? canShieldMasterShove(te, {
        hasFeat: true,
        shieldInHand: Boolean(o05.shieldInHand),
      })
    : { ok: false as const, reason: '', mark: 'bonus' as const }
  const teleGate =
    tceOn && o05?.telekinetic
      ? canTelekineticShove(te, true)
      : { ok: false as const, reason: '', mark: 'bonus' as const }
  const orcGate =
    tceOn && o05?.orcishFury
      ? canOrcishFuryBonus(te, true)
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

      {o04?.lingeringInjuries && onO04LingeringInjury ? (
        <button
          type="button"
          className="sheet-chip"
          title="Ручной бросок по таблице незаживающих ран DMG"
          onClick={() => onO04LingeringInjury()}
        >
          Бросок раны
        </button>
      ) : null}

      {o04?.morale && onO04Morale ? (
        <button
          type="button"
          className="sheet-chip"
          title="Проверка морали врагов (спас Мудрости Сл 10)"
          onClick={() => onO04Morale()}
        >
          Проверка морали
        </button>
      ) : null}

      {o04?.heroPoints && onO04HeroPoints ? (
        <button
          type="button"
          className="sheet-chip"
          title="Потратить очко героя (+1к6 к d20 или стабилизация)"
          onClick={() => onO04HeroPoints()}
        >
          Очко героя
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

      {o05?.greatWeaponMaster && onO05GwmBonus ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!gwmGate.ok}
          title={gwmGate.ok ? GWM_BONUS_ATTACK_HINT : gwmGate.reason}
          onClick={() => {
            if (!canGwmBonusAttack(turnEco.turnEconomy, true).ok) return
            turnEco.patchTurnEconomy(markGwmBonusUsed)
            onO05GwmBonus()
            onToast?.('Мастер большого оружия: бонусная рукопашная атака оружием')
          }}
        >
          Атака Мастера большого оружия
        </button>
      ) : null}

      {o05?.charger ? (
        <div className="chip-row" role="group" aria-label="Налётчик">
          <span className="sheet-chip is-stub" title="Налётчик">
            Налётчик
          </span>
          {onO05ChargerAttack ? (
            <button
              type="button"
              className="sheet-chip"
              disabled={!chargerGate.ok}
              title={
                chargerGate.ok
                  ? 'Бонусная рукопашная атака оружием · +5 к урону при попадании'
                  : chargerGate.reason
              }
              onClick={() => {
                if (!canChargerBonus(turnEco.turnEconomy, true).ok) return
                turnEco.patchTurnEconomy((s) => {
                  const next = markChargerBonusUsed(s)
                  return { ...next, bonus: true }
                })
                onO05ChargerAttack()
                onToast?.('Налётчик: бонусная атака · +5 к урону при попадании')
              }}
            >
              Удар (+5)
            </button>
          ) : null}
          {onO05ChargerShove ? (
            <button
              type="button"
              className="sheet-chip"
              disabled={!chargerGate.ok}
              title={
                chargerGate.ok
                  ? 'Бонусный толчок (состязание Атлетики)'
                  : chargerGate.reason
              }
              onClick={() => {
                if (!canChargerBonus(turnEco.turnEconomy, true).ok) return
                onO05ChargerShove()
              }}
            >
              Толчок
            </button>
          ) : null}
        </div>
      ) : null}

      {o05?.crossbowExpert && onO05CrossbowBonus ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!xbowGate.ok}
          title={
            xbowGate.ok
              ? 'Эксперт в арбалетах: бонусная атака ручным арбалетом'
              : xbowGate.reason
          }
          onClick={() => {
            if (
              !canCrossbowExpertBonus(turnEco.turnEconomy, {
                hasFeat: true,
                holdingHandCrossbow: Boolean(o05.holdingHandCrossbow),
              }).ok
            ) {
              return
            }
            turnEco.patchTurnEconomy((s) => {
              const next = markCrossbowExpertBonusUsed(s)
              return { ...next, bonus: true }
            })
            onO05CrossbowBonus()
            onToast?.('Эксперт в арбалетах: бонусная атака ручным арбалетом')
          }}
        >
          Выстрел ручным арбалетом
        </button>
      ) : null}

      {o05?.tavernBrawler && onO05TavernGrapple ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!tavernGate.ok}
          title={
            tavernGate.ok
              ? 'Драчун: бонусным попытка захвата после безоружной/импровизированной'
              : tavernGate.reason
          }
          onClick={() => {
            if (!canTavernBrawlerGrapple(turnEco.turnEconomy, true).ok) return
            onO05TavernGrapple()
          }}
        >
          Захват (Драчун)
        </button>
      ) : null}

      {o05?.healer && o05.hasHealerKit ? (
        <div className="chip-row" role="group" aria-label="Целитель">
          <span className="sheet-chip is-stub" title="Целитель · набор целителя">
            Целитель
          </span>
          {onO05HealerStabilize ? (
            <button
              type="button"
              className="sheet-chip"
              disabled={!actionGate.ok}
              title={
                actionGate.ok
                  ? 'Действием стабилизировать (успех без Медицины) · 1 использование набора'
                  : actionGate.reason
              }
              onClick={() => {
                if (!turnEco.canFeature('action').ok) return
                onO05HealerStabilize()
              }}
            >
              Стабилизировать
            </button>
          ) : null}
          {onO05HealerHeal ? (
            <button
              type="button"
              className="sheet-chip"
              disabled={!actionGate.ok}
              title={
                actionGate.ok
                  ? 'Действием 1к6+4+кости хитов · 1 использование · 1 цель до отдыха'
                  : actionGate.reason
              }
              onClick={() => {
                if (!turnEco.canFeature('action').ok) return
                onO05HealerHeal()
              }}
            >
              Лечить
            </button>
          ) : null}
        </div>
      ) : null}

      {o05?.grappler && onO05GrapplerPin ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!actionGate.ok}
          title={
            actionGate.ok
              ? 'Борец: действием опрокинуть схваченного (состязание Атлетики)'
              : actionGate.reason
          }
          onClick={() => {
            if (!turnEco.canFeature('action').ok) return
            onO05GrapplerPin()
          }}
        >
          Опрокинуть схваченного
        </button>
      ) : null}

      {o05?.shieldMaster && onO05ShieldShove ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!shieldGate.ok}
          title={
            shieldGate.ok
              ? 'Мастер щита: бонусный толчок щитом после действия «Атака»'
              : shieldGate.reason
          }
          onClick={() => {
            if (
              !canShieldMasterShove(turnEco.turnEconomy, {
                hasFeat: true,
                shieldInHand: Boolean(o05.shieldInHand),
              }).ok
            ) {
              return
            }
            onO05ShieldShove()
          }}
        >
          Толчок щитом
        </button>
      ) : null}

      {tceOn && o05?.telekinetic && onO05Telekinetic ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!teleGate.ok}
          title={
            teleGate.ok
              ? 'Телекинез: бонусным толкнуть существо в 30 фт (состязание хар-ки)'
              : teleGate.reason
          }
          onClick={() => {
            if (!canTelekineticShove(turnEco.turnEconomy, true).ok) return
            onO05Telekinetic()
          }}
        >
          Толчок (Телекинез)
        </button>
      ) : null}

      {tceOn && o05?.orcishFury && onO05OrcishFury ? (
        <button
          type="button"
          className="sheet-chip"
          disabled={!orcGate.ok}
          title={
            orcGate.ok
              ? 'Орочья ярость: бонусная атака тем же оружием после попадания'
              : orcGate.reason
          }
          onClick={() => {
            if (!canOrcishFuryBonus(turnEco.turnEconomy, true).ok) return
            turnEco.patchTurnEconomy((s) => {
              const next = markOrcishFuryBonusUsed(s)
              return { ...next, bonus: true }
            })
            onO05OrcishFury()
            onToast?.('Орочья ярость: бонусная атака тем же оружием')
          }}
        >
          Атака Орочьей ярости
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
