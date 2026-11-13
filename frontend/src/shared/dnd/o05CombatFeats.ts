/**
 * O-05: боевые черты PHB/TCE за столом (−5/+10, бонусные атаки, TCE crushers…).
 * Имена кнопок — как в каталоге листа (nameRu не переименовывать).
 */

import { findWeaponPreset } from './weaponPresets'
import { isRangedWeaponAttackName } from './fightingStyles'
import {
  canSpendFeature,
  type TurnEconomyState,
  type TurnSpendResult,
} from './turnEconomy'
import { tceTableVisible } from './tceOptions'

/** Local melee check — avoid importing features/ into shared/dnd. */
export function isMeleeWeaponAttackName(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  if (/безоруж|unarmed/i.test(trimmed)) return true
  if (isRangedWeaponAttackName(trimmed)) return false
  if (/метательн|бросок|метнуть/i.test(trimmed)) return false
  return true
}

/** PHB heavy weapons (GWM melee / longbow & heavy crossbow are heavy but ranged). */
const HEAVY_NAME_RE =
  /секир|greataxe|двуручн(ый)?\s*меч|greatsword|молот(?! боевой)|maul|алебард|halberd|глеф|glaive|пик[аи]|pike|тяжёл(ый|ого)\s*арбалет|heavy\s*crossbow|длинн(ый|ого)\s*лук|longbow/i

const CROSSBOW_NAME_RE = /арбалет|crossbow/i
const HAND_CROSSBOW_RE = /ручн(ой|ого)\s*арбалет|hand\s*crossbow/i
const FIREARM_RE = /пистолет|мушкет|firearm|pistol|musket|ружьё|ружье/i
const IMPROVISED_RE = /импровиз|стул|бутыл|камень|стол|кресл|посуд|chair|bottle|rock|improvised/i
const UNARMED_RE = /безоруж|кулак|удар\s*рукой|unarmed|natural/i

const BLUDGEONING_RE = /дробящ|bludgeon/i
const PIERCING_RE = /колющ|pierc/i
const SLASHING_RE = /рубящ|slash/i

export const POWER_ATTACK_HINT_GWM =
  'Мастер большого оружия: −5 к попаданию, +10 к урону рукопашной атакой тяжёлым оружием, которым владеете'
export const POWER_ATTACK_HINT_SS =
  'Меткий стрелок: −5 к попаданию, +10 к урону дальнобойной атакой оружием, которым владеете; без помехи за дальнюю дистанцию'

export const GWM_BONUS_ATTACK_HINT =
  'Мастер большого оружия: бонусная рукопашная атака оружием после крита или добивания в этот ход'

export function o05TceVisible(tceAllowed: boolean | null | undefined): boolean {
  return tceTableVisible(tceAllowed === undefined ? null : tceAllowed)
}

export function weaponIsHeavy(name: string): boolean {
  const preset = findWeaponPreset(name)
  if (preset?.heavy === true) return true
  if (preset?.heavy === false) return false
  return HEAVY_NAME_RE.test(name.trim())
}

export function weaponHasLoading(name: string): boolean {
  const preset = findWeaponPreset(name)
  if (preset?.loading === true) return true
  if (preset?.loading === false) return false
  const n = name.trim()
  return CROSSBOW_NAME_RE.test(n) || FIREARM_RE.test(n)
}

export function isHandCrossbowName(name: string): boolean {
  return HAND_CROSSBOW_RE.test(name.trim())
}

export function isCrossbowName(name: string): boolean {
  return CROSSBOW_NAME_RE.test(name.trim())
}

export function isFirearmName(name: string): boolean {
  return FIREARM_RE.test(name.trim())
}

export function isUnarmedAttackName(name: string): boolean {
  return UNARMED_RE.test(name.trim())
}

export function isImprovisedWeaponName(name: string): boolean {
  return IMPROVISED_RE.test(name.trim())
}

export function damageTypeIsBludgeoning(type: string | null | undefined): boolean {
  return BLUDGEONING_RE.test(String(type || ''))
}

export function damageTypeIsPiercing(type: string | null | undefined): boolean {
  return PIERCING_RE.test(String(type || ''))
}

export function damageTypeIsSlashing(type: string | null | undefined): boolean {
  return SLASHING_RE.test(String(type || ''))
}

