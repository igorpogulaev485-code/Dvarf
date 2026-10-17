import type { CharacterDetail } from '../../shared/api/characters'
import {
  ABILITY_NAMES,
  SKILL_DEFS,
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from '../characters/sheetTypes'
import type { SheetSpell } from '../characters/spells'
import {
  abilityScore,
  applyClassicEdits,
  combatField,
  cycleSkillMastery,
  equipmentText,
  identityField,
  inventoryCoins,
  isSaveProficient,
  setCoins,
  skillFlags,
  textBlockValue,
  weaponsSummary,
} from './fromApi'
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
  Bubble,
  asProfBonus,
  asRecordNotes,
  brandYearLabel,
  clampMarks,
  numOrNull,
} from './classicPrintShared'
import {
  addClassicNote,
  classicNoteLabel,
  classicNoteText,
  listClassicNotes,
  paddedClassicNoteSlots,
  setClassicNoteLabel,
  setClassicNoteText,
} from './classicNotes'
import { ClassicTextBlock } from './ClassicTextBlock'

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

/** Left column abilities on LSS P1 (STR/DEX/CON). */
const ABILITY_COL_LEFT: AbilityKey[] = ['str', 'dex', 'con']
/** Right column abilities on LSS P1 (INT/WIS/CHA). */
const ABILITY_COL_RIGHT: AbilityKey[] = ['int', 'wis', 'cha']

const SPELL_TABLE_ROWS = 28

/**
 * Classic 2024 printable layout — LSS-style 4 pages (display only).
 * Same paper tokens as 2014; structure follows Long Story Short 2024 blank.
 */
