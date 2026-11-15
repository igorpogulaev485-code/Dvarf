import type { CSSProperties, HTMLAttributes } from 'react'
import { ClassicStaticField } from './ClassicStaticField'

type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  value: string | number | null | undefined
  /** Max font-size in px (from CSS when omitted). */
  maxFontPx?: number
  /** Min font-size in px before giving up (default ≈ 7pt). */
  minFontPx?: number
  /** Allow 2-line wrap for long character names. */
  wrap?: boolean
  /** Kept for call-site compatibility; print fields are always static. */
  readOnly?: boolean
  'aria-label'?: string
}

/**
 * Header field: shrinks font so long values stay readable
 * instead of clipping inside the A4 blank. Always static print ink.
 */
export function ClassicFitInput({
  value,
  maxFontPx,
  minFontPx,
  wrap = false,
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
      wrap={wrap}
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
