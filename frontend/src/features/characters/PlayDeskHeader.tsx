import { useEffect, useRef, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { xpProgress } from '../../shared/dnd/experience'
import type { HitDie } from '../../shared/dnd/hitDice'
import { NumberPadDialog } from '../../ui'
import { MaxHpByLevelsDialog } from './MaxHpByLevelsDialog'
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
  hpTemp: number
  acOverride: number | null
  autoAc: number
  acHint: string
  speed: number | null
  movementHint?: string | null
  proficiencyBonus: number
  goldGp: number
  isDying: boolean
  deathSuccesses: number
  deathFails: number
  onOpenRest: () => void
  onChange: (patch: {
    hpCurrent?: number | null
    hpMax?: number | null
    ac?: number | null
    speed?: number | null
  }) => void
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
  hpTemp,
  acOverride,
  autoAc,
  acHint,
  speed,
  movementHint = null,
  proficiencyBonus,
  goldGp,
  isDying,
  deathSuccesses,
  deathFails,
  onOpenRest,
  onChange,
}: PlayDeskHeaderProps) {
  const subtitle = [raceName, className].filter(Boolean).join(' — ') || 'Черновик'
  const xp = xpProgress(experience, level)
  const acValue = acOverride ?? autoAc
  const acTitle = acOverride == null ? acHint : 'задано вручную'
  const [hpPulse, setHpPulse] = useState(false)
  const [currentPadOpen, setCurrentPadOpen] = useState(false)
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

  const currentValue = hpCurrent ?? 0
  const maxValue = hpMax
  const xpLabel =
    xp.nextThreshold == null
      ? `${xp.xp}`
      : `${xp.xp}/${xp.nextThreshold}`

  return (
    <section className="play-desk-header" aria-label="Шапка стола">
      <div className="play-desk-header__who">
        <h1 className="play-desk-header__name">{name || 'Без имени'}</h1>
        <p className="play-desk-header__sub">
          {subtitle} · 2014
        </p>
        <div className="play-desk-header__xp" title={`Опыт ${xpLabel}`}>
          <span>ур. {level}</span>
          <div className="play-desk-header__xp-bar" aria-hidden>
            <i style={{ width: `${Math.round(xp.ratio * 100)}%` }} />
          </div>
          <span>{xpLabel}</span>
        </div>
        {isDying ? (
          <p className="play-desk-header__dying">
            Смерть {deathSuccesses}/{deathFails}
          </p>
        ) : null}
      </div>

      <div className="play-desk-header__vitals">
        <button
          type="button"
          className="play-desk-vital play-desk-vital--shield"
          title={acTitle}
          onClick={() => {
            const next = window.prompt('КД (пусто = авто)', String(acValue))
            if (next == null) return
            const trimmed = next.trim()
            if (!trimmed) {
              onChange({ ac: null })
              return
            }
            const n = Number(trimmed)
            if (!Number.isFinite(n)) return
            onChange({ ac: n === autoAc ? null : Math.floor(n) })
          }}
        >
          <b>{acValue}</b>
          <span>КД</span>
        </button>
        <div className="play-desk-vital" title={movementHint || undefined}>
          <b>{speed ?? '—'}</b>
          <span>Скор.</span>
        </div>
        <div className="play-desk-vital">
          <b>{formatModifier(proficiencyBonus)}</b>
          <span>Маст.</span>
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
          title={hpTemp > 0 ? `врем. +${hpTemp}` : 'Хиты'}
          onClick={() => setCurrentPadOpen(true)}
        >
          <strong>
            {hpCurrent ?? '—'} / {hpMax ?? '—'}
          </strong>
          <small>
            хиты
            {hpTemp > 0 ? ` · врем. +${hpTemp}` : ''}
          </small>
        </button>
        <button
          type="button"
          className="play-desk-header__hp-max"
          onClick={() => setMaxDialogOpen(true)}
          title="Максимум HP по уровням"
        >
          макс.
        </button>
      </div>

      <NumberPadDialog
        open={currentPadOpen}
        title="Текущие HP"
        current={currentValue}
        min={0}
        max={maxValue ?? undefined}
        addLabel="Вылечить"
        subtractLabel="Урон"
        onClose={() => setCurrentPadOpen(false)}
        onAdd={(delta) => {
          const next = currentValue + delta
          const capped = maxValue == null ? next : Math.min(maxValue, next)
          onChange({ hpCurrent: Math.max(0, capped) })
        }}
        onSubtract={(delta) => {
          onChange({ hpCurrent: Math.max(0, currentValue - delta) })
        }}
        header={
          <p className="combat-hp-pad-header">
            сейчас {hpCurrent ?? 0}
            {hpMax != null ? ` / ${hpMax}` : ' · макс не задан'}
            {hpTemp > 0 ? ` · врем. +${hpTemp}` : ''}
          </p>
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
          onChange({ hpMax: nextMax, hpCurrent: nextCurrent })
          setMaxDialogOpen(false)
        }}
      />
    </section>
  )
}
