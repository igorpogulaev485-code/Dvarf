/**
 * Shared helpers for casting from an item pool or a spell scroll.
 * The dialog and the spend stay on the existing cast path.
 */
import { listCatalogEntries } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import type { SheetResource } from '../../shared/dnd/rest'
import type { ScrollSpellBinding } from './spellScroll'
import { sheetSpellFromCatalog, type ItemSpellCast, type SheetSpell } from './spells'

export function mergeCatalogCastFields(spell: SheetSpell, full: SheetSpell): SheetSpell {
  return {
    ...spell,
    catalog_id: spell.catalog_id ?? full.catalog_id,
    casting_time: full.casting_time || spell.casting_time,
    range: full.range || spell.range,
    attack_or_save: full.attack_or_save || spell.attack_or_save,
    damage: full.damage || spell.damage,
    concentration: full.concentration || spell.concentration,
    ...(full.duration ? { duration: full.duration } : {}),
    ...(full.ritual ? { ritual: true } : {}),
    ...(full.school ? { school: full.school } : {}),
    ...(full.components ? { components: full.components } : {}),
    ...(full.damage_at_character_level
      ? { damage_at_character_level: full.damage_at_character_level }
      : {}),
    ...(full.damage_at_slot_level ? { damage_at_slot_level: full.damage_at_slot_level } : {}),
    ...(full.higher_levels ? { higher_levels: full.higher_levels } : {}),
    ...(full.description ? { description: full.description } : {}),
  }
}

async function catalogSpellBySlug(
  slug: string,
  edition: RulesEdition,
): Promise<SheetSpell | null> {
  const rows = await listCatalogEntries({ kind: 'spell', edition, q: slug })
  const hit = rows.find((row) => row.slug === slug) ?? null
  if (!hit) return null
  return sheetSpellFromCatalog({
    id: hit.id,
    name_ru: hit.name_ru,
    slug: hit.slug,
    data: hit.data,
  })
}

/** Fill damage and components from the spell catalog. Level and item_cast stay. */
export async function spellReadyToCast(
  spell: SheetSpell,
  edition: RulesEdition,
): Promise<SheetSpell> {
  const slug = spell.item_cast?.slug
  if (!slug || spell.damage_at_slot_level || spell.damage) return spell
  try {
    const full = await catalogSpellBySlug(slug, edition)
    if (!full) return spell
    return mergeCatalogCastFields(spell, full)
  } catch {
    return spell
  }
}

export async function sheetSpellForScroll(
  binding: ScrollSpellBinding,
  edition: RulesEdition,
): Promise<SheetSpell | null> {
  const slug = binding.slug?.trim()
  try {
    if (slug) {
      const full = await catalogSpellBySlug(slug, edition)
      if (full) {
        return {
          ...full,
          id: `scroll-cast:${binding.catalog_id ?? slug}`,
          name: binding.name || full.name,
          level: full.level,
          prepared: true,
          concentration: Boolean(binding.concentration || full.concentration),
        }
      }
    }
  } catch {
    return fallbackScrollSpell(binding)
  }
  return fallbackScrollSpell(binding)
}

function fallbackScrollSpell(binding: ScrollSpellBinding): SheetSpell {
  return {
    id: `scroll-cast:${binding.catalog_id ?? binding.name}`,
    name: binding.name,
    catalog_id: binding.catalog_id,
    level: binding.level,
    prepared: true,
    notes: '',
    casting_time: '',
    range: '',
    attack_or_save: '',
    damage: '',
    concentration: Boolean(binding.concentration),
    ...(binding.ritual ? { ritual: true } : {}),
    ...(binding.school ? { school: binding.school } : {}),
  }
}

export function spendItemCharges(
  resources: SheetResource[],
  cast: Pick<ItemSpellCast, 'resourceId' | 'charges'>,
  cost: number,
): { ok: true; resources: SheetResource[]; hint: string } | { ok: false; message: string } {
  if (!cast.resourceId || cost <= 0) return { ok: true, resources, hint: '' }
  const pool = resources.find((row) => row.id === cast.resourceId)
  if (!pool) return { ok: false, message: 'Нет пула зарядов предмета' }
  const left = Math.max(0, pool.max - pool.used)
  if (left < cost) return { ok: false, message: 'Не хватает зарядов предмета' }
  const used = pool.used + cost
  const hint = used >= pool.max && pool.depleteHint ? pool.depleteHint : ''
  return {
    ok: true,
    hint,
    resources: resources.map((row) => (row.id === pool.id ? { ...row, used } : row)),
  }
}

export function itemCastSlotLevel(cast: ItemSpellCast, picked: number): number {
  if (!cast.chargePerLevel) return cast.castLevel
  const min = Math.max(1, cast.charges)
  const extra = Math.max(0, picked - min)
  const level = cast.castLevel + extra
  const cap = cast.maxLevel ?? 9
  return Math.max(cast.castLevel, Math.min(cap, level))
}
