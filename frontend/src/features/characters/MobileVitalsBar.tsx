import { useEffect, useRef, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { clampDeathMarks, type HitDie } from '../../shared/dnd/hitDice'
import {
  applyDamageAtZeroHp,
  DEATH_SAVE_HINT,
  resolveDeathSaveRoll,
  stabilizePlayPatch,
} from '../../shared/dnd/o09DeathInspirationAmmo'
import { rollCheck } from './deskRolls'
import type { CharacterDetail } from '../../shared/api/characters'
import { formatModifier } from './sheetTypes'
import {
  coinsToGp,
  formatGpCompact,
  formatGpExact,
  type CoinPurse,
} from '../../shared/dnd/weight'
import type { PlayState } from './play'
import { CharacterAvatarControl } from './CharacterAvatarControl'
import { HpPadDialog } from './HpPadDialog'
import { CoinPadDialog } from './CoinPadDialog'
import { MaxHpByLevelsDialog } from './MaxHpByLevelsDialog'
import {
  formatJumpFaceLabel,
  formatJumpTitle,
} from '../../shared/dnd/jumpDistance'
import { HoverTipCard, VITAL_TIPS } from '../onboarding'
import {
  exhaustionHpCurrent,
  exhaustionHpMax,
  exhaustionHpNote,
  exhaustionSpeedFt,
  exhaustionSpeedNote,
} from '../../shared/dnd/exhaustion2014'
import {
  IconBoot,
  IconCoin,
  IconJump,
  IconRest,
  IconShield,
  IconSkull,
} from './deskIcons'
import type { IncomingDamageProfile } from '../../shared/dnd/damageTypes'
import { absorbDamageWithArcaneWard } from '../../shared/dnd/wizardTradition'
import type { NeedsSetupItem } from './needsSetup'
import { VitalTile, VitalTileMenu } from '../../ui'
import { SpeedModesMenuBody } from './SpeedModesMenuBody'

/** v2: M-02 / Q1 defaults to collapsed; old key often stored «0» from M-01 mounts. */
const COLLAPSE_KEY = 'dvarf.mobileVitals.collapsed.v2'

type MobileVitalsBarProps = {
  character: CharacterDetail
  name: string
  raceName: string
  classSummary: string
  alignment: string
  level: number
  hpCurrent: number | null
  hpMax: number | null
  damageProfile?: IncomingDamageProfile
  hasEvasion?: boolean
  /** B-05: Uncanny Dodge — half one attack (reaction). */
  hasUncannyDodge?: boolean
  /** B-07 */
  heavyArmorMaster?: boolean
  hasShieldMasterEvasion?: boolean
  /** B-08 */
  stonesEnduranceReduction?: number | null
  hadozeeDodgeReduction?: number | null
  /** Race slug for Hit Die traits (Verdan Black Blood). */
  raceSlug?: string | null
  /** O-07 */
  hasParry?: boolean
  parryReduction?: number | null
  onParryUsed?: () => void
  offerShieldReaction?: boolean
  onCastShield?: () => void
  offerAbsorbElements?: boolean
  onCastAbsorbElements?: () => void
  offerHellishRebuke?: boolean
  onCastHellishRebuke?: () => void
  /** O-10: Mounted Combatant redirect. */
  canRedirectToMount?: boolean
  mountName?: string | null
  onRedirectDamageToMount?: (amount: number, note: string) => void
  draconicResilience?: boolean
  play: PlayState
  autoAc: number
  acOverride: number | null
  acHint: string
  /** Open AC breakdown / buffs sheet (desk tip). */
  onOpenAc?: () => void
  shieldInHand?: boolean
  shieldAvailable?: boolean
  onToggleShield?: () => void
  speed: number | null
  movementHint?: string | null
  /** Alt speeds — phone: +N badge + DetailsMenu (kit VitalTileMenu). */
  climbSpeed?: number | null
  swimSpeed?: number | null
  flySpeed?: number | null
  /** LP-01: edit climb/swim/fly base inside the existing +N menu only. */
  onAltSpeedChange?: (patch: {
    climbSpeed?: number | null
    swimSpeed?: number | null
    flySpeed?: number | null
  }) => void
  jumpLongFt?: number | null
  jumpHighFt?: number | null
  initiative: number
  onOpenInitiative?: () => void
  onOpenSpeed?: () => void
  proficiencyBonus: number
  inspiration: boolean
  coins: CoinPurse
  constitutionMod: number
  classes: ClassLevelEntry[]
  hitDie: HitDie | null
  onOpenIdentity: () => void
  onOpenAbilities: () => void
  onOpenRest: () => void
  onOpenConditions?: () => void
  onToggleInspiration: () => void
  onAvatarChanged: (character: CharacterDetail) => void
  onPlayChange: (play: PlayState) => void
  onCoinsChange: (coins: CoinPurse) => void
  onCombatChange: (patch: {
    hpCurrent?: number | null
    hpMax?: number | null
  }) => void
  onDamaged?: (damageToHp: number) => void
  onToast: (message: string) => void
  /** Absolute beginner: long-press tip on КД / хиты. */
  showValueTips?: boolean
  /** B20: pending setup items. */
  needsSetupItems?: NeedsSetupItem[]
  onNeedsSetupSelect?: (item: NeedsSetupItem) => void
}

/** M-02 / Q1: on first visit the phone header starts collapsed. */
function readCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY)
    if (raw === null) return true
    return raw === '1'
  } catch {
    return true
  }
}

