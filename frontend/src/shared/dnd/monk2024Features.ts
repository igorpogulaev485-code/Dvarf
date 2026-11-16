/**
 * Monk 2024 (PHB): Monk's Focus / Focus Points, techniques, Uncanny Metabolism,
 * Deflect, Stunning Strike, subclass helpers (Hand / Shadow / Mercy / Elements).
 *
 * Callers branch on `rules_edition === '2024'`; nothing here feeds the 2014 pack.
 * Russian names follow next.dnd.su (not short summary_ru cards / not 2014 «Ки»).
 */

import { parseFeatureResourceId } from './featureResources'
import { clampResource, type SheetResource } from './rest'
import { getFeaturePick, setFeaturePick, type FeaturePicksState } from './featurePicks'

export const FOCUS_POINTS_NAME_RU = 'Очки сосредоточенности'
export const FOCUS_POINTS_POOL_ID = 'focus_points'

export const MONKS_FOCUS_NAME_RU = 'Монашеская сосредоточенность'
export const FLURRY_OF_BLOWS_NAME_RU = 'Шквал ударов'
export const PATIENT_DEFENSE_NAME_RU = 'Терпеливая защита'
export const STEP_OF_THE_WIND_NAME_RU = 'Поступь ветра'
export const UNCANNY_METABOLISM_NAME_RU = 'Феноменальный метаболизм'
export const DEFLECT_ATTACKS_NAME_RU = 'Отражение атак'
export const STUNNING_STRIKE_NAME_RU = 'Ошеломляющий удар'
export const EVASION_NAME_RU = 'Увёртливость'
export const ACROBATIC_MOVEMENT_NAME_RU = 'Движение акробата'
export const HEIGHTENED_FOCUS_NAME_RU = 'Повышенная сосредоточенность'
export const SELF_RESTORATION_NAME_RU = 'Восстановление себя'
export const DEFLECT_ENERGY_NAME_RU = 'Отражение энергии'
export const DISCIPLINED_SURVIVOR_NAME_RU = 'Дисциплина сохранения'
export const PERFECT_FOCUS_NAME_RU = 'Полная сосредоточенность'
export const SUPERIOR_DEFENSE_NAME_RU = 'Совершенная защита'
export const BODY_AND_MIND_NAME_RU = 'Тело и разум'
export const SLOW_FALL_NAME_RU = 'Медленное падение'
export const EMPOWERED_STRIKES_NAME_RU = 'Усиленные удары'

export const MONKS_FOCUS_FEATURE_ID = 'monks-focus'
export const FLURRY_OF_BLOWS_FEATURE_ID = 'flurry-of-blows'
export const PATIENT_DEFENSE_FEATURE_ID = 'patient-defense'
export const STEP_OF_THE_WIND_FEATURE_ID = 'step-of-the-wind'
export const UNCANNY_METABOLISM_FEATURE_ID = 'uncanny-metabolism'
export const DEFLECT_ATTACKS_FEATURE_ID = 'deflect-attacks'
export const DEFLECT_ENERGY_FEATURE_ID = 'deflect-energy'
export const STUNNING_STRIKE_FEATURE_ID = 'stunning-strike'
export const SLOW_FALL_FEATURE_ID = 'slow-fall'
export const SUPERIOR_DEFENSE_FEATURE_ID = 'superior-defense'
export const DISCIPLINED_SURVIVOR_FEATURE_ID = 'disciplined-survivor'
export const SELF_RESTORATION_FEATURE_ID = 'self-restoration'
export const EMPOWERED_STRIKES_FEATURE_ID = 'empowered-strikes'
export const PERFECT_FOCUS_FEATURE_ID = 'perfect-focus'
export const BODY_AND_MIND_FEATURE_ID = 'body-and-mind'
export const HEIGHTENED_FOCUS_FEATURE_ID = 'heightened-focus'
export const EVASION_FEATURE_ID = 'evasion'
export const ACROBATIC_MOVEMENT_FEATURE_ID = 'acrobatic-movement'

export const OPEN_HAND_TECHNIQUE_FEATURE_ID = 'open-hand-technique'
export const WHOLENESS_OF_BODY_FEATURE_ID = 'wholeness-of-body'
export const QUIVERING_PALM_FEATURE_ID = 'quivering-palm'
export const SHADOW_ARTS_FEATURE_ID = 'shadow-arts'
export const SHADOW_STEP_FEATURE_ID = 'shadow-step'
export const IMPROVED_SHADOW_STEP_FEATURE_ID = 'improved-shadow-step'
export const CLOAK_OF_SHADOWS_FEATURE_ID = 'cloak-of-shadows'
export const HAND_OF_HEALING_FEATURE_ID = 'hand-of-healing'
export const HAND_OF_HARM_FEATURE_ID = 'hand-of-harm'
export const FLURRY_HEALING_HARM_FEATURE_ID = 'flurry-of-healing-and-harm'
export const HAND_OF_ULTIMATE_MERCY_FEATURE_ID = 'hand-of-ultimate-mercy'
export const ELEMENTAL_ATTUNEMENT_FEATURE_ID = 'elemental-attunement'
export const ELEMENTAL_BURST_FEATURE_ID = 'elemental-burst'
export const ELEMENTAL_EPITOME_FEATURE_ID = 'elemental-epitome'

export const OPEN_HAND_TECHNIQUES_2024 = [
  {
    id: 'addled',
    nameRu: 'Запутать',
    summaryRu: 'Цель не может совершать Провоцированные атаки до начала своего следующего хода.',
  },
  {
    id: 'push',
    nameRu: 'Толкнуть',
    summaryRu: 'Толкнуть до 15 фт., если не преуспеет в спасброске Силы.',
  },
  {
    id: 'topple',
    nameRu: 'Опрокинуть',
    summaryRu: 'Состояние Опрокинутый, если не преуспеет в спасброске Ловкости.',
  },
] as const

