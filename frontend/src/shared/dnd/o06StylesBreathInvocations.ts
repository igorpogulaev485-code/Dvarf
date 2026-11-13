/**
 * O-06: PHB fighting styles (GWF / TWF / Protection), dragonborn breath (PHB+FTD),
 * warlock combat invocations (agonizing / repelling / devil's sight).
 * Names stay as in sheet catalogs (5e14).
 */

import { findWeaponPreset } from './weaponPresets'
import { isRangedWeaponAttackName } from './fightingStyles'
import {
  canSpendFeature,
  type TurnEconomyState,
  type TurnSpendResult,
} from './turnEconomy'
import { featureResourceId, type DesiredFeatureResource } from './featureResources'

const FTD_SOURCE_RE = /\bftd\b|fizban|fizban'?s|treasury\s*of\s*dragons/i

/** Local melee check — shared/dnd must not import features/. */
function isMeleeWeaponName(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  if (/безоруж|unarmed/i.test(trimmed)) return false
  if (isRangedWeaponAttackName(trimmed)) return false
  if (/метательн|бросок|метнуть/i.test(trimmed)) return false
  return true
}

export function hasFightingStyle(
  styleIds: Array<string | null | undefined> | null | undefined,
  id: string,
): boolean {
  return (styleIds ?? []).some((s) => s === id)
}

/** GWF: two-handed melee, or versatile held in two hands. */
export function weaponQualifiesForGreatWeaponFighting(input: {
  weaponName: string
  /** Damage expression on the attack row (versatile may already use 1к10). */
  damageExpr?: string | null
  /** Explicit two-hand grip / versatile two-hand toggle. */
  twoHanded?: boolean | null
}): boolean {
  const name = input.weaponName.trim()
  if (!name || !isMeleeWeaponName(name)) return false
  const preset = findWeaponPreset(name)
  if (preset?.ranged) return false
  if (preset?.twoHanded) return true
  if (input.twoHanded === true) {
    return Boolean(preset?.versatileDamage) || /универсал|versatile/i.test(name)
  }
  if (preset?.versatileDamage && input.damageExpr) {
    const vers = preset.versatileDamage.replace(/к/gi, 'd').toLowerCase()
    const expr = input.damageExpr.replace(/к/gi, 'd').toLowerCase()
    if (expr.includes(vers.replace(/\s/g, ''))) return true
  }
  // Fallback: name looks two-handed.
  if (/двуручн|greatsword|greataxe|maul|алебар|глеф|пик[аи]|палиц/i.test(name)) {
    return true
  }
  return false
}

/**
 * PHB Great Weapon Fighting: reroll 1 or 2 on **weapon** damage dice only;
 * new face is mandatory. Does not touch smite / hunters mark / other extras.
 */
export function applyGreatWeaponFightingReroll(input: {
  parts: number[]
  sides: number
  rng?: () => number
}): { parts: number[]; notes: string[]; changed: boolean } {
  const rng = input.rng ?? Math.random
  const sides = Math.max(2, Math.floor(input.sides))
  const notes: string[] = []
  const parts = input.parts.map((face) => {
    if (face !== 1 && face !== 2) return face
    const next = 1 + Math.floor(rng() * sides)
    notes.push(`переброс стиля ${face}→${next}`)
    return next
  })
  return { parts, notes, changed: notes.length > 0 }
}

export function weaponIsLightMelee(name: string): boolean {
  if (!isMeleeWeaponName(name)) return false
  const preset = findWeaponPreset(name)
  if (preset?.light === true) return true
  if (preset?.light === false) return false
  return /коротк(ий|ого)\s*меч|кинжал|scimitar|ятаган|дубинк|ручн(ой|ого)\s*топор|лёгк(ий|ого)\s*молот|легк(ий|ого)\s*молот|серп|dagger|shortsword|handaxe|club|sickle|light\s*hammer/i.test(
    name.trim(),
  )
}

