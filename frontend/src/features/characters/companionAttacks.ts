/**
 * Parse companion action text into one-click attack rows (C-01 / Н3).
 * Used by Play Desk «Атаки» and companion cards.
 */

import type { CompanionEntry } from './companions'
import { isSelfForm } from './companions'
import { proficiencyBonusForLevel } from './spells'

export type CompanionAttackRow = {
  id: string
  companionId: string
  companionName: string
  name: string
  /** Flat attack bonus when known; otherwise host spell attack. */
  attackBonus: number
  damageExpr: string
  damageType: string
  /** Source label for the host attacks strip. */
  sourceLabel: string
}

export type CompanionAttackHostContext = {
  characterLevel: number
  /** Spellcasting ability modifier of the host (Wisdom for druids, …). */
  spellMod?: number | null
  proficiencyBonus?: number
}

function pbOf(ctx: CompanionAttackHostContext): number {
  if (typeof ctx.proficiencyBonus === 'number' && Number.isFinite(ctx.proficiencyBonus)) {
    return Math.max(0, Math.floor(ctx.proficiencyBonus))
  }
  return proficiencyBonusForLevel(ctx.characterLevel)
}

function hostSpellAttack(ctx: CompanionAttackHostContext): number {
  return pbOf(ctx) + Math.floor(ctx.spellMod ?? 0)
}

/** Empty / dash / whitespace — treated as unset for backfill. */
export function isCompanionStatEmpty(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'number') return !Number.isFinite(value)
  if (typeof value === 'string') {
    const t = value.trim()
    return !t || t === '—' || t === '-' || t === '–'
  }
  return false
}

/**
 * Extract rollable attacks from a companion's `actions` text.
 * Recognises lines like:
 *   «Семя пламени: +5 1к6+3 огонь (60 фт.)»
 *   «Force-Empowered Rend +6; …»
 *   «Укус +5 2к6+3 колющий»
 */
export function parseCompanionActionAttacks(
  row: CompanionEntry,
  ctx: CompanionAttackHostContext,
): CompanionAttackRow[] {
  if (!row.active) return []
  if (isSelfForm(row)) return []
  const text = row.actions?.trim() ?? ''
  if (!text) return []

  const lines = text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)

  const out: CompanionAttackRow[] = []
  const hostAtk = hostSpellAttack(ctx)
  const companionName = row.name.trim() || 'Напарник'

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!
    // Skip non-attack utility lines (Repair, teleport-only without hit).
    if (/^repair\b/i.test(line)) continue
    if (/телепортац/i.test(line) && !/\+\s*\d|1\s*[dк]\s*\d/i.test(line)) continue
    if (/temp\s*hp|временн/i.test(line) && !/\+\s*\d+\s+\d+\s*[dк]/i.test(line)) {
      // Protector cannon — not a weapon attack.
      if (/защитник/i.test(line) || /protector/i.test(line)) continue
    }

    const bonusMatch = line.match(/\+(\d+)/)
    const diceMatch = line.match(/(\d+)\s*[dк]\s*(\d+)(?:\s*([+-]\s*\d+))?/i)
    if (!diceMatch && !bonusMatch) continue
    // Need at least a damage die to roll as an attack.
    if (!diceMatch) continue

    const count = Math.max(1, Math.floor(Number(diceMatch[1])))
    const sides = Math.max(2, Math.floor(Number(diceMatch[2])))
    const flatMod = diceMatch[3]
      ? Number(String(diceMatch[3]).replace(/\s+/g, ''))
      : 0
    const damageExpr =
      flatMod === 0
        ? `${count}к${sides}`
        : `${count}к${sides}${flatMod > 0 ? `+${flatMod}` : String(flatMod)}`

    let attackBonus: number
    if (bonusMatch) {
      attackBonus = Math.floor(Number(bonusMatch[1]))
    } else if (/\+?\s*\(?\+?мод\.?\s*закл/i.test(line) || /\(\+мод/i.test(line)) {
      attackBonus = hostAtk
    } else {
      attackBonus = hostAtk
    }

    const namePart = line.split(/:|\+|1\s*[dк]/i)[0]?.trim() || line.slice(0, 40)
    const name = namePart.replace(/[·.].*$/, '').trim() || 'Атака'

    const typeMatch =
      line.match(
        /(огонь|холод|яд|кислот\w*|сил\w*|колющ\w*|рубящ\w*|дробящ\w*|некротич\w*|лучист\w*|психич\w*|звук|молни\w*|fire|force|piercing|slashing|bludgeoning)/i,
      )
    const damageType = typeMatch?.[1] ?? ''

    out.push({
      id: `companion-atk:${row.id}:${i}`,
      companionId: row.id,
      companionName,
      name,
      attackBonus,
      damageExpr,
      damageType,
      sourceLabel: companionName,
    })
  }
  return out
}

/** All rollable companion attacks for the host «Атаки» strip (active allies only). */
export function listCompanionAttacksForHost(
  companions: CompanionEntry[],
  ctx: CompanionAttackHostContext,
): CompanionAttackRow[] {
  const rows: CompanionAttackRow[] = []
  for (const companion of companions) {
    rows.push(...parseCompanionActionAttacks(companion, ctx))
  }
  return rows
}
