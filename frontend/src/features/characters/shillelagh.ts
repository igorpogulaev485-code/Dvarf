/**
 * PHB Shillelagh: one club or quarterstaff you are holding uses your
 * spellcasting ability for melee attack and damage, and its die becomes a d8.
 */

import type { AbilityKey } from './sheetTypes'

export type ShillelaghState = {
  attackId: string
  ability: AbilityKey
}

const CLUB_RE = /дубинк|посох|club|quarterstaff|shillelagh/i

export function isShillelaghSpell(spell: {
  name?: string | null
  catalog_id?: string | null
}): boolean {
  const name = (spell.name ?? '').trim()
  const catalog = (spell.catalog_id ?? '').trim().toLowerCase()
  return /дубинк|shillelagh/i.test(name) || catalog.includes('shillelagh')
}

export function isShillelaghWeaponName(name: string): boolean {
  return CLUB_RE.test(name.trim()) && !/shillelagh/i.test(name)
}

export function shillelaghDamage(current: string): string {
  const raw = current.trim()
  if (!raw) return '1к8'
  if (/\d+\s*к\s*\d+/i.test(raw)) return raw.replace(/\d+\s*к\s*\d+/i, '1к8')
  if (/\d+\s*d\s*\d+/i.test(raw)) return raw.replace(/\d+\s*d\s*\d+/i, '1d8')
  return '1к8'
}

/** Prefer a held club/staff; otherwise the first matching attack. */
export function pickShillelaghAttack<T extends { id: string; name: string; held?: boolean }>(
  weapons: T[],
): T | null {
  const matches = weapons.filter((row) => isShillelaghWeaponName(row.name))
  if (!matches.length) return null
  return matches.find((row) => row.held) ?? matches[0]!
}

export function readShillelagh(raw: unknown): ShillelaghState | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const attackId = typeof row.attackId === 'string' ? row.attackId.trim() : ''
  const ability = row.ability
  if (!attackId) return null
  if (
    ability !== 'str' &&
    ability !== 'dex' &&
    ability !== 'con' &&
    ability !== 'int' &&
    ability !== 'wis' &&
    ability !== 'cha'
  ) {
    return null
  }
  return { attackId, ability }
}
