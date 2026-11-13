/**
 * Pack 04 — sorcerer origins and warlock patrons (PHB / XGE / TCE / Dragonlance).
 * Pure tables and checks. Sheet sync lives next to the other origin spell syncs.
 */

import { resolveSubclassFeatureSlug } from './classFeatures'
import type { FeaturePicksState } from './featurePicks'
import { getFeaturePick, setFeaturePick } from './featurePicks'
import type { SubclassGrantPicks } from './subclassGrants'
import {
  invocationById,
  type WarlockPactBoonId,
} from './warlockInvocations'

export type LunarPhase = 'full_moon' | 'new_moon' | 'crescent_moon'
export type DivineAffinity = 'good' | 'evil' | 'law' | 'chaos' | 'neutral'
export type GenieKind = 'dao' | 'djinni' | 'efreeti' | 'marid'

export type OriginSpellRow = {
  name: string
  level: number
  fromClassLevel: number
  /** Lunar column, when the spell belongs to one phase. */
  phase?: LunarPhase
}

export const PSIONIC_SORCERY_MIN_LEVEL = 6
export const EYES_OF_THE_DARK_COST = 2
export const EYES_OF_THE_DARK_MIN_LEVEL = 3
export const LUNAR_PHENOMENON_REPEAT_COST = 5
export const LUNAR_BOONS_MIN_LEVEL = 6
export const FLEXIBLE_CASTING_MAX_SLOT = 5
export const SORCEROUS_RESTORATION_POINTS = 4

export const ABERRANT_MIND_SPELLS: OriginSpellRow[] = [
  { name: 'Mind Sliver', level: 0, fromClassLevel: 1 },
  { name: 'Arms of Hadar', level: 1, fromClassLevel: 1 },
  { name: 'Dissonant Whispers', level: 1, fromClassLevel: 1 },
  { name: 'Calm Emotions', level: 2, fromClassLevel: 3 },
  { name: 'Detect Thoughts', level: 2, fromClassLevel: 3 },
  { name: 'Hunger of Hadar', level: 3, fromClassLevel: 5 },
  { name: 'Sending', level: 3, fromClassLevel: 5 },
  { name: 'Black Tentacles', level: 4, fromClassLevel: 7 },
  { name: 'Summon Aberration', level: 4, fromClassLevel: 7 },
  { name: 'Telepathic Bond', level: 5, fromClassLevel: 9 },
  { name: 'Telekinesis', level: 5, fromClassLevel: 9 },
]

export const CLOCKWORK_SOUL_SPELLS: OriginSpellRow[] = [
  { name: 'Alarm', level: 1, fromClassLevel: 1 },
  { name: 'Protection from Evil and Good', level: 1, fromClassLevel: 1 },
  { name: 'Aid', level: 2, fromClassLevel: 3 },
  { name: 'Lesser Restoration', level: 2, fromClassLevel: 3 },
  { name: 'Dispel Magic', level: 3, fromClassLevel: 5 },
  { name: 'Protection from Energy', level: 3, fromClassLevel: 5 },
  { name: 'Freedom of Movement', level: 4, fromClassLevel: 7 },
  { name: 'Summon Construct', level: 4, fromClassLevel: 7 },
  { name: 'Greater Restoration', level: 5, fromClassLevel: 9 },
  { name: 'Wall of Force', level: 5, fromClassLevel: 9 },
]

/** XGE Divine Magic affinity spell (does not count against spells known). */
export const DIVINE_AFFINITY_SPELL: Record<DivineAffinity, string> = {
  good: 'Cure Wounds',
  evil: 'Inflict Wounds',
  law: 'Bless',
  chaos: 'Bane',
  neutral: 'Protection from Evil and Good',
}

export const SHADOW_DARKNESS: OriginSpellRow = {
  name: 'Darkness',
  level: 2,
  fromClassLevel: 3,
}

