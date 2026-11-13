/** Диалог «Основное»: имя, класс, раса, предыстория. */
import type { SheetModel } from './sheetModel'
import { CatalogCombobox } from '../../catalog'
import { type RulesEdition } from '../../../shared/api/characters'
import { reduceClassLevel, totalCharacterLevel } from '../../../shared/dnd/classLevels'
import { XpProgressField } from '../XpProgressField'
import { revokeClassGrant } from '../classEffects'
import { revokeBackgroundGrant } from '../backgroundEffects'
import { isBackgroundComboboxRoot } from '../../../shared/dnd/backgroundGrants'
import { revokeSubclassGrant } from '../subclassEffects'
import {
  Button,
  Field,
  Input,
  Stack,
  Text,
} from '../../../ui'
import { isRaceComboboxRoot, raceSizeLabel } from '../../../shared/dnd/raceGrants'
import {
  ALIGNMENTS,
  alignmentNeedsClarification,
  alignmentSheetLabel,
} from '../../../shared/dnd/alignments'
import { revokeClassAsiBonuses } from '../../../shared/dnd/classAsi'
import {
  knowledgeBlessingSkillIds,
  syncSkillsExpertiseFromPicks,
} from '../../../shared/dnd/expertise'
import { featureLockedExpertiseSkillIds } from '../../../shared/dnd/fighterArchetypeGrants'
import { clearFeaturePicksAboveClassLevel, listUnlockedExpertiseKeys } from '../../../shared/dnd/pendingFeatureChoices'
import { revokeFeatGrantFromDraft, revokeFeatGrantsForAsi, revokeFeatGrantsForBackground, syncFeatProficiencyResources } from '../featEffects'
import { syncHitDicePools } from '../../../shared/dnd/classHitDice'
import { averageHpGain, hitDieForClass } from '../../../shared/dnd/multiclassRules'
import { withSyncedHitDiceSummary } from '../play'
import { unlockFeaturesForClasses } from '../../../shared/dnd/classFeatures'
import { clearFeaturePicksForClass } from '../../../shared/dnd/featurePicks'
import { IdentityDialog } from '../IdentityDialog'
import { appendXpHistory } from '../playDeskUi'
import { abilityModifier, formatModifier } from '../sheetTypes'
import { reconcileSubclassSpellcasting } from '../reconcileSpellcasting'
import type { Draft } from './draft'

function withLevelSpellcasting(model: SheetModel, draft: Draft): {
  draft: Draft
  tableChanged: boolean
} {
  const raced = draft
  const reconciled = reconcileSubclassSpellcasting({
    classes: raced.classes,
    abilities: raced.abilities,
    slice: model.subclassSliceFrom(raced),
  })
  return {
    tableChanged: reconciled.tableChanged,
    draft: {
      ...raced,
      spells: reconciled.slice.spells,
      subclassGrants: reconciled.slice.subclassGrants,
    },
  }
}

