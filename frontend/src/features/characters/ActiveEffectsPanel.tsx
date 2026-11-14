/** Блок «Активные эффекты» на листе цели (B-01 / B-02 / B-03). */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  applyEffectStacking,
  decrementEffectCharges,
  formatEffectChipDetails,
  formatEffectChipFace,
  tickAllEffectsOneRound,
  type ActiveEffect,
} from '../../shared/dnd/activeEffects'
import { Button, DetailsMenu } from '../../ui'
import { rollDamage } from './deskRolls'

type Props = {
  effects: ActiveEffect[]
  onChange: (effects: ActiveEffect[]) => void
  onToast?: (message: string) => void
  /** Heroism: grant temp HP equal to caster mod at start of turn. */
  onHeroismTurnStart?: () => void
}

function EffectChip({
  effect,
  open,
  onToggleOpen,
  onChange,
  onToast,
  rows,
}: {
  effect: ActiveEffect
  open: boolean
  onToggleOpen: () => void
  onChange: (effects: ActiveEffect[]) => void
  onToast?: (message: string) => void
  rows: ActiveEffect[]
}) {
  const face = formatEffectChipFace(effect)
  const details = formatEffectChipDetails(effect)
  const detailText = details.join(' · ')
  const inactive = Boolean(effect.inactive)
  const charges = typeof effect.charges === 'number' ? effect.charges : null
  const mirror = effect.slug === 'mirror_image'
  const vitality = effect.slug === 'aura_of_vitality'
  const blink = effect.slug === 'blink'
  const fortune = effect.slug === 'fortunes_favor'

  return (
    <div
      className={`active-effects__chip${inactive ? ' is-inactive' : ''}${
        open ? ' is-tip-open' : ''
      }`}
      role="listitem"
    >
      <button
        type="button"
        className="active-effects__chip-text"
        title={detailText || face}
        aria-expanded={open}
        aria-label={detailText ? `${face}. ${detailText}` : face}
        onClick={onToggleOpen}
      >
        <strong>{face}</strong>
      </button>
      {details.length > 0 ? (
        <div className="active-effects__tip" role="tooltip">
          {details.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      ) : null}
      <span className="active-effects__chip-actions">
        {mirror && !inactive ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              const next = decrementEffectCharges(rows, effect.id, 1)
              onChange(next)
              const left = next.find((row) => row.id === effect.id)?.charges
              onToast?.(
                left == null
                  ? 'Отражения: двойники исчерпаны'
                  : `Отражения: двойники ${left}`,
              )
            }}
          >
            −1
          </Button>
        ) : null}
        {vitality && !inactive ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              const rolled = rollDamage('2d6')
              const next = decrementEffectCharges(rows, effect.id, 1)
              onChange(next)
              onToast?.(
                rolled
                  ? `Аура живучести: +${rolled.total} хитов (${rolled.detail})`
                  : 'Аура живучести: 2к6 хитов',
              )
            }}
          >
            2к6
          </Button>
        ) : null}
        {blink && !inactive ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              const die = 1 + Math.floor(Math.random() * 20)
              onToast?.(
                die >= 11
                  ? `Мерцание: ${die} · уход на Эфир до начала следующего хода`
                  : `Мерцание: ${die} · остаётесь на Материальном`,
              )
            }}
          >
            к20
          </Button>
        ) : null}
        {fortune && !inactive && (charges ?? 0) > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              onChange(decrementEffectCharges(rows, effect.id, 1))
              onToast?.(
                'Благосклонность судьбы: очко удачи потрачено (переброс / запасная кость — по правилу EGW)',
              )
            }}
          >
            Удача
          </Button>
        ) : null}
        {effect.source_character_id &&
        (effect.slug?.startsWith('aura_of_') || effect.slug === 'exalted_champion') ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              const next = rows.map((row) => {
                if (row.id !== effect.id) return row
                const on = Boolean(row.inactive)
                return {
                  ...row,
                  inactive: on ? false : true,
                  inactive_reason: on ? null : 'вне ауры',
                }
              })
              onChange(next)
              const nowOn = next.find((row) => row.id === effect.id)
              onToast?.(
                nowOn && !nowOn.inactive
                  ? `${effect.name}: в ауре`
                  : `${effect.name}: вне ауры`,
              )
            }}
          >
            {effect.inactive ? 'В ауре' : 'Вне ауры'}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={`Снять «${effect.name}»`}
          title="Снять"
          onClick={() => {
            onChange(rows.filter((row) => row.id !== effect.id))
            onToast?.(`Снят эффект «${effect.name}»`)
          }}
        >
          ×
        </Button>
      </span>
    </div>
  )
}

