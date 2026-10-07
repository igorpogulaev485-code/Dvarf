/** PHB 2014 multiclass prerequisites, hit dice, and average HP gains. */

import { resolveClassCasterSlug } from './casterProgression'
import {
  hitDieSides,
  isHitDie,
  type HitDie,
} from './hitDice'

export type AbilityScores = Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>

export type MulticlassPrerequisite =
  | { all: Array<keyof AbilityScores>; min: number }
  | { any: Array<keyof AbilityScores>; min: number }

/** PHB 2014 Multiclassing Prerequisites table. */
export const MULTICLASS_PREREQUISITES: Record<string, MulticlassPrerequisite> = {
  artificer: { all: ['int'], min: 13 },
  barbarian: { all: ['str'], min: 13 },
  bard: { all: ['cha'], min: 13 },
  cleric: { all: ['wis'], min: 13 },
  druid: { all: ['wis'], min: 13 },
  fighter: { any: ['str', 'dex'], min: 13 },
  monk: { all: ['dex', 'wis'], min: 13 },
  paladin: { all: ['str', 'cha'], min: 13 },
  ranger: { all: ['dex', 'wis'], min: 13 },
  rogue: { all: ['dex'], min: 13 },
  sorcerer: { all: ['cha'], min: 13 },
  warlock: { all: ['cha'], min: 13 },
  wizard: { all: ['int'], min: 13 },
}

/** PHB 2014 hit die by class slug. */
export const CLASS_HIT_DIE: Record<string, HitDie> = {
  artificer: 'd8',
  barbarian: 'd12',
  bard: 'd8',
  cleric: 'd8',
  druid: 'd8',
  fighter: 'd10',
  monk: 'd8',
  paladin: 'd10',
  ranger: 'd10',
  rogue: 'd8',
  sorcerer: 'd6',
  warlock: 'd8',
  wizard: 'd6',
}

const ABILITY_LABEL_RU: Record<keyof AbilityScores, string> = {
  str: 'СИЛ',
  dex: 'ЛОВ',
  con: 'ТЕЛ',
  int: 'ИНТ',
  wis: 'МУД',
  cha: 'ХАР',
}

export function resolveClassSlug(className: string): string | null {
  return resolveClassCasterSlug(className)
}

export function hitDieFromCatalogData(data: Record<string, unknown> | null | undefined): HitDie | null {
  if (!data) return null
  const raw = data.hit_die ?? data.hitDie
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const asDie = `d${Math.floor(raw)}`
    return isHitDie(asDie) ? asDie : null
  }
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase().replace(/^d/i, 'd')
    const withD = normalized.startsWith('d') ? normalized : `d${normalized}`
    return isHitDie(withD) ? withD : null
  }
  return null
}

export function hitDieForClass(input: {
  className: string
  catalogData?: Record<string, unknown> | null
}): HitDie | null {
  const fromCatalog = hitDieFromCatalogData(input.catalogData)
  if (fromCatalog) return fromCatalog
  const slug = resolveClassSlug(input.className)
  if (!slug) return null
  return CLASS_HIT_DIE[slug] ?? null
}

/** PHB «Hit Points at Higher Levels» average: floor(die/2)+1 + CON. */
export function averageHpGain(die: HitDie, constitutionMod: number): number {
  const avg = Math.floor(hitDieSides(die) / 2) + 1
  return avg + Math.floor(constitutionMod)
}

/** PHB level 1: maximum of hit die + CON (min 1). */
export function firstLevelHpMax(die: HitDie, constitutionMod: number): number {
  return Math.max(1, hitDieSides(die) + Math.floor(constitutionMod))
}

export type MaxHpLevelRow = {
  label: string
  die: HitDie
  gain: number
  kind: 'max' | 'average'
}

/**
 * Rebuild max HP from class levels (2014):
 * first class level 1 → max die + CON; every other class level → average + CON
 * (including 1st level of a multiclass).
 */
export function buildMaxHpByLevels(input: {
  classes: Array<{ name: string; level: number }>
  constitutionMod: number
  fallbackDie?: HitDie | null
}): { rows: MaxHpLevelRow[]; total: number } | null {
  const rows: MaxHpLevelRow[] = []
  const named = input.classes.filter((row) => row.name.trim() && row.level > 0)
  if (named.length === 0) {
    const die = input.fallbackDie ?? null
    if (!die) return null
    const gain = firstLevelHpMax(die, input.constitutionMod)
    rows.push({ label: 'Ур. 1', die, gain, kind: 'max' })
    return { rows, total: gain }
  }

  named.forEach((cls, classIndex) => {
    const die =
      hitDieForClass({ className: cls.name }) ?? input.fallbackDie ?? null
    if (!die) return
    const levels = Math.max(0, Math.floor(cls.level))
    for (let lvl = 1; lvl <= levels; lvl += 1) {
      const isOriginFirst = classIndex === 0 && lvl === 1
      const gain = isOriginFirst
        ? firstLevelHpMax(die, input.constitutionMod)
        : averageHpGain(die, input.constitutionMod)
      rows.push({
        label: `${cls.name.trim()} ${lvl}`,
        die,
        gain,
        kind: isOriginFirst ? 'max' : 'average',
      })
    }
  })

  if (rows.length === 0) return null
  const total = rows.reduce((acc, row) => acc + row.gain, 0)
  return { rows, total }
}

