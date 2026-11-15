import type { CharacterDetail } from '../../shared/api/characters'
import {
  formatSpellComponents,
  spellSchoolLabelRu,
  type SpellComponents,
} from '../../shared/dnd/spellCatalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { SheetSpell } from '../characters/spells'
import { classicSpellsState } from './classicSpells'

/** Poker / MTG size — easy to cut and sleeve (same idea as LSS cards). */
export const SPELL_CARDS_PER_PAGE = 9

/** Rough body capacity for one card face (chars). Continuations carry the rest. */
const CARD_BODY_CHARS = 420

/** Sheet names that differ from catalog name_ru. */
const SPELL_NAME_ALIASES: Record<string, string> = {
  'слово исцеления': 'healing_word',
  'лечащее слово': 'healing_word',
  'волшебная стрела': 'magic_missile',
  'священное пламя': 'sacred_flame',
  'огненный снаряд': 'fire_bolt',
  'злая насмешка': 'vicious_mockery',
  'волшебная рука': 'mage_hand',
  'лечение ран': 'cure_wounds',
  'указание': 'guidance',
  'чудотворство': 'thaumaturgy',
  'благословение': 'bless',
  'громовая волна': 'thunderwave',
  'подмога': 'aid',
  'дребезги': 'shatter',
  'щит': 'shield',
}

export type SpellCardFace = {
  key: string
  spellId: string
  name: string
  levelLabel: string
  school: string
  badges: string[]
  castingTime: string
  range: string
  components: string
  duration: string
  attackOrSave: string
  damage: string
  body: string
  part: number
  partsTotal: number
  isContinuation: boolean
}

export type SpellCatalogIndex = {
  byId: Map<string, CatalogEntry>
  bySlug: Map<string, CatalogEntry>
  byNameRu: Map<string, CatalogEntry>
}

function levelLabel(level: number): string {
  if (level <= 0) return 'Заговор'
  return `${level} круг`
}

function componentsLabel(components: SpellComponents | undefined): string {
  if (!components) return ''
  return formatSpellComponents(components)
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Empty / em-dash placeholders are not printable damage. */
export function printableSpellDamage(raw: string | null | undefined): string {
  const text = String(raw ?? '').trim()
  if (!text) return ''
  if (text === '—' || text === '–' || text === '-' || text === '−') return ''
  return text
}

export function buildSpellCatalogIndex(entries: CatalogEntry[]): SpellCatalogIndex {
  const byId = new Map<string, CatalogEntry>()
  const bySlug = new Map<string, CatalogEntry>()
  const byNameRu = new Map<string, CatalogEntry>()
  for (const entry of entries) {
    if (entry.kind !== 'spell') continue
    byId.set(entry.id, entry)
    bySlug.set(entry.slug, entry)
    byNameRu.set(normalizeName(entry.name_ru), entry)
    if (entry.name_en) byNameRu.set(normalizeName(entry.name_en), entry)
  }
  return { byId, bySlug, byNameRu }
}

function catalogDataString(data: Record<string, unknown>, key: string): string {
  const value = data[key]
  return typeof value === 'string' ? value.trim() : ''
}

function lookupCatalogSpell(
  spell: SheetSpell,
  catalog: SpellCatalogIndex | null | undefined,
): CatalogEntry | null {
  if (!catalog) return null
  const catalogId = String(spell.catalog_id ?? '').trim()
  if (catalogId && catalog.byId.has(catalogId)) return catalog.byId.get(catalogId) ?? null
  const name = normalizeName(spell.name)
  if (name && catalog.byNameRu.has(name)) return catalog.byNameRu.get(name) ?? null
  const aliasSlug = SPELL_NAME_ALIASES[name]
  if (aliasSlug && catalog.bySlug.has(aliasSlug)) return catalog.bySlug.get(aliasSlug) ?? null
  if (catalogId && catalog.bySlug.has(catalogId)) return catalog.bySlug.get(catalogId) ?? null
  return null
}

type EnrichedSpell = SheetSpell & {
  description?: string
  higher_levels?: string
  damage: string
  duration?: string
  school?: string
  attack_or_save?: string
  casting_time?: string
  range?: string
}

function enrichSpellFromCatalog(
  spell: SheetSpell,
  catalog: SpellCatalogIndex | null | undefined,
): EnrichedSpell {
  const entry = lookupCatalogSpell(spell, catalog)
  const data = entry ? (entry.data as Record<string, unknown>) : null
  const catalogDamage = data ? catalogDataString(data, 'damage') : ''
  const catalogDesc = data ? catalogDataString(data, 'description') : ''
  const catalogHigher = data ? catalogDataString(data, 'higher_levels') : ''
  const catalogDuration = data ? catalogDataString(data, 'duration') : ''
  const catalogAttack = data ? catalogDataString(data, 'attack_or_save') : ''
  const catalogSchool =
    data && typeof data.school === 'string' ? String(data.school) : ''

  const sheetDamage = printableSpellDamage(spell.damage)
  const damage = sheetDamage || printableSpellDamage(catalogDamage)

  return {
    ...spell,
    damage,
    description: spell.description?.trim() || catalogDesc || undefined,
    higher_levels: spell.higher_levels?.trim() || catalogHigher || undefined,
    duration: spell.duration?.trim() || catalogDuration || spell.duration,
    attack_or_save:
      printableSpellDamage(spell.attack_or_save) ||
      printableSpellDamage(catalogAttack) ||
      spell.attack_or_save ||
      '',
    school: spell.school || catalogSchool || spell.school,
  }
}

function buildBody(spell: EnrichedSpell): string {
  const chunks: string[] = []
  if (spell.description?.trim()) chunks.push(spell.description.trim())
  if (spell.higher_levels?.trim()) {
    chunks.push(`На больших уровнях. ${spell.higher_levels.trim()}`)
  }
  if (spell.notes?.trim()) chunks.push(spell.notes.trim())
  if (chunks.length === 0) {
    return 'Описание в справочнике недоступно'
  }
  return chunks.join('\n\n')
}

function splitBody(text: string, maxChars: number): string[] {
  const trimmed = text.trim()
  if (!trimmed) return ['']
  if (trimmed.length <= maxChars) return [trimmed]

  const parts: string[] = []
  let rest = trimmed
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf(' ', maxChars)
    if (cut < maxChars * 0.55) cut = maxChars
    parts.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) parts.push(rest)
  return parts.length ? parts : ['']
}

