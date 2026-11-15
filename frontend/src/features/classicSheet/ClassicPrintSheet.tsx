import { lazy, Suspense } from 'react'
import type { CharacterDetail } from '../../shared/api/characters'
import { formatClassLevelLabel, formatClassSummary } from '../../shared/dnd/classLevels'
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  ABILITY_NAMES,
  SKILL_DEFS,
  abilityModifier,
  asRecord,
  formatModifier,
} from '../characters/sheetTypes'
import { readClassLevels } from '../characters/classLevels'
import type { ClassicPatch } from './fromApi'
import {
  combatField,
  equipmentItemsLine,
  equipmentNotes,
  identityField,
  inventoryCoins,
  isSaveProficient,
  physiqueField,
  skillFlags,
  classicFeaturesTraitsValue,
  textBlockValue,
} from './fromApi'
import { CLASSIC_WEAPON_SLOTS, classicWeaponRows } from './classicWeapons'
import {
  classicHitDiceCurrentLabel,
  classicHitDiceTotalLabel,
} from './classicHitDiceLabel'
import {
  classicCastProfiles,
  classicSpellAbilityLabel,
  classicSpellStats,
  classicSpellsState,
  SPELL_LEVELS,
} from './classicSpells'
import { SPELLCASTING_ABILITY_LABELS } from '../../shared/dnd/spells'
import {
  COMPANION_KIND_LABELS,
  classicCompanions,
} from './classicCompanions'
import {
  chunkCompanionPages,
  buildExtraEmptyNotePages,
  chunkOverflowText,
  spellLinesForPage,
  spellOverflowPageCount,
} from './classicOverflow'
import { readClassicPencilBlanks, readClassicExtraNotePages } from './classicPrintSettings'
import {
  CLASSIC_NOTES_PER_PAGE,
  chunkClassicNotePages,
  classicNoteLabel,
  classicNoteText,
  listClassicNotes,
} from './classicNotes'
import {
  chunkSpellCardPages,
  classicSpellCardFaces,
  SPELL_CARDS_PER_PAGE,
} from './classicSpellCards'
import type { CompanionKind } from '../characters/companions'
import {
  Bubble,
  asProfBonus,
  asRecordNotes,
  brandYearLabel,
  clampMarks,
} from './classicPrintShared'
import { classicCombatDisplay, classicEffectiveAbilities } from './classicDerivedCombat'
import {
  alignmentNameRu,
  alignmentNeedsClarification,
  recognizeAlignment,
} from '../../shared/dnd/alignments'
import {
  readClassicSheetLayout,
  type ClassicSheetLayout,
} from './classicSheetLayout'
import { ClassicTextBlock } from './ClassicTextBlock'
import { ClassicFitViewport } from './ClassicFitViewport'
import { ClassicFitInput } from './ClassicFitInput'
import { ClassicStaticField } from './ClassicStaticField'
import './classicPrint.css'

const GENDER_LABELS: Record<string, string> = {
  male: 'Мужской',
  female: 'Женский',
}

/** Soft hyphen in `mark` keeps long Russian names readable in the 5-cell strip. */
const COIN_LABELS = [
  ['cp', 'Медные', 'Медные'],
  ['sp', 'Серебряные', 'Сереб\u00ADряные'],
  ['ep', 'Электрумовые', 'Электру\u00ADмовые'],
  ['gp', 'Золотые', 'Золотые'],
  ['pp', 'Платиновые', 'Плати\u00ADновые'],
] as const

function padWeaponRows<T extends { id: string; name: string; attackBonus: string; damageLine: string }>(
  rows: T[],
  slots = CLASSIC_WEAPON_SLOTS,
): Array<T | { id: string; name: string; attackBonus: string; damageLine: string }> {
  const out: Array<T | { id: string; name: string; attackBonus: string; damageLine: string }> = [
    ...rows,
  ]
  while (out.length < slots) {
    out.push({
      id: `blank-weapon-${out.length}`,
      name: '',
      attackBonus: '',
      damageLine: '',
    })
  }
  return out.slice(0, Math.max(slots, rows.length))
}

/** FIX-01: 2024-бланк не тянем в чанк 2014 — убирает лишний парсинг при печати. */
const ClassicPrint2024 = lazy(() =>
  import('./ClassicPrint2024').then((m) => ({ default: m.ClassicPrint2024 })),
)

type Props = {
  character: CharacterDetail
  onPrintSettings?: (patch: ClassicPatch) => void
  /** Override sheet.ui.classic_sheet_layout (e.g. preview). */
  layout?: ClassicSheetLayout
}