export function ClassicPrint2024({ character: c, onPatch }: Props) {
  const combatNum = (key: string): string => {
    const v = combatField(c, key)
    return v == null ? '' : String(v)
  }

  const combatBool = (key: string): boolean => Boolean(combatField(c, key))

  const patch = (edits: Parameters<typeof applyClassicEdits>[1]) => {
    onPatch(applyClassicEdits(c, edits))
  }

  const proficiency = Number(asProfBonus(c))
  const hitDiceTotal = String(c.level || '')
  const hitDiceCurrent = combatNum('hp_dice_current') || hitDiceTotal
  const deathSuccesses = clampMarks(Number(combatField(c, 'death_successes') ?? 0))
  const deathFails = clampMarks(Number(combatField(c, 'death_fails') ?? 0))
  const exhaustion = clampExhaustion(Number(combatField(c, 'exhaustion') ?? 0))
  const attunement = clampMarks(Number(combatField(c, 'attunement_used') ?? 0))
  const spells = classicSpellsState(c)
  const spellStats = classicSpellStats(c, spells)
  const coins = inventoryCoins(c)
  const weapons = weaponsSummary(c)
  const passivePerception =
    10 +
    abilityModifier(abilityScore(c, 'wis')) +
    (skillFlags(c, 'perception').is_proficient ? proficiency : 0) +
    (skillFlags(c, 'perception').is_expertise ? proficiency : 0)

  const spellRows = buildSpellTableRows(spells.known)
  const customNotes = listClassicNotes(c)
  const noteSlots = paddedClassicNoteSlots(customNotes)

  return (
    <>
      {/* ——— P1 combat (LSS) ——— */}
      <article
        className="classic-sheet classic-lss classic-lss-p1"
        aria-label="Классический лист 2024, страница 1"
      >
        <header className="classic-lss-top">
          <div className="classic-lss-id">
            <label className="classic-lss-name">
              <input value={c.name} onChange={(e) => patch({ name: e.target.value })} />
              <span>Имя персонажа</span>
            </label>
            <div className="classic-lss-id-grid">
              <label>
                <input
                  value={String(identityField(c, 'background') ?? '')}
                  readOnly
                  title="Выбор из справочника — в панели над листом"
                />
                <span>Предыстория</span>
              </label>
              <label>
                <input
                  value={c.class_name ?? ''}
                  onChange={(e) => patch({ class_name: e.target.value || null })}
                />
                <span>Класс</span>
              </label>
              <label>
                <input
                  value={c.race_name ?? ''}
                  onChange={(e) => patch({ race_name: e.target.value || null })}
                />
                <span>Вид</span>
              </label>
              <label>
                <input
                  value={String(identityField(c, 'subclass') ?? '')}
                  onChange={(e) => patch({ identity: { subclass: e.target.value || null } })}
                />
                <span>Подкласс</span>
              </label>
            </div>
          </div>

          <div className="classic-lss-level">
            <label>
              <input
                type="number"
                value={c.level}
                onChange={(e) => patch({ level: Number(e.target.value) || 1 })}
              />
              <span>Уровень</span>
            </label>
            <label>
              <input
                value={String(identityField(c, 'experience') ?? '')}
                onChange={(e) =>
                  patch({ identity: { experience: Number(e.target.value) || 0 } })
                }
              />
              <span>Опыт</span>
            </label>
          </div>

          <div className="classic-lss-ac">
            <div className="classic-lss-ac__shield">
              <span className="classic-lss-ac__label">КЗ</span>
              <input
                value={combatNum('ac')}
                aria-label="Класс защиты"
                onChange={(e) => patch({ combat: { ac: numOrNull(e.target.value) } })}
              />
              <label className="classic-lss-ac__shield-flag">
                <Bubble
                  filled={combatBool('shield_equipped')}
                  label="Щит"
                  onClick={() =>
                    patch({ combat: { shield_equipped: !combatBool('shield_equipped') } })
                  }
                />
                Щит
              </label>
            </div>
          </div>

          <div className="classic-lss-vitals">
            <div className="classic-lss-hp">
              <span className="classic-lss-block-title">Хиты</span>
              <div className="classic-lss-hp__row">
                <label>
                  <input
                    value={c.hp_current ?? ''}
                    onChange={(e) => patch({ hp_current: numOrNull(e.target.value) })}
                  />
                  <span>Тек.</span>
                </label>
                <label>
                  <input
                    value={combatNum('hp_temp')}
                    onChange={(e) =>
                      patch({ combat: { hp_temp: Number(e.target.value) || 0 } })
                    }
                  />
                  <span>Врем.</span>
                </label>
                <label>
                  <input
                    value={c.hp_max ?? ''}
                    onChange={(e) => patch({ hp_max: numOrNull(e.target.value) })}
                  />
                  <span>Макс.</span>
                </label>
              </div>
            </div>
            <div className="classic-lss-hd">
              <span className="classic-lss-block-title">Кости хитов</span>
              <label>
                <input
                  value={`${hitDiceCurrent} / ${hitDiceTotal}`}
                  onChange={(e) => {
                    const m = e.target.value.match(/(\d+)/)
                    patch({
                      combat: { hp_dice_current: m ? Number(m[1]) : null },
                    })
                  }}
                />
                <span>Текущие</span>
              </label>
              <label>
                <input
                  value={String(combatField(c, 'hit_die') ?? '') || 'к6'}
                  onChange={(e) => patch({ combat: { hit_die: e.target.value || null } })}
                />
                <span>Кость</span>
              </label>
            </div>
            <div className="classic-lss-death">
              <span className="classic-lss-block-title">Спасброски от смерти</span>
              <div className="classic-death-line">
                <span>Успехи</span>
                {[0, 1, 2].map((i) => (
                  <Bubble
                    key={`s${i}`}
                    filled={deathSuccesses > i}
                    label={`Успех ${i + 1}`}
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
                    label={`Провал ${i + 1}`}
                    onClick={() =>
                      patch({
                        combat: { death_fails: deathFails === i + 1 ? i : i + 1 },
                      })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="classic-lss-brand-rule">
          <div className="classic-brand">
            <strong>D&amp;D</strong>
            <span>{brandYearLabel('2024')}</span>
          </div>
          <span className="classic-lss-brand-rule__line" />
        </div>

        <div className="classic-lss-p1-body">
          <div className="classic-lss-abilities-wrap">
            <div className="classic-lss-prof">
              <span>Бонус владения</span>
              <input
                type="number"
                value={proficiency}
                onChange={(e) => patch({ proficiencyBonus: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="classic-lss-ability-cols">
              <div>
                {ABILITY_COL_LEFT.map((key) => (
                  <AbilityBlock
                    key={key}
                    ability={key}
                    character={c}
                    proficiency={proficiency}
                    onPatch={patch}
                  />
                ))}
              </div>
              <div>
                {ABILITY_COL_RIGHT.map((key) => (
                  <AbilityBlock
                    key={key}
                    ability={key}
                    character={c}
                    proficiency={proficiency}
                    onPatch={patch}
                  />
                ))}
              </div>
            </div>

            <div className="classic-lss-exhaust">
              <span>Истощение</span>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Bubble
                  key={`ex${i}`}
                  filled={exhaustion > i}
                  label={`Истощение ${i + 1}`}
                  onClick={() =>
                    patch({
                      combat: { exhaustion: exhaustion === i + 1 ? i : i + 1 },
                    })
                  }
                />
              ))}
            </div>

            <div className="classic-lss-training">
              <div className="classic-lss-training__armor">
                <span className="classic-lss-block-title">Доспехи</span>
                {(
                  [
                    ['training_armor_light', 'Лёгкие'],
                    ['training_armor_medium', 'Средние'],
                    ['training_armor_heavy', 'Тяжёлые'],
                    ['training_shield', 'Щит'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    <Bubble
                      filled={combatBool(key)}
                      label={label}
                      onClick={() => patch({ combat: { [key]: !combatBool(key) } })}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="classic-lss-training__weapons">
                <span className="classic-lss-block-title">Оружие</span>
                {(
                  [
                    ['training_weapon_simple', 'Простое'],
                    ['training_weapon_martial', 'Воинское'],
                    ['training_weapon_other', 'Другое'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    <Bubble
                      filled={combatBool(key)}
                      label={label}
                      onClick={() => patch({ combat: { [key]: !combatBool(key) } })}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="classic-lss-training__tools">
                <span className="classic-lss-block-title">Владение инструментами и языками</span>
                <ClassicTextBlock
                  blockId="tools_languages"
                  character={c}
                  onPatch={onPatch}
                  fill
                  value={asRecordNotes(c)}
                  printMaxHeight="2.4rem"
                  ariaLabel="Инструменты и языки"
                  onChange={(otherProficiencies) => patch({ otherProficiencies })}
                />
              </div>
            </div>

            <label className="classic-insp classic-lss-insp">
              <input
                type="checkbox"
                checked={Boolean(combatField(c, 'inspiration'))}
                onChange={(e) => patch({ combat: { inspiration: e.target.checked } })}
              />
              Героическое вдохновение
            </label>
          </div>

          <div className="classic-lss-p1-right">
            <div className="classic-lss-combat-bar">
              <label>
                <input
                  value={combatNum('initiative')}
                  onChange={(e) =>
                    patch({ combat: { initiative: numOrNull(e.target.value) } })
                  }
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
              <label>
                <input value={String(passivePerception)} readOnly />
                <span>П. восприятие</span>
              </label>
              <label>
                <input
                  value={String(identityField(c, 'conditions') ?? '')}
                  onChange={(e) =>
                    patch({ identity: { conditions: e.target.value || null } })
                  }
                />
                <span>Состояния</span>
              </label>
            </div>

            <div className="classic-panel classic-lss-weapons">
              <div className="classic-attacks-head classic-lss-weapons-head">
                <span>Название</span>
                <span>Бонус / Сл</span>
                <span>Урон / вид</span>
                <span>Заметки</span>
              </div>
              {weapons.map((row, idx) => (
                <div className="classic-weapon classic-lss-weapon-row" key={idx}>
                  <span>{row.name || '—'}</span>
                  <span>{row.attackBonus || '—'}</span>
                  <span>{row.damageType || '—'}</span>
                  <span />
                </div>
              ))}
              <div className="classic-caption">Оружие и боевые заговоры</div>
            </div>

            <div className="classic-panel classic-panel--grow classic-lss-features">
              <ClassicTextBlock
                blockId="features"
                character={c}
                onPatch={onPatch}
                fill
                value={textBlockValue(c, 'features')}
                printMaxHeight="9rem"
                ariaLabel="Умения и способности"
                onChange={(value) => patch({ textBlocks: { features: value } })}
              />
              <div className="classic-caption">Умения и способности</div>
            </div>

            <div className="classic-lss-p1-bottom">
              <div className="classic-panel classic-panel--grow">
                <ClassicTextBlock
                  blockId="attacks"
                  character={c}
                  onPatch={onPatch}
                  fill
                  value={textBlockValue(c, 'attacks')}
                  printMaxHeight="3.5rem"
                  ariaLabel="Атаки и заклинания"
                  onChange={(value) => patch({ textBlocks: { attacks: value } })}
                />
                <div className="classic-caption">Атаки и заклинания</div>
              </div>
              <div className="classic-panel classic-panel--grow">
                <ClassicTextBlock
                  blockId="feats"
                  character={c}
                  onPatch={onPatch}
                  fill
                  value={textBlockValue(c, 'feats')}
                  printMaxHeight="3.5rem"
                  ariaLabel="Черты"
                  onChange={(value) => patch({ textBlocks: { feats: value } })}
                />
                <div className="classic-caption">Черты</div>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* ——— P2 identity ——— */}
      <article
        className="classic-sheet classic-lss classic-lss-p2"
        aria-label="Классический лист 2024, страница 2"
      >
        <div className="classic-lss-p2-grid">
          <section className="classic-panel classic-lss-portrait">
            <div className="classic-lss-portrait__frame">
              {c.avatar_url ? (
                <img src={c.avatar_url} alt={`Портрет: ${c.name}`} />
              ) : (
                <span className="classic-lss-portrait__empty">Нет портрета</span>
              )}
            </div>
            <div className="classic-caption">Портрет</div>
          </section>
          <section className="classic-panel classic-panel--grow classic-lss-allies">
            <ClassicTextBlock
              blockId="allies"
              character={c}
              onPatch={onPatch}
              fill
              value={textBlockValue(c, 'allies')}
              printMaxHeight="10rem"
              ariaLabel="Союзники и организации"
              onChange={(value) => patch({ textBlocks: { allies: value } })}
            />
            <div className="classic-caption">Союзники и организации</div>
          </section>
          <section className="classic-panel classic-panel--grow classic-lss-goals">
            <ClassicTextBlock
              blockId="quests"
              character={c}
              onPatch={onPatch}
              fill
              value={textBlockValue(c, 'quests')}
              printMaxHeight="16rem"
              ariaLabel="Цели и задачи"
              onChange={(value) => patch({ textBlocks: { quests: value } })}
            />
            <div className="classic-caption">Цели и задачи</div>
          </section>
          <section className="classic-panel classic-panel--grow classic-lss-extra">
            <ClassicTextBlock
              blockId="free"
              character={c}
              onPatch={onPatch}
              fill
              value={textBlockValue(c, 'free')}
              printMaxHeight="8rem"
              ariaLabel="Дополнительные способности и умения"
              onChange={(value) => patch({ textBlocks: { free: value } })}
            />
            <div className="classic-caption">Дополнительные способности и умения</div>
          </section>
          <section className="classic-panel classic-panel--grow classic-lss-treasure">
            <ClassicTextBlock
              blockId="treasure"
              character={c}
              onPatch={onPatch}
              fill
              value={textBlockValue(c, 'treasure')}
              printMaxHeight="8rem"
              ariaLabel="Сокровища"
              onChange={(value) => patch({ textBlocks: { treasure: value } })}
            />
            <div className="classic-caption">Сокровища</div>
          </section>
        </div>
      </article>

      {/* ——— P3 custom notes (same notes-N as interactive sheet) ——— */}
      <article
        className="classic-sheet classic-lss classic-lss-p3"
        aria-label="Классический лист 2024, страница 3 — заметки"
      >
        <div className="classic-notes-toolbar no-print">
          <button type="button" onClick={() => onPatch(addClassicNote(c))}>
            Добавить заметку
          </button>
          <span>
            {customNotes.length === 0
              ? 'Те же блоки, что в «Тексты и заметки»'
              : `${customNotes.length} ${customNotes.length === 1 ? 'заметка' : 'заметок'}`}
          </span>
        </div>
        <div className="classic-lss-notes-grid">
          {noteSlots.map((block, i) =>
            block ? (
              <section className="classic-panel classic-lss-note classic-note-card" key={block.key}>
                <label className="classic-note-card__title">
                  <span>Название</span>
                  <input
                    value={classicNoteLabel(block)}
                    onChange={(e) =>
                      onPatch(setClassicNoteLabel(c, block.key, e.target.value))
                    }
                  />
                </label>
                <ClassicTextBlock
                  blockId={`note_${block.key}`}
                  character={c}
                  onPatch={onPatch}
                  fill
                  value={classicNoteText(block)}
                  printMaxHeight="9rem"
                  ariaLabel={classicNoteLabel(block)}
                  onChange={(value) => onPatch(setClassicNoteText(c, block.key, value))}
                />
                <div className="classic-caption">{classicNoteLabel(block)}</div>
              </section>
            ) : (
              <section
                className="classic-panel classic-lss-note classic-note-card classic-note-card--empty"
                key={`empty-note-${i}`}
              >
                <button
                  type="button"
                  className="classic-note-card__add no-print"
                  onClick={() => onPatch(addClassicNote(c))}
                >
                  + Заметка
                </button>
                <div className="classic-caption">Заметка</div>
              </section>
            ),
          )}
        </div>
      </article>

      {/* ——— P4 spells + gear ——— */}
      <article
        className="classic-sheet classic-lss classic-lss-p4"
        aria-label="Классический лист 2024, страница 4"
      >
        <div className="classic-lss-p4-grid">
          <div className="classic-lss-p4-left">
            <div className="classic-lss-spell-stats">
              <label>
                <input
                  value={classicSpellAbilityLabel(spells.casting_ability)}
                  placeholder="ИНТ / МУД / ХАР"
                  onChange={(e) =>
                    onPatch(setCastingAbility(c, parseCastingAbilityInput(e.target.value)))
                  }
                />
                <span>Характеристика</span>
              </label>
              <label>
                <input
                  value={
                    spells.casting_ability
                      ? formatModifier(abilityModifier(abilityScore(c, spells.casting_ability)))
                      : ''
                  }
                  readOnly
                />
                <span>Заклинательный модификатор</span>
              </label>
              <label>
                <input value={spellStats.saveDc} readOnly />
                <span>Сложность спасброска</span>
              </label>
              <label>
                <input value={spellStats.attackBonus} readOnly />
                <span>Бонус атаки заклинанием</span>
              </label>
            </div>

            <div className="classic-lss-phys-bar">
              <label>
                <input
                  value={String(identityField(c, 'size') ?? '')}
                  onChange={(e) => patch({ identity: { size: e.target.value || null } })}
                />
                <span>Размер</span>
              </label>
              <label>
                <input
                  value={String(identityField(c, 'carry') ?? '')}
                  onChange={(e) => patch({ identity: { carry: e.target.value || null } })}
                />
                <span>Грузоподъёмность</span>
              </label>
              <label>
                <input
                  value={String(identityField(c, 'jump_high') ?? '')}
                  onChange={(e) =>
                    patch({ identity: { jump_high: e.target.value || null } })
                  }
                />
                <span>Прыжок в.</span>
              </label>
              <label>
                <input
                  value={String(identityField(c, 'jump_long') ?? '')}
                  onChange={(e) =>
                    patch({ identity: { jump_long: e.target.value || null } })
                  }
                />
                <span>Прыжок д.</span>
              </label>
            </div>

            <div className="classic-lss-slots">
              <div className="classic-caption classic-lss-slots__title">Ячейки заклинаний</div>
              {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((level) => {
                const slot = spells.slots[String(level)] ?? { max: 0, used: 0 }
                return (
                  <div className="classic-lss-slot" key={level}>
                    <strong>
                      {level}-й
                    </strong>
                    <div className="classic-lss-slot__pips">
                      {Array.from({ length: Math.max(slot.max, 0) }, (_, i) => (
                        <Bubble
                          key={i}
                          filled={i < slot.used}
                          label={`Ячейка ${level}, ${i + 1}`}
                          onClick={() =>
                            onPatch(
                              setSlotExpended(
                                c,
                                level,
                                slot.used === i + 1 ? i : i + 1,
                              ),
                            )
                          }
                        />
                      ))}
                    </div>
                    <input
                      type="number"
                      className="classic-lss-slot__max"
                      title="Всего ячеек"
                      value={slot.max || ''}
                      onChange={(e) =>
                        onPatch(setSlotTotal(c, level, Number(e.target.value) || 0))
                      }
                    />
                  </div>
                )
              })}
            </div>

            <div className="classic-panel classic-lss-spell-table classic-panel--grow">
              <div className="classic-lss-spell-table__head">
                <span />
                <span>Ур.</span>
                <span>Название</span>
                <span>Время</span>
                <span>Дист.</span>
                <span>К</span>
                <span>Р</span>
                <span>М</span>
                <span>Заметки</span>
              </div>
              <ul className="classic-lss-spell-table__rows">
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
                    <span className="classic-lss-spell-lvl">
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
                    <span className={row?.concentration ? 'is-on' : ''}>
                      {row?.concentration ? '◆' : '◇'}
                    </span>
                    <span className={row?.ritual ? 'is-on' : ''}>
                      {row?.ritual ? '◆' : '◇'}
                    </span>
                    <span className={hasMaterial(row) ? 'is-on' : ''}>
                      {hasMaterial(row) ? '◆' : '◇'}
                    </span>
                    <span className="classic-lss-spell-notes">{row?.notes ?? ''}</span>
                  </li>
                ))}
              </ul>
              <div className="classic-caption">Заговоры и подготовленные заклинания</div>
            </div>
          </div>

          <div className="classic-lss-p4-right">
            <div className="classic-panel classic-panel--grow">
              <ClassicTextBlock
                blockId="appearance"
                character={c}
                onPatch={onPatch}
                fill
                value={textBlockValue(c, 'appearance')}
                printMaxHeight="6rem"
                ariaLabel="Внешность"
                onChange={(value) => patch({ textBlocks: { appearance: value } })}
              />
              <div className="classic-caption">Внешность</div>
            </div>

            <div className="classic-panel classic-panel--grow">
              <ClassicTextBlock
                blockId="background_story"
                character={c}
                onPatch={onPatch}
                fill
                value={[
                  textBlockValue(c, 'background'),
                  textBlockValue(c, 'personality'),
                  textBlockValue(c, 'ideals'),
                  textBlockValue(c, 'bonds'),
                  textBlockValue(c, 'flaws'),
                ]
                  .filter(Boolean)
                  .join('\n')}
                printMaxHeight="8rem"
                ariaLabel="Предыстория и личные качества"
                onChange={(value) => patch({ textBlocks: { background: value } })}
              />
              <label className="classic-lss-alignment">
                <span>Мировоззрение</span>
                <input
                  value={String(identityField(c, 'alignment') ?? '')}
                  onChange={(e) =>
                    patch({ identity: { alignment: e.target.value || null } })
                  }
                />
              </label>
              <div className="classic-caption">Предыстория и личные качества</div>
            </div>

            <div className="classic-panel classic-equip classic-panel--grow classic-panel--grow-lg">
              <ClassicTextBlock
                blockId="equipment"
                character={c}
                onPatch={onPatch}
                fill
                value={equipmentText(c)}
                printMaxHeight="8rem"
                ariaLabel="Снаряжение"
                onChange={(value) => patch({ equipmentText: value })}
              />
              <div className="classic-lss-attune">
                <span>Настройка на магические предметы</span>
                {[0, 1, 2].map((i) => (
                  <Bubble
                    key={`a${i}`}
                    filled={attunement > i}
                    label={`Настройка ${i + 1}`}
                    onClick={() =>
                      patch({
                        combat: { attunement_used: attunement === i + 1 ? i : i + 1 },
                      })
                    }
                  />
                ))}
              </div>
              <div className="classic-caption">Снаряжение</div>
            </div>

            <div className="classic-lss-coins">
              <span className="classic-lss-block-title">Монеты</span>
              {(['cp', 'sp', 'ep', 'gp', 'pp'] as const).map((k) => (
                <label key={k}>
                  <span>
                    {({ cp: 'ММ', sp: 'СМ', ep: 'ЭМ', gp: 'ЗМ', pp: 'ПМ' } as const)[k]}
                  </span>
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
          </div>
        </div>
      </article>
    </>
  )
}

function AbilityBlock({
  ability,
  character: c,
  proficiency,
  onPatch,
}: {
  ability: AbilityKey
  character: CharacterDetail
  proficiency: number
  onPatch: (edits: Parameters<typeof applyClassicEdits>[1]) => void
}) {
  const score = abilityScore(c, ability)
  const mod = abilityModifier(score)
  const saveProf = isSaveProficient(c, ability)
  const saveBonus = mod + (saveProf ? proficiency : 0)

  return (
    <section className="classic-lss-ability">
      <div className="classic-lss-ability__name">{ABILITY_NAMES[ability]}</div>
      <div className="classic-lss-ability__nums">
        <div className="classic-lss-ability__modbox">
          <strong>{formatModifier(mod)}</strong>
          <em>Мод.</em>
        </div>
        <div className="classic-lss-ability__scorebox">
          <input
            type="number"
            value={score}
            onChange={(e) =>
              onPatch({ abilities: { [ability]: Number(e.target.value) || 0 } })
            }
          />
          <em>Знач.</em>
        </div>
      </div>
      <ul className="classic-lss-ability__skills">
        <li>
          <Bubble
            filled={saveProf}
            label={`Спасбросок ${ABILITY_NAMES[ability]}`}
            onClick={() => onPatch({ saveProficiency: { [ability]: !saveProf } })}
          />
          <strong>{formatModifier(saveBonus)}</strong>
          <span>Спасбросок</span>
        </li>
        {SKILLS_BY_ABILITY[ability].map((skill) => {
          const flags = skillFlags(c, skill.key)
          const bonus =
            mod +
            (flags.is_expertise ? proficiency * 2 : flags.is_proficient ? proficiency : 0)
          return (
            <li key={skill.key}>
              <Bubble
                filled={flags.is_proficient || flags.is_expertise}
                expertise={flags.is_expertise}
                label={`${skill.label} (клик: нет → владение → экспертиза)`}
                onClick={() => onPatch(cycleSkillMastery(c, skill.key))}
              />
              <strong>{formatModifier(bonus)}</strong>
              <span>{skill.label}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function clampExhaustion(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(6, Math.floor(value)))
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

