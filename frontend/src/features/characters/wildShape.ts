/**
 * Wild Shape spend fork: beast form + circle/Tasha alternatives that cost wild_shape.
 * See docs/forms-and-wild-shape.md §2.
 */

import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import {
  findFeatureResource,
  spendPoolUses,
  spendRemaining,
} from '../../shared/dnd/featureResources'
import type { SheetResource } from '../../shared/dnd/rest'
import {
  createCompanion,
  getActiveSelfForm,
  normalizeSelfForms,
  type CompanionEntry,
  type FormSourceKind,
} from './companions'
import { wildfireSpiritHp } from './bestiaryCompanionStats'
import {
  companionFromTemplate,
  resolveCompanionTemplate,
} from './companionTemplates'
import { createKnownForm, upsertKnownForm, type KnownForm } from './knownForms'

export type WildShapeLimits = {
  maxCr: number
  allowSwim: boolean
  allowFly: boolean
  moon: boolean
  combatBonusAction: boolean
}

export type WildShapeOptionId =
  | 'beast_form'
  | 'wild_companion'
  | 'starry_form'
  | 'symbiotic_entity'
  | 'wildfire_spirit'
  | 'elemental_wild_shape'

export type WildShapeOption = {
  id: WildShapeOptionId
  labelRu: string
  summaryRu: string
  /** How many wild_shape uses to spend. */
  cost: number
  /** Feature id that unlocks this (besides wild_shape itself). */
  featureId: string
  disabled: boolean
  disabledReason?: string
}

const CR_RANK: Record<string, number> = {
  '0': 0,
  '1/8': 0.125,
  '1/4': 0.25,
  '1/2': 0.5,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
}

export function parseCr(raw: string | null | undefined): number | null {
  if (raw == null) return null
  const key = String(raw).trim()
  if (!key || key === '—' || key === '-') return null
  if (key in CR_RANK) return CR_RANK[key]!
  const n = Number(key)
  return Number.isFinite(n) ? n : null
}

export function wildShapeLimits(input: {
  druidLevel: number
  subclassSlug: string | null | undefined
}): WildShapeLimits {
  const level = Math.max(1, Math.min(20, Math.floor(input.druidLevel) || 1))
  const moon =
    (input.subclassSlug || '').toLowerCase().includes('moon') ||
    (input.subclassSlug || '').toLowerCase().includes('лун')
  const combatBonusAction = moon

  if (moon) {
    const maxCr = level < 6 ? 1 : Math.floor(level / 3)
    return {
      maxCr,
      allowSwim: level >= 4,
      allowFly: level >= 8,
      moon: true,
      combatBonusAction,
    }
  }

  let maxCr = 0.25
  let allowSwim = false
  let allowFly = false
  if (level >= 8) {
    maxCr = 1
    allowSwim = true
    allowFly = true
  } else if (level >= 4) {
    maxCr = 0.5
    allowSwim = true
  }
  return { maxCr, allowSwim, allowFly, moon: false, combatBonusAction }
}

/** One line for the Wild Shape card, Circle Forms card, and the apply dialog. */
export function formatWildShapeLimit(limits: WildShapeLimits): string {
  const cr =
    limits.maxCr >= 1
      ? String(limits.maxCr)
      : limits.maxCr === 0.5
        ? '1/2'
        : limits.maxCr === 0.25
          ? '1/4'
          : String(limits.maxCr)
  const swim = limits.allowSwim ? 'плавание' : 'без плавания'
  const fly = limits.allowFly ? 'полёт' : 'без полёта'
  return `CR ${cr}, ${swim} и ${fly}`
}

/**
 * Moon circle replaces the PHB Wild Shape CR column. Land and other circles
 * keep the feature's own scale text.
 */
