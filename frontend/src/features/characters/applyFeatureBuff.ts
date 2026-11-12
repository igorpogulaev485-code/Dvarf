/**
 * B-04: apply class-feature buffs through the shared ActiveEffect path
 * (same POST /effects/apply as spell buffs — no second model).
 */
import {
  buildBuffEffect,
  type ActiveEffect,
} from '../../shared/dnd/activeEffects'
import {
  applyActiveEffectToTargets,
  type ApplySpellBuffHooks,
} from './applySpellBuff'

export async function applyFeatureBuffToTargets(
  input: {
    slug: string
    name?: string
    sourceCharacterId: string
    sourceName: string
    targets?: string[]
    classLevel?: number | null
    casterMod?: number | null
    option?: string | null
    /** Pre-rolled pool / inspiring smite total (maps to BuffBuildContext.slotLevel). */
    slotLevel?: number | null
    /** Р10: ally aura starts «вне ауры» until the target toggles. */
    auraAllyDefaultOff?: boolean
  } & ApplySpellBuffHooks,
): Promise<{ applied: number; error?: string; effect: ActiveEffect | null }> {
  let effect = buildBuffEffect({
    slug: input.slug,
    name: input.name,
    sourceCharacterId: input.sourceCharacterId,
    sourceName: input.sourceName,
    linkedConcentration: false,
    classLevel: input.classLevel,
    casterMod: input.casterMod,
    option: input.option,
    slotLevel: input.slotLevel,
  })
  if (!effect) return { applied: 0, error: 'Нет спеки умения', effect: null }

  const targets =
    input.targets && input.targets.length > 0
      ? input.targets.filter(Boolean)
      : [input.sourceCharacterId]

  const applyingToAlly = targets.some((id) => id !== input.sourceCharacterId)
  if (input.auraAllyDefaultOff && applyingToAlly) {
    effect = {
      ...effect,
      inactive: true,
      inactive_reason: 'вне ауры',
    }
  }

  const result = await applyActiveEffectToTargets({
    effect,
    targets,
    sourceCharacterId: input.sourceCharacterId,
    sourceName: input.sourceName,
    onApplyLocal: input.onApplyLocal,
    onHpMaxGrant: input.onHpMaxGrant,
    onTempHpGrant: input.onTempHpGrant,
  })
  return { ...result, effect }
}

/** Local-only append (no network) — used when API already ran or offline self-buff. */
export function appendLocalEffect(
  effects: ActiveEffect[] | null | undefined,
  effect: ActiveEffect,
): ActiveEffect[] {
  return [...(effects ?? []), effect]
}
