/**
 * XGE Blessing of the Forge: touch one nonmagical weapon or armor.
 * Weapon: +1 attack and damage. Armor: +1 AC. Until the next long rest.
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

function effectsOf(item: InventoryItem): GearEffect[] {
  return item.effects ?? []
}

export function itemHasForgeBlessing(item: InventoryItem): boolean {
  return effectsOf(item).some(
    (effect) => effect.type === 'custom_note' && effect.text === FORGE_BLESSING_MARK,
  )
}

function looksMagical(item: InventoryItem): boolean {
  if (item.requires_attunement) return true
  if (/\+\s*[1-3]/.test(item.name)) return true
  return effectsOf(item).some(
    (effect) =>
      effect.type === 'attack_bonus' ||
      effect.type === 'damage_bonus' ||
      effect.type === 'ac_bonus',
  )
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