export const SELF_RESTORATION_CONDITIONS_2024 = [
  { id: 'frightened', nameRu: 'Испуганный' },
  { id: 'poisoned', nameRu: 'Отравленный' },
  { id: 'charmed', nameRu: 'Очарованный' },
] as const

export const ELEMENTAL_DAMAGE_TYPES_2024 = [
  { id: 'thunder', nameRu: 'Звук' },
  { id: 'acid', nameRu: 'Кислота' },
  { id: 'fire', nameRu: 'Огонь' },
  { id: 'cold', nameRu: 'Холод' },
  { id: 'lightning', nameRu: 'Электричество' },
] as const

export const CLOAK_OF_SHADOWS_PICK_KEY = 'cloak_of_shadows_active'
export const EMPOWERED_STRIKES_PICK_KEY = 'empowered_strikes_force'
export const ELEMENTAL_ATTUNEMENT_PICK_KEY = 'elemental_attunement_active'
export const ELEMENTAL_EPITOME_RESIST_PICK_KEY = 'elemental_epitome_resist'
export const STUNNING_STRIKE_TURN_PICK_KEY = 'stunning_strike_used_this_turn'
export const QUIVERING_PALM_PICK_KEY = 'quivering_palm_target'

export type Monk2024Flags = {
  rulesEdition: '2024'
  monkLevel: number
  hasHeightenedFocus: boolean
  hasPerfectFocus: boolean
  hasBodyAndMind: boolean
  cloakOfShadowsActive: boolean
}

export function isMonkClassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return key === '' || key === 'monk' || /монах/.test(key)
}

export function monk2024Context(input: {
  rulesEdition: string | null | undefined
  monkLevel: number
  cloakOfShadowsActive?: boolean
}): Monk2024Flags | null {
  if (input.rulesEdition !== '2024') return null
  const level = Math.max(0, Math.floor(input.monkLevel || 0))
  if (level < 1) return null
  return {
    rulesEdition: '2024',
    monkLevel: level,
    hasHeightenedFocus: level >= 10,
    hasPerfectFocus: level >= 15,
    hasBodyAndMind: level >= 20,
    cloakOfShadowsActive: Boolean(input.cloakOfShadowsActive),
  }
}

/** Focus Points max = monk level from 2; 0 below. */
export function focusPointsMax2024(level: number): number {
  const lv = Math.max(0, Math.floor(level || 0))
  return lv >= 2 ? lv : 0
}

/** Martial Arts die label with Cyrillic «к». */
export function martialArtsDie2024(level: number): string {
  const lv = Math.max(0, Math.floor(level || 0))
  if (lv >= 17) return '1к12'
  if (lv >= 11) return '1к10'
  if (lv >= 5) return '1к8'
  if (lv >= 1) return '1к6'
  return '1к6'
}

export function martialArtsDieSides2024(level: number): number {
  const label = martialArtsDie2024(level)
  const m = /к(\d+)/.exec(label)
  return m ? Number(m[1]) : 6
}

/** Unarmored Movement bonus in feet. */
export function unarmoredMovementBonusFt2024(level: number): number {
  const lv = Math.max(0, Math.floor(level || 0))
  if (lv < 2) return 0
  if (lv >= 18) return 30
  if (lv >= 14) return 25
  if (lv >= 10) return 20
  if (lv >= 6) return 15
  return 10
}

export function focusSaveDc2024(proficiencyBonus: number, wisMod: number): number {
  return 8 + Math.floor(proficiencyBonus || 0) + Math.floor(wisMod || 0)
}

/** Flurry unarmed strike count (Heightened Focus at 10). */
export function flurryStrikeCount2024(level: number): number {
  return Math.max(0, Math.floor(level || 0)) >= 10 ? 3 : 2
}

export function bodyAndMindAbilityBonus2024(level: number): {
  dex: number
  wis: number
  cap: number
} {
  if (Math.max(0, Math.floor(level || 0)) >= 20) {
    return { dex: 4, wis: 4, cap: 25 }
  }
  return { dex: 0, wis: 0, cap: 0 }
}

/** Slow Fall: reduce fall damage by level × 5. */
export function slowFallReduce2024(level: number): number {
  return Math.max(0, Math.floor(level || 0)) * 5
}

/** Patient Defense paid (L10+): temporary HP = 2 × Martial Arts die. */
export function patientDefenseTempHpDice2024(level: number): string | null {
  if (Math.max(0, Math.floor(level || 0)) < 10) return null
  const sides = martialArtsDieSides2024(level)
  return `2к${sides}`
}

export function isCloakOfShadowsActive(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
): boolean {
  return getFeaturePick(picks ?? { values: {} }, classEntryId, CLOAK_OF_SHADOWS_PICK_KEY) === 'on'
}

