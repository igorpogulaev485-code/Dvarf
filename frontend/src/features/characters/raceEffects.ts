/** Apply / revoke race grants on the digital sheet draft (mirrors classEffects). */

import type { CatalogEntry } from '../../shared/api/catalog'
import {
  buildTraitsWithPicks,
  emptyRacePicks,
  formatRaceGrantSummary,
  mergeAbilityBonuses,
  readAppliedRaceGrant,
  resolveRaceDarkvision,
  resolveRaceGrantDef,
  resolveRaceMovement,
  resolveRaceSize,
  selectActiveRacialSpells,
  validateRaceGrantPicks,
  type AbilityKey,
  type AppliedRaceGrant,
  type RaceGrantDef,
  type RaceGrantPicks,
  type RaceNaturalWeapon,
  type RaceRacialSpell,
} from '../../shared/dnd/raceGrants'
import {
  proficiencyBonusForLevel,
  raceSpellId,
  stripRaceSheetSpells,
  withInnateGrantCast,
  type SheetSpell,
  type SpellsState,
} from './spells'
import {
  mergeRaceLanguages,
  upsertRaceTraitsBlock,
} from '../../shared/dnd/race'
import type { ArmorProficiency, IdentityExtras } from './identity'
import type { TextBlock } from './textBlocks'
import {
  isRaceNaturalWeaponAttack,
  raceNaturalWeaponAttackId,
  type WeaponAttack,
} from './AttacksPanel'

export type SkillState = Record<string, { is_proficient: boolean; is_expertise: boolean }>

export type RaceGrantDraftSlice = {
  identity: IdentityExtras
  skills: SkillState
  abilities: Record<AbilityKey, number>
  speed: number | null
  climbSpeed: number | null
  swimSpeed: number | null
  flySpeed: number | null
  textBlocks: TextBlock[]
  weapons: WeaponAttack[]
  spells: SpellsState
  raceGrant: AppliedRaceGrant | null
  /** Still covered by class grants — do not strip on race revoke. */
  classGrantedSkills: Set<string>
  classGrantedTools: Set<string>
  classGrantedArmor: Set<keyof ArmorProficiency>
  classGrantedWeaponExtras: Set<string>
}

function racialSpellToSheetSpell(
  raceSlug: string,
  spell: RaceRacialSpell,
): SheetSpell {
  const abilityNote = spell.castingAbility
    ? `хар-ка: ${spell.castingAbility.toUpperCase()}`
    : null
  const unlockNote =
    spell.unlockLevel > 1 ? `с ${spell.unlockLevel} ур.` : null
  const grantNote =
    spell.grant === 'spell_list'
      ? 'список метки/расы — готовь как классовое'
      : 'врождённое'
  const notes = [spell.notesRu, unlockNote, grantNote, abilityNote]
    .filter(Boolean)
    .join(' · ')
  const innate = spell.grant === 'innate'
  const base = {
    id: raceSpellId(raceSlug, spell.id),
    name: spell.nameRu,
    catalog_id: null,
    level: spell.level,
    // Innate: always ready. Mark list: player prepares (cantrips stay ready).
    prepared: innate || spell.level <= 0,
    notes,
    casting_time: '',
    range: '',
    attack_or_save: '',
    damage: '',
    concentration: false,
    source_kind: 'race' as const,
    race_grant: spell.grant,
    ...(innate
      ? { prepared_locked: true as const, prepare_source_label: 'Раса' }
      : {}),
  }
  // Free-cast charges attached later via withInnateGrantCast (needs PB / preserve used).
  return base
}

function syncRaceRacialSpells(input: {
  spells: SpellsState
  raceSlug: string
  racialSpells: RaceRacialSpell[]
  characterLevel: number
  hasCasterClass: boolean
}): SpellsState {
  const active = selectActiveRacialSpells({
    racialSpells: input.racialSpells,
    characterLevel: input.characterLevel,
    hasCasterClass: input.hasCasterClass,
  })
  const previousById = new Map(
    input.spells.known
      .filter((row) => row.source_kind === 'race' || row.id.startsWith('race-spell:'))
      .map((row) => [row.id, row]),
  )
  const withoutRace = stripRaceSheetSpells(input.spells.known)
  const pb = proficiencyBonusForLevel(input.characterLevel)
  const nextRaceRows = active.map((spell) => {
    let next = racialSpellToSheetSpell(input.raceSlug, spell)
    const prev = previousById.get(next.id)
    // Preserve player's prepare toggle for mark-list leveled spells.
    if (prev && next.race_grant === 'spell_list' && next.level > 0) {
      next = { ...next, prepared: prev.prepared }
    }
    if (prev?.grant_cast) {
      next = { ...next, grant_cast: prev.grant_cast }
    }
    next = withInnateGrantCast(next, { proficiencyBonus: pb, label: 'Раса' })
    return next
  })
  return { ...input.spells, known: [...withoutRace, ...nextRaceRows] }
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const normalized = item.trim()
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(normalized)
  }
  return out
}

