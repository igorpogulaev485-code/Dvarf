/** Class/subclass feature unlock for the digital sheet (2014). */

import type { ClassLevelEntry } from './classLevels'
import roguePack from './data/rogue_2014.json'

export type FeatureKind = 'passive' | 'action' | 'bonus' | 'reaction' | 'resource'

export type FeatureScale = {
  labelRu: string
  by_level: Record<string, string>
}

export type FeatureResource = {
  /** Fallback / fixed max when uses_from is absent or 'fixed'. */
  uses: number
  /** Resolve max from character proficiency bonus (Phantom Wails / soul trinkets). */
  uses_from?: 'fixed' | 'proficiency_bonus'
  recharge: 'short_rest' | 'long_rest' | 'dawn' | 'manual'
  scale_uses?: Record<string, number>
  /** Stable pool key for sheet.resources sync (`feat:{slug}:{pool_id}:{entry}`). */
  pool_id?: string
  /** Display name on the resource tracker (defaults to feature name). */
  pool_name_ru?: string
  /** spend = expended uses; stock = current holdings (soul trinkets). */
  track?: 'spend' | 'stock'
  /** If spend pool is empty, burn one linked stock to use anyway. */
  linked_spend?: {
    pool_id: string
    label_ru: string
  }
  /** Death's Friend: after long rest, if stock empty → grant 1. */
  grant_stock_on_long_rest_if_empty?: boolean
}

export type ClassFeatureDef = {
  id: string
  level: number
  name_ru: string
  name_en?: string
  summary_ru: string
  body_ru?: string
  kind: FeatureKind
  scale?: FeatureScale
  resource?: FeatureResource
}

export type UnlockedFeature = ClassFeatureDef & {
  classEntryId: string
  className: string
  classLevel: number
  source: 'class' | 'subclass'
  subclassSlug: string | null
  subclassName: string | null
  /** Resolved scale text for current class level, if any. */
  scaleValue: string | null
  /** Resolved resource uses for current class level. */
  resourceUses: number | null
}

type FeaturePack = {
  class_slug: string
  features: ClassFeatureDef[]
  subclasses: Record<string, ClassFeatureDef[]>
}

const LOCAL_PACKS: Record<string, FeaturePack> = {
  rogue: roguePack as FeaturePack,
}

function asFeatureList(raw: unknown): ClassFeatureDef[] {
  if (!Array.isArray(raw)) return []
  const out: ClassFeatureDef[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string' || typeof row.name_ru !== 'string') continue
    const kind =
      row.kind === 'action' ||
      row.kind === 'bonus' ||
      row.kind === 'reaction' ||
      row.kind === 'resource' ||
      row.kind === 'passive'
        ? row.kind
        : 'passive'
    const scaleRaw =
      row.scale && typeof row.scale === 'object'
        ? (row.scale as Record<string, unknown>)
        : null
    const resourceRaw =
      row.resource && typeof row.resource === 'object'
        ? (row.resource as Record<string, unknown>)
        : null
    out.push({
      id: row.id,
      level: typeof row.level === 'number' ? Math.max(1, row.level) : 1,
      name_ru: row.name_ru,
      name_en: typeof row.name_en === 'string' ? row.name_en : undefined,
      summary_ru: typeof row.summary_ru === 'string' ? row.summary_ru : '',
      body_ru: typeof row.body_ru === 'string' ? row.body_ru : undefined,
      kind,
      scale:
        scaleRaw && scaleRaw.by_level && typeof scaleRaw.by_level === 'object'
          ? {
              labelRu:
                typeof scaleRaw.label_ru === 'string' ? scaleRaw.label_ru : 'Масштаб',
              by_level: Object.fromEntries(
                Object.entries(scaleRaw.by_level as Record<string, unknown>).filter(
                  (e): e is [string, string] => typeof e[1] === 'string',
                ),
              ),
            }
          : undefined,
      resource: parseFeatureResource(resourceRaw)
    })
  }
  return out
}

export function parseClassFeaturesFromCatalogData(
  data: Record<string, unknown> | null | undefined,
): ClassFeatureDef[] {
  return asFeatureList(data?.features)
}