/** Mobile kit vitals — kit shell board (expand / collapse). */
export function MobileVitalsBar({
  character,
  name,
  raceName,
  classSummary,
  alignment,
  level,
  hpCurrent,
  hpMax,
  damageProfile,
  hasEvasion = false,
  hasUncannyDodge = false,
  heavyArmorMaster = false,
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
  canRedirectToMount = false,
  mountName = null,
  onRedirectDamageToMount,
  hasShieldMasterEvasion = false,
  draconicResilience = false,
  play,
  autoAc,
  acOverride,
  acHint,
  onOpenAc,
  shieldInHand = false,
  shieldAvailable = false,
  onToggleShield,
  speed,
  movementHint: _movementHint = null,
  climbSpeed = null,
  swimSpeed = null,
  flySpeed = null,
  onAltSpeedChange,
  jumpLongFt = null,
  jumpHighFt = null,
  initiative,
  onOpenInitiative,
  onOpenSpeed,
  proficiencyBonus,
  inspiration,
  coins,
  constitutionMod,
  classes,
  hitDie,
  onOpenIdentity,
  onOpenAbilities,
  onOpenRest,
  onOpenConditions,
  onToggleInspiration,
  onAvatarChanged,
  onPlayChange,
  onCoinsChange,
  onCombatChange,
  onDamaged,
  onToast,
  showValueTips = false,
  needsSetupItems: _needsSetupItems = [],
  onNeedsSetupSelect: _onNeedsSetupSelect,
}: MobileVitalsBarProps) {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [hpPadOpen, setHpPadOpen] = useState(false)
  const [coinPadOpen, setCoinPadOpen] = useState(false)
  const [maxDialogOpen, setMaxDialogOpen] = useState(false)
  const [hpPulse, setHpPulse] = useState(false)
  const prevHpRef = useRef(hpCurrent)

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  useEffect(() => {
    const prev = prevHpRef.current
    prevHpRef.current = hpCurrent
    if (prev == null || hpCurrent == null || hpCurrent <= prev) return
    setHpPulse(true)
    const t = window.setTimeout(() => setHpPulse(false), 900)
    return () => window.clearTimeout(t)
  }, [hpCurrent])

  const ac = acOverride ?? autoAc
  const whoMeta =
    [raceName || null, classSummary ? `${classSummary}` : null, alignment.trim() || null]
      .filter(Boolean)
      .join(' · ') || 'Черновик'
  const shownHpMax = exhaustionHpMax(hpMax, play.exhaustion)
  const shownHpCurrent = exhaustionHpCurrent(hpCurrent, hpMax, play.exhaustion)
  const hpExhaustNote = exhaustionHpNote(play.exhaustion)
  const speedExhaustNote = exhaustionSpeedNote(play.exhaustion)
  const shownSpeed = exhaustionSpeedFt(speed, play.exhaustion)
  const shownClimb = exhaustionSpeedFt(climbSpeed, play.exhaustion)
  const shownSwim = exhaustionSpeedFt(swimSpeed, play.exhaustion)
  const shownFly = exhaustionSpeedFt(flySpeed, play.exhaustion)
  const altModes: { key: string; label: string; value: number }[] = []
  if (shownClimb != null) altModes.push({ key: 'climb', label: 'лаз.', value: shownClimb })
  if (shownSwim != null) altModes.push({ key: 'swim', label: 'плав.', value: shownSwim })
  if (shownFly != null) altModes.push({ key: 'fly', label: 'полёт', value: shownFly })
  // Base speeds before exhaustion ÷2 — clear label, not a second unlabeled row.
  const withoutExhaustionNote =
    play.exhaustion >= 2
      ? [
          speed != null ? `ход. ${speed}` : null,
          climbSpeed != null ? `лаз. ${climbSpeed}` : null,
          swimSpeed != null ? `плав. ${swimSpeed}` : null,
          flySpeed != null ? `полёт ${flySpeed}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : ''
  const withoutExhaustionLine = withoutExhaustionNote
    ? `без истощения: ${withoutExhaustionNote}`
    : null
  const speedTitle =
    [
      shownSpeed != null ? `ход ${shownSpeed} фт` : null,
      ...altModes.map((mode) => `${mode.label} ${mode.value} фт`),
      withoutExhaustionLine,
      speedExhaustNote,
    ]
      .filter(Boolean)
      .join(' · ') || undefined
  const hpLabel =
    shownHpCurrent == null && shownHpMax == null
      ? '—/—'
      : `${shownHpCurrent ?? '—'}/${shownHpMax ?? '—'}${hpExhaustNote ? ' · ÷2' : ''}`
  const isDying = play.isDying || (hpCurrent != null && hpCurrent <= 0)
  const abilityPeek = 'Характеристики ▸'

  function applyHeal(amount: number) {
    const max = shownHpMax
    const cur = shownHpCurrent ?? 0
    const next = max == null ? cur + amount : Math.min(max, cur + amount)
    const capped = Math.max(0, next)
    onCombatChange({ hpCurrent: capped })
    if (play.isDying && capped > 0) {
      onPlayChange({
        ...play,
        isDying: false,
        deathSuccesses: 0,
        deathFails: 0,
      })
    }
  }

  function applyDamage(amount: number, opts?: { critical?: boolean }) {
    const ward = absorbDamageWithArcaneWard(play.resources ?? [], amount)
    let left = ward.remaining
    let temp = play.hpTemp
    if (temp > 0) {
      const soak = Math.min(temp, left)
      temp -= soak
      left -= soak
    }
    const cur = shownHpCurrent ?? 0
    const alreadyAtZero = cur <= 0
    const next = Math.max(0, cur - left)
    let nextPlay: PlayState = {
      ...play,
      resources: ward.resources,
      hpTemp: temp,
    }
    if (ward.note) onToast(ward.note)
    if (alreadyAtZero && left > 0 && isDying) {
      const death = applyDamageAtZeroHp({
        damageToHp: left,
        hpMax: shownHpMax,
        isCritical: Boolean(opts?.critical),
        deathFails: play.deathFails,
      })
      nextPlay = {
        ...nextPlay,
        isDying: true,
        deathFails: death.deathFails,
      }
      if (death.note) onToast(death.note)
    } else if (next <= 0 && !play.isDying) {
      nextPlay = { ...nextPlay, isDying: true }
      onToast('Хиты ≤ 0 — спасброски смерти')
    }
    onPlayChange(nextPlay)
    onCombatChange({ hpCurrent: next })
    if (left > 0 && !alreadyAtZero) onDamaged?.(left)
  }

  function rollDeathSave() {
    if (!isDying) return
    const check = rollCheck(0, 'normal')
    const result = resolveDeathSaveRoll(check.die, play.deathSuccesses, play.deathFails)
    const diceNote =
      check.otherDie != null ? `к20=${check.die}/${check.otherDie}` : `к20=${check.die}`
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
  }

  function deathCard() {
    if (!isDying) return null
    return (
      <div className="mobile-vitals__death" aria-label="Спасброски от смерти">
        <button
          type="button"
          className={`mobile-vitals__dying-toggle${isDying ? ' is-on' : ''}`}
          onClick={() =>
            onPlayChange({
              ...play,
              isDying: !play.isDying,
              deathSuccesses: play.isDying ? 0 : play.deathSuccesses,
              deathFails: play.isDying ? 0 : play.deathFails,
            })
          }
        >
          <IconSkull className="mobile-vitals__death-icon" />
          <span>При смерти</span>
        </button>
        <div className="mobile-vitals__death-tracks">
          <MobileDeathTrack
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
          <MobileDeathTrack
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
        <button
          type="button"
          className="mobile-vitals__death-roll"
          title={DEATH_SAVE_HINT}
          onClick={rollDeathSave}
        >
          Спас от смерти
        </button>
      </div>
    )
  }

  if (collapsed) {
    return (
      <section className="mobile-vitals mobile-vitals--collapsed" aria-label="Боевой статус">
        <div className="mobile-vitals__collapse-avatar">
          <CharacterAvatarControl
            character={character}
            size="sm"
            showActions={false}
            onOpen={onOpenIdentity}
            onChanged={onAvatarChanged}
          />
        </div>
        <button
          type="button"
          className="mobile-vitals__collapse-who"
          title="Открыть основное"
          aria-label={`Основное: ${name || 'Без имени'}`}
          onClick={onOpenIdentity}
        >
          <strong>{name || 'Без имени'}</strong>
        </button>
        <button
          type="button"
          className={`mobile-vitals__collapse-hp${hpPulse ? ' is-pulse' : ''}${
            isDying ? ' is-danger' : ''
          }${showValueTips ? ' has-onboarding-tip' : ''}`}
          onClick={() => setHpPadOpen(true)}
          title={
            showValueTips
              ? undefined
              : isDying
                ? `При смерти · успехи ${play.deathSuccesses} · провалы ${play.deathFails}`
                : undefined
          }
          aria-label={
            isDying
              ? `Хиты ${hpLabel}. При смерти: успехи ${play.deathSuccesses}, провалы ${play.deathFails}`
              : `Хиты ${hpLabel}`
          }
        >
          {isDying ? (
            <span className="mobile-vitals__collapse-death">
              <IconSkull className="mobile-vitals__collapse-skull" />
              <span className="mobile-vitals__collapse-hp-num">{hpLabel}</span>
              <span
                className="mobile-vitals__collapse-marks"
                title={`Успехи ${play.deathSuccesses} · провалы ${play.deathFails}`}
              >
                {play.deathSuccesses}&nbsp;/&nbsp;{play.deathFails}
              </span>
            </span>
          ) : (
            hpLabel
          )}
          {showValueTips ? <HoverTipCard tip={VITAL_TIPS.hp} /> : null}
        </button>
        <button
          type="button"
          className="mobile-vitals__expand"
          aria-label="Развернуть шапку"
          onClick={() => setCollapsed(false)}
        >
          ▾
        </button>
        {pads()}
      </section>
    )
  }

  return (
    <section className="mobile-vitals" aria-label="Боевой статус" data-onboarding="combat-vitals">
      {/* M-01 / M05 (Q4): name on its own full-width row */}
      <button
        type="button"
        className="mobile-vitals__name-row"
        title="Открыть основное"
        aria-label={`Основное: ${name || 'Без имени'}`}
        onClick={onOpenIdentity}
      >
        <span className="mobile-vitals__identity-hint">Основное</span>
        <span className="mobile-vitals__name" title={name || undefined}>
          {name || 'Без имени'}
        </span>
      </button>
      <div className="mobile-vitals__who">
        <CharacterAvatarControl
          character={character}
          size="sm"
          showActions={false}
          onOpen={onOpenIdentity}
          onChanged={onAvatarChanged}
        />
        <div className="mobile-vitals__who-text">
          <span className="mobile-vitals__meta">
            {whoMeta}
            {level ? ` · ур. ${level}` : ''}
          </span>
        </div>
        <button
          type="button"
          className={`mobile-vitals__insp${inspiration ? ' is-on' : ''}`}
          aria-pressed={inspiration}
          title="Вдохновение"
          onClick={onToggleInspiration}
        >
          Вдохн.
        </button>
      </div>

      <div className="mobile-vitals__row" role="list">
        <VitalTile
          as="div"
          role="listitem"
          icon={<IconShield className="play-desk-vital__icon ui-vital__icon" />}
          value={ac}
          label={
            onToggleShield ? (
              <button
                type="button"
                className={`ui-vital__shield-tog play-desk-vital__shield-tog${
                  shieldInHand ? ' is-on' : ''
                }${shieldAvailable || shieldInHand ? '' : ' is-empty'}`}
                aria-pressed={shieldInHand}
                aria-label={
                  shieldInHand ? 'Убрать щит из руки' : 'Взять щит в руку'
                }
                title={
                  shieldInHand
                    ? 'Щит в руке — убрать'
                    : shieldAvailable
                      ? 'Взять щит в руку'
                      : 'Нет щита в инвентаре'
                }
                disabled={!shieldAvailable && !shieldInHand}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleShield()
                }}
              >
                Щит
              </button>
            ) : undefined
          }
          className={`mobile-vitals__ac play-desk-vital--shield${
            shieldInHand ? ' is-shield-on' : ''
          }${onOpenAc ? ' play-desk-vital--clickable' : ''}${
            showValueTips ? ' has-onboarding-tip' : ''
          }`}
          title={
            showValueTips
              ? undefined
              : onOpenAc
                ? `Класс доспеха ${ac}. Открыть разборку`
                : acOverride == null
                  ? `Класс доспеха ${ac}. ${acHint}`
                  : `Класс доспеха ${ac} (вручную)`
          }
          aria-label={
            onOpenAc
              ? `Класс доспеха ${ac}. Открыть разборку`
              : `Класс доспеха ${ac}`
          }
          onClick={() => onOpenAc?.()}
        >
          {showValueTips ? <HoverTipCard tip={VITAL_TIPS.ac} /> : null}
        </VitalTile>
        <VitalTileMenu
          className="mobile-vitals__speed"
          role="listitem"
          icon={<IconBoot className="ui-vital__icon" />}
          value={shownSpeed == null ? '—' : shownSpeed}
          label="Скор."
          badge={altModes.length > 0 ? `+${altModes.length}` : undefined}
          title={
            speedTitle
              ? `${speedTitle}. Нажми — все скорости`
              : 'Скорость не задана'
          }
          aria-label={
            speedTitle
              ? `Скорость: ${speedTitle}. Открыть список скоростей`
              : 'Скорость не задана. Открыть список скоростей'
          }
          menu={
            <SpeedModesMenuBody
              walkFt={shownSpeed}
              climbSpeed={climbSpeed}
              swimSpeed={swimSpeed}
              flySpeed={flySpeed}
              withoutExhaustionLine={withoutExhaustionLine}
              speedExhaustNote={speedExhaustNote}
              onAltSpeedChange={onAltSpeedChange}
              onOpenBreakdown={onOpenSpeed}
              hostDetailsClass="mobile-vitals__speed"
            />
          }
        />
        {jumpLongFt != null && jumpHighFt != null ? (
          <div
            className="mobile-vitals__chip mobile-vitals__chip--jump"
            role="listitem"
            title={formatJumpTitle({ longFt: jumpLongFt, highFt: jumpHighFt })}
            aria-label={`Прыжок: в длину ${jumpLongFt} фт, в высоту ${jumpHighFt} фт`}
          >
            <IconJump className="mobile-vitals__jump-ico" />
            <b>
              {jumpLongFt}
              <span className="mobile-vitals__jump-sep">/</span>
              {jumpHighFt}
            </b>
            <span>{formatJumpFaceLabel()}</span>
          </div>
        ) : null}
        {onOpenInitiative ? (
          <button
            type="button"
            className="mobile-vitals__chip mobile-vitals__chip--btn is-tap"
            role="listitem"
            title={`Инициатива ${formatModifier(initiative)}. Открыть разборку`}
            onClick={onOpenInitiative}
          >
            <b>{formatModifier(initiative)}</b>
            <span>Иниц.</span>
          </button>
        ) : (
          <div className="mobile-vitals__chip" role="listitem">
            <b>{formatModifier(initiative)}</b>
            <span>Иниц.</span>
          </div>
        )}
        <div className="mobile-vitals__chip" role="listitem">
          <b>{formatModifier(proficiencyBonus)}</b>
          <span>БМ</span>
        </div>
      </div>

      <div className="mobile-vitals__hp-row">
        <button
          type="button"
          className={`mobile-vitals__hp${hpPulse ? ' is-pulse' : ''}${
            isDying ? ' is-danger' : ''
          }${showValueTips ? ' has-onboarding-tip' : ''}`}
          onClick={() => setHpPadOpen(true)}
        >
          <span className="mobile-vitals__hp-num">{hpLabel}</span>
          <span className="mobile-vitals__hp-lab">
            {isDying
              ? 'при смерти'
              : play.hpTemp > 0
                ? `Хиты · врем. +${play.hpTemp}`
                : 'Хиты · нажми, чтобы изменить'}
          </span>
          {showValueTips ? <HoverTipCard tip={VITAL_TIPS.hp} /> : null}
        </button>
        <button
          type="button"
          className="mobile-vitals__tool mobile-vitals__tool--coin"
          aria-label={`${formatGpExact(coinsToGp(coins))} зм — кошелёк`}
          title={`${formatGpExact(coinsToGp(coins))} зм`}
          onClick={() => setCoinPadOpen(true)}
        >
          <IconCoin />
          <span className="mobile-vitals__coin-amt">
            {formatGpCompact(coinsToGp(coins))} зм
          </span>
        </button>
        <button
          type="button"
          className="mobile-vitals__tool"
          aria-label="Отдых"
          title="Отдых"
          onClick={onOpenRest}
        >
          <IconRest />
        </button>
      </div>

      {deathCard()}

      {play.exhaustion > 0 ? (
        onOpenConditions ? (
          <button
            type="button"
            className="mobile-vitals__exh mobile-vitals__exh--btn"
            onClick={onOpenConditions}
          >
            Истощение {play.exhaustion} · состояния
          </button>
        ) : (
          <p className="mobile-vitals__exh">Истощение {play.exhaustion}</p>
        )
      ) : null}

      <button
        type="button"
        className="mobile-vitals__abil"
        data-onboarding="abilities"
        onClick={onOpenAbilities}
      >
        {abilityPeek}
      </button>

      <button
        type="button"
        className="mobile-vitals__collapse"
        onClick={() => setCollapsed(true)}
      >
        ▴ Свернуть
      </button>

      {pads()}
    </section>
  )

  function pads() {
    return (
      <>
        <HpPadDialog
          open={hpPadOpen}
          hpCurrent={shownHpCurrent}
          hpMax={shownHpMax}
          hpTemp={play.hpTemp}
          constitutionMod={constitutionMod}
          play={play}
          onClose={() => setHpPadOpen(false)}
          onOpenMaxSettings={() => {
            setHpPadOpen(false)
            setMaxDialogOpen(true)
          }}
          onHeal={applyHeal}
          onDamage={applyDamage}
          onSetTemp={(temp) => onPlayChange({ ...play, hpTemp: Math.max(0, temp) })}
          onPlayChange={onPlayChange}
          onCombatChange={onCombatChange}
          onToast={onToast}
          damageProfile={damageProfile}
          hasEvasion={hasEvasion}
          hasUncannyDodge={hasUncannyDodge}
          heavyArmorMaster={heavyArmorMaster}
          stonesEnduranceReduction={stonesEnduranceReduction}
          hadozeeDodgeReduction={hadozeeDodgeReduction}
          hasShieldMasterEvasion={hasShieldMasterEvasion}
          raceSlug={raceSlug}
          hasParry={hasParry}
          parryReduction={parryReduction}
          onParryUsed={onParryUsed}
          offerShieldReaction={offerShieldReaction}
          onCastShield={onCastShield}
          offerAbsorbElements={offerAbsorbElements}
          onCastAbsorbElements={onCastAbsorbElements}
          offerHellishRebuke={offerHellishRebuke}
          onCastHellishRebuke={onCastHellishRebuke}
          canRedirectToMount={canRedirectToMount}
          mountName={mountName}
          onRedirectDamageToMount={onRedirectDamageToMount}
        />
        <CoinPadDialog
          open={coinPadOpen}
          coins={coins}
          onClose={() => setCoinPadOpen(false)}
          onChange={onCoinsChange}
          onToast={onToast}
        />
        <MaxHpByLevelsDialog
          open={maxDialogOpen}
          classes={classes}
          constitutionMod={constitutionMod}
          hitDie={hitDie}
          hpMax={hpMax}
          hpCurrent={hpCurrent}
          draconicResilience={draconicResilience}
          onClose={() => setMaxDialogOpen(false)}
          onApply={({ hpMax: nextMax, hpCurrent: nextCurrent }) => {
            onCombatChange({ hpMax: nextMax, hpCurrent: nextCurrent })
            setMaxDialogOpen(false)
          }}
        />
      </>
    )
  }
}

function MobileDeathTrack({
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
    <div className="mobile-vitals__death-track" role="group" aria-label={label}>
      <span>{label}</span>
      <div className="mobile-vitals__death-pips">
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
