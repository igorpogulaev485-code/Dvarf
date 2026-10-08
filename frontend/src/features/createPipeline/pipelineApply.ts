/** Re-apply create-pipeline grants into a full usable character sheet. */

import {
  listCatalogEntries,
  type CatalogEntry,
  type CatalogKind,
} from '../../shared/api/catalog'
import type { AbilityScores } from '../../shared/dnd/multiclassRules'
import { hitDieForClass } from '../../shared/dnd/multiclassRules'
import {
  formatClassSummary,
  totalCharacterLevel,
  type ClassLevelEntry,
} from '../../shared/dnd/classLevels'
import { hitDieSides, type HitDie } from '../../shared/dnd/hitDice'
import { syncHitDicePools } from '../../shared/dnd/classHitDice'
import { xpToReachLevel } from '../../shared/dnd/experience'
import { mergeRacialBonuses } from '../../shared/dnd/pointBuy'
import {
  emptyBackgroundPicks,
  type BackgroundGrantPicks,
} from '../../shared/dnd/backgroundGrants'
import { emptyRacePicks, type RaceGrantPicks } from '../../shared/dnd/raceGrants'
import type { ClassGrantPicks } from '../../shared/dnd/classGrants'
import { emptyPicks as emptyClassGrantPicks } from '../characters/classEffects'
import { characterHasCasterClass } from '../../shared/dnd/casterProgression'
import {
  emptyFeaturePicks,
  featurePicksToSheet,
  readFeaturePicks,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import {
  applyClassAsiBonuses,
  readClassAsiLedger,
  type AppliedClassAsi,
} from '../../shared/dnd/classAsi'
import {
  emptySubclassPicks,
  type AppliedSubclassGrant,
  type SubclassGrantPicks,
} from '../../shared/dnd/subclassGrants'
import {
  unlockFeaturesForClasses,
} from '../../shared/dnd/classFeatures'
import {
  syncSkillsExpertiseFromPicks,
} from '../../shared/dnd/expertise'
import { listUnlockedExpertiseKeys } from '../../shared/dnd/pendingFeatureChoices'
import {
  applyBackgroundGrantToDraft,
  type BackgroundGrantDraftSlice,
  type SkillState,
} from '../characters/backgroundEffects'
import {
  applyRaceGrantToDraft,
  type RaceGrantDraftSlice,
} from '../characters/raceEffects'
import {
  applyClassGrantToDraft,
  type ClassGrantDraftSlice,
  type SaveState,
} from '../characters/classEffects'
import {
  applySubclassGrantToDraft,
  resolveSubclassDefFromCatalog,
  type SubclassGrantDraftSlice,
} from '../characters/subclassEffects'
import {
  EMPTY_ARMOR,
  EMPTY_WEAPONS,
  identityExtrasToSheet,
  type IdentityExtras,
} from '../characters/identity'
import { classLevelsToSheet } from '../characters/classLevels'
import { EMPTY_COINS } from '../../shared/dnd/weight'
import {
  inventoryToSheet,
  type InventoryState,
} from '../characters/inventory'
import {
  DEFAULT_TEXT_BLOCKS,
  textBlocksToSheet,
  type TextBlock,
} from '../characters/textBlocks'
import { readSpells, spellsToSheet, type SpellsState } from '../characters/spells'
import {
  playToSheet,
  withSyncedHitDiceSummary,
  type PlayState,
} from '../characters/play'
import {
  ABILITY_KEYS,
  SKILL_DEFS,
  abilityModifier,
  asRecord,
  type AbilityKey,
} from '../characters/sheetTypes'
import type { WeaponAttack } from '../characters/AttacksPanel'
import {
  type CreatePipelineState,
  type HpLevelChoice,
  type PipelineCatalogSnapshot,
} from './createPipelineTypes'
import { ensureHpChoices } from './LevelingStep'

export type PipelineApplyResult = {
  sheet: Record<string, unknown>
  name: string
  level: number
  class_name: string | null
  race_name: string | null
  hp: number | null
}

export type PipelineApplyCatalogCache = {
  backgrounds?: CatalogEntry[]
  races?: CatalogEntry[]
  classes?: CatalogEntry[]
}

type WorkingDraft = {
  identity: IdentityExtras
  abilities: Record<AbilityKey, number>
  saves: SaveState
  skills: SkillState
  inventory: InventoryState
  textBlocks: TextBlock[]
  weapons: WeaponAttack[]
  spells: SpellsState
  classGrants: ClassGrantDraftSlice['classGrants']
  subclassGrants: AppliedSubclassGrant[]
  companions: SubclassGrantDraftSlice['companions']
  backgroundGrant: BackgroundGrantDraftSlice['backgroundGrant']
  raceGrant: RaceGrantDraftSlice['raceGrant']
  playHitDie: HitDie | null
  hpMax: number | null
  hpCurrent: number | null
  speed: number | null
  climbSpeed: number | null
  swimSpeed: number | null
  flySpeed: number | null
}

function emptySkills(): SkillState {
  return Object.fromEntries(
    SKILL_DEFS.map((skill) => [
      skill.key,
      { is_proficient: false, is_expertise: false },
    ]),
  )
}

function emptySaves(): SaveState {
  return Object.fromEntries(ABILITY_KEYS.map((key) => [key, false])) as SaveState
}

function emptyTextBlocks(): TextBlock[] {
  return DEFAULT_TEXT_BLOCKS.map((item) => ({
    key: item.key,
    defaultLabel: item.defaultLabel,
    customLabel: null,
    isHidden: false,
    value: '',
    isCustom: false,
    resourceId: null,
  }))
}

function emptyIdentity(): IdentityExtras {
  return {
    experience: 0,
    subclassName: '',
    background: '',
    alignment: '',
    size: 'medium',
    darkvision: 0,
    armor: { ...EMPTY_ARMOR },
    weapons: { ...EMPTY_WEAPONS, extras: [] },
    languages: [],
    tools: [],
    raceAppliedLanguages: [],
  }
}

function emptyInventory(): InventoryState {
  return { coins: { ...EMPTY_COINS }, items: [] }
}

function createWorkingDraft(baseAbilities: AbilityScores): WorkingDraft {
  return {
    identity: emptyIdentity(),
    abilities: { ...baseAbilities } as Record<AbilityKey, number>,
    saves: emptySaves(),
    skills: emptySkills(),
    inventory: emptyInventory(),
    textBlocks: emptyTextBlocks(),
    weapons: [],
    spells: readSpells({}),
    classGrants: [],
    subclassGrants: [],
    companions: [],
    backgroundGrant: null,
    raceGrant: null,
    playHitDie: null,
    hpMax: null,
    hpCurrent: null,
    speed: null,
    climbSpeed: null,
    swimSpeed: null,
    flySpeed: null,
  }
}

function snapshotToEntry(
  snap: PipelineCatalogSnapshot,
  kind: CatalogKind,
): CatalogEntry {
  return {
    id: snap.id,
    kind,
    slug: snap.slug,
    name_ru: snap.name_ru,
    name_en: snap.name_en,
    rules_edition: '2014',
    parent_id: snap.parent_id,
    source: snap.source ?? null,
    external_ref: null,
    data: snap.data ?? {},
    sort_order: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  }
}

function isSnapshot(value: unknown): value is PipelineCatalogSnapshot {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.id === 'string' &&
    typeof row.slug === 'string' &&
    typeof row.name_ru === 'string' &&
    row.data != null &&
    typeof row.data === 'object'
  )
}