/** Card buttons on ClassFeaturesPanel (edition 2024 only). */
export const MONK_2024_CARD_BUTTONS: Record<string, string> = {
  'monks-focus': 'Техники…',
  monks_focus: 'Техники…',
  'flurry-of-blows': 'Шквал…',
  flurry_of_blows: 'Шквал…',
  'patient-defense': 'Защита…',
  patient_defense: 'Защита…',
  'step-of-the-wind': 'Поступь…',
  step_of_the_wind: 'Поступь…',
  'uncanny-metabolism': 'Метаболизм…',
  uncanny_metabolism: 'Метаболизм…',
  'perfect-focus': 'Полная сосредоточенность…',
  perfect_focus: 'Полная сосредоточенность…',
  'deflect-attacks': 'Отразить…',
  deflect_attacks: 'Отразить…',
  'deflect-energy': 'Отразить энергию…',
  deflect_energy: 'Отразить энергию…',
  'stunning-strike': 'Ошеломить…',
  stunning_strike: 'Ошеломить…',
  'slow-fall': 'Медленное падение…',
  slow_fall: 'Медленное падение…',
  'superior-defense': 'Совершенная защита…',
  superior_defense: 'Совершенная защита…',
  'disciplined-survivor': 'Перебросить спас…',
  disciplined_survivor: 'Перебросить спас…',
  'self-restoration': 'Снять состояние…',
  self_restoration: 'Снять состояние…',
  'empowered-strikes': 'Тип урона…',
  empowered_strikes: 'Тип урона…',
  'heightened-focus': 'Повышенная (правило)',
  heightened_focus: 'Повышенная (правило)',
  evasion: 'Увёртливость (правило)',
  'acrobatic-movement': 'Движение акробата (правило)',
  acrobatic_movement: 'Движение акробата (правило)',
  'body-and-mind': 'Тело и разум (правило)',
  body_and_mind: 'Тело и разум (правило)',
  'open-hand-technique': 'Техника ладони…',
  open_hand_technique: 'Техника ладони…',
  'wholeness-of-body': 'Целостность…',
  wholeness_of_body: 'Целостность…',
  'quivering-palm': 'Дрожащая ладонь…',
  quivering_palm: 'Дрожащая ладонь…',
  'shadow-arts': 'Тёмные искусства…',
  shadow_arts: 'Тёмные искусства…',
  'shadow-step': 'Шаг в тень…',
  shadow_step: 'Шаг в тень…',
  'improved-shadow-step': 'Улучшенный шаг…',
  improved_shadow_step: 'Улучшенный шаг…',
  'cloak-of-shadows': 'Покров теней…',
  cloak_of_shadows: 'Покров теней…',
  'hand-of-healing': 'Исцеляющая рука…',
  hand_of_healing: 'Исцеляющая рука…',
  'hand-of-harm': 'Повреждающая рука…',
  hand_of_harm: 'Повреждающая рука…',
  'flurry-of-healing-and-harm': 'Шквал исцеления…',
  flurry_of_healing_and_harm: 'Шквал исцеления…',
  'hand-of-ultimate-mercy': 'Абсолютное милосердие…',
  hand_of_ultimate_mercy: 'Абсолютное милосердие…',
  'elemental-attunement': 'Сродство…',
  elemental_attunement: 'Сродство…',
  'elemental-burst': 'Стихийный выброс…',
  elemental_burst: 'Стихийный выброс…',
  'elemental-epitome': 'Воплощение стихий…',
  elemental_epitome: 'Воплощение стихий…',
}

const USE_FEATURE_ALIASES: Record<string, string> = {
  'monks-focus': 'monks-focus',
  'flurry-of-blows': 'flurry-of-blows',
  'patient-defense': 'patient-defense',
  'step-of-the-wind': 'step-of-the-wind',
  'uncanny-metabolism': 'uncanny-metabolism',
  'perfect-focus': 'perfect-focus',
  'deflect-attacks': 'deflect-attacks',
  'deflect-energy': 'deflect-energy',
  'stunning-strike': 'stunning-strike',
  'slow-fall': 'slow-fall',
  'superior-defense': 'superior-defense',
  'disciplined-survivor': 'disciplined-survivor',
  'self-restoration': 'self-restoration',
  'empowered-strikes': 'empowered-strikes',
  'heightened-focus': 'heightened-focus',
  evasion: 'evasion',
  'acrobatic-movement': 'acrobatic-movement',
  'body-and-mind': 'body-and-mind',
  'open-hand-technique': 'open-hand-technique',
  'wholeness-of-body': 'wholeness-of-body',
  'quivering-palm': 'quivering-palm',
  'shadow-arts': 'shadow-arts',
  'shadow-step': 'shadow-step',
  'improved-shadow-step': 'improved-shadow-step',
  'cloak-of-shadows': 'cloak-of-shadows',
  'hand-of-healing': 'hand-of-healing',
  'hand-of-harm': 'hand-of-harm',
  'flurry-of-healing-and-harm': 'flurry-of-healing-and-harm',
  'hand-of-ultimate-mercy': 'hand-of-ultimate-mercy',
  'elemental-attunement': 'elemental-attunement',
  'elemental-burst': 'elemental-burst',
  'elemental-epitome': 'elemental-epitome',
  // Shared pool click → techniques dialog
  focus_points: 'monks-focus',
  'focus-points': 'monks-focus',
}

export function monk2024UseFeatureId(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.replace(/_/g, '-')
  return USE_FEATURE_ALIASES[key] ?? USE_FEATURE_ALIASES[featureId] ?? null
}

export function findFocusResource(
  resources: SheetResource[],
  poolHints: string[] = [FOCUS_POINTS_POOL_ID],
): SheetResource | null {
  for (const hint of poolHints) {
    const hit = resources.find(
      (r) =>
        parseFeatureResourceId(r.id)?.poolId === hint ||
        r.id.includes(`:${hint}:`) ||
        r.id.includes(':ki:') ||
        /очк.*сосредоточен|focus.?points|очк.*\bки\b|^ки$|^ци$/i.test(r.name),
    )
    if (hit) return hit
  }
  return (
    resources.find(
      (r) =>
        r.id.includes(':ki:') ||
        /очк.*сосредоточен|focus.?points/i.test(r.name) ||
        /^(ки|ци)$/i.test(r.name.trim()),
    ) ?? null
  )
}

export function findUncannyMetabolismResource(resources: SheetResource[]): SheetResource | null {
  return (
    resources.find(
      (r) =>
        parseFeatureResourceId(r.id)?.poolId === 'uncanny_metabolism' ||
        r.id.includes(':uncanny_metabolism') ||
        /феноменальн.*метаболизм/i.test(r.name),
    ) ?? null
  )
}

export function findWholenessOfBodyResource(resources: SheetResource[]): SheetResource | null {
  return (
    resources.find(
      (r) =>
        parseFeatureResourceId(r.id)?.poolId === 'wholeness_of_body' ||
        r.id.includes(':wholeness_of_body') ||
        /целостность тела/i.test(r.name),
    ) ?? null
  )
}