export function ActiveEffectsPanel({
  effects,
  onChange,
  onToast,
  onHeroismTurnStart,
}: Props) {
  const [openTipId, setOpenTipId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState<number | null>(null)
  const chipsRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)
  const rows = applyEffectStacking(effects ?? [])
  const rowKey = rows.map((r) => r.id).join('|')
  const hasHeroism = rows.some((row) => row.slug === 'heroism' && !row.inactive)
  const shown =
    visibleCount == null || visibleCount >= rows.length
      ? rows
      : rows.slice(0, Math.max(1, visibleCount))
  const overflow =
    visibleCount != null && visibleCount < rows.length
      ? rows.slice(Math.max(1, visibleCount))
      : []

  useLayoutEffect(() => {
    if (rows.length === 0) {
      setVisibleCount(null)
      return
    }
    const host = chipsRef.current
    const measure = measureRef.current
    if (!host || !measure) return

    const recompute = () => {
      const hostW = host.clientWidth
      if (hostW > 0) {
        measure.style.setProperty('--active-effects-measure-w', `${hostW}px`)
      }
      const chips = Array.from(
        measure.querySelectorAll<HTMLElement>('[data-effect-measure]'),
      )
      if (chips.length === 0) {
        setVisibleCount(rows.length)
        return
      }
      const rowTop = chips[0].offsetTop
      let fit = 0
      for (const chip of chips) {
        if (chip.offsetTop > rowTop + 1) break
        fit += 1
      }
      // Reserve room for +N + round button when anything would wrap.
      if (fit < chips.length) {
        const plusW = 52
        let width = 0
        let kept = 0
        const maxW = hostW - plusW - 72
        for (const chip of chips) {
          const next = width + chip.offsetWidth + (kept > 0 ? 6 : 0)
          if (next > maxW) break
          width = next
          kept += 1
        }
        setVisibleCount(Math.max(1, kept))
      } else {
        setVisibleCount(chips.length)
      }
    }

    recompute()
    const ro = new ResizeObserver(() => recompute())
    ro.observe(host)
    window.addEventListener('resize', recompute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [rows.length, rowKey])

  useEffect(() => {
    if (!openTipId) return
    function onDoc(event: MouseEvent) {
      const t = event.target
      if (!(t instanceof Node)) return
      const chip = chipsRef.current?.querySelector('.active-effects__chip.is-tip-open')
      if (chip && chip.contains(t)) return
      setOpenTipId(null)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenTipId(null)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [openTipId])

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="active-effects active-effects--strip" data-testid="active-effects">
      <div
        className="active-effects__measure"
        ref={measureRef}
        aria-hidden="true"
      >
        {rows.map((effect) => (
          <div key={effect.id} className="active-effects__chip" data-effect-measure>
            <span className="active-effects__chip-text">
              <strong>{formatEffectChipFace(effect)}</strong>
            </span>
            <span className="active-effects__chip-actions">
              <span className="ui-button ui-button--ghost ui-button--sm">×</span>
            </span>
          </div>
        ))}
      </div>
      <div className="active-effects__chips" role="list" aria-label="Активные эффекты" ref={chipsRef}>
        {shown.map((effect) => (
          <EffectChip
            key={effect.id}
            effect={effect}
            rows={rows}
            open={openTipId === effect.id}
            onToggleOpen={() =>
              setOpenTipId((prev) => (prev === effect.id ? null : effect.id))
            }
            onChange={onChange}
            onToast={onToast}
          />
        ))}
        {overflow.length > 0 ? (
          <DetailsMenu
            className="active-effects__more"
            summaryClassName="active-effects__more-summary"
            panelClassName="active-effects__more-panel"
            summary={`+${overflow.length}`}
          >
            <div className="active-effects__more-list" role="list">
              {overflow.map((effect) => (
                <EffectChip
                  key={effect.id}
                  effect={effect}
                  rows={rows}
                  open={openTipId === effect.id}
                  onToggleOpen={() =>
                    setOpenTipId((prev) => (prev === effect.id ? null : effect.id))
                  }
                  onChange={onChange}
                  onToast={onToast}
                />
              ))}
            </div>
          </DetailsMenu>
        ) : null}
        {hasHeroism && onHeroismTurnStart ? (
          <Button type="button" size="sm" variant="secondary" onClick={onHeroismTurnStart}>
            Героизм
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="active-effects__round"
          title="Сменить раунд: таймеры эффектов −1 (полный ход — в сцене Бой)"
          aria-label="Раунд минус 1 — уменьшить таймеры эффектов"
          onClick={() => {
            const next = tickAllEffectsOneRound(rows)
            onChange(next)
            onToast?.(
              next.length < rows.length
                ? 'Раунд: часть эффектов истекла'
                : 'Раунд: таймеры эффектов −1',
            )
          }}
        >
          Раунд −1
        </Button>
      </div>
    </div>
  )
}
