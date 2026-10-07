/** Apply / revoke feat grants on a sheet draft slice. */

import type { SheetResource } from '../../shared/dnd/rest'
import {
  type AbilityKey,
  type AppliedFeatGrant,
  type ArmorProfKey,
  type FeatGrantsPackage,
  type FeatSpell,
  featTraitsSnippet,
  resolveFeatResourceMax,
} from '../../shared/dnd/featGrants'
import type { ArmorProficiency } from './identity'
import type { TextBlock } from './textBlocks'
import {
  featSpellId,
  stripFeatSheetSpellsForGrant,
  type SheetSpell,
  type SpellsState,
} from './spells'

export type FeatGrantDraftSlice = {
  abilities: Record<AbilityKey, number>
  saves: Record<AbilityKey, boolean>
  skills: Record<string, { is_proficient: boolean; is_expertise: boolean }>
  speed: number | null
  hpMax: number | null
  hpCurrent: number | null
  featGrants: AppliedFeatGrant[]
  identity: {
    languages: string[]
    tools: string[]
    armor: ArmorProficiency
  }
  textBlocks: TextBlock[]
  resources: SheetResource[]
  spells: SpellsState
  totalLevel: number
}

const FEAT_RESOURCE_PREFIX = 'feat-grant:'
const FEAT_TRAITS_MARK_START = '<!-- dvarf:feat-traits -->'
const FEAT_TRAITS_MARK_END = '<!-- /dvarf:feat-traits -->'