export function findFlurryHealingHarmResource(resources: SheetResource[]): SheetResource | null {
  return (
    resources.find(
      (r) =>
        parseFeatureResourceId(r.id)?.poolId === 'flurry_of_healing_and_harm' ||
        r.id.includes(':flurry_of_healing_and_harm') ||
        /шквал исцеления/i.test(r.name),
    ) ?? null
  )
}

export function findHandOfUltimateMercyResource(resources: SheetResource[]): SheetResource | null {
  return (
    resources.find(
      (r) =>
        parseFeatureResourceId(r.id)?.poolId === 'hand_of_ultimate_mercy' ||
        r.id.includes(':hand_of_ultimate_mercy') ||
        /абсолютн.*милосерд/i.test(r.name),
    ) ?? null
  )
}

function normFeatureId(featureId: string): string {
  return featureId.replace(/_/g, '-')
}

function patchRow(
  resources: SheetResource[],
  id: string,
  patch: (row: SheetResource) => SheetResource,
): SheetResource[] {
  return resources.map((row) => (row.id === id ? clampResource(patch(row)) : row))
}

/** Patch focus_points used count for a class entry (or first matching pool). */
export function patchFocusUsed(
  resources: SheetResource[],
  classEntryId: string,
  focusUsed: number,
): SheetResource[] {
  let matched = false
  const next = resources.map((row) => {
    const parsed = parseFeatureResourceId(row.id)
    if (parsed?.poolId === FOCUS_POINTS_POOL_ID && parsed.classEntryId === classEntryId) {
      matched = true
      return clampResource({ ...row, used: Math.max(0, Math.min(row.max, focusUsed)) })
    }
    return row
  })
  if (matched) return next
  const fallback = findFocusResource(resources)
  if (!fallback) return resources
  return patchRow(resources, fallback.id, (row) => ({
    ...row,
    used: Math.max(0, Math.min(row.max, focusUsed)),
  }))
}

export function spendFocusPoints(
  resources: SheetResource[],
  classEntryId: string,
  cost: number,
): { ok: true; resources: SheetResource[]; focusUsed: number; remaining: number } | { ok: false; reasonRu: string } {
  const row = findFocusResource(resources)
  if (!row) return { ok: false, reasonRu: 'Ресурс «Очки сосредоточенности» не найден' }
  const remaining = Math.max(0, row.max - row.used)
  const need = Math.max(0, Math.floor(cost))
  if (remaining < need) {
    return { ok: false, reasonRu: `Нужно ${need} очк. сосредоточенности (есть ${remaining})` }
  }
  const focusUsed = row.used + need
  return {
    ok: true,
    resources: patchFocusUsed(resources, classEntryId, focusUsed),
    focusUsed,
    remaining: remaining - need,
  }
}

export function returnFocusPoints(
  resources: SheetResource[],
  classEntryId: string,
  amount: number,
): { ok: true; resources: SheetResource[]; focusUsed: number } | { ok: false; reasonRu: string } {
  const row = findFocusResource(resources)
  if (!row) return { ok: false, reasonRu: 'Ресурс «Очки сосредоточенности» не найден' }
  const regain = Math.max(0, Math.min(row.used, Math.floor(amount)))
  const focusUsed = row.used - regain
  return {
    ok: true,
    resources: patchFocusUsed(resources, classEntryId, focusUsed),
    focusUsed,
  }
}

export function restoreFocusToAmount(
  resources: SheetResource[],
  classEntryId: string,
  targetRemaining: number,
): { ok: true; resources: SheetResource[]; focusUsed: number; regained: number } | { ok: false; reasonRu: string } {
  const row = findFocusResource(resources)
  if (!row) return { ok: false, reasonRu: 'Ресурс «Очки сосредоточенности» не найден' }
  const currentRemaining = Math.max(0, row.max - row.used)
  const want = Math.max(0, Math.min(row.max, Math.floor(targetRemaining)))
  if (currentRemaining >= want) {
    return { ok: true, resources, focusUsed: row.used, regained: 0 }
  }
  const focusUsed = Math.max(0, row.max - want)
  return {
    ok: true,
    resources: patchFocusUsed(resources, classEntryId, focusUsed),
    focusUsed,
    regained: want - currentRemaining,
  }
}

function poolRow(
  input: { resourceId: string | null; resources: SheetResource[]; classEntryId: string },
  poolId: string,
): SheetResource | null {
  if (input.resourceId) {
    const byId = input.resources.find((row) => row.id === input.resourceId)
    if (byId) return byId
  }
  return (
    input.resources.find((row) => {
      const parsed = parseFeatureResourceId(row.id)
      return parsed?.poolId === poolId && parsed.classEntryId === input.classEntryId
    }) ??
    input.resources.find((row) => parseFeatureResourceId(row.id)?.poolId === poolId) ??
    null
  )
}

export type Monk2024UseInput = {
  featureId: string
  resourceId: string | null
  resources: SheetResource[]
  classEntryId: string
  monkLevel: number
  focusUsed?: number
  focusMax?: number
  mode?: string | null
  /** open-hand technique id; shadow-arts spell; elemental type; self-restoration condition */
  choice?: string | null
  target?: string | null
  amount?: number | null
  /** Deflect: incoming damage before reduction (informational). */
  damage?: number | null
  featurePicks?: FeaturePicksState | null
  /** Cloak of Shadows already active (free flurry). */
  cloakOfShadowsActive?: boolean
  /** Metabolism already used this long rest (blocks perfect-focus? no — perfect requires metabolism NOT used). */
  metabolismUsed?: boolean
  wisMod?: number
}

export type MonkFeatureUseResult = {
  ok: boolean
  message: string
  resources: SheetResource[]
  featurePicks: FeaturePicksState | null
  concentrationName: string | null
  activeLabels: string[]
  /** Dice expression for temp HP / heal (e.g. «2к8», «1к8»). */
  diceExpression?: string | null
  /** Heal amount formula note (MA + level). */
  healNoteRu?: string | null
  /** Slow fall reduction. */
  fallReduce?: number
  focusCost?: number
  strikeCount?: number
}

