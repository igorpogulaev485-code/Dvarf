/**
 * Internal e2e seeds for the 2024 create cleric (`?e2eLeveling=1&e2eSeed=cleric11arcana`).
 * Book paths: Arcana (AU) + Knowledge (FRHoF) + Grave (RTW). PHB domain aliases kept.
 */
import type { CatalogEntry } from '../../shared/api/catalog'
import { spellOnClassList } from './create2024FeatPicks'

const PREFERRED: Record<number, string[]> = {
  0: ['guidance', 'sacred-flame', 'thaumaturgy', 'toll-the-dead', 'light', 'spare-the-dying'],
  1: [
    'bless',
    'cure-wounds',
    'guiding-bolt',
    'healing-word',
    'shield-of-faith',
    'command',
    'detect-magic',
    'bane',
  ],
  2: ['aid', 'spiritual-weapon', 'hold-person', 'lesser-restoration', 'prayer-of-healing'],
  3: ['spirit-guardians', 'revivify', 'dispel-magic', 'mass-healing-word', 'beacon-of-hope'],
  4: ['death-ward', 'divination', 'freedom-of-movement', 'guardian-of-faith'],
  5: ['greater-restoration', 'mass-cure-wounds', 'raise-dead', 'scrying', 'holy-weapon'],
  6: ['heal', 'heroes-feast', 'true-seeing', 'word-of-recall'],
  7: ['divine-word', 'regenerate', 'resurrection', 'plane-shift'],
  8: ['holy-aura', 'sunburst', 'antimagic-field'],
  9: ['mass-heal', 'true-resurrection', 'gate'],
}

export type ClericSeedSpells = {
  cantripIds: string[]
  spellbookSpellIds: string[]
  preparedSpellIds: string[]
}

export type ClericSeedSpec = {
  level: number
  subclassSlug: string | null
}

const SUBCLASS_SUFFIX: Record<string, string> = {
  '': 'life',
  life: 'life',
  light: 'light',
  trickery: 'trickery',
  war: 'war',
  arcana: 'arcana',
  knowledge: 'knowledge',
  grave: 'grave',
  magiya: 'arcana',
  znaniya: 'knowledge',
  upokoeniya: 'grave',
}

function resolveSubclassSlug(suffix: string): string {
  const key = (suffix || 'life').replace(/[^a-z]/g, '')
  const base = SUBCLASS_SUFFIX[key] ?? key
  if (base === 'life') return 'cleric__life-domain'
  if (base === 'light') return 'cleric__light-domain'
  if (base === 'trickery') return 'cleric__trickery-domain'
  if (base === 'war') return 'cleric__war-domain'
  if (base === 'arcana') return 'cleric__arcana-domain'
  if (base === 'knowledge') return 'cleric__knowledge-domain'
  if (base === 'grave') return 'cleric__grave-domain'
  return `cleric__${base}`
}

/** `cleric5`, `cleric3arcana`, `cleric11knowledge`, `cleric17grave` … */
export function parseClericSeed(raw: string): ClericSeedSpec | null {
  const match = /^cleric(\d{1,2})([a-z]*)$/i.exec(raw.trim())
  if (!match) return null
  const level = Math.min(20, Math.max(1, Number(match[1])))
  if (level < 3) return { level, subclassSlug: null }
  const suffix = match[2]?.toLowerCase() ?? ''
  return { level, subclassSlug: resolveSubclassSlug(suffix) }
}

export function clericAsiChoicesForLevel(level: number): Array<{
  classSlug: string
  classLevel: number
  kind: 'asi_plus2'
  abilities: Record<string, number>
}> {
  const gates = [4, 8, 12, 16, 19].filter((g) => g <= level)
  return gates.map((classLevel, index) => ({
    classSlug: 'cleric',
    classLevel,
    kind: 'asi_plus2' as const,
    abilities: index % 2 === 0 ? { wis: 2 } : { con: 2 },
  }))
}

function pickSpells(
  spells: CatalogEntry[],
  classEntry: CatalogEntry,
  level: number,
  circle: number,
  count: number,
): string[] {
  const preferred = PREFERRED[circle] ?? []
  const out: string[] = []
  for (const slug of preferred) {
    if (out.length >= count) break
    if (!spellOnClassList(spells, classEntry, slug)) continue
    if (!out.includes(slug)) out.push(slug)
  }
  if (out.length < count) {
    for (const row of spells) {
      if (out.length >= count) break
      const slug = String(row.slug || '')
      if (!slug || out.includes(slug)) continue
      if (!spellOnClassList(spells, classEntry, slug)) continue
      const data = (row.data || {}) as { level?: number; circle?: number }
      const circ = Number(data.level ?? data.circle ?? 0)
      if (circ !== circle) continue
      out.push(slug)
    }
  }
  return out
}

export function buildClericSeedSpells(
  spells: CatalogEntry[],
  classEntry: CatalogEntry,
  level: number,
): ClericSeedSpells {
  const cantripNeed = level >= 10 ? 5 : level >= 4 ? 4 : 3
  const cantripIds = pickSpells(spells, classEntry, level, 0, cantripNeed)
  const prepared: string[] = [...cantripIds]
  const maxCircle = Math.min(9, Math.ceil(level / 2))
  for (let circle = 1; circle <= maxCircle; circle += 1) {
    prepared.push(...pickSpells(spells, classEntry, level, circle, circle <= 2 ? 3 : 2))
  }
  return { cantripIds, spellbookSpellIds: [], preparedSpellIds: prepared }
}

export function buildClericClassOptionPicks(
  level: number,
  subclassSlug: string | null | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    divine_order: 'thaumaturge',
  }
  if (level >= 7) out.blessed_strikes = 'potent_spellcasting'
  const sub = String(subclassSlug || '').toLowerCase()
  if (sub === 'cleric__arcana-domain' && level >= 3) {
    out.student_of_arcana_skill = 'arcana'
    out.student_of_arcana_cantrips = ['mage-hand', 'prestidigitation']
  }
  if (sub === 'cleric__arcana-domain' && level >= 17) {
    out.magical_mastery_6 = 'disintegrate'
    out.magical_mastery_7 = 'teleport'
    out.magical_mastery_8 = 'mind-blank'
    out.magical_mastery_9 = 'foresight'
  }
  if (sub === 'cleric__knowledge-domain' && level >= 3) {
    out.blessings_of_knowledge_tool = 'calligraphers-supplies'
    out.blessings_of_knowledge_skills = ['history', 'arcana']
  }
  if (sub === 'cleric__knowledge-domain' && level >= 6) {
    out.unfettered_mind_save = 'int'
  }
  return out
}
