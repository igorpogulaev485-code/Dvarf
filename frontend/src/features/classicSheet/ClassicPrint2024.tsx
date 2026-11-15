import type { CharacterDetail } from '../../shared/api/characters'
import {
  ABILITY_NAMES,
  SKILL_DEFS,
  abilityModifier,
  asRecord,
  formatModifier,
  type AbilityKey,
} from '../characters/sheetTypes'
import { readClassLevels } from '../characters/classLevels'
import type { SheetSpell } from '../characters/spells'
import type { ClassicPatch } from './fromApi'
import {
  combatField,
  equipmentItemsLine,
  equipmentNotes,
  identityField,
  inventoryCoins,
  isSaveProficient,
  skillFlags,
  classicFeaturesTraitsValue,
  textBlockValue,
} from './fromApi'
import {
  classicAttunementFilled,
  classicAttunementLimit,
} from './classicAttunement'
import { classicConditionsLabel } from './classicConditions'
import { classicWeaponRows } from './classicWeapons'
import {
  classicCastProfiles,
  classicSpellAbilityLabel,
  classicSpellStats,
  classicSpellsState,
} from './classicSpells'
import { readClassicPencilBlanks } from './classicPrintSettings'
import { SPELLCASTING_ABILITY_LABELS } from '../../shared/dnd/spells'
import {
  Bubble,
  asProfBonus,
  isClassicBlankCharacter,
  asRecordNotes,
  brandYearLabel,
  clampMarks,
  ClassicBrandWordmark,
} from './classicPrintShared'
import { classicCombatDisplay, classicEffectiveAbilities } from './classicDerivedCombat'
import { formatClassLevelLabel, formatClassSummary } from '../../shared/dnd/classLevels'
import {
  alignmentNameRu,
  alignmentNeedsClarification,
  recognizeAlignment,
} from '../../shared/dnd/alignments'
import { ClassicTextBlock } from './ClassicTextBlock'
import { ClassicFitInput } from './ClassicFitInput'
import { ClassicStaticField } from './ClassicStaticField'

