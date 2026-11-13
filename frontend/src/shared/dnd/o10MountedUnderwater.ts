/**
 * O-10: mounted combat + underwater combat (PHB 2014 / 5e14).
 * Situation marks — not L-08 homebrew toggles.
 */

import { findWeaponPreset } from './weaponPresets'
import {
  damageTypeIsPiercing,
  isCrossbowName,
  isMeleeWeaponAttackName,
  isUnarmedAttackName,
} from './o05CombatFeats'
import { isRangedWeaponAttackName } from './fightingStyles'
import { hasFeatFlag } from './b07FeatCombat'
import type { AppliedFeatGrant } from './featGrants'
import type { ModeWithReasons } from './o08ActionsCoverConditions'
import { mergeRollModes } from './o08ActionsCoverConditions'

/** Creature size order for Mounted Combatant (smaller = lower index). */
export type CreatureSize =
  | 'tiny'
  | 'small'
  | 'medium'
  | 'large'
  | 'huge'
  | 'gargantuan'

const SIZE_RANK: Record<CreatureSize, number> = {
  tiny: 0,
  small: 1,
  medium: 2,
  large: 3,
  huge: 4,
  gargantuan: 5,
}

export const UNDERWATER_HINT =
  'Под водой: рукопашная без колющего и без скорости плавания — помеха; дальнобойная — помеха / автопромах за обычной дистанцией; огонь — сопротивление'

export const MOUNTED_HINT =
  'Верхом: движение скакуна вместо вашего; действие / бонусное / реакция — ваши. Спешивание — снять пометку.'

export const MOUNTED_COMBATANT_ADV_HINT =
  'Верховой боец: преимущество на рукопашные атаки оружием по существам меньше скакуна хотя бы на одну категорию'

export const MOUNTED_COMBATANT_RANGED_DIS_HINT =
  'Верховой боец: дальнобойные атаки оружием по всаднику — с помехой (снять при стрельбе с 5 фт / в упор)'

export const MOUNTED_COMBATANT_REDIRECT_HINT =
  'Верховой боец: принять попадание на скакуна (урон идёт по хитам скакуна)'

export const MOUNT_FALL_DEX_DC = 10

export const MOUNT_FALL_HINT =
  'Скакун опрокинут / в 0 хитов: спас Ловк. Сл 10 — спешиться на ноги; провал — вы тоже опрокинуты и спешены'

/** Mount gear / steed size heuristics (PHB). */
export function mountSizeFromSlugOrName(
  slugOrName: string | null | undefined,
): CreatureSize {
  const key = String(slugOrName || '').toLowerCase()
  if (/мастиф|mastiff|пони|pony/.test(key)) return 'medium'
  if (/верблюд|camel|лошад|конь|horse|warhorse|скакун|steed|пегас|griffin|griffon/.test(key)) {
    return 'large'
  }
  return 'large'
}

export function sizeRank(size: CreatureSize): number {
  return SIZE_RANK[size]
}

export function isSmallerSize(a: CreatureSize, b: CreatureSize): boolean {
  return SIZE_RANK[a] < SIZE_RANK[b]
}

export type MountLike = {
  id: string
  name?: string | null
  active?: boolean | null
  mounted?: boolean | null
  bestiary_ref?: string | null
  source?: { feature?: string | null; labelRu?: string | null } | null
  steed_spirit_type?: string | null
  initiativeMode?: string | null
  stats?: { hp?: number | null; hp_max?: number | null } | null
}

/** True if row is a steed / inventory mount card. */
export function isMountCompanionLike(row: MountLike): boolean {
  if (row.steed_spirit_type) return true
  const feature = String(row.source?.feature || '')
  if (feature.includes('find_steed') || feature.includes('mount:')) return true
  if (row.id.includes(':mount:')) return true
  const label = `${row.source?.labelRu || ''} ${row.name || ''}`
  return /скакун|лошад|конь|пони|верблюд|мастиф|steed|horse|pony|camel|mastiff/i.test(
    label,
  )
}

/** Active mount the host is currently riding. */
export function findActiveMount(
  companions: MountLike[] | null | undefined,
): MountLike | null {
  if (!Array.isArray(companions)) return null
  for (const row of companions) {
    if (!row || !row.mounted) continue
    if (row.active === false) continue
    if (!isMountCompanionLike(row)) continue
    return row
  }
  return null
}

export function hostIsMounted(
  companions: MountLike[] | null | undefined,
): boolean {
  return findActiveMount(companions) != null
}

export function hasMountedCombatantFeat(
  featGrants: AppliedFeatGrant[] | null | undefined,
): boolean {
  return hasFeatFlag(featGrants, 'mounted_combatant')
}

