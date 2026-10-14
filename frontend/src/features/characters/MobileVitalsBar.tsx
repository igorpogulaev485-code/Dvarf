import { useEffect, useRef, useState } from 'react'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import type { HitDie } from '../../shared/dnd/hitDice'
import type { CharacterDetail } from '../../shared/api/characters'
import { formatModifier } from './sheetTypes'
import type { CoinPurse } from '../../shared/dnd/weight'
import type { PlayState } from './play'
import { CharacterAvatarControl } from './CharacterAvatarControl'
import { HpPadDialog } from './HpPadDialog'
import { CoinPadDialog } from './CoinPadDialog'
import { MaxHpByLevelsDialog } from './MaxHpByLevelsDialog'
import { IconCoin, IconRest } from './deskIcons'

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
  speed: number | null
  movementHint?: string | null
  initiative: number
  proficiencyBonus: number
  inspiration: boolean
  coins: CoinPurse
  constitutionMod: number
  classes: ClassLevelEntry[]
  hitDie: HitDie | null
  onOpenIdentity: () => void
  onOpenAbilities: () => void
  onOpenRest: () => void
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
  speed,
  movementHint = null,
  initiative,
  proficiencyBonus,
  inspiration,
  coins,
  constitutionMod,
  classes,
  hitDie,
  onOpenIdentity,
  onOpenAbilities,
  onOpenRest,
  onToggleInspiration,
  onAvatarChanged,
  onPlayChange,
  onCoinsChange,
  onCombatChange,
  onDamaged,
  onToast,
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
    onCombatChange({ hpCurrent: Math.max(0, next) })
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
          }`}
          onClick={() => setHpPadOpen(true)}
        >
          {hpLabel}
        </button>
        <button
          type="button"
          className="mobile-vitals__collapse-abil"
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
        <div className="mobile-vitals__chip" role="listitem" title={acOverride == null ? acHint : 'вручную'}>
          <b>{ac}</b>
          <span>КД</span>
        </div>
        <div
          className="mobile-vitals__chip"
          role="listitem"
          title={movementHint || undefined}
        >
          <b>{speed == null ? '—' : speed}</b>
          <span>Скор.</span>
        </div>
        <div className="mobile-vitals__chip" role="listitem">
          <b>{formatModifier(initiative)}</b>
          <span>Иниц.</span>
        </div>
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
          }`}
          onClick={() => setHpPadOpen(true)}
        >
          <span className="mobile-vitals__hp-num">{hpLabel}</span>
          <span className="mobile-vitals__hp-lab">
            {isDying
              ? `Смерть ${play.deathSuccesses}/${play.deathFails}`
              : play.hpTemp > 0
                ? `Хиты · врем. +${play.hpTemp}`
                : 'Хиты · tap → pad'}
          </span>
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

      {play.exhaustion > 0 ? (
        <p className="mobile-vitals__exh">Истощение {play.exhaustion}</p>
      ) : null}

      <button
        type="button"
        className="mobile-vitals__abil"
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
