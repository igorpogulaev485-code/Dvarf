/** P24-M03: Russian labels for the 2024 create wizard (no service ids in UI). */

import type { CatalogEntry } from '../../shared/api/catalog'
import { TOOL_NAME_RU_BY_SLUG } from '../../shared/dnd/toolNames'

export const SIZE_LABEL_RU: Record<string, string> = {
  tiny: 'Крошечный',
  small: 'Маленький',
  medium: 'Средний',
  large: 'Большой',
}

export const CREATURE_TYPE_RU: Record<string, string> = {
  humanoid: 'Гуманоид',
  fey: 'Фея',
  construct: 'Конструкт',
  aberration: 'Аберрация',
  celestial: 'Небожитель',
  fiend: 'Исчадие',
  undead: 'Нежить',
  giant: 'Великан',
  dragon: 'Дракон',
  elemental: 'Элементаль',
  monstrosity: 'Монстр',
  plant: 'Растение',
  beast: 'Зверь',
  ooze: 'Слизь',
}

export const DAMAGE_TYPE_RU: Record<string, string> = {
  acid: 'Кислота',
  cold: 'Холод',
  fire: 'Огонь',
  lightning: 'Электричество',
  poison: 'Яд',
  necrotic: 'Некротическая энергия',
  psychic: 'Психическая энергия',
  radiant: 'Излучение',
  thunder: 'Звук',
  force: 'Силовое поле',
}

/** Dragonborn ancestry → damage type (2024 PH table). */
export const DRAGONBORN_ANCESTRY_OPTIONS: ReadonlyArray<{
  id: string
  label: string
  rest: string
}> = [
  { id: 'acid', label: 'Кислота', rest: 'Чёрный и медный драконы' },
  { id: 'cold', label: 'Холод', rest: 'Белый и серебряный драконы' },
  { id: 'fire', label: 'Огонь', rest: 'Красный, золотой и латунный драконы' },
  { id: 'lightning', label: 'Электричество', rest: 'Синий и бронзовый драконы' },
  { id: 'poison', label: 'Яд', rest: 'Зелёный дракон' },
]

export const CASTING_ABILITY_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'int', label: 'Интеллект' },
  { id: 'wis', label: 'Мудрость' },
  { id: 'cha', label: 'Харизма' },
]

export const MAGIC_INITIATE_LIST_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'cleric', label: 'Жрец' },
  { id: 'druid', label: 'Друид' },
  { id: 'wizard', label: 'Волшебник' },
]

export const LANGUAGE_KIND_RU: Record<string, string> = {
  standard: 'Обычный язык',
  exotic: 'Редкий язык',
  class_special: 'Классовый язык',
}

export const COMMON_LANGUAGE_NAME_RU = 'Общий'

export const DIVINE_ORDER_OPTIONS = [
  { id: 'protector', label: 'Защитник', rest: 'Доспехи и воинское оружие' },
  { id: 'thaumaturge', label: 'Чудотворец', rest: 'Лишний заговор и бонус к Магии и Религии' },
] as const

export const PRIMAL_ORDER_OPTIONS = [
  { id: 'magician', label: 'Маг', rest: 'Лишний заговор и бонус к Природе и Магии' },
  { id: 'warden', label: 'Страж', rest: 'Средние доспехи и воинское оружие' },
] as const

export const GENDER_NONE_RU = 'Не указан'

/** Fallback RU names for tool ids the backend accepts but the item catalog lacks. */
const TOOL_NAME_FALLBACK_RU = TOOL_NAME_RU_BY_SLUG

export const ARTISAN_TOOL_IDS: readonly string[] = [
  'alchemists-supplies',
  'brewers-supplies',
  'calligraphers-supplies',
  'carpenters-tools',
  'cartographers-tools',
  'cobblers-tools',
  'cooks-utensils',
  'glassblowers-tools',
  'jewelers-tools',
  'leatherworkers-tools',
  'masons-tools',
  'painters-supplies',
  'potters-tools',
  'smiths-tools',
  'tinkers-tools',
  'weavers-tools',
  'woodcarvers-tools',
]

export const GAMING_SET_IDS: readonly string[] = [
  'dice-set',
  'dragonchess-set',
  'playing-card-set',
  'three-dragon-ante-set',
]

export const MUSICAL_INSTRUMENT_IDS: readonly string[] = [
  'bagpipes',
  'drum',
  'dulcimer',
  'flute',
  'horn',
  'lute',
  'lyre',
  'pan-flute',
  'shawm',
  'viol',
]

