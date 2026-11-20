/**
 * Internal e2e seeds for the 2024 create wizard (`?e2eLeveling=1&e2eSeed=wizard11abjurer`).
 * Builds an honest wizard build from the loaded catalog: spellbook = freeBookCap + Savant
 * free school spells (when the subclass is a school Savant), prepared and cantrips from the
 * class table, every prepared spell lives in the book.
 */
import type { CatalogEntry } from '../../shared/api/catalog'
import { freeBookCap } from '../../shared/dnd/wizardSpellbook'
import {
  savantFreeBookTotalThroughLevel,
  wizardCreateBookNeed2024,
  wizardSavantSchool,
  type WizardSchoolKey2024,
} from '../../shared/dnd/wizardSpellbook2024'
import { spellOnClassList } from './create2024FeatPicks'

const PREFERRED: Record<number, string[]> = {
  0: ['fire-bolt', 'mage-hand', 'prestidigitation', 'light', 'minor-illusion', 'ray-of-frost'],
  1: [
    'shield',
    'magic-missile',
    'mage-armor',
    'find-familiar',
    'detect-magic',
    'sleep',
    'feather-fall',
    'identify',
    'thunderwave',
    'burning-hands',
  ],
  2: ['misty-step', 'invisibility', 'hold-person', 'mirror-image', 'scorching-ray', 'web'],
  3: ['fireball', 'counterspell', 'fly', 'dispel-magic', 'haste', 'hypnotic-pattern'],
  4: ['greater-invisibility', 'dimension-door', 'polymorph', 'banishment', 'ice-storm'],
  5: ['wall-of-force', 'cone-of-cold', 'scrying', 'teleportation-circle', 'telekinesis'],
  6: ['chain-lightning', 'disintegrate', 'globe-of-invulnerability', 'true-seeing', 'sunbeam'],
  7: ['teleport', 'finger-of-death', 'forcecage', 'plane-shift', 'prismatic-spray'],
  8: ['mind-blank', 'power-word-stun', 'maze', 'sunburst', 'antimagic-field'],
  9: ['wish', 'time-stop', 'foresight', 'meteor-swarm', 'power-word-kill'],
}

/** Subclass feature spells that become always-prepared — keep out of free research fill. */
const FEATURE_SPELL_SLUGS_BY_SUBCLASS: Record<string, readonly string[]> = {
  wizard__necromancer: ['find-familiar', 'animate-dead'],
  wizard__transmuter: ['alter-self', 'polymorph'],
  wizard__illusionist: ['minor-illusion'],
}

export type WizardSeedSpells = {
  cantripIds: string[]
  spellbookSpellIds: string[]
  preparedSpellIds: string[]
  /** How many trailing book ids are Savant free school spells (for create tagging). */
  savantSpellCount: number
}

export type WizardSeedSpec = {
  level: number
  subclassSlug: string | null
}

/** `wizard5`, `wizard3evoker`, `wizard11abjurer`, `wizard20diviner` … */
export function parseWizardSeed(raw: string): WizardSeedSpec | null {
  const match = /^wizard(\d{1,2})([a-z]*)$/.exec(raw.trim())
  if (!match) return null
  const level = Math.min(20, Math.max(1, Number(match[1])))
  if (level < 3) return { level, subclassSlug: null }
  const suffix = match[2] || 'evoker'
  return { level, subclassSlug: `wizard__${suffix}` }
}

type LevelRow = {
  level?: number
  spellcasting?: { cantrips?: number; prepared_spells?: number; slots?: Record<string, number> } | null
}

function levelRow(wizardClass: CatalogEntry, level: number): LevelRow | null {
  const levels = (wizardClass.data as { levels?: LevelRow[] } | undefined)?.levels
  if (!Array.isArray(levels)) return null
  return levels.find((row) => row?.level === level) ?? null
}

function spellLevelOf(entry: CatalogEntry): number {
  return Number((entry.data as { level?: number } | undefined)?.level ?? -1)
}

function spellSchoolOf(entry: CatalogEntry): string {
  return String((entry.data as { school?: string } | undefined)?.school || '')
    .trim()
    .toLowerCase()
}

