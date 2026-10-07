/** Feat catalog → picks → ledger (mirrors race/class grants). */

import type { NaturalArmor } from './armor'

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type ArmorProfKey = 'light' | 'medium' | 'heavy' | 'shields'

export type FeatChoiceDef =
  | {
      id: string
      type: 'ability_one'
      amount: number
      from: AbilityKey[]
      label_ru: string
    }
  | {
      id: string
      type: 'enum'
      label_ru: string
      options: Array<{ id: string; label_ru: string }>
    }
  | {
      id: string
      type: 'languages'
      count: number
      label_ru: string
    }
  | {
      id: string
      type: 'skill_or_tool'
      count: number
      label_ru: string
    }
  | {
      id: string
      type: 'weapons'
      count: number
      label_ru: string
    }
  | {
      id: string
      type: 'note'
      label_ru: string
      text_ru: string
    }

export type FeatResourceGrant = {
  pool_id: string
  pool_name_ru: string
  uses: number
  recovery: 'short_rest' | 'long_rest'
}

export type FeatGrantsPackage = {
  abilityBonuses: Partial<Record<AbilityKey, number>>
  armorProficiencies: ArmorProfKey[]
  weaponNames: string[]
  skills: string[]
  tools: string[]
  languages: string[]
  savingThrows: AbilityKey[]
  initiativeBonus: number
  speedBonus: number
  passiveBonus: number
  hpPerLevel: number
  acBonusDualWield: number
  flags: string[]
  resource: FeatResourceGrant | null
  unarmedDamage: string | null
  naturalArmor: NaturalArmor | null
  benefitsRu: string
  summaryRu: string
  enumPicks: Record<string, string>
}

export type FeatGrantDef = {
  slug: string
  labelRu: string
  prerequisitesRu: string | null
  prerequisites: {
    abilities?: Partial<Record<AbilityKey, number>>
    abilitiesOneOf?: Array<Partial<Record<AbilityKey, number>>>
    armor?: ArmorProfKey[]
    flagsAny?: string[]
    /** Match race slug or parent slug (elf covers wood_elf via parent). */
    racesAny?: string[]
    /** OR-group with racesAny: character size (e.g. Squat Nimbleness). */
    sizeAny?: string[]
  }
  choices: FeatChoiceDef[]
  fixedGrants: FeatGrantsPackage
}

export type FeatGrantPicks = {
  abilityKeys: Partial<Record<string, AbilityKey>>
  enumIds: Partial<Record<string, string>>
  languages: string[]
  skills: string[]
  tools: string[]
  weapons: string[]
}

export type FeatGrantSource =
  | {
      kind: 'asi'
      classEntryId: string
      featureId: string
      atClassLevel: number
    }
  | {
      kind: 'race'
      raceCatalogId: string
      raceSlug: string
    }
  | { kind: 'manual' }

export type AppliedFeatGrant = {
  id: string
  featCatalogId: string
  slug: string
  nameRu: string
  source: FeatGrantSource
  applied: FeatGrantsPackage
  picks: FeatGrantPicks
}

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ARMOR_KEYS: ArmorProfKey[] = ['light', 'medium', 'heavy', 'shields']

const COMMON_LANGUAGES = [
  'Общий',
  'Дварфийский',
  'Эльфийский',
  'Великаний',
  'Гномий',
  'Гоблинский',
  'Полуросличий',
  'Орочий',
  'Подземный',
  'Небесный',
  'Драконий',
  'Бездны',
  'Инфернальный',
  'Первичный',
  'Сильван',
]

export function commonLanguageOptions(): string[] {
  return [...COMMON_LANGUAGES]
}

export function emptyFeatPicks(): FeatGrantPicks {
  return {
    abilityKeys: {},
    enumIds: {},
    languages: [],
    skills: [],
    tools: [],
    weapons: [],
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
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

function parseAbilityMap(raw: unknown): Partial<Record<AbilityKey, number>> {
  const obj = asRecord(raw)
  const out: Partial<Record<AbilityKey, number>> = {}
  for (const key of ABILITY_KEYS) {
    const value = obj[key]
    if (typeof value === 'number' && Number.isFinite(value) && value !== 0) {
      out[key] = Math.floor(value)
    }
  }
  return out
}

function parseArmorList(raw: unknown): ArmorProfKey[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is ArmorProfKey =>
    ARMOR_KEYS.includes(item as ArmorProfKey),
  )
}

function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return uniqueStrings(raw.filter((item): item is string => typeof item === 'string'))
}

