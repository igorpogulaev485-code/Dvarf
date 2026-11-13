/**
 * O-07: opportunity attacks, Battle Master reaction maneuvers,
 * reaction-spell context, Sentinel / Polearm Master / Mage Slayer / War Caster OA.
 * Names: 5e14 / PHB 2014.
 */

import { findWeaponPreset } from './weaponPresets'
import {
  canSpendFeature,
  castingTimeToEconomyMark,
  type TurnEconomyState,
  type TurnSpendResult,
} from './turnEconomy'
import { hasFeatFlag, type InventoryItemLike } from './b07FeatCombat'
import type { AppliedFeatGrant } from './featGrants'

export const OPPORTUNITY_ATTACK_HINT =
  'Атака по возможности: реакция · одна рукопашная атака оружием (или безоружная), когда цель вышла из досягаемости'

export const OPPORTUNITY_ENTER_HINT =
  'Мастер древкового оружия: провокация, когда существо вошло в вашу досягаемость'

export const SENTINEL_ATTACK_HINT =
  'Страж: реакция · одна рукопашная атака оружием по существу в 5 фт, которое атаковало другую цель (не вас)'

export const MAGE_SLAYER_ATTACK_HINT =
  'Убийца магов: реакция · одна рукопашная атака оружием по существу в 5 фт, которое кастует'

export const POLEARM_BONUS_HINT =
  'Мастер древкового оружия: бонусная атака противоположным концом · 1к4 дробящего, тот же модификатор'

export const PARRY_HINT =
  'Парирование: реакция · снизить урон рукопашной атаки оружием на кость превосходства + мод. Ловк.'

export const RIPOSTE_HINT =
  'Ответный удар: реакция · атака оружием по промахнувшемуся + кость к урону при попадании'

export const WAR_CASTER_OA_SPELL_HINT =
  'Боевой заклинатель: вместо атаки по возможности — заклинание со временем «1 действие», только на спровоцировавшего'

export const WAR_CASTER_SOMATIC_NOTE =
  'Боевой заклинатель: можете выполнять соматический компонент, даже когда в руках оружие или щит'

/** Polearm Master bonus attack (opposite end): glaive, halberd, quarterstaff, spear — not pike. */
const POLEARM_BONUS_RE =
  /алебард|halberd|глеф|glaive|боев(ой|ого)\s*посох|quarterstaff|\bпосох\b|коп[ьи][еёя]|spear/i

/** Polearm Master enter-reach OA: + pike. */
const POLEARM_OA_RE =
  /алебард|halberd|глеф|glaive|боев(ой|ого)\s*посох|quarterstaff|\bпосох\b|коп[ьи][еёя]|spear|пик[аи]|pike/i

const RANGED_RE =
  /лук|арбалет|дротик|пращ|пистол|ружь|мушкет|bow|crossbow|dart|sling|firearm|gun/i

export type OpportunityTrigger = 'leave' | 'enter'

export function weaponIsPolearmBonus(name: string): boolean {
  const n = name.trim()
  if (!n || RANGED_RE.test(n)) return false
  if (/длинн(ое|ого)\s*коп|lance/i.test(n)) return false
  if (/метательн/i.test(n)) return false
  const preset = findWeaponPreset(n)
  if (preset?.ranged) return false
  if (preset) {
    const id = `${preset.labelRu} ${(preset.aliases ?? []).join(' ')}`
    if (/пик[аи]|\bpike\b/i.test(id) && !/коп/i.test(n)) return false
  }
  return POLEARM_BONUS_RE.test(n)
}

export function weaponIsPolearmOpportunity(name: string): boolean {
  const n = name.trim()
  if (!n || RANGED_RE.test(n)) return false
  if (/длинн(ое|ого)\s*коп|lance/i.test(n)) return false
  if (/метательн/i.test(n)) return false
  const preset = findWeaponPreset(n)
  if (preset?.ranged) return false
  return POLEARM_OA_RE.test(n)
}

export function holdingPolearmOpportunityWeapon(
  items: InventoryItemLike[] | null | undefined,
): boolean {
  for (const item of items ?? []) {
    if (!item.equipped) continue
    if (item.armor_kind === 'shield') continue
    const name = String(item.name || '')
    if (weaponIsPolearmOpportunity(name)) return true
  }
  return false
}

