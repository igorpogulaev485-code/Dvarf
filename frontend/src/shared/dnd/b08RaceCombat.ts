/**
 * B-08: racial combat helpers — flight vs armor, resistances, save advantages,
 * Lucky (halfling) nat-1, Relentless Endurance, Stone's Endurance, etc.
 */

export type ArmorKind = 'light' | 'medium' | 'heavy' | string

/** MPMM/SCC/WBW/EEPC: racial flight unavailable in medium or heavy armor. */
export function racialFlyBlockedByArmor(
  armorKind: ArmorKind | null | undefined,
): boolean {
  return armorKind === 'medium' || armorKind === 'heavy'
}

export const RACIAL_FLY_BLOCKED_NOTE =
  'полёт недоступен в среднем/тяжёлом доспехе'

/**
 * Effective fly speed after armor gate.
 * Medium/heavy armor zeros **racial** permanent fly (aarakocra/fairy/owlin/EEPC).
 * Effect-sourced fly (зелье полёта, небесное откровение) still applies.
 */
export function resolveDisplayFlySpeed(input: {
  baseFly: number | null | undefined
  walkSpeed: number
  flyEqualWalk?: boolean
  flySpeedFt?: number | null
  armorKind?: ArmorKind | null
  /** When true, apply medium/heavy armor gate to racial base fly. */
  applyArmorGate?: boolean
}): { fly: number | null; note: string | null } {
  const blocked =
    Boolean(input.applyArmorGate) && racialFlyBlockedByArmor(input.armorKind)

  let fromEffects: number | null = null
  if (input.flyEqualWalk) fromEffects = input.walkSpeed
  else if (input.flySpeedFt != null) fromEffects = Math.floor(input.flySpeedFt)

  let fromRace: number | null =
    input.baseFly != null && input.baseFly > 0 ? input.baseFly : null
  let note: string | null = null
  if (blocked && fromRace != null) {
    fromRace = 0
    note = RACIAL_FLY_BLOCKED_NOTE
  }

  if (fromEffects != null && fromEffects > 0) {
    const fly = Math.max(fromRace ?? 0, fromEffects)
    return { fly, note: fly > 0 ? null : note }
  }
  if (fromRace != null) return { fly: fromRace, note }
  return { fly: null, note: null }
}

/** Races whose permanent fly is gated by medium/heavy armor. */
const ARMOR_GATED_FLY_SLUGS = new Set([
  'aarakocra',
  'aarakocra_eepc',
  'fairy',
  'owlin',
])

export function raceFlightUsesArmorGate(slug: string | null | undefined): boolean {
  if (!slug) return false
  return ARMOR_GATED_FLY_SLUGS.has(slug)
}

export type RaceSaveAdvantage = {
  labelRu: string
  /** Short note for the save dialog (player decides if applicable). */
  noteRu: string
  against?: string
  abilityKeys?: Array<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'>
}

const POISON_SAVE: RaceSaveAdvantage = {
  labelRu: 'Устойчивость',
  noteRu: 'Преимущество на спасброски от отравления (раса)',
  against: 'poisoned',
  abilityKeys: ['con'],
}

const FEAR_SAVE: RaceSaveAdvantage = {
  labelRu: 'Храбрый',
  noteRu: 'Преимущество на спасброски от испуга (раса)',
  against: 'frightened',
}

const CHARM_SAVE: RaceSaveAdvantage = {
  labelRu: 'Наследие фей',
  noteRu: 'Преимущество на спасброски от очарования (раса)',
  against: 'charmed',
}

const GNOME_CUNNING: RaceSaveAdvantage = {
  labelRu: 'Хитрость гномов',
  noteRu: 'Преимущество на спасброски Инт/Муд/Хар против магии (раса)',
  against: 'magic',
  abilityKeys: ['int', 'wis', 'cha'],
}

const MAGIC_RESIST: RaceSaveAdvantage = {
  labelRu: 'Магическая устойчивость',
  noteRu: 'Преимущество на спасброски против заклинаний (раса)',
  against: 'spells',
}

const MENTAL_DISC: RaceSaveAdvantage = {
  labelRu: 'Ментальная дисциплина',
  noteRu: 'Преимущество на спасброски от очарования и испуга (раса)',
  against: 'charmed_frightened',
}

const PSIONIC_FORT: RaceSaveAdvantage = {
  labelRu: 'Псионическая стойкость',
  noteRu: 'Преимущество на спасброски от очарования и ошеломления (раса)',
  against: 'charmed_stunned',
}

const DUAL_MIND: RaceSaveAdvantage = {
  labelRu: 'Двойной разум',
  noteRu: 'Преимущество на спасброски Мудрости (раса)',
  abilityKeys: ['wis'],
}

const VEDALKEN: RaceSaveAdvantage = {
  labelRu: 'Бесстрастие ведалкена',
  noteRu: 'Преимущество на спасброски Инт/Муд/Хар (раса)',
  abilityKeys: ['int', 'wis', 'cha'],
}

const DEATHLESS: RaceSaveAdvantage = {
  labelRu: 'Бессмертная природа',
  noteRu: 'Преимущество на спасброски от смерти (раса)',
  against: 'death',
}