function clampScore(value: number): number {
  return Math.min(30, Math.max(1, Math.trunc(value)))
}

function stripRaceNaturalWeaponAttacks(weapons: WeaponAttack[]): WeaponAttack[] {
  return weapons.filter((item) => !isRaceNaturalWeaponAttack(item))
}

function naturalWeaponToAttack(
  raceSlug: string,
  weapon: RaceNaturalWeapon,
): WeaponAttack {
  return {
    id: raceNaturalWeaponAttackId(raceSlug, weapon.id),
    name: weapon.nameRu,
    catalog_id: null,
    source_kind: 'race',
    ability: weapon.ability,
    is_proficient: weapon.proficient,
    damage: weapon.damage,
    damage_type: weapon.damageType,
  }
}

function syncRaceNaturalWeaponAttacks(input: {
  weapons: WeaponAttack[]
  raceSlug: string
  naturalWeapons: RaceNaturalWeapon[]
}): WeaponAttack[] {
  const withoutRace = stripRaceNaturalWeaponAttacks(input.weapons)
  const next = input.naturalWeapons.map((weapon) =>
    naturalWeaponToAttack(input.raceSlug, weapon),
  )
  return [...withoutRace, ...next]
}

export function revokeRaceGrant(draft: RaceGrantDraftSlice): RaceGrantDraftSlice {
  const previous = draft.raceGrant
  if (!previous) return draft

  const abilities = { ...draft.abilities }
  for (const [key, amount] of Object.entries(previous.abilityBonuses) as Array<
    [AbilityKey, number]
  >) {
    if (!amount) continue
    abilities[key] = clampScore((abilities[key] ?? 10) - amount)
  }

  const skills = { ...draft.skills }
  for (const key of previous.skills) {
    if (draft.classGrantedSkills.has(key)) continue
    const current = skills[key] ?? { is_proficient: false, is_expertise: false }
    skills[key] = { ...current, is_proficient: false }
  }

  const tools = draft.identity.tools.filter((name) => {
    const key = name.trim().toLowerCase()
    const wasFromRace = previous.tools.some((item) => item.toLowerCase() === key)
    if (!wasFromRace) return true
    return draft.classGrantedTools.has(key)
  })

  const languages = mergeRaceLanguages({
    current: draft.identity.languages,
    previousApplied: previous.languages,
    next: [],
  })

  const armor: ArmorProficiency = { ...draft.identity.armor }
  for (const key of previous.armorKeys) {
    armor[key] = draft.classGrantedArmor.has(key)
  }

  const weaponExtras = (draft.identity.weapons.extras ?? []).filter((name) => {
    const key = name.trim().toLowerCase()
    const wasFromRace = previous.weaponNames.some((item) => item.toLowerCase() === key)
    if (!wasFromRace) return true
    return draft.classGrantedWeaponExtras.has(key)
  })

  const textBlocks = draft.textBlocks.map((block) => {
    if (block.key !== 'traits') return block
    return { ...block, value: upsertRaceTraitsBlock(block.value, '') }
  })

  return {
    ...draft,
    raceGrant: null,
    abilities,
    skills,
    speed: null,
    climbSpeed: null,
    swimSpeed: null,
    flySpeed: null,
    weapons: stripRaceNaturalWeaponAttacks(draft.weapons),
    spells: {
      ...draft.spells,
      known: stripRaceSheetSpells(draft.spells.known),
    },
    identity: {
      ...draft.identity,
      darkvision: 0,
      size: 'medium',
      languages,
      tools,
      armor,
      weapons: {
        ...draft.identity.weapons,
        extras: weaponExtras,
      },
      raceAppliedLanguages: [],
    },
    textBlocks,
  }
}