function done(
  input: Monk2024UseInput,
  message: string,
  extra: Partial<MonkFeatureUseResult> = {},
): MonkFeatureUseResult {
  return {
    ok: true,
    message,
    resources: input.resources,
    featurePicks: input.featurePicks ?? null,
    concentrationName: null,
    activeLabels: [],
    ...extra,
  }
}

function refuse(input: Monk2024UseInput, message: string): MonkFeatureUseResult {
  return { ...done(input, message), ok: false }
}

function focusSnapshot(input: Monk2024UseInput): { used: number; max: number; remaining: number } {
  const row = findFocusResource(input.resources)
  const max = row?.max ?? input.focusMax ?? focusPointsMax2024(input.monkLevel)
  const used = row?.used ?? Math.max(0, input.focusUsed ?? 0)
  return { used, max, remaining: Math.max(0, max - used) }
}

export function applyMonk2024FeatureUse(input: Monk2024UseInput): MonkFeatureUseResult {
  const resolved = monk2024UseFeatureId(input.featureId) ?? normFeatureId(input.featureId)
  const fid = resolved
  const level = Math.max(0, Math.floor(input.monkLevel || 0))
  const picks = input.featurePicks ?? { values: {} }
  const cloakActive =
    Boolean(input.cloakOfShadowsActive) || isCloakOfShadowsActive(picks, input.classEntryId)
  const maDie = martialArtsDie2024(level)
  const focus = focusSnapshot(input)

  switch (fid) {
    case 'monks-focus': {
      // Route to a technique when mode is set; otherwise explain.
      const technique = (input.mode ?? '').replace(/_/g, '-')
      if (
        technique === 'flurry-of-blows' ||
        technique === 'patient-defense' ||
        technique === 'step-of-the-wind'
      ) {
        return applyMonk2024FeatureUse({ ...input, featureId: technique })
      }
      return done(
        input,
        `${MONKS_FOCUS_NAME_RU}: ${FLURRY_OF_BLOWS_NAME_RU}, ${PATIENT_DEFENSE_NAME_RU}, ${STEP_OF_THE_WIND_NAME_RU}. Выбери технику.`,
      )
    }

    case 'flurry-of-blows': {
      const strikes = flurryStrikeCount2024(level)
      const free = cloakActive
      const cost = free ? 0 : 1
      if (!free) {
        const spent = spendFocusPoints(input.resources, input.classEntryId, cost)
        if (!spent.ok) return refuse(input, spent.reasonRu)
        return done(
          input,
          `${FLURRY_OF_BLOWS_NAME_RU}: ${strikes} безоружных удара (−${cost} очк.)`,
          {
            resources: spent.resources,
            focusCost: cost,
            strikeCount: strikes,
          },
        )
      }
      return done(
        input,
        `${FLURRY_OF_BLOWS_NAME_RU}: ${strikes} безоружных удара (Покров теней — без траты очков)`,
        { focusCost: 0, strikeCount: strikes },
      )
    }

    case 'patient-defense': {
      const paid = input.mode === 'paid' || input.mode === 'focus'
      if (!paid) {
        return done(input, `${PATIENT_DEFENSE_NAME_RU} (бесплатно): Отход бонусным действием.`, {
          focusCost: 0,
        })
      }
      const spent = spendFocusPoints(input.resources, input.classEntryId, 1)
      if (!spent.ok) return refuse(input, spent.reasonRu)
      const tempDice = patientDefenseTempHpDice2024(level)
      return done(
        input,
        tempDice
          ? `${PATIENT_DEFENSE_NAME_RU} (очко): Отход + Уклонение; врем. хиты ${tempDice} (−1 очк.)`
          : `${PATIENT_DEFENSE_NAME_RU} (очко): Отход + Уклонение (−1 очк.)`,
        {
          resources: spent.resources,
          focusCost: 1,
          diceExpression: tempDice,
        },
      )
    }

    case 'step-of-the-wind': {
      const paid = input.mode === 'paid' || input.mode === 'focus'
      if (!paid) {
        return done(input, `${STEP_OF_THE_WIND_NAME_RU} (бесплатно): Рывок бонусным действием.`, {
          focusCost: 0,
        })
      }
      const spent = spendFocusPoints(input.resources, input.classEntryId, 1)
      if (!spent.ok) return refuse(input, spent.reasonRu)
      const takeCreature = level >= 10 && Boolean(input.choice === 'creature' || input.target)
      const creatureNote = takeCreature
        ? ` перемещаешь ${input.target?.trim() || 'существо'} с собой`
        : ''
      return done(
        input,
        `${STEP_OF_THE_WIND_NAME_RU} (очко): Отход + Рывок; прыжки ×2${creatureNote} (−1 очк.)`,
        { resources: spent.resources, focusCost: 1 },
      )
    }

    case 'uncanny-metabolism': {
      if (level < 2) return refuse(input, `${UNCANNY_METABOLISM_NAME_RU} с 2 уровня`)
      const row =
        poolRow(input, 'uncanny_metabolism') ?? findUncannyMetabolismResource(input.resources)
      if (row && row.used >= row.max) {
        return refuse(input, `${UNCANNY_METABOLISM_NAME_RU} уже использован (до долгого отдыха)`)
      }
      if (input.metabolismUsed && !row) {
        return refuse(input, `${UNCANNY_METABOLISM_NAME_RU} уже использован (до долгого отдыха)`)
      }
      let resources = returnFocusPoints(input.resources, input.classEntryId, focus.used)
      if (!resources.ok) return refuse(input, resources.reasonRu)
      if (row) {
        resources = {
          ok: true,
          resources: patchRow(resources.resources, row.id, (item) => ({
            ...item,
            used: item.used + 1,
          })),
          focusUsed: resources.focusUsed,
        }
      }
      const healExpr = `${maDie}+${level}`
      return done(
        input,
        `${UNCANNY_METABOLISM_NAME_RU} (инициатива): все очки восстановлены; лечение ${healExpr}`,
        {
          resources: resources.resources,
          diceExpression: maDie,
          healNoteRu: healExpr,
        },
      )
    }

    case 'perfect-focus': {
      if (level < 15) return refuse(input, `${PERFECT_FOCUS_NAME_RU} с 15 уровня`)
      const metabolismRow =
        poolRow(input, 'uncanny_metabolism') ?? findUncannyMetabolismResource(input.resources)
      const metabolismAlready =
        Boolean(input.metabolismUsed) ||
        (metabolismRow != null && metabolismRow.used >= metabolismRow.max)
      if (metabolismAlready) {
        return refuse(
          input,
          `${PERFECT_FOCUS_NAME_RU}: нельзя — уже использован ${UNCANNY_METABOLISM_NAME_RU}`,
        )
      }
      if (focus.remaining > 3) {
        return refuse(
          input,
          `${PERFECT_FOCUS_NAME_RU}: нужно ≤3 очков (сейчас ${focus.remaining})`,
        )
      }
      const restored = restoreFocusToAmount(input.resources, input.classEntryId, 4)
      if (!restored.ok) return refuse(input, restored.reasonRu)
      return done(
        input,
        `${PERFECT_FOCUS_NAME_RU} (инициатива): очки восстановлены до 4 (+${restored.regained})`,
        { resources: restored.resources },
      )
    }

    case 'deflect-attacks':
    case 'deflect-energy': {
      const label = fid === 'deflect-energy' ? DEFLECT_ENERGY_NAME_RU : DEFLECT_ATTACKS_NAME_RU
      const reduceMode = !input.mode || input.mode === 'reduce'
      if (reduceMode) {
        return done(
          input,
          `${label}: реакция — урон −(1к10 + Ловк. + ур. монаха${input.damage != null ? `; вход ${input.damage}` : ''})`,
        )
      }
      if (input.mode === 'redirect') {
        const spent = spendFocusPoints(input.resources, input.classEntryId, 1)
        if (!spent.ok) return refuse(input, spent.reasonRu)
        const sides = martialArtsDieSides2024(level)
        return done(
          input,
          `${label}: перенаправление (−1 очк.) — 2к${sides} + Ловк. по цели${input.target ? ` (${input.target})` : ''}`,
          {
            resources: spent.resources,
            focusCost: 1,
            diceExpression: `2к${sides}`,
          },
        )
      }
      return refuse(input, 'Выбери режим: снизить урон или перенаправить')
    }

    case 'stunning-strike': {
      if (level < 5) return refuse(input, `${STUNNING_STRIKE_NAME_RU} с 5 уровня`)
      const turnUsed =
        getFeaturePick(picks, input.classEntryId, STUNNING_STRIKE_TURN_PICK_KEY) === 'on'
      if (turnUsed) {
        return refuse(input, `${STUNNING_STRIKE_NAME_RU}: уже использован в этом ходу`)
      }
      const spent = spendFocusPoints(input.resources, input.classEntryId, 1)
      if (!spent.ok) return refuse(input, spent.reasonRu)
      const nextPicks = setFeaturePick(picks, input.classEntryId, STUNNING_STRIKE_TURN_PICK_KEY, 'on')
      const saveResult = (input.mode ?? 'fail').replace(/_/g, '-')
      const effect =
        saveResult === 'success' || saveResult === 'save'
          ? 'успех: скорость ×½; следующая атака с преимуществом'
          : 'провал: Ошеломлённый до начала твоего следующего хода'
      return done(input, `${STUNNING_STRIKE_NAME_RU} (−1 очк.): ${effect}`, {
        resources: spent.resources,
        featurePicks: nextPicks,
        focusCost: 1,
      })
    }

    case 'slow-fall': {
      if (level < 4) return refuse(input, `${SLOW_FALL_NAME_RU} с 4 уровня`)
      const reduce = slowFallReduce2024(level)
      return done(input, `${SLOW_FALL_NAME_RU}: реакция — урон от падения −${reduce}`, {
        fallReduce: reduce,
      })
    }

    case 'superior-defense': {
      if (level < 18) return refuse(input, `${SUPERIOR_DEFENSE_NAME_RU} с 18 уровня`)
      if (input.mode === 'end') {
        return done(input, `${SUPERIOR_DEFENSE_NAME_RU} завершена`, { activeLabels: [] })
      }
      const spent = spendFocusPoints(input.resources, input.classEntryId, 3)
      if (!spent.ok) return refuse(input, spent.reasonRu)
      return done(
        input,
        `${SUPERIOR_DEFENSE_NAME_RU}: сопротивление всему урону кроме силового (1 мин; −3 очк.)`,
        {
          resources: spent.resources,
          focusCost: 3,
          activeLabels: [SUPERIOR_DEFENSE_NAME_RU],
        },
      )
    }

    case 'disciplined-survivor': {
      if (level < 14) return refuse(input, `${DISCIPLINED_SURVIVOR_NAME_RU} с 14 уровня`)
      if (input.mode === 'info') {
        return done(input, `${DISCIPLINED_SURVIVOR_NAME_RU}: владение всеми спасбросками.`)
      }
      const spent = spendFocusPoints(input.resources, input.classEntryId, 1)
      if (!spent.ok) return refuse(input, spent.reasonRu)
      return done(
        input,
        `${DISCIPLINED_SURVIVOR_NAME_RU}: переброс проваленного спаса (−1 очк.; новый результат обязателен)`,
        { resources: spent.resources, focusCost: 1 },
      )
    }

    case 'self-restoration': {
      if (level < 10) return refuse(input, `${SELF_RESTORATION_NAME_RU} с 10 уровня`)
      const cond = SELF_RESTORATION_CONDITIONS_2024.find((row) => row.id === input.choice)
      if (!cond) {
        return refuse(input, 'Выбери состояние: Испуганный, Отравленный или Очарованный')
      }
      return done(
        input,
        `${SELF_RESTORATION_NAME_RU}: в конце хода снято «${cond.nameRu}»`,
      )
    }

    case 'empowered-strikes': {
      if (level < 6) return refuse(input, `${EMPOWERED_STRIKES_NAME_RU} с 6 уровня`)
      const forceOn = input.mode === 'force' || input.choice === 'force'
      const next = setFeaturePick(
        picks,
        input.classEntryId,
        EMPOWERED_STRIKES_PICK_KEY,
        forceOn ? 'on' : 'off',
      )
      return done(
        input,
        forceOn
          ? `${EMPOWERED_STRIKES_NAME_RU}: безоружный урон → силовой`
          : `${EMPOWERED_STRIKES_NAME_RU}: обычный тип урона атаки`,
        { featurePicks: next },
      )
    }

    case 'heightened-focus':
      return done(
        input,
        `${HEIGHTENED_FOCUS_NAME_RU}: Шквал — 3 удара; платная Терпеливая защита — врем. хиты 2×${maDie}; платная Поступь — можно взять существо.`,
      )

    case 'evasion':
      return done(
        input,
        `${EVASION_NAME_RU}: спас Ловкости на половину → успех 0, провал половина (не при Недееспособный).`,
      )

    case 'acrobatic-movement':
      return done(
        input,
        `${ACROBATIC_MOVEMENT_NAME_RU}: без доспеха и щита — вертикали и жидкости в свой ход.`,
      )

    case 'body-and-mind': {
      const bonus = bodyAndMindAbilityBonus2024(level)
      if (bonus.dex <= 0) return refuse(input, `${BODY_AND_MIND_NAME_RU} на 20 уровне`)
      return done(
        input,
        `${BODY_AND_MIND_NAME_RU}: Ловкость +${bonus.dex}, Мудрость +${bonus.wis} (макс. ${bonus.cap}).`,
      )
    }

    case 'open-hand-technique': {
      const technique = OPEN_HAND_TECHNIQUES_2024.find((row) => row.id === input.choice)
      if (!technique) {
        return refuse(input, 'Выбери эффект: Запутать, Толкнуть или Опрокинуть')
      }
      return done(
        input,
        `Техники открытой ладони (${technique.nameRu}): ${technique.summaryRu}`,
      )
    }

    case 'wholeness-of-body': {
      const row =
        poolRow(input, 'wholeness_of_body') ?? findWholenessOfBodyResource(input.resources)
      if (row && row.used >= row.max) {
        return refuse(input, 'Целостность тела: нет использований')
      }
      let resources = input.resources
      if (row) {
        resources = patchRow(resources, row.id, (item) => ({ ...item, used: item.used + 1 }))
      }
      const wis = Math.floor(input.wisMod ?? 0)
      return done(
        input,
        `Целостность тела: лечение ${maDie}+Мдр (${wis >= 0 ? '+' : ''}${wis}, мин. 1)`,
        { resources, diceExpression: maDie, healNoteRu: `${maDie}+Мдр` },
      )
    }

    case 'quivering-palm': {
      if (input.mode === 'end-harmless') {
        const next = setFeaturePick(picks, input.classEntryId, QUIVERING_PALM_PICK_KEY, null)
        return done(input, 'Дрожащая ладонь: колебания прекращены без вреда', {
          featurePicks: next,
        })
      }
      if (input.mode === 'detonate') {
        return done(
          input,
          `Дрожащая ладонь: спас Тел — 10к12 силового (успех половина)${input.target ? ` · ${input.target}` : ''}`,
          { diceExpression: '10к12' },
        )
      }
      const spent = spendFocusPoints(input.resources, input.classEntryId, 4)
      if (!spent.ok) return refuse(input, spent.reasonRu)
      const target = (input.target ?? '').trim() || 'цель'
      const next = setFeaturePick(picks, input.classEntryId, QUIVERING_PALM_PICK_KEY, target)
      return done(
        input,
        `Дрожащая ладонь: колебания в «${target}» на ${level} дн. (−4 очк.)`,
        { resources: spent.resources, featurePicks: next, focusCost: 4 },
      )
    }

    case 'shadow-arts': {
      const spell = (input.choice ?? input.mode ?? 'darkness').replace(/_/g, '-')
      if (spell === 'minor-illusion' || spell === 'illusion') {
        return done(input, 'Тёмные искусства: Малая иллюзия (заговор; Мдр).')
      }
      const spent = spendFocusPoints(input.resources, input.classEntryId, 1)
      if (!spent.ok) return refuse(input, spent.reasonRu)
      return done(
        input,
        'Тёмные искусства: Тьма (−1 очк.; видишь в своей тьме; можно двигать область)',
        {
          resources: spent.resources,
          focusCost: 1,
          concentrationName: 'Тьма',
          activeLabels: ['Тьма'],
        },
      )
    }

    case 'shadow-step': {
      return done(
        input,
        'Шаг в тень: бонусным — телепорт 60 фт. из/в тусклый свет или тьму; преимущество к следующей рукопашной.',
        { focusCost: 0 },
      )
    }

    case 'improved-shadow-step': {
      const spent = spendFocusPoints(input.resources, input.classEntryId, 1)
      if (!spent.ok) return refuse(input, spent.reasonRu)
      return done(
        input,
        'Улучшенный шаг в тень (−1 очк.): телепорт без требования тьмы + безоружный удар',
        { resources: spent.resources, focusCost: 1 },
      )
    }

    case 'cloak-of-shadows': {
      if (input.mode === 'end') {
        const next = setFeaturePick(picks, input.classEntryId, CLOAK_OF_SHADOWS_PICK_KEY, null)
        return done(input, 'Покров теней завершён', { featurePicks: next, activeLabels: [] })
      }
      const spent = spendFocusPoints(input.resources, input.classEntryId, 3)
      if (!spent.ok) return refuse(input, spent.reasonRu)
      const next = setFeaturePick(picks, input.classEntryId, CLOAK_OF_SHADOWS_PICK_KEY, 'on')
      return done(
        input,
        'Покров теней (−3 очк., 1 мин): Невидимый; Шквал без очков',
        {
          resources: spent.resources,
          featurePicks: next,
          focusCost: 3,
          activeLabels: ['Покров теней'],
        },
      )
    }

    case 'hand-of-healing': {
      const viaFlurry = input.mode === 'flurry' || input.mode === 'free'
      if (viaFlurry) {
        return done(
          input,
          `Исцеляющая рука (через Шквал, без очка): лечение ${maDie}+Мдр`,
          { diceExpression: maDie, healNoteRu: `${maDie}+Мдр`, focusCost: 0 },
        )
      }
      const spent = spendFocusPoints(input.resources, input.classEntryId, 1)
      if (!spent.ok) return refuse(input, spent.reasonRu)
      return done(input, `Исцеляющая рука (−1 очк.): лечение ${maDie}+Мдр`, {
        resources: spent.resources,
        diceExpression: maDie,
        healNoteRu: `${maDie}+Мдр`,
        focusCost: 1,
      })
    }

    case 'hand-of-harm': {
      const viaFlurry = input.mode === 'flurry' || input.mode === 'free'
      if (viaFlurry) {
        return done(
          input,
          `Повреждающая рука (через Шквал исцеления, без очка): +${maDie}+Мдр некротического`,
          { diceExpression: maDie, focusCost: 0 },
        )
      }
      const spent = spendFocusPoints(input.resources, input.classEntryId, 1)
      if (!spent.ok) return refuse(input, spent.reasonRu)
      return done(
        input,
        `Повреждающая рука (−1 очк.): +${maDie}+Мдр некротического (1/ход)`,
        { resources: spent.resources, diceExpression: maDie, focusCost: 1 },
      )
    }

    case 'flurry-of-healing-and-harm': {
      const row =
        poolRow(input, 'flurry_of_healing_and_harm') ??
        findFlurryHealingHarmResource(input.resources)
      if (row && row.used >= row.max) {
        return refuse(input, 'Шквал исцеления и повреждения: нет использований')
      }
      let resources = input.resources
      if (row) {
        resources = patchRow(resources, row.id, (item) => ({ ...item, used: item.used + 1 }))
      }
      return done(
        input,
        'Шквал исцеления и повреждения: Исцеляющая/Повреждающая рука через Шквал без очков (отмечаем использование)',
        { resources },
      )
    }

    case 'hand-of-ultimate-mercy': {
      const row =
        poolRow(input, 'hand_of_ultimate_mercy') ??
        findHandOfUltimateMercyResource(input.resources)
      if (row && row.used >= row.max) {
        return refuse(input, 'Рука абсолютного милосердия уже использована (до долгого отдыха)')
      }
      const spent = spendFocusPoints(input.resources, input.classEntryId, 5)
      if (!spent.ok) return refuse(input, spent.reasonRu)
      let resources = spent.resources
      if (row) {
        resources = patchRow(resources, row.id, (item) => ({ ...item, used: item.used + 1 }))
      }
      return done(
        input,
        `Рука абсолютного милосердия (−5 очк.): воскрешение (4к10+Мдр)${input.target ? ` · ${input.target}` : ''}`,
        { resources, focusCost: 5, diceExpression: '4к10', healNoteRu: '4к10+Мдр' },
      )
    }

    case 'elemental-attunement': {
      if (input.mode === 'end') {
        const next = setFeaturePick(picks, input.classEntryId, ELEMENTAL_ATTUNEMENT_PICK_KEY, null)
        return done(input, 'Сродство со стихиями завершено', {
          featurePicks: next,
          activeLabels: [],
        })
      }
      const spent = spendFocusPoints(input.resources, input.classEntryId, 1)
      if (!spent.ok) return refuse(input, spent.reasonRu)
      const next = setFeaturePick(picks, input.classEntryId, ELEMENTAL_ATTUNEMENT_PICK_KEY, 'on')
      return done(
        input,
        'Сродство со стихиями (−1 очк., 10 мин): досягаемость +10 фт.; стихийный тип урона',
        {
          resources: spent.resources,
          featurePicks: next,
          focusCost: 1,
          activeLabels: ['Сродство со стихиями'],
        },
      )
    }

    case 'elemental-burst': {
      const type =
        ELEMENTAL_DAMAGE_TYPES_2024.find((row) => row.id === input.choice)?.nameRu ??
        input.choice?.trim()
      if (!type) return refuse(input, 'Выбери тип урона стихии')
      const spent = spendFocusPoints(input.resources, input.classEntryId, 2)
      if (!spent.ok) return refuse(input, spent.reasonRu)
      const sides = martialArtsDieSides2024(level)
      return done(
        input,
        `Стихийный выброс (−2 очк.): сфера 20 фт. — 3к${sides} (${type}), спас Ловкости`,
        {
          resources: spent.resources,
          focusCost: 2,
          diceExpression: `3к${sides}`,
        },
      )
    }

    case 'elemental-epitome': {
      const type =
        ELEMENTAL_DAMAGE_TYPES_2024.find((row) => row.id === input.choice)?.nameRu ??
        input.choice?.trim()
      if (!type) return refuse(input, 'Выбери сопротивление стихии')
      const next = setFeaturePick(
        picks,
        input.classEntryId,
        ELEMENTAL_EPITOME_RESIST_PICK_KEY,
        input.choice ?? type,
      )
      return done(
        input,
        `Воплощение стихий: сопротивление «${type}» (пока действует Сродство); усиленные удары / разрушительная поступь`,
        { featurePicks: next, activeLabels: [`Воплощение: ${type}`] },
      )
    }

    default:
      return refuse(input, `Умение «${input.featureId}» не настроено в диалоге монаха 2024`)
  }
}