const LEVIATHAN: RaceSaveAdvantage = {
  labelRu: 'Воля левиафана',
  noteRu: 'Преимущество на спасброски против очарования, испуга, паралича, отравления, оглушения и усыпления (раса)',
  against: 'conditions',
}

const KENDER: RaceSaveAdvantage = {
  labelRu: 'Бесстрашие',
  noteRu: 'Преимущество на спасброски от испуга (раса)',
  against: 'frightened',
}

/** Slug → save-advantage hints shown in the roll dialog (player toggles). */
export function raceSaveAdvantageSources(input: {
  slug?: string | null
  parentSlug?: string | null
}): RaceSaveAdvantage[] {
  const slug = (input.slug || '').trim()
  const parent = (input.parentSlug || '').trim()
  const keys = new Set([slug, parent].filter(Boolean))
  const out: RaceSaveAdvantage[] = []

  const has = (...ids: string[]) => ids.some((id) => keys.has(id))

  if (
    has(
      'dwarf',
      'hill_dwarf',
      'mountain_dwarf',
      'duergar',
      'shield_dwarf',
      'gold_dwarf',
      'stout_halfling',
      'warforged',
      'autognome',
      'yuan_ti',
    )
  ) {
    out.push(POISON_SAVE)
  }
  if (has('halfling', 'lightfoot_halfling', 'stout_halfling', 'ghostwise_halfling', 'lotusden_halfling')) {
    out.push(FEAR_SAVE)
  }
  if (
    has(
      'elf',
      'high_elf',
      'wood_elf',
      'drow',
      'eladrin',
      'sea_elf',
      'shadar_kai',
      'pale_elf',
      'half_elf',
    )
  ) {
    out.push(CHARM_SAVE)
  }
  if (has('gnome', 'forest_gnome', 'rock_gnome', 'deep_gnome')) {
    out.push(GNOME_CUNNING)
  }
  if (has('yuan_ti', 'satyr')) out.push(MAGIC_RESIST)
  if (has('githzerai')) out.push(MENTAL_DISC)
  if (has('duergar')) out.push(PSIONIC_FORT)
  if (has('kalashtar')) out.push(DUAL_MIND)
  if (has('vedalken')) out.push(VEDALKEN)
  if (has('reborn')) out.push(DEATHLESS)
  if (has('locathah')) out.push(LEVIATHAN)
  if (has('kender')) out.push(KENDER)

  return out
}

export function formatRaceSaveAdvantageNote(rows: RaceSaveAdvantage[]): string {
  return rows.map((row) => row.noteRu).join(' · ')
}

/** Halfling Lucky: offer reroll when natural 1 on attack/check/save. */
export function isHalflingLuckyRace(slug: string | null | undefined): boolean {
  if (!slug) return false
  return (
    slug === 'halfling' ||
    slug.startsWith('halfling_') ||
    slug.endsWith('_halfling') ||
    slug.includes('halfling')
  )
}

/** Relentless Endurance: half-orc / MPMM orc. */
export function hasRelentlessEndurance(slug: string | null | undefined): boolean {
  if (!slug) return false
  return slug === 'half_orc' || slug === 'orc' || slug.startsWith('half_orc')
}

/** Stone's Endurance reduction: 1d12 + Con mod. */
export function stonesEnduranceReduction(
  conMod: number,
  rng: () => number = Math.random,
): number {
  const die = 1 + Math.floor(rng() * 12)
  return die + Math.floor(conMod)
}

/** Hadozee Dodge: 1d6 + character level. */
export function hadozeeDodgeReduction(
  level: number,
  rng: () => number = Math.random,
): number {
  const die = 1 + Math.floor(rng() * 6)
  return die + Math.max(1, Math.floor(level))
}

/** Shifting temp HP (MPMM): 2 × proficiency bonus. */
export function shifterTempHp(proficiencyBonus: number): number {
  return 2 * Math.max(1, Math.floor(proficiencyBonus))
}

/** Hungry Jaws temp HP = proficiency bonus. */
export function hungryJawsTempHp(proficiencyBonus: number): number {
  return Math.max(1, Math.floor(proficiencyBonus))
}

/** Healing Hands (MPMM): PB d4 — average or rolled sum left to UI; here dice count. */
export function healingHandsDiceCount(proficiencyBonus: number): number {
  return Math.max(1, Math.floor(proficiencyBonus))
}

/**
 * Dragonborn ancestry resistance from grant ancestryId + catalog choices,
 * or empty if already listed in damageResistances.
 */
export function dragonbornAncestryResistance(input: {
  slug?: string | null
  ancestryDamage?: string | null
  existing?: string[] | null
}): string[] {
  const listed = (input.existing ?? []).map((x) => x.trim()).filter(Boolean)
  if (listed.length) return listed
  const dmg = (input.ancestryDamage || '').trim()
  if (!dmg) return []
  const slug = input.slug || ''
  if (
    slug === 'dragonborn' ||
    slug.startsWith('dragonborn_') ||
    slug.includes('draconblood') ||
    slug.includes('ravenite')
  ) {
    return [dmg]
  }
  return []
}