/** Spell attack names (cantrips/spells) — power attack does not apply. */
export function isSpellAttackName(name: string): boolean {
  const n = name.trim().toLowerCase()
  if (!n) return false
  if (
    /огненн(ый|ого)\s*снаряд|fire\s*bolt|мистическ(ий|ого)\s*заряд|eldritch\s*blast|священн|sacred\s*flame|луч\s*холода|ray\s*of\s*frost|кислотн|acid\s*splash|ядовит|poison\s*spray|sword\s*burst|зелёное\s*пламя|green[- ]?flame|бум\.?\s*удар|booming\s*blade|молни|lightning\s*lure|иссушающ|chill\s*touch|thorn\s*whip|тернов/i.test(
      n,
    )
  ) {
    return true
  }
  // Weapon presets win over spell heuristics.
  if (findWeaponPreset(name)) return false
  if (isMeleeWeaponAttackName(name) || isRangedWeaponAttackName(name)) return false
  return false
}

export type PowerAttackKind = 'gwm' | 'sharpshooter' | null

export function resolvePowerAttackKind(input: {
  attackName: string
  /** Weapon attack (not spell). */
  isWeaponAttack?: boolean
  hasGreatWeaponMaster: boolean
  hasSharpshooter: boolean
  powerAttackOn: boolean
  proficient?: boolean
}): PowerAttackKind {
  if (!input.powerAttackOn) return null
  if (isSpellAttackName(input.attackName)) return null
  if (input.isWeaponAttack === false) return null
  const melee = isMeleeWeaponAttackName(input.attackName)
  const ranged = isRangedWeaponAttackName(input.attackName)
  if (
    input.hasGreatWeaponMaster &&
    melee &&
    weaponIsHeavy(input.attackName) &&
    input.proficient !== false
  ) {
    return 'gwm'
  }
  if (input.hasSharpshooter && ranged && input.proficient !== false) {
    return 'sharpshooter'
  }
  return null
}

export function powerAttackModifiers(kind: PowerAttackKind): {
  attackDelta: number
  damageDelta: number
} {
  if (!kind) return { attackDelta: 0, damageDelta: 0 }
  return { attackDelta: -5, damageDelta: 10 }
}

/** Long-range disadvantage: skip when Sharpshooter + long range marked. */
export function rangedLongRangeDisadvantage(input: {
  hasSharpshooter: boolean
  longRangeMarked: boolean
}): boolean {
  if (!input.longRangeMarked) return false
  if (input.hasSharpshooter) return false
  return true
}

/**
 * Point-blank (within 5 ft) ranged attack disadvantage.
 * Crossbow Expert (crossbow) / Gunner (any ranged) remove it.
 */
export function rangedPointBlankDisadvantage(input: {
  attackName: string
  within5ft: boolean
  hasCrossbowExpert: boolean
  hasGunner: boolean
}): boolean {
  if (!input.within5ft) return false
  if (!isRangedWeaponAttackName(input.attackName)) return false
  if (input.hasGunner) return false
  if (input.hasCrossbowExpert && isCrossbowName(input.attackName)) return false
  return true
}

/** Loading property blocks a second attack unless ignored. */
export function loadingBlocksExtraAttack(input: {
  attackName: string
  hasCrossbowExpert: boolean
  hasGunner: boolean
}): boolean {
  if (!weaponHasLoading(input.attackName)) return false
  if (input.hasGunner) return false
  if (input.hasCrossbowExpert && isCrossbowName(input.attackName)) return false
  return true
}

export function markDashedThisTurn(state: TurnEconomyState): TurnEconomyState {
  return { ...state, dashedThisTurn: true }
}

export function markAttackActionThisTurn(state: TurnEconomyState): TurnEconomyState {
  // actionSpentAs === 'attack' already tracks this; keep explicit flag for clarity.
  return { ...state, attackActionThisTurn: true }
}

export function markGwmBonusReady(state: TurnEconomyState): TurnEconomyState {
  return { ...state, gwmBonusReady: true }
}

export function markMeleeWeaponCritOrKill(state: TurnEconomyState): TurnEconomyState {
  return markGwmBonusReady({ ...state, meleeWeaponCritOrKillThisTurn: true })
}

export function markWeaponHitThisTurn(state: TurnEconomyState): TurnEconomyState {
  return { ...state, weaponHitThisTurn: true }
}

export function markUnarmedOrImprovisedHit(
  state: TurnEconomyState,
): TurnEconomyState {
  return { ...state, unarmedOrImprovisedHitThisTurn: true }
}

