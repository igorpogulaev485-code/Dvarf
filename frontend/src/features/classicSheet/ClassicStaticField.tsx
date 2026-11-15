import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
} from 'react'
import { CLASSIC_FIT_MIN_PT } from './classicPrintSettings'

type Props = HTMLAttributes<HTMLDivElement> & {
  value: string | number | null | undefined
  /** Autofit long values down to ~7pt. */
  fit?: boolean
  /** Allow wrap (multiclass / long race) instead of single-line clip. */
  wrap?: boolean
  /** Starting max font in px when fit is on. */
  maxFontPx?: number
  minFontPx?: number
  /** Center numbers / combat stats. */
  align?: 'start' | 'center' | 'end'
  /** Empty → ruled pencil line instead of blank void. */
  pencilLine?: boolean
  /** Visual weight for score / name / etc. */
  tone?: 'display' | 'body' | 'compact' | 'numeric'
}

const DEFAULT_MIN_PX = Math.round((CLASSIC_FIT_MIN_PT * 96) / 72)

/**
 * Print-only field: static ink on the blank, never an input/select.
 * Empty values keep a hairline for pencil when pencilLine is set.
 */
export function ClassicStaticField({
  value,
  fit = false,
  wrap = false,
  maxFontPx,
  minFontPx = DEFAULT_MIN_PX,
  align = 'start',
  pencilLine = true,
  tone = 'body',
  className,
  style,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const text = value == null ? '' : String(value)
  const empty = text.trim() === ''

  useLayoutEffect(() => {
    if (!fit || empty) return
    const el = ref.current
    if (!el) return

    const run = () => {
      const computed = getComputedStyle(el)
      const cssMax = parseFloat(computed.getPropertyValue('--classic-fit-max-px'))
      const start =
        maxFontPx ??
        (Number.isFinite(cssMax) && cssMax > 0
          ? cssMax
          : parseFloat(computed.fontSize) || 18)
      let size = start
      el.style.fontSize = `${size}px`
      // Long values: lock a 2-line box so autofit prefers wrap over tiny single-line type.
      if (wrap) {
        // pre-line keeps intentional newlines (e.g. damage + type on two rows).
        el.style.whiteSpace = 'pre-line'
        const wrapH =
          computed.getPropertyValue('--classic-fit-wrap-height').trim() || '2.55rem'
        el.style.height = wrapH
        el.style.maxHeight = wrapH
      }
      const overflows = () => {
        const w = el.scrollWidth > el.clientWidth + 1
        const h = wrap && el.scrollHeight > el.clientHeight + 1
        return w || h
      }
      while (size > minFontPx && overflows()) {
        size -= 0.5
        el.style.fontSize = `${size}px`
      }
      // Still overflowing at ≥7pt → grow wrap box line-by-line (cap 4)
      // so long multiclass strings keep whole words (no mid-word clip).
      if (wrap && overflows()) {
        const line = Math.max(size * 1.2, minFontPx * 1.15)
        for (let lines = 3; lines <= 4 && overflows(); lines += 1) {
          const h = `${(line * lines).toFixed(1)}px`
          el.style.height = h
          el.style.maxHeight = h
        }
      }
    }

    run()
    const ro = new ResizeObserver(() => run())
    ro.observe(el)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [text, fit, wrap, empty, maxFontPx, minFontPx])

  const merged: CSSProperties = {
    textAlign: align,
    whiteSpace: wrap ? 'normal' : undefined,
    ...style,
  }

  return (
    <div
      ref={ref}
      className={[
        'classic-static',
        `classic-static--${tone}`,
        empty && pencilLine ? 'classic-static--pencil' : '',
        fit ? 'classic-static--fit' : '',
        wrap ? 'classic-static--wrap' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={merged}
      data-empty={empty ? '1' : undefined}
      {...rest}
    >
      {empty ? <span className="classic-static__pencil" aria-hidden /> : text}
    </div>
  )
}
