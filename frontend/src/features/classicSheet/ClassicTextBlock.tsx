import type { CSSProperties } from 'react'
import type { CharacterDetail } from '../../shared/api/characters'
import type { ClassicPatch } from './fromApi'
import {
  CLASSIC_BLOCK_FONT_FAMILIES,
  CLASSIC_BLOCK_FONT_SIZES,
  classicFontFamilyCss,
  readClassicBlockFont,
  setClassicBlockFont,
  type ClassicBlockFontFamily,
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

/** Textarea + per-block font/size controls (not printed). */
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
  const font = readClassicBlockFont(character, blockId)
  const style = {
    fontFamily: classicFontFamilyCss(font.family),
    fontSize: `${font.size}pt`,
  } as CSSProperties

  return (
    <div className="classic-text-block">
      <div className="classic-text-block__tools no-print" aria-label={`Шрифт: ${ariaLabel ?? blockId}`}>
        <label className="classic-text-block__family">
          <span>Шрифт</span>
          <select
            value={font.family}
            onChange={(e) =>
              onPatch(
                setClassicBlockFont(character, blockId, {
                  family: e.target.value as ClassicBlockFontFamily,
                }),
              )
            }
          >
            {CLASSIC_BLOCK_FONT_FAMILIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="classic-text-block__size">
          <span>Размер</span>
          <select
            value={font.size}
            onChange={(e) =>
              onPatch(
                setClassicBlockFont(character, blockId, {
                  size: Number(e.target.value),
                }),
              )
            }
          >
            {CLASSIC_BLOCK_FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
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
