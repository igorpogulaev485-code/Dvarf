/** Диалог «Основное»: имя, класс, раса, предыстория. */
import type { SheetModel } from './sheetModel'
import { CatalogCombobox } from '../../catalog'
import { type RulesEdition } from '../../../shared/api/characters'
import { reduceClassLevel, totalCharacterLevel, type ClassLevelEntry } from '../../../shared/dnd/classLevels'
import { computeProgression2024 } from '../../../shared/dnd/edition2024Classes'
import {
  resolveClassSlug2024,
  subclassDropsOnLevelDown2024,
  trimClassOptionsForLevel2024,
} from '../../../shared/dnd/pendingFeatureChoices2024'
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
  raceSpeciesLabelTitle,
  raceSpeciesSectionTitle,
} from '../../../shared/dnd/raceSpeciesLabel'
import { RULES_EDITION_2024_OPEN } from '../../../shared/dnd/rulesEdition2024'
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
import { trimLevelUpSpellbookRows } from '../../../shared/dnd/wizardSpellbook'
import { trimWizardBookPicksOnLevelDown2024 } from '../../../shared/dnd/wizardBook2024Features'
import { trimSavantSpellsOnLevelDown2024 } from '../../../shared/dnd/wizard2024Features'
import { averageHpGain, hitDieForClass } from '../../../shared/dnd/multiclassRules'
import {
  expectedPassiveHpBonuses,
  hasDwarvenToughness,
} from '../../../shared/dnd/hpPassiveBonuses'
import {
  trimDruid2024PicksOnLevelDown,
  trimKnownFormsOnLevelDown2024,
} from '../../../shared/dnd/druid2024Features'
import { trimBard2024PicksOnLevelDown } from '../../../shared/dnd/bard2024Features'
import { isOffBardList2024 } from '../bardSpellCatalog2024'
import { draconicResilienceHpDelta2024 } from '../../../shared/dnd/sorcerer2024Features'
import { dwarvenToughnessHpDelta2024 } from '../../../shared/dnd/speciesHpBonus2024'
import { withSyncedHitDiceSummary } from '../play'
import { unlockFeaturesForClasses } from '../../../shared/dnd/classFeatures'
import { clearFeaturePicksForClass } from '../../../shared/dnd/featurePicks'
import { IdentityDialog } from '../IdentityDialog'
import { DeskIdentityEtalon } from '../DeskIdentityEtalon'
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

/** 2024 −1: drop the subclass below its level and trim invocations / metamagic / masteries. */
function levelDownClassState2024(
  model: SheetModel,
  draft: Draft,
  row: ClassLevelEntry,
  beforeLevel: number,
  newLevel: number,
): Draft {
  const slug = resolveClassSlug2024(row)
  const trimmed = trimClassOptionsForLevel2024({
    slug,
    newLevel,
    classOptions: draft.classOptions2024,
    weaponMastery: draft.weaponMastery,
  })
  let next: Draft = {
    ...draft,
    classOptions2024: trimmed.classOptions,
    weaponMastery: trimmed.weaponMastery,
  }
  if (slug === 'wizard') {
    const known = trimSavantSpellsOnLevelDown2024(
      trimLevelUpSpellbookRows(next.spells.known, newLevel),
      newLevel,
    )
    if (known !== next.spells.known) next = { ...next, spells: { ...next.spells, known } }
    const featurePicks = trimWizardBookPicksOnLevelDown2024(
      next.featurePicks,
      row.id,
      newLevel,
    )
    if (featurePicks !== next.featurePicks) next = { ...next, featurePicks }
  }
  if (slug === 'druid') {
    const featurePicks = trimDruid2024PicksOnLevelDown(next.featurePicks, row.id, newLevel)
    const knownForms = trimKnownFormsOnLevelDown2024(next.knownForms, newLevel)
    if (featurePicks !== next.featurePicks || knownForms !== next.knownForms) {
      next = { ...next, featurePicks, knownForms }
    }
  }
  if (slug === 'bard') {
    const featurePicks = trimBard2024PicksOnLevelDown(next.featurePicks, row.id, newLevel)
    if (featurePicks !== next.featurePicks) next = { ...next, featurePicks }
    // Magical Secrets (L10+): drop off-list prepared spells when falling below 10.
    // Always-prepared Lore discoveries (`feature-spell:…`, prepared_locked) stay until sync drops them.
    if (newLevel < 10) {
      const known = next.spells.known.filter((spell) => {
        if (spell.level <= 0) return true
        if (spell.prepared_locked) return true
        if (String(spell.id || '').startsWith('feature-spell:')) return true
        return !isOffBardList2024(spell)
      })
      if (known.length !== next.spells.known.length) {
        next = { ...next, spells: { ...next.spells, known } }
      }
    }
  }
  const hasSubclass = Boolean(row.subclass_catalog_id || row.subclass_name.trim())
  if (hasSubclass && subclassDropsOnLevelDown2024(slug, beforeLevel)) {
    next = model.mergeSubclassSlice(
      next,
      revokeSubclassGrant(model.subclassSliceFrom(next), row.id, { copyTextToNotes: true }),
    )
    next = {
      ...next,
      classes: next.classes.map((item) =>
        item.id === row.id ? { ...item, subclass_catalog_id: null, subclass_name: '' } : item,
      ),
      identity:
        next.classes[0]?.id === row.id ? { ...next.identity, subclassName: '' } : next.identity,
    }
  }
  return next
}