export function meetsPrerequisite(
  prerequisite: MulticlassPrerequisite,
  abilities: AbilityScores,
): boolean {
  if ('any' in prerequisite) {
    return prerequisite.any.some((key) => (abilities[key] ?? 0) >= prerequisite.min)
  }
  return prerequisite.all.every((key) => (abilities[key] ?? 0) >= prerequisite.min)
}

export function formatPrerequisite(prerequisite: MulticlassPrerequisite): string {
  if ('any' in prerequisite) {
    const parts = prerequisite.any.map((key) => ABILITY_LABEL_RU[key])
    return `${parts.join(' или ')} ${prerequisite.min}+`
  }
  const parts = prerequisite.all.map((key) => `${ABILITY_LABEL_RU[key]} ${prerequisite.min}+`)
  return parts.join(' и ')
}

export function unmetPrerequisiteDetail(
  prerequisite: MulticlassPrerequisite,
  abilities: AbilityScores,
): string | null {
  if (meetsPrerequisite(prerequisite, abilities)) return null
  if ('any' in prerequisite) {
    const parts = prerequisite.any.map(
      (key) => `${ABILITY_LABEL_RU[key]} ${abilities[key] ?? 0}`,
    )
    return `нужно ${formatPrerequisite(prerequisite)} (сейчас ${parts.join(' / ')})`
  }
  const missing = prerequisite.all
    .filter((key) => (abilities[key] ?? 0) < prerequisite.min)
    .map((key) => `${ABILITY_LABEL_RU[key]} ${abilities[key] ?? 0} < ${prerequisite.min}`)
  return missing.join('; ')
}

export type MulticlassGateResult =
  | { ok: true; slug: string }
  | { ok: false; reason: string; slug: string | null }

/**
 * PHB: to take a *new* class you must meet prerequisites for the new class
 * and for every class you already have.
 */
export function canTakeMulticlassLevel(input: {
  newClassName: string
  currentClassNames: string[]
  abilities: AbilityScores
}): MulticlassGateResult {
  const newSlug = resolveClassSlug(input.newClassName)
  if (!newSlug) {
    return {
      ok: false,
      slug: null,
      reason: 'Выбери класс из справочника (нужен известный класс PHB 2014).',
    }
  }

  const alreadyHas = input.currentClassNames.some(
    (name) => resolveClassSlug(name) === newSlug,
  )
  if (alreadyHas) {
    return { ok: true, slug: newSlug }
  }

  const requiredSlugs = new Set<string>([newSlug])
  for (const name of input.currentClassNames) {
    const slug = resolveClassSlug(name)
    if (slug) requiredSlugs.add(slug)
  }

  const failures: string[] = []
  for (const slug of requiredSlugs) {
    const prereq = MULTICLASS_PREREQUISITES[slug]
    if (!prereq) continue
    const detail = unmetPrerequisiteDetail(prereq, input.abilities)
    if (detail) {
      const label =
        Object.entries(CLASS_HIT_DIE).find(([key]) => key === slug)?.[0] ?? slug
      const nameRu =
        (
          {
            artificer: 'Изобретатель',
            barbarian: 'Варвар',
            bard: 'Бард',
            cleric: 'Жрец',
            druid: 'Друид',
            fighter: 'Воин',
            monk: 'Монах',
            paladin: 'Паладин',
            ranger: 'Следопыт',
            rogue: 'Плут',
            sorcerer: 'Чародей',
            warlock: 'Колдун',
            wizard: 'Волшебник',
          } as Record<string, string>
        )[slug] ?? label
      failures.push(`${nameRu}: ${detail}`)
    }
  }

  if (failures.length > 0) {
    return {
      ok: false,
      slug: newSlug,
      reason: `Не хватает характеристик для мультикласса. ${failures.join(' · ')}`,
    }
  }

  return { ok: true, slug: newSlug }
}

export function isClassEligibleForMulticlass(input: {
  className: string
  currentClassNames: string[]
  abilities: AbilityScores
}): boolean {
  return canTakeMulticlassLevel({
    newClassName: input.className,
    currentClassNames: input.currentClassNames,
    abilities: input.abilities,
  }).ok
}
