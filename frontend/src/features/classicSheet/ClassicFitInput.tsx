import {
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
} from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Max font-size in px (from CSS when omitted). */
  maxFontPx?: number
  /** Min font-size in px before giving up. */
  minFontPx?: number
}

/**
 * Single-line header field: shrinks font so long values (names) stay readable
 * instead of clipping inside the Letter blank.
 */
export function ClassicFitInput({
  value,
  maxFontPx,
  minFontPx = 9,
  className,
  style,
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
      // Reset so scrollWidth reflects unclipped text.
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

  return (
    <input
      ref={ref}
      type="text"
      className={['classic-fit-input', className].filter(Boolean).join(' ')}
      value={value}
      style={style}
      {...rest}
    />
  )
}
