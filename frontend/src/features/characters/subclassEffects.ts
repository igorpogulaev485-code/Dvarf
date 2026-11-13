/** Apply / revoke subclass sheet grants on the digital sheet draft. */

import type { AppliedClassGrant, ArmorProfKey, WeaponProfKey } from '../../shared/dnd/classGrants'
import {
  clearSubclassTransition,
  collectGrantTextSnippets,
  emptySubclassPicks,
  formatSubclassGrantSummary,
  parseSubclassGrantDef,
  readSubclassTransitions,
  subclassNeedsSetupDialog,
  upsertSubclassTransition,
  validateSubclassPicks,
  type AlwaysPreparedSpell,
  type AppliedSubclassGrant,
  type SubclassChangeMode,
  type SubclassGrantDef,
  type SubclassGrantPicks,
  type SubclassTransition,
} from '../../shared/dnd/subclassGrants'
import { alwaysPreparedSpellNameRu } from '../../shared/dnd/alwaysPreparedSpellNamesRu'
import { bonusCantripGrants, type BonusCantripGrant } from '../../shared/dnd/bonusCantrips'
import { getFeaturePick, type FeaturePicksState } from '../../shared/dnd/featurePicks'
import {
  classCasterDef,
  maxSpellLevelForClassAlone,
} from '../../shared/dnd/casterProgression'
import type { ArmorProficiency, IdentityExtras, WeaponProficiency } from './identity'
import type { AppliedRaceGrant } from '../../shared/dnd/raceGrants'
import type { CompanionEntry } from './companions'
import {
  mergeSubclassCompanions,
  revokeCompanionsForSubclass,
} from './companions'
import {
  companionFromSubclassTemplate,
} from './companionBackfill'
import {
  resolveCompanionTemplate,
  type CompanionTemplateContext,
} from './companionTemplates'
import {
  mergeBestiaryPickIntoCompanion,
} from './bestiaryCompanionStats'
import type { BestiaryFormPick } from './wildShape'

function readBestiaryPickFromPicks(
  values: Record<string, unknown>,
  choiceId: string,
): BestiaryFormPick | null {
  const raw = values[`${choiceId}_bestiary`] ?? values.rangers_companion_bestiary
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    const parsed = JSON.parse(raw) as Partial<BestiaryFormPick>
    if (typeof parsed.slug !== 'string' || typeof parsed.name_ru !== 'string') {
      return null
    }
    return {
      slug: parsed.slug,
      name_ru: parsed.name_ru,
      catalog_id: typeof parsed.catalog_id === 'string' ? parsed.catalog_id : null,
      cr: typeof parsed.cr === 'string' ? parsed.cr : '0',
      type: typeof parsed.type === 'string' ? parsed.type : 'beast',
      ac: typeof parsed.ac === 'number' ? parsed.ac : 10,
      hp: typeof parsed.hp === 'number' ? parsed.hp : 1,
      speed_walk: typeof parsed.speed_walk === 'number' ? parsed.speed_walk : 30,
      speed_swim: parsed.speed_swim,
      speed_fly: parsed.speed_fly,
      speed_climb: parsed.speed_climb,
      str: parsed.str,
      dex: parsed.dex,
      con: parsed.con,
      resistances: parsed.resistances,
      immunities: parsed.immunities,
      actions_text: typeof parsed.actions_text === 'string' ? parsed.actions_text : '',
    }
  } catch {
    return null
  }
}
import type { TextBlock } from './textBlocks'
import { enrichAlwaysPreparedSheetSpell } from './alwaysPreparedSpellEnrichment'
import {
  LAND_CIRCLE_SPELLS,
  landCircleSpells,
  resolveDruidLandType,
} from './druidCircleSpells'
import {
  asAlwaysPreparedSpell,
  createSheetSpell,
  isPreparedLocked,
  isSubclassSheetSpell,
  spellKeyFromName,
  subclassSpellId,
  type SheetSpell,
  type SpellsState,
} from './spells'

/**
 * RAW multiclass: domain/oath/specialty circle access follows this class alone,
 * not shared multiclass spell slots (PHB «Spells Known and Prepared»).
 */