/**
 * Controlled mount (default): shares host turn — movement is the mount's.
 * Independent: own_initiative.
 */
export function mountControlNote(row: MountLike): string {
  if (row.initiativeMode === 'own_initiative') {
    return 'верхом · скакун действует сам (своя инициатива)'
  }
  return 'верхом · скакун управляемый (движение скакуна)'
}

/** Dismount: clear mounted on all mounts. */
export function dismountAll<T extends MountLike>(companions: T[]): T[] {
  return companions.map((c) => (c.mounted ? { ...c, mounted: false } : c))
}

export function resolveMountFallDexSave(opts: {
  rollTotal: number
  dc?: number
}): { success: boolean; prone: boolean; dismounted: boolean; note: string } {
  const dc = opts.dc ?? MOUNT_FALL_DEX_DC
  const success = opts.rollTotal >= dc
  if (success) {
    return {
      success: true,
      prone: false,
      dismounted: true,
      note: `Спас Ловк. ${opts.rollTotal} ≥ ${dc}: спешились на ноги`,
    }
  }
  return {
    success: false,
    prone: true,
    dismounted: true,
    note: `Спас Ловк. ${opts.rollTotal} < ${dc}: опрокинуты и спешены`,
  }
}

/** Mounted Combatant melee advantage vs smaller (unmounted) target. */
export function mountedCombatantMeleeAdvantage(opts: {
  hasFeat: boolean
  mounted: boolean
  meleeWeaponAttack: boolean
  targetSmallerThanMount: boolean
  targetMounted?: boolean
}): ModeWithReasons {
  if (
    !opts.hasFeat ||
    !opts.mounted ||
    !opts.meleeWeaponAttack ||
    !opts.targetSmallerThanMount ||
    opts.targetMounted
  ) {
    return { mode: 'normal', reasons: [] }
  }
  return { mode: 'advantage', reasons: ['Верховой боец · цель меньше скакуна'] }
}

/**
 * Q5-A: propose disadvantage on ranged weapon attacks vs mounted rider with the feat.
 * Caller may clear the chip (point-blank / exceptions).
 */
export function mountedCombatantRangedDisadvantage(opts: {
  hasFeat: boolean
  targetMounted: boolean
  rangedWeaponAttack: boolean
  dismissed?: boolean
}): ModeWithReasons {
  if (
    !opts.hasFeat ||
    !opts.targetMounted ||
    !opts.rangedWeaponAttack ||
    opts.dismissed
  ) {
    return { mode: 'normal', reasons: [] }
  }
  return {
    mode: 'disadvantage',
    reasons: ['Верховой боец · дальний по всаднику'],
  }
}

export function canRedirectHitToMount(opts: {
  hasFeat: boolean
  mounted: boolean
  accepted: boolean
}): boolean {
  return Boolean(opts.hasFeat && opts.mounted && opts.accepted)
}

/**
 * Mounted Combatant vs effect that allows Dex save for half:
 * success → 0; fail → half (already half from save — stay half / note).
 */
export function mountedCombatantDexSaveDamage(opts: {
  hasFeat: boolean
  mounted: boolean
  saveHalfOnSuccess: boolean
  success: boolean
  amount: number
}): { amount: number; note: string } {
  const amount = Math.max(0, Math.floor(opts.amount))
  if (!opts.hasFeat || !opts.mounted || !opts.saveHalfOnSuccess || amount <= 0) {
    return { amount, note: '' }
  }
  if (opts.success) {
    return {
      amount: 0,
      note: `Верховой боец (успех): ${amount} → 0`,
    }
  }
  const half = Math.floor(amount / 2)
  return {
    amount: half,
    note: `Верховой боец (провал): ${amount} → ${half}`,
  }
}

/** PHB underwater melee exceptions by name (dagger, javelin, shortsword, spear, trident). */
const UNDERWATER_MELEE_OK_RE =
  /кинжал|dagger|нож(?!к)|метательн(ое|ого)?\s*копь|javelin|коротк(ий|ого)\s*меч|shortsword|коп[ьёе]|spear|трезубец|trident|пик[аи]|pike|гарпун|harpoon/i

/** PHB underwater ranged exceptions: crossbow, net, dart, javelin, spear, trident. */
const UNDERWATER_RANGED_OK_RE =
  /арбалет|crossbow|сеть|net|дротик|dart|метательн(ое|ого)?\s*копь|javelin|коп[ьёе]|spear|трезубец|trident|гарпун|harpoon|shortspear/i

