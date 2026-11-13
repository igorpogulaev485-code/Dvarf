import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  spendHitDieFromPool,
  totalHitDiceCurrent,
  totalHitDiceMax,
  type ClassHitDicePool,
} from '../../shared/dnd/classHitDice'
import {
  applyHitDieHeal,
  clampDeathMarks,
  hasBlackBloodHealing,
  rollHitDieFace,
  suggestedHitDieHeal,
} from '../../shared/dnd/hitDice'
import {
  DEATH_SAVE_HINT,
  resolveDeathSaveRoll,
  stabilizePlayPatch,
} from '../../shared/dnd/o09DeathInspirationAmmo'
import { rollCheck } from './deskRolls'
import { Button, SlotPips } from '../../ui'
import {
  DAMAGE_TYPES,
  adjustIncomingDamage,
  damageTypeLabel,
  emptyDamageProfile,
  formatDefenseList,
  isPhysicalDamage,
  type DamageType,
  type IncomingDamageProfile,
} from '../../shared/dnd/damageTypes'
import { acquireBodyScrollLock } from '../../ui/bodyScrollLock'
import { withSyncedHitDiceSummary, type PlayState } from './play'

type HpPadDialogProps = {
  open: boolean
  hpCurrent: number | null
  hpMax: number | null
  hpTemp: number
  constitutionMod: number
  play: PlayState
  onClose: () => void
  onOpenMaxSettings: () => void
  onHeal: (amount: number) => void
  /** Real HP loss after temp soak; amount is total damage rolled. */
  onDamage: (amount: number, opts?: { critical?: boolean }) => void
  onSetTemp: (temp: number) => void
  onPlayChange: (play: PlayState) => void
  onCombatChange: (patch: { hpCurrent?: number | null }) => void
  onToast: (message: string) => void
  /** Race + worn items. Damage is halved only when the player picks a type. */
  damageProfile?: IncomingDamageProfile
  /** B-04: Monk/Rogue Evasion — Dex save damage: success → 0, fail → half. */
  hasEvasion?: boolean
  /** B-05: Uncanny Dodge — reaction: half damage from one attack (before resist). */
  hasUncannyDodge?: boolean
  /** B-07: Heavy Armor Master — −3 nonmagical B/P/S while in heavy (before resist, Р6). */
  heavyArmorMaster?: boolean
  /** B-07: Shield Master — reaction: Dex save for half → 0 damage when success. */
  hasShieldMasterEvasion?: boolean
  /** B-08: Stone's Endurance — reaction: −(1d12+Con) before resist. */
  stonesEnduranceReduction?: number | null
  /** B-08: Hadozee Dodge — reaction: −(1d6+level). */
  hadozeeDodgeReduction?: number | null
  /** Race slug — Verdan Black Blood Healing on Hit Dice. */
  raceSlug?: string | null
  /** O-07: Парирование — реакция + кость превосходства. */
  hasParry?: boolean
  /** Precomputed cut (die face + Dex mod), or null to hide. */
  parryReduction?: number | null
  /** Called when damage applied with Parry on — spend reaction + die. */
  onParryUsed?: () => void
  /** O-07: suggest Shield before applying attack damage. */
  offerShieldReaction?: boolean
  onCastShield?: () => void
  /** O-07: Absorb Elements when damage type matches. */
  offerAbsorbElements?: boolean
  onCastAbsorbElements?: () => void
  /** O-07: Hellish Rebuke after being hit. */
  offerHellishRebuke?: boolean
  onCastHellishRebuke?: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'] as const

export function HpPadDialog({
  open,
  hpCurrent,
  hpMax,
  hpTemp,
  constitutionMod,
  play,
  onClose,
  onOpenMaxSettings,
  onHeal,
  onDamage,
  onSetTemp,
  onPlayChange,
  onCombatChange,
  onToast,
  damageProfile,
  hasEvasion = false,
  hasUncannyDodge = false,
  heavyArmorMaster = false,
  hasShieldMasterEvasion = false,
  stonesEnduranceReduction = null,
  hadozeeDodgeReduction = null,
  raceSlug = null,
  hasParry = false,
  parryReduction = null,
  onParryUsed,
  offerShieldReaction = false,
  onCastShield,
  offerAbsorbElements = false,
  onCastAbsorbElements,
  offerHellishRebuke = false,
  onCastHellishRebuke,
}: HpPadDialogProps) {
  const blackBlood = hasBlackBloodHealing(raceSlug)
  const [digits, setDigits] = useState('')
  const [damageType, setDamageType] = useState<DamageType | null>(null)
  const [nonmagical, setNonmagical] = useState(false)
  /** null = off; success = 0 dmg; fail = half before resist. */
  const [evasionMode, setEvasionMode] = useState<'success' | 'fail' | null>(null)
  const [stonesOn, setStonesOn] = useState(false)
  const [hadozeeOn, setHadozeeOn] = useState(false)
  /** B-05: half one attack (reaction), before resistance (Р6). */
  const [uncannyDodgeOn, setUncannyDodgeOn] = useState(false)
  /** B-07 Shield Master: success on Dex save for half → 0. */
  const [shieldMasterOn, setShieldMasterOn] = useState(false)
  /** O-07 Parry. */
  const [parryOn, setParryOn] = useState(false)
  /** O-09: critical hit while dying → two death-save failures. */
  const [criticalHit, setCriticalHit] = useState(false)
  const profile = damageProfile ?? emptyDamageProfile()
  const pools = play.hitDiceByClass
  const hitCurrent = totalHitDiceCurrent(pools)
  const hitMax = totalHitDiceMax(pools)
  const current = hpCurrent ?? 0
  const showDeath = play.isDying || current <= 0

  useEffect(() => {
    if (!open) return
    setDigits('')
    setDamageType(null)
    setNonmagical(false)
    setEvasionMode(null)
    setUncannyDodgeOn(false)
    setShieldMasterOn(false)
    setParryOn(false)
    setCriticalHit(false)
    const releaseScroll = acquireBodyScrollLock()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault()
        setDigits((prev) => (prev + event.key).replace(/^0+(?=\d)/, '').slice(0, 8))
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        setDigits((prev) => prev.slice(0, -1))
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      releaseScroll()
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  const delta = digits === '' ? 0 : Number(digits)
  const canApply = delta > 0
  const afterEvasion = (() => {
    if (!hasEvasion || !evasionMode || delta <= 0) {
      return { amount: delta, note: '' }
    }
    if (evasionMode === 'success') {
      return { amount: 0, note: `Уклонение (успех): ${delta} → 0` }
    }
    const half = Math.floor(delta / 2)
    return { amount: half, note: `Уклонение (провал): ${delta} → ${half}` }
  })()
  const afterUncanny = (() => {
    if (!hasUncannyDodge || !uncannyDodgeOn || afterEvasion.amount <= 0) {
      return { amount: afterEvasion.amount, note: '' }
    }
    const half = Math.floor(afterEvasion.amount / 2)
    return { amount: half, note: `Увёртливость: ${afterEvasion.amount} → ${half}` }
  })()
  const afterParry = (() => {
    const cut = parryReduction ?? 0
    if (!hasParry || !parryOn || cut <= 0 || afterUncanny.amount <= 0) {
      return { amount: afterUncanny.amount, note: '' }
    }
    const next = Math.max(0, afterUncanny.amount - cut)
    return {
      amount: next,
      note: `Парирование: −${cut} · ${afterUncanny.amount} → ${next}`,
    }
  })()
  const afterShieldMaster = (() => {
    if (!hasShieldMasterEvasion || !shieldMasterOn || afterParry.amount <= 0) {
      return { amount: afterParry.amount, note: '' }
    }
    return {
      amount: 0,
      note: `Мастер щитов (успех): ${afterParry.amount} → 0`,
    }
  })()
  const afterHeavyArmor = (() => {
    if (!heavyArmorMaster || afterShieldMaster.amount <= 0) {
      return { amount: afterShieldMaster.amount, note: '' }
    }
    if (!nonmagical || !damageType || !isPhysicalDamage(damageType)) {
      return { amount: afterShieldMaster.amount, note: '' }
    }
    const next = Math.max(0, afterShieldMaster.amount - 3)
    return {
      amount: next,
      note: `Мастер тяжёлых доспехов: ${afterShieldMaster.amount} → ${next}`,
    }
  })()
  const afterStones = (() => {
    const cut = stonesEnduranceReduction ?? 0
    if (!stonesOn || cut <= 0 || afterHeavyArmor.amount <= 0) {
      return { amount: afterHeavyArmor.amount, note: '' }
    }
    const next = Math.max(0, afterHeavyArmor.amount - cut)
    return {
      amount: next,
      note: `Каменная стойкость: ${afterHeavyArmor.amount} → ${next}`,
    }
  })()
  const afterHadozee = (() => {
    const cut = hadozeeDodgeReduction ?? 0
    if (!hadozeeOn || cut <= 0 || afterStones.amount <= 0) {
      return { amount: afterStones.amount, note: '' }
    }
    const next = Math.max(0, afterStones.amount - cut)
    return {
      amount: next,
      note: `Уклонение хадози: ${afterStones.amount} → ${next}`,
    }
  })()
  const adjustedRaw = adjustIncomingDamage({
    amount: afterHadozee.amount,
    type: damageType,
    nonmagical,
    profile,
  })
  const adjusted = {
    amount: adjustedRaw.amount,
    note: [
      afterEvasion.note,
      afterUncanny.note,
      afterParry.note,
      afterShieldMaster.note,
      afterHeavyArmor.note,
      afterStones.note,
      afterHadozee.note,
      adjustedRaw.note,
    ]
      .filter(Boolean)
      .join(' · '),
  }
  const resistanceLabel = formatDefenseList(profile.resistances)
  const vulnerabilityLabel = formatDefenseList(profile.vulnerabilities)
  const immunityLabel = formatDefenseList(profile.immunities)
  const showNonmagical = damageType != null && isPhysicalDamage(damageType)

  const poolHint = useMemo(() => {
    if (pools.length === 0) return 'Кости хитов появятся после выбора класса'
    return pools.map((p) => `${p.className} ${p.die} ${p.current}/${p.max}`).join(' · ')
  }, [pools])

  function press(key: (typeof KEYS)[number]) {
    if (key === 'C') {
      setDigits('')
      return
    }
    if (key === '⌫') {
      setDigits((prev) => prev.slice(0, -1))
      return
    }
    setDigits((prev) => (prev + key).replace(/^0+(?=\d)/, '').slice(0, 8))
  }

  function spendPool(pool: ClassHitDicePool) {
    if (pool.current <= 0) {
      onToast(`Нет костей «${pool.className}»`)
      return
    }
    if (hpMax == null) {
      onToast('Сначала задай максимум хитов')
      return
    }
    const spent = spendHitDieFromPool(pools, pool.classEntryId)
    if (!spent) return
    const face = blackBlood
      ? rollHitDieFace({
          die: pool.die,
          constitutionMod,
          blackBloodHealing: true,
        })
      : null
    const healAmount = face
      ? face.heal
      : suggestedHitDieHeal(pool.die, constitutionMod)
    const healed =
      applyHitDieHeal({
        hpCurrent: current,
        hpMax,
        healAmount,
      }) ?? current
    onPlayChange(withSyncedHitDiceSummary({ ...play, hitDiceByClass: spent }))
    onCombatChange({ hpCurrent: healed })
    const detail = face
      ? face.note
        ? face.note
        : `бросок ${face.final} + ТЕЛ`
      : 'среднее + ТЕЛ'
    onToast(
      `Кость ${pool.className} (${pool.die}): +${Math.max(0, healed - current)} хитов (${detail})`,
    )
  }

  if (!open) return null

  return createPortal(
    <div
      className="ui-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="ui-dialog ui-dialog--pad hp-pad"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hp-pad-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="number-pad__head">
          <h2 id="hp-pad-title" className="ui-text ui-dialog__title">
            Хиты
          </h2>
          <button type="button" className="number-pad__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="hp-pad__status" aria-live="polite">
          <strong className="hp-pad__status-hp">
            {hpCurrent ?? '—'}
            <span>/{hpMax ?? '—'}</span>
          </strong>
          {hpTemp > 0 ? <span className="hp-pad__temp">врем. +{hpTemp}</span> : null}
        </div>

        <div className="number-pad__display">
          <span className="number-pad__display-value">{digits === '' ? '0' : String(delta)}</span>
          <span className="number-pad__display-hint">
            {adjusted.note || 'введи число, затем действие'}
          </span>
        </div>

        {resistanceLabel || vulnerabilityLabel || immunityLabel ? (
          <p className="hp-pad__hint hp-pad__defenses">
            {resistanceLabel ? `Сопротивления: ${resistanceLabel}` : ''}
            {vulnerabilityLabel
              ? `${resistanceLabel ? ' · ' : ''}Уязвимости: ${vulnerabilityLabel}`
              : ''}
            {immunityLabel
              ? `${resistanceLabel || vulnerabilityLabel ? ' · ' : ''}Иммунитеты: ${immunityLabel}`
              : ''}
          </p>
        ) : null}

        <div className="hp-pad__types chip-row" role="group" aria-label="Тип урона">
          {DAMAGE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`sheet-chip${damageType === type ? ' is-on' : ''}`}
              aria-pressed={damageType === type}
              onClick={() => setDamageType((prev) => (prev === type ? null : type))}
            >
              {damageTypeLabel(type)}
            </button>
          ))}
        </div>
        {showNonmagical ? (
          <label className="sheet-check hp-pad__nonmagical">
            <input
              type="checkbox"
              checked={nonmagical}
              onChange={(event) => setNonmagical(event.target.checked)}
            />
            <span>Немагический удар</span>
          </label>
        ) : null}
        {hasEvasion ? (
          <div className="chip-row" role="group" aria-label="Уклонение (спасбросок Ловкости)">
            <button
              type="button"
              className={`sheet-chip${evasionMode === 'success' ? ' is-on' : ''}`}
              aria-pressed={evasionMode === 'success'}
              onClick={() =>
                setEvasionMode((prev) => (prev === 'success' ? null : 'success'))
              }
            >
              Уклонение: успех → 0
            </button>
            <button
              type="button"
              className={`sheet-chip${evasionMode === 'fail' ? ' is-on' : ''}`}
              aria-pressed={evasionMode === 'fail'}
              onClick={() => setEvasionMode((prev) => (prev === 'fail' ? null : 'fail'))}
            >
              Уклонение: провал → ½
            </button>
          </div>
        ) : null}
        {hasShieldMasterEvasion ? (
          <div className="chip-row" role="group" aria-label="Мастер щитов">
            <button
              type="button"
              className={`sheet-chip${shieldMasterOn ? ' is-on' : ''}`}
              aria-pressed={shieldMasterOn}
              onClick={() => setShieldMasterOn((prev) => !prev)}
            >
              Мастер щитов: успех → 0 урона
            </button>
          </div>
        ) : null}
        {hasUncannyDodge ? (
          <div className="chip-row" role="group" aria-label="Увёртливость">
            <button
              type="button"
              className={`sheet-chip${uncannyDodgeOn ? ' is-on' : ''}`}
              aria-pressed={uncannyDodgeOn}
              onClick={() => setUncannyDodgeOn((prev) => !prev)}
            >
              Увёртливость: половина урона атаки
            </button>
          </div>
        ) : null}
        {hasParry && parryReduction != null && parryReduction > 0 ? (
          <div className="chip-row" role="group" aria-label="Парирование">
            <button
              type="button"
              className={`sheet-chip${parryOn ? ' is-on' : ''}`}
              aria-pressed={parryOn}
              title="Реакция · рукопашная атака оружием · кость превосходства + Ловк."
              onClick={() => setParryOn((prev) => !prev)}
            >
              Парирование: −{parryReduction}
            </button>
          </div>
        ) : null}
        {offerShieldReaction && onCastShield ? (
          <div className="chip-row" role="group" aria-label="Щит">
            <button
              type="button"
              className="sheet-chip"
              title="Реакция · +5 КД к этой атаке · ячейка 1+"
              onClick={() => onCastShield()}
            >
              Щит (реакция)
            </button>
          </div>
        ) : null}
        {offerAbsorbElements && onCastAbsorbElements ? (
          <div className="chip-row" role="group" aria-label="Поглощение стихий">
            <button
              type="button"
              className="sheet-chip"
              title="Реакция · сопротивление этому урону до начала вашего след. хода"
              onClick={() => onCastAbsorbElements()}
            >
              Поглощение стихий
            </button>
          </div>
        ) : null}
        {offerHellishRebuke && onCastHellishRebuke ? (
          <div className="chip-row" role="group" aria-label="Адское возмездие">
            <button
              type="button"
              className="sheet-chip"
              title="Реакция · урон огнём атаковавшему"
              onClick={() => onCastHellishRebuke()}
            >
              Адское возмездие
            </button>
          </div>
        ) : null}
        {stonesEnduranceReduction != null && stonesEnduranceReduction > 0 ? (
          <div className="chip-row" role="group" aria-label="Каменная стойкость">
            <button
              type="button"
              className={`sheet-chip${stonesOn ? ' is-on' : ''}`}
              aria-pressed={stonesOn}
              onClick={() => setStonesOn((prev) => !prev)}
            >
              Каменная стойкость: −{stonesEnduranceReduction}
            </button>
          </div>
        ) : null}
        {hadozeeDodgeReduction != null && hadozeeDodgeReduction > 0 ? (
          <div className="chip-row" role="group" aria-label="Уклонение хадози">
            <button
              type="button"
              className={`sheet-chip${hadozeeOn ? ' is-on' : ''}`}
              aria-pressed={hadozeeOn}
              onClick={() => setHadozeeOn((prev) => !prev)}
            >
              Уклонение хадози: −{hadozeeDodgeReduction}
            </button>
          </div>
        ) : null}

        <div className="number-pad__keys" role="group" aria-label="Цифровая клавиатура">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`number-pad__key${key === 'C' || key === '⌫' ? ' number-pad__key--meta' : ''}`}
              onClick={() => press(key)}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="hp-pad__actions">
          <Button
            type="button"
            variant="secondary"
            disabled={!canApply && delta !== 0}
            onClick={() => {
              onSetTemp(Math.max(0, delta))
              setDigits('')
              onToast(delta > 0 ? `Временные хиты: ${delta}` : 'Временные хиты сброшены')
            }}
          >
            Временные
          </Button>
          <Button
            type="button"
            disabled={!canApply || (hpMax != null && current >= hpMax)}
            onClick={() => {
              onHeal(delta)
              setDigits('')
              onClose()
            }}
          >
            Лечение
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!canApply}
            onClick={() => {
              onDamage(adjusted.amount, { critical: criticalHit && showDeath })
              if (adjusted.note) onToast(adjusted.note)
              if (parryOn && hasParry) onParryUsed?.()
              setDigits('')
              onClose()
            }}
          >
            Урон
          </Button>
        </div>
        {showDeath ? (
          <div className="chip-row" role="group" aria-label="Урон при 0 хитах">
            <button
              type="button"
              className={`sheet-chip${criticalHit ? ' is-on' : ''}`}
              aria-pressed={criticalHit}
              title="Критический удар по умирающему: два провала"
              onClick={() => setCriticalHit((prev) => !prev)}
            >
              крит (2 провала)
            </button>
          </div>
        ) : null}

        <div className="hp-pad__settings">
          <div className="hp-pad__settings-head">
            <strong>Настройки хитов</strong>
            <button type="button" className="linkish" onClick={onOpenMaxSettings}>
              Максимум…
            </button>
          </div>
          <p className="hp-pad__hint">{poolHint}</p>
          {pools.length > 0 ? (
            <div className="hp-pad__dice">
              <span className="hp-pad__dice-total">
                кости {hitCurrent}/{hitMax}
              </span>
              {pools.map((pool) => (
                <div key={pool.classEntryId} className="hp-pad__dice-row">
                  <button
                    type="button"
                    className="hp-pad__dice-spend"
                    disabled={pool.current <= 0}
                    title={`Потратить кость ${pool.className} (среднее + ТЕЛ)`}
                    onClick={() => spendPool(pool)}
                  >
                    {pool.className} · {pool.die} · {pool.current}/{pool.max}
                  </button>
                  <SlotPips
                    max={Math.max(1, pool.max)}
                    used={Math.max(0, pool.max - pool.current)}
                    fillMode="available"
                    label={`Кости ${pool.className}`}
                    summary={`${pool.current} из ${pool.max}`}
                    onChange={(used) => {
                      const nextPools = pools.map((row) =>
                        row.classEntryId === pool.classEntryId
                          ? { ...row, current: Math.max(0, Math.min(pool.max, pool.max - used)) }
                          : row,
                      )
                      onPlayChange(
                        withSyncedHitDiceSummary({ ...play, hitDiceByClass: nextPools }),
                      )
                    }}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {showDeath ? (
          <div className="hp-pad__death">
            <div className="hp-pad__death-head">
              <strong>Спасброски от смерти</strong>
              <button
                type="button"
                className={`hp-pad__dying-toggle${play.isDying ? ' is-on' : ''}`}
                onClick={() =>
                  onPlayChange({
                    ...play,
                    isDying: !play.isDying,
                    deathSuccesses: play.isDying ? 0 : play.deathSuccesses,
                    deathFails: play.isDying ? 0 : play.deathFails,
                  })
                }
              >
                {play.isDying ? 'При смерти: да' : 'При смерти'}
              </button>
            </div>
            <div className={`hp-pad__death-tracks${play.isDying ? '' : ' is-dim'}`}>
              <DeathTrack
                label="Успехи"
                value={play.deathSuccesses}
                tone="ok"
                onChange={(next) =>
                  onPlayChange({
                    ...play,
                    isDying: true,
                    deathSuccesses: clampDeathMarks(next),
                  })
                }
              />
              <DeathTrack
                label="Провалы"
                value={play.deathFails}
                tone="bad"
                onChange={(next) =>
                  onPlayChange({
                    ...play,
                    isDying: true,
                    deathFails: clampDeathMarks(next),
                  })
                }
              />
            </div>
            {(play.isDying || current <= 0) ? (
              <button
                type="button"
                className="hp-pad__death-roll"
                title={DEATH_SAVE_HINT}
                onClick={() => {
                  const check = rollCheck(0, 'normal')
                  const result = resolveDeathSaveRoll(
                    check.die,
                    play.deathSuccesses,
                    play.deathFails,
                  )
                  const diceNote =
                    check.otherDie != null
                      ? `к20=${check.die}/${check.otherDie}`
                      : `к20=${check.die}`
                  if (result.revived) {
                    onCombatChange({ hpCurrent: 1 })
                    onPlayChange({ ...play, ...stabilizePlayPatch() })
                    onToast(`${result.note} · ${diceNote}`)
                    return
                  }
                  if (result.stabilized) {
                    onPlayChange({ ...play, ...stabilizePlayPatch() })
                    onToast(`${result.note} · ${diceNote}`)
                    return
                  }
                  onPlayChange({
                    ...play,
                    isDying: true,
                    deathSuccesses: result.successes,
                    deathFails: result.fails,
                  })
                  onToast(`${result.note} · ${diceNote}`)
                }}
              >
                Спас от смерти
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

function DeathTrack({
  label,
  value,
  tone,
  onChange,
}: {
  label: string
  value: number
  tone: 'ok' | 'bad'
  onChange: (next: number) => void
}) {
  return (
    <div className="death-track" role="group" aria-label={label}>
      <span className="death-track__label">{label}</span>
      <div className="death-track__pips">
        {Array.from({ length: 3 }, (_, index) => {
          const filled = index < value
          return (
            <button
              key={index}
              type="button"
              className={`death-pip death-pip--${tone}${filled ? ' is-filled' : ''}`}
              aria-pressed={filled}
              aria-label={`${label}: ${index + 1} из 3`}
              onClick={() => onChange(index < value ? index : index + 1)}
            />
          )
        })}
      </div>
    </div>
  )
}
