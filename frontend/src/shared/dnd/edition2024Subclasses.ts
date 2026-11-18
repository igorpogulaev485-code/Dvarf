/**
 * P24-M02b: subclass resources / always-prepared / third-caster for 2024 sheets.
 * Mirror of backend/app/dnd/edition_2024_subclasses.py.
 */
import subclassesSrd from './data/edition2024/subclasses_srd.json'
import subclassesEfa from './data/edition2024/subclasses_efa.json'
import subclassesPh24 from './data/edition2024/subclasses_ph24.json'
import subclassesFrhof from './data/edition2024/subclasses_frhof.json'
import subclassesRtw from './data/edition2024/subclasses_rtw.json'
import subclassesAu from './data/edition2024/subclasses_au.json'

type CatalogFile = {
  meta?: { source?: string }
  entries: Array<{
    slug: string
    name_ru?: string
    name_en?: string
    source?: string
    data: Record<string, unknown>
  }>
}

export type SubclassCatalogRow = {
  slug: string
  name_ru: string
  name_en: string
  source: string
  data: Record<string, unknown>
}

export const THIRD_CASTER_SUBCLASSES: Record<
  string,
  { ability: string; name_ru: string }
> = {
  'fighter__eldritch-knight': { ability: 'int', name_ru: 'Заклинания мистического рыцаря' },
  'rogue__arcane-trickster': { ability: 'int', name_ru: 'Заклинания мистического ловкача' },
  'monk__warrior-of-the-mystic-arts': {
    ability: 'wis',
    name_ru: 'Заклинания мистического воина',
  },
}

const THIRD_CASTER_SLOTS: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
]

