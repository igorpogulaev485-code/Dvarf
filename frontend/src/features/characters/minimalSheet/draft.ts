/** Черновик листа, сборка из ответа сервера и чистые помощники. Поведение как в прежнем MinimalSheetEditor. */
import { type CharacterDetail } from '../../../shared/api/characters'
import { type SheetSyncMessage } from '../../../shared/sync/characterSheetChannel'
import { totalCharacterLevel } from '../../../shared/dnd/classLevels'
import type { AppliedClassGrant } from '../../../shared/dnd/classGrants'
import { readAppliedClassGrants } from '../classEffects'
import { readAppliedBackgroundGrant } from '../backgroundEffects'
import { type AppliedBackgroundGrant } from '../../../shared/dnd/backgroundGrants'
import { type AppliedSubclassGrant, type SubclassTransition } from '../../../shared/dnd/subclassGrants'
import { readAppliedSubclassGrants, readSubclassTransitions } from '../subclassEffects'
import { readCompanions, type CompanionEntry } from '../companions'
import { readKnownForms, type KnownForm } from '../knownForms'
import { readModifiers, type BonusLine } from '../modifiers'
import { type ToastInput } from '../../../ui'
import { type CatalogEntry } from '../../../shared/api/catalog'
import { type AppliedRaceGrant } from '../../../shared/dnd/raceGrants'
import { readCustomFeatures, type CustomFeature } from '../customFeatures'
import { syncAttacksHeldFromInventory, type WeaponAttack } from '../AttacksPanel'
import { readAttunements, type AttunementSlot } from '../attunement'
import { readClassLevels, type ClassLevelEntry } from '../classLevels'
import { readClassAsiLedger, type AppliedClassAsi } from '../../../shared/dnd/classAsi'
import { readFeatGrantLedger, sumFeatSpeedBonus, type AppliedFeatGrant } from '../../../shared/dnd/featGrants'
import { migrateLegacyHitDice, syncHitDicePools } from '../../../shared/dnd/classHitDice'
import { withSyncedHitDiceSummary } from '../play'
import { classWalkSpeedBonusFt } from '../../../shared/dnd/classMovement'
import { readFeaturePicks, type FeaturePicksState } from '../../../shared/dnd/featurePicks'
import { readSheetUi, type SheetUiState } from '../playDeskUi'
import type { CompanionKind } from '../companions'
import { readIdentityExtras, type IdentityExtras } from '../identity'
import { readAppliedRaceGrant } from '../raceEffects'
import { readInventory, type InventoryState } from '../inventory'
import { classifySpellTooling, inferFocusKind, withSpellFocusFlags } from '../spellFocus'
import { readPlay, type PlayState } from '../play'
import { readSpells, type SpellsState } from '../spells'
import { readTextBlocks, type TextBlock } from '../textBlocks'
import {
  ABILITY_KEYS,
  SKILL_DEFS,
  asRecord,
  readNullableNumber,
  readNumber,
  type AbilityKey,
} from '../sheetTypes'

export const COMPANION_KIND_SHORT: Record<CompanionKind, string> = {
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

export type MinimalSheetEditorProps = {
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

export type Draft = {
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

export function readWeapons(sheet: Record<string, unknown>): WeaponAttack[] {
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

export function buildDraft(character: CharacterDetail): Draft {
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
      const artificer = classes.some(
        (row) =>
          /изобретат|artificer/i.test(row.name) ||
          (row.catalog_id ?? '').toLowerCase().includes('artificer'),
      )
      const items = inventory.items.map((item) => {
        const toolName = /инструмент|воровск|thieves|tools/i.test(item.name)
        if (
          artificer &&
          toolName &&
          item.spell_tooling !== 'component_pouch' &&
          item.spell_tooling !== 'focus'
        ) {
          return { ...item, spell_tooling: 'focus' as const, focus_kind: item.focus_kind ?? 'any' }
        }
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

export function grantedFeatSlugFromCatalog(entry: CatalogEntry): string | null {
  const raw = asRecord(entry.data).granted_feat_slug
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

export function subclassSlugMapFromLedger(input: {
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

export function subclassTransitionMapFromLedger(
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

export function cycleSkill(state: { is_proficient: boolean; is_expertise: boolean }) {
  if (!state.is_proficient && !state.is_expertise) {
    return { is_proficient: true, is_expertise: false }
  }
  if (state.is_proficient && !state.is_expertise) {
    return { is_proficient: true, is_expertise: true }
  }
  return { is_proficient: false, is_expertise: false }
}
