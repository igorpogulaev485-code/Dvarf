/**
 * O-08: PHB actions (Dash / Disengage / Dodge / Help / Ready),
 * cover ½ / ¾ / total, condition → roll modes.
 * Names: 5e14 / PHB 2014.
 */

import type { ActiveEffect } from './activeEffects'
import { hasCondition, type ConditionRef } from './conditions'
import {
  applyFeatureSpend,
  canSpendFeature,
  markDashed,
  markDisengagedThisTurn,
  type TurnEconomyState,
  type TurnSpendResult,
} from './turnEconomy'
import { hasFeatFlag } from './b07FeatCombat'
import type { AppliedFeatGrant } from './featGrants'

export type O08RollMode = 'normal' | 'advantage' | 'disadvantage'

export type CoverLevel = 'none' | 'half' | 'three_quarters' | 'total'

export type ReadyKind = 'attack' | 'dash' | 'disengage' | 'dodge' | 'spell'

export const DASH_ACTION_HINT =
  'Рывок: действие · удваивает скорость в этот ход (без карты — отметка; Налётчик)'

export const DISENGAGE_ACTION_HINT =
  'Отход: действие · до конца хода выход из досягаемости не провоцирует (Страж на выходе — да)'

export const DODGE_ACTION_HINT =
  'Уклонение: действие · атаки по вам с помехой, спас Ловк. с преимуществом до вашего следующего хода'

export const HELP_ACTION_HINT =
  'Помощь: действие · союзник получает преимущество на одну проверку или атаку по выбранной цели'

export const READY_ACTION_HINT =
  'Подготовка: действие · задайте триггер и действие; срабатывает реакцией («Сработало»)'

export const READY_TRIGGER_HINT =
  'Когда триггер наступил — реакция выполняет подготовленное. Без реакции до вашего хода подготовка сгорает.'

export const COVER_HALF_HINT = 'Полуукрытие: +2 КД и +2 к спас Ловк.'
export const COVER_THREE_HINT = 'Укрытие на три четверти: +5 КД и +5 к спас Ловк.'
export const COVER_TOTAL_HINT =
  'Полное укрытие: цель нельзя выбрать атакой или заклинанием, требующим видимости'

/** Numeric AC / Dex-save bonus for half or ¾; total is not a bonus. */
export function coverNumericBonus(level: CoverLevel | null | undefined): number {
  if (level === 'half') return 2
  if (level === 'three_quarters') return 5
  return 0
}

export function readCoverLevel(raw: unknown): CoverLevel {
  if (raw === 'half' || raw === 'half_cover' || raw === '½') return 'half'
  if (
    raw === 'three_quarters' ||
    raw === 'three-quarters' ||
    raw === '3/4' ||
    raw === '¾'
  ) {
    return 'three_quarters'
  }
  if (raw === 'total' || raw === 'full' || raw === 'full_cover') return 'total'
  return 'none'
}

export function coverLabelRu(level: CoverLevel): string {
  if (level === 'half') return '½ укрытие'
  if (level === 'three_quarters') return '¾ укрытие'
  if (level === 'total') return 'полное укрытие'
  return 'без укрытия'
}

/** Fortified Position (artificer) already counts as half cover in effects. */
export function hasFortifiedHalfCover(effects: unknown): boolean {
  if (!Array.isArray(effects)) return false
  for (const row of effects) {
    if (!row || typeof row !== 'object') continue
    const e = row as ActiveEffect
    if (e.inactive) continue
    if (e.slug === 'fortified_position') return true
    for (const mod of e.mods ?? []) {
      if (
        mod.target === 'label' &&
        String(mod.condition || '') === 'fortified_position_half_cover'
      ) {
        return true
      }
      if (mod.target === 'ac' && String(mod.condition || '') === 'half_cover') {
        return true
      }
    }
  }
  return false
}

/**
 * Extra AC (or Dex save) to add on top of effects that already include
 * fortified half-cover. Takes the better of manual vs fortified; does not stack
 * the same grade twice.
 */
export function coverBonusBeyondEffects(opts: {
  cover: CoverLevel | null | undefined
  hasFortifiedHalfCover: boolean
}): number {
  const manual = coverNumericBonus(opts.cover)
  const fromFeat = opts.hasFortifiedHalfCover ? 2 : 0
  return Math.max(manual, fromFeat) - fromFeat
}

/** Effective cover grade after fortified half-cover. */
export function effectiveCoverLevel(opts: {
  cover: CoverLevel | null | undefined
  hasFortifiedHalfCover: boolean
}): CoverLevel {
  const c = opts.cover ?? 'none'
  if (c === 'total' || c === 'three_quarters') return c
  if (c === 'half' || opts.hasFortifiedHalfCover) return 'half'
  return 'none'
}

