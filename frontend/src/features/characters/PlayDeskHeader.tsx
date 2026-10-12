import { useEffect, useRef, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { clampExhaustion } from '../../shared/dnd/rest'
import { formatXp, xpProgress, xpToReachLevel } from '../../shared/dnd/experience'
import type { HitDie } from '../../shared/dnd/hitDice'
import { NumberPadDialog } from '../../ui'
import { HpPadDialog } from './HpPadDialog'
import { MaxHpByLevelsDialog } from './MaxHpByLevelsDialog'
import type { PlayState } from './play'
import { formatModifier } from './sheetTypes'

type PlayDeskHeaderProps = {
  name: string
  raceName: string
  className: string
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
  movementHint?: string | null
  proficiencyBonus: number
  initiative: number
  inspiration: boolean
  goldGp: number
  onOpenRest: () => void
  onExperienceChange: (experience: number) => void
  onToggleInspiration: () => void
  onExhaustionChange: (exhaustion: number) => void
  onInitiativeRoll?: () => void
  onPlayChange: (play: PlayState) => void
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
  proficiencyBonus,
  initiative,
  inspiration,
  goldGp,
  onOpenRest,
  onExperienceChange,
  onToggleInspiration,
  onExhaustionChange,
  onInitiativeRoll,
  onPlayChange,
  onCombatChange,
  onToast,
  onDamaged,
}: PlayDeskHeaderProps) {
  const subtitle = [raceName, className].filter(Boolean).join(' — ') || 'Черновик'
  const xp = xpProgress(experience, level)
  const [hpPulse, setHpPulse] = useState(false)
  const [hpPadOpen, setHpPadOpen] = useState(false)
  const [xpPadOpen, setXpPadOpen] = useState(false)
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

  const xpLabel =
    xp.nextThreshold == null ? `${xp.xp}` : `${xp.xp}/${xp.nextThreshold}`
  const nextLevel = xp.level >= 20 ? null : xp.level + 1
  const hpTemp = play.hpTemp

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
      onToast('HP ≤ 0 — включи «При смерти» в pad хитов, если идёт стабилизация')
    }
  }

  return (
    <section className="play-desk-header" aria-label="Шапка стола">
      <div className="play-desk-header__who">
        <h1 className="play-desk-header__name">{name || 'Без имени'}</h1>
        <p className="play-desk-header__sub">{subtitle} · 2014</p>
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
        {play.isDying ? (
          <p className="play-desk-header__dying">
            Смерть {play.deathSuccesses}/{play.deathFails}
          </p>
        ) : null}
      </div>

      <div className="play-desk-header__mid">
        <div className="play-desk-header__vitals">
          <div className="play-desk-vital play-desk-vital--shield" title={acHint}>
            <b>{autoAc}</b>
            <span>КД</span>
          </div>
          <div className="play-desk-vital" title={movementHint || 'Скорость (из расы / снаряжения)'}>
            <b>{speed ?? '—'}</b>
            <span>Скор.</span>
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
            title="Истощение — нажми, чтобы изменить уровень (0–6)"
            onClick={() => {
              const next = play.exhaustion >= 6 ? 0 : play.exhaustion + 1
              onExhaustionChange(clampExhaustion(next))
            }}
          >
            <span>Истощ.</span>
            <b>{play.exhaustion}</b>
          </button>
        </div>
      </div>

      <div className="play-desk-header__right">
        <div className="play-desk-header__coin" title="Золото (зм)">
          {goldGp} зм
        </div>
        <button type="button" className="play-desk-header__rest" onClick={onOpenRest}>
          ✦ Отдых
        </button>
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

      <NumberPadDialog
        open={xpPadOpen}
        title="Опыт"
        current={xp.xp}
        min={0}
        formatValue={formatXp}
        onClose={() => setXpPadOpen(false)}
        onAdd={(delta) => onExperienceChange(xp.xp + delta)}
        onSubtract={(delta) => onExperienceChange(Math.max(0, xp.xp - delta))}
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