/** Dragonlance Lunar Spells. All three columns are known; the phase gates the free cast. */
export const LUNAR_SPELLS: OriginSpellRow[] = [
  { name: 'Shield', level: 1, fromClassLevel: 1, phase: 'full_moon' },
  { name: 'Ray of Sickness', level: 1, fromClassLevel: 1, phase: 'new_moon' },
  { name: 'Color Spray', level: 1, fromClassLevel: 1, phase: 'crescent_moon' },
  { name: 'Lesser Restoration', level: 2, fromClassLevel: 3, phase: 'full_moon' },
  { name: 'Blindness/Deafness', level: 2, fromClassLevel: 3, phase: 'new_moon' },
  { name: 'Alter Self', level: 2, fromClassLevel: 3, phase: 'crescent_moon' },
  { name: 'Dispel Magic', level: 3, fromClassLevel: 5, phase: 'full_moon' },
  { name: 'Vampiric Touch', level: 3, fromClassLevel: 5, phase: 'new_moon' },
  { name: 'Phantom Steed', level: 3, fromClassLevel: 5, phase: 'crescent_moon' },
  { name: 'Death Ward', level: 4, fromClassLevel: 7, phase: 'full_moon' },
  { name: 'Confusion', level: 4, fromClassLevel: 7, phase: 'new_moon' },
  { name: 'Hallucinatory Terrain', level: 4, fromClassLevel: 7, phase: 'crescent_moon' },
  { name: 'Telepathic Bond', level: 5, fromClassLevel: 9, phase: 'full_moon' },
  { name: 'Hold Monster', level: 5, fromClassLevel: 9, phase: 'new_moon' },
  { name: 'Mislead', level: 5, fromClassLevel: 9, phase: 'crescent_moon' },
]

export const MOON_FIRE_CANTRIP: OriginSpellRow = {
  name: 'Sacred Flame',
  level: 0,
  fromClassLevel: 1,
}

export const LUNAR_PHASE_LABEL: Record<LunarPhase, string> = {
  full_moon: 'Полная луна',
  new_moon: 'Новая луна',
  crescent_moon: 'Серп',
}

/** Errata schools (D&D Beyond): the printed Dragonlance table swapped two columns. */
export const LUNAR_PHASE_SCHOOLS: Record<LunarPhase, string> = {
  full_moon: 'ограждение и прорицание',
  new_moon: 'очарование и некромантия',
  crescent_moon: 'иллюзия и преобразование',
}

export const LUNAR_PHENOMENON_TEXT: Record<LunarPhase, string> = {
  full_moon:
    'Существа на выбор в 30 фт.: спас Телосложения или ослепление до конца их следующего хода. Одно существо на выбор в этой области восстанавливает 3к8 хитов.',
  new_moon:
    'Существа на выбор в 30 фт.: спас Ловкости или 3к10 некротического и скорость 0 до конца их следующего хода. Ты невидим до конца своего следующего хода или до атаки/заклинания.',
  crescent_moon:
    'Телепорт в свободное место в 60 фт. Можно взять одно согласное существо в 5 фт. Ты и оно получаете сопротивление всему урону до начала твоего следующего хода.',
}

const DRAGON_DAMAGE: Record<string, string> = {
  black: 'кислота',
  blue: 'молния',
  brass: 'огонь',
  bronze: 'молния',
  copper: 'кислота',
  gold: 'огонь',
  green: 'яд',
  red: 'огонь',
  silver: 'холод',
  white: 'холод',
}