export function moonShapeScale(
  feature: { id: string; classLevel: number; classEntryId: string },
  unlocked: Array<{ id: string; classEntryId: string }>,
): string | null {
  if (feature.id !== 'wild_shape' && feature.id !== 'circle_forms') return null
  const moon = unlocked.some(
    (row) => row.id === 'circle_forms' && row.classEntryId === feature.classEntryId,
  )
  if (!moon) return null
  return formatWildShapeLimit(
    wildShapeLimits({ druidLevel: feature.classLevel, subclassSlug: 'circle_of_the_moon' }),
  )
}

export function crAllowed(cr: string, limits: WildShapeLimits): boolean {
  const value = parseCr(cr)
  if (value == null) return false
  return value <= limits.maxCr + 1e-9
}

export function resolveWildShapeOptions(input: {
  features: UnlockedFeature[]
  resources: SheetResource[]
  classSlug: string
  classEntryId: string
}): WildShapeOption[] {
  const byId = new Map(input.features.map((f) => [f.id, f]))
  const pool = findFeatureResource(
    input.resources,
    input.classSlug,
    'wild_shape',
    input.classEntryId,
  )
  const unlimited = Boolean(pool?.unlimited)
  const left = unlimited ? Number.POSITIVE_INFINITY : spendRemaining(pool)

  function base(
    id: WildShapeOptionId,
    labelRu: string,
    summaryRu: string,
    cost: number,
    featureId: string,
    unlocked: boolean,
  ): WildShapeOption {
    if (!unlocked) {
      return {
        id,
        labelRu,
        summaryRu,
        cost,
        featureId,
        disabled: true,
        disabledReason: 'Умение не разблокировано',
      }
    }
    if (left < cost) {
      return {
        id,
        labelRu,
        summaryRu,
        cost,
        featureId,
        disabled: true,
        disabledReason: `Нужно ${cost}, осталось ${left}`,
      }
    }
    return { id, labelRu, summaryRu, cost, featureId, disabled: false }
  }

  // Only unlocked alternatives appear on the fork (cost may still disable).
  const options: WildShapeOption[] = [
    base(
      'beast_form',
      'Дикий облик',
      'Принять звериный облик из бестиария (лимит CR / плавание / полёт).',
      1,
      'wild_shape',
      byId.has('wild_shape'),
    ),
  ]
  if (byId.has('wild_companion')) {
    options.push(
      base(
        'wild_companion',
        'Дикий спутник',
        'Как «Поиск фамильяра»: выбери зверя (тип — фея), −1 Дикий облик, часы = ½ ур. друида. Без форм Цепи.',
        1,
        'wild_companion',
        true,
      ),
    )
  }
  if (byId.has('starry_form')) {
    options.push(
      base(
        'starry_form',
        'Звёздная форма',
        'Бонусным: форма Лучника / Чаши / Дракона на 10 мин.',
        1,
        'starry_form',
        true,
      ),
    )
  }
  if (byId.has('symbiotic_entity')) {
    options.push(
      base(
        'symbiotic_entity',
        'Симбиотическая сущность',
        'Временные хиты = 4×ур. друида; Ореол спор удвоен на 10 мин.',
        1,
        'symbiotic_entity',
        true,
      ),
    )
  }
  if (byId.has('summon_wildfire_spirit')) {
    options.push(
      base(
        'wildfire_spirit',
        'Дух дикого огня',
        'Призвать духа на 1 час (статы из бестиария, HP 5+5×ур.).',
        1,
        'summon_wildfire_spirit',
        true,
      ),
    )
  }
  if (byId.has('elemental_wild_shape')) {
    options.push(
      base(
        'elemental_wild_shape',
        'Элементальный дикий облик',
        'Потратить оба использования → воздушный / земляной / огненный / водный элементаль.',
        2,
        'elemental_wild_shape',
        true,
      ),
    )
  }
  return options
}

/** Features whose «Использовать» opens the Wild Shape spend fork. */
export const WILD_SHAPE_FORK_FEATURE_IDS = new Set([
  'wild_shape',
  'wild_companion',
  'starry_form',
  'symbiotic_entity',
  'summon_wildfire_spirit',
  'elemental_wild_shape',
])