export type CoverIgnoreKind = 'none' | 'ranged_weapon' | 'spell_attack'

export function coverIgnoreKind(opts: {
  isRangedWeaponAttack: boolean
  isSpellAttack: boolean
  featGrants: AppliedFeatGrant[] | null | undefined
}): CoverIgnoreKind {
  if (opts.isRangedWeaponAttack && hasFeatFlag(opts.featGrants, 'sharpshooter')) {
    return 'ranged_weapon'
  }
  if (opts.isSpellAttack && hasFeatFlag(opts.featGrants, 'spell_sniper')) {
    return 'spell_attack'
  }
  return 'none'
}

/**
 * AC bonus of the target's cover as seen by this attacker.
 * Sharpshooter / Spell Sniper ignore half and ¾; total always blocks.
 */
export function coverAcForAttacker(opts: {
  cover: CoverLevel | null | undefined
  ignore: CoverIgnoreKind
}): { bonus: number; blocked: boolean; reason?: string } {
  const level = opts.cover ?? 'none'
  if (level === 'total') {
    return {
      bonus: 0,
      blocked: true,
      reason: COVER_TOTAL_HINT,
    }
  }
  if (level === 'none') return { bonus: 0, blocked: false }
  if (opts.ignore !== 'none') {
    return { bonus: 0, blocked: false }
  }
  return { bonus: coverNumericBonus(level), blocked: false }
}

export function canTargetWithCover(opts: {
  cover: CoverLevel | null | undefined
}): { ok: true } | { ok: false; reason: string } {
  if ((opts.cover ?? 'none') === 'total') {
    return { ok: false, reason: COVER_TOTAL_HINT }
  }
  return { ok: true }
}

/** Spell Sniper: double range note (map not required). */
export const SPELL_SNIPER_RANGE_HINT =
  'Заклинательный снайпер: дальность атакующих заклинаний удвоена; игнор ½ и ¾ укрытия'

export const SKULKER_HINT =
  'Скрытный: можно прятаться при полуукрытии; промах дальнобойной не снимает скрытность'

export function skulkerAllowsHideInHalfCover(hasSkulker: boolean): boolean {
  return Boolean(hasSkulker)
}

/** Miss on ranged should not strip hide/invisible when Skulker is taken. */
export function skulkerKeepsHiddenOnRangedMiss(opts: {
  hasSkulker: boolean
  isRangedAttack: boolean
  hit: boolean
}): boolean {
  return Boolean(opts.hasSkulker && opts.isRangedAttack && !opts.hit)
}

