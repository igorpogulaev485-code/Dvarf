import { useEffect, useRef, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { clampDeathMarks, type HitDie } from '../../shared/dnd/hitDice'
import type { CharacterDetail } from '../../shared/api/characters'
import { formatModifier } from './sheetTypes'
import type { CoinPurse } from '../../shared/dnd/weight'
import type { PlayState } from './play'
import { CharacterAvatarControl } from './CharacterAvatarControl'
import { HpPadDialog } from './HpPadDialog'
import { CoinPadDialog } from './CoinPadDialog'
import { MaxHpByLevelsDialog } from './MaxHpByLevelsDialog'
import { formatJumpTitle } from '../../shared/dnd/jumpDistance'
import { HoverTipCard, VITAL_TIPS } from '../onboarding'
import { IconCoin, IconJump, IconRest, IconSkull } from './deskIcons'

const COLLAPSE_KEY = 'dvarf.mobileVitals.collapsed'

type MobileVitalsBarProps = {
  character: CharacterDetail
  name: string
  raceName: string
  classSummary: string
  alignment: string
  level: number
  hpCurrent: number | null
  hpMax: number | null
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
  /** Alt speeds — shown as tags under walk (desk parity). */
  climbSpeed?: number | null
  swimSpeed?: number | null
  flySpeed?: number | null
  jumpLongFt?: number | null
  jumpHighFt?: number | null
  initiative: number
  onOpenInitiative?: () => void
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
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
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
  play,
  autoAc,
  acOverride,
  acHint,
  onOpenAc,
  shieldInHand = false,
  shieldAvailable = false,
  onToggleShield,
  speed,
  movementHint = null,
  climbSpeed = null,
  swimSpeed = null,
  flySpeed = null,
  jumpLongFt = null,
  jumpHighFt = null,
  initiative,
  onOpenInitiative,
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
  const altModes: { key: string; label: string; value: number }[] = []
  if (climbSpeed != null) altModes.push({ key: 'climb', label: 'лаз.', value: climbSpeed })
  if (swimSpeed != null) altModes.push({ key: 'swim', label: 'плав.', value: swimSpeed })
  if (flySpeed != null) altModes.push({ key: 'fly', label: 'полёт', value: flySpeed })
  const speedTitle =
    [
      speed != null ? `ход ${speed}` : null,
      ...altModes.map((mode) => `${mode.label} ${mode.value}`),
      movementHint,
    ]
      .filter(Boolean)
      .join(' · ') || undefined
  const hpLabel =
    hpCurrent == null && hpMax == null
      ? '—/—'
      : `${hpCurrent ?? '—'}/${hpMax ?? '—'}`
  const isDying = play.isDying || (hpCurrent != null && hpCurrent <= 0)
  const abilityPeek = 'Характеристики ▸'

  function applyHeal(amount: number) {
    const max = hpMax
    const cur = hpCurrent ?? 0
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

  function applyDamage(amount: number) {
    let left = Math.max(0, amount)
    let temp = play.hpTemp
    if (temp > 0) {
      const soak = Math.min(temp, left)
      temp -= soak
      left -= soak
    }
    const cur = hpCurrent ?? 0
    const next = Math.max(0, cur - left)
    onPlayChange({ ...play, hpTemp: temp })
    onCombatChange({ hpCurrent: next })
    if (left > 0) onDamaged?.(left)
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
        >
          {isDying ? (
            <span className="mobile-vitals__collapse-death">
              <IconSkull className="mobile-vitals__collapse-skull" />
              {hpLabel}
            </span>
          ) : (
            hpLabel
          )}
          {showValueTips ? <HoverTipCard tip={VITAL_TIPS.hp} /> : null}
        </button>
        <button
          type="button"
          className="mobile-vitals__collapse-abil"
          data-onboarding="abilities"
          onClick={onOpenAbilities}
        >
          СИЛ
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
    <section className="mobile-vitals" aria-label="Боевой статус">
      <div className="mobile-vitals__who">
        <CharacterAvatarControl
          character={character}
          size="sm"
          showActions={false}
          onOpen={onOpenIdentity}
          onChanged={onAvatarChanged}
        />
        <button type="button" className="mobile-vitals__who-text" onClick={onOpenIdentity}>
          <span className="mobile-vitals__name">{name || 'Без имени'}</span>
          <span className="mobile-vitals__meta">
            {whoMeta}
            {level ? ` · ур. ${level}` : ''}
          </span>
        </button>
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
        <div
          className={`mobile-vitals__chip mobile-vitals__chip--ac${
            shieldInHand ? ' is-shield-on' : ''
          }${onOpenAc ? ' is-tap' : ''}${showValueTips ? ' has-onboarding-tip' : ''}`}
          role="listitem"
        >
          <button
            type="button"
            className="mobile-vitals__chip-main"
            title={
              showValueTips
                ? undefined
                : onOpenAc
                  ? `Класс защиты ${ac}. Открыть разборку`
                  : acOverride == null
                    ? acHint
                    : 'вручную'
            }
            disabled={!onOpenAc}
            onClick={() => onOpenAc?.()}
          >
            <b>{ac}</b>
            <span>КД</span>
          </button>
          {showValueTips ? <HoverTipCard tip={VITAL_TIPS.ac} /> : null}
          {onToggleShield ? (
            <button
              type="button"
              className={`mobile-vitals__shield-tog${shieldInHand ? ' is-on' : ''}${
                shieldAvailable || shieldInHand ? '' : ' is-empty'
              }`}
              aria-pressed={shieldInHand}
              aria-label={shieldInHand ? 'Убрать щит из руки' : 'Взять щит в руку'}
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
              щит
            </button>
          ) : null}
        </div>
        <div
          className={`mobile-vitals__chip${altModes.length ? ' mobile-vitals__chip--speed' : ''}`}
          role="listitem"
          title={speedTitle}
        >
          <b>{speed == null && altModes[0] ? altModes[0].value : speed == null ? '—' : speed}</b>
          <span>
            {speed == null && altModes[0] ? altModes[0].label : 'Скор.'}
          </span>
          {altModes.length > 0 && speed != null ? (
            <ul className="mobile-vitals__modes" aria-label="Дополнительные скорости">
              {altModes.map((mode) => (
                <li key={mode.key}>
                  {mode.label} {mode.value}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {jumpLongFt != null && jumpHighFt != null ? (
          <div
            className="mobile-vitals__chip mobile-vitals__chip--jump"
            role="listitem"
            title={formatJumpTitle({ longFt: jumpLongFt, highFt: jumpHighFt })}
            aria-label={`Прыжок: длинный ${jumpLongFt} фт, высокий ${jumpHighFt} фт`}
          >
            <IconJump className="mobile-vitals__jump-ico" />
            <b>
              {jumpLongFt}
              <span className="mobile-vitals__jump-sep">/</span>
              {jumpHighFt}
            </b>
            <span>Прыж.</span>
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
                : 'Хиты · tap → pad'}
          </span>
          {showValueTips ? <HoverTipCard tip={VITAL_TIPS.hp} /> : null}
        </button>
        <button
          type="button"
          className="mobile-vitals__tool"
          aria-label="Монеты"
          title="Монеты"
          onClick={() => setCoinPadOpen(true)}
        >
          <IconCoin />
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
          hpCurrent={hpCurrent}
          hpMax={hpMax}
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
