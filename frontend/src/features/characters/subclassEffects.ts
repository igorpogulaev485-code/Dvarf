/** Apply / revoke subclass sheet grants on the digital sheet draft. */

import type { AppliedClassGrant, ArmorProfKey, WeaponProfKey } from '../../shared/dnd/classGrants'
import {
  collectGrantTextSnippets,
  emptySubclassPicks,
  formatSubclassGrantSummary,
  parseSubclassGrantDef,
  subclassNeedsSetupDialog,
  validateSubclassPicks,
  type AppliedSubclassGrant,
  type SubclassGrantDef,
  type SubclassGrantPicks,
} from '../../shared/dnd/subclassGrants'
import type { ArmorProficiency, IdentityExtras, WeaponProficiency } from './identity'
import type { AppliedRaceGrant } from '../../shared/dnd/raceGrants'
import type { CompanionEntry } from './companions'
import { revokeCompanionsForSubclass } from './companions'
import type { TextBlock } from './textBlocks'

export type SkillState = Record<string, { is_proficient: boolean; is_expertise: boolean }>

export type SubclassGrantDraftSlice = {
  identity: IdentityExtras
  skills: SkillState
  classGrants: AppliedClassGrant[]
  subclassGrants: AppliedSubclassGrant[]
  raceGrant: AppliedRaceGrant | null
  companions: CompanionEntry[]
  textBlocks: TextBlock[]
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

function setOfLower(items: string[]): Set<string> {
  return new Set(items.map((item) => item.trim().toLowerCase()).filter(Boolean))
}

function unionClassArmor(grants: AppliedClassGrant[]): Set<ArmorProfKey> {
  const next = new Set<ArmorProfKey>()
  for (const grant of grants) for (const key of grant.armorKeys) next.add(key)
  return next
}

function unionClassWeapons(grants: AppliedClassGrant[]): Set<WeaponProfKey> {
  const next = new Set<WeaponProfKey>()
  for (const grant of grants) for (const key of grant.weaponKeys) next.add(key)
  return next
}

function unionClassSkills(grants: AppliedClassGrant[]): Set<string> {
  return new Set(grants.flatMap((row) => row.skills))
}

function unionClassTools(grants: AppliedClassGrant[]): Set<string> {
  return setOfLower(grants.flatMap((row) => row.tools))
}

function unionSubclassExcept(
  grants: AppliedSubclassGrant[],
  exceptClassEntryId: string,
): AppliedSubclassGrant[] {
  return grants.filter((row) => row.classEntryId !== exceptClassEntryId)
}

function resolveSkillsFromPicks(
  def: SubclassGrantDef,
  picks: SubclassGrantPicks,
): string[] {
  const skills: string[] = []
  for (const choice of def.choices) {
    if (choice.appliesTo !== 'grant') continue
    const value = picks.values[choice.id]
    if (choice.kind === 'open_text') continue
    // Heuristic: skill keys look like snake_case skill ids
    const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
    for (const item of values) {
      if (choice.from === 'any' || (Array.isArray(choice.from) && choice.from.includes(item))) {
        // language choices also use grant+from any — filter by choice id
        if (choice.id.toLowerCase().includes('lang')) continue
        skills.push(item)
      }
    }
  }
  return uniqueStrings(skills)
}

function resolveLanguagesFromPicks(
  def: SubclassGrantDef,
  picks: SubclassGrantPicks,
): string[] {
  const languages: string[] = []
  for (const choice of def.choices) {
    if (choice.appliesTo !== 'grant') continue
    if (!choice.id.toLowerCase().includes('lang')) continue
    const value = picks.values[choice.id]
    const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
    languages.push(...values)
  }
  return uniqueStrings(languages)
}

function appendNotesBlock(blocks: TextBlock[], text: string): TextBlock[] {
  if (!text.trim()) return blocks
  const stamp = new Date().toISOString().slice(0, 10)
  const line = `[Смена архетипа ${stamp}]\n${text.trim()}`
  return blocks.map((block) => {
    if (block.key !== 'free') return block
    const prev = block.value.trim()
    return { ...block, value: prev ? `${prev}\n\n${line}` : line }
  })
}

export function readAppliedSubclassGrants(raw: unknown): AppliedSubclassGrant[] {
  if (!Array.isArray(raw)) return []
  const result: AppliedSubclassGrant[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.classEntryId !== 'string' || typeof row.slug !== 'string') continue
    const picksRaw =
      row.picks && typeof row.picks === 'object' && !Array.isArray(row.picks)
        ? (row.picks as Record<string, unknown>)
        : {}
    const picks: Record<string, string | string[]> = {}
    for (const [key, value] of Object.entries(picksRaw)) {
      if (typeof value === 'string') picks[key] = value
      else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
        picks[key] = value as string[]
      }
    }
    const casterRaw =
      row.caster && typeof row.caster === 'object'
        ? (row.caster as Record<string, unknown>)
        : null
    result.push({
      classEntryId: row.classEntryId,
      catalogId: typeof row.catalogId === 'string' ? row.catalogId : null,
      slug: row.slug,
      parentSlug: typeof row.parentSlug === 'string' ? row.parentSlug : '',
      armorKeys: Array.isArray(row.armorKeys)
        ? row.armorKeys.filter((v): v is ArmorProfKey => typeof v === 'string')
        : [],
      weaponKeys: Array.isArray(row.weaponKeys)
        ? row.weaponKeys.filter((v): v is WeaponProfKey => typeof v === 'string')
        : [],
      weaponExtras: Array.isArray(row.weaponExtras)
        ? row.weaponExtras.filter((v): v is string => typeof v === 'string')
        : [],
      skills: Array.isArray(row.skills)
        ? row.skills.filter((v): v is string => typeof v === 'string')
        : [],
      tools: Array.isArray(row.tools)
        ? row.tools.filter((v): v is string => typeof v === 'string')
        : [],
      languages: Array.isArray(row.languages)
        ? row.languages.filter((v): v is string => typeof v === 'string')
        : [],
      picks,
      caster:
        casterRaw && (casterRaw.progression === 'third' || casterRaw.progression === 'none')
          ? {
              progression: casterRaw.progression,
              ability:
                casterRaw.ability === 'int' ||
                casterRaw.ability === 'wis' ||
                casterRaw.ability === 'cha'
                  ? casterRaw.ability
                  : null,
            }
          : null,
    })
  }
  return result
}