export function SheetIdentityDialog({ model }: { model: SheetModel }) {
  return (
    <>
      <IdentityDialog
        open={model.identityOpen}
        onClose={() => model.setIdentityOpen(false)}
        character={model.baseCharacter}
        onAvatarChanged={(updated) => {
          model.setBaseCharacter(updated)
          model.onSaved(updated)
        }}
      >
          <section className="identity-dialog__section">
            <p className="identity-dialog__section-label">Персонаж</p>
          <Field label="Имя" htmlFor="sheet-name">
            <Input
              id="sheet-name"
              value={model.draft.name}
              onChange={(event) => model.setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
          </Field>
          <div className="sheet-grid sheet-grid--2">
            <Field
              label="Уровень персонажа"
              hint="Сумма уровней классов. +1 — этот класс или мультикласс."
            >
              <div className="languages-tools-add">
                <Input value={String(model.characterLevel)} readOnly />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={model.characterLevel >= 20}
                  onClick={() => {
                    model.setIdentityOpen(false)
                    model.setLevelUpOpen(true)
                  }}
                >
                  +1 уровень
                </Button>
              </div>
            </Field>
            <Field
              label="Опыт"
              htmlFor="sheet-xp"
              hint="Начисление не поднимает уровень само — после порога жми «+1 уровень» / ссылку ниже."
            >
              <XpProgressField
                xp={model.draft.identity.experience}
                level={model.characterLevel}
                xpHistory={model.draft.sheetUi.xpHistory}
                onRequestLevelUp={() => {
                  model.setIdentityOpen(false)
                  model.setLevelUpOpen(true)
                }}
                levelUpDisabled={model.characterLevel >= 20}
                onChange={(experience, meta) => {
                  model.setDraft((prev) => {
                    const prevXp = prev.identity.experience
                    const delta = experience - prevXp
                    return {
                      ...prev,
                      identity: { ...prev.identity, experience },
                      sheetUi: {
                        ...prev.sheetUi,
                        xpHistory: delta
                          ? appendXpHistory(prev.sheetUi.xpHistory, {
                              delta,
                              reason: meta?.reason ?? '',
                            })
                          : prev.sheetUi.xpHistory,
                      },
                    }
                  })
                }}
              />
            </Field>
          </div>
          <Field label="Бонус мастерства">
            <Input value={formatModifier(model.proficiencyBonus)} readOnly />
          </Field>
          </section>
          {!model.primaryClass?.name.trim() ? (
            <Text tone="muted">
              Создание: сначала класс (и архетип, если уже есть), потом раса — так метки и расовые
              списки заклинаний сразу видят, кастер ты или нет.
            </Text>
          ) : null}
          <section className="identity-dialog__section">
            <p className="identity-dialog__section-label">Классы</p>
            {model.pendingStartingLevel > 1 ? (
              <Text tone="muted">
                Старт с {model.pendingStartingLevel} ур.: выбери класс — мастер поднимет уровень и проведёт
                через умения/ASI.
              </Text>
            ) : null}
            <Stack gap={10}>
              {model.draft.classes.map((row, index) => (
                <div key={row.id} className="identity-dialog__class">
                  <div className="sheet-grid sheet-grid--2">
                    <Field
                      label={model.draft.classes.length > 1 ? `Класс ${index + 1}` : 'Класс'}
                      hint={
                        index === 0
                          ? 'Шаг 1 · основной класс для карточки персонажа'
                          : undefined
                      }
                    >
                      <CatalogCombobox
                        id={index === 0 ? 'sheet-class-primary' : undefined}
                        kind="class"
                        edition={model.baseCharacter.rules_edition as RulesEdition}
                        value={row.name}
                        placeholder="Начните вводить класс"
                        onChange={(value, selected) => {
                          model.patchClass(row.id, {
                            name: value,
                            catalog_id: selected?.id ?? null,
                          })
                          if (!selected) return
                          const mode = model.grantModeForClassRow(model.draft, row.id)
                          model.requestOrApplyClassGrant({
                            classEntryId: row.id,
                            className: selected.name_ru,
                            mode,
                            catalogSlug: selected.slug,
                            catalogData: selected.data,
                            classesOverride: model.draft.classes.map((item) =>
                              item.id === row.id
                                ? {
                                    ...item,
                                    name: selected.name_ru,
                                    catalog_id: selected.id,
                                  }
                                : item,
                            ),
                          })
                        }}
                      />
                      <div className="languages-tools-add" style={{ marginTop: 8 }}>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            model.setHomebrewPicker({
                              classEntryId: row.id,
                              initialName: row.name,
                            })
                          }
                        >
                          Хомбрю
                        </Button>
                      </div>
                    </Field>
                    <Field label="Уровней в классе">
                      <div className="languages-tools-add">
                        <Input value={String(row.level)} readOnly />
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={model.draft.classes.length === 1 && row.level <= 1}
                          onClick={() => {
                            let tableChanged = false
                            model.setDraft((prev) => {
                              const beforeLevel = row.level
                              const die =
                                hitDieForClass({ className: row.name, catalogData: null }) ??
                                'd8'
                              const conMod = abilityModifier(prev.abilities.con)
                              const hpLoss = averageHpGain(die, conMod)
                              const nextClasses = reduceClassLevel(prev.classes, row.id)
                              const removed = !nextClasses.some((item) => item.id === row.id)
                              const hitDiceByClass = syncHitDicePools({
                                classes: nextClasses,
                                previous: prev.play.hitDiceByClass,
                              })
                              const nextHpMax =
                                prev.hpMax == null
                                  ? null
                                  : Math.max(1, prev.hpMax - hpLoss)
                              const nextHpCurrent =
                                prev.hpCurrent == null || nextHpMax == null
                                  ? prev.hpCurrent
                                  : Math.min(prev.hpCurrent, nextHpMax)

                              // Drop ASI ledger entries for this class above new level
                              const keptAsi = prev.classAsi.filter((entry) => {
                                if (entry.classEntryId !== row.id) return true
                                if (removed) return false
                                return entry.atClassLevel < beforeLevel
                              })
                              const revokedAsi = prev.classAsi.filter(
                                (entry) => !keptAsi.includes(entry),
                              )
                              let abilities = prev.abilities
                              for (const entry of revokedAsi) {
                                abilities = revokeClassAsiBonuses(abilities, entry.bonuses)
                              }
                              let featBase: Draft = {
                                ...prev,
                                classes: nextClasses,
                                abilities,
                                classAsi: keptAsi,
                                hpMax: nextHpMax,
                                hpCurrent: nextHpCurrent,
                              }
                              for (const entry of revokedAsi) {
                                featBase = model.mergeFeatSlice(
                                  featBase,
                                  revokeFeatGrantsForAsi({
                                    draft: model.featSliceFrom(featBase),
                                    classEntryId: entry.classEntryId,
                                    featureId: entry.featureId,
                                  }),
                                )
                              }

                              if (!removed) {
                                const newLevel = beforeLevel - 1
                                const packFeatures = unlockFeaturesForClasses({
                                  classes: prev.classes,
                                  characterLevel: totalCharacterLevel(prev.classes),
                                  abilities: prev.abilities,
                                  subclassSlugByEntryId: model.subclassSlugByEntryId,
                                  subclassTransitionByEntryId: model.subclassTransitionByEntryId,
                                })
                                  .filter((feature) => feature.classEntryId === row.id)
                                  .map((feature) => ({ id: feature.id, level: feature.level }))
                                const nextPicks = clearFeaturePicksAboveClassLevel({
                                  featurePicks: featBase.featurePicks,
                                  classEntryId: row.id,
                                  features: packFeatures,
                                  newClassLevel: newLevel,
                                })
                                const nextUnlocked = unlockFeaturesForClasses({
                                  classes: nextClasses,
                                  characterLevel: totalCharacterLevel(nextClasses),
                                  abilities,
                                  subclassSlugByEntryId: model.subclassSlugByEntryId,
                                  subclassTransitionByEntryId: model.subclassTransitionByEntryId,
                                })
                                const nextSkills = syncSkillsExpertiseFromPicks({
                                  skills: featBase.skills,
                                  featurePicks: nextPicks,
                                  expertiseKeys: listUnlockedExpertiseKeys(nextUnlocked),
                                  alsoExpertiseSkillIds: [
                                    ...knowledgeBlessingSkillIds(featBase.subclassGrants),
                                    ...featureLockedExpertiseSkillIds(nextUnlocked),
                                  ],
                                })
                                const synced = model.mergeFeatSlice(
                                  {
                                    ...featBase,
                                    featurePicks: nextPicks,
                                    skills: nextSkills,
                                    play: withSyncedHitDiceSummary({
                                      ...featBase.play,
                                      hitDiceByClass,
                                    }),
                                  },
                                  syncFeatProficiencyResources(
                                    model.featSliceFrom({
                                      ...featBase,
                                      classes: nextClasses,
                                      featurePicks: nextPicks,
                                      skills: nextSkills,
                                    }),
                                  ),
                                )
                                const raced = model.withRaceSpellsSynced(synced, nextClasses)
                                const finished = withLevelSpellcasting(model, raced)
                                tableChanged = finished.tableChanged
                                return finished.draft
                              }
                              const withoutClass = revokeClassGrant(
                                model.draftSliceFrom(featBase),
                                row.id,
                              )
                              const withoutSubclass = revokeSubclassGrant(
                                {
                                  ...model.subclassSliceFrom(featBase),
                                  identity: withoutClass.identity,
                                  skills: withoutClass.skills,
                                  classGrants: withoutClass.classGrants,
                                },
                                row.id,
                                { copyTextToNotes: true },
                              )
                              const raced = model.withRaceSpellsSynced(
                                model.mergeSubclassSlice(
                                  {
                                    ...featBase,
                                    featurePicks: clearFeaturePicksForClass(
                                      featBase.featurePicks,
                                      row.id,
                                    ),
                                    classGrants: withoutClass.classGrants,
                                    saves: withoutClass.saves,
                                    skills: withoutClass.skills,
                                    identity: withoutClass.identity,
                                    hpMax: withoutClass.hpMax ?? featBase.hpMax,
                                    hpCurrent: withoutClass.hpCurrent ?? featBase.hpCurrent,
                                    inventory: withoutClass.inventory,
                                    weapons: withoutClass.weapons,
                                    play: withSyncedHitDiceSummary({
                                      ...featBase.play,
                                      hitDiceByClass,
                                      hitDie: withoutClass.playHitDie ?? prev.play.hitDie,
                                    }),
                                  },
                                  withoutSubclass,
                                ),
                                nextClasses,
                              )
                              const finished = withLevelSpellcasting(model, raced)
                              tableChanged = finished.tableChanged
                              return finished.draft
                            })
                            if (tableChanged) {
                              model.onToast('Ячейки обновлены по таблице 2014')
                            }
                          }}
                        >
                          −1
                        </Button>
                      </div>
                    </Field>
                  </div>
                  <Field
                    label="Архетип"
                    hint={
                      row.catalog_id
                        ? 'Первый выбор — в развилках уровня; здесь — сменить (все способности или только будущие). Хомбрю — только имя'
                        : 'Сначала выбери класс из справочника, чтобы фильтровать архетипы'
                    }
                  >
                    <div className="languages-tools-add">
                      <CatalogCombobox
                        kind="subclass"
                        edition={model.baseCharacter.rules_edition as RulesEdition}
                        parentId={row.catalog_id}
                        disabled={!row.catalog_id}
                        value={row.subclass_name}
                        placeholder="Например: Клятва мести"
                        commitOnSelect
                        onChange={(_value, selected) => {
                          if (!selected) return
                          model.requestSubclassChange(row.id, selected)
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const name = window.prompt(
                            'Хомбрю-архетип (только имя на листе):',
                            row.subclass_name,
                          )
                          if (name == null) return
                          const trimmed = name.trim()
                          if (!trimmed) return
                          model.applyHomebrewSubclass(row.id, trimmed)
                        }}
                      >
                        Хомбрю
                      </Button>
                    </div>
                  </Field>
                </div>
              ))}
            </Stack>
            <Text tone="muted">
              Итого: {model.classSummary || 'класс не выбран'} · из справочника откроется попап со всеми
              развилками (навыки, инструменты, стартовое снаряжение). «Хомбрю» — только название на
              листе.
            </Text>
          </section>
          <section className="identity-dialog__section">
            <p className="identity-dialog__section-label">Черты</p>
            <Text tone="muted">
              ASI на 4/6/8… — в повышении уровня. Если мастер просто выдал черту — добавь здесь.
            </Text>
            <div className="identity-dialog__feats">
              {model.draft.featGrants.length === 0 ? (
                <Text tone="muted">Пока нет черт на листе.</Text>
              ) : (
                model.draft.featGrants.map((row) => {
                  const sourceLabel =
                    row.source.kind === 'asi'
                      ? `Увел. характеристик · ур. ${row.source.atClassLevel}`
                      : row.source.kind === 'race'
                        ? 'Раса'
                        : row.source.kind === 'background'
                          ? 'Предыстория'
                          : 'Мастер'
                  return (
                    <div key={row.id} className="identity-dialog__feat-row">
                      <div>
                        <strong>{row.nameRu}</strong>
                        <div className="identity-dialog__feat-meta">{sourceLabel}</div>
                      </div>
                      {row.source.kind === 'manual' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            model.setDraft((prev) =>
                              model.mergeFeatSlice(
                                prev,
                                revokeFeatGrantFromDraft({
                                  draft: model.featSliceFrom(prev),
                                  grantId: row.id,
                                }),
                              ),
                            )
                            model.onToast(`Черта «${row.nameRu}» снята`)
                          }}
                        >
                          Убрать
                        </Button>
                      ) : null}
                    </div>
                  )
                })
              )}
              <Button type="button" variant="secondary" onClick={() => model.setGiftFeatOpen(true)}>
                Мастер выдал черту
              </Button>
            </div>
          </section>
          <section className="identity-dialog__section">
            <p className="identity-dialog__section-label">Раса и прошлое</p>
          <div className="sheet-grid sheet-grid--2">
            <Field
              label="Раса"
              htmlFor="sheet-race"
              hint={
                model.primaryClass?.name.trim()
                  ? 'Шаг 3 · подраса и развилки — в попапе; если раса даёт черту — мастер подскажет'
                  : 'Шаг 3 · сначала предыстория и класс, потом раса'
              }
            >
              <CatalogCombobox
                id="sheet-race"
                kind="race"
                edition={model.baseCharacter.rules_edition as RulesEdition}
                value={model.draft.raceName}
                placeholder={
                  model.primaryClass?.name.trim()
                    ? 'Начните вводить расу'
                    : 'Сначала выбери класс'
                }
                disabled={!model.primaryClass?.name.trim()}
                filterEntry={(entry) => isRaceComboboxRoot(entry)}
                onChange={(value, selected) => {
                  if (!model.primaryClass?.name.trim()) return
                  if (!selected) {
                    model.setDraft((prev) => ({
                      ...prev,
                      raceName: value,
                      raceCatalogId: null,
                    }))
                    return
                  }
                  void model.requestOrApplyRaceGrant(selected)
                }}
              />
              <div className="languages-tools-add" style={{ marginTop: 8 }}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!model.primaryClass?.name.trim()}
                  onClick={() => model.setRaceHomebrewOpen(true)}
                >
                  Хомбрю
                </Button>
              </div>
            </Field>
            <Field
              label="Размер"
              hint="Задаётся расой при создании (или при смене расы). Вручную не меняется."
            >
              <Text>
                {raceSizeLabel(model.draft.raceGrant?.size || model.draft.identity.size)}
              </Text>
            </Field>
          </div>
          <div className="sheet-grid sheet-grid--2">
            <Field
              label="Предыстория"
              htmlFor="sheet-background"
              hint="Шаг 1 · прошлое: навыки с фона учтутся при выборе класса (без дублей)"
            >
              <CatalogCombobox
                id="sheet-background"
                kind="background"
                edition={model.baseCharacter.rules_edition as RulesEdition}
                value={model.draft.identity.background}
                placeholder="Начните вводить предысторию"
                filterEntry={(entry) => isBackgroundComboboxRoot(entry)}
                onChange={(value, selected) => {
                  if (!selected) {
                    model.setDraft((prev) => {
                      const cleared = revokeBackgroundGrant(model.backgroundSliceFrom(prev))
                      let merged = model.mergeBackgroundSlice(prev, cleared)
                      const prevSlug = prev.identity.backgroundSlug
                      if (prevSlug) {
                        merged = model.mergeFeatSlice(
                          merged,
                          revokeFeatGrantsForBackground({
                            draft: model.featSliceFrom(merged),
                            backgroundSlug: prevSlug,
                          }),
                        )
                      }
                      return {
                        ...merged,
                        identity: {
                          ...merged.identity,
                          background: value,
                          backgroundSlug: null,
                        },
                        backgroundCatalogId: null,
                      }
                    })
                    return
                  }
                  void model.requestOrApplyBackgroundGrant(selected)
                }}
              />
              <div className="languages-tools-add" style={{ marginTop: 8 }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => model.setBackgroundHomebrewOpen(true)}
                >
                  Хомбрю
                </Button>
              </div>
            </Field>
            <Field label="Мировоззрение" htmlFor="sheet-alignment">
              <select
                id="sheet-alignment"
                className="play-select"
                value={model.draft.identity.alignment}
                onChange={(event) =>
                  model.patchIdentity({
                    alignment: event.target.value,
                    alignmentText: '',
                  })
                }
              >
                <option value="">— не выбрано —</option>
                {ALIGNMENTS.map((row) => (
                  <option key={row.slug} value={row.slug}>
                    {row.nameRu}
                  </option>
                ))}
              </select>
              {alignmentNeedsClarification(model.draft.identity) ? (
                <Text tone="muted">
                  Уточните мировоззрение. Сейчас записано: «
                  {alignmentSheetLabel(model.draft.identity)}».
                </Text>
              ) : null}
            </Field>
            <Field label="Пол">
              <div className="chip-row" role="group" aria-label="Пол персонажа">
                {(
                  [
                    ['male', 'Мужской'],
                    ['female', 'Женский'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`sheet-chip${model.draft.identity.gender === key ? ' is-on' : ''}`}
                    onClick={() => model.patchIdentity({ gender: key })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          </section>
      </IdentityDialog>
    </>
  )
}
