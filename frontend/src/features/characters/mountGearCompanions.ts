/**
 * C-03: inventory mounts (item_category mount) → living companion cards.
 * Present while the item is in inventory (qty > 0); removing item drops the card.
 */

import { createCompanion, type CompanionEntry } from './companions'
import type { InventoryItem } from './inventory'
import { isGearCompanionId } from './gearGrantsSync'

/** Gear item slug → MM bestiary slug (pack C03-4). */
export const MOUNT_ITEM_TO_BESTIARY: Record<
  string,
  { bestiarySlug: string; nameRu: string; ac: number; hp: number; speed: number; dex: number; str: number; con: number; int: number }
> = {
  horse_riding: {
    bestiarySlug: 'riding_horse',
    nameRu: 'Ездовая лошадь',
    ac: 10,
    hp: 13,
    speed: 60,
    str: 16,
    dex: 10,
    con: 12,
    int: 2,
  },
  riding_horse: {
    bestiarySlug: 'riding_horse',
    nameRu: 'Ездовая лошадь',
    ac: 10,
    hp: 13,
    speed: 60,
    str: 16,
    dex: 10,
    con: 12,
    int: 2,
  },
  warhorse: {
    bestiarySlug: 'warhorse',
    nameRu: 'Боевой конь',
    ac: 11,
    hp: 19,
    speed: 60,
    str: 18,
    dex: 12,
    con: 13,
    int: 2,
  },
  pony: {
    bestiarySlug: 'pony',
    nameRu: 'Пони',
    ac: 10,
    hp: 11,
    speed: 40,
    str: 15,
    dex: 10,
    con: 13,
    int: 2,
  },
  camel: {
    bestiarySlug: 'camel',
    nameRu: 'Верблюд',
    ac: 9,
    hp: 15,
    speed: 50,
    str: 16,
    dex: 8,
    con: 14,
    int: 2,
  },
  horse_draft: {
    bestiarySlug: 'draft_horse',
    nameRu: 'Упряжная лошадь',
    ac: 10,
    hp: 19,
    speed: 40,
    str: 18,
    dex: 10,
    con: 12,
    int: 2,
  },
  draft_horse: {
    bestiarySlug: 'draft_horse',
    nameRu: 'Упряжная лошадь',
    ac: 10,
    hp: 19,
    speed: 40,
    str: 18,
    dex: 10,
    con: 12,
    int: 2,
  },
  mastiff: {
    bestiarySlug: 'mastiff',
    nameRu: 'Мастиф',
    ac: 12,
    hp: 5,
    speed: 40,
    str: 13,
    dex: 14,
    con: 12,
    int: 3,
  },
}

const MOUNT_PREFIX = 'gear-companion:mount:'

export function isMountGearCompanionId(id: string): boolean {
  return id.startsWith(MOUNT_PREFIX)
}

export function mountCompanionId(itemId: string): string {
  return `${MOUNT_PREFIX}${itemId}`
}

export function resolveMountSpec(item: InventoryItem) {
  const slug = (item.catalog_slug ?? '').trim().toLowerCase()
  if (slug && MOUNT_ITEM_TO_BESTIARY[slug]) return { slug, ...MOUNT_ITEM_TO_BESTIARY[slug] }
  // Fallback by RU name.
  const name = item.name.trim().toLowerCase()
  if (name.includes('ездовая')) return { slug: 'horse_riding', ...MOUNT_ITEM_TO_BESTIARY.horse_riding }
  if (name.includes('боевой кон')) return { slug: 'warhorse', ...MOUNT_ITEM_TO_BESTIARY.warhorse }
  if (name.includes('пони')) return { slug: 'pony', ...MOUNT_ITEM_TO_BESTIARY.pony }
  if (name.includes('верблюд')) return { slug: 'camel', ...MOUNT_ITEM_TO_BESTIARY.camel }
  if (name.includes('упряжн')) return { slug: 'horse_draft', ...MOUNT_ITEM_TO_BESTIARY.horse_draft }
  if (name.includes('мастиф')) return { slug: 'mastiff', ...MOUNT_ITEM_TO_BESTIARY.mastiff }
  return null
}

/**
 * Sync living mount cards from inventory mounts.
 * Does not touch Find Steed spirit or manual/story companions.
 */
export function syncMountCompanions(
  companions: CompanionEntry[],
  items: InventoryItem[],
): CompanionEntry[] {
  const previous = new Map(
    companions
      .filter((row) => isMountGearCompanionId(row.id))
      .map((row) => [row.id, row]),
  )
  const withoutMounts = companions.filter((row) => !isMountGearCompanionId(row.id))
  const nextMounts: CompanionEntry[] = []

  for (const item of items) {
    if (item.parent_id) continue
    if ((item.qty ?? 0) <= 0) continue
    const spec = resolveMountSpec(item)
    if (!spec) continue
    const id = mountCompanionId(item.id)
    const prev = previous.get(id)
    const created = createCompanion({
      id,
      kind: 'other',
      name: prev?.name?.trim() ? prev.name : spec.nameRu,
      nature: 'living',
      active: prev?.active ?? true,
      story: false,
      initiativeMode: 'with_master',
      commandCost: 'none',
      mounted: prev?.mounted ?? false,
      source: {
        kind: 'item',
        labelRu: `Снаряжение: ${item.name || spec.nameRu}`,
        feature: `mount:${spec.slug}`,
      },
      bestiary_ref: prev?.bestiary_ref ?? spec.bestiarySlug,
      bestiary_name_ru: prev?.bestiary_name_ru ?? spec.nameRu,
      stats: {
        hp: prev?.stats.hp ?? spec.hp,
        hp_max: prev?.stats.hp_max ?? spec.hp,
        ac: prev?.stats.ac ?? spec.ac,
        speed: prev?.stats.speed ?? spec.speed,
        str: prev?.stats.str ?? spec.str,
        dex: prev?.stats.dex ?? spec.dex,
        con: prev?.stats.con ?? spec.con,
        int: prev?.stats.int ?? spec.int,
      },
      death: prev?.death ?? null,
      actions:
        prev?.actions?.trim() ||
        'Живой скакун из снаряжения. При 0 хитов — спасброски от смерти.',
      notes:
        prev?.notes?.trim() ||
        `Купленный скакун · бестиарий ${spec.bestiarySlug} · ход хозяина`,
    })
    nextMounts.push(created)
  }

  // Preserve non-mount gear companions (artifacts etc.) that syncGearCompanions owns.
  const otherGear = withoutMounts.filter(
    (row) => isGearCompanionId(row.id) && !isMountGearCompanionId(row.id),
  )
  const nonGear = withoutMounts.filter((row) => !isGearCompanionId(row.id))
  return [...nonGear, ...otherGear, ...nextMounts]
}