export function weaponOkUnderwaterMelee(opts: {
  weaponName?: string | null
  damageType?: string | null
}): boolean {
  const name = String(opts.weaponName || '').trim()
  if (!name) return damageTypeIsPiercing(opts.damageType)
  if (UNDERWATER_MELEE_OK_RE.test(name)) return true
  const preset = findWeaponPreset(name)
  if (preset && UNDERWATER_MELEE_OK_RE.test(preset.labelRu)) return true
  // Pack wording: piercing weapon property / type
  if (damageTypeIsPiercing(opts.damageType ?? preset?.damageType)) return true
  return false
}

export function weaponOkUnderwaterRanged(opts: {
  weaponName?: string | null
}): boolean {
  const name = String(opts.weaponName || '').trim()
  if (!name) return false
  if (isCrossbowName(name)) return true
  if (UNDERWATER_RANGED_OK_RE.test(name)) return true
  const preset = findWeaponPreset(name)
  if (preset && UNDERWATER_RANGED_OK_RE.test(preset.labelRu)) return true
  return false
}

export type UnderwaterAttackResult = ModeWithReasons & {
  /** Beyond normal range underwater → auto-miss. */
  autoMiss?: boolean
  autoMissReason?: string
}

/**
 * Underwater attack rules (attacker and/or target submerged as marked).
 * Apply when the attacker is underwater (self mark) for attack modes;
 * fire resistance is separate (target / self submerged).
 */
export function underwaterAttackMode(opts: {
  underwater: boolean
  attackReach: 'melee' | 'ranged'
  weaponName?: string | null
  damageType?: string | null
  hasSwimSpeed?: boolean
  /** O-05 long-range mark / beyond normal range. */
  longRange?: boolean
  /** Spell attack — underwater weapon table does not apply the same way. */
  isSpellAttack?: boolean
}): UnderwaterAttackResult {
  if (!opts.underwater) return { mode: 'normal', reasons: [] }

  if (opts.isSpellAttack) {
    return { mode: 'normal', reasons: [] }
  }

  if (opts.attackReach === 'melee') {
    if (opts.hasSwimSpeed) {
      return { mode: 'normal', reasons: ['под водой · скорость плавания'] }
    }
    const unarmed = isUnarmedAttackName(String(opts.weaponName || ''))
    const ok = weaponOkUnderwaterMelee({
      weaponName: opts.weaponName,
      damageType: opts.damageType,
    })
    if (ok && !unarmed) {
      return { mode: 'normal', reasons: ['под водой · колющее'] }
    }
    // Unarmed without piercing natural weapon → disadvantage
    if (unarmed && damageTypeIsPiercing(opts.damageType)) {
      return { mode: 'normal', reasons: ['под водой · природное колющее'] }
    }
    return {
      mode: 'disadvantage',
      reasons: ['под водой · рукопашная без колющего / плавания'],
    }
  }

  // Ranged weapon
  if (opts.longRange) {
    return {
      mode: 'normal',
      reasons: ['под водой · дальняя дистанция'],
      autoMiss: true,
      autoMissReason: 'Под водой: дальнобойная атака дальше обычной дистанции — промах',
    }
  }
  if (weaponOkUnderwaterRanged({ weaponName: opts.weaponName })) {
    return { mode: 'normal', reasons: ['под водой · оружие работает в воде'] }
  }
  return {
    mode: 'disadvantage',
    reasons: ['под водой · дальнобойная'],
  }
}

/** Fully submerged creature has resistance to fire. */
export function underwaterFireResistanceActive(
  underwater: boolean | null | undefined,
): boolean {
  return Boolean(underwater)
}

export function withUnderwaterFireResistance<
  T extends { type: string; nonmagical?: boolean; sources?: string[] },
>(resistances: T[], underwater: boolean | null | undefined): T[] {
  if (!underwater) return resistances
  const hasFire = resistances.some((r) => /огонь|fire/i.test(String(r.type)))
  if (hasFire) return resistances
  return [
    ...resistances,
    {
      type: 'fire',
      nonmagical: false,
      sources: ['под водой'],
    } as T,
  ]
}

/** Merge several mode results into one ModeWithReasons. */
export function combineModeReasons(
  ...parts: Array<ModeWithReasons | null | undefined>
): ModeWithReasons {
  const reasons: string[] = []
  const modes: Array<'normal' | 'advantage' | 'disadvantage'> = []
  for (const p of parts) {
    if (!p) continue
    modes.push(p.mode)
    reasons.push(...p.reasons)
  }
  return { mode: mergeRollModes(...modes), reasons }
}

export function attackReachFromName(
  name: string,
): 'melee' | 'ranged' {
  if (isRangedWeaponAttackName(name)) return 'ranged'
  if (isMeleeWeaponAttackName(name)) return 'melee'
  if (/лук|арбалет|пращ|blowgun|firearm|пистолет|мушкет/i.test(name)) {
    return 'ranged'
  }
  return 'melee'
}
