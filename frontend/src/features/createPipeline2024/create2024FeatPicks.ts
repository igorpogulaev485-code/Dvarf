/**
 * P24-M03: nested picks for origin feats (background + human «Гибкий») and species traits.
 * Pure helpers — UI renders `PickField[]`, validation reads the same specs.
 */

import type { CatalogEntry } from '../../shared/api/catalog'
import { SKILL_DEFS } from '../characters/sheetTypes'
import {
  ARTISAN_TOOL_IDS,
  CASTING_ABILITY_OPTIONS,
  DAMAGE_TYPE_RU,
  MAGIC_INITIATE_LIST_OPTIONS,
  MUSICAL_INSTRUMENT_IDS,
  SKILLED_EXTRA_TOOL_IDS,
  itemNameRu,
  normalizeSlug,
  type ItemNameIndex,
} from './create2024Labels'

export type PickOption = { id: string; label: string; rest?: string }

export type PickField = {
  id: string
  label: string
  hint?: string
  count: number
  options: PickOption[]
}

/** Field id → chosen option ids. */
export type FeatPicks = Record<string, string[]>

export type FeatPickContext = {
  spells: readonly CatalogEntry[]
  items: ItemNameIndex
}

export const HUMAN_SPECIES_SLUG = 'human'

const CASTING_ABILITY_RE = /Интеллект, Мудрость или Харизма/i

const SPECIES_ABILITY_SLUGS = new Set(['elf', 'gnome', 'tiefling'])

const SPECIES_SKILL_RULES: Record<string, { count: number; from: readonly string[] | 'any' }> = {
  human: { count: 1, from: 'any' },
  elf: { count: 1, from: ['insight', 'perception', 'survival'] },
  elf__lfl: { count: 1, from: ['insight', 'perception', 'survival'] },
  changeling: {
    count: 2,
    from: ['deception', 'insight', 'intimidation', 'performance', 'persuasion'],
  },
  shifter: { count: 1, from: ['acrobatics', 'athletics', 'intimidation', 'survival'] },
  lupin: { count: 1, from: ['perception', 'stealth', 'survival'] },
}

export function skillLabelRu(id: string): string {
  return SKILL_DEFS.find((row) => row.key === id)?.label ?? 'Навык'
}

function skillOptions(ids: readonly string[] | 'any'): PickOption[] {
  const keys = ids === 'any' ? SKILL_DEFS.map((row) => row.key) : ids
  return keys.map((id) => ({ id, label: skillLabelRu(id) }))
}

function toolOptions(ids: readonly string[], items: ItemNameIndex): PickOption[] {
  return ids.map((id) => ({ id, label: itemNameRu(id, items) }))
}

function spellLevel(entry: CatalogEntry): number {
  const raw = (entry.data ?? {}).level
  const n = typeof raw === 'number' ? raw : Number(raw ?? -1)
  return Number.isFinite(n) ? n : -1
}

export function spellOnClassList(entry: CatalogEntry, classSlug: string): boolean {
  const classes = (entry.data ?? {}).classes
  if (!Array.isArray(classes)) return true
  return classes.map((c) => String(c).toLowerCase()).includes(classSlug)
}

export function spellsByLevelForClass(
  spells: readonly CatalogEntry[],
  level: number,
  classSlugs: readonly string[],
): CatalogEntry[] {
  return spells
    .filter((s) => spellLevel(s) === level && classSlugs.some((c) => spellOnClassList(s, c)))
    .sort((a, b) => a.name_ru.localeCompare(b.name_ru, 'ru'))
}

function spellOptions(entries: readonly CatalogEntry[]): PickOption[] {
  return entries.map((s) => ({ id: s.slug, label: s.name_ru }))
}

function castingAbilityField(count = 1): PickField {
  return {
    id: 'ability',
    label: 'Заклинательная характеристика',
    hint: 'Для заклинаний, которые даёт эта черта.',
    count,
    options: CASTING_ABILITY_OPTIONS.map((row) => ({ id: row.id, label: row.label })),
  }
}

