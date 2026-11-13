import { useEffect, useId, useRef, useState } from 'react'
import { formatModifier } from './sheetTypes'

export type PlayDeskSkillChip = {
  key: string
  label: string
  mod: number
  /** Proficient or expertise — tint the chip. */
  trained?: boolean
}

/**
 * How many skill chips stay visible on phone before «Ещё».
 * SC-06: 3 + «Ещё» = ровно 2×2, без третьего ряда на всю ширину.
 */
export const MOBILE_SKILL_PINNED_COUNT = 3

type PlayDeskSkillStripProps = {
  ariaLabel: string
  skills: PlayDeskSkillChip[]
  onSkillClick?: (skill: PlayDeskSkillChip) => void
  /** Phone: wrap grid + «Ещё» instead of silent sideways scroll. */
  mobileOverflow?: boolean
}

function SkillChipButton({
  skill,
  onSkillClick,
}: {
  skill: PlayDeskSkillChip
  onSkillClick?: (skill: PlayDeskSkillChip) => void
}) {
  return (
    <button
      type="button"
      className={`play-desk__hot-item play-desk__hot-item--btn${
        skill.trained ? ' is-on' : ''
      }`}
      title={`${skill.label}: ${formatModifier(skill.mod)}`}
      onClick={() => onSkillClick?.(skill)}
    >
      <span>{skill.label}</span>
      <b>{formatModifier(skill.mod)}</b>
    </button>
  )
}

export function PlayDeskSkillStrip({
  ariaLabel,
  skills,
  onSkillClick,
  mobileOverflow = false,
}: PlayDeskSkillStripProps) {
  const pinned = mobileOverflow
    ? skills.slice(0, MOBILE_SKILL_PINNED_COUNT)
    : skills
  const overflow = mobileOverflow ? skills.slice(MOBILE_SKILL_PINNED_COUNT) : []
  const moreId = useId()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!moreOpen) return
    function onDocPointer(event: MouseEvent) {
      const root = moreWrapRef.current
      if (!root) return
      if (event.target instanceof Node && root.contains(event.target)) return
      setMoreOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDocPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  const skillKeys = skills.map((s) => s.key).join('|')
  useEffect(() => {
    setMoreOpen(false)
  }, [skillKeys, mobileOverflow])

  return (
    <div
      className={`play-desk__hot play-desk__hot--skills${
        mobileOverflow ? ' play-desk__hot--skills-mobile' : ''
      }`}
      aria-label={ariaLabel}
    >
      {pinned.map((skill) => (
        <SkillChipButton key={skill.key} skill={skill} onSkillClick={onSkillClick} />
      ))}
      {overflow.length > 0 ? (
        <div
          className="play-desk__hot-more play-desk__hot-more--skills play-desk__hot-more--skills-cell"
          ref={moreWrapRef}
        >
          <button
            type="button"
            className={`play-desk__hot-item play-desk__hot-item--btn play-desk__hot-more-btn${
              moreOpen ? ' is-on' : ''
            }`}
            aria-expanded={moreOpen}
            aria-controls={moreId}
            title="Остальные навыки"
            onClick={() => setMoreOpen((open) => !open)}
          >
            Ещё {overflow.length}
          </button>
          {moreOpen ? (
            <div
              id={moreId}
              className="play-desk__hot-more-panel"
              role="region"
              aria-label="Остальные навыки"
            >
              {overflow.map((skill) => (
                <SkillChipButton
                  key={skill.key}
                  skill={skill}
                  onSkillClick={onSkillClick}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