/** One-handed melee (not two-handed property). Dual Wielder allows these for TWF. */
export function weaponIsOneHandedMelee(name: string): boolean {
  if (!isMeleeWeaponName(name)) return false
  const preset = findWeaponPreset(name)
  if (preset?.twoHanded) return false
  if (preset?.ranged) return false
  return true
}

export type HeldMeleeWeapon = {
  name: string
  light: boolean
  oneHanded: boolean
}

export function listHeldMeleeWeapons(
  items: Array<{
    equipped?: boolean
    armor_kind?: string | null
    name?: string
    qty?: number | null
    wear_slot?: string | null
    weapon_grip?: string | null
  }> | null | undefined,
): HeldMeleeWeapon[] {
  const out: HeldMeleeWeapon[] = []
  for (const item of items ?? []) {
    if (!item.equipped) continue
    if (item.armor_kind === 'shield') continue
    const name = String(item.name || '').trim()
    if (!name || !isMeleeWeaponName(name)) continue
    if (item.weapon_grip === 'two_hand') continue
    const preset = findWeaponPreset(name)
    if (preset?.twoHanded) continue
    const qty = Math.max(1, Math.floor(Number(item.qty ?? 1)))
    const copies = qty >= 2 ? 2 : 1
    for (let i = 0; i < copies; i += 1) {
      out.push({
        name,
        light: weaponIsLightMelee(name),
        oneHanded: weaponIsOneHandedMelee(name),
      })
    }
  }
  return out
}

/** Can take the off-hand bonus attack (PHB TWF), with or without the style. */
export function canTwoWeaponBonusAttack(
  state: TurnEconomyState,
  input: {
    hasDualWielder: boolean
    heldMelee: HeldMeleeWeapon[]
  },
): TurnSpendResult {
  if (!state.attackActionThisTurn && state.actionSpentAs !== 'attack') {
    return { ok: false, reason: 'Нужно действие «Атака» в этот ход', mark: 'bonus' }
  }
  if (state.twoWeaponBonusUsed) {
    return { ok: false, reason: 'Бонусная атака вторым оружием уже использована', mark: 'bonus' }
  }
  if (!state.twoWeaponBonusReady) {
    return {
      ok: false,
      reason: input.hasDualWielder
        ? 'Нужна рукопашная атака одноручным оружием в этот ход'
        : 'Нужна рукопашная атака лёгким оружием в этот ход',
      mark: 'bonus',
    }
  }
  const qualifying = input.heldMelee.filter((w) =>
    input.hasDualWielder ? w.oneHanded : w.light,
  )
  if (qualifying.length < 2) {
    return {
      ok: false,
      reason: input.hasDualWielder
        ? 'Нужны два одноручных рукопашных оружия в руках'
        : 'Нужны два лёгких рукопашных оружия в руках',
      mark: 'bonus',
    }
  }
  return canSpendFeature(state, 'bonus')
}

/**
 * Off-hand bonus damage ability mod (PHB):
 * without style — only if negative; with Two-Weapon Fighting style — always.
 */
export function twoWeaponBonusDamageAbilityMod(input: {
  abilityMod: number
  hasTwoWeaponFightingStyle: boolean
}): number {
  if (input.hasTwoWeaponFightingStyle) return Math.trunc(input.abilityMod)
  return input.abilityMod < 0 ? Math.trunc(input.abilityMod) : 0
}

export function markTwoWeaponBonusReady(state: TurnEconomyState): TurnEconomyState {
  return { ...state, twoWeaponBonusReady: true }
}

export function markTwoWeaponBonusUsed(state: TurnEconomyState): TurnEconomyState {
  return { ...state, twoWeaponBonusUsed: true, bonus: true }
}

export function canProtectionReaction(
  state: TurnEconomyState,
  input: { hasProtectionStyle: boolean; shieldInHand: boolean },
): TurnSpendResult {
  if (!input.hasProtectionStyle) {
    return { ok: false, reason: 'Нет стиля «Защита»', mark: 'reaction' }
  }
  if (!input.shieldInHand) {
    return { ok: false, reason: 'Нужен щит в руке', mark: 'reaction' }
  }
  return canSpendFeature(state, 'reaction')
}

