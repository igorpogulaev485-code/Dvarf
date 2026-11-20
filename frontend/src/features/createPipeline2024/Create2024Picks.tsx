/** Setup blocks (picks) for the 2024 create wizard. Rendered under the detail panel. */

import { Stack, Text } from '../../ui'
import type { CatalogEntry } from '../../shared/api/catalog'
import { ABILITY_LABEL_RU, type AbilityKey } from '../../shared/dnd/pointBuy'
import { masteryPropertyNameRu } from '../../shared/dnd/weaponMastery'
import { PickChipGroup } from './PickChipGroup'
import {
  DIVINE_ORDER_OPTIONS,
  DRAGONBORN_ANCESTRY_OPTIONS,
  COMMON_LANGUAGE_NAME_RU,
  PRIMAL_ORDER_OPTIONS,
  itemNameRu,
  languageKindLabelRu,
  ruDice,
  sizeLabelRu,
  type ItemNameIndex,
} from './create2024Labels'
import {
  featPickFields,
  originFeatSlugOf,
  pruneFeatPicks,
  skillLabelRu,
  speciesPickFields,
  type FeatPickContext,
  type FeatPicks,
  type PickField,
} from './create2024FeatPicks'
import {
  backgroundAsiTrio,
  backgroundNeedsToolPick,
  classSkillNeed,
  classStartingPacks,
  classToolChoice,
  findFeat,
  fightingStyleFeats,
  l1Invocations,
  masteryWeaponOptions,
  setAsiFlat1,
  setAsiPlus2Plus1,
  speciesLineages,
  speciesNeedsAncestry,
  speciesNeedsLineage,
  speciesSizeOptions,
  toolChoicePool,
  weaponMasteryLimit,
} from './createPipeline2024State'
import {
  entryData,
  type Create2024CatalogBundle,
  type Create2024State,
  type LanguagesBundle,
} from './createPipeline2024Types'

type PicksBase = {
  state: Create2024State
  patch: (partial: Partial<Create2024State>) => void
  catalog: Create2024CatalogBundle
  items: ItemNameIndex
}

export function FeatPickFields({
  fieldsFor,
  picks,
  onChange,
  testIdPrefix,
}: {
  fieldsFor: (picks: FeatPicks) => PickField[]
  picks: FeatPicks
  onChange: (next: FeatPicks) => void
  testIdPrefix: string
}) {
  const fields = fieldsFor(picks)
  if (!fields.length) return null
  return (
    <Stack gap={12}>
      {fields.map((field) => (
        <PickChipGroup
          key={field.id}
          label={field.label}
          hint={field.hint}
          options={field.options}
          selected={picks[field.id] ?? []}
          max={field.count}
          multi={field.count > 1}
          testIdPrefix={`${testIdPrefix}-${field.id}`}
          onChange={(ids) => {
            const nextPicks = { ...picks, [field.id]: ids }
            onChange(pruneFeatPicks(fieldsFor(nextPicks), nextPicks))
          }}
        />
      ))}
    </Stack>
  )
}

function pickContext(catalog: Create2024CatalogBundle, items: ItemNameIndex): FeatPickContext {
  return { spells: catalog.spells, items }
}

function ids(value: unknown): string[] {
  return Array.isArray(value) ? value.map((x) => String(x)) : []
}

