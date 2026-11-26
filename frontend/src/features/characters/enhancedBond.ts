/**
 * TCE Circle of Wildfire — Enhanced Bond (Усиленная связь, L6).
 * While the wildfire spirit is summoned: +1d8 to one fire-damage or healing
 * roll of a spell you cast; non-self spells may originate from the spirit.
 * Spirit's own attacks are not boosted.
 */

import { isWildfireSpiritCompanion } from './companionBackfill'
import type { CompanionEntry } from './companions'
import { spellEffectIsHeal } from './physicalSpellFollowUp'

export const ENHANCED_BOND_FEATURE_ID = 'enhanced_bond'
export const ENHANCED_BOND_DIE_RU = '1к8'
export const ENHANCED_BOND_NOTE_RU = 'Усиленная связь +1к8'

/** Active wildfire spirit on the sheet (same gate as Blazing Revival). */
export function hasActiveWildfireSpirit(
  companions: CompanionEntry[] | null | undefined,
): boolean {
  return (companions ?? []).some(
    (row) =>
      isWildfireSpiritCompanion(row) &&
      row.active !== false &&
      Math.max(0, Math.floor(row.stats?.hp ?? 0)) > 0,
  )
}

export function hasEnhancedBondFeature(
  features: Array<{ id?: string | null }> | null | undefined,
): boolean {
  return (features ?? []).some((row) => row.id === ENHANCED_BOND_FEATURE_ID)
}

/** Feature unlocked + living spirit → bond is live. */
export function isEnhancedBondActive(input: {
  features?: Array<{ id?: string | null }> | null
  companions?: CompanionEntry[] | null
}): boolean {
  return (
    hasEnhancedBondFeature(input.features) && hasActiveWildfireSpirit(input.companions)
  )
}

/** Fire damage in effect / damage / description (RU or EN). */
export function spellDealsFireDamage(input: {
  name?: string | null
  effect?: string | null
  damage?: string | null
  description?: string | null
  attack_or_save?: string | null
}): boolean {
  const blob = [
    input.name,
    input.effect,
    input.damage,
    input.description,
    input.attack_or_save,
  ]
    .map((s) => String(s ?? ''))
    .join(' ')
  // «огонь» = о-г-о-н-ь (не «огн»); «огнём/огненный» уже содержат «огн».
  return /огон|огн|fire|пламен|пылающ|burning|scorch/i.test(blob)
}

/** TCE: fire damage OR restores hit points. */
export function spellQualifiesForEnhancedBond(input: {
  name?: string | null
  effect?: string | null
  damage?: string | null
  description?: string | null
  attack_or_save?: string | null
}): boolean {
  if (spellEffectIsHeal(input)) return true
  return spellDealsFireDamage(input)
}

const BOND_MARK = /(усиленн\w*\s*связ|enhanced\s*bond)/i

/** Append +1к8 once to a cast effect / damage preview line. */
export function applyEnhancedBondToEffect(effect: string): string {
  const text = String(effect ?? '').trim()
  if (!text) return text
  if (BOND_MARK.test(text)) return text
  if (/\+?\s*1\s*[кk]\s*8\b/i.test(text) && /связ/i.test(text)) return text
  // Prefer inserting into the first dice cluster: `1к10 огонь` → `1к10+1к8 огонь`.
  const dice = text.match(/(\d+\s*[dк]\s*\d+)/i)
  if (dice && dice.index != null) {
    const end = dice.index + dice[0].length
    const before = text.slice(0, end)
    const after = text.slice(end)
    if (/^\s*\+\s*1\s*[dк]\s*8\b/i.test(after)) return text
    return `${before}+${ENHANCED_BOND_DIE_RU}${after}`
  }
  return `${text} + ${ENHANCED_BOND_DIE_RU}`
}

/** Range is Self / «на себя» — origin-from-spirit does not apply. */
export function spellRangeIsSelf(range: string | null | undefined): boolean {
  const text = String(range ?? '').trim().toLowerCase()
  if (!text) return false
  if (/^self\b/.test(text) || /^на\s*себя\b/.test(text)) return true
  if (/\bself\b/.test(text) && !/\d/.test(text)) return true
  if (/на\s*себя/.test(text) && !/\d/.test(text)) return true
  return false
}

export type EnhancedBondCastOrigin = 'self' | 'spirit'

export function enhancedBondOriginNoteRu(
  origin: EnhancedBondCastOrigin | null | undefined,
): string {
  if (origin === 'spirit') return ' · каст от духа'
  return ''
}