function parseChoices(raw: unknown): FeatChoiceDef[] {
  if (!Array.isArray(raw)) return []
  const out: FeatChoiceDef[] = []
  for (const item of raw) {
    const row = asRecord(item)
    const id = readString(row.id)
    const type = readString(row.type)
    const label = readString(row.label_ru) ?? readString(row.labelRu) ?? id
    if (!id || !type || !label) continue
    if (type === 'ability_one') {
      const from = Array.isArray(row.from)
        ? row.from.filter((key): key is AbilityKey =>
            ABILITY_KEYS.includes(key as AbilityKey),
          )
        : [...ABILITY_KEYS]
      out.push({
        id,
        type: 'ability_one',
        amount: Math.max(0, Math.floor(readNumber(row.amount, 1))),
        from,
        label_ru: label,
      })
      continue
    }
    if (type === 'enum') {
      const options = Array.isArray(row.options)
        ? row.options
            .map((opt) => {
              const o = asRecord(opt)
              const optId = readString(o.id)
              const optLabel = readString(o.label_ru) ?? readString(o.labelRu)
              if (!optId || !optLabel) return null
              return { id: optId, label_ru: optLabel }
            })
            .filter((opt): opt is { id: string; label_ru: string } => opt != null)
        : []
      out.push({ id, type: 'enum', label_ru: label, options })
      continue
    }
    if (type === 'languages') {
      out.push({
        id,
        type: 'languages',
        count: Math.max(1, Math.floor(readNumber(row.count, 1))),
        label_ru: label,
      })
      continue
    }
    if (type === 'skill_or_tool') {
      out.push({
        id,
        type: 'skill_or_tool',
        count: Math.max(1, Math.floor(readNumber(row.count, 1))),
        label_ru: label,
      })
      continue
    }
    if (type === 'weapons') {
      out.push({
        id,
        type: 'weapons',
        count: Math.max(1, Math.floor(readNumber(row.count, 1))),
        label_ru: label,
      })
      continue
    }
    if (type === 'note') {
      out.push({
        id,
        type: 'note',
        label_ru: label,
        text_ru: readString(row.text_ru) ?? readString(row.textRu) ?? '',
      })
    }
  }
  return out
}

function emptyPackage(partial?: Partial<FeatGrantsPackage>): FeatGrantsPackage {
  return {
    abilityBonuses: {},
    armorProficiencies: [],
    weaponNames: [],
    skills: [],
    tools: [],
    languages: [],
    savingThrows: [],
    initiativeBonus: 0,
    speedBonus: 0,
    passiveBonus: 0,
    hpPerLevel: 0,
    acBonusDualWield: 0,
    flags: [],
    resource: null,
    unarmedDamage: null,
    naturalArmor: null,
    benefitsRu: '',
    summaryRu: '',
    enumPicks: {},
    ...partial,
  }
}

function parseNaturalArmor(raw: unknown): NaturalArmor | null {
  const obj = asRecord(raw)
  const base = readNumber(obj.base, 0)
  if (!base) return null
  const modRaw = obj.mod
  const mod =
    modRaw === 'str' ||
    modRaw === 'dex' ||
    modRaw === 'con' ||
    modRaw === 'int' ||
    modRaw === 'wis' ||
    modRaw === 'cha'
      ? modRaw
      : null
  return {
    base: Math.floor(base),
    mod,
    modCap:
      typeof obj.modCap === 'number'
        ? obj.modCap
        : typeof obj.mod_cap === 'number'
          ? obj.mod_cap
          : null,
    allowsShield: obj.allowsShield !== false && obj.allows_shield !== false,
    armoredBonus:
      typeof obj.armoredBonus === 'number'
        ? obj.armoredBonus
        : typeof obj.armored_bonus === 'number'
          ? obj.armored_bonus
          : undefined,
    labelRu:
      readString(obj.label_ru) ?? readString(obj.labelRu) ?? 'Природный доспех',
  }
}