export function markChargerBonusUsed(state: TurnEconomyState): TurnEconomyState {
  return { ...state, chargerBonusUsed: true }
}

export function markCrossbowExpertBonusUsed(
  state: TurnEconomyState,
): TurnEconomyState {
  return { ...state, crossbowExpertBonusUsed: true }
}

export function markOrcishFuryBonusUsed(state: TurnEconomyState): TurnEconomyState {
  return { ...state, orcishFuryBonusUsed: true }
}

export function markShieldMasterShoveUsed(
  state: TurnEconomyState,
): TurnEconomyState {
  return { ...state, shieldMasterShoveUsed: true }
}

export function markCrusherUsed(state: TurnEconomyState): TurnEconomyState {
  return { ...state, crusherUsedThisTurn: true }
}

export function markPiercerUsed(state: TurnEconomyState): TurnEconomyState {
  return { ...state, piercerUsedThisTurn: true }
}

export function markSlasherUsed(state: TurnEconomyState): TurnEconomyState {
  return { ...state, slasherUsedThisTurn: true }
}

export function markGwmBonusUsed(state: TurnEconomyState): TurnEconomyState {
  return { ...state, gwmBonusUsed: true, bonus: true }
}

export function canGwmBonusAttack(
  state: TurnEconomyState,
  hasFeat: boolean,
): TurnSpendResult {
  if (!hasFeat) {
    return { ok: false, reason: 'Нет черты «Мастер большого оружия»', mark: 'bonus' }
  }
  if (!state.gwmBonusReady && !state.meleeWeaponCritOrKillThisTurn) {
    return {
      ok: false,
      reason: 'Нужен крит или добивание рукопашным оружием в этот ход',
      mark: 'bonus',
    }
  }
  if (state.gwmBonusUsed) {
    return { ok: false, reason: 'Уже использовано в этот ход', mark: 'bonus' }
  }
  return canSpendFeature(state, 'bonus')
}

export function canChargerBonus(
  state: TurnEconomyState,
  hasFeat: boolean,
): TurnSpendResult {
  if (!hasFeat) {
    return { ok: false, reason: 'Нет черты «Налётчик»', mark: 'bonus' }
  }
  if (!state.dashedThisTurn) {
    return { ok: false, reason: 'Нужен Рывок в этот ход', mark: 'bonus' }
  }
  if (state.chargerBonusUsed) {
    return { ok: false, reason: 'Уже использовано в этот ход', mark: 'bonus' }
  }
  return canSpendFeature(state, 'bonus')
}

export function canCrossbowExpertBonus(
  state: TurnEconomyState,
  input: { hasFeat: boolean; holdingHandCrossbow: boolean },
): TurnSpendResult {
  if (!input.hasFeat) {
    return { ok: false, reason: 'Нет черты «Эксперт в арбалетах»', mark: 'bonus' }
  }
  if (!input.holdingHandCrossbow) {
    return { ok: false, reason: 'Нужен ручной арбалет в руках', mark: 'bonus' }
  }
  if (!state.attackActionThisTurn && state.actionSpentAs !== 'attack') {
    return { ok: false, reason: 'Нужно действие «Атака» в этот ход', mark: 'bonus' }
  }
  if (state.crossbowExpertBonusUsed) {
    return { ok: false, reason: 'Уже использовано в этот ход', mark: 'bonus' }
  }
  return canSpendFeature(state, 'bonus')
}

export function canTavernBrawlerGrapple(
  state: TurnEconomyState,
  hasFeat: boolean,
): TurnSpendResult {
  if (!hasFeat) {
    return { ok: false, reason: 'Нет черты «Драчун»', mark: 'bonus' }
  }
  if (!state.unarmedOrImprovisedHitThisTurn) {
    return {
      ok: false,
      reason: 'Нужно попадание безоружной или импровизированной в этот ход',
      mark: 'bonus',
    }
  }
  return canSpendFeature(state, 'bonus')
}

export function canShieldMasterShove(
  state: TurnEconomyState,
  input: { hasFeat: boolean; shieldInHand: boolean },
): TurnSpendResult {
  if (!input.hasFeat) {
    return { ok: false, reason: 'Нет черты «Мастер щита»', mark: 'bonus' }
  }
  if (!input.shieldInHand) {
    return { ok: false, reason: 'Нужен щит в руке', mark: 'bonus' }
  }
  if (!state.attackActionThisTurn && state.actionSpentAs !== 'attack') {
    return { ok: false, reason: 'Нужно действие «Атака» в этот ход', mark: 'bonus' }
  }
  if (state.shieldMasterShoveUsed) {
    return { ok: false, reason: 'Уже использовано в этот ход', mark: 'bonus' }
  }
  return canSpendFeature(state, 'bonus')
}