function clampScore(value: number): number {
  return Math.min(20, Math.max(1, value))
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

function upsertFeatTraitsBlock(value: string, snippet: string): string {
  const start = value.indexOf(FEAT_TRAITS_MARK_START)
  const end = value.indexOf(FEAT_TRAITS_MARK_END)
  const block = snippet
    ? `${FEAT_TRAITS_MARK_START}\n${snippet}\n${FEAT_TRAITS_MARK_END}`
    : ''
  if (start >= 0 && end > start) {
    const before = value.slice(0, start).trimEnd()
    const after = value.slice(end + FEAT_TRAITS_MARK_END.length).trimStart()
    return [before, block, after].filter(Boolean).join('\n\n')
  }
  if (!block) return value
  return value.trim() ? `${value.trim()}\n\n${block}` : block
}

function resourceId(grantId: string, poolId: string): string {
  return `${FEAT_RESOURCE_PREFIX}${grantId}:${poolId}`
}

function resolveFeatSpellCastingAbility(
  spell: FeatSpell,
  grant: AppliedFeatGrant,
): AbilityKey | null {
  if (spell.castingAbility) return spell.castingAbility
  const fromAbility = grant.picks.abilityKeys.ability
  if (fromAbility) return fromAbility
  for (const key of Object.values(grant.picks.abilityKeys)) {
    if (key) return key
  }
  return null
}

function featSpellToSheetSpell(
  grant: AppliedFeatGrant,
  spell: FeatSpell,
): SheetSpell {
  const casting = resolveFeatSpellCastingAbility(spell, grant)
  const abilityNote = casting ? `хар-ка: ${casting.toUpperCase()}` : null
  const unlockNote =
    spell.unlockLevel > 1 ? `с ${spell.unlockLevel} ур.` : null
  const grantNote =
    spell.grant === 'spell_list'
      ? 'список черты — готовь как классовое'
      : 'врождённое (черта)'
  const notes = [spell.notesRu, unlockNote, grantNote, abilityNote]
    .filter(Boolean)
    .join(' · ')
  const innate = spell.grant === 'innate'
  return {
    id: featSpellId(grant.id, spell.id),
    name: spell.nameRu,
    catalog_id: null,
    level: spell.level,
    prepared: innate || spell.level <= 0,
    notes,
    casting_time: '',
    range: '',
    attack_or_save: '',
    damage: '',
    concentration: false,
    source_kind: 'feat',
    feat_grant: spell.grant,
  }
}

function syncFeatSpellsForGrant(input: {
  spells: SpellsState
  grant: AppliedFeatGrant
  characterLevel: number
}): SpellsState {
  const active = (input.grant.applied.spells ?? []).filter(
    (spell) => Math.max(1, Math.floor(input.characterLevel)) >= spell.unlockLevel,
  )
  const previousById = new Map(
    input.spells.known
      .filter((row) => row.id.startsWith(`feat-spell:${input.grant.id}:`))
      .map((row) => [row.id, row]),
  )
  const withoutGrant = stripFeatSheetSpellsForGrant(
    input.spells.known,
    input.grant.id,
  )
  const nextRows = active.map((spell) => {
    const next = featSpellToSheetSpell(input.grant, spell)
    const prev = previousById.get(next.id)
    if (prev && next.feat_grant === 'spell_list' && next.level > 0) {
      return { ...next, prepared: prev.prepared }
    }
    return next
  })
  return { ...input.spells, known: [...withoutGrant, ...nextRows] }
}

function applyPackage(input: {
  draft: FeatGrantDraftSlice
  grantId: string
  applied: FeatGrantsPackage
  direction: 1 | -1
}): FeatGrantDraftSlice {
  const sign = input.direction
  const abilities = { ...input.draft.abilities }
  for (const [key, amount] of Object.entries(input.applied.abilityBonuses) as Array<
    [AbilityKey, number]
  >) {
    if (!amount) continue
    abilities[key] = clampScore((abilities[key] ?? 10) + sign * amount)
  }

  const skills = { ...input.draft.skills }
  for (const key of input.applied.skills) {
    const current = skills[key] ?? { is_proficient: false, is_expertise: false }
    if (sign > 0) {
      skills[key] = { ...current, is_proficient: true }
    } else {
      const still = input.draft.featGrants.some(
        (row) => row.id !== input.grantId && row.applied.skills.includes(key),
      )
      if (!still) skills[key] = { ...current, is_proficient: false }
    }
  }
  for (const key of input.applied.expertiseSkills ?? []) {
    const current = skills[key] ?? { is_proficient: false, is_expertise: false }
    if (sign > 0) {
      skills[key] = { is_proficient: true, is_expertise: true }
    } else {
      const stillExpertise = input.draft.featGrants.some(
        (row) =>
          row.id !== input.grantId &&
          (row.applied.expertiseSkills ?? []).includes(key),
      )
      if (!stillExpertise) {
        skills[key] = { ...current, is_expertise: false }
      }
    }
  }

  let languages = [...input.draft.identity.languages]
  let tools = [...input.draft.identity.tools]
  if (sign > 0) {
    languages = uniqueStrings([...languages, ...input.applied.languages])
    tools = uniqueStrings([...tools, ...input.applied.tools])
  } else {
    const otherLang = new Set(
      input.draft.featGrants
        .filter((row) => row.id !== input.grantId)
        .flatMap((row) => row.applied.languages.map((name) => name.toLowerCase())),
    )
    const otherTools = new Set(
      input.draft.featGrants
        .filter((row) => row.id !== input.grantId)
        .flatMap((row) => row.applied.tools.map((name) => name.toLowerCase())),
    )
    languages = languages.filter(
      (name) =>
        !input.applied.languages.some((item) => item.toLowerCase() === name.toLowerCase()) ||
        otherLang.has(name.toLowerCase()),
    )
    tools = tools.filter(
      (name) =>
        !input.applied.tools.some((item) => item.toLowerCase() === name.toLowerCase()) ||
        otherTools.has(name.toLowerCase()),
    )
  }

  const armor: ArmorProficiency = { ...input.draft.identity.armor }
  for (const key of input.applied.armorProficiencies as ArmorProfKey[]) {
    if (sign > 0) armor[key] = true
    else {
      const still = input.draft.featGrants.some(
        (row) =>
          row.id !== input.grantId && row.applied.armorProficiencies.includes(key),
      )
      if (!still) armor[key] = false
    }
  }

  const saves = { ...input.draft.saves }
  for (const key of input.applied.savingThrows) {
    if (sign > 0) saves[key] = true
    else {
      const still = input.draft.featGrants.some(
        (row) =>
          row.id !== input.grantId && row.applied.savingThrows.includes(key),
      )
      if (!still) saves[key] = false
    }
  }

  let speed = input.draft.speed
  if (input.applied.speedBonus) {
    if (speed == null && sign > 0) speed = 30 + input.applied.speedBonus
    else if (speed != null) speed = Math.max(0, speed + sign * input.applied.speedBonus)
  }

  let hpMax = input.draft.hpMax
  let hpCurrent = input.draft.hpCurrent
  if (input.applied.hpPerLevel && input.draft.totalLevel > 0) {
    const delta = sign * input.applied.hpPerLevel * input.draft.totalLevel
    if (hpMax != null) {
      hpMax = Math.max(1, hpMax + delta)
      if (hpCurrent != null) {
        hpCurrent = Math.max(0, hpCurrent + delta)
      }
    }
  }

  let resources = [...input.draft.resources]
  if (input.applied.resource) {
    const id = resourceId(input.grantId, input.applied.resource.pool_id)
    if (sign > 0) {
      if (!resources.some((row) => row.id === id)) {
        const max = resolveFeatResourceMax(
          input.applied.resource,
          input.draft.totalLevel,
        )
        resources.push({
          id,
          name: input.applied.resource.pool_name_ru,
          max,
          used: 0,
          reset: input.applied.resource.recovery === 'short_rest' ? 'short' : 'long',
        })
      }
    } else {
      resources = resources.filter((row) => row.id !== id)
    }
  }

  return {
    ...input.draft,
    abilities,
    saves,
    skills,
    speed,
    hpMax,
    hpCurrent,
    resources,
    identity: {
      ...input.draft.identity,
      languages,
      tools,
      armor,
    },
  }
}

export function syncFeatTraitsText(
  draft: FeatGrantDraftSlice,
): FeatGrantDraftSlice {
  const snippet = featTraitsSnippet(draft.featGrants)
  const textBlocks = draft.textBlocks.map((block) => {
    // Prefer dedicated «Черты» block; fall back to traits if missing.
    if (block.key !== 'feats' && block.key !== 'traits') return block
    if (block.key === 'traits' && draft.textBlocks.some((row) => row.key === 'feats')) {
      return block
    }
    return { ...block, value: upsertFeatTraitsBlock(block.value, snippet) }
  })
  return { ...draft, textBlocks }
}

export function applyFeatGrantToDraft(input: {
  draft: FeatGrantDraftSlice
  grant: AppliedFeatGrant
}): FeatGrantDraftSlice {
  const withGrant: FeatGrantDraftSlice = {
    ...input.draft,
    featGrants: [...input.draft.featGrants, input.grant],
  }
  const applied = applyPackage({
    draft: withGrant,
    grantId: input.grant.id,
    applied: input.grant.applied,
    direction: 1,
  })
  const withSpells = {
    ...applied,
    spells: syncFeatSpellsForGrant({
      spells: applied.spells,
      grant: input.grant,
      characterLevel: applied.totalLevel,
    }),
    featGrants: withGrant.featGrants,
  }
  return syncFeatTraitsText(withSpells)
}

export function revokeFeatGrantFromDraft(input: {
  draft: FeatGrantDraftSlice
  grantId: string
}): FeatGrantDraftSlice {
  const grant = input.draft.featGrants.find((row) => row.id === input.grantId)
  if (!grant) return input.draft
  const withoutLedger: FeatGrantDraftSlice = {
    ...input.draft,
    featGrants: input.draft.featGrants.filter((row) => row.id !== input.grantId),
  }
  const revoked = applyPackage({
    draft: withoutLedger,
    grantId: grant.id,
    applied: grant.applied,
    direction: -1,
  })
  return syncFeatTraitsText({
    ...revoked,
    spells: {
      ...revoked.spells,
      known: stripFeatSheetSpellsForGrant(revoked.spells.known, grant.id),
    },
    featGrants: withoutLedger.featGrants,
  })
}

export function revokeFeatGrantsForRace(input: {
  draft: FeatGrantDraftSlice
  raceCatalogId: string
}): FeatGrantDraftSlice {
  const ids = input.draft.featGrants
    .filter(
      (row) =>
        row.source.kind === 'race' && row.source.raceCatalogId === input.raceCatalogId,
    )
    .map((row) => row.id)
  let next = input.draft
  for (const id of ids) {
    next = revokeFeatGrantFromDraft({ draft: next, grantId: id })
  }
  return next
}

export function revokeFeatGrantsForAsi(input: {
  draft: FeatGrantDraftSlice
  classEntryId: string
  featureId: string
}): FeatGrantDraftSlice {
  const ids = input.draft.featGrants
    .filter(
      (row) =>
        row.source.kind === 'asi' &&
        row.source.classEntryId === input.classEntryId &&
        row.source.featureId === input.featureId,
    )
    .map((row) => row.id)
  let next = input.draft
  for (const id of ids) {
    next = revokeFeatGrantFromDraft({ draft: next, grantId: id })
  }
  return next
}

export function revokeFeatGrantsForBackground(input: {
  draft: FeatGrantDraftSlice
  backgroundSlug?: string | null
}): FeatGrantDraftSlice {
  const ids = input.draft.featGrants
    .filter((row) => {
      if (row.source.kind !== 'background') return false
      if (!input.backgroundSlug) return true
      return row.source.backgroundSlug === input.backgroundSlug
    })
    .map((row) => row.id)
  let next = input.draft
  for (const id of ids) {
    next = revokeFeatGrantFromDraft({ draft: next, grantId: id })
  }
  return next
}

/** Rescale PB-based feat pools after level-up / level-down. */
export function syncFeatProficiencyResources(
  draft: FeatGrantDraftSlice,
): FeatGrantDraftSlice {
  let resources = [...draft.resources]
  let changed = false
  for (const grant of draft.featGrants) {
    const resource = grant.applied.resource
    if (!resource?.usesProficiencyBonus) continue
    const id = resourceId(grant.id, resource.pool_id)
    const max = resolveFeatResourceMax(resource, draft.totalLevel)
    resources = resources.map((row) => {
      if (row.id !== id || row.max === max) return row
      changed = true
      return {
        ...row,
        max,
        used: Math.min(row.used, max),
      }
    })
  }
  return changed ? { ...draft, resources } : draft
}
