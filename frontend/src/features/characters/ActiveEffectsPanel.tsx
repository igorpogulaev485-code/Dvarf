/** Блок «Активные эффекты» на листе цели (B-01 / B-02 / B-03 / UIKIT-03). */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  applyEffectStacking,
  decrementEffectCharges,
  formatEffectChipDetails,
  formatEffectChipFace,
  tickAllEffectsOneRound,
  type ActiveEffect,
} from '../../shared/dnd/activeEffects'
import { Button, Chip, DetailsMenu, ScrollRow } from '../../ui'
import { IconRound } from './deskIcons'
import { rollDamage } from './deskRolls'

type Props = {
  effects: ActiveEffect[]
  onChange: (effects: ActiveEffect[]) => void
  onToast?: (message: string) => void
  /** Heroism: grant temp HP equal to caster mod at start of turn. */
  onHeroismTurnStart?: () => void
  /**
   * Phone: chips scroll in kit ScrollRow (full faces, no clamp/+N).
   * Round stays in the trail; phone CSS puts trail + companions under the row.
   * Desktop keeps measure + +N clamp (default).
   */
  chipLayout?: 'clamp' | 'scroll'
}

function EffectChip({
  effect,
  open,
  onToggleOpen,
  onChange,
  onToast,
  onHeroismTurnStart,
  rows,
}: {
  effect: ActiveEffect
  open: boolean
  onToggleOpen: () => void
  onChange: (effects: ActiveEffect[]) => void
  onToast?: (message: string) => void
  onHeroismTurnStart?: () => void
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
  const actionNodes: ReactNode[] = []
  // Heroism: face carries «+N вр. хита/ход»; turn grant stays in tip (no nested «ход» button).
  if (mirror && !inactive) {
    actionNodes.push(
      <Button
        key="mirror"
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
      </Button>,
    )
  }
  if (vitality && !inactive) {
    actionNodes.push(
      <Button
        key="vitality"
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
      </Button>,
    )
  }
  if (blink && !inactive) {
    actionNodes.push(
      <Button
        key="blink"
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
      </Button>,
    )
  }
  if (fortune && !inactive && (charges ?? 0) > 0) {
    actionNodes.push(
      <Button
        key="fortune"
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
      </Button>,
    )
  }
  if (
    effect.source_character_id &&
    (effect.slug?.startsWith('aura_of_') || effect.slug === 'exalted_champion')
  ) {
    actionNodes.push(
      <Button
        key="aura"
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
      </Button>,
    )
  }

  return (
    <Chip
      role="listitem"
      inactive={inactive}
      tipOpen={open}
      className="active-effects__chip"
      labelProps={{
        title: detailText || face,
        'aria-expanded': open,
        'aria-label': detailText ? `${face}. ${detailText}` : face,
        onClick: onToggleOpen,
      }}
      tip={
        details.length > 0 ||
        (effect.slug === 'heroism' && !inactive && onHeroismTurnStart) ? (
          <>
            {details.map((line) => (
              <span key={line}>{line}</span>
            ))}
            {effect.slug === 'heroism' && !inactive && onHeroismTurnStart ? (
              <button
                type="button"
                className="linkish"
                onClick={(event) => {
                  event.stopPropagation()
                  onHeroismTurnStart()
                }}
              >
                Выдать вр. хиты (начало хода)
              </button>
            ) : null}
          </>
        ) : null
      }
      actions={actionNodes.length > 0 ? actionNodes : undefined}
      onDismiss={() => {
        onChange(rows.filter((row) => row.id !== effect.id))
        onToast?.(`Снят эффект «${effect.name}»`)
      }}
      dismissLabel={`Снять «${effect.name}»`}
    >
      <strong>{face}</strong>
    </Chip>
  )
}

const MORE_RESERVE_PX = 40

export function ActiveEffectsPanel({
  effects,
  onChange,
  onToast,
  onHeroismTurnStart,
  chipLayout = 'clamp',
}: Props) {
  const [openTipId, setOpenTipId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState<number | null>(null)
  const mainRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)
  const rows = applyEffectStacking(effects ?? [])
  const rowKey = rows.map((r) => r.id).join('|')
  const scrollChips = chipLayout === 'scroll'
  const shown = scrollChips
    ? rows
    : visibleCount == null || visibleCount >= rows.length
      ? rows
      : rows.slice(0, Math.max(0, visibleCount))
  const overflow = scrollChips
    ? []
    : visibleCount != null && visibleCount < rows.length
      ? rows.slice(Math.max(0, visibleCount))
      : []

  useLayoutEffect(() => {
    if (scrollChips) {
      setVisibleCount(rows.length)
      return
    }
    if (rows.length === 0) {
      setVisibleCount(null)
      return
    }
    const host = mainRef.current
    const measure = measureRef.current
    if (!host || !measure) return

    const recompute = () => {
      const hostW = host.clientWidth
      if (hostW <= 0) return
      measure.style.setProperty('--active-effects-measure-w', `${hostW}px`)
      const chips = Array.from(
        measure.querySelectorAll<HTMLElement>('[data-effect-measure]'),
      )
      if (chips.length === 0) {
        setVisibleCount(rows.length)
        return
      }

      // First pass: how many fit in one wrapped row at full host width.
      const rowTop = chips[0].offsetTop
      let fitAll = 0
      for (const chip of chips) {
        if (chip.offsetTop > rowTop + 1) break
        fitAll += 1
      }
      if (fitAll >= chips.length) {
        setVisibleCount(chips.length)
        return
      }

      // Need +N — reserve its width, then pack whole chips only.
      // Always keep ≥1 face chip when any effects exist (mobile must not show bare +N).
      let width = 0
      let kept = 0
      const maxW = Math.max(0, hostW - MORE_RESERVE_PX)
      for (const chip of chips) {
        const next = width + chip.offsetWidth + (kept > 0 ? 6 : 0)
        if (next > maxW) break
        width = next
        kept += 1
      }
      setVisibleCount(Math.max(1, kept))
    }

    recompute()
    const ro = new ResizeObserver(() => recompute())
    ro.observe(host)
    window.addEventListener('resize', recompute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [rows.length, rowKey, scrollChips])

  useEffect(() => {
    if (!openTipId) return
    function onDoc(event: PointerEvent) {
      const t = event.target
      if (!(t instanceof Node)) return
      const root =
        mainRef.current?.closest('.active-effects') ||
        (t instanceof Element ? t.closest('.active-effects') : null)
      const chip = root?.querySelector('.ui-chip.is-tip-open')
      if (chip && chip.contains(t)) return
      setOpenTipId(null)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenTipId(null)
    }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [openTipId])

  if (rows.length === 0) {
    return null
  }

  const chipNodes = shown.map((effect) => (
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
      onHeroismTurnStart={onHeroismTurnStart}
    />
  ))

  return (
    <div
      className={`active-effects active-effects--strip${
        scrollChips ? ' active-effects--scroll' : ''
      }`}
      data-testid="active-effects"
    >
      {scrollChips ? null : (
        <div
          className="active-effects__measure"
          ref={measureRef}
          aria-hidden="true"
        >
          {rows.map((effect) => (
            <span key={effect.id} className="ui-chip active-effects__chip" data-effect-measure>
              <span className="ui-chip__label">
                <strong>{formatEffectChipFace(effect)}</strong>
              </span>
              <span className="ui-chip__actions">
                <span className="ui-chip__dismiss">×</span>
              </span>
            </span>
          ))}
        </div>
      )}
      {scrollChips ? (
        <ScrollRow
          ariaLabel="Активные эффекты"
          className="active-effects__main active-effects__scroller"
          shellClassName="active-effects__main-wrap"
          watchKey={rowKey}
          itemSelector=":scope > .ui-chip"
        >
          {chipNodes}
        </ScrollRow>
      ) : (
        <div
          className="active-effects__main"
          role="list"
          aria-label="Активные эффекты"
          ref={mainRef}
        >
          {chipNodes}
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
                    onHeroismTurnStart={onHeroismTurnStart}
                  />
                ))}
              </div>
            </DetailsMenu>
          ) : null}
        </div>
      )}
      <div className="active-effects__trail">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="active-effects__round"
          title="Сменить раунд: таймеры эффектов −1 (полный ход — в сцене Бой)"
          aria-label="Раунд −1 — уменьшить таймеры эффектов"
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
          <IconRound className="active-effects__round-icon" />
          Раунд −1
        </Button>
      </div>
    </div>
  )
}
