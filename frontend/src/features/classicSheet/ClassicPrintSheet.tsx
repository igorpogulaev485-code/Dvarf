import type { CharacterDetail } from '../../shared/api/characters'
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  ABILITY_NAMES,
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
  physiqueField,
  cycleSkillMastery,
  setCoins,
  skillFlags,
  textBlockValue,
  weaponsSummary,
} from './fromApi'
import {
  classicSpellAbilityLabel,
  classicSpellStats,
  classicSpellsState,
  paddedSpellLines,
  parseCastingAbilityInput,
  setCastingAbility,
  setSlotExpended,
  setSlotTotal,
  setSpellNameAt,
  toggleSpellPrepared,
} from './classicSpells'
import {
  COMPANION_KIND_LABELS,
  classicCompanions,
  paddedCompanionSlots,
  patchCompanionField,
} from './classicCompanions'
import {
  chunkSpellCardPages,
  classicSpellCardFaces,
  SPELL_CARDS_PER_PAGE,
} from './classicSpellCards'
import type { CompanionKind } from '../characters/companions'
import {
  Expanding,
  Bubble,
  asProfBonus,
  asRecordNotes,
  brandYearLabel,
  clampMarks,
  numOrNull,
} from './classicPrintShared'
import {
  readClassicSheetLayout,
  type ClassicSheetLayout,
} from './classicSheetLayout'
import { ClassicPrint2024 } from './ClassicPrint2024'
import './classicPrint.css'

type Props = {
  character: CharacterDetail
  onPatch: (patch: ReturnType<typeof applyClassicEdits>) => void
  /** Override sheet.ui.classic_sheet_layout (e.g. preview). */
  layout?: ClassicSheetLayout
}

