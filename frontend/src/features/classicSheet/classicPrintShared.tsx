import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { CharacterDetail } from '../../shared/api/characters'
import { proficiencyBonusForTotalLevel } from '../../shared/dnd/classFeatures'
import { asRecord } from '../characters/sheetTypes'
import { CLASSIC_FIT_MIN_PT } from './classicPrintSettings'

export function Expanding({
  value,
  printMaxHeight,
  ariaLabel,
  className,
  fill,
  style: styleProp,
}: {
  value: string
  onChange?: (value: string) => void
  printMaxHeight?: string
  ariaLabel?: string
  className?: string
  /** Stretch to fill a growable panel instead of hugging text height. */
  fill?: boolean
  style?: CSSProperties
  /** Ignored — print blocks are always static text. */
  readOnly?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const empty = value.trim() === ''
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || empty) return
    const computed = getComputedStyle(el)
    const cssMax = parseFloat(computed.getPropertyValue('--classic-fit-max-pt'))
    const start =
      (Number.isFinite(cssMax) && cssMax > 0
        ? cssMax
        : parseFloat(computed.fontSize) * (72 / 96)) || 8
    let size = start
    el.style.fontSize = `${size}pt`
    const overflows = () =>
      el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1
    while (size > CLASSIC_FIT_MIN_PT && fill && overflows()) {
      size -= 0.25
      el.style.fontSize = `${size}pt`
    }
  }, [value, fill, empty])
  const style: CSSProperties = {
    ...(printMaxHeight ? ({ ['--print-max-height']: printMaxHeight } as CSSProperties) : null),
    ...styleProp,
  }
  const classes = [
    'classic-expand',
    fill ? 'classic-expand--fill' : '',
    empty ? 'classic-expand--pencil' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div
      ref={ref}
      className={classes}
      aria-label={ariaLabel}
      role="text"
      style={style}
      data-empty={empty ? '1' : undefined}
    >
      {empty ? null : value}
    </div>
  )
}

export function Bubble({
  filled,
  expertise,
  onClick,
  label,
}: {
  filled: boolean
  /** Double-filled look for expertise (classic skill bubble). */
  expertise?: boolean
  onClick?: () => void
  label?: string
}) {
  const state = expertise ? 'is-expertise' : filled ? 'is-filled' : ''
  if (!onClick) {
    return (
      <span className="classic-bubble-btn classic-bubble-btn--static" aria-label={label}>
        <span className={`classic-bubble ${state}`.trim()} />
      </span>
    )
  }
  return (
    <button type="button" className="classic-bubble-btn" onClick={onClick} aria-label={label}>
      <span className={`classic-bubble ${state}`.trim()} />
    </button>
  )
}

export function numOrNull(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function clampMarks(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(3, Math.floor(value)))
}

export function asProfBonus(character: CharacterDetail): number {
  const proficiency = asRecord(asRecord(character.sheet).proficiency)
  const stored = proficiency.bonus
  if (typeof stored === 'number' && Number.isFinite(stored)) {
    return Math.floor(stored)
  }
  // Create/save historically omitted proficiency.bonus — derive from level.
  const level =
    typeof character.level === 'number' && Number.isFinite(character.level)
      ? character.level
      : 1
  return proficiencyBonusForTotalLevel(level)
}

export function asRecordNotes(character: CharacterDetail): string {
  const notes = asRecord(asRecord(character.sheet).notes)
  return typeof notes.proficiencies === 'string' ? notes.proficiencies : ''
}

export function brandYearLabel(layout: '2014' | '2024'): string {
  return `5e · ${layout}`
}
