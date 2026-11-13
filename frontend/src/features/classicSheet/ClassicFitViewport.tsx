import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { classicScreenFitScale } from './classicFitScale'

type Props = {
  children: ReactNode
}

/**
 * Scales the Letter stack to the window width on screen.
 * Print media disables transform so pages stay 8.5×11in.
 */
export function ClassicFitViewport({ children }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const lastRef = useRef({ scale: 1, w: 0, h: 0 })

  useLayoutEffect(() => {
    const host = hostRef.current
    const content = contentRef.current
    if (!host || !content) return

    const measure = () => {
      // offset*/scroll* are pre-transform layout sizes.
      const sheet = content.querySelector('.classic-sheet') as HTMLElement | null
      const w = Math.max(sheet?.offsetWidth ?? 0, content.scrollWidth)
      const h = content.scrollHeight
      const available = host.clientWidth
      const next = classicScreenFitScale(available, w)
      const prev = lastRef.current
      if (
        Math.abs(prev.scale - next) < 0.001 &&
        Math.abs(prev.w - w) < 1 &&
        Math.abs(prev.h - h) < 1
      ) {
        return
      }
      lastRef.current = { scale: next, w, h }
      setNatural({ w, h })
      setScale(next)
    }

    measure()
    const ro = new ResizeObserver(() => measure())
    ro.observe(host)
    ro.observe(content)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <div
      className="classic-fit-viewport"
      ref={hostRef}
      data-classic-fit-scale={scale.toFixed(3)}
    >
      <div
        className="classic-fit-spacer"
        style={
          natural.h > 0
            ? { height: `${natural.h * scale}px` }
            : undefined
        }
      >
        <div
          ref={contentRef}
          className="classic-fit-scaled"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            width: natural.w > 0 ? `${natural.w}px` : undefined,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