function pushLockedGrantSpell(input: {
  known: SheetSpell[]
  grantedSpellIds: string[]
  classEntryId: string
  slug: string
  label: string
  parentClassSlug: string | null
  englishName: string
  level: number
  range?: string
  castingTime?: string
}) {
  const key = spellKeyFromName(input.englishName)
  const enriched = enrichAlwaysPreparedSheetSpell(
    {
      ...createSheetSpell(),
      id: subclassSpellId(input.classEntryId, input.slug, key || input.englishName),
      name: '',
      level: input.level,
      ...(input.range ? { range: input.range } : {}),
      ...(input.castingTime ? { casting_time: input.castingTime } : {}),
    },
    input.englishName,
  )
  if (!enriched.name) enriched.name = alwaysPreparedSpellNameRu(input.englishName)
  const created = asAlwaysPreparedSpell(
    enriched,
    {
      source_kind: 'subclass',
      label: input.label,
      class_slug: input.parentClassSlug,
      class_entry_id: input.classEntryId,
    },
  )
  if (input.range) created.range = input.range
  if (input.castingTime) created.casting_time = input.castingTime
  input.known.push(created)
  input.grantedSpellIds.push(created.id)
}

const RITUAL_WITHOUT_SLOTS = new Set(['path_of_the_totem_warrior'])

/** Spells the subclass grants even when the stored catalog snapshot is empty. */
const EXTRA_SUBCLASS_SPELLS: Record<string, AlwaysPreparedSpell[]> = {
  path_of_the_totem_warrior: [
    { name: 'Beast Sense', level: 2, fromClassLevel: 3 },
    { name: 'Speak with Animals', level: 1, fromClassLevel: 3 },
    { name: 'Commune with Nature', level: 5, fromClassLevel: 10 },
  ],
  path_of_the_ancestral_guardian: [
    { name: 'Augury', level: 2, fromClassLevel: 10 },
    { name: 'Clairvoyance', level: 3, fromClassLevel: 10 },
  ],
}

function cantripLabelForSlug(slug: string, fallback: string): string {
  if (slug === 'path_of_the_giant') return 'Путь великана · Мудрость, без ячеек'
  if (slug === 'arcane_trickster') return 'Мистический ловкач · вне лимита заговоров'
  if (slug === 'way_of_shadow') return 'Путь тени · вне лимита заговоров'
  if (slug === 'arcane_archer') return 'Мистический лучник · вне лимита заклинаний'
  if (slug === 'college_of_spirits') return 'Направляющие шёпоты · Харизма, 60 фт., вне лимита'
  return fallback
}

function picksWithFeatureCantrips(
  grant: AppliedSubclassGrant,
  featurePicks: FeaturePicksState | undefined,
): SubclassGrantPicks {
  const values = { ...(grant.picks ?? {}) }
  if (!featurePicks) return { values }
  const giant = getFeaturePick(featurePicks, grant.classEntryId, 'giants_power')
  if (giant && values.giant_cantrip == null) values.giant_cantrip = giant
  return { values }
}

function appendBonusCantripGrants(input: {
  known: SheetSpell[]
  grantedSpellIds: string[]
  classEntryId: string
  slug: string
  label: string
  parentClassSlug: string | null
  picks: SubclassGrantPicks
}) {
  const grants: BonusCantripGrant[] = bonusCantripGrants(
    input.slug,
    input.picks,
    input.known.map((spell) => spell.name),
  )
  const label = cantripLabelForSlug(input.slug, input.label)
  const parentClassSlug =
    input.parentClassSlug || (input.slug === 'college_of_spirits' ? 'bard' : null)
  for (const grant of grants) {
    pushLockedGrantSpell({
      ...input,
      parentClassSlug,
      label,
      englishName: grant.nameEn,
      level: 0,
      range: grant.range,
      castingTime: grant.castingTime,
    })
  }
}

/** Player copy of a domain/oath/cantrip grant must not sit beside the locked row. */
function dropUnlockedGrantDuplicates(
  known: SheetSpell[],
  grantedSpellIds: string[],
  parentClassSlug: string | null,
): SheetSpell[] {
  const granted = known.filter((spell) => grantedSpellIds.includes(spell.id))
  if (granted.length === 0) return known
  const catalogIds = new Set(
    granted.map((spell) => spell.catalog_id).filter((id): id is string => Boolean(id)),
  )
  const names = new Set(granted.map((spell) => spellKeyFromName(spell.name)))
  return known.filter((spell) => {
    if (grantedSpellIds.includes(spell.id)) return true
    if (isPreparedLocked(spell)) return true
    const sameCatalog = Boolean(spell.catalog_id && catalogIds.has(spell.catalog_id))
    const sameName = names.has(spellKeyFromName(spell.name))
    if (!sameCatalog && !sameName) return true
    const slug = (spell.class_slug ?? '').trim().toLowerCase()
    if (slug && parentClassSlug && slug !== parentClassSlug) return true
    return false
  })
}