export function isWildShapeForkFeature(featureId: string): boolean {
  return WILD_SHAPE_FORK_FEATURE_IDS.has(featureId)
}

export type BestiaryFormPick = {
  slug: string
  name_ru: string
  catalog_id?: string | null
  cr: string
  type: string
  ac: number
  hp: number
  speed_walk: number
  speed_swim?: number
  speed_fly?: number
  speed_climb?: number
  str?: number
  dex?: number
  con?: number
  resistances?: string
  immunities?: string
  actions_text: string
}

export function beastPickAllowed(
  pick: BestiaryFormPick,
  limits: WildShapeLimits,
): boolean {
  if (pick.type !== 'beast') return false
  if (!crAllowed(pick.cr, limits)) return false
  if ((pick.speed_swim ?? 0) > 0 && !limits.allowSwim) return false
  if ((pick.speed_fly ?? 0) > 0 && !limits.allowFly) return false
  return true
}

const PHYSICAL_FALLBACK: Record<string, { str: number; dex: number; con: number }> = {
  brown_bear: { str: 19, dex: 10, con: 16 },
  air_elemental: { str: 14, dex: 20, con: 14 },
  earth_elemental: { str: 20, dex: 8, con: 20 },
  fire_elemental: { str: 10, dex: 17, con: 16 },
  water_elemental: { str: 18, dex: 14, con: 18 },
}

/** STR/DEX/CON of the form. Catalog values win; brown bear and elementals have a fallback. */
export function physicalScoresForPick(
  pick: Pick<BestiaryFormPick, 'slug' | 'name_ru' | 'str' | 'dex' | 'con'>,
): { str: number; dex: number; con: number } | null {
  if (pick.str != null && pick.dex != null && pick.con != null) {
    return { str: pick.str, dex: pick.dex, con: pick.con }
  }
  const slug = pick.slug.replace(/-/g, '_')
  if (PHYSICAL_FALLBACK[slug]) return PHYSICAL_FALLBACK[slug]
  if (/бурый медведь|brown bear/i.test(pick.name_ru)) return PHYSICAL_FALLBACK.brown_bear!
  if (pick.str != null) {
    return { str: pick.str, dex: pick.dex ?? 10, con: pick.con ?? 10 }
  }
  return null
}

export function formStatsFromPick(pick: BestiaryFormPick): CompanionEntry['stats'] {
  const scores = physicalScoresForPick(pick)
  return {
    hp: pick.hp,
    hp_max: pick.hp,
    ac: pick.ac,
    speed: pick.speed_walk,
    ...(pick.speed_fly != null ? { speed_fly: pick.speed_fly } : {}),
    ...(pick.speed_swim != null ? { speed_swim: pick.speed_swim } : {}),
    ...(pick.speed_climb != null ? { speed_climb: pick.speed_climb } : {}),
    ...(scores
      ? { str: scores.str, dex: scores.dex, con: scores.con }
      : {}),
    ...(pick.resistances ? { resistances: pick.resistances } : {}),
    ...(pick.immunities ? { immunities: pick.immunities } : {}),
  }
}