export const PROTECTION_REACTION_HINT =
  'Защита: реакция · щит · помеха на атаку по союзнику в 5 фт (ты видишь атакующего)'

export const TWO_WEAPON_BONUS_HINT =
  'Атака вторым оружием: бонусное · рукопашная атака оружием во второй руке'

// —— Dragonborn breath ——

export type DragonbornBreathKind = 'phb' | 'ftd'

export type DragonbornAncestryBreath = {
  id: string
  labelRu: string
  damage: string
  /** line | cone */
  shape: 'line' | 'cone'
  /** Save ability for breath. */
  save: 'dex' | 'con'
  shapeRu: string
}

const PHB_ANCESTRY: Record<string, DragonbornAncestryBreath> = {
  black: {
    id: 'black',
    labelRu: 'Чёрный',
    damage: 'кислота',
    shape: 'line',
    save: 'dex',
    shapeRu: '5×30 фт линия (Лов)',
  },
  blue: {
    id: 'blue',
    labelRu: 'Синий',
    damage: 'электричество',
    shape: 'line',
    save: 'dex',
    shapeRu: '5×30 фт линия (Лов)',
  },
  brass: {
    id: 'brass',
    labelRu: 'Латунный',
    damage: 'огонь',
    shape: 'line',
    save: 'dex',
    shapeRu: '5×30 фт линия (Лов)',
  },
  bronze: {
    id: 'bronze',
    labelRu: 'Бронзовый',
    damage: 'электричество',
    shape: 'line',
    save: 'dex',
    shapeRu: '5×30 фт линия (Лов)',
  },
  copper: {
    id: 'copper',
    labelRu: 'Медный',
    damage: 'кислота',
    shape: 'line',
    save: 'dex',
    shapeRu: '5×30 фт линия (Лов)',
  },
  gold: {
    id: 'gold',
    labelRu: 'Золотой',
    damage: 'огонь',
    shape: 'cone',
    save: 'dex',
    shapeRu: '15 фт конус (Лов)',
  },
  green: {
    id: 'green',
    labelRu: 'Зелёный',
    damage: 'яд',
    shape: 'cone',
    save: 'con',
    shapeRu: '15 фт конус (Тел)',
  },
  red: {
    id: 'red',
    labelRu: 'Красный',
    damage: 'огонь',
    shape: 'cone',
    save: 'dex',
    shapeRu: '15 фт конус (Лов)',
  },
  silver: {
    id: 'silver',
    labelRu: 'Серебряный',
    damage: 'холод',
    shape: 'cone',
    save: 'con',
    shapeRu: '15 фт конус (Тел)',
  },
  white: {
    id: 'white',
    labelRu: 'Белый',
    damage: 'холод',
    shape: 'cone',
    save: 'con',
    shapeRu: '15 фт конус (Тел)',
  },
}

const FTD_GEM: Record<string, DragonbornAncestryBreath> = {
  amethyst: {
    id: 'amethyst',
    labelRu: 'Аметистовый',
    damage: 'силовое поле',
    shape: 'cone',
    save: 'dex',
    shapeRu: '15 фт конус (Лов)',
  },
  crystal: {
    id: 'crystal',
    labelRu: 'Кристаллический',
    damage: 'излучение',
    shape: 'cone',
    save: 'dex',
    shapeRu: '15 фт конус (Лов)',
  },
  emerald: {
    id: 'emerald',
    labelRu: 'Изумрудный',
    damage: 'психическая энергия',
    shape: 'cone',
    save: 'dex',
    shapeRu: '15 фт конус (Лов)',
  },
  sapphire: {
    id: 'sapphire',
    labelRu: 'Сапфировый',
    damage: 'звук',
    shape: 'cone',
    save: 'dex',
    shapeRu: '15 фт конус (Лов)',
  },
  topaz: {
    id: 'topaz',
    labelRu: 'Топазовый',
    damage: 'некротическая энергия',
    shape: 'cone',
    save: 'dex',
    shapeRu: '15 фт конус (Лов)',
  },
}