export function revokeSubclassGrant(
  draft: SubclassGrantDraftSlice,
  classEntryId: string,
  options?: { copyTextToNotes?: boolean; def?: SubclassGrantDef | null },
): SubclassGrantDraftSlice {
  const previous = draft.subclassGrants.find((row) => row.classEntryId === classEntryId)
  if (!previous) return draft

  const remaining = unionSubclassExcept(draft.subclassGrants, classEntryId)
  const classSkills = unionClassSkills(draft.classGrants)
  const classTools = unionClassTools(draft.classGrants)
  const classArmor = unionClassArmor(draft.classGrants)
  const classWeapons = unionClassWeapons(draft.classGrants)
  const raceSkills = new Set(draft.raceGrant?.skills ?? [])
  const raceTools = setOfLower(draft.raceGrant?.tools ?? [])
  const raceArmor = new Set(draft.raceGrant?.armorKeys ?? [])
  const raceLangs = setOfLower(draft.raceGrant?.languages ?? [])

  const remainingSubSkills = new Set(remaining.flatMap((row) => row.skills))
  const remainingSubTools = setOfLower(remaining.flatMap((row) => row.tools))
  const remainingSubArmor = new Set(remaining.flatMap((row) => row.armorKeys))
  const remainingSubWeapons = new Set(remaining.flatMap((row) => row.weaponKeys))
  const remainingSubLangs = setOfLower(remaining.flatMap((row) => row.languages))
  const remainingExtras = setOfLower(remaining.flatMap((row) => row.weaponExtras))

  const skills = { ...draft.skills }
  for (const key of previous.skills) {
    if (classSkills.has(key) || raceSkills.has(key) || remainingSubSkills.has(key)) continue
    const current = skills[key] ?? { is_proficient: false, is_expertise: false }
    skills[key] = { ...current, is_proficient: false }
  }

  const armor: ArmorProficiency = { ...draft.identity.armor }
  for (const key of previous.armorKeys) {
    if (classArmor.has(key) || raceArmor.has(key) || remainingSubArmor.has(key)) continue
    armor[key] = false
  }

  const weapons: WeaponProficiency = { ...draft.identity.weapons }
  for (const key of previous.weaponKeys) {
    if (classWeapons.has(key) || remainingSubWeapons.has(key)) continue
    weapons[key] = false
  }

  const keepTools = new Set<string>([
    ...classTools,
    ...raceTools,
    ...remainingSubTools,
    ...remainingExtras,
  ])
  const tools = draft.identity.tools.filter((item) => {
    const lower = item.trim().toLowerCase()
    const wasOurs =
      previous.tools.some((t) => t.toLowerCase() === lower) ||
      previous.weaponExtras.some((t) => t.toLowerCase() === lower)
    if (!wasOurs) return true
    return keepTools.has(lower)
  })

  const keepLangs = new Set<string>([...raceLangs, ...remainingSubLangs])
  // Also keep languages not applied by this subclass
  const languages = draft.identity.languages.filter((item) => {
    const lower = item.trim().toLowerCase()
    const wasOurs = previous.languages.some((lang) => lang.toLowerCase() === lower)
    if (!wasOurs) return true
    return keepLangs.has(lower)
  })

  let textBlocks = draft.textBlocks
  if (options?.copyTextToNotes) {
    const snippets = collectGrantTextSnippets({
      def: options.def ?? null,
      grant: previous,
    })
    if (snippets.length) {
      textBlocks = appendNotesBlock(
        textBlocks,
        `Снятый архетип «${previous.slug}»:\n- ${snippets.join('\n- ')}`,
      )
    }
  }

  const companions = revokeCompanionsForSubclass(
    draft.companions,
    classEntryId,
    previous.slug,
  )

  return {
    ...draft,
    skills,
    subclassGrants: remaining,
    companions,
    textBlocks,
    identity: {
      ...draft.identity,
      armor,
      weapons,
      tools,
      languages,
    },
  }
}