export function spellToCardFaces(spell: SheetSpell, catalog?: SpellCatalogIndex | null): SpellCardFace[] {
  const name = spell.name.trim()
  if (!name) return []

  const enriched = enrichSpellFromCatalog(spell, catalog)
  const bodies = splitBody(buildBody(enriched), CARD_BODY_CHARS)
  const partsTotal = bodies.length
  const school = enriched.school ? spellSchoolLabelRu(enriched.school) : ''
  const badges: string[] = []
  if (enriched.ritual) badges.push('Ритуал')
  if (enriched.concentration) badges.push('Концентрация')
  if (enriched.prepared && enriched.level > 0) badges.push('Подг.')
  const damage = printableSpellDamage(enriched.damage)

  return bodies.map((body, index) => ({
    key: `${spell.id}-p${index + 1}`,
    spellId: spell.id,
    name,
    levelLabel: levelLabel(spell.level),
    school,
    badges,
    castingTime: enriched.casting_time || '',
    range: enriched.range || '',
    components: componentsLabel(enriched.components),
    duration: enriched.duration || '',
    attackOrSave: printableSpellDamage(enriched.attack_or_save) || '',
    damage,
    body,
    part: index + 1,
    partsTotal,
    isContinuation: index > 0,
  }))
}

export function classicSpellCardFaces(
  character: CharacterDetail,
  catalog?: SpellCatalogIndex | null,
): SpellCardFace[] {
  const spells = classicSpellsState(character).known
  const faces: SpellCardFace[] = []
  for (const spell of spells) {
    faces.push(...spellToCardFaces(spell, catalog))
  }
  return faces
}

export function chunkSpellCardPages(faces: SpellCardFace[]): SpellCardFace[][] {
  if (faces.length === 0) return []
  const pages: SpellCardFace[][] = []
  for (let i = 0; i < faces.length; i += SPELL_CARDS_PER_PAGE) {
    pages.push(faces.slice(i, i + SPELL_CARDS_PER_PAGE))
  }
  return pages
}
