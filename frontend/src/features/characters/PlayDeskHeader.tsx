import { useEffect, useRef, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { conditionLevelLabel } from '../../shared/dnd/conditions'
import { clampExhaustion } from '../../shared/dnd/rest'
import { formatXp, xpProgress, xpToReachLevel } from '../../shared/dnd/experience'
import { clampDeathMarks, type HitDie } from '../../shared/dnd/hitDice'
import { formatRaceMovementHint } from '../../shared/dnd/raceGrants'
import {
  coinsToGp,
  formatCoinBreakdown,
  formatGpTotal,
  type CoinPurse,
} from '../../shared/dnd/weight'
import { NumberPadDialog } from '../../ui'
import { CoinPadDialog } from './CoinPadDialog'
import { HpPadDialog } from './HpPadDialog'
import { MaxHpByLevelsDialog } from './MaxHpByLevelsDialog'
import type { XpHistoryEntry } from './playDeskUi'
import type { PlayState } from './play'
import { formatModifier } from './sheetTypes'

type PlayDeskHeaderProps = {
  name: string
  raceName: string
  className: string
  alignment?: string
  level: number
  experience: number
  classes: ClassLevelEntry[]
  hitDie: HitDie | null
  constitutionMod: number
  hpCurrent: number | null
  hpMax: number | null
  play: PlayState
  autoAc: number
  acHint: string
  speed: number | null
  /** Extra walk-speed note (e.g. gear bonus) for title tooltip. */
  movementHint?: string | null
  /** Alt speeds shown under walk when present. */
  climbSpeed?: number | null
  swimSpeed?: number | null
  flySpeed?: number | null
  proficiencyBonus: number
  initiative: number
  inspiration: boolean
  coins: CoinPurse
  xpHistory: XpHistoryEntry[]
  onOpenRest: () => void
  onOpenIdentity?: () => void
  onExperienceChange: (experience: number, meta?: { reason: string }) => void
  onToggleInspiration: () => void
  onExhaustionChange: (exhaustion: number) => void
  onInitiativeRoll?: () => void
  onPlayChange: (play: PlayState) => void
  onCoinsChange: (coins: CoinPurse) => void
  onCombatChange: (patch: {
    hpCurrent?: number | null
    hpMax?: number | null
  }) => void
  onToast: (message: string) => void
  /** Called after real HP damage (after temp soak), for concentration check. */
  onDamaged?: (damageToHp: number) => void
}

export function PlayDeskHeader({
  name,
  raceName,
  className,
  alignment = '',
  level,
  experience,
  classes,
  hitDie,
  constitutionMod,
  hpCurrent,
  hpMax,
  play,
  autoAc,
  acHint,
  speed,
  movementHint = null,
  climbSpeed = null,
  swimSpeed = null,
  flySpeed = null,
  proficiencyBonus,
  initiative,
  inspiration,
  coins,
  xpHistory,
  onOpenRest,
  onOpenIdentity,
  onExperienceChange,
  onToggleInspiration,
  onExhaustionChange,
  onInitiativeRoll,
  onPlayChange,
  onCoinsChange,
  onCombatChange,
  onToast,
  onDamaged,
}: PlayDeskHeaderProps) {
  const whoLine = [raceName, className].filter(Boolean).join(' — ') || 'Черновик'
  const alignmentLabel = alignment.trim()
  const subtitleBits = [whoLine, alignmentLabel || null, '2014'].filter(Boolean)
  const xp = xpProgress(experience, level)
  const [hpPulse, setHpPulse] = useState(false)
  const [hpPadOpen, setHpPadOpen] = useState(false)
  const [xpPadOpen, setXpPadOpen] = useState(false)
  const [coinPadOpen, setCoinPadOpen] = useState(false)
  const [xpHistoryOpen, setXpHistoryOpen] = useState(false)
  const [xpReason, setXpReason] = useState('')
  const [maxDialogOpen, setMaxDialogOpen] = useState(false)
  const prevHpRef = useRef(hpCurrent)

  useEffect(() => {
    const prev = prevHpRef.current
    prevHpRef.current = hpCurrent
    if (prev == null || hpCurrent == null) return
    if (hpCurrent <= prev) return
    setHpPulse(true)
    const timer = window.setTimeout(() => setHpPulse(false), 900)
    return () => window.clearTimeout(timer)
  }, [hpCurrent])

  useEffect(() => {
    if (!xpPadOpen) setXpReason('')
  }, [xpPadOpen])

  const xpLabel =
    xp.nextThreshold == null ? `${xp.xp}` : `${xp.xp}/${xp.nextThreshold}`
  const nextLevel = xp.level >= 20 ? null : xp.level + 1
  const hpTemp = play.hpTemp
  const showDeath = play.isDying || (hpCurrent != null && hpCurrent <= 0)
  const exhaustionStage =
    play.exhaustion > 0 ? conditionLevelLabel('exhaustion', play.exhaustion) : null
  const altSpeedHint = formatRaceMovementHint({
    climb: climbSpeed,
    swim: swimSpeed,
    fly: flySpeed,
  })
  const speedTitle =
    [altSpeedHint, movementHint].filter(Boolean).join(' · ') ||
    'Скорость (из расы / снаряжения)'

  function applyHeal(amount: number) {
    const current = hpCurrent ?? 0
    const next = current + amount
    const capped = hpMax == null ? next : Math.min(hpMax, next)
    onCombatChange({ hpCurrent: Math.max(0, capped) })
    if (play.isDying && capped > 0) {
      onPlayChange({
        ...play,
        isDying: false,
        deathSuccesses: 0,
        deathFails: 0,
      })
    }
  }

  function applyDamage(amount: number) {
    let remaining = Math.max(0, amount)
    let nextTemp = hpTemp
    if (nextTemp > 0 && remaining > 0) {
      const absorbed = Math.min(nextTemp, remaining)
      nextTemp -= absorbed
      remaining -= absorbed
    }
    const current = hpCurrent ?? 0
    const nextHp = Math.max(0, current - remaining)
    if (nextTemp !== hpTemp) {
      onPlayChange({ ...play, hpTemp: nextTemp })
    }
    onCombatChange({ hpCurrent: nextHp })
    if (remaining > 0) {
      onDamaged?.(remaining)
    }
    if (nextHp <= 0 && !play.isDying) {
      onToast('HP ≤ 0 — спасброски смерти в шапке или в pad хитов')
    }
  }

  return (
    <section className="play-desk-header" aria-label="Шапка стола">
      <div className="play-desk-header__who">
        <h1 className="play-desk-header__name">{name || 'Без имени'}</h1>
        {onOpenIdentity ? (
          <button
            type="button"
            className="play-desk-header__sub play-desk-header__sub--btn"
            title={
              alignmentLabel
                ? 'Открыть основное (мировоззрение, предыстория…)'
                : 'Мировоззрение не задано — нажми, чтобы указать'
            }
            onClick={onOpenIdentity}
          >
            {whoLine}
            {alignmentLabel ? (
              <>
                {' · '}
                <span className="play-desk-header__alignment">{alignmentLabel}</span>
              </>
            ) : (
              <>
                {' · '}
                <span className="play-desk-header__alignment is-empty">мировоззрение</span>
              </>
            )}
            {' · 2014'}
          </button>
        ) : (
          <p className="play-desk-header__sub">{subtitleBits.join(' · ')}</p>
        )}
        <button
          type="button"
          className="play-desk-header__xp"
          title={`Опыт ${xpLabel}. Нажми, чтобы начислить или убавить`}
          aria-label={`Опыт ${formatXp(xp.xp)}. Открыть клавиатуру`}
          onClick={() => setXpPadOpen(true)}
        >
          <span>ур. {level}</span>
          <div className="play-desk-header__xp-bar" aria-hidden>
            <i style={{ width: `${Math.round(xp.ratio * 100)}%` }} />
          </div>
          <span>{xpLabel}</span>
        </button>
      </div>

      <div className="play-desk-header__mid">
        <div className="play-desk-header__vitals">
          <div className="play-desk-vital play-desk-vital--shield" title={acHint}>
            <b>{autoAc}</b>
            <span>КД</span>
          </div>
          <div
            className={`play-desk-vital${altSpeedHint ? ' play-desk-vital--speed' : ''}`}
            title={speedTitle}
          >
            <b>{speed ?? '—'}</b>
            <span>Скор.</span>
            {altSpeedHint ? (
              <small className="play-desk-vital__alt-speed">{altSpeedHint}</small>
            ) : null}
          </div>
          {onInitiativeRoll ? (
            <button
              type="button"
              className="play-desk-vital"
              title="Бросок инициативы (значение считается автоматически)"
              onClick={onInitiativeRoll}
            >
              <b>{formatModifier(initiative)}</b>
              <span>Иниц.</span>
            </button>
          ) : (
            <div className="play-desk-vital" title="Инициатива (авто)">
              <b>{formatModifier(initiative)}</b>
              <span>Иниц.</span>
            </div>
          )}
          <div className="play-desk-vital" title="Бонус мастерства (от уровня)">
            <b>{formatModifier(proficiencyBonus)}</b>
            <span>БМ</span>
          </div>
        </div>
        <div className="play-desk-header__play">
          <button
            type="button"
            className={`play-desk-header__chip${inspiration ? ' is-on' : ''}`}
            onClick={onToggleInspiration}
            aria-pressed={inspiration}
            title="Вдохновение — нажми, чтобы переключить"
          >
            <span>Вдохн.</span>
            <b>{inspiration ? 'да' : '—'}</b>
          </button>
          <button
            type="button"
            className={`play-desk-header__chip${play.exhaustion > 0 ? ' is-warn' : ''}`}
            title={
              exhaustionStage
                ? `Истощение ${play.exhaustion}: ${exhaustionStage}`
                : 'Истощение — нажми, чтобы изменить уровень (0–6)'
            }
            onClick={() => {
              const next = play.exhaustion >= 6 ? 0 : play.exhaustion + 1
              onExhaustionChange(clampExhaustion(next))
            }}
          >
            <span>Истощ.</span>
            <b>{play.exhaustion}</b>
          </button>
          {exhaustionStage ? (
            <span className="play-desk-header__exh-hint" title={exhaustionStage}>
              {exhaustionStage}
            </span>
          ) : null}
        </div>
      </div>

      <div className="play-desk-header__right">
        <button
          type="button"
          className="play-desk-header__coin"
          title={`Всего ≈ ${formatGpTotal(coinsToGp(coins))} зм (${formatCoinBreakdown(coins)}). Нажми — взять / отдать`}
          onClick={() => setCoinPadOpen(true)}
        >
          {formatGpTotal(coinsToGp(coins))} зм
        </button>
        <button type="button" className="play-desk-header__rest" onClick={onOpenRest}>
          ✦ Отдых
        </button>
        <div className="play-desk-header__hp-wrap">
          <button
            type="button"
            className={`play-desk-header__hp${hpPulse ? ' is-pulse' : ''}`}
            title={hpTemp > 0 ? `врем. +${hpTemp}` : 'Хиты — лечение, урон, кости, смерть'}
            onClick={() => setHpPadOpen(true)}
          >
            <strong>
              {hpCurrent ?? '—'} / {hpMax ?? '—'}
            </strong>
            <small>
              хиты
              {hpTemp > 0 ? ` · врем. +${hpTemp}` : ''}
            </small>
          </button>
          {showDeath ? (
            <div className="play-desk-header__death" aria-label="Спасброски от смерти">
              <button
                type="button"
                className={`play-desk-header__dying-toggle${play.isDying ? ' is-on' : ''}`}
                onClick={() =>
                  onPlayChange({
                    ...play,
                    isDying: !play.isDying,
                    deathSuccesses: play.isDying ? 0 : play.deathSuccesses,
                    deathFails: play.isDying ? 0 : play.deathFails,
                  })
                }
              >
                {play.isDying ? 'При смерти' : 'Смерть'}
              </button>
              <div
                className={`play-desk-header__death-tracks${play.isDying ? '' : ' is-dim'}`}
              >
                <HeaderDeathTrack
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
                <HeaderDeathTrack
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
            </div>
          ) : null}
        </div>
      </div>

      <HpPadDialog
        open={hpPadOpen}
        hpCurrent={hpCurrent}
        hpMax={hpMax}
        hpTemp={hpTemp}
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
      />

      <CoinPadDialog
        open={coinPadOpen}
        coins={coins}
        onClose={() => setCoinPadOpen(false)}
        onChange={onCoinsChange}
        onToast={onToast}
      />

      <NumberPadDialog
        open={xpPadOpen}
        title="Опыт"
        current={xp.xp}
        min={0}
        formatValue={formatXp}
        addLabel="Начислить"
        subtractLabel="Убавить"
        onClose={() => setXpPadOpen(false)}
        onAdd={(delta) => onExperienceChange(xp.xp + delta, { reason: xpReason })}
        onSubtract={(delta) =>
          onExperienceChange(Math.max(0, xp.xp - delta), { reason: xpReason })
        }
        header={
          <div className="xp-pad-header">
            <div className="xp-pad-header__ends">
              <div className="xp-pad-header__end">
                <strong>{xp.level}</strong>
                <span>{formatXp(xp.floor)}</span>
              </div>
              <div className="xp-pad-header__end xp-pad-header__end--right">
                <strong>{nextLevel ?? '20'}</strong>
                <span>
                  {xp.nextThreshold == null ? '—' : formatXp(xp.nextThreshold)}
                </span>
              </div>
            </div>
            <div
              className="xp-progress__bar xp-pad-header__bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(xp.ratio * 100)}
            >
              <div className="xp-progress__fill" style={{ width: `${xp.ratio * 100}%` }} />
            </div>
            <p className="xp-pad-header__current">
              сейчас {formatXp(xp.xp)}
              {xp.nextThreshold != null
                ? ` · порог ${formatXp(xpToReachLevel(xp.level + 1))}`
                : ''}
            </p>
            <label className="xp-pad-header__reason">
              За что
              <input
                type="text"
                value={xpReason}
                placeholder="бой, квест, награда…"
                onChange={(event) => setXpReason(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="linkish xp-pad-header__history-btn"
              onClick={() => setXpHistoryOpen((open) => !open)}
            >
              {xpHistoryOpen ? 'Скрыть историю' : `История (${xpHistory.length})`}
            </button>
            {xpHistoryOpen ? (
              <ul className="xp-pad-header__history">
                {xpHistory.length === 0 ? (
                  <li className="xp-pad-header__history-empty">Пока пусто</li>
                ) : (
                  xpHistory.slice(0, 12).map((row) => (
                    <li key={row.id}>
                      <strong>
                        {row.delta > 0 ? '+' : ''}
                        {formatXp(row.delta)}
                      </strong>
                      <span>{row.reason || 'без описания'}</span>
                      <time dateTime={row.at}>
                        {new Date(row.at).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
        }
      />

      <MaxHpByLevelsDialog
        open={maxDialogOpen}
        classes={classes}
        constitutionMod={constitutionMod}
        hitDie={hitDie}
        hpMax={hpMax}
        hpCurrent={hpCurrent}
        onClose={() => setMaxDialogOpen(false)}
        onApply={({ hpMax: nextMax, hpCurrent: nextCurrent }) => {
          onCombatChange({ hpMax: nextMax, hpCurrent: nextCurrent })
          setMaxDialogOpen(false)
        }}
      />
    </section>
  )
}

function HeaderDeathTrack({
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
    <div className="play-desk-header__death-track" role="group" aria-label={label}>
      <span>{label}</span>
      <div className="play-desk-header__death-pips">
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
