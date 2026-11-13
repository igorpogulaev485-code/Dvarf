import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type InputHTMLAttributes,
} from 'react'
import { CLASSIC_FIT_MIN_PT } from './classicPrintSettings'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
  /** Max font-size in px (from CSS when omitted). */
  maxFontPx?: number
  /** Min font-size in px before giving up (default ≈ 7pt). */
  minFontPx?: number
}

const DEFAULT_MIN_PX = Math.round((CLASSIC_FIT_MIN_PT * 96) / 72)

/**
 * Single-line header field: shrinks font so long values stay readable
 * instead of clipping inside the A4 blank. Always read-only on classic print.
 */
export function ClassicFitInput({
  value,
  maxFontPx,
  minFontPx = DEFAULT_MIN_PX,
  className,
  style,
  readOnly = true,
  ...rest
}: Props) {
  const ref = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const fit = () => {
      const computed = getComputedStyle(el)
      const cssMax = parseFloat(computed.getPropertyValue('--classic-fit-max-px'))
      const start =
        maxFontPx ??
        (Number.isFinite(cssMax) && cssMax > 0
          ? cssMax
          : parseFloat(computed.fontSize) || 18)
      let size = start
      el.style.fontSize = `${size}px`
      while (size > minFontPx && el.scrollWidth > el.clientWidth + 1) {
        size -= 0.5
        el.style.fontSize = `${size}px`
      }
    }

    fit()
    const ro = new ResizeObserver(() => fit())
    ro.observe(el)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [value, maxFontPx, minFontPx])

  const mergedStyle: CSSProperties = { ...style }

  return (
    <input
      ref={ref}
      type="text"
      className={['classic-fit-input', className].filter(Boolean).join(' ')}
      value={value}
      style={mergedStyle}
      readOnly={readOnly}
      tabIndex={readOnly ? -1 : undefined}
      {...rest}
    />
  )
}