export function featTraitsText(feat: CatalogEntry | null | undefined): string {
  const data = feat?.data ?? {}
  return String(data.traits_text || data.summary_ru || '')
}

/** Feat slugs that are known to need no extra choices beyond the generic ability pick. */
export function featPickFields(
  featSlug: string | null | undefined,
  featEntry: CatalogEntry | null | undefined,
  picks: FeatPicks,
  ctx: FeatPickContext,
): PickField[] {
  const slug = normalizeSlug(featSlug || '')
  if (!slug) return []
  const fields: PickField[] = []

  switch (slug) {
    case 'magic-initiate': {
      fields.push({
        id: 'list',
        label: 'Список заклинаний',
        hint: 'Заговоры и заклинание 1 круга берутся из одного списка.',
        count: 1,
        options: MAGIC_INITIATE_LIST_OPTIONS.map((row) => ({ id: row.id, label: row.label })),
      })
      const list = picks.list?.[0]
      if (list) {
        fields.push({
          id: 'cantrips',
          label: 'Заговоры',
          count: 2,
          options: spellOptions(spellsByLevelForClass(ctx.spells, 0, [list])),
        })
        fields.push({
          id: 'spell',
          label: 'Заклинание 1 круга',
          count: 1,
          options: spellOptions(spellsByLevelForClass(ctx.spells, 1, [list])),
        })
      }
      fields.push(castingAbilityField())
      return fields
    }
    case 'skilled':
      fields.push({
        id: 'skilled',
        label: 'Умелый: три навыка или инструмента',
        count: 3,
        options: [
          ...skillOptions('any').map((o) => ({ ...o, rest: 'навык' })),
          ...toolOptions([...ARTISAN_TOOL_IDS, ...SKILLED_EXTRA_TOOL_IDS], ctx.items).map((o) => ({
            ...o,
            rest: 'инструмент',
          })),
        ],
      })
      return fields
    case 'crafter':
      fields.push({
        id: 'tools',
        label: 'Инструменты ремесленника',
        hint: 'Выберите три инструмента ремесленника.',
        count: 3,
        options: toolOptions(ARTISAN_TOOL_IDS, ctx.items),
      })
      return fields
    case 'musician':
      fields.push({
        id: 'instruments',
        label: 'Музыкальные инструменты',
        hint: 'Выберите три музыкальных инструмента.',
        count: 3,
        options: toolOptions(MUSICAL_INSTRUMENT_IDS, ctx.items),
      })
      return fields
    case 'harper-agent':
      fields.push({
        id: 'instruments',
        label: 'Музыкальный инструмент',
        count: 1,
        options: toolOptions(MUSICAL_INSTRUMENT_IDS, ctx.items),
      })
      return fields
    case 'portal-jumper':
      fields.push({
        id: 'damage',
        label: 'Сопротивление урону',
        count: 1,
        options: ['necrotic', 'psychic', 'radiant'].map((id) => ({
          id,
          label: DAMAGE_TYPE_RU[id] ?? id,
        })),
      })
      return fields
    case 'arcane-undertaker': {
      const cantrips = ctx.spells.filter(
        (s) =>
          spellLevel(s) === 0 &&
          String((s.data ?? {}).school || '').toLowerCase() === 'necromancy' &&
          (spellOnClassList(s, 'cleric') || spellOnClassList(s, 'wizard')),
      )
      fields.push({
        id: 'cantrip',
        label: 'Заговор некромантии (жрец или волшебник)',
        count: 1,
        options: spellOptions(cantrips.sort((a, b) => a.name_ru.localeCompare(b.name_ru, 'ru'))),
      })
      fields.push(castingAbilityField())
      return fields
    }
    case 'purple-dragon-rook':
      fields.push({
        id: 'skill',
        label: 'Умиротворение: навык',
        count: 1,
        options: skillOptions(['insight', 'performance', 'persuasion']),
      })
      return fields
    case 'aberrant-dragonmark':
      fields.push({
        id: 'cantrip',
        label: 'Заговор чародея',
        count: 1,
        options: spellOptions(spellsByLevelForClass(ctx.spells, 0, ['sorcerer'])),
      })
      fields.push({
        id: 'spell',
        label: 'Заклинание 1 круга из списка чародея',
        count: 1,
        options: spellOptions(spellsByLevelForClass(ctx.spells, 1, ['sorcerer'])),
      })
      return fields
    default:
      break
  }

  if (CASTING_ABILITY_RE.test(featTraitsText(featEntry))) {
    fields.push(castingAbilityField())
  }
  return fields
}