export function localFeaturePack(classSlug: string | null | undefined): FeaturePack | null {
  if (!classSlug) return null
  return LOCAL_PACKS[classSlug] ?? null
}

function resolveScaleValue(scale: FeatureScale | undefined, classLevel: number): string | null {
  if (!scale) return null
  let best: string | null = null
  let bestLevel = 0
  for (const [lvlRaw, value] of Object.entries(scale.by_level)) {
    const lvl = Number(lvlRaw)
    if (!Number.isFinite(lvl) || lvl > classLevel) continue
    if (lvl >= bestLevel) {
      bestLevel = lvl
      best = value
    }
  }
  return best
}

function parseFeatureResource(resourceRaw: Record<string, unknown> | null): FeatureResource | undefined {
  if (!resourceRaw) return undefined
  const hasUses = typeof resourceRaw.uses === 'number'
  const usesFrom =
    resourceRaw.uses_from === 'proficiency_bonus'
      ? 'proficiency_bonus'
      : resourceRaw.uses_from === 'fixed'
        ? 'fixed'
        : undefined
  if (!hasUses && usesFrom !== 'proficiency_bonus') return undefined

  const linkedRaw =
    resourceRaw.linked_spend && typeof resourceRaw.linked_spend === 'object'
      ? (resourceRaw.linked_spend as Record<string, unknown>)
      : null

  return {
    uses: hasUses ? (resourceRaw.uses as number) : 0,
    uses_from: usesFrom,
    recharge:
      resourceRaw.recharge === 'short_rest' ||
      resourceRaw.recharge === 'long_rest' ||
      resourceRaw.recharge === 'dawn' ||
      resourceRaw.recharge === 'manual'
        ? resourceRaw.recharge
        : 'long_rest',
    scale_uses:
      resourceRaw.scale_uses && typeof resourceRaw.scale_uses === 'object'
        ? Object.fromEntries(
            Object.entries(resourceRaw.scale_uses as Record<string, unknown>).filter(
              (e): e is [string, number] => typeof e[1] === 'number',
            ),
          )
        : undefined,
    pool_id: typeof resourceRaw.pool_id === 'string' ? resourceRaw.pool_id : undefined,
    pool_name_ru:
      typeof resourceRaw.pool_name_ru === 'string' ? resourceRaw.pool_name_ru : undefined,
    track: resourceRaw.track === 'stock' ? 'stock' : resourceRaw.track === 'spend' ? 'spend' : undefined,
    linked_spend:
      linkedRaw && typeof linkedRaw.pool_id === 'string'
        ? {
            pool_id: linkedRaw.pool_id,
            label_ru:
              typeof linkedRaw.label_ru === 'string'
                ? linkedRaw.label_ru
                : 'сжечь частицу души',
          }
        : undefined,
    grant_stock_on_long_rest_if_empty: Boolean(
      resourceRaw.grant_stock_on_long_rest_if_empty,
    ),
  }
}

function resolveResourceUses(
  resource: FeatureResource | undefined,
  classLevel: number,
  proficiencyBonus?: number,
): number | null {
  if (!resource) return null
  if (resource.uses_from === 'proficiency_bonus') {
    return typeof proficiencyBonus === 'number'
      ? Math.max(0, Math.floor(proficiencyBonus))
      : null
  }
  let uses = resource.uses
  if (resource.scale_uses) {
    for (const [lvlRaw, value] of Object.entries(resource.scale_uses)) {
      const lvl = Number(lvlRaw)
      if (!Number.isFinite(lvl) || lvl > classLevel) continue
      if (value > uses) uses = value
    }
  }
  return uses
}

export function proficiencyBonusForTotalLevel(totalLevel: number): number {
  return 2 + Math.floor((Math.max(totalLevel, 1) - 1) / 4)
}

const CLASS_NAME_TO_SLUG: Record<string, string> = {
  rogue: 'rogue',
  плут: 'rogue',
}

export function resolveClassFeatureSlug(className: string): string | null {
  const key = className.trim().toLowerCase()
  if (!key) return null
  return CLASS_NAME_TO_SLUG[key] ?? null
}

