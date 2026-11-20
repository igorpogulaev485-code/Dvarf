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
  VESTIGE_COMPANION_NAME_RU,
  VESTIGE_COMPANION_TYPE_OPTIONS_2024,
  VESTIGE_DOMAIN_OPTIONS_2024,
  VESTIGE_SPELLS_NAME_RU,
} from '../../shared/dnd/warlockBook2024Features'
import {
  BLADESINGER_WAR_SONG_SKILLS_2024,
  ENCHANTER_ORATOR_SKILLS_2024,
  TRANSMUTER_STONE_BENEFITS_2024,
  TRANSMUTER_STONE_POTENT_EXTRA_2024,
  enchantingConversationalistChoice2024,
  trainingInWarAndSongChoice2024,
  transmuterStoneBenefit2Choice2024,
  transmuterStoneBenefitChoice2024,
} from '../../shared/dnd/wizardBook2024Features'
import {
  ARCANA_DOMAIN_NAME_RU,
  BLESSINGS_OF_KNOWLEDGE_NAME_RU,
  BLESSINGS_OF_KNOWLEDGE_SKILL_LABELS_RU,
  BLESSINGS_OF_KNOWLEDGE_SKILLS_2024,
  BLESSINGS_OF_KNOWLEDGE_TOOL_LABELS_RU,
  BLESSINGS_OF_KNOWLEDGE_TOOLS_2024,
  KNOWLEDGE_DOMAIN_NAME_RU,
  MAGICAL_MASTERY_NAME_RU,
  MAGICAL_MASTERY_SPELL_LABELS_RU,
  MAGICAL_MASTERY_SPELLS_BY_CIRCLE_2024,
  STUDENT_OF_ARCANA_CANTRIP_LABELS_RU,
  STUDENT_OF_ARCANA_CANTRIPS_2024,
  STUDENT_OF_ARCANA_NAME_RU,
  STUDENT_OF_ARCANA_SKILL_LABELS_RU,
  STUDENT_OF_ARCANA_SKILLS_2024,
  UNFETTERED_MIND_NAME_RU,
  UNFETTERED_SAVE_LABELS_RU,
  UNFETTERED_SAVE_OPTIONS_2024,
} from '../../shared/dnd/clericBook2024Features'
import {
  COLLEGE_OF_THE_MOON_NAME_RU,
  PRIMAL_LORE_CANTRIP_LABELS_RU,
  PRIMAL_LORE_CANTRIPS_2024,
  PRIMAL_LORE_NAME_RU,
  PRIMAL_LORE_SKILL_LABELS_RU,
  PRIMAL_LORE_SKILLS_2024,
} from '../../shared/dnd/bardBook2024Features'
import {
  AURA_OF_ELEMENTAL_SHIELDING_NAME_RU,
  ELEMENTAL_SHIELDING_TYPE_LABELS_RU,
  ELEMENTAL_SHIELDING_TYPES_2024,
  GENIES_SPLENDOR_NAME_RU,
  GENIES_SPLENDOR_SKILL_LABELS_RU,
  GENIES_SPLENDOR_SKILLS_2024,
  OATH_OF_THE_NOBLE_GENIES_NAME_RU,
} from '../../shared/dnd/paladinBook2024Features'
import {
  ARCANE_ARCHER_LORE_CANTRIPS_2024,
  ARCANE_ARCHER_LORE_NAME_RU,
  ARCANE_ARCHER_NAME_RU,
  ARCANE_SHOT_NAME_RU,
  ARCANE_SHOTS_2024,
  BANNERET_NAME_RU,
  KNIGHTLY_ENVOY_LANGUAGE_OPTIONS_2024,
  KNIGHTLY_ENVOY_NAME_RU,
  KNIGHTLY_ENVOY_SKILLS_2024,
  arcaneArcherLoreCantripChoice2024,
  knightlyEnvoyLanguageChoice2024,
  knightlyEnvoySkillChoice2024,
} from '../../shared/dnd/fighterBook2024Features'
import {
  ARMOR_MODELS_2024,
  PLANS_KNOWN_COLUMN_RU,
  SPELL_STORING_ITEM_NAME_RU,
} from '../../shared/dnd/artificer2024Features'
import { strangeModificationOptions2024 } from '../../shared/dnd/artificerBook2024Features'
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
  warlockCreatePicksNeed2024,
  wizardBookCreatePicksNeed2024,
  clericBookCreatePicksNeed2024,
  bardBookCreatePicksNeed2024,
  paladinBookCreatePicksNeed2024,
  fighterBookCreatePicksNeed2024,
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
  if (
    !need.armorModel &&
    need.plansKnown <= 0 &&
    !need.spellStoring &&
    need.strangeMods <= 0
  ) {
    return null
  }
  const setPicks = (partial: Record<string, unknown>) =>
    patch({ classOptionPicks: { ...state.classOptionPicks, ...partial } })
  const plansSelected = Array.isArray(state.classOptionPicks.replicate_plans)
    ? (state.classOptionPicks.replicate_plans as string[])
    : []
  const ssiSpell = String(state.classOptionPicks.spell_storing_spell || '')
  const strangeSelected = Array.isArray(state.classOptionPicks.strange_modifications)
    ? (state.classOptionPicks.strange_modifications as string[])
    : String(state.classOptionPicks.strange_modifications || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
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
      {need.strangeMods > 0 ? (
        <PickChipGroup
          label="Чуждые модификации"
          hint={`Выберите ${need.strangeMods} модификаций Реанимированного спутника.`}
          options={strangeModificationOptions2024(need.artificerLevel).map((row) => ({
            id: row.id,
            label: row.nameRu,
          }))}
          selected={strangeSelected}
          max={need.strangeMods}
          multi
          testIdPrefix="p24-m03-pick-strange_mod"
          onChange={(picked) => setPicks({ strange_modifications: picked })}
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

/** Warlock Vestige Patron 2024: domain + companion type from L3. */
export function WarlockLevelingPicks({
  state,
  patch,
}: {
  state: Create2024State
  patch: (partial: Partial<Create2024State>) => void
}) {
  const need = warlockCreatePicksNeed2024(state)
  if (!need.vestigeDomain && !need.vestigeCompanionType) return null
  const setPicks = (partial: Record<string, unknown>) =>
    patch({ classOptionPicks: { ...state.classOptionPicks, ...partial } })

  return (
    <Stack gap={14}>
      {need.vestigeDomain ? (
        <PickChipGroup
          label={VESTIGE_SPELLS_NAME_RU}
          hint="Домен жреца для всегда подготовленных заклинаний Предтечи."
          options={VESTIGE_DOMAIN_OPTIONS_2024.map((row) => ({ id: row.id, label: row.nameRu }))}
          selected={
            state.classOptionPicks.vestige_domain
              ? [String(state.classOptionPicks.vestige_domain)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m02b-vestige-domain"
          onChange={(picked) => setPicks({ vestige_domain: picked[0] ?? null })}
        />
      ) : null}
      {need.vestigeCompanionType ? (
        <PickChipGroup
          label={VESTIGE_COMPANION_NAME_RU}
          hint="Тип существа спутника-предтечи."
          options={VESTIGE_COMPANION_TYPE_OPTIONS_2024.map((row) => ({
            id: row.id,
            label: row.nameRu,
          }))}
          selected={
            state.classOptionPicks.vestige_companion_type
              ? [String(state.classOptionPicks.vestige_companion_type)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m02b-vestige-companion-type"
          onChange={(picked) => setPicks({ vestige_companion_type: picked[0] ?? null })}
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

/** P24-M02B book wizard: orator / war-song skill / transmuter stone benefits. */
export function WizardBookLevelingPicks({
  state,
  patch,
}: {
  state: Create2024State
  patch: (partial: Partial<Create2024State>) => void
}) {
  const need = wizardBookCreatePicksNeed2024(state)
  if (!need.oratorSkill && !need.warSongSkill && !need.stoneBenefit && !need.stoneBenefit2) {
    return null
  }
  const setPicks = (partial: Record<string, unknown>) =>
    patch({ classOptionPicks: { ...state.classOptionPicks, ...partial } })
  const oratorLabels = enchantingConversationalistChoice2024.option_labels_ru ?? {}
  const warLabels = trainingInWarAndSongChoice2024.option_labels_ru ?? {}
  const stoneLabels = transmuterStoneBenefitChoice2024.option_labels_ru ?? {}
  const stone2Labels = transmuterStoneBenefit2Choice2024.option_labels_ru ?? {}
  const stone2Options = [
    ...TRANSMUTER_STONE_BENEFITS_2024,
    ...TRANSMUTER_STONE_POTENT_EXTRA_2024,
  ]

  return (
    <Stack gap={14}>
      {need.oratorSkill ? (
        <PickChipGroup
          label="Чарующий оратор"
          hint="Владение одним навыком + бонус Интеллекта к проверкам."
          options={ENCHANTER_ORATOR_SKILLS_2024.map((id) => ({
            id,
            label: oratorLabels[id] ?? skillLabelRu(id),
          }))}
          selected={
            state.classOptionPicks.enchanting_conversationalist
              ? [String(state.classOptionPicks.enchanting_conversationalist)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m02b-pick-orator"
          onChange={(picked) => setPicks({ enchanting_conversationalist: picked[0] ?? null })}
        />
      ) : null}
      {need.warSongSkill ? (
        <PickChipGroup
          label="Учение песни и войны"
          hint="Владение одним навыком из списка Учения."
          options={BLADESINGER_WAR_SONG_SKILLS_2024.map((id) => ({
            id,
            label: warLabels[id] ?? skillLabelRu(id),
          }))}
          selected={
            state.classOptionPicks.training_in_war_and_song
              ? [String(state.classOptionPicks.training_in_war_and_song)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m02b-pick-war-song"
          onChange={(picked) => setPicks({ training_in_war_and_song: picked[0] ?? null })}
        />
      ) : null}
      {need.stoneBenefit ? (
        <PickChipGroup
          label="Камень преобразования"
          hint="Одно преимущество камня после долгого отдыха."
          options={TRANSMUTER_STONE_BENEFITS_2024.map((id) => ({
            id,
            label: stoneLabels[id] ?? id,
          }))}
          selected={
            state.classOptionPicks.transmuter_stone_benefit
              ? [String(state.classOptionPicks.transmuter_stone_benefit)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m02b-pick-stone"
          onChange={(picked) => setPicks({ transmuter_stone_benefit: picked[0] ?? null })}
        />
      ) : null}
      {need.stoneBenefit2 ? (
        <PickChipGroup
          label="Могущественный камень (2-е)"
          hint="Второе преимущество камня (с 10 ур.)."
          options={stone2Options.map((id) => ({
            id,
            label: stone2Labels[id] ?? id,
          }))}
          selected={
            state.classOptionPicks.transmuter_stone_benefit_2
              ? [String(state.classOptionPicks.transmuter_stone_benefit_2)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m02b-pick-stone-2"
          onChange={(picked) => setPicks({ transmuter_stone_benefit_2: picked[0] ?? null })}
        />
      ) : null}
    </Stack>
  )
}

/** P24-M02B book cleric: Student of Arcana / Blessings / Unfettered / Magical Mastery. */
export function ClericBookLevelingPicks({
  state,
  patch,
}: {
  state: Create2024State
  patch: (partial: Partial<Create2024State>) => void
}) {
  const need = clericBookCreatePicksNeed2024(state)
  if (
    !need.studentSkill &&
    !need.studentCantrips &&
    !need.blessingsTool &&
    !need.blessingsSkills &&
    !need.unfetteredSave &&
    !need.magicalMastery
  ) {
    return null
  }
  const setPicks = (partial: Record<string, unknown>) =>
    patch({ classOptionPicks: { ...state.classOptionPicks, ...partial } })
  const cantripsRaw = state.classOptionPicks.student_of_arcana_cantrips
  const cantrips = Array.isArray(cantripsRaw)
    ? cantripsRaw.map((x) => String(x).toLowerCase())
    : []
  const blessingsRaw = state.classOptionPicks.blessings_of_knowledge_skills
  const blessings = Array.isArray(blessingsRaw)
    ? blessingsRaw.map((x) => String(x).toLowerCase())
    : []

  return (
    <div data-testid="p24-m02b-cleric-book-picks">
    <Stack gap={14}>
      {need.studentSkill ? (
        <PickChipGroup
          label={`${STUDENT_OF_ARCANA_NAME_RU} (${ARCANA_DOMAIN_NAME_RU})`}
          hint="Владение Тайной магией или одним навыком жреца 1 ур."
          options={STUDENT_OF_ARCANA_SKILLS_2024.map((id) => ({
            id,
            label: STUDENT_OF_ARCANA_SKILL_LABELS_RU[id] ?? skillLabelRu(id),
          }))}
          selected={
            state.classOptionPicks.student_of_arcana_skill
              ? [String(state.classOptionPicks.student_of_arcana_skill)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m02b-pick-student-skill"
          onChange={(picked) => setPicks({ student_of_arcana_skill: picked[0] ?? null })}
        />
      ) : null}
      {need.studentCantrips ? (
        <PickChipGroup
          label={`${STUDENT_OF_ARCANA_NAME_RU}: заговоры волшебника`}
          hint="Два заговора волшебника (всегда известны)."
          options={STUDENT_OF_ARCANA_CANTRIPS_2024.map((id) => ({
            id,
            label: STUDENT_OF_ARCANA_CANTRIP_LABELS_RU[id] ?? id,
          }))}
          selected={cantrips}
          max={2}
          multi
          testIdPrefix="p24-m02b-pick-student-cantrip"
          onChange={(picked) => setPicks({ student_of_arcana_cantrips: picked })}
        />
      ) : null}
      {need.blessingsTool ? (
        <PickChipGroup
          label={`${BLESSINGS_OF_KNOWLEDGE_NAME_RU} (${KNOWLEDGE_DOMAIN_NAME_RU}): инструмент`}
          hint="Один тип ремесленных инструментов."
          options={BLESSINGS_OF_KNOWLEDGE_TOOLS_2024.map((id) => ({
            id,
            label: BLESSINGS_OF_KNOWLEDGE_TOOL_LABELS_RU[id] ?? id,
          }))}
          selected={
            state.classOptionPicks.blessings_of_knowledge_tool
              ? [String(state.classOptionPicks.blessings_of_knowledge_tool)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m02b-pick-blessings-tool"
          onChange={(picked) => setPicks({ blessings_of_knowledge_tool: picked[0] ?? null })}
        />
      ) : null}
      {need.blessingsSkills ? (
        <PickChipGroup
          label={`${BLESSINGS_OF_KNOWLEDGE_NAME_RU}: навыки`}
          hint="Два навыка с экспертностью."
          options={BLESSINGS_OF_KNOWLEDGE_SKILLS_2024.map((id) => ({
            id,
            label: BLESSINGS_OF_KNOWLEDGE_SKILL_LABELS_RU[id] ?? skillLabelRu(id),
          }))}
          selected={blessings}
          max={2}
          multi
          testIdPrefix="p24-m02b-pick-blessings-skill"
          onChange={(picked) => setPicks({ blessings_of_knowledge_skills: picked })}
        />
      ) : null}
      {need.unfetteredSave ? (
        <PickChipGroup
          label={`${UNFETTERED_MIND_NAME_RU}: спасбросок`}
          hint="Если Инт уже во владении — выберите другой спасбросок."
          options={UNFETTERED_SAVE_OPTIONS_2024.map((id) => ({
            id,
            label: UNFETTERED_SAVE_LABELS_RU[id] ?? id,
          }))}
          selected={
            state.classOptionPicks.unfettered_mind_save
              ? [String(state.classOptionPicks.unfettered_mind_save)]
              : []
          }
          max={1}
          multi={false}
          testIdPrefix="p24-m02b-pick-unfettered-save"
          onChange={(picked) => setPicks({ unfettered_mind_save: picked[0] ?? null })}
        />
      ) : null}
      {need.magicalMastery
        ? ([6, 7, 8, 9] as const).map((circle) => (
            <PickChipGroup
              key={circle}
              label={`${MAGICAL_MASTERY_NAME_RU}: ${circle}-й круг`}
              hint="Заклинание волшебника этого круга — всегда подготовлено."
              options={MAGICAL_MASTERY_SPELLS_BY_CIRCLE_2024[circle].map((id) => ({
                id,
                label: MAGICAL_MASTERY_SPELL_LABELS_RU[id] ?? id,
              }))}
              selected={
                state.classOptionPicks[`magical_mastery_${circle}`]
                  ? [String(state.classOptionPicks[`magical_mastery_${circle}`])]
                  : []
              }
              max={1}
              multi={false}
              testIdPrefix={`p24-m02b-pick-mastery-${circle}`}
              onChange={(picked) => setPicks({ [`magical_mastery_${circle}`]: picked[0] ?? null })}
            />
          ))
        : null}
    </Stack>
    </div>
  )
}

/** P24-M02B book bard: Primal Lore cantrip + skill (College of the Moon). */
export function BardBookLevelingPicks({
  state,
  patch,
}: {
  state: Create2024State
  patch: (partial: Partial<Create2024State>) => void
}) {
  const need = bardBookCreatePicksNeed2024(state)
  if (!need.primalCantrip && !need.primalSkill) return null
  const setPicks = (partial: Record<string, unknown>) =>
    patch({ classOptionPicks: { ...state.classOptionPicks, ...partial } })
  const cantripRaw = state.classOptionPicks.primal_lore_cantrip
  const cantrip = Array.isArray(cantripRaw)
    ? String(cantripRaw[0] || '')
    : String(cantripRaw || '')

  return (
    <div data-testid="p24-m02b-bard-book-picks">
      <Stack gap={14}>
        {need.primalSkill ? (
          <PickChipGroup
            label={`${PRIMAL_LORE_NAME_RU} (${COLLEGE_OF_THE_MOON_NAME_RU}): навык`}
            hint="Один навык из списка Древних знаний."
            options={PRIMAL_LORE_SKILLS_2024.map((id) => ({
              id,
              label: PRIMAL_LORE_SKILL_LABELS_RU[id] ?? skillLabelRu(id),
            }))}
            selected={
              state.classOptionPicks.primal_lore_skill
                ? [String(state.classOptionPicks.primal_lore_skill)]
                : []
            }
            max={1}
            multi={false}
            testIdPrefix="p24-m02b-pick-primal-skill"
            onChange={(picked) => setPicks({ primal_lore_skill: picked[0] ?? null })}
          />
        ) : null}
        {need.primalCantrip ? (
          <PickChipGroup
            label={`${PRIMAL_LORE_NAME_RU}: заговор друида`}
            hint="Заговор друида вне лимита заговоров барда."
            options={PRIMAL_LORE_CANTRIPS_2024.map((id) => ({
              id,
              label: PRIMAL_LORE_CANTRIP_LABELS_RU[id] ?? id,
            }))}
            selected={cantrip ? [cantrip] : []}
            max={1}
            multi={false}
            testIdPrefix="p24-m02b-pick-primal-cantrip"
            onChange={(picked) => setPicks({ primal_lore_cantrip: picked[0] ?? null })}
          />
        ) : null}
      </Stack>
    </div>
  )
}

/** P24-M02B book paladin: Genie's Splendor skill + Elemental Shielding type. */
export function PaladinBookLevelingPicks({
  state,
  patch,
}: {
  state: Create2024State
  patch: (partial: Partial<Create2024State>) => void
}) {
  const need = paladinBookCreatePicksNeed2024(state)
  if (!need.geniesSkill && !need.shieldingType) return null
  const setPicks = (partial: Record<string, unknown>) =>
    patch({ classOptionPicks: { ...state.classOptionPicks, ...partial } })

  return (
    <div data-testid="p24-m02b-paladin-book-picks">
      <Stack gap={14}>
        {need.geniesSkill ? (
          <PickChipGroup
            label={`${GENIES_SPLENDOR_NAME_RU} (${OATH_OF_THE_NOBLE_GENIES_NAME_RU}): навык`}
            hint="Один навык: Акробатика, Выступление, Запугивание или Убеждение."
            options={GENIES_SPLENDOR_SKILLS_2024.map((id) => ({
              id,
              label: GENIES_SPLENDOR_SKILL_LABELS_RU[id] ?? skillLabelRu(id),
            }))}
            selected={
              state.classOptionPicks.genies_splendor_skill
                ? [String(state.classOptionPicks.genies_splendor_skill)]
                : []
            }
            max={1}
            multi={false}
            testIdPrefix="p24-m02b-pick-genies-skill"
            onChange={(picked) => setPicks({ genies_splendor_skill: picked[0] ?? null })}
          />
        ) : null}
        {need.shieldingType ? (
          <PickChipGroup
            label={`${AURA_OF_ELEMENTAL_SHIELDING_NAME_RU}: тип урона`}
            hint="Сопротивление выбранному типу в Ауре защиты; можно менять в начале хода."
            options={ELEMENTAL_SHIELDING_TYPES_2024.map((id) => ({
              id,
              label: ELEMENTAL_SHIELDING_TYPE_LABELS_RU[id],
            }))}
            selected={
              state.classOptionPicks.elemental_shielding_type
                ? [String(state.classOptionPicks.elemental_shielding_type)]
                : []
            }
            max={1}
            multi={false}
            testIdPrefix="p24-m02b-pick-elemental-shield"
            onChange={(picked) => setPicks({ elemental_shielding_type: picked[0] ?? null })}
          />
        ) : null}
      </Stack>
    </div>
  )
}

/** P24-M02B book fighter: Arcane Archer shots/cantrip + Banneret («Знаменосец») language/skill. */
export function FighterBookLevelingPicks({
  state,
  patch,
}: {
  state: Create2024State
  patch: (partial: Partial<Create2024State>) => void
}) {
  const need = fighterBookCreatePicksNeed2024(state)
  if (!need.any) return null
  const setPicks = (partial: Record<string, unknown>) =>
    patch({ classOptionPicks: { ...state.classOptionPicks, ...partial } })
  const cantripLabels = arcaneArcherLoreCantripChoice2024.option_labels_ru ?? {}
  const langLabels = knightlyEnvoyLanguageChoice2024.option_labels_ru ?? {}
  const skillLabels = knightlyEnvoySkillChoice2024.option_labels_ru ?? {}
  const shotSelected = Array.isArray(state.classOptionPicks.arcane_shot_options)
    ? (state.classOptionPicks.arcane_shot_options as string[])
    : String(state.classOptionPicks.arcane_shot_options || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)

  return (
    <div data-testid="p24-m02b-fighter-book-picks">
      <Stack gap={14}>
        {need.loreCantrip ? (
          <PickChipGroup
            label={`${ARCANE_ARCHER_LORE_NAME_RU} (${ARCANE_ARCHER_NAME_RU}): Заговор`}
            hint="Искусство друидов или Фокусы. Заклинательная характеристика — Интеллект."
            options={ARCANE_ARCHER_LORE_CANTRIPS_2024.map((id) => ({
              id,
              label: cantripLabels[id] ?? id,
            }))}
            selected={
              state.classOptionPicks.arcane_archer_lore_cantrip
                ? [String(state.classOptionPicks.arcane_archer_lore_cantrip)]
                : []
            }
            max={1}
            multi={false}
            testIdPrefix="p24-m02b-pick-aa-cantrip"
            onChange={(picked) => setPicks({ arcane_archer_lore_cantrip: picked[0] ?? null })}
          />
        ) : null}
        {need.arcaneShots ? (
          <PickChipGroup
            label={`${ARCANE_SHOT_NAME_RU} (${ARCANE_ARCHER_NAME_RU})`}
            hint={`Выберите ${need.arcaneShotsNeed} варианта «…выстрел» (не 2014 «…стрела»).`}
            options={ARCANE_SHOTS_2024.map((row) => ({
              id: row.id,
              label: row.nameRu,
            }))}
            selected={shotSelected}
            max={need.arcaneShotsNeed}
            multi
            testIdPrefix="p24-m02b-pick-arcane-shot"
            onChange={(picked) => setPicks({ arcane_shot_options: picked })}
          />
        ) : null}
        {need.envoyLanguage ? (
          <PickChipGroup
            label={`${KNIGHTLY_ENVOY_NAME_RU} (${BANNERET_NAME_RU}): Полиглот`}
            hint="Один язык из Обычных / Редких / Языков Фаэруна."
            options={KNIGHTLY_ENVOY_LANGUAGE_OPTIONS_2024.map((id) => ({
              id,
              label: langLabels[id] ?? id,
            }))}
            selected={
              state.classOptionPicks.knightly_envoy_language
                ? [String(state.classOptionPicks.knightly_envoy_language)]
                : []
            }
            max={1}
            multi={false}
            testIdPrefix="p24-m02b-pick-envoy-lang"
            onChange={(picked) => setPicks({ knightly_envoy_language: picked[0] ?? null })}
          />
        ) : null}
        {need.envoySkill ? (
          <PickChipGroup
            label={`${KNIGHTLY_ENVOY_NAME_RU} (${BANNERET_NAME_RU}): Поставленная речь`}
            hint="Выступление, Запугивание, Проницательность или Убеждение."
            options={KNIGHTLY_ENVOY_SKILLS_2024.map((id) => ({
              id,
              label: skillLabels[id] ?? skillLabelRu(id),
            }))}
            selected={
              state.classOptionPicks.knightly_envoy_skill
                ? [String(state.classOptionPicks.knightly_envoy_skill)]
                : []
            }
            max={1}
            multi={false}
            testIdPrefix="p24-m02b-pick-envoy-skill"
            onChange={(picked) => setPicks({ knightly_envoy_skill: picked[0] ?? null })}
          />
        ) : null}
      </Stack>
    </div>
  )
}
