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

/** Slugs whose «damage» field is healing, not damage. */
const HEAL_SLUGS = new Set([
  'cure_wounds',
  'healing_word',
  'mass_cure_wounds',
  'mass_healing_word',
  'heal',
  'prayer_of_healing',
  'aura_of_vitality',
  'goodberry',
])

/** Slugs whose numeric effect is max/current HP boost (aid), not damage. */
const HP_BOOST_SLUGS = new Set(['aid', 'heroes_feast'])

/**
 * Catalog sometimes stores buff dice (1d4 to checks/attacks) under `damage`.
 * Those must not print as УРОН.
 */
const BUFF_DICE_SLUGS = new Set([
  'guidance',
  'bless',
  'bane',
  'resistance',
  'shield_of_faith',
  'heroism',
])

export type SpellEffectKind = 'damage' | 'heal' | 'hp'

export type SpellCardFace = {
  key: string
  spellId: string
  name: string
  level: number
  levelLabel: string
  school: string
  badges: string[]
  castingTime: string
  range: string
  components: string
  duration: string
  attackOrSave: string
  /** Printable magnitude; empty = omit the effect row. */
  effectValue: string
  effectKind: SpellEffectKind | null
  body: string
  part: number
  partsTotal: number
  isContinuation: boolean
}

export type SpellCardGroup = {
  level: number
  label: string
  faces: SpellCardFace[]
}

export type SpellCardPage = {
  groups: SpellCardGroup[]
  /** Total card faces on this page (headers excluded). */
  cardCount: number
}

export type SpellCatalogIndex = {
  byId: Map<string, CatalogEntry>
  bySlug: Map<string, CatalogEntry>
  byNameRu: Map<string, CatalogEntry>
}