export function ClassPicks({
  state,
  patch,
  catalog,
  items,
  classEntry,
}: PicksBase & { classEntry: CatalogEntry }) {
  const skills = classSkillNeed(classEntry)
  const masteryLimit = weaponMasteryLimit(state.classSlug)
  const masteryOptions = masteryWeaponOptions(classEntry, catalog.weapons)
  const styleFeats = fightingStyleFeats(catalog.feats)
  const toolChoice = classToolChoice(classEntry)
  const packs = classStartingPacks(classEntry)
  const setOption = (key: string, value: unknown) =>
    patch({ classOptionPicks: { ...state.classOptionPicks, [key]: value } })

  return (
    <Stack gap={14}>
      {skills.count > 0 ? (
        <PickChipGroup
          label="Навыки класса"
          hint={`Выберите ${skills.count}.`}
          options={skills.from.map((id) => ({ id, label: skillLabelRu(id) }))}
          selected={state.classSkillIds}
          max={skills.count}
          testIdPrefix="p24-m03-pick-skill"
          onChange={(classSkillIds) =>
            patch({
              classSkillIds,
              classOptionPicks: {
                ...state.classOptionPicks,
                expertise: ids(state.classOptionPicks.expertise).filter(
                  (id) => id === 'thieves-tools' || classSkillIds.includes(id),
                ),
              },
            })
          }
        />
      ) : null}
      {toolChoice ? (
        <PickChipGroup
          label="Инструменты класса"
          options={toolChoice.pool.map((id) => ({ id, label: itemNameRu(id, items) }))}
          selected={state.classToolIds}
          max={toolChoice.count}
          testIdPrefix="p24-m03-pick-class-tool"
          onChange={(classToolIds) => patch({ classToolIds })}
        />
      ) : null}
      {masteryLimit > 0 ? (
        <PickChipGroup
          label="Мастерство оружия"
          hint={`Выберите ${masteryLimit}. Свойство применяется, пока оружие в руках.`}
          options={masteryOptions.map(({ entry, mastery }) => ({
            id: entry.slug,
            label: entry.name_ru,
            rest: masteryPropertyNameRu(mastery),
          }))}
          selected={state.weaponMasteryIds}
          max={masteryLimit}
          testIdPrefix="p24-m03-pick-mastery"
          onChange={(weaponMasteryIds) => patch({ weaponMasteryIds })}
        />
      ) : null}
      {state.classSlug === 'fighter' ? (
        <PickChipGroup
          label="Боевой стиль"
          options={styleFeats.map((f) => ({ id: f.slug, label: f.name_ru }))}
          selected={state.fightingStyleSlug ? [state.fightingStyleSlug] : []}
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-style"
          onChange={(picked) => patch({ fightingStyleSlug: picked[0] ?? null })}
        />
      ) : null}
      {state.classSlug === 'cleric' ? (
        <PickChipGroup
          label="Божественный орден"
          options={DIVINE_ORDER_OPTIONS.map((row) => ({ ...row }))}
          selected={state.classOptionPicks.divine_order ? [String(state.classOptionPicks.divine_order)] : []}
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-order"
          onChange={(picked) => setOption('divine_order', picked[0])}
        />
      ) : null}
      {state.classSlug === 'druid' ? (
        <PickChipGroup
          label="Природный орден"
          options={PRIMAL_ORDER_OPTIONS.map((row) => ({ ...row }))}
          selected={state.classOptionPicks.primal_order ? [String(state.classOptionPicks.primal_order)] : []}
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-order"
          onChange={(picked) => setOption('primal_order', picked[0])}
        />
      ) : null}
      {state.classSlug === 'rogue' ? (
        <PickChipGroup
          label="Компетентность"
          hint="Два навыка из выбранных или воровские инструменты."
          options={[
            ...state.classSkillIds.map((id) => ({ id, label: skillLabelRu(id) })),
            { id: 'thieves-tools', label: 'Воровские инструменты' },
          ]}
          selected={ids(state.classOptionPicks.expertise)}
          max={2}
          testIdPrefix="p24-m03-pick-expertise"
          onChange={(expertise) => setOption('expertise', expertise)}
        />
      ) : null}
      {state.classSlug === 'warlock' ? (
        <PickChipGroup
          label="Мистическое воззвание"
          options={l1Invocations().map((row) => ({
            id: row.id,
            label: row.nameRu,
            rest: row.summaryRu,
          }))}
          selected={ids(state.classOptionPicks.eldritch_invocations)}
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-invocation"
          onChange={(picked) => setOption('eldritch_invocations', picked)}
        />
      ) : null}
      {packs.length ? (
        <PickChipGroup
          label="Снаряжение класса"
          hint="Набор предметов или золото вместо него."
          options={packs.map((p) => ({
            id: p.id,
            label: p.labelRu,
            rest: p.isGold ? undefined : p.summaryRu,
          }))}
          selected={packs.some((p) => p.id === state.classEquipment) ? [state.classEquipment] : []}
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-class-equipment"
          onChange={(picked) => patch({ classEquipment: picked[0] ?? state.classEquipment })}
        />
      ) : null}
    </Stack>
  )
}