export function speciesPickFields(
  speciesSlug: string | null | undefined,
  speciesEntry: CatalogEntry | null | undefined,
): PickField[] {
  const slug = normalizeSlug(speciesSlug || '')
  const slugRaw = (speciesSlug || '').trim().toLowerCase()
  if (!slug) return []
  const fields: PickField[] = []
  const skillRule = SPECIES_SKILL_RULES[slugRaw] ?? SPECIES_SKILL_RULES[slug]
  if (skillRule) {
    fields.push({
      id: 'skills',
      label: skillRule.count > 1 ? 'Навыки вида' : 'Навык вида',
      count: skillRule.count,
      options: skillOptions(skillRule.from),
    })
  }
  const text = String((speciesEntry?.data ?? {}).traits_text || '')
  if (SPECIES_ABILITY_SLUGS.has(slug) || CASTING_ABILITY_RE.test(text)) {
    fields.push({
      ...castingAbilityField(),
      hint: 'Для заклинаний вида.',
    })
  }
  return fields
}

function uniqueExact(ids: readonly string[] | undefined, count: number): boolean {
  if (!ids) return count === 0
  return ids.length === count && new Set(ids).size === count
}

export function pickFieldsMissing(fields: readonly PickField[], picks: FeatPicks): PickField[] {
  return fields.filter((field) => {
    const chosen = picks[field.id]
    if (!uniqueExact(chosen, field.count)) return true
    const allowed = new Set(field.options.map((o) => o.id))
    return !(chosen ?? []).every((id) => allowed.has(id))
  })
}

/** Drop picks that no longer belong to the current field set. */
export function pruneFeatPicks(fields: readonly PickField[], picks: FeatPicks): FeatPicks {
  const keep = new Set(fields.map((f) => f.id))
  const out: FeatPicks = {}
  for (const [key, value] of Object.entries(picks)) {
    if (keep.has(key)) out[key] = value
  }
  return out
}

export function originFeatSlugOf(entry: CatalogEntry | null | undefined): string | null {
  const feat = (entry?.data ?? {}).origin_feat
  if (!feat || typeof feat !== 'object') return null
  const row = feat as { slug?: string; id?: string }
  const slug = normalizeSlug(String(row.slug || row.id || ''))
  return slug || null
}

export function originFeatNameOf(entry: CatalogEntry | null | undefined): string | null {
  const feat = (entry?.data ?? {}).origin_feat
  if (!feat || typeof feat !== 'object') return null
  const name = (feat as { name_ru?: unknown }).name_ru
  return typeof name === 'string' && name ? name : null
}

export function isOriginFeatEntry(entry: CatalogEntry): boolean {
  return (entry.data ?? {}).category === 'origin'
}

export function featPicksLabelsRu(
  fields: readonly PickField[],
  picks: FeatPicks,
): Array<{ label: string; values: string[] }> {
  return fields
    .map((field) => {
      const chosen = picks[field.id] ?? []
      const names = chosen.map((id) => field.options.find((o) => o.id === id)?.label ?? 'выбор')
      return { label: field.label, values: names }
    })
    .filter((row) => row.values.length > 0)
}