export function ClassicPrintSheet({ character: c, onPatch, layout }: Props) {
  const sheetLayout = layout ?? readClassicSheetLayout(c)
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
  const spells = classicSpellsState(c)
  const spellStats = classicSpellStats(c, spells)
  const companionSlots = paddedCompanionSlots(classicCompanions(c))
  const spellCardPages = chunkSpellCardPages(classicSpellCardFaces(c))
  const passivePerception =
    10 +
    abilityModifier(abilityScore(c, 'wis')) +
    (skillFlags(c, 'perception').is_proficient ? proficiency : 0) +
    (skillFlags(c, 'perception').is_expertise ? proficiency : 0)

  return (
    <div className="classic-stack">
      {sheetLayout === '2024' ? (
        <ClassicPrint2024 character={c} onPatch={onPatch} />
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
                readOnly
                title="Выбор из справочника — в панели над листом (не печатается)"
              />
            </label>
            <label>
              <span>Имя игрока</span>
              <input
                value={String(identityField(c, 'player_name') ?? '')}
                onChange={(e) => patch({ identity: { player_name: e.target.value || null } })}
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
                <div className="classic-prof">
                  <input
                    type="number"
                    value={proficiency}
                    onChange={(e) => patch({ proficiencyBonus: Number(e.target.value) || 0 })}
                  />
                  <span>Бонус владения</span>
                </div>
                <div className="classic-panel">
                  {ABILITY_KEYS.map((key) => (
                    <div className="classic-check" key={key}>
                      <Bubble
                        filled={isSaveProficient(c, key)}
                        label={`Владение спасброском: ${ABILITY_NAMES[key]}`}
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
                      <span>{ABILITY_NAMES[key]}</span>
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
                          filled={flags.is_proficient || flags.is_expertise}
                          expertise={flags.is_expertise}
                          label={`Владение навыком: ${skill.label} (клик: нет → владение → экспертиза)`}
                          onClick={() => onPatch(cycleSkillMastery(c, skill.key))}
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
              <Expanding
                fill
                value={String(asRecordNotes(c))}
                printMaxHeight="12rem"
                ariaLabel="Прочие владения и языки"
                onChange={(otherProficiencies) => patch({ otherProficiencies })}
              />
              <div className="classic-caption">Прочие владения и языки</div>
            </div>
          </div>

          <div className="classic-col">
            <div className="classic-combat-row">
              <label className="classic-combat-stat classic-combat-stat--ac">
                <input
                  value={combatNum('ac')}
                  onChange={(e) => patch({ combat: { ac: numOrNull(e.target.value) } })}
                />
                <span>Класс доспеха</span>
              </label>
              <label className="classic-combat-stat">
                <input
                  value={combatNum('initiative')}
                  onChange={(e) => patch({ combat: { initiative: numOrNull(e.target.value) } })}
                />
                <span>Инициатива</span>
              </label>
              <label className="classic-combat-stat">
                <input
                  value={combatNum('speed')}
                  onChange={(e) => patch({ combat: { speed: numOrNull(e.target.value) } })}
                />
                <span>Скорость</span>
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
              <input
                className="classic-hp"
                value={c.hp_current ?? ''}
                aria-label="Текущие хиты"
                onChange={(e) => patch({ hp_current: numOrNull(e.target.value) })}
              />
              <div className="classic-caption">Текущие хиты</div>
            </div>

            <div className="classic-panel classic-panel--hp-temp">
              <input
                className="classic-hp"
                value={combatNum('hp_temp')}
                aria-label="Временные хиты"
                onChange={(e) => patch({ combat: { hp_temp: Number(e.target.value) || 0 } })}
              />
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
              <div className="classic-attacks-head">
                <span>Название</span>
                <span>Бонус атаки</span>
                <span>Урон / тип</span>
              </div>
              {weapons.map((row, idx) => (
                <div className="classic-weapon" key={idx}>
                  <span>{row.name || '—'}</span>
                  <span>{row.attackBonus || '—'}</span>
                  <span>{row.damageType || '—'}</span>
                </div>
              ))}
              <Expanding
                fill
                value={textBlockValue(c, 'attacks')}
                printMaxHeight="6rem"
                ariaLabel="Заметки к атакам и заклинаниям"
                onChange={(value) => patch({ textBlocks: { attacks: value } })}
              />
              <div className="classic-caption">Атаки и заклинания</div>
            </div>

            <div className="classic-panel classic-equip classic-panel--grow classic-panel--grow-lg">
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
                printMaxHeight="14rem"
                ariaLabel="Снаряжение"
                onChange={(value) => patch({ equipmentText: value })}
              />
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
                ['features', 'Умения и особенности', '22rem', false],
              ] as const
            ).map(([key, label, height, personality]) => (
              <div
                className={`classic-panel ${personality ? 'classic-panel--personality' : 'classic-panel--features'}`}
                key={key}
              >
                <Expanding
                  fill={!personality}
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

      <article className="classic-sheet classic-page2" aria-label="Классический лист 2014, страница 2">
        <header className="classic-header classic-header--page2">
          <div className="classic-brand">
            <strong>D&amp;D</strong>
            <span>{brandYearLabel('2014')}</span>
          </div>
          <label className="classic-name">
            <span>Имя персонажа</span>
            <input value={c.name} onChange={(e) => patch({ name: e.target.value })} />
          </label>
          <div className="classic-physique">
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
                  onChange={(e) => patch({ identity: { [key]: e.target.value || null } })}
                />
              </label>
            ))}
          </div>
        </header>

        <div className="classic-page2-grid">
          <section className="classic-panel classic-panel--grow classic-page2-appearance">
            <Expanding
              fill
              value={textBlockValue(c, 'appearance')}
              printMaxHeight="18rem"
              ariaLabel="Внешность персонажа"
              onChange={(value) => patch({ textBlocks: { appearance: value } })}
            />
            <div className="classic-caption">Внешность персонажа</div>
          </section>

          <section className="classic-panel classic-panel--grow classic-page2-allies">
            <Expanding
              fill
              value={textBlockValue(c, 'allies')}
              printMaxHeight="12rem"
              ariaLabel="Союзники и организации"
              onChange={(value) => patch({ textBlocks: { allies: value } })}
            />
            <div className="classic-caption">Союзники и организации</div>
          </section>

          <section className="classic-panel classic-panel--grow classic-page2-backstory">
            <Expanding
              fill
              value={textBlockValue(c, 'background')}
              printMaxHeight="24rem"
              ariaLabel="Предыстория персонажа"
              onChange={(value) => patch({ textBlocks: { background: value } })}
            />
            <div className="classic-caption">Предыстория персонажа</div>
          </section>

          <div className="classic-page2-right-stack">
            <section className="classic-panel classic-panel--grow">
              <Expanding
                fill
                value={textBlockValue(c, 'feats')}
                printMaxHeight="12rem"
                ariaLabel="Дополнительные умения и особенности"
                onChange={(value) => patch({ textBlocks: { feats: value } })}
              />
              <div className="classic-caption">Дополнительные умения и особенности</div>
            </section>
            <section className="classic-panel classic-panel--grow classic-panel--grow-lg">
              <Expanding
                fill
                value={textBlockValue(c, 'treasure')}
                printMaxHeight="12rem"
                ariaLabel="Сокровища"
                onChange={(value) => patch({ textBlocks: { treasure: value } })}
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
            <input
              value={c.class_name ?? ''}
              onChange={(e) => patch({ class_name: e.target.value || null })}
            />
          </label>
          <div className="classic-spell-stats">
            <label>
              <span>Базовая характеристика</span>
              <input
                value={classicSpellAbilityLabel(spells.casting_ability)}
                placeholder="ИНТ / МУД / ХАР"
                onChange={(e) => onPatch(setCastingAbility(c, parseCastingAbilityInput(e.target.value)))}
              />
            </label>
            <label>
              <span>Сложность спасброска</span>
              <input value={spellStats.saveDc} readOnly title="Считается от характеристики и бонуса владения" />
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
        </header>

        <div className="classic-spell-columns">
          <div className="classic-spell-col">
            {renderCantrips()}
            {renderSpellLevel(1)}
            {renderSpellLevel(2)}
          </div>
          <div className="classic-spell-col">
            {renderSpellLevel(3)}
            {renderSpellLevel(4)}
            {renderSpellLevel(5)}
          </div>
          <div className="classic-spell-col">
            {renderSpellLevel(6)}
            {renderSpellLevel(7)}
            {renderSpellLevel(8)}
            {renderSpellLevel(9)}
          </div>
        </div>
      </article>
        </>
      )}

      <article className="classic-sheet classic-page4" aria-label="Классический лист, напарники">
        <header className="classic-header classic-header--companions">
          <div className="classic-brand">
            <strong>D&amp;D</strong>
            <span>{brandYearLabel(sheetLayout)}</span>
          </div>
          <label className="classic-name">
            <span>Имя персонажа</span>
            <input value={c.name} onChange={(e) => patch({ name: e.target.value })} />
          </label>
          <div className="classic-companions-banner">
            <strong>Напарники</strong>
            <span>Спутники, фамильяры и призывы — страница Dvarf (нет в официальном бланке)</span>
          </div>
        </header>

        <div className="classic-companions-grid">
          {companionSlots.map((row, index) => (
            <section className="classic-panel classic-companion-card" key={row?.id ?? `slot-${index}`}>
              <div className="classic-companion-card__top">
                <label className="classic-companion-card__name">
                  <span>Имя</span>
                  <input
                    value={row?.name ?? ''}
                    onChange={(e) => onPatch(patchCompanionField(c, index, { name: e.target.value }))}
                  />
                </label>
                <label className="classic-companion-card__kind">
                  <span>Тип</span>
                  <select
                    value={row?.kind ?? 'other'}
                    onChange={(e) =>
                      onPatch(
                        patchCompanionField(c, index, {
                          kind: e.target.value as CompanionKind,
                        }),
                      )
                    }
                  >
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
                  <input
                    value={row?.stats.ac ?? ''}
                    onChange={(e) => onPatch(patchCompanionField(c, index, { ac: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Хиты</span>
                  <input
                    value={row?.stats.hp ?? ''}
                    onChange={(e) => onPatch(patchCompanionField(c, index, { hp: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Скорость</span>
                  <input
                    value={row?.stats.speed ?? ''}
                    onChange={(e) =>
                      onPatch(patchCompanionField(c, index, { speed: e.target.value }))
                    }
                  />
                </label>
              </div>
              <Expanding
                fill
                value={row?.notes ?? ''}
                printMaxHeight="5.5rem"
                ariaLabel="Заметки напарника"
                onChange={(notes) => onPatch(patchCompanionField(c, index, { notes }))}
              />
              <div className="classic-caption">Карточка напарника</div>
            </section>
          ))}
        </div>
      </article>

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
  )

  function renderCantrips() {
    const rows = paddedSpellLines(spells.known, 0)
    return (
      <section className="classic-spell-level classic-spell-level--grow">
        <div className="classic-spell-level__head">
          <div className="classic-spell-level__badge">0</div>
          <div className="classic-spell-level__title">Заговоры</div>
        </div>
        <ul className="classic-spell-lines classic-spell-lines--cantrips">
          {rows.map((spell, i) => (
            <li key={spell?.id ?? `cantrip-${i}`}>
              <input
                value={spell?.name ?? ''}
                onChange={(e) => onPatch(setSpellNameAt(c, 0, i, e.target.value))}
              />
            </li>
          ))}
        </ul>
      </section>
    )
  }

  function renderSpellLevel(level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) {
    const slot = spells.slots[String(level)] ?? { max: 0, used: 0 }
    const rows = paddedSpellLines(spells.known, level)
    return (
      <section className="classic-spell-level classic-spell-level--grow" key={level}>
        <div className="classic-spell-level__head">
          <div className="classic-spell-level__badge">{level}</div>
          <div className="classic-spell-level__slots">
            <label>
              Всего ячеек
              <input
                type="number"
                value={slot.max || ''}
                onChange={(e) => onPatch(setSlotTotal(c, level, Number(e.target.value) || 0))}
              />
            </label>
            <label>
              Потрачено
              <input
                type="number"
                value={slot.used || ''}
                onChange={(e) => onPatch(setSlotExpended(c, level, Number(e.target.value) || 0))}
              />
            </label>
          </div>
        </div>
        <ul className="classic-spell-lines">
          {rows.map((spell, i) => (
            <li key={spell?.id ?? `spell-${level}-${i}`}>
              <button
                type="button"
                className="classic-bubble-btn"
                aria-label="Подготовлено"
                disabled={!spell}
                onClick={() => {
                  if (spell) onPatch(toggleSpellPrepared(c, spell.id))
                }}
              >
                <span
                  className={`classic-bubble ${spell?.prepared ? 'is-filled' : ''}`}
                />
              </button>
              <input
                value={spell?.name ?? ''}
                onChange={(e) => onPatch(setSpellNameAt(c, level, i, e.target.value))}
              />
            </li>
          ))}
        </ul>
      </section>
    )
  }
}

