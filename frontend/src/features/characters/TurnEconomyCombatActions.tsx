import { useState, type ReactNode } from 'react'
import { useTurnEconomy } from './TurnEconomyContext'
import {
  STEADY_AIM_HINT,
  TURN_MARK_LABELS,
  markClearBlocked,
  movementClearBlocked,
  type TurnEconomyMarkKey,
} from '../../shared/dnd/turnEconomy'
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
import {
  DEVILS_SIGHT_HINT,
  PROTECTION_REACTION_HINT,
  TWO_WEAPON_BONUS_HINT,
  canProtectionReaction,
} from '../../shared/dnd/o06StylesBreathInvocations'
import {
  MAGE_SLAYER_ATTACK_HINT,
  OPPORTUNITY_ATTACK_HINT,
  PARRY_HINT,
  POLEARM_BONUS_HINT,
  RIPOSTE_HINT,
  SENTINEL_ATTACK_HINT,
  canMageSlayerAttack,
  canParryReaction,
  canPolearmBonusAttack,
  canRiposteReaction,
  canSentinelAttack,
} from '../../shared/dnd/o07Reactions'
import {
  DASH_ACTION_HINT,
  DISENGAGE_ACTION_HINT,
  DODGE_ACTION_HINT,
  HELP_ACTION_HINT,
  READY_ACTION_HINT,
  applyDashAction,
  applyDisengageAction,
  canDashAction,
  canDisengageAction,
  canDodgeAction,
  canHelpAction,
  canReadyAction,
  canTriggerReady,
  isIncapacitatedLike,
} from '../../shared/dnd/o08ActionsCoverConditions'
import {
  clearReadyPrepared,
  markDashed,
  markDisengagedThisTurn,
} from '../../shared/dnd/turnEconomy'
import type { ConditionRef } from '../../shared/dnd/conditions'
import {
  TURN_GROUP_EMPTY_HINT,
  TURN_GROUP_LABELS,
  type TurnActionGroupId,
} from './turnActionGroups'

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
  /** B-05: Увёртливость (плут/охотник) — реакция. */
  hasUncannyDodge?: boolean
  /** O-01: Перехват (TCE fighting style). */
  hasInterception?: boolean
  /** O-01: Сражение вслепую — пометка слепого зрения. */
  hasBlindFighting?: boolean
  /** O-01: Дар мастера цепи — бонусная атака фамильяра / реакция. */
  hasChainMaster?: boolean
  /** O-01: Порицание талисмана — реакция. */
  hasTalismanRebuke?: boolean
  /** O-06: стиль «Защита». */
  hasProtectionStyle?: boolean
  shieldInHandForProtection?: boolean
  /** O-06: бонусная атака вторым оружием (доступна и без стиля). */
  showTwoWeaponBonus?: boolean
  twoWeaponBonusGate?: { ok: boolean; reason?: string }
  onTwoWeaponBonus?: () => void
  /** O-06: Дьявольское зрение. */
  hasDevilsSight?: boolean
  /** O-06: оружие дыхания / FTD 5 ур. */
  o06Breath?: {
    label: string
    hint: string
    disabled?: boolean
    disabledReason?: string
    onClick: () => void
  } | null
  o06FtdExtra?: Array<{
    label: string
    hint: string
    disabled?: boolean
    disabledReason?: string
    onClick: () => void
  }>
  /** O-07: реакции и древковое. */
  o07?: {
    hasSentinel?: boolean
    hasPolearmMaster?: boolean
    hasMageSlayer?: boolean
    hasWarCaster?: boolean
    holdingPolearmOa?: boolean
    holdingPolearmBonus?: boolean
    knowsParry?: boolean
    knowsRiposte?: boolean
    hasSuperiorityDie?: boolean
    reactionSpells?: Array<{
      id: string
      name: string
      kind: string
      hint: string
      disabled?: boolean
      disabledReason?: string
    }>
  }
  onO07OpportunityAttack?: () => void
  onO07SentinelAttack?: () => void
  onO07MageSlayerAttack?: () => void
  onO07Riposte?: () => void
  onO07ParryHint?: () => void
  onO07PolearmBonus?: () => void
  onO07CastReactionSpell?: (spellId: string) => void
  onO07CastReactionGeneric?: () => void
  onO07Counterspell?: () => void
  /** O-08: PHB действия хода. */
  playConditions?: ConditionRef[] | null
  onO08Dodge?: () => void
  onO08Help?: () => void
  onO08Ready?: () => void
  onO08ReadyTrigger?: () => void
  /** O-09: Medicine DC 10 stabilize (action). */
  onO09Stabilize?: () => void
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
  /** GWM: mark a melee kill this turn (enables bonus attack) — not an action spend. */
  onO05GwmFinishing?: () => void
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
  /** CMB-04: fighter «Второе дыхание» in Бонусное (same pool as resource counter). */
  secondWind?: {
    remaining: number
    max: number
    onSpend: () => void
  } | null
  /** CMB-04: fighter «Всплеск действий» in Действие as +1 действие. */
  actionSurge?: {
    remaining: number
    max: number
    onSpend: () => void
  } | null
  /**
   * FIX-01: character features/spells for this action type — shown first in the
   * expanded panel (before common PHB actions). Timing from feature.kind /
   * casting_time.
   */
  personalFeatures?: Array<{
    id: string
    nameRu: string
    summaryRu: string
    group: TurnActionGroupId
    remaining?: number | null
    max?: number | null
    disabled?: boolean
    disabledReason?: string
    onUse: () => void
  }>
  personalSpells?: Array<{
    id: string
    name: string
    group: TurnActionGroupId
    disabled?: boolean
    disabledReason?: string
    onUse: () => void
  }>
  className?: string
  /**
   * CMB-02: grouped UI is the only face. Legacy modes kept for call-site compat:
   * `everyTurn` alone returns null (chips live inside groups).
   * `more` / `all` — full grouped Действие · Бонусное · Реакция.
   */
  mode?: 'all' | 'more' | 'everyTurn'
}

/**
 * T-02 Э9 / L-20 / O-01: «Поиск», «Хитрое действие», «Точное прицеливание»,
 * «Захват / Толчок», Перехват и кнопки воззваний TCE.
 */
