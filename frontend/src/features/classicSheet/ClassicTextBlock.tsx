import type { CSSProperties } from 'react'
import type { CharacterDetail } from '../../shared/api/characters'
import type { ClassicPatch } from './fromApi'
import {
  CLASSIC_BLOCK_FONT_MAX,
  CLASSIC_BLOCK_FONT_MIN,
  clampClassicFontSize,
  readClassicBlockFontSize,
  setClassicBlockFontSize,
} from './classicBlockFonts'
import { Expanding } from './classicPrintShared'

type Props = {
  blockId: string
  character: CharacterDetail
  onPatch: (patch: ClassicPatch) => void
  value: string
  onChange: (value: string) => void
  printMaxHeight?: string
  ariaLabel?: string
  className?: string
  fill?: boolean
}

/** Textarea + LSS-style per-block font size (number only, not printed). */
export function ClassicTextBlock({
  blockId,
  character,
  onPatch,
  value,
  onChange,
  printMaxHeight,
  ariaLabel,
  className,
  fill,
}: Props) {
  const size = readClassicBlockFontSize(character, blockId)
  const style = { fontSize: `${size}pt` } as CSSProperties

  return (
    <div className="classic-text-block">
      <input
        type="number"
        className="classic-text-block__size no-print"
        min={CLASSIC_BLOCK_FONT_MIN}
        max={CLASSIC_BLOCK_FONT_MAX}
        step={1}
        value={size}
        aria-label={`Размер шрифта: ${ariaLabel ?? blockId}`}
        title="Размер шрифта"
        onChange={(e) => {
          const next = clampClassicFontSize(Number(e.target.value))
          onPatch(setClassicBlockFontSize(character, blockId, next))
        }}
      />
      <Expanding
        value={value}
        onChange={onChange}
        printMaxHeight={printMaxHeight}
        ariaLabel={ariaLabel}
        className={className}
        fill={fill}
        style={style}
      />
    </div>
  )
}