export function isDragonbornRaceSlug(slug: string | null | undefined): boolean {
  const s = String(slug || '')
  return (
    s === 'dragonborn' ||
    s === 'dragonborn_chromatic' ||
    s === 'dragonborn_gem' ||
    s === 'dragonborn_metallic'
  )
}

export function dragonbornBreathKind(
  slug: string | null | undefined,
): DragonbornBreathKind | null {
  const s = String(slug || '')
  if (s === 'dragonborn') return 'phb'
  if (
    s === 'dragonborn_chromatic' ||
    s === 'dragonborn_gem' ||
    s === 'dragonborn_metallic'
  ) {
    return 'ftd'
  }
  return null
}

export function resolveDragonbornAncestryBreath(input: {
  raceSlug: string | null | undefined
  ancestryId: string | null | undefined
}): DragonbornAncestryBreath | null {
  const id = String(input.ancestryId || '').trim().toLowerCase()
  if (!id) return null
  const kind = dragonbornBreathKind(input.raceSlug)
  if (!kind) return null
  if (kind === 'phb') return PHB_ANCESTRY[id] ?? null
  if (input.raceSlug === 'dragonborn_gem') return FTD_GEM[id] ?? null
  // Chromatic / metallic reuse PHB color ids (line for chromatic, cone for metallic).
  const base = PHB_ANCESTRY[id]
  if (!base) return null
  if (input.raceSlug === 'dragonborn_chromatic') {
    return {
      ...base,
      shape: 'line',
      save: 'dex',
      shapeRu: '5×30 фт линия (Лов)',
    }
  }
  if (input.raceSlug === 'dragonborn_metallic') {
    return {
      ...base,
      shape: 'cone',
      save: 'dex',
      shapeRu: '15 фт конус (Лов)',
    }
  }
  return base
}

/** PHB: 2d6, +1d6 at 6 / 11 / 16. */
export function phbBreathDiceCount(characterLevel: number): number {
  const lvl = Math.max(1, Math.floor(characterLevel))
  let n = 2
  if (lvl >= 6) n += 1
  if (lvl >= 11) n += 1
  if (lvl >= 16) n += 1
  return n
}

/** FTD: 1d10, +1d10 at 5 / 11 / 17. */
export function ftdBreathDiceCount(characterLevel: number): number {
  const lvl = Math.max(1, Math.floor(characterLevel))
  let n = 1
  if (lvl >= 5) n += 1
  if (lvl >= 11) n += 1
  if (lvl >= 17) n += 1
  return n
}

export function breathWeaponSaveDc(input: {
  conMod: number
  proficiencyBonus: number
}): number {
  return 8 + Math.trunc(input.conMod) + Math.max(1, Math.floor(input.proficiencyBonus))
}

export function breathWeaponDamageExpr(input: {
  kind: DragonbornBreathKind
  characterLevel: number
  damageType: string
}): string {
  if (input.kind === 'phb') {
    const n = phbBreathDiceCount(input.characterLevel)
    return `${n}к6 ${input.damageType}`
  }
  const n = ftdBreathDiceCount(input.characterLevel)
  return `${n}к10 ${input.damageType}`
}

export function breathWeaponUses(input: {
  kind: DragonbornBreathKind
  proficiencyBonus: number
}): number {
  if (input.kind === 'phb') return 1
  return Math.max(1, Math.floor(input.proficiencyBonus))
}

export function breathWeaponReset(kind: DragonbornBreathKind): 'short' | 'long' {
  return kind === 'phb' ? 'short' : 'long'
}

