/** Setup blocks (picks) for the 2024 create wizard. Rendered under the detail panel. */

import { Stack, Text } from '../../ui'
import type { CatalogEntry } from '../../shared/api/catalog'
import { ABILITY_LABEL_RU, type AbilityKey } from '../../shared/dnd/pointBuy'
import { masteryPropertyNameRu } from '../../shared/dnd/weaponMastery'
import { PickChipGroup } from './PickChipGroup'
import { LoreDiscoveriesPicker } from '../characters/LoreDiscoveriesPicker'
import { LORE_DISCOVERIES_FEATURE_ID_2024 } from '../../shared/dnd/bard2024Features'
import {
  DEFENSIVE_TACTICS_OPTIONS_2024,
  HUNTERS_PREY_OPTIONS_2024,
  OTHERWORLDLY_GLAMOUR_SKILLS_2024,
  PRIMAL_COMPANION_TYPES_2024,
} from '../../shared/dnd/ranger2024Features'
import {
  ARMOR_MODELS_2024,
  PLANS_KNOWN_COLUMN_RU,
  SPELL_STORING_ITEM_NAME_RU,
} from '../../shared/dnd/artificer2024Features'
import { ARTIFICER_REPLICATE_PLANS_2024 } from '../../shared/dnd/edition2024ClassOptions'
import {
  WILD_HEART_ASPECT_OPTIONS_RU,
  WILD_HEART_POWER_OPTIONS_RU,
  WILD_HEART_RAGE_OPTIONS_RU,
} from '../../shared/dnd/barbarian2024Features'
import {
  emptyFeaturePicks,
  getFeaturePickList,
  setFeaturePick,
} from '../../shared/dnd/featurePicks'
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
  spellLevel,
  spellOnClassList,
  type FeatPickContext,
  type FeatPicks,
  type PickField,
} from './create2024FeatPicks'
import {
  BLESSED_WARRIOR_CANTRIP_LIMIT_2024,
  BLESSED_WARRIOR_ID,
  BLESSED_WARRIOR_NAME_RU,
  FIGHTING_STYLE_MIN_LEVEL_2024,
  FIGHTING_STYLE_NAME_RU,
  WEAPON_MASTERY_NAME_RU,
  isBlessedWarriorStyleId,
} from '../../shared/dnd/paladin2024Features'
import {
  DRUIDIC_WARRIOR_CANTRIP_LIMIT_2024,
  DRUIDIC_WARRIOR_ID,
  DRUIDIC_WARRIOR_NAME_RU,
  isDruidicWarriorStyleId,
} from '../../shared/dnd/ranger2024Features'
import {
  artificerCreatePicksNeed2024,
  backgroundAsiTrio,
  backgroundNeedsToolPick,
  barbarianCreatePicksNeed2024,
  bardCreatePicksNeed2024,
  classSkillNeed,
  classStartingPacks,
  classToolChoice,
  findFeat,
  fightingStyleFeats,
  l1Invocations,
  masteryWeaponOptions,
  plannedPrimaryClassLevel,
  rangerCreatePicksNeed2024,
  rogueCreatePicksNeed2024,
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
  // Use planned primary level so create-at-N / «Изменить на шаге Класс» can fill 2→3→4.
  const masteryLimit = weaponMasteryLimit(state.classSlug, plannedPrimaryClassLevel(state))
  const masteryOptions = masteryWeaponOptions(classEntry, catalog.weapons)
  const styleFeats = fightingStyleFeats(catalog.feats)
  const toolChoice = classToolChoice(classEntry)
  const packs = classStartingPacks(classEntry)
  const setOption = (key: string, value: unknown) =>
    patch({ classOptionPicks: { ...state.classOptionPicks, [key]: value } })
  const plannedClassLevel = (slug: 'paladin' | 'ranger') => {
    if (state.classSlug !== slug) return 0
    const re = slug === 'paladin' ? /paladin|паладин/i : /ranger|следопыт/i
    const fromClasses = state.classes
      .filter((row) => re.test(row.catalog_id || row.name || ''))
      .reduce((max, row) => Math.max(max, row.level || 0), 0)
    return Math.max(fromClasses, state.characterLevel || 1)
  }
  const paladinLevel = plannedClassLevel('paladin')
  const rangerLevel = plannedClassLevel('ranger')
  const showPaladinFightingStyle = state.classSlug === 'paladin'
  const showRangerFightingStyle = state.classSlug === 'ranger'
  const paladinStyleOptions = [
    ...styleFeats.map((f) => ({ id: f.slug, label: f.name_ru })),
    ...(styleFeats.some((f) => isBlessedWarriorStyleId(f.slug))
      ? []
      : [{ id: BLESSED_WARRIOR_ID, label: BLESSED_WARRIOR_NAME_RU }]),
  ]
  const blessedCantrips = ids(state.classOptionPicks.blessed_warrior_cantrips)
  const druidicCantrips = ids(state.classOptionPicks.druidic_warrior_cantrips)
  const rangerStyleOptions = [
    ...styleFeats.map((f) => ({ id: f.slug, label: f.name_ru })),
    ...(styleFeats.some((f) => isDruidicWarriorStyleId(f.slug))
      ? []
      : [{ id: DRUIDIC_WARRIOR_ID, label: DRUIDIC_WARRIOR_NAME_RU }]),
  ]
  const clericCantripOptions = catalog.spells
    .filter((spell) => spellLevel(spell) === 0 && spellOnClassList(spell, 'cleric'))
    .map((spell) => ({ id: spell.slug, label: spell.name_ru }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'))

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
          label={WEAPON_MASTERY_NAME_RU}
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
      {showPaladinFightingStyle ? (
        <>
          <PickChipGroup
            label={FIGHTING_STYLE_NAME_RU}
            hint={
              paladinLevel >= FIGHTING_STYLE_MIN_LEVEL_2024
                ? undefined
                : `с ${FIGHTING_STYLE_MIN_LEVEL_2024} ур.`
            }
            options={paladinStyleOptions}
            selected={state.fightingStyleSlug ? [state.fightingStyleSlug] : []}
            max={1}
            multi={false}
            testIdPrefix="p24-m03-pick-style-paladin"
            onChange={(picked) => {
              const next = picked[0] ?? null
              patch({
                fightingStyleSlug: next,
                classOptionPicks: {
                  ...state.classOptionPicks,
                  blessed_warrior_cantrips: isBlessedWarriorStyleId(next)
                    ? blessedCantrips
                    : [],
                },
              })
            }}
          />
          {isBlessedWarriorStyleId(state.fightingStyleSlug) ? (
            <PickChipGroup
              label={`${BLESSED_WARRIOR_NAME_RU}: заговоры жреца`}
              hint={`Выберите ${BLESSED_WARRIOR_CANTRIP_LIMIT_2024}.`}
              options={clericCantripOptions}
              selected={blessedCantrips}
              max={BLESSED_WARRIOR_CANTRIP_LIMIT_2024}
              testIdPrefix="p24-m03-pick-blessed-cantrip"
              onChange={(next) => setOption('blessed_warrior_cantrips', next)}
            />
          ) : null}
        </>
      ) : null}
      {showRangerFightingStyle ? (
        <>
          <PickChipGroup
            label={FIGHTING_STYLE_NAME_RU}
            hint={
              rangerLevel >= FIGHTING_STYLE_MIN_LEVEL_2024
                ? undefined
                : `с ${FIGHTING_STYLE_MIN_LEVEL_2024} ур.`
            }
            options={rangerStyleOptions}
            selected={state.fightingStyleSlug ? [state.fightingStyleSlug] : []}
            max={1}
            multi={false}
            testIdPrefix="p24-m03-pick-style-ranger"
            onChange={(picked) => {
              const next = picked[0] ?? null
              patch({
                fightingStyleSlug: next,
                classOptionPicks: {
                  ...state.classOptionPicks,
                  druidic_warrior_cantrips: isDruidicWarriorStyleId(next)
                    ? druidicCantrips
                    : [],
                },
              })
            }}
          />
          {isDruidicWarriorStyleId(state.fightingStyleSlug) ? (
            <PickChipGroup
              label={`${DRUIDIC_WARRIOR_NAME_RU}: заговоры друида`}
              hint={`Выберите ${DRUIDIC_WARRIOR_CANTRIP_LIMIT_2024}.`}
              options={catalog.spells
                .filter((spell) => spellLevel(spell) === 0 && spellOnClassList(spell, 'druid'))
                .map((spell) => ({ id: spell.slug, label: spell.name_ru }))
                .sort((a, b) => a.label.localeCompare(b.label, 'ru'))}
              selected={druidicCantrips}
              max={DRUIDIC_WARRIOR_CANTRIP_LIMIT_2024}
              testIdPrefix="p24-m03-pick-druidic-cantrip"
              onChange={(next) => setOption('druidic_warrior_cantrips', next)}
            />
          ) : null}
        </>
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
          hint="Два навыка из выбранных или воровские инструменты. С 6 ур. ещё два — на шаге прокачки."
          options={[
            ...state.classSkillIds.map((id) => ({ id, label: skillLabelRu(id) })),
            { id: 'thieves-tools', label: 'Воровские инструменты' },
          ]}
          selected={ids(state.classOptionPicks.expertise).slice(0, 2)}
          max={2}
          testIdPrefix="p24-m03-pick-expertise"
          onChange={(expertise) => {
            const kept = ids(state.classOptionPicks.expertise).slice(2)
            setOption('expertise', [...expertise.slice(0, 2), ...kept])
          }}
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

const BARD_CREATE_ENTRY_ID = 'create-bard'

/** Artificer 2024 leveling picks: armor model, known plans, spell-storing spell. */
export function ArtificerLevelingPicks({
  state,
  patch,
  catalog,
}: {
  state: Create2024State
  patch: (partial: Partial<Create2024State>) => void
  catalog?: Create2024CatalogBundle
}) {
  const need = artificerCreatePicksNeed2024(state)
  if (!need.armorModel && need.plansKnown <= 0 && !need.spellStoring) return null
  const setPicks = (partial: Record<string, unknown>) =>
    patch({ classOptionPicks: { ...state.classOptionPicks, ...partial } })
  const plansSelected = Array.isArray(state.classOptionPicks.replicate_plans)
    ? (state.classOptionPicks.replicate_plans as string[])
    : []
  const ssiSpell = String(state.classOptionPicks.spell_storing_spell || '')
  const ssiOptions = (catalog?.spells ?? [])
    .filter((spell) => {
      const lv = spellLevel(spell)
      return lv >= 1 && lv <= 3 && spellOnClassList(spell, 'artificer')
    })
    .map((spell) => ({ id: spell.slug, label: spell.name_ru }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
  return (
    <Stack gap={14}>
      {need.armorModel ? (
        <PickChipGroup
          label="Модель доспеха"
          hint="Дредноут, Диверсант или Страж (EFA 2024)."
          options={ARMOR_MODELS_2024.map((row) => ({ id: row.id, label: row.nameRu }))}
          selected={state.classOptionPicks.armor_model ? [String(state.classOptionPicks.armor_model)] : []}
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-armor_model"
          onChange={(picked) => setPicks({ armor_model: picked[0] ?? null })}
        />
      ) : null}
      {need.plansKnown > 0 ? (
        <PickChipGroup
          label={PLANS_KNOWN_COLUMN_RU}
          hint={`Выберите ${need.plansKnown} схем(ы) по таблице артефактора.`}
          options={ARTIFICER_REPLICATE_PLANS_2024.filter(
            (row) => row.minLevel <= need.artificerLevel,
          ).map((row) => ({
            id: row.id,
            label: row.nameRu,
            rest: `с ${row.minLevel} ур. · ${row.rarity}`,
          }))}
          selected={plansSelected}
          max={need.plansKnown}
          multi
          testIdPrefix="p24-m03-pick-replicate_plan"
          onChange={(picked) => setPicks({ replicate_plans: picked })}
        />
      ) : null}
      {need.spellStoring && ssiOptions.length > 0 ? (
        <PickChipGroup
          label={SPELL_STORING_ITEM_NAME_RU}
          hint="Заклинание артефактора 1–3 круга (не обязательно из подготовленных)."
          options={ssiOptions}
          selected={ssiSpell ? [ssiSpell] : []}
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-spell_storing"
          onChange={(picked) => setPicks({ spell_storing_spell: picked[0] ?? null })}
        />
      ) : null}
    </Stack>
  )
}

export function BarbarianLevelingPicks({
  state,
  patch,
  catalog,
}: {
  state: Create2024State
  patch: (partial: Partial<Create2024State>) => void
  catalog: Create2024CatalogBundle | null
}) {
  const need = barbarianCreatePicksNeed2024(state)
  if (
    !need.wildHeartRage &&
    !need.wildHeartAspect &&
    !need.wildHeartPower &&
    !need.masteryTopUp
  ) {
    return null
  }
  const setPicks = (partial: Record<string, unknown>) =>
    patch({ classOptionPicks: { ...state.classOptionPicks, ...partial } })
  const classEntry = catalog?.classes?.find((row) => row.slug === 'barbarian') ?? null
  const masteryOptions = masteryWeaponOptions(classEntry, catalog?.weapons ?? []).map((row) => ({
    id: row.entry.slug,
    label: row.entry.name_ru,
    rest: masteryPropertyNameRu(row.mastery),
  }))

  return (
    <Stack gap={14}>
      {need.masteryTopUp && masteryOptions.length > 0 ? (
        <PickChipGroup
          label="Доп. оружейное мастерство"
          hint={`Выберите ${need.masteryLimit} оружия (прокачка).`}
          options={masteryOptions}
          selected={state.weaponMasteryIds}
          max={need.masteryLimit}
          multi
          testIdPrefix="p24-m03-pick-weapon_mastery_leveling"
          onChange={(weaponMasteryIds) => patch({ weaponMasteryIds })}
        />
      ) : null}
      {need.wildHeartRage ? (
        <PickChipGroup
          label="Ярость дикой природы"
          hint="Волк, Медведь или Орёл (с 3 ур.)."
          options={Object.entries(WILD_HEART_RAGE_OPTIONS_RU).map(([id, label]) => ({
            id,
            label,
          }))}
          selected={
            state.classOptionPicks.wild_heart_rage
              ? [String(state.classOptionPicks.wild_heart_rage)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-wild_heart_rage"
          onChange={(picked) => setPicks({ wild_heart_rage: picked[0] ?? null })}
        />
      ) : null}
      {need.wildHeartAspect ? (
        <PickChipGroup
          label="Аспект дикой природы"
          hint="С 6 уровня."
          options={Object.entries(WILD_HEART_ASPECT_OPTIONS_RU).map(([id, label]) => ({
            id,
            label,
          }))}
          selected={
            state.classOptionPicks.wild_heart_aspect
              ? [String(state.classOptionPicks.wild_heart_aspect)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-wild_heart_aspect"
          onChange={(picked) => setPicks({ wild_heart_aspect: picked[0] ?? null })}
        />
      ) : null}
      {need.wildHeartPower ? (
        <PickChipGroup
          label="Сила дикой природы"
          hint="С 14 уровня."
          options={Object.entries(WILD_HEART_POWER_OPTIONS_RU).map(([id, label]) => ({
            id,
            label,
          }))}
          selected={
            state.classOptionPicks.wild_heart_power
              ? [String(state.classOptionPicks.wild_heart_power)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-wild_heart_power"
          onChange={(picked) => setPicks({ wild_heart_power: picked[0] ?? null })}
        />
      ) : null}
    </Stack>
  )
}

export function RangerLevelingPicks({
  state,
  patch,
}: {
  state: Create2024State
  patch: (partial: Partial<Create2024State>) => void
}) {
  const need = rangerCreatePicksNeed2024(state)
  if (
    !need.huntersPrey &&
    !need.defensiveTactics &&
    !need.primalCompanion &&
    !need.otherworldlyGlamour
  ) {
    return null
  }
  const setPicks = (partial: Record<string, unknown>) =>
    patch({ classOptionPicks: { ...state.classOptionPicks, ...partial } })

  return (
    <Stack gap={14}>
      {need.huntersPrey ? (
        <PickChipGroup
          label="Добыча охотника"
          hint="Выберите вариант с 3 уровня."
          options={HUNTERS_PREY_OPTIONS_2024.map((row) => ({ id: row.id, label: row.nameRu }))}
          selected={state.classOptionPicks.hunters_prey ? [String(state.classOptionPicks.hunters_prey)] : []}
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-hunters_prey"
          onChange={(picked) => setPicks({ hunters_prey: picked[0] ?? null })}
        />
      ) : null}
      {need.defensiveTactics ? (
        <PickChipGroup
          label="Оборонительная тактика"
          hint="Выберите вариант с 7 уровня."
          options={DEFENSIVE_TACTICS_OPTIONS_2024.map((row) => ({ id: row.id, label: row.nameRu }))}
          selected={
            state.classOptionPicks.defensive_tactics
              ? [String(state.classOptionPicks.defensive_tactics)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-defensive_tactics"
          onChange={(picked) => setPicks({ defensive_tactics: picked[0] ?? null })}
        />
      ) : null}
      {need.primalCompanion ? (
        <PickChipGroup
          label="Первичный спутник"
          hint="Земной, Морской или Небесный блок (PHB 2024)."
          options={PRIMAL_COMPANION_TYPES_2024.map((row) => ({ id: row.id, label: row.nameRu }))}
          selected={
            state.classOptionPicks.primal_companion
              ? [String(state.classOptionPicks.primal_companion)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-primal_companion"
          onChange={(picked) => setPicks({ primal_companion: picked[0] ?? null })}
        />
      ) : null}
      {need.otherworldlyGlamour ? (
        <PickChipGroup
          label="Иной блеск"
          hint="Бонус к проверкам одного навыка."
          options={OTHERWORLDLY_GLAMOUR_SKILLS_2024.map((id) => ({
            id,
            label: skillLabelRu(id),
          }))}
          selected={
            state.classOptionPicks.otherworldly_glamour
              ? [String(state.classOptionPicks.otherworldly_glamour)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m03-pick-otherworldly_glamour"
          onChange={(picked) => setPicks({ otherworldly_glamour: picked[0] ?? null })}
        />
      ) : null}
    </Stack>
  )
}

/** Extra Expertise pair when create-at ≥6 (L1 pair was collected on the class step). */
export function RogueLevelingPicks({
  state,
  patch,
}: {
  state: Create2024State
  patch: (partial: Partial<Create2024State>) => void
}) {
  const need = rogueCreatePicksNeed2024(state)
  if (need.expertise < 4) return null
  const expertise = ids(state.classOptionPicks.expertise)
  const setPicks = (partial: Record<string, unknown>) =>
    patch({ classOptionPicks: { ...state.classOptionPicks, ...partial } })
  const options = [
    ...state.classSkillIds.map((id) => ({ id, label: skillLabelRu(id) })),
    { id: 'thieves-tools', label: 'Воровские инструменты' },
  ]
  return (
    <PickChipGroup
      label="Компетентность (ещё два с 6 ур.)"
      hint={`Всего нужно ${need.expertise}: два с 1-го уровня и ещё два с 6-го.`}
      options={options}
      selected={expertise}
      max={need.expertise}
      testIdPrefix="p24-m02-rogue-expertise"
      onChange={(next) => setPicks({ expertise: next })}
    />
  )
}

export function BardLevelingPicks({
  state,
  patch,
  proficientSkillIds,
  allSkillIds,
}: {
  state: Create2024State
  patch: (partial: Partial<Create2024State>) => void
  proficientSkillIds: readonly string[]
  allSkillIds: readonly string[]
}) {
  const need = bardCreatePicksNeed2024(state)
  if (need.expertise === 0 && need.lore === 0 && need.discoveries === 0) return null
  const lore = ids(state.classOptionPicks.lore_skills)
  const expertise = ids(state.classOptionPicks.expertise)
  const setPicks = (partial: Record<string, unknown>) =>
    patch({ classOptionPicks: { ...state.classOptionPicks, ...partial } })
  const proficient = new Set(proficientSkillIds)
  const expertiseOptions = [...new Set([...proficientSkillIds, ...lore])]
  const loreOptions = allSkillIds.filter((id) => !proficient.has(id))
  return (
    <Stack gap={14}>
      {need.lore > 0 ? (
        <PickChipGroup
          label="Доп. навыки Коллегии знаний"
          hint={`Выберите ${need.lore} навыка, которыми вы ещё не владеете.`}
          options={loreOptions.map((id) => ({ id, label: skillLabelRu(id) }))}
          selected={lore}
          max={need.lore}
          testIdPrefix="p24-m02-bard-lore"
          onChange={(next) =>
            setPicks({
              lore_skills: next,
              expertise: expertise.filter((id) => proficient.has(id) || next.includes(id)),
            })
          }
        />
      ) : null}
      {need.discoveries > 0 ? (
        <LoreDiscoveriesPicker
          classEntryId={BARD_CREATE_ENTRY_ID}
          bardLevel={need.bardLevel}
          featurePicks={setFeaturePick(
            emptyFeaturePicks(),
            BARD_CREATE_ENTRY_ID,
            LORE_DISCOVERIES_FEATURE_ID_2024,
            ids(state.classOptionPicks.magical_discoveries).join(',') || null,
          )}
          onFeaturePicksChange={(next) =>
            setPicks({
              magical_discoveries: getFeaturePickList(
                next,
                BARD_CREATE_ENTRY_ID,
                LORE_DISCOVERIES_FEATURE_ID_2024,
              ),
            })
          }
        />
      ) : null}
      {need.expertise > 0 ? (
        <PickChipGroup
          label="Компетентность"
          hint={`Выберите ${need.expertise} навыка, которыми вы владеете.`}
          options={expertiseOptions.map((id) => ({ id, label: skillLabelRu(id) }))}
          selected={expertise}
          max={need.expertise}
          testIdPrefix="p24-m02-bard-expertise"
          onChange={(next) => setPicks({ expertise: next })}
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
