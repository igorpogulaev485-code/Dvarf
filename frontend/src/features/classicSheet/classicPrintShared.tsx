import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { CharacterDetail } from '../../shared/api/characters'
import { asRecord, readNumber } from '../characters/sheetTypes'

export function Expanding({
  value,
  onChange,
  printMaxHeight,
  ariaLabel,
  className,
  fill,
  style: styleProp,
}: {
  value: string
  onChange: (value: string) => void
  printMaxHeight?: string
  ariaLabel?: string
  className?: string
  /** Stretch to fill a growable panel instead of hugging text height. */
  fill?: boolean
  style?: CSSProperties
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    if (fill) return
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.max(el.scrollHeight, 24)}px`
  }, [value, fill])
  const style: CSSProperties = {
    ...(printMaxHeight ? ({ ['--print-max-height']: printMaxHeight } as CSSProperties) : null),
    ...styleProp,
  }
  const classes = ['classic-expand', fill ? 'classic-expand--fill' : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <textarea
      ref={ref}
      className={classes}
      value={value}
      aria-label={ariaLabel}
      rows={1}
      style={style}
      onChange={(e) => onChange(e.target.value)}
    />
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
  onClick: () => void
  label?: string
}) {
  const state = expertise ? 'is-expertise' : filled ? 'is-filled' : ''
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
  return readNumber(proficiency.bonus, 2)
}

export function asRecordNotes(character: CharacterDetail): string {
  const notes = asRecord(asRecord(character.sheet).notes)
  return typeof notes.proficiencies === 'string' ? notes.proficiencies : ''
}

export function brandYearLabel(layout: '2014' | '2024'): string {
  return `5e · ${layout}`
}