async function resolveCatalogEntry(input: {
  kind: CatalogKind
  id?: string | null
  slug?: string | null
  snapshot?: PipelineCatalogSnapshot | null
  cache?: CatalogEntry[]
}): Promise<CatalogEntry | null> {
  if (input.snapshot && isSnapshot(input.snapshot)) {
    return snapshotToEntry(input.snapshot, input.kind)
  }
  const id = input.id?.trim() || null
  const slug = input.slug?.trim().toLowerCase() || null
  if (!id && !slug) return null

  const fromCache = (rows: CatalogEntry[]) =>
    rows.find(
      (row) =>
        (id && row.id === id) ||
        (slug && row.slug.trim().toLowerCase() === slug),
    ) ?? null

  if (input.cache?.length) {
    const hit = fromCache(input.cache)
    if (hit) return hit
  }

  try {
    const rows = await listCatalogEntries({ kind: input.kind, edition: '2014' })
    return fromCache(rows)
  } catch {
    return null
  }
}

function averageFace(die: HitDie): number {
  return Math.floor(hitDieSides(die) / 2) + 1
}

function computeHpFromChoices(input: {
  classes: ClassLevelEntry[]
  primaryClassEntryId: string
  hpChoices: HpLevelChoice[]
  constitutionScore: number
}): number {
  const conMod = abilityModifier(input.constitutionScore)
  const choices = ensureHpChoices(input.classes, input.hpChoices)
  let total = 0
  for (const choice of choices) {
    const classIndex = input.classes.findIndex((row) => row.id === choice.classEntryId)
    const classRow = classIndex >= 0 ? input.classes[classIndex] : null
    if (!classRow) continue
    const die = hitDieForClass({ className: classRow.name }) ?? 'd8'
    const isOriginFirst =
      choice.classLevel === 1 &&
      (choice.classEntryId === input.primaryClassEntryId || classIndex === 0)
    let gain: number
    if (isOriginFirst) {
      gain = hitDieSides(die) + conMod
    } else if (choice.mode === 'roll' && typeof choice.rolled === 'number') {
      gain = choice.rolled + conMod
    } else {
      gain = averageFace(die) + conMod
    }
    total += Math.max(1, gain)
  }
  return Math.max(1, total)
}

