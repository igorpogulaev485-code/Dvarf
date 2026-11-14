import {
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type ReactNode,
} from 'react'
import { DetailsMenu } from './DetailsMenu'

export type ClassChipItem = {
  id: string
  /** e.g. «Жрец 3» */
  label: string
  /** Archetype under class, if any */
  archetype?: string
  /** Level shown in overflow popover (optional; parsed from label if absent). */
  level?: number | string
  /** Bare class name for popover (optional). */
  className?: string
}

type ClassChipProps = LiHTMLAttributes<HTMLLIElement> & {
  label: ReactNode
  archetype?: ReactNode
}

/** Class over archetype. Etalon accepted Игорь 14.11.2026. */
export function ClassChip({
  label,
  archetype,
  className = '',
  ...rootProps
}: ClassChipProps) {
  return (
    <li
      className={`ui-class-chip play-desk-header__class-chip${
        archetype ? ' has-subclass' : ''
      } ${className}`.trim()}
      {...rootProps}
    >
      <span className="ui-class-chip__main play-desk-header__class-main">{label}</span>
      {archetype ? (
        <span className="ui-class-chip__archetype play-desk-header__class-archetype">
          {archetype}
        </span>
      ) : null}
    </li>
  )
}

const MORE_RESERVE_PX = 40

type ClassChipRowProps = Omit<HTMLAttributes<HTMLUListElement>, 'children'> & {
  items: ClassChipItem[]
  /** Three or more classes → denser face. */
  many?: boolean
}

/**
 * Kit class row — side by side; overflow → +N DetailsMenu (same face as effects).
 * No scroll, no dropdown. Etalon accepted Игорь 14.11.2026.
 */
export function ClassChipRow({
  items,
  many = false,
  className = '',
  ...rootProps
}: ClassChipRowProps) {
  const hostRef = useRef<HTMLUListElement | null>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [visibleCount, setVisibleCount] = useState<number | null>(null)
  const rowKey = items.map((row) => row.id).join('|')
  const dense = many || items.length >= 3

  const shown =
    visibleCount == null || visibleCount >= items.length
      ? items
      : items.slice(0, Math.max(0, visibleCount))
  const overflow =
    visibleCount != null && visibleCount < items.length
      ? items.slice(Math.max(0, visibleCount))
      : []

  useLayoutEffect(() => {
    if (items.length === 0) {
      setVisibleCount(null)
      return
    }
    const host = hostRef.current
    const measure = measureRef.current
    if (!host || !measure) return

    const recompute = () => {
      const hostW = host.clientWidth
      if (hostW <= 0) return
      measure.style.setProperty('--ui-class-row-measure-w', `${hostW}px`)
      const chips = Array.from(
        measure.querySelectorAll<HTMLElement>('[data-class-measure]'),
      )
      if (chips.length === 0) {
        setVisibleCount(items.length)
        return
      }
      const rowTop = chips[0].offsetTop
      let fitAll = 0
      for (const chip of chips) {
        if (chip.offsetTop > rowTop + 1) break
        fitAll += 1
      }
      if (fitAll >= chips.length) {
        // Dense / many multiclass: still face at most 2 + +N (run8 load rule).
        setVisibleCount(dense ? Math.min(chips.length, 2) : chips.length)
        return
      }
      let width = 0
      let kept = 0
      const maxW = Math.max(0, hostW - MORE_RESERVE_PX)
      for (const chip of chips) {
        const next = width + chip.offsetWidth + (kept > 0 ? 4 : 0)
        if (next > maxW) break
        width = next
        kept += 1
      }
      // Always show at least one class block when any exist; +N = hidden only.
      // UIKIT-03 / run8: under load keep 1–2 face blocks; rest in +N.
      const capped = dense ? Math.min(kept, 2) : kept
      if (capped <= 0) {
        setVisibleCount(1)
        return
      }
      setVisibleCount(capped)
    }

    recompute()
    const raf = requestAnimationFrame(() => {
      recompute()
      requestAnimationFrame(recompute)
    })
    const ro = new ResizeObserver(() => recompute())
    ro.observe(host)
    window.addEventListener('resize', recompute)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [items.length, rowKey, dense])

  if (items.length === 0) return null

  return (
    <>
      <div
        className="ui-class-row__measure"
        ref={measureRef}
        aria-hidden="true"
      >
        {items.map((chip) => (
          <span
            key={chip.id}
            className={`ui-class-chip play-desk-header__class-chip${
              chip.archetype ? ' has-subclass' : ''
            }${dense ? ' is-measure-many' : ''}`}
            data-class-measure
          >
            <span className="ui-class-chip__main play-desk-header__class-main">
              {chip.label}
            </span>
            {chip.archetype ? (
              <span className="ui-class-chip__archetype play-desk-header__class-archetype">
                {chip.archetype}
              </span>
            ) : null}
          </span>
        ))}
      </div>
      <ul
        ref={hostRef}
        className={`ui-class-row play-desk-header__classes${
          dense ? ' is-many' : ''
        } ${className}`.trim()}
        {...rootProps}
      >
        {shown.map((chip) => (
          <ClassChip
            key={chip.id}
            label={chip.label}
            archetype={chip.archetype || undefined}
            title={
              chip.archetype ? `${chip.label} · ${chip.archetype}` : chip.label
            }
          />
        ))}
        {overflow.length > 0 ? (
          <li className="ui-class-row__more-item">
            <DetailsMenu
              className="ui-class-row__more"
              summaryClassName="ui-class-row__more-summary"
              panelClassName="ui-class-row__more-panel"
              summary={`+${overflow.length}`}
            >
              <ul className="ui-class-row__more-list" role="list">
                {items.map((chip) => {
                  const level =
                    chip.level ??
                    (chip.label.match(/(\d+)\s*$/)?.[1] ?? null)
                  const name =
                    chip.className ??
                    (chip.label.replace(/\s+\d+\s*$/, '').trim() || chip.label)
                  return (
                    <li key={chip.id} className="ui-class-row__more-row">
                      <span className="ui-class-row__more-name">{name}</span>
                      {chip.archetype ? (
                        <span className="ui-class-row__more-archetype">
                          {chip.archetype}
                        </span>
                      ) : null}
                      {level != null && level !== '' ? (
                        <span className="ui-class-row__more-level">
                          ур. {level}
                        </span>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </DetailsMenu>
          </li>
        ) : null}
      </ul>
    </>
  )
}
