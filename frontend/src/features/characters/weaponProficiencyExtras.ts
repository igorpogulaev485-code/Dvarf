/** Named weapon proficiency extras (not covered by simple/martial chips). */

import { findWeaponPreset } from '../../shared/dnd/weaponPresets'

/** Catalog / seed tokens → RU sheet labels. */
const TOKEN_TO_RU: Record<string, string> = {
  hand_crossbow: 'Ручной арбалет',
  handcrossbow: 'Ручной арбалет',
  longsword: 'Длинный меч',
  shortsword: 'Короткий меч',
  rapier: 'Рапира',
  scimitar: 'Ятаган',
  dagger: 'Кинжал',
  shortbow: 'Короткий лук',
  longbow: 'Длинный лук',
  light_crossbow: 'Лёгкий арбалет',
  lightcrossbow: 'Лёгкий арбалет',
  quarterstaff: 'Боевой посох',
  spear: 'Копьё',
  javelin: 'Метательное копьё',
  mace: 'Булава',
  warhammer: 'Боевой молот',
  handaxe: 'Ручной топор',
  greataxe: 'Секира',
  club: 'Дубинка',
  dart: 'Дротик',
  trident: 'Трезубец',
  net: 'Сеть',
  battleaxe: 'Боевой топор',
  light_hammer: 'Лёгкий молот',
  lighthammer: 'Лёгкий молот',
}

export const WEAPON_EXTRA_PRESETS = [
  'Рапира',
  'Длинный меч',
  'Короткий меч',
  'Ятаган',
  'Кинжал',
  'Ручной арбалет',
  'Лёгкий арбалет',
  'Короткий лук',
  'Длинный лук',
  'Боевой топор',
  'Ручной топор',
  'Боевой молот',
  'Лёгкий молот',
  'Булава',
  'Боевой посох',
  'Дубинка',
  'Копьё',
  'Метательное копьё',
  'Трезубец',
  'Сеть',
  'Секира',
  'Дротик',
] as const

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

/** Resolve catalog token or free RU name to a canonical sheet label. */
export function resolveWeaponExtraName(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (!trimmed) return null
  const token = normalizeToken(trimmed)
  if (TOKEN_TO_RU[token]) return TOKEN_TO_RU[token]
  const preset = findWeaponPreset(trimmed)
  if (preset) return preset.labelRu
  // Already RU / custom
  return trimmed
}

export function resolveWeaponExtraList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const name = resolveWeaponExtraName(item)
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}