function normalizeBackgroundPicks(raw: unknown): BackgroundGrantPicks {
  if (!raw || typeof raw !== 'object') return emptyBackgroundPicks()
  const row = raw as Partial<BackgroundGrantPicks>
  const empty = emptyBackgroundPicks()
  return {
    skills: Array.isArray(row.skills) ? row.skills.filter((v) => typeof v === 'string') : empty.skills,
    tools: Array.isArray(row.tools) ? row.tools.filter((v) => typeof v === 'string') : empty.tools,
    languages: Array.isArray(row.languages)
      ? row.languages.filter((v) => typeof v === 'string')
      : empty.languages,
    equipmentPackageId:
      typeof row.equipmentPackageId === 'string' ? row.equipmentPackageId : empty.equipmentPackageId,
    equipmentOrPicks:
      row.equipmentOrPicks && typeof row.equipmentOrPicks === 'object'
        ? (row.equipmentOrPicks as Record<string, string>)
        : empty.equipmentOrPicks,
    choiceTablePicks:
      row.choiceTablePicks && typeof row.choiceTablePicks === 'object'
        ? (row.choiceTablePicks as Record<string, string[]>)
        : empty.choiceTablePicks,
    personalityTraits: Array.isArray(row.personalityTraits)
      ? row.personalityTraits.filter((v) => typeof v === 'string')
      : empty.personalityTraits,
    ideal: typeof row.ideal === 'string' ? row.ideal : empty.ideal,
    bond: typeof row.bond === 'string' ? row.bond : empty.bond,
    flaw: typeof row.flaw === 'string' ? row.flaw : empty.flaw,
  }
}

function normalizeRacePicks(raw: unknown): RaceGrantPicks {
  if (!raw || typeof raw !== 'object') return emptyRacePicks()
  const row = raw as Partial<RaceGrantPicks>
  const empty = emptyRacePicks()
  return {
    abilityBonusModeId:
      typeof row.abilityBonusModeId === 'string' ? row.abilityBonusModeId : empty.abilityBonusModeId,
    abilityBonusKeys: Array.isArray(row.abilityBonusKeys)
      ? row.abilityBonusKeys.filter((v): v is AbilityKey =>
          ABILITY_KEYS.includes(v as AbilityKey),
        )
      : empty.abilityBonusKeys,
    size:
      row.size === 'tiny' ||
      row.size === 'small' ||
      row.size === 'medium' ||
      row.size === 'large' ||
      row.size === 'huge' ||
      row.size === 'gargantuan'
        ? row.size
        : empty.size,
    variableTraitId:
      typeof row.variableTraitId === 'string' ? row.variableTraitId : empty.variableTraitId,
    languages: Array.isArray(row.languages)
      ? row.languages.filter((v) => typeof v === 'string')
      : empty.languages,
    skills: Array.isArray(row.skills) ? row.skills.filter((v) => typeof v === 'string') : empty.skills,
    tools: Array.isArray(row.tools) ? row.tools.filter((v) => typeof v === 'string') : empty.tools,
    ancestryId: typeof row.ancestryId === 'string' ? row.ancestryId : empty.ancestryId,
  }
}