export function buildDodgeActionEffect(id?: string): ActiveEffect {
  return {
    id:
      id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dodge-${Date.now()}`),
    name: 'Уклонение',
    kind: 'feature',
    slug: 'dodge_action',
    duration: {
      unit: 'until_source_next_turn_end',
      value: 1,
      remaining_rounds: 1,
    },
    mods: [
      {
        target: 'disadvantage',
        op: 'disadvantage',
        condition: 'attacks_vs_you',
      },
      { target: 'save', op: 'advantage', condition: 'dex' },
      { target: 'label', op: 'set', condition: 'dodge' },
    ],
  }
}

export function buildHelpAdvantageEffect(opts: {
  id?: string
  sourceName?: string | null
  sourceCharacterId?: string | null
  againstTargetName?: string | null
  forAttack: boolean
}): ActiveEffect {
  const vs = opts.againstTargetName?.trim()
  const name = vs
    ? `Помощь · атака по ${vs}`
    : opts.forAttack
      ? 'Помощь · атака'
      : 'Помощь · проверка'
  return {
    id:
      opts.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `help-${Date.now()}`),
    name,
    kind: 'feature',
    slug: 'help_action',
    source_character_id: opts.sourceCharacterId ?? null,
    source_name: opts.sourceName ?? null,
    duration: {
      unit: 'until_source_next_turn_end',
      value: 1,
      remaining_rounds: 1,
    },
    mods: [
      {
        target: 'advantage',
        op: 'advantage',
        condition: opts.forAttack || vs ? 'attack' : 'check',
        once: true,
      },
      {
        target: 'label',
        op: 'set',
        condition: vs ? `help_vs_${vs}` : 'help_action',
      },
    ],
  }
}

export function effectHasDodge(effects: unknown): boolean {
  if (!Array.isArray(effects)) return false
  for (const row of effects) {
    if (!row || typeof row !== 'object') continue
    const e = row as ActiveEffect
    if (e.inactive) continue
    if (e.slug === 'dodge_action' || e.slug === 'patient_defense') return true
    for (const mod of e.mods ?? []) {
      if (mod.target === 'label' && String(mod.condition || '') === 'dodge') {
        return true
      }
    }
  }
  return false
}

export function conditionSlugs(
  conditions: Array<ConditionRef | { slug?: string; name?: string } | string> | null | undefined,
): string[] {
  const out: string[] = []
  for (const row of conditions ?? []) {
    if (typeof row === 'string' && row.trim()) {
      out.push(row.trim().toLowerCase())
      continue
    }
    if (!row || typeof row !== 'object') continue
    const slug =
      typeof (row as { slug?: string }).slug === 'string'
        ? (row as { slug: string }).slug.trim().toLowerCase()
        : ''
    const name =
      typeof (row as { name?: string }).name === 'string'
        ? (row as { name: string }).name.trim().toLowerCase()
        : ''
    if (slug) out.push(slug)
    else if (name) out.push(name)
  }
  return out
}

export function hasSlug(
  slugs: string[],
  ...want: string[]
): boolean {
  const set = new Set(slugs.map((s) => s.replace(/-/g, '_')))
  for (const w of want) {
    const n = w.replace(/-/g, '_').toLowerCase()
    if (set.has(n)) return true
    // Russian labels from seats
    if (n === 'poisoned' && [...set].some((s) => /отравлен/.test(s))) return true
    if (n === 'frightened' && [...set].some((s) => /испуган/.test(s))) return true
    if (n === 'blinded' && [...set].some((s) => /ослепл/.test(s))) return true
    if (n === 'prone' && [...set].some((s) => /опрокинут/.test(s))) return true
    if (n === 'restrained' && [...set].some((s) => /опутан/.test(s))) return true
    if (n === 'invisible' && [...set].some((s) => /невидим/.test(s))) return true
    if (n === 'paralyzed' && [...set].some((s) => /паралич|парализован/.test(s))) return true
    if (n === 'stunned' && [...set].some((s) => /ошеломл/.test(s))) return true
    if (n === 'unconscious' && [...set].some((s) => /бессознат/.test(s))) return true
    if (n === 'incapacitated' && [...set].some((s) => /недееспособ/.test(s))) return true
    if (n === 'grappled' && [...set].some((s) => /схвачен/.test(s))) return true
    if (n === 'deafened' && [...set].some((s) => /оглох|глух/.test(s))) return true
    if (n === 'petrified' && [...set].some((s) => /окаменен|окаменён/.test(s))) return true
  }
  return false
}

export function isIncapacitatedLike(
  conditions: ConditionRef[] | null | undefined,
): { blocked: boolean; reason: string } {
  const slugs = conditionSlugs(conditions)
  if (hasSlug(slugs, 'incapacitated')) {
    return { blocked: true, reason: 'Недееспособен — действия и реакции недоступны' }
  }
  if (hasSlug(slugs, 'paralyzed')) {
    return { blocked: true, reason: 'Парализован — недееспособен' }
  }
  if (hasSlug(slugs, 'stunned')) {
    return { blocked: true, reason: 'Ошеломлён — недееспособен' }
  }
  if (hasSlug(slugs, 'unconscious')) {
    return { blocked: true, reason: 'Без сознания — недееспособен' }
  }
  if (hasSlug(slugs, 'petrified')) {
    return { blocked: true, reason: 'Окаменел — недееспособен' }
  }
  return { blocked: false, reason: '' }
}

export type ConditionRollContext = {
  /** Attack you make. */
  rollKind: 'attack' | 'check' | 'save'
  abilityKey?: string | null
  skillKey?: string | null
  /** Melee vs ranged for prone/restrained asymmetry. */
  attackReach?: 'melee' | 'ranged' | null
  /** Frightened: source in sight (default true). */
  fearSourceVisible?: boolean
  /** Invisible: discovered strips your attack advantage / their dis. */
  invisibleDiscovered?: boolean
  /** Blinded: checks that rely only on sight fail / dis. */
  sightOnlyCheck?: boolean
  /** Deafened: hearing-only check. */
  hearingOnlyCheck?: boolean
  /** Attacking while you Dodge is N/A; this is for Dex saves. */
  canSeeAttacker?: boolean
}

export type ModeWithReasons = {
  mode: O08RollMode
  reasons: string[]
}

function pushAdv(acc: { adv: number; dis: number; reasons: string[] }, reason: string) {
  acc.adv += 1
  acc.reasons.push(reason)
}

function pushDis(acc: { adv: number; dis: number; reasons: string[] }, reason: string) {
  acc.dis += 1
  acc.reasons.push(reason)
}

function finalize(acc: { adv: number; dis: number; reasons: string[] }): ModeWithReasons {
  if (acc.adv > 0 && acc.dis > 0) return { mode: 'normal', reasons: acc.reasons }
  if (acc.adv > 0) return { mode: 'advantage', reasons: acc.reasons }
  if (acc.dis > 0) return { mode: 'disadvantage', reasons: acc.reasons }
  return { mode: 'normal', reasons: acc.reasons }
}

/** Your own conditions → mode for a roll you make. */
export function conditionModeForSelf(
  conditions: ConditionRef[] | null | undefined,
  ctx: ConditionRollContext,
): ModeWithReasons {
  const slugs = conditionSlugs(conditions)
  const acc = { adv: 0, dis: 0, reasons: [] as string[] }

  if (ctx.rollKind === 'attack' || ctx.rollKind === 'check') {
    if (hasSlug(slugs, 'poisoned')) {
      pushDis(acc, 'отравлен')
    }
    if (hasSlug(slugs, 'frightened') && ctx.fearSourceVisible !== false) {
      pushDis(acc, 'испуган (источник виден)')
    }
  }

  if (ctx.rollKind === 'attack') {
    if (hasSlug(slugs, 'blinded')) {
      pushDis(acc, 'ослеплён')
    }
    if (hasSlug(slugs, 'prone') && ctx.attackReach === 'melee') {
      pushDis(acc, 'опрокинут · рукопашная')
    }
    if (hasSlug(slugs, 'restrained')) {
      pushDis(acc, 'опутан')
    }
    if (hasSlug(slugs, 'invisible') && ctx.invisibleDiscovered !== true) {
      pushAdv(acc, 'невидим')
    }
  }

  if (ctx.rollKind === 'check') {
    if (hasSlug(slugs, 'blinded') && ctx.sightOnlyCheck) {
      pushDis(acc, 'ослеплён · проверка зрения провалена/помеха')
    }
    if (hasSlug(slugs, 'deafened') && ctx.hearingOnlyCheck) {
      pushDis(acc, 'оглохший · проверка слуха')
    }
  }

  if (ctx.rollKind === 'save') {
    const ab = (ctx.abilityKey || '').toLowerCase()
    if (hasSlug(slugs, 'restrained') && ab === 'dex') {
      pushDis(acc, 'опутан · спас Ловк.')
    }
    if (
      (hasSlug(slugs, 'paralyzed') || hasSlug(slugs, 'unconscious') || hasSlug(slugs, 'petrified')) &&
      (ab === 'str' || ab === 'dex')
    ) {
      pushDis(acc, 'спас Сил./Ловк. провален (паралич/без сознания)')
    }
  }

  return finalize(acc)
}

/**
 * Target's conditions / dodge → mode when you attack them.
 * Also used for "attacks vs you" from the attacker's side (pass your conditions as target).
 */
export function conditionModeVsTarget(opts: {
  targetConditions?: ConditionRef[] | Array<{ slug?: string; name?: string }> | string[] | null
  targetDodging?: boolean
  attackReach: 'melee' | 'ranged'
  /** Auto-crit when paralyzed/unconscious and within 5 ft. */
  within5ft?: boolean
  invisibleDiscovered?: boolean
}): ModeWithReasons & { autoCrit?: boolean; autoCritReason?: string } {
  const slugs = conditionSlugs(opts.targetConditions as ConditionRef[])
  const acc = { adv: 0, dis: 0, reasons: [] as string[] }

  if (opts.targetDodging) {
    pushDis(acc, 'цель уклоняется')
  }

  if (hasSlug(slugs, 'blinded')) {
    pushAdv(acc, 'цель ослеплена')
  }
  if (hasSlug(slugs, 'restrained')) {
    pushAdv(acc, 'цель опутана')
  }
  if (hasSlug(slugs, 'paralyzed') || hasSlug(slugs, 'unconscious') || hasSlug(slugs, 'petrified')) {
    pushAdv(acc, 'цель парализована/без сознания')
  }
  if (hasSlug(slugs, 'invisible') && opts.invisibleDiscovered !== true) {
    pushDis(acc, 'цель невидима')
  }

  if (hasSlug(slugs, 'prone')) {
    if (opts.attackReach === 'melee') pushAdv(acc, 'цель опрокинута · рукопашная')
    else pushDis(acc, 'цель опрокинута · дальнобойная')
  }

  const base = finalize(acc)
  const autoCrit =
    Boolean(opts.within5ft) &&
    (hasSlug(slugs, 'paralyzed') ||
      hasSlug(slugs, 'unconscious') ||
      hasSlug(slugs, 'petrified'))
  return {
    ...base,
    ...(autoCrit
      ? { autoCrit: true, autoCritReason: 'автокрит · в 5 фт по парализованному/без сознания' }
      : {}),
  }
}

/** Merge desk / effect / condition modes (PHB cancel). */
export function mergeRollModes(
  ...modes: Array<O08RollMode | null | undefined>
): O08RollMode {
  let adv = 0
  let dis = 0
  for (const m of modes) {
    if (m === 'advantage') adv += 1
    if (m === 'disadvantage') dis += 1
  }
  if (adv > 0 && dis > 0) return 'normal'
  if (adv > 0) return 'advantage'
  if (dis > 0) return 'disadvantage'
  return 'normal'
}

export function canDashAction(state: TurnEconomyState): TurnSpendResult {
  return canSpendFeature(state, 'action')
}

export function applyDashAction(state: TurnEconomyState): TurnEconomyState {
  if (!canDashAction(state).ok) return state
  return markDashed(applyFeatureSpend(state, 'action'))
}

export function canDisengageAction(state: TurnEconomyState): TurnSpendResult {
  return canSpendFeature(state, 'action')
}

export function applyDisengageAction(state: TurnEconomyState): TurnEconomyState {
  if (!canDisengageAction(state).ok) return state
  return markDisengagedThisTurn(applyFeatureSpend(state, 'action'))
}

export function canDodgeAction(state: TurnEconomyState): TurnSpendResult {
  return canSpendFeature(state, 'action')
}

export function canHelpAction(state: TurnEconomyState): TurnSpendResult {
  return canSpendFeature(state, 'action')
}

export function canReadyAction(state: TurnEconomyState): TurnSpendResult {
  return canSpendFeature(state, 'action')
}

export type ReadyState = {
  prepared: boolean
  trigger: string
  kind: ReadyKind | null
  spellId?: string | null
  spellName?: string | null
  spellLevel?: number | null
}

export function emptyReadyState(): ReadyState {
  return {
    prepared: false,
    trigger: '',
    kind: null,
    spellId: null,
    spellName: null,
    spellLevel: null,
  }
}

export function applyReadyPrepare(
  state: TurnEconomyState,
  ready: ReadyState,
): { state: TurnEconomyState; ready: ReadyState } {
  if (!canReadyAction(state).ok) {
    return { state, ready: emptyReadyState() }
  }
  return {
    state: applyFeatureSpend(state, 'action'),
    ready: {
      prepared: true,
      trigger: ready.trigger.trim(),
      kind: ready.kind,
      spellId: ready.spellId ?? null,
      spellName: ready.spellName ?? null,
      spellLevel: ready.spellLevel ?? null,
    },
  }
}

export function canTriggerReady(
  state: TurnEconomyState,
  ready: ReadyState | null | undefined,
): TurnSpendResult {
  if (!ready?.prepared || !ready.kind) {
    return { ok: false, reason: 'Нет подготовленного действия', mark: 'reaction' }
  }
  return canSpendFeature(state, 'reaction')
}

export function speedZeroFromConditions(
  conditions: ConditionRef[] | null | undefined,
): boolean {
  const slugs = conditionSlugs(conditions)
  return (
    hasSlug(slugs, 'grappled') ||
    hasSlug(slugs, 'restrained') ||
    hasSlug(slugs, 'paralyzed') ||
    hasSlug(slugs, 'petrified') ||
    hasSlug(slugs, 'unconscious') ||
    hasSlug(slugs, 'stunned')
  )
}

export function frightenedApproachNote(
  conditions: ConditionRef[] | null | undefined,
  fearSourceVisible = true,
): string | null {
  if (!fearSourceVisible) return null
  if (!hasCondition(conditions ?? [], 'frightened') && !hasSlug(conditionSlugs(conditions), 'frightened')) {
    return null
  }
  return 'Испуган: не может сознательно подойти ближе к источнику страха'
}

export function proneStandNote(): string {
  return 'Встал, потратил половину скорости'
}

/** Perception (sight) skill key helpers. */
export function isSightReliantSkill(skillKey: string | null | undefined): boolean {
  const k = (skillKey || '').toLowerCase()
  return k === 'perception' || k === 'investigation' || k === 'внимательность' || k === 'анализ'
}

export function isHearingReliantSkill(skillKey: string | null | undefined): boolean {
  const k = (skillKey || '').toLowerCase()
  return k === 'perception' || k === 'внимательность'
}