function parseResource(raw: unknown): FeatResourceGrant | null {
  const obj = asRecord(raw)
  const poolId = readString(obj.pool_id) ?? readString(obj.poolId)
  const name = readString(obj.pool_name_ru) ?? readString(obj.poolNameRu)
  if (!poolId || !name) return null
  const recovery =
    obj.recovery === 'short_rest' || obj.recovery === 'long_rest'
      ? obj.recovery
      : 'long_rest'
  return {
    pool_id: poolId,
    pool_name_ru: name,
    uses: Math.max(1, Math.floor(readNumber(obj.uses, 1))),
    recovery,
  }
}

export function featGrantDefFromCatalog(input: {
  slug: string
  nameRu: string
  data: Record<string, unknown> | null | undefined
}): FeatGrantDef | null {
  const data = asRecord(input.data)
  const grants = asRecord(data.grants)
  const prereq = asRecord(data.prerequisites)
  const abilitiesOneOf = Array.isArray(prereq.abilities_one_of)
    ? prereq.abilities_one_of.map((row) => parseAbilityMap(row))
    : Array.isArray(prereq.abilitiesOneOf)
      ? prereq.abilitiesOneOf.map((row) => parseAbilityMap(row))
      : undefined
  const flagsAny = parseStringList(prereq.flags_any ?? prereq.flagsAny)
  const racesAny = parseStringList(prereq.races_any ?? prereq.racesAny)
  const sizeAny = parseStringList(prereq.size_any ?? prereq.sizeAny).map((item) =>
    item.toLowerCase(),
  )

  return {
    slug: input.slug,
    labelRu: input.nameRu,
    prerequisitesRu: readString(data.prerequisites_ru) ?? readString(data.prerequisitesRu),
    prerequisites: {
      abilities: parseAbilityMap(prereq.abilities),
      abilitiesOneOf,
      armor: parseArmorList(prereq.armor),
      flagsAny: flagsAny.length ? flagsAny : undefined,
      racesAny: racesAny.length ? racesAny : undefined,
      sizeAny: sizeAny.length ? sizeAny : undefined,
    },
    choices: parseChoices(data.choices),
    fixedGrants: emptyPackage({
      abilityBonuses: parseAbilityMap(grants.ability_bonuses ?? grants.abilityBonuses),
      armorProficiencies: parseArmorList(
        grants.armor_proficiencies ?? grants.armorProficiencies,
      ),
      weaponNames: parseStringList(
        grants.weapon_proficiencies ?? grants.weaponProficiencies,
      ),
      skills: parseStringList(grants.skills ?? grants.skill_proficiencies),
      tools: parseStringList(grants.tools ?? grants.tool_proficiencies),
      languages: parseStringList(grants.languages),
      initiativeBonus: readNumber(
        grants.initiative_bonus ?? grants.initiativeBonus,
        0,
      ),
      speedBonus: readNumber(grants.speed_bonus ?? grants.speedBonus, 0),
      passiveBonus: readNumber(grants.passive_bonus ?? grants.passiveBonus, 0),
      hpPerLevel: readNumber(grants.hp_per_level ?? grants.hpPerLevel, 0),
      acBonusDualWield: readNumber(
        grants.ac_bonus_dual_wield ?? grants.acBonusDualWield,
        0,
      ),
      flags: parseStringList(grants.flags),
      resource: parseResource(grants.resource),
      unarmedDamage:
        readString(grants.unarmed_damage) ?? readString(grants.unarmedDamage),
      naturalArmor: parseNaturalArmor(
        grants.natural_armor ?? grants.naturalArmor,
      ),
      benefitsRu: readString(data.benefits_ru) ?? readString(data.benefitsRu) ?? '',
      summaryRu: readString(data.summary_ru) ?? readString(data.summaryRu) ?? '',
    }),
  }
}