function normalizeClassPicks(raw: unknown): ClassGrantPicks {
  if (!raw || typeof raw !== 'object') return emptyClassGrantPicks()
  const row = raw as Partial<ClassGrantPicks>
  return {
    skills: Array.isArray(row.skills) ? row.skills.filter((v) => typeof v === 'string') : [],
    tools: Array.isArray(row.tools) ? row.tools.filter((v) => typeof v === 'string') : [],
    equipmentPackageId:
      typeof row.equipmentPackageId === 'string' ? row.equipmentPackageId : null,
  }
}

function normalizeSubclassPicks(raw: unknown): SubclassGrantPicks {
  if (!raw || typeof raw !== 'object') return emptySubclassPicks()
  const row = raw as { values?: unknown }
  if (!row.values || typeof row.values !== 'object' || Array.isArray(row.values)) {
    return emptySubclassPicks()
  }
  const values: Record<string, string | string[]> = {}
  for (const [key, value] of Object.entries(row.values as Record<string, unknown>)) {
    if (typeof value === 'string') values[key] = value
    else if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      values[key] = value as string[]
    }
  }
  return { values }
}

function readStoredClassPicks(state: CreatePipelineState): Record<string, ClassGrantPicks> {
  const fromState = state.classGrantPicks ?? {}
  const fromDraft = asRecord(state.sheetDraft.class_grant_picks)
  const merged: Record<string, ClassGrantPicks> = {}
  for (const [key, value] of Object.entries(fromDraft)) {
    merged[key] = normalizeClassPicks(value)
  }
  for (const [key, value] of Object.entries(fromState)) {
    merged[key] = normalizeClassPicks(value)
  }
  return merged
}

function subclassSlice(draft: WorkingDraft): SubclassGrantDraftSlice {
  return {
    identity: draft.identity,
    skills: draft.skills,
    classGrants: draft.classGrants,
    subclassGrants: draft.subclassGrants,
    raceGrant: draft.raceGrant,
    companions: draft.companions,
    textBlocks: draft.textBlocks,
    spells: draft.spells,
  }
}

function mergeSubclass(draft: WorkingDraft, slice: SubclassGrantDraftSlice): WorkingDraft {
  return {
    ...draft,
    identity: slice.identity,
    skills: slice.skills,
    subclassGrants: slice.subclassGrants,
    companions: slice.companions,
    textBlocks: slice.textBlocks,
    spells: slice.spells,
  }
}

function backgroundSlice(draft: WorkingDraft): BackgroundGrantDraftSlice {
  const protectedSkills = new Set([
    ...draft.classGrants.flatMap((row) => row.skills),
    ...(draft.raceGrant?.skills ?? []),
  ])
  const protectedTools = new Set([
    ...draft.classGrants.flatMap((row) =>
      row.tools.map((item) => item.trim().toLowerCase()).filter(Boolean),
    ),
    ...(draft.raceGrant?.tools ?? []).map((item) => item.trim().toLowerCase()),
  ])
  const protectedLanguages = new Set(
    (draft.raceGrant?.languages ?? []).map((item) => item.toLowerCase()),
  )
  const protectedWeaponExtras = new Set([
    ...draft.classGrants.flatMap((row) =>
      (row.weaponExtras ?? []).map((item) => item.trim().toLowerCase()),
    ),
    ...(draft.raceGrant?.weaponNames ?? []).map((item) => item.toLowerCase()),
  ])
  return {
    identity: draft.identity,
    skills: draft.skills,
    inventory: draft.inventory,
    textBlocks: draft.textBlocks,
    weapons: draft.weapons,
    backgroundGrant: draft.backgroundGrant,
    protectedSkills,
    protectedTools,
    protectedLanguages,
    protectedWeaponExtras,
  }
}

