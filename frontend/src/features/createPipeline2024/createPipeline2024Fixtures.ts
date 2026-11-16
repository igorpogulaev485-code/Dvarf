/**
 * Offline catalog + languages for `/dev/p24-m03-preview` (no auth / API).
 * Live wizard uses listCatalogEntries + listCreate2024Languages.
 */

import classesSrd from '../../shared/dnd/data/edition2024/classes_srd.json'
import classesEfa from '../../shared/dnd/data/edition2024/classes_efa.json'
import type { CatalogEntry } from '../../shared/api/catalog'
import type {
  Create2024CatalogBundle,
  LanguagesBundle,
} from './createPipeline2024Types'

function catalogEntry(
  kind: CatalogEntry['kind'],
  slug: string,
  nameRu: string,
  data: Record<string, unknown>,
  source = 'srd-5.2',
): CatalogEntry {
  const now = '2024-01-01T00:00:00Z'
  return {
    id: `fixture-${kind}-${slug}`,
    kind,
    slug,
    name_ru: nameRu,
    name_en: null,
    rules_edition: '2024',
    parent_id: null,
    source,
    external_ref: null,
    data,
    sort_order: 0,
    is_active: true,
    created_at: now,
    updated_at: now,
  }
}

function loadClasses(): CatalogEntry[] {
  const packs = [classesSrd, classesEfa] as Array<{
    entries?: Array<{
      slug?: string
      name_ru?: string
      name_en?: string | null
      source?: string | null
      data?: Record<string, unknown>
    }>
  }>
  const out: CatalogEntry[] = []
  const seen = new Set<string>()
  for (const pack of packs) {
    for (const row of pack.entries || []) {
      const slug = String(row.slug || '')
      if (!slug || seen.has(slug)) continue
      seen.add(slug)
      out.push(
        catalogEntry(
          'class',
          slug,
          String(row.name_ru || slug),
          (row.data || {}) as Record<string, unknown>,
          String(row.source || 'srd-5.2'),
        ),
      )
    }
  }
  return out
}

const BACKGROUNDS: CatalogEntry[] = [
  catalogEntry('background', 'soldier', 'Солдат', {
    asi: { abilities: ['str', 'dex', 'con'], options: ['+2/+1', '+1/+1/+1'], cap: 20 },
    origin_feat: {
      id: 'savage-attacker',
      slug: 'savage-attacker',
      name_ru: 'Неистово атакующий',
    },
    tool_proficiencies: [],
    tool_choices: {
      count: 1,
      from_category: 'gaming_set',
      label_ru: 'Игровой набор (один вид)',
    },
    skill_proficiencies: ['athletics', 'intimidation'],
    equipment_or_gold: {
      gold_alternative_gp: 50,
      pack_summary_ru: 'Копьё, игровой набор, дорожная одежда, 14 зм',
    },
  }),
  catalogEntry('background', 'sage', 'Мудрец', {
    asi: { abilities: ['con', 'int', 'wis'], options: ['+2/+1', '+1/+1/+1'], cap: 20 },
    origin_feat: {
      id: 'magic-initiate',
      slug: 'magic-initiate',
      name_ru: 'Посвящённый в магию',
      variant: 'wizard',
    },
    tool_proficiencies: ['calligraphers_supplies'],
    skill_proficiencies: ['arcana', 'history'],
    equipment_or_gold: {
      gold_alternative_gp: 50,
      pack_summary_ru: 'Боевой посох, инструменты каллиграфа, книга, пергамент ×8, мантия, 8 зм',
    },
  }),
  catalogEntry('background', 'acolyte', 'Послушник', {
    asi: { abilities: ['int', 'wis', 'cha'], options: ['+2/+1', '+1/+1/+1'], cap: 20 },
    origin_feat: {
      id: 'magic-initiate',
      slug: 'magic-initiate',
      name_ru: 'Посвящённый в магию',
      variant: 'cleric',
    },
    tool_proficiencies: ['calligraphers_supplies'],
    skill_proficiencies: ['insight', 'religion'],
    equipment_or_gold: {
      gold_alternative_gp: 50,
      pack_summary_ru: 'Инструменты каллиграфа, молитвенник, священный символ, мантия, 8 зм',
    },
  }),
]

const SPECIES: CatalogEntry[] = [
  catalogEntry('race', 'dwarf', 'Дварф', {
    size: 'medium',
    size_options: ['medium'],
    speed: 30,
    languages: [],
    traits_text: 'Тёмное зрение, устойчивость дварфа, твёрдость, знание камня.',
  }),
  catalogEntry('race', 'human', 'Человек', {
    size: 'medium',
    size_options: ['medium', 'small'],
    speed: 30,
    languages: [],
    traits_text: 'Находчивость, умелость, универсальность.',
  }),
  catalogEntry('race', 'elf', 'Эльф', {
    size: 'medium',
    size_options: ['medium'],
    speed: 30,
    lineage_required: true,
    lineages: [
      {
        id: 'high-elf',
        name_ru: 'Высший эльф',
        summary_ru: 'Заговор Фокусы; 3 ур. Обнаружение магии; 5 ур. Туманный шаг.',
      },
      {
        id: 'wood-elf',
        name_ru: 'Лесной эльф',
        summary_ru: 'Искусство друидов; скорость 35.',
      },
      {
        id: 'drow',
        name_ru: 'Дроу',
        summary_ru: 'Пляшущие огоньки; тёмное зрение 120.',
      },
    ],
    languages: [],
    traits_text: 'Тёмное зрение, наследие эльфа, происхождение фей.',
  }),
  catalogEntry('race', 'dragonborn', 'Драконорожденный', {
    size: 'medium',
    size_options: ['medium'],
    speed: 30,
    draconic_ancestry: true,
    languages: [],
    traits_text: 'Драконье наследие, дыхание, сопротивление, полёт (5 ур.).',
  }),
]

