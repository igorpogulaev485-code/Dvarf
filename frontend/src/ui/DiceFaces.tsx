import type { HTMLAttributes } from 'react'

export type DiceFaceView = {
  sides: number
  value: number
  dropped?: boolean
  nat?: '20' | '1' | string | null
}

type Props = HTMLAttributes<HTMLDivElement> & {
  faces: DiceFaceView[]
  /** Показать модификатор отдельной плашкой. */
  modifierTotal?: number | null
}

/** Плашки костей — как в панели DICE-01, для ленты и вкладки «Стол». */
export function DiceFaces({
  faces,
  modifierTotal,
  className = '',
  ...rest
}: Props) {
  if (!faces.length && (modifierTotal == null || modifierTotal === 0)) return null
  return (
    <div
      className={`ui-dice-faces ${className}`.trim()}
      aria-label="Кости"
      {...rest}
    >
      {faces.map((face, idx) => {
        const nat = face.nat === '20' || face.nat === '1' ? face.nat : undefined
        const dropped = Boolean(face.dropped)
        return (
          <span
            key={`${face.sides}-${face.value}-${idx}`}
            className={[
              'ui-dice-face',
              dropped ? 'is-dropped' : '',
              nat === '20' ? 'is-nat20' : '',
              nat === '1' ? 'is-nat1' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={`d${face.sides}`}
          >
            {face.value}
          </span>
        )
      })}
      {modifierTotal != null && modifierTotal !== 0 ? (
        <span className="ui-dice-face is-mod">
          {modifierTotal > 0 ? `+${modifierTotal}` : String(modifierTotal)}
        </span>
      ) : null}
    </div>
  )
}
