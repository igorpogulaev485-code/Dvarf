import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
} from 'react'
import { CLASSIC_FIT_MIN_PT } from './classicPrintSettings'

type Props = HTMLAttributes<HTMLDivElement> & {
  value: string
  /** Starting font size in pt. */
  maxFontPt?: number
  minFontPt?: number
  /** When true, also shrink to fit height. */
  fitHeight?: boolean
}

/**
 * Multi-line / single-block autofit: shrink font to fit width (and optionally height)
 * down to CLASSIC_FIT_MIN_PT. Does not clip with ellipsis — caller adds overflow pages.
 */
export function ClassicFitText({
  value,
  maxFontPt,
  minFontPt = CLASSIC_FIT_MIN_PT,
  fitHeight = true,
  className,
  style,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const fit = () => {
      const computed = getComputedStyle(el)
      const cssMax = parseFloat(computed.getPropertyValue('--classic-fit-max-pt'))
      const start =
        maxFontPt ??
        (Number.isFinite(cssMax) && cssMax > 0
          ? cssMax
          : parseFloat(computed.fontSize) * (72 / 96) || 10)
      let size = start
      el.style.fontSize = `${size}pt`
      const overflows = () => {
        const widthOverflow = el.scrollWidth > el.clientWidth + 1
        const heightOverflow = fitHeight && el.scrollHeight > el.clientHeight + 1
        return widthOverflow || heightOverflow
      }
      while (size > minFontPt && overflows()) {
        size -= 0.25
        el.style.fontSize = `${size}pt`
      }
      if (overflows()) {
        el.dataset.classicOverflow = '1'
      } else {
        delete el.dataset.classicOverflow
      }
    }

    fit()
    const ro = new ResizeObserver(() => fit())
    ro.observe(el)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [value, maxFontPt, minFontPt, fitHeight])

  const merged: CSSProperties = {
    whiteSpace: 'pre-wrap',
    overflow: 'visible',
    ...style,
  }

  return (
    <div
      ref={ref}
      className={['classic-fit-text', className].filter(Boolean).join(' ')}
      style={merged}
      {...rest}
    >
      {value}
    </div>
  )
}
