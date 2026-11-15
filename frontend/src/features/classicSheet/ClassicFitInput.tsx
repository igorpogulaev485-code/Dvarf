import type { CSSProperties, HTMLAttributes } from 'react'
import { ClassicStaticField } from './ClassicStaticField'

type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  value: string | number | null | undefined
  /** Max font-size in px (from CSS when omitted). */
  maxFontPx?: number
  /** Min font-size in px before giving up (default ≈ 7pt). */
  minFontPx?: number
  /** Kept for call-site compatibility; print fields are always static. */
  readOnly?: boolean
  'aria-label'?: string
}

/**
 * Single-line header field: shrinks font so long values stay readable
 * instead of clipping inside the A4 blank. Always static print ink.
 */
export function ClassicFitInput({
  value,
  maxFontPx,
  minFontPx,
  className,
  style,
  readOnly: _readOnly,
  ...rest
}: Props) {
  const mergedStyle: CSSProperties = { ...style }
  return (
    <ClassicStaticField
      value={value}
      fit
      maxFontPx={maxFontPx}
      minFontPx={minFontPx}
      tone="display"
      pencilLine
      className={['classic-fit-input', className].filter(Boolean).join(' ')}
      style={mergedStyle}
      {...rest}
    />
  )
}
