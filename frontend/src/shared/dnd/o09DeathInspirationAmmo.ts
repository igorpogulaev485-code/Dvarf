/**
 * O-09: death saves, Inspiration (PHB 2014), ammunition auto-spend.
 * Names: 5e14 / PHB 2014.
 */

import { clampDeathMarks } from './hitDice'

export type DeskRollModeLike = 'normal' | 'advantage' | 'disadvantage'

/** Local copy of PHB ammo / thrown launcher slugs — avoid features→shared cycle. */
const PHB_AMMO_SLUGS = [
  'arrow',
  'crossbow_bolt',
  'blowgun_needle',
  'sling_bullet',
] as const

const THROWN_WEAPON_SLUGS = new Set([
  'dagger',
  'handaxe',
  'javelin',
  'light_hammer',
  'spear',
  'dart',
  'trident',
  'net',
])

export type DeathSaveResult = {
  die: number
  /** Successes after applying this roll. */
  successes: number
  /** Failures after applying this roll. */
  fails: number
  /** Nat 20 → stand with 1 HP. */
  revived: boolean
  /** Three successes → stable at 0 HP. */
  stabilized: boolean
  /** Three failures → dead (mark only). */
  dead: boolean
  note: string
}

export type DamageAtZeroResult = {
  deathFails: number
  failDelta: number
  instantDeath: boolean
  note: string
}

export type StabilizePatch = {
  isDying: false
  deathSuccesses: 0
  deathFails: 0
}

export const DEATH_SAVE_HINT =
  'Спас от смерти: к20 без модификаторов · 10+ успех · 1 — два провала · 20 — 1 хит'

export const STABILIZE_MEDICINE_HINT =
  'Стабилизировать: действие · Медицина Сл 10 · успех — цель стабильна при 0 хитах'

export const INSPIRATION_SPEND_HINT =
  'Потратить вдохновение: преимущество на один бросок атаки, проверки или спаса (не спас от смерти)'

export const AMMO_BIND_HINT =
  'Боеприпас: стопка по умолчанию у оружия · выстрел тратит 1 шт. даже при промахе'

/** Cleared dying track (stable at 0 HP, or after heal / revive). */
export function stabilizePlayPatch(): StabilizePatch {
  return { isDying: false, deathSuccesses: 0, deathFails: 0 }
}

/**
 * PHB death save from a natural d20 face (no ability mod).
 * 20 → revive; 1 → two failures; 10–19 → one success; 2–9 → one failure.
 */
export function resolveDeathSaveRoll(
  die: number,
  successes: number,
  fails: number,
): DeathSaveResult {
  const face = Math.max(1, Math.min(20, Math.floor(die)))
  let nextOk = clampDeathMarks(successes)
  let nextBad = clampDeathMarks(fails)

  if (face === 20) {
    return {
      die: face,
      successes: 0,
      fails: 0,
      revived: true,
      stabilized: false,
      dead: false,
      note: 'Спас от смерти · 20 · 1 хит, не умирает',
    }
  }

  if (face === 1) {
    nextBad = clampDeathMarks(nextBad + 2)
    const dead = nextBad >= 3
    return {
      die: face,
      successes: nextOk,
      fails: nextBad,
      revived: false,
      stabilized: false,
      dead,
      note: dead
        ? 'Спас от смерти · 1 · два провала · смерть'
        : `Спас от смерти · 1 · два провала (${nextBad}/3)`,
    }
  }

  if (face >= 10) {
    nextOk = clampDeathMarks(nextOk + 1)
    const stabilized = nextOk >= 3
    return {
      die: face,
      successes: stabilized ? 0 : nextOk,
      fails: stabilized ? 0 : nextBad,
      revived: false,
      stabilized,
      dead: false,
      note: stabilized
        ? `Спас от смерти · ${face} · стабилизирован`
        : `Спас от смерти · ${face} · успех (${nextOk}/3)`,
    }
  }

  nextBad = clampDeathMarks(nextBad + 1)
  const dead = nextBad >= 3
  return {
    die: face,
    successes: nextOk,
    fails: nextBad,
    revived: false,
    stabilized: false,
    dead,
    note: dead
      ? `Спас от смерти · ${face} · провал · смерть`
      : `Спас от смерти · ${face} · провал (${nextBad}/3)`,
  }
}

