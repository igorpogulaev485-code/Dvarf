import { NumberInput, Text } from '../../ui'
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  SKILL_DEFS,
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'

type SkillState = { is_proficient: boolean; is_expertise: boolean }

type AbilitySkillsColumnProps = {
  abilityOrder: AbilityKey[]
  collapsedAbilities: AbilityKey[]
  /** Base scores shown in inputs. */
  abilities: Record<AbilityKey, number>
  /** Effective scores for mods (gear etc.); defaults to abilities. */
  displayAbilities?: Record<AbilityKey, number>
  saves: Record<AbilityKey, boolean>
  skills: Record<string, SkillState>
  proficiencyBonus: number
  auraSaveBonus?: number
  saveBonusExtra?: Partial<Record<AbilityKey | 'all', number>>
  skillBonusExtra?: Record<string, number>
  onAbilityScoreChange: (key: AbilityKey, score: number) => void
  onSaveToggle: (key: AbilityKey) => void
  onSkillCycle: (skillKey: string) => void
  onReorder: (order: AbilityKey[]) => void
  onCollapsedChange: (collapsed: AbilityKey[]) => void
}

function cycleSkill(state: SkillState): SkillState {
  if (!state.is_proficient && !state.is_expertise) {
    return { is_proficient: true, is_expertise: false }
  }
  if (state.is_proficient && !state.is_expertise) {
    return { is_proficient: true, is_expertise: true }
  }
  return { is_proficient: false, is_expertise: false }
}

function skillMark(state: SkillState): string {
  if (state.is_expertise) return 'Эксп.'
  if (state.is_proficient) return 'Влад.'
  return '—'
}

function skillMeta(state: SkillState, modLabel: string, gearLabel: string): string {
  const mark = skillMark(state)
  if (mark === '—') return `— ${modLabel}${gearLabel}`
  return `${mark} ${modLabel}${gearLabel}`
}

export { cycleSkill }