const PATRON_EXPANDED: Record<string, string[]> = {
  the_archfey: [
    'faerie_fire',
    'sleep',
    'calm_emotions',
    'phantasmal_force',
    'blink',
    'plant_growth',
    'dominate_beast',
    'greater_invisibility',
    'dominate_person',
    'seeming',
  ],
  the_fiend: [
    'burning_hands',
    'command',
    'blindness_deafness',
    'scorching_ray',
    'fireball',
    'stinking_cloud',
    'fire_shield',
    'wall_of_fire',
    'flame_strike',
    'hallow',
  ],
  the_great_old_one: [
    'dissonant_whispers',
    'hideous_laughter',
    'detect_thoughts',
    'phantasmal_force',
    'clairvoyance',
    'sending',
    'dominate_beast',
    'black_tentacles',
    'dominate_person',
    'telekinesis',
  ],
  the_undying: [
    'false_life',
    'ray_of_sickness',
    'blindness_deafness',
    'silence',
    'feign_death',
    'speak_with_dead',
    'aura_of_life',
    'death_ward',
    'contagion',
    'legend_lore',
  ],
  the_celestial: [
    'cure_wounds',
    'guiding_bolt',
    'flaming_sphere',
    'lesser_restoration',
    'daylight',
    'revivify',
    'guardian_of_faith',
    'wall_of_fire',
    'flame_strike',
    'greater_restoration',
  ],
  the_hexblade: [
    'shield',
    'wrathful_smite',
    'blur',
    'branding_smite',
    'blink',
    'elemental_weapon',
    'phantasmal_killer',
    'staggering_smite',
    'banishing_smite',
    'cone_of_cold',
  ],
  the_fathomless: [
    'create_or_destroy_water',
    'thunderwave',
    'gust_of_wind',
    'silence',
    'lightning_bolt',
    'sleet_storm',
    'control_water',
    'summon_elemental',
    'bigby_s_hand',
    'cone_of_cold',
  ],
  the_undead: [
    'bane',
    'false_life',
    'blindness_deafness',
    'phantasmal_force',
    'phantom_steed',
    'speak_with_dead',
    'death_ward',
    'greater_invisibility',
    'antilife_shell',
    'cloudkill',
  ],
}

const GENIE_SHARED = [
  'detect_evil_and_good',
  'phantasmal_force',
  'create_food_and_water',
  'phantasmal_killer',
  'creation',
  'wish',
]

const GENIE_KIND_SPELLS: Record<GenieKind, string[]> = {
  dao: ['sanctuary', 'spike_growth', 'meld_into_stone', 'stone_shape', 'wall_of_stone'],
  djinni: ['thunderwave', 'gust_of_wind', 'wind_wall', 'greater_invisibility', 'seeming'],
  efreeti: ['burning_hands', 'scorching_ray', 'fireball', 'fire_shield', 'flame_strike'],
  marid: ['fog_cloud', 'blur', 'sleet_storm', 'control_water', 'cone_of_cold'],
}

export type PactBladeForm = {
  id: string
  nameRu: string
  damage: string
  damageType: string
  finesse: boolean
}