/**
 * Damage while already at 0 HP: +1 fail (+2 if critical).
 * Residual ≥ max HP → instant death (PHB massive damage while dying).
 */
export function applyDamageAtZeroHp(opts: {
  damageToHp: number
  hpMax: number | null | undefined
  isCritical?: boolean
  deathFails: number
}): DamageAtZeroResult {
  const dmg = Math.max(0, Math.floor(opts.damageToHp))
  if (dmg <= 0) {
    return {
      deathFails: clampDeathMarks(opts.deathFails),
      failDelta: 0,
      instantDeath: false,
      note: '',
    }
  }
  const max = opts.hpMax == null ? null : Math.max(0, Math.floor(opts.hpMax))
  if (max != null && max > 0 && dmg >= max) {
    return {
      deathFails: 3,
      failDelta: Math.max(0, 3 - clampDeathMarks(opts.deathFails)),
      instantDeath: true,
      note: 'Урон при 0 хитах ≥ максимума · мгновенная смерть',
    }
  }
  const delta = opts.isCritical ? 2 : 1
  const next = clampDeathMarks(opts.deathFails + delta)
  return {
    deathFails: next,
    failDelta: delta,
    instantDeath: next >= 3,
    note:
      next >= 3
        ? opts.isCritical
          ? 'Крит при 0 хитах · два провала · смерть'
          : 'Урон при 0 хитах · провал · смерть'
        : opts.isCritical
          ? `Крит при 0 хитах · два провала (${next}/3)`
          : `Урон при 0 хитах · провал (${next}/3)`,
  }
}

/** Medicine DC 10 stabilize check. */
export function medicineStabilizes(total: number, dc = 10): boolean {
  return Math.floor(total) >= dc
}

/**
 * Inspiration spend: only when it actually grants advantage.
 * Death saves must not use this (caller responsibility).
 */
export function canSpendInspirationForAdvantage(
  hasInspiration: boolean,
  currentMode: DeskRollModeLike,
): { ok: boolean; reason?: string } {
  if (!hasInspiration) return { ok: false, reason: 'Нет вдохновения' }
  if (currentMode === 'advantage') {
    return { ok: false, reason: 'Уже есть преимущество' }
  }
  return { ok: true }
}

export function mergeInspirationAdvantage(
  mode: DeskRollModeLike,
): DeskRollModeLike {
  if (mode === 'disadvantage') return 'normal'
  return 'advantage'
}

// —— Ammunition ——

export type AmmoKind = 'arrow' | 'crossbow_bolt' | 'blowgun_needle' | 'sling_bullet'

const AMMO_KIND_BY_SLUG = new Map<string, AmmoKind>(
  PHB_AMMO_SLUGS.map((slug) => [slug, slug as AmmoKind]),
)

const LAUNCHER_AMMO: Record<string, AmmoKind> = {
  shortbow: 'arrow',
  longbow: 'arrow',
  crossbow_light: 'crossbow_bolt',
  crossbow_hand: 'crossbow_bolt',
  crossbow_heavy: 'crossbow_bolt',
  blowgun: 'blowgun_needle',
  sling: 'sling_bullet',
}

const AMMO_NAME_RE: Array<{ kind: AmmoKind; re: RegExp }> = [
  { kind: 'arrow', re: /стрел|arrow/i },
  { kind: 'crossbow_bolt', re: /болт|bolt/i },
  { kind: 'blowgun_needle', re: /игл.*дух|blowgun.*needle|needle/i },
  { kind: 'sling_bullet', re: /снаряд.*пращ|sling.*(bullet|stone)|bullet/i },
]