function aloneMaxSpellLevelForParent(
  parentSlug: string | null | undefined,
  classLevel: number,
  fallbackSharedCap: number,
): number {
  const slug = (parentSlug || '').trim().toLowerCase()
  const def = slug ? classCasterDef(slug) : null
  if (!def || def.progression === 'none') {
    return Math.max(0, Math.min(9, Math.floor(fallbackSharedCap)))
  }
  return maxSpellLevelForClassAlone(def.progression, classLevel)
}

export type SkillState = Record<string, { is_proficient: boolean; is_expertise: boolean }>

export type SubclassGrantDraftSlice = {
  identity: IdentityExtras
  skills: SkillState
  classGrants: AppliedClassGrant[]
  subclassGrants: AppliedSubclassGrant[]
  subclassTransitions: SubclassTransition[]
  raceGrant: AppliedRaceGrant | null
  companions: CompanionEntry[]
  textBlocks: TextBlock[]
  spells: SpellsState
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

const SKILL_KEY_RE =
  /^(acrobatics|animal_handling|arcana|athletics|deception|history|insight|intimidation|investigation|medicine|nature|perception|performance|persuasion|religion|sleight_of_hand|stealth|survival)$/

function pickValues(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) return [value]
  return []
}

function isToolChoice(choice: { id: string; from: string[] | 'any' }): boolean {
  const id = choice.id.toLowerCase()
  if (id.includes('tool')) return true
  if (choice.from === 'any') return false
  return choice.from.some(
    (item) => item.toLowerCase().includes('инструмент') || item === 'artisan_tools',
  )
}

function resolveSkillsFromPicks(
  def: SubclassGrantDef,
  picks: SubclassGrantPicks,
): string[] {
  const skills: string[] = []
  for (const choice of def.choices) {
    if (choice.appliesTo !== 'grant') continue
    if (choice.kind === 'open_text') continue
    if (choice.id.toLowerCase().includes('lang')) continue
    if (isToolChoice(choice)) continue
    for (const item of pickValues(picks.values[choice.id])) {
      if (choice.from === 'any' || SKILL_KEY_RE.test(item)) {
        if (choice.from === 'any' || choice.from.includes(item)) skills.push(item)
      } else if (Array.isArray(choice.from) && choice.from.includes(item) && SKILL_KEY_RE.test(item)) {
        skills.push(item)
      }
    }
  }
  return uniqueStrings(skills)
}

function resolveToolsFromPicks(
  def: SubclassGrantDef,
  picks: SubclassGrantPicks,
): string[] {
  const tools: string[] = []
  for (const choice of def.choices) {
    if (choice.appliesTo !== 'grant') continue
    if (choice.kind === 'open_text') continue
    if (!isToolChoice(choice)) continue
    tools.push(...pickValues(picks.values[choice.id]))
  }
  return uniqueStrings(tools)
}

function resolveLanguagesFromPicks(
  def: SubclassGrantDef,
  picks: SubclassGrantPicks,
): string[] {
  const languages: string[] = []
  for (const choice of def.choices) {
    if (choice.appliesTo !== 'grant') continue
    if (!choice.id.toLowerCase().includes('lang')) continue
    languages.push(...pickValues(picks.values[choice.id]))
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
      grantedSpellIds: Array.isArray(row.grantedSpellIds)
        ? row.grantedSpellIds.filter((v): v is string => typeof v === 'string')
        : [],
      alwaysPreparedSpells: readAlwaysPreparedSnapshot(row.alwaysPreparedSpells),
    })
  }
  return result
}

function readAlwaysPreparedSnapshot(raw: unknown): AlwaysPreparedSpell[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const out: AlwaysPreparedSpell[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.name !== 'string' || !row.name.trim()) continue
    const fromClassRaw = row.fromClassLevel ?? row.from_class_level
    const requiresRaw =
      row.requiresChoice && typeof row.requiresChoice === 'object'
        ? (row.requiresChoice as Record<string, unknown>)
        : row.requires_choice && typeof row.requires_choice === 'object'
          ? (row.requires_choice as Record<string, unknown>)
          : null
    const requiresId =
      requiresRaw && typeof requiresRaw.id === 'string' ? requiresRaw.id.trim() : ''
    const requiresValue =
      requiresRaw && typeof requiresRaw.value === 'string'
        ? requiresRaw.value.trim()
        : ''
    out.push({
      name: row.name.trim(),
      level: typeof row.level === 'number' ? Math.max(0, Math.min(9, row.level)) : 1,
      ...(typeof fromClassRaw === 'number' && Number.isFinite(fromClassRaw)
        ? { fromClassLevel: Math.max(1, Math.min(20, Math.floor(fromClassRaw))) }
        : {}),
      ...(requiresId && requiresValue
        ? { requiresChoice: { id: requiresId, value: requiresValue } }
        : {}),
    })
  }
  return out.length > 0 ? out : undefined
}