function unlockedForLevelDown(
  model: SheetModel,
  edition2024: boolean,
  classes: ClassLevelEntry[],
  abilities: Draft['abilities'],
) {
  if (edition2024) {
    return computeProgression2024({
      classes,
      subclassSlugByEntryId: model.subclassSlugByEntryId,
      abilities,
    }).features
  }
  return unlockFeaturesForClasses({
    classes,
    characterLevel: totalCharacterLevel(classes),
    abilities,
    subclassSlugByEntryId: model.subclassSlugByEntryId,
    subclassTransitionByEntryId: model.subclassTransitionByEntryId,
  })
}

export function SheetIdentityDialog({ model }: { model: SheetModel }) {
  const edition2024 = model.baseCharacter.rules_edition === '2024'
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
        hideAvatar={model.isPlayDesk}
        showClose={model.isPlayDesk}
      >
          {model.isPlayDesk ? <DeskIdentityEtalon model={model} /> : null}
          {model.isPlayDesk ? null : <>
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
                              const newLevelAfter = Math.max(0, beforeLevel - 1)
                              const dragonLoss =
                                edition2024 && /чародей|sorcerer/i.test(row.name)
                                  ? Math.max(
                                      0,
                                      -draconicResilienceHpDelta2024({
                                        oldLevel: beforeLevel,
                                        newLevel: newLevelAfter,
                                        subclassSlug:
                                          row.subclass_catalog_id || row.subclass_name || null,
                                      }),
                                    )
                                  : 0
                              const oldCharacterLevel = totalCharacterLevel(prev.classes)
                              const toughnessLoss = edition2024
                                ? Math.max(
                                    0,
                                    -dwarvenToughnessHpDelta2024({
                                      oldCharacterLevel,
                                      newCharacterLevel: Math.max(0, oldCharacterLevel - 1),
                                      speciesSlug:
                                        prev.identity.speciesSlug ??
                                        prev.raceGrant?.slug ??
                                        null,
                                    }),
                                  )
                                : 0
                              const draconicResilience2014 = (model.unlockedFeatures ?? []).some(
                                (f: { id?: string }) => f.id === 'draconic_resilience',
                              )
                              const dwarvenToughness2014 = hasDwarvenToughness(
                                prev.raceGrant?.slug,
                              )
                              const hpLoss = edition2024
                                ? averageHpGain(die, conMod) + dragonLoss + toughnessLoss
                                : averageHpGain(die, conMod, {
                                    draconicResilience:
                                      draconicResilience2014 &&
                                      /чародей|sorcerer/i.test(row.name),
                                    dwarvenToughness: dwarvenToughness2014,
                                  })
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
                              const nextPassiveHpBonuses = expectedPassiveHpBonuses({
                                classes: nextClasses,
                                draconicResilience: draconicResilience2014,
                                raceSlug: prev.raceGrant?.slug ?? null,
                              })

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
                                passiveHpBonuses: nextPassiveHpBonuses,
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
                                const packFeatures = unlockedForLevelDown(
                                  model,
                                  edition2024,
                                  prev.classes,
                                  prev.abilities,
                                )
                                  .filter((feature) => feature.classEntryId === row.id)
                                  .map((feature) => ({ id: feature.id, level: feature.level }))
                                const clearedPicks = clearFeaturePicksAboveClassLevel({
                                  featurePicks: featBase.featurePicks,
                                  classEntryId: row.id,
                                  features: packFeatures,
                                  newClassLevel: newLevel,
                                })
                                // Expertise 9→8: drop expertise_9 and auto-trim a broken 4-pick L2 row to 2.
                                const nextPicks =
                                  edition2024 && resolveClassSlug2024(row) === 'bard'
                                    ? trimBard2024PicksOnLevelDown(clearedPicks, row.id, newLevel)
                                    : clearedPicks
                                const nextUnlocked = unlockedForLevelDown(
                                  model,
                                  edition2024,
                                  nextClasses,
                                  abilities,
                                )
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
                                const leveled = edition2024
                                  ? levelDownClassState2024(model, synced, row, beforeLevel, newLevel)
                                  : synced
                                const raced = model.withRaceSpellsSynced(leveled, leveled.classes)
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
                              model.onToast(
                                edition2024
                                  ? 'Ячейки обновлены (редакция 2024)'
                                  : 'Ячейки обновлены по таблице 2014',
                              )
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
                  const useSpecies =
                    RULES_EDITION_2024_OPEN &&
                    model.baseCharacter.rules_edition === '2024'
                  const sourceLabel =
                    row.source.kind === 'asi'
                      ? `Увел. характеристик · ур. ${row.source.atClassLevel}`
                      : row.source.kind === 'race'
                        ? useSpecies
                          ? raceSpeciesLabelTitle('2024')
                          : 'Раса'
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
            <p className="identity-dialog__section-label">
              {RULES_EDITION_2024_OPEN &&
              model.baseCharacter.rules_edition === '2024'
                ? raceSpeciesSectionTitle('2024')
                : 'Раса и прошлое'}
            </p>
          <div className="sheet-grid sheet-grid--2">
            <Field
              label={
                RULES_EDITION_2024_OPEN &&
                model.baseCharacter.rules_edition === '2024'
                  ? raceSpeciesLabelTitle('2024')
                  : 'Раса'
              }
              htmlFor="sheet-race"
              hint={
                model.primaryClass?.name.trim()
                  ? RULES_EDITION_2024_OPEN &&
                    model.baseCharacter.rules_edition === '2024'
                    ? 'Шаг 3 · развилки вида — в попапе; если вид даёт черту — мастер подскажет'
                    : 'Шаг 3 · подраса и развилки — в попапе; если раса даёт черту — мастер подскажет'
                  : RULES_EDITION_2024_OPEN &&
                      model.baseCharacter.rules_edition === '2024'
                    ? 'Шаг 3 · сначала предыстория и класс, потом вид'
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
                    ? RULES_EDITION_2024_OPEN &&
                      model.baseCharacter.rules_edition === '2024'
                      ? 'Начните вводить вид'
                      : 'Начните вводить расу'
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
            <Field
              label="Имя игрока"
              htmlFor="sheet-player-name"
              hint="На классическом бланке — поле «Имя игрока»."
            >
              <Input
                id="sheet-player-name"
                value={model.draft.identity.playerName}
                onChange={(e) =>
                  model.patchIdentity({ playerName: e.target.value })
                }
              />
            </Field>
            <Field
              label="Грузоподъёмность"
              htmlFor="sheet-carry"
              hint="Заметка для бланка 2024 (поле carry). Расчёт веса инвентаря — отдельно на столе."
            >
              <Input
                id="sheet-carry"
                value={model.draft.identity.carry}
                onChange={(e) => model.patchIdentity({ carry: e.target.value })}
              />
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
          </>}
      </IdentityDialog>
    </>
  )
}