export function BackgroundPicks({
  state,
  patch,
  catalog,
  items,
  backgroundEntry,
  languages,
}: PicksBase & { backgroundEntry: CatalogEntry; languages: LanguagesBundle }) {
  const trio = backgroundAsiTrio(backgroundEntry)
  const gear = entryData(backgroundEntry).equipment_or_gold as
    | { pack_summary_ru?: string; gold_alternative_gp?: number }
    | undefined
  const gold = gear?.gold_alternative_gp ?? 50
  const toolPool = toolChoicePool(backgroundEntry)
  const featSlug = originFeatSlugOf(backgroundEntry)
  const feat = findFeat(catalog.feats, featSlug)
  const ctx = pickContext(catalog, items)

  return (
    <Stack gap={14}>
      {trio.length === 3 ? (
        <Stack gap={10}>
          <PickChipGroup
            label="Увеличение характеристик"
            hint="Получите +2 и +1 к двум из трёх характеристик или +1 ко всем трём."
            options={[
              { id: '+2/+1', label: '+2 и +1' },
              { id: '+1/+1/+1', label: '+1 · +1 · +1' },
            ]}
            selected={[state.backgroundAsiMode]}
            max={1}
            multi={false}
            testIdPrefix="p24-m03-pick-asi-mode"
            onChange={(picked) => {
              const mode = (picked[0] as '+2/+1' | '+1/+1/+1' | undefined) ?? state.backgroundAsiMode
              patch({
                backgroundAsiMode: mode,
                backgroundAsi:
                  mode === '+1/+1/+1'
                    ? setAsiFlat1(trio)
                    : setAsiPlus2Plus1(trio, trio[0]!, trio[1]!),
              })
            }}
          />
          {state.backgroundAsiMode === '+2/+1' ? (
            <>
              <PickChipGroup
                label="+2 к"
                options={trio.map((k) => ({ id: k, label: ABILITY_LABEL_RU[k] }))}
                selected={trio.filter((k) => state.backgroundAsi[k] === 2)}
                max={1}
                multi={false}
                testIdPrefix="p24-m03-pick-asi-plus2"
                onChange={(picked) => {
                  const plus2 = (picked[0] as AbilityKey | undefined) ?? trio[0]!
                  const plus1 =
                    trio.find((k) => k !== plus2 && state.backgroundAsi[k] === 1) ??
                    trio.find((k) => k !== plus2)!
                  patch({ backgroundAsi: setAsiPlus2Plus1(trio, plus2, plus1) })
                }}
              />
              <PickChipGroup
                label="+1 к"
                options={trio
                  .filter((k) => state.backgroundAsi[k] !== 2)
                  .map((k) => ({ id: k, label: ABILITY_LABEL_RU[k] }))}
                selected={trio.filter((k) => state.backgroundAsi[k] === 1)}
                max={1}
                multi={false}
                testIdPrefix="p24-m03-pick-asi-plus1"
                onChange={(picked) => {
                  const plus1 = picked[0] as AbilityKey | undefined
                  const plus2 = trio.find((k) => state.backgroundAsi[k] === 2) ?? trio[0]!
                  if (!plus1 || plus1 === plus2) return
                  patch({ backgroundAsi: setAsiPlus2Plus1(trio, plus2, plus1) })
                }}
              />
            </>
          ) : null}
        </Stack>
      ) : null}
      {backgroundNeedsToolPick(backgroundEntry) && toolPool ? (
        <PickChipGroup
          label="Инструмент предыстории"
          options={toolPool.map((id) => ({ id, label: itemNameRu(id, items) }))}
          selected={state.backgroundToolId ? [state.backgroundToolId] : []}
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-bg-tool"
          onChange={(picked) => patch({ backgroundToolId: picked[0] ?? null })}
        />
      ) : null}
      {featSlug ? (
        <FeatPickFields
          fieldsFor={(picks) => featPickFields(featSlug, feat, picks, ctx)}
          picks={state.originFeatPicks}
          onChange={(originFeatPicks) => patch({ originFeatPicks })}
          testIdPrefix="p24-m03-pick-origin"
        />
      ) : null}
      <PickChipGroup
        label="Языки"
        hint={`${COMMON_LANGUAGE_NAME_RU} вы уже знаете. Выберите ещё ${languages.choice_count}.`}
        options={languages.languages.map((l) => ({
          id: l.id,
          label: l.name_ru,
          rest: languageKindLabelRu(l.kind),
        }))}
        selected={state.languageIds}
        max={languages.choice_count}
        testIdPrefix="p24-m03-pick-language"
        onChange={(languageIds) => patch({ languageIds })}
      />
      <PickChipGroup
        label="Снаряжение предыстории"
        options={[
          {
            id: 'pack',
            label: 'Набор предыстории',
            rest: gear?.pack_summary_ru ? ruDice(gear.pack_summary_ru) : undefined,
          },
          { id: 'gold', label: `Золото (${gold} зм)` },
        ]}
        selected={[state.backgroundEquipment]}
        max={1}
        multi={false}
        testIdPrefix="p24-m03-pick-bg-equipment"
        onChange={(picked) =>
          patch({ backgroundEquipment: picked[0] === 'gold' ? 'gold' : 'pack' })
        }
      />
    </Stack>
  )
}