/** PHB melee weapons a Pact of the Blade weapon can take. */
export const PACT_BLADE_FORMS: PactBladeForm[] = [
  { id: 'club', nameRu: 'Дубинка', damage: '1d4', damageType: 'дробящий', finesse: false },
  { id: 'dagger', nameRu: 'Кинжал', damage: '1d4', damageType: 'колющий', finesse: true },
  { id: 'greatclub', nameRu: 'Палица', damage: '1d8', damageType: 'дробящий', finesse: false },
  { id: 'handaxe', nameRu: 'Ручной топор', damage: '1d6', damageType: 'рубящий', finesse: false },
  { id: 'javelin', nameRu: 'Дротик', damage: '1d6', damageType: 'колющий', finesse: false },
  { id: 'light_hammer', nameRu: 'Лёгкий молот', damage: '1d4', damageType: 'дробящий', finesse: false },
  { id: 'mace', nameRu: 'Булава', damage: '1d6', damageType: 'дробящий', finesse: false },
  { id: 'quarterstaff', nameRu: 'Боевой посох', damage: '1d6', damageType: 'дробящий', finesse: false },
  { id: 'sickle', nameRu: 'Серп', damage: '1d4', damageType: 'рубящий', finesse: false },
  { id: 'spear', nameRu: 'Копьё', damage: '1d6', damageType: 'колющий', finesse: false },
  { id: 'battleaxe', nameRu: 'Боевой топор', damage: '1d8', damageType: 'рубящий', finesse: false },
  { id: 'flail', nameRu: 'Цеп', damage: '1d8', damageType: 'дробящий', finesse: false },
  { id: 'glaive', nameRu: 'Глефа', damage: '1d10', damageType: 'рубящий', finesse: false },
  { id: 'greataxe', nameRu: 'Секира', damage: '1d12', damageType: 'рубящий', finesse: false },
  { id: 'greatsword', nameRu: 'Двуручный меч', damage: '2d6', damageType: 'рубящий', finesse: false },
  { id: 'halberd', nameRu: 'Алебарда', damage: '1d10', damageType: 'рубящий', finesse: false },
  { id: 'lance', nameRu: 'Длинное копьё', damage: '1d12', damageType: 'колющий', finesse: false },
  { id: 'longsword', nameRu: 'Длинный меч', damage: '1d8', damageType: 'рубящий', finesse: false },
  { id: 'maul', nameRu: 'Молот', damage: '2d6', damageType: 'дробящий', finesse: false },
  { id: 'morningstar', nameRu: 'Моргенштерн', damage: '1d8', damageType: 'колющий', finesse: false },
  { id: 'pike', nameRu: 'Пика', damage: '1d10', damageType: 'колющий', finesse: false },
  { id: 'rapier', nameRu: 'Рапира', damage: '1d8', damageType: 'колющий', finesse: true },
  { id: 'scimitar', nameRu: 'Скимитар', damage: '1d6', damageType: 'рубящий', finesse: true },
  { id: 'shortsword', nameRu: 'Короткий меч', damage: '1d6', damageType: 'колющий', finesse: true },
  { id: 'trident', nameRu: 'Трезубец', damage: '1d6', damageType: 'колющий', finesse: false },
  { id: 'war_pick', nameRu: 'Боевая кирка', damage: '1d8', damageType: 'колющий', finesse: false },
  { id: 'warhammer', nameRu: 'Боевой молот', damage: '1d8', damageType: 'дробящий', finesse: false },
  { id: 'whip', nameRu: 'Кнут', damage: '1d4', damageType: 'рубящий', finesse: true },
]

export function pactBladeFormById(id: string | null | undefined): PactBladeForm | null {
  if (!id) return null
  return PACT_BLADE_FORMS.find((row) => row.id === id) ?? null
}

export function psionicSorceryPointCost(spellLevel: number): number {
  return Math.max(1, Math.floor(spellLevel))
}

export function normalizeLunarPhase(raw: string | null | undefined): LunarPhase | null {
  const value = (raw ?? '').trim().toLowerCase().replace(/\s+/g, '_')
  if (value === 'full' || value === 'full_moon' || value === 'полная' || value === 'полная_луна') {
    return 'full_moon'
  }
  if (value === 'new' || value === 'new_moon' || value === 'новая' || value === 'новая_луна') {
    return 'new_moon'
  }
  if (
    value === 'crescent' ||
    value === 'crescent_moon' ||
    value === 'серп' ||
    value === 'полумесяц'
  ) {
    return 'crescent_moon'
  }
  return null
}

export function lunarPhaseCatalogValue(phase: LunarPhase): string {
  if (phase === 'full_moon') return 'full'
  if (phase === 'new_moon') return 'new'
  return 'crescent'
}

export function normalizeDivineAffinity(raw: string | null | undefined): DivineAffinity | null {
  const value = (raw ?? '').trim().toLowerCase()
  if (value === 'good' || value === 'добро') return 'good'
  if (value === 'evil' || value === 'зло') return 'evil'
  if (value === 'law' || value === 'закон') return 'law'
  if (value === 'chaos' || value === 'хаос') return 'chaos'
  if (value === 'neutral' || value === 'neutrality' || value === 'нейтрал') return 'neutral'
  return null
}