const SUBCLASS_NAME_TO_SLUG: Record<string, string> = {
  thief: 'thief',
  вор: 'thief',
  assassin: 'assassin',
  убийца: 'assassin',
  arcane_trickster: 'arcane_trickster',
  'мистический ловкач': 'arcane_trickster',
  'arcane trickster': 'arcane_trickster',
  phantom: 'phantom',
  фантом: 'phantom',
}

export function resolveSubclassFeatureSlug(input: string): string | null {
  const key = input.trim().toLowerCase()
  if (!key) return null
  if (SUBCLASS_NAME_TO_SLUG[key]) return SUBCLASS_NAME_TO_SLUG[key]
  // already a slug
  if (
    key === 'thief' ||
    key === 'assassin' ||
    key === 'arcane_trickster' ||
    key === 'phantom'
  ) {
    return key
  }
  return null
}

export function unlockFeaturesForClasses(input: {
  classes: ClassLevelEntry[]
  /** Total character level — for proficiency-scaled resources. */
  characterLevel?: number
  /** classEntryId → subclass slug from grant/catalog */
  subclassSlugByEntryId?: Record<string, string | null | undefined>
  classFeaturesByEntryId?: Record<string, ClassFeatureDef[]>
  subclassFeaturesByEntryId?: Record<string, ClassFeatureDef[]>
}): UnlockedFeature[] {
  const unlocked: UnlockedFeature[] = []
  const totalLevel =
    input.characterLevel ??
    input.classes.reduce((sum, row) => sum + Math.max(0, Math.floor(row.level)), 0)
  const pb = proficiencyBonusForTotalLevel(totalLevel)

  for (const row of input.classes) {
    if (!row.name.trim() || row.level <= 0) continue
    const classLevel = Math.min(20, Math.max(1, Math.floor(row.level)))
    const classSlug = resolveClassFeatureSlug(row.name)
    const pack = localFeaturePack(classSlug)

    const classFeatures =
      input.classFeaturesByEntryId?.[row.id] ?? pack?.features ?? []

    for (const feature of classFeatures) {
      if (feature.level > classLevel) continue
      unlocked.push({
        ...feature,
        classEntryId: row.id,
        className: row.name.trim(),
        classLevel,
        source: 'class',
        subclassSlug: null,
        subclassName: null,
        scaleValue: resolveScaleValue(feature.scale, classLevel),
        resourceUses: resolveResourceUses(feature.resource, classLevel, pb),
      })
    }

    const hasSubclass = Boolean(row.subclass_name.trim() || row.subclass_catalog_id)
    if (!hasSubclass) continue

    const subclassSlug =
      input.subclassSlugByEntryId?.[row.id] ||
      resolveSubclassFeatureSlug(row.subclass_name) ||
      null

    const subclassFeatures =
      input.subclassFeaturesByEntryId?.[row.id] ??
      (subclassSlug && pack ? pack.subclasses[subclassSlug] ?? [] : [])

    for (const feature of subclassFeatures) {
      if (feature.level > classLevel) continue
      unlocked.push({
        ...feature,
        classEntryId: row.id,
        className: row.name.trim(),
        classLevel,
        source: 'subclass',
        subclassSlug,
        subclassName: row.subclass_name.trim() || null,
        scaleValue: resolveScaleValue(feature.scale, classLevel),
        resourceUses: resolveResourceUses(feature.resource, classLevel, pb),
      })
    }
  }

  unlocked.sort((a, b) => {
    if (a.classEntryId !== b.classEntryId) {
      return a.className.localeCompare(b.className, 'ru')
    }
    if (a.level !== b.level) return a.level - b.level
    if (a.source !== b.source) return a.source === 'class' ? -1 : 1
    return a.name_ru.localeCompare(b.name_ru, 'ru')
  })

  return unlocked
}

export function kindLabelRu(kind: FeatureKind): string {
  if (kind === 'action') return 'Действие'
  if (kind === 'bonus') return 'Бонусное'
  if (kind === 'reaction') return 'Реакция'
  if (kind === 'resource') return 'Ресурс'
  return 'Пассив'
}