export function applySubclassGrantToDraft(input: {
  draft: SubclassGrantDraftSlice
  classEntryId: string
  catalogId: string | null
  def: SubclassGrantDef
  picks?: SubclassGrantPicks
  copyOldTextToNotes?: boolean
  previousDef?: SubclassGrantDef | null
}): { draft: SubclassGrantDraftSlice; summary: string } | null {
  const picks = input.picks ?? emptySubclassPicks()
  const pickError = validateSubclassPicks(input.def, picks)
  if (pickError) return null

  const cleared = revokeSubclassGrant(input.draft, input.classEntryId, {
    copyTextToNotes: input.copyOldTextToNotes,
    def: input.previousDef ?? null,
  })

  const skillsApplied = resolveSkillsFromPicks(input.def, picks)
  const languagesApplied = resolveLanguagesFromPicks(input.def, picks)
  const toolsApplied = [...input.def.sheetGrants.toolsFixed]
  const armorKeys = [...input.def.sheetGrants.armor]
  const weaponKeys: WeaponProfKey[] = []
  if (input.def.sheetGrants.weapons.simple) weaponKeys.push('simple')
  if (input.def.sheetGrants.weapons.martial) weaponKeys.push('martial')
  const weaponExtras = [...input.def.sheetGrants.weapons.extras]

  const skills = { ...cleared.skills }
  for (const key of skillsApplied) {
    const current = skills[key] ?? { is_proficient: false, is_expertise: false }
    skills[key] = { ...current, is_proficient: true }
  }

  const armor: ArmorProficiency = { ...cleared.identity.armor }
  for (const key of armorKeys) armor[key] = true

  const weapons: WeaponProficiency = { ...cleared.identity.weapons }
  for (const key of weaponKeys) weapons[key] = true

  const nextGrant: AppliedSubclassGrant = {
    classEntryId: input.classEntryId,
    catalogId: input.catalogId,
    slug: input.def.slug,
    parentSlug: input.def.parentSlug,
    armorKeys,
    weaponKeys,
    weaponExtras,
    skills: skillsApplied,
    tools: toolsApplied,
    languages: languagesApplied,
    picks: { ...picks.values },
    caster: input.def.sheetGrants.caster,
  }

  const draft: SubclassGrantDraftSlice = {
    ...cleared,
    skills,
    subclassGrants: [
      ...cleared.subclassGrants.filter((row) => row.classEntryId !== input.classEntryId),
      nextGrant,
    ],
    identity: {
      ...cleared.identity,
      armor,
      weapons,
      tools: uniqueStrings([
        ...cleared.identity.tools,
        ...toolsApplied,
        ...weaponExtras,
      ]),
      languages: uniqueStrings([...cleared.identity.languages, ...languagesApplied]),
    },
  }

  return {
    draft,
    summary: formatSubclassGrantSummary({ def: input.def, picks }),
  }
}

export function resolveSubclassDefFromCatalog(input: {
  nameRu: string
  slug: string
  catalogData?: Record<string, unknown> | null
  parentSlug?: string | null
}): SubclassGrantDef | null {
  return parseSubclassGrantDef({
    slug: input.slug,
    nameRu: input.nameRu,
    catalogData: input.catalogData,
    parentSlug: input.parentSlug,
  })
}

export {
  emptySubclassPicks,
  subclassNeedsSetupDialog,
  validateSubclassPicks,
  parseSubclassGrantDef,
}