export function ClassicPrintSheet({ character: c, onPrintSettings, layout }: Props) {
  const sheetLayout = layout ?? readClassicSheetLayout(c)
  const combatNum = (key: string): string => classicCombatDisplay(c, key)
  const pencilBlanks = readClassicPencilBlanks(c)
  const extraNotePages = readClassicExtraNotePages(c)

  const sheetClasses = readClassLevels(asRecord(c.sheet), {
    className: c.class_name ?? '',
    level: c.level ?? 1,
    subclassName: '',
    classCatalogId: null,
  })
  const classSummary = formatClassSummary(sheetClasses)
  const classAndLevel =
    classSummary || formatClassLevelLabel(c.class_name, c.level)
  const coins = inventoryCoins(c)
  const weaponsBase = classicWeaponRows(c)
  const weapons = padWeaponRows(
    pencilBlanks && weaponsBase.length >= CLASSIC_WEAPON_SLOTS
      ? [
          ...weaponsBase,
          { id: 'pencil-weapon-extra', name: '', attackBonus: '', damageLine: '' },
        ]
      : weaponsBase,
  )
  const proficiency = Number(asProfBonus(c))
  const hitDiceTotal = classicHitDiceTotalLabel(c)
  const hitDiceCurrent = classicHitDiceCurrentLabel(c)
  const deathSuccesses = clampMarks(Number(combatField(c, 'death_successes') ?? 0))
  const deathFails = clampMarks(Number(combatField(c, 'death_fails') ?? 0))
  const spells = classicSpellsState(c)
  const spellStats = classicSpellStats(c, spells)
  const castProfiles = classicCastProfiles(c)
  const companionPages = chunkCompanionPages(classicCompanions(c), pencilBlanks)
  const customNotes = listClassicNotes(c)
  // 2024 puts the first 6 notes on LSS P3; trailing pages only for overflow (or all pages on 2014).
  const trailingNotes =
    sheetLayout === '2024' ? customNotes.slice(CLASSIC_NOTES_PER_PAGE) : customNotes
  const notePagesBase = chunkClassicNotePages(trailingNotes)
  const spareEmpty = buildExtraEmptyNotePages(
    trailingNotes.length,
    extraNotePages,
    pencilBlanks,
  )
  const notePages = [
    ...notePagesBase,
    ...Array.from({ length: spareEmpty }, () => [] as typeof trailingNotes),
  ]
  // Screen: if no notes and no spare pages, keep one empty screen-only page for 2014.
  const notePagesForRender =
    notePages.length > 0
      ? notePages
      : sheetLayout === '2014'
        ? [[]]
        : []
  const spellCardPages = chunkSpellCardPages(classicSpellCardFaces(c))
  const traitsText = classicFeaturesTraitsValue(c)
  const traitsChunks = chunkOverflowText(traitsText, 1800)
  const equipFull = [equipmentItemsLine(c), equipmentNotes(c)].filter(Boolean).join('\n')
  const equipChunks = chunkOverflowText(equipFull, 1400)
  const spellExtraPages = spellOverflowPageCount(classicSpellsState(c).known, [0, ...SPELL_LEVELS])
  const scores = classicEffectiveAbilities(c)
  const alignmentRaw = String(identityField(c, 'alignment') ?? '')
  const alignmentText = String(identityField(c, 'alignment_text') ?? '')
  const alignmentSlug = recognizeAlignment(alignmentRaw) ?? ''
  const alignmentDisplay =
    alignmentNameRu(alignmentSlug) ||
    alignmentText ||
    (alignmentSlug ? '' : alignmentRaw)
  const alignmentUnparsed = alignmentNeedsClarification({
    alignment: alignmentSlug,
    alignmentText: alignmentText || (alignmentSlug ? '' : alignmentRaw),
  })
  const genderRaw = String(physiqueField(c, 'gender') ?? '')
  const genderDisplay = GENDER_LABELS[genderRaw] ?? genderRaw
  const passivePerception =
    10 +
    abilityModifier(scores.wis) +
    (skillFlags(c, 'perception').is_proficient ? proficiency : 0) +
    (skillFlags(c, 'perception').is_expertise ? proficiency : 0)

  return (
    <ClassicFitViewport key={sheetLayout}>
    <div className="classic-stack">
      {sheetLayout === '2024' ? (
        <Suspense fallback={null}>
          <ClassicPrint2024 character={c} onPrintSettings={onPrintSettings} />
        </Suspense>
      ) : (
        <>
      <article className="classic-sheet classic-page1" aria-label="Классический лист 2014, страница 1">
        <header className="classic-header classic-header--p1">
          <div className="classic-brand" aria-hidden="true">
            <strong>КриD20</strong>
            <span>{brandYearLabel('2014')}</span>
          </div>
          <div className="classic-name classic-name--banner">
            <ClassicFitInput value={c.name} wrap aria-label="Имя персонажа" />
            <span className="classic-field-label">Имя персонажа</span>
          </div>
          <div className="classic-meta classic-meta--plate">
            <div className="classic-meta__cell">
              <ClassicStaticField
                value={classAndLevel}
                fit
                wrap
                tone="body"
                aria-label="Класс и уровень"
              />
              <span className="classic-field-label">Класс и уровень</span>
            </div>
            <div className="classic-meta__cell">
              <ClassicStaticField
                value={String(identityField(c, 'background') ?? '')}
                fit
                wrap
                aria-label="Предыстория"
              />
              <span className="classic-field-label">Предыстория</span>
            </div>
            <div className="classic-meta__cell">
              <ClassicStaticField
                value={String(identityField(c, 'player_name') ?? '')}
                fit
                wrap
                aria-label="Имя игрока"
              />
              <span className="classic-field-label">Имя игрока</span>
            </div>
            <div className="classic-meta__cell">
              <ClassicStaticField value={c.race_name ?? ''} fit wrap aria-label="Раса" />
              <span className="classic-field-label">Раса</span>
            </div>
            <div className="classic-meta__cell">
              <ClassicStaticField
                value={alignmentDisplay}
                fit
                wrap
                aria-label="Мировоззрение"
              />
              <span className="classic-field-label">Мировоззрение</span>
              {alignmentUnparsed ? (
                <span className="classic-field-hint">Уточните мировоззрение</span>
              ) : null}
            </div>
            <div className="classic-meta__cell">
              <ClassicStaticField
                value={String(identityField(c, 'experience') ?? '')}
                align="center"
                tone="numeric"
                aria-label="Опыт"
              />
              <span className="classic-field-label">Опыт</span>
            </div>
          </div>
        </header>

        <div className="classic-body">
          <div className="classic-col classic-col--stats">
            <div className="classic-abilities-wrap">
              <div className="classic-abilities-stack">
                {ABILITY_KEYS.map((key) => (
                  <div className="classic-ability" key={key}>
                    <div className="classic-ability__frame">
                      <div className="classic-ability__label">{ABILITY_NAMES[key]}</div>
                      <div className="classic-ability__mod" aria-label={`Модификатор ${ABILITY_NAMES[key]}`}>
                        {formatModifier(abilityModifier(scores[key]))}
                      </div>
                    </div>
                    <div className="classic-ability__score" aria-label={ABILITY_NAMES[key]}>
                      {scores[key]}
                    </div>
                  </div>
                ))}
              </div>
              <div className="classic-skills-stack">
                <div className="classic-insp">
                  <span className="classic-plate-box">
                    <Bubble
                      filled={Boolean(combatField(c, 'inspiration'))}
                      label="Вдохновение"
                    />
                  </span>
                  <span>Вдохновение</span>
                </div>
                <div className="classic-prof">
                  <span className="classic-plate-box classic-plate-box--value">
                    <ClassicStaticField
                      value={proficiency}
                      align="center"
                      tone="numeric"
                      pencilLine={false}
                      aria-label="Бонус владения"
                    />
                  </span>
                  <span>Бонус владения</span>
                </div>
                <div className="classic-panel">
                  {ABILITY_KEYS.map((key) => (
                    <div className="classic-check" key={key}>
                      <Bubble
                        filled={isSaveProficient(c, key)}
                        label={`Владение спасброском: ${ABILITY_NAMES[key]}`}
                      />
                      <strong>
                        {formatModifier(
                          abilityModifier(scores[key]) +
                            (isSaveProficient(c, key) ? proficiency : 0),
                        )}
                      </strong>
                      <span>{ABILITY_NAMES[key]}</span>
                    </div>
                  ))}
                  <div className="classic-caption classic-caption--full">Спасброски</div>
                </div>
                <div className="classic-panel classic-panel--skills">
                  {SKILL_DEFS.map((skill) => {
                    const flags = skillFlags(c, skill.key)
                    const bonus =
                      abilityModifier(scores[skill.base]) +
                      (flags.is_expertise ? proficiency * 2 : flags.is_proficient ? proficiency : 0)
                    return (
                      <div className="classic-check" key={skill.key}>
                        <Bubble
                          filled={flags.is_proficient || flags.is_expertise}
                          expertise={flags.is_expertise}
                          label={`Владение навыком: ${skill.label}`}
                        />
                        <strong>{formatModifier(bonus)}</strong>
                        <span>
                          {skill.label} <em>({ABILITY_LABELS[skill.base].toLowerCase()})</em>
                        </span>
                      </div>
                    )
                  })}
                  <div className="classic-caption classic-caption--full">Навыки</div>
                </div>
              </div>
            </div>
            <div className="classic-passive">
              <span className="classic-plate-box classic-plate-box--value">
                <strong>{passivePerception}</strong>
              </span>
              <span>Пассивная мудрость (Восприятие)</span>
            </div>
            <div className="classic-panel classic-panel--grow classic-panel--prof">
              <ClassicTextBlock
                blockId="other_proficiencies"
                character={c}
                onPrintSettings={onPrintSettings}
                fill
                value={String(asRecordNotes(c))}
                printMaxHeight="12rem"
                ariaLabel="Прочие владения и языки"
              />
              <div className="classic-caption classic-caption--full">Прочие владения и языки</div>
            </div>
          </div>

          <div className="classic-col classic-col--combat">
            <div className="classic-combat-row">
              <div className="classic-combat-stat classic-combat-stat--ac">
                <div className="classic-ac-shield">
                  <ClassicStaticField
                    value={combatNum('ac')}
                    align="center"
                    tone="display"
                    pencilLine={false}
                    aria-label="Класс доспеха"
                  />
                </div>
                <span className="classic-field-label">Класс доспеха</span>
              </div>
              <div className="classic-combat-stat">
                <ClassicStaticField
                  value={combatNum('initiative')}
                  align="center"
                  tone="display"
                  pencilLine={false}
                  aria-label="Инициатива"
                />
                <span className="classic-field-label">Инициатива</span>
              </div>
              <div className="classic-combat-stat">
                <ClassicStaticField
                  value={combatNum('speed')}
                  align="center"
                  tone="display"
                  pencilLine={false}
                  aria-label="Скорость"
                />
                <span className="classic-field-label">Скорость</span>
              </div>
            </div>

            <div className="classic-panel classic-panel--hp">
              <div className="classic-hp-max">
                <span className="classic-field-label">Максимум хитов</span>
                <ClassicStaticField
                  value={c.hp_max ?? ''}
                  align="center"
                  tone="numeric"
                  className="classic-hp-max__value"
                  aria-label="Максимум хитов"
                />
              </div>
              <ClassicStaticField
                className="classic-hp"
                value={c.hp_current ?? ''}
                align="center"
                tone="display"
                aria-label="Текущие хиты"
              />
              <div className="classic-caption">Текущие хиты</div>
            </div>

            <div className="classic-panel classic-panel--hp-temp">
              <ClassicStaticField
                className="classic-hp"
                value={combatNum('hp_temp')}
                align="center"
                tone="display"
                aria-label="Временные хиты"
              />
              <div className="classic-caption">Временные хиты</div>
            </div>

            <div className="classic-hit-death-row">
              <section className="classic-panel classic-hit-dice">
                <div className="classic-hit-dice__total">
                  <span className="classic-field-label">Всего</span>
                  <ClassicStaticField
                    value={hitDiceTotal}
                    align="center"
                    tone="compact"
                    aria-label="Всего костей хитов"
                  />
                </div>
                <ClassicStaticField
                  value={hitDiceCurrent}
                  align="center"
                  tone="display"
                  aria-label="Текущие кости хитов"
                />
                <div className="classic-caption classic-caption--full">Кости хитов</div>
              </section>
              <section className="classic-panel classic-death-saves">
                <div className="classic-death-line">
                  <span>Успехи</span>
                  <span className="classic-death-bubbles">
                    {[0, 1, 2].map((i) => (
                      <Bubble
                        key={`s${i}`}
                        filled={deathSuccesses > i}
                        label={`Успех спасброска от смерти ${i + 1}`}
                      />
                    ))}
                  </span>
                </div>
                <div className="classic-death-line">
                  <span>Провалы</span>
                  <span className="classic-death-bubbles">
                    {[0, 1, 2].map((i) => (
                      <Bubble
                        key={`f${i}`}
                        filled={deathFails > i}
                        label={`Провал спасброска от смерти ${i + 1}`}
                      />
                    ))}
                  </span>
                </div>
                <div className="classic-caption classic-caption--full">Спасброски от смерти</div>
              </section>
            </div>

            <div className="classic-panel classic-panel--grow classic-panel--attacks">
              <div className="classic-attacks-head">
                <span>Название</span>
                <span>Бонус атаки</span>
                <span>Урон / тип</span>
              </div>
              {weapons.map((row, idx) => (
                <div
                  className={`classic-weapon${idx < CLASSIC_WEAPON_SLOTS ? ' classic-weapon--slot' : ''}`}
                  key={row.id}
                >
                  <ClassicStaticField
                    value={row.name}
                    fit
                    tone="compact"
                    aria-label={`Атака ${idx + 1}: название`}
                  />
                  <ClassicStaticField
                    value={row.attackBonus}
                    align="center"
                    tone="numeric"
                    aria-label={`Атака ${idx + 1}: бонус`}
                  />
                  <ClassicStaticField
                    value={row.damageLine}
                    fit
                    tone="compact"
                    aria-label={`Атака ${idx + 1}: урон`}
                  />
                </div>
              ))}
              <ClassicTextBlock
                blockId="attacks"
                character={c}
                onPrintSettings={onPrintSettings}
                fill
                value={textBlockValue(c, 'attacks')}
                printMaxHeight="6rem"
                ariaLabel="Заметки к атакам и заклинаниям"
              />
              <div className="classic-caption classic-caption--full">Атаки и заклинания</div>
            </div>

            <div className="classic-panel classic-equip classic-panel--grow classic-panel--grow-lg">
              <div className="classic-coins" aria-label="Монеты">
                {COIN_LABELS.map(([k, label, mark]) => (
                  <div className="classic-coin" key={k}>
                    <ClassicStaticField
                      value={coins[k]}
                      align="center"
                      tone="numeric"
                      pencilLine={false}
                      aria-label={label}
                    />
                    <span className="classic-coin__mark">{mark}</span>
                  </div>
                ))}
              </div>
              <div className="classic-equip-main">
                <ClassicTextBlock
                  blockId="equipment"
                  character={c}
                  onPrintSettings={onPrintSettings}
                  fill
                  value={equipChunks[0] ?? ''}
                  printMaxHeight="12rem"
                  ariaLabel="Снаряжение"
                />
              </div>
              <div className="classic-caption classic-caption--full">Снаряжение</div>
            </div>
          </div>

          <div className="classic-col classic-col--persona">
            {(
              [
                ['personality', 'Черты характера', '3.6rem', true],
                ['ideals', 'Идеалы', '3rem', true],
                ['bonds', 'Привязанности', '3rem', true],
                ['flaws', 'Слабости', '3rem', true],
                // Background feature text lands in `traits` (see backgroundEffects).
                // Keep `features` as a secondary merge so older manual notes survive.
                ['traits', 'Умения и особенности', '22rem', false],
              ] as const
            ).map(([key, label, height, personality]) => (
              <div
                className={`classic-panel ${personality ? 'classic-panel--personality' : 'classic-panel--features'}`}
                key={key}
              >
                <ClassicTextBlock
                  blockId={key}
                  character={c}
                  onPrintSettings={onPrintSettings}
                  fill={!personality}
                  value={
                    key === 'traits'
                      ? (traitsChunks[0] ?? '')
                      : textBlockValue(c, key)
                  }
                  printMaxHeight={height}
                  ariaLabel={label}
                />
                <div className="classic-caption classic-caption--full">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </article>

      <article className="classic-sheet classic-page2" aria-label="Классический лист 2014, страница 2">
        <header className="classic-header classic-header--page2">
          <div className="classic-brand" aria-hidden="true">
            <strong>КриD20</strong>
            <span>{brandYearLabel('2014')}</span>
          </div>
          <div className="classic-name classic-name--banner">
            <ClassicFitInput value={c.name} wrap aria-label="Имя персонажа" />
            <span className="classic-field-label">Имя персонажа</span>
          </div>
          <div className="classic-physique">
            <div className="classic-field">
              <ClassicStaticField value={genderDisplay} fit aria-label="Пол" />
              <span className="classic-field-label">Пол</span>
            </div>
            {(
              [
                ['age', 'Возраст'],
                ['height', 'Рост'],
                ['weight', 'Вес'],
                ['eyes', 'Глаза'],
                ['skin', 'Кожа'],
                ['hair', 'Волосы'],
              ] as const
            ).map(([key, label]) => (
              <div className="classic-field" key={key}>
                <ClassicStaticField
                  value={physiqueField(c, key)}
                  fit
                  aria-label={label}
                />
                <span className="classic-field-label">{label}</span>
              </div>
            ))}
          </div>
        </header>

        <div className="classic-page2-grid">
          <section className="classic-panel classic-panel--grow classic-page2-appearance">
            <ClassicTextBlock
              blockId="appearance"
              character={c}
              onPrintSettings={onPrintSettings}
              fill
              value={textBlockValue(c, 'appearance')}
              printMaxHeight="18rem"
              ariaLabel="Внешность персонажа"
            />
            <div className="classic-caption">Внешность персонажа</div>
          </section>

          <section className="classic-panel classic-panel--grow classic-page2-allies">
            <ClassicTextBlock
              blockId="allies"
              character={c}
              onPrintSettings={onPrintSettings}
              fill
              value={textBlockValue(c, 'allies')}
              printMaxHeight="12rem"
              ariaLabel="Союзники и организации"
            />
            <div className="classic-caption">Союзники и организации</div>
          </section>

          <section className="classic-panel classic-panel--grow classic-page2-backstory">
            <ClassicTextBlock
              blockId="background"
              character={c}
              onPrintSettings={onPrintSettings}
              fill
              value={textBlockValue(c, 'background')}
              printMaxHeight="24rem"
              ariaLabel="Предыстория персонажа"
            />
            <div className="classic-caption">Предыстория персонажа</div>
          </section>

          <div className="classic-page2-right-stack">
            <section className="classic-panel classic-panel--grow">
              <ClassicTextBlock
                blockId="feats"
                character={c}
                onPrintSettings={onPrintSettings}
                fill
                value={textBlockValue(c, 'feats')}
                printMaxHeight="12rem"
                ariaLabel="Дополнительные умения и особенности"
              />
              <div className="classic-caption">Дополнительные умения и особенности</div>
            </section>
            <section className="classic-panel classic-panel--grow classic-panel--grow-lg">
              <ClassicTextBlock
                blockId="treasure"
                character={c}
                onPrintSettings={onPrintSettings}
                fill
                value={textBlockValue(c, 'treasure')}
                printMaxHeight="12rem"
                ariaLabel="Сокровища"
              />
              <div className="classic-caption">Сокровища</div>
            </section>
          </div>
        </div>
      </article>

      <article className="classic-sheet classic-page3" aria-label="Классический лист 2014, страница 3">
        <header className="classic-spell-header">
          <div className="classic-brand" aria-hidden="true">
            <strong>КриD20</strong>
            <span>{brandYearLabel('2014')}</span>
          </div>
          <div className="classic-name classic-name--banner">
            <ClassicFitInput
              value={classAndLevel}
              wrap
              aria-label="Класс заклинателя"
            />
            <span className="classic-field-label">Класс заклинателя</span>
          </div>
          {castProfiles.length > 1 ? (
            <div
              className="classic-spell-profiles"
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
            <div className="classic-spell-stats">
              <div className="classic-field">
                <ClassicStaticField
                  value={classicSpellAbilityLabel(spells.casting_ability)}
                  align="center"
                  tone="body"
                  aria-label="Базовая характеристика"
                />
                <span className="classic-field-label">Базовая характеристика</span>
              </div>
              <div className="classic-field">
                <ClassicStaticField
                  value={spellStats.saveDc}
                  align="center"
                  tone="numeric"
                  aria-label="Сложность спасброска"
                />
                <span className="classic-field-label">Сложность спасброска</span>
              </div>
              <div className="classic-field">
                <ClassicStaticField
                  value={spellStats.attackBonus}
                  align="center"
                  tone="numeric"
                  aria-label="Бонус атаки заклинанием"
                />
                <span className="classic-field-label">Бонус атаки заклинанием</span>
              </div>
            </div>
          )}
        </header>

        <div className="classic-spell-columns">
          <div className="classic-spell-col">
            {renderCantrips(0)}
            {renderSpellLevel(1, 0)}
            {renderSpellLevel(2, 0)}
          </div>
          <div className="classic-spell-col">
            {renderSpellLevel(3, 0)}
            {renderSpellLevel(4, 0)}
            {renderSpellLevel(5, 0)}
          </div>
          <div className="classic-spell-col">
            {renderSpellLevel(6, 0)}
            {renderSpellLevel(7, 0)}
            {renderSpellLevel(8, 0)}
            {renderSpellLevel(9, 0)}
          </div>
        </div>
      </article>
        </>
      )}

      {companionPages.length === 0 ? (
        <p className="classic-companions-empty no-print">Нет напарников</p>
      ) : (
        companionPages.map((companionSlots, pageIndex) => (
      <article
        className="classic-sheet classic-page4"
        aria-label={
          companionPages.length > 1
            ? `Классический лист, напарники · лист ${pageIndex + 1}`
            : 'Классический лист, напарники'
        }
        key={`companions-${pageIndex}`}
      >
        <header className="classic-header classic-header--companions">
          <div className="classic-brand">
            <strong>D&amp;D</strong>
            <span>{brandYearLabel(sheetLayout)}</span>
          </div>
          <div className="classic-name">
            <ClassicFitInput value={c.name} aria-label="Имя персонажа" />
            <span className="classic-field-label">Имя персонажа</span>
          </div>
          <div className="classic-companions-banner">
            <strong>Напарники</strong>
            <span>
              Спутники, фамильяры и призывы — страница Dvarf (нет в официальном бланке)
              {companionPages.length > 1
                ? ` · лист ${pageIndex + 1}/${companionPages.length}`
                : ''}
            </span>
          </div>
        </header>

        <div className="classic-companions-grid">
          {companionSlots.map((row, index) => (
            <section
              className="classic-panel classic-companion-card"
              key={row?.id ?? `slot-${pageIndex}-${index}`}
            >
              <div className="classic-companion-card__top">
                <div className="classic-companion-card__name classic-field">
                  <ClassicStaticField value={row?.name ?? ''} fit aria-label="Имя напарника" />
                  <span className="classic-field-label">Имя</span>
                </div>
                <div className="classic-companion-card__kind classic-field">
                  <ClassicStaticField
                    value={
                      row?.kind
                        ? COMPANION_KIND_LABELS[row.kind as CompanionKind]
                        : ''
                    }
                    fit
                    aria-label="Тип напарника"
                  />
                  <span className="classic-field-label">Тип</span>
                </div>
              </div>
              <div className="classic-companion-card__stats">
                <div className="classic-field">
                  <ClassicStaticField
                    value={row?.stats.ac ?? ''}
                    align="center"
                    tone="numeric"
                    aria-label="КД напарника"
                  />
                  <span className="classic-field-label">КД</span>
                </div>
                <div className="classic-field">
                  <ClassicStaticField
                    value={row?.stats.hp ?? ''}
                    align="center"
                    tone="numeric"
                    aria-label="Хиты напарника"
                  />
                  <span className="classic-field-label">Хиты</span>
                </div>
                <div className="classic-field">
                  <ClassicStaticField
                    value={row?.stats.speed ?? ''}
                    align="center"
                    tone="compact"
                    aria-label="Скорость напарника"
                  />
                  <span className="classic-field-label">Скорость</span>
                </div>
              </div>
              <ClassicTextBlock
                blockId={`companion_${pageIndex}_${index}`}
                character={c}
                onPrintSettings={onPrintSettings}
                fill
                value={row?.notes ?? ''}
                printMaxHeight="5.5rem"
                ariaLabel="Заметки напарника"
              />
              <div className="classic-caption">Карточка напарника</div>
            </section>
          ))}
        </div>
      </article>
        ))
      )}

      {notePagesForRender.map((pageNotes, pageIndex) => (
        <article
          className={`classic-sheet classic-page-notes${
            pageNotes.length === 0 ? ' classic-page-notes--empty' : ''
          }`}
          aria-label={
            notePagesForRender.length > 1
              ? `Заметки, лист ${pageIndex + 1}`
              : 'Заметки'
          }
          key={`notes-${pageIndex}`}
        >
          <header className="classic-header classic-header--companions">
            <div className="classic-brand">
              <strong>D&amp;D</strong>
              <span>{brandYearLabel(sheetLayout)}</span>
            </div>
            <div className="classic-name">
              <ClassicFitInput value={c.name} aria-label="Имя персонажа" />
              <span className="classic-field-label">Имя персонажа</span>
            </div>
            <div className="classic-companions-banner">
              <strong>Заметки</strong>
              <span>
                {pageNotes.length === 0
                  ? 'Пустые блоки под карандаш'
                  : 'Свободные блоки из цифрового листа'}
                {notePagesForRender.length > 1
                  ? ` · лист ${pageIndex + 1}/${notePagesForRender.length}`
                  : ''}
              </span>
            </div>
          </header>

          <div className="classic-notes-grid">
            {pageNotes.length === 0 ? (
              Array.from({ length: CLASSIC_NOTES_PER_PAGE }, (_, i) => (
                <section
                  className="classic-panel classic-note-card classic-note-card--blank"
                  key={`blank-note-${pageIndex}-${i}`}
                  aria-label="Пустая заметка"
                >
                  <div className="classic-caption">Заметка</div>
                </section>
              ))
            ) : (
              paddedClassicNoteSlotsLocal(pageNotes).map((block, i) =>
                block ? (
                  <section className="classic-panel classic-note-card" key={block.key}>
                    <ClassicStaticField
                      className="classic-note-card__title-input"
                      value={classicNoteLabel(block)}
                      fit
                      tone="body"
                      aria-label="Название заметки"
                    />
                    <ClassicTextBlock
                      blockId={`note_${block.key}`}
                      character={c}
                      onPrintSettings={onPrintSettings}
                      fill
                      value={classicNoteText(block)}
                      printMaxHeight="9rem"
                      ariaLabel={classicNoteLabel(block)}
                    />
                    <div className="classic-caption">Заметка</div>
                  </section>
                ) : (
                  <section
                    className="classic-panel classic-note-card classic-note-card--blank"
                    key={`pad-note-${pageIndex}-${i}`}
                    aria-label="Пустая заметка"
                  >
                    <div className="classic-caption">Заметка</div>
                  </section>
                ),
              )
            )}
          </div>
        </article>
      ))}

      {traitsChunks.slice(1).map((chunk, i) => (
        <article
          className="classic-sheet classic-page-continuation"
          aria-label={`Умения и особенности · продолжение ${i + 1}`}
          key={`traits-cont-${i}`}
        >
          <header className="classic-header classic-header--companions">
            <div className="classic-brand">
              <strong>D&amp;D</strong>
              <span>{brandYearLabel(sheetLayout)}</span>
            </div>
            <div className="classic-name">
              <ClassicFitInput value={c.name} aria-label="Имя персонажа" />
              <span className="classic-field-label">Имя персонажа</span>
            </div>
            <div className="classic-companions-banner">
              <strong>Умения и особенности · продолжение</strong>
            </div>
          </header>
          <div className="classic-panel classic-panel--grow">
            <ClassicTextBlock
              blockId={`traits_cont_${i}`}
              character={c}
              onPrintSettings={onPrintSettings}
              fill
              value={chunk}
              printMaxHeight="24rem"
              ariaLabel="Умения и особенности · продолжение"
            />
          </div>
        </article>
      ))}

      {equipChunks.slice(1).map((chunk, i) => (
        <article
          className="classic-sheet classic-page-continuation"
          aria-label={`Снаряжение · продолжение ${i + 1}`}
          key={`equip-cont-${i}`}
        >
          <header className="classic-header classic-header--companions">
            <div className="classic-brand">
              <strong>D&amp;D</strong>
              <span>{brandYearLabel(sheetLayout)}</span>
            </div>
            <div className="classic-name">
              <ClassicFitInput value={c.name} aria-label="Имя персонажа" />
              <span className="classic-field-label">Имя персонажа</span>
            </div>
            <div className="classic-companions-banner">
              <strong>Снаряжение · продолжение</strong>
            </div>
          </header>
          <div className="classic-panel classic-panel--grow">
            <ClassicTextBlock
              blockId={`equip_cont_${i}`}
              character={c}
              onPrintSettings={onPrintSettings}
              fill
              value={chunk}
              printMaxHeight="24rem"
              ariaLabel="Снаряжение · продолжение"
            />
          </div>
        </article>
      ))}

      {Array.from({ length: spellExtraPages }, (_, pageIndex) => (
        <article
          className="classic-sheet classic-page3 classic-page3--cont"
          aria-label={`Заклинания · продолжение ${pageIndex + 1}`}
          key={`spells-cont-${pageIndex}`}
        >
          <header className="classic-spell-header">
            <div className="classic-brand">
              <strong>D&amp;D</strong>
              <span>{brandYearLabel('2014')}</span>
            </div>
            <div className="classic-companions-banner">
              <strong>Заклинания · продолжение</strong>
              <span>
                {c.name} · лист {pageIndex + 2}
              </span>
            </div>
          </header>
          <div className="classic-spell-columns">
            <div className="classic-spell-col">
              {renderCantrips(pageIndex + 1)}
              {renderSpellLevel(1, pageIndex + 1)}
              {renderSpellLevel(2, pageIndex + 1)}
            </div>
            <div className="classic-spell-col">
              {renderSpellLevel(3, pageIndex + 1)}
              {renderSpellLevel(4, pageIndex + 1)}
              {renderSpellLevel(5, pageIndex + 1)}
            </div>
            <div className="classic-spell-col">
              {renderSpellLevel(6, pageIndex + 1)}
              {renderSpellLevel(7, pageIndex + 1)}
              {renderSpellLevel(8, pageIndex + 1)}
              {renderSpellLevel(9, pageIndex + 1)}
            </div>
          </div>
        </article>
      ))}

      {spellCardPages.map((pageFaces, pageIndex) => (
        <article
          className="classic-sheet classic-page-spell-cards"
          aria-label={`Карточки заклинаний, лист ${pageIndex + 1}`}
          key={`spell-cards-${pageIndex}`}
        >
          <header className="classic-spell-cards-header no-print">
            <div className="classic-brand">
              <strong>D&amp;D</strong>
              <span>{brandYearLabel(sheetLayout)}</span>
            </div>
            <div className="classic-companions-banner">
              <strong>Карточки заклинаний</strong>
              <span>
                {c.name} · лист {pageIndex + 1}/{spellCardPages.length} · покерный размер · режь по
                пунктиру
              </span>
            </div>
          </header>
          <div className="classic-spell-cards-grid">
            {Array.from({ length: SPELL_CARDS_PER_PAGE }, (_, slot) => {
              const face = pageFaces[slot]
              if (!face) {
                return <div className="classic-spell-card classic-spell-card--empty" key={`empty-${slot}`} />
              }
              return (
                <div
                  className={`classic-spell-card ${face.isContinuation ? 'classic-spell-card--cont' : ''}`}
                  key={face.key}
                >
                  <div className="classic-spell-card__head">
                    <div className="classic-spell-card__title">{face.name}</div>
                    <div className="classic-spell-card__meta">
                      <span>{face.levelLabel}</span>
                      {face.school ? <span>{face.school}</span> : null}
                      {face.partsTotal > 1 ? (
                        <span>
                          {face.part}/{face.partsTotal}
                        </span>
                      ) : null}
                    </div>
                    {face.badges.length ? (
                      <div className="classic-spell-card__badges">
                        {face.badges.map((badge) => (
                          <span key={badge}>{badge}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {!face.isContinuation ? (
                    <div className="classic-spell-card__facts">
                      {face.castingTime ? (
                        <div>
                          <em>Время</em> {face.castingTime}
                        </div>
                      ) : null}
                      {face.range ? (
                        <div>
                          <em>Дист.</em> {face.range}
                        </div>
                      ) : null}
                      {face.components ? (
                        <div>
                          <em>Комп.</em> {face.components}
                        </div>
                      ) : null}
                      {face.duration ? (
                        <div>
                          <em>Длит.</em> {face.duration}
                        </div>
                      ) : null}
                      {face.attackOrSave ? (
                        <div>
                          <em>Атака/спас</em> {face.attackOrSave}
                        </div>
                      ) : null}
                      {face.damage ? (
                        <div>
                          <em>Урон</em> {face.damage}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="classic-spell-card__cont-label">Продолжение</div>
                  )}
                  <div className="classic-spell-card__body">{face.body}</div>
                </div>
              )
            })}
          </div>
        </article>
      ))}
    </div>
    </ClassicFitViewport>
  )

  function renderCantrips(pageIndex: number) {
    const rows = spellLinesForPage(spells.known, 0, pageIndex, pencilBlanks)
    if (pageIndex > 0 && rows.length === 0) return null
    return (
      <section className="classic-spell-level classic-spell-level--grow">
        <div className="classic-spell-level__head">
          <div className="classic-spell-level__badge">0</div>
          <div className="classic-spell-level__title">Заговоры</div>
        </div>
        <ul className="classic-spell-lines classic-spell-lines--cantrips">
          {rows.map((spell, i) => (
            <li key={spell?.id ?? `cantrip-${pageIndex}-${i}`}>
              <ClassicStaticField
                value={spell?.name ?? ''}
                fit
                tone="compact"
                aria-label={`Заговор ${i + 1}`}
              />
            </li>
          ))}
        </ul>
      </section>
    )
  }

  function renderSpellLevel(level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, pageIndex: number) {
    const slot = spells.slots[String(level)] ?? { max: 0, used: 0 }
    const rows = spellLinesForPage(spells.known, level, pageIndex, pencilBlanks)
    if (pageIndex > 0 && rows.length === 0) return null
    return (
      <section className="classic-spell-level classic-spell-level--grow" key={`${level}-${pageIndex}`}>
        <div className="classic-spell-level__head">
          <div className="classic-spell-level__badge">{level}</div>
          {pageIndex === 0 ? (
            <div className="classic-spell-level__slots">
              <div className="classic-spell-level__slot">
                <span className="classic-field-label">Всего ячеек</span>
                <ClassicStaticField
                  value={slot.max || ''}
                  align="center"
                  tone="numeric"
                  aria-label={`Ячейки ${level} круга · всего`}
                />
              </div>
              <div className="classic-spell-level__slot">
                <span className="classic-field-label">Потрачено</span>
                <ClassicStaticField
                  value={slot.used || ''}
                  align="center"
                  tone="numeric"
                  aria-label={`Ячейки ${level} круга · потрачено`}
                />
              </div>
            </div>
          ) : (
            <div className="classic-spell-level__title">Продолжение</div>
          )}
        </div>
        <ul className="classic-spell-lines">
          {rows.map((spell, i) => (
            <li key={spell?.id ?? `spell-${level}-${pageIndex}-${i}`}>
              <span className="classic-bubble-btn classic-bubble-btn--static" aria-label="Подготовлено">
                <span className={`classic-bubble ${spell?.prepared ? 'is-filled' : ''}`} />
              </span>
              <ClassicStaticField
                value={spell?.name ?? ''}
                fit
                tone="compact"
                aria-label={`Заклинание ${level} · ${i + 1}`}
              />
            </li>
          ))}
        </ul>
      </section>
    )
  }
}

function paddedClassicNoteSlotsLocal<T>(notes: T[], slots = CLASSIC_NOTES_PER_PAGE): Array<T | null> {
  const rows: Array<T | null> = notes.slice(0, slots)
  while (rows.length < slots) rows.push(null)
  return rows
}
