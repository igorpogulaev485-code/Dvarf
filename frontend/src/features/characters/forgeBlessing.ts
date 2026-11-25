/**
 * XGE Blessing of the Forge: touch one nonmagical weapon or armor.
 * Weapon: +1 attack and damage. Armor: +1 AC.
 * Without a pin: until the next long rest (strip when pool.used === 0).
 * With a pin: bonus stays; pool stays spent; change only in Abilities.
 */

import type { GearEffect } from '../../shared/dnd/gearCatalog'
import type { InventoryItem } from './inventory'

export const FORGE_BLESSING_MARK = 'blessing_of_the_forge'

const WEAPON_NAME_RE =
  /булав|меч|топор|копь|лук|арбалет|молот|кинжал|посох|дубин|коса|пика|секир|рапир|цеп|кистен|пращ|дротик|алебард|глеф|морген|кнут|серп|копье|копьё/i

export type ForgeBlessingKind = 'weapon' | 'armor'

export type ForgeBlessingCandidate = {
  id: string
  name: string
  kind: ForgeBlessingKind
}

export type ForgeBlessingPinState =
  | { status: 'idle' }
  | { status: 'ready'; itemId: string; name: string; kind: ForgeBlessingKind }
  | { status: 'active'; itemId: string; name: string }
  | { status: 'missing'; itemId: string }

function effectsOf(item: InventoryItem): GearEffect[] {
  return item.effects ?? []
}

export function itemHasForgeBlessing(item: InventoryItem): boolean {
  return effectsOf(item).some(
    (effect) => effect.type === 'custom_note' && effect.text === FORGE_BLESSING_MARK,
  )
}

const MAGIC_NAME_RE =
  /\+\s*[1-3]|адамантин|мифрил|мифрилл|mithral|mithril|adamantine/i
const MAGIC_SLUG_RE =
  /adamantine|mithral|mithril|_plus_|armor_bonus|weapon_bonus|shield_bonus|sunforger/i

/** Nonmagical only may receive Blessing of the Forge (XGtE). */
export function looksMagical(item: InventoryItem): boolean {
  if (item.requires_attunement) return true
  if (item.adamantine) return true
  if (item.setting_artifact_id) return true
  if (typeof item.magic_bonus === 'number' && item.magic_bonus !== 0) return true
  if (MAGIC_NAME_RE.test(item.name)) return true
  if (item.catalog_slug && MAGIC_SLUG_RE.test(item.catalog_slug)) return true
  if (item.family_slug && MAGIC_SLUG_RE.test(item.family_slug)) return true
  return effectsOf(item).some((effect) => {
    if (
      effect.type === 'attack_bonus' ||
      effect.type === 'damage_bonus' ||
      effect.type === 'ac_bonus'
    ) {
      return true
    }
    return effect.type === 'sheet_flag' && effect.flag === 'critical_hit_immunity'
  })
}

export function forgeBlessingKind(item: InventoryItem): ForgeBlessingKind | null {
  if (itemHasForgeBlessing(item) || looksMagical(item)) return null
  if (item.armor_kind === 'light' || item.armor_kind === 'medium' || item.armor_kind === 'heavy') {
    return 'armor'
  }
  if (item.weapon_grip || WEAPON_NAME_RE.test(item.name)) return 'weapon'
  return null
}

export function listForgeBlessingCandidates(items: InventoryItem[]): ForgeBlessingCandidate[] {
  const out: ForgeBlessingCandidate[] = []
  for (const item of items) {
    if (item.qty <= 0) continue
    const kind = forgeBlessingKind(item)
    if (!kind) continue
    out.push({ id: item.id, name: item.name.trim() || 'Предмет', kind })
  }
  return out
}

/**
 * Pin lifecycle for hot-bar / rest sync.
 * - idle: no pin
 * - ready: pin points at a still-blessable item (mark not on it yet)
 * - active: pin points at the item that currently carries the mark
 * - missing: pin id gone, qty 0, or item no longer blessable without our mark
 */
export function resolveForgeBlessingPinState(
  items: InventoryItem[],
  pinnedItemId: string | null | undefined,
): ForgeBlessingPinState {
  const pin = typeof pinnedItemId === 'string' ? pinnedItemId.trim() : ''
  if (!pin) return { status: 'idle' }
  const item = items.find((row) => row.id === pin)
  if (!item || item.qty <= 0) return { status: 'missing', itemId: pin }
  if (itemHasForgeBlessing(item)) {
    return { status: 'active', itemId: pin, name: item.name.trim() || 'Предмет' }
  }
  const kind = forgeBlessingKind(item)
  if (!kind) return { status: 'missing', itemId: pin }
  return {
    status: 'ready',
    itemId: pin,
    name: item.name.trim() || 'Предмет',
    kind,
  }
}