export const BREATH_WEAPON_POOL = 'breath_weapon'
export const CHROMATIC_WARDING_POOL = 'chromatic_warding'
export const GEM_FLIGHT_POOL = 'gem_flight'
export const METALLIC_BREATH_POOL = 'metallic_breath_weapon'

export function breathWeaponResourceId(): string {
  return featureResourceId('race', BREATH_WEAPON_POOL, 'race')
}

export function chromaticWardingResourceId(): string {
  return featureResourceId('race', CHROMATIC_WARDING_POOL, 'race')
}

export function gemFlightResourceId(): string {
  return featureResourceId('race', GEM_FLIGHT_POOL, 'race')
}

export function metallicBreathResourceId(): string {
  return featureResourceId('race', METALLIC_BREATH_POOL, 'race')
}

/** FTD book gate for table buttons (lobby). Outside lobby → show with badge. */
export function ftdTableVisible(ftdAllowed: boolean | null | undefined): boolean {
  if (ftdAllowed === undefined || ftdAllowed === null) return true
  return ftdAllowed === true
}

export function ftdAllowedFromSources(
  allowedSources: string[] | null | undefined,
): boolean | null {
  if (allowedSources == null) return null
  return allowedSources.some((s) => FTD_SOURCE_RE.test(String(s)) || String(s).trim().toLowerCase() === 'ftd')
}

export function appendDragonbornBreathResources(input: {
  desired: DesiredFeatureResource[]
  raceSlug: string | null | undefined
  ancestryId: string | null | undefined
  characterLevel: number
  proficiencyBonus: number
  /** Lobby gate; null = outside lobby. */
  ftdAllowed?: boolean | null
}): DesiredFeatureResource[] {
  const kind = dragonbornBreathKind(input.raceSlug)
  if (!kind) return input.desired
  if (!resolveDragonbornAncestryBreath({
    raceSlug: input.raceSlug,
    ancestryId: input.ancestryId,
  })) {
    return input.desired
  }
  if (kind === 'ftd' && !ftdTableVisible(input.ftdAllowed ?? null)) {
    // Keep already-selected race resources if somehow present — still add pools
    // so sheet doesn't lose uses when book toggles; table buttons stay gated.
  }
  const out = [...input.desired]
  const breathMax = breathWeaponUses({
    kind,
    proficiencyBonus: input.proficiencyBonus,
  })
  const breathId = breathWeaponResourceId()
  if (!out.some((r) => r.id === breathId)) {
    out.push({
      id: breathId,
      name: 'Оружие дыхания',
      max: breathMax,
      reset: breathWeaponReset(kind),
      track: 'spend',
      classSlug: 'race',
      classLabelRu: 'Раса',
    })
  }
  const lvl = Math.max(1, Math.floor(input.characterLevel))
  const ftdOk = ftdTableVisible(input.ftdAllowed ?? null)
  if (kind === 'ftd' && lvl >= 5 && ftdOk) {
    if (input.raceSlug === 'dragonborn_chromatic') {
      const id = chromaticWardingResourceId()
      if (!out.some((r) => r.id === id)) {
        out.push({
          id,
          name: 'Защита цветного дракона',
          max: 1,
          reset: 'long',
          track: 'spend',
          classSlug: 'race',
          classLabelRu: 'Раса',
        })
      }
    }
    if (input.raceSlug === 'dragonborn_gem') {
      const id = gemFlightResourceId()
      if (!out.some((r) => r.id === id)) {
        out.push({
          id,
          name: 'Спектральные крылья',
          max: Math.max(1, Math.floor(input.proficiencyBonus)),
          reset: 'long',
          track: 'spend',
          classSlug: 'race',
          classLabelRu: 'Раса',
        })
      }
    }
    if (input.raceSlug === 'dragonborn_metallic') {
      const id = metallicBreathResourceId()
      if (!out.some((r) => r.id === id)) {
        out.push({
          id,
          name: 'Металлическое оружие дыхания',
          max: 1,
          reset: 'long',
          track: 'spend',
          classSlug: 'race',
          classLabelRu: 'Раса',
        })
      }
    }
  }
  return out
}