export function divineAffinityFeatureValue(affinity: DivineAffinity): string {
  return affinity
}

export function divineAffinityCatalogValue(affinity: DivineAffinity): string {
  return affinity === 'neutral' ? 'neutrality' : affinity
}

export function normalizeGenieKind(raw: string | null | undefined): GenieKind | null {
  const value = (raw ?? '').trim().toLowerCase()
  if (value === 'dao' || value === 'djinni' || value === 'efreeti' || value === 'marid') {
    return value
  }
  return null
}

export function resolveSubclassSlug(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  return resolveSubclassFeatureSlug(raw) ?? raw.trim().toLowerCase().replace(/\s+/g, '_')
}

function grantPickString(
  picks: Record<string, string | string[]> | undefined,
  id: string,
): string | null {
  const raw = picks?.[id]
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

export function lunarPhaseFromStores(input: {
  featurePicks: FeaturePicksState
  classEntryId: string
  grantPicks?: Record<string, string | string[]> | null
}): LunarPhase | null {
  const feature = normalizeLunarPhase(
    getFeaturePick(input.featurePicks, input.classEntryId, 'lunar_embodiment'),
  )
  if (feature) return feature
  return (
    normalizeLunarPhase(grantPickString(input.grantPicks ?? undefined, 'lunar_phase')) ??
    normalizeLunarPhase(grantPickString(input.grantPicks ?? undefined, 'moon_phase'))
  )
}

export function divineAffinityFromStores(input: {
  featurePicks: FeaturePicksState
  classEntryId: string
  grantPicks?: Record<string, string | string[]> | null
}): DivineAffinity | null {
  return (
    normalizeDivineAffinity(
      getFeaturePick(input.featurePicks, input.classEntryId, 'divine_magic'),
    ) ?? normalizeDivineAffinity(grantPickString(input.grantPicks ?? undefined, 'divine_affinity'))
  )
}

/** Copy a subclass-setup phase/affinity into the feature card, and back. */
export function bridgeOriginPicks(input: {
  featurePicks: FeaturePicksState
  classEntryId: string
  subclassSlug: string | null
  grantPicks: SubclassGrantPicks
}): FeaturePicksState {
  const slug = resolveSubclassSlug(input.subclassSlug)
  const values = input.grantPicks.values
  let next = input.featurePicks
  if (slug === 'lunar_sorcery') {
    const phase =
      normalizeLunarPhase(grantPickString(values, 'lunar_phase')) ??
      normalizeLunarPhase(grantPickString(values, 'moon_phase'))
    if (phase) next = setFeaturePick(next, input.classEntryId, 'lunar_embodiment', phase)
  }
  if (slug === 'divine_soul') {
    const affinity = normalizeDivineAffinity(grantPickString(values, 'divine_affinity'))
    if (affinity) {
      next = setFeaturePick(
        next,
        input.classEntryId,
        'divine_magic',
        divineAffinityFeatureValue(affinity),
      )
    }
  }
  return next
}

export function warlockExpandedSlugSet(
  subclassSlug: string | null | undefined,
  genieKind: string | null | undefined,
): Set<string> {
  const slug = resolveSubclassSlug(subclassSlug)
  if (!slug) return new Set()
  if (slug === 'the_genie') {
    const kind = normalizeGenieKind(genieKind)
    return new Set([...GENIE_SHARED, ...(kind ? GENIE_KIND_SPELLS[kind] : [])])
  }
  return new Set(PATRON_EXPANDED[slug] ?? [])
}

export function spellOnWarlockExpandedList(input: {
  spellSlug: string | null | undefined
  subclassSlug: string | null | undefined
  genieKind: string | null | undefined
}): boolean {
  const slug = (input.spellSlug ?? '').trim().toLowerCase()
  if (!slug) return false
  return warlockExpandedSlugSet(input.subclassSlug, input.genieKind).has(slug)
}

/**
 * Extra learn-list membership that the base `classes` tags do not carry:
 * Divine Soul may learn cleric spells; a patron's expanded list joins the warlock list.
 */
export function pack04ExtraClassList(input: {
  catalogClasses: string[]
  spellSlug?: string | null
  shelfSlug: string
  subclassSlug?: string | null
  genieKind?: string | null
}): boolean {
  const shelf = input.shelfSlug.trim().toLowerCase()
  const classes = input.catalogClasses.map((row) => row.trim().toLowerCase())
  const subclass = resolveSubclassSlug(input.subclassSlug)
  if (shelf === 'sorcerer' && subclass === 'divine_soul' && classes.includes('cleric')) {
    return true
  }
  if (shelf === 'warlock') {
    return spellOnWarlockExpandedList({
      spellSlug: input.spellSlug,
      subclassSlug: subclass,
      genieKind: input.genieKind,
    })
  }
  return false
}

export function elementalAffinityPreview(input: {
  subclassSlug: string | null | undefined
  sorcererLevel: number
  ancestry: string | null | undefined
  chaMod: number
}): { damageType: string; amount: number } | null {
  if (resolveSubclassSlug(input.subclassSlug) !== 'draconic_bloodline') return null
  if (Math.floor(input.sorcererLevel) < 6) return null
  const type = DRAGON_DAMAGE[(input.ancestry ?? '').trim().toLowerCase()]
  if (!type) return null
  return { damageType: type, amount: Math.trunc(input.chaMod) }
}

export function invocationPrerequisiteError(
  invocationId: string,
  warlockLevel: number,
  pact: string | null | undefined,
): string | null {
  const def = invocationById(invocationId)
  if (!def) return null
  const level = Math.max(0, Math.floor(warlockLevel))
  const pactId =
    pact === 'blade' || pact === 'chain' || pact === 'tome' || pact === 'talisman'
      ? (pact as WarlockPactBoonId)
      : null
  if (def.minLevel != null && level < def.minLevel) {
    return `${def.nameRu}: нужно ${def.minLevel} уровень колдуна`
  }
  if (def.requiresPact && def.requiresPact !== pactId) {
    const pactName =
      def.requiresPact === 'blade'
        ? 'Клинок'
        : def.requiresPact === 'chain'
          ? 'Цепь'
          : def.requiresPact === 'tome'
            ? 'Гримуар'
            : 'Талисман'
    return `${def.nameRu}: нужен договор «${pactName}»`
  }
  return null
}

export function invocationIsSelectable(
  invocationId: string,
  warlockLevel: number,
  pact: string | null | undefined,
): boolean {
  return invocationPrerequisiteError(invocationId, warlockLevel, pact) == null
}

export const MYSTIC_ARCANUM_FEATURES = [
  { featureId: 'mystic_arcanum_6', level: 6 },
  { featureId: 'mystic_arcanum_7', level: 7 },
  { featureId: 'mystic_arcanum_8', level: 8 },
  { featureId: 'mystic_arcanum_9', level: 9 },
] as const

export function mysticArcanumLevel(featureId: string): number | null {
  return MYSTIC_ARCANUM_FEATURES.find((row) => row.featureId === featureId)?.level ?? null
}

export function pack04CustomSpendFeature(featureId: string): boolean {
  return (
    featureId === 'eyes_of_the_dark' ||
    featureId === 'psionic_sorcery' ||
    featureId === 'lunar_phenomenon' ||
    featureId === 'eldritch_master' ||
    mysticArcanumLevel(featureId) != null
  )
}

export function lunarFirstLevelSpell(phase: LunarPhase): OriginSpellRow | null {
  return (
    LUNAR_SPELLS.find((row) => row.phase === phase && row.level === 1) ?? null
  )
}

export function familiarCostNote(slotLevel: number | null | undefined): string {
  if (slotLevel != null && slotLevel > 0) return `ячейка ${slotLevel} списана`
  return 'ритуал, ячейка не списана'
}