function raceSlice(draft: WorkingDraft): RaceGrantDraftSlice {
  const classSkills = new Set([
    ...draft.classGrants.flatMap((row) => row.skills),
    ...(draft.backgroundGrant?.skills ?? []),
  ])
  const classTools = new Set([
    ...draft.classGrants.flatMap((row) =>
      row.tools.map((item) => item.trim().toLowerCase()).filter(Boolean),
    ),
    ...(draft.backgroundGrant?.tools ?? []).map((item) => item.trim().toLowerCase()),
  ])
  const classArmor = new Set(draft.classGrants.flatMap((row) => row.armorKeys)) as Set<
    keyof IdentityExtras['armor']
  >
  const classGrantedWeaponExtras = new Set([
    ...draft.classGrants.flatMap((row) =>
      (row.weaponExtras ?? []).map((item) => item.trim().toLowerCase()),
    ),
    ...(draft.backgroundGrant?.weaponExtras ?? []).map((item) => item.trim().toLowerCase()),
  ])
  return {
    identity: draft.identity,
    skills: draft.skills,
    abilities: draft.abilities,
    speed: draft.speed,
    climbSpeed: draft.climbSpeed,
    swimSpeed: draft.swimSpeed,
    flySpeed: draft.flySpeed,
    textBlocks: draft.textBlocks,
    weapons: draft.weapons,
    spells: draft.spells,
    raceGrant: draft.raceGrant,
    classGrantedSkills: classSkills,
    classGrantedTools: classTools,
    classGrantedArmor: classArmor,
    classGrantedWeaponExtras,
  }
}

function classSlice(draft: WorkingDraft, classes: ClassLevelEntry[]): ClassGrantDraftSlice {
  return {
    identity: draft.identity,
    saves: draft.saves,
    skills: draft.skills,
    classGrants: draft.classGrants,
    playHitDie: draft.playHitDie,
    hpMax: draft.hpMax,
    hpCurrent: draft.hpCurrent,
    constitutionScore: draft.abilities.con,
    characterLevel: totalCharacterLevel(classes),
    inventory: draft.inventory,
    weapons: draft.weapons,
  }
}

function mergeBackground(draft: WorkingDraft, slice: BackgroundGrantDraftSlice): WorkingDraft {
  return {
    ...draft,
    identity: slice.identity,
    skills: slice.skills,
    inventory: slice.inventory,
    textBlocks: slice.textBlocks,
    weapons: slice.weapons,
    backgroundGrant: slice.backgroundGrant,
  }
}

function mergeRace(draft: WorkingDraft, slice: RaceGrantDraftSlice): WorkingDraft {
  return {
    ...draft,
    identity: slice.identity,
    skills: slice.skills,
    abilities: slice.abilities,
    speed: slice.speed,
    climbSpeed: slice.climbSpeed,
    swimSpeed: slice.swimSpeed,
    flySpeed: slice.flySpeed,
    textBlocks: slice.textBlocks,
    weapons: slice.weapons,
    spells: slice.spells,
    raceGrant: slice.raceGrant,
  }
}

function mergeClass(draft: WorkingDraft, slice: ClassGrantDraftSlice): WorkingDraft {
  return {
    ...draft,
    identity: slice.identity,
    saves: slice.saves,
    skills: slice.skills,
    classGrants: slice.classGrants,
    playHitDie: slice.playHitDie,
    hpMax: slice.hpMax,
    hpCurrent: slice.hpCurrent,
    inventory: slice.inventory,
    weapons: slice.weapons,
  }
}