function alwaysPreparedMatchesPicks(
  spell: AlwaysPreparedSpell,
  picks: Record<string, string | string[] | undefined>,
): boolean {
  if (!spell.requiresChoice) return true
  const raw = picks[spell.requiresChoice.id]
  const value = typeof raw === 'string' ? raw.trim() : ''
  return value === spell.requiresChoice.value
}

export function revokeSubclassGrant(
  draft: SubclassGrantDraftSlice,
  classEntryId: string,
  options?: { copyTextToNotes?: boolean; def?: SubclassGrantDef | null },
): SubclassGrantDraftSlice {
  const previous = draft.subclassGrants.find((row) => row.classEntryId === classEntryId)
  const transitions = clearSubclassTransition(
    draft.subclassTransitions ?? [],
    classEntryId,
  )
  if (!previous) {
    if (transitions.length === (draft.subclassTransitions ?? []).length) return draft
    return { ...draft, subclassTransitions: transitions }
  }

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

  const removeSpellIds = new Set(previous.grantedSpellIds)
  const known = draft.spells.known.filter((spell) => !removeSpellIds.has(spell.id))

  return {
    ...draft,
    skills,
    subclassGrants: remaining,
    subclassTransitions: transitions,
    companions,
    textBlocks,
    spells: { ...draft.spells, known },
    identity: {
      ...draft.identity,
      armor,
      weapons,
      tools,
      languages,
    },
  }
}

/**
 * Apply a new archetype.
 * - `replace_all` / initial: revoke previous grants, apply new sheet grants.
 * - `future_only`: keep previous sheet grants/spells/companions; do not apply
 *   starting grants of the new archetype; record a transition watermark.
 */