export function validateFeatGrantPicks(input: {
  def: FeatGrantDef
  picks: FeatGrantPicks
  abilities: Record<AbilityKey, number>
  armor: Partial<Record<ArmorProfKey, boolean>>
  hasSpellcasting: boolean
  /** Martial weapon proficiency (Fighting Initiate). */
  hasMartialWeapons?: boolean
  raceSlug?: string | null
  raceParentSlug?: string | null
  size?: string | null
}): string | null {
  const { def, picks, abilities, armor, hasSpellcasting } = input
  const need = def.prerequisites

  for (const [key, min] of Object.entries(need.abilities ?? {}) as Array<
    [AbilityKey, number]
  >) {
    if ((abilities[key] ?? 10) < min) {
      return `Требуется ${key.toUpperCase()} ${min}+`
    }
  }
  if (need.abilitiesOneOf?.length) {
    const ok = need.abilitiesOneOf.some((row) =>
      Object.entries(row).every(
        ([key, min]) => (abilities[key as AbilityKey] ?? 10) >= (min ?? 0),
      ),
    )
    if (!ok) return 'Не выполнены требования к характеристикам'
  }
  for (const key of need.armor ?? []) {
    if (!armor[key]) return `Требуется владение: ${key}`
  }
  if (need.flagsAny?.includes('spellcasting') && !hasSpellcasting) {
    return 'Нужно уметь накладывать хотя бы одно заклинание'
  }
  if (need.flagsAny?.includes('martial_weapon_prof') && !input.hasMartialWeapons) {
    return 'Требуется владение воинским оружием'
  }
  if (need.racesAny?.length || need.sizeAny?.length) {
    const raceOk = matchRacePrerequisite({
      allowed: need.racesAny ?? [],
      raceSlug: input.raceSlug,
      raceParentSlug: input.raceParentSlug,
    })
    const sizeOk =
      Boolean(need.sizeAny?.length) &&
      Boolean(input.size) &&
      need.sizeAny!.includes(String(input.size).toLowerCase())
    // racesAny OR sizeAny (Squat Nimbleness); if only racesAny — require race
    if (need.racesAny?.length && need.sizeAny?.length) {
      if (!raceOk && !sizeOk) {
        return def.prerequisitesRu
          ? `Требования: ${def.prerequisitesRu}`
          : 'Раса или размер не подходят'
      }
    } else if (need.racesAny?.length && !raceOk) {
      return def.prerequisitesRu
        ? `Требования: ${def.prerequisitesRu}`
        : 'Раса не подходит для этой черты'
    } else if (need.sizeAny?.length && !sizeOk) {
      return 'Размер не подходит для этой черты'
    }
  }

  for (const choice of def.choices) {
    if (choice.type === 'note') continue
    if (choice.type === 'ability_one') {
      const key = picks.abilityKeys[choice.id]
      if (!key || !choice.from.includes(key)) {
        return `Выбери: ${choice.label_ru}`
      }
      continue
    }
    if (choice.type === 'enum') {
      const id = picks.enumIds[choice.id]
      if (!id || !choice.options.some((opt) => opt.id === id)) {
        return `Выбери: ${choice.label_ru}`
      }
      continue
    }
    if (choice.type === 'languages') {
      if (picks.languages.length !== choice.count) {
        return `Выбери ${choice.count} языка`
      }
      continue
    }
    if (choice.type === 'skill_or_tool') {
      if (picks.skills.length + picks.tools.length !== choice.count) {
        return `Выбери ${choice.count} навыка/инструмента`
      }
      continue
    }
    if (choice.type === 'weapons') {
      if (picks.weapons.length !== choice.count) {
        return `Выбери ${choice.count} вида оружия`
      }
    }
  }
  return null
}

export function matchRacePrerequisite(input: {
  allowed: string[]
  raceSlug?: string | null
  raceParentSlug?: string | null
}): boolean {
  if (!input.allowed.length) return true
  const candidates = [input.raceSlug, input.raceParentSlug]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.trim().toLowerCase())
  if (!candidates.length) return false
  const allowed = new Set(input.allowed.map((item) => item.toLowerCase()))
  for (const slug of candidates) {
    if (allowed.has(slug)) return true
  }
  // Parent/child: allowed "elf" matches wood_elf / high_elf; allowed "dragonborn"
  // matches dragonborn_chromatic. Exact child requirement (high_elf) does not
  // match via bare parent "elf" unless parent is also listed.
  for (const slug of candidates) {
    for (const allow of allowed) {
      if (slug.startsWith(`${allow}_`)) return true
      if (slug.endsWith(`_${allow}`) && allow !== 'elf') return true
    }
  }
  return false
}

