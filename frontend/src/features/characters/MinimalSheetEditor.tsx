import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import {
  getCharacter,
  updateCharacter,
  type CharacterDetail,
  type RulesEdition,
} from '../../shared/api/characters'
import { ApiRequestError } from '../../shared/api/client'
import {
  createSheetSyncChannel,
  publishSheetSync,
  type SheetSyncMessage,
} from '../../shared/sync/characterSheetChannel'
import {
  addMulticlassLevel,
  bumpClassLevel,
  formatClassSummary,
  reduceClassLevel,
  totalCharacterLevel,
} from '../../shared/dnd/classLevels'
import { XpProgressField } from './XpProgressField'
import { formatConditionLabel } from '../../shared/dnd/conditions'
import type {
  AppliedClassGrant,
  ClassGrantDef,
  ClassGrantPicks,
} from '../../shared/dnd/classGrants'
import {
  grantNeedsSetupDialog,
  resolveClassGrantDef,
} from '../../shared/dnd/classGrants'
import {
  applyClassGrantToDraft,
  readAppliedClassGrants,
  revokeClassGrant,
  type ClassGrantDraftSlice,
} from './classEffects'
import { ClassSetupDialog, HomebrewClassDialog } from './ClassSetupDialog'
import { RaceSetupDialog, HomebrewRaceDialog } from './RaceSetupDialog'
import {
  BackgroundSetupDialog,
  HomebrewBackgroundDialog,
} from './BackgroundSetupDialog'
import { EquipmentProficienciesPanel } from './EquipmentProficienciesPanel'
import {
  applyBackgroundGrantToDraft,
  ensureBackgroundFeatureOnDraft,
  readAppliedBackgroundGrant,
  reapplyBackgroundOverlays,
  revokeBackgroundGrant,
  type BackgroundGrantDraftSlice,
} from './backgroundEffects'
import {
  backgroundFeatureCardFromGrant,
  backgroundGrantNeedsSetupDialog,
  backgroundVariantsForRoot,
  buildBackgroundFeatureText,
  emptyBackgroundPicks,
  isBackgroundComboboxRoot,
  resolveBackgroundGrantDef,
  upsertBackgroundFeatureBlock,
  type AppliedBackgroundGrant,
  type BackgroundGrantDef,
  type BackgroundGrantPicks,
} from '../../shared/dnd/backgroundGrants'
import {
  collectGrantTextSnippets,
  type AppliedSubclassGrant,
  type SubclassChangeMode,
  type SubclassGrantDef,
  type SubclassGrantPicks,
  type SubclassTransition,
} from '../../shared/dnd/subclassGrants'
import {
  applySubclassGrantToDraft,
  emptySubclassPicks,
  readAppliedSubclassGrants,
  readSubclassTransitions,
  resolveSubclassDefFromCatalog,
  revokeSubclassGrant,
  subclassNeedsSetupDialog,
  syncSubclassAlwaysPreparedSpells,
  type SubclassGrantDraftSlice,
} from './subclassEffects'
import { SubclassSetupDialog } from './SubclassSetupDialog'
import { SubclassChangeConfirmDialog } from './SubclassChangeConfirmDialog'
import {
  dismissSelfFormsOnRest,
  isSelfForm,
  readCompanions,
  type CompanionEntry,
} from './companions'
import { readKnownForms, type KnownForm } from './knownForms'
import {
  applyConcentrationChangeToCompanions,
  applySpellCastToCompanions,
} from './spellCompanions'
import {
  isSpellSelfFormCast,
  resolveSpellSelfFormSlug,
  type SpellSelfFormSlug,
} from './spellForms'
import {
  SpellFormDialog,
  type SpellFormDialogResult,
} from './SpellFormDialog'
import { armorKindLabel, computeArmorClass } from '../../shared/dnd/armor'
import { buildSheetFormulaVars } from '../../shared/dnd/formulas'
import { AbilityBreakdownDialog } from './AbilityBreakdownDialog'
import { AcBreakdownDialog } from './AcBreakdownDialog'
import { InitiativeBreakdownDialog } from './InitiativeBreakdownDialog'
import {
  abilityCheckBonus,
  abilitySaveBonus,
  applyAbilityScoreBonuses,
  applyBonusStack,
  bonusesForTarget,
  formatBonusSummary,
  modifiersToSheet,
  readModifiers,
  withInitiativeBonus,
  type BonusLine,
} from './modifiers'
import {
  Button,
  Dialog,
  Field,
  Input,
  NumberInput,
  Panel,
  Stack,
  Text,
  type ToastInput,
} from '../../ui'
import { ConsumableSpendPadDialog } from './ConsumableSpendPadDialog'
import {
  appendConsumableSpendLog,
  formatConsumableSpendToast,
  formatConsumableUndoToast,
  markConsumableSpendUndone,
  newConsumableSpendId,
  type ConsumableSpendLogEntry,
  type ConsumableUndoSession,
} from './consumableSpend'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import {
  emptyRacePicks,
  formatRaceMovementHint,
  isRaceComboboxRoot,
  raceGrantNeedsSetupDialog,
  raceSizeLabel,
  raceSubraceRequired,
  resolveRaceGrantDef,
  resolveRaceMovement,
  type AppliedRaceGrant,
  type RaceGrantDef,
  type RaceGrantPicks,
} from '../../shared/dnd/raceGrants'
import { jumpDistances } from '../../shared/dnd/jumpDistance'
import {
  DEFAULT_ABILITY_SCORE_MAX,
  clampAbilityScore,
  resolveAbilityMaxes,
} from '../../shared/dnd/abilityScoreCaps'
import {
  customFeaturesToSheet,
  readCustomFeatures,
  type CustomFeature,
} from './customFeatures'
import {
  AttacksPanel,
  syncAttacksHeldFromInventory,
  type WeaponAttack,
} from './AttacksPanel'
import {
  aggregateGearEffects,
  applyGearAbilityScores,
  gearDarkvisionFt,
} from './gearEffects'
import {
  syncGearCompanions,
  syncGearGrantSpells,
  syncGearResources,
} from './gearGrantsSync'
import { canWearArmor, armorProficiencyHint } from './equipmentProficiency'
import { listShieldItems, toggleShieldInHand } from './heldEquip'
import { AttunementDialog } from './AttunementDialog'
import {
  attunementsToSheet,
  filledAttunementCount,
  readAttunements,
  type AttunementSlot,
} from './attunement'
import {
  classLevelsToSheet,
  readClassLevels,
  type ClassLevelEntry,
} from './classLevels'
import { InventoryPanel } from './InventoryPanel'
import { LanguagesToolsPanel } from './LanguagesToolsPanel'
import { GuidedWizardDialog, type GuidedWizardSession } from './GuidedWizardDialog'
import { ClassAsiDialog } from './ClassAsiDialog'
import { FeatSetupDialog, type FeatSetupResult } from './FeatSetupDialog'
import { LevelUpDialog, type LevelUpChoice } from './LevelUpDialog'
import {
  applyClassAsiBonuses,
  asiAlreadyApplied,
  isAsiFeature,
  readClassAsiLedger,
  revokeClassAsiBonuses,
  type AppliedClassAsi,
} from '../../shared/dnd/classAsi'
import {
  syncSkillsExpertiseFromPicks,
} from '../../shared/dnd/expertise'
import {
  backgroundWizardStep,
  buildPendingWizardSteps,
  clearFeaturePicksAboveClassLevel,
  featWizardStep,
  isWizardClassName,
  listUnlockedExpertiseKeys,
  withBackgroundStepIfNeeded,
  withWizardSpellbookPicksStep,
  type GuidedWizardStep,
} from '../../shared/dnd/pendingFeatureChoices'
import {
  fightingStyleFromFeatGrants,
  naturalArmorFromFeatGrants,
  newFeatGrantId,
  ownedFeatEnumsFromLedger,
  readFeatGrantLedger,
  sumFeatHpPerLevel,
  sumFeatInitiativeBonus,
  sumFeatPassiveBonus,
  sumFeatSpeedBonus,
  type AppliedFeatGrant,
} from '../../shared/dnd/featGrants'
import {
  buildAsiFeatGrantFromCatalog,
  findMissingAsiFeatEntries,
  matchFeatCatalogEntry,
} from './asiFeatHydrate'
import {
  bridgeManeuversIntoFeaturePicks,
  extractManeuverIdsFromSubclassPicks,
  hydrateManeuversFromSubclassGrants,
} from '../../shared/dnd/battleMasterManeuverBridge'
import {
  applyFeatGrantToDraft,
  revokeFeatGrantFromDraft,
  revokeFeatGrantsForAsi,
  revokeFeatGrantsForBackground,
  revokeFeatGrantsForRace,
  syncFeatProficiencyResources,
  type FeatGrantDraftSlice,
} from './featEffects'
import {
  migrateLegacyHitDice,
  syncHitDicePools,
} from '../../shared/dnd/classHitDice'
import {
  averageHpGain,
  buildMaxHpByLevels,
  hitDieForClass,
} from '../../shared/dnd/multiclassRules'
import { clampCharacterLevel, xpToReachLevel } from '../../shared/dnd/experience'
import { withSyncedHitDiceSummary } from './play'
import { AttacksSettingsDialog } from './AttacksSettingsDialog'
import { SpellsPanel } from './SpellsPanel'
import { SpellsSettingsDialog } from './SpellsSettingsDialog'
import { useSpellcastingSheetSync } from './useSpellcastingSheetSync'
import {
  desiredResourcesFromFeatures,
  spendFeatureUse,
  syncFeatureResources,
} from '../../shared/dnd/featureResources'
import {
  listSubclassFeatureIdsAboveLevel,
  proficiencyBonusForTotalLevel,
  resolveClassFeatureSlug,
  unlockFeaturesForClasses,
} from '../../shared/dnd/classFeatures'
import {
  classWalkSpeedBonusFt,
  resolveWalkSpeedFt,
} from '../../shared/dnd/classMovement'
import { applyFeatureSaveProficiencies } from '../../shared/dnd/featureSaveProficiency'
import {
  martialArtsDieFromFeatures,
  syncMonkUnarmedAttack,
} from '../../shared/dnd/martialArts'
import {
  clearFeaturePicksForClass,
  clearFeaturePicksForFeatureIds,
  findFightingStylePick,
  featurePicksToSheet,
  getFeaturePickList,
  readFeaturePicks,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import { fightingStyleAcBonus } from '../../shared/dnd/fightingStyles'
import {
  aggregateInfusionBonuses,
  applyInfusionAbilityFloors,
} from '../../shared/dnd/infusionEffects'
import {
  darkvisionFtFromFeatures,
  initiativeBonusFromFeatures,
  initiativeBonusFromRace,
} from './featureCombatBonuses'
import { syncRangerConclaveSpells } from './rangerConclaveSpells'
import {
  sanitizeFeaturePicksForPactBoons,
  syncPactTomeCantrips,
  withPactTomeCantripsStep,
} from './pactTomeEffects'
import {
  ensurePactTomeSpellCatalog,
  resolvePactTomeCantripFromOptions,
} from './PactTomeCantripsPicker'
import { spellOptionsForPactTomeCantrips } from '../../shared/dnd/featSpellListOptions'
import {
  ClassFeaturesPanel,
  saveBonusFromFeatures,
  type FeatureSelfFormRequest,
  type WildShapeForkRequest,
} from './ClassFeaturesPanel'
import { CompanionsPanel } from './CompanionsPanel'
import {
  FeatureSelfFormDialog,
  type FeatureSelfFormDialogResult,
} from './FeatureSelfFormDialog'
import { shapechangerFormLimits } from './featureForms'
import { WildShapeDialog, type WildShapeDialogResult } from './WildShapeDialog'
import { healSelfForm, rollDice } from './wildShape'
import { TextBlocksPanel } from './TextBlocksPanel'
import { OnboardingChecklist, HoverTipCard, SCENE_TIPS } from '../onboarding'
import { AbilitySkillsColumn } from './AbilitySkillsColumn'
import { CharacterAvatarControl } from './CharacterAvatarControl'
import { IdentityDialog } from './IdentityDialog'
import { toggleCombatConsumableFavorite } from './combatConsumables'
import { PlayDeskAttacksCompact } from './PlayDeskAttacksCompact'
import { HotConditionsDialog } from './HotConditionsDialog'
import { PlayDeskHeader } from './PlayDeskHeader'
import { PlayDeskHotBar } from './PlayDeskHotBar'
import { RestDialog } from './RestDialog'
import { SorceryPointsSpendDialog } from './SorceryPointsSpendDialog'
import { BottomSceneNav } from './BottomSceneNav'
import { MobileAbilitiesPage } from './MobileAbilitiesPage'
import { MobileVitalsBar } from './MobileVitalsBar'
import { ChannelDivinitySpendDialog } from './ChannelDivinitySpendDialog'
import { KiSpendDialog } from './KiSpendDialog'
import { BardicInspirationSpendDialog } from './BardicInspirationSpendDialog'
import { LayOnHandsSpendDialog } from './LayOnHandsSpendDialog'
import { SuperiorityDiceSpendDialog } from './SuperiorityDiceSpendDialog'
import { ArcaneRecoverySpendDialog } from './ArcaneRecoverySpendDialog'
import {
  InfusionsActiveDialog,
  parseInfusionSlotsResourceId,
} from './InfusionsActiveDialog'
import { WarlockArcanumSpendDialog } from './WarlockArcanumSpendDialog'
import { WarlockInvocationsDialog } from './WarlockInvocationsDialog'
import { PsionicDiceSpendDialog } from './PsionicDiceSpendDialog'
import { SoulTrinketsSpendDialog } from './SoulTrinketsSpendDialog'
import { RangerFavoredDeskDialog } from './RangerFavoredDeskDialog'
import { PlayDeskSkillStrip } from './PlayDeskSkillStrip'
import { PlayDeskSpellsCompact } from './PlayDeskSpellsCompact'
import {
  armorGivesStealthDisadvantage,
  formatSkillRoll,
  resolveRollMode,
  type DeskRollMode,
} from './deskRolls'
import {
  appendRollHistory,
  appendXpHistory,
  isDeskRollToast,
  MODE_DEFAULT_PANEL,
  MODE_HINT,
  MODE_LABELS,
  MODE_SKILL_KEYS,
  defaultDeskSplitForMode,
  modeUsesSpellSplit,
  readSheetUi,
  sheetUiToPatch,
  splitSecondaryPanel,
  type PlayDeskCompactPanelId,
  type PlayDeskMode,
  type PlayDeskPanelId,
  type SheetUiState,
} from './playDeskUi'
import { setConcentration } from '../../shared/dnd/concentration'
import type { CompanionKind } from './companions'

const COMPANION_KIND_SHORT: Record<CompanionKind, string> = {
  beast_companion: 'Зверь',
  steel_defender: 'Защитник',
  eldritch_cannon: 'Пушка',
  drake: 'Дрейк',
  primal_companion: 'Спутник',
  familiar: 'Фамилиар',
  ally: 'Напарник',
  transformed_self: 'Облик',
  other: 'Спутник',
}
import {
  identityExtrasToSheet,
  readIdentityExtras,
  type IdentityExtras,
} from './identity'
import {
  applyRaceGrantToDraft,
  ensureRaceNaturalWeaponAttacks,
  raceNaturalWeaponAttacksMatch,
  readAppliedRaceGrant,
  reapplyRaceOverlays,
  revokeRaceGrant,
  syncRaceSpellsForSheetState,
  type RaceGrantDraftSlice,
} from './raceEffects'
import { resolveSpellLearnBudgets } from '../../shared/dnd/castProfiles'
import {
  characterHasCasterClass,
  highestSpellSlotLevelForClasses,
  resolveClassCasterSlug,
  resolveSpellLearnBudget,
} from '../../shared/dnd/casterProgression'
import { characterHasMagicSources } from './magicSources'
import {
  type InventoryItem,
  equipInventoryItem,
  equippedArmorPieces,
  inventoryToSheet,
  readInventory,
  type InventoryState,
} from './inventory'
import {
  classifySpellTooling,
  inferFocusKind,
  withSpellFocusFlags,
} from './spellFocus'
import {
  canCastWizardRitualFromBook,
  freeBookSlotsAtLevel,
  remainingFreeSpellbookSlots,
} from '../../shared/dnd/wizardSpellbook'
import {
  syncWizardSpellbookWithInventory,
  wizardHasUsableSpellbook,
} from './wizardSpellbookInventory'
import {
  playToSheet,
  readPlay,
  type PlayState,
} from './play'
import { CastSpellDialog, type CastChoice } from './CastSpellDialog'
import { CastScrollDialog } from './CastScrollDialog'
import {
  consumeScrollItem,
  isCastableSpellScroll,
  spellScrollCastStats,
} from './spellScroll'
import { consumeMaterialItem } from './spellMaterials'
import {
  addCatalogSpellToKnown,
  canSpendGrantCast,
  readSpells,
  spendGrantCast,
  spellsToSheet,
  type SheetSpell,
  type SpellsState,
} from './spells'
import { resolveCastEffect } from '../../shared/dnd/spellCatalog'
import { spendPactSlot, spendSpellSlot } from '../../shared/dnd/spells'
import {
  blockPlainText,
  readTextBlocks,
  textBlocksToSheet,
  withBlockPlainText,
  type TextBlock,
} from './textBlocks'
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  ABILITY_NAMES,
  SKILL_DEFS,
  abilityModifier,
  asRecord,
  formatModifier,
  readNullableNumber,
  readNumber,
  type AbilityKey,
} from './sheetTypes'
import { passiveScore, skillModifierFromState } from '../../shared/dnd/passives'

type MinimalSheetEditorProps = {
  character: CharacterDetail
  /** Fresh create: highlight background → class → race path once. */
  createGuide?: 'background-first' | 'class-first' | null
  /** Create at level N — after class grant, jump and queue picks 1…N. */
  startingLevel?: number
  /** First-run checklist under the ability rail. */
  showOnboardingChecklist?: boolean
  /** Absolute beginner: value «?» on КД/хиты/СИЛ… */
  showValueTips?: boolean
  onCreateGuideConsumed?: () => void
  onSaved: (character: CharacterDetail) => void
  onToast: (message: ToastInput) => void
  onRemoteSave?: (message: Extract<SheetSyncMessage, { type: 'sheet-saved' }>) => void
}

type Draft = {
  name: string
  raceName: string
  raceCatalogId: string | null
  classes: ClassLevelEntry[]
  identity: IdentityExtras
  abilities: Record<AbilityKey, number>
  saves: Record<AbilityKey, boolean>
  skills: Record<string, { is_proficient: boolean; is_expertise: boolean }>
  hpCurrent: number | null
  hpMax: number | null
  ac: number | null
  speed: number | null
  climbSpeed: number | null
  swimSpeed: number | null
  flySpeed: number | null
  initiativeOverride: number | null
  inspiration: boolean
  weapons: WeaponAttack[]
  inventory: InventoryState
  attunements: AttunementSlot[]
  spells: SpellsState
  play: PlayState
  textBlocks: TextBlock[]
  classGrants: AppliedClassGrant[]
  subclassGrants: AppliedSubclassGrant[]
  subclassTransitions: SubclassTransition[]
  raceGrant: AppliedRaceGrant | null
  backgroundGrant: AppliedBackgroundGrant | null
  backgroundCatalogId: string | null
  companions: CompanionEntry[]
  /** Wild Shape / form library — seen or learned forms. */
  knownForms: KnownForm[]
  featurePicks: FeaturePicksState
  classAsi: AppliedClassAsi[]
  featGrants: AppliedFeatGrant[]
  customFeatures: CustomFeature[]
  /** Named buff/debuff stack (AC formulas, later abilities). */
  modifiers: BonusLine[]
  sheetUi: SheetUiState
}

function readWeapons(sheet: Record<string, unknown>): WeaponAttack[] {
  const raw = sheet.weapons
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.map((item, index) => {
    const row = asRecord(item)
    const ability = ABILITY_KEYS.includes(row.ability as AbilityKey)
      ? (row.ability as AbilityKey)
      : 'str'
    const sourceKind =
      row.source_kind === 'weapon' ||
      row.source_kind === 'artifact' ||
      row.source_kind === 'custom' ||
      row.source_kind === 'race' ||
      row.source_kind === 'class'
        ? row.source_kind
        : typeof row.id === 'string' && row.id.startsWith('race-nw:')
          ? 'race'
          : typeof row.id === 'string' && row.id.startsWith('class-ma:')
            ? 'class'
            : row.catalog_id
              ? 'weapon'
              : 'custom'
    return {
      id: typeof row.id === 'string' ? row.id : `weapon-${index}`,
      name: typeof row.name === 'string' ? row.name : '',
      catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
      source_kind: sourceKind,
      ability,
      is_proficient: Boolean(row.is_proficient),
      damage: typeof row.damage === 'string' ? row.damage : '',
      damage_type: typeof row.damage_type === 'string' ? row.damage_type : '',
      qty:
        typeof row.qty === 'number' && Number.isFinite(row.qty) && row.qty > 1
          ? Math.floor(row.qty)
          : null,
      inventory_item_id:
        typeof row.inventory_item_id === 'string' ? row.inventory_item_id : null,
      held: Boolean(row.held),
    }
  })
}

function buildDraft(character: CharacterDetail): Draft {
  const sheet = asRecord(character.sheet)
  const identity = asRecord(sheet.identity)
  const abilitiesRaw = asRecord(sheet.abilities)
  const savesRaw = asRecord(sheet.saves)
  const skillsRaw = asRecord(sheet.skills)
  const combat = asRecord(sheet.combat)

  const abilities = Object.fromEntries(
    ABILITY_KEYS.map((key) => {
      const block = asRecord(abilitiesRaw[key])
      return [key, readNumber(block.score, 10)]
    }),
  ) as Record<AbilityKey, number>

  const saves = Object.fromEntries(
    ABILITY_KEYS.map((key) => {
      const block = asRecord(savesRaw[key])
      return [key, Boolean(block.is_proficient)]
    }),
  ) as Record<AbilityKey, boolean>

  const skills = Object.fromEntries(
    SKILL_DEFS.map((skill) => {
      const block = asRecord(skillsRaw[skill.key])
      return [
        skill.key,
        {
          is_proficient: Boolean(block.is_proficient),
          is_expertise: Boolean(block.is_expertise),
        },
      ]
    }),
  ) as Draft['skills']

  const identityExtras = readIdentityExtras(sheet)
  const classes = readClassLevels(sheet, {
    className: character.class_name ?? '',
    level: character.level,
    subclassName: identityExtras.subclassName,
    classCatalogId:
      typeof identity.class_catalog_id === 'string' ? identity.class_catalog_id : null,
  })
  const level = totalCharacterLevel(classes)
  const play = readPlay(sheet, level)
  const hitDiceByClass =
    play.hitDiceByClass.length > 0
      ? syncHitDicePools({ classes, previous: play.hitDiceByClass })
      : migrateLegacyHitDice({
          classes,
          legacyDie: play.hitDie,
          legacyCurrent: play.hitDiceCurrent,
        })

  const raceGrant = readAppliedRaceGrant(sheet.race_grant)
  // Un-bake Fast Movement / Unarmored Movement (+ optional Mobile) that create
  // wrote into combat.speed so armor-aware display can add the bonus live.
  let speed = readNullableNumber(combat.speed)
  const raceSpeed = raceGrant?.speed ?? null
  const featSpeedBonus = sumFeatSpeedBonus(readFeatGrantLedger(sheet.feat_grants))
  const maxClassSpeedBonus = classWalkSpeedBonusFt({
    classes,
    wearingHeavyArmor: false,
    wearingArmorOrShield: false,
  })
  if (speed != null && raceSpeed != null) {
    if (
      maxClassSpeedBonus > 0 &&
      (speed === raceSpeed + maxClassSpeedBonus ||
        speed === raceSpeed + featSpeedBonus + maxClassSpeedBonus)
    ) {
      speed = raceSpeed + featSpeedBonus
    }
  }

  return {
    name: character.name,
    raceName: character.race_name ?? '',
    raceCatalogId:
      typeof identity.race_catalog_id === 'string' ? identity.race_catalog_id : null,
    classes,
    identity: identityExtras,
    abilities,
    saves,
    skills,
    hpCurrent: character.hp_current ?? readNullableNumber(combat.hp_current),
    hpMax: character.hp_max ?? readNullableNumber(combat.hp_max),
    ac: readNullableNumber(combat.ac),
    speed,
    climbSpeed: readNullableNumber(combat.climb_speed ?? combat.climbSpeed),
    swimSpeed: readNullableNumber(combat.swim_speed ?? combat.swimSpeed),
    flySpeed: readNullableNumber(combat.fly_speed ?? combat.flySpeed),
    initiativeOverride: readNullableNumber(combat.initiative),
    inspiration: Boolean(combat.inspiration),
    ...(() => {
      const inventory = readInventory(sheet)
      // Hydrate spell_tooling type for legacy rows (one pass on load).
      // Cast later looks at type — custom names keep working once typed as focus.
      const items = inventory.items.map((item) => {
        if (item.spell_tooling) {
          if (
            item.spell_tooling === 'focus' &&
            !item.focus_kind
          ) {
            return {
              ...item,
              focus_kind: inferFocusKind({ name: item.name }) ?? 'any',
            }
          }
          return item
        }
        const tooling = classifySpellTooling({ name: item.name })
        if (tooling === 'none') return item
        return {
          ...item,
          spell_tooling: tooling,
          focus_kind:
            tooling === 'focus'
              ? inferFocusKind({ name: item.name }) ?? 'any'
              : null,
        }
      })
      const nextInventory = { ...inventory, items }
      const spells = withSpellFocusFlags(readSpells(sheet), items)
      return {
        inventory: nextInventory,
        weapons: syncAttacksHeldFromInventory(readWeapons(sheet), items),
        spells,
      }
    })(),
    attunements: readAttunements(sheet),
    play: withSyncedHitDiceSummary({
      ...play,
      hitDiceByClass,
    }),
    textBlocks: readTextBlocks(sheet),
    classGrants: readAppliedClassGrants(sheet.class_grants),
    subclassGrants: readAppliedSubclassGrants(sheet.subclass_grants),
    subclassTransitions: readSubclassTransitions(sheet.subclass_transitions),
    raceGrant,
    backgroundGrant: readAppliedBackgroundGrant(sheet.background_grant),
    backgroundCatalogId:
      typeof identity.background_catalog_id === 'string'
        ? identity.background_catalog_id
        : null,
    companions: readCompanions(sheet.companions),
    knownForms: readKnownForms(sheet.known_forms),
    featurePicks: readFeaturePicks(sheet.feature_picks),
    classAsi: readClassAsiLedger(sheet.class_asi),
    featGrants: readFeatGrantLedger(sheet.feat_grants),
    customFeatures: readCustomFeatures(sheet.custom_features ?? sheet.customFeatures),
    modifiers: readModifiers(sheet),
    sheetUi: readSheetUi(sheet),
  }
}