const THROWN_STACK_RE =
  /дротик|метательн|метательн(ый|ая|ое)|javelin|dart|handaxe|ручн(ой|ая)\s+топор|лёгкий\s+молот|light\s+hammer|trident|трезубец|копь[ёе]|spear|dagger|кинжал|сеть|\bnet\b/i

const AMMO_WEAPON_RE =
  /лук|арбалет|пращ|духов|bow|crossbow|sling|blowgun/i

const SWORD_NO_AMMO_RE =
  /меч|рапир|скимитар|секир|топор(?!\s*\+|.*мет)|молот(?!.*мет)|булав|дубин|глеф|алебард|пик[аи]|кнут|цепа?\b|sword|axe|mace|club|glaive|halberd|pike|whip|flail|maul|warhammer/i

export function ammoKindFromSlug(slug: string | null | undefined): AmmoKind | null {
  if (!slug) return null
  return AMMO_KIND_BY_SLUG.get(slug) ?? LAUNCHER_AMMO[slug] ?? null
}

export function ammoKindForWeapon(opts: {
  name?: string | null
  catalogSlug?: string | null
  baseWeaponSlug?: string | null
  ammoSlug?: string | null
  properties?: string[] | null
}): AmmoKind | null {
  const fromAmmo = ammoKindFromSlug(opts.ammoSlug)
  if (fromAmmo) return fromAmmo
  const slug = (opts.baseWeaponSlug || opts.catalogSlug || '').trim().toLowerCase()
  if (slug && LAUNCHER_AMMO[slug]) return LAUNCHER_AMMO[slug]
  const props = (opts.properties ?? []).map((p) => p.toLowerCase())
  if (props.includes('ammunition') || AMMO_WEAPON_RE.test(String(opts.name || ''))) {
    const name = String(opts.name || '')
    if (/пращ|sling/i.test(name) || slug === 'sling') return 'sling_bullet'
    if (/дух|blowgun/i.test(name) || slug === 'blowgun') return 'blowgun_needle'
    if (/арбалет|crossbow/i.test(name) || slug.includes('crossbow')) return 'crossbow_bolt'
    if (/лук|bow/i.test(name) || slug.includes('bow')) return 'arrow'
  }
  return null
}

export function weaponNeedsAmmunition(opts: {
  name?: string | null
  catalogSlug?: string | null
  baseWeaponSlug?: string | null
  ammoSlug?: string | null
  properties?: string[] | null
}): boolean {
  return ammoKindForWeapon(opts) != null
}

/** Thrown weapons that are stacks (darts, javelins, handaxes…) — spend qty, not bow ammo. */
export function weaponIsThrownStack(opts: {
  name?: string | null
  catalogSlug?: string | null
  baseWeaponSlug?: string | null
  properties?: string[] | null
  qty?: number | null
}): boolean {
  if (weaponNeedsAmmunition(opts)) return false
  const slug = (opts.baseWeaponSlug || opts.catalogSlug || '').trim().toLowerCase()
  const props = (opts.properties ?? []).map((p) => p.toLowerCase())
  const thrown =
    props.includes('thrown') ||
    THROWN_WEAPON_SLUGS.has(slug) ||
    THROWN_STACK_RE.test(String(opts.name || ''))
  if (!thrown) return false
  if (
    SWORD_NO_AMMO_RE.test(String(opts.name || '')) &&
    !THROWN_STACK_RE.test(String(opts.name || '')) &&
    !THROWN_WEAPON_SLUGS.has(slug)
  ) {
    return false
  }
  const qty = opts.qty
  return qty == null || qty > 0
}

