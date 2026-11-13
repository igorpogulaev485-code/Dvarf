import type { CharacterDetail } from '../../shared/api/characters'
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  ABILITY_NAMES,
  SKILL_DEFS,
  abilityModifier,
  formatModifier,
} from '../characters/sheetTypes'
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
import { classicWeaponRows } from './classicWeapons'
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
  ALIGNMENTS,
  alignmentNeedsClarification,
  recognizeAlignment,
} from '../../shared/dnd/alignments'
import {
  readClassicSheetLayout,
  type ClassicSheetLayout,
} from './classicSheetLayout'
import { ClassicTextBlock } from './ClassicTextBlock'
import { ClassicPrint2024 } from './ClassicPrint2024'
import { ClassicFitViewport } from './ClassicFitViewport'
import { ClassicFitInput } from './ClassicFitInput'
import './classicPrint.css'

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

  const classAndLevel = [c.class_name, c.level].filter(Boolean).join(' ')
  const coins = inventoryCoins(c)
  const weaponsBase = classicWeaponRows(c)
  const weapons =
    pencilBlanks && weaponsBase.length < 3
      ? [
          ...weaponsBase,
          ...Array.from({ length: 3 - weaponsBase.length }, (_, i) => ({
            id: `pencil-weapon-${i}`,
            name: '',
            attackBonus: '',
            damageLine: '',
          })),
        ]
      : pencilBlanks
        ? [
            ...weaponsBase,
            { id: 'pencil-weapon-extra', name: '', attackBonus: '', damageLine: '' },
          ]
        : weaponsBase
  const proficiency = Number(asProfBonus(c))
  const hitDiceTotal = String(c.level || '')
  const hitDiceCurrent = combatNum('hp_dice_current') || hitDiceTotal
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
  const alignmentUnparsed = alignmentNeedsClarification({
    alignment: alignmentSlug,
    alignmentText: alignmentText || (alignmentSlug ? '' : alignmentRaw),
  })
  const passivePerception =
    10 +
    abilityModifier(scores.wis) +
    (skillFlags(c, 'perception').is_proficient ? proficiency : 0) +
    (skillFlags(c, 'perception').is_expertise ? proficiency : 0)

  return (
    <ClassicFitViewport key={sheetLayout}>
    <div className="classic-stack">
      {sheetLayout === '2024' ? (
        <ClassicPrint2024 character={c} onPrintSettings={onPrintSettings} />
      ) : (
        <>
      <article className="classic-sheet classic-page1" aria-label="Классический лист 2014, страница 1">
        <header className="classic-header">
          <div className="classic-brand">
            <strong>D&amp;D</strong>
            <span>{brandYearLabel('2014')}</span>
          </div>
          <label className="classic-name">
            <span>Имя персонажа</span>
            <ClassicFitInput
              value={c.name}
              aria-label="Имя персонажа"
            />
          </label>
          <div className="classic-meta">
            <label>
              <span>Класс и уровень</span>
              <input
                value={classAndLevel}
               readOnly />
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
              <span>Имя игрока</span>
              <input
                value={String(identityField(c, 'player_name') ?? '')}
               readOnly />
            </label>
            <label>
              <span>Раса</span>
              <input
                value={c.race_name ?? ''}
               readOnly />
            </label>
            <label>
              <span>Мировоззрение</span>
              <select
                value={alignmentSlug}
               disabled>
                <option value="">—</option>
                {ALIGNMENTS.map((row) => (
                  <option key={row.slug} value={row.slug}>
                    {row.nameRu}
                  </option>
                ))}
              </select>
              {alignmentUnparsed ? <span>Уточните мировоззрение</span> : null}
            </label>
            <label>
              <span>Опыт</span>
              <input
                value={String(identityField(c, 'experience') ?? '')}
               readOnly />
            </label>
          </div>
        </header>

        <div className="classic-body">
          <div className="classic-col">
            <div className="classic-abilities-wrap">
              <div>
                {ABILITY_KEYS.map((key) => (
                  <div className="classic-ability" key={key}>
                    <div className="classic-ability__label">{ABILITY_NAMES[key]}</div>
                    <input
                      type="number"
                      value={scores[key]}
                     readOnly />
                    <div className="classic-ability__mod">
                      {formatModifier(abilityModifier(scores[key]))}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="classic-insp">
                  <input
                    type="checkbox"
                    checked={Boolean(combatField(c, 'inspiration'))}
                   disabled />
                  Вдохновение
                </label>
                <div className="classic-prof">
                  <input
                    type="number"
                    value={proficiency}
                   readOnly />
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
                  <div className="classic-caption">Спасброски</div>
                </div>
                <div className="classic-panel">
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
                  <div className="classic-caption">Навыки</div>
                </div>
              </div>
            </div>
            <div className="classic-passive">
              <strong>{passivePerception}</strong>
              <span>Пассивная мудрость (Восприятие)</span>
            </div>
            <div className="classic-panel classic-panel--grow">
              <ClassicTextBlock
                blockId="other_proficiencies"
                character={c}
                onPrintSettings={onPrintSettings}
                fill
                value={String(asRecordNotes(c))}
                printMaxHeight="12rem"
                ariaLabel="Прочие владения и языки"
              />
              <div className="classic-caption">Прочие владения и языки</div>
            </div>
          </div>

          <div className="classic-col">
            <div className="classic-combat-row">
              <label className="classic-combat-stat classic-combat-stat--ac">
                <input
                  value={combatNum('ac')}
                 readOnly />
                <span>Класс доспеха</span>
              </label>
              <label className="classic-combat-stat">
                <input
                  value={combatNum('initiative')}
                 readOnly />
                <span>Инициатива</span>
              </label>
              <label className="classic-combat-stat">
                <input
                  value={combatNum('speed')}
                 readOnly />
                <span>Скорость</span>
              </label>
            </div>

            <div className="classic-panel classic-panel--hp">
              <label className="classic-hp-max">
                Максимум хитов
                <input
                  value={c.hp_max ?? ''}
                 readOnly />
              </label>
              <input
                className="classic-hp"
                value={c.hp_current ?? ''}
                aria-label="Текущие хиты"
               readOnly />
              <div className="classic-caption">Текущие хиты</div>
            </div>

            <div className="classic-panel classic-panel--hp-temp">
              <input
                className="classic-hp"
                value={combatNum('hp_temp')}
                aria-label="Временные хиты"
               readOnly />
              <div className="classic-caption">Временные хиты</div>
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
                 readOnly />
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
                    />
                  ))}
                </div>
                <div className="classic-caption">Спасброски от смерти</div>
              </section>
            </div>

            <div className="classic-panel classic-panel--grow">
              <div className="classic-attacks-head">
                <span>Название</span>
                <span>Бонус атаки</span>
                <span>Урон / тип</span>
              </div>
              {weapons.map((row, idx) => (
                <div className="classic-weapon" key={row.id}>
                  <input
                    value={row.name}
                    aria-label={`Атака ${idx + 1}: название`}
                    placeholder="—"
                   readOnly />
                  <input
                    value={row.attackBonus}
                    aria-label={`Атака ${idx + 1}: бонус`}
                    placeholder="—"
                   readOnly />
                  <input
                    value={row.damageLine}
                    aria-label={`Атака ${idx + 1}: урон`}
                    placeholder="—"
                   readOnly />
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
              <div className="classic-caption">Атаки и заклинания</div>
            </div>

            <div className="classic-panel classic-equip classic-panel--grow classic-panel--grow-lg">
              <div className="classic-coins" aria-label="Монеты">
                {(['cp', 'sp', 'ep', 'gp', 'pp'] as const).map((k) => (
                  <label key={k}>
                    {k.toUpperCase()}
                    <input
                      value={coins[k]}
                     readOnly />
                  </label>
                ))}
              </div>
              <div className="classic-equip-main">
                <ClassicTextBlock
                  blockId="equipment"
                  character={c}
                  onPrintSettings={onPrintSettings}
                  fill
                  value={equipChunks[0] ?? ''}
                  printMaxHeight="14rem"
                  ariaLabel="Снаряжение"
                />
              </div>
              <div className="classic-caption">Снаряжение</div>
            </div>
          </div>

          <div className="classic-col">
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
                <div className="classic-caption">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </article>

      <article className="classic-sheet classic-page2" aria-label="Классический лист 2014, страница 2">
        <header className="classic-header classic-header--page2">
          <div className="classic-brand">
            <strong>D&amp;D</strong>
            <span>{brandYearLabel('2014')}</span>
          </div>
          <label className="classic-name">
            <span>Имя персонажа</span>
            <ClassicFitInput
              value={c.name}
              aria-label="Имя персонажа"
            />
          </label>
          <div className="classic-physique">
            <label>
              <span>Пол</span>
              <select
                value={physiqueField(c, 'gender')}
               disabled>
                <option value="">—</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </label>
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
              <label key={key}>
                <span>{label}</span>
                <input
                  value={physiqueField(c, key)}
                 readOnly />
              </label>
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
          <div className="classic-brand">
            <strong>D&amp;D</strong>
            <span>{brandYearLabel('2014')}</span>
          </div>
          <label className="classic-name">
            <span>Класс заклинателя</span>
            <ClassicFitInput
              value={c.class_name ?? ''}
              aria-label="Класс заклинателя"
            />
          </label>
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
              <label>
                <span>Базовая характеристика</span>
                <input
                  value={classicSpellAbilityLabel(spells.casting_ability)}
                  placeholder="ИНТ / МУД / ХАР"
                 readOnly />
              </label>
              <label>
                <span>Сложность спасброска</span>
                <input
                  value={spellStats.saveDc}
                  readOnly
                  title="Считается от характеристики и бонуса владения"
                />
              </label>
              <label>
                <span>Бонус атаки заклинанием</span>
                <input
                  value={spellStats.attackBonus}
                  readOnly
                  title="Считается от характеристики и бонуса владения"
                />
              </label>
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
          <label className="classic-name">
            <span>Имя персонажа</span>
            <ClassicFitInput value={c.name} aria-label="Имя персонажа" />
          </label>
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
                <label className="classic-companion-card__name">
                  <span>Имя</span>
                  <input value={row?.name ?? ''} readOnly />
                </label>
                <label className="classic-companion-card__kind">
                  <span>Тип</span>
                  <select value={row?.kind ?? 'other'} disabled>
                    {(Object.keys(COMPANION_KIND_LABELS) as CompanionKind[]).map((kind) => (
                      <option key={kind} value={kind}>
                        {COMPANION_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="classic-companion-card__stats">
                <label>
                  <span>КД</span>
                  <input value={row?.stats.ac ?? ''} readOnly />
                </label>
                <label>
                  <span>Хиты</span>
                  <input value={row?.stats.hp ?? ''} readOnly />
                </label>
                <label>
                  <span>Скорость</span>
                  <input value={row?.stats.speed ?? ''} readOnly />
                </label>
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
            <label className="classic-name">
              <span>Имя персонажа</span>
              <ClassicFitInput value={c.name} aria-label="Имя персонажа" />
            </label>
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
                    <input
                      className="classic-note-card__title-input"
                      value={classicNoteLabel(block)}
                      placeholder="Название заметки"
                      aria-label="Название заметки"
                      readOnly
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
            <label className="classic-name">
              <span>Имя персонажа</span>
              <ClassicFitInput value={c.name} aria-label="Имя персонажа" />
            </label>
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
            <label className="classic-name">
              <span>Имя персонажа</span>
              <ClassicFitInput value={c.name} aria-label="Имя персонажа" />
            </label>
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
              <input value={spell?.name ?? ''} readOnly />
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
              <label>
                Всего ячеек
                <input type="number" value={slot.max || ''} readOnly />
              </label>
              <label>
                Потрачено
                <input type="number" value={slot.used || ''} readOnly />
              </label>
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
              <input value={spell?.name ?? ''} readOnly />
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