function serializeSheet(input: {
  draft: WorkingDraft
  classes: ClassLevelEntry[]
  featurePicks: FeaturePicksState
  classAsi: AppliedClassAsi[]
  spells: SpellsState
  state: CreatePipelineState
  raceCatalogId: string | null
  backgroundCatalogId: string | null
  raceName: string | null
}): Record<string, unknown> {
  const { draft, classes, state } = input
  const sheet: Record<string, unknown> = {}
  const primary = classes[0]
  const totalLevel = totalCharacterLevel(classes)
  const identityForSave: IdentityExtras = {
    ...draft.identity,
    subclassName: primary?.subclass_name ?? draft.identity.subclassName,
    background: state.background?.nameRu ?? draft.identity.background,
    experience: xpToReachLevel(totalLevel),
  }
  const identityExtras = identityExtrasToSheet(identityForSave)
  const identity: Record<string, unknown> = {
    ...identityExtras.identityPatch,
    race_catalog_id: input.raceCatalogId,
    background_catalog_id: input.backgroundCatalogId,
    class_catalog_id: primary?.catalog_id ?? state.classRef?.id ?? null,
  }
  sheet.identity = identity
  Object.assign(sheet, classLevelsToSheet(classes))
  sheet.class_grants = draft.classGrants
  sheet.subclass_grants = draft.subclassGrants
  sheet.race_grant = draft.raceGrant
  sheet.background_grant = draft.backgroundGrant
  sheet.companions = draft.companions
  sheet.feature_picks = featurePicksToSheet(input.featurePicks)
  sheet.class_asi = input.classAsi

  const abilities: Record<string, unknown> = {}
  const saves: Record<string, unknown> = {}
  for (const key of ABILITY_KEYS) {
    abilities[key] = { score: draft.abilities[key] }
    saves[key] = { is_proficient: draft.saves[key] }
  }
  sheet.abilities = abilities
  sheet.saves = saves

  const skills: Record<string, unknown> = {}
  for (const skill of SKILL_DEFS) {
    const current = draft.skills[skill.key] ?? {
      is_proficient: false,
      is_expertise: false,
    }
    skills[skill.key] = {
      base_stat: skill.base,
      is_proficient: current.is_proficient,
      is_expertise: current.is_expertise,
    }
  }
  sheet.skills = skills

  const hitDiceByClass = syncHitDicePools({ classes })
  const play: PlayState = withSyncedHitDiceSummary({
    conditions: [],
    exhaustion: 0,
    resources: [],
    hpTemp: 0,
    hitDie: draft.playHitDie,
    hitDiceCurrent: totalLevel,
    hitDiceByClass,
    isDying: false,
    deathSuccesses: 0,
    deathFails: 0,
    concentration: null,
  })
  const playSheet = playToSheet(play)

  const combat: Record<string, unknown> = {
    hp_current: draft.hpCurrent,
    hp_max: draft.hpMax,
    ac: null,
    speed: draft.speed,
    climb_speed: draft.climbSpeed,
    swim_speed: draft.swimSpeed,
    fly_speed: draft.flySpeed,
    initiative: null,
    inspiration: false,
    darkvision: identityExtras.combatPatch.darkvision,
    ...playSheet.combatPatch,
  }
  sheet.combat = combat
  sheet.resources = playSheet.resources

  sheet.proficiency = {
    armor: identityExtras.proficiencyPatch.armor,
    weapons: identityExtras.proficiencyPatch.weapons,
    languages: identityExtras.proficiencyPatch.languages,
    tools: identityExtras.proficiencyPatch.tools,
  }
  sheet.weapons = draft.weapons
  Object.assign(sheet, inventoryToSheet(draft.inventory))
  Object.assign(sheet, spellsToSheet(input.spells))
  Object.assign(sheet, textBlocksToSheet(draft.textBlocks))

  sheet.create_pipeline = {
    version: 1,
    step: state.step,
    abilityMethod: state.abilityMethod,
    baseAbilities: state.baseAbilities,
    hpChoices: state.hpChoices,
    characterName: state.characterName,
    classEntryId: state.classEntryId,
    background: state.background,
    classRef: state.classRef,
    race: state.race,
    subrace: state.subrace,
    backgroundSetup: state.backgroundSetup,
    raceSetup: state.raceSetup,
    classGrantPicks: state.classGrantPicks,
    subclassSetups: state.subclassSetups,
    featurePicks: state.featurePicks,
    classAsi: state.classAsi,
  }

  return sheet
}