export function SpeciesPicks({
  state,
  patch,
  catalog,
  items,
  speciesEntry,
}: PicksBase & { speciesEntry: CatalogEntry }) {
  const sizes = speciesSizeOptions(speciesEntry)
  const lineages = speciesLineages(speciesEntry)
  const speciesFields = speciesPickFields(speciesEntry.slug, speciesEntry, pickContext(catalog, items))

  return (
    <Stack gap={14}>
      {sizes.length > 1 ? (
        <PickChipGroup
          label="Размер"
          options={sizes.map((id) => ({ id, label: sizeLabelRu(id) }))}
          selected={state.speciesSize ? [state.speciesSize] : []}
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-size"
          onChange={(picked) => patch({ speciesSize: picked[0] ?? null })}
        />
      ) : null}
      {speciesNeedsLineage(speciesEntry) && lineages.length ? (
        <PickChipGroup
          label="Родословная"
          options={lineages.map((row) => ({
            id: row.id,
            label: row.name_ru,
            rest: row.summary_ru,
          }))}
          selected={state.speciesLineageId ? [state.speciesLineageId] : []}
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-lineage"
          onChange={(picked) => patch({ speciesLineageId: picked[0] ?? null })}
        />
      ) : null}
      {speciesNeedsAncestry(speciesEntry) ? (
        <PickChipGroup
          label="Наследие дракона"
          hint="Определяет тип урона дыхания и сопротивление."
          options={DRAGONBORN_ANCESTRY_OPTIONS.map((row) => ({ ...row }))}
          selected={state.speciesAncestryId ? [state.speciesAncestryId] : []}
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-ancestry"
          onChange={(picked) => patch({ speciesAncestryId: picked[0] ?? null })}
        />
      ) : null}
      {speciesFields.length ? (
        <FeatPickFields
          fieldsFor={() => speciesFields}
          picks={state.speciesPicks}
          onChange={(speciesPicks) => patch({ speciesPicks })}
          testIdPrefix="p24-m03-pick-species"
        />
      ) : null}
      {sizes.length <= 1 &&
      !lineages.length &&
      !speciesNeedsAncestry(speciesEntry) &&
      !speciesFields.length ? (
        <Text tone="muted">У этого вида нет дополнительных выборов.</Text>
      ) : null}
    </Stack>
  )
}

/** Nested picks of the origin feat granted by the species (human «Гибкий»). */
export function SpeciesFeatPicks({
  state,
  patch,
  catalog,
  items,
  featEntry,
}: PicksBase & { featEntry: CatalogEntry }) {
  const ctx = pickContext(catalog, items)
  return (
    <FeatPickFields
      fieldsFor={(picks) => featPickFields(featEntry.slug, featEntry, picks, ctx)}
      picks={state.speciesFeatPicks}
      onChange={(speciesFeatPicks) => patch({ speciesFeatPicks })}
      testIdPrefix="p24-m03-pick-human"
    />
  )
}