export function buildAppliedFeatPackage(input: {
  def: FeatGrantDef
  picks: FeatGrantPicks
}): FeatGrantsPackage {
  const { def, picks } = input
  const abilityBonuses: Partial<Record<AbilityKey, number>> = {
    ...def.fixedGrants.abilityBonuses,
  }
  const savingThrows: AbilityKey[] = [...def.fixedGrants.savingThrows]
  const enumPicks: Record<string, string> = {}
  const skillsFromEnum: string[] = []

  for (const choice of def.choices) {
    if (choice.type === 'ability_one') {
      const key = picks.abilityKeys[choice.id]
      if (!key || !choice.amount) continue
      abilityBonuses[key] = (abilityBonuses[key] ?? 0) + choice.amount
      if (def.slug === 'resilient') {
        if (!savingThrows.includes(key)) savingThrows.push(key)
      }
      continue
    }
    if (choice.type === 'enum') {
      const id = picks.enumIds[choice.id]
      if (id) {
        enumPicks[choice.id] = id
        if (choice.id === 'skill' || choice.id === 'skills') {
          skillsFromEnum.push(id)
        }
      }
    }
  }

  if (def.slug === 'resilient') {
    const key = picks.abilityKeys.ability
    if (key && !savingThrows.includes(key)) savingThrows.push(key)
  }

  return emptyPackage({
    ...def.fixedGrants,
    abilityBonuses,
    savingThrows,
    skills: uniqueStrings([
      ...def.fixedGrants.skills,
      ...picks.skills,
      ...skillsFromEnum,
    ]),
    tools: uniqueStrings([...def.fixedGrants.tools, ...picks.tools]),
    languages: uniqueStrings([...def.fixedGrants.languages, ...picks.languages]),
    weaponNames: uniqueStrings([...def.fixedGrants.weaponNames, ...picks.weapons]),
    enumPicks,
  })
}

/** Fighting style id from Fighting Initiate feat grant, if any. */
export function fightingStyleFromFeatGrants(
  ledger: AppliedFeatGrant[],
): string | null {
  for (const row of ledger) {
    if (row.slug !== 'fighting_initiate') continue
    const style = row.applied.enumPicks.style ?? row.picks.enumIds.style
    if (typeof style === 'string' && style.trim()) return style
  }
  return null
}

/** Best natural armor granted by feats (e.g. Dragon Hide). */
export function naturalArmorFromFeatGrants(
  ledger: AppliedFeatGrant[],
): NaturalArmor | null {
  let best: NaturalArmor | null = null
  for (const row of ledger) {
    const armor = row.applied.naturalArmor
    if (!armor) continue
    if (!best || armor.base > best.base) best = armor
  }
  return best
}