export function holdingPolearmBonusWeapon(
  items: InventoryItemLike[] | null | undefined,
): boolean {
  for (const item of items ?? []) {
    if (!item.equipped) continue
    if (item.armor_kind === 'shield') continue
    const name = String(item.name || '')
    if (weaponIsPolearmBonus(name)) return true
  }
  return false
}

export function markPolearmBonusReady(state: TurnEconomyState): TurnEconomyState {
  return { ...state, polearmBonusReady: true }
}

export function clearPolearmBonusReady(state: TurnEconomyState): TurnEconomyState {
  return { ...state, polearmBonusReady: false }
}

export function markPolearmBonusUsed(state: TurnEconomyState): TurnEconomyState {
  return {
    ...state,
    polearmBonusReady: false,
    polearmBonusUsed: true,
    bonus: true,
  }
}

/**
 * After a weapon attack during the Attack action: keep/clear polearm bonus readiness.
 * Only weapons that qualify for the opposite-end attack keep the bonus ready.
 */
export function noteAttackWeaponForPolearmBonus(
  state: TurnEconomyState,
  input: { weaponName: string; hasPolearmMaster: boolean },
): TurnEconomyState {
  if (!input.hasPolearmMaster) return state
  if (!state.attackActionThisTurn && !state.action) return state
  if (state.polearmBonusUsed) return state
  if (weaponIsPolearmBonus(input.weaponName)) {
    return { ...state, polearmBonusReady: true }
  }
  // Attacked with something else this Attack action → lose bonus.
  return { ...state, polearmBonusReady: false }
}

export function canPolearmBonusAttack(
  state: TurnEconomyState,
  input: { hasPolearmMaster: boolean; holdingPolearm: boolean },
): TurnSpendResult {
  if (!input.hasPolearmMaster) {
    return { ok: false, reason: 'нет черты «Мастер древкового оружия»', mark: 'bonus' }
  }
  if (!input.holdingPolearm) {
    return {
      ok: false,
      reason: 'нужна алебарда, глефа, боевой посох или копьё',
      mark: 'bonus',
    }
  }
  if (!state.attackActionThisTurn) {
    return {
      ok: false,
      reason: 'сначала действие «Атака» этим оружием',
      mark: 'bonus',
    }
  }
  if (!state.polearmBonusReady) {
    return {
      ok: false,
      reason: 'в этот ход атаковали не только древковым (или уже потратили)',
      mark: 'bonus',
    }
  }
  if (state.polearmBonusUsed) {
    return { ok: false, reason: 'бонусный конец уже использован', mark: 'bonus' }
  }
  if (state.bonus) {
    return { ok: false, reason: 'бонусное уже потрачено', mark: 'bonus' }
  }
  return { ok: true }
}

export function canOpportunityAttack(
  state: TurnEconomyState,
  input: {
    trigger: OpportunityTrigger
    hasSentinel: boolean
    hasPolearmMaster: boolean
    holdingPolearmOa: boolean
    /** Target used Disengage this turn (manual confirm without map). */
    targetDisengaged?: boolean
  },
): TurnSpendResult {
  const reaction = canSpendFeature(state, 'reaction')
  if (!reaction.ok) return reaction

  if (input.trigger === 'enter') {
    if (!input.hasPolearmMaster || !input.holdingPolearmOa) {
      return {
        ok: false,
        reason: 'нужна черта «Мастер древкового оружия» и древковое в руках',
        mark: 'reaction',
      }
    }
    // Enter-reach: Disengage still negates (PHB); Sentinel does not override enter.
    if (input.targetDisengaged) {
      return {
        ok: false,
        reason: 'цель совершила Отход — провокация на вход не срабатывает',
        mark: 'reaction',
      }
    }
    return { ok: true }
  }

  // leave reach
  if (input.targetDisengaged && !input.hasSentinel) {
    return {
      ok: false,
      reason: 'цель совершила Отход — без «Стража» провокация недоступна',
      mark: 'reaction',
    }
  }
  return { ok: true }
}

