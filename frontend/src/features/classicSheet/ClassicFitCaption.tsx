import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from 'react'

type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: ReactNode
  /** Floor in pt — ability frame labels must stay ≥ 6. */
  minPt?: number
  /** Start size in pt. */
  maxPt?: number
}

/**
 * Single-line caption that shrinks font/tracking to fit width (never ellipsizes).
 */
export function ClassicFitCaption({
  children,
  className,
  minPt = 6,
  maxPt = 7,
  style,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const run = () => {
      const prevOverflow = el.style.overflow
      el.style.overflow = 'hidden'
      let size = maxPt
      let track = -0.02
      el.style.fontSize = `${size}pt`
      el.style.letterSpacing = `${track}em`
      const overflows = () => el.scrollWidth > el.clientWidth + 0.5
      while (size > minPt && overflows()) {
        size -= 0.1
        track -= 0.015
        el.style.fontSize = `${size}pt`
        el.style.letterSpacing = `${track}em`
      }
      // Last resort: keep floor size, allow slight scaleX so the word stays whole.
      if (overflows() && el.clientWidth > 0) {
        const scale = Math.max(0.82, el.clientWidth / el.scrollWidth)
        el.style.transform = `scaleX(${scale.toFixed(3)})`
        el.style.transformOrigin = 'center top'
      } else {
        el.style.transform = ''
      }
      el.style.overflow = prevOverflow
    }
    run()
    const ro = new ResizeObserver(() => run())
    ro.observe(el)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [children, minPt, maxPt])

  return (
    <div
      ref={ref}
      className={['classic-fit-caption', className].filter(Boolean).join(' ')}
      style={style}
      {...rest}
    >
      {children}
    </div>
  )
}