function formNotesFromPick(pick: BestiaryFormPick, elemental: boolean): string {
  const scores = physicalScoresForPick(pick)
  const move = [
    `пешком ${pick.speed_walk}`,
    pick.speed_fly ? `полёт ${pick.speed_fly}` : '',
    pick.speed_swim ? `плавание ${pick.speed_swim}` : '',
    pick.speed_climb ? `лазание ${pick.speed_climb}` : '',
  ]
    .filter(Boolean)
    .join(', ')
  return [
    elemental ? 'Элементальный дикий облик' : 'Дикий облик',
    `CR ${pick.cr}`,
    move,
    scores ? `СИЛ ${scores.str} ЛОВ ${scores.dex} ТЕЛ ${scores.con}` : '',
    pick.resistances ? `устойчивости: ${pick.resistances}` : '',
    pick.immunities ? `иммунитеты: ${pick.immunities}` : '',
    pick.actions_text ? `атаки: ${pick.actions_text}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Active beast or elemental Wild Shape. Starry Form is a feature reminder and
 * does not block spells.
 */
export function activeBeastWildShape(
  companions: CompanionEntry[],
): CompanionEntry | null {
  const form = getActiveSelfForm(companions)
  if (!form?.active) return null
  const source = form.form?.form_source
  if (source === 'wild_shape' || source === 'elemental_wild_shape') return form
  return null
}

/** Physical scores to show and roll while a beast or elemental form is up. */
export function beastPhysicalOverlay(
  companions: CompanionEntry[],
): { str?: number; dex?: number; con?: number } | null {
  const form = activeBeastWildShape(companions)
  if (!form) return null
  const { str, dex, con } = form.stats
  if (str == null && dex == null && con == null) return null
  return {
    ...(str != null ? { str } : {}),
    ...(dex != null ? { dex } : {}),
    ...(con != null ? { con } : {}),
  }
}

export function druidLevelFromClasses(
  classes: Array<{ name: string; level: number }>,
): number {
  const row = classes.find((item) => /друид|druid/i.test(item.name))
  return Math.max(0, Math.floor(row?.level ?? 0))
}

function materialHasGpCost(text: string | undefined): boolean {
  if (!text) return false
  return /\d/.test(text) && /(gp|зм|зл|золот)/i.test(text)
}

/**
 * PHB: no spells in Wild Shape until Beast Spells (18). Those still cannot
 * supply material components. Archdruid (20) ignores V, S, and free M.
 */
export function wildShapeCastBlock(input: {
  companions: CompanionEntry[]
  classes: Array<{ name: string; level: number }>
  classSlug?: string | null
  material?: string | null
}): string | null {
  if (!activeBeastWildShape(input.companions)) return null
  const level = druidLevelFromClasses(input.classes)
  if (level <= 0) return null
  const slug = (input.classSlug || '').toLowerCase()
  const druidSpell = slug === '' || slug === 'druid'
  if (level < 18 || !druidSpell) {
    return 'В Диком облике нельзя накладывать заклинания до «Звериных заклинаний» (18). Форма не сброшена, ячейка не списана.'
  }
  const material = input.material?.trim() || ''
  if (!material) return null
  if (level >= 20 && !materialHasGpCost(material)) return null
  if (level >= 20) {
    return 'Архидруид не отменяет материальный компонент с указанной ценой. Каст не выполнен.'
  }
  return 'Звериные заклинания: в облике нельзя предоставить материальный компонент. Каст не выполнен.'
}

function dismissActiveSelfForm(companions: CompanionEntry[]): CompanionEntry[] {
  return companions.map((row) =>
    row.role === 'self_form' && row.active
      ? { ...row, active: false, is_primary: false }
      : row,
  )
}

function capturePreviousPrimaryId(companions: CompanionEntry[]): string | null {
  const primary = companions.find((row) => row.is_primary && row.role !== 'self_form')
  return primary?.id ?? null
}

export function spendWildShapeUses(input: {
  resources: SheetResource[]
  classSlug: string
  classEntryId: string
  amount: number
  label: string
}): ReturnType<typeof spendPoolUses> {
  return spendPoolUses({
    resources: input.resources,
    classSlug: input.classSlug,
    poolId: 'wild_shape',
    classEntryId: input.classEntryId,
    amount: input.amount,
    label: input.label,
  })
}

export function applyBeastWildShape(input: {
  companions: CompanionEntry[]
  knownForms: KnownForm[]
  pick: BestiaryFormPick
  hostHp: number
  hostHpMax: number
  druidLevel: number
  formSource?: FormSourceKind
  formSourceRef?: string
  /** Extra known_form tags (e.g. elemental). */
  extraTags?: KnownForm['tags']
}): { companions: CompanionEntry[]; knownForms: KnownForm[] } {
  const previousPrimaryId = capturePreviousPrimaryId(input.companions)
  const cleared = dismissActiveSelfForm(input.companions)
  const duration = Math.max(1, Math.floor(input.druidLevel / 2))
  const isElemental =
    input.formSource === 'elemental_wild_shape' || input.pick.type === 'elemental'
  const form = createCompanion({
    role: 'self_form',
    kind: 'transformed_self',
    name: input.pick.name_ru,
    bestiary_ref: input.pick.catalog_id ?? input.pick.slug,
    bestiary_name_ru: input.pick.name_ru,
    nature: 'summoned',
    control: 'with_master',
    active: true,
    is_primary: true,
    stats: formStatsFromPick(input.pick),
    actions: input.pick.actions_text,
    notes: formNotesFromPick(input.pick, isElemental),
    source: {
      kind: 'class',
      labelRu: isElemental ? 'Элементальный дикий облик' : 'Дикий облик',
      feature: isElemental ? 'elemental_wild_shape' : 'wild_shape',
    },
    form: {
      form_source: input.formSource ?? 'wild_shape',
      form_source_ref: input.formSourceRef ?? 'wild_shape',
      host_hp_at_enter: input.hostHp,
      host_hp_max_at_enter: input.hostHpMax,
      duration_minutes: duration * 60,
      entered_at: new Date().toISOString(),
      previous_primary_id: previousPrimaryId,
    },
  })
  const tags: KnownForm['tags'] = [...(input.extraTags ?? [])]
  if (isElemental && !tags.includes('elemental')) tags.push('elemental')
  if ((input.pick.speed_swim ?? 0) > 0 && !tags.includes('swim')) tags.push('swim')
  if ((input.pick.speed_fly ?? 0) > 0 && !tags.includes('fly')) tags.push('fly')
  const known = upsertKnownForm(
    input.knownForms,
    createKnownForm({
      bestiary_ref: input.pick.catalog_id ?? null,
      bestiary_slug: input.pick.slug,
      name_ru: input.pick.name_ru,
      cr: input.pick.cr,
      tags,
      stats_override: {
        hp: input.pick.hp,
        ac: input.pick.ac,
        speed: input.pick.speed_walk,
        actions: input.pick.actions_text,
      },
    }),
  )
  return {
    companions: normalizeSelfForms(
      setPrimaryExclusive([...cleared, form], form.id),
    ),
    knownForms: known,
  }
}

function setPrimaryExclusive(
  companions: CompanionEntry[],
  primaryId: string,
): CompanionEntry[] {
  return companions.map((row) => ({
    ...row,
    is_primary: row.id === primaryId,
  }))
}

const ELEMENTAL_BY_KEY: Record<
  string,
  { slug: string; name_ru: string }
> = {
  air: { slug: 'air_elemental', name_ru: 'Воздушный элементаль' },
  earth: { slug: 'earth_elemental', name_ru: 'Земляной элементаль' },
  fire: { slug: 'fire_elemental', name_ru: 'Огненный элементаль' },
  water: { slug: 'water_elemental', name_ru: 'Водный элементаль' },
}

export function elementalKeyToSlug(key: string): {
  slug: string
  name_ru: string
} | null {
  return ELEMENTAL_BY_KEY[key] ?? null
}

export function applyWildCompanion(input: {
  companions: CompanionEntry[]
  druidLevel: number
  /** Optional bestiary form (owl, cat, …); type becomes fey via notes. */
  pick?: BestiaryFormPick | null
}): CompanionEntry[] {
  const hours = Math.max(1, Math.floor(input.druidLevel / 2))
  const withoutOld = input.companions.filter(
    (row) => row.source?.feature !== 'wild_companion',
  )
  const pick = input.pick
  const familiar = createCompanion({
    kind: 'familiar',
    role: 'ally',
    name: pick?.name_ru ? `Дикий спутник · ${pick.name_ru}` : 'Дикий спутник',
    bestiary_ref: pick?.catalog_id ?? pick?.slug ?? null,
    bestiary_name_ru: pick?.name_ru ?? null,
    nature: 'summoned',
    control: 'own_initiative',
    active: true,
    stats: {
      hp: pick?.hp ?? 2,
      hp_max: pick?.hp ?? 2,
      ac: pick?.ac ?? 12,
      speed: pick?.speed_walk ?? 20,
    },
    actions:
      pick?.actions_text ||
      'Как фамильяр («Поиск фамильяра»): не атакует; телепатия; передача касания. Тип — фея.',
    notes: `Wild Companion (Tasha) · фея · ${hours} ч. · исчезнет по истечении`,
    source: {
      kind: 'class',
      labelRu: 'Дикий спутник',
      feature: 'wild_companion',
    },
  })
  return [...withoutOld, familiar]
}

function isWildfireSpiritRow(row: CompanionEntry): boolean {
  const feature = row.source?.feature?.trim().toLowerCase() ?? ''
  if (feature === 'wildfire_spirit' || feature === 'summon_wildfire_spirit') {
    return true
  }
  const ref = (row.bestiary_ref ?? '').toLowerCase()
  if (ref.includes('wildfire')) return true
  if (/дикого огня/i.test(row.bestiary_name_ru ?? '') || /дикого огня/i.test(row.name)) {
    return row.kind === 'ally' || row.kind === 'other'
  }
  return false
}

export function applyWildfireSpirit(input: {
  companions: CompanionEntry[]
  druidLevel: number
  pick?: BestiaryFormPick | null
  /** Character level for proficiency on Flame Seed (defaults to druidLevel). */
  characterLevel?: number
  spellMod?: number | null
}): CompanionEntry[] {
  const level = Math.max(1, Math.floor(input.druidLevel) || 1)
  // TCE: 5 + 5×druid level. Never the catalog average alone.
  const hp = wildfireSpiritHp(level)
  const existing = input.companions.find(isWildfireSpiritRow)
  const template = resolveCompanionTemplate({
    choiceId: 'wildfire_spirit',
    pickValue: '',
    ctx: {
      hostClassLevel: level,
      characterLevel: Math.max(1, Math.floor(input.characterLevel ?? level)),
      spellMod: input.spellMod ?? undefined,
    },
  })
  const fromTemplate = template
    ? companionFromTemplate({
        template,
        name:
          existing?.name?.trim() ||
          input.pick?.name_ru ||
          template.defaultName,
        source: existing?.source ?? {
          kind: 'subclass',
          labelRu: 'Дух дикого огня',
          feature: 'wildfire_spirit',
        },
      })
    : null

  const activated = createCompanion({
    ...(fromTemplate ?? {}),
    id: existing?.id,
    kind: 'ally',
    role: 'ally',
    name:
      existing?.name?.trim() ||
      input.pick?.name_ru ||
      fromTemplate?.name ||
      'Дух дикого огня',
    bestiary_ref:
      existing?.bestiary_ref ??
      input.pick?.catalog_id ??
      input.pick?.slug ??
      'wildfire_spirit',
    bestiary_name_ru:
      existing?.bestiary_name_ru ?? input.pick?.name_ru ?? 'Дух дикого огня',
    nature: 'summoned',
    control: 'bonus_action_command',
    active: true,
    is_primary: existing?.is_primary ?? false,
    avatar_url: existing?.avatar_url ?? null,
    stats: {
      ...(fromTemplate?.stats ?? {}),
      hp,
      hp_max: hp,
      ac: fromTemplate?.stats.ac ?? input.pick?.ac ?? 13,
      speed: fromTemplate?.stats.speed ?? input.pick?.speed_walk ?? 30,
      speed_fly: fromTemplate?.stats.speed_fly ?? input.pick?.speed_fly ?? 30,
      str: fromTemplate?.stats.str ?? 10,
      dex: fromTemplate?.stats.dex ?? 14,
      con: fromTemplate?.stats.con ?? 14,
      immunities:
        fromTemplate?.stats.immunities ??
        'огонь; очарование, испуг, захват, сбивание с ног, опутанность',
    },
    actions:
      fromTemplate?.actions ||
      input.pick?.actions_text ||
      'Семя пламени; Огненная телепортация (см. TCE / бестиарий).',
    notes:
      existing?.notes?.trim() ||
      fromTemplate?.notes ||
      `Summon Wildfire Spirit · 1 ч. · HP = 5 + 5×ур. друида = ${hp} (TCE)`,
    resources: existing?.resources ?? fromTemplate?.resources ?? [],
    source: {
      kind: 'subclass',
      labelRu: existing?.source?.labelRu ?? 'Дух дикого огня',
      classEntryId: existing?.source?.classEntryId,
      subclassSlug: existing?.source?.subclassSlug,
      // Keep grant feature id when present so the card stays one with the archetype slot.
      feature: existing?.source?.feature?.includes('wildfire')
        ? existing.source.feature
        : 'wildfire_spirit',
    },
  })

  if (existing) {
    return input.companions.map((row) => (row.id === existing.id ? activated : row))
  }
  return [...input.companions, activated]
}

export function starryFormDice(druidLevel: number): '1к8' | '2к8' {
  return Math.floor(druidLevel) >= 10 ? '2к8' : '1к8'
}

export function applyStarryForm(input: {
  companions: CompanionEntry[]
  constellation: 'archer' | 'chalice' | 'dragon'
  hostHp: number
  hostHpMax: number
  druidLevel?: number
}): CompanionEntry[] {
  const labels = {
    archer: 'Лучник',
    chalice: 'Чаша',
    dragon: 'Дракон',
  } as const
  const dice = starryFormDice(input.druidLevel ?? 2)
  const previousPrimaryId = capturePreviousPrimaryId(input.companions)
  const cleared = dismissActiveSelfForm(input.companions)
  const form = createCompanion({
    role: 'self_form',
    kind: 'transformed_self',
    name: `Звёздная форма · ${labels[input.constellation]}`,
    nature: 'summoned',
    control: 'with_master',
    active: true,
    is_primary: true,
    // Starry Form keeps host HP — card is a combat reminder, not a second pool.
    stats: {
      hp: null,
      hp_max: null,
      ac: null,
      speed: null,
    },
    actions:
      input.constellation === 'archer'
        ? `Лучистый лук: атака заклинанием, ${dice}+МУД лучистого (бонусным).`
        : input.constellation === 'chalice'
          ? `Чаша: при лечении заклинанием 1–2 круга — доп. ${dice}+МУД себе или союзнику в 30 фт.`
          : 'Дракон: проверки ИНТ/МУД с преимуществом; можно заменить вербальные/соматические на звёздные.',
    notes: 'Звёздная форма · 10 мин. · хиты = хиты персонажа (не отдельный пул)',
    source: {
      kind: 'subclass',
      labelRu: 'Звёздная форма',
      feature: 'starry_form',
    },
    form: {
      form_source: 'feature',
      form_source_ref: `starry_form:${input.constellation}`,
      host_hp_at_enter: input.hostHp,
      host_hp_max_at_enter: input.hostHpMax,
      duration_minutes: 10,
      entered_at: new Date().toISOString(),
      previous_primary_id: previousPrimaryId,
    },
  })
  return normalizeSelfForms(setPrimaryExclusive([...cleared, form], form.id))
}

export function symbioticTempHp(druidLevel: number): number {
  return 4 * Math.max(1, Math.floor(druidLevel) || 1)
}

export function activeSelfFormLabel(
  companions: CompanionEntry[],
): string | null {
  const form = getActiveSelfForm(companions)
  return form?.name ?? null
}

/** Combat Wild Shape: 1d8 HP per spell slot level. */
export function moonHealDiceCount(slotLevel: number): number {
  return Math.max(1, Math.min(9, Math.floor(slotLevel) || 1))
}

export function rollDice(count: number, sides: number): {
  total: number
  rolls: number[]
} {
  const n = Math.max(0, Math.floor(count))
  const s = Math.max(2, Math.floor(sides))
  const rolls: number[] = []
  let total = 0
  for (let i = 0; i < n; i += 1) {
    const v = 1 + Math.floor(Math.random() * s)
    rolls.push(v)
    total += v
  }
  return { total, rolls }
}

/** Deterministic average for tests / optional UI (d8 → 4.5 → floor+0.5 style: 5). */
export function averageDice(count: number, sides: number): number {
  const n = Math.max(0, Math.floor(count))
  const s = Math.max(2, Math.floor(sides))
  return Math.floor(n * ((s + 1) / 2))
}

export function healSelfForm(input: {
  companions: CompanionEntry[]
  amount: number
  formId?: string
}): {
  companions: CompanionEntry[]
  healed: number
  formName: string | null
  ok: boolean
  message: string
} {
  const amount = Math.max(0, Math.floor(input.amount))
  const form =
    (input.formId
      ? input.companions.find((r) => r.id === input.formId)
      : getActiveSelfForm(input.companions)) ?? null
  if (!form || !form.active || form.role !== 'self_form') {
    return {
      companions: input.companions,
      healed: 0,
      formName: null,
      ok: false,
      message: 'Нет активного облика',
    }
  }
  if (form.stats.hp == null || form.stats.hp_max == null) {
    return {
      companions: input.companions,
      healed: 0,
      formName: form.name || null,
      ok: false,
      message: 'У этой формы нет отдельного пула хитов',
    }
  }
  if (amount <= 0) {
    return {
      companions: input.companions,
      healed: 0,
      formName: form.name || null,
      ok: false,
      message: 'Нет лечения',
    }
  }
  const before = Math.max(0, form.stats.hp)
  const max = Math.max(0, form.stats.hp_max)
  const after = Math.min(max, before + amount)
  const healed = after - before
  const companions = input.companions.map((row) =>
    row.id === form.id
      ? {
          ...row,
          active: true,
          stats: { ...row.stats, hp: after },
        }
      : row,
  )
  return {
    companions,
    healed,
    formName: form.name || null,
    ok: true,
    message:
      healed > 0
        ? `${form.name || 'Облик'}: +${healed} HP (${before}→${after})`
        : `${form.name || 'Облик'}: уже полный HP`,
  }
}

/** Fallback MM elemental stats when catalog row missing (pre-migrate / offline). */
export const ELEMENTAL_FALLBACK_STATS: Record<
  string,
  Omit<BestiaryFormPick, 'slug' | 'name_ru' | 'catalog_id'>
> = {
  air: {
    cr: '5',
    type: 'elemental',
    ac: 15,
    hp: 90,
    speed_walk: 0,
    speed_fly: 90,
    str: 14,
    dex: 20,
    con: 14,
    resistances:
      'электричество, звук; дробящий, колющий и рубящий от немагических атак',
    immunities: 'яд',
    actions_text: 'Вихрь; Мультиатака; Удар (см. MM).',
  },
  earth: {
    cr: '5',
    type: 'elemental',
    ac: 17,
    hp: 126,
    speed_walk: 30,
    speed_swim: undefined,
    actions_text: 'Мультиатака; Удар; Землетрясение (см. MM).',
  },
  fire: {
    cr: '5',
    type: 'elemental',
    ac: 13,
    hp: 102,
    speed_walk: 50,
    actions_text: 'Мультиатака; Касание; Пожар (см. MM).',
  },
  water: {
    cr: '5',
    type: 'elemental',
    ac: 14,
    hp: 114,
    speed_walk: 30,
    speed_swim: 90,
    actions_text: 'Мультиатака; Удар; Водяной вал (см. MM).',
  },
}