/** Extra non-artisan tools that «Умелый» may grant (skills are added separately). */
export const SKILLED_EXTRA_TOOL_IDS: readonly string[] = [
  'thieves-tools',
  'herbalism-kit',
  'disguise-kit',
  'forgery-kit',
  'navigators-tools',
  'poisoners-kit',
]

export function hasCyrillic(value: string): boolean {
  return /[А-Яа-яЁё]/.test(value)
}

export function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-')
}

/** `1d8` → `1к8` (Russian dice notation in UI copy). */
export function ruDice(text: string): string {
  return text
    .replace(/\b(\d*)[dD](\d+)\b/g, (_m, count: string, sides: string) => `${count}к${sides}`)
    .replace(/(^|[\s(,;:])К(\d+)(?=[\s,.;:)]|$)/g, '$1к$2')
}

export function hitDieLabel(hitDie: unknown): string {
  const n = Number(typeof hitDie === 'string' ? hitDie.replace(/\D/g, '') : hitDie)
  return Number.isFinite(n) && n > 0 ? `к${n}` : '—'
}

export type ItemNameIndex = ReadonlyMap<string, string>

export function buildItemNameIndex(entries: readonly CatalogEntry[]): ItemNameIndex {
  const map = new Map<string, string>()
  for (const entry of entries) {
    if (entry.slug && entry.name_ru) map.set(normalizeSlug(entry.slug), entry.name_ru)
  }
  return map
}

/** RU name for a catalog item / tool id. Never returns a raw Latin id. */
export function itemNameRu(id: string, index: ItemNameIndex | null | undefined): string {
  if (hasCyrillic(id)) return id
  const slug = normalizeSlug(id).replace(/\s+/g, '-')
  const candidates = [slug, slug.replace(/-s-/g, 's-')]
  for (const candidate of candidates) {
    const fromCatalog = index?.get(candidate)
    if (fromCatalog) return fromCatalog
    const fallback = TOOL_NAME_FALLBACK_RU[candidate]
    if (fallback) return fallback
  }
  return 'Предмет'
}

export function sizeLabelRu(id: string | null | undefined): string {
  if (!id) return '—'
  return SIZE_LABEL_RU[id.toLowerCase()] ?? 'Особый размер'
}

export function damageTypeLabelRu(id: string | null | undefined): string {
  if (!id) return '—'
  return DAMAGE_TYPE_RU[id.toLowerCase()] ?? 'Особый тип урона'
}

export function languageKindLabelRu(kind: string | null | undefined): string {
  return (kind && LANGUAGE_KIND_RU[kind]) || 'Язык'
}

export function abilityLabelRuById(id: string | null | undefined): string {
  return CASTING_ABILITY_OPTIONS.find((row) => row.id === id)?.label ?? '—'
}

export function creatureTypeLabelRu(type: unknown): string {
  const key = String(type || '').toLowerCase()
  return CREATURE_TYPE_RU[key] ?? 'Существо'
}

export function spellSchoolLabelRu(entry: CatalogEntry): string {
  const data = entry.data ?? {}
  const ru = typeof data.school_ru === 'string' ? data.school_ru : ''
  return ru || 'школа не указана'
}

const CASTING_UNIT_RU: Record<string, string> = {
  action: 'действие',
  bonus_action: 'бонусное действие',
  reaction: 'реакция',
  minute: 'мин.',
  hour: 'ч.',
  magic: 'действие «Магия»',
}

export function castingTimeLabelRu(entry: CatalogEntry): string {
  const raw = (entry.data ?? {}).casting_time
  if (!raw || typeof raw !== 'object') return '—'
  const row = raw as { unit?: string; amount?: number; condition?: string }
  const unit = CASTING_UNIT_RU[String(row.unit || '')] ?? 'особое'
  const amount = Number(row.amount || 1)
  const base = amount > 1 || row.unit === 'minute' || row.unit === 'hour' ? `${amount} ${unit}` : unit
  return row.condition && hasCyrillic(row.condition) ? `${base} (${row.condition})` : base
}

export function spellComponentsLabelRu(entry: CatalogEntry): string {
  const raw = (entry.data ?? {}).components
  if (!raw || typeof raw !== 'object') return '—'
  const row = raw as { v?: boolean; s?: boolean; m?: unknown }
  const parts: string[] = []
  if (row.v) parts.push('В')
  if (row.s) parts.push('С')
  if (row.m) parts.push('М')
  return parts.length ? parts.join(', ') : '—'
}