export function rollBreathWeaponDamage(input: {
  kind: DragonbornBreathKind
  characterLevel: number
  damageType: string
  rng?: () => number
}): { total: number; detail: string; expr: string } {
  const rng = input.rng ?? Math.random
  const expr = breathWeaponDamageExpr(input)
  const dice = input.kind === 'phb' ? 6 : 10
  const count =
    input.kind === 'phb'
      ? phbBreathDiceCount(input.characterLevel)
      : ftdBreathDiceCount(input.characterLevel)
  const parts: number[] = []
  for (let i = 0; i < count; i += 1) {
    parts.push(1 + Math.floor(rng() * dice))
  }
  const total = parts.reduce((a, b) => a + b, 0)
  return {
    total,
    detail: `${count}d${dice}: ${parts.join('+')}`,
    expr,
  }
}

// —— Warlock invocations ——

export function isEldritchBlastSpell(input: {
  name?: string | null
  catalogId?: string | null
  slug?: string | null
}): boolean {
  const slug = String(input.slug || input.catalogId || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  if (slug === 'eldritch_blast' || slug.endsWith(':eldritch_blast')) return true
  const name = String(input.name || '').trim()
  return /мистическ(ий|ого)\s*заряд|eldritch\s*blast/i.test(name)
}

/** Beams: 1 / 2 at 5 / 3 at 11 / 4 at 17. */
export function eldritchBlastBeamCount(characterLevel: number): number {
  const lvl = Math.max(1, Math.floor(characterLevel))
  if (lvl >= 17) return 4
  if (lvl >= 11) return 3
  if (lvl >= 5) return 2
  return 1
}

export function hasAgonizingBlast(
  knownInvocationIds: Array<string | null | undefined> | null | undefined,
): boolean {
  return (knownInvocationIds ?? []).includes('agonizing_blast')
}

export function hasRepellingBlast(
  knownInvocationIds: Array<string | null | undefined> | null | undefined,
): boolean {
  return (knownInvocationIds ?? []).includes('repelling_blast')
}

export function hasDevilsSight(
  knownInvocationIds: Array<string | null | undefined> | null | undefined,
): boolean {
  return (knownInvocationIds ?? []).includes('devils_sight')
}

/**
 * Agonizing Blast: +CHA to each Eldritch Blast beam.
 * Returns null when invocation missing or not EB.
 */
export function agonizingBlastDamageBonus(input: {
  knownInvocationIds: Array<string | null | undefined> | null | undefined
  chaMod: number
  spellName?: string | null
  catalogId?: string | null
  slug?: string | null
}): number {
  if (!hasAgonizingBlast(input.knownInvocationIds)) return 0
  if (
    !isEldritchBlastSpell({
      name: input.spellName,
      catalogId: input.catalogId,
      slug: input.slug,
    })
  ) {
    return 0
  }
  return Math.trunc(input.chaMod)
}

/** Format EB damage line including beams and optional Agonizing. */
export function formatEldritchBlastDamagePreview(input: {
  characterLevel: number
  chaMod: number
  hasAgonizing: boolean
}): string {
  const beams = eldritchBlastBeamCount(input.characterLevel)
  const mod =
    input.hasAgonizing && input.chaMod !== 0
      ? input.chaMod > 0
        ? `+${Math.trunc(input.chaMod)}`
        : String(Math.trunc(input.chaMod))
      : ''
  const one = `1к10${mod}`
  if (beams <= 1) return `${one} силовое поле`
  return `${one} силовое поле ×${beams} луча`
}

export const DEVILS_SIGHT_HINT =
  'Дьявольское зрение: видишь нормально в магической и обычной тьме на 120 фт'

export const REPELLING_BLAST_HINT =
  'Отталкивающий заряд: при попадании лучом можно оттолкнуть цель на 10 фт по прямой (без спасброска)'