export function applyRaceGrantToDraft(input: {
  draft: RaceGrantDraftSlice
  selected: CatalogEntry
  picks?: RaceGrantPicks
  def?: RaceGrantDef | null
  /** Total character level (all classes). Defaults to 1. */
  characterLevel?: number
  /** Spellcasting or Pact Magic present on any class. */
  hasCasterClass?: boolean
}): { draft: RaceGrantDraftSlice; summary: string } | null {
  const def =
    input.def ??
    resolveRaceGrantDef({
      raceName: input.selected.name_ru,
      catalogSlug: input.selected.slug,
      catalogData: input.selected.data,
      parentSlug: null,
      nameRu: input.selected.name_ru,
    })
  if (!def || !def.selectable) return null

  const picks = input.picks ?? emptyRacePicks()
  const pickError = validateRaceGrantPicks({ def, picks })
  if (pickError) return null

  const cleared = revokeRaceGrant(input.draft)
  const bonuses = mergeAbilityBonuses(
    def.abilityBonuses,
    def.abilityBonusChoices,
    picks.abilityBonusKeys,
    picks.abilityBonusModeId,
  )
  const traitsText = buildTraitsWithPicks({ def, picks })
  const languagesApplied = uniqueStrings([...def.languages, ...picks.languages])
  const skillsApplied = uniqueStrings([...def.skillProficiencies, ...picks.skills])
  const toolsApplied = uniqueStrings([...def.toolProficiencies, ...picks.tools])

  const abilities = { ...cleared.abilities }
  for (const [key, amount] of Object.entries(bonuses) as Array<[AbilityKey, number]>) {
    if (!amount) continue
    abilities[key] = clampScore((abilities[key] ?? 10) + amount)
  }

  const skills = { ...cleared.skills }
  for (const key of skillsApplied) {
    const current = skills[key] ?? { is_proficient: false, is_expertise: false }
    skills[key] = { ...current, is_proficient: true }
  }

  const languages = mergeRaceLanguages({
    current: cleared.identity.languages,
    previousApplied: [],
    next: languagesApplied,
  })

  const armor: ArmorProficiency = { ...cleared.identity.armor }
  for (const key of def.armorProficiencies) {
    armor[key] = true
  }

  const textBlocks = cleared.textBlocks.map((block) => {
    if (block.key !== 'traits') return block
    return { ...block, value: upsertRaceTraitsBlock(block.value, traitsText) }
  })

  const naturalWeapons = def.naturalWeapons
  const weapons = syncRaceNaturalWeaponAttacks({
    weapons: cleared.weapons,
    raceSlug: def.slug,
    naturalWeapons,
  })
  const racialSpells = def.racialSpells
  const characterLevel = Math.max(1, Math.floor(input.characterLevel ?? 1))
  const hasCasterClass = Boolean(input.hasCasterClass)
  const spells = syncRaceRacialSpells({
    spells: cleared.spells,
    raceSlug: def.slug,
    racialSpells,
    characterLevel,
    hasCasterClass,
  })

  const size = resolveRaceSize({ def, picks })
  const darkvision = resolveRaceDarkvision({ def, picks })
  const movement = resolveRaceMovement({
    walk: def.speed,
    movement: def.movement,
  })

  const nextGrant: AppliedRaceGrant = {
    raceCatalogId: input.selected.id,
    slug: def.slug,
    parentSlug: def.parentSlug,
    speed: def.speed,
    size,
    darkvision,
    abilityBonuses: bonuses,
    languages: languagesApplied,
    skills: skillsApplied,
    tools: toolsApplied,
    armorKeys: [...def.armorProficiencies],
    weaponNames: [...def.weaponProficiencies],
    traitsText,
    ancestryId: picks.ancestryId,
    featNoteRu: def.featNoteRu,
    naturalArmor: def.naturalArmor,
    naturalWeapons,
    movement,
    racialSpells,
  }

  const draft: RaceGrantDraftSlice = {
    ...cleared,
    raceGrant: nextGrant,
    abilities,
    skills,
    speed: def.speed,
    climbSpeed: movement.climb,
    swimSpeed: movement.swim,
    flySpeed: movement.fly,
    weapons,
    spells,
    identity: {
      ...cleared.identity,
      darkvision,
      size,
      languages,
      tools: uniqueStrings([...cleared.identity.tools, ...toolsApplied]),
      armor,
      weapons: {
        ...cleared.identity.weapons,
        extras: uniqueStrings([
          ...(cleared.identity.weapons.extras ?? []),
          ...def.weaponProficiencies,
        ]),
      },
      raceAppliedLanguages: [...languagesApplied],
    },
    textBlocks,
  }

  return {
    draft,
    summary: formatRaceGrantSummary({ def, picks, bonuses }),
  }
}

