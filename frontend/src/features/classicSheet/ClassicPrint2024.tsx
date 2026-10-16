import type { CharacterDetail } from '../../shared/api/characters'
import {
  ABILITY_KEYS,
  ABILITY_NAMES,
  SKILL_DEFS,
  abilityModifier,
  formatModifier,
  type AbilityKey,
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
import type { SheetSpell } from '../characters/spells'
import {
  classicSpellAbilityLabel,
  classicSpellStats,
  classicSpellsState,
  parseCastingAbilityInput,
  setCastingAbility,
  setSlotExpended,
  setSlotTotal,
  setSpellNameAt,
  toggleSpellPrepared,
} from './classicSpells'
import {
  Expanding,
  Bubble,
  asProfBonus,
  asRecordNotes,
  brandYearLabel,
  clampMarks,
  numOrNull,
} from './classicPrintShared'

type Props = {
  character: CharacterDetail
  onPatch: (patch: ReturnType<typeof applyClassicEdits>) => void
}

const SKILLS_BY_ABILITY: Record<AbilityKey, typeof SKILL_DEFS> = {
  str: SKILL_DEFS.filter((s) => s.base === 'str'),
  dex: SKILL_DEFS.filter((s) => s.base === 'dex'),
  con: SKILL_DEFS.filter((s) => s.base === 'con'),
  int: SKILL_DEFS.filter((s) => s.base === 'int'),
  wis: SKILL_DEFS.filter((s) => s.base === 'wis'),
  cha: SKILL_DEFS.filter((s) => s.base === 'cha'),
}

/** Flat prepared/known spell rows for 2024 page 2 table (cantrips + leveled). */
const SPELL_TABLE_ROWS = 22

export function ClassicPrint2024({ character: c, onPatch }: Props) {
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
  const hitDiceTotal = String(c.level || '')
  const hitDiceCurrent = combatNum('hp_dice_current') || hitDiceTotal
  const deathSuccesses = clampMarks(Number(combatField(c, 'death_successes') ?? 0))
  const deathFails = clampMarks(Number(combatField(c, 'death_fails') ?? 0))
  const attunement = clampMarks(Number(combatField(c, 'attunement_used') ?? 0))
  const spells = classicSpellsState(c)
  const spellStats = classicSpellStats(c, spells)
  const passivePerception =
    10 +
    abilityModifier(abilityScore(c, 'wis')) +
    (skillFlags(c, 'perception').is_proficient ? proficiency : 0) +
    (skillFlags(c, 'perception').is_expertise ? proficiency : 0)

  const spellRows = buildSpellTableRows(spells.known)

  return (
    <>
      <article className="classic-sheet classic-2024-page1" aria-label="Классический лист 2024, страница 1">
        <header className="classic-header classic-2024-header">
          <div className="classic-brand">
            <strong>D&amp;D</strong>
            <span>{brandYearLabel('2024')}</span>
          </div>
          <label className="classic-name">
            <span>Имя персонажа</span>
            <input value={c.name} onChange={(e) => patch({ name: e.target.value })} />
          </label>
          <div className="classic-meta classic-2024-meta">
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
              <span>Подкласс</span>
              <input
                value={String(identityField(c, 'subclass') ?? '')}
                onChange={(e) => patch({ identity: { subclass: e.target.value || null } })}
              />
            </label>
            <label>
              <span>Вид</span>
              <input
                value={c.race_name ?? ''}
                onChange={(e) => patch({ race_name: e.target.value || null })}
              />
            </label>
            <label>
              <span>Предыстория</span>
              <input
                value={String(identityField(c, 'background') ?? '')}
                readOnly
                title="Выбор из справочника — в панели над листом (не печатается)"
              />
            </label>
            <label>
              <span>Игрок</span>
              <input
                value={String(identityField(c, 'player_name') ?? '')}
                onChange={(e) => patch({ identity: { player_name: e.target.value || null } })}
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
          </div>
        </header>

        <div className="classic-2024-body">
          <div className="classic-2024-left">
            <div className="classic-2024-prof-row">
              <div className="classic-prof classic-2024-prof">
                <input
                  type="number"
                  value={proficiency}
                  onChange={(e) => patch({ proficiencyBonus: Number(e.target.value) || 0 })}
                />
                <span>Бонус владения</span>
              </div>
            </div>

            <div className="classic-2024-abilities">
              {ABILITY_KEYS.map((key) => {
                const score = abilityScore(c, key)
                const mod = abilityModifier(score)
                const saveProf = isSaveProficient(c, key)
                const saveBonus = mod + (saveProf ? proficiency : 0)
                return (
                  <section className="classic-2024-ability" key={key}>
                    <div className="classic-2024-ability__score">
                      <div className="classic-2024-ability__label">{ABILITY_NAMES[key]}</div>
                      <input
                        type="number"
                        value={score}
                        onChange={(e) =>
                          patch({ abilities: { [key]: Number(e.target.value) || 0 } })
                        }
                      />
                      <div className="classic-2024-ability__mod">{formatModifier(mod)}</div>
                    </div>
                    <div className="classic-2024-ability__save">
                      <Bubble
                        filled={saveProf}
                        label={`Владение спасброском: ${ABILITY_NAMES[key]}`}
                        onClick={() =>
                          patch({ saveProficiency: { [key]: !saveProf } })
                        }
                      />
                      <strong>{formatModifier(saveBonus)}</strong>
                      <span>Спасбросок</span>
                    </div>
                    <ul className="classic-2024-skills">
                      {SKILLS_BY_ABILITY[key].map((skill) => {
                        const flags = skillFlags(c, skill.key)
                        const bonus =
                          mod +
                          (flags.is_expertise
                            ? proficiency * 2
                            : flags.is_proficient
                              ? proficiency
                              : 0)
                        return (
                          <li key={skill.key}>
                            <Bubble
                              filled={flags.is_proficient || flags.is_expertise}
                              label={`Владение навыком: ${skill.label}`}
                              onClick={() =>
                                patch({
                                  skillProficiency: {
                                    [skill.key]: !flags.is_proficient,
                                  },
                                })
                              }
                            />
                            <strong>{formatModifier(bonus)}</strong>
                            <span>{skill.label}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )
              })}
            </div>

            <label className="classic-insp classic-2024-insp">
              <input
                type="checkbox"
                checked={Boolean(combatField(c, 'inspiration'))}
                onChange={(e) => patch({ combat: { inspiration: e.target.checked } })}
              />
              Героическое вдохновение
            </label>
          </div>

          <div className="classic-2024-mid">
            <div className="classic-2024-combat-bar">
              <label className="classic-combat-stat classic-combat-stat--ac">
                <input
                  value={combatNum('ac')}
                  onChange={(e) => patch({ combat: { ac: numOrNull(e.target.value) } })}
                />
                <span>КД</span>
              </label>
              <label className="classic-combat-stat">
                <input
                  value={combatNum('initiative')}
                  onChange={(e) =>
                    patch({ combat: { initiative: numOrNull(e.target.value) } })
                  }
                />
                <span>Иниц.</span>
              </label>
              <label className="classic-combat-stat">
                <input
                  value={combatNum('speed')}
                  onChange={(e) => patch({ combat: { speed: numOrNull(e.target.value) } })}
                />
                <span>Скор.</span>
              </label>
              <label className="classic-combat-stat">
                <input
                  value={String(identityField(c, 'size') ?? '')}
                  onChange={(e) => patch({ identity: { size: e.target.value || null } })}
                />
                <span>Размер</span>
              </label>
              <label className="classic-combat-stat">
                <input value={String(passivePerception)} readOnly />
                <span>Пасс. Воспр.</span>
              </label>
            </div>

            <div className="classic-panel classic-panel--hp">
              <label className="classic-hp-max">
                Максимум хитов
                <input
                  value={c.hp_max ?? ''}
                  onChange={(e) => patch({ hp_max: numOrNull(e.target.value) })}
                />
              </label>
              <div className="classic-2024-hp-row">
                <div>
                  <input
                    className="classic-hp"
                    value={c.hp_current ?? ''}
                    aria-label="Текущие хиты"
                    onChange={(e) => patch({ hp_current: numOrNull(e.target.value) })}
                  />
                  <div className="classic-caption">Текущие</div>
                </div>
                <div>
                  <input
                    className="classic-hp"
                    value={combatNum('hp_temp')}
                    aria-label="Временные хиты"
                    onChange={(e) =>
                      patch({ combat: { hp_temp: Number(e.target.value) || 0 } })
                    }
                  />
                  <div className="classic-caption">Временные</div>
                </div>
              </div>
            </div>

            <div className="classic-hit-death-row">
              <section className="classic-panel classic-hit-dice">
                <label>
                  Всего
                  <input value={hitDiceTotal} readOnly title="По уровню персонажа" />
                </label>
                <input
                  value={hitDiceCurrent}
                  aria-label="Текущие кости хитов"
                  onChange={(e) =>
                    patch({ combat: { hp_dice_current: numOrNull(e.target.value) } })
                  }
                />
                <div className="classic-caption">Кости хитов</div>
              </section>
              <section className="classic-panel classic-death-saves">
                <div className="classic-death-line">
                  <span>Успехи</span>
                  {[0, 1, 2].map((i) => (
                    <Bubble
                      key={`s${i}`}
                      filled={deathSuccesses > i}
                      label={`Успех спасброска от смерти ${i + 1}`}
                      onClick={() =>
                        patch({
                          combat: { death_successes: deathSuccesses === i + 1 ? i : i + 1 },
                        })
                      }
                    />
                  ))}
                </div>
                <div className="classic-death-line">
                  <span>Провалы</span>
                  {[0, 1, 2].map((i) => (
                    <Bubble
                      key={`f${i}`}
                      filled={deathFails > i}
                      label={`Провал спасброска от смерти ${i + 1}`}
                      onClick={() =>
                        patch({
                          combat: { death_fails: deathFails === i + 1 ? i : i + 1 },
                        })
                      }
                    />
                  ))}
                </div>
                <div className="classic-caption">Спасброски от смерти</div>
              </section>
            </div>

            <div className="classic-panel classic-panel--grow">
              <div className="classic-attacks-head classic-2024-weapons-head">
                <span>Название</span>
                <span>Атака / Сл</span>
                <span>Урон и тип</span>
                <span>Заметки</span>
              </div>
              {weapons.map((row, idx) => (
                <div className="classic-weapon classic-2024-weapon" key={idx}>
                  <span>{row.name || '—'}</span>
                  <span>{row.attackBonus || '—'}</span>
                  <span>{row.damageType || '—'}</span>
                  <span />
                </div>
              ))}
              <Expanding
                fill
                value={textBlockValue(c, 'attacks')}
                printMaxHeight="4rem"
                ariaLabel="Заметки к оружию и заговорам урона"
                onChange={(value) => patch({ textBlocks: { attacks: value } })}
              />
              <div className="classic-caption">Оружие и заговоры урона</div>
            </div>

            <div className="classic-panel classic-panel--grow">
              <Expanding
                fill
                value={asRecordNotes(c)}
                printMaxHeight="6rem"
                ariaLabel="Владения и обучение"
                onChange={(otherProficiencies) => patch({ otherProficiencies })}
              />
              <div className="classic-caption">Владения и обучение</div>
            </div>
          </div>

          <div className="classic-2024-right">
            <div className="classic-panel classic-panel--grow">
              <Expanding
                fill
                value={textBlockValue(c, 'features')}
                printMaxHeight="10rem"
                ariaLabel="Умения класса"
                onChange={(value) => patch({ textBlocks: { features: value } })}
              />
              <div className="classic-caption">Умения класса</div>
            </div>
            <div className="classic-panel classic-panel--grow">
              <Expanding
                fill
                value={textBlockValue(c, 'traits')}
                printMaxHeight="6rem"
                ariaLabel="Черты вида"
                onChange={(value) => patch({ textBlocks: { traits: value } })}
              />
              <div className="classic-caption">Черты вида</div>
            </div>
            <div className="classic-panel classic-panel--grow">
              <Expanding
                fill
                value={textBlockValue(c, 'feats')}
                printMaxHeight="6rem"
                ariaLabel="Черты"
                onChange={(value) => patch({ textBlocks: { feats: value } })}
              />
              <div className="classic-caption">Черты</div>
            </div>
            <div className="classic-panel classic-panel--grow classic-panel--grow-lg">
              <Expanding
                fill
                value={textBlockValue(c, 'free')}
                printMaxHeight="6rem"
                ariaLabel="Дополнительные умения"
                onChange={(value) => patch({ textBlocks: { free: value } })}
              />
              <div className="classic-caption">Дополнительные умения</div>
            </div>
          </div>
        </div>
      </article>

      <article className="classic-sheet classic-2024-page2" aria-label="Классический лист 2024, страница 2">
        <header className="classic-header classic-header--simple">
          <div className="classic-brand">
            <strong>D&amp;D</strong>
            <span>{brandYearLabel('2024')}</span>
          </div>
          <label className="classic-name">
            <span>Имя персонажа</span>
            <input value={c.name} onChange={(e) => patch({ name: e.target.value })} />
          </label>
        </header>

        <div className="classic-2024-page2-grid">
          <div className="classic-2024-spells">
            <div className="classic-2024-spell-stats">
              <label>
                <span>Класс заклинателя</span>
                <input
                  value={c.class_name ?? ''}
                  onChange={(e) => patch({ class_name: e.target.value || null })}
                />
              </label>
              <label>
                <span>Характеристика</span>
                <input
                  value={classicSpellAbilityLabel(spells.casting_ability)}
                  placeholder="ИНТ / МУД / ХАР"
                  onChange={(e) =>
                    onPatch(setCastingAbility(c, parseCastingAbilityInput(e.target.value)))
                  }
                />
              </label>
              <label>
                <span>Модификатор</span>
                <input
                  value={
                    spells.casting_ability
                      ? formatModifier(abilityModifier(abilityScore(c, spells.casting_ability)))
                      : ''
                  }
                  readOnly
                />
              </label>
              <label>
                <span>Сл спасброска</span>
                <input value={spellStats.saveDc} readOnly />
              </label>
              <label>
                <span>Атака закл.</span>
                <input value={spellStats.attackBonus} readOnly />
              </label>
            </div>

            <div className="classic-2024-slots">
              {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((level) => {
                const slot = spells.slots[String(level)] ?? { max: 0, used: 0 }
                return (
                  <div className="classic-2024-slot" key={level}>
                    <strong>{level}</strong>
                    <label>
                      Всего
                      <input
                        type="number"
                        value={slot.max || ''}
                        onChange={(e) =>
                          onPatch(setSlotTotal(c, level, Number(e.target.value) || 0))
                        }
                      />
                    </label>
                    <label>
                      Потрачено
                      <input
                        type="number"
                        value={slot.used || ''}
                        onChange={(e) =>
                          onPatch(setSlotExpended(c, level, Number(e.target.value) || 0))
                        }
                      />
                    </label>
                  </div>
                )
              })}
            </div>

            <div className="classic-panel classic-2024-spell-table classic-panel--grow">
              <div className="classic-2024-spell-table__head">
                <span />
                <span>Ур.</span>
                <span>Название</span>
                <span>Время</span>
                <span>Дист.</span>
                <span>Заметки</span>
                <span>К</span>
                <span>Р</span>
                <span>М</span>
              </div>
              <ul className="classic-2024-spell-table__rows">
                {spellRows.map((row, i) => (
                  <li key={row?.id ?? `spell-row-${i}`}>
                    <button
                      type="button"
                      className="classic-bubble-btn"
                      aria-label="Подготовлено"
                      disabled={!row}
                      onClick={() => {
                        if (row) onPatch(toggleSpellPrepared(c, row.id))
                      }}
                    >
                      <span
                        className={`classic-bubble ${row?.prepared ? 'is-filled' : ''}`}
                      />
                    </button>
                    <span className="classic-2024-spell-lvl">
                      {row ? (row.level === 0 ? '0' : String(row.level)) : ''}
                    </span>
                    <input
                      value={row?.name ?? ''}
                      onChange={(e) => {
                        if (!row) return
                        onPatch(
                          setSpellNameAt(
                            c,
                            row.level,
                            indexOfSpellAtLevel(spells.known, row),
                            e.target.value,
                          ),
                        )
                      }}
                    />
                    <span>{row?.casting_time ?? ''}</span>
                    <span>{row?.range ?? ''}</span>
                    <span className="classic-2024-spell-notes">{row?.notes ?? ''}</span>
                    <span className={row?.concentration ? 'is-on' : ''}>
                      {row?.concentration ? '●' : ''}
                    </span>
                    <span className={row?.ritual ? 'is-on' : ''}>{row?.ritual ? '●' : ''}</span>
                    <span className={hasMaterial(row) ? 'is-on' : ''}>
                      {hasMaterial(row) ? '●' : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="classic-caption">Заговоры и подготовленные заклинания</div>
            </div>
          </div>

          <div className="classic-2024-details">
            <div className="classic-panel classic-panel--grow">
              <Expanding
                fill
                value={textBlockValue(c, 'appearance')}
                printMaxHeight="7rem"
                ariaLabel="Внешность"
                onChange={(value) => patch({ textBlocks: { appearance: value } })}
              />
              <div className="classic-caption">Внешность</div>
            </div>

            <div className="classic-panel classic-panel--grow">
              <label className="classic-2024-alignment">
                <span>Мировоззрение</span>
                <input
                  value={String(identityField(c, 'alignment') ?? '')}
                  onChange={(e) =>
                    patch({ identity: { alignment: e.target.value || null } })
                  }
                />
              </label>
              <Expanding
                fill
                value={textBlockValue(c, 'background')}
                printMaxHeight="5.5rem"
                ariaLabel="Предыстория"
                onChange={(value) => patch({ textBlocks: { background: value } })}
              />
              <Expanding
                fill
                value={[
                  textBlockValue(c, 'personality'),
                  textBlockValue(c, 'ideals'),
                  textBlockValue(c, 'bonds'),
                  textBlockValue(c, 'flaws'),
                ]
                  .filter(Boolean)
                  .join('\n')}
                printMaxHeight="4.5rem"
                ariaLabel="Личность"
                onChange={(value) => patch({ textBlocks: { personality: value } })}
              />
              <div className="classic-caption">Предыстория и личность</div>
            </div>

            <div className="classic-panel classic-panel--grow">
              <Expanding
                fill
                value={asRecordNotes(c)}
                printMaxHeight="3.5rem"
                ariaLabel="Языки"
                onChange={(otherProficiencies) => patch({ otherProficiencies })}
              />
              <div className="classic-caption">Языки</div>
            </div>

            <div className="classic-panel classic-equip classic-panel--grow classic-panel--grow-lg">
              <div className="classic-2024-attune">
                <span>Настройка</span>
                {[0, 1, 2].map((i) => (
                  <Bubble
                    key={`a${i}`}
                    filled={attunement > i}
                    label={`Слот настройки ${i + 1}`}
                    onClick={() =>
                      patch({
                        combat: { attunement_used: attunement === i + 1 ? i : i + 1 },
                      })
                    }
                  />
                ))}
              </div>
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
              <Expanding
                fill
                value={equipmentText(c)}
                printMaxHeight="10rem"
                ariaLabel="Снаряжение"
                onChange={() => undefined}
              />
              <div className="classic-caption">Снаряжение</div>
            </div>
          </div>
        </div>
      </article>
    </>
  )
}

function buildSpellTableRows(known: SheetSpell[]): Array<SheetSpell | null> {
  const ordered = [...known].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    return a.name.localeCompare(b.name, 'ru')
  })
  const rows: Array<SheetSpell | null> = [...ordered]
  while (rows.length < SPELL_TABLE_ROWS) rows.push(null)
  return rows.slice(0, SPELL_TABLE_ROWS)
}

function indexOfSpellAtLevel(known: SheetSpell[], row: SheetSpell): number {
  const atLevel = known.filter((s) => s.level === row.level)
  return Math.max(
    0,
    atLevel.findIndex((s) => s.id === row.id),
  )
}

function hasMaterial(spell: SheetSpell | null): boolean {
  return Boolean(spell?.components?.m)
}