export function newFeatGrantId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `feat-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function readFeatGrantLedger(raw: unknown): AppliedFeatGrant[] {
  if (!Array.isArray(raw)) return []
  const out: AppliedFeatGrant[] = []
  for (const item of raw) {
    const row = asRecord(item)
    const id = readString(row.id)
    const featCatalogId = readString(row.featCatalogId) ?? readString(row.feat_catalog_id)
    const slug = readString(row.slug)
    const nameRu = readString(row.nameRu) ?? readString(row.name_ru)
    if (!id || !featCatalogId || !slug || !nameRu) continue
    const sourceRaw = asRecord(row.source)
    let source: FeatGrantSource
    if (sourceRaw.kind === 'asi') {
      const classEntryId = readString(sourceRaw.classEntryId)
      const featureId = readString(sourceRaw.featureId)
      if (!classEntryId || !featureId) continue
      source = {
        kind: 'asi',
        classEntryId,
        featureId,
        atClassLevel: Math.max(1, Math.floor(readNumber(sourceRaw.atClassLevel, 1))),
      }
    } else if (sourceRaw.kind === 'race') {
      const raceCatalogId = readString(sourceRaw.raceCatalogId)
      const raceSlug = readString(sourceRaw.raceSlug) ?? 'race'
      if (!raceCatalogId) continue
      source = { kind: 'race', raceCatalogId, raceSlug }
    } else {
      source = { kind: 'manual' }
    }
    const appliedRaw = asRecord(row.applied)
    const picksRaw = asRecord(row.picks)
    const applied = emptyPackage({
      abilityBonuses: parseAbilityMap(appliedRaw.abilityBonuses ?? appliedRaw.ability_bonuses),
      armorProficiencies: parseArmorList(
        appliedRaw.armorProficiencies ?? appliedRaw.armor_proficiencies,
      ),
      weaponNames: parseStringList(appliedRaw.weaponNames ?? appliedRaw.weapon_names),
      skills: parseStringList(appliedRaw.skills),
      tools: parseStringList(appliedRaw.tools),
      languages: parseStringList(appliedRaw.languages),
      savingThrows: Array.isArray(appliedRaw.savingThrows)
        ? appliedRaw.savingThrows.filter((key): key is AbilityKey =>
            ABILITY_KEYS.includes(key as AbilityKey),
          )
        : [],
      initiativeBonus: readNumber(
        appliedRaw.initiativeBonus ?? appliedRaw.initiative_bonus,
        0,
      ),
      speedBonus: readNumber(appliedRaw.speedBonus ?? appliedRaw.speed_bonus, 0),
      passiveBonus: readNumber(appliedRaw.passiveBonus ?? appliedRaw.passive_bonus, 0),
      hpPerLevel: readNumber(appliedRaw.hpPerLevel ?? appliedRaw.hp_per_level, 0),
      acBonusDualWield: readNumber(
        appliedRaw.acBonusDualWield ?? appliedRaw.ac_bonus_dual_wield,
        0,
      ),
      flags: parseStringList(appliedRaw.flags),
      resource: parseResource(appliedRaw.resource),
      unarmedDamage:
        readString(appliedRaw.unarmedDamage) ?? readString(appliedRaw.unarmed_damage),
      naturalArmor: parseNaturalArmor(
        appliedRaw.naturalArmor ?? appliedRaw.natural_armor,
      ),
      benefitsRu: readString(appliedRaw.benefitsRu) ?? readString(appliedRaw.benefits_ru) ?? '',
      summaryRu: readString(appliedRaw.summaryRu) ?? readString(appliedRaw.summary_ru) ?? '',
      enumPicks: Object.fromEntries(
        Object.entries(asRecord(appliedRaw.enumPicks ?? appliedRaw.enum_picks)).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      ),
    })
    const abilityKeys: Partial<Record<string, AbilityKey>> = {}
    for (const [key, value] of Object.entries(asRecord(picksRaw.abilityKeys))) {
      if (ABILITY_KEYS.includes(value as AbilityKey)) {
        abilityKeys[key] = value as AbilityKey
      }
    }
    out.push({
      id,
      featCatalogId,
      slug,
      nameRu,
      source,
      applied,
      picks: {
        abilityKeys,
        enumIds: Object.fromEntries(
          Object.entries(asRecord(picksRaw.enumIds)).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        ),
        languages: parseStringList(picksRaw.languages),
        skills: parseStringList(picksRaw.skills),
        tools: parseStringList(picksRaw.tools),
        weapons: parseStringList(picksRaw.weapons),
      },
    })
  }
  return out
}

export function sumFeatInitiativeBonus(ledger: AppliedFeatGrant[]): number {
  return ledger.reduce((sum, row) => sum + (row.applied.initiativeBonus || 0), 0)
}

export function sumFeatSpeedBonus(ledger: AppliedFeatGrant[]): number {
  return ledger.reduce((sum, row) => sum + (row.applied.speedBonus || 0), 0)
}

export function sumFeatPassiveBonus(ledger: AppliedFeatGrant[]): number {
  return ledger.reduce((sum, row) => sum + (row.applied.passiveBonus || 0), 0)
}

export function sumFeatHpPerLevel(ledger: AppliedFeatGrant[]): number {
  return ledger.reduce((sum, row) => sum + (row.applied.hpPerLevel || 0), 0)
}

export function featTraitsSnippet(ledger: AppliedFeatGrant[]): string {
  if (!ledger.length) return ''
  return ledger
    .map((row) => {
      const body = row.applied.summaryRu || row.applied.benefitsRu
      return body ? `Черта «${row.nameRu}»: ${body}` : `Черта «${row.nameRu}»`
    })
    .join('\n\n')
}

export function raceRequiresFeatPick(def: {
  featNoteRu?: string | null
  slug?: string
}): boolean {
  if (def.slug === 'custom_lineage') return true
  return Boolean(def.featNoteRu && def.featNoteRu.trim())
}
