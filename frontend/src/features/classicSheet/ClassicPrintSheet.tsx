import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { CharacterDetail } from '../../shared/api/characters'
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  SKILL_DEFS,
  abilityModifier,
  formatModifier,
} from '../characters/sheetTypes'
import {
  abilityScore,
  applyClassicEdits,
  combatField,
  equipmentText,
  identityField,
  inventoryCoins,
  isSaveProficient,
  setCoins,
  skillFlags,
  textBlockValue,
  weaponsSummary,
} from './fromApi'
import './classicPrint.css'

type Props = {
  character: CharacterDetail
  onPatch: (patch: ReturnType<typeof applyClassicEdits>) => void
}

function Expanding({
  value,
  onChange,
  printMaxHeight,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  printMaxHeight?: string
  ariaLabel?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.max(el.scrollHeight, 24)}px`
  }, [value])
  const style = printMaxHeight
    ? ({ ['--print-max-height']: printMaxHeight } as CSSProperties)
    : undefined
  return (
    <textarea
      ref={ref}
      className="classic-expand"
      value={value}
      aria-label={ariaLabel}
      rows={1}
      style={style}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function Bubble({ filled, onClick }: { filled: boolean; onClick: () => void }) {
  return (
    <button type="button" className="classic-bubble-btn" onClick={onClick}>
      <span className={`classic-bubble ${filled ? 'is-filled' : ''}`} />
    </button>
  )
}

export function ClassicPrintSheet({ character: c, onPatch }: Props) {
  const combatNum = (key: string): string => {
    const v = combatField(c, key)
    return v == null ? '' : String(v)
  }

  const patch = (edits: Parameters<typeof applyClassicEdits>[1]) => {
    onPatch(applyClassicEdits(c, edits))
  }

  const classAndLevel = [c.class_name, c.level].filter(Boolean).join(' ')
  const coins = inventoryCoins(c)
  const weapons = weaponsSummary(c)
  const proficiency = Number(asProfBonus(c))
  const passivePerception =
    10 +
    abilityModifier(abilityScore(c, 'wis')) +
    (skillFlags(c, 'perception').is_proficient ? proficiency : 0) +
    (skillFlags(c, 'perception').is_expertise ? proficiency : 0)

  return (
    <div className="classic-stack">
      <article className="classic-sheet classic-page1">
        <header className="classic-header">
          <div className="classic-brand">
            <strong>D&amp;D</strong>
            <span>5e · {c.rules_edition}</span>
          </div>
          <label className="classic-name">
            <span>Имя персонажа</span>
            <input value={c.name} onChange={(e) => patch({ name: e.target.value })} />
          </label>
          <div className="classic-meta">
            <label>
              <span>Класс и уровень</span>
              <input
                value={classAndLevel}
                onChange={(e) => {
                  const match = e.target.value.match(/^(.*?)(\d+)?$/)
                  const className = match?.[1]?.trim() || ''
                  const level = match?.[2] ? Number(match[2]) : c.level
                  patch({ class_name: className || null, level })
                }}
              />
            </label>
            <label>
              <span>Предыстория</span>
              <input
                value={String(identityField(c, 'background') ?? '')}
                onChange={(e) => patch({ identity: { background: e.target.value || null } })}
              />
            </label>
            <label>
              <span>Раса</span>
              <input
                value={c.race_name ?? ''}
                onChange={(e) => patch({ race_name: e.target.value || null })}
              />
            </label>
            <label>
              <span>Мировоззрение</span>
              <input
                value={String(identityField(c, 'alignment') ?? '')}
                onChange={(e) => patch({ identity: { alignment: e.target.value || null } })}
              />
            </label>
            <label>
              <span>Опыт</span>
              <input
                value={String(identityField(c, 'experience') ?? '')}
                onChange={(e) =>
                  patch({ identity: { experience: Number(e.target.value) || 0 } })
                }
              />
            </label>
            <label>
              <span>Имя игрока</span>
              <input
                value={String(identityField(c, 'player_name') ?? '')}
                onChange={(e) => patch({ identity: { player_name: e.target.value || null } })}
              />
            </label>
          </div>
        </header>

        <div className="classic-body">
          <div className="classic-col">
            <div className="classic-abilities-wrap">
              <div>
                {ABILITY_KEYS.map((key) => (
                  <div className="classic-ability" key={key}>
                    <div className="classic-ability__label">{ABILITY_LABELS[key]}</div>
                    <input
                      type="number"
                      value={abilityScore(c, key)}
                      onChange={(e) =>
                        patch({ abilities: { [key]: Number(e.target.value) || 0 } })
                      }
                    />
                    <div className="classic-ability__mod">
                      {formatModifier(abilityModifier(abilityScore(c, key)))}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="classic-insp">
                  <input
                    type="checkbox"
                    checked={Boolean(combatField(c, 'inspiration'))}
                    onChange={(e) => patch({ combat: { inspiration: e.target.checked } })}
                  />
                  Вдохновение
                </label>
                <div className="classic-panel">
                  {ABILITY_KEYS.map((key) => (
                    <div className="classic-check" key={key}>
                      <Bubble
                        filled={isSaveProficient(c, key)}
                        onClick={() =>
                          patch({ saveProficiency: { [key]: !isSaveProficient(c, key) } })
                        }
                      />
                      <strong>
                        {formatModifier(
                          abilityModifier(abilityScore(c, key)) +
                            (isSaveProficient(c, key) ? proficiency : 0),
                        )}
                      </strong>
                      <span>{ABILITY_LABELS[key]}</span>
                    </div>
                  ))}
                  <div className="classic-caption">Спасброски</div>
                </div>
                <div className="classic-panel">
                  {SKILL_DEFS.map((skill) => {
                    const flags = skillFlags(c, skill.key)
                    const bonus =
                      abilityModifier(abilityScore(c, skill.base)) +
                      (flags.is_expertise ? proficiency * 2 : flags.is_proficient ? proficiency : 0)
                    return (
                      <div className="classic-check" key={skill.key}>
                        <Bubble
                          filled={flags.is_proficient}
                          onClick={() =>
                            patch({
                              skillProficiency: { [skill.key]: !flags.is_proficient },
                            })
                          }
                        />
                        <strong>{formatModifier(bonus)}</strong>
                        <span>{skill.label}</span>
                      </div>
                    )
                  })}
                  <div className="classic-caption">Навыки</div>
                </div>
              </div>
            </div>
            <div className="classic-passive">
              <strong>{passivePerception}</strong>
              <span>Пассивная мудрость (Восприятие)</span>
            </div>
            <div className="classic-panel">
              <Expanding
                value={String(asRecordNotes(c))}
                printMaxHeight="9rem"
                ariaLabel="Прочие владения"
                onChange={(otherProficiencies) => patch({ otherProficiencies })}
              />
              <div className="classic-caption">Прочие владения и языки</div>
            </div>
          </div>

          <div className="classic-col">
            <div className="classic-combat-row">
              <label>
                <input
                  value={combatNum('ac')}
                  onChange={(e) => patch({ combat: { ac: numOrNull(e.target.value) } })}
                />
                <span>КЗ</span>
              </label>
              <label>
                <input
                  value={combatNum('initiative')}
                  onChange={(e) => patch({ combat: { initiative: numOrNull(e.target.value) } })}
                />
                <span>Инициатива</span>
              </label>
              <label>
                <input
                  value={combatNum('speed')}
                  onChange={(e) => patch({ combat: { speed: numOrNull(e.target.value) } })}
                />
                <span>Скорость</span>
              </label>
            </div>
            <div className="classic-panel">
              <label className="classic-hp-max">
                Максимум
                <input
                  value={c.hp_max ?? ''}
                  onChange={(e) => patch({ hp_max: numOrNull(e.target.value) })}
                />
              </label>
              <input
                className="classic-hp"
                value={c.hp_current ?? ''}
                onChange={(e) => patch({ hp_current: numOrNull(e.target.value) })}
              />
              <div className="classic-caption">Текущие хиты</div>
            </div>
            <div className="classic-panel">
              <input
                className="classic-hp"
                value={combatNum('hp_temp')}
                onChange={(e) => patch({ combat: { hp_temp: Number(e.target.value) || 0 } })}
              />
              <div className="classic-caption">Временные хиты</div>
            </div>
            <div className="classic-panel">
              {weapons.map((row, idx) => (
                <div className="classic-weapon" key={idx}>
                  <span>{row.name || '—'}</span>
                  <span>{row.attackBonus}</span>
                  <span>{row.damageType}</span>
                </div>
              ))}
              <div className="classic-caption">Атаки (из карточки)</div>
            </div>
            <div className="classic-panel classic-equip">
              <div className="classic-coins">
                {(['cp', 'sp', 'ep', 'gp', 'pp'] as const).map((k) => (
                  <label key={k}>
                    {k.toUpperCase()}
                    <input
                      value={coins[k]}
                      onChange={(e) =>
                        onPatch({
                          sheet: setCoins(c, { ...coins, [k]: e.target.value }),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <Expanding value={equipmentText(c)} printMaxHeight="8rem" ariaLabel="Снаряжение" onChange={() => undefined} />
              <div className="classic-caption">Снаряжение</div>
            </div>
          </div>

          <div className="classic-col">
            {(
              [
                ['personality', 'Черты характера', '3.2rem'],
                ['ideals', 'Идеалы', '2.6rem'],
                ['bonds', 'Привязанности', '2.6rem'],
                ['flaws', 'Слабости', '2.6rem'],
                ['features', 'Умения и особенности', '18rem'],
              ] as const
            ).map(([key, label, height]) => (
              <div className="classic-panel" key={key}>
                <Expanding
                  value={textBlockValue(c, key)}
                  printMaxHeight={height}
                  ariaLabel={label}
                  onChange={(value) => patch({ textBlocks: { [key]: value } })}
                />
                <div className="classic-caption">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </article>

      <article className="classic-sheet classic-page2">
        <header className="classic-header classic-header--simple">
          <div className="classic-brand">
            <strong>D&amp;D</strong>
          </div>
          <label className="classic-name">
            <span>Имя персонажа</span>
            <input value={c.name} onChange={(e) => patch({ name: e.target.value })} />
          </label>
        </header>
        <div className="classic-page2-grid">
          <div className="classic-panel">
            <Expanding
              value={textBlockValue(c, 'appearance')}
              printMaxHeight="16rem"
              onChange={(value) => patch({ textBlocks: { appearance: value } })}
            />
            <div className="classic-caption">Внешность персонажа</div>
          </div>
          <div className="classic-panel">
            <Expanding
              value={textBlockValue(c, 'quests')}
              printMaxHeight="10rem"
              onChange={(value) => patch({ textBlocks: { quests: value } })}
            />
            <div className="classic-caption">Союзники / цели</div>
          </div>
          <div className="classic-panel">
            <Expanding
              value={textBlockValue(c, 'background')}
              printMaxHeight="20rem"
              onChange={(value) => patch({ textBlocks: { background: value } })}
            />
            <div className="classic-caption">Предыстория персонажа</div>
          </div>
          <div className="classic-panel">
            <Expanding
              value={textBlockValue(c, 'feats')}
              printMaxHeight="12rem"
              onChange={(value) => patch({ textBlocks: { feats: value } })}
            />
            <div className="classic-caption">Дополнительные умения</div>
          </div>
        </div>
      </article>
    </div>
  )
}

function numOrNull(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function asProfBonus(character: CharacterDetail): number {
  const proficiency = asRecordSafe(asRecordSafe(character.sheet).proficiency)
  return readNumber(proficiency.bonus, 2)
}

function asRecordSafe(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asRecordNotes(character: CharacterDetail): string {
  const notes = asRecordSafe(asRecordSafe(character.sheet).notes)
  return typeof notes.proficiencies === 'string' ? notes.proficiencies : ''
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

void ABILITY_KEYS