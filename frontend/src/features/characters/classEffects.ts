/** Apply / revoke PHB class proficiency grants on the digital sheet draft. */

import {
  classGrantDef,
  classGrantDefFromName,
  equipmentPackagesFor,
  formatClassGrantSummary,
  grantNeedsPicks,
  packageForMode,
  resolveClassGrantDef,
  type AbilityKey,
  type AppliedClassGrant,
  type ArmorProfKey,
  type ClassGrantDef,
  type ClassGrantPicks,
  type WeaponProfKey,
} from '../../shared/dnd/classGrants'
import { hitDieSides, type HitDie } from '../../shared/dnd/hitDice'
import { abilityModifier } from './sheetTypes'
import type { ArmorProficiency, IdentityExtras, WeaponProficiency } from './identity'
import {
  createInventoryItem,
  equipInventoryItem,
  type InventoryState,
} from './inventory'
import type { ArmorKind } from '../../shared/dnd/armor'
import { type WeaponAttack } from './AttacksPanel'
import { resolveWeaponGrip } from './heldEquip'
import { classifySpellTooling } from './spellFocus'
import { findWeaponPreset } from '../../shared/dnd/weaponPresets'
import {
  buildStartingWeaponAttacks,
  classEquipmentAttackIdAt,
} from './startingGearAttacks'

export type SkillState = Record<string, { is_proficient: boolean; is_expertise: boolean }>
export type SaveState = Record<AbilityKey, boolean>

export type ClassGrantDraftSlice = {
  identity: IdentityExtras
  saves: SaveState
  skills: SkillState
  classGrants: AppliedClassGrant[]
  playHitDie: HitDie | null
  hpMax: number | null
  hpCurrent: number | null
  constitutionScore: number
  characterLevel: number
  inventory: InventoryState
  weapons: WeaponAttack[]
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

function otherGrants(
  grants: AppliedClassGrant[],
  exceptEntryId: string,
): AppliedClassGrant[] {
  return grants.filter((row) => row.classEntryId !== exceptEntryId)
}

function unionArmor(grants: AppliedClassGrant[]): ArmorProficiency {
  const next: ArmorProficiency = {
    light: false,
    medium: false,
    heavy: false,
    shields: false,
  }
  for (const grant of grants) {
    for (const key of grant.armorKeys) next[key] = true
  }
  return next
}

function unionWeapons(grants: AppliedClassGrant[]): WeaponProficiency {
  const next: WeaponProficiency = { simple: false, martial: false, extras: [] }
  const extras: string[] = []
  for (const grant of grants) {
    for (const key of grant.weaponKeys) next[key] = true
    extras.push(...(grant.weaponExtras ?? []))
  }
  next.extras = uniqueStrings(extras)
  return next
}

function unionTools(grants: AppliedClassGrant[]): string[] {
  return uniqueStrings(grants.flatMap((row) => row.tools))
}

function unionSkills(grants: AppliedClassGrant[]): Set<string> {
  return new Set(grants.flatMap((row) => row.skills))
}

function unionSaves(grants: AppliedClassGrant[]): Set<AbilityKey> {
  return new Set(grants.flatMap((row) => row.saves))
}

/** Strip one class entry's grant, keeping flags/tools still covered by other class grants. */
export function revokeClassGrant(
  draft: ClassGrantDraftSlice,
  classEntryId: string,
): ClassGrantDraftSlice {
  const previous = draft.classGrants.find((row) => row.classEntryId === classEntryId)
  if (!previous) return draft

  const remaining = otherGrants(draft.classGrants, classEntryId)
  const remainingSkills = unionSkills(remaining)
  const remainingSaves = unionSaves(remaining)
  const remainingTools = setOfLower(unionTools(remaining))
  const remainingArmor = unionArmor(remaining)
  const remainingWeapons = unionWeapons(remaining)

  const skills = { ...draft.skills }
  for (const key of previous.skills) {
    if (remainingSkills.has(key)) continue
    const current = skills[key] ?? { is_proficient: false, is_expertise: false }
    skills[key] = { ...current, is_proficient: false }
  }

  const saves = { ...draft.saves }
  for (const key of previous.saves) {
    if (remainingSaves.has(key)) continue
    saves[key] = false
  }

  const tools = draft.identity.tools.filter((name) => {
    const key = name.trim().toLowerCase()
    const wasFromPrevious = previous.tools.some((item) => item.toLowerCase() === key)
    if (!wasFromPrevious) return true
    return remainingTools.has(key)
  })

  const armor = { ...draft.identity.armor }
  for (const key of previous.armorKeys) {
    armor[key] = remainingArmor[key]
  }

  const remainingExtraKeys = setOfLower(remainingWeapons.extras)
  const weapons: WeaponProficiency = {
    simple: remainingWeapons.simple,
    martial: remainingWeapons.martial,
    extras: (draft.identity.weapons.extras ?? []).filter((name) => {
      const key = name.trim().toLowerCase()
      const wasFromPrevious = (previous.weaponExtras ?? []).some(
        (item) => item.toLowerCase() === key,
      )
      if (!wasFromPrevious) return true
      return remainingExtraKeys.has(key)
    }),
  }
  for (const key of previous.weaponKeys) {
    weapons[key] = remainingWeapons[key]
  }

  let hpMax = draft.hpMax
  let hpCurrent = draft.hpCurrent
  if (previous.level1Hp != null && draft.hpMax === previous.level1Hp) {
    hpMax = null
    hpCurrent = null
  }

  const removeIds = new Set(previous.equipmentItemIds ?? [])
  const removeAttackIds = new Set(previous.equipmentAttackIds ?? [])
  const inventory: InventoryState = {
    coins: { ...draft.inventory.coins },
    items: draft.inventory.items.filter((item) => !removeIds.has(item.id)),
  }
  if ((previous.equipmentCoinsGp ?? 0) > 0) {
    inventory.coins.gp = Math.max(0, inventory.coins.gp - previous.equipmentCoinsGp)
  }

  return {
    ...draft,
    classGrants: remaining,
    identity: {
      ...draft.identity,
      armor,
      weapons,
      tools,
    },
    skills,
    saves,
    hpMax,
    hpCurrent,
    inventory,
    weapons: draft.weapons.filter((row) => !removeAttackIds.has(row.id)),
  }
}

function setOfLower(items: string[]): Set<string> {
  return new Set(items.map((item) => item.trim().toLowerCase()).filter(Boolean))
}

export function validateClassGrantPicks(input: {
  def: ClassGrantDef
  mode: 'start' | 'multiclass'
  picks: ClassGrantPicks
}): string | null {
  const pkg = packageForMode(input.def, input.mode)
  const skillNeed = pkg.skillChoices?.count ?? 0
  const toolNeed = pkg.toolChoices?.count ?? 0
  if (input.picks.skills.length !== skillNeed) {
    return `Выбери навыки: ${skillNeed}`
  }
  if (input.picks.tools.length !== toolNeed) {
    return `Выбери инструменты: ${toolNeed}`
  }
  if (pkg.skillChoices && pkg.skillChoices.from !== 'any') {
    const allowed = new Set(pkg.skillChoices.from)
    if (input.picks.skills.some((key) => !allowed.has(key))) {
      return 'Навык вне списка класса'
    }
  }
  if (pkg.toolChoices) {
    const allowed = new Set(pkg.toolChoices.from.map((item) => item.toLowerCase()))
    if (input.picks.tools.some((name) => !allowed.has(name.trim().toLowerCase()))) {
      return 'Инструмент вне списка класса'
    }
  }
  if (input.mode === 'start') {
    const packs = equipmentPackagesFor(input.def)
    if (packs.length > 0) {
      const id = input.picks.equipmentPackageId
      if (!id || id === '') return 'Выбери стартовое снаряжение или «Без снаряжения»'
      if (id !== 'skip' && !packs.some((pack) => pack.id === id)) {
        return 'Неизвестный пакет снаряжения'
      }
    }
  }
  return null
}

export function applyClassGrantToDraft(input: {
  draft: ClassGrantDraftSlice
  classEntryId: string
  className: string
  mode: 'start' | 'multiclass'
  picks: ClassGrantPicks
  def?: ClassGrantDef | null
  catalogSlug?: string | null
  catalogData?: Record<string, unknown> | null
}): { draft: ClassGrantDraftSlice; summary: string } | null {
  const def =
    input.def ??
    resolveClassGrantDef({
      className: input.className,
      catalogSlug: input.catalogSlug,
      catalogData: input.catalogData,
    })
  if (!def) return null

  const pickError = validateClassGrantPicks({
    def,
    mode: input.mode,
    picks: input.picks,
  })
  if (pickError) return null

  const cleared = revokeClassGrant(input.draft, input.classEntryId)
  const pkg = packageForMode(def, input.mode)

  const armorKeys = [...pkg.armor] as ArmorProfKey[]
  const weaponKeys = [...pkg.weapons] as WeaponProfKey[]
  const weaponExtras = uniqueStrings([...(pkg.weaponExtras ?? [])])
  const saves = [...pkg.saves]
  const skills = [...input.picks.skills]
  const tools = uniqueStrings([...pkg.toolsFixed, ...input.picks.tools])

  let hpMax = cleared.hpMax
  let hpCurrent = cleared.hpCurrent
  let level1Hp: number | null = null
  if (input.mode === 'start' && input.draft.characterLevel <= 1) {
    const conMod = abilityModifier(input.draft.constitutionScore)
    level1Hp = hitDieSides(def.hitDie) + conMod
    hpMax = level1Hp
    hpCurrent = level1Hp
  }

  const equipmentItemIds: string[] = []
  const equipmentAttackIds: string[] = []
  let equipmentCoinsGp = 0
  let inventory: InventoryState = {
    coins: { ...cleared.inventory.coins },
    items: [...cleared.inventory.items],
  }
  let nextWeapons: WeaponAttack[] = [...cleared.weapons]
  const equipmentPackageId =
    input.mode === 'start' ? input.picks.equipmentPackageId : null
  if (input.mode === 'start' && equipmentPackageId && equipmentPackageId !== 'skip') {
    const pack = equipmentPackagesFor(def).find((row) => row.id === equipmentPackageId)
    if (pack) {
      for (const spec of pack.items) {
        const created = createInventoryItem()
        created.name = spec.name
        created.qty = Math.max(1, Math.floor(spec.qty ?? 1))
        created.armor_kind = (spec.armor_kind ?? 'none') as ArmorKind
        created.base_ac = spec.base_ac ?? null
        created.weight_lb = spec.weight_lb ?? null
        created.notes = spec.notes ?? 'Стартовое снаряжение класса'
        if (created.armor_kind === 'none' && findWeaponPreset(created.name)) {
          created.weapon_grip = resolveWeaponGrip({ name: created.name })
        }
        created.spell_tooling = classifySpellTooling({ name: created.name })
        inventory.items.push(created)
        equipmentItemIds.push(created.id)

        // Auto-wear body armor / shield so AC updates immediately.
        // Weapons stay stowed — draw into hands is a separate toggle.
        if (
          created.armor_kind === 'light' ||
          created.armor_kind === 'medium' ||
          created.armor_kind === 'heavy' ||
          created.armor_kind === 'shield'
        ) {
          inventory = {
            ...inventory,
            items: equipInventoryItem(inventory.items, created.id, true),
          }
        }

        // Weapons → Attacks: light×N → N cards; stacks → one card + qty (no "×N" in name).
        const built = buildStartingWeaponAttacks({
          name: spec.name,
          qty: created.qty,
          makeId: (index, cardCount) =>
            classEquipmentAttackIdAt(input.classEntryId, created.id, index, cardCount),
          inventoryItemId: created.id,
          held: false,
        })
        nextWeapons.push(...built.attacks)
        equipmentAttackIds.push(...built.attackIds)
      }
      if (pack.coinsGp && pack.coinsGp > 0) {
        equipmentCoinsGp = pack.coinsGp
        inventory.coins.gp += pack.coinsGp
      }
    }
  }

  const nextGrant: AppliedClassGrant = {
    classEntryId: input.classEntryId,
    slug: def.slug,
    mode: input.mode,
    saves,
    skills,
    tools,
    armorKeys,
    weaponKeys,
    weaponExtras,
    level1Hp,
    equipmentPackageId,
    equipmentItemIds,
    equipmentAttackIds,
    equipmentCoinsGp,
  }

  const mergedGrants = [
    ...cleared.classGrants.filter((row) => row.classEntryId !== input.classEntryId),
    nextGrant,
  ]

  const nextSkills = { ...cleared.skills }
  for (const key of skills) {
    const current = nextSkills[key] ?? { is_proficient: false, is_expertise: false }
    nextSkills[key] = { ...current, is_proficient: true }
  }

  const nextSaves = { ...cleared.saves }
  for (const key of saves) {
    nextSaves[key] = true
  }

  const draft: ClassGrantDraftSlice = {
    ...cleared,
    classGrants: mergedGrants,
    identity: {
      ...cleared.identity,
      armor: {
        ...cleared.identity.armor,
        ...Object.fromEntries(armorKeys.map((key) => [key, true])),
      },
      weapons: {
        simple: cleared.identity.weapons.simple || weaponKeys.includes('simple'),
        martial: cleared.identity.weapons.martial || weaponKeys.includes('martial'),
        extras: uniqueStrings([
          ...(cleared.identity.weapons.extras ?? []),
          ...weaponExtras,
        ]),
      },
      tools: uniqueStrings([...cleared.identity.tools, ...tools]),
    },
    skills: nextSkills,
    saves: nextSaves,
    playHitDie: def.hitDie,
    hpMax,
    hpCurrent,
    inventory,
    weapons: nextWeapons,
  }

  return {
    draft,
    summary: formatClassGrantSummary({ def, mode: input.mode, picks: input.picks }),
  }
}

export function resolveGrantMode(input: {
  isNewMulticlassLevel: boolean
  classCountAfter: number
}): 'start' | 'multiclass' {
  if (input.isNewMulticlassLevel) return 'multiclass'
  if (input.classCountAfter <= 1) return 'start'
  return 'multiclass'
}

export function pendingGrantRequest(input: {
  classEntryId: string
  className: string
  mode: 'start' | 'multiclass'
  catalogSlug?: string | null
  catalogData?: Record<string, unknown> | null
}): { def: ClassGrantDef; mode: 'start' | 'multiclass'; needsPicks: boolean } | null {
  const def =
    resolveClassGrantDef({
      className: input.className,
      catalogSlug: input.catalogSlug,
      catalogData: input.catalogData,
    }) ??
    classGrantDefFromName(input.className) ??
    classGrantDef(input.className)
  if (!def) return null
  const pkg = packageForMode(def, input.mode)
  return {
    def,
    mode: input.mode,
    needsPicks: grantNeedsPicks(pkg),
  }
}

export function emptyPicks(): ClassGrantPicks {
  return { skills: [], tools: [], equipmentPackageId: null }
}

export function readAppliedClassGrants(raw: unknown): AppliedClassGrant[] {
  if (!Array.isArray(raw)) return []
  const result: AppliedClassGrant[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.classEntryId !== 'string' || typeof row.slug !== 'string') continue
    const mode = row.mode === 'multiclass' ? 'multiclass' : 'start'
    result.push({
      classEntryId: row.classEntryId,
      slug: row.slug,
      mode,
      saves: Array.isArray(row.saves)
        ? row.saves.filter((value): value is AbilityKey => typeof value === 'string')
        : [],
      skills: Array.isArray(row.skills)
        ? row.skills.filter((value): value is string => typeof value === 'string')
        : [],
      tools: Array.isArray(row.tools)
        ? row.tools.filter((value): value is string => typeof value === 'string')
        : [],
      armorKeys: Array.isArray(row.armorKeys)
        ? row.armorKeys.filter((value): value is ArmorProfKey => typeof value === 'string')
        : [],
      weaponKeys: Array.isArray(row.weaponKeys)
        ? row.weaponKeys.filter((value): value is WeaponProfKey => typeof value === 'string')
        : [],
      weaponExtras: Array.isArray(row.weaponExtras)
        ? row.weaponExtras.filter((value): value is string => typeof value === 'string')
        : [],
      level1Hp: typeof row.level1Hp === 'number' ? row.level1Hp : null,
      equipmentPackageId:
        typeof row.equipmentPackageId === 'string' ? row.equipmentPackageId : null,
      equipmentItemIds: Array.isArray(row.equipmentItemIds)
        ? row.equipmentItemIds.filter((value): value is string => typeof value === 'string')
        : [],
      equipmentAttackIds: Array.isArray(row.equipmentAttackIds)
        ? row.equipmentAttackIds.filter((value): value is string => typeof value === 'string')
        : [],
      equipmentCoinsGp:
        typeof row.equipmentCoinsGp === 'number' ? Math.max(0, row.equipmentCoinsGp) : 0,
    })
  }
  return result
}