export function canSentinelAttack(state: TurnEconomyState, hasSentinel: boolean): TurnSpendResult {
  if (!hasSentinel) {
    return { ok: false, reason: 'нет черты «Страж»', mark: 'reaction' }
  }
  return canSpendFeature(state, 'reaction')
}

export function canMageSlayerAttack(
  state: TurnEconomyState,
  hasMageSlayer: boolean,
): TurnSpendResult {
  if (!hasMageSlayer) {
    return { ok: false, reason: 'нет черты «Убийца магов»', mark: 'reaction' }
  }
  return canSpendFeature(state, 'reaction')
}

export function canParryReaction(
  state: TurnEconomyState,
  input: { knowsParry: boolean; hasSuperiorityDie: boolean },
): TurnSpendResult {
  if (!input.knowsParry) {
    return { ok: false, reason: 'приём «Парирование» не известен', mark: 'reaction' }
  }
  if (!input.hasSuperiorityDie) {
    return { ok: false, reason: 'нет кости превосходства', mark: 'reaction' }
  }
  return canSpendFeature(state, 'reaction')
}

export function canRiposteReaction(
  state: TurnEconomyState,
  input: { knowsRiposte: boolean; hasSuperiorityDie: boolean },
): TurnSpendResult {
  if (!input.knowsRiposte) {
    return { ok: false, reason: 'приём «Ответный удар» не известен', mark: 'reaction' }
  }
  if (!input.hasSuperiorityDie) {
    return { ok: false, reason: 'нет кости превосходства', mark: 'reaction' }
  }
  return canSpendFeature(state, 'reaction')
}

/** Damage after Parry: max(0, amount − (dieFace + dexMod)). */
export function applyParryDamageReduction(input: {
  amount: number
  dieFace: number
  dexMod: number
}): { amount: number; cut: number; note: string } {
  const raw = Math.max(0, Math.floor(input.amount))
  const cut = Math.max(0, Math.floor(input.dieFace) + Math.floor(input.dexMod))
  const next = Math.max(0, raw - cut)
  return {
    amount: next,
    cut,
    note: `Парирование: −${cut} (кость+Ловк.) · ${raw} → ${next}`,
  }
}

/** Counterspell: auto-success if slot level strictly greater than target spell level. */
export function counterspellAutoSucceeds(slotLevel: number, targetSpellLevel: number): boolean {
  return Math.floor(slotLevel) > Math.floor(targetSpellLevel)
}

export function counterspellCheckDc(targetSpellLevel: number): number {
  return 10 + Math.max(0, Math.floor(targetSpellLevel))
}

export type ReactionSpellKind =
  | 'shield'
  | 'counterspell'
  | 'absorb_elements'
  | 'hellish_rebuke'
  | 'feather_fall'
  | 'other'

const REACTION_SPELL_MATCHERS: Array<{ kind: ReactionSpellKind; re: RegExp }> = [
  { kind: 'shield', re: /^(щит|shield)$/iu },
  { kind: 'counterspell', re: /^(контрзаклинание|counterspell)$/iu },
  {
    kind: 'absorb_elements',
    re: /^(поглощение\s*стихий|absorb\s*elements)$/iu,
  },
  {
    kind: 'hellish_rebuke',
    re: /^(адское\s*возмездие|hellish\s*rebuke)$/iu,
  },
  {
    kind: 'feather_fall',
    re: /^(падение\s*п[её]рышком|feather\s*fall)$/iu,
  },
]

export function classifyReactionSpell(nameOrSlug: string): ReactionSpellKind {
  const raw = String(nameOrSlug || '')
    .trim()
    .replace(/_/g, ' ')
  for (const row of REACTION_SPELL_MATCHERS) {
    if (row.re.test(raw)) return row.kind
  }
  const slug = raw.toLowerCase().replace(/\s+/g, '_')
  if (slug === 'shield') return 'shield'
  if (slug === 'counterspell') return 'counterspell'
  if (slug === 'absorb_elements') return 'absorb_elements'
  if (slug === 'hellish_rebuke') return 'hellish_rebuke'
  if (slug === 'feather_fall') return 'feather_fall'
  return 'other'
}