function maxCircle(row: LevelRow | null): number {
  const keys = Object.keys(row?.spellcasting?.slots ?? {}).map(Number)
  return keys.length ? Math.max(...keys) : 1
}

function poolForCircle(
  spells: readonly CatalogEntry[],
  circle: number,
  opts?: { school?: WizardSchoolKey2024 | null; exclude?: Set<string> },
): string[] {
  const school = opts?.school ?? null
  const exclude = opts?.exclude ?? new Set<string>()
  const available = spells
    .filter((s) => {
      if (spellLevelOf(s) !== circle) return false
      if (!spellOnClassList(s, 'wizard')) return false
      if (!(s.source === 'srd-5.2' || s.source === 'ph24' || s.source === 'au')) return false
      if (exclude.has(s.slug)) return false
      if (school && spellSchoolOf(s) !== school) return false
      return true
    })
    .map((s) => s.slug)
  const preferred = (PREFERRED[circle] ?? []).filter((slug) => available.includes(slug))
  const rest = available.filter((slug) => !preferred.includes(slug)).sort()
  return [...preferred, ...rest]
}

export function buildWizardSeedSpells(
  spells: readonly CatalogEntry[],
  wizardClass: CatalogEntry,
  level: number,
  subclassSlug?: string | null,
): WizardSeedSpells {
  const row = levelRow(wizardClass, level)
  const cantripNeed = Number(row?.spellcasting?.cantrips ?? 3)
  const preparedNeed = Number(row?.spellcasting?.prepared_spells ?? 4)
  const freeNeed = freeBookCap(level)
  const savantNeed = savantFreeBookTotalThroughLevel({
    wizardLevel: level,
    subclassSlug: subclassSlug ?? null,
  })
  const bookNeed = wizardCreateBookNeed2024({
    wizardLevel: level,
    subclassSlug: subclassSlug ?? null,
  })
  const school = wizardSavantSchool(subclassSlug)
  const exclude = new Set(
    FEATURE_SPELL_SLUGS_BY_SUBCLASS[String(subclassSlug || '').toLowerCase()] ?? [],
  )

  const cantripIds = poolForCircle(spells, 0, { exclude }).slice(0, cantripNeed)
  const taken = new Set<string>()
  const book: string[] = []
  const take = (circle: number, schoolFilter?: WizardSchoolKey2024 | null): void => {
    const slug = poolForCircle(spells, circle, {
      school: schoolFilter ?? null,
      exclude,
    }).find((s) => !taken.has(s))
    if (!slug) return
    taken.add(slug)
    book.push(slug)
  }
  for (let i = 0; i < 6; i += 1) take(1)
  for (let lv = 2; lv <= level; lv += 1) {
    const top = maxCircle(levelRow(wizardClass, lv))
    take(top)
    take(Math.max(1, top - 1))
  }
  for (let circle = 1; book.length < freeNeed && circle <= 9; circle += 1) {
    while (book.length < freeNeed) {
      const before = book.length
      take(circle)
      if (book.length === before) break
    }
  }
  // Savant free school spells (after free research fill).
  if (school && savantNeed > 0) {
    // Two ≤2nd at subclass, then one per new tier up to level.
    let remaining = savantNeed
    while (remaining > 0 && book.length < bookNeed) {
      const before = book.length
      for (let circle = 1; circle <= 2 && remaining > 0; circle += 1) {
        take(circle, school)
        if (book.length > before) {
          remaining -= 1
          break
        }
      }
      if (book.length === before) {
        for (let circle = 3; circle <= 9 && remaining > 0; circle += 1) {
          take(circle, school)
          if (book.length > before) {
            remaining -= 1
            break
          }
        }
      }
      if (book.length === before) break
    }
  }

  const prepared: string[] = book.slice(0, 4)
  for (const slug of [...book].reverse()) {
    if (prepared.length >= preparedNeed) break
    if (!prepared.includes(slug)) prepared.push(slug)
  }
  const spellbookSpellIds = book.slice(0, bookNeed)
  return {
    cantripIds,
    spellbookSpellIds,
    preparedSpellIds: prepared.slice(0, preparedNeed),
    savantSpellCount: Math.min(savantNeed, Math.max(0, spellbookSpellIds.length - freeNeed)),
  }
}