const THIRD_CASTER_CANTRIPS = [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
const THIRD_CASTER_SPELLS_KNOWN = [
  0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13,
]

function abilityMod(score: number): number {
  return Math.floor((Math.max(1, Math.floor(score)) - 10) / 2)
}

function scaleUses(level: number, table: Record<number, number>): number {
  let best = 0
  for (const [lv, val] of Object.entries(table)) {
    if (level >= Number(lv)) best = val
  }
  return best
}

function psiTable(level: number): { count: number; die: string } {
  const rows: Array<[number, number, string]> = [
    [3, 4, 'd6'],
    [5, 6, 'd8'],
    [9, 8, 'd8'],
    [11, 8, 'd10'],
    [13, 10, 'd10'],
    [17, 12, 'd12'],
  ]
  let count = 0
  let die = 'd6'
  for (const [lv, c, d] of rows) {
    if (level >= lv) {
      count = c
      die = d
    }
  }
  return { count, die }
}

function superiorityDie(level: number): string {
  if (level >= 18) return 'd12'
  if (level >= 10) return 'd10'
  return 'd8'
}

function buildCatalog(): Record<string, SubclassCatalogRow> {
  const out: Record<string, SubclassCatalogRow> = {}
  for (const file of [
    subclassesSrd,
    subclassesEfa,
    subclassesPh24,
    subclassesFrhof,
    subclassesRtw,
    subclassesAu,
  ] as CatalogFile[]) {
    const source = file.meta?.source || '2024'
    for (const entry of file.entries || []) {
      const slug = String(entry.slug || '').trim()
      if (!slug) continue
      out[slug] = {
        slug,
        name_ru: entry.name_ru || slug,
        name_en: entry.name_en || slug,
        source: entry.source || source,
        data: entry.data || {},
      }
    }
  }
  return out
}

export const SUBCLASS_CATALOG_2024 = buildCatalog()

/** PHB 2024 create wizard: core PHB/SRD subclasses only (no XGE/SCAG/FRHoF/AU). */
const CREATE_SUBCLASS_SOURCES_2024 = new Set(['ph24', 'srd-5.2', 'srd'])

/** EFA Artificer specialties (Forge of the Artificer) — allowed in create; not RTW Reanimator. */
const EFA_ARTIFICER_SUBCLASS_SLUGS = new Set([
  'artificer__alchemist',
  'artificer__armorer',
  'artificer__artillerist',
  'artificer__battle-smith',
  'artificer__cartographer',
])

/**
 * Book wizard paths opened by P24-M02B-wizard (AU + FRHoF Bladesinger).
 * Other book subclasses stay hidden until their M02B pack.
 */
export const M02B_WIZARD_BOOK_SUBCLASS_SLUGS = new Set([
  'wizard__conjurer',
  'wizard__enchanter',
  'wizard__necromancer',
  'wizard__transmuter',
  'wizard__bladesinger',
])

/**
 * Book sorcerer paths opened by P24-M02B-sorcerer (FRHoF Spellfire + RTW Shadow).
 */
export const M02B_SORCERER_BOOK_SUBCLASS_SLUGS = new Set([
  'sorcerer__spellfire-sorcery',
  'sorcerer__shadow-sorcery',
])

/**
 * Book monk path opened by P24-M02B-monk (AU Mystic Arts only).
 */
export const M02B_MONK_BOOK_SUBCLASS_SLUGS = new Set(['monk__warrior-of-the-mystic-arts'])

export function isPhb2024CreateSubclass(slug: string, source?: string | null): boolean {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
  const row = SUBCLASS_CATALOG_2024[key] || SUBCLASS_CATALOG_2024[slug]
  const src = String(source || row?.source || '')
    .trim()
    .toLowerCase()
  if (CREATE_SUBCLASS_SOURCES_2024.has(src)) return true
  // Artificer EFA specialties (P24-M02-artificer); exclude Reanimator (rtw / out of pack).
  if (src === 'efa' && EFA_ARTIFICER_SUBCLASS_SLUGS.has(key)) return true
  if (!src && EFA_ARTIFICER_SUBCLASS_SLUGS.has(key)) return true
  // P24-M02B-wizard: AU schools + FRHoF Bladesinger only.
  if (M02B_WIZARD_BOOK_SUBCLASS_SLUGS.has(key)) return true
  // P24-M02B-sorcerer: Spellfire + Shadow only.
  if (M02B_SORCERER_BOOK_SUBCLASS_SLUGS.has(key)) return true
  // P24-M02B-monk: Mystic Arts only.
  if (M02B_MONK_BOOK_SUBCLASS_SLUGS.has(key)) return true
  // Catalog API may omit source; fall back to known PHB table rows.
  return Boolean(row && CREATE_SUBCLASS_SOURCES_2024.has(String(row.source || '').toLowerCase()))
}

export function listSubclassSlugs2024(): string[] {
  return Object.keys(SUBCLASS_CATALOG_2024).sort()
}

export function subclassParent2024(slug: string): string | null {
  const parent = String(SUBCLASS_CATALOG_2024[slug]?.data?.parent_class || '').trim()
  return parent || null
}

export type SubclassResource2024 = {
  id: string
  pool_id: string
  class_slug: string
  subclass_slug: string
  name: string
  max: number
  reset: 'short' | 'long'
  shortRestRegain?: number
  die?: string
  feature_id: string
  track?: 'spend' | 'stock'
}

export type SharedPoolOption2024 = {
  feature_id: string
  name_ru: string
  spend_pool: string
  cost: number
  cost_max?: number
  kind: string
  min_level: number
}

export type PermanentBonus2024 = {
  feature_id: string
  name_ru: string
  kind: string
  value: unknown
  min_level: number
  note_ru?: string
}

const SHARED_OPTIONS_2024: Record<string, SharedPoolOption2024[]> = {
  'cleric__light-domain': [
    { feature_id: 'radiance-of-the-dawn', name_ru: 'Сияние рассвета', spend_pool: 'channel_divinity', cost: 1, kind: 'action', min_level: 3 },
  ],
  'cleric__life-domain': [
    { feature_id: 'preserve-life', name_ru: 'Сохранение жизни', spend_pool: 'channel_divinity', cost: 1, kind: 'action', min_level: 3 },
  ],
  'cleric__war-domain': [
    { feature_id: 'guided-strike', name_ru: 'Направленный удар', spend_pool: 'channel_divinity', cost: 1, kind: 'reaction', min_level: 3 },
    { feature_id: 'war-gods-blessing', name_ru: 'Благословение бога войны', spend_pool: 'channel_divinity', cost: 1, kind: 'action', min_level: 6 },
  ],
  'cleric__trickery-domain': [
    { feature_id: 'invoke-duplicity', name_ru: 'Двуличность', spend_pool: 'channel_divinity', cost: 1, kind: 'bonus', min_level: 3 },
  ],
  'cleric__knowledge-domain': [
    { feature_id: 'mind-magic', name_ru: 'Магия разума', spend_pool: 'channel_divinity', cost: 1, kind: 'action', min_level: 3 },
  ],
  'cleric__arcana-domain': [
    { feature_id: 'modify-magic', name_ru: 'Изменение магии', spend_pool: 'channel_divinity', cost: 1, kind: 'action', min_level: 3 },
  ],
  'cleric__grave-domain': [
    { feature_id: 'path-to-the-grave', name_ru: 'Путь в могилу', spend_pool: 'channel_divinity', cost: 1, kind: 'action', min_level: 3 },
  ],
  'paladin__oath-of-devotion': [
    { feature_id: 'sacred-weapon', name_ru: 'Священное оружие', spend_pool: 'channel_divinity', cost: 1, kind: 'attack', min_level: 3 },
  ],
  'paladin__oath-of-the-ancients': [
    { feature_id: 'natures-wrath', name_ru: 'Гнев природы', spend_pool: 'channel_divinity', cost: 1, kind: 'action', min_level: 3 },
  ],
  'paladin__oath-of-vengeance': [
    { feature_id: 'vow-of-enmity', name_ru: 'Обет вражды', spend_pool: 'channel_divinity', cost: 1, kind: 'attack', min_level: 3 },
  ],
  'paladin__oath-of-glory': [
    { feature_id: 'inspiring-smite', name_ru: 'Воодушевляющая кара', spend_pool: 'channel_divinity', cost: 1, kind: 'bonus', min_level: 3 },
    { feature_id: 'peerless-athlete', name_ru: 'Непревзойдённый атлет', spend_pool: 'channel_divinity', cost: 1, kind: 'bonus', min_level: 3 },
  ],
  'paladin__oath-of-the-noble-genies': [
    { feature_id: 'elemental-smite', name_ru: 'Стихийная кара', spend_pool: 'channel_divinity', cost: 1, kind: 'bonus', min_level: 3 },
  ],
  'bard__lore': [
    { feature_id: 'cutting-words', name_ru: 'Острые слова', spend_pool: 'bardic_inspiration', cost: 1, kind: 'reaction', min_level: 3 },
    { feature_id: 'peerless-skill', name_ru: 'Бесподобный навык', spend_pool: 'bardic_inspiration', cost: 1, kind: 'passive', min_level: 14 },
  ],
  'bard__glamour': [
    { feature_id: 'mantle-of-inspiration', name_ru: 'Мантия вдохновения', spend_pool: 'bardic_inspiration', cost: 1, kind: 'bonus', min_level: 3 },
  ],
  'bard__valor': [
    { feature_id: 'combat-inspiration', name_ru: 'Боевое вдохновение', spend_pool: 'bardic_inspiration', cost: 1, kind: 'passive', min_level: 3 },
  ],
  'bard__dance': [
    { feature_id: 'inspiring-movement', name_ru: 'Вдохновляющие движения', spend_pool: 'bardic_inspiration', cost: 1, kind: 'reaction', min_level: 6 },
    { feature_id: 'tandem-footwork', name_ru: 'Совместный танец', spend_pool: 'bardic_inspiration', cost: 1, kind: 'reaction', min_level: 6 },
  ],
  'bard__college-of-the-moon': [
    { feature_id: 'moons-inspiration', name_ru: 'Вдохновение луны', spend_pool: 'bardic_inspiration', cost: 1, kind: 'bonus', min_level: 3 },
  ],
  'bard__college-of-the-spirits': [
    { feature_id: 'spirits-from-beyond', name_ru: 'Духи извне', spend_pool: 'bardic_inspiration', cost: 1, kind: 'bonus', min_level: 3 },
  ],
  'monk__warrior-of-the-hand': [
    { feature_id: 'open-hand-technique', name_ru: 'Техники открытой ладони', spend_pool: 'focus_points', cost: 0, kind: 'passive', min_level: 3 },
    { feature_id: 'fleet-step', name_ru: 'Быстрые ноги', spend_pool: 'focus_points', cost: 0, kind: 'bonus', min_level: 11 },
    { feature_id: 'quivering-palm', name_ru: 'Дрожащая ладонь', spend_pool: 'focus_points', cost: 4, kind: 'action', min_level: 17 },
  ],
  'monk__warrior-of-mercy': [
    { feature_id: 'hand-of-healing', name_ru: 'Исцеляющая рука', spend_pool: 'focus_points', cost: 1, kind: 'action', min_level: 3 },
    { feature_id: 'hand-of-harm', name_ru: 'Повреждающая рука', spend_pool: 'focus_points', cost: 1, kind: 'passive', min_level: 3 },
    {
      feature_id: 'flurry-of-healing-and-harm',
      name_ru: 'Шквал исцеления и повреждения',
      spend_pool: 'flurry_of_healing_and_harm',
      cost: 1,
      kind: 'passive',
      min_level: 11,
    },
    {
      feature_id: 'hand-of-ultimate-mercy',
      name_ru: 'Рука абсолютного милосердия',
      spend_pool: 'focus_points',
      cost: 5,
      kind: 'action',
      min_level: 17,
    },
  ],
  'monk__warrior-of-shadow': [
    { feature_id: 'shadow-arts', name_ru: 'Тёмные искусства', spend_pool: 'focus_points', cost: 1, kind: 'action', min_level: 3 },
    { feature_id: 'shadow-step', name_ru: 'Шаг в тень', spend_pool: 'focus_points', cost: 0, kind: 'bonus', min_level: 6 },
    {
      feature_id: 'improved-shadow-step',
      name_ru: 'Улучшенный шаг в тень',
      spend_pool: 'focus_points',
      cost: 1,
      kind: 'bonus',
      min_level: 11,
    },
    {
      feature_id: 'cloak-of-shadows',
      name_ru: 'Покров теней',
      spend_pool: 'focus_points',
      cost: 3,
      kind: 'bonus',
      min_level: 17,
    },
  ],
  'monk__warrior-of-the-elements': [
    { feature_id: 'elemental-attunement', name_ru: 'Сродство со стихиями', spend_pool: 'focus_points', cost: 1, kind: 'bonus', min_level: 3 },
    { feature_id: 'elemental-burst', name_ru: 'Стихийный выброс', spend_pool: 'focus_points', cost: 2, kind: 'action', min_level: 6 },
    {
      feature_id: 'elemental-epitome',
      name_ru: 'Воплощение стихий',
      spend_pool: 'focus_points',
      cost: 0,
      kind: 'passive',
      min_level: 17,
    },
  ],
  'monk__warrior-of-the-mystic-arts': [
    {
      feature_id: 'mystic-focus',
      name_ru: 'Мистическая сосредоточенность',
      spend_pool: 'focus_points',
      cost: 0,
      kind: 'action',
      min_level: 6,
    },
    {
      feature_id: 'focused-strike',
      name_ru: 'Сфокусированный удар',
      spend_pool: 'focus_points',
      cost: 0,
      kind: 'passive',
      min_level: 11,
    },
  ],
  'druid__land': [
    { feature_id: 'lands-aid', name_ru: 'Помощь земли', spend_pool: 'wild_shape', cost: 1, kind: 'action', min_level: 3 },
    { feature_id: 'natures-sanctuary', name_ru: 'Природное убежище', spend_pool: 'wild_shape', cost: 1, kind: 'action', min_level: 14 },
  ],
  'druid__stars': [
    { feature_id: 'starry-form', name_ru: 'Звёздный облик', spend_pool: 'wild_shape', cost: 1, kind: 'bonus', min_level: 3 },
  ],
  'druid__sea': [
    { feature_id: 'wrath-of-the-sea', name_ru: 'Гнев моря', spend_pool: 'wild_shape', cost: 1, kind: 'bonus', min_level: 3 },
  ],
  'sorcerer__wild-magic-sorcery': [
    { feature_id: 'bend-luck', name_ru: 'Искривление удачи', spend_pool: 'sorcery_points', cost: 1, kind: 'reaction', min_level: 6 },
  ],
  'sorcerer__clockwork-sorcery': [
    { feature_id: 'bastion-of-law', name_ru: 'Бастион закона', spend_pool: 'sorcery_points', cost: 1, cost_max: 5, kind: 'action', min_level: 6 },
  ],
  'sorcerer__aberrant-sorcery': [
    { feature_id: 'psionic-sorcery', name_ru: 'Псионическое чародейство', spend_pool: 'sorcery_points', cost: 1, kind: 'passive', min_level: 6 },
    { feature_id: 'revelation-in-flesh', name_ru: 'Откровение во плоти', spend_pool: 'sorcery_points', cost: 1, cost_max: 4, kind: 'bonus', min_level: 14 },
  ],
  'fighter__banneret': [
    { feature_id: 'group-recovery', name_ru: 'Групповое оздоровление', spend_pool: 'second_wind', cost: 1, kind: 'passive', min_level: 3 },
  ],
}

export function sharedOptionsForSubclass2024(
  subclassSlug: string,
  classLevel: number,
): SharedPoolOption2024[] {
  return (SHARED_OPTIONS_2024[subclassSlug] || []).filter((o) => classLevel >= o.min_level)
}

export function buildPermanentBonuses2024(input: {
  subclassSlug: string
  classLevel: number
  abilities?: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}): PermanentBonus2024[] {
  const { subclassSlug, classLevel } = input
  const ab = input.abilities || {}
  const out: PermanentBonus2024[] = []
  const add = (
    feature_id: string,
    name_ru: string,
    kind: string,
    value: unknown,
    min_level = 3,
    note_ru = '',
  ) => {
    if (classLevel < min_level) return
    out.push({ feature_id, name_ru, kind, value, min_level, note_ru })
  }
  if (subclassSlug === 'fighter__champion') {
    add('improved-critical', 'Улучшенные критические попадания', 'crit_threshold', 19)
    if (classLevel >= 15) add('superior-critical', 'Превосходные критические попадания', 'crit_threshold', 18, 15)
    add('remarkable-athlete', 'Выдающийся атлет', 'initiative_advantage', true)
  }
  if (subclassSlug === 'bard__dance') {
    add(
      'dazzling-footwork',
      'Ослепительные фуэте: Защита без доспехов',
      'ac_formula',
      { base: 10, mods: ['dex', 'cha'], allows_shield: false, requires_no_armor: true },
      3,
      'КД 10+Лов+Хар без доспеха и щита',
    )
  }
  if (subclassSlug === 'sorcerer__draconic-sorcery') {
    add('draconic-resilience', 'Драконья устойчивость', 'ac_formula', {
      base: 10,
      mods: ['dex', 'cha'],
      allows_shield: true,
      requires_no_armor: true,
    })
    add(
      'draconic-resilience',
      'Драконья устойчивость (хиты)',
      'hp_per_level',
      1,
      3,
      '+3 на 3 ур. чародея, затем +1 за уровень (на N сумма +N)',
    )
  }
  if (subclassSlug === 'wizard__evoker') {
    add(
      'potent-cantrip',
      'Мощные заговоры',
      'other_calc',
      { half_damage_on_miss_or_save: true, cantrips_only: true },
      3,
      'Промах или успех спасброска по заговору: цель получает половину урона, без доп. эффектов',
    )
    add(
      'sculpt-spells',
      'Построение заклинаний',
      'other_calc',
      { school: 'evocation', protected_creatures: '1+spell_level', auto_save: true },
      6,
      'Воплощение: 1 + круг существ автоматически преуспевают в спасброске и не получают урона',
    )
    add(
      'empowered-evocation',
      'Усиленное воплощение',
      'damage_rider',
      { add_ability: 'int', school: 'evocation', once_per_spell: true },
      10,
      '+мод. Инт к одному броску урона воплощения',
    )
  }
  if (subclassSlug === 'wizard__abjurer') {
    const intM = abilityMod(ab.int ?? 10)
    add(
      'arcane-ward',
      'Волшебный щит (формула)',
      'other_calc',
      {
        ward_max: classLevel * 2 + intM,
        ward_formula: 'int + 2*level',
        create_on: 'abjuration_spell_with_slot',
        restore_on_abjuration_slot: '2*slot_level',
      },
      3,
      'Макс. хитов щита = 2×ур.+мод. Инт',
    )
    add(
      'projected-ward',
      'Проецированный щит',
      'other_calc',
      { reaction: true, range_ft: 30, needs_active_ward: true },
      6,
      'Реакция: щит поглощает урон существа в 30 фт',
    )
    add(
      'spell-breaker',
      'Разрушитель заклинаний',
      'other_calc',
      {
        always_prepared: ['counterspell', 'dispel-magic'],
        dispel_bonus_action: true,
        add_proficiency_to_check: true,
        refund_slot_if_not_stopped: true,
      },
      10,
      'Рассеивание — бонусным; +Бонус мастерства к проверке; не остановили — ячейка не тратится',
    )
    add(
      'spell-resistance',
      'Сопротивление заклинаниям',
      'other_calc',
      { save_advantage_vs_spells: true, damage_resistance_from_spells: true },
      14,
      'Преимущество на спасброски от заклинаний и сопротивление их урону',
    )
  }
  if (subclassSlug === 'wizard__diviner') {
    add(
      'expert-divination',
      'Эксперт прорицания',
      'other_calc',
      { school: 'divination', min_slot: 2, restore_below_slot: true, restore_max_level: 5 },
      6,
      'Прорицание 2+ круга: вернуть ячейку ниже (не выше 5 круга)',
    )
    add('greater-portent', 'Великое знамение', 'other_calc', { portent_dice: 3 }, 14, 'Три кости Знамения')
  }
  if (subclassSlug === 'wizard__illusionist') {
    add(
      'improved-illusions',
      'Улучшенные иллюзии',
      'other_calc',
      {
        school: 'illusion',
        no_verbal: true,
        range_bonus_ft: 60,
        range_min_ft: 10,
        grant_cantrip: 'minor-illusion',
        minor_illusion_bonus_action: true,
        minor_illusion_sound_and_image: true,
      },
      3,
      'Иллюзии без Вербального; дальность +60 фт (от 10 фт); Малая иллюзия бонусным, звук и образ вместе',
    )
    add(
      'phantasmal-creatures',
      'Призрачные существа',
      'other_calc',
      {
        always_prepared: ['summon-beast', 'summon-fey'],
        free_illusion_cast_each: 'long',
        creature_hp_factor: 0.5,
      },
      6,
      'Вызов зверя и Вызов феи: по разу без ячейки (версия иллюзии), хиты существа вдвое меньше',
    )
    add(
      'illusory-reality',
      'Иллюзорная реальность',
      'other_calc',
      { bonus_action: true, duration_min: 1, requires: 'illusion_spell_with_slot' },
      14,
      'Бонусным: неживой предмет иллюзии становится реальным на 1 мин',
    )
  }
  if (subclassSlug === 'ranger__gloom-stalker') {
    add('dread-ambusher', 'Угроза из засады (инициатива)', 'initiative_mod', 'wis')
  }
  if (subclassSlug === 'ranger__fey-wanderer') {
    const die = classLevel >= 11 ? 'd6' : 'd4'
    add('dreadful-strikes', 'Ужасающие удары', 'damage_rider', { dice: `1${die}`, type: 'psychic' })
  }
  if (subclassSlug === 'barbarian__berserker') {
    // 2024: dice count = Rage Damage bonus (not PB).
    add('frenzy', 'Безумие', 'damage_rider', {
      while_raging: true,
      requires_reckless_attack: true,
      dice_count_from: 'rage_damage',
      die: 'd6',
      first_str_hit: true,
      not_proficiency_bonus: true,
    })
  }
  if (subclassSlug === 'barbarian__zealot') {
    add('divine-fury', 'Божественная ярость', 'damage_rider', {
      while_raging: true,
      dice: '1d6',
      plus_half_level: true,
      once_per_turn: true,
    })
  }
  if (subclassSlug === 'barbarian__wild-heart') {
    add('rage-of-the-wilds', 'Ярость дикой природы', 'other_calc', { rage_options: true })
  }
  if (subclassSlug === 'barbarian__world-tree') {
    add('vitality-of-the-tree', 'Жизненная сила Древа', 'other_calc', { temp_hp_on_rage: true })
  }
  if (subclassSlug === 'rogue__assassin') {
    // 2024 Assassinate — NOT 2014 auto-crit on surprised.
    add('assassinate', 'Убийство', 'other_calc', {
      initiative_advantage: true,
      advantage_vs_not_yet_acted_round_1: true,
      sneak_attack_extra_damage_equals_rogue_level_round_1: true,
      crit_vs_surprised: false,
    })
    if (classLevel >= 9) {
      add(
        'infiltration-expertise',
        'Мастерство внедрения',
        'other_calc',
        { steady_aim_allows_moved: true, steady_aim_no_speed_0: true },
        9,
        'Точное прицеливание: можно после движения; скорость не становится 0',
      )
    }
    if (classLevel >= 13) {
      add(
        'envenom-weapon',
        'Покрытое ядом оружие',
        'damage_rider',
        {
          enhances_cunning_poison: true,
          poison_damage_on_failed_save: '2d6',
          ignore_poison_resistance: true,
          once_per_turn: true,
        },
        13,
        'Усиливает «Отравление» хитрого удара: при провале спаса — 2к6 яда; игнор сопротивления к яду',
      )
    }
    if (classLevel >= 17) {
      add(
        'death-strike',
        'Смертельный удар',
        'other_calc',
        {
          on_sneak_attack_round_1: true,
          con_save_or_double_damage: true,
          not_2014_surprised: true,
          partial: true,
        },
        17,
        'При Скрытой атаке в первом раунде: спас Тел. или удвоенный урон (не «захваченный врасплох» 2014)',
      )
    }
  }
  if (subclassSlug === 'rogue__thief') {
    add('fast-hands', 'Быстрые руки', 'other_calc', {
      bonus_action_use_object: true,
      bonus_sleight: true,
      bonus_magic_item_action: true,
      via_cunning_action: true,
    })
    add('second-story-work', 'Работа на высоте', 'speed', {
      climb_equals_speed: true,
      jump_distance_bonus_dex: true,
    })
    if (classLevel >= 9) {
      add(
        'supreme-sneak',
        'Превосходная скрытность',
        'other_calc',
        { cunning_strike_option: 'supreme-sneak', cost_dice: 1 },
        9,
      )
    }
    if (classLevel >= 13) {
      add(
        'use-magic-device',
        'Использование магических устройств',
        'other_calc',
        {
          attunement_slots: 4,
          charge_save_die: '1d6',
          charge_save_on: 6,
          scroll_ability: 'int',
          ignore_class_spell_lists: true,
        },
        13,
        'Настройка на четыре предмета; при трате заряда — 1к6, на 6 заряд не тратится; свитки через Интеллект (заговор/1-й без проверки; выше 1-го — проверка Интеллекта Сл 10 + уровень заклинания)',
      )
    }
    if (classLevel >= 17) {
      add('thiefs-reflexes', 'Рефлексы вора', 'other_calc', { two_turns_round_1: true }, 17)
    }
  }
  if (subclassSlug === 'druid__moon') {
    add('circle-forms', 'Облики Круга', 'other_calc', { wild_shape_cr_div: 3, ac: { base: 13, mods: ['wis'] } })
  }
  if (subclassSlug === 'ranger__beastmaster') {
    add('primal-companion', 'Первичный спутник', 'other_calc', { companion_scales_with_level: true })
  }
  if (subclassSlug === 'ranger__hunter-ranger') {
    add('hunters-prey', 'Добыча охотника', 'other_calc', { choice: true })
  }
  if (subclassSlug.startsWith('paladin__')) {
    if (classLevel >= 18) add('aura-expansion', 'Расширение ауры', 'aura_radius', { ft: 30 }, 18)
    else if (classLevel >= 6) add('aura-of-protection', 'Аура защиты', 'aura_radius', { ft: 10 }, 6)
  }
  if (subclassSlug === 'warlock__fiend-patron') {
    const chaM = abilityMod(ab.cha ?? 10)
    add('dark-ones-blessing', 'Благословение темнейшего', 'other_calc', {
      temp_hp: Math.max(1, chaM + classLevel),
      on_reduce_enemy_to_0: true,
      ally_kill_within_ft: 10,
    }, 3, 'Врем. хиты = Хар + ур. колдуна (мин. 1), когда ты или союзник в пределах 10 фт. опускаете врага до 0 хитов')
  }
  if (subclassSlug === 'cleric__light-domain' && classLevel >= 6) {
    add('improved-warding-flare', 'Улучшенная ограждающая вспышка', 'other_calc', { reset_short: true }, 6)
  }
  if (subclassSlug === 'wizard__necromancer' && classLevel >= 6) {
    const intM = abilityMod(ab.int ?? 10)
    const halfLevel = Math.floor(classLevel / 2)
    add(
      'undead-thralls',
      'Неживые слуги',
      'other_calc',
      {
        thrall_bonus_hp: intM + halfLevel,
        thrall_bonus_hp_int_plus_half_level: true,
        thrall_damage_bonus: Math.max(1, intM),
      },
      6,
      'Бонус хитов нежити = Инт + ½ ур. волшебника; доп. некротический урон атаки = Инт (мин. 1)',
    )
  }
  if (subclassSlug === 'wizard__bladesinger') {
    const intM = abilityMod(ab.int ?? 10)
    add(
      'bladesong',
      'Песнь клинка',
      'other_calc',
      {
        ac_bonus_int_min_1: true,
        speed_bonus_ft: 10,
        acrobatics_advantage: true,
        weapon_attack_damage_int: true,
        concentration_save_add_int: true,
        regain_one_on_arcane_recovery: true,
      },
      3,
      `Пока Песнь активна: +${Math.max(1, intM)} КД, скорость +10, Преимущество на Акробатику, Инт для атаки/урона оружием, +Инт к спас концентрации`,
    )
    if (classLevel >= 6) {
      add(
        'extra-attack',
        'Дополнительная атака',
        'other_calc',
        { attacks: 2, replace_one_with_wizard_cantrip_action: true },
        6,
      )
    }
    if (classLevel >= 10) {
      add(
        'song-of-defense',
        'Песнь защиты',
        'other_calc',
        { reduce_damage_slot_level_times: 5, requires_bladesong: true },
        10,
      )
    }
  }
  if (subclassSlug === 'wizard__conjurer') {
    if (classLevel >= 6) {
      add(
        'durable-summons',
        'Надёжный вызов',
        'other_calc',
        {
          temp_hp_times_wizard_level: 2,
          resist_all_except: ['necrotic', 'psychic', 'force', 'radiant'],
        },
        6,
      )
    }
    if (classLevel >= 10) {
      add(
        'focused-conjuration',
        'Сфокусированный призыв',
        'other_calc',
        { concentration_immune_to_damage_for_conjuration: true },
        10,
      )
    }
  }
  if (subclassSlug === 'wizard__enchanter') {
    add(
      'enchanting-conversationalist',
      'Чарующий оратор',
      'other_calc',
      { skill_choice: true, skill_bonus_int_min_1: true },
      3,
    )
  }
  if (subclassSlug === 'wizard__transmuter') {
    add(
      'transmuter-s-stone',
      'Камень преобразования',
      'other_calc',
      { con_save_proficiency: true, benefit_choice: true },
      3,
    )
  }
  if (subclassSlug === 'sorcerer__spellfire-sorcery') {
    const chaM = abilityMod(ab.cha ?? 10)
    add(
      'spellfire-burst',
      'Прорыв чаропламени',
      'other_calc',
      {
        once_per_turn_after_sp_spend: true,
        sustaining_temp_hp: `1d4+${chaM}`,
        radiant_damage: classLevel >= 14 ? '1d8' : '1d4',
        damage_types: ['fire', 'radiant'],
        honed: classLevel >= 14,
        temp_hp_add_sorcerer_level: classLevel >= 14,
      },
      3,
      'После траты ≥1 очка в действие Магия/бонусное в ваш ход: Поддерживающие огни или Сияющее пламя (1/ход)',
    )
    if (classLevel >= 6) {
      add(
        'absorb-spells',
        'Поглощение заклинаний',
        'other_calc',
        { always_prepared: ['counterspell'], restore_sp_on_counterspell_fail: '1d4' },
        6,
        'Всегда Контрзаклинание; при провале спаса цели — восстановить 1к4 очков чародейства',
      )
    }
    if (classLevel >= 14) {
      add(
        'honed-spellfire',
        'Освоенное чаропламя',
        'other_calc',
        { radiant_damage: '1d8', temp_hp_add_sorcerer_level: true },
        14,
      )
    }
    if (classLevel >= 18) {
      add(
        'crown-of-spellfire',
        'Корона чаропламени',
        'other_calc',
        {
          with_innate_sorcery: true,
          burning_life_hit_dice_max_cha: true,
          fly_speed_ft: 60,
          hover: true,
          evasion_vs_half_damage_spells: true,
          restore_sp_cost: 5,
        },
        18,
      )
    }
  }
  if (subclassSlug === 'sorcerer__shadow-sorcery') {
    const chaM = abilityMod(ab.cha ?? 10)
    add(
      'power-of-shadow',
      'Сила тени',
      'other_calc',
      {
        darkvision_ft: 120,
        blindsight_ft: 10,
        see_through_own_darkness: true,
        strength_of_the_grave: true,
        grave_hp: chaM + classLevel,
        grave_dc: '5+damage',
      },
      3,
      'Глаза тьмы: ТЗ 120 / слепое 10. Сила могилы: спас Хар (Сл 5+урон) → хиты = Хар+ур. (1 успех/долгий)',
    )
    if (classLevel >= 6) {
      add(
        'beasts-of-ill-omen',
        'Звери дурных знамений',
        'other_calc',
        {
          cost_sp: 3,
          summon: 'summon-beast',
          enemy_save_disadvantage_within_ft: 5,
          optional_no_concentration_duration_min: 1,
        },
        6,
      )
    }
    if (classLevel >= 14) {
      add(
        'shadow-walk',
        'Хождение по теням',
        'other_calc',
        { bonus_teleport_ft: 120, requires_dim_or_dark: true },
        14,
      )
    }
    if (classLevel >= 18) {
      add(
        'umbral-form',
        'Форма абсолютной тени',
        'other_calc',
        {
          with_innate_sorcery: true,
          resist_all_except: ['force', 'radiant'],
          incorporeal_movement: true,
          end_turn_inside_damage: '1d10',
          restore_sp_cost: 6,
        },
        18,
      )
    }
  }
  return out
}

export function buildSubclassResources2024(input: {
  subclassSlug: string
  classLevel: number
  abilities?: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}): SubclassResource2024[] {
  const { subclassSlug, classLevel } = input
  if (classLevel < 3) return []
  const parent = subclassParent2024(subclassSlug) || 'class'
  const intMod = abilityMod(input.abilities?.int ?? 10)
  const wisMod = abilityMod(input.abilities?.wis ?? 10)
  const chaMod = abilityMod(input.abilities?.cha ?? 10)
  const out: SubclassResource2024[] = []

  const push = (
    pool_id: string,
    name: string,
    max: number,
    reset: 'short' | 'long',
    feature_id: string,
    extra?: { shortRestRegain?: number; die?: string; track?: 'spend' | 'stock' },
  ) => {
    if (max <= 0) return
    out.push({
      id: `feat:${parent}:${pool_id}:${feature_id.replace(/-/g, '_')}`,
      pool_id,
      class_slug: parent,
      subclass_slug: subclassSlug,
      name,
      max,
      reset,
      shortRestRegain: extra?.shortRestRegain,
      die: extra?.die,
      feature_id,
      ...(extra?.track ? { track: extra.track } : {}),
    })
  }

  if (subclassSlug === 'fighter__battlemaster') {
    push('superiority_dice', 'Кости превосходства', scaleUses(classLevel, { 3: 4, 7: 5, 15: 6 }), 'short', 'combat-superiority', { die: superiorityDie(classLevel) })
  } else if (subclassSlug === 'fighter__psi-warrior' || subclassSlug === 'rogue__soulknife') {
    const { count, die } = psiTable(classLevel)
    push('psionic_energy_dice', 'Кости пси-энергии', count, 'long', 'psionic-power', { shortRestRegain: 1, die })
    if (subclassSlug === 'rogue__soulknife') {
      if (classLevel >= 13) {
        push('psychic_veil', 'Психическая завеса', 1, 'long', 'psychic-veil')
      }
      if (classLevel >= 17) {
        push('rend_mind', 'Разрыв разума', 1, 'long', 'rend-mind')
      }
    }
  } else if (subclassSlug === 'rogue__arcane-trickster' && classLevel >= 17) {
    push('spell_thief', 'Похититель заклинаний', 1, 'long', 'spell-thief')
  } else if (subclassSlug === 'fighter__arcane-archer') {
    push('arcane_shot', 'Чародейный выстрел', Math.max(1, intMod), 'long', 'arcane-shot')
  } else if (subclassSlug === 'artificer__alchemist') {
    push('experimental_elixir', 'Экспериментальный эликсир', scaleUses(classLevel, { 3: 2, 5: 3, 9: 4, 15: 5 }), 'long', 'experimental-elixir')
    if (classLevel >= 9) push('restorative_reagents', 'Восстанавливающие реагенты', Math.max(1, intMod), 'long', 'restorative-reagents')
  } else if (subclassSlug === 'artificer__artillerist') {
    push('eldritch_cannon', 'Мистическая пушка', 1, 'long', 'eldritch-cannon')
  } else if (subclassSlug === 'artificer__battle-smith') {
    push('steel_defender', 'Стальной защитник', 1, 'long', 'steel-defender')
    if (classLevel >= 9) push('arcane_jolt', 'Магический импульс', Math.max(1, intMod), 'long', 'arcane-jolt')
  } else if (subclassSlug === 'artificer__cartographer') {
    push('adventure_atlas', 'Атлас приключений', Math.max(1, intMod), 'long', 'adventure-atlas')
  } else if (subclassSlug === 'artificer__reanimator') {
    push('reanimated_companion', 'Оживлённый спутник', 1, 'long', 'reanimated-companion')
  } else if (subclassSlug === 'cleric__light-domain') {
    push('warding_flare', 'Ограждающая вспышка', Math.max(1, wisMod), classLevel >= 6 ? 'short' : 'long', 'warding-flare')
    if (classLevel >= 17) push('corona_of_light', 'Корона света', Math.max(1, wisMod), 'long', 'corona-of-light')
  } else if (subclassSlug === 'cleric__war-domain') {
    push('war_priest', 'Боевой священник', Math.max(1, wisMod), 'short', 'war-priest')
  } else if (subclassSlug === 'warlock__celestial-patron') {
    push('healing_light', 'Лечащий свет', 1 + classLevel, 'long', 'healing-light', { die: 'd6' })
    if (classLevel >= 14) push('searing_vengeance', 'Опаляющее возмездие', 1, 'long', 'searing-vengeance')
  } else if (subclassSlug === 'warlock__archfey') {
    push('steps_of_the_fey', 'Шаг феи', Math.max(1, chaMod), 'long', 'steps-of-the-fey')
    if (classLevel >= 10) push('beguiling_defenses', 'Чарующая защита', 1, 'long', 'beguiling-defenses')
  } else if (subclassSlug === 'warlock__fiend-patron') {
    if (classLevel >= 6) {
      push('dark_ones_own_luck', 'Удача темнейшего', Math.max(1, chaMod), 'long', 'dark-ones-own-luck')
    }
    if (classLevel >= 14) push('hurl_through_hell', 'Бросок через преисподнюю', 1, 'long', 'hurl-through-hell')
  } else if (subclassSlug === 'warlock__greate-old-one-patron' && classLevel >= 6) {
    push('clairvoyant_combatant', 'Провидящий боец', 1, 'short', 'clairvoyant-combatant')
  } else if (subclassSlug === 'warlock__undead') {
    push('form_of_dread', 'Аватар ужаса', Math.max(1, chaMod), 'long', 'form-of-dread')
  } else if (subclassSlug === 'warlock__vestige-patron') {
    push('vestige_companion', 'Спутник-предтеча', 1, 'long', 'vestige-companion')
  } else if (subclassSlug === 'wizard__abjurer') {
    push('arcane_ward', 'Волшебный щит', classLevel * 2 + intMod, 'long', 'arcane-ward', { track: 'stock' })
  } else if (subclassSlug === 'wizard__diviner') {
    push('portent', 'Знамение', classLevel >= 14 ? 3 : 2, 'long', 'portent', { die: 'd20', track: 'stock' })
    if (classLevel >= 10) push('the_third_eye', 'Третий глаз', 1, 'short', 'the-third-eye')
  } else if (subclassSlug === 'wizard__evoker' && classLevel >= 14) {
    push('overchannel', 'Перегрузка', 1, 'long', 'overchannel')
  } else if (subclassSlug === 'wizard__illusionist' && classLevel >= 10) {
    push('illusory_self', 'Собственная иллюзорность', 1, 'short', 'illusory-self')
  } else if (subclassSlug === 'wizard__conjurer') {
    push(
      'benign_transposition',
      'Безопасный перенос',
      Math.max(1, intMod),
      'long',
      'benign-transposition',
    )
    if (classLevel >= 14) {
      push('splintered_summons', 'Разделённый вызов', 1, 'long', 'splintered-summons')
    }
  } else if (subclassSlug === 'wizard__enchanter') {
    push(
      'hypnotic_presence',
      'Гипнотизирующее присутствие',
      Math.max(1, intMod),
      'long',
      'hypnotic-presence',
    )
    if (classLevel >= 6) {
      push(
        'split_enchantment',
        'Разделённое очарование',
        Math.max(1, intMod),
        'long',
        'split-enchantment',
      )
    }
    if (classLevel >= 10) {
      push('instinctive_charm', 'Инстинктивное очарование', 1, 'long', 'instinctive-charm')
    }
  } else if (subclassSlug === 'wizard__necromancer') {
    if (classLevel >= 6) {
      push('undead_thralls_free', 'Неживые слуги (без ячейки)', 1, 'long', 'undead-thralls')
    }
    if (classLevel >= 14) {
      push('deaths_master_flare', 'Разгорание нежизни', 1, 'long', 'deaths-master')
    }
  } else if (subclassSlug === 'wizard__bladesinger') {
    push('bladesong', 'Песнь клинка', Math.max(1, intMod), 'long', 'bladesong')
  } else if (subclassSlug === 'wizard__transmuter') {
    push('transmuters_stone', 'Камень преобразования', 1, 'long', 'transmuter-s-stone')
    push('wondrous_alteration', 'Волшебное превращение', 1, 'long', 'wondrous-alteration')
    if (classLevel >= 6) {
      push(
        'empowered_transmutation',
        'Усиленное преобразование',
        Math.max(1, intMod),
        'long',
        'empowered-transmutation',
      )
    }
    if (classLevel >= 10) {
      push('shape_shifter', 'Мастер превращения', 1, 'long', 'shape-shifter')
      push('shape_shifter_self', 'Мастер превращения (на себя)', 1, 'long', 'shape-shifter')
    }
    if (classLevel >= 14) {
      push('master_transmuter', 'Мастер преобразования', 1, 'long', 'master-transmuter')
    }
  } else if (subclassSlug === 'sorcerer__wild-magic-sorcery') {
    push('tides_of_chaos', 'Волны хаоса', 1, 'long', 'tides-of-chaos')
    if (classLevel >= 18) {
      push('tamed_wild_surge', 'Укрощённый всплеск дикой магии', 1, 'long', 'tamed-surge')
    }
  } else if (subclassSlug === 'sorcerer__clockwork-sorcery') {
    push('restore_balance', 'Восстановление баланса', Math.max(1, chaMod), 'long', 'restore-balance')
    if (classLevel >= 14) push('trance_of_order', 'Транс упорядоченности', 1, 'long', 'trance-of-order')
    if (classLevel >= 18) push('clockwork_cavalcade', 'Заводная кавалькада', 1, 'long', 'clockwork-cavalcade')
  } else if (subclassSlug === 'sorcerer__spellfire-sorcery') {
    // Once-per-turn gate on combat hot bar; refreshed on begin-my-turn.
    push('spellfire_burst', 'Прорыв чаропламени', 1, 'long', 'spellfire-burst')
    if (classLevel >= 18) {
      push('crown_of_spellfire', 'Корона чаропламени', 1, 'long', 'crown-of-spellfire')
    }
  } else if (subclassSlug === 'sorcerer__shadow-sorcery') {
    // Strength of the Grave: 1 successful save / long rest (not Cha-mod uses).
    push('power_of_shadow', 'Сила могилы', 1, 'long', 'power-of-shadow')
    if (classLevel >= 14) {
      // Desk tracker for last teleport (activeLabel); at-will in dim/dark.
      push('shadow_walk', 'Хождение по теням', 1, 'long', 'shadow-walk')
    }
    if (classLevel >= 18) {
      push('umbral_form', 'Форма абсолютной тени', 1, 'long', 'umbral-form')
    }
  } else if (subclassSlug === 'sorcerer__aberrant-sorcery') {
    push('telepathic_speech', 'Телепатическая речь', 1, 'long', 'telepathic-speech')
    if (classLevel >= 18) push('warping_explosion', 'Искажающий взрыв', 1, 'long', 'warping-explosion')
  } else if (subclassSlug === 'sorcerer__draconic-sorcery') {
    if (classLevel >= 14) push('dragon_wings', 'Крылья дракона', 1, 'long', 'dragon-wings')
    if (classLevel >= 18) push('dragon_companion', 'Дракон-спутник', 1, 'long', 'dragon-companion')
  } else if (subclassSlug === 'druid__stars') {
    push('star_map_guiding_bolt', 'Звёздная карта (Направляющий снаряд)', Math.max(1, wisMod), 'long', 'star-map')
    if (classLevel >= 6) push('cosmic_omen', 'Космическое знамение', Math.max(1, wisMod), 'long', 'cosmic-omen')
  } else if (subclassSlug === 'druid__land' && classLevel >= 6) {
    push('natural_recovery', 'Естественное восстановление', 1, 'long', 'natural-recovery')
  } else if (subclassSlug === 'druid__moon' && classLevel >= 10) {
    push('moonlight_step', 'Шаг в лунный свет', Math.max(1, wisMod), 'long', 'moonlight-step')
  } else if (subclassSlug === 'monk__warrior-of-the-hand' && classLevel >= 6) {
    push('wholeness_of_body', 'Целостность тела', Math.max(1, wisMod), 'long', 'wholeness-of-body')
  } else if (subclassSlug === 'monk__warrior-of-mercy') {
    if (classLevel >= 11) {
      push(
        'flurry_of_healing_and_harm',
        'Шквал исцеления и повреждения',
        Math.max(1, wisMod),
        'long',
        'flurry-of-healing-and-harm',
      )
    }
    if (classLevel >= 17) {
      push(
        'hand_of_ultimate_mercy',
        'Рука абсолютного милосердия',
        1,
        'long',
        'hand-of-ultimate-mercy',
      )
    }
  } else if (subclassSlug === 'ranger__gloom-stalker') {
    push('dread_ambusher_strike', 'Ужасающий удар', Math.max(1, wisMod), 'long', 'dread-ambusher', { die: 'd6' })
  } else if (subclassSlug === 'ranger__winter-walker') {
    push('hunters_rime', 'Иней охотника', Math.max(1, wisMod), 'long', 'hunters-rime')
  } else if (subclassSlug === 'ranger__hollow-warden') {
    push('wrath_of_the_wild', 'Гнев дикой природы', Math.max(1, wisMod), 'long', 'wrath-of-the-wild')
  } else if (subclassSlug === 'rogue__phantom') {
    const pb = 2 + Math.floor((Math.min(20, Math.max(1, classLevel)) - 1) / 4)
    push('wails_from_the_grave', 'Вопли из могилы', pb, 'long', 'wails-from-the-grave')
  } else if (subclassSlug === 'rogue__scion-of-the-three') {
    push('bloodthirst', 'Кровожадность', Math.max(1, chaMod), 'long', 'bloodthirst')
  } else if (subclassSlug === 'barbarian__zealot') {
    // 2024 Warrior of the Gods: stock of d12 self-heal dice (not 2014 material-free raise).
    const wog =
      classLevel >= 17 ? 7 : classLevel >= 12 ? 6 : classLevel >= 6 ? 5 : classLevel >= 3 ? 4 : 0
    if (wog > 0) {
      push('warrior_of_the_gods', 'Воин богов', wog, 'long', 'warrior-of-the-gods')
    }
    if (classLevel >= 6) push('fanatical_focus', 'Фанатичный фокус', 1, 'long', 'fanatical-focus')
    if (classLevel >= 10) push('zealous_presence', 'Ревностное присутствие', 1, 'long', 'zealous-presence')
    if (classLevel >= 14) push('rage_of_the_gods', 'Ярость богов', 1, 'long', 'rage-of-the-gods')
  } else if (subclassSlug === 'bard__glamour') {
    push('beguiling_magic', 'Чарующая магия', 1, 'long', 'beguiling-magic')
    if (classLevel >= 6) push('mantle_of_majesty', 'Мантия величия', 1, 'long', 'mantle-of-majesty')
    if (classLevel >= 14) push('unbreakable_majesty', 'Несокрушимое величие', 1, 'short', 'unbreakable-majesty')
  }
  return out
}

export function alwaysPreparedForSubclass2024(
  subclassSlug: string | null | undefined,
  classLevel: number,
  landChoice?: string | null,
): string[] {
  if (!subclassSlug) return []
  const sub = SUBCLASS_CATALOG_2024[subclassSlug]
  if (!sub) return []
  const out: string[] = []
  const list =
    (sub.data.spell_list as Array<{ level?: number; land?: string; spells?: string[] }>) ||
    []
  for (const block of list) {
    if (Number(block.level || 0) > classLevel) continue
    if (block.land) {
      if (!landChoice || String(block.land).toLowerCase() !== String(landChoice).toLowerCase()) {
        continue
      }
    }
    for (const spell of block.spells || []) {
      if (spell && !out.includes(spell)) out.push(spell)
    }
  }
  // Absorb Spells (Spellfire L6+): always Counterspell.
  if (subclassSlug === 'sorcerer__spellfire-sorcery' && classLevel >= 6 && !out.includes('counterspell')) {
    out.push('counterspell')
  }
  return out
}

export function thirdCasterBlock2024(subclassSlug: string, classLevel: number) {
  const meta = THIRD_CASTER_SUBCLASSES[subclassSlug]
  if (!meta || classLevel < 3) return null
  const lv = Math.min(20, Math.max(1, Math.floor(classLevel)))
  const row = THIRD_CASTER_SLOTS[lv - 1]
  const budget = THIRD_CASTER_SPELLS_KNOWN[lv - 1]
  // EK + Arcane Trickster 2024: prepare wizard spells (no school lock).
  // Mystic Arts (monk): prepare sorcerer spells (Wisdom).
  const wizardPrepared =
    subclassSlug === 'fighter__eldritch-knight' || subclassSlug === 'rogue__arcane-trickster'
  const mysticPrepared = subclassSlug === 'monk__warrior-of-the-mystic-arts'
  const prepared = wizardPrepared || mysticPrepared
  return {
    class_slug: subclassParent2024(subclassSlug) || 'class',
    subclass_slug: subclassSlug,
    progression: 'third' as const,
    ability: meta.ability,
    name_ru: meta.name_ru,
    cantrips: THIRD_CASTER_CANTRIPS[lv - 1],
    prepared_spells: prepared ? budget : 0,
    spells_known: prepared ? 0 : budget,
    slots: Object.fromEntries(row.map((n, i) => [String(i + 1), n])),
    pact_slots: null as null,
    always_prepared: [] as string[],
    spell_list: wizardPrepared ? 'wizard' : mysticPrepared ? 'sorcerer' : null,
    prepare_mode: prepared ? ('prepared' as const) : ('known' as const),
    replace_one_on_level: prepared,
    school_restriction: prepared ? null : '2014_known',
  }
}

/** Ids ending in `-spells` that are not an always-prepared list. */
const NOT_ALWAYS_PREPARED_FEATURE_IDS_2024 = new Set(['sculpt-spells'])

export function featureAutomationMode2024(input: {
  featureId: string
  subclassSlug: string | null
  hasResource: boolean
  hasSharedOption?: boolean
  hasCalc?: boolean
}): 'resource' | 'shared_option' | 'always_prepared' | 'third_caster' | 'calc' | 'text' {
  const fid = input.featureId.replace(/_/g, '-')
  if (input.hasResource) return 'resource'
  if (input.hasSharedOption) return 'shared_option'
  if (input.hasCalc) return 'calc'
  if (NOT_ALWAYS_PREPARED_FEATURE_IDS_2024.has(fid)) return 'text'
  if (fid.endsWith('-spells') || fid.endsWith('-domain-spells')) return 'always_prepared'
  if (
    input.subclassSlug &&
    THIRD_CASTER_SUBCLASSES[input.subclassSlug] &&
    (fid === 'spellcasting' || fid === 'spellcasting-ek')
  ) {
    return 'third_caster'
  }
  return 'text'
}