/**
 * Build a full sheet from create-pipeline state by re-applying grants
 * onto empty draft slices (background → race → class), then HP / levels / picks.
 */
export async function applyPipelineToSheet(input: {
  state: CreatePipelineState
  featurePicks?: FeaturePicksState
  classAsi?: AppliedClassAsi[]
  spells?: SpellsState
  catalog?: PipelineApplyCatalogCache
}): Promise<PipelineApplyResult> {
  const state = input.state
  const classes = state.classes.map((row) =>
    row.id === state.classEntryId && state.classRef
      ? {
          ...row,
          name: state.classRef.nameRu || row.name,
          catalog_id: state.classRef.id || row.catalog_id,
        }
      : row,
  )
  const draft = createWorkingDraft(state.baseAbilities)

  // 1) Background
  const bgSetup = state.backgroundSetup
  const bgEntry = await resolveCatalogEntry({
    kind: 'background',
    id: bgSetup?.entry.id ?? state.background?.id,
    slug: bgSetup?.entry.slug ?? state.background?.slug,
    snapshot: bgSetup?.entry ?? null,
    cache: input.catalog?.backgrounds,
  })
  if (bgEntry) {
    const picks = normalizeBackgroundPicks(
      bgSetup?.picks ?? asRecord(state.sheetDraft.background_grant).picks,
    )
    const applied = applyBackgroundGrantToDraft({
      draft: backgroundSlice(draft),
      selected: bgEntry,
      picks,
    })
    if (applied) Object.assign(draft, mergeBackground(draft, applied.draft))
    draft.identity = {
      ...draft.identity,
      background: state.background?.nameRu || bgEntry.name_ru,
    }
  }

  // 2) Race
  const raceSetup = state.raceSetup
  const raceEntry = await resolveCatalogEntry({
    kind: 'race',
    id: raceSetup?.entry.id ?? state.subrace?.id ?? state.race?.id,
    slug: raceSetup?.entry.slug ?? state.subrace?.slug ?? state.race?.slug,
    snapshot: raceSetup?.entry ?? null,
    cache: input.catalog?.races,
  })
  if (raceEntry) {
    const picks = normalizeRacePicks(
      raceSetup?.picks ?? asRecord(state.sheetDraft.race_grant).picks,
    )
    const applied = applyRaceGrantToDraft({
      draft: raceSlice(draft),
      selected: raceEntry,
      picks,
      characterLevel: totalCharacterLevel(classes),
      hasCasterClass: characterHasCasterClass(classes),
    })
    if (applied) Object.assign(draft, mergeRace(draft, applied.draft))
  }

  // Ensure abilities = base + racial (race apply already added bonuses onto base).
  if (draft.raceGrant?.abilityBonuses) {
    draft.abilities = mergeRacialBonuses(
      state.baseAbilities,
      draft.raceGrant.abilityBonuses,
    ) as Record<AbilityKey, number>
  } else {
    draft.abilities = { ...state.baseAbilities } as Record<AbilityKey, number>
  }

  // 3) Class grants (primary start, others multiclass)
  const classPicksByEntry = readStoredClassPicks(state)
  for (let index = 0; index < classes.length; index += 1) {
    const row = classes[index]!
    if (!row.name.trim() || row.level <= 0) continue
    const mode: 'start' | 'multiclass' =
      row.id === state.classEntryId || index === 0 ? 'start' : 'multiclass'
    const catalog = await resolveCatalogEntry({
      kind: 'class',
      id: row.catalog_id,
      slug: state.classRef && row.id === state.classEntryId ? state.classRef.slug : null,
      cache: input.catalog?.classes,
    })
    const picks = classPicksByEntry[row.id] ?? emptyClassGrantPicks()
    const applied = applyClassGrantToDraft({
      draft: classSlice(draft, classes),
      classEntryId: row.id,
      className: row.name,
      mode,
      picks,
      catalogSlug: catalog?.slug ?? (row.id === state.classEntryId ? state.classRef?.slug : null),
      catalogData: catalog?.data ?? null,
    })
    if (applied) Object.assign(draft, mergeClass(draft, applied.draft))
  }

  // 4) Subclass grants (after class grants)
  for (const row of classes) {
    const setup = state.subclassSetups?.[row.id]
    if (!setup) continue
    const entry = snapshotToEntry(setup.entry, 'subclass')
    const def = resolveSubclassDefFromCatalog({
      nameRu: entry.name_ru,
      slug: entry.slug,
      catalogData: entry.data,
    })
    if (!def) {
      draft.identity = {
        ...draft.identity,
        subclassName:
          row.id === state.classEntryId || row.id === classes[0]?.id
            ? entry.name_ru
            : draft.identity.subclassName,
      }
      continue
    }
    const applied = applySubclassGrantToDraft({
      draft: subclassSlice(draft),
      classEntryId: row.id,
      catalogId: entry.id,
      def,
      picks: normalizeSubclassPicks(setup.picks),
    })
    if (applied) Object.assign(draft, mergeSubclass(draft, applied.draft))
  }

  // 5) Feature picks / class ASI / expertise
  const featurePicks =
    input.featurePicks ??
    state.featurePicks ??
    readFeaturePicks(state.sheetDraft.feature_picks) ??
    emptyFeaturePicks()
  const classAsi =
    input.classAsi ??
    (Array.isArray(state.classAsi) && state.classAsi.length
      ? state.classAsi
      : readClassAsiLedger(state.sheetDraft.class_asi))

  for (const entry of classAsi) {
    draft.abilities = applyClassAsiBonuses(draft.abilities, entry.bonuses)
  }

  const subclassSlugByEntryId: Record<string, string> = {}
  for (const grant of draft.subclassGrants) {
    if (grant.classEntryId && grant.slug) {
      subclassSlugByEntryId[grant.classEntryId] = grant.slug
    }
  }
  for (const [entryId, setup] of Object.entries(state.subclassSetups ?? {})) {
    if (!subclassSlugByEntryId[entryId] && setup.entry.slug) {
      subclassSlugByEntryId[entryId] = setup.entry.slug
    }
  }
  const unlocked = unlockFeaturesForClasses({
    classes,
    characterLevel: totalCharacterLevel(classes),
    abilities: draft.abilities,
    subclassSlugByEntryId,
  })
  draft.skills = syncSkillsExpertiseFromPicks({
    skills: draft.skills,
    featurePicks,
    expertiseKeys: listUnlockedExpertiseKeys(unlocked),
  })

  // 6) HP from pipeline choices (override class L1 max; after ASI so CON is final)
  const hp = computeHpFromChoices({
    classes,
    primaryClassEntryId: state.classEntryId,
    hpChoices: state.hpChoices,
    constitutionScore: draft.abilities.con,
  })
  draft.hpMax = hp
  draft.hpCurrent = hp

  // 7) Spells merge
  const spells =
    input.spells ??
    (state.sheetDraft.spells ? readSpells({ spells: state.sheetDraft.spells }) : draft.spells)
  const subclassGrantedIds = new Set(
    draft.subclassGrants.flatMap((row) => row.grantedSpellIds ?? []),
  )
  const mergedSpells: SpellsState = {
    ...spells,
    known: [
      ...spells.known.filter(
        (row) => row.source_kind !== 'race' && !subclassGrantedIds.has(row.id),
      ),
      ...draft.spells.known.filter(
        (row) => row.source_kind === 'race' || subclassGrantedIds.has(row.id),
      ),
    ],
  }

  const raceName = state.subrace?.nameRu || state.race?.nameRu || null
  const className = formatClassSummary(classes) || null
  const name =
    state.characterName.trim() || state.classRef?.nameRu || 'Новый персонаж'
  const level = totalCharacterLevel(classes)

  const sheet = serializeSheet({
    draft,
    classes,
    featurePicks,
    classAsi,
    spells: mergedSpells,
    state,
    raceCatalogId: raceEntry?.id ?? state.subrace?.id ?? state.race?.id ?? null,
    backgroundCatalogId: bgEntry?.id ?? state.background?.id ?? null,
    raceName,
  })

  return {
    sheet,
    name,
    level,
    class_name: className,
    race_name: raceName,
    hp,
  }
}
