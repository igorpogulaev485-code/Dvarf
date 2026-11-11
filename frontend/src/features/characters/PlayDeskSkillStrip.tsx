import { formatModifier } from './sheetTypes'

export type PlayDeskSkillChip = {
  key: string
  label: string
  mod: number
  /** Proficient or expertise — tint the chip. */
  trained?: boolean
}

type PlayDeskSkillStripProps = {
  ariaLabel: string
  skills: PlayDeskSkillChip[]
  onSkillClick?: (skill: PlayDeskSkillChip) => void
}

export function PlayDeskSkillStrip({
  ariaLabel,
  skills,
  onSkillClick,
}: PlayDeskSkillStripProps) {
  return (
    <div className="play-desk__hot play-desk__hot--skills" aria-label={ariaLabel}>
      {skills.map((skill) => (
        <button
          key={skill.key}
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
      ))}
    </div>
  )
}