type Props = {
  character: CharacterDetail
  onPrintSettings?: (patch: ClassicPatch) => void
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

const COIN_LABELS_2024 = {
  cp: 'Медь',
  sp: 'Серебро',
  ep: 'Электрум',
  gp: 'Золото',
  pp: 'Платина',
} as const

function classicHpDisplay(
  character: CharacterDetail,
  key: 'hp_current' | 'hp_max',
): string {
  const top = character[key]
  if (typeof top === 'number') return String(top)
  const fromCombat = combatField(character, key)
  if (typeof fromCombat === 'number' || typeof fromCombat === 'string') {
    return String(fromCombat)
  }
  return ''
}

/**
 * Classic 2024 printable layout — LSS-style 4 pages (display only).
 * Same paper tokens as 2014; structure follows Long Story Short 2024 blank.
 */
export function ClassicPrint2024({ character: c, onPrintSettings }: Props) {
  const blank = isClassicBlankCharacter(c)
  const combatNum = (key: string): string =>
    blank ? '' : classicCombatDisplay(c, key)

  const combatBool = (key: string): boolean => Boolean(combatField(c, key))

  const proficiency = blank ? null : Number(asProfBonus(c))
  const hitDiceTotal = blank ? '' : String(c.level || '')
  const hitDiceCurrent = blank
    ? ''
    : combatNum('hp_dice_current') || hitDiceTotal
  const deathSuccesses = clampMarks(Number(combatField(c, 'death_successes') ?? 0))
  const deathFails = clampMarks(Number(combatField(c, 'death_fails') ?? 0))
  const exhaustion = clampExhaustion(Number(combatField(c, 'exhaustion') ?? 0))
  const attunement = classicAttunementFilled(c)
  const attunementLimit = classicAttunementLimit(c)
  const scores = classicEffectiveAbilities(c)
  const sheetClasses = readClassLevels(asRecord(c.sheet), {
    className: c.class_name ?? '',
    level: c.level ?? 1,
    subclassName: String(identityField(c, 'subclass_name') ?? ''),
    classCatalogId: null,
  })
  const classSummary = formatClassSummary(sheetClasses)
  const classAndLevel = blank
    ? ''
    : classSummary || formatClassLevelLabel(c.class_name, c.level)
  const subclassLabel = blank
    ? ''
    : sheetClasses
        .map((row) => row.subclass_name.trim())
        .filter(Boolean)
        .join(' / ') ||
      String(identityField(c, 'subclass_name') ?? identityField(c, 'subclass') ?? '')
  const hpCurrent = blank ? '' : classicHpDisplay(c, 'hp_current')
  const hpMax = blank ? '' : classicHpDisplay(c, 'hp_max')
  const alignmentRaw = String(identityField(c, 'alignment') ?? '')
  const alignmentText = String(identityField(c, 'alignment_text') ?? '')
  const alignmentSlug = recognizeAlignment(alignmentRaw) ?? ''
  const alignmentUnparsed = alignmentNeedsClarification({
    alignment: alignmentSlug,
    alignmentText: alignmentText || (alignmentSlug ? '' : alignmentRaw),
  })
  const alignmentDisplay =
    alignmentNameRu(alignmentSlug) ||
    alignmentText.trim() ||
    alignmentRaw.trim()
  const conditionsLabel = classicConditionsLabel(c)
  const equipItems = equipmentItemsLine(c)
  const spells = classicSpellsState(c)
  const spellStats = classicSpellStats(c, spells)
  const castProfiles = classicCastProfiles(c)
  const coins = inventoryCoins(c)
  const weapons = classicWeaponRows(c)
  const pb = proficiency ?? 0
  const passivePerception = blank
    ? ''
    : String(
        10 +
          abilityModifier(scores.wis) +
          (skillFlags(c, 'perception').is_proficient ? pb : 0) +
          (skillFlags(c, 'perception').is_expertise ? pb : 0),
      )

  const pencilBlanks = readClassicPencilBlanks(c)
  const { first: spellRows, rest: spellOverflow } = buildSpellTableRows(spells.known, pencilBlanks)
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
              <ClassicFitInput
                value={c.name}
                wrap
                aria-label="Имя персонажа"
              />
              <span>Имя персонажа</span>
            </label>
            <div className="classic-lss-id-grid">
              <label>
                <ClassicFitInput
                  value={String(identityField(c, 'background') ?? '')}
                  wrap
                  aria-label="Предыстория"
                  title="Выбор из справочника — в панели над листом"
                />
                <span>Предыстория</span>
              </label>
              <label>
                <ClassicFitInput
                  value={classAndLevel}
                  wrap
                  aria-label="Класс"
                />
                <span>Класс</span>
              </label>
              <label>
                <ClassicFitInput
                  value={c.race_name ?? ''}
                  wrap
                  aria-label="Раса"
                />
                <span>Раса</span>
              </label>
              <label>
                <ClassicFitInput
                  value={subclassLabel}
                  wrap
                  aria-label="Подкласс"
                />
                <span>Подкласс</span>
              </label>
            </div>
          </div>

          <div className="classic-lss-level">
            <label>
              <input
                type="number"
                value={blank ? '' : c.level}
               readOnly />
              <span>Уровень</span>
            </label>
            <label>
              <input
                value={String(identityField(c, 'experience') ?? '')}
               readOnly />
              <span>Опыт</span>
            </label>
          </div>

          <div className="classic-lss-ac">
            <div className="classic-lss-ac__shield">
              <span className="classic-lss-ac__label">КД</span>
              <input
                value={combatNum('ac')}
                aria-label="Класс доспеха"
               readOnly />
              <label className="classic-lss-ac__shield-flag">
                <Bubble
                  filled={combatBool('shield_equipped')}
                  label="Щит"

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
                    value={hpCurrent}
                    readOnly
                    aria-label="Текущие хиты"
                  />
                  <span>Тек.</span>
                </label>
                <label>
                  <input
                    value={combatNum('hp_temp')}
                    readOnly
                    aria-label="Временные хиты"
                  />
                  <span>Врем.</span>
                </label>
                <label>
                  <input
                    value={hpMax}
                    readOnly
                    aria-label="Максимум хитов"
                  />
                  <span>Макс.</span>
                </label>
              </div>
            </div>
            <div className="classic-lss-hd">
              <span className="classic-lss-block-title">Кости хитов</span>
              <label>
                <input
                  value={
                    blank || (!hitDiceCurrent && !hitDiceTotal)
                      ? ''
                      : `${hitDiceCurrent} / ${hitDiceTotal}`
                  }
                 readOnly />
                <span>Текущие</span>
              </label>
              <label>
                <input
                  value={
                    blank
                      ? ''
                      : String(combatField(c, 'hit_die') ?? '') || 'к6'
                  }
                 readOnly />
                <span>Кость</span>
              </label>
            </div>
            <div className="classic-lss-death">
              <span className="classic-lss-block-title">Смерть</span>
              <div className="classic-death-line">
                <span>Усп.</span>
                <span className="classic-death-bubbles">
                  {[0, 1, 2].map((i) => (
                    <Bubble
                      key={`s${i}`}
                      filled={deathSuccesses > i}
                      label={`Успех ${i + 1}`}
                    />
                  ))}
                </span>
              </div>
              <div className="classic-death-line">
                <span>Пров.</span>
                <span className="classic-death-bubbles">
                  {[0, 1, 2].map((i) => (
                    <Bubble
                      key={`f${i}`}
                      filled={deathFails > i}
                      label={`Провал ${i + 1}`}
                    />
                  ))}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="classic-lss-brand-rule">
          <div className="classic-brand">
            <ClassicBrandWordmark />
            <span>{brandYearLabel('2024')}</span>
          </div>
        </div>

        <div className="classic-lss-p1-body">
          <div className="classic-lss-abilities-wrap">
            <div className="classic-lss-prof">
              <span>Бонус владения</span>
              <input
                type="number"
                value={proficiency ?? ''}
               readOnly />
            </div>
            <div className="classic-lss-ability-cols">
              <div>
                {ABILITY_COL_LEFT.map((key) => (
                  <AbilityBlock
                    key={key}
                    ability={key}
                    character={c}
                    proficiency={pb}
                    blank={blank}
                  />
                ))}
              </div>
              <div>
                {ABILITY_COL_RIGHT.map((key) => (
                  <AbilityBlock
                    key={key}
                    ability={key}
                    character={c}
                    proficiency={pb}
                    blank={blank}
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
                  onPrintSettings={onPrintSettings}
                  fill
                  value={asRecordNotes(c)}
                  printMaxHeight="2.4rem"
                  ariaLabel="Инструменты и языки"
                />
              </div>
            </div>

            <label className="classic-insp classic-lss-insp">
              <input
                type="checkbox"
                checked={Boolean(combatField(c, 'inspiration'))}
               disabled />
              Героическое вдохновение
            </label>
          </div>

          <div className="classic-lss-p1-right">
            <div className="classic-lss-combat-bar">
              <label>
                <input
                  value={combatNum('initiative')}
                 readOnly />
                <span>Инициатива</span>
              </label>
              <label>
                <input
                  value={combatNum('speed')}
                 readOnly />
                <span>Скорость</span>
              </label>
              <label>
                <input value={String(passivePerception)} readOnly />
                <span>П. восприятие</span>
              </label>
              <label>
                <input
                  value={conditionsLabel}
                  readOnly
                  title="Состояния с цифрового листа (combat.conditions). Меняй на Play Desk."
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
                <div className="classic-weapon classic-lss-weapon-row" key={row.id}>
                  <div className="classic-weapon__cell classic-weapon__cell--name">
                    <ClassicStaticField
                      value={row.name}
                      wrap
                      tone="compact"
                      pencilLine={false}
                      aria-label={`Оружие ${idx + 1}: название`}
                    />
                  </div>
                  <div className="classic-weapon__cell classic-weapon__cell--bonus">
                    <ClassicStaticField
                      value={row.attackBonus}
                      align="center"
                      tone="numeric"
                      pencilLine={false}
                      aria-label={`Оружие ${idx + 1}: бонус`}
                    />
                  </div>
                  <div className="classic-weapon__cell classic-weapon__cell--dmg">
                    <ClassicStaticField
                      value={row.damageLine}
                      wrap
                      tone="compact"
                      pencilLine={false}
                      aria-label={`Оружие ${idx + 1}: урон`}
                    />
                  </div>
                </div>
              ))}
              <div className="classic-caption">Оружие и боевые заговоры</div>
            </div>

            <div className="classic-panel classic-panel--grow classic-lss-features">
              <ClassicTextBlock
                blockId="traits"
                character={c}
                onPrintSettings={onPrintSettings}
                fill
                value={classicFeaturesTraitsValue(c)}
                printMaxHeight="9rem"
                ariaLabel="Умения и способности"
              />
              <div className="classic-caption">Умения и способности</div>
            </div>

            <div className="classic-lss-p1-bottom">
              <div className="classic-panel classic-panel--grow">
                <ClassicTextBlock
                  blockId="attacks"
                  character={c}
                  onPrintSettings={onPrintSettings}
                  fill
                  value={textBlockValue(c, 'attacks')}
                  printMaxHeight="3.5rem"
                  ariaLabel="Атаки и заклинания"
                />
                <div className="classic-caption">Атаки и заклинания</div>
              </div>
              <div className="classic-panel classic-panel--grow">
                <ClassicTextBlock
                  blockId="feats"
                  character={c}
                  onPrintSettings={onPrintSettings}
                  fill
                  value={textBlockValue(c, 'feats')}
                  printMaxHeight="3.5rem"
                  ariaLabel="Черты"
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
        <div className="classic-lss-brand-rule">
          <div className="classic-brand">
            <ClassicBrandWordmark />
            <span>{brandYearLabel('2024')}</span>
          </div>
        </div>
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
              onPrintSettings={onPrintSettings}
              fill
              value={textBlockValue(c, 'allies')}
              printMaxHeight="10rem"
              ariaLabel="Союзники и организации"
            />
            <div className="classic-caption">Союзники и организации</div>
          </section>
          <section className="classic-panel classic-panel--grow classic-lss-goals">
            <ClassicTextBlock
              blockId="quests"
              character={c}
              onPrintSettings={onPrintSettings}
              fill
              value={textBlockValue(c, 'quests')}
              printMaxHeight="16rem"
              ariaLabel="Цели и задачи"
            />
            <div className="classic-caption">Цели и задачи</div>
          </section>
          <section className="classic-panel classic-panel--grow classic-lss-extra">
            <ClassicTextBlock
              blockId="free"
              character={c}
              onPrintSettings={onPrintSettings}
              fill
              value={textBlockValue(c, 'free')}
              printMaxHeight="8rem"
              ariaLabel="Дополнительные способности и умения"
            />
            <div className="classic-caption">Дополнительные способности и умения</div>
          </section>
          <section className="classic-panel classic-panel--grow classic-lss-treasure">
            <ClassicTextBlock
              blockId="treasure"
              character={c}
              onPrintSettings={onPrintSettings}
              fill
              value={textBlockValue(c, 'treasure')}
              printMaxHeight="8rem"
              ariaLabel="Сокровища"
            />
            <div className="classic-caption">Сокровища</div>
          </section>
        </div>
      </article>


      {/* ——— P4 spells + gear ——— */}
      <article
        className="classic-sheet classic-lss classic-lss-p4"
        aria-label="Классический лист 2024, страница 4"
      >
        <div className="classic-lss-brand-rule">
          <div className="classic-brand">
            <ClassicBrandWordmark />
            <span>{brandYearLabel('2024')}</span>
          </div>
        </div>
        <div className="classic-lss-p4-grid">
          <div className="classic-lss-p4-left">
            {castProfiles.length > 1 ? (
              <div
                className="classic-spell-profiles classic-spell-profiles--lss"
                aria-label="Профили заклинателей"
              >
                <table className="classic-spell-profiles__table">
                  <thead>
                    <tr>
                      <th>Класс</th>
                      <th>Хар-ка</th>
                      <th>Сл</th>
                      <th>Атака</th>
                    </tr>
                  </thead>
                  <tbody>
                    {castProfiles.map((row) => (
                      <tr key={row.id}>
                        <td>{row.labelRu}</td>
                        <td>{SPELLCASTING_ABILITY_LABELS[row.ability]}</td>
                        <td>{row.saveDc}</td>
                        <td>{formatModifier(row.attackBonus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="classic-lss-spell-stats">
                <label>
                  <input
                    value={classicSpellAbilityLabel(spells.casting_ability)}
                    placeholder="ИНТ / МУД / ХАР"
                   readOnly />
                  <span>Характеристика</span>
                </label>
                <label>
                  <input
                    value={
                      spells.casting_ability
                        ? formatModifier(abilityModifier(scores[spells.casting_ability]))
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
            )}

            <div className="classic-lss-phys-bar">
              <label>
                <input
                  value={String(identityField(c, 'size') ?? '')}
                 readOnly />
                <span>Размер</span>
              </label>
              <label>
                <input
                  value={String(identityField(c, 'carry') ?? '')}
                 readOnly />
                <span>Грузоподъёмность</span>
              </label>
              <label>
                <input
                  value={String(identityField(c, 'jump_high') ?? '')}
                 readOnly />
                <span>Прыжок в.</span>
              </label>
              <label>
                <input
                  value={String(identityField(c, 'jump_long') ?? '')}
                 readOnly />
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
                        />
                      ))}
                    </div>
                    <input
                      type="number"
                      className="classic-lss-slot__max"
                      title="Всего ячеек"
                      value={slot.max || ''}
                     readOnly />
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

                    >
                      <span
                        className={`classic-bubble ${row?.prepared ? 'is-filled' : ''}`}
                      />
                    </button>
                    <span className="classic-lss-spell-lvl">
                      {row ? (row.level === 0 ? '0' : String(row.level)) : ''}
                    </span>
                    <ClassicStaticField
                      value={row?.name ?? ''}
                      fit
                      tone="compact"
                      pencilLine={false}
                      aria-label="Название заклинания"
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
                onPrintSettings={onPrintSettings}
                fill
                value={textBlockValue(c, 'appearance')}
                printMaxHeight="6rem"
                ariaLabel="Внешность"
              />
              <div className="classic-caption">Внешность</div>
            </div>

            <div className="classic-panel classic-panel--grow">
              <ClassicTextBlock
                blockId="background_story"
                character={c}
                onPrintSettings={onPrintSettings}
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
              />
              <div className="classic-lss-alignment">
                <span>Мировоззрение</span>
                <ClassicStaticField
                  value={alignmentDisplay}
                  fit
                  wrap
                  tone="body"
                  pencilLine={false}
                  aria-label="Мировоззрение"
                />
                {alignmentUnparsed ? <span>Уточните мировоззрение</span> : null}
              </div>
              <div className="classic-caption">Предыстория и личные качества</div>
            </div>

            <div className="classic-panel classic-equip classic-panel--grow classic-panel--grow-lg">
              <div className="classic-coins" aria-label="Монеты">
                {(['cp', 'sp', 'ep', 'gp', 'pp'] as const).map((k) => (
                  <div className="classic-coin" key={k}>
                    <ClassicStaticField
                      value={coins[k]}
                      align="center"
                      tone="numeric"
                      pencilLine={false}
                      aria-label={COIN_LABELS_2024[k]}
                    />
                    <span className="classic-coin__mark">{COIN_LABELS_2024[k]}</span>
                  </div>
                ))}
              </div>
              {equipItems ? (
                <div className="classic-equip-items" aria-label="Предметы из инвентаря">
                  {equipItems}
                </div>
              ) : null}
              <ClassicTextBlock
                blockId="equipment"
                character={c}
                onPrintSettings={onPrintSettings}
                fill
                value={equipmentNotes(c)}
                printMaxHeight="8rem"
                ariaLabel="Заметки по снаряжению"
              />
              <div className="classic-lss-attune">
                <span>Настройка</span>
                {Array.from({ length: attunementLimit }, (_, i) => (
                  <Bubble
                    key={`a${i}`}
                    filled={attunement > i}
                    label={`Настройка ${i + 1}`}
                  />
                ))}
                {attunement > attunementLimit ? (
                  <span>Сверх лимита настройки — лишние предметы не действуют</span>
                ) : null}
              </div>
              <div className="classic-caption">Снаряжение</div>
            </div>
          </div>
        </div>
      </article>
      {spellOverflow.length > 0 ? (
        <article
          className="classic-sheet classic-lss classic-lss-p4 classic-lss-p4--cont"
          aria-label="Классический лист 2024 — заклинания · продолжение"
        >
          <header className="classic-lss-notes-head">
            <div className="classic-brand">
              <ClassicBrandWordmark />
              <span>{brandYearLabel('2024')}</span>
            </div>
            <div className="classic-companions-banner">
              <strong>Заклинания · продолжение</strong>
              <span>{c.name}</span>
            </div>
          </header>
          <div className="classic-lss-spell-table">
            <div className="classic-lss-spell-table__head">
              <span>Подг.</span>
              <span>Название</span>
              <span>Ур.</span>
            </div>
            {spellOverflow.map((row) => (
              <div className="classic-lss-spell-row" key={row.id}>
                <span className="classic-bubble-btn classic-bubble-btn--static" aria-label="Подготовлено">
                  <span className={`classic-bubble ${row.prepared ? 'is-filled' : ''}`} />
                </span>
                <ClassicStaticField
                  value={row.name}
                  fit
                  tone="compact"
                  pencilLine={false}
                  aria-label="Название заклинания"
                />
                <span>{row.level}</span>
              </div>
            ))}
          </div>
        </article>
      ) : null}

    </>
  )
}

function AbilityBlock({
  ability,
  character: c,
  proficiency,
  blank = false,
}: {
  ability: AbilityKey
  character: CharacterDetail
  proficiency: number
  blank?: boolean
}) {
  const score = classicEffectiveAbilities(c)[ability]
  const mod = abilityModifier(score)
  const saveProf = !blank && isSaveProficient(c, ability)
  const saveBonus = mod + (saveProf ? proficiency : 0)

  return (
    <section className="classic-lss-ability">
      <div className="classic-lss-ability__name">{ABILITY_NAMES[ability]}</div>
      <div className="classic-lss-ability__nums">
        <div className="classic-lss-ability__modbox">
          <strong>{blank ? '' : formatModifier(mod)}</strong>
          <em>Мод.</em>
        </div>
        <div className="classic-lss-ability__scorebox">
          <input
            type="number"
            value={blank ? '' : score}
           readOnly />
          <em>Знач.</em>
        </div>
      </div>
      <ul className="classic-lss-ability__skills">
        <li>
          <Bubble
            filled={saveProf}
            label={`Спасбросок ${ABILITY_NAMES[ability]}`}
          />
          <strong>{blank ? '' : formatModifier(saveBonus)}</strong>
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
                filled={!blank && (flags.is_proficient || flags.is_expertise)}
                expertise={!blank && flags.is_expertise}
                label={skill.label}
              />
              <strong>{blank ? '' : formatModifier(bonus)}</strong>
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

function buildSpellTableRows(
  known: SheetSpell[],
  pencilBlanks: boolean,
): { first: Array<SheetSpell | null>; rest: SheetSpell[] } {
  const ordered = [...known].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    return a.name.localeCompare(b.name, 'ru')
  })
  const first = ordered.slice(0, SPELL_TABLE_ROWS)
  const rest = ordered.slice(SPELL_TABLE_ROWS)
  const rows: Array<SheetSpell | null> = [...first]
  if (pencilBlanks || rest.length === 0) {
    while (rows.length < SPELL_TABLE_ROWS) rows.push(null)
  }
  return { first: rows, rest }
}

function hasMaterial(spell: SheetSpell | null): boolean {
  return Boolean(spell?.components?.m)
}