/** Re-apply race ledger overlays after class/level mutations (skills/tools/armor/spells). */
export function reapplyRaceOverlays(
  draft: RaceGrantDraftSlice,
  options?: { characterLevel?: number; hasCasterClass?: boolean },
): RaceGrantDraftSlice {
  const grant = draft.raceGrant
  if (!grant) return draft

  const skills = { ...draft.skills }
  for (const key of grant.skills) {
    const current = skills[key] ?? { is_proficient: false, is_expertise: false }
    skills[key] = { ...current, is_proficient: true }
  }

  const armor: ArmorProficiency = { ...draft.identity.armor }
  for (const key of grant.armorKeys) {
    armor[key] = true
  }

  const weapons = syncRaceNaturalWeaponAttacks({
    weapons: draft.weapons,
    raceSlug: grant.slug,
    naturalWeapons: grant.naturalWeapons ?? [],
  })
  const spells = syncRaceRacialSpells({
    spells: draft.spells,
    raceSlug: grant.slug,
    racialSpells: grant.racialSpells ?? [],
    characterLevel: Math.max(1, Math.floor(options?.characterLevel ?? 1)),
    hasCasterClass: Boolean(options?.hasCasterClass),
  })

  return {
    ...draft,
    skills,
    weapons,
    spells,
    identity: {
      ...draft.identity,
      armor,
      tools: uniqueStrings([...draft.identity.tools, ...grant.tools]),
      darkvision: grant.darkvision || draft.identity.darkvision,
      size: grant.size || draft.identity.size,
    },
    speed: grant.speed,
    climbSpeed: grant.movement?.climb ?? null,
    swimSpeed: grant.movement?.swim ?? null,
    flySpeed: grant.movement?.fly ?? null,
  }
}

/** Refresh race spell rows after level-up / class change (unlock + mark list). */
export function syncRaceSpellsForSheetState(input: {
  spells: SpellsState
  grant: AppliedRaceGrant | null
  characterLevel: number
  hasCasterClass: boolean
  /** Prefer fresher catalog spells when available. */
  catalogSpells?: RaceRacialSpell[] | null
}): SpellsState {
  const grant = input.grant
  if (!grant) return input.spells
  const racialSpells =
    input.catalogSpells && input.catalogSpells.length > 0
      ? input.catalogSpells
      : grant.racialSpells ?? []
  return syncRaceRacialSpells({
    spells: input.spells,
    raceSlug: grant.slug,
    racialSpells,
    characterLevel: input.characterLevel,
    hasCasterClass: input.hasCasterClass,
  })
}

/**
 * Ensure race natural-weapon attack cards exist for an already-applied grant
 * (backfill when catalog gained natural_weapons after the race was chosen,
 * and refresh dice/ability when the catalog corrects them).
 */
export function ensureRaceNaturalWeaponAttacks(input: {
  weapons: WeaponAttack[]
  grant: AppliedRaceGrant | null
  catalogWeapons?: RaceNaturalWeapon[] | null
}): WeaponAttack[] {
  const grant = input.grant
  if (!grant) return input.weapons
  const catalog = input.catalogWeapons
  const naturalWeapons =
    (catalog && catalog.length > 0
      ? catalog
      : grant.naturalWeapons && grant.naturalWeapons.length > 0
        ? grant.naturalWeapons
        : null) ?? []
  if (naturalWeapons.length === 0) return input.weapons
  return syncRaceNaturalWeaponAttacks({
    weapons: input.weapons,
    raceSlug: grant.slug,
    naturalWeapons,
  })
}

/** True when race attack cards already match the catalog natural weapons. */
export function raceNaturalWeaponAttacksMatch(input: {
  weapons: WeaponAttack[]
  raceSlug: string
  naturalWeapons: RaceNaturalWeapon[]
}): boolean {
  const expected = input.naturalWeapons.map((weapon) =>
    naturalWeaponToAttack(input.raceSlug, weapon),
  )
  if (expected.length === 0) return true
  const byId = new Map(
    input.weapons
      .filter((row) => row.source_kind === 'race')
      .map((row) => [row.id, row]),
  )
  if (byId.size !== expected.length) return false
  return expected.every((want) => {
    const got = byId.get(want.id)
    if (!got) return false
    return (
      got.name === want.name &&
      got.ability === want.ability &&
      got.damage === want.damage &&
      got.damage_type === want.damage_type &&
      got.is_proficient === want.is_proficient
    )
  })
}

export { readAppliedRaceGrant, emptyRacePicks, resolveRaceGrantDef }