export function AbilitySkillsColumn({
  abilityOrder,
  collapsedAbilities,
  abilities,
  displayAbilities,
  saves,
  skills,
  proficiencyBonus,
  auraSaveBonus = 0,
  saveBonusExtra = {},
  skillBonusExtra = {},
  onAbilityScoreChange,
  onSaveToggle,
  onSkillCycle,
  onReorder,
  onCollapsedChange,
}: AbilitySkillsColumnProps) {
  const order = abilityOrder.length === ABILITY_KEYS.length ? abilityOrder : [...ABILITY_KEYS]
  const collapsed = new Set(collapsedAbilities)
  const shown = displayAbilities ?? abilities

  function setCollapsed(key: AbilityKey, next: boolean) {
    const set = new Set(collapsedAbilities)
    if (next) set.add(key)
    else set.delete(key)
    onCollapsedChange([...set])
  }

  function moveBefore(fromKey: AbilityKey, toKey: AbilityKey) {
    if (fromKey === toKey) return
    const next = order.filter((key) => key !== fromKey)
    const index = next.indexOf(toKey)
    if (index < 0) return
    next.splice(index, 0, fromKey)
    onReorder(next)
  }

  return (
    <div className="abil-column">
      <div className="abil-column__toolbar">
        <button
          type="button"
          onClick={() => onCollapsedChange([...ABILITY_KEYS])}
        >
          ▲ Свернуть все
        </button>
        <button type="button" onClick={() => onCollapsedChange([])}>
          ▼ Развернуть все
        </button>
      </div>
      <Text tone="muted" className="abil-column__hint">
        ▾ свернуть · ⋮⋮ порядок · клик по навыку: владение / экспертиза
      </Text>
      <div className="abil-column__list" id="abil-column-list">
        {order.map((key) => {
          const baseScore = abilities[key]
          const score = shown[key]
          const check = abilityModifier(score)
          const gearSave = (saveBonusExtra.all ?? 0) + (saveBonusExtra[key] ?? 0)
          const saveMod =
            check + (saves[key] ? proficiencyBonus : 0) + auraSaveBonus + gearSave
          const isCollapsed = collapsed.has(key)
          const related = SKILL_DEFS.filter((skill) => skill.base === key)
          return (
            <article
              key={key}
              className={`abil-block${isCollapsed ? ' is-collapsed' : ''}`}
              data-abil={key}
              onDragOver={(event) => {
                event.preventDefault()
                event.currentTarget.classList.add('drag-over')
              }}
              onDragLeave={(event) => {
                event.currentTarget.classList.remove('drag-over')
              }}
              onDrop={(event) => {
                event.preventDefault()
                event.currentTarget.classList.remove('drag-over')
                const from = event.dataTransfer.getData('text/ability') as AbilityKey
                if (ABILITY_KEYS.includes(from)) moveBefore(from, key)
              }}
            >
              <div className="abil-block__head">
                <span
                  className="abil-block__drag"
                  draggable
                  title="Зажми и перетащи характеристику"
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/ability', key)
                    event.dataTransfer.effectAllowed = 'move'
                    event.currentTarget.closest('.abil-block')?.classList.add('is-dragging')
                  }}
                  onDragEnd={(event) => {
                    event.currentTarget.closest('.abil-block')?.classList.remove('is-dragging')
                    document
                      .querySelectorAll('.abil-block.drag-over')
                      .forEach((node) => node.classList.remove('drag-over'))
                  }}
                >
                  ⋮⋮
                </span>
                <div className="abil-block__who">
                  <span className="abil-block__label">{ABILITY_LABELS[key]}</span>
                  <NumberInput
                    min={1}
                    max={30}
                    emptyValue={10}
                    value={baseScore}
                    onValueChange={(next) => onAbilityScoreChange(key, next ?? 10)}
                  />
                  {score !== baseScore ? (
                    <span className="abil-block__effective" title="С учётом предметов">
                      → {score}
                    </span>
                  ) : null}
                </div>
                <div className="abil-block__mods">
                  <span className="abil-mod" title="Проверка характеристики">
                    Пр {formatModifier(check)}
                  </span>
                  <button
                    type="button"
                    className={`abil-mod abil-mod--btn${saves[key] ? ' is-on' : ''}`}
                    title="Спасбросок — клик: владение"
                    onClick={() => onSaveToggle(key)}
                  >
                    Сп {formatModifier(saveMod)}
                  </button>
                </div>
                <button
                  type="button"
                  className="abil-block__toggle"
                  aria-expanded={!isCollapsed}
                  title={isCollapsed ? 'Развернуть навыки' : 'Свернуть навыки'}
                  onClick={() => setCollapsed(key, !isCollapsed)}
                >
                  {isCollapsed ? '▸' : '▾'}
                </button>
              </div>
              {!isCollapsed ? (
                <div className="abil-block__skills">
                  {related.length === 0 ? (
                    <Text tone="muted" className="abil-block__empty">
                      —
                    </Text>
                  ) : (
                    related.map((skill) => {
                      const state = skills[skill.key] ?? {
                        is_proficient: false,
                        is_expertise: false,
                      }
                      const gearSkill = skillBonusExtra[skill.key] ?? 0
                      const mod =
                        abilityModifier(shown[skill.base]) +
                        (state.is_expertise
                          ? proficiencyBonus * 2
                          : state.is_proficient
                            ? proficiencyBonus
                            : 0) +
                        gearSkill
                      return (
                        <button
                          key={skill.key}
                          type="button"
                          className={`abil-skill${state.is_proficient ? ' is-on' : ''}${state.is_expertise ? ' is-expert' : ''}`}
                          onClick={() => onSkillCycle(skill.key)}
                        >
                          <span>{skill.label}</span>
                          <span className="abil-skill__meta">
                            {skillMeta(
                              state,
                              formatModifier(mod),
                              gearSkill ? ` · предм. ${formatModifier(gearSkill)}` : '',
                            )}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
  )
}
