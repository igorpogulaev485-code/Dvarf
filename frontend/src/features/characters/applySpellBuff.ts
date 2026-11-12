/** B-01: write structured buff effects onto cast targets (self / lobby / own chars). */
import {
  applyCharacterEffects,
  type ApplyEffectPayload,
} from '../../shared/api/characters'
import {
  buildBuffEffect,
  serializeActiveEffect,
  type ActiveEffect,
} from '../../shared/dnd/activeEffects'
import type { SheetSpell } from './spells'
import type { CastChoice } from './CastSpellDialog'

export function buildSpellBuffForTargets(input: {
  spell: SheetSpell
  sourceCharacterId: string
  sourceName: string
}): ActiveEffect | null {
  return buildBuffEffect({
    name: input.spell.name,
    catalogId: input.spell.catalog_id,
    sourceCharacterId: input.sourceCharacterId,
    sourceName: input.sourceName,
    linkedConcentration: Boolean(input.spell.concentration),
  })
}

export async function applySpellBuffToTargets(input: {
  spell: SheetSpell
  choice: CastChoice
  sourceCharacterId: string
  sourceName: string
  /** Local apply when source is also a target (no round-trip needed for self). */
  onApplyLocal?: (effect: ActiveEffect) => void
}): Promise<{ applied: number; error?: string }> {
  const targets = (input.choice.allyTargetIds ?? []).filter(Boolean)
  if (targets.length === 0) return { applied: 0 }

  const effect = buildSpellBuffForTargets({
    spell: input.spell,
    sourceCharacterId: input.sourceCharacterId,
    sourceName: input.sourceName,
  })
  if (!effect) {
    // Unknown ally spell — still stamp a named concentration tag so Conc clear works.
    if (!input.spell.concentration && !input.spell.applies_to_allies) {
      return { applied: 0 }
    }
    const fallback: ActiveEffect = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `fx-${Date.now()}`,
      name: input.spell.name || 'Эффект',
      kind: 'spell',
      slug: String(input.spell.catalog_id || '')
        .toLowerCase()
        .replace(/-/g, '_') || undefined,
      source_character_id: input.sourceCharacterId,
      source_name: input.sourceName,
      linked_concentration: Boolean(input.spell.concentration),
      duration: input.spell.concentration
        ? { unit: 'manual', started_at: new Date().toISOString() }
        : { unit: 'manual', started_at: new Date().toISOString() },
      mods: [],
    }
    return applyBuiltEffect({ ...input, effect: fallback, targets })
  }
  return applyBuiltEffect({ ...input, effect, targets })
}

async function applyBuiltEffect(input: {
  effect: ActiveEffect
  targets: string[]
  sourceCharacterId: string
  sourceName: string
  onApplyLocal?: (effect: ActiveEffect) => void
}): Promise<{ applied: number; error?: string }> {
  const { effect, targets } = input
  if (targets.includes(input.sourceCharacterId)) {
    input.onApplyLocal?.(effect)
  }

  const payload: ApplyEffectPayload = {
    target_character_ids: targets,
    effect: serializeActiveEffect(effect) as ApplyEffectPayload['effect'],
    linked_concentration: Boolean(effect.linked_concentration),
  }
  try {
    const res = await applyCharacterEffects(input.sourceCharacterId, payload)
    return { applied: res.applied }
  } catch (err) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Не удалось наложить эффект на цели'
    return { applied: 0, error: message }
  }
}
