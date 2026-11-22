import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

/** Hybrid from CONCEPT §14 / §15: 5px after press on a fine pointer, ~300ms hold on touch. */
const HOLD_MS = 300
const DRAG_SLOP = 5
const PHONE_SCROLL_SLOP = 10

export type TileDragBind = {
  className: string
  style?: CSSProperties
  placeholder: boolean
  placeholderHeight: number
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onClickCapture: (event: MouseEvent<HTMLElement>) => void
}

type Options = {
  ids: string[]
  enabled: boolean
  onCommit: (ids: string[]) => void
}

function moveId(list: string[], id: string, to: number): string[] {
  const from = list.indexOf(id)
  if (from < 0) return list
  const next = list.slice()
  next.splice(from, 1)
  const index = Math.max(0, Math.min(to, next.length))
  next.splice(index, 0, id)
  return next
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

function slotIndex(grid: HTMLElement, x: number, y: number): number {
  const slots = [...grid.querySelectorAll<HTMLElement>('[data-tile-slot]')]
  if (!slots.length) return 0
  let best = 0
  let bestD = Infinity
  slots.forEach((el, index) => {
    const rect = el.getBoundingClientRect()
    const dx = x - (rect.left + rect.width / 2)
    const dy = y - (rect.top + rect.height / 2)
    const dist = dx * dx + dy * dy
    if (dist < bestD) {
      bestD = dist
      best = index
    }
  })
  return best
}

export function useHybridTileDrag({ ids, enabled, onCommit }: Options) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const idsRef = useRef(ids)
  idsRef.current = ids
  const [preview, setPreview] = useState<string[] | null>(null)
  const previewRef = useRef<string[] | null>(null)
  const [armedId, setArmedId] = useState<string | null>(null)
  const [drag, setDrag] = useState<{
    id: string
    x: number
    y: number
    w: number
    h: number
    dx: number
    dy: number
  } | null>(null)
  const suppressRef = useRef(false)
  const rectsRef = useRef<Map<string, DOMRect>>(new Map())
  const visual = preview ?? ids
  const visualKey = visual.join('\n')

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const nodes = [...grid.querySelectorAll<HTMLElement>('[data-tile-id]')]
    const prev = rectsRef.current
    for (const node of nodes) {
      if (node.classList.contains('is-dragging')) continue
      const id = node.getAttribute('data-tile-id')
      if (!id) continue
      const before = prev.get(id)
      const after = node.getBoundingClientRect()
      if (before) {
        const dx = before.left - after.left
        const dy = before.top - after.top
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          node.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
            { duration: 180, easing: 'ease' },
          )
        }
      }
    }
    const next = new Map<string, DOMRect>()
    for (const node of nodes) {
      if (node.classList.contains('is-dragging')) continue
      const id = node.getAttribute('data-tile-id')
      if (id) next.set(id, node.getBoundingClientRect())
    }
    rectsRef.current = next
  }, [visualKey])

  const bind = useCallback(
    (id: string): TileDragBind => {
      const active = drag?.id === id
      return {
        className: `${armedId === id ? ' is-armed' : ''}${active ? ' is-dragging' : ''}`,
        placeholder: active,
        placeholderHeight: drag?.h ?? 0,
        style: active
          ? {
              position: 'fixed',
              left: drag.x - drag.dx,
              top: drag.y - drag.dy,
              width: drag.w,
              height: drag.h,
              zIndex: 30,
              margin: 0,
            }
          : undefined,
        onClickCapture: (event) => {
          if (!suppressRef.current) return
          suppressRef.current = false
          event.preventDefault()
          event.stopPropagation()
        },
        onPointerDown: (event) => {
          if (!enabled || event.button !== 0) return
          const target = event.target
          if (target instanceof Element && target.closest('[data-tile-control]')) return
          const wrap = event.currentTarget
          const startX = event.clientX
          const startY = event.clientY
          const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
          let armed = fine
          let moved = false
          let hold: number | null = null
          const rect = wrap.getBoundingClientRect()
          const offsetX = startX - rect.left
          const offsetY = startY - rect.top

          const cleanup = () => {
            if (hold != null) window.clearTimeout(hold)
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
            window.removeEventListener('pointercancel', onCancel)
            window.removeEventListener('keydown', onKey)
          }

          const begin = (x: number, y: number) => {
            moved = true
            suppressRef.current = true
            const current = (previewRef.current ?? idsRef.current).slice()
            previewRef.current = current
            setPreview(current)
            setArmedId(id)
            setDrag({
              id,
              x,
              y,
              w: rect.width,
              h: rect.height,
              dx: offsetX,
              dy: offsetY,
            })
          }

          const onMove = (ev: PointerEvent) => {
            const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY)
            if (!armed) {
              if (dist > PHONE_SCROLL_SLOP) cleanup()
              return
            }
            if (!moved) {
              if (dist <= DRAG_SLOP) return
              begin(ev.clientX, ev.clientY)
            }
            ev.preventDefault()
            setDrag((prev) =>
              prev && prev.id === id ? { ...prev, x: ev.clientX, y: ev.clientY } : prev,
            )
            const grid = gridRef.current
            if (!grid) return
            const to = slotIndex(grid, ev.clientX, ev.clientY)
            const base = previewRef.current ?? idsRef.current
            const next = moveId(base, id, to)
            if (!sameIds(next, base)) {
              previewRef.current = next
              setPreview(next)
            }
          }

          const finish = (commit: boolean) => {
            const next = previewRef.current
            cleanup()
            setDrag(null)
            setArmedId(null)
            setPreview(null)
            previewRef.current = null
            if (commit && moved && next && !sameIds(next, idsRef.current)) onCommit(next)
            if (armed && !fine) suppressRef.current = true
          }

          const onUp = () => finish(true)
          const onCancel = () => {
            suppressRef.current = true
            finish(false)
          }
          const onKey = (ev: KeyboardEvent) => {
            if (ev.key !== 'Escape') return
            suppressRef.current = true
            finish(false)
          }

          if (!fine) {
            hold = window.setTimeout(() => {
              armed = true
              setArmedId(id)
            }, HOLD_MS)
          }

          window.addEventListener('pointermove', onMove, { passive: false })
          window.addEventListener('pointerup', onUp)
          window.addEventListener('pointercancel', onCancel)
          window.addEventListener('keydown', onKey)
        },
      }
    },
    [armedId, drag, enabled, onCommit],
  )

  return { gridRef, visual, bind, dragging: Boolean(drag) }
}