export function applySubclassGrantToDraft(input: {
  draft: SubclassGrantDraftSlice
  classEntryId: string
  catalogId: string | null
  def: SubclassGrantDef
  picks?: SubclassGrantPicks
  copyOldTextToNotes?: boolean
  previousDef?: SubclassGrantDef | null
  changeMode?: SubclassChangeMode | 'initial'
  changedAtClassLevel?: number
  /** Current class level — gates from_class_level always-prepared spells. */
  classLevel?: number
  previousNameRu?: string
  previousCatalogId?: string | null
  previousSlug?: string
  /** Highest slot level the character can cast — gates domain/oath spells. */
  maxSpellLevel?: number
  /** Character total level — proficiency for companion templates. */
  characterLevel?: number
  /** INT modifier — Steel Defender HP. */
  hostIntMod?: number
  /** Spellcasting ability mod — Wildfire / Tasha attack lines. */
  spellMod?: number
  /**
   * Beast Master PHB: bestiary pick chosen in SubclassSetupDialog.
   * Keyed by choice id (usually `rangers_companion`).
   */
  companionBestiaryPicks?: Record<string, BestiaryFormPick | null | undefined>
}): { draft: SubclassGrantDraftSlice; summary: string } | null {
  const picks = input.picks ?? emptySubclassPicks()
  const changeMode = input.changeMode ?? 'initial'

  if (changeMode === 'future_only') {
    const watermark = Math.min(
      20,
      Math.max(1, Math.floor(input.changedAtClassLevel ?? 1)),
    )
    const previous = input.draft.subclassGrants.find(
      (row) => row.classEntryId === input.classEntryId,
    )
    const previousSlug =
      input.previousSlug ||
      previous?.slug ||
      input.previousDef?.slug ||
      ''
    const transition: SubclassTransition = {
      classEntryId: input.classEntryId,
      mode: 'future_only',
      changedAtClassLevel: watermark,
      previousSlug,
      previousCatalogId:
        input.previousCatalogId ?? previous?.catalogId ?? null,
      previousNameRu: input.previousNameRu ?? input.previousDef?.labelRu ?? '',
      activeSlug: input.def.slug,
      activeCatalogId: input.catalogId,
    }
    let textBlocks = input.draft.textBlocks
    if (input.copyOldTextToNotes) {
      const snippets = collectGrantTextSnippets({
        def: input.previousDef ?? null,
        grant: previous ?? null,
      })
      if (snippets.length) {
        textBlocks = appendNotesBlock(
          textBlocks,
          `Смена архетипа (только будущие уровни) «${previousSlug || '—'}» → «${input.def.slug}» с ${watermark} ур.:\n- ${snippets.join('\n- ')}\n(владения и уже открытые умения старого архетипа сохранены)`,
        )
      }
    }
    return {
      draft: {
        ...input.draft,
        textBlocks,
        subclassTransitions: upsertSubclassTransition(
          input.draft.subclassTransitions ?? [],
          transition,
        ),
      },
      summary: `только будущие уровни (с ${watermark + 1}); владения «${previousSlug || 'старого'}» сохранены`,
    }
  }

  const pickError = validateSubclassPicks(input.def, picks)
  if (pickError) return null

  const clearedBase = revokeSubclassGrant(input.draft, input.classEntryId, {
    copyTextToNotes: input.copyOldTextToNotes,
    def: input.previousDef ?? null,
  })
  const cleared: SubclassGrantDraftSlice = {
    ...clearedBase,
    subclassTransitions: clearSubclassTransition(
      clearedBase.subclassTransitions ?? [],
      input.classEntryId,
    ),
  }

  const skillsApplied = uniqueStrings([
    ...input.def.sheetGrants.skillsFixed,
    ...resolveSkillsFromPicks(input.def, picks),
  ])
  const languagesApplied = uniqueStrings([
    ...input.def.sheetGrants.languagesFixed,
    ...resolveLanguagesFromPicks(input.def, picks),
  ])
  const toolsApplied = uniqueStrings([
    ...input.def.sheetGrants.toolsFixed,
    ...resolveToolsFromPicks(input.def, picks),
  ])
  const armorKeys = [...input.def.sheetGrants.armor]
  const weaponKeys: WeaponProfKey[] = []
  if (input.def.sheetGrants.weapons.simple) weaponKeys.push('simple')
  if (input.def.sheetGrants.weapons.martial) weaponKeys.push('martial')
  const weaponExtras = [...input.def.sheetGrants.weapons.extras]

  const knowledgeExpertise =
    input.def.slug === 'knowledge_domain'
      ? new Set(
          skillsApplied.filter((key) =>
            ['arcana', 'history', 'nature', 'religion'].includes(key),
          ),
        )
      : new Set<string>()
  const skills = { ...cleared.skills }
  for (const key of skillsApplied) {
    const current = skills[key] ?? { is_proficient: false, is_expertise: false }
    skills[key] = {
      ...current,
      is_proficient: true,
      is_expertise: current.is_expertise || knowledgeExpertise.has(key),
    }
  }

  const armor: ArmorProficiency = { ...cleared.identity.armor }
  for (const key of armorKeys) armor[key] = true

  const weapons: WeaponProficiency = { ...cleared.identity.weapons }
  for (const key of weaponKeys) weapons[key] = true

  const classLevel = Math.min(
    20,
    Math.max(
      1,
      Math.floor(input.classLevel ?? input.changedAtClassLevel ?? input.def.grantsLevel),
    ),
  )
  const characterLevel = Math.min(
    20,
    Math.max(1, Math.floor(input.characterLevel ?? classLevel)),
  )
  const templateCtx: CompanionTemplateContext = {
    hostClassLevel: classLevel,
    characterLevel,
    hostIntMod: input.hostIntMod,
    spellMod: input.spellMod,
  }

  const companionsFromPicks: CompanionEntry[] = []
  for (const choice of input.def.choices) {
    const raw = picks.values[choice.id]
    const value = typeof raw === 'string' ? raw.trim() : ''
    if (!value) continue
    const id = choice.id.toLowerCase()
    // Only an explicit companion choice. Totem spirits and drake essence
    // are effect types; a substring match used to mint a false naparnik.
    if (choice.appliesTo !== 'companion') continue

    const displayName =
      choice.kind === 'single'
        ? choice.fromLabelsRu?.[value] ?? value
        : value

    // Beast Master: companion_type pick (PHB vs Tasha) — no silent default.
    const companionTypeRaw = picks.values['companion_type']
    const companionType =
      typeof companionTypeRaw === 'string' ? companionTypeRaw.trim() : ''

    // Н4: no silent default for Beast Master — companion_type must be set in setup UI.
    const templatePickValue =
      id.includes('rangers_companion') && companionType
        ? companionType
        : choice.kind === 'single'
          ? value
          : value

    const template = resolveCompanionTemplate({
      choiceId:
        id.includes('rangers_companion') && companionType
          ? companionType.startsWith('beast_of_')
            ? 'companion_type'
            : choice.id
          : choice.id,
      pickValue: templatePickValue,
      ctx: templateCtx,
    })

    const source = {
      kind: 'subclass' as const,
      labelRu: `Архетип: ${input.def.slug}`,
      classEntryId: input.classEntryId,
      subclassSlug: input.def.slug,
      feature: choice.id,
    }

    const variantNote =
      choice.kind === 'single' && choice.fromLabelsRu?.[value]
        ? `Вариант: ${choice.fromLabelsRu[value]} (тип можно сменить при следующем призыве)`
        : companionType
          ? companionType.startsWith('beast_of_')
            ? 'TCE: Первобытный спутник'
            : companionType.includes('phb')
              ? 'PHB: зверь из Книги игрока'
              : ''
          : ''

    let created = template
      ? companionFromSubclassTemplate({
          template,
          name: displayName,
          source,
          notesExtra: variantNote,
        })
      : companionFromSubclassTemplate({
          template: {
            kind: id.includes('defender')
              ? 'steel_defender'
              : id.includes('drake')
                ? 'drake'
                : id.includes('cannon')
                  ? 'eldritch_cannon'
                  : id.includes('wildfire') || id.includes('spirit')
                    ? 'ally'
                    : 'beast_companion',
            defaultName: displayName,
            stats: { hp: null, hp_max: null, ac: null, speed: null },
            actions: '',
            notes: variantNote,
            nature: 'living',
          },
          name: displayName,
          source,
        })

    const bestiaryPick =
      input.companionBestiaryPicks?.[choice.id] ??
      readBestiaryPickFromPicks(picks.values, choice.id)
    if (
      bestiaryPick &&
      created.kind === 'beast_companion' &&
      (!companionType || companionType === 'phb_beast_cr_1_4')
    ) {
      created = {
        ...mergeBestiaryPickIntoCompanion({
          companion: created,
          pick: bestiaryPick,
        }),
        active: false,
      }
    }

    // C01-6: PHB/Tasha beast «просто есть» с уровня архетипа — сразу активен.
    // Дух / пушка — слот «не призван», пока не призвали (C01-1).
    if (
      created.kind === 'beast_companion' ||
      created.kind === 'primal_companion'
    ) {
      created = { ...created, active: true }
    }

    companionsFromPicks.push(created)
  }

  const companionsMerged = mergeSubclassCompanions({
    previous: cleared.companions,
    next: companionsFromPicks,
  })
  // Keep unrelated companions (manual / spell / other class).
  const keptOthers = cleared.companions.filter((row) => {
    if (row.source?.classEntryId !== input.classEntryId) return true
    const feature = row.source?.feature?.trim() ?? ''
    if (!feature) return true
    return !companionsFromPicks.some((c) => c.source?.feature === feature)
  })
  const companionsNext = [...keptOthers, ...companionsMerged]

  const sharedCap =
    typeof input.maxSpellLevel === 'number' && Number.isFinite(input.maxSpellLevel)
      ? Math.max(0, Math.min(9, Math.floor(input.maxSpellLevel)))
      : 9
  const grantedSpellIds: string[] = []
  let known = [...cleared.spells.known]
  // Prefer RAW class-alone cap; sharedCap only if parent progression unknown.
  const maxSpellLevel = aloneMaxSpellLevelForParent(
    input.def.parentSlug,
    classLevel,
    sharedCap,
  )
  const parentClassSlug = input.def.parentSlug.trim().toLowerCase() || null
  const landMatched = input.def.alwaysPreparedSpells.filter((spell) =>
    alwaysPreparedMatchesPicks(spell, picks.values),
  )
  for (const spell of landMatched) {
    if (spell.level > maxSpellLevel) continue
    if (spell.fromClassLevel != null && spell.fromClassLevel > classLevel) continue
    const nameRu = alwaysPreparedSpellNameRu(spell.name)
    const key = spellKeyFromName(spell.name)
    const created = asAlwaysPreparedSpell(
      enrichAlwaysPreparedSheetSpell(
        {
          ...createSheetSpell(),
          id: subclassSpellId(input.classEntryId, input.def.slug, key || spell.name),
          name: nameRu,
          level: spell.level,
        },
        spell.name,
      ),
      {
        source_kind: 'subclass',
        label: input.def.labelRu,
        class_slug: parentClassSlug,
        class_entry_id: input.classEntryId,
      },
    )
    known.push(created)
    grantedSpellIds.push(created.id)
  }
  appendBonusCantripGrants({
    known,
    grantedSpellIds,
    classEntryId: input.classEntryId,
    slug: input.def.slug,
    label: input.def.labelRu,
    parentClassSlug,
    picks,
  })
  known = dropUnlockedGrantDuplicates(known, grantedSpellIds, parentClassSlug)

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
    grantedSpellIds,
    // Snapshot only the pick-matched circle/conclave rows so level-up sync
    // unlocks the rest of that land (not every land table).
    alwaysPreparedSpells: landMatched.map((spell) => ({
      name: spell.name,
      level: spell.level,
      ...(spell.fromClassLevel != null
        ? { fromClassLevel: spell.fromClassLevel }
        : {}),
      ...(spell.requiresChoice
        ? { requiresChoice: { ...spell.requiresChoice } }
        : {}),
    })),
  }

  const draft: SubclassGrantDraftSlice = {
    ...cleared,
    skills,
    subclassGrants: [
      ...cleared.subclassGrants.filter((row) => row.classEntryId !== input.classEntryId),
      nextGrant,
    ],
    companions: companionsNext,
    spells: { ...cleared.spells, known },
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

function grantSpellShapeMatches(
  prev: SheetSpell | undefined,
  next: SheetSpell | undefined,
): boolean {
  if (!prev || !next) return false
  const mark = (spell: SheetSpell) => {
    const components = spell.components
    if (!components) return ''
    return `${components.v ? 'v' : ''}${components.s ? 's' : ''}${components.m ? 'm' : ''}`
  }
  return (
    prev.name === next.name &&
    (prev.catalog_id ?? null) === (next.catalog_id ?? null) &&
    prev.concentration === next.concentration &&
    (prev.duration ?? '') === (next.duration ?? '') &&
    mark(prev) === mark(next)
  )
}

function sameAlwaysPreparedList(
  prev: AlwaysPreparedSpell[],
  next: AlwaysPreparedSpell[],
): boolean {
  if (prev.length !== next.length) return false
  return prev.every((spell, index) => {
    const other = next[index]
    return (
      other != null &&
      spell.name === other.name &&
      spell.level === other.level &&
      (spell.fromClassLevel ?? null) === (other.fromClassLevel ?? null)
    )
  })
}

/**
 * Re-inject always-prepared domain/oath/specialty spells per RAW class-alone
 * spell level (not shared multiclass slots). Also strips orphan subclass
 * always-prepared rows whose ids are no longer in any grant.
 */
export function syncSubclassAlwaysPreparedSpells(input: {
  draft: SubclassGrantDraftSlice
  /** Fallback shared slot cap when parent progression is unknown. */
  maxSpellLevel: number
  /** classEntryId → class level (for fromClassLevel circle/conclave gates). */
  classLevelByEntryId?: Record<string, number>
  /** Feature-card cantrip picks (Giant) when the archetype dialog was already closed. */
  featurePicks?: FeaturePicksState
}): SubclassGrantDraftSlice {
  const sharedCap = Math.max(0, Math.min(9, Math.floor(input.maxSpellLevel)))
  let known = [...input.draft.spells.known]
  let grants = input.draft.subclassGrants
  let changed = false

  for (const grant of input.draft.subclassGrants) {
    const extra = EXTRA_SUBCLASS_SPELLS[grant.slug] ?? []
    let catalog = [...(grant.alwaysPreparedSpells ?? [])]
    for (const spell of extra) {
      if (!catalog.some((row) => row.name === spell.name && row.level === spell.level)) {
        catalog.push(spell)
      }
    }
    const picks = picksWithFeatureCantrips(grant, input.featurePicks)
    let landType: string | null = null
    if (grant.slug === 'circle_of_the_land') {
      landType = resolveDruidLandType({
        classEntryId: grant.classEntryId,
        featurePicks: input.featurePicks,
        grantPicks: picks.values,
      })
      catalog = landCircleSpells(landType).map((spell) => ({
        name: spell.name,
        level: spell.level,
        fromClassLevel: spell.fromClassLevel,
      }))
    }
    const bonus = bonusCantripGrants(grant.slug, picks)
    if (
      catalog.length === 0 &&
      bonus.length === 0 &&
      grant.slug !== 'circle_of_the_land'
    ) {
      continue
    }

    const classLevel = Math.min(
      20,
      Math.max(1, Math.floor(input.classLevelByEntryId?.[grant.classEntryId] ?? 20)),
    )
    const maxSpellLevel = aloneMaxSpellLevelForParent(
      grant.parentSlug,
      classLevel,
      sharedCap,
    )

    const removeIds = new Set(grant.grantedSpellIds)
    if (grant.slug === 'circle_of_the_land') {
      const names = new Set<string>(['Gust of Wind', 'Lightning Bolt'])
      for (const rows of Object.values(LAND_CIRCLE_SPELLS)) {
        for (const spell of rows) names.add(spell.name)
      }
      for (const name of names) {
        removeIds.add(
          subclassSpellId(grant.classEntryId, grant.slug, spellKeyFromName(name)),
        )
      }
    }
    const prevLabel =
      known.find((spell) => removeIds.has(spell.id))?.prepare_source_label?.trim() ||
      grant.slug
    let nextKnown = known.filter((spell) => !removeIds.has(spell.id))
    const grantedSpellIds: string[] = []
    const parentClassSlug = grant.parentSlug.trim().toLowerCase() || null

    for (const spell of catalog) {
      if (!alwaysPreparedMatchesPicks(spell, picks.values)) continue
      const ritualGrant = RITUAL_WITHOUT_SLOTS.has(grant.slug)
      const consult = grant.slug === 'path_of_the_ancestral_guardian'
      if (!ritualGrant && !consult && spell.level > maxSpellLevel) continue
      if (spell.fromClassLevel != null && spell.fromClassLevel > classLevel) continue
      const nameRu = alwaysPreparedSpellNameRu(spell.name)
      const key = spellKeyFromName(spell.name)
      const created = asAlwaysPreparedSpell(
        enrichAlwaysPreparedSheetSpell(
          {
            ...createSheetSpell(),
            id: subclassSpellId(grant.classEntryId, grant.slug, key || spell.name),
            name: nameRu,
            level: spell.level,
          },
          spell.name,
        ),
        {
          source_kind: 'subclass',
          label: prevLabel,
          class_slug: parentClassSlug,
          class_entry_id: grant.classEntryId,
        },
      )
      if (ritualGrant) {
        created.ritual = true
        created.cast_access = 'ritual_only'
        created.notes = 'Только как ритуал, без ячейки заклинаний'
        created.casting_time = created.casting_time || '1 ритуал'
      }
      if (consult) {
        created.ritual = false
        created.cast_access = 'feature'
        created.class_slug = 'barbarian'
        created.feature_spend = {
          poolId: 'consult_the_spirits',
          classSlug: 'barbarian',
          classEntryId: grant.classEntryId,
          cost: 1,
          label: 'Совет духов',
          optionId: key || spell.name,
        }
        created.notes =
          'Совет духов: без ячейки и без компонентов. Общий заряд 1 на короткий или продолжительный отдых.'
        created.prepared = true
      }
      nextKnown.push(created)
      grantedSpellIds.push(created.id)
    }
    appendBonusCantripGrants({
      known: nextKnown,
      grantedSpellIds,
      classEntryId: grant.classEntryId,
      slug: grant.slug,
      label: prevLabel,
      parentClassSlug,
      picks,
    })
    nextKnown = dropUnlockedGrantDuplicates(nextKnown, grantedSpellIds, parentClassSlug)

    const sameIds =
      grantedSpellIds.length === grant.grantedSpellIds.length &&
      grantedSpellIds.every((id, index) => id === grant.grantedSpellIds[index])
    const rulesSame =
      sameIds &&
      grantedSpellIds.every((id) =>
        grantSpellShapeMatches(
          known.find((spell) => spell.id === id),
          nextKnown.find((spell) => spell.id === id),
        ),
      )
    const snapshotSame =
      grant.slug !== 'circle_of_the_land' ||
      sameAlwaysPreparedList(grant.alwaysPreparedSpells ?? [], catalog)
    const picksSame = landType == null || grant.picks?.land_type === landType
    const drifted = grantedSpellIds.some((id) => {
      const next = nextKnown.find((spell) => spell.id === id)
      const prev = known.find((spell) => spell.id === id)
      if (!next || !prev) return true
      return (
        next.cast_access !== prev.cast_access ||
        next.ritual !== prev.ritual ||
        next.feature_spend?.poolId !== prev.feature_spend?.poolId
      )
    })
    if (
      sameIds &&
      rulesSame &&
      nextKnown.length === known.length &&
      snapshotSame &&
      picksSame &&
      !drifted
    ) {
      continue
    }

    changed = true
    known = nextKnown
    grants = grants.map((row) =>
      row.classEntryId === grant.classEntryId
        ? {
            ...row,
            grantedSpellIds,
            ...(grant.slug === 'circle_of_the_land'
              ? {
                  alwaysPreparedSpells: catalog,
                  picks: landType ? { ...row.picks, land_type: landType } : row.picks,
                }
              : {}),
          }
        : row,
    )
  }

  // Legacy orphans: locked subclass rows not in any grant.grantedSpellIds.
  const tracked = new Set<string>()
  for (const grant of grants) {
    for (const id of grant.grantedSpellIds) tracked.add(id)
  }
  const orphanStripped = known.filter((spell) => {
    if (!isSubclassSheetSpell(spell) || !spell.prepared_locked) return true
    return tracked.has(spell.id)
  })
  if (orphanStripped.length !== known.length) {
    changed = true
    known = orphanStripped
  }

  if (!changed) return input.draft
  return {
    ...input.draft,
    subclassGrants: grants,
    spells: { ...input.draft.spells, known },
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
  readSubclassTransitions,
  clearSubclassTransition,
  upsertSubclassTransition,
}

export type { SubclassChangeMode, SubclassTransition }