export function TurnEconomyCombatActions({
  hasCunningAction,
  hasSteadyAim = false,
  hasKiFueledAttack = false,
  hasUncannyDodge = false,
  hasInterception = false,
  hasBlindFighting = false,
  hasChainMaster = false,
  hasTalismanRebuke = false,
  hasProtectionStyle = false,
  shieldInHandForProtection = false,
  showTwoWeaponBonus = false,
  twoWeaponBonusGate,
  onTwoWeaponBonus,
  hasDevilsSight = false,
  o06Breath = null,
  o06FtdExtra = [],
  o07,
  onO07OpportunityAttack,
  onO07SentinelAttack,
  onO07MageSlayerAttack,
  onO07Riposte,
  onO07ParryHint,
  onO07PolearmBonus,
  onO07CastReactionSpell,
  onO07CastReactionGeneric,
  onO07Counterspell,
  playConditions = null,
  onO08Dodge,
  onO08Help,
  onO08Ready,
  onO08ReadyTrigger,
  onO09Stabilize,
  onGrappleShove,
  o05,
  onO05GwmBonus,
  onO05GwmFinishing,
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
  secondWind = null,
  actionSurge = null,
  personalFeatures = [],
  personalSpells = [],
  className = '',
  mode = 'all',
}: Props) {
  const turnEco = useTurnEconomy()
  if (!turnEco) return null

  const incapEarly = isIncapacitatedLike(playConditions)
  const searchGate = incapEarly.blocked
    ? { ok: false as const, reason: incapEarly.reason, mark: 'action' as const }
    : turnEco.canSearch()
  const hideGate = incapEarly.blocked
    ? { ok: false as const, reason: incapEarly.reason, mark: 'action' as const }
    : turnEco.canHide(hasCunningAction)
  const steadyGate = hasSteadyAim ? turnEco.canSteadyAim() : { ok: false as const, reason: '', mark: 'bonus' as const }
  const cunningGate = incapEarly.blocked
    ? { ok: false as const, reason: incapEarly.reason, mark: 'bonus' as const }
    : hasCunningAction
      ? turnEco.canCunningBonus()
      : { ok: false as const, reason: '', mark: 'bonus' as const }
  const attackGate = incapEarly.blocked
    ? { ok: false as const, reason: incapEarly.reason, mark: 'action' as const }
    : turnEco.canAttack()
  const actionGate = incapEarly.blocked
    ? { ok: false as const, reason: incapEarly.reason, mark: 'action' as const }
    : turnEco.canFeature('action')
  const reactionGate = incapEarly.blocked
    ? { ok: false as const, reason: incapEarly.reason, mark: 'reaction' as const }
    : turnEco.canFeature('reaction')
  const bonusGate = incapEarly.blocked
    ? { ok: false as const, reason: incapEarly.reason, mark: 'bonus' as const }
    : turnEco.canFeature('bonus')
  const kiFueledGate = hasKiFueledAttack
    ? canKiFueledAttack(turnEco.turnEconomy)
    : { ok: false as const, reason: '', mark: 'bonus' as const }

  const te = turnEco.turnEconomy
  const dashGate = incapEarly.blocked
    ? { ok: false as const, reason: incapEarly.reason, mark: 'action' as const }
    : canDashAction(te)
  const disengageGate = incapEarly.blocked
    ? { ok: false as const, reason: incapEarly.reason, mark: 'action' as const }
    : canDisengageAction(te)
  const dodgeGate = incapEarly.blocked
    ? { ok: false as const, reason: incapEarly.reason, mark: 'action' as const }
    : canDodgeAction(te)
  const helpGate = incapEarly.blocked
    ? { ok: false as const, reason: incapEarly.reason, mark: 'action' as const }
    : canHelpAction(te)
  const readyGate = incapEarly.blocked
    ? { ok: false as const, reason: incapEarly.reason, mark: 'action' as const }
    : canReadyAction(te)
  const readyFireGate = canTriggerReady(te, {
    prepared: te.readyPrepared,
    trigger: te.readyTrigger,
    kind: te.readyKind,
    spellId: te.readySpellId,
    spellName: te.readySpellName,
    spellLevel: te.readySpellLevel,
  })
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


  const [openGroup, setOpenGroup] = useState<TurnActionGroupId | null>(null)

  if (mode === 'everyTurn') {
    // CMB-02: everyTurn row removed — chips live inside groups.
    return null
  }

  const teState = turnEco.turnEconomy
  const actionSpent = teState.action
  const bonusSpent = teState.bonus
  const reactionSpent = teState.reaction
  const markSpent = (group: TurnActionGroupId) =>
    group === 'action' ? actionSpent : group === 'bonus' ? bonusSpent : reactionSpent

  const toggleGroup = (group: TurnActionGroupId) => {
    setOpenGroup((prev) => (prev === group ? null : group))
  }

  type Chip = {
    key: string
    tier: 'personal' | 'common' | 'more' | 'info'
    groups: TurnActionGroupId[]
    node: ReactNode
  }

  const chips: Chip[] = []

  const push = (
    key: string,
    groups: TurnActionGroupId[],
    tier: Chip['tier'],
    node: ReactNode,
  ) => {
    if (!node) return
    chips.push({ key, groups, tier, node })
  }

  // —— FIX-01: PHB «Атака» / «Заклинание» + character features/spells first ——
  push(
    'attack_action',
    ['action'],
    'personal',
    <button
      key="attack_action"
      type="button"
      className={`sheet-chip${actionSpent ? ' is-spent' : ''}`}
      disabled={!attackGate.ok}
      title={
        attackGate.ok
          ? 'Действие «Атака» · отметь ход и бросай оружие ниже'
          : attackGate.reason
      }
      onClick={() => {
        if (!turnEco.canAttack().ok) return
        turnEco.spendAttack()
        onToast?.('Атака: действие · бросок оружия ниже')
      }}
    >
      {actionSpent ? (
        <span className="sheet-chip__check" aria-hidden>
          ✓
        </span>
      ) : null}
      Атака
    </button>,
  )
  push(
    'cast_spell_action',
    ['action'],
    'personal',
    <button
      key="cast_spell_action"
      type="button"
      className={`sheet-chip${actionSpent ? ' is-spent' : ''}`}
      disabled={!actionGate.ok}
      title={
        actionGate.ok
          ? 'Действие «Заклинание» · кастуй из колонки «Заклинания»'
          : actionGate.reason
      }
      onClick={() => {
        if (!turnEco.canFeature('action').ok) return
        turnEco.spendFeature('action')
        onToast?.('Заклинание: действие · кастуй из колонки «Заклинания»')
      }}
    >
      {actionSpent ? (
        <span className="sheet-chip__check" aria-hidden>
          ✓
        </span>
      ) : null}
      Заклинание
    </button>,
  )

  for (const feat of personalFeatures) {
    const spent = markSpent(feat.group)
    const empty =
      typeof feat.remaining === 'number' &&
      typeof feat.max === 'number' &&
      feat.max > 0 &&
      feat.remaining <= 0
    const blocked = Boolean(feat.disabled) || empty || spent
    push(
      `feat:${feat.id}`,
      [feat.group],
      'personal',
      <button
        key={`feat:${feat.id}`}
        type="button"
        className={`sheet-chip${spent || empty ? ' is-spent' : ''}`}
        disabled={blocked}
        title={
          empty
            ? `${feat.nameRu}: нет использований`
            : feat.disabled
              ? feat.disabledReason || feat.summaryRu
              : spent
                ? `${feat.nameRu}: отметка «${TURN_GROUP_LABELS[feat.group]}» уже стоит`
                : feat.summaryRu || feat.nameRu
        }
        onClick={() => {
          if (blocked) return
          feat.onUse()
        }}
      >
        {spent || empty ? (
          <span className="sheet-chip__check" aria-hidden>
            ✓
          </span>
        ) : null}
        {feat.nameRu}
        {typeof feat.remaining === 'number' && typeof feat.max === 'number' && feat.max > 0 ? (
          <span className="play-desk-turn-actions__charges" aria-hidden>
            {feat.remaining}/{feat.max}
          </span>
        ) : null}
      </button>,
    )
  }

  for (const sp of personalSpells) {
    const spent = markSpent(sp.group)
    const blocked = Boolean(sp.disabled) || spent
    push(
      `spell:${sp.id}`,
      [sp.group],
      'personal',
      <button
        key={`spell:${sp.id}`}
        type="button"
        className={`sheet-chip${spent ? ' is-spent' : ''}`}
        disabled={blocked}
        title={
          sp.disabled
            ? sp.disabledReason || sp.name
            : spent
              ? `${sp.name}: отметка «${TURN_GROUP_LABELS[sp.group]}» уже стоит`
              : `Заклинание «${sp.name}» · ${TURN_GROUP_LABELS[sp.group]}`
        }
        onClick={() => {
          if (blocked) return
          sp.onUse()
        }}
      >
        {spent ? (
          <span className="sheet-chip__check" aria-hidden>
            ✓
          </span>
        ) : null}
        {sp.name}
      </button>,
    )
  }

  // —— Bonus only: Cunning Action (PHB bonus; common Dash/Disengage/Hide stay in Действие) ——
  if (hasCunningAction) {
    const cunningSpent = Boolean(teState.bonus)
    push(
      'cunning_hide',
      ['bonus'],
      'personal',
      <button
        key="cunning_hide"
        type="button"
        className={`sheet-chip${cunningSpent && !hideGate.ok ? ' is-spent' : ''}`}
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
        {cunningSpent && !hideGate.ok ? (
          <span className="sheet-chip__check" aria-hidden>
            ✓
          </span>
        ) : null}
        Хитрое действие: Засада
      </button>,
    )
    push(
      'cunning_disengage',
      ['bonus'],
      'personal',
      <button
        key="cunning_disengage"
        type="button"
        className={`sheet-chip${cunningSpent && !cunningGate.ok ? ' is-spent' : ''}`}
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
        {cunningSpent && !cunningGate.ok ? (
          <span className="sheet-chip__check" aria-hidden>
            ✓
          </span>
        ) : null}
        Хитрое действие: Отход
      </button>,
    )
    push(
      'cunning_dash',
      ['bonus'],
      'personal',
      <button
        key="cunning_dash"
        type="button"
        className={`sheet-chip${cunningSpent && !cunningGate.ok ? ' is-spent' : ''}`}
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
        {cunningSpent && !cunningGate.ok ? (
          <span className="sheet-chip__check" aria-hidden>
            ✓
          </span>
        ) : null}
        Хитрое действие: Рывок
      </button>,
    )
  }

  if (hasSteadyAim) {
    push(
      'steady_aim',
      ['bonus'],
      'personal',
      <button
        key="steady_aim"
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
      </button>,
    )
  }

  if (showTwoWeaponBonus && onTwoWeaponBonus && twoWeaponBonusGate?.ok) {
    push(
      'two_weapon',
      ['bonus'],
      'personal',
      <button
        key="two_weapon"
        type="button"
        className="sheet-chip"
        title={TWO_WEAPON_BONUS_HINT}
        onClick={() => onTwoWeaponBonus()}
      >
        Атака вторым оружием
      </button>,
    )
  }

  if (hasKiFueledAttack) {
    push(
      'ki_fueled',
      ['bonus'],
      'personal',
      <button
        key="ki_fueled"
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
          onToast?.('Атака на ци: бонусная безоружная атака или атака оружием монаха')
        }}
      >
        Атака на ци
      </button>,
    )
  }

  // —— Fighter: Second Wind (bonus) / Action Surge (action, not bonus) ——
  if (secondWind) {
    const empty = secondWind.remaining <= 0
    const disabled = empty || !bonusGate.ok
    push(
      'second_wind',
      ['bonus'],
      'personal',
      <button
        key="second_wind"
        type="button"
        className={`sheet-chip${empty ? ' is-spent' : ''}`}
        disabled={disabled}
        title={
          empty
            ? 'Второе дыхание: нет зарядов до короткого или продолжительного отдыха'
            : bonusGate.ok
              ? `Второе дыхание: бонусное · 1к10+ур. воина · осталось ${secondWind.remaining}/${secondWind.max}`
              : bonusGate.reason
        }
        onClick={() => {
          if (secondWind.remaining <= 0) return
          if (!turnEco.canFeature('bonus').ok) return
          secondWind.onSpend()
        }}
      >
        {empty ? (
          <span className="sheet-chip__check" aria-hidden>
            ✓
          </span>
        ) : null}
        Второе дыхание
        {secondWind.max > 0 ? (
          <span className="play-desk-turn-actions__charges" aria-hidden>
            {secondWind.remaining}/{secondWind.max}
          </span>
        ) : null}
      </button>,
    )
  }

  if (actionSurge) {
    const empty = actionSurge.remaining <= 0
    push(
      'action_surge',
      ['action'],
      'personal',
      <button
        key="action_surge"
        type="button"
        className={`sheet-chip${empty ? ' is-spent' : ''}`}
        disabled={empty}
        title={
          empty
            ? 'Всплеск действий: нет зарядов до короткого или продолжительного отдыха'
            : `+1 действие (Всплеск) · само умение отметку хода не тратит · осталось ${actionSurge.remaining}/${actionSurge.max}`
        }
        onClick={() => {
          if (actionSurge.remaining <= 0) return
          actionSurge.onSpend()
        }}
      >
        {empty ? (
          <span className="sheet-chip__check" aria-hidden>
            ✓
          </span>
        ) : null}
        +1 действие (Всплеск)
        {actionSurge.max > 0 ? (
          <span className="play-desk-turn-actions__charges" aria-hidden>
            {actionSurge.remaining}/{actionSurge.max}
          </span>
        ) : null}
      </button>,
    )
  }

  // —— Common actions ——
  push(
    'search',
    ['action'],
    'common',
    <button
      key="search"
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
    </button>,
  )

  if (!hasCunningAction) {
    push(
      'hide',
      ['action'],
      'common',
      <button
        key="hide"
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
      </button>,
    )
  }

  push(
    'dash',
    ['action'],
    'common',
    <button
      key="dash"
      type="button"
      className="sheet-chip"
      disabled={!dashGate.ok}
      title={dashGate.ok ? DASH_ACTION_HINT : dashGate.reason}
      onClick={() => {
        if (!canDashAction(turnEco.turnEconomy).ok) return
        turnEco.patchTurnEconomy((s) => applyDashAction(s))
        onToast?.('Рывок (действие)')
      }}
    >
      Рывок
    </button>,
  )
  push(
    'disengage',
    ['action'],
    'common',
    <button
      key="disengage"
      type="button"
      className="sheet-chip"
      disabled={!disengageGate.ok}
      title={disengageGate.ok ? DISENGAGE_ACTION_HINT : disengageGate.reason}
      onClick={() => {
        if (!canDisengageAction(turnEco.turnEconomy).ok) return
        turnEco.patchTurnEconomy((s) => applyDisengageAction(s))
        onToast?.('Отход')
      }}
    >
      Отход
    </button>,
  )
  push(
    'dodge',
    ['action'],
    'common',
    <button
      key="dodge"
      type="button"
      className="sheet-chip"
      disabled={!dodgeGate.ok}
      title={dodgeGate.ok ? DODGE_ACTION_HINT : dodgeGate.reason}
      onClick={() => {
        if (!canDodgeAction(turnEco.turnEconomy).ok) return
        if (onO08Dodge) {
          onO08Dodge()
          return
        }
        turnEco.spendFeature('action')
        onToast?.('Уклонение')
      }}
    >
      Уклонение
    </button>,
  )
  if (onO08Help) {
    push(
      'help',
      ['action'],
      'common',
      <button
        key="help"
        type="button"
        className="sheet-chip"
        disabled={!helpGate.ok}
        title={helpGate.ok ? HELP_ACTION_HINT : helpGate.reason}
        onClick={() => {
          if (!canHelpAction(turnEco.turnEconomy).ok) return
          onO08Help()
        }}
      >
        Помощь
      </button>,
    )
  }
  if (onO08Ready) {
    push(
      'ready',
      ['action'],
      'common',
      <button
        key="ready"
        type="button"
        className="sheet-chip"
        disabled={!readyGate.ok}
        title={readyGate.ok ? READY_ACTION_HINT : readyGate.reason}
        onClick={() => {
          if (!canReadyAction(turnEco.turnEconomy).ok) return
          onO08Ready()
        }}
      >
        Подготовка
      </button>,
    )
  }
  if (onO09Stabilize) {
    push(
      'stabilize',
      ['action'],
      'common',
      <button
        key="stabilize"
        type="button"
        className="sheet-chip"
        disabled={!actionGate.ok}
        title={
          actionGate.ok
            ? 'Стабилизировать: действие · Медицина Сл 10 · успех — цель стабильна при 0 хитах'
            : actionGate.reason
        }
        onClick={() => {
          if (!actionGate.ok) return
          onO09Stabilize()
        }}
      >
        Стабилизировать
      </button>,
    )
  }
  if (onGrappleShove) {
    push(
      'grapple_shove',
      ['action'],
      'common',
      <button
        key="grapple_shove"
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
      </button>,
    )
  }
  if (o03?.disarm && onO03Disarm) {
    push(
      'disarm',
      ['action'],
      'common',
      <button
        key="disarm"
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
      </button>,
    )
  }

  if (te.readyPrepared) {
    push(
      'ready_fire',
      ['reaction'],
      'common',
      <button
        key="ready_fire"
        type="button"
        className="sheet-chip is-on"
        disabled={!readyFireGate.ok}
        title={
          readyFireGate.ok
            ? `Сработало: ${te.readyTrigger || 'триггер'} → ${te.readyKind || 'действие'} · реакция`
            : readyFireGate.reason
        }
        onClick={() => {
          if (!readyFireGate.ok) return
          if (onO08ReadyTrigger) {
            onO08ReadyTrigger()
            return
          }
          turnEco.spendFeature('reaction')
          turnEco.patchTurnEconomy((s) => {
            let next = clearReadyPrepared(s)
            if (te.readyKind === 'dash') next = markDashed(next)
            if (te.readyKind === 'disengage') next = markDisengagedThisTurn(next)
            return next
          })
          onToast?.(
            `Подготовка сработала: ${te.readyKind || 'действие'}${
              te.readyTrigger ? ` · ${te.readyTrigger}` : ''
            }`,
          )
        }}
      >
        Сработало
      </button>,
    )
  }

  // —— Reactions common ——
  if (onO07OpportunityAttack) {
    push(
      'opportunity',
      ['reaction'],
      'common',
      <button
        key="opportunity"
        type="button"
        className="sheet-chip"
        disabled={!reactionGate.ok}
        title={reactionGate.ok ? OPPORTUNITY_ATTACK_HINT : reactionGate.reason}
        onClick={() => onO07OpportunityAttack()}
      >
        Атака по возможности
      </button>,
    )
  }

  // —— Personal reactions / bonus / action from feats ——
  if (o07?.hasSentinel && onO07SentinelAttack) {
    const gate = canSentinelAttack(turnEco.turnEconomy, true)
    push(
      'sentinel',
      ['reaction'],
      'personal',
      <button
        key="sentinel"
        type="button"
        className="sheet-chip"
        disabled={!gate.ok}
        title={gate.ok ? SENTINEL_ATTACK_HINT : gate.reason}
        onClick={() => onO07SentinelAttack()}
      >
        Страж: атака
      </button>,
    )
  }
  if (o07?.hasMageSlayer && onO07MageSlayerAttack) {
    const gate = canMageSlayerAttack(turnEco.turnEconomy, true)
    push(
      'mage_slayer',
      ['reaction'],
      'personal',
      <button
        key="mage_slayer"
        type="button"
        className="sheet-chip"
        disabled={!gate.ok}
        title={gate.ok ? MAGE_SLAYER_ATTACK_HINT : gate.reason}
        onClick={() => onO07MageSlayerAttack()}
      >
        Убийца магов
      </button>,
    )
  }
  if (o07?.knowsRiposte && onO07Riposte) {
    const gate = canRiposteReaction(turnEco.turnEconomy, {
      knowsRiposte: true,
      hasSuperiorityDie: Boolean(o07.hasSuperiorityDie),
    })
    push(
      'riposte',
      ['reaction'],
      'personal',
      <button
        key="riposte"
        type="button"
        className="sheet-chip"
        disabled={!gate.ok}
        title={gate.ok ? RIPOSTE_HINT : gate.reason}
        onClick={() => onO07Riposte()}
      >
        Ответный удар
      </button>,
    )
  }
  if (o07?.knowsParry && onO07ParryHint) {
    const gate = canParryReaction(turnEco.turnEconomy, {
      knowsParry: true,
      hasSuperiorityDie: Boolean(o07.hasSuperiorityDie),
    })
    push(
      'parry',
      ['reaction'],
      'personal',
      <button
        key="parry"
        type="button"
        className="sheet-chip"
        disabled={!gate.ok}
        title={gate.ok ? `${PARRY_HINT} · предложит pad хитов при уроне` : gate.reason}
        onClick={() => onO07ParryHint()}
      >
        Парирование
      </button>,
    )
  }
  if (o07?.hasPolearmMaster && onO07PolearmBonus) {
    const gate = canPolearmBonusAttack(turnEco.turnEconomy, {
      hasPolearmMaster: true,
      holdingPolearm: Boolean(o07.holdingPolearmBonus),
    })
    push(
      'polearm_bonus',
      ['bonus'],
      'personal',
      <button
        key="polearm_bonus"
        type="button"
        className="sheet-chip"
        disabled={!gate.ok}
        title={gate.ok ? POLEARM_BONUS_HINT : gate.reason}
        onClick={() => onO07PolearmBonus()}
      >
        Конец древка (к4)
      </button>,
    )
  }

  for (const row of o07?.reactionSpells ?? []) {
    if (row.kind === 'counterspell' && onO07Counterspell) {
      push(
        `react_spell_${row.id}`,
        ['reaction'],
        'common',
        <button
          key={`react_spell_${row.id}`}
          type="button"
          className="sheet-chip"
          disabled={Boolean(row.disabled) || !reactionGate.ok}
          title={
            row.disabled
              ? row.disabledReason || row.hint
              : reactionGate.ok
                ? `${row.name}: ${row.hint}`
                : reactionGate.reason
          }
          onClick={() => onO07Counterspell()}
        >
          {row.name}
        </button>,
      )
    } else {
      push(
        `react_spell_${row.id}`,
        ['reaction'],
        'common',
        <button
          key={`react_spell_${row.id}`}
          type="button"
          className="sheet-chip"
          disabled={Boolean(row.disabled) || !reactionGate.ok}
          title={
            row.disabled
              ? row.disabledReason || row.hint
              : reactionGate.ok
                ? `${row.name}: ${row.hint}`
                : reactionGate.reason
          }
          onClick={() => onO07CastReactionSpell?.(row.id)}
        >
          {row.name}
        </button>,
      )
    }
  }
  if (
    onO07CastReactionGeneric &&
    ((o07?.reactionSpells?.length ?? 0) > 0 ||
      o07?.reactionSpells?.some((r) => r.kind === 'other'))
  ) {
    push(
      'cast_reaction',
      ['reaction'],
      'common',
      <button
        key="cast_reaction"
        type="button"
        className="sheet-chip"
        disabled={!reactionGate.ok}
        title={
          reactionGate.ok
            ? 'Открыть каст заклинания со временем «реакция»'
            : reactionGate.reason
        }
        onClick={() => onO07CastReactionGeneric()}
      >
        Кастануть реакцией
      </button>,
    )
  }

  if (hasProtectionStyle) {
    const protGate = canProtectionReaction(turnEco.turnEconomy, {
      hasProtectionStyle: true,
      shieldInHand: shieldInHandForProtection,
    })
    push(
      'protection',
      ['reaction'],
      'personal',
      <button
        key="protection"
        type="button"
        className="sheet-chip"
        disabled={!protGate.ok}
        title={protGate.ok ? PROTECTION_REACTION_HINT : protGate.reason}
        onClick={() => {
          if (
            !canProtectionReaction(turnEco.turnEconomy, {
              hasProtectionStyle: true,
              shieldInHand: shieldInHandForProtection,
            }).ok
          ) {
            return
          }
          turnEco.spendFeature('reaction')
          onToast?.(
            'Защита: реакция · помеха на атаку по союзнику в 5 фт (ты видишь атакующего)',
          )
        }}
      >
        Защита
      </button>,
    )
  }

  if (hasUncannyDodge) {
    push(
      'uncanny_dodge',
      ['reaction'],
      'personal',
      <button
        key="uncanny_dodge"
        type="button"
        className={`sheet-chip${reactionSpent ? ' is-spent' : ''}`}
        disabled={!reactionGate.ok}
        title={
          reactionGate.ok
            ? 'Увёртливость: реакция · половина урона от одной атаки, которую ты видишь'
            : reactionGate.reason
        }
        onClick={() => {
          if (!turnEco.canFeature('reaction').ok) return
          turnEco.spendFeature('reaction')
          onToast?.(
            'Увёртливость: реакция · урон от этой атаки уменьшается вдвое (ты видишь атакующего)',
          )
        }}
      >
        {reactionSpent ? (
          <span className="sheet-chip__check" aria-hidden>
            ✓
          </span>
        ) : null}
        Увёртливость
      </button>,
    )
  }

  if (hasInterception) {
    push(
      'interception',
      ['reaction'],
      'personal',
      <button
        key="interception"
        type="button"
        className={`sheet-chip${reactionSpent ? ' is-spent' : ''}`}
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
        {reactionSpent ? (
          <span className="sheet-chip__check" aria-hidden>
            ✓
          </span>
        ) : null}
        Перехват
      </button>,
    )
  }

  if (hasChainMaster) {
    push(
      'chain_attack',
      ['bonus'],
      'personal',
      <button
        key="chain_attack"
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
      </button>,
    )
    push(
      'chain_resist',
      ['reaction'],
      'personal',
      <button
        key="chain_resist"
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
      </button>,
    )
  }

  if (hasTalismanRebuke) {
    push(
      'talisman_rebuke',
      ['reaction'],
      'personal',
      <button
        key="talisman_rebuke"
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
      </button>,
    )
  }

  if (o05?.greatWeaponMaster && onO05GwmFinishing) {
    const marked = Boolean(
      teState.gwmBonusReady || teState.meleeWeaponCritOrKillThisTurn,
    )
    push(
      'gwm_finish',
      ['bonus'],
      'personal',
      <button
        key="gwm_finish"
        type="button"
        className={`sheet-chip${marked ? ' is-on' : ''}`}
        title="Отметить добивание рукопашным оружием в этот ход (хиты цели → 0) · не тратит действие"
        onClick={() => onO05GwmFinishing()}
      >
        Добивание (0 хитов)
      </button>,
    )
  }

  if (o05?.greatWeaponMaster && onO05GwmBonus) {
    const gwmUsed = Boolean(teState.gwmBonusUsed)
    push(
      'gwm_bonus',
      ['bonus'],
      'personal',
      <button
        key="gwm_bonus"
        type="button"
        className={`sheet-chip${gwmUsed ? ' is-spent' : ''}`}
        disabled={!gwmGate.ok}
        title={gwmGate.ok ? GWM_BONUS_ATTACK_HINT : gwmGate.reason}
        onClick={() => {
          if (!canGwmBonusAttack(turnEco.turnEconomy, true).ok) return
          turnEco.patchTurnEconomy(markGwmBonusUsed)
          onO05GwmBonus()
          onToast?.('Мастер большого оружия: бонусная рукопашная атака оружием')
        }}
      >
        {gwmUsed ? (
          <span className="sheet-chip__check" aria-hidden>
            ✓
          </span>
        ) : null}
        Атака Мастера большого оружия
      </button>,
    )
  }

  if (o05?.charger && onO05ChargerAttack) {
    push(
      'charger_attack',
      ['bonus'],
      'personal',
      <button
        key="charger_attack"
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
        Налётчик: Удар (+5)
      </button>,
    )
  }
  if (o05?.charger && onO05ChargerShove) {
    push(
      'charger_shove',
      ['bonus'],
      'personal',
      <button
        key="charger_shove"
        type="button"
        className="sheet-chip"
        disabled={!chargerGate.ok}
        title={
          chargerGate.ok ? 'Бонусный толчок (состязание Атлетики)' : chargerGate.reason
        }
        onClick={() => {
          if (!canChargerBonus(turnEco.turnEconomy, true).ok) return
          onO05ChargerShove()
        }}
      >
        Налётчик: Толчок
      </button>,
    )
  }

  if (o05?.crossbowExpert && onO05CrossbowBonus) {
    push(
      'crossbow_bonus',
      ['bonus'],
      'personal',
      <button
        key="crossbow_bonus"
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
      </button>,
    )
  }

  if (o05?.tavernBrawler && onO05TavernGrapple) {
    push(
      'tavern_grapple',
      ['bonus'],
      'personal',
      <button
        key="tavern_grapple"
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
      </button>,
    )
  }

  if (o05?.healer && o05.hasHealerKit && onO05HealerStabilize) {
    push(
      'healer_stabilize',
      ['action'],
      'personal',
      <button
        key="healer_stabilize"
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
        Целитель: Стабилизировать
      </button>,
    )
  }
  if (o05?.healer && o05.hasHealerKit && onO05HealerHeal) {
    push(
      'healer_heal',
      ['action'],
      'personal',
      <button
        key="healer_heal"
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
        Целитель: Лечить
      </button>,
    )
  }

  if (o05?.grappler && onO05GrapplerPin) {
    push(
      'grappler_pin',
      ['action'],
      'personal',
      <button
        key="grappler_pin"
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
      </button>,
    )
  }

  if (o05?.shieldMaster && onO05ShieldShove) {
    const shieldUsed = Boolean(teState.shieldMasterShoveUsed)
    push(
      'shield_shove',
      ['bonus'],
      'personal',
      <button
        key="shield_shove"
        type="button"
        className={`sheet-chip${shieldUsed ? ' is-spent' : ''}`}
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
        {shieldUsed ? (
          <span className="sheet-chip__check" aria-hidden>
            ✓
          </span>
        ) : null}
        Толчок щитом
      </button>,
    )
  }

  if (tceOn && o05?.telekinetic && onO05Telekinetic) {
    push(
      'telekinetic',
      ['bonus'],
      'personal',
      <button
        key="telekinetic"
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
      </button>,
    )
  }

  if (tceOn && o05?.orcishFury && onO05OrcishFury) {
    push(
      'orcish_fury',
      ['bonus'],
      'personal',
      <button
        key="orcish_fury"
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
      </button>,
    )
  }

  if (o06Breath) {
    push(
      'breath',
      ['action'],
      'personal',
      <button
        key="breath"
        type="button"
        className="sheet-chip"
        disabled={Boolean(o06Breath.disabled)}
        title={
          o06Breath.disabled
            ? o06Breath.disabledReason || o06Breath.hint
            : o06Breath.hint
        }
        onClick={() => o06Breath.onClick()}
      >
        {o06Breath.label}
      </button>,
    )
  }
  for (const row of o06FtdExtra ?? []) {
    push(
      `ftd_${row.label}`,
      ['action'],
      'personal',
      <button
        key={`ftd_${row.label}`}
        type="button"
        className="sheet-chip"
        disabled={Boolean(row.disabled)}
        title={row.disabled ? row.disabledReason || row.hint : row.hint}
        onClick={() => row.onClick()}
      >
        {row.label}
      </button>,
    )
  }

  if (o03?.mark && onO03Mark) {
    push(
      'mark',
      ['action'],
      'personal',
      <button
        key="mark"
        type="button"
        className="sheet-chip"
        title="Метка: пометить цель рукопашной атаки"
        onClick={() => onO03Mark()}
      >
        Метка
      </button>,
    )
  }
  if (o03?.mark && o03.hasMarkedTarget && onO03MarkOpportunity) {
    push(
      'mark_opp',
      ['reaction'],
      'personal',
      <button
        key="mark_opp"
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
      </button>,
    )
  }

  // —— DMG «ещё» ——
  if (o03?.overrun && onO03Overrun) {
    push(
      'overrun',
      ['action', 'bonus'],
      'more',
      <button
        key="overrun"
        type="button"
        className="sheet-chip"
        disabled={!actionGate.ok && !bonusGate.ok}
        title="Пробегание: действие или бонусное · Атлетика vs Атлетика"
        onClick={() => onO03Overrun()}
      >
        Пробегание
      </button>,
    )
  }
  if (o03?.tumble && onO03Tumble) {
    push(
      'tumble',
      ['action', 'bonus'],
      'more',
      <button
        key="tumble"
        type="button"
        className="sheet-chip"
        disabled={!actionGate.ok && !bonusGate.ok}
        title="Кувырок: действие или бонусное · Акробатика vs Акробатика"
        onClick={() => onO03Tumble()}
      >
        Кувырок
      </button>,
    )
  }
  if (o03?.climbBigger && onO03ClimbBigger) {
    push(
      'climb',
      ['action'],
      'more',
      <button
        key="climb"
        type="button"
        className="sheet-chip"
        disabled={!actionGate.ok}
        title={actionGate.ok ? 'Взбирание на большее существо · действие' : actionGate.reason}
        onClick={() => {
          if (!turnEco.canFeature('action').ok) return
          onO03ClimbBigger()
        }}
      >
        Взбирание
      </button>,
    )
  }
  if (o03?.identifySpell && onO03IdentifySpell) {
    push(
      'identify_spell',
      ['reaction'],
      'more',
      <button
        key="identify_spell"
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
      </button>,
    )
  }
  if (o03?.falling && onO03Falling) {
    push(
      'falling',
      ['action'],
      'more',
      <button
        key="falling"
        type="button"
        className="sheet-chip"
        title="Калькулятор падения: 1к6 / 10 фт, макс. 20к6"
        onClick={() => onO03Falling()}
      >
        Падение
      </button>,
    )
  }
  if (o03?.noLongRest && onO03NoLongRest) {
    push(
      'no_long_rest',
      ['action'],
      'more',
      <button
        key="no_long_rest"
        type="button"
        className="sheet-chip"
        title="Прошло 24 часа без длинного отдыха → спас Тел"
        onClick={() => onO03NoLongRest()}
      >
        24 ч без отдыха
      </button>,
    )
  }
  if (o04?.lingeringInjuries && onO04LingeringInjury) {
    push(
      'injury',
      ['action'],
      'more',
      <button
        key="injury"
        type="button"
        className="sheet-chip"
        title="Ручной бросок по таблице незаживающих ран DMG"
        onClick={() => onO04LingeringInjury()}
      >
        Бросок раны
      </button>,
    )
  }
  if (o04?.morale && onO04Morale) {
    push(
      'morale',
      ['action'],
      'more',
      <button
        key="morale"
        type="button"
        className="sheet-chip"
        title="Проверка морали врагов (спас Мудрости Сл 10)"
        onClick={() => onO04Morale()}
      >
        Проверка морали
      </button>,
    )
  }
  if (o04?.heroPoints && onO04HeroPoints) {
    push(
      'hero',
      ['action'],
      'more',
      <button
        key="hero"
        type="button"
        className="sheet-chip"
        title="Потратить очко героя (+1к6 к d20 или стабилизация)"
        onClick={() => onO04HeroPoints()}
      >
        Очко героя
      </button>,
    )
  }

  // —— Info chips (not actions) ——
  if (hasBlindFighting) {
    push(
      'blind_sight',
      ['action', 'bonus', 'reaction'],
      'info',
      <span
        key="blind_sight"
        className="sheet-chip is-stub"
        title="Сражение вслепую: слепое зрение 10 фт (без карты) · не действие"
      >
        Слепое зрение 10 фт
      </span>,
    )
  }
  if (hasDevilsSight) {
    push(
      'devils_sight',
      ['action', 'bonus', 'reaction'],
      'info',
      <span
        key="devils_sight"
        className="sheet-chip is-stub"
        title={`${DEVILS_SIGHT_HINT} · не действие`}
      >
        Дьявольское зрение 120 фт
      </span>,
    )
  }

  if (turnEco.turnEconomy.extraActions > 0) {
    push(
      'extra_action',
      ['action'],
      'info',
      <span
        key="extra_action"
        className="sheet-chip is-on"
        title="Дополнительное действие от «Всплеска действий»"
      >
        Доп. действие ×{turnEco.turnEconomy.extraActions}
      </span>,
    )
  }

  // Count actionable (non-info) for empty-state disable. «ещё» and personal/common count.
  const groupActionable = (group: TurnActionGroupId) =>
    chips.some((c) => c.groups.includes(group) && c.tier !== 'info')

  const spentOf = (group: TurnActionGroupId) =>
    group === 'action' ? actionSpent : group === 'bonus' ? bonusSpent : reactionSpent

  const renderGroupPanel = (group: TurnActionGroupId) => {
    const personal = chips.filter(
      (c) => c.groups.includes(group) && c.tier === 'personal',
    )
    const common = chips.filter(
      (c) => c.groups.includes(group) && c.tier === 'common',
    )
    const more = chips.filter((c) => c.groups.includes(group) && c.tier === 'more')
    const info = chips.filter((c) => c.groups.includes(group) && c.tier === 'info')
    return (
      <div
        className="play-desk-turn-actions__panel"
        role="group"
        aria-label={TURN_GROUP_LABELS[group]}
      >
        {personal.length || common.length ? (
          <div className="chip-row play-desk-turn-actions__chips">
            {personal.map((c) => c.node)}
            {common.map((c) => c.node)}
          </div>
        ) : (
          <p className="play-desk-turn-actions__empty">{TURN_GROUP_EMPTY_HINT[group]}</p>
        )}
        {more.length ? (
          <details className="play-desk-turn-actions__more">
            <summary className="play-desk-turn-actions__more-summary">ещё</summary>
            <div className="chip-row play-desk-turn-actions__chips">{more.map((c) => c.node)}</div>
          </details>
        ) : null}
        {info.length ? (
          <div
            className="chip-row play-desk-turn-actions__info"
            role="group"
            aria-label="Пометки"
          >
            {info.map((c) => c.node)}
          </div>
        ) : null}
      </div>
    )
  }

  const groups: TurnActionGroupId[] = ['action', 'bonus', 'reaction']
  const showMarks = Boolean(turnEco.combatActive)
  const interactionOn = teState.objectInteraction
  const movedOn = teState.moved
  const interactionLocked =
    interactionOn && markClearBlocked(teState, 'object_interaction', { asGm: false })
  const movedLocked = movedOn && movementClearBlocked(teState, { asGm: false })

  const clearSpentMark = (group: TurnActionGroupId) => {
    const mark: TurnEconomyMarkKey = group
    if (!spentOf(group)) return
    if (markClearBlocked(teState, mark, { asGm: false })) return
    turnEco.toggleMark(mark)
  }

  return (
    <div
      className={`play-desk-turn-actions ${className}`.trim()}
      role="group"
      aria-label="Действия хода"
    >
      {/*
        FIX-01: одна строка — группы Действие/Бонусное/Реакция + отметки
        Взаимодействие/Движение (раньше отдельный TurnEconomyChips).
      */}
      <div className="play-desk-turn-actions__tabs" role="tablist" aria-label="Вид действия">
        {groups.map((group) => {
          const spent = spentOf(group)
          const has = groupActionable(group)
          const open = openGroup === group
          return (
            <button
              key={group}
              type="button"
              role="tab"
              aria-selected={open}
              className={`sheet-chip play-desk-turn-actions__tab${
                open ? ' is-open' : ''
              }${spent ? ' is-spent' : ''}`}
              /* Always clickable: empty catalog still opens for «Снять отметку» / empty hint. */
              title={
                spent
                  ? `${TURN_GROUP_LABELS[group]}: потрачено · нажмите, чтобы ${open ? 'свернуть' : 'открыть'}`
                  : has
                    ? `${TURN_GROUP_LABELS[group]}: свободно · нажмите, чтобы ${open ? 'свернуть' : 'открыть'} варианты`
                    : `${TURN_GROUP_LABELS[group]}: ${TURN_GROUP_EMPTY_HINT[group]}`
              }
              onClick={() => toggleGroup(group)}
            >
              {spent ? <span className="sheet-chip__check" aria-hidden>✓</span> : null}
              <span>{TURN_GROUP_LABELS[group]}</span>
            </button>
          )
        })}
        {showMarks ? (
          <>
            <button
              type="button"
              className={`sheet-chip play-desk-turn-actions__mark${
                interactionOn ? ' is-spent' : ''
              }${interactionLocked ? ' is-locked' : ''}`}
              aria-pressed={interactionOn}
              disabled={interactionLocked}
              title={
                interactionLocked
                  ? teState.surprised
                    ? 'Врасплох — до конца первого хода'
                    : 'Отметку мастера снимает только мастер'
                  : interactionOn
                    ? 'Потрачено — нажмите, чтобы снять'
                    : 'Свободно — нажмите, чтобы отметить'
              }
              onClick={() => {
                if (interactionLocked) return
                turnEco.toggleMark('object_interaction')
              }}
            >
              {interactionOn ? (
                <span className="sheet-chip__check" aria-hidden>
                  ✓
                </span>
              ) : null}
              {TURN_MARK_LABELS.object_interaction}
            </button>
            <button
              type="button"
              className={`sheet-chip play-desk-turn-actions__mark${
                movedOn ? ' is-spent' : ''
              }${movedLocked ? ' is-locked' : ''}`}
              aria-pressed={movedOn}
              disabled={movedLocked}
              title={
                movedLocked
                  ? teState.surprised
                    ? 'Врасплох — до конца первого хода'
                    : 'Отметку мастера снимает только мастер'
                  : movedOn
                    ? 'Уже двигался — нажмите, чтобы снять'
                    : 'Отметить перемещение в этот ход'
              }
              onClick={() => {
                if (movedLocked) return
                turnEco.toggleMoved()
              }}
            >
              {movedOn ? (
                <span className="sheet-chip__check" aria-hidden>
                  ✓
                </span>
              ) : null}
              Движение
            </button>
            {teState.surprised ? (
              <span
                className="sheet-chip play-desk-turn-actions__mark is-spent"
                title="Застигнут врасплох до конца первого хода"
              >
                врасплох
              </span>
            ) : null}
            {teState.steadyAim ? (
              <span
                className="sheet-chip play-desk-turn-actions__mark is-on"
                title="Точное прицеливание: преимущество на следующую атаку, скорость 0"
              >
                Прицел
              </span>
            ) : null}
          </>
        ) : null}
      </div>
      {openGroup ? (
        <div className="play-desk-turn-actions__panel-wrap">
          {spentOf(openGroup) ? (
            <div className="chip-row play-desk-turn-actions__clear">
              <button
                type="button"
                className="sheet-chip"
                disabled={markClearBlocked(teState, openGroup, { asGm: false })}
                title={
                  markClearBlocked(teState, openGroup, { asGm: false })
                    ? teState.surprised
                      ? 'Врасплох — до конца первого хода'
                      : 'Отметку мастера снимает только мастер'
                    : `Снять отметку «${TURN_GROUP_LABELS[openGroup]}»`
                }
                onClick={() => clearSpentMark(openGroup)}
              >
                Снять отметку
              </button>
            </div>
          ) : null}
          {renderGroupPanel(openGroup)}
        </div>
      ) : null}
    </div>
  )
}
