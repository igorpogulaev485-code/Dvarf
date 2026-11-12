/** L-16: клиентская проверка листа vs правила старта (уровень/раса/класс/книги). */

import {
  normalizeStartRules,
  sourceMatchesAllowed,
  type StartRules,
} from './campaignRules'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function slug(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
}

export function checkSheetStartRules(opts: {
  level: number
  sheet: unknown
  start: unknown
}): string[] {
  const start: StartRules = normalizeStartRules(opts.start)
  const sheet = asRecord(opts.sheet)
  const pipeline = asRecord(sheet.create_pipeline)
  const mismatches: string[] = []

  if (opts.level !== start.level) {
    mismatches.push(
      `Уровень ${opts.level}, по правилам старта нужен ${start.level}`,
    )
  }

  const race = asRecord(pipeline.race)
  const classRef = asRecord(pipeline.classRef ?? pipeline.class_ref)
  const raceSlug = slug(race.slug)
  const classSlug = slug(classRef.slug)

  if (raceSlug && start.banned_races.includes(raceSlug)) {
    mismatches.push(`Раса «${raceSlug}» запрещена правилами старта`)
  }
  if (classSlug && start.banned_classes.includes(classSlug)) {
    mismatches.push(`Класс «${classSlug}» запрещён правилами старта`)
  }

  const classes = Array.isArray(sheet.classes) ? sheet.classes : []
  for (const row of classes) {
    if (!row || typeof row !== 'object') continue
    const c = row as Record<string, unknown>
    const s = slug(c.slug ?? c.id ?? c.class_slug)
    if (s && start.banned_classes.includes(s)) {
      mismatches.push(`Класс «${s}» запрещён правилами старта`)
    }
  }

  const sourceRows: { kind: string; label: string; source: unknown }[] = [
    { kind: 'race', label: raceSlug || 'раса', source: race.source },
    { kind: 'class', label: classSlug || 'класс', source: classRef.source },
  ]
  for (const row of classes) {
    if (!row || typeof row !== 'object') continue
    const c = row as Record<string, unknown>
    sourceRows.push({
      kind: 'class',
      label: slug(c.slug ?? c.id) || 'класс',
      source: c.source,
    })
    const sub = asRecord(c.subclass)
    if (sub.source) {
      sourceRows.push({
        kind: 'subclass',
        label: slug(sub.slug ?? sub.id) || 'подкласс',
        source: sub.source,
      })
    }
  }

  const bg = asRecord(pipeline.background)
  if (bg.source) {
    sourceRows.push({
      kind: 'background',
      label: slug(bg.slug) || 'происхождение',
      source: bg.source,
    })
  }

  for (const row of sourceRows) {
    if (!sourceMatchesAllowed(row.source, start.allowed_sources)) {
      mismatches.push(
        `${row.label} из книги ${String(row.source)} вне разрешённых`,
      )
    }
  }

  return [...new Set(mismatches)]
}