export function reactionSpellTriggerHint(kind: ReactionSpellKind): string {
  switch (kind) {
    case 'shield':
      return 'когда по вам попали атакой или вы цель «Волшебной стрелы»'
    case 'counterspell':
      return 'когда видите, что существо в 60 фт кастует'
    case 'absorb_elements':
      return 'когда получаете урон кислотой, холодом, огнём, электричеством или звуком'
    case 'hellish_rebuke':
      return 'когда существо в 60 фт нанесло вам урон'
    case 'feather_fall':
      return 'когда вы или существо в 60 фт падаете'
    default:
      return 'время наложения — реакция'
  }
}

export type ReactionSpellRow = {
  id: string
  name: string
  level: number
  casting_time?: string | null
  catalog_id?: string | null
  prepared?: boolean
}

/** Spells the character can cast with casting time = reaction (book timing). */
export function listReactionSpells(
  spells: { known?: ReactionSpellRow[] | null } | null | undefined,
): Array<ReactionSpellRow & { kind: ReactionSpellKind }> {
  const out: Array<ReactionSpellRow & { kind: ReactionSpellKind }> = []
  for (const spell of spells?.known ?? []) {
    if (!spell) continue
    const timing = castingTimeToEconomyMark(spell.casting_time)
    if (timing !== 'reaction') continue
    // Prepared casters: skip unprepared leveled spells; cantrips/always-ready rows stay.
    if (spell.prepared === false && Math.floor(spell.level) > 0) continue
    const kind = classifyReactionSpell(spell.catalog_id || spell.name)
    out.push({ ...spell, kind })
  }
  return out
}

export function hasReactionSpellSlot(
  slots: Record<string, { max: number; used: number }> | null | undefined,
  level: number,
): boolean {
  const need = Math.max(0, Math.floor(level))
  if (need <= 0) return true
  for (let lv = need; lv <= 9; lv += 1) {
    const row = slots?.[String(lv)]
    if (!row) continue
    if (row.max - row.used > 0) return true
  }
  return false
}

/** War Caster OA: action-timing spell that targets only the provocateur (single-creature). */
export function warCasterOpportunitySpellOk(spell: {
  name?: string
  casting_time?: string | null
  range?: string | null
  notes?: string | null
  description?: string | null
}): boolean {
  const timing = castingTimeToEconomyMark(spell.casting_time)
  if (timing !== 'action') return false
  const blob = `${spell.name || ''} ${spell.range || ''} ${spell.notes || ''} ${spell.description || ''}`
  // Reject obvious AoE / multi-target.
  if (
    /конус|цилиндр|куб|сфер|радиус|область|всех существ|каждое существо|fireball|огненн(ый|ого)\s*шар|lightning bolt|цепн/i.test(
      blob,
    )
  ) {
    return false
  }
  return true
}

export function hasO07Feat(
  ledger: AppliedFeatGrant[] | null | undefined,
  flag: 'sentinel' | 'polearm_master' | 'mage_slayer' | 'war_caster',
): boolean {
  return hasFeatFlag(ledger, flag)
}

/** Absorb Elements damage types (PHB). */
export const ABSORB_ELEMENTS_TYPES = [
  'acid',
  'cold',
  'fire',
  'lightning',
  'thunder',
] as const

export function damageTypeIsAbsorbElements(type: string | null | undefined): boolean {
  const t = String(type || '')
    .trim()
    .toLowerCase()
  if (!t) return false
  if ((ABSORB_ELEMENTS_TYPES as readonly string[]).includes(t)) return true
  return /кислот|холод|огн|электрич|молни|звук|громов|acid|cold|fire|lightning|thunder/i.test(t)
}

export function parseSuperiorityDieSides(label: string | null | undefined): number {
  const m = String(label || '').match(/(\d+)/)
  const n = m ? Number(m[1]) : 8
  return Number.isFinite(n) && n >= 4 ? n : 8
}

export function rollDieFace(sides: number, rng: () => number = Math.random): number {
  const s = Math.max(2, Math.floor(sides))
  return 1 + Math.floor(rng() * s)
}