function grantedFeatSlugFromCatalog(entry: CatalogEntry): string | null {
  const raw = asRecord(entry.data).granted_feat_slug
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

function subclassSlugMapFromLedger(input: {
  subclassGrants: AppliedSubclassGrant[]
  subclassTransitions: SubclassTransition[]
}): Record<string, string> {
  const map: Record<string, string> = {}
  for (const grant of input.subclassGrants) {
    if (grant.classEntryId && grant.slug) map[grant.classEntryId] = grant.slug
  }
  for (const transition of input.subclassTransitions) {
    if (transition.mode === 'future_only' && transition.activeSlug) {
      map[transition.classEntryId] = transition.activeSlug
    }
  }
  return map
}

function subclassTransitionMapFromLedger(
  transitions: SubclassTransition[],
): Record<
  string,
  {
    mode: 'future_only'
    changedAtClassLevel: number
    previousSlug: string
    previousNameRu?: string
  }
> {
  const map: Record<
    string,
    {
      mode: 'future_only'
      changedAtClassLevel: number
      previousSlug: string
      previousNameRu?: string
    }
  > = {}
  for (const transition of transitions) {
    if (transition.mode !== 'future_only') continue
    map[transition.classEntryId] = {
      mode: 'future_only',
      changedAtClassLevel: transition.changedAtClassLevel,
      previousSlug: transition.previousSlug,
      previousNameRu: transition.previousNameRu,
    }
  }
  return map
}

function cycleSkill(state: { is_proficient: boolean; is_expertise: boolean }) {
  if (!state.is_proficient && !state.is_expertise) {
    return { is_proficient: true, is_expertise: false }
  }
  if (state.is_proficient && !state.is_expertise) {
    return { is_proficient: true, is_expertise: true }
  }
  return { is_proficient: false, is_expertise: false }
}

export function MinimalSheetEditor({
  character,
  createGuide = null,
  startingLevel: startingLevelProp = 1,
  showOnboardingChecklist = false,
  showValueTips = false,
  onCreateGuideConsumed,
  onSaved,
  onToast,
  onRemoteSave,
}: MinimalSheetEditorProps) {
  const [baseCharacter, setBaseCharacter] = useState(character)
  const [draft, setDraft] = useState(() => buildDraft(character))
  const [sheetVersion, setSheetVersion] = useState(character.sheet_version)
  /** Autosave status — no manual save button (LSS-style). */
  const [saveStatus, setSaveStatus] = useState<'saved' | 'dirty' | 'saving' | 'error'>(
    'saved',
  )
  const [reloading, setReloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  /** Gift feat from the table master — outside ASI / race / background. */
  const [giftFeatOpen, setGiftFeatOpen] = useState(false)
  const [pendingAsi, setPendingAsi] = useState<{
    classEntryId: string
    className: string
    classLevel: number
    featureId: string
  } | null>(null)
  const [guidedWizard, setGuidedWizard] = useState<GuidedWizardSession | null>(null)
  /** Wizard paused while BackgroundSetupDialog is open from a wizard step. */
  const [pausedWizardForBackground, setPausedWizardForBackground] =
    useState<GuidedWizardSession | null>(null)
  /** Wizard paused while SubclassSetupDialog collects archetype forks. */
  const [pausedWizardForSubclass, setPausedWizardForSubclass] =
    useState<GuidedWizardSession | null>(null)
  /** Consumed once after first start-mode class grant (create at N). */
  const [pendingStartingLevel, setPendingStartingLevel] = useState(() =>
    clampCharacterLevel(startingLevelProp || 1),
  )
  const [grantPicker, setGrantPicker] = useState<{
    classEntryId: string
    className: string
    mode: 'start' | 'multiclass'
    def: ClassGrantDef
    catalogSlug: string | null
    catalogData: Record<string, unknown> | null
  } | null>(null)
  const [homebrewPicker, setHomebrewPicker] = useState<{
    classEntryId: string
    initialName: string
  } | null>(null)
  const [raceGrantPicker, setRaceGrantPicker] = useState<{
    root: CatalogEntry
    subraces: CatalogEntry[]
    subraceRequired: boolean
  } | null>(null)
  const [raceHomebrewOpen, setRaceHomebrewOpen] = useState(false)
  const [backgroundFeatSlug, setBackgroundFeatSlug] = useState<string | null>(null)
  const [backgroundGrantPicker, setBackgroundGrantPicker] = useState<{
    root: CatalogEntry
    variants: CatalogEntry[]
  } | null>(null)
  const [backgroundHomebrewOpen, setBackgroundHomebrewOpen] = useState(false)
  const [subclassSetup, setSubclassSetup] = useState<{
    classEntryId: string
    selected: CatalogEntry
    def: SubclassGrantDef
    copyOldTextToNotes: boolean
    previousDef: SubclassGrantDef | null
    changeMode?: SubclassChangeMode | 'initial'
    changedAtClassLevel?: number
    previousNameRu?: string
    previousCatalogId?: string | null
    previousSlug?: string
    advanceWizardAfter?: boolean
  } | null>(null)
  const [subclassChange, setSubclassChange] = useState<{
    classEntryId: string
    selected: CatalogEntry
    def: SubclassGrantDef
    fromName: string
    textSnippets: string[]
    previousDef: SubclassGrantDef | null
    previousSlug: string
    previousCatalogId: string | null
    classLevel: number
  } | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const raceCatalogCacheRef = useRef<CatalogEntry[] | null>(null)
  const backgroundCatalogCacheRef = useRef<CatalogEntry[] | null>(null)
  const asiFeatHydrateAttemptedRef = useRef(false)
  const bmManeuverHydrateAttemptedRef = useRef(false)
  const [backgroundCatalogRows, setBackgroundCatalogRows] = useState<CatalogEntry[]>(
    [],
  )
  const skipAutosaveRef = useRef(true)
  const autosaveTimerRef = useRef<number | null>(null)
  const saveInFlightRef = useRef(false)
  const pendingResaveRef = useRef(false)
  const sheetVersionRef = useRef(sheetVersion)
  sheetVersionRef.current = sheetVersion
  const draftRef = useRef(draft)
  draftRef.current = draft
  const baseCharacterRef = useRef(baseCharacter)
  baseCharacterRef.current = baseCharacter
  const conflictOpenRef = useRef(conflictOpen)
  conflictOpenRef.current = conflictOpen
  const saveStatusRef = useRef(saveStatus)
  saveStatusRef.current = saveStatus
  const onSavedRef = useRef(onSaved)
  onSavedRef.current = onSaved
  const onToastRef = useRef(onToast)
  onToastRef.current = onToast
  const [raceCatalogRows, setRaceCatalogRows] = useState<CatalogEntry[]>([])
  const [wildShapeFork, setWildShapeFork] = useState<WildShapeForkRequest | null>(
    null,
  )
  const [featureSelfForm, setFeatureSelfForm] =
    useState<FeatureSelfFormRequest | null>(null)

  const characterLevel = useMemo(
    () => totalCharacterLevel(draft.classes),
    [draft.classes],
  )
  const ownedFeatEnums = useMemo(
    () => ownedFeatEnumsFromLedger(draft.featGrants),
    [draft.featGrants],
  )
  const proficientSkills = useMemo(
    () =>
      Object.entries(draft.skills)
        .filter(([, state]) => state.is_proficient)
        .map(([key]) => key),
    [draft.skills],
  )
  const classSummary = useMemo(
    () => formatClassSummary(draft.classes),
    [draft.classes],
  )
  const subclassSlugByEntryId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const grant of draft.subclassGrants) {
      if (grant.classEntryId && grant.slug) {
        map[grant.classEntryId] = grant.slug
      }
    }
    for (const transition of draft.subclassTransitions) {
      if (transition.mode === 'future_only' && transition.activeSlug) {
        map[transition.classEntryId] = transition.activeSlug
      }
    }
    return map
  }, [draft.subclassGrants, draft.subclassTransitions])
  const subclassTransitionByEntryId = useMemo(() => {
    const map: Record<
      string,
      {
        mode: 'future_only'
        changedAtClassLevel: number
        previousSlug: string
        previousNameRu?: string
      }
    > = {}
    for (const transition of draft.subclassTransitions) {
      if (transition.mode !== 'future_only') continue
      map[transition.classEntryId] = {
        mode: 'future_only',
        changedAtClassLevel: transition.changedAtClassLevel,
        previousSlug: transition.previousSlug,
        previousNameRu: transition.previousNameRu,
      }
    }
    return map
  }, [draft.subclassTransitions])
  const unlockedFeatures = useMemo(
    () =>
      unlockFeaturesForClasses({
        classes: draft.classes,
        characterLevel,
        abilities: draft.abilities,
        subclassSlugByEntryId,
        subclassTransitionByEntryId,
      }),
    [
      draft.classes,
      characterLevel,
      draft.abilities,
      subclassSlugByEntryId,
      subclassTransitionByEntryId,
    ],
  )
  const expertiseKeys = useMemo(
    () => listUnlockedExpertiseKeys(unlockedFeatures),
    [unlockedFeatures],
  )
  const hasSubclassByEntryId = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const row of draft.classes) {
      map[row.id] = Boolean(row.subclass_catalog_id || row.subclass_name.trim())
    }
    return map
  }, [draft.classes])
  const featureDesiredResources = useMemo(
    () =>
      desiredResourcesFromFeatures({
        features: unlockedFeatures,
        characterLevel,
        abilities: draft.abilities,
      }),
    [unlockedFeatures, characterLevel, draft.abilities],
  )
  /** Show spells split when the sheet has any magic source (class/archetype/race/feat/gear). */
  const hasMagicSources = useMemo(
    () =>
      characterHasMagicSources({
        classes: draft.classes,
        known: draft.spells.known,
        slots: draft.spells.slots,
        pactSlots: draft.spells.pact_slots,
      }),
    [
      draft.classes,
      draft.spells.known,
      draft.spells.slots,
      draft.spells.pact_slots,
    ],
  )
  /** Grant first; else catalog by slug/name (older sheets without background_grant). */
  const resolvedBackgroundFeature = useMemo(() => {
    const fromGrant = backgroundFeatureCardFromGrant(draft.backgroundGrant ?? {})
    if (fromGrant) return fromGrant
    const slug = draft.identity.backgroundSlug?.trim() || ''
    const name = draft.identity.background?.trim() || ''
    if (!slug && !name) return null
    const entry =
      (slug
        ? backgroundCatalogRows.find((row) => row.slug === slug)
        : undefined) ??
      (name
        ? backgroundCatalogRows.find(
            (row) => row.name_ru.trim().toLowerCase() === name.toLowerCase(),
          )
        : undefined)
    if (!entry) return null
    const def = resolveBackgroundGrantDef({
      backgroundName: entry.name_ru,
      catalogSlug: entry.slug,
      catalogData: entry.data,
      nameRu: entry.name_ru,
    })
    if (!def) return null
    return backgroundFeatureCardFromGrant({
      slug: entry.slug,
      featureNameRu: def.featureNameRu,
      featureTextRu: def.featureTextRu,
      featNoteRu: def.featNoteRu,
    })
  }, [
    draft.backgroundGrant,
    draft.identity.background,
    draft.identity.backgroundSlug,
    backgroundCatalogRows,
  ])
  const martialArtsDie = useMemo(
    () => martialArtsDieFromFeatures(unlockedFeatures),
    [unlockedFeatures],
  )
  const featSpeedBonusFt = useMemo(
    () => sumFeatSpeedBonus(draft.featGrants),
    [draft.featGrants],
  )
  const primaryClass = draft.classes[0]
  const rulesEdition = baseCharacter.rules_edition as RulesEdition
  const druidClassRow = useMemo(() => {
    if (wildShapeFork) {
      return (
        draft.classes.find((row) => row.id === wildShapeFork.classEntryId) ?? null
      )
    }
    return (
      draft.classes.find(
        (row) => resolveClassFeatureSlug(row.name) === 'druid',
      ) ?? null
    )
  }, [draft.classes, wildShapeFork])
  const druidLevel = druidClassRow?.level ?? characterLevel
  const druidSubclassSlug =
    (druidClassRow && subclassSlugByEntryId[druidClassRow.id]) || null

  function applyWildShapeResult(result: WildShapeDialogResult) {
    setDraft((prev) => ({
      ...prev,
      companions: result.companions,
      knownForms: result.knownForms,
      play: {
        ...prev.play,
        resources: result.resources,
        ...(result.hpTemp != null
          ? { hpTemp: Math.max(prev.play.hpTemp, result.hpTemp) }
          : {}),
      },
    }))
    if (result.toast) onToast(result.toast)
  }

  function clearConcentrationDismissingCompanions(
    next: typeof draft.play.concentration | null = null,
  ) {
    let dismissed: string[] = []
    setDraft((prev) => {
      const result = applyConcentrationChangeToCompanions({
        companions: prev.companions,
        previous: prev.play.concentration,
        next,
      })
      dismissed = result.dismissedNames
      return {
        ...prev,
        companions: result.companions,
        play: { ...prev.play, concentration: next },
      }
    })
    if (dismissed.length) {
      onToast(
        `Концентрация снята · напарник неактивен: ${dismissed.join(', ')}`,
      )
    }
  }

  useEffect(() => {
    // New character open — full reset.
    if (character.id !== baseCharacter.id) {
      setBaseCharacter(character)
      setDraft(buildDraft(character))
      setSheetVersion(character.sheet_version)
      setConflictOpen(false)
      setError(null)
      setSaveStatus('saved')
      skipAutosaveRef.current = true
      return
    }
    // Same character: only pull when server is ahead (other tab / refresh).
    // Do not rebuild draft when our own autosave echoes back via onSaved.
    // If prop is behind local sheetVersion (save just landed, parent not yet), ignore.
    if (character.sheet_version > sheetVersion) {
      setBaseCharacter(character)
      setDraft(buildDraft(character))
      setSheetVersion(character.sheet_version)
      setConflictOpen(false)
      setSaveStatus('saved')
      skipAutosaveRef.current = true
    } else if (character.sheet_version === sheetVersion) {
      setBaseCharacter(character)
    }
  }, [character, baseCharacter.id, sheetVersion])

  useEffect(() => {
    if (createGuide !== 'background-first' && createGuide !== 'class-first') return
    const targetId =
      createGuide === 'background-first' ? 'sheet-background' : 'sheet-class-primary'
    const node = document.getElementById(targetId)
    if (node instanceof HTMLElement) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      window.setTimeout(() => node.focus(), 120)
    }
    if (createGuide === 'background-first' && !draft.backgroundGrant) {
      openGuidedWizard({ steps: [backgroundWizardStep()], index: 0 })
    }
    onCreateGuideConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot create guide
  }, [createGuide, onCreateGuideConsumed])

  // Prefetch backgrounds so variant fork popup does not wait on a second fetch.
  // Also backfill feature name/text + traits marker for older sheets.
  useEffect(() => {
    let active = true
    backgroundCatalogCacheRef.current = null
    setBackgroundCatalogRows([])
    listCatalogEntries({ kind: 'background', edition: rulesEdition })
      .then((rows) => {
        if (!active) return
        backgroundCatalogCacheRef.current = rows
        setBackgroundCatalogRows(rows)
        setDraft((prev) => {
          if (prev.backgroundGrant) {
            const entry =
              rows.find(
                (row) => row.id === prev.backgroundGrant!.backgroundCatalogId,
              ) ?? rows.find((row) => row.slug === prev.backgroundGrant!.slug)
            const catalogDef = entry
              ? resolveBackgroundGrantDef({
                  backgroundName: entry.name_ru,
                  catalogSlug: entry.slug,
                  catalogData: entry.data,
                  nameRu: entry.name_ru,
                })
              : null
            const next = ensureBackgroundFeatureOnDraft(
              {
                identity: prev.identity,
                skills: prev.skills,
                inventory: prev.inventory,
                textBlocks: prev.textBlocks,
                weapons: prev.weapons,
                backgroundGrant: prev.backgroundGrant,
                protectedSkills: new Set(),
                protectedTools: new Set(),
                protectedLanguages: new Set(),
                protectedWeaponExtras: new Set(),
              },
              catalogDef,
            )
            if (
              next.backgroundGrant === prev.backgroundGrant &&
              next.textBlocks === prev.textBlocks
            ) {
              return prev
            }
            return {
              ...prev,
              backgroundGrant: next.backgroundGrant,
              textBlocks: next.textBlocks,
            }
          }
          // Name/slug-only sheets: stamp traits from catalog; panel soft-reads catalog.
          // Do not invent a background_grant (skills/tools ownership stays untouched).
          const slug = prev.identity.backgroundSlug?.trim() || ''
          const name = prev.identity.background?.trim() || ''
          if (!slug && !name) return prev
          const entry =
            (slug ? rows.find((row) => row.slug === slug) : undefined) ??
            (name
              ? rows.find(
                  (row) =>
                    row.name_ru.trim().toLowerCase() === name.toLowerCase(),
                )
              : undefined)
          if (!entry) return prev
          const catalogDef = resolveBackgroundGrantDef({
            backgroundName: entry.name_ru,
            catalogSlug: entry.slug,
            catalogData: entry.data,
            nameRu: entry.name_ru,
          })
          if (!catalogDef?.featureNameRu) return prev
          const featureText = buildBackgroundFeatureText(catalogDef)
          if (!featureText.trim()) return prev
          let changed = false
          const textBlocks = prev.textBlocks.map((block) => {
            if (block.key !== 'traits') return block
            const current = blockPlainText(block)
            if (
              current.includes('<!-- dvarf-background-feature -->') &&
              current.includes(featureText)
            ) {
              return block
            }
            const nextPlain = upsertBackgroundFeatureBlock(current, featureText)
            if (nextPlain === current) return block
            changed = true
            return withBlockPlainText(block, nextPlain)
          })
          if (!changed) return prev
          return { ...prev, textBlocks }
        })
      })
      .catch(() => {
        /* picker will retry on demand */
      })
    return () => {
      active = false
    }
  }, [rulesEdition])

  // Prefetch full race catalog so subrace popup opens without a second network round-trip.
  useEffect(() => {
    let active = true
    raceCatalogCacheRef.current = null
    setRaceCatalogRows([])
    listCatalogEntries({ kind: 'race', edition: rulesEdition })
      .then((rows) => {
        if (!active) return
        raceCatalogCacheRef.current = rows
        setRaceCatalogRows(rows)
        // Backfill natural-weapon cards + movement speeds for races chosen earlier.
        setDraft((prev) => {
          if (!prev.raceGrant) return prev
          const entry =
            rows.find((row) => row.id === prev.raceGrant!.raceCatalogId) ??
            rows.find((row) => row.slug === prev.raceGrant!.slug)
          const catalogDef = entry
            ? resolveRaceGrantDef({
                raceName: entry.name_ru,
                catalogSlug: entry.slug,
                catalogData: entry.data,
                nameRu: entry.name_ru,
              })
            : null
          const catalogWeapons = catalogDef?.naturalWeapons ?? null
          const weaponsSource =
            catalogWeapons && catalogWeapons.length > 0
              ? catalogWeapons
              : prev.raceGrant.naturalWeapons ?? []
          const weaponsMatch =
            weaponsSource.length === 0 ||
            raceNaturalWeaponAttacksMatch({
              weapons: prev.weapons,
              raceSlug: prev.raceGrant.slug,
              naturalWeapons: weaponsSource,
            })
          const nextWeapons = weaponsMatch
            ? prev.weapons
            : ensureRaceNaturalWeaponAttacks({
                weapons: prev.weapons,
                grant: prev.raceGrant,
                catalogWeapons,
              })

          let nextGrant = prev.raceGrant
          let climbSpeed = prev.climbSpeed
          let swimSpeed = prev.swimSpeed
          let flySpeed = prev.flySpeed
          if (catalogDef) {
            const movement = resolveRaceMovement({
              walk: catalogDef.speed,
              movement: catalogDef.movement,
            })
            const grantMove = prev.raceGrant.movement
            const grantEmpty =
              grantMove == null ||
              (grantMove.climb == null &&
                grantMove.swim == null &&
                grantMove.fly == null)
            const draftEmpty =
              climbSpeed == null && swimSpeed == null && flySpeed == null
            const hasCatalogMove =
              movement.climb != null ||
              movement.swim != null ||
              movement.fly != null
            // Only fill when both ledger and draft lack alt speeds (pre-feature sheets).
            if (hasCatalogMove && grantEmpty && draftEmpty) {
              nextGrant = { ...nextGrant, movement }
              climbSpeed = movement.climb
              swimSpeed = movement.swim
              flySpeed = movement.fly
            }
          }
          if (catalogWeapons && catalogWeapons.length > 0) {
            nextGrant = { ...nextGrant, naturalWeapons: catalogWeapons }
          }
          if (catalogDef?.racialSpells && catalogDef.racialSpells.length > 0) {
            nextGrant = { ...nextGrant, racialSpells: catalogDef.racialSpells }
          }
          if (catalogDef?.traitCards && catalogDef.traitCards.length > 0) {
            const had = nextGrant.traitCards?.length ?? 0
            if (had === 0) {
              nextGrant = { ...nextGrant, traitCards: catalogDef.traitCards }
            }
          }
          if (catalogDef?.traitsText && !nextGrant.traitsText?.trim()) {
            nextGrant = { ...nextGrant, traitsText: catalogDef.traitsText }
          }

          const nextSpells = syncRaceSpellsForSheetState({
            spells: prev.spells,
            grant: nextGrant,
            characterLevel: totalCharacterLevel(prev.classes),
            hasCasterClass: characterHasCasterClass(prev.classes),
            catalogSpells: catalogDef?.racialSpells ?? null,
            raceLabelRu: catalogDef?.labelRu || prev.raceName,
          })

          if (
            nextWeapons === prev.weapons &&
            nextGrant === prev.raceGrant &&
            nextSpells === prev.spells &&
            climbSpeed === prev.climbSpeed &&
            swimSpeed === prev.swimSpeed &&
            flySpeed === prev.flySpeed
          ) {
            return prev
          }
          return {
            ...prev,
            weapons: nextWeapons,
            spells: nextSpells,
            raceGrant: nextGrant,
            climbSpeed,
            swimSpeed,
            flySpeed,
          }
        })
      })
      .catch(() => {
        if (!active) return
        raceCatalogCacheRef.current = null
        setRaceCatalogRows([])
      })
    return () => {
      active = false
    }
  }, [rulesEdition, character.id])

  // Keep feat:* pools in play.resources aligned with unlocked features (PB, archetype).
  useEffect(() => {
    setDraft((prev) => {
      const nextResources = syncFeatureResources(
        prev.play.resources,
        featureDesiredResources,
      )
      if (
        nextResources.length === prev.play.resources.length &&
        nextResources.every((row, index) => {
          const cur = prev.play.resources[index]
          return (
            cur &&
            cur.id === row.id &&
            cur.name === row.name &&
            cur.max === row.max &&
            cur.used === row.used &&
            cur.reset === row.reset
          )
        })
      ) {
        return prev
      }
      return {
        ...prev,
        play: { ...prev.play, resources: nextResources },
      }
    })
  }, [featureDesiredResources])

  // Diamond Soul (and similar): force-enable save proficiencies from features.
  useEffect(() => {
    setDraft((prev) => {
      const nextSaves = applyFeatureSaveProficiencies(prev.saves, unlockedFeatures)
      if (nextSaves === prev.saves) return prev
      return { ...prev, saves: nextSaves }
    })
  }, [unlockedFeatures])

  // Martial Arts: keep a live «Безоружный удар» card while the feature is unlocked.
  useEffect(() => {
    setDraft((prev) => {
      const nextWeapons = syncMonkUnarmedAttack({
        weapons: prev.weapons,
        martialArtsDie,
        str: prev.abilities.str,
        dex: prev.abilities.dex,
      })
      if (
        nextWeapons.length === prev.weapons.length &&
        nextWeapons.every((row, index) => {
          const cur = prev.weapons[index]
          return (
            cur &&
            cur.id === row.id &&
            cur.name === row.name &&
            cur.damage === row.damage &&
            cur.ability === row.ability
          )
        })
      ) {
        return prev
      }
      return { ...prev, weapons: nextWeapons }
    })
  }, [martialArtsDie, draft.abilities.str, draft.abilities.dex])

  const onRemoteSaveRef = useRef(onRemoteSave)
  useEffect(() => {
    onRemoteSaveRef.current = onRemoteSave
  }, [onRemoteSave])

  useEffect(() => {
    const channel = createSheetSyncChannel((message) => {
      if (message.type !== 'sheet-saved') {
        return
      }
      if (message.characterId !== character.id) {
        return
      }
      onRemoteSaveRef.current?.(message)
    })
    channelRef.current = channel
    publishSheetSync(channel, {
      type: 'sheet-opened',
      characterId: character.id,
      sheetVersion: character.sheet_version,
    })
    return () => {
      channel?.close()
      channelRef.current = null
    }
    // Channel is per open character; avoid reconnect on every local save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id])

  const proficiencyBonus = useMemo(
    () => 2 + Math.floor((Math.max(characterLevel, 1) - 1) / 4),
    [characterLevel],
  )

  /** Refresh mark-list racial spells after class / subclass / level changes. */
  function withRaceSpellsSynced(prev: Draft, nextClasses: ClassLevelEntry[]): Draft {
    if (!prev.raceGrant) {
      return { ...prev, classes: nextClasses }
    }
    const spells = syncRaceSpellsForSheetState({
      spells: prev.spells,
      grant: prev.raceGrant,
      characterLevel: totalCharacterLevel(nextClasses),
      hasCasterClass: characterHasCasterClass(nextClasses),
      raceLabelRu: prev.raceName,
    })
    return { ...prev, classes: nextClasses, spells }
  }

  function patchClass(classId: string, patch: Partial<ClassLevelEntry>) {
    setDraft((prev) => {
      const nextClasses = prev.classes.map((row) =>
        row.id === classId ? { ...row, ...patch } : row,
      )
      const next = withRaceSpellsSynced(prev, nextClasses)
      return {
        ...next,
        identity:
          prev.classes[0]?.id === classId && patch.subclass_name !== undefined
            ? { ...next.identity, subclassName: patch.subclass_name }
            : next.identity,
      }
    })
  }

  function draftSliceFrom(prev: Draft): ClassGrantDraftSlice {
    return {
      identity: prev.identity,
      saves: prev.saves,
      skills: prev.skills,
      classGrants: prev.classGrants,
      playHitDie: prev.play.hitDie,
      hpMax: prev.hpMax,
      hpCurrent: prev.hpCurrent,
      constitutionScore: prev.abilities.con,
      characterLevel: totalCharacterLevel(prev.classes),
      inventory: prev.inventory,
      weapons: prev.weapons,
    }
  }

  function raceSliceFrom(prev: Draft): RaceGrantDraftSlice {
    const classSkills = new Set([
      ...prev.classGrants.flatMap((row) => row.skills),
      ...prev.subclassGrants.flatMap((row) => row.skills),
      ...(prev.backgroundGrant?.skills ?? []),
    ])
    const classTools = new Set([
      ...prev.classGrants.flatMap((row) =>
        row.tools.map((item) => item.trim().toLowerCase()).filter(Boolean),
      ),
      ...prev.subclassGrants.flatMap((row) =>
        row.tools.map((item) => item.trim().toLowerCase()).filter(Boolean),
      ),
      ...(prev.backgroundGrant?.tools ?? []).map((item) =>
        item.trim().toLowerCase(),
      ),
    ])
    const classArmor = new Set([
      ...prev.classGrants.flatMap((row) => row.armorKeys),
      ...prev.subclassGrants.flatMap((row) => row.armorKeys),
    ]) as Set<keyof IdentityExtras['armor']>
    const classGrantedWeaponExtras = new Set([
      ...prev.classGrants.flatMap((row) =>
        (row.weaponExtras ?? []).map((item) => item.trim().toLowerCase()),
      ),
      ...prev.subclassGrants.flatMap((row) =>
        (row.weaponExtras ?? []).map((item) => item.trim().toLowerCase()),
      ),
      ...(prev.backgroundGrant?.weaponExtras ?? []).map((item) =>
        item.trim().toLowerCase(),
      ),
    ])
    return {
      identity: prev.identity,
      skills: prev.skills,
      abilities: prev.abilities,
      speed: prev.speed,
      climbSpeed: prev.climbSpeed,
      swimSpeed: prev.swimSpeed,
      flySpeed: prev.flySpeed,
      textBlocks: prev.textBlocks,
      weapons: prev.weapons,
      spells: prev.spells,
      raceGrant: prev.raceGrant,
      classGrantedSkills: classSkills,
      classGrantedTools: classTools,
      classGrantedArmor: classArmor,
      classGrantedWeaponExtras,
    }
  }

  function backgroundSliceFrom(prev: Draft): BackgroundGrantDraftSlice {
    const featSkills = prev.featGrants.flatMap((row) => row.applied.skills)
    const featTools = prev.featGrants
      .flatMap((row) => row.applied.tools)
      .map((item) => item.trim().toLowerCase())
    const featLang = prev.featGrants
      .flatMap((row) => row.applied.languages)
      .map((item) => item.toLowerCase())
    const protectedSkills = new Set([
      ...prev.classGrants.flatMap((row) => row.skills),
      ...prev.subclassGrants.flatMap((row) => row.skills),
      ...(prev.raceGrant?.skills ?? []),
      ...featSkills,
    ])
    const protectedTools = new Set([
      ...prev.classGrants.flatMap((row) =>
        row.tools.map((item) => item.trim().toLowerCase()).filter(Boolean),
      ),
      ...prev.subclassGrants.flatMap((row) =>
        row.tools.map((item) => item.trim().toLowerCase()).filter(Boolean),
      ),
      ...(prev.raceGrant?.tools ?? []).map((item) => item.trim().toLowerCase()),
      ...featTools,
    ])
    const protectedLanguages = new Set([
      ...(prev.raceGrant?.languages ?? []).map((item) => item.toLowerCase()),
      ...featLang,
    ])
    const protectedWeaponExtras = new Set([
      ...prev.classGrants.flatMap((row) =>
        (row.weaponExtras ?? []).map((item) => item.trim().toLowerCase()),
      ),
      ...prev.subclassGrants.flatMap((row) =>
        (row.weaponExtras ?? []).map((item) => item.trim().toLowerCase()),
      ),
      ...(prev.raceGrant?.weaponNames ?? []).map((item) => item.toLowerCase()),
    ])
    return {
      identity: prev.identity,
      skills: prev.skills,
      inventory: prev.inventory,
      textBlocks: prev.textBlocks,
      weapons: prev.weapons,
      backgroundGrant: prev.backgroundGrant,
      protectedSkills,
      protectedTools,
      protectedLanguages,
      protectedWeaponExtras,
    }
  }

  function mergeBackgroundSlice(prev: Draft, slice: BackgroundGrantDraftSlice): Draft {
    return {
      ...prev,
      identity: slice.identity,
      skills: slice.skills,
      inventory: slice.inventory,
      textBlocks: slice.textBlocks,
      weapons: slice.weapons,
      spells: withSpellFocusFlags(prev.spells, slice.inventory.items),
      backgroundGrant: slice.backgroundGrant,
      backgroundCatalogId: slice.backgroundGrant?.backgroundCatalogId ?? null,
    }
  }

  function featSliceFrom(prev: Draft): FeatGrantDraftSlice {
    return {
      abilities: prev.abilities,
      saves: prev.saves,
      skills: prev.skills,
      speed: prev.speed,
      hpMax: prev.hpMax,
      hpCurrent: prev.hpCurrent,
      featGrants: prev.featGrants,
      identity: {
        languages: prev.identity.languages,
        tools: prev.identity.tools,
        armor: prev.identity.armor,
      },
      textBlocks: prev.textBlocks,
      resources: prev.play.resources,
      spells: prev.spells,
      totalLevel: totalCharacterLevel(prev.classes),
    }
  }

  function mergeFeatSlice(prev: Draft, slice: FeatGrantDraftSlice): Draft {
    return {
      ...prev,
      abilities: slice.abilities,
      saves: slice.saves,
      skills: slice.skills,
      speed: slice.speed,
      hpMax: slice.hpMax,
      hpCurrent: slice.hpCurrent,
      featGrants: slice.featGrants,
      textBlocks: slice.textBlocks,
      spells: slice.spells,
      identity: {
        ...prev.identity,
        languages: slice.identity.languages,
        tools: slice.identity.tools,
        armor: slice.identity.armor,
      },
      play: {
        ...prev.play,
        resources: slice.resources,
      },
    }
  }

  // Older create discarded ASI→feat packages; rebuild Alert/Mobile/etc. from catalog once.
  useEffect(() => {
    if (asiFeatHydrateAttemptedRef.current) return
    const missing = findMissingAsiFeatEntries(draft.classAsi, draft.featGrants)
    if (!missing.length) return
    asiFeatHydrateAttemptedRef.current = true
    let active = true
    listCatalogEntries({ kind: 'feat', edition: rulesEdition })
      .then((rows) => {
        if (!active) return
        const level = totalCharacterLevel(draft.classes)
        const rebuilt: AppliedFeatGrant[] = []
        for (const entry of missing) {
          if (entry.resolution.kind !== 'feat') continue
          const catalogEntry = matchFeatCatalogEntry(rows, entry.resolution)
          if (!catalogEntry) continue
          const grant = buildAsiFeatGrantFromCatalog({
            entry,
            catalogEntry,
            characterLevel: level,
          })
          if (grant) rebuilt.push(grant)
        }
        if (!rebuilt.length) return
        setDraft((prev) => {
          let next = prev
          let applied = 0
          const names: string[] = []
          for (const grant of rebuilt) {
            if (grant.source.kind !== 'asi') continue
            const source = grant.source
            const already = next.featGrants.some(
              (row) =>
                row.id === grant.id ||
                (row.source.kind === 'asi' &&
                  row.featCatalogId === grant.featCatalogId &&
                  row.source.classEntryId === source.classEntryId &&
                  row.source.featureId === source.featureId),
            )
            if (already) continue
            next = mergeFeatSlice(
              next,
              applyFeatGrantToDraft({ draft: featSliceFrom(next), grant }),
            )
            applied += 1
            names.push(grant.nameRu)
          }
          if (applied > 0) {
            onToast(
              applied === 1
                ? `Восстановлена черта ASI «${names[0]}»`
                : `Восстановлены черты ASI: ${names.join(', ')}`,
            )
          }
          return next
        })
      })
      .catch(() => {
        /* allow a later remount to retry */
        asiFeatHydrateAttemptedRef.current = false
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot backfill
  }, [draft.classAsi, draft.featGrants, draft.classes, rulesEdition])

  // Older create stored BM maneuvers only in subclass_grants (flavor); copy into feature_picks.
  useEffect(() => {
    if (bmManeuverHydrateAttemptedRef.current) return
    const probe = hydrateManeuversFromSubclassGrants({
      featurePicks: draft.featurePicks,
      subclassGrants: draft.subclassGrants,
    })
    if (!probe.bridgedClassEntryIds.length) return
    bmManeuverHydrateAttemptedRef.current = true
    setDraft((prev) => {
      const again = hydrateManeuversFromSubclassGrants({
        featurePicks: prev.featurePicks,
        subclassGrants: prev.subclassGrants,
      })
      if (!again.bridgedClassEntryIds.length) return prev
      onToast('Восстановлены манёвры Мастера боя из выбора архетипа')
      return { ...prev, featurePicks: again.featurePicks }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot backfill
  }, [draft.subclassGrants, draft.featurePicks])

  function subclassSliceFrom(prev: Draft): SubclassGrantDraftSlice {
    return {
      identity: prev.identity,
      skills: prev.skills,
      classGrants: prev.classGrants,
      subclassGrants: prev.subclassGrants,
      subclassTransitions: prev.subclassTransitions,
      raceGrant: prev.raceGrant,
      companions: prev.companions,
      textBlocks: prev.textBlocks,
      spells: prev.spells,
    }
  }

  function mergeSubclassSlice(prev: Draft, slice: SubclassGrantDraftSlice): Draft {
    const merged: Draft = {
      ...prev,
      identity: slice.identity,
      skills: slice.skills,
      subclassGrants: slice.subclassGrants,
      subclassTransitions: slice.subclassTransitions,
      companions: slice.companions,
      textBlocks: slice.textBlocks,
      spells: slice.spells,
    }
    const restored = reapplyRaceOverlays(raceSliceFrom(merged))
    return mergeRaceSlice(merged, restored)
  }

  function commitSubclassGrant(input: {
    classEntryId: string
    selected: CatalogEntry
    def: SubclassGrantDef
    picks: SubclassGrantPicks
    copyOldTextToNotes?: boolean
    previousDef?: SubclassGrantDef | null
    changeMode?: SubclassChangeMode | 'initial'
    changedAtClassLevel?: number
    previousNameRu?: string
    previousCatalogId?: string | null
    previousSlug?: string
    advanceWizardAfter?: boolean
  }) {
    let summary: string | null = null
    const changeMode = input.changeMode ?? 'initial'
    setDraft((prev) => {
      const maxSpellLevel = highestSpellSlotLevelForClasses(
        prev.classes,
        prev.subclassGrants
          .filter((row) => row.caster?.progression === 'third')
          .map((row) => ({
            classEntryId: row.classEntryId,
            progression: 'third' as const,
            ability: row.caster?.ability ?? null,
          })),
      )
      const classLevel =
        prev.classes.find((row) => row.id === input.classEntryId)?.level ?? 1
      const applied = applySubclassGrantToDraft({
        draft: subclassSliceFrom(prev),
        classEntryId: input.classEntryId,
        catalogId: input.selected.id,
        def: input.def,
        picks: input.picks,
        copyOldTextToNotes: input.copyOldTextToNotes,
        previousDef: input.previousDef ?? null,
        changeMode,
        classLevel,
        changedAtClassLevel: input.changedAtClassLevel ?? classLevel,
        previousNameRu: input.previousNameRu,
        previousCatalogId: input.previousCatalogId,
        previousSlug: input.previousSlug,
        maxSpellLevel,
      })
      if (!applied) return prev
      summary = applied.summary
      const withGrant = mergeSubclassSlice(prev, applied.draft)
      const row = withGrant.classes.find((item) => item.id === input.classEntryId)
      const watermark =
        input.changedAtClassLevel ??
        row?.level ??
        1
      let nextPicks = withGrant.featurePicks
      if (changeMode === 'future_only') {
        const dropIds = [
          ...listSubclassFeatureIdsAboveLevel({
            className: row?.name ?? '',
            subclassSlug: input.previousSlug ?? input.previousDef?.slug,
            minLevel: watermark,
          }),
          ...listSubclassFeatureIdsAboveLevel({
            className: row?.name ?? '',
            subclassSlug: input.def.slug,
            minLevel: watermark,
          }),
        ]
        nextPicks = clearFeaturePicksForFeatureIds(
          withGrant.featurePicks,
          input.classEntryId,
          dropIds,
        )
      } else if (changeMode === 'replace_all') {
        nextPicks = clearFeaturePicksForClass(withGrant.featurePicks, input.classEntryId)
      }
      // Battle Master: maneuvers_3 → combat_superiority (sheet archetype block / spend)
      nextPicks = bridgeManeuversIntoFeaturePicks({
        featurePicks: nextPicks,
        classEntryId: input.classEntryId,
        maneuverIds: extractManeuverIdsFromSubclassPicks(input.picks),
        mode: 'merge_missing',
      })
      return {
        ...withGrant,
        featurePicks: nextPicks,
        classes: withGrant.classes.map((item) =>
          item.id === input.classEntryId
            ? {
                ...item,
                subclass_name: input.selected.name_ru,
                subclass_catalog_id: input.selected.id,
              }
            : item,
        ),
        identity:
          withGrant.classes[0]?.id === input.classEntryId
            ? { ...withGrant.identity, subclassName: input.selected.name_ru }
            : withGrant.identity,
      }
    })
    if (summary) {
      onToast(`Архетип «${input.selected.name_ru}»: ${summary}`)
    }
    if (input.advanceWizardAfter) {
      advanceGuidedWizardAfterSubclass()
    }
  }

  function advanceGuidedWizardAfterSubclass() {
    setPausedWizardForSubclass((paused) => {
      if (paused) {
        const nextIndex = paused.index + 1
        if (nextIndex >= paused.steps.length) {
          setGuidedWizard(null)
        } else {
          setGuidedWizard({ ...paused, index: nextIndex })
        }
        return null
      }
      setGuidedWizard((prev) => {
        if (!prev) return null
        const nextIndex = prev.index + 1
        if (nextIndex >= prev.steps.length) return null
        return { ...prev, index: nextIndex }
      })
      return null
    })
  }

  function beginSubclassSelection(input: {
    classEntryId: string
    selected: CatalogEntry
    copyOldTextToNotes?: boolean
    previousDef?: SubclassGrantDef | null
    changeMode?: SubclassChangeMode | 'initial'
    changedAtClassLevel?: number
    previousNameRu?: string
    previousCatalogId?: string | null
    previousSlug?: string
    advanceWizardAfter?: boolean
  }) {
    const def = resolveSubclassDefFromCatalog({
      nameRu: input.selected.name_ru,
      slug: input.selected.slug,
      catalogData: input.selected.data,
    })
    if (!def) {
      patchClass(input.classEntryId, {
        subclass_name: input.selected.name_ru,
        subclass_catalog_id: input.selected.id,
      })
      onToast(`Архетип «${input.selected.name_ru}» без пакета грантов — только имя`)
      if (input.advanceWizardAfter) advanceGuidedWizardAfterSubclass()
      return
    }
    if (subclassNeedsSetupDialog(def)) {
      // Pause wizard so archetype forks open in SubclassSetup alone (same as
      // background setup — avoids stacking under the wizard at z-index 50).
      if (input.advanceWizardAfter && guidedWizard) {
        setPausedWizardForSubclass(guidedWizard)
        setGuidedWizard(null)
      }
      setSubclassSetup({
        classEntryId: input.classEntryId,
        selected: input.selected,
        def,
        copyOldTextToNotes: Boolean(input.copyOldTextToNotes),
        previousDef: input.previousDef ?? null,
        changeMode: input.changeMode,
        changedAtClassLevel: input.changedAtClassLevel,
        previousNameRu: input.previousNameRu,
        previousCatalogId: input.previousCatalogId,
        previousSlug: input.previousSlug,
        advanceWizardAfter: input.advanceWizardAfter,
      })
      return
    }
    commitSubclassGrant({
      classEntryId: input.classEntryId,
      selected: input.selected,
      def,
      picks: emptySubclassPicks(),
      copyOldTextToNotes: input.copyOldTextToNotes,
      previousDef: input.previousDef ?? null,
      changeMode: input.changeMode,
      changedAtClassLevel: input.changedAtClassLevel,
      previousNameRu: input.previousNameRu,
      previousCatalogId: input.previousCatalogId,
      previousSlug: input.previousSlug,
      advanceWizardAfter: input.advanceWizardAfter,
    })
  }

  function requestSubclassChange(classEntryId: string, selected: CatalogEntry) {
    const existing = draft.subclassGrants.find((row) => row.classEntryId === classEntryId)
    const transition = draft.subclassTransitions.find(
      (row) => row.classEntryId === classEntryId,
    )
    const row = draft.classes.find((item) => item.id === classEntryId)
    const currentCatalogId =
      row?.subclass_catalog_id ||
      transition?.activeCatalogId ||
      existing?.catalogId ||
      null
    if (currentCatalogId && currentCatalogId !== selected.id) {
      const previousSlug =
        transition?.mode === 'future_only'
          ? transition.previousSlug || existing?.slug || ''
          : existing?.slug || transition?.previousSlug || ''
      const previousDef = resolveSubclassDefFromCatalog({
        nameRu: row?.subclass_name || existing?.slug || '',
        slug: existing?.slug || previousSlug,
        catalogData: null,
        parentSlug: existing?.parentSlug,
      })
      setSubclassChange({
        classEntryId,
        selected,
        def:
          resolveSubclassDefFromCatalog({
            nameRu: selected.name_ru,
            slug: selected.slug,
            catalogData: selected.data,
          }) ??
          ({
            slug: selected.slug,
            labelRu: selected.name_ru,
            nameEn: selected.name_en ?? '',
            parentSlug: '',
            grantsLevel: 3,
            source: 'phb',
            sheetGrants: {
              armor: [],
              weapons: { simple: false, martial: false, extras: [] },
              toolsFixed: [],
              skillsFixed: [],
              languagesFixed: [],
              skillChoices: null,
              languageChoices: null,
              caster: null,
            },
            choices: [],
            alwaysPreparedSpells: [],
            featuresByLevel: {},
          } satisfies SubclassGrantDef),
        fromName: row?.subclass_name || existing?.slug || '',
        textSnippets: collectGrantTextSnippets({ def: previousDef, grant: existing ?? null }),
        previousDef,
        previousSlug: existing?.slug || previousSlug,
        previousCatalogId: existing?.catalogId ?? null,
        classLevel: row?.level ?? 1,
      })
      return
    }
    beginSubclassSelection({ classEntryId, selected })
  }

  function applyHomebrewSubclass(classEntryId: string, name: string) {
    setDraft((prev) => {
      const cleared = revokeSubclassGrant(subclassSliceFrom(prev), classEntryId, {
        copyTextToNotes: true,
      })
      const merged = mergeSubclassSlice(prev, cleared)
      return {
        ...merged,
        featurePicks: clearFeaturePicksForClass(merged.featurePicks, classEntryId),
        classes: merged.classes.map((row) =>
          row.id === classEntryId
            ? { ...row, subclass_name: name, subclass_catalog_id: null }
            : row,
        ),
        identity:
          merged.classes[0]?.id === classEntryId
            ? { ...merged.identity, subclassName: name }
            : merged.identity,
      }
    })
    onToast(`Хомбрю-архетип «${name}»: только имя на листе`)
  }

  function mergeGrantSlice(prev: Draft, slice: ClassGrantDraftSlice): Draft {
    const focusSpells = withSpellFocusFlags(prev.spells, slice.inventory.items)
    const isWizard = prev.classes.some((row) =>
      /волшебник|wizard|маг/i.test(row.name),
    )
    const synced = syncWizardSpellbookWithInventory({
      isWizard,
      spells: focusSpells,
      items: slice.inventory.items,
    })
    const merged: Draft = {
      ...prev,
      identity: slice.identity,
      saves: slice.saves,
      skills: slice.skills,
      classGrants: slice.classGrants,
      hpMax: slice.hpMax,
      hpCurrent: slice.hpCurrent,
      inventory: slice.inventory,
      weapons: slice.weapons,
      spells: synced.spells,
      play: {
        ...prev.play,
        hitDie: slice.playHitDie,
      },
    }
    if (synced.message) {
      queueMicrotask(() => onToast(synced.message!))
    }
    const restored = reapplyRaceOverlays(raceSliceFrom(merged), {
      characterLevel: totalCharacterLevel(merged.classes),
      hasCasterClass: characterHasCasterClass(merged.classes),
      raceLabelRu: merged.raceName,
    })
    return mergeRaceSlice(merged, restored)
  }

  function mergeRaceSlice(prev: Draft, slice: RaceGrantDraftSlice): Draft {
    const merged: Draft = {
      ...prev,
      identity: slice.identity,
      skills: slice.skills,
      abilities: slice.abilities,
      speed: slice.speed,
      climbSpeed: slice.climbSpeed,
      swimSpeed: slice.swimSpeed,
      flySpeed: slice.flySpeed,
      textBlocks: slice.textBlocks,
      weapons: slice.weapons,
      // Race spells replace known list — re-attach focus flags from current inventory.
      spells: withSpellFocusFlags(slice.spells, prev.inventory.items),
      raceGrant: slice.raceGrant,
    }
    const restoredBg = reapplyBackgroundOverlays(backgroundSliceFrom(merged))
    return mergeBackgroundSlice(merged, restoredBg)
  }

  function grantModeForClassRow(prev: Draft, classEntryId: string): 'start' | 'multiclass' {
    const existing = prev.classGrants.find((row) => row.classEntryId === classEntryId)
    if (existing) return existing.mode
    if (prev.classes.length <= 1) return 'start'
    const index = prev.classes.findIndex((row) => row.id === classEntryId)
    return index <= 0 ? 'start' : 'multiclass'
  }

  function applyFeaturePicksWithExpertise(featurePicks: FeaturePicksState) {
    setDraft((prev) => {
      const sanitized = sanitizeFeaturePicksForPactBoons({
        featurePicks,
        classes: prev.classes,
      })
      const unlocked = unlockFeaturesForClasses({
        classes: prev.classes,
        characterLevel: totalCharacterLevel(prev.classes),
        abilities: prev.abilities,
        subclassSlugByEntryId: subclassSlugMapFromLedger(prev),
        subclassTransitionByEntryId: subclassTransitionMapFromLedger(
          prev.subclassTransitions,
        ),
      })
      const keys = listUnlockedExpertiseKeys(unlocked)
      return {
        ...prev,
        featurePicks: sanitized,
        skills: syncSkillsExpertiseFromPicks({
          skills: prev.skills,
          featurePicks: sanitized,
          expertiseKeys: keys,
        }),
      }
    })
    setGuidedWizard((prev) => {
      if (!prev) return null
      const step = prev.steps[prev.index]
      if (
        !step ||
        (step.kind !== 'feature_choice' && step.kind !== 'pact_tome_cantrips')
      ) {
        return prev
      }
      const classRow = draft.classes.find((row) => row.id === step.classEntryId)
      if (!classRow) return prev
      const sanitized = sanitizeFeaturePicksForPactBoons({
        featurePicks,
        classes: draft.classes,
      })
      const nextSteps = withPactTomeCantripsStep(prev.steps, {
        classEntryId: step.classEntryId,
        className: classRow.name,
        classLevel: classRow.level,
        featurePicks: sanitized,
      })
      if (nextSteps === prev.steps) return prev
      return { ...prev, steps: nextSteps }
    })
  }

  function openGuidedWizard(session: GuidedWizardSession) {
    setIdentityOpen(false)
    if (session.steps.length === 0) {
      setGuidedWizard(null)
      return
    }
    setGuidedWizard({ ...session, index: Math.min(session.index, session.steps.length - 1) })
  }

  function jumpDraftToClassLevel(prev: Draft, classEntryId: string, targetLevel: number): Draft {
    const level = clampCharacterLevel(targetLevel)
    const nextClasses = prev.classes.map((row) =>
      row.id === classEntryId ? { ...row, level } : row,
    )
    const conMod = abilityModifier(prev.abilities.con)
    const hpBuilt = buildMaxHpByLevels({
      classes: nextClasses.map((row) => ({ name: row.name, level: row.level })),
      constitutionMod: conMod,
    })
    const hitDiceByClass = syncHitDicePools({
      classes: nextClasses,
      previous: prev.play.hitDiceByClass,
    })
    const totalLevel = totalCharacterLevel(nextClasses)
    return {
      ...prev,
      classes: nextClasses,
      hpMax: hpBuilt?.total ?? prev.hpMax,
      hpCurrent: hpBuilt?.total ?? prev.hpCurrent,
      identity: {
        ...prev.identity,
        experience: xpToReachLevel(totalLevel),
      },
      play: withSyncedHitDiceSummary({
        ...prev.play,
        hitDiceByClass,
      }),
    }
  }

  function buildChoiceStepsForClass(input: {
    classEntryId: string
    classLevel: number
    /** When set, queue all incomplete picks with feature.level ≤ max (start at N). */
    upToLevel?: number
    featurePicks?: FeaturePicksState
    classAsi?: AppliedClassAsi[]
    unlocked?: typeof unlockedFeatures
    hasSubclass?: Record<string, boolean>
    /** Create flow: insert background before Expertise / ASI. */
    includeBackground?: boolean
    hasBackgroundGrant?: boolean
  }): GuidedWizardStep[] {
    const maxLevel = input.upToLevel ?? input.classLevel
    let steps = buildPendingWizardSteps({
      unlocked: input.unlocked ?? unlockedFeatures,
      featurePicks: input.featurePicks ?? draft.featurePicks,
      classAsi: input.classAsi ?? draft.classAsi,
      filter:
        maxLevel > input.classLevel || input.upToLevel != null
          ? {
              mode: 'up_to_class_level',
              classEntryId: input.classEntryId,
              maxClassLevel: maxLevel,
            }
          : {
              mode: 'at_class_level',
              classEntryId: input.classEntryId,
              classLevel: input.classLevel,
            },
      hasSubclassByEntryId: input.hasSubclass ?? hasSubclassByEntryId,
    })
    steps = withBackgroundStepIfNeeded(steps, {
      include: Boolean(input.includeBackground) && !input.hasBackgroundGrant,
    })
    const classRow = draft.classes.find((row) => row.id === input.classEntryId)
    if (classRow && isWizardClassName(classRow.name)) {
      const wizardLevel = Math.max(1, maxLevel)
      const freeLeft = remainingFreeSpellbookSlots(draft.spells.known, wizardLevel)
      if (freeLeft > 0) {
        steps = withWizardSpellbookPicksStep(steps, {
          classEntryId: input.classEntryId,
          className: classRow.name,
          classLevel: wizardLevel,
          picksNeeded:
            input.upToLevel != null
              ? freeLeft
              : wizardLevel <= 1
                ? Math.min(6, freeLeft)
                : Math.min(freeBookSlotsAtLevel(wizardLevel), freeLeft),
        })
      }
    }
    if (classRow) {
      steps = withPactTomeCantripsStep(steps, {
        classEntryId: input.classEntryId,
        className: classRow.name,
        classLevel: Math.max(1, maxLevel),
        featurePicks: input.featurePicks ?? draft.featurePicks,
      })
    }
    return steps
  }

  function commitClassGrant(input: {
    classEntryId: string
    className: string
    mode: 'start' | 'multiclass'
    picks: ClassGrantPicks
    def?: ClassGrantDef | null
    catalogSlug?: string | null
    catalogData?: Record<string, unknown> | null
  }) {
    let summary: string | null = null
    setDraft((prev) => {
      const applied = applyClassGrantToDraft({
        draft: draftSliceFrom(prev),
        classEntryId: input.classEntryId,
        className: input.className,
        mode: input.mode,
        picks: input.picks,
        def: input.def,
        catalogSlug: input.catalogSlug,
        catalogData: input.catalogData,
      })
      if (!applied) return prev
      summary = applied.summary
      return mergeGrantSlice(prev, applied.draft)
    })
    if (summary) {
      onToast(
        `${input.mode === 'start' ? 'Старт' : 'Мультикласс'} «${input.className}»: ${summary}`,
      )
    }
  }

  function requestOrApplyClassGrant(input: {
    classEntryId: string
    className: string
    mode: 'start' | 'multiclass'
    catalogSlug?: string | null
    catalogData?: Record<string, unknown> | null
    /** When setDraft for the class row hasn't flushed yet (MC / catalog pick). */
    classesOverride?: ClassLevelEntry[]
  }) {
    const def = resolveClassGrantDef({
      className: input.className,
      catalogSlug: input.catalogSlug,
      catalogData: input.catalogData,
    })
    if (!def) {
      onToast(`Класс «${input.className}» пока без пакета владений — выставь вручную`)
      return
    }
    const baseClasses = input.classesOverride ?? draft.classes
    const classRow = baseClasses.find((row) => row.id === input.classEntryId)
    const classLevel = classRow?.level ?? 1
    // Имя класса могло только что смениться в setDraft — для unlock берём input.className.
    const classesForUnlock = baseClasses.map((row) =>
      row.id === input.classEntryId ? { ...row, name: input.className } : row,
    )
    const unlockedForGrant = unlockFeaturesForClasses({
      classes: classesForUnlock,
      characterLevel: totalCharacterLevel(classesForUnlock),
      abilities: draft.abilities,
      subclassSlugByEntryId,
      subclassTransitionByEntryId,
    })
    // Feature/ASI picks only — background is prepended before class_grant when needed.
    const choiceSteps = buildChoiceStepsForClass({
      classEntryId: input.classEntryId,
      classLevel,
      unlocked: unlockedForGrant,
    })
    if (grantNeedsSetupDialog(def, input.mode)) {
      // Background first (if missing), then class_grant; after confirm rebuild choices.
      const classGrantStep: GuidedWizardStep = {
        id: `class_grant:${input.classEntryId}`,
        kind: 'class_grant',
        classEntryId: input.classEntryId,
        className: input.className,
        mode: input.mode,
      }
      openGuidedWizard({
        steps: withBackgroundStepIfNeeded(
          [
            classGrantStep,
            ...(input.mode === 'start' && pendingStartingLevel > 1 ? [] : choiceSteps),
          ],
          {
            include: input.mode === 'start' && !draft.backgroundGrant,
          },
        ),
        index: 0,
        grant: {
          def,
          catalogSlug: input.catalogSlug ?? null,
          catalogData: input.catalogData ?? null,
        },
      })
      return
    }
    commitClassGrant({
      classEntryId: input.classEntryId,
      className: input.className,
      mode: input.mode,
      picks: { skills: [], tools: [], equipmentPackageId: null },
      def,
      catalogSlug: input.catalogSlug,
      catalogData: input.catalogData,
    })
    if (input.mode === 'start' && pendingStartingLevel > 1) {
      let remaining: GuidedWizardStep[] = []
      setDraft((prev) => {
        const jumped = jumpDraftToClassLevel(prev, input.classEntryId, pendingStartingLevel)
        const unlocked = unlockFeaturesForClasses({
          classes: jumped.classes,
          characterLevel: totalCharacterLevel(jumped.classes),
          abilities: jumped.abilities,
          subclassSlugByEntryId: subclassSlugMapFromLedger(jumped),
          subclassTransitionByEntryId: subclassTransitionMapFromLedger(
            jumped.subclassTransitions,
          ),
        })
        const hasSubclass: Record<string, boolean> = {}
        for (const row of jumped.classes) {
          hasSubclass[row.id] = Boolean(row.subclass_catalog_id || row.subclass_name.trim())
        }
        // Background already done (or was earlier in queue) — only feature/ASI picks.
        remaining = buildPendingWizardSteps({
          unlocked,
          featurePicks: jumped.featurePicks,
          classAsi: jumped.classAsi,
          filter: {
            mode: 'up_to_class_level',
            classEntryId: input.classEntryId,
            maxClassLevel: pendingStartingLevel,
          },
          hasSubclassByEntryId: hasSubclass,
        })
        return jumped
      })
      setPendingStartingLevel(1)
      onCreateGuideConsumed?.()
      onToast(`Старт с ${pendingStartingLevel} ур. — пройди выборы умений`)
      openGuidedWizard({ steps: remaining, index: 0 })
      return
    }
    if (choiceSteps.length > 0) {
      openGuidedWizard({
        steps: withBackgroundStepIfNeeded(choiceSteps, {
          include: input.mode === 'start' && !draft.backgroundGrant,
        }),
        index: 0,
      })
    } else if (input.mode === 'start' && !draft.backgroundGrant) {
      openGuidedWizard({ steps: [backgroundWizardStep()], index: 0 })
    }
  }

  function applyHomebrewClass(classEntryId: string, name: string) {
    setDraft((prev) => {
      const cleared = revokeClassGrant(draftSliceFrom(prev), classEntryId)
      const merged = mergeGrantSlice(prev, cleared)
      return {
        ...merged,
        classes: merged.classes.map((row) =>
          row.id === classEntryId
            ? { ...row, name, catalog_id: null }
            : row,
        ),
        identity:
          merged.classes[0]?.id === classEntryId
            ? merged.identity
            : merged.identity,
      }
    })
    onToast(`Хомбрю-класс «${name}»: название на листе. Остальное заполни сам.`)
  }

  function commitRaceGrant(input: {
    selected: CatalogEntry
    picks: RaceGrantPicks
    def?: RaceGrantDef | null
    featResult?: import('./FeatSetupDialog').FeatSetupResult | null
  }) {
    let summary: string | null = null
    let incompleteExpertise: GuidedWizardStep[] = []
    setDraft((prev) => {
      const clearedFeats = prev.raceCatalogId
        ? revokeFeatGrantsForRace({
            draft: featSliceFrom(prev),
            raceCatalogId: prev.raceCatalogId,
          })
        : featSliceFrom(prev)
      const base = mergeFeatSlice(prev, clearedFeats)
      const applied = applyRaceGrantToDraft({
        draft: raceSliceFrom(base),
        selected: input.selected,
        picks: input.picks,
        def: input.def,
        characterLevel: totalCharacterLevel(base.classes),
        hasCasterClass: characterHasCasterClass(base.classes),
      })
      if (!applied) return prev
      summary = applied.summary
      let next: Draft = {
        ...mergeRaceSlice(base, applied.draft),
        raceName: input.selected.name_ru,
        raceCatalogId: input.selected.id,
      }
      if (input.featResult) {
        const grant: AppliedFeatGrant = {
          id: newFeatGrantId(),
          featCatalogId: input.featResult.entry.id,
          slug: input.featResult.entry.slug,
          nameRu: input.featResult.entry.name_ru,
          source: {
            kind: 'race',
            raceCatalogId: input.selected.id,
            raceSlug: input.selected.slug,
          },
          applied: input.featResult.applied,
          picks: input.featResult.picks,
        }
        next = mergeFeatSlice(
          next,
          applyFeatGrantToDraft({ draft: featSliceFrom(next), grant }),
        )
        summary = summary
          ? `${summary}; черта «${grant.nameRu}»`
          : `черта «${grant.nameRu}»`
      }
      const unlocked = unlockFeaturesForClasses({
        classes: next.classes,
        characterLevel: totalCharacterLevel(next.classes),
        abilities: next.abilities,
        subclassSlugByEntryId: subclassSlugMapFromLedger(next),
        subclassTransitionByEntryId: subclassTransitionMapFromLedger(
          next.subclassTransitions,
        ),
      })
      const hasSubclass: Record<string, boolean> = {}
      for (const row of next.classes) {
        hasSubclass[row.id] = Boolean(row.subclass_catalog_id || row.subclass_name.trim())
      }
      incompleteExpertise = buildPendingWizardSteps({
        unlocked,
        featurePicks: next.featurePicks,
        classAsi: next.classAsi,
        filter: { mode: 'all_empty' },
        hasSubclassByEntryId: hasSubclass,
      }).filter(
        (step) =>
          step.kind === 'feature_choice' &&
          step.choice.options_from === 'expertise_skills_tools',
      )
      return next
    })
    if (summary) onToast(`Раса «${input.selected.name_ru}»: ${summary}`)
    const featNote = input.def?.featNoteRu ?? null
    const followUp: GuidedWizardStep[] = [...incompleteExpertise]
    if (featNote) {
      followUp.push(featWizardStep({ noteRu: featNote }))
    }
    // Довыбор Expertise + черта с 1 ур. (человек и др.), если ещё в мастере.
    if (followUp.length > 0 && !guidedWizard) {
      openGuidedWizard({ steps: followUp, index: 0 })
    }
  }

  async function requestOrApplyRaceGrant(selected: CatalogEntry) {
    if (!isRaceComboboxRoot(selected)) {
      onToast(`«${selected.name_ru}» — выбери корневую расу; подраса будет в попапе`)
      return
    }
    const rootDef = resolveRaceGrantDef({
      raceName: selected.name_ru,
      catalogSlug: selected.slug,
      catalogData: selected.data,
      nameRu: selected.name_ru,
    })
    if (!rootDef) {
      onToast(`Раса «${selected.name_ru}» пока без пакета эффектов — выставь вручную`)
      setDraft((prev) => ({
        ...prev,
        raceName: selected.name_ru,
        raceCatalogId: selected.id,
      }))
      return
    }

    let allRaces = raceCatalogCacheRef.current
    if (!allRaces) {
      try {
        allRaces = await listCatalogEntries({
          kind: 'race',
          edition: rulesEdition,
        })
        raceCatalogCacheRef.current = allRaces
      } catch {
        onToast('Не удалось загрузить справочник рас — попробуй ещё раз')
        return
      }
    }

    const subraces = allRaces
      .filter((row) => row.parent_id === selected.id)
      .sort((a, b) => a.sort_order - b.sort_order || a.name_ru.localeCompare(b.name_ru, 'ru'))
    const subraceRequired = raceSubraceRequired(selected.data)

    if (subraces.length > 0 || raceGrantNeedsSetupDialog(rootDef)) {
      setIdentityOpen(false)
      setRaceGrantPicker({
        root: selected,
        subraces,
        subraceRequired,
      })
      return
    }

    commitRaceGrant({
      selected,
      picks: emptyRacePicks(),
      def: rootDef,
    })
  }

  function applyHomebrewRace(name: string) {
    setDraft((prev) => {
      const cleared = revokeRaceGrant(raceSliceFrom(prev))
      return {
        ...mergeRaceSlice(prev, cleared),
        raceName: name,
        raceCatalogId: null,
      }
    })
    onToast(`Хомбрю-раса «${name}»: название на листе. Остальное заполни сам.`)
  }

  function resumeWizardAfterBackground() {
    setPausedWizardForBackground((paused) => {
      if (!paused) return null
      const bgIndex = paused.steps.findIndex((step) => step.kind === 'background')
      const nextIndex = bgIndex >= 0 ? bgIndex + 1 : paused.index + 1
      if (nextIndex >= paused.steps.length) {
        onToast('Теперь выбери класс — навыки предыстории уже на листе, дубли не предложим')
        setGuidedWizard(null)
        return null
      }
      setGuidedWizard({ ...paused, index: nextIndex })
      return null
    })
  }

  function commitBackgroundGrant(input: {
    selected: CatalogEntry
    picks: BackgroundGrantPicks
    def?: BackgroundGrantDef | null
  }) {
    let summary: string | null = null
    let incompleteExpertise: GuidedWizardStep[] = []
    const grantedFeatSlug = grantedFeatSlugFromCatalog(input.selected)
    setDraft((prev) => {
      const prevSlug = prev.identity.backgroundSlug
      let base: Draft = prev
      if (prevSlug && prevSlug !== input.selected.slug) {
        base = mergeFeatSlice(
          base,
          revokeFeatGrantsForBackground({
            draft: featSliceFrom(base),
            backgroundSlug: prevSlug,
          }),
        )
      }
      const applied = applyBackgroundGrantToDraft({
        draft: backgroundSliceFrom(base),
        selected: input.selected,
        picks: input.picks,
        def: input.def,
      })
      if (!applied) return prev
      summary = applied.summary
      const backgroundMerged = mergeBackgroundSlice(base, applied.draft)
      const merged = {
        ...backgroundMerged,
        backgroundCatalogId: input.selected.id,
        identity: {
          ...backgroundMerged.identity,
          background: input.selected.name_ru,
          backgroundSlug: input.selected.slug,
        },
      }
      // Довыбор Expertise после фона (если ещё не выбрана) — навыки фона уже в пуле.
      if (!pausedWizardForBackground) {
        const unlocked = unlockFeaturesForClasses({
          classes: merged.classes,
          characterLevel: totalCharacterLevel(merged.classes),
          abilities: merged.abilities,
          subclassSlugByEntryId: subclassSlugMapFromLedger(merged),
          subclassTransitionByEntryId: subclassTransitionMapFromLedger(
            merged.subclassTransitions,
          ),
        })
        const hasSubclass: Record<string, boolean> = {}
        for (const row of merged.classes) {
          hasSubclass[row.id] = Boolean(row.subclass_catalog_id || row.subclass_name.trim())
        }
        incompleteExpertise = buildPendingWizardSteps({
          unlocked,
          featurePicks: merged.featurePicks,
          classAsi: merged.classAsi,
          filter: { mode: 'all_empty' },
          hasSubclassByEntryId: hasSubclass,
        }).filter(
          (step) =>
            step.kind === 'feature_choice' &&
            step.choice.options_from === 'expertise_skills_tools',
        )
      }
      return merged
    })
    if (summary) onToast(`Предыстория «${input.selected.name_ru}»: ${summary}`)
    if (pausedWizardForBackground) {
      resumeWizardAfterBackground()
      return
    }
    if (incompleteExpertise.length > 0 && !guidedWizard) {
      openGuidedWizard({ steps: incompleteExpertise, index: 0 })
    }
    if (
      grantedFeatSlug &&
      !draft.featGrants.some((row) => row.slug === grantedFeatSlug)
    ) {
      setBackgroundFeatSlug(grantedFeatSlug)
    }
  }

  async function requestOrApplyBackgroundGrant(selected: CatalogEntry) {
    if (!isBackgroundComboboxRoot(selected)) {
      onToast(
        `«${selected.name_ru}» — выбери корневую предысторию; вариант будет в попапе`,
      )
      return
    }

    let allBackgrounds = backgroundCatalogCacheRef.current
    if (!allBackgrounds) {
      try {
        allBackgrounds = await listCatalogEntries({
          kind: 'background',
          edition: rulesEdition,
        })
        backgroundCatalogCacheRef.current = allBackgrounds
      } catch {
        onToast('Не удалось загрузить справочник предысторий — попробуй ещё раз')
        return
      }
    }

    const variants = backgroundVariantsForRoot(selected, allBackgrounds)
    const def = resolveBackgroundGrantDef({
      backgroundName: selected.name_ru,
      catalogSlug: selected.slug,
      catalogData: selected.data,
      nameRu: selected.name_ru,
    })
    if (!def) {
      onToast(
        `Предыстория «${selected.name_ru}» пока без пакета эффектов — выставь вручную`,
      )
      setDraft((prev) => {
        const cleared = revokeBackgroundGrant(backgroundSliceFrom(prev))
        return {
          ...mergeBackgroundSlice(prev, cleared),
          identity: { ...cleared.identity, background: selected.name_ru },
          backgroundCatalogId: selected.id,
        }
      })
      resumeWizardAfterBackground()
      return
    }

    if (variants.length > 0 || backgroundGrantNeedsSetupDialog(def)) {
      setIdentityOpen(false)
      setBackgroundGrantPicker({ root: selected, variants })
      return
    }

    commitBackgroundGrant({
      selected,
      picks: emptyBackgroundPicks(),
      def,
    })
  }

  function applyHomebrewBackground(name: string) {
    setDraft((prev) => {
      const cleared = revokeBackgroundGrant(backgroundSliceFrom(prev))
      let merged = mergeBackgroundSlice(prev, cleared)
      const prevSlug = prev.identity.backgroundSlug
      if (prevSlug) {
        merged = mergeFeatSlice(
          merged,
          revokeFeatGrantsForBackground({
            draft: featSliceFrom(merged),
            backgroundSlug: prevSlug,
          }),
        )
      }
      return {
        ...merged,
        identity: { ...merged.identity, background: name, backgroundSlug: null },
        backgroundCatalogId: null,
      }
    })
    onToast(
      `Хомбрю-предыстория «${name}»: название на листе. Остальное заполни сам.`,
    )
  }

  function applyLevelUp(choice: LevelUpChoice) {
    if (totalCharacterLevel(draft.classes) >= 20) return

    const existedBefore =
      choice.type === 'multiclass'
        ? draft.classes.some(
            (row) => row.name.trim().toLowerCase() === choice.name.trim().toLowerCase(),
          )
        : true

    const nextClasses =
      choice.type === 'same'
        ? bumpClassLevel(draft.classes, choice.classId)
        : addMulticlassLevel(draft.classes, {
            name: choice.name,
            catalog_id: choice.catalog_id,
          })
    const newMulticlassRow =
      choice.type === 'multiclass' && !existedBefore
        ? nextClasses.find(
            (row) => row.name.trim().toLowerCase() === choice.name.trim().toLowerCase(),
          ) ?? null
        : null

    const nextLevel = totalCharacterLevel(nextClasses)
    const gain = Math.max(0, Math.floor(choice.hpGain))
    const leveledRow =
      choice.type === 'same'
        ? nextClasses.find((row) => row.id === choice.classId) ?? null
        : newMulticlassRow ??
          nextClasses.find(
            (row) => row.name.trim().toLowerCase() === choice.name.trim().toLowerCase(),
          ) ??
          null

    setDraft((prev) => {
      const toughBonus = sumFeatHpPerLevel(prev.featGrants)
      const prevMax = prev.hpMax
      const nextMax = prevMax == null ? gain + toughBonus : prevMax + gain + toughBonus
      const prevCurrent = prev.hpCurrent
      const nextCurrent =
        prevCurrent == null ? nextMax : Math.min(nextMax, prevCurrent + gain + toughBonus)
      const hitDiceByClass = syncHitDicePools({
        classes: nextClasses,
        previous: prev.play.hitDiceByClass,
      })
      const withClasses: Draft = {
        ...prev,
        classes: nextClasses,
        hpMax: nextMax,
        hpCurrent: nextCurrent,
        play: withSyncedHitDiceSummary({
          ...prev.play,
          hitDiceByClass,
          hitDie: choice.hitDie ?? prev.play.hitDie,
        }),
      }
      const withFeatPools = mergeFeatSlice(
        withClasses,
        syncFeatProficiencyResources({
          ...featSliceFrom(withClasses),
          totalLevel: nextLevel,
        }),
      )
      const withRaceSpells = !withFeatPools.raceGrant
        ? withFeatPools
        : {
            ...withFeatPools,
            spells: syncRaceSpellsForSheetState({
              spells: withFeatPools.spells,
              grant: withFeatPools.raceGrant,
              characterLevel: nextLevel,
              hasCasterClass: characterHasCasterClass(nextClasses),
              raceLabelRu: withFeatPools.raceName,
            }),
          }
      const slotCap = highestSpellSlotLevelForClasses(
        nextClasses,
        withRaceSpells.subclassGrants
          .filter((row) => row.caster?.progression === 'third')
          .map((row) => ({
            classEntryId: row.classEntryId,
            progression: 'third' as const,
            ability: row.caster?.ability ?? null,
          })),
      )
      const syncedSubclass = syncSubclassAlwaysPreparedSpells({
        draft: subclassSliceFrom(withRaceSpells),
        maxSpellLevel: slotCap,
      })
      return mergeSubclassSlice(withRaceSpells, syncedSubclass)
    })
    setLevelUpOpen(false)
    const hpNote = ` · HP +${Math.max(0, Math.floor(choice.hpGain))}`
    onToast(
      choice.type === 'same'
        ? `Уровень класса +1${hpNote}`
        : `Мультикласс: ${choice.name.trim()} 1${hpNote}`,
    )

    if (newMulticlassRow) {
      requestOrApplyClassGrant({
        classEntryId: newMulticlassRow.id,
        className: newMulticlassRow.name,
        mode: 'multiclass',
        catalogSlug: choice.type === 'multiclass' ? choice.catalog_slug : null,
        catalogData: choice.type === 'multiclass' ? choice.catalog_data : null,
        classesOverride: nextClasses,
      })
    }

    if (leveledRow && choice.type === 'same') {
      const unlocked = unlockFeaturesForClasses({
        classes: nextClasses,
        characterLevel: nextLevel,
        abilities: draft.abilities,
        subclassSlugByEntryId,
        subclassTransitionByEntryId,
      })
      const hasSubclass: Record<string, boolean> = {}
      for (const row of nextClasses) {
        hasSubclass[row.id] = Boolean(row.subclass_catalog_id || row.subclass_name.trim())
      }
      let steps = buildPendingWizardSteps({
        unlocked,
        featurePicks: draft.featurePicks,
        classAsi: draft.classAsi,
        filter: {
          mode: 'at_class_level',
          classEntryId: leveledRow.id,
          classLevel: leveledRow.level,
        },
        hasSubclassByEntryId: hasSubclass,
      })
      if (isWizardClassName(leveledRow.name) && leveledRow.level >= 2) {
        steps = withWizardSpellbookPicksStep(steps, {
          classEntryId: leveledRow.id,
          className: leveledRow.name,
          classLevel: leveledRow.level,
          picksNeeded: freeBookSlotsAtLevel(leveledRow.level),
        })
      }
      steps = withPactTomeCantripsStep(steps, {
        classEntryId: leveledRow.id,
        className: leveledRow.name,
        classLevel: leveledRow.level,
        featurePicks: draft.featurePicks,
      })
      if (
        !hasSubclass[leveledRow.id] &&
        steps.some((step) => step.kind === 'subclass')
      ) {
        onToast(
          `У «${leveledRow.name}» на ${leveledRow.level} ур. выбери архетип в развилках`,
        )
      }
      if (steps.length > 0) {
        openGuidedWizard({ steps, index: 0 })
        return
      }
      // Gear path: ClassAsiDialog (feat pick) when wizard has nothing pending.
      const asiAtLevel = unlocked.find(
        (feature) =>
          feature.classEntryId === leveledRow.id &&
          feature.source === 'class' &&
          feature.level === leveledRow.level &&
          isAsiFeature(feature),
      )
      if (
        asiAtLevel &&
        !asiAlreadyApplied(draft.classAsi, leveledRow.id, asiAtLevel.id)
      ) {
        setPendingAsi({
          classEntryId: leveledRow.id,
          className: leveledRow.name,
          classLevel: leveledRow.level,
          featureId: asiAtLevel.id,
        })
      }
    }
  }

  function confirmClassAsi(entry: AppliedClassAsi, featGrant?: AppliedFeatGrant) {
    setDraft((prev) => {
      let next: Draft = {
        ...prev,
        abilities: applyClassAsiBonuses(prev.abilities, entry.bonuses),
        classAsi: [...prev.classAsi, entry],
      }
      if (featGrant) {
        next = mergeFeatSlice(
          next,
          applyFeatGrantToDraft({ draft: featSliceFrom(next), grant: featGrant }),
        )
      }
      return next
    })
    setPendingAsi(null)
    if (featGrant) {
      onToast(`ASI → черта «${featGrant.nameRu}»`)
      return
    }
    const bits = Object.entries(entry.bonuses)
      .filter(([, amount]) => amount)
      .map(([key, amount]) => `${ABILITY_LABELS[key as AbilityKey]}+${amount}`)
    onToast(bits.length ? `ASI: ${bits.join(', ')}` : 'ASI записан')
  }

  function finishWizardQueue(prev: GuidedWizardSession) {
    const last = prev.steps[prev.index]
    if (last?.kind === 'background') {
      onToast('Теперь выбери класс — навыки предыстории уже на листе, дубли не предложим')
    } else if (last?.kind === 'feature_choice' || last?.kind === 'asi' || last?.kind === 'class_grant') {
      if (!draft.raceName.trim()) {
        onToast('Класс готов. Дальше — раса (если даст черту, мастер подскажет)')
      }
    }
    return null
  }

  function advanceGuidedWizard(nextIndex: number) {
    setGuidedWizard((prev) => {
      if (!prev) return null
      if (nextIndex >= prev.steps.length) return finishWizardQueue(prev)
      return { ...prev, index: nextIndex }
    })
  }

  function skipGuidedWizardStep() {
    setGuidedWizard((prev) => {
      if (!prev) return null
      const nextIndex = prev.index + 1
      if (nextIndex >= prev.steps.length) return finishWizardQueue(prev)
      return { ...prev, index: nextIndex }
    })
  }

  const featPassiveBonus = useMemo(
    () => sumFeatPassiveBonus(draft.featGrants),
    [draft.featGrants],
  )
  const featInitiativeBonus = useMemo(
    () => sumFeatInitiativeBonus(draft.featGrants),
    [draft.featGrants],
  )
  const featureInitiativeBonus = useMemo(
    () =>
      initiativeBonusFromFeatures({
        features: unlockedFeatures,
        abilities: draft.abilities,
      }),
    [unlockedFeatures, draft.abilities],
  )
  const raceInitiativeBonus = useMemo(
    () =>
      initiativeBonusFromRace({
        grant: draft.raceGrant,
        proficiencyBonus,
      }),
    [draft.raceGrant, proficiencyBonus],
  )
  const totalInitiativeBonus =
    featInitiativeBonus + featureInitiativeBonus + raceInitiativeBonus
  const activeFightingStyleId = useMemo(
    () =>
      findFightingStylePick(draft.featurePicks) ??
      fightingStyleFromFeatGrants(draft.featGrants),
    [draft.featurePicks, draft.featGrants],
  )
  const featureDarkvisionFt = useMemo(
    () =>
      darkvisionFtFromFeatures({
        features: unlockedFeatures,
        baseDarkvision: draft.identity.darkvision,
      }),
    [unlockedFeatures, draft.identity.darkvision],
  )

  const passives = useMemo(() => {
    const modFor = (skillKey: string) => {
      const def = SKILL_DEFS.find((skill) => skill.key === skillKey)
      if (!def) return 0
      const state = draft.skills[skillKey]
      return skillModifierFromState({
        abilityMod: abilityModifier(draft.abilities[def.base]),
        proficiencyBonus,
        isProficient: state.is_proficient,
        isExpertise: state.is_expertise,
      })
    }
    return {
      perception: passiveScore(modFor('perception')) + featPassiveBonus,
      investigation: passiveScore(modFor('investigation')) + featPassiveBonus,
      insight: passiveScore(modFor('insight')),
    }
  }, [draft.abilities, draft.skills, proficiencyBonus, featPassiveBonus])

  const auraSaveBonus = useMemo(
    () =>
      saveBonusFromFeatures({
        features: unlockedFeatures,
        abilities: draft.abilities,
      }),
    [unlockedFeatures, draft.abilities],
  )

  const gearEffects = useMemo(
    () =>
      aggregateGearEffects({
        items: draft.inventory.items,
        attunements: draft.attunements,
      }),
    [draft.inventory.items, draft.attunements],
  )

  const armorPiecesForSpeed = useMemo(
    () => equippedArmorPieces(draft.inventory.items),
    [draft.inventory.items],
  )
  const displaySpeed = useMemo(() => {
    const wearingHeavy = armorPiecesForSpeed.armor?.kind === 'heavy'
    const wearingArmorOrShield = Boolean(
      armorPiecesForSpeed.armor || armorPiecesForSpeed.shield,
    )
    const classBonus = classWalkSpeedBonusFt({
      classes: draft.classes,
      wearingHeavyArmor: wearingHeavy,
      wearingArmorOrShield,
    })
    const classBonusMax = classWalkSpeedBonusFt({
      classes: draft.classes,
      wearingHeavyArmor: false,
      wearingArmorOrShield: false,
    })
    return resolveWalkSpeedFt({
      storedSpeed: draft.speed,
      raceSpeed: draft.raceGrant?.speed ?? null,
      classBonusFt: classBonus,
      classBonusFtMax: classBonusMax,
      featBonusFt: featSpeedBonusFt,
      gearBonusFt: gearEffects.speedBonusFt,
    })
  }, [
    armorPiecesForSpeed,
    draft.classes,
    draft.speed,
    draft.raceGrant?.speed,
    featSpeedBonusFt,
    gearEffects.speedBonusFt,
  ])
  const classSpeedHint = useMemo(() => {
    const wearingHeavy = armorPiecesForSpeed.armor?.kind === 'heavy'
    const wearingArmorOrShield = Boolean(
      armorPiecesForSpeed.armor || armorPiecesForSpeed.shield,
    )
    const classBonus = classWalkSpeedBonusFt({
      classes: draft.classes,
      wearingHeavyArmor: wearingHeavy,
      wearingArmorOrShield,
    })
    const bits: string[] = []
    if (featSpeedBonusFt) bits.push(`черта +${featSpeedBonusFt}`)
    if (classBonus) bits.push(`класс +${classBonus}`)
    if (gearEffects.speedBonusFt) {
      bits.push(
        `предметы ${gearEffects.speedBonusFt >= 0 ? '+' : ''}${gearEffects.speedBonusFt}`,
      )
    }
    return bits.length ? bits.join(', ') : null
  }, [armorPiecesForSpeed, draft.classes, featSpeedBonusFt, gearEffects.speedBonusFt])

  const attunedItemIds = useMemo(
    () =>
      new Set(
        draft.attunements
          .map((slot) => slot.item_id)
          .filter((id): id is string => Boolean(id)),
      ),
    [draft.attunements],
  )

  // Live sources only (class/archetype + active inventory). Baked sheet.max_score
  // is written on save from this resolve — so unequipping an artifact drops the cap.
  const abilityCeilings = useMemo(
    () =>
      resolveAbilityMaxes({
        classes: draft.classes,
        inventoryItems: draft.inventory.items.map((item) => {
          const extra = item as InventoryItem & {
            item_kind?: string
            magic_mods?: Record<string, unknown> | null
            artifact_snapshot?: Record<string, unknown> | null
          }
          return {
            id: item.id,
            name: item.name,
            qty: item.qty,
            equipped: item.equipped,
            item_kind: extra.item_kind ?? 'other',
            requires_attunement: item.requires_attunement,
            magic_mods: extra.magic_mods ?? null,
            artifact_snapshot: extra.artifact_snapshot ?? null,
          }
        }),
        attunedItemIds,
      }),
    [draft.classes, draft.inventory.items, attunedItemIds],
  )

  // Keep gear-granted companions / charge pools / spells / slot deltas in sync.
  useEffect(() => {
    setDraft((prev) => {
      const resources = syncGearResources(prev.play.resources, gearEffects)
      const companions = syncGearCompanions(prev.companions, gearEffects)
      const spells = syncGearGrantSpells(prev.spells, gearEffects)
      const sameRes =
        resources.length === prev.play.resources.length &&
        resources.every((row, index) => {
          const cur = prev.play.resources[index]
          return (
            cur &&
            cur.id === row.id &&
            cur.max === row.max &&
            cur.name === row.name &&
            cur.reset === row.reset
          )
        })
      const sameComp =
        companions.length === prev.companions.length &&
        companions.every((row, index) => prev.companions[index]?.id === row.id)
      const sameSpells =
        spells.known.length === prev.spells.known.length &&
        spells.known.every((row, index) => prev.spells.known[index]?.id === row.id) &&
        JSON.stringify(spells.gear_slot_deltas ?? {}) ===
          JSON.stringify(prev.spells.gear_slot_deltas ?? {}) &&
        [1, 2, 3, 4, 5, 6, 7, 8, 9].every((level) => {
          const a = spells.slots[String(level)]
          const b = prev.spells.slots[String(level)]
          return (a?.max ?? 0) === (b?.max ?? 0)
        })
      if (sameRes && sameComp && sameSpells) return prev
      return {
        ...prev,
        companions,
        spells,
        play: { ...prev.play, resources },
      }
    })
  }, [gearEffects])

  // Gloom Stalker (etc.) bonus spells: keep always-prepared list in sync with level.
  useEffect(() => {
    setDraft((prev) => {
      const synced = syncRangerConclaveSpells({
        spells: prev.spells,
        classes: prev.classes,
        subclassSlugByEntryId,
      })
      if (!synced.changed) return prev
      return { ...prev, spells: synced.spells }
    })
  }, [draft.classes, subclassSlugByEntryId])

  // Pact of the Tome: materialize / revoke +3 any-list cantrips from feature picks.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let rows: Awaited<ReturnType<typeof ensurePactTomeSpellCatalog>> = []
      try {
        rows = await ensurePactTomeSpellCatalog(rulesEdition)
      } catch {
        rows = []
      }
      if (cancelled) return
      const options = spellOptionsForPactTomeCantrips({ spells: rows })
      setDraft((prev) => {
        const synced = syncPactTomeCantrips({
          spells: prev.spells,
          featurePicks: prev.featurePicks,
          classes: prev.classes,
          resolveSpell: (slug) => resolvePactTomeCantripFromOptions(slug, options),
        })
        if (!synced.changed) return prev
        return { ...prev, spells: synced.spells }
      })
    })()
    return () => {
      cancelled = true
    }
  }, [draft.featurePicks, draft.classes, rulesEdition])

  const infusionBonuses = useMemo(
    () =>
      aggregateInfusionBonuses({
        featurePicks: draft.featurePicks,
        classes: draft.classes,
        wearingArmor: Boolean(armorPiecesForSpeed.armor),
        wearingShield: Boolean(armorPiecesForSpeed.shield),
      }),
    [
      draft.featurePicks,
      draft.classes,
      armorPiecesForSpeed.armor,
      armorPiecesForSpeed.shield,
    ],
  )

  const effectiveDarkvisionFt = useMemo(
    () =>
      Math.max(
        featureDarkvisionFt,
        gearDarkvisionFt(gearEffects),
        infusionBonuses.darkvisionFt,
      ),
    [featureDarkvisionFt, gearEffects, infusionBonuses.darkvisionFt],
  )

  const gearAbilities = useMemo(
    () => applyGearAbilityScores(draft.abilities, gearEffects),
    [draft.abilities, gearEffects],
  )

  const formulaVarsBase = useMemo(() => {
    const mods = {
      str: abilityModifier(gearAbilities.str),
      dex: abilityModifier(gearAbilities.dex),
      con: abilityModifier(gearAbilities.con),
      int: abilityModifier(gearAbilities.int),
      wis: abilityModifier(gearAbilities.wis),
      cha: abilityModifier(gearAbilities.cha),
    }
    return buildSheetFormulaVars({
      mods,
      proficiencyBonus,
      level: characterLevel,
    })
  }, [gearAbilities, proficiencyBonus, characterLevel])

  const effectiveAbilities = useMemo(() => {
    const boosted = applyAbilityScoreBonuses(
      gearAbilities,
      draft.modifiers,
      formulaVarsBase,
    )
    return applyInfusionAbilityFloors(boosted, infusionBonuses.abilityFloor)
  }, [
    gearAbilities,
    draft.modifiers,
    formulaVarsBase,
    infusionBonuses.abilityFloor,
  ])

  const abilityCheckExtras = useMemo(() => {
    const out: Partial<Record<AbilityKey, number>> = {}
    for (const key of ABILITY_KEYS) {
      const n = abilityCheckBonus(key, draft.modifiers, formulaVarsBase)
      if (n) out[key] = n
    }
    return out
  }, [draft.modifiers, formulaVarsBase])

  const abilitySaveExtras = useMemo(() => {
    const out: Partial<Record<AbilityKey, number>> = {}
    for (const key of ABILITY_KEYS) {
      const n = abilitySaveBonus(key, draft.modifiers, formulaVarsBase)
      if (n) out[key] = n
    }
    return out
  }, [draft.modifiers, formulaVarsBase])

  const armorClass = useMemo(() => {
    const pieces = equippedArmorPieces(draft.inventory.items)
    const mods = {
      str: abilityModifier(effectiveAbilities.str),
      dex: abilityModifier(effectiveAbilities.dex),
      con: abilityModifier(effectiveAbilities.con),
      int: abilityModifier(effectiveAbilities.int),
      wis: abilityModifier(effectiveAbilities.wis),
      cha: abilityModifier(effectiveAbilities.cha),
    }
    let naturalArmor = draft.raceGrant?.naturalArmor ?? null
    // Backfill for sheets that applied the race before natural_armor was catalogued.
    if (!naturalArmor && draft.raceGrant) {
      const entry =
        raceCatalogRows.find((row) => row.id === draft.raceGrant!.raceCatalogId) ??
        raceCatalogRows.find((row) => row.slug === draft.raceGrant!.slug)
      if (entry) {
        naturalArmor =
          resolveRaceGrantDef({
            raceName: entry.name_ru,
            catalogSlug: entry.slug,
            catalogData: entry.data,
            nameRu: entry.name_ru,
          })?.naturalArmor ?? null
      }
    }
    const featNatural = naturalArmorFromFeatGrants(draft.featGrants)
    if (featNatural && (!naturalArmor || featNatural.base > naturalArmor.base)) {
      naturalArmor = featNatural
    }
    const unarmoredDefense = (() => {
      if (pieces.armor) return null
      const hasBarb = unlockedFeatures.some(
        (feature) => feature.id === 'unarmored_defense_barb',
      )
      if (hasBarb) {
        return { labelRu: 'Защита без доспехов', secondMod: 'con' as const }
      }
      const hasMonk = unlockedFeatures.some(
        (feature) => feature.id === 'unarmored_defense_monk',
      )
      if (hasMonk) {
        return { labelRu: 'Защита без доспехов', secondMod: 'wis' as const }
      }
      return null
    })()
    const withoutShield = computeArmorClass({
      dexMod: mods.dex,
      abilityMods: mods,
      armor: pieces.armor,
      shield: null,
      naturalArmor,
      unarmoredDefense,
    })
    const base = computeArmorClass({
      dexMod: mods.dex,
      abilityMods: mods,
      armor: pieces.armor,
      shield: pieces.shield,
      naturalArmor,
      unarmoredDefense,
    })
    const styleBonus = fightingStyleAcBonus({
      styleId: activeFightingStyleId,
      wearingArmor: Boolean(pieces.armor),
    })
    let coreAc = base.ac
    let gearSummary = base.summary
    if (styleBonus > 0) {
      coreAc += styleBonus
      gearSummary = `${gearSummary} · стиль +${styleBonus}`
    }
    if (gearEffects.acBonus) {
      coreAc += gearEffects.acBonus
      gearSummary = `${gearSummary} · магия +${gearEffects.acBonus}`
    }
    if (infusionBonuses.acBonus) {
      coreAc += infusionBonuses.acBonus
      gearSummary = `${gearSummary} · инфузия +${infusionBonuses.acBonus}`
    }
    const formulaVars = buildSheetFormulaVars({
      mods,
      proficiencyBonus,
      level: characterLevel,
    })
    const acBonuses = bonusesForTarget(draft.modifiers, 'ac')
    const stacked = applyBonusStack(coreAc, acBonuses, formulaVars)
    const bonusSummary = formatBonusSummary(stacked.applied)
    const summary = bonusSummary ? `${gearSummary} · ${bonusSummary}` : gearSummary
    const baseLabel = pieces.armor
      ? `${pieces.armor.baseAc} ${
          pieces.armor.name || armorKindLabel(pieces.armor.kind)
        } · ${armorKindLabel(pieces.armor.kind).toLowerCase()} доспех`
      : withoutShield.summary
    const spareShield = listShieldItems(draft.inventory.items)[0]
    const shieldBonus = pieces.shield
      ? Math.max(0, Math.floor(pieces.shield.baseAc || 2))
      : Math.max(0, Math.floor(spareShield?.base_ac ?? 2))
    return {
      ac: stacked.total,
      summary,
      gearSummary,
      baseLabel,
      shieldBonus,
      formulaVars,
    }
  }, [
    effectiveAbilities,
    draft.inventory.items,
    draft.raceGrant,
    activeFightingStyleId,
    draft.modifiers,
    raceCatalogRows,
    unlockedFeatures,
    gearEffects.acBonus,
    infusionBonuses.acBonus,
    proficiencyBonus,
    characterLevel,
  ])

  function patchIdentity(patch: Partial<IdentityExtras>) {
    setDraft((prev) => ({ ...prev, identity: { ...prev.identity, ...patch } }))
  }

  async function reloadFromServer() {
    setReloading(true)
    setError(null)
    try {
      const fresh = await getCharacter(baseCharacter.id)
      baseCharacterRef.current = fresh
      sheetVersionRef.current = fresh.sheet_version
      setBaseCharacter(fresh)
      setDraft(buildDraft(fresh))
      setSheetVersion(fresh.sheet_version)
      setConflictOpen(false)
      conflictOpenRef.current = false
      skipAutosaveRef.current = true
      onSaved(fresh)
      onToast('Лист обновлён с сервера')
      setSaveStatus('saved')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось обновить лист')
    } finally {
      setReloading(false)
    }
  }

  /** Keep on-screen edits: adopt server version number, then overwrite with local draft. */
  async function saveLocalOverServer() {
    setReloading(true)
    setError(null)
    try {
      const fresh = await getCharacter(baseCharacterRef.current.id)
      baseCharacterRef.current = fresh
      sheetVersionRef.current = fresh.sheet_version
      setBaseCharacter(fresh)
      setSheetVersion(fresh.sheet_version)
      setConflictOpen(false)
      conflictOpenRef.current = false
      const ok = await persistDraft({ quiet: true, conflictRetry: true })
      if (ok) {
        onToastRef.current('Твои правки сохранены')
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить правки')
      setConflictOpen(true)
      conflictOpenRef.current = true
    } finally {
      setReloading(false)
    }
  }

  const persistDraft = useCallback(async (options?: {
    quiet?: boolean
    /** After a version conflict we already rebased once — do not loop. */
    conflictRetry?: boolean
  }) => {
    const quiet = options?.quiet ?? false
    const draftSnap = draftRef.current
    const baseSnap = baseCharacterRef.current
    const versionSnap = sheetVersionRef.current
    setSaveStatus('saving')
    if (!quiet) setError(null)
    try {
      const sheet = structuredClone(asRecord(baseSnap.sheet))
      const identity = asRecord(sheet.identity)
      const abilities = asRecord(sheet.abilities)
      const saves = asRecord(sheet.saves)
      const skills = asRecord(sheet.skills)
      const combat = asRecord(sheet.combat)

      const primary = draftSnap.classes[0]
      const totalLevel = totalCharacterLevel(draftSnap.classes)
      const summary = formatClassSummary(draftSnap.classes)
      const identityForSave = {
        ...draftSnap.identity,
        subclassName: primary?.subclass_name ?? draftSnap.identity.subclassName,
      }
      const identityExtras = identityExtrasToSheet(identityForSave)
      identity.race_catalog_id = draftSnap.raceCatalogId
      identity.background_catalog_id = draftSnap.backgroundCatalogId
      identity.class_catalog_id = primary?.catalog_id ?? null
      Object.assign(identity, identityExtras.identityPatch)
      sheet.identity = identity
      Object.assign(sheet, classLevelsToSheet(draftSnap.classes))
      sheet.class_grants = draftSnap.classGrants
      sheet.subclass_grants = draftSnap.subclassGrants
      sheet.subclass_transitions = draftSnap.subclassTransitions
      sheet.race_grant = draftSnap.raceGrant
      sheet.background_grant = draftSnap.backgroundGrant
      sheet.companions = draftSnap.companions
      sheet.known_forms = draftSnap.knownForms
      sheet.feature_picks = featurePicksToSheet(draftSnap.featurePicks)
      sheet.class_asi = draftSnap.classAsi
      sheet.feat_grants = draftSnap.featGrants
      Object.assign(sheet, customFeaturesToSheet(draftSnap.customFeatures))

      for (const key of ABILITY_KEYS) {
        const ceiling = abilityCeilings[key]?.max ?? DEFAULT_ABILITY_SCORE_MAX
        const row: Record<string, unknown> = {
          ...asRecord(abilities[key]),
          score: clampAbilityScore(draftSnap.abilities[key], ceiling),
        }
        if (ceiling > DEFAULT_ABILITY_SCORE_MAX) {
          row.max_score = ceiling
        } else {
          delete row.max_score
        }
        abilities[key] = row
        saves[key] = {
          ...asRecord(saves[key]),
          is_proficient: draftSnap.saves[key],
        }
      }
      sheet.abilities = abilities
      sheet.saves = saves

      for (const skill of SKILL_DEFS) {
        const current = asRecord(skills[skill.key])
        skills[skill.key] = {
          ...current,
          base_stat: skill.base,
          is_proficient: draftSnap.skills[skill.key].is_proficient,
          is_expertise: draftSnap.skills[skill.key].is_expertise,
        }
      }
      sheet.skills = skills

      combat.hp_current = draftSnap.hpCurrent
      combat.hp_max = draftSnap.hpMax
      combat.ac = draftSnap.ac
      combat.speed = draftSnap.speed
      combat.climb_speed = draftSnap.climbSpeed
      combat.swim_speed = draftSnap.swimSpeed
      combat.fly_speed = draftSnap.flySpeed
      combat.initiative = draftSnap.initiativeOverride
      combat.inspiration = draftSnap.inspiration
      combat.darkvision = identityExtras.combatPatch.darkvision
      const playSheet = playToSheet(draftSnap.play)
      combat.conditions = playSheet.combatPatch.conditions
      combat.exhaustion = playSheet.combatPatch.exhaustion
      combat.hp_temp = playSheet.combatPatch.hp_temp
      combat.hit_die = playSheet.combatPatch.hit_die
      combat.hp_dice_current = playSheet.combatPatch.hp_dice_current
      combat.hit_dice_by_class = playSheet.combatPatch.hit_dice_by_class
      combat.is_dying = playSheet.combatPatch.is_dying
      combat.death_successes = playSheet.combatPatch.death_successes
      combat.death_fails = playSheet.combatPatch.death_fails
      combat.concentration = playSheet.combatPatch.concentration
      sheet.combat = combat
      const proficiency = asRecord(sheet.proficiency)
      proficiency.bonus = proficiencyBonusForTotalLevel(totalLevel)
      proficiency.armor = identityExtras.proficiencyPatch.armor
      proficiency.weapons = identityExtras.proficiencyPatch.weapons
      proficiency.languages = identityExtras.proficiencyPatch.languages
      proficiency.tools = identityExtras.proficiencyPatch.tools
      sheet.proficiency = proficiency
      sheet.weapons = draftSnap.weapons
      sheet.resources = playSheet.resources
      Object.assign(sheet, inventoryToSheet(draftSnap.inventory))
      Object.assign(sheet, attunementsToSheet(draftSnap.attunements))
      Object.assign(sheet, spellsToSheet(draftSnap.spells))
      Object.assign(sheet, textBlocksToSheet(draftSnap.textBlocks))
      Object.assign(sheet, modifiersToSheet(draftSnap.modifiers))
      sheet.ui = {
        ...asRecord(sheet.ui),
        ...sheetUiToPatch(draftSnap.sheetUi),
      }

      const updated = await updateCharacter(baseSnap.id, {
        sheet_version: versionSnap,
        name: draftSnap.name.trim() || 'Новый персонаж',
        level: totalLevel,
        race_name: draftSnap.raceName.trim() || null,
        class_name: summary || primary?.name.trim() || null,
        hp_current: draftSnap.hpCurrent,
        hp_max: draftSnap.hpMax,
        sheet,
      })
      // Sync refs before any pending resave — React state alone is one frame late.
      baseCharacterRef.current = updated
      sheetVersionRef.current = updated.sheet_version
      setBaseCharacter(updated)
      setSheetVersion(updated.sheet_version)
      // Keep live draft — rebuilding would stomp keystrokes during autosave.
      onSavedRef.current(updated)
      publishSheetSync(channelRef.current, {
        type: 'sheet-saved',
        characterId: updated.id,
        sheetVersion: updated.sheet_version,
      })
      setSaveStatus('saved')
      setConflictOpen(false)
      conflictOpenRef.current = false
      if (!quiet) onToastRef.current('Лист сохранён')
      return true
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'sheet_version_conflict') {
        // Common race: two autosaves with the same version. Rebase once and retry silently.
        if (!options?.conflictRetry) {
          try {
            const fresh = await getCharacter(baseSnap.id)
            baseCharacterRef.current = fresh
            sheetVersionRef.current = fresh.sheet_version
            setBaseCharacter(fresh)
            setSheetVersion(fresh.sheet_version)
            return await persistDraft({ quiet, conflictRetry: true })
          } catch {
            // Fall through to the dialog.
          }
        }
        setConflictOpen(true)
        conflictOpenRef.current = true
        setError(null)
        setSaveStatus('error')
      } else {
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить лист')
        setSaveStatus('error')
      }
      return false
    }
  }, [])

  const flushAutosave = useCallback(async () => {
    if (conflictOpenRef.current) return
    if (saveInFlightRef.current) {
      pendingResaveRef.current = true
      return
    }
    saveInFlightRef.current = true
    try {
      await persistDraft({ quiet: true })
    } finally {
      saveInFlightRef.current = false
      if (pendingResaveRef.current && !conflictOpenRef.current) {
        pendingResaveRef.current = false
        void flushAutosave()
      }
    }
  }, [persistDraft])

  useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false
      return
    }
    if (conflictOpen) return
    setSaveStatus('dirty')
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(() => {
      void flushAutosave()
    }, 650)
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [draft, conflictOpen, flushAutosave])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden' && saveStatusRef.current === 'dirty') {
        void flushAutosave()
      }
    }
    window.addEventListener('visibilitychange', onVis)
    return () => window.removeEventListener('visibilitychange', onVis)
  }, [flushAutosave])

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [])


  const [ownershipOpen, setOwnershipOpen] = useState(false)
  const [identityOpen, setIdentityOpen] = useState(false)
  const [restOpen, setRestOpen] = useState(false)
  const [sorcerySpendId, setSorcerySpendId] = useState<string | null>(null)
  const [channelDivinitySpendId, setChannelDivinitySpendId] = useState<string | null>(
    null,
  )
  const [kiSpendId, setKiSpendId] = useState<string | null>(null)
  const [bardicInspirationSpendId, setBardicInspirationSpendId] = useState<
    string | null
  >(null)
  const [layOnHandsSpendId, setLayOnHandsSpendId] = useState<string | null>(null)
  const [superioritySpendId, setSuperioritySpendId] = useState<string | null>(null)
  const [arcaneRecoverySpendId, setArcaneRecoverySpendId] = useState<string | null>(
    null,
  )
  const [infusionsSpendId, setInfusionsSpendId] = useState<string | null>(null)
  const [arcanumSpendId, setArcanumSpendId] = useState<string | null>(null)
  const [invocationsOpen, setInvocationsOpen] = useState<{
    classEntryId: string
  } | null>(null)
  const [psionicSpendId, setPsionicSpendId] = useState<string | null>(null)
  const [soulTrinketsSpendId, setSoulTrinketsSpendId] = useState<string | null>(
    null,
  )
  const [rangerFavoredOpen, setRangerFavoredOpen] = useState<{
    classEntryId: string
  } | null>(null)
  const [concDamageAsk, setConcDamageAsk] = useState<{
    damage: number
    spellName: string
    dc: number
  } | null>(null)
  const [hotConditionsOpen, setHotConditionsOpen] = useState(false)
  const [acBreakdownOpen, setAcBreakdownOpen] = useState(false)
  const [abilityBreakdownKey, setAbilityBreakdownKey] = useState<AbilityKey | null>(
    null,
  )
  const [initiativeBreakdownOpen, setInitiativeBreakdownOpen] = useState(false)
  /** Compact play-desk cast (dialog), not the full spells editor. */
  const [deskCastSpell, setDeskCastSpell] = useState<SheetSpell | null>(null)
  const [pendingSpellSelfForm, setPendingSpellSelfForm] = useState<{
    spell: SheetSpell
    slug: SpellSelfFormSlug
  } | null>(null)
  const [deskCastScrollId, setDeskCastScrollId] = useState<string | null>(null)
  const [consumableSpendPadId, setConsumableSpendPadId] = useState<string | null>(null)
  const [consumableSpendLog, setConsumableSpendLog] = useState<ConsumableSpendLogEntry[]>(
    [],
  )
  const consumableUndoRef = useRef<ConsumableUndoSession | null>(null)
  const [deskCastScrollPending, setDeskCastScrollPending] = useState<{
    itemId: string
    name: string
    concentration: boolean
  } | null>(null)
  /** Play-desk spells setup (replaces force-full SpellsPanel). */
  const [spellsSettingsOpen, setSpellsSettingsOpen] = useState(false)
  /** Mobile M1.1: Бой (ready list) | Книга (settings / grimoire sheet). */
  const [mobileSpellSurface, setMobileSpellSurface] = useState<'combat' | 'book'>(
    'combat',
  )
  /** Play-desk attacks setup (replaces force-full AttacksPanel). */
  const [attacksSettingsOpen, setAttacksSettingsOpen] = useState(false)
  /** Explore summary → attunement pad (not stage jump). */
  const [attunementDialogOpen, setAttunementDialogOpen] = useState(false)
  /** Shared header CoinPad — also opened from inventory readout. */
  const [coinPadOpen, setCoinPadOpen] = useState(false)
  const [mobileAbilitiesOpen, setMobileAbilitiesOpen] = useState(false)
  const [deskCastPending, setDeskCastPending] = useState<{
    spell: SheetSpell
    choice: CastChoice
  } | null>(null)
  const [activePanel, setActivePanel] = useState<PlayDeskPanelId>(
    () => MODE_DEFAULT_PANEL[draft.sheetUi.deskMode],
  )
  /** When set, show full editor panel instead of combat compact strip. */
  const [forceFullPanel, setForceFullPanel] = useState<PlayDeskPanelId | null>(null)
  const [deskRollMode, setDeskRollMode] = useState<DeskRollMode>('normal')
  const [rollHistoryOpen, setRollHistoryOpen] = useState(false)
  const [isPlayDesk, setIsPlayDesk] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 960px)').matches,
  )

  const emitToast = useCallback(
    (message: ToastInput) => {
      onToast(message)
      const text = typeof message === 'string' ? message : message.message
      if (!isDeskRollToast(text)) return
      setDraft((prev) => ({
        ...prev,
        sheetUi: {
          ...prev.sheetUi,
          rollHistory: appendRollHistory(prev.sheetUi.rollHistory, { text }),
        },
      }))
    },
    [onToast],
  )

  const undoConsumableSpend = useCallback(
    (session: ConsumableUndoSession) => {
      if (consumableUndoRef.current?.token === session.token) {
        consumableUndoRef.current = null
      }
      setDraft((prev) => ({
        ...prev,
        inventory: {
          ...prev.inventory,
          items: prev.inventory.items.map((row) =>
            row.id === session.itemId
              ? { ...row, qty: (row.qty ?? 0) + session.amount }
              : row,
          ),
        },
      }))
      setConsumableSpendLog((prev) => markConsumableSpendUndone(prev, session.logId))
      onToast(formatConsumableUndoToast(session.name, session.amount))
    },
    [onToast],
  )

  const spendConsumableFromDesk = useCallback(
    (itemId: string, amount = 1) => {
      const item = draft.inventory.items.find((row) => row.id === itemId)
      if (!item || (item.qty ?? 0) <= 0) return
      if (isCastableSpellScroll(item)) {
        setDeskCastScrollId(itemId)
        return
      }
      const spendAmount = Math.max(1, Math.min(amount, item.qty ?? 0))
      const nextQty = Math.max(0, (item.qty ?? 0) - spendAmount)
      const logId = newConsumableSpendId()
      const token = Date.now()
      const session: ConsumableUndoSession = {
        token,
        itemId,
        name: item.name,
        amount: spendAmount,
        logId,
      }
      consumableUndoRef.current = session
      setDraft((prev) => ({
        ...prev,
        inventory: {
          ...prev.inventory,
          items: prev.inventory.items.map((row) =>
            row.id === itemId
              ? { ...row, qty: Math.max(0, (row.qty ?? 0) - spendAmount) }
              : row,
          ),
        },
      }))
      setConsumableSpendLog((prev) =>
        appendConsumableSpendLog(prev, {
          id: logId,
          itemId,
          name: item.name,
          amount: spendAmount,
          atMs: token,
        }),
      )
      onToast({
        message: formatConsumableSpendToast(item.name, spendAmount, nextQty),
        durationMs: 8000,
        actionLabel: 'Отменить',
        onAction: () => {
          if (consumableUndoRef.current?.token !== token) return
          undoConsumableSpend(session)
        },
      })
    },
    [draft.inventory.items, onToast, undoConsumableSpend],
  )

  const undoConsumableSpendFromLog = useCallback(
    (logId: string) => {
      const entry = consumableSpendLog.find((row) => row.id === logId)
      if (!entry || entry.undone) return
      const session: ConsumableUndoSession = {
        token: entry.atMs,
        itemId: entry.itemId,
        name: entry.name,
        amount: entry.amount,
        logId: entry.id,
      }
      undoConsumableSpend(session)
    },
    [consumableSpendLog, undoConsumableSpend],
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 960px)')
    const onChange = () => setIsPlayDesk(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  function patchSheetUi(patch: Partial<SheetUiState>) {
    setDraft((prev) => ({
      ...prev,
      sheetUi: { ...prev.sheetUi, ...patch },
    }))
  }

  /**
   * Default desk_split is ON for every sheet. Once per character: collapse when
   * there is no magic; if race/feat grants hydrate later, reopen once.
   * Does not fight a later manual «Показать магию» on a non-caster.
   */
  const magicSplitSeededRef = useRef<string | null>(null)
  const reopenSplitWhenMagicArrivesRef = useRef(false)
  useEffect(() => {
    const id = character.id
    if (magicSplitSeededRef.current !== id) {
      magicSplitSeededRef.current = id
      if (!hasMagicSources) {
        reopenSplitWhenMagicArrivesRef.current = true
        if (draft.sheetUi.deskSplit) patchSheetUi({ deskSplit: false })
      } else {
        reopenSplitWhenMagicArrivesRef.current = false
      }
      return
    }
    if (hasMagicSources && reopenSplitWhenMagicArrivesRef.current) {
      reopenSplitWhenMagicArrivesRef.current = false
      // Only auto-reopen on combat (explore/social stay full-width until «Показать магию»).
      if (
        defaultDeskSplitForMode(draft.sheetUi.deskMode, true) &&
        !draft.sheetUi.deskSplit
      ) {
        patchSheetUi({ deskSplit: true })
      }
    }
    // Seed / late-hydrate only — not on every deskSplit toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id, hasMagicSources])

  function toggleCombatFavorite(itemId: string) {
    const result = toggleCombatConsumableFavorite(
      draft.sheetUi.combatConsumableFavoriteIds,
      itemId,
    )
    if (!result.ok) {
      onToast(result.reason ?? 'Нельзя добавить в избранное')
      return
    }
    const adding = !draft.sheetUi.combatConsumableFavoriteIds.includes(itemId)
    const name =
      draft.inventory.items.find((row) => row.id === itemId)?.name.trim() || 'предмет'
    patchSheetUi({ combatConsumableFavoriteIds: result.ids })
    onToast(
      adding
        ? `«${name}» в расходниках боя (${result.ids.length}/3)`
        : `«${name}» убран из избранного`,
    )
  }

  function setDeskMode(mode: PlayDeskMode) {
    const nextPanel = MODE_DEFAULT_PANEL[mode]
    // Combat: pin spells when magic exists. Explore/social: full width (A3).
    const nextSplit =
      mode === 'features' || mode === 'companions'
        ? false
        : defaultDeskSplitForMode(mode, hasMagicSources)
    patchSheetUi({ deskMode: mode, deskSplit: nextSplit })
    setActivePanel(nextPanel)
    setForceFullPanel(null)
    setAttacksSettingsOpen(false)
    setSpellsSettingsOpen(false)
    setMobileSpellSurface('combat')
  }

  function applyDeskConcentration(spell: SheetSpell) {
    setDraft((prev) => withDeskConcentration(prev, spell))
  }

  function withDeskConcentration<
    T extends { play: typeof draft.play; companions: CompanionEntry[] },
  >(prev: T, spell: SheetSpell): T {
    if (!spell.concentration) return prev
    const next = setConcentration({
      spellId: spell.id,
      name: spell.name || 'Заклинание',
    })
    const result = applyConcentrationChangeToCompanions({
      companions: prev.companions,
      previous: prev.play.concentration,
      next,
    })
    return {
      ...prev,
      companions: result.companions,
      play: {
        ...prev.play,
        concentration: next,
      },
    }
  }

  function needsDeskConcentrationSwap(spell: SheetSpell): boolean {
    const current = draft.play.concentration
    if (!spell.concentration || !current) return false
    return (
      current.spell_id !== spell.id &&
      current.name.trim() !== (spell.name || '').trim()
    )
  }

  function applyDeskNaparnikFromCast(spell: SheetSpell, slotLevel: number): string {
    const abilityKey = draft.spells.casting_ability
    const spellMod = abilityKey ? abilityModifier(effectiveAbilities[abilityKey]) : 0
    const castCtx = {
      spell,
      slotLevel,
      characterLevel,
      spellMod,
    }
    const preview = applySpellCastToCompanions({
      companions: draft.companions,
      ...castCtx,
    })
    if (!preview) return ''
    setDraft((prev) => {
      const result = applySpellCastToCompanions({
        companions: prev.companions,
        ...castCtx,
      })
      return result ? { ...prev, companions: result.companions } : prev
    })
    return preview.refreshed
      ? ` · напарник «${preview.name}» снова в строю`
      : ` · напарник «${preview.name}»`
  }

  function openDeskSelfFormPickerIfNeeded(spell: SheetSpell, choice: CastChoice) {
    if (choice.selfFormTarget === 'other') return false
    if (!isSpellSelfFormCast(spell)) return false
    const slug = resolveSpellSelfFormSlug(spell)
    if (!slug) return false
    setPendingSpellSelfForm({ spell, slug })
    return true
  }

  function applySpellSelfFormResult(result: SpellFormDialogResult) {
    setDraft((prev) => ({
      ...prev,
      companions: result.companions,
      knownForms: result.knownForms,
    }))
    if (result.toast) onToast(result.toast)
    setPendingSpellSelfForm(null)
  }

  function runDeskCast(spell: SheetSpell, choice: CastChoice) {
    const name = spell.name || 'Заклинание'
    const allyNote =
      choice.allyTargetIds && choice.allyTargetIds.length > 0
        ? ` · целей ${choice.allyTargetIds.length}`
        : ''
    const ritualCast = Boolean(choice.ritual && spell.ritual && spell.level > 0)
    const grantSpellId = choice.grantSpellId || spell.id
    const grantRow =
      choice.useGrant
        ? draft.spells.known.find((row) => row.id === grantSpellId) ?? spell
        : null
    const grantCast = Boolean(grantRow && canSpendGrantCast(grantRow))
    const slotForEffect =
      spell.level <= 0 || ritualCast || grantCast
        ? spell.level
        : choice.usePact
          ? (draft.spells.pact_slots?.level ?? spell.level)
          : choice.slotLevel
    const { effect, scaled } = resolveCastEffect(spell, {
      characterLevel,
      slotLevel: slotForEffect || spell.level,
    })
    const effectNote = scaled && effect ? ` · ${effect}` : ''
    let consumeNote = ''
    if (choice.consumeMaterial && choice.consumeItemId) {
      const target = draft.inventory.items.find((row) => row.id === choice.consumeItemId)
      if (target) {
        setDraft((prev) => ({
          ...prev,
          inventory: {
            ...prev.inventory,
            items: consumeMaterialItem(prev.inventory.items, choice.consumeItemId!, 1),
          },
        }))
        consumeNote = ` · −1 «${target.name}»`
      }
    }
    const naparnikSlot = slotForEffect || spell.level
    const wantsForm = openDeskSelfFormPickerIfNeeded(spell, choice)
    const formNote = wantsForm ? ' · выбери форму' : ''

    if (spell.level <= 0) {
      if (spell.concentration) applyDeskConcentration(spell)
      const naparnikNote = wantsForm
        ? ''
        : applyDeskNaparnikFromCast(spell, naparnikSlot)
      onToast(
        spell.concentration
          ? `Каст: ${name}${effectNote}${consumeNote}${allyNote} (концентрация)${naparnikNote}${formNote}`
          : `Каст: ${name}${effectNote}${consumeNote}${allyNote}${naparnikNote}${formNote}`,
      )
      return
    }
    if (grantCast && grantRow) {
      const label = grantRow.grant_cast?.label ?? 'Грант'
      setDraft((prev) =>
        withDeskConcentration(
          {
            ...prev,
            spells: {
              ...prev.spells,
              known: spendGrantCast(prev.spells.known, grantRow.id),
            },
          },
          spell,
        ),
      )
      const naparnikNote = wantsForm
        ? ''
        : applyDeskNaparnikFromCast(spell, naparnikSlot)
      onToast(
        `Каст: ${name} (−1 ${label})${effectNote}${consumeNote}${allyNote}${
          spell.concentration ? ' · концентрация' : ''
        }${naparnikNote}${formNote}`,
      )
      return
    }
    if (ritualCast) {
      if (spellLearnBudget?.mode === 'spellbook') {
        const gate = canCastWizardRitualFromBook({
          spell,
          book: draft.spells.wizard_spellbook,
        })
        if (!gate.ok) {
          onToast(gate.message)
          return
        }
      }
      if (spell.concentration) applyDeskConcentration(spell)
      const naparnikNote = wantsForm
        ? ''
        : applyDeskNaparnikFromCast(spell, naparnikSlot)
      onToast(
        `Ритуал: ${name} (без ячейки)${effectNote}${consumeNote}${allyNote}${
          spell.concentration ? ' · концентрация' : ''
        }${naparnikNote}${formNote}`,
      )
      return
    }
    if (choice.usePact && draft.spells.pact_slots) {
      const pactResult = spendPactSlot(draft.spells.pact_slots)
      if (!pactResult.ok) {
        onToast('Нет свободных ячеек договора')
        return
      }
      setDraft((prev) =>
        withDeskConcentration(
          {
            ...prev,
            spells: { ...prev.spells, pact_slots: pactResult.pact },
          },
          spell,
        ),
      )
      const naparnikNote = wantsForm
        ? ''
        : applyDeskNaparnikFromCast(spell, pactResult.pact.level)
      onToast(
        `Каст: ${name} (−1 договор ${pactResult.pact.level} ур.)${effectNote}${consumeNote}${allyNote}${
          spell.concentration ? ' · концентрация' : ''
        }${naparnikNote}${formNote}`,
      )
      return
    }
    const result = spendSpellSlot(draft.spells.slots, choice.slotLevel)
    if (!result.ok) {
      onToast(`Нет ячеек ${choice.slotLevel}-го уровня`)
      return
    }
    setDraft((prev) =>
      withDeskConcentration(
        {
          ...prev,
          spells: { ...prev.spells, slots: result.slots },
        },
        spell,
      ),
    )
    const naparnikNote = wantsForm
      ? ''
      : applyDeskNaparnikFromCast(spell, choice.slotLevel)
    const upcast =
      choice.slotLevel > spell.level ? ` · upcast ${choice.slotLevel}` : ''
    onToast(
      `Каст: ${name} (−1 ячейка ${choice.slotLevel} ур.)${upcast}${effectNote}${consumeNote}${allyNote}${
        spell.concentration ? ' · концентрация' : ''
      }${naparnikNote}${formNote}`,
    )
  }

  function confirmDeskCast(choice: CastChoice) {
    if (!deskCastSpell) return
    const spell = deskCastSpell
    if (needsDeskConcentrationSwap(spell)) {
      setDeskCastPending({ spell, choice })
      setDeskCastSpell(null)
      return
    }
    setDeskCastSpell(null)
    runDeskCast(spell, choice)
  }

  function applyAttunements(attunements: AttunementSlot[]) {
    const prevLinked = new Set(
      draft.attunements.map((slot) => slot.item_id).filter((id): id is string => Boolean(id)),
    )
    const newlyLinked = attunements
      .map((slot) => slot.item_id)
      .filter((id): id is string => id != null && id !== '' && !prevLinked.has(id))
    let nextItems = draft.inventory.items
    const equippedNames: string[] = []
    for (const id of newlyLinked) {
      const item = nextItems.find((row) => row.id === id)
      if (!item || item.equipped) continue
      const shouldEquip =
        (item.wear_slot != null && item.wear_slot !== 'none') ||
        item.armor_kind === 'light' ||
        item.armor_kind === 'medium' ||
        item.armor_kind === 'heavy' ||
        item.armor_kind === 'shield'
      if (!shouldEquip) continue
      nextItems = equipInventoryItem(nextItems, id, true)
      if (item.name.trim()) equippedNames.push(item.name.trim())
    }
    setDraft((prev) => ({
      ...prev,
      attunements,
      inventory:
        nextItems === draft.inventory.items
          ? prev.inventory
          : { ...prev.inventory, items: nextItems },
    }))
    if (equippedNames.length > 0) {
      onToast(
        equippedNames.length === 1
          ? `Настроено и надето: «${equippedNames[0]}»`
          : `Настроено и надето: ${equippedNames.map((name) => `«${name}»`).join(', ')}`,
      )
    }
  }

  function showCompact(id: PlayDeskCompactPanelId): boolean {
    // Spells / attacks: compact is the only play surface (desk + phone); setup in dialogs.
    if (id === 'spells' || id === 'attacks') return true
    // Explore / Social / Features / Companions: glance→expand — no compact/full flip.
    if (
      id === 'inventory' ||
      id === 'texts' ||
      id === 'features' ||
      id === 'companions'
    ) {
      return false
    }
    return forceFullPanel !== id
  }

  function skillModFor(skillKey: string): number {
    const def = SKILL_DEFS.find((skill) => skill.key === skillKey)
    if (!def) return 0
    const state = draft.skills[skillKey]
    return (
      skillModifierFromState({
        abilityMod: abilityModifier(draft.abilities[def.base]),
        proficiencyBonus,
        isProficient: state?.is_proficient ?? false,
        isExpertise: state?.is_expertise ?? false,
      }) + (gearEffects.skillBonuses[skillKey] ?? 0)
    )
  }

  function modeSkillChips(mode: 'combat' | 'explore' | 'social') {
    return MODE_SKILL_KEYS[mode].map((key) => {
      const def = SKILL_DEFS.find((skill) => skill.key === key)
      const state = draft.skills[key]
      return {
        key,
        label: def?.label ?? key,
        mod: skillModFor(key),
        trained: Boolean(state?.is_proficient || state?.is_expertise),
      }
    })
  }

  const stealthArmorPieces = equippedArmorPieces(draft.inventory.items)
  const stealthArmorDisadvantage = armorGivesStealthDisadvantage({
    armorKind: stealthArmorPieces.armor?.kind ?? null,
    armorName: stealthArmorPieces.armor?.name ?? null,
  })

  function effectiveRollMode(skillKey?: string): DeskRollMode {
    const forced = skillKey === 'stealth' && stealthArmorDisadvantage
    return resolveRollMode(deskRollMode, forced)
  }

  function rollModeSkill(skill: { key: string; label: string; mod: number }) {
    const mode = effectiveRollMode(skill.key)
    const note =
      skill.key === 'stealth' && stealthArmorDisadvantage
        ? mode === 'normal' && deskRollMode === 'advantage'
          ? ' · доспех отменил преим.'
          : mode === 'disadvantage' && deskRollMode !== 'disadvantage'
            ? ' · помеха от доспеха'
            : ''
        : ''
    emitToast(`${formatSkillRoll(skill.label, skill.mod, mode)}${note}`)
  }

  function rollAbilityCheck(key: AbilityKey, mod: number) {
    emitToast(
      formatSkillRoll(
        `Проверка · ${ABILITY_NAMES[key] ?? ABILITY_LABELS[key]}`,
        mod,
        effectiveRollMode(),
      ),
    )
  }

  function rollAbilitySave(key: AbilityKey, mod: number) {
    emitToast(
      formatSkillRoll(
        `Спас · ${ABILITY_NAMES[key] ?? ABILITY_LABELS[key]}`,
        mod,
        effectiveRollMode(),
      ),
    )
  }

  /** Split only on wide desk; phone = one scene panel (+ combat segment for spells). */
  const deskSplit = isPlayDesk && draft.sheetUi.deskSplit
  const splitSecondary =
    deskSplit && modeUsesSpellSplit(draft.sheetUi.deskMode)
      ? splitSecondaryPanel(draft.sheetUi.deskMode, activePanel)
      : null

  function stageHidden(id: PlayDeskPanelId): boolean {
    // Mobile kit: always one panel (no all-panels stack).
    if (deskSplit && splitSecondary && (id === activePanel || id === splitSecondary)) {
      return false
    }
    return activePanel !== id
  }

  const initiativeAutoCore =
    abilityModifier(effectiveAbilities.dex) + totalInitiativeBonus
  const initiativeCore = draft.initiativeOverride ?? initiativeAutoCore
  const initiativeValue = withInitiativeBonus({
    core: initiativeCore,
    modifiers: draft.modifiers,
    vars: formulaVarsBase,
  }).total
  const initiativeAutoLabel = [
    `ЛОВ ${formatModifier(abilityModifier(effectiveAbilities.dex))}`,
    raceInitiativeBonus
      ? `раса ${formatModifier(raceInitiativeBonus)}`
      : null,
    featInitiativeBonus
      ? `черта ${formatModifier(featInitiativeBonus)}`
      : null,
    featureInitiativeBonus
      ? `умение ${formatModifier(featureInitiativeBonus)}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const jump = jumpDistances({
    strengthScore: effectiveAbilities.str,
    strengthMod: abilityModifier(effectiveAbilities.str),
  })
  const hotConditionNames = draft.play.conditions
    .filter((item) => item.slug !== 'exhaustion')
    .map((item) => formatConditionLabel(item))

  const subclassCastersForSpells = useMemo(
    () =>
      draft.subclassGrants
        .filter((row) => row.caster?.progression === 'third')
        .map((row) => ({
          classEntryId: row.classEntryId,
          progression: 'third' as const,
          ability: row.caster?.ability ?? null,
        })),
    [draft.subclassGrants],
  )

  const spellLearnBudget = useMemo(() => {
    const rows = draft.classes.filter((row) => row.name.trim() && row.level > 0)
    if (rows.length === 0) return null
    return resolveSpellLearnBudget({
      classes: rows,
      subclassCasters: subclassCastersForSpells,
      abilityModFor: (ability) => abilityModifier(draft.abilities[ability]),
    })
  }, [draft.classes, subclassCastersForSpells, draft.abilities])

  const spellLearnBudgets = useMemo(() => {
    const rows = draft.classes.filter((row) => row.name.trim() && row.level > 0)
    if (rows.length === 0) return null
    return resolveSpellLearnBudgets({
      classes: rows,
      subclassCasters: subclassCastersForSpells,
      abilityModFor: (ability) => abilityModifier(draft.abilities[ability]),
      proficiencyBonus,
    })
  }, [draft.classes, subclassCastersForSpells, draft.abilities, proficiencyBonus])

  const spellcastingSync = useSpellcastingSheetSync({
    enabled: true,
    className: classSummary || primaryClass?.name || '',
    level: characterLevel,
    classes: draft.classes,
    subclassCasters: subclassCastersForSpells,
    spells: draft.spells,
    abilities: draft.abilities,
    proficiencyBonus,
    onChange: (spells) => setDraft((prev) => ({ ...prev, spells })),
    onToast,
  })

  const sorcererMetamagicIds = useMemo(() => {
    const ids: string[] = []
    for (const row of draft.classes) {
      if (resolveClassCasterSlug(row.name) !== 'sorcerer') continue
      ids.push(...getFeaturePickList(draft.featurePicks, row.id, 'metamagic'))
    }
    return [...new Set(ids)]
  }, [draft.classes, draft.featurePicks])

  const sorceryResource =
    sorcerySpendId == null
      ? null
      : (draft.play.resources.find((row) => row.id === sorcerySpendId) ?? null)
  const channelDivinityResource =
    channelDivinitySpendId == null
      ? null
      : (draft.play.resources.find((row) => row.id === channelDivinitySpendId) ?? null)
  const kiResource =
    kiSpendId == null
      ? null
      : (draft.play.resources.find((row) => row.id === kiSpendId) ?? null)
  const bardicInspirationResource =
    bardicInspirationSpendId == null
      ? null
      : (draft.play.resources.find((row) => row.id === bardicInspirationSpendId) ??
        null)
  const layOnHandsResource =
    layOnHandsSpendId == null
      ? null
      : (draft.play.resources.find((row) => row.id === layOnHandsSpendId) ?? null)
  const superiorityResource =
    superioritySpendId == null
      ? null
      : (draft.play.resources.find((row) => row.id === superioritySpendId) ?? null)
  const arcaneRecoveryResource =
    arcaneRecoverySpendId == null
      ? null
      : (draft.play.resources.find((row) => row.id === arcaneRecoverySpendId) ??
        null)

  const arcaneRecoveryWizardLevel = useMemo(() => {
    if (!arcaneRecoverySpendId) return 1
    // feat:wizard:arcane_recovery:{classEntryId}
    const parts = arcaneRecoverySpendId.split(':')
    const classEntryId = parts[parts.length - 1]
    const row = draft.classes.find((c) => c.id === classEntryId)
    return Math.max(1, Math.floor(row?.level ?? 1))
  }, [arcaneRecoverySpendId, draft.classes])

  const infusionsResource =
    infusionsSpendId == null
      ? null
      : (draft.play.resources.find((row) => row.id === infusionsSpendId) ?? null)
  const infusionsContext = useMemo(() => {
    if (!infusionsSpendId) return null
    const parsed = parseInfusionSlotsResourceId(infusionsSpendId)
    if (!parsed) return null
    const row = draft.classes.find((c) => c.id === parsed.classEntryId)
    return {
      classEntryId: parsed.classEntryId,
      level: Math.max(1, Math.floor(row?.level ?? 1)),
    }
  }, [infusionsSpendId, draft.classes])

  const arcanumResource =
    arcanumSpendId == null
      ? null
      : (draft.play.resources.find((row) => row.id === arcanumSpendId) ?? null)

  const psionicResource =
    psionicSpendId == null
      ? null
      : (draft.play.resources.find((row) => row.id === psionicSpendId) ?? null)

  const soulTrinketsResource =
    soulTrinketsSpendId == null
      ? null
      : (draft.play.resources.find((row) => row.id === soulTrinketsSpendId) ??
        null)

  function isSorceryPointsResource(row: { id: string; name: string }): boolean {
    return (
      row.id.includes('sorcery_points') ||
      /очки чародейства/i.test(row.name) ||
      /sorcery points/i.test(row.name)
    )
  }

  function isChannelDivinityResource(row: { id: string; name: string }): boolean {
    return (
      row.id.includes(':channel_divinity:') ||
      /божественный канал/i.test(row.name) ||
      /channel divinity/i.test(row.name)
    )
  }

  function isKiResource(row: { id: string; name: string }): boolean {
    // feat:{class}:ki:{entryId} — avoid matching unrelated names that contain «ки».
    return /:ki:/.test(row.id) || /^ки$/i.test(row.name.trim())
  }

  function isBardicInspirationResource(row: { id: string; name: string }): boolean {
    return (
      /:bardic_inspiration:/.test(row.id) ||
      /бардовское вдохновение/i.test(row.name) ||
      /bardic inspiration/i.test(row.name)
    )
  }

  function isLayOnHandsResource(row: { id: string; name: string }): boolean {
    return (
      /:lay_on_hands:/.test(row.id) ||
      /возложение рук/i.test(row.name) ||
      /lay on hands/i.test(row.name)
    )
  }

  function isSuperiorityDiceResource(row: { id: string; name: string }): boolean {
    return (
      /:superiority_dice:/.test(row.id) ||
      /кости превосходства/i.test(row.name) ||
      /superiority dice/i.test(row.name)
    )
  }

  function isArcaneRecoveryResource(row: { id: string; name: string }): boolean {
    return (
      /:arcane_recovery:/.test(row.id) ||
      /магическое восстановление/i.test(row.name) ||
      /arcane recovery/i.test(row.name)
    )
  }

  function isInfusionSlotsResource(row: { id: string; name: string }): boolean {
    return (
      /:infusion_slots:/.test(row.id) ||
      /активные инфузии/i.test(row.name)
    )
  }

  function isMysticArcanumResource(row: { id: string; name: string }): boolean {
    return (
      /:mystic_arcanum_/.test(row.id) ||
      /арканум/i.test(row.name) ||
      /mystic arcanum/i.test(row.name)
    )
  }

  function isPsionicDiceResource(row: { id: string; name: string }): boolean {
    return (
      /:psionic_energy_dice:/.test(row.id) ||
      /пси-кост/i.test(row.name) ||
      /psionic energy/i.test(row.name)
    )
  }

  function isSoulTrinketsResource(row: { id: string; name: string }): boolean {
    return (
      /:soul_trinkets:/.test(row.id) ||
      /частиц/i.test(row.name) ||
      /soul trinket/i.test(row.name)
    )
  }

  function openResourceSpendDialog(id: string): boolean {
    const row = draft.play.resources.find((item) => item.id === id)
    if (!row) return false
    if (isSorceryPointsResource(row)) {
      setSorcerySpendId(id)
      return true
    }
    if (isChannelDivinityResource(row)) {
      setChannelDivinitySpendId(id)
      return true
    }
    if (isKiResource(row)) {
      setKiSpendId(id)
      return true
    }
    if (isBardicInspirationResource(row)) {
      setBardicInspirationSpendId(id)
      return true
    }
    if (isLayOnHandsResource(row)) {
      setLayOnHandsSpendId(id)
      return true
    }
    if (isSuperiorityDiceResource(row)) {
      setSuperioritySpendId(id)
      return true
    }
    if (isArcaneRecoveryResource(row)) {
      setArcaneRecoverySpendId(id)
      return true
    }
    if (isInfusionSlotsResource(row)) {
      setInfusionsSpendId(id)
      return true
    }
    if (isMysticArcanumResource(row)) {
      setArcanumSpendId(id)
      return true
    }
    if (isPsionicDiceResource(row)) {
      setPsionicSpendId(id)
      return true
    }
    if (isSoulTrinketsResource(row)) {
      setSoulTrinketsSpendId(id)
      return true
    }
    return false
  }

  function spendResourceOrOpenSorcery(id: string) {
    if (openResourceSpendDialog(id)) return
    setDraft((prev) => ({
      ...prev,
      play: {
        ...prev.play,
        resources: prev.play.resources.map((item) =>
          item.id === id && item.used < item.max
            ? { ...item, used: item.used + 1 }
            : item,
        ),
      },
    }))
  }

  const mergedSaveExtras = useMemo(() => {
    const out: Partial<Record<AbilityKey | 'all', number>> = {
      ...gearEffects.saveBonuses,
    }
    for (const key of ABILITY_KEYS) {
      const extra = abilitySaveExtras[key] ?? 0
      if (!extra) continue
      out[key] = (out[key] ?? 0) + extra
    }
    if (infusionBonuses.saveBonus) {
      out.all = (out.all ?? 0) + infusionBonuses.saveBonus
    }
    return out
  }, [gearEffects.saveBonuses, abilitySaveExtras, infusionBonuses.saveBonus])

  const abilityColumn = (
    <AbilitySkillsColumn
      abilityOrder={draft.sheetUi.abilityOrder}
      collapsedAbilities={draft.sheetUi.collapsedAbilities}
      abilities={draft.abilities}
      displayAbilities={effectiveAbilities}
      saves={draft.saves}
      skills={draft.skills}
      proficiencyBonus={proficiencyBonus}
      auraSaveBonus={auraSaveBonus}
      saveBonusExtra={mergedSaveExtras}
      checkBonusExtra={abilityCheckExtras}
      skillBonusExtra={gearEffects.skillBonuses}
      onOpenAbility={(key) => setAbilityBreakdownKey(key)}
      onRollCheck={rollAbilityCheck}
      onRollSave={rollAbilitySave}
      onRollSkill={rollModeSkill}
      abilityMaxes={Object.fromEntries(
        ABILITY_KEYS.map((key) => [
          key,
          abilityCeilings[key]?.max ?? DEFAULT_ABILITY_SCORE_MAX,
        ]),
      ) as Record<AbilityKey, number>}
      onAbilityScoreChange={(key, score) =>
        setDraft((prev) => {
          const max = abilityCeilings[key]?.max ?? DEFAULT_ABILITY_SCORE_MAX
          return {
            ...prev,
            abilities: {
              ...prev.abilities,
              [key]: clampAbilityScore(score, max),
            },
          }
        })
      }
      onSaveToggle={(key) =>
        setDraft((prev) => ({
          ...prev,
          saves: { ...prev.saves, [key]: !prev.saves[key] },
        }))
      }
      onSkillCycle={(skillKey) =>
        setDraft((prev) => ({
          ...prev,
          skills: {
            ...prev.skills,
            [skillKey]: cycleSkill(prev.skills[skillKey]),
          },
        }))
      }
      onReorder={(abilityOrder) => patchSheetUi({ abilityOrder })}
      onCollapsedChange={(collapsedAbilities) => patchSheetUi({ collapsedAbilities })}
      showValueTips={showValueTips}
    />
  )

  const passivesCompact = (
    <div className="play-desk__passives play-desk__passives--compact">
      <div className="play-desk__passives-label">Пассивы</div>
      <div className="passive-grid passive-grid--desk">
        <div className="passive-card">
          <span className="passive-card__label">Внимат.</span>
          <strong>{passives.perception}</strong>
        </div>
        <div className="passive-card">
          <span className="passive-card__label">Анализ</span>
          <strong>{passives.investigation}</strong>
        </div>
        <div className="passive-card">
          <span className="passive-card__label">Прониц.</span>
          <strong>{passives.insight}</strong>
        </div>
      </div>
    </div>
  )

  const dockCompanions = [...draft.companions]
    .filter((row) => row.name.trim())
    .sort((a, b) => {
      const aForm = isSelfForm(a) && a.active ? 0 : 1
      const bForm = isSelfForm(b) && b.active ? 0 : 1
      if (aForm !== bForm) return aForm - bForm
      if (a.active !== b.active) return a.active ? -1 : 1
      return 0
    })
    .slice(0, 4)

  return (
    <div
      className={[
        'play-desk',
        isPlayDesk ? 'play-desk--wide' : 'play-desk--mobile',
        deskSplit ? 'play-desk--split' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isPlayDesk ? (
        <div className="play-desk__top" data-onboarding="combat-header">
          <CharacterAvatarControl
            character={baseCharacter}
            size="md"
            showActions={false}
            onOpen={() => setIdentityOpen(true)}
            onChanged={(updated) => {
              setBaseCharacter(updated)
              onSaved(updated)
            }}
          />
          <PlayDeskHeader
            name={draft.name}
            raceName={draft.raceName}
            className={classSummary || primaryClass?.name || ''}
            alignment={draft.identity.alignment}
            rulesEdition={baseCharacter.rules_edition}
            level={characterLevel}
            experience={draft.identity.experience}
            classes={draft.classes}
            hitDie={draft.play.hitDie}
            constitutionMod={abilityModifier(draft.abilities.con)}
            hpCurrent={draft.hpCurrent}
            hpMax={draft.hpMax}
            play={draft.play}
            autoAc={armorClass.ac}
            acHint={armorClass.summary}
            onOpenAc={() => setAcBreakdownOpen(true)}
            shieldInHand={Boolean(equippedArmorPieces(draft.inventory.items).shield)}
            shieldAvailable={listShieldItems(draft.inventory.items).length > 0}
            onToggleShield={() => {
              const shields = listShieldItems(draft.inventory.items)
              const anyOn = shields.some((row) => row.equipped)
              if (!anyOn && !canWearArmor('shield', draft.identity.armor)) {
                onToast(armorProficiencyHint('shield'))
                return
              }
              const result = toggleShieldInHand(draft.inventory.items)
              if (!result.ok) {
                onToast(result.reason)
                return
              }
              setDraft((prev) => ({
                ...prev,
                inventory: { ...prev.inventory, items: result.items },
                weapons: syncAttacksHeldFromInventory(prev.weapons, result.items),
              }))
              onToast(
                result.equipped
                  ? `Щит «${result.name}» в руке`
                  : `Щит «${result.name}» убран`,
              )
            }}
            speed={displaySpeed}
            climbSpeed={draft.climbSpeed}
            swimSpeed={draft.swimSpeed}
            flySpeed={draft.flySpeed}
            jumpLongFt={jump.longFt}
            jumpHighFt={jump.highFt}
            movementHint={classSpeedHint}
            proficiencyBonus={proficiencyBonus}
            initiative={initiativeValue}
            inspiration={draft.inspiration}
            coins={draft.inventory.coins}
            xpHistory={draft.sheetUi.xpHistory}
            onOpenRest={() => setRestOpen(true)}
            onOpenIdentity={() => setIdentityOpen(true)}
            onExperienceChange={(experience, meta) => {
              setDraft((prev) => {
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
            onRequestLevelUp={() => setLevelUpOpen(true)}
            onToggleInspiration={() =>
              setDraft((prev) => ({ ...prev, inspiration: !prev.inspiration }))
            }
            onExhaustionChange={(exhaustion) =>
              setDraft((prev) => ({
                ...prev,
                play: { ...prev.play, exhaustion },
              }))
            }
            onOpenInitiative={() => setInitiativeBreakdownOpen(true)}
            onInitiativeRoll={() =>
              emitToast(
                formatSkillRoll('Инициатива', initiativeValue, effectiveRollMode()),
              )
            }
            onPlayChange={(play) => setDraft((prev) => ({ ...prev, play }))}
            onCoinsChange={(coins) =>
              setDraft((prev) => ({
                ...prev,
                inventory: { ...prev.inventory, coins },
              }))
            }
            coinPadOpen={coinPadOpen}
            onCoinPadOpenChange={setCoinPadOpen}
            showValueTips={showValueTips}
            onCombatChange={(patch) =>
              setDraft((prev) => ({
                ...prev,
                ...(patch.hpCurrent !== undefined ? { hpCurrent: patch.hpCurrent } : {}),
                ...(patch.hpMax !== undefined ? { hpMax: patch.hpMax } : {}),
              }))
            }
            onToast={onToast}
            onDamaged={(damageToHp) => {
              if (!draft.play.concentration || damageToHp <= 0) return
              setConcDamageAsk({
                damage: damageToHp,
                spellName: draft.play.concentration.name,
                dc: Math.max(10, Math.floor(damageToHp / 2)),
              })
            }}
          />
        </div>
      ) : (
        <div className="play-desk__mobile-chrome" data-onboarding="combat-header">
        <MobileVitalsBar
          character={baseCharacter}
          name={draft.name}
          raceName={draft.raceName}
          classSummary={classSummary || primaryClass?.name || ''}
          alignment={draft.identity.alignment}
          level={characterLevel}
          hpCurrent={draft.hpCurrent}
          hpMax={draft.hpMax}
          play={draft.play}
          autoAc={armorClass.ac}
          acOverride={draft.ac}
          acHint={armorClass.summary}
          onOpenAc={() => setAcBreakdownOpen(true)}
          shieldInHand={Boolean(equippedArmorPieces(draft.inventory.items).shield)}
          shieldAvailable={listShieldItems(draft.inventory.items).length > 0}
          onToggleShield={() => {
            const shields = listShieldItems(draft.inventory.items)
            const anyOn = shields.some((row) => row.equipped)
            if (!anyOn && !canWearArmor('shield', draft.identity.armor)) {
              onToast(armorProficiencyHint('shield'))
              return
            }
            const result = toggleShieldInHand(draft.inventory.items)
            if (!result.ok) {
              onToast(result.reason)
              return
            }
            setDraft((prev) => ({
              ...prev,
              inventory: { ...prev.inventory, items: result.items },
              weapons: syncAttacksHeldFromInventory(prev.weapons, result.items),
            }))
            onToast(
              result.equipped
                ? `Щит «${result.name}» в руке`
                : `Щит «${result.name}» убран`,
            )
          }}
          speed={displaySpeed}
          movementHint={[
            formatRaceMovementHint({
              climb: draft.climbSpeed,
              swim: draft.swimSpeed,
              fly: draft.flySpeed,
            }),
            classSpeedHint,
          ]
            .filter(Boolean)
            .join(' · ') || null}
          climbSpeed={draft.climbSpeed}
          swimSpeed={draft.swimSpeed}
          flySpeed={draft.flySpeed}
          jumpLongFt={jump.longFt}
          jumpHighFt={jump.highFt}
          initiative={initiativeValue}
          onOpenInitiative={() => setInitiativeBreakdownOpen(true)}
          proficiencyBonus={proficiencyBonus}
          inspiration={draft.inspiration}
          coins={draft.inventory.coins}
          constitutionMod={abilityModifier(draft.abilities.con)}
          classes={draft.classes}
          hitDie={draft.play.hitDie}
          onOpenIdentity={() => setIdentityOpen(true)}
          onOpenAbilities={() => setMobileAbilitiesOpen(true)}
          onOpenRest={() => setRestOpen(true)}
          onOpenConditions={() => setHotConditionsOpen(true)}
          onToggleInspiration={() =>
            setDraft((prev) => ({ ...prev, inspiration: !prev.inspiration }))
          }
          onAvatarChanged={(updated) => {
            setBaseCharacter(updated)
            onSaved(updated)
          }}
          onPlayChange={(play) => setDraft((prev) => ({ ...prev, play }))}
          onCoinsChange={(coins) =>
            setDraft((prev) => ({
              ...prev,
              inventory: { ...prev.inventory, coins },
            }))
          }
          onCombatChange={(patch) =>
            setDraft((prev) => ({
              ...prev,
              ...(patch.hpCurrent !== undefined ? { hpCurrent: patch.hpCurrent } : {}),
              ...(patch.hpMax !== undefined ? { hpMax: patch.hpMax } : {}),
            }))
          }
          onDamaged={(damageToHp) => {
            if (!draft.play.concentration || damageToHp <= 0) return
            setConcDamageAsk({
              damage: damageToHp,
              spellName: draft.play.concentration.name,
              dc: Math.max(10, Math.floor(damageToHp / 2)),
            })
          }}
          onToast={onToast}
          showValueTips={showValueTips}
        />
        </div>
      )}

      {isPlayDesk && dockCompanions.length > 0 ? (
        <div className="play-desk__dock" aria-label="Напарники">
          <span className="play-desk__dock-label">Напарники</span>
          {dockCompanions.map((row, index) => {
            const initial = (row.name.trim()[0] || '?').toUpperCase()
            const isPrimary = index === 0
            const inForm = isSelfForm(row) && row.active
            const kind = COMPANION_KIND_SHORT[row.kind] ?? 'Спутник'
            return (
              <button
                key={row.id}
                type="button"
                className={`play-desk__comp${isPrimary ? ' is-primary' : ''}${inForm ? ' is-form' : ''}`}
                onClick={() => {
                  setDeskMode('companions')
                  setActivePanel('companions')
                }}
              >
                <span className="play-desk__comp-face" aria-hidden>
                  {initial}
                </span>
                <span className="play-desk__comp-text">
                  <b>{row.name || 'Без имени'}</b>
                  <span>
                    {inForm ? 'В облике' : isPrimary ? 'Основной' : kind}
                    {row.stats.hp != null ? ` · ${row.stats.hp} HP` : ''}
                  </span>
                </span>
                <span className="play-desk__comp-hp">
                  {row.stats.hp != null ? row.stats.hp : '—'}
                </span>
              </button>
            )
          })}
          <p className="play-desk__dock-note">
            Док всегда виден. Полный список — панель «Напарники».
          </p>
        </div>
      ) : null}

      <div className="play-desk__body">
        <aside className="play-desk__left" data-onboarding="abilities">
          {abilityColumn}
          <div className="play-desk__rail-foot">
            {passivesCompact}
            <Button type="button" variant="secondary" onClick={() => setOwnershipOpen(true)}>
              Владения ▸
            </Button>
            {showOnboardingChecklist ? <OnboardingChecklist compact /> : null}
          </div>
        </aside>

        <div className="play-desk__stage" data-onboarding="actions">
          {isPlayDesk ? (
            <div className="play-desk__modes" data-onboarding="desk-modes" aria-label="Сцены листа">
              {MODE_LABELS.map(({ id: mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  className={`play-desk__mode${draft.sheetUi.deskMode === mode ? ' is-on' : ''}${
                    showValueTips ? ' has-onboarding-tip' : ''
                  }`}
                  onClick={() => setDeskMode(mode)}
                >
                  {label}
                  {showValueTips ? <HoverTipCard tip={SCENE_TIPS[mode]} /> : null}
                </button>
              ))}
              <div
                className="play-desk__roll-mode"
                role="group"
                aria-label="Преимущество / помеха"
              >
                {(
                  [
                    ['normal', 'норм'],
                    ['advantage', 'преим.'],
                    ['disadvantage', 'помеха'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`play-desk__roll-mode-btn${
                      deskRollMode === mode ? ' is-on' : ''
                    }`}
                    aria-pressed={deskRollMode === mode}
                    onClick={() => setDeskRollMode(mode)}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className="play-desk__roll-mode-btn"
                  title="История бросков на этом листе"
                  onClick={() => setRollHistoryOpen(true)}
                >
                  броски
                  {draft.sheetUi.rollHistory.length > 0
                    ? ` ${Math.min(draft.sheetUi.rollHistory.length, 99)}`
                    : ''}
                </button>
              </div>
              {modeUsesSpellSplit(draft.sheetUi.deskMode) ? (
                <button
                  type="button"
                  className={`play-desk__split-btn${deskSplit ? ' is-on' : ''}`}
                  aria-pressed={deskSplit}
                  title={
                    deskSplit
                      ? 'Скрыть магию — основная панель на всю ширину'
                      : hasMagicSources
                        ? 'Показать магию справа рядом с панелью'
                        : 'Показать панель магии (у персонажа нет источников магии)'
                  }
                  onClick={() => patchSheetUi({ deskSplit: !draft.sheetUi.deskSplit })}
                >
                  {deskSplit ? 'Скрыть магию' : 'Показать магию'}
                </button>
              ) : null}
              <span className="play-desk__mode-hint">{MODE_HINT[draft.sheetUi.deskMode]}</span>
            </div>
          ) : null}

          <PlayDeskHotBar
            conditionNames={hotConditionNames}
            exhaustion={draft.play.exhaustion}
            concentration={draft.play.concentration}
            resources={draft.play.resources}
            onOpenConditions={() => setHotConditionsOpen(true)}
            onClearConcentration={() => clearConcentrationDismissingCompanions(null)}
            onResourceUsedChange={(id, used) => {
              const row = draft.play.resources.find((item) => item.id === id)
              // Spending a special pool → open picker instead of blind ±1.
              if (row && used > row.used && openResourceSpendDialog(id)) return
              setDraft((prev) => ({
                ...prev,
                play: {
                  ...prev.play,
                  resources: prev.play.resources.map((item) =>
                    item.id === id ? { ...item, used } : item,
                  ),
                },
              }))
            }}
          />

          {!isPlayDesk && draft.sheetUi.deskMode === 'combat' ? (
            <div className="mobile-combat-seg-stack">
              <div className="mobile-combat-seg" role="tablist" aria-label="Бой">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activePanel === 'attacks'}
                  className={`mobile-combat-seg__btn${
                    activePanel === 'attacks' ? ' is-on' : ''
                  }`}
                  onClick={() => {
                    setActivePanel('attacks')
                    setMobileSpellSurface('combat')
                    setSpellsSettingsOpen(false)
                  }}
                >
                  Атаки
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activePanel === 'spells'}
                  className={`mobile-combat-seg__btn${
                    activePanel === 'spells' ? ' is-on' : ''
                  }`}
                  onClick={() => setActivePanel('spells')}
                >
                  Заклинания
                </button>
              </div>
              {activePanel === 'spells' ? (
                <div
                  className="mobile-combat-seg mobile-combat-seg--spell"
                  role="tablist"
                  aria-label="Заклинания"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mobileSpellSurface === 'combat'}
                    className={`mobile-combat-seg__btn${
                      mobileSpellSurface === 'combat' ? ' is-on' : ''
                    }`}
                    onClick={() => {
                      setMobileSpellSurface('combat')
                      setSpellsSettingsOpen(false)
                    }}
                  >
                    Бой
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mobileSpellSurface === 'book'}
                    className={`mobile-combat-seg__btn${
                      mobileSpellSurface === 'book' ? ' is-on' : ''
                    }`}
                    onClick={() => {
                      setMobileSpellSurface('book')
                      setSpellsSettingsOpen(true)
                    }}
                  >
                    Книга
                  </button>
                </div>
              ) : null}
              <div
                className="mobile-combat-roll"
                role="group"
                aria-label="Преимущество / помеха"
              >
                {(
                  [
                    ['normal', 'норм'],
                    ['advantage', 'преим.'],
                    ['disadvantage', 'помеха'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`mobile-combat-roll__btn${
                      deskRollMode === mode ? ' is-on' : ''
                    }`}
                    aria-pressed={deskRollMode === mode}
                    onClick={() => setDeskRollMode(mode)}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className="mobile-combat-roll__btn mobile-combat-roll__btn--history"
                  title="История бросков на этом листе"
                  onClick={() => setRollHistoryOpen(true)}
                >
                  броски
                  {draft.sheetUi.rollHistory.length > 0
                    ? ` ${Math.min(draft.sheetUi.rollHistory.length, 99)}`
                    : ''}
                </button>
              </div>
            </div>
          ) : null}

          {draft.sheetUi.deskMode === 'combat' ? (
            <PlayDeskSkillStrip
              ariaLabel="Навыки боя"
              skills={modeSkillChips('combat')}
              onSkillClick={rollModeSkill}
            />
          ) : null}

          {!isPlayDesk && draft.sheetUi.deskMode === 'explore' ? (
            <div
              className="mobile-combat-roll mobile-combat-roll--explore"
              role="group"
              aria-label="Преимущество / помеха"
            >
              {(
                [
                  ['normal', 'норм'],
                  ['advantage', 'преим.'],
                  ['disadvantage', 'помеха'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`mobile-combat-roll__btn${
                    deskRollMode === mode ? ' is-on' : ''
                  }`}
                  aria-pressed={deskRollMode === mode}
                  onClick={() => setDeskRollMode(mode)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className="mobile-combat-roll__btn mobile-combat-roll__btn--history"
                title="История бросков на этом листе"
                onClick={() => setRollHistoryOpen(true)}
              >
                броски
                {draft.sheetUi.rollHistory.length > 0
                  ? ` ${Math.min(draft.sheetUi.rollHistory.length, 99)}`
                  : ''}
              </button>
            </div>
          ) : null}

          {draft.sheetUi.deskMode === 'explore' ? (
            <PlayDeskSkillStrip
              ariaLabel="Навыки исследования"
              skills={modeSkillChips('explore')}
              onSkillClick={rollModeSkill}
            />
          ) : null}

          {!isPlayDesk && draft.sheetUi.deskMode === 'social' ? (
            <div
              className="mobile-combat-roll mobile-combat-roll--social"
              role="group"
              aria-label="Преимущество / помеха"
            >
              {(
                [
                  ['normal', 'норм'],
                  ['advantage', 'преим.'],
                  ['disadvantage', 'помеха'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`mobile-combat-roll__btn${
                    deskRollMode === mode ? ' is-on' : ''
                  }`}
                  aria-pressed={deskRollMode === mode}
                  onClick={() => setDeskRollMode(mode)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className="mobile-combat-roll__btn mobile-combat-roll__btn--history"
                title="История бросков на этом листе"
                onClick={() => setRollHistoryOpen(true)}
              >
                броски
                {draft.sheetUi.rollHistory.length > 0
                  ? ` ${Math.min(draft.sheetUi.rollHistory.length, 99)}`
                  : ''}
              </button>
            </div>
          ) : null}

          {draft.sheetUi.deskMode === 'social' ? (
            <PlayDeskSkillStrip
              ariaLabel="Навыки общения"
              skills={modeSkillChips('social')}
              onSkillClick={rollModeSkill}
            />
          ) : null}

          {deskSplit && splitSecondary === 'spells' && activePanel !== 'spells' ? (
            <p className="play-desk__split-hint">
              Справа — заклинания · слева — выбранная панель
            </p>
          ) : null}

      <IdentityDialog
        open={identityOpen}
        onClose={() => setIdentityOpen(false)}
        character={baseCharacter}
        onAvatarChanged={(updated) => {
          setBaseCharacter(updated)
          onSaved(updated)
        }}
      >
          <section className="identity-dialog__section">
            <p className="identity-dialog__section-label">Персонаж</p>
          <Field label="Имя" htmlFor="sheet-name">
            <Input
              id="sheet-name"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
          </Field>
          <div className="sheet-grid sheet-grid--2">
            <Field
              label="Уровень персонажа"
              hint="Сумма уровней классов. +1 — этот класс или мультикласс."
            >
              <div className="languages-tools-add">
                <Input value={String(characterLevel)} readOnly />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={characterLevel >= 20}
                  onClick={() => {
                    setIdentityOpen(false)
                    setLevelUpOpen(true)
                  }}
                >
                  +1 уровень
                </Button>
              </div>
            </Field>
            <Field
              label="Опыт (XP)"
              htmlFor="sheet-xp"
              hint="Начисление не поднимает уровень само — после порога жми «+1 уровень» / ссылку ниже."
            >
              <XpProgressField
                xp={draft.identity.experience}
                level={characterLevel}
                xpHistory={draft.sheetUi.xpHistory}
                onRequestLevelUp={() => {
                  setIdentityOpen(false)
                  setLevelUpOpen(true)
                }}
                levelUpDisabled={characterLevel >= 20}
                onChange={(experience, meta) => {
                  setDraft((prev) => {
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
            <Input value={formatModifier(proficiencyBonus)} readOnly />
          </Field>
          </section>
          {!primaryClass?.name.trim() ? (
            <Text tone="muted">
              Создание: сначала класс (и архетип, если уже есть), потом раса — так метки и расовые
              списки заклинаний сразу видят, кастер ты или нет.
            </Text>
          ) : null}
          <section className="identity-dialog__section">
            <p className="identity-dialog__section-label">Классы</p>
            {pendingStartingLevel > 1 ? (
              <Text tone="muted">
                Старт с {pendingStartingLevel} ур.: выбери класс — мастер поднимет уровень и проведёт
                через умения/ASI.
              </Text>
            ) : null}
            <Stack gap={10}>
              {draft.classes.map((row, index) => (
                <div key={row.id} className="identity-dialog__class">
                  <div className="sheet-grid sheet-grid--2">
                    <Field
                      label={draft.classes.length > 1 ? `Класс ${index + 1}` : 'Класс'}
                      hint={
                        index === 0
                          ? 'Шаг 1 · основной класс для карточки персонажа'
                          : undefined
                      }
                    >
                      <CatalogCombobox
                        id={index === 0 ? 'sheet-class-primary' : undefined}
                        kind="class"
                        edition={baseCharacter.rules_edition as RulesEdition}
                        value={row.name}
                        placeholder="Начните вводить класс"
                        onChange={(value, selected) => {
                          patchClass(row.id, {
                            name: value,
                            catalog_id: selected?.id ?? null,
                          })
                          if (!selected) return
                          const mode = grantModeForClassRow(draft, row.id)
                          requestOrApplyClassGrant({
                            classEntryId: row.id,
                            className: selected.name_ru,
                            mode,
                            catalogSlug: selected.slug,
                            catalogData: selected.data,
                            classesOverride: draft.classes.map((item) =>
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
                            setHomebrewPicker({
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
                          disabled={draft.classes.length === 1 && row.level <= 1}
                          onClick={() =>
                            setDraft((prev) => {
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
                                featBase = mergeFeatSlice(
                                  featBase,
                                  revokeFeatGrantsForAsi({
                                    draft: featSliceFrom(featBase),
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
                                  subclassSlugByEntryId,
                                  subclassTransitionByEntryId,
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
                                  subclassSlugByEntryId,
                                  subclassTransitionByEntryId,
                                })
                                const nextSkills = syncSkillsExpertiseFromPicks({
                                  skills: featBase.skills,
                                  featurePicks: nextPicks,
                                  expertiseKeys: listUnlockedExpertiseKeys(nextUnlocked),
                                })
                                const synced = mergeFeatSlice(
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
                                    featSliceFrom({
                                      ...featBase,
                                      classes: nextClasses,
                                      featurePicks: nextPicks,
                                      skills: nextSkills,
                                    }),
                                  ),
                                )
                                return withRaceSpellsSynced(synced, nextClasses)
                              }
                              const withoutClass = revokeClassGrant(
                                draftSliceFrom(featBase),
                                row.id,
                              )
                              const withoutSubclass = revokeSubclassGrant(
                                {
                                  ...subclassSliceFrom(featBase),
                                  identity: withoutClass.identity,
                                  skills: withoutClass.skills,
                                  classGrants: withoutClass.classGrants,
                                },
                                row.id,
                                { copyTextToNotes: true },
                              )
                              return withRaceSpellsSynced(
                                mergeSubclassSlice(
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
                            })
                          }
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
                        edition={baseCharacter.rules_edition as RulesEdition}
                        parentId={row.catalog_id}
                        disabled={!row.catalog_id}
                        value={row.subclass_name}
                        placeholder="Например: Клятва мести"
                        onChange={(value, selected) => {
                          if (selected) {
                            requestSubclassChange(row.id, selected)
                            return
                          }
                          // Free-text / clear: drop catalog subclass grant (EK/AT caster etc.)
                          // so stale third-caster overlays do not linger without an archetype.
                          setDraft((prev) => {
                            const hadGrant = prev.subclassGrants.some(
                              (grant) => grant.classEntryId === row.id,
                            )
                            const cleared = hadGrant
                              ? revokeSubclassGrant(subclassSliceFrom(prev), row.id, {
                                  copyTextToNotes: true,
                                })
                              : subclassSliceFrom(prev)
                            const merged = hadGrant
                              ? mergeSubclassSlice(prev, cleared)
                              : prev
                            const nextClasses = merged.classes.map((item) =>
                              item.id === row.id
                                ? {
                                    ...item,
                                    subclass_name: value,
                                    subclass_catalog_id: null,
                                  }
                                : item,
                            )
                            const next = withRaceSpellsSynced(merged, nextClasses)
                            return {
                              ...next,
                              identity:
                                next.classes[0]?.id === row.id
                                  ? { ...next.identity, subclassName: value }
                                  : next.identity,
                            }
                          })
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
                          applyHomebrewSubclass(row.id, trimmed)
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
              Итого: {classSummary || 'класс не выбран'} · из справочника откроется попап со всеми
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
              {draft.featGrants.length === 0 ? (
                <Text tone="muted">Пока нет черт на листе.</Text>
              ) : (
                draft.featGrants.map((row) => {
                  const sourceLabel =
                    row.source.kind === 'asi'
                      ? `ASI · ур. ${row.source.atClassLevel}`
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
                            setDraft((prev) =>
                              mergeFeatSlice(
                                prev,
                                revokeFeatGrantFromDraft({
                                  draft: featSliceFrom(prev),
                                  grantId: row.id,
                                }),
                              ),
                            )
                            onToast(`Черта «${row.nameRu}» снята`)
                          }}
                        >
                          Убрать
                        </Button>
                      ) : null}
                    </div>
                  )
                })
              )}
              <Button type="button" variant="secondary" onClick={() => setGiftFeatOpen(true)}>
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
                primaryClass?.name.trim()
                  ? 'Шаг 3 · подраса и развилки — в попапе; если раса даёт черту — мастер подскажет'
                  : 'Шаг 3 · сначала предыстория и класс, потом раса'
              }
            >
              <CatalogCombobox
                id="sheet-race"
                kind="race"
                edition={baseCharacter.rules_edition as RulesEdition}
                value={draft.raceName}
                placeholder={
                  primaryClass?.name.trim()
                    ? 'Начните вводить расу'
                    : 'Сначала выбери класс'
                }
                disabled={!primaryClass?.name.trim()}
                filterEntry={(entry) => isRaceComboboxRoot(entry)}
                onChange={(value, selected) => {
                  if (!primaryClass?.name.trim()) return
                  if (!selected) {
                    setDraft((prev) => ({
                      ...prev,
                      raceName: value,
                      raceCatalogId: null,
                    }))
                    return
                  }
                  void requestOrApplyRaceGrant(selected)
                }}
              />
              <div className="languages-tools-add" style={{ marginTop: 8 }}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!primaryClass?.name.trim()}
                  onClick={() => setRaceHomebrewOpen(true)}
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
                {raceSizeLabel(draft.raceGrant?.size || draft.identity.size)}
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
                edition={baseCharacter.rules_edition as RulesEdition}
                value={draft.identity.background}
                placeholder="Начните вводить предысторию"
                filterEntry={(entry) => isBackgroundComboboxRoot(entry)}
                onChange={(value, selected) => {
                  if (!selected) {
                    setDraft((prev) => {
                      const cleared = revokeBackgroundGrant(backgroundSliceFrom(prev))
                      let merged = mergeBackgroundSlice(prev, cleared)
                      const prevSlug = prev.identity.backgroundSlug
                      if (prevSlug) {
                        merged = mergeFeatSlice(
                          merged,
                          revokeFeatGrantsForBackground({
                            draft: featSliceFrom(merged),
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
                  void requestOrApplyBackgroundGrant(selected)
                }}
              />
              <div className="languages-tools-add" style={{ marginTop: 8 }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setBackgroundHomebrewOpen(true)}
                >
                  Хомбрю
                </Button>
              </div>
            </Field>
            <Field label="Мировоззрение" htmlFor="sheet-alignment">
              <Input
                id="sheet-alignment"
                value={draft.identity.alignment}
                placeholder="Нейтральный добрый…"
                onChange={(event) => patchIdentity({ alignment: event.target.value })}
              />
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
                    className={`sheet-chip${draft.identity.gender === key ? ' is-on' : ''}`}
                    onClick={() => patchIdentity({ gender: key })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          </section>
      </IdentityDialog>

      <div className="play-desk__scene-wrap">
      <div className="play-desk__stage-panel" hidden={stageHidden('attacks')}>
      {showCompact('attacks') ? (
        <>
          <PlayDeskAttacksCompact
            weapons={draft.weapons}
            abilities={effectiveAbilities}
            proficiencyBonus={proficiencyBonus}
            gearBonusesByItem={gearEffects.byItem}
            fightingStyleId={activeFightingStyleId}
            infusionAttackBonus={infusionBonuses.weaponAttackBonus}
            infusionDamageBonus={infusionBonuses.weaponDamageBonus}
            martialArtsDie={martialArtsDie}
            resources={draft.play.resources}
            inventoryItems={draft.inventory.items}
            favoriteConsumableIds={draft.sheetUi.combatConsumableFavoriteIds}
            combatFeatures={unlockedFeatures}
            rollMode={effectiveRollMode()}
            preferMagicEmpty={hasMagicSources}
            onOpenSettings={() => setAttacksSettingsOpen(true)}
            onAddAttack={() => setAttacksSettingsOpen(true)}
            onOpenInventory={() => {
              setDeskMode('explore')
              setActivePanel('inventory')
            }}
            onCombatFeatureToggle={(featureId, active) => {
              if (featureId === 'reckless_attack') {
                setDeskRollMode(active ? 'advantage' : 'normal')
              }
            }}
            onToast={emitToast}
            onSpendResource={spendResourceOrOpenSorcery}
            onToggleConsumableFavorite={toggleCombatFavorite}
            onCastScroll={(itemId) => setDeskCastScrollId(itemId)}
            onSpendConsumable={spendConsumableFromDesk}
            onOpenConsumableSpendPad={(itemId) => setConsumableSpendPadId(itemId)}
            consumableSpendLog={consumableSpendLog}
            onUndoConsumableSpend={undoConsumableSpendFromLog}
            onToggleHeld={(attack) => {
              if (!attack.inventory_item_id) return
              setDraft((prev) => {
                const item = prev.inventory.items.find(
                  (row) => row.id === attack.inventory_item_id,
                )
                if (!item) return prev
                const items = equipInventoryItem(
                  prev.inventory.items,
                  item.id,
                  !item.equipped,
                )
                return {
                  ...prev,
                  inventory: { ...prev.inventory, items },
                  weapons: syncAttacksHeldFromInventory(prev.weapons, items),
                }
              })
            }}
          />
          <AttacksSettingsDialog
            open={attacksSettingsOpen}
            weapons={draft.weapons}
            abilities={effectiveAbilities}
            proficiencyBonus={proficiencyBonus}
            weaponProficiency={draft.identity.weapons}
            gearBonusesByItem={gearEffects.byItem}
            martialArtsDie={martialArtsDie}
            onChange={(weapons) => setDraft((prev) => ({ ...prev, weapons }))}
            onClose={() => setAttacksSettingsOpen(false)}
            onToggleHeld={(attack) => {
              if (!attack.inventory_item_id) return
              setDraft((prev) => {
                const item = prev.inventory.items.find(
                  (row) => row.id === attack.inventory_item_id,
                )
                if (!item) return prev
                const items = equipInventoryItem(
                  prev.inventory.items,
                  item.id,
                  !item.equipped,
                )
                return {
                  ...prev,
                  inventory: { ...prev.inventory, items },
                  weapons: syncAttacksHeldFromInventory(prev.weapons, items),
                }
              })
            }}
          />
        </>
      ) : (
        <AttacksPanel
          edition={baseCharacter.rules_edition as RulesEdition}
          weapons={draft.weapons}
          abilities={effectiveAbilities}
          proficiencyBonus={proficiencyBonus}
          weaponProficiency={draft.identity.weapons}
          gearBonusesByItem={gearEffects.byItem}
          fightingStyleId={activeFightingStyleId}
          infusionAttackBonus={infusionBonuses.weaponAttackBonus}
          infusionDamageBonus={infusionBonuses.weaponDamageBonus}
          martialArtsDie={martialArtsDie}
          onChange={(weapons) => setDraft((prev) => ({ ...prev, weapons }))}
          onToggleHeld={(attack) => {
            if (!attack.inventory_item_id) return
            setDraft((prev) => {
              const item = prev.inventory.items.find(
                (row) => row.id === attack.inventory_item_id,
              )
              if (!item) return prev
              const items = equipInventoryItem(
                prev.inventory.items,
                item.id,
                !item.equipped,
              )
              return {
                ...prev,
                inventory: { ...prev.inventory, items },
                weapons: syncAttacksHeldFromInventory(prev.weapons, items),
              }
            })
          }}
        />
      )}

      </div>

      <div className="play-desk__stage-panel" hidden={stageHidden('inventory')}>
      <InventoryPanel
        edition={baseCharacter.rules_edition as RulesEdition}
        inventory={draft.inventory}
        strengthScore={draft.abilities.str}
        armorProficiency={draft.identity.armor}
        weapons={draft.weapons}
        autoAc={armorClass.ac}
        acHint={armorClass.summary}
        attunementFilled={filledAttunementCount(draft.attunements)}
        favoriteConsumableIds={draft.sheetUi.combatConsumableFavoriteIds}
        onToggleConsumableFavorite={toggleCombatFavorite}
        onCastScroll={(itemId) => setDeskCastScrollId(itemId)}
        onOpenAttunement={() => setAttunementDialogOpen(true)}
        /* Header owns CoinPad only on wide desk; compact uses panel-local pad. */
        onOpenCoins={() => setCoinPadOpen(true)}
        onToast={onToast}
        onChange={(inventory) =>
          setDraft((prev) => {
            const focusSpells = withSpellFocusFlags(prev.spells, inventory.items)
            const isWizard =
              spellLearnBudget?.mode === 'spellbook' ||
              prev.classes.some((row) => /волшебник|wizard|маг/i.test(row.name))
            const synced = syncWizardSpellbookWithInventory({
              isWizard,
              spells: focusSpells,
              items: inventory.items,
            })
            if (synced.message) queueMicrotask(() => onToast(synced.message!))
            return {
              ...prev,
              inventory,
              weapons: syncAttacksHeldFromInventory(prev.weapons, inventory.items),
              spells: synced.spells,
            }
          })
        }
        onWeaponsChange={(weapons) => setDraft((prev) => ({ ...prev, weapons }))}
      />
      <AttunementDialog
        open={attunementDialogOpen}
        onClose={() => setAttunementDialogOpen(false)}
        attunements={draft.attunements}
        inventoryItems={draft.inventory.items}
        onChange={applyAttunements}
      />

      </div>

      <div className="play-desk__stage-panel" hidden={stageHidden('features')}>
      {/* Features: ClassFeaturesPanel glance→expand — no compact/full flip. */}
      <ClassFeaturesPanel
        classes={draft.classes}
        characterLevel={characterLevel}
        abilities={draft.abilities}
        subclassSlugByEntryId={subclassSlugByEntryId}
        subclassTransitionByEntryId={subclassTransitionByEntryId}
        resources={draft.play.resources}
        onResourcesChange={(resources) =>
          setDraft((prev) => ({
            ...prev,
            play: { ...prev.play, resources },
          }))
        }
        featurePicks={draft.featurePicks}
        onFeaturePicksChange={applyFeaturePicksWithExpertise}
        skills={draft.skills}
        tools={draft.identity.tools}
        classAsi={draft.classAsi}
        spells={draft.spells}
        onSpellsChange={(spells) => setDraft((prev) => ({ ...prev, spells }))}
        edition={rulesEdition}
        wearingHeavyArmor={
          equippedArmorPieces(draft.inventory.items).armor?.kind === 'heavy'
        }
        companions={draft.companions}
        onCompanionsChange={(companions) =>
          setDraft((prev) => ({ ...prev, companions }))
        }
        featGrants={draft.featGrants}
        darkvision={effectiveDarkvisionFt}
        raceName={draft.raceName}
        raceTraitCards={draft.raceGrant?.traitCards ?? []}
        raceTraitsText={draft.raceGrant?.traitsText ?? ''}
        backgroundName={
          draft.identity.background?.trim() ||
          draft.backgroundGrant?.slug ||
          ''
        }
        backgroundFeature={resolvedBackgroundFeature}
        customFeatures={draft.customFeatures}
        onCustomFeaturesChange={(customFeatures) =>
          setDraft((prev) => ({ ...prev, customFeatures }))
        }
        onToast={onToast}
        onOpenInfusions={(classEntryId) => {
          const row = draft.play.resources.find(
            (r) =>
              r.id.includes(':infusion_slots:') &&
              r.id.endsWith(`:${classEntryId}`),
          )
          if (row) setInfusionsSpendId(row.id)
          else onToast('Пул активных инфузий ещё не синхронизирован')
        }}
        onOpenInvocations={(classEntryId) =>
          setInvocationsOpen({ classEntryId })
        }
        onOpenRangerFavored={(classEntryId) =>
          setRangerFavoredOpen({ classEntryId })
        }
        onOpenSoulTrinkets={(classEntryId) => {
          const row = draft.play.resources.find(
            (r) =>
              r.id.includes(':soul_trinkets:') &&
              r.id.endsWith(`:${classEntryId}`),
          )
          if (row) setSoulTrinketsSpendId(row.id)
          else onToast('Пул частиц души ещё не синхронизирован')
        }}
        onWildShapeFork={(request) => setWildShapeFork(request)}
        onFeatureSelfForm={(request) => setFeatureSelfForm(request)}
        onMoonFormSlotHeal={({ slotLevel, diceCount, diceSize }) => {
          const form = draft.companions.find(
            (c) => c.role === 'self_form' && c.active,
          )
          if (!form || form.stats.hp == null) return null
          const rolled = rollDice(diceCount, diceSize)
          let message = ''
          setDraft((prev) => {
            const healed = healSelfForm({
              companions: prev.companions,
              amount: rolled.total,
              formId: form.id,
            })
            message = `Исцеление в облике: ячейка ${slotLevel} → ${diceCount}к${diceSize} = ${rolled.total} [${rolled.rolls.join('+')}] · ${healed.message}`
            return { ...prev, companions: healed.companions }
          })
          return message || null
        }}
      />

      </div>

      <div
        className={`play-desk__stage-panel${deskSplit && splitSecondary === 'spells' ? ' is-pinned' : ''}`}
        hidden={stageHidden('spells')}
      >
      {showCompact('spells') ? (
        <>
          <PlayDeskSpellsCompact
            spells={draft.spells}
            abilities={effectiveAbilities}
            proficiencyBonus={proficiencyBonus}
            modifiers={
              infusionBonuses.spellAttackBonus
                ? [
                    ...draft.modifiers,
                    {
                      id: 'infusion:spell_attack',
                      target: 'spell_attack' as const,
                      label: 'Инфузия (фокус)',
                      op: '+' as const,
                      expr: String(infusionBonuses.spellAttackBonus),
                      enabled: true,
                      source: 'system' as const,
                      class_slug: 'artificer',
                    },
                  ]
                : draft.modifiers
            }
            formulaVars={formulaVarsBase}
            learnBudget={spellLearnBudget}
            learnBudgets={spellLearnBudgets}
            classes={draft.classes}
            castProfiles={spellcastingSync.castProfiles}
            characterLevel={characterLevel}
            pinned={deskSplit && splitSecondary === 'spells'}
            concentration={draft.play.concentration}
            edition={rulesEdition}
            settingsLabel={isPlayDesk ? 'Магия' : 'Книга'}
            onOpenSettings={() => {
              if (!isPlayDesk) setMobileSpellSurface('book')
              setSpellsSettingsOpen(true)
            }}
            onSpellsChange={(spells) => setDraft((prev) => ({ ...prev, spells }))}
            onCastSpell={(spell) => setDeskCastSpell(spell)}
            onConcentrateSpell={(spell) => setDeskCastSpell(spell)}
            onClearSplit={
              deskSplit && splitSecondary === 'spells'
                ? () => patchSheetUi({ deskSplit: false })
                : undefined
            }
            onSlotUsedChange={(level, used) => {
              const key = String(level)
              setDraft((prev) => {
                const slot = prev.spells.slots[key] ?? { max: 0, used: 0 }
                const nextUsed = Math.min(slot.max, Math.max(0, used))
                if (nextUsed === slot.used) return prev
                return {
                  ...prev,
                  spells: {
                    ...prev.spells,
                    slots: {
                      ...prev.spells.slots,
                      [key]: { ...slot, used: nextUsed },
                    },
                  },
                }
              })
            }}
            onPactUsedChange={(used) => {
              setDraft((prev) => {
                const pact = prev.spells.pact_slots
                if (!pact) return prev
                const nextUsed = Math.min(pact.max, Math.max(0, used))
                if (nextUsed === pact.used) return prev
                return {
                  ...prev,
                  spells: {
                    ...prev.spells,
                    pact_slots: { ...pact, used: nextUsed },
                  },
                }
              })
            }}
          />
          <SpellsSettingsDialog
            open={spellsSettingsOpen}
            edition={rulesEdition}
            className={classSummary || primaryClass?.name || ''}
            level={characterLevel}
            classes={draft.classes}
            subclassCasters={subclassCastersForSpells}
            spells={draft.spells}
            abilities={effectiveAbilities}
            proficiencyBonus={proficiencyBonus}
            modifiers={draft.modifiers}
            formulaVars={formulaVarsBase}
            onModifiersChange={(modifiers) =>
              setDraft((prev) => ({ ...prev, modifiers }))
            }
            suggestion={spellcastingSync.suggestion}
            knownCaster={spellcastingSync.knownCaster}
            coins={draft.inventory.coins}
            onCoinsChange={(coins) =>
              setDraft((prev) => ({
                ...prev,
                inventory: { ...prev.inventory, coins },
              }))
            }
            inventoryItems={draft.inventory.items}
            onInventoryItemsChange={(items) =>
              setDraft((prev) => ({
                ...prev,
                inventory: { ...prev.inventory, items },
              }))
            }
            onChangeInventory={({ coins, items }) =>
              setDraft((prev) => ({
                ...prev,
                inventory: { ...prev.inventory, coins, items },
              }))
            }
            title={isPlayDesk ? 'Настройки заклинаний' : 'Книга заклинаний'}
            onChange={(spells) => setDraft((prev) => ({ ...prev, spells }))}
            onClose={() => {
              setSpellsSettingsOpen(false)
              if (!isPlayDesk) setMobileSpellSurface('combat')
            }}
            onToast={onToast}
          />
        </>
      ) : (
        <SpellsPanel
          edition={baseCharacter.rules_edition as RulesEdition}
          className={classSummary || primaryClass?.name || ''}
          level={characterLevel}
          classes={draft.classes}
          subclassCasters={subclassCastersForSpells}
          spells={draft.spells}
          characterId={character.id}
          companions={draft.companions}
          onCompanionsChange={(update) =>
            setDraft((prev) => ({
              ...prev,
              companions:
                typeof update === 'function' ? update(prev.companions) : update,
            }))
          }
          knownForms={draft.knownForms}
          onKnownFormsChange={(knownForms) =>
            setDraft((prev) => ({ ...prev, knownForms }))
          }
          hostHp={draft.hpCurrent}
          hostHpMax={draft.hpMax}
          abilities={effectiveAbilities}
          proficiencyBonus={proficiencyBonus}
          modifiers={draft.modifiers}
          formulaVars={formulaVarsBase}
          inventoryItems={draft.inventory.items}
          inventory={draft.inventory}
          concentration={draft.play.concentration}
          onChange={(spells) => setDraft((prev) => ({ ...prev, spells }))}
          onInventoryChange={(inventory) =>
            setDraft((prev) => {
              const focusSpells = withSpellFocusFlags(prev.spells, inventory.items)
              const isWizard =
                spellLearnBudget?.mode === 'spellbook' ||
                prev.classes.some((row) => /волшебник|wizard|маг/i.test(row.name))
              const synced = syncWizardSpellbookWithInventory({
                isWizard,
                spells: focusSpells,
                items: inventory.items,
              })
              if (synced.message) queueMicrotask(() => onToast(synced.message!))
              return { ...prev, inventory, spells: synced.spells }
            })
          }
          onConcentrationChange={(concentration) => {
            let dismissed: string[] = []
            setDraft((prev) => {
              const result = applyConcentrationChangeToCompanions({
                companions: prev.companions,
                previous: prev.play.concentration,
                next: concentration,
              })
              dismissed = result.dismissedNames
              return {
                ...prev,
                companions: result.companions,
                play: { ...prev.play, concentration },
              }
            })
            if (dismissed.length) {
              onToast(
                `Концентрация снята · напарник неактивен: ${dismissed.join(', ')}`,
              )
            }
          }}
          onToast={onToast}
        />
      )}

      </div>

      <div className="play-desk__stage-panel" hidden={stageHidden('companions')}>
      {/* Companions: CompanionsPanel glance→expand — no compact/full flip. */}
      <CompanionsPanel
        companions={draft.companions}
        onChange={(companions) => setDraft((prev) => ({ ...prev, companions }))}
        hostHp={draft.hpCurrent}
        onHostHpChange={(hp) =>
          setDraft((prev) => ({ ...prev, hpCurrent: hp }))
        }
        moonHealEnabled={unlockedFeatures.some(
          (f) => f.id === 'combat_wild_shape',
        )}
        spells={draft.spells}
        onSpellsChange={(spells) => setDraft((prev) => ({ ...prev, spells }))}
        onToast={onToast}
      />

      </div>

      <div className="play-desk__stage-panel" hidden={stageHidden('texts')}>
      {/* Social: TextBlocksPanel glance→expand — no compact/full flip. */}
      <TextBlocksPanel
        blocks={draft.textBlocks}
        onChange={(textBlocks) => setDraft((prev) => ({ ...prev, textBlocks }))}
        resources={draft.play.resources}
        onResourcesChange={(resources) =>
          setDraft((prev) => ({
            ...prev,
            play: { ...prev.play, resources },
          }))
        }
      />

      </div>

      </div>{/* scene-wrap */}

      {error ? <Text tone="danger">{error}</Text> : null}

      <div className="sheet-actions sheet-actions--autosave">
        <Text
          tone={saveStatus === 'error' ? 'danger' : 'muted'}
          className={
            saveStatus === 'saving' || saveStatus === 'dirty'
              ? 'sheet-autosave sheet-autosave--busy'
              : 'sheet-autosave'
          }
        >
          {reloading
            ? 'Обновляем…'
            : saveStatus === 'saving'
              ? 'Сохраняем…'
              : saveStatus === 'dirty'
                ? 'Сохраним через мгновение…'
                : saveStatus === 'error'
                  ? 'Ошибка сохранения'
                  : 'Сохранено'}
        </Text>
        <Text tone="muted">
          Редакция {baseCharacter.rules_edition} · v{sheetVersion}
        </Text>
      </div>

      </div>{/* stage */}
      </div>{/* body */}

      {!isPlayDesk ? (
        <BottomSceneNav
          mode={draft.sheetUi.deskMode}
          onModeChange={setDeskMode}
          showValueTips={showValueTips}
        />
      ) : null}

      {!isPlayDesk ? (
        <MobileAbilitiesPage
          open={mobileAbilitiesOpen}
          onClose={() => setMobileAbilitiesOpen(false)}
          onOpenOwnership={() => {
            // Keep Характеристики under the ownership sheet.
            setOwnershipOpen(true)
          }}
          passives={passivesCompact}
        >
          {abilityColumn}
        </MobileAbilitiesPage>
      ) : null}

      {ownershipOpen ? (
        <>
          <div
            className="play-desk-drawer-backdrop"
            onClick={() => setOwnershipOpen(false)}
          />
          <aside className="play-desk-drawer" aria-label="Владения">
            <div className="play-desk-drawer__head">
              <h3>Владения</h3>
              <Button type="button" variant="ghost" onClick={() => setOwnershipOpen(false)}>
                Закрыть
              </Button>
            </div>
            <div className="play-desk-drawer__body">
              <Panel title="Скорости и зрение">
                <Stack gap={12}>
                  <Field
                    label="Тёмное зрение, фт"
                    htmlFor="sheet-darkvision"
                    hint={
                      effectiveDarkvisionFt !== draft.identity.darkvision
                        ? `база ${draft.identity.darkvision || 0} · итого ${effectiveDarkvisionFt} фт (умения/предметы)`
                        : '0 = нет'
                    }
                  >
                    <NumberInput
                      id="sheet-darkvision"
                      min={0}
                      emptyValue={0}
                      value={draft.identity.darkvision}
                      onValueChange={(darkvision) =>
                        patchIdentity({ darkvision: darkvision ?? 0 })
                      }
                    />
                  </Field>
                  <div className="sheet-grid sheet-grid--speeds">
                    <Field label="Лазание, фт" htmlFor="sheet-climb" hint="пусто = нет">
                      <NumberInput
                        id="sheet-climb"
                        min={0}
                        value={draft.climbSpeed}
                        onValueChange={(climbSpeed) =>
                          setDraft((prev) => ({ ...prev, climbSpeed }))
                        }
                      />
                    </Field>
                    <Field label="Плавание, фт" htmlFor="sheet-swim" hint="пусто = нет">
                      <NumberInput
                        id="sheet-swim"
                        min={0}
                        value={draft.swimSpeed}
                        onValueChange={(swimSpeed) =>
                          setDraft((prev) => ({ ...prev, swimSpeed }))
                        }
                      />
                    </Field>
                    <Field label="Полёт, фт" htmlFor="sheet-fly" hint="пусто = нет">
                      <NumberInput
                        id="sheet-fly"
                        min={0}
                        value={draft.flySpeed}
                        onValueChange={(flySpeed) =>
                          setDraft((prev) => ({ ...prev, flySpeed }))
                        }
                      />
                    </Field>
                  </div>
                </Stack>
              </Panel>

              <EquipmentProficienciesPanel
                armor={draft.identity.armor}
                weapons={draft.identity.weapons}
                onChange={(patch) => {
                  let dropped = 0
                  setDraft((prev) => {
                    const nextArmor = patch.armor ?? prev.identity.armor
                    const nextWeapons = patch.weapons ?? prev.identity.weapons
                    let items = prev.inventory.items
                    // Drop armor/shield that the character can no longer wear.
                    if (patch.armor) {
                      items = items.map((item) => {
                        if (
                          item.equipped &&
                          item.armor_kind !== 'none' &&
                          !canWearArmor(item.armor_kind, nextArmor)
                        ) {
                          dropped += 1
                          return { ...item, equipped: false }
                        }
                        return item
                      })
                    }
                    return {
                      ...prev,
                      identity: {
                        ...prev.identity,
                        armor: nextArmor,
                        weapons: nextWeapons,
                      },
                      inventory: { ...prev.inventory, items },
                      weapons: syncAttacksHeldFromInventory(prev.weapons, items),
                    }
                  })
                  if (dropped > 0) {
                    onToast(
                      dropped === 1
                        ? 'Доспех снят — нет владения'
                        : `Снято без владения: ${dropped}`,
                    )
                  }
                }}
              />
              <LanguagesToolsPanel
                languages={draft.identity.languages}
                tools={draft.identity.tools}
                onChange={(patch) => patchIdentity(patch)}
              />
            </div>
          </aside>
        </>
      ) : null}

      <Dialog
        open={rollHistoryOpen}
        title="История бросков"
        primaryLabel="Закрыть"
        secondaryLabel="Отмена"
        onPrimary={() => setRollHistoryOpen(false)}
        onSecondary={() => setRollHistoryOpen(false)}
        closeOnBackdrop
        size="wide"
      >
        {draft.sheetUi.rollHistory.length === 0 ? (
          <Text tone="muted">Пока пусто — бросай атаки, навыки или инициативу.</Text>
        ) : (
          <Stack gap={10}>
            <div className="desk-roll-history__toolbar">
              <Text tone="muted">
                {draft.sheetUi.rollHistory.length} запис.
                {draft.sheetUi.rollHistory.length >= 50 ? ' (лимит 50)' : ''}
              </Text>
              <Button
                variant="ghost"
                onClick={() => patchSheetUi({ rollHistory: [] })}
              >
                Очистить
              </Button>
            </div>
            <ul className="desk-roll-history">
              {draft.sheetUi.rollHistory.map((row) => {
                const when = (() => {
                  try {
                    return new Date(row.at).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  } catch {
                    return ''
                  }
                })()
                return (
                  <li key={row.id} className="desk-roll-history__row">
                    {when ? (
                      <time className="desk-roll-history__time" dateTime={row.at}>
                        {when}
                      </time>
                    ) : null}
                    <span className="desk-roll-history__text">{row.text}</span>
                  </li>
                )
              })}
            </ul>
          </Stack>
        )}
      </Dialog>

      <Dialog
        open={conflictOpen}
        title="Конфликт версий листа"
        primaryLabel={reloading ? 'Сохраняем…' : 'Сохранить мои правки'}
        secondaryLabel="Взять с сервера"
        busy={reloading}
        onPrimary={() => void saveLocalOverServer()}
        onSecondary={() => {
          if (reloading) return
          void reloadFromServer()
        }}
        closeOnBackdrop={false}
      >
        <Text>
          На сервере уже есть более новая версия (другая вкладка, устройство или гонка автосейва).
          «Сохранить мои правки» запишет то, что на экране. «Взять с сервера» заменит экран
          серверной копией — локальные правки пропадут.
        </Text>
      </Dialog>

      <Dialog
        open={concDamageAsk != null}
        title="Концентрация"
        primaryLabel="Удержал"
        secondaryLabel="Сорвалось"
        primaryVariant="primary"
        onPrimary={() => {
          setConcDamageAsk(null)
          onToast('Концентрация удержана')
        }}
        onSecondary={() => {
          clearConcentrationDismissingCompanions(null)
          setConcDamageAsk(null)
          onToast('Концентрация сорвалась')
        }}
      >
        <Text>
          Урон {concDamageAsk?.damage ?? 0} HP. Спас концентрации Сл{' '}
          {concDamageAsk?.dc ?? 10}
          {concDamageAsk?.spellName ? ` («${concDamageAsk.spellName}»)` : ''}. Удержал?
        </Text>
      </Dialog>

      <CastSpellDialog
        open={deskCastSpell != null}
        spell={deskCastSpell}
        spells={draft.spells}
        inventoryItems={draft.inventory.items}
        characterLevel={characterLevel}
        characterId={character.id}
        wizardRitualFromBook={spellLearnBudget?.mode === 'spellbook'}
        abilities={effectiveAbilities}
        proficiencyBonus={proficiencyBonus}
        castProfiles={spellcastingSync.castProfiles}
        modifiers={draft.modifiers}
        formulaVars={formulaVarsBase}
        onSelectSpellVariant={setDeskCastSpell}
        onConfirm={confirmDeskCast}
        onClose={() => setDeskCastSpell(null)}
        onRequestRest={() => {
          setDeskCastSpell(null)
          setRestOpen(true)
        }}
        onRestorePact={() => {
          setDraft((prev) => {
            const pact = prev.spells.pact_slots
            if (!pact || pact.used <= 0) return prev
            return {
              ...prev,
              spells: {
                ...prev.spells,
                pact_slots: { ...pact, used: 0 },
              },
            }
          })
          onToast('Ячейки договора восстановлены')
        }}
      />

      <ConsumableSpendPadDialog
        key={consumableSpendPadId ?? 'consumable-spend-pad-closed'}
        open={consumableSpendPadId != null}
        itemName={
          consumableSpendPadId
            ? draft.inventory.items.find((row) => row.id === consumableSpendPadId)?.name ??
              'Расходник'
            : 'Расходник'
        }
        maxQty={
          consumableSpendPadId
            ? Math.max(
                0,
                draft.inventory.items.find((row) => row.id === consumableSpendPadId)?.qty ?? 0,
              )
            : 0
        }
        onClose={() => setConsumableSpendPadId(null)}
        onConfirm={(amount) => {
          const itemId = consumableSpendPadId
          setConsumableSpendPadId(null)
          if (!itemId) return
          spendConsumableFromDesk(itemId, amount)
        }}
      />

      <CastScrollDialog
        open={deskCastScrollId != null}
        item={
          deskCastScrollId
            ? draft.inventory.items.find((row) => row.id === deskCastScrollId) ?? null
            : null
        }
        onConfirm={() => {
          const itemId = deskCastScrollId
          if (!itemId) return
          const item = draft.inventory.items.find((row) => row.id === itemId)
          if (!item || !isCastableSpellScroll(item) || !item.scroll_spell) {
            setDeskCastScrollId(null)
            return
          }
          const binding = item.scroll_spell
          const stats = spellScrollCastStats(binding.level)
          const scrollSpellId = `scroll:${item.id}:${binding.catalog_id ?? binding.name}`
          if (
            binding.concentration &&
            draft.play.concentration &&
            draft.play.concentration.spell_id !== scrollSpellId &&
            draft.play.concentration.name.trim() !== binding.name.trim()
          ) {
            setDeskCastScrollPending({
              itemId,
              name: binding.name,
              concentration: true,
            })
            setDeskCastScrollId(null)
            return
          }
          setDraft((prev) => {
            let next = {
              ...prev,
              inventory: {
                ...prev.inventory,
                items: consumeScrollItem(prev.inventory.items, itemId),
              },
            }
            if (binding.concentration) {
              const nextConc = setConcentration({
                spellId: scrollSpellId,
                name: binding.name,
              })
              const result = applyConcentrationChangeToCompanions({
                companions: next.companions,
                previous: next.play.concentration,
                next: nextConc,
              })
              next = {
                ...next,
                companions: result.companions,
                play: {
                  ...next.play,
                  concentration: nextConc,
                },
              }
            }
            return next
          })
          setDeskCastScrollId(null)
          onToast(
            `Свиток: ${binding.name} · Сл ${stats.saveDc} · +${stats.attackBonus}${
              binding.concentration ? ' · концентрация' : ''
            } · свиток израсходован`,
          )
        }}
        onClose={() => setDeskCastScrollId(null)}
      />

      <Dialog
        open={deskCastScrollPending != null}
        title="Смена концентрации"
        primaryLabel="Сменить и кастовать свиток"
        secondaryLabel="Отмена"
        primaryVariant="danger"
        onPrimary={() => {
          if (!deskCastScrollPending) return
          const { itemId, name } = deskCastScrollPending
          const item = draft.inventory.items.find((row) => row.id === itemId)
          const binding = item?.scroll_spell
          setDeskCastScrollPending(null)
          if (!item || !binding || !isCastableSpellScroll(item)) return
          const stats = spellScrollCastStats(binding.level)
          const scrollSpellId = `scroll:${item.id}:${binding.catalog_id ?? binding.name}`
          setDraft((prev) => {
            const nextConc = setConcentration({
              spellId: scrollSpellId,
              name,
            })
            const result = applyConcentrationChangeToCompanions({
              companions: prev.companions,
              previous: prev.play.concentration,
              next: nextConc,
            })
            return {
              ...prev,
              companions: result.companions,
              inventory: {
                ...prev.inventory,
                items: consumeScrollItem(prev.inventory.items, itemId),
              },
              play: {
                ...prev.play,
                concentration: nextConc,
              },
            }
          })
          onToast(
            `Свиток: ${name} · Сл ${stats.saveDc} · +${stats.attackBonus} · концентрация · свиток израсходован`,
          )
        }}
        onSecondary={() => {
          if (deskCastScrollPending) setDeskCastScrollId(deskCastScrollPending.itemId)
          setDeskCastScrollPending(null)
        }}
      >
        <Text>
          Сейчас концентрация: «{draft.play.concentration?.name ?? '—'}». Сменить на «
          {deskCastScrollPending?.name ?? 'Заклинание'}» со свитка?
        </Text>
      </Dialog>

      <Dialog
        open={deskCastPending != null}
        title="Смена концентрации"
        primaryLabel="Сменить и кастовать"
        secondaryLabel="Отмена"
        primaryVariant="danger"
        onPrimary={() => {
          if (!deskCastPending) return
          const { spell, choice } = deskCastPending
          setDeskCastPending(null)
          runDeskCast(spell, choice)
        }}
        onSecondary={() => {
          // Return to cast picker — Cancel must not drop the cast flow.
          if (deskCastPending) setDeskCastSpell(deskCastPending.spell)
          setDeskCastPending(null)
        }}
      >
        <Text>
          Сейчас концентрация: «{draft.play.concentration?.name ?? '—'}». Сменить на «
          {deskCastPending?.spell.name || 'Заклинание'}»? Ячейка потратится после подтверждения.
        </Text>
      </Dialog>

      <HotConditionsDialog
        open={hotConditionsOpen}
        edition={rulesEdition}
        play={draft.play}
        onPlayChange={(play) => setDraft((prev) => ({ ...prev, play }))}
        onToast={onToast}
        onClose={() => setHotConditionsOpen(false)}
      />

      <AcBreakdownDialog
        open={acBreakdownOpen}
        totalAc={armorClass.ac}
        summary={armorClass.gearSummary}
        baseLabel={armorClass.baseLabel}
        shieldBonus={armorClass.shieldBonus}
        shieldInHand={Boolean(equippedArmorPieces(draft.inventory.items).shield)}
        shieldAvailable={listShieldItems(draft.inventory.items).length > 0}
        onToggleShield={() => {
          const shields = listShieldItems(draft.inventory.items)
          const anyOn = shields.some((row) => row.equipped)
          if (!anyOn && !canWearArmor('shield', draft.identity.armor)) {
            onToast(armorProficiencyHint('shield'))
            return
          }
          const result = toggleShieldInHand(draft.inventory.items)
          if (!result.ok) {
            onToast(result.reason)
            return
          }
          setDraft((prev) => ({
            ...prev,
            inventory: { ...prev.inventory, items: result.items },
            weapons: syncAttacksHeldFromInventory(prev.weapons, result.items),
          }))
          onToast(
            result.equipped
              ? `Щит «${result.name}» в руке`
              : `Щит «${result.name}» убран`,
          )
        }}
        formulaVars={armorClass.formulaVars}
        modifiers={draft.modifiers}
        onModifiersChange={(modifiers) =>
          setDraft((prev) => ({ ...prev, modifiers }))
        }
        onClose={() => setAcBreakdownOpen(false)}
      />

      <AbilityBreakdownDialog
        open={abilityBreakdownKey != null}
        ability={abilityBreakdownKey ?? 'str'}
        baseScore={
          abilityBreakdownKey ? draft.abilities[abilityBreakdownKey] : 10
        }
        gearScore={
          abilityBreakdownKey ? gearAbilities[abilityBreakdownKey] : 10
        }
        proficientSave={
          abilityBreakdownKey ? draft.saves[abilityBreakdownKey] : false
        }
        proficiencyBonus={proficiencyBonus}
        formulaVars={formulaVarsBase}
        modifiers={draft.modifiers}
        onBaseScoreChange={(score) => {
          if (!abilityBreakdownKey) return
          setDraft((prev) => ({
            ...prev,
            abilities: { ...prev.abilities, [abilityBreakdownKey]: score },
          }))
        }}
        onSaveProficiencyChange={(proficient) => {
          if (!abilityBreakdownKey) return
          setDraft((prev) => ({
            ...prev,
            saves: { ...prev.saves, [abilityBreakdownKey]: proficient },
          }))
        }}
        onModifiersChange={(modifiers) =>
          setDraft((prev) => ({ ...prev, modifiers }))
        }
        onClose={() => setAbilityBreakdownKey(null)}
      />

      <InitiativeBreakdownDialog
        open={initiativeBreakdownOpen}
        autoCore={initiativeAutoCore}
        autoLabel={initiativeAutoLabel || 'ЛОВ'}
        override={draft.initiativeOverride}
        onOverrideChange={(initiativeOverride) =>
          setDraft((prev) => ({ ...prev, initiativeOverride }))
        }
        formulaVars={formulaVarsBase}
        modifiers={draft.modifiers}
        onModifiersChange={(modifiers) =>
          setDraft((prev) => ({ ...prev, modifiers }))
        }
        onRoll={() => {
          emitToast(
            formatSkillRoll('Инициатива', initiativeValue, effectiveRollMode()),
          )
        }}
        onClose={() => setInitiativeBreakdownOpen(false)}
      />

      <RestDialog
        open={restOpen}
        level={characterLevel}
        hpCurrent={draft.hpCurrent}
        hpMax={draft.hpMax}
        constitutionMod={abilityModifier(draft.abilities.con)}
        play={draft.play}
        spells={draft.spells}
        featureDesiredResources={featureDesiredResources}
        onPlayChange={(play) =>
          setDraft((prev) => {
            const result = applyConcentrationChangeToCompanions({
              companions: prev.companions,
              previous: prev.play.concentration,
              next: play.concentration,
            })
            return {
              ...prev,
              play,
              companions: result.companions,
            }
          })
        }
        onSpellsChange={(spells) => setDraft((prev) => ({ ...prev, spells }))}
        onCombatChange={(patch) =>
          setDraft((prev) => ({
            ...prev,
            ...(patch.hpCurrent !== undefined ? { hpCurrent: patch.hpCurrent } : {}),
          }))
        }
        onCompanionRest={(kind) => {
          let dismissed: string[] = []
          setDraft((prev) => {
            const result = dismissSelfFormsOnRest(prev.companions, kind)
            dismissed = result.dismissedNames
            return { ...prev, companions: result.companions }
          })
          if (dismissed.length) {
            onToast(`Отдых: облик сброшен (${dismissed.join(', ')})`)
          }
        }}
        onToast={onToast}
        onClose={() => setRestOpen(false)}
      />

      <SorceryPointsSpendDialog
        open={sorcerySpendId != null}
        resource={sorceryResource}
        metamagicIds={sorcererMetamagicIds}
        slots={draft.spells.slots}
        onSetUsed={(used) => {
          if (!sorcerySpendId) return
          setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === sorcerySpendId ? { ...row, used } : row,
              ),
            },
          }))
        }}
        onSlotsChange={(slots) =>
          setDraft((prev) => ({
            ...prev,
            spells: { ...prev.spells, slots },
          }))
        }
        onToast={onToast}
        onClose={() => setSorcerySpendId(null)}
      />

      <ChannelDivinitySpendDialog
        open={channelDivinitySpendId != null}
        resource={channelDivinityResource}
        features={unlockedFeatures}
        onSpend={(label) => {
          if (!channelDivinitySpendId) return
          setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === channelDivinitySpendId && row.used < row.max
                  ? { ...row, used: row.used + 1 }
                  : row,
              ),
            },
          }))
          onToast(`${label}: −1 Божественный канал`)
          setChannelDivinitySpendId(null)
        }}
        onToast={onToast}
        onClose={() => setChannelDivinitySpendId(null)}
      />

      <KiSpendDialog
        open={kiSpendId != null}
        resource={kiResource}
        features={unlockedFeatures}
        onSpend={(label, cost) => {
          if (!kiSpendId) return
          setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== kiSpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          onToast(`${label}: −${cost} ки`)
          setKiSpendId(null)
        }}
        onToast={onToast}
        onClose={() => setKiSpendId(null)}
      />

      {wildShapeFork ? (
        <WildShapeDialog
          open
          onClose={() => setWildShapeFork(null)}
          features={unlockedFeatures.filter(
            (f) => f.classEntryId === wildShapeFork.classEntryId,
          )}
          resources={draft.play.resources}
          companions={draft.companions}
          knownForms={draft.knownForms}
          classSlug={wildShapeFork.classSlug}
          classEntryId={wildShapeFork.classEntryId}
          druidLevel={druidLevel}
          subclassSlug={druidSubclassSlug}
          hostHp={draft.hpCurrent ?? 0}
          hostHpMax={draft.hpMax ?? 0}
          edition={rulesEdition === '2024' ? '2024' : '2014'}
          onConfirm={(result) => {
            applyWildShapeResult(result)
            setWildShapeFork(null)
          }}
        />
      ) : null}

      {featureSelfForm ? (
        <FeatureSelfFormDialog
          open
          onClose={() => setFeatureSelfForm(null)}
          limits={shapechangerFormLimits()}
          companions={draft.companions}
          knownForms={draft.knownForms}
          hostHp={draft.hpCurrent ?? 0}
          hostHpMax={draft.hpMax ?? 0}
          edition={rulesEdition === '2024' ? '2024' : '2014'}
          onConfirm={(result: FeatureSelfFormDialogResult) => {
            const spent = spendFeatureUse({
              resources: draft.play.resources,
              feature: featureSelfForm.feature,
              classSlug: featureSelfForm.classSlug,
            })
            if (!spent.ok) {
              onToast(spent.message)
              return
            }
            setDraft((prev) => ({
              ...prev,
              companions: result.companions,
              knownForms: result.knownForms,
              play: { ...prev.play, resources: spent.resources },
            }))
            onToast(result.toast)
            setFeatureSelfForm(null)
          }}
        />
      ) : null}

      {pendingSpellSelfForm ? (
        <SpellFormDialog
          open
          spell={pendingSpellSelfForm.spell}
          slug={pendingSpellSelfForm.slug}
          companions={draft.companions}
          knownForms={draft.knownForms}
          characterLevel={characterLevel}
          hostHp={draft.hpCurrent ?? 0}
          hostHpMax={draft.hpMax ?? 0}
          edition={rulesEdition === '2024' ? '2024' : '2014'}
          onConfirm={applySpellSelfFormResult}
          onClose={() => {
            setPendingSpellSelfForm(null)
            onToast(
              'Облик не выбран — концентрация активна; карточку можно не создавать',
            )
          }}
        />
      ) : null}

      <BardicInspirationSpendDialog
        open={bardicInspirationSpendId != null}
        resource={bardicInspirationResource}
        features={unlockedFeatures}
        onSpend={(label, cost) => {
          if (!bardicInspirationSpendId) return
          setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== bardicInspirationSpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          onToast(`${label}: −${cost} Бардовское вдохновение`)
          setBardicInspirationSpendId(null)
        }}
        onToast={onToast}
        onClose={() => setBardicInspirationSpendId(null)}
      />

      <LayOnHandsSpendDialog
        open={layOnHandsSpendId != null}
        resource={layOnHandsResource}
        onSpend={(label, cost) => {
          if (!layOnHandsSpendId) return
          setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== layOnHandsSpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          onToast(`${label}: −${cost} из пула Возложения рук`)
          setLayOnHandsSpendId(null)
        }}
        onToast={onToast}
        onClose={() => setLayOnHandsSpendId(null)}
      />

      <SuperiorityDiceSpendDialog
        open={superioritySpendId != null}
        resource={superiorityResource}
        features={unlockedFeatures}
        featurePicks={draft.featurePicks}
        onSpend={(label, cost) => {
          if (!superioritySpendId) return
          setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== superioritySpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          onToast(`${label}: −${cost} кость превосходства`)
          setSuperioritySpendId(null)
        }}
        onToast={onToast}
        onClose={() => setSuperioritySpendId(null)}
      />

      <ArcaneRecoverySpendDialog
        open={arcaneRecoverySpendId != null}
        resource={arcaneRecoveryResource}
        wizardLevel={arcaneRecoveryWizardLevel}
        slots={draft.spells.slots}
        onRecover={(slots, label) => {
          if (!arcaneRecoverySpendId) return
          setDraft((prev) => ({
            ...prev,
            spells: { ...prev.spells, slots },
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === arcaneRecoverySpendId && row.used < row.max
                  ? { ...row, used: row.used + 1 }
                  : row,
              ),
            },
          }))
          onToast(label)
          setArcaneRecoverySpendId(null)
        }}
        onToast={onToast}
        onClose={() => setArcaneRecoverySpendId(null)}
      />

      <InfusionsActiveDialog
        open={infusionsSpendId != null && infusionsContext != null}
        resource={infusionsResource}
        characterId={baseCharacter.id}
        characterName={draft.name?.trim() || baseCharacter.name || 'Изобретатель'}
        classEntryId={infusionsContext?.classEntryId ?? ''}
        artificerLevel={infusionsContext?.level ?? 1}
        featurePicks={draft.featurePicks}
        onFeaturePicksChange={(featurePicks) =>
          setDraft((prev) => ({ ...prev, featurePicks }))
        }
        onSlotsUsedChange={(used) => {
          if (!infusionsSpendId) return
          setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === infusionsSpendId
                  ? { ...row, used: Math.min(row.max, Math.max(0, used)) }
                  : row,
              ),
            },
          }))
        }}
        onToast={onToast}
        onClose={() => setInfusionsSpendId(null)}
      />

      <WarlockArcanumSpendDialog
        open={arcanumSpendId != null}
        resource={arcanumResource}
        features={unlockedFeatures}
        resources={draft.play.resources}
        onSpend={(poolResourceId, label) => {
          setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === poolResourceId && row.used < row.max
                  ? { ...row, used: row.used + 1 }
                  : row,
              ),
            },
          }))
          onToast(`${label}: −1`)
          setArcanumSpendId(null)
        }}
        onToast={onToast}
        onClose={() => setArcanumSpendId(null)}
      />

      <WarlockInvocationsDialog
        open={invocationsOpen != null}
        classEntryId={invocationsOpen?.classEntryId ?? ''}
        featurePicks={draft.featurePicks}
        onToast={onToast}
        onClose={() => setInvocationsOpen(null)}
      />

      <PsionicDiceSpendDialog
        open={psionicSpendId != null}
        resource={psionicResource}
        features={unlockedFeatures}
        onSpend={(label, cost) => {
          if (!psionicSpendId) return
          setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) => {
                if (row.id !== psionicSpendId) return row
                const nextUsed = Math.min(row.max, row.used + cost)
                if (nextUsed === row.used) return row
                return { ...row, used: nextUsed }
              }),
            },
          }))
          onToast(`${label}: −${cost} пси`)
          setPsionicSpendId(null)
        }}
        onToast={onToast}
        onClose={() => setPsionicSpendId(null)}
      />

      <SoulTrinketsSpendDialog
        open={soulTrinketsSpendId != null}
        resource={soulTrinketsResource}
        features={unlockedFeatures}
        onBurn={(label) => {
          if (!soulTrinketsSpendId) return
          setDraft((prev) => ({
            ...prev,
            play: {
              ...prev.play,
              resources: prev.play.resources.map((row) =>
                row.id === soulTrinketsSpendId && row.used > 0
                  ? { ...row, used: row.used - 1 }
                  : row,
              ),
            },
          }))
          onToast(`${label}: −1 частица`)
          setSoulTrinketsSpendId(null)
        }}
        onToast={onToast}
        onClose={() => setSoulTrinketsSpendId(null)}
      />

      <RangerFavoredDeskDialog
        open={rangerFavoredOpen != null}
        classEntryId={rangerFavoredOpen?.classEntryId ?? ''}
        featurePicks={draft.featurePicks}
        onToast={onToast}
        onClose={() => setRangerFavoredOpen(null)}
      />

      <LevelUpDialog
        open={levelUpOpen}
        edition={baseCharacter.rules_edition as RulesEdition}
        classes={draft.classes}
        abilities={draft.abilities}
        constitutionMod={abilityModifier(draft.abilities.con)}
        onConfirm={applyLevelUp}
        onClose={() => setLevelUpOpen(false)}
      />

      <GuidedWizardDialog
        open={guidedWizard != null}
        session={guidedWizard}
        abilities={draft.abilities}
        skills={draft.skills}
        tools={draft.identity.tools}
        featurePicks={draft.featurePicks}
        expertiseKeys={expertiseKeys}
        onFeaturePicksChange={applyFeaturePicksWithExpertise}
        onConfirmClassGrant={(picks) => {
          if (!guidedWizard?.grant || !guidedWizard.steps[guidedWizard.index]) return
          const step = guidedWizard.steps[guidedWizard.index]
          if (step.kind !== 'class_grant') return
          const grantMeta = guidedWizard.grant
          const jumpTo =
            step.mode === 'start' && pendingStartingLevel > 1 ? pendingStartingLevel : 1
          const blockedSkill = new Set(draft.backgroundGrant?.skills ?? [])
          const blockedTool = new Set(
            (draft.backgroundGrant?.tools ?? []).map((name) => name.trim().toLowerCase()),
          )
          const cleanPicks = {
            ...picks,
            skills: picks.skills.filter((key) => !blockedSkill.has(key)),
            tools: picks.tools.filter(
              (name) => !blockedTool.has(name.trim().toLowerCase()),
            ),
          }
          let remaining: GuidedWizardStep[] = []
          let summary: string | null = null
          setDraft((prev) => {
            const applied = applyClassGrantToDraft({
              draft: draftSliceFrom(prev),
              classEntryId: step.classEntryId,
              className: step.className,
              mode: step.mode,
              picks: cleanPicks,
              def: grantMeta.def,
              catalogSlug: grantMeta.catalogSlug,
              catalogData: grantMeta.catalogData,
            })
            if (!applied) return prev
            summary = applied.summary
            let next = mergeGrantSlice(prev, applied.draft)
            if (jumpTo > 1) {
              next = jumpDraftToClassLevel(next, step.classEntryId, jumpTo)
            }
            const unlocked = unlockFeaturesForClasses({
              classes: next.classes,
              characterLevel: totalCharacterLevel(next.classes),
              abilities: next.abilities,
              subclassSlugByEntryId: subclassSlugMapFromLedger(next),
              subclassTransitionByEntryId: subclassTransitionMapFromLedger(
                next.subclassTransitions,
              ),
            })
            const hasSubclass: Record<string, boolean> = {}
            for (const row of next.classes) {
              hasSubclass[row.id] = Boolean(
                row.subclass_catalog_id || row.subclass_name.trim(),
              )
            }
            const classLevel =
              next.classes.find((row) => row.id === step.classEntryId)?.level ?? 1
            remaining = buildPendingWizardSteps({
              unlocked,
              featurePicks: next.featurePicks,
              classAsi: next.classAsi,
              filter:
                jumpTo > 1
                  ? {
                      mode: 'up_to_class_level',
                      classEntryId: step.classEntryId,
                      maxClassLevel: jumpTo,
                    }
                  : {
                      mode: 'at_class_level',
                      classEntryId: step.classEntryId,
                      classLevel,
                    },
              hasSubclassByEntryId: hasSubclass,
            })
            if (isWizardClassName(step.className)) {
              const wizardLevel =
                next.classes.find((row) => row.id === step.classEntryId)?.level ??
                classLevel
              const freeLeft = remainingFreeSpellbookSlots(
                next.spells.known,
                wizardLevel,
              )
              if (freeLeft > 0) {
                remaining = withWizardSpellbookPicksStep(remaining, {
                  classEntryId: step.classEntryId,
                  className: step.className,
                  classLevel: wizardLevel,
                  // Jump to N: catch up all free research; L1 start: up to 6.
                  picksNeeded:
                    jumpTo > 1
                      ? freeLeft
                      : wizardLevel <= 1
                        ? Math.min(6, freeLeft)
                        : Math.min(freeBookSlotsAtLevel(wizardLevel), freeLeft),
                })
              }
            }
            remaining = withPactTomeCantripsStep(remaining, {
              classEntryId: step.classEntryId,
              className: step.className,
              classLevel:
                next.classes.find((row) => row.id === step.classEntryId)?.level ??
                classLevel,
              featurePicks: next.featurePicks,
            })
            return next
          })
          if (summary) {
            onToast(
              `${step.mode === 'start' ? 'Старт' : 'Мультикласс'} «${step.className}»: ${summary}`,
            )
          }
          if (jumpTo > 1) {
            onToast(`Уровень класса → ${jumpTo}. Дальше — умения и ASI.`)
            setPendingStartingLevel(1)
            onCreateGuideConsumed?.()
          }
          openGuidedWizard({ steps: remaining, index: 0 })
        }}
        edition={rulesEdition}
        backgroundName={draft.identity.background}
        blockedSkillKeys={draft.backgroundGrant?.skills ?? []}
        blockedToolNames={draft.backgroundGrant?.tools ?? []}
        onSelectBackground={(entry) => {
          if (guidedWizard) {
            setPausedWizardForBackground(guidedWizard)
            setGuidedWizard(null)
          }
          void requestOrApplyBackgroundGrant(entry)
        }}
        onConfirmAsi={confirmClassAsi}
        onAdvance={advanceGuidedWizard}
        onSkipStep={skipGuidedWizardStep}
        onClose={() => setGuidedWizard(null)}
        onToast={onToast}
        subclassParentCatalogIdByEntryId={Object.fromEntries(
          draft.classes.map((row) => [row.id, row.catalog_id]),
        )}
        selectedSubclassNameByEntryId={Object.fromEntries(
          draft.classes.map((row) => [row.id, row.subclass_name]),
        )}
        onPickSubclass={(classEntryId, entry) => {
          beginSubclassSelection({
            classEntryId,
            selected: entry,
            advanceWizardAfter: true,
          })
        }}
        spellbookPicksContext={(() => {
          const step = guidedWizard?.steps[guidedWizard.index]
          if (!step || step.kind !== 'spellbook_picks') return null
          const slotCap = highestSpellSlotLevelForClasses(
            draft.classes,
            subclassCastersForSpells,
          )
          return {
            maxSpellLevel: Math.max(1, slotCap || 1),
            blockedCatalogIds: draft.spells.known
              .map((spell) => spell.catalog_id)
              .filter((id): id is string => Boolean(id)),
            hasBook: wizardHasUsableSpellbook(draft.spells),
            classListSlugs: ['wizard'],
          }
        })()}
        onConfirmSpellbookPicks={(entries) => {
          const step = guidedWizard?.steps[guidedWizard.index]
          const acquisition =
            step?.kind === 'spellbook_picks' && step.classLevel <= 1
              ? 'starting'
              : 'level_up'
          setDraft((prev) => {
            let known = prev.spells.known
            for (const entry of entries) {
              known = addCatalogSpellToKnown(known, entry, {
                prepare: false,
                spellbook_acquisition: acquisition,
                in_spellbook: true,
              })
            }
            return {
              ...prev,
              spells: { ...prev.spells, known },
            }
          })
        }}
      />

      <ClassAsiDialog
        open={pendingAsi != null}
        edition={baseCharacter.rules_edition as RulesEdition}
        className={pendingAsi?.className ?? ''}
        classLevel={pendingAsi?.classLevel ?? 1}
        featureId={pendingAsi?.featureId ?? ''}
        classEntryId={pendingAsi?.classEntryId ?? ''}
        abilities={draft.abilities}
        armor={draft.identity.armor}
        hasSpellcasting={characterHasCasterClass(draft.classes)}
        hasMartialWeapons={draft.identity.weapons.martial}
        raceSlug={draft.raceGrant?.slug ?? null}
        raceParentSlug={draft.raceGrant?.parentSlug ?? null}
        size={draft.identity.size}
        characterLevel={characterLevel}
        takenFeatSlugs={draft.featGrants.map((row) => row.slug)}
        classSlugs={draft.classGrants.map((row) => row.slug)}
        backgroundSlug={draft.identity.backgroundSlug}
        ownedFeatEnums={ownedFeatEnums}
        proficientSkills={proficientSkills}
        onConfirm={confirmClassAsi}
        onSkip={() => setPendingAsi(null)}
      />

      <ClassSetupDialog
        open={grantPicker != null}
        def={grantPicker?.def ?? null}
        mode={grantPicker?.mode ?? 'start'}
        blockedSkillKeys={draft.backgroundGrant?.skills ?? []}
        blockedToolNames={draft.backgroundGrant?.tools ?? []}
        edition={baseCharacter.rules_edition as RulesEdition}
        onClose={() => setGrantPicker(null)}
        onConfirm={(picks) => {
          if (!grantPicker) return
          commitClassGrant({
            classEntryId: grantPicker.classEntryId,
            className: grantPicker.className,
            mode: grantPicker.mode,
            picks,
            def: grantPicker.def,
            catalogSlug: grantPicker.catalogSlug,
            catalogData: grantPicker.catalogData,
          })
          setGrantPicker(null)
          const choiceSteps = buildChoiceStepsForClass({
            classEntryId: grantPicker.classEntryId,
            classLevel:
              draft.classes.find((row) => row.id === grantPicker.classEntryId)?.level ?? 1,
          })
          if (choiceSteps.length > 0) {
            openGuidedWizard({ steps: choiceSteps, index: 0 })
          }
        }}
      />

      <HomebrewClassDialog
        open={homebrewPicker != null}
        initialName={homebrewPicker?.initialName ?? ''}
        onClose={() => setHomebrewPicker(null)}
        onConfirm={(name) => {
          if (!homebrewPicker) return
          applyHomebrewClass(homebrewPicker.classEntryId, name)
          setHomebrewPicker(null)
        }}
      />

      <RaceSetupDialog
        open={raceGrantPicker != null}
        edition={baseCharacter.rules_edition as RulesEdition}
        root={raceGrantPicker?.root ?? null}
        subraces={raceGrantPicker?.subraces ?? []}
        subraceRequired={raceGrantPicker?.subraceRequired ?? false}
        abilities={draft.abilities}
        armor={draft.identity.armor}
        hasSpellcasting={characterHasCasterClass(draft.classes)}
        hasMartialWeapons={draft.identity.weapons.martial}
        characterLevel={characterLevel}
        takenSlugs={draft.featGrants.map((row) => row.slug)}
        classSlugs={draft.classGrants.map((row) => row.slug)}
        backgroundSlug={draft.identity.backgroundSlug}
        ownedFeatEnums={ownedFeatEnums}
        proficientSkills={proficientSkills}
        characterName={draft.name}
        gender={draft.identity.gender}
        enableNameGeneration={false}
        onClose={() => setRaceGrantPicker(null)}
        onConfirm={(result) => {
          if (result.characterName.trim()) {
            setDraft((prev) => ({ ...prev, name: result.characterName.trim() }))
          }
          patchIdentity({ gender: result.gender })
          commitRaceGrant({
            selected: result.entry,
            picks: result.picks,
            def: result.def,
            featResult: result.featResult,
          })
          setRaceGrantPicker(null)
        }}
      />

      <FeatSetupDialog
        open={backgroundFeatSlug != null}
        edition={baseCharacter.rules_edition as RulesEdition}
        title="Черта предыстории"
        abilities={draft.abilities}
        armor={draft.identity.armor}
        hasSpellcasting={characterHasCasterClass(draft.classes)}
        hasMartialWeapons={draft.identity.weapons.martial}
        raceSlug={draft.raceGrant?.slug ?? null}
        raceParentSlug={draft.raceGrant?.parentSlug ?? null}
        size={draft.identity.size}
        characterLevel={characterLevel}
        takenSlugs={draft.featGrants.map((row) => row.slug)}
        classSlugs={draft.classGrants.map((row) => row.slug)}
        backgroundSlug={draft.identity.backgroundSlug}
        ownedFeatEnums={ownedFeatEnums}
        proficientSkills={proficientSkills}
        forcedSlug={backgroundFeatSlug}
        onClose={() => setBackgroundFeatSlug(null)}
        onConfirm={(result: FeatSetupResult) => {
          const bgSlug = draft.identity.backgroundSlug
          if (!bgSlug) {
            setBackgroundFeatSlug(null)
            return
          }
          const grant: AppliedFeatGrant = {
            id: newFeatGrantId(),
            featCatalogId: result.entry.id,
            slug: result.entry.slug,
            nameRu: result.entry.name_ru,
            source: { kind: 'background', backgroundSlug: bgSlug },
            applied: result.applied,
            picks: result.picks,
          }
          setDraft((prev) =>
            mergeFeatSlice(
              prev,
              applyFeatGrantToDraft({ draft: featSliceFrom(prev), grant }),
            ),
          )
          setBackgroundFeatSlug(null)
          onToast(`Предыстория: черта «${grant.nameRu}»`)
        }}
      />

      <FeatSetupDialog
        open={giftFeatOpen}
        edition={baseCharacter.rules_edition as RulesEdition}
        title="Черта от мастера"
        abilities={draft.abilities}
        armor={draft.identity.armor}
        hasSpellcasting={characterHasCasterClass(draft.classes)}
        hasMartialWeapons={draft.identity.weapons.martial}
        raceSlug={draft.raceGrant?.slug ?? null}
        raceParentSlug={draft.raceGrant?.parentSlug ?? null}
        size={draft.identity.size}
        characterLevel={characterLevel}
        takenSlugs={draft.featGrants.map((row) => row.slug)}
        classSlugs={draft.classGrants.map((row) => row.slug)}
        backgroundSlug={draft.identity.backgroundSlug}
        ownedFeatEnums={ownedFeatEnums}
        proficientSkills={proficientSkills}
        onClose={() => setGiftFeatOpen(false)}
        onConfirm={(result: FeatSetupResult) => {
          const grant: AppliedFeatGrant = {
            id: newFeatGrantId(),
            featCatalogId: result.entry.id,
            slug: result.entry.slug,
            nameRu: result.entry.name_ru,
            source: { kind: 'manual' },
            applied: result.applied,
            picks: result.picks,
          }
          setDraft((prev) =>
            mergeFeatSlice(
              prev,
              applyFeatGrantToDraft({ draft: featSliceFrom(prev), grant }),
            ),
          )
          setGiftFeatOpen(false)
          onToast(`Мастер: черта «${grant.nameRu}»`)
        }}
      />

      <HomebrewRaceDialog
        open={raceHomebrewOpen}
        initialName={draft.raceName}
        onClose={() => setRaceHomebrewOpen(false)}
        onConfirm={(name) => {
          applyHomebrewRace(name)
          setRaceHomebrewOpen(false)
        }}
      />

      <BackgroundSetupDialog
        open={backgroundGrantPicker != null}
        root={backgroundGrantPicker?.root ?? null}
        variants={backgroundGrantPicker?.variants ?? []}
        blockedLanguageNames={[
          ...(draft.raceGrant?.languages ?? []),
          ...(draft.identity.languages ?? []),
        ]}
        onClose={() => {
          setBackgroundGrantPicker(null)
          // Cancel from wizard: restore queue on the background step.
          if (pausedWizardForBackground) {
            setGuidedWizard(pausedWizardForBackground)
            setPausedWizardForBackground(null)
          }
        }}
        onConfirm={(result) => {
          commitBackgroundGrant({
            selected: result.entry,
            picks: result.picks,
            def: result.def,
          })
          setBackgroundGrantPicker(null)
        }}
      />

      <HomebrewBackgroundDialog
        open={backgroundHomebrewOpen}
        initialName={draft.identity.background}
        onClose={() => setBackgroundHomebrewOpen(false)}
        onConfirm={(name) => {
          applyHomebrewBackground(name)
          setBackgroundHomebrewOpen(false)
        }}
      />

      <SubclassChangeConfirmDialog
        open={subclassChange != null}
        fromName={subclassChange?.fromName ?? ''}
        toName={subclassChange?.selected.name_ru ?? ''}
        classLevel={subclassChange?.classLevel ?? 1}
        textSnippets={subclassChange?.textSnippets ?? []}
        onClose={() => setSubclassChange(null)}
        onConfirm={({ mode, copyTextToNotes }) => {
          if (!subclassChange) return
          const pending = subclassChange
          setSubclassChange(null)
          beginSubclassSelection({
            classEntryId: pending.classEntryId,
            selected: pending.selected,
            copyOldTextToNotes: copyTextToNotes,
            previousDef: pending.previousDef,
            changeMode: mode,
            changedAtClassLevel: pending.classLevel,
            previousNameRu: pending.fromName,
            previousCatalogId: pending.previousCatalogId,
            previousSlug: pending.previousSlug,
          })
        }}
      />

      <SubclassSetupDialog
        open={subclassSetup != null}
        def={subclassSetup?.def ?? null}
        onClose={() => {
          setSubclassSetup(null)
          if (pausedWizardForSubclass) {
            setGuidedWizard(pausedWizardForSubclass)
            setPausedWizardForSubclass(null)
          }
        }}
        onConfirm={(picks) => {
          if (!subclassSetup) return
          commitSubclassGrant({
            classEntryId: subclassSetup.classEntryId,
            selected: subclassSetup.selected,
            def: subclassSetup.def,
            picks,
            copyOldTextToNotes: subclassSetup.copyOldTextToNotes,
            previousDef: subclassSetup.previousDef,
            changeMode: subclassSetup.changeMode,
            changedAtClassLevel: subclassSetup.changedAtClassLevel,
            previousNameRu: subclassSetup.previousNameRu,
            previousCatalogId: subclassSetup.previousCatalogId,
            previousSlug: subclassSetup.previousSlug,
            advanceWizardAfter: subclassSetup.advanceWizardAfter,
          })
          setSubclassSetup(null)
        }}
      />
    </div>
  )
}