export function canOrcishFuryBonus(
  state: TurnEconomyState,
  hasFeat: boolean,
): TurnSpendResult {
  if (!hasFeat) {
    return { ok: false, reason: 'Нет черты «Орочья ярость»', mark: 'bonus' }
  }
  if (!state.weaponHitThisTurn) {
    return {
      ok: false,
      reason: 'Нужно попадание оружием в этот ход',
      mark: 'bonus',
    }
  }
  if (state.orcishFuryBonusUsed) {
    return { ok: false, reason: 'Уже использовано в этот ход', mark: 'bonus' }
  }
  return canSpendFeature(state, 'bonus')
}

export function canTelekineticShove(
  state: TurnEconomyState,
  hasFeat: boolean,
): TurnSpendResult {
  if (!hasFeat) {
    return { ok: false, reason: 'Нет черты «Телекинез»', mark: 'bonus' }
  }
  return canSpendFeature(state, 'bonus')
}

/** Healer feat heal: 1d6 + 4 + number of Hit Dice. */
export function healerFeatHealAmount(
  hitDiceTotal: number,
  rng: () => number = Math.random,
): { amount: number; label: string } {
  const hd = Math.max(0, Math.floor(hitDiceTotal))
  const roll = 1 + Math.floor(rng() * 6)
  const amount = roll + 4 + hd
  return {
    amount,
    label: `Целитель: ${roll} (к6) + 4 + ${hd} костей хитов = ${amount}`,
  }
}

export function findHealerKitItem<T extends { name?: string | null; qty?: number | null }>(
  items: T[] | null | undefined,
): T | null {
  if (!items?.length) return null
  for (const item of items) {
    const n = String(item.name || '').toLowerCase()
    if (
      /набор\s*целител|комплект\s*целител|healer'?s?\s*kit|аптечк/i.test(n) &&
      (item.qty == null || item.qty > 0)
    ) {
      return item
    }
  }
  return null
}

/** Size category rank for PHB size limits (Tiny=0 … Gargantuan=5). */
export function sizeRank(size: string | null | undefined): number | null {
  const s = String(size || '')
    .trim()
    .toLowerCase()
  if (!s) return null
  if (/крошеч|tiny/.test(s)) return 0
  if (/маленьк|small/.test(s)) return 1
  if (/средн|medium/.test(s)) return 2
  if (/больш|large/.test(s)) return 3
  if (/огромн|huge/.test(s)) return 4
  if (/гигант|gargantuan/.test(s)) return 5
  return null
}

/** True if target is at most one size category larger. */
export function sizeWithinOneCategory(
  selfSize: string | null | undefined,
  targetSize: string | null | undefined,
): boolean {
  const a = sizeRank(selfSize)
  const b = sizeRank(targetSize)
  if (a == null || b == null) return true // unknown → allow, master can veto
  return b <= a + 1
}

/**
 * Martial Adept: if Battle Master / Superior Technique pool exists, +1 die;
 * else keep feat d6 pool. Returns suggested max bump.
 */
export function martialAdeptExtraDie(input: {
  hasMartialAdept: boolean
  hasClassSuperiorityPool: boolean
}): number {
  if (!input.hasMartialAdept) return 0
  if (input.hasClassSuperiorityPool) return 1
  return 0
}

export function tavernBrawlerUnarmedDamage(
  current: string | null | undefined,
): string {
  const cur = String(current || '').trim()
  if (!cur || cur === '1' || /^1$/.test(cur)) return '1к4'
  // Keep better dice (monk etc.)
  const m = cur.match(/(\d+)\s*[кdD](\d+)/)
  if (!m) return cur.includes('к4') || cur.includes('d4') ? cur : '1к4'
  const sides = Number(m[2])
  if (sides < 4) return '1к4'
  return cur
}

/** Append flat damage bonus into a damage expression string. */
export function appendFlatDamage(expr: string, flat: number): string {
  if (!flat) return expr
  const sign = flat >= 0 ? '+' : ''
  if (!expr || expr === '—') return `${flat}`
  return `${expr}${sign}${flat}`
}
