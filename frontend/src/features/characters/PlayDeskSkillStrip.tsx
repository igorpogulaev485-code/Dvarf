import { formatModifier } from './sheetTypes'

export type PlayDeskSkillChip = {
  key: string
  label: string
  mod: number
  mark?: string
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
          className="play-desk__hot-item play-desk__hot-item--btn"
          title={`${skill.label}: ${formatModifier(skill.mod)}`}
          onClick={() => onSkillClick?.(skill)}
        >
          <span>{skill.label}</span>
          <b>
            {formatModifier(skill.mod)}
            {skill.mark ? <small>{skill.mark}</small> : null}
          </b>
        </button>
      ))}
    </div>
  )
}