const FEATS: CatalogEntry[] = [
  catalogEntry('feat', 'defense', 'Оборона', { category: 'fighting_style' }),
  catalogEntry('feat', 'archery', 'Стрельба', { category: 'fighting_style' }),
  catalogEntry('feat', 'great-weapon-fighting', 'Сражение большим оружием', {
    category: 'fighting_style',
  }),
  catalogEntry('feat', 'two-weapon-fighting', 'Сражение двумя оружиями', {
    category: 'fighting_style',
  }),
  catalogEntry('feat', 'savage-attacker', 'Неистово атакующий', { category: 'origin' }),
  catalogEntry('feat', 'magic-initiate', 'Посвящённый в магию', { category: 'origin' }),
  catalogEntry('feat', 'skilled', 'Умелый', { category: 'origin' }),
  catalogEntry('feat', 'alert', 'Бдительный', { category: 'origin' }),
]

const WEAPONS: CatalogEntry[] = [
  ['battleaxe', 'Боевой топор', 'martial', 'melee', 'topple'],
  ['club', 'Дубинка', 'simple', 'melee', 'slow'],
  ['dagger', 'Кинжал', 'simple', 'melee', 'nick'],
  ['flail', 'Цеп', 'martial', 'melee', 'sap'],
  ['greataxe', 'Секира', 'martial', 'melee', 'cleave'],
  ['greatsword', 'Двуручный меч', 'martial', 'melee', 'graze'],
  ['longbow', 'Длинный лук', 'martial', 'ranged', 'slow'],
  ['longsword', 'Длинный меч', 'martial', 'melee', 'sap'],
  ['mace', 'Булава', 'simple', 'melee', 'sap'],
  ['scimitar', 'Скимитар', 'martial', 'melee', 'nick'],
  ['shortbow', 'Короткий лук', 'simple', 'ranged', 'vex'],
  ['shortsword', 'Короткий меч', 'martial', 'melee', 'vex'],
  ['spear', 'Копьё', 'simple', 'melee', 'sap'],
  ['warhammer', 'Боевой молот', 'martial', 'melee', 'topple'],
].map(([slug, name, category, range, mastery]) =>
  catalogEntry('weapon', slug, name, {
    category,
    range_kind: range,
    mastery,
  }),
)

const SPELLS: CatalogEntry[] = [
  ['fire-bolt', 'Огненный снаряд', 0, ['wizard']],
  ['light', 'Свет', 0, ['wizard', 'cleric']],
  ['mage-hand', 'Волшебная рука', 0, ['wizard']],
  ['prestidigitation', 'Фокусы', 0, ['wizard']],
  ['ray-of-frost', 'Луч холода', 0, ['wizard']],
  ['sacred-flame', 'Священное пламя', 0, ['cleric']],
  ['guidance', 'Указание', 0, ['cleric', 'druid']],
  ['thaumaturgy', 'Чудотворство', 0, ['cleric']],
  ['word-of-radiance', 'Слово сияния', 0, ['cleric']],
  ['shield', 'Щит', 1, ['wizard']],
  ['magic-missile', 'Волшебная стрела', 1, ['wizard']],
  ['detect-magic', 'Обнаружение магии', 1, ['wizard', 'cleric']],
  ['mage-armor', 'Доспехи мага', 1, ['wizard']],
  ['bless', 'Благословение', 1, ['cleric']],
  ['cure-wounds', 'Лечение ран', 1, ['cleric']],
  ['guiding-bolt', 'Направляющий снаряд', 1, ['cleric']],
  ['healing-word', 'Исцеляющее слово', 1, ['cleric']],
].map(([slug, name, level, classes]) =>
  catalogEntry('spell', String(slug), String(name), {
    level,
    classes,
  }),
)

export const FIXTURE_LANGUAGES: LanguagesBundle = {
  common_id: 'common',
  choice_count: 2,
  languages: [
    { id: 'common-sign-language', name_ru: 'Язык жестов', kind: 'standard' },
    { id: 'dwarvish', name_ru: 'Дварфийский', kind: 'standard' },
    { id: 'elvish', name_ru: 'Эльфийский', kind: 'standard' },
    { id: 'giant', name_ru: 'Великаний', kind: 'standard' },
    { id: 'gnomish', name_ru: 'Гномий', kind: 'standard' },
    { id: 'goblin', name_ru: 'Гоблинский', kind: 'standard' },
    { id: 'halfling', name_ru: 'Язык полуросликов', kind: 'standard' },
    { id: 'orc', name_ru: 'Орочий', kind: 'standard' },
    { id: 'abyssal', name_ru: 'Бездны', kind: 'exotic' },
    { id: 'celestial', name_ru: 'Небесный', kind: 'exotic' },
    { id: 'draconic', name_ru: 'Драконий', kind: 'exotic' },
    { id: 'infernal', name_ru: 'Инфернальный', kind: 'exotic' },
    { id: 'sylvan', name_ru: 'Сильван', kind: 'exotic' },
    { id: 'undercommon', name_ru: 'Подземный', kind: 'exotic' },
  ],
  class_special: [
    { id: 'druidic', name_ru: 'Друидический', kind: 'class_special' },
    { id: 'thieves-cant', name_ru: 'Воровской жаргон', kind: 'class_special' },
  ],
}

export function buildCreate2024Fixtures(): Create2024CatalogBundle {
  return {
    classes: loadClasses(),
    backgrounds: BACKGROUNDS,
    species: SPECIES,
    feats: FEATS,
    weapons: WEAPONS,
    spells: SPELLS,
  }
}