export function levelGroupLabel(level: number): string {
  if (level <= 0) return 'Заговоры'
  return `${level}-й круг`
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

const CYRILLIC_RE = /[А-Яа-яЁё]/
const LATIN_WORD_RE = /[A-Za-z]{3,}/

/** True when text looks English-only (no Cyrillic letters). */
export function isEnglishOnlyText(value: string): boolean {
  const text = value.trim()
  if (!text) return false
  if (CYRILLIC_RE.test(text)) return false
  return LATIN_WORD_RE.test(text)
}

/** Empty / em-dash placeholders are not printable magnitudes. */
export function printableSpellDamage(raw: string | null | undefined): string {
  const text = String(raw ?? '').trim()
  if (!text) return ''
  if (text === '—' || text === '–' || text === '-' || text === '−') return ''
  return text
}

export function effectKindLabel(kind: SpellEffectKind): string {
  if (kind === 'heal') return 'Лечение'
  if (kind === 'hp') return 'Хиты'
  return 'Урон'
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

function resolveSlug(spell: SheetSpell, entry: CatalogEntry | null): string {
  if (entry?.slug) return entry.slug
  const alias = SPELL_NAME_ALIASES[normalizeName(spell.name)]
  if (alias) return alias
  return String(spell.catalog_id ?? '')
    .trim()
    .toLowerCase()
    .replace(/:/g, '_')
}

/** Prefer Russian description; never print English-only handbook text. */
function pickDescription(
  sheetDesc: string | undefined,
  catalogDesc: string,
): string | undefined {
  const sheet = sheetDesc?.trim() || ''
  const catalog = catalogDesc.trim()
  const sheetRu = sheet && !isEnglishOnlyText(sheet) ? sheet : ''
  const catalogRu = catalog && !isEnglishOnlyText(catalog) ? catalog : ''
  if (sheetRu) return sheetRu
  if (catalogRu) return catalogRu
  if (sheet || catalog) {
    // Handbook has English only — do not invent a translation.
    return undefined
  }
  return undefined
}

function classifyEffect(
  spell: SheetSpell,
  slug: string,
  magnitude: string,
): { kind: SpellEffectKind; value: string } | null {
  if (!magnitude) return null
  const name = normalizeName(spell.name)
  if (
    BUFF_DICE_SLUGS.has(slug) ||
    name === 'указание' ||
    name === 'благословение' ||
    name === 'порча' ||
    name === 'сопротивление'
  ) {
    return null
  }
  if (HP_BOOST_SLUGS.has(slug) || name === 'подмога') {
    return { kind: 'hp', value: magnitude }
  }
  if (
    HEAL_SLUGS.has(slug) ||
    /исцел|лечен|лечащ/.test(name) ||
    /лечен|исцел|хит/.test(magnitude.toLowerCase())
  ) {
    return { kind: 'heal', value: magnitude }
  }
  // Bare number with no dice → usually an HP bump (aid-style), not weapon damage.
  if (/^\d+\s*$/.test(magnitude) && !/[кkd]\d/i.test(magnitude)) {
    return { kind: 'hp', value: magnitude }
  }
  return { kind: 'damage', value: magnitude }
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
  effectKind: SpellEffectKind | null
  effectValue: string
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
  // Prefer catalog magnitude when sheet still has a bare placeholder-filled value
  // that is clearly wrong for heal/hp (handled via classify). Keep sheet if set.
  const magnitude = sheetDamage || printableSpellDamage(catalogDamage)
  const slug = resolveSlug(spell, entry)
  const effect = classifyEffect(spell, slug, magnitude)

  // Always prefer catalog school when present — seed sheets often store «воплощение» for all.
  const school = catalogSchool || spell.school || ''

  const sheetHigher = spell.higher_levels?.trim() || ''
  const higher =
    (sheetHigher && !isEnglishOnlyText(sheetHigher) ? sheetHigher : '') ||
    (catalogHigher && !isEnglishOnlyText(catalogHigher) ? catalogHigher : '') ||
    undefined

  return {
    ...spell,
    damage: magnitude,
    description: pickDescription(spell.description, catalogDesc),
    higher_levels: higher,
    duration: spell.duration?.trim() || catalogDuration || spell.duration,
    attack_or_save:
      printableSpellDamage(spell.attack_or_save) ||
      printableSpellDamage(catalogAttack) ||
      spell.attack_or_save ||
      '',
    school,
    effectKind: effect?.kind ?? null,
    effectValue: effect?.value ?? '',
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
    return 'Описание в справочнике на русском недоступно'
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

  return bodies.map((body, index) => ({
    key: `${spell.id}-p${index + 1}`,
    spellId: spell.id,
    name,
    level: Math.max(0, Math.floor(spell.level)),
    levelLabel: levelLabel(spell.level),
    school,
    badges,
    castingTime: enriched.casting_time || '',
    range: enriched.range || '',
    components: componentsLabel(enriched.components),
    duration: enriched.duration || '',
    attackOrSave: printableSpellDamage(enriched.attack_or_save) || '',
    effectValue: enriched.effectValue,
    effectKind: enriched.effectKind,
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
  const spells = [...classicSpellsState(character).known].sort((a, b) => {
    const ld = (a.level || 0) - (b.level || 0)
    if (ld !== 0) return ld
    return a.name.localeCompare(b.name, 'ru')
  })
  const faces: SpellCardFace[] = []
  for (const spell of spells) {
    faces.push(...spellToCardFaces(spell, catalog))
  }
  return faces
}

/**
 * Pack faces into pages: max 9 cards/page, grouped by level.
 * New level always starts a new grid row (header spans full width).
 * No empty card frames — incomplete rows are left sparse.
 */
export function chunkSpellCardPages(faces: SpellCardFace[]): SpellCardPage[] {
  if (faces.length === 0) return []

  const byLevel = new Map<number, SpellCardFace[]>()
  for (const face of faces) {
    const level = face.level
    const row = byLevel.get(level)
    if (row) row.push(face)
    else byLevel.set(level, [face])
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b)

  const pages: SpellCardPage[] = []
  let current: SpellCardPage = { groups: [], cardCount: 0 }

  const pushPage = () => {
    if (current.cardCount > 0 || current.groups.length > 0) {
      pages.push(current)
    }
    current = { groups: [], cardCount: 0 }
  }

  for (const level of levels) {
    const remaining = [...(byLevel.get(level) || [])]
    while (remaining.length > 0) {
      const space = SPELL_CARDS_PER_PAGE - current.cardCount
      if (space <= 0) {
        pushPage()
        continue
      }
      const take = remaining.splice(0, space)
      const last = current.groups[current.groups.length - 1]
      if (last && last.level === level) {
        last.faces.push(...take)
      } else {
        current.groups.push({
          level,
          label: levelGroupLabel(level),
          faces: take,
        })
      }
      current.cardCount += take.length
    }
  }

  pushPage()
  return pages
}

/** @deprecated Prefer chunkSpellCardPages → SpellCardPage[]. Kept for older call sites. */
export function chunkSpellCardFacePages(faces: SpellCardFace[]): SpellCardFace[][] {
  return chunkSpellCardPages(faces).map((page) => page.groups.flatMap((g) => g.faces))
}
