import { useCallback, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
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
import {
  classicLineHeightCss,
  classicPrintFontFamilyCss,
  readClassicBlockSize,
  readClassicGlobalFontScale,
  readClassicTextStyle,
  setClassicBlockSize,
} from './classicPrintSettings'

type Props = {
  blockId: string
  character: CharacterDetail
  /** Narrow print-settings patch only (classic_* ui). */
  onPrintSettings?: (patch: ClassicPatch) => void
  value: string
  printMaxHeight?: string
  ariaLabel?: string
  className?: string
  fill?: boolean
}

/** Read-only print text block + LSS-style font/size controls in «Правка печати». */
export function ClassicTextBlock({
  blockId,
  character,
  onPrintSettings,
  value,
  printMaxHeight,
  ariaLabel,
  className,
  fill,
}: Props) {
  const { editing } = useClassicSheetUi()
  const size = readClassicBlockFontSize(character, blockId)
  const scale = readClassicGlobalFontScale(character)
  const textStyle = readClassicTextStyle(character)
  const storedSize = readClassicBlockSize(character, blockId)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  const effectivePt = Math.max(
    CLASSIC_BLOCK_FONT_MIN,
    Math.round(size * scale * 10) / 10,
  )

  const style = {
    fontSize: `${effectivePt}pt`,
    lineHeight: classicLineHeightCss(textStyle.lineHeight),
    textAlign: textStyle.align,
    fontFamily: classicPrintFontFamilyCss(textStyle.fontFamily),
    ...(storedSize?.heightRem
      ? { ['--print-max-height']: `${storedSize.heightRem}rem`, minHeight: `${storedSize.heightRem}rem` }
      : null),
  } as CSSProperties

  const heightHint = storedSize?.heightRem
    ? `${storedSize.heightRem}rem`
    : printMaxHeight

  const onResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!onPrintSettings || !editing) return
      e.preventDefault()
      const host = (e.currentTarget.parentElement as HTMLElement | null)
      const startH =
        storedSize?.heightRem ??
        (host ? host.getBoundingClientRect().height / 16 : 8)
      dragRef.current = { startY: e.clientY, startH }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [editing, onPrintSettings, storedSize?.heightRem],
  )

  const onResizePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!dragRef.current || !onPrintSettings) return
      const dy = (e.clientY - dragRef.current.startY) / 16
      const next = Math.max(2, Math.min(40, dragRef.current.startH + dy))
      onPrintSettings(setClassicBlockSize(character, blockId, { heightRem: next }))
    },
    [blockId, character, onPrintSettings],
  )

  const onResizePointerUp = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <div
      className={['classic-text-block', editing ? 'classic-text-block--editing' : '']
        .filter(Boolean)
        .join(' ')}
      data-block-id={blockId}
    >
      {editing && onPrintSettings ? (
        <input
          type="number"
          className="classic-text-block__size no-print"
          min={CLASSIC_BLOCK_FONT_MIN}
          max={CLASSIC_BLOCK_FONT_MAX}
          step={1}
          value={size}
          aria-label={`Размер шрифта: ${ariaLabel ?? blockId}`}
          title="Размер шрифта блока (верхняя граница автоподгонки)"
          onChange={(e) => {
            const next = clampClassicFontSize(Number(e.target.value))
            onPrintSettings(setClassicBlockFontSize(character, blockId, next))
          }}
        />
      ) : null}
      <Expanding
        value={value}
        printMaxHeight={heightHint}
        ariaLabel={ariaLabel}
        className={className}
        fill={fill}
        style={style}
        readOnly
      />
      {editing && onPrintSettings ? (
        <button
          type="button"
          className="classic-text-block__resize no-print"
          aria-label={`Изменить высоту: ${ariaLabel ?? blockId}`}
          title="Потяните, чтобы изменить высоту блока на печати"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
        />
      ) : null}
    </div>
  )
}
