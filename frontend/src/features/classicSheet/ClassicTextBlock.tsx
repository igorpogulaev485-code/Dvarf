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
import { useClassicSheetUi } from './classicSheetUi'

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

/** Textarea + LSS-style per-block font size (controls only in «Правка»). */
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
  const { editing } = useClassicSheetUi()
  const size = readClassicBlockFontSize(character, blockId)
  const style = { fontSize: `${size}pt` } as CSSProperties

  return (
    <div
      className={['classic-text-block', editing ? 'classic-text-block--editing' : '']
        .filter(Boolean)
        .join(' ')}
    >
      {editing ? (
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
      ) : null}
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