/** Prefer pinned id when it is still a valid candidate; else null (caller opens picker). */
export function resolveForgeBlessingPinnedTarget(
  items: InventoryItem[],
  pinnedItemId: string | null | undefined,
): string | null {
  const state = resolveForgeBlessingPinState(items, pinnedItemId)
  return state.status === 'ready' ? state.itemId : null
}

export function applyForgeBlessing(
  items: InventoryItem[],
  itemId: string,
): { ok: true; items: InventoryItem[]; message: string } | { ok: false; reason: string } {
  const item = items.find((row) => row.id === itemId)
  if (!item) return { ok: false, reason: 'Предмет не найден' }
  const kind = forgeBlessingKind(item)
  if (!kind) return { ok: false, reason: 'Нужен немагический доспех или оружие' }
  const bonus: GearEffect[] =
    kind === 'armor'
      ? [
          { type: 'ac_bonus', value: 1 },
          { type: 'custom_note', text: FORGE_BLESSING_MARK },
        ]
      : [
          { type: 'attack_bonus', value: 1 },
          { type: 'damage_bonus', value: 1 },
          { type: 'custom_note', text: FORGE_BLESSING_MARK },
        ]
  const next = items.map((row) =>
    row.id === itemId ? { ...row, effects: [...effectsOf(row), ...bonus] } : row,
  )
  const what = kind === 'armor' ? '+1 КД' : '+1 к атаке и урону'
  return {
    ok: true,
    items: next,
    message: `Благословение кузницы: «${item.name || 'предмет'}» ${what} до следующего продолжительного отдыха`,
  }
}

/** Strip any current forge mark, then bless `itemId` (Abilities retarget). */
export function reassignForgeBlessing(
  items: InventoryItem[],
  itemId: string,
): { ok: true; items: InventoryItem[]; message: string } | { ok: false; reason: string } {
  const stripped = stripForgeBlessing(items)
  return applyForgeBlessing(stripped.items, itemId)
}

export function stripForgeBlessing(items: InventoryItem[]): {
  items: InventoryItem[]
  changed: boolean
} {
  let changed = false
  const next = items.map((item) => {
    if (!itemHasForgeBlessing(item)) return item
    let removedAttack = false
    let removedDamage = false
    let removedAc = false
    const effects = effectsOf(item).filter((effect) => {
      if (effect.type === 'custom_note' && effect.text === FORGE_BLESSING_MARK) return false
      if (!removedAttack && effect.type === 'attack_bonus' && effect.value === 1) {
        removedAttack = true
        return false
      }
      if (!removedDamage && effect.type === 'damage_bonus' && effect.value === 1) {
        removedDamage = true
        return false
      }
      if (!removedAc && effect.type === 'ac_bonus' && effect.value === 1) {
        removedAc = true
        return false
      }
      return true
    })
    changed = true
    return { ...item, effects }
  })
  return { items: changed ? next : items, changed }
}

/** When pin is active, keep the forge pool spent after long rest. */
export function withForgeBlessingPoolSpentIfPinned<
  T extends { id: string; used: number; max: number; activeLabel?: string },
>(
  resources: T[],
  pinState: ForgeBlessingPinState,
  activeLabel?: string,
): { resources: T[]; changed: boolean } {
  if (pinState.status !== 'active') return { resources, changed: false }
  let changed = false
  const next = resources.map((row) => {
    if (!row.id.includes(':blessing_of_the_forge:')) return row
    if (row.used >= row.max && (!activeLabel || row.activeLabel === activeLabel)) return row
    changed = true
    return {
      ...row,
      used: row.max,
      ...(activeLabel ? { activeLabel } : {}),
    }
  })
  return { resources: changed ? next : resources, changed }
}

/**
 * Spent forge charge but no inventory mark (Virra: used=1, «закреплено», no ac_bonus).
 * Free the charge so the player can bless a real nonmagical item.
 */
export function healForgeBlessingPoolDesync<
  T extends { id: string; used: number; max: number; activeLabel?: string | null },
>(resources: T[], items: InventoryItem[]): { resources: T[]; changed: boolean } {
  const anyMarked = items.some(itemHasForgeBlessing)
  if (anyMarked) return { resources, changed: false }
  let changed = false
  const next = resources.map((row) => {
    if (!row.id.includes(':blessing_of_the_forge:')) return row
    if (row.used <= 0 && !row.activeLabel) return row
    changed = true
    return { ...row, used: 0, activeLabel: undefined }
  })
  return { resources: changed ? next : resources, changed }
}