export function ammoKindOfStack(item: {
  name?: string
  catalog_slug?: string | null
  base_ammo_slug?: string | null
}): AmmoKind | null {
  const fromBase = ammoKindFromSlug(item.base_ammo_slug)
  if (fromBase) return fromBase
  const slug = String(item.catalog_slug || '').toLowerCase()
  if (AMMO_KIND_BY_SLUG.has(slug)) return slug as AmmoKind
  if (LAUNCHER_AMMO[slug]) return LAUNCHER_AMMO[slug]
  for (const row of AMMO_NAME_RE) {
    if (row.re.test(String(item.name || ''))) return row.kind
  }
  return null
}

export function listMatchingAmmoStacks<T extends {
  id: string
  name: string
  qty: number
  catalog_slug?: string | null
  base_ammo_slug?: string | null
}>(items: T[], kind: AmmoKind): T[] {
  return items.filter((row) => ammoKindOfStack(row) === kind)
}

export type AmmoConsumeDecision =
  | { ok: true; spend: false; note: string }
  | { ok: true; spend: true; itemId: string; nextQty: number; note: string }
  | { ok: false; reason: string; needPick: boolean }

/**
 * Resolve ammo spend for one attack.
 * repeating_shot → spend 0 with magic-ammo note.
 * Bound empty / missing → block (unless needPick to choose another stack).
 */
export function resolveAmmoConsume(opts: {
  needsAmmo: boolean
  repeatingShot?: boolean
  boundItemId?: string | null
  items: Array<{ id: string; name: string; qty: number; base_ammo_slug?: string | null; catalog_slug?: string | null }>
  ammoKind?: AmmoKind | null
}): AmmoConsumeDecision {
  if (!opts.needsAmmo) {
    return { ok: true, spend: false, note: '' }
  }
  if (opts.repeatingShot) {
    return { ok: true, spend: false, note: 'магический боеприпас (Повторяющий выстрел)' }
  }
  const kind = opts.ammoKind
  const boundId = opts.boundItemId?.trim() || null
  if (!boundId) {
    const candidates = kind ? listMatchingAmmoStacks(opts.items, kind) : []
    const withQty = candidates.filter((row) => (row.qty ?? 0) > 0)
    if (withQty.length === 1) {
      const row = withQty[0]
      return {
        ok: true,
        spend: true,
        itemId: row.id,
        nextQty: Math.max(0, (row.qty ?? 0) - 1),
        note: `${row.name} ×${Math.max(0, (row.qty ?? 0) - 1)}`,
      }
    }
    return {
      ok: false,
      reason: withQty.length === 0 ? 'Нет боеприпаса' : 'Выберите стопку боеприпаса',
      needPick: true,
    }
  }
  const row = opts.items.find((item) => item.id === boundId)
  if (!row) {
    return { ok: false, reason: 'Привязанная стопка не найдена', needPick: true }
  }
  if ((row.qty ?? 0) <= 0) {
    return { ok: false, reason: 'Нет боеприпаса', needPick: true }
  }
  return {
    ok: true,
    spend: true,
    itemId: row.id,
    nextQty: Math.max(0, (row.qty ?? 0) - 1),
    note: `${row.name} ×${Math.max(0, (row.qty ?? 0) - 1)}`,
  }
}

export function isSpareTheDyingSpell(spell: {
  name?: string | null
  catalog_id?: string | null
}): boolean {
  const name = String(spell.name || '')
  const id = String(spell.catalog_id || '').toLowerCase()
  return (
    /уход\s+за\s+умирающ/i.test(name) ||
    /spare\s+the\s+dying/i.test(name) ||
    id.includes('spare_the_dying') ||
    id.includes('spare-the-dying')
  )
}

export function itemHasRepeatingShot(
  bindings: Array<{ infusionId: string; itemId?: string | null }>,
  itemId: string | null | undefined,
): boolean {
  if (!itemId) return false
  return bindings.some(
    (row) =>
      row.itemId === itemId &&
      (row.infusionId === 'repeating_shot' ||
        row.infusionId.startsWith('repeating_shot')),
  )
}
