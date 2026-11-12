/** B-01/B-02: write structured buff effects onto cast targets (self / lobby / own chars). */
import {
  applyCharacterEffects,
  type ApplyEffectPayload,
} from '../../shared/api/characters'
import {
  buildBuffEffect,
  hasBuffSpec,
  hpMaxBonusFromSingleEffect,
  rollDiceNotation,
  serializeActiveEffect,
  tempHpGrantFromEffect,
  type ActiveEffect,
} from '../../shared/dnd/activeEffects'
import type { SheetSpell } from './spells'
import type { CastChoice } from './CastSpellDialog'

export type TempHpPrompt = {
  current: number
  incoming: number
  /** Larger pool highlighted for UI (Р4). */
  larger: 'keep' | 'replace' | 'equal'
}

export type ApplySpellBuffHooks = {
  /** Local apply when source is also a target (no round-trip needed for self). */
  onApplyLocal?: (effect: ActiveEffect) => void
  /** B11: bump max + current HP when effect grants hp_max. */
  onHpMaxGrant?: (bonus: number) => void
  /**
   * B08: apply temp HP. Return false to skip (user kept old pool).
   * If omitted, temp HP is not written locally (effect still carries the mod).
   */
  onTempHpGrant?: (incoming: number, meta: TempHpPrompt) => boolean | Promise<boolean>
  /** Optional caster spell mod (heroism). */
  casterMod?: number | null
  /** Choice chips (ability / damage type / warm|cold…). */
  buffOption?: string | null
}

export function buildSpellBuffForTargets(input: {
  spell: SheetSpell
  sourceCharacterId: string
  sourceName: string
  slotLevel?: number | null
  casterMod?: number | null
  option?: string | null
}): ActiveEffect | null {
  let option = input.option ?? null
  // Heroes' feast: roll 2d10 once and bake into option for the builder.
  const slugGuess = input.spell.catalog_id || input.spell.name
  if (
    /heroes'?_?feast|пир\s*геро/i.test(String(slugGuess)) ||
    /^пир\s*геро/i.test(input.spell.name || '')
  ) {
    option = String(rollDiceNotation('2d10'))
  }
  return buildBuffEffect({
    name: input.spell.name,
    catalogId: input.spell.catalog_id,
    sourceCharacterId: input.sourceCharacterId,
    sourceName: input.sourceName,
    linkedConcentration: Boolean(input.spell.concentration),
    slotLevel: input.slotLevel,
    spellLevel: input.spell.level,
    casterMod: input.casterMod,
    option,
  })
}

export async function applySpellBuffToTargets(input: {
  spell: SheetSpell
  choice: CastChoice
  sourceCharacterId: string
  sourceName: string
} & ApplySpellBuffHooks): Promise<{ applied: number; error?: string }> {
  let targets = (input.choice.allyTargetIds ?? []).filter(Boolean)
  // Self-buffs (Shield, Mage Armor, False Life…): no target picker → apply to caster.
  if (
    targets.length === 0 &&
    hasBuffSpec(input.spell.name, input.spell.catalog_id)
  ) {
    targets = [input.sourceCharacterId]
  }
  if (targets.length === 0) return { applied: 0 }

  const effect = buildSpellBuffForTargets({
    spell: input.spell,
    sourceCharacterId: input.sourceCharacterId,
    sourceName: input.sourceName,
    slotLevel: input.choice.slotLevel,
    casterMod: input.casterMod,
    option: input.buffOption ?? input.choice.buffOption ?? null,
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
      duration: { unit: 'manual', started_at: new Date().toISOString() },
      mods: [],
    }
    return applyActiveEffectToTargets({ ...input, effect: fallback, targets })
  }
  return applyActiveEffectToTargets({ ...input, effect, targets })
}

/** Apply a pre-built ActiveEffect to targets (spells + B-04 feature buffs). */
export async function applyActiveEffectToTargets(input: {
  effect: ActiveEffect
  targets: string[]
  sourceCharacterId: string
  sourceName: string
  onApplyLocal?: (effect: ActiveEffect) => void
  onHpMaxGrant?: (bonus: number) => void
  onTempHpGrant?: (incoming: number, meta: TempHpPrompt) => boolean | Promise<boolean>
}): Promise<{ applied: number; error?: string }> {
  const { effect, targets } = input
  const isLocal = targets.includes(input.sourceCharacterId)

  if (isLocal) {
    const hpBonus = hpMaxBonusFromSingleEffect(effect)
    if (hpBonus > 0) input.onHpMaxGrant?.(hpBonus)

    const tempGrant = tempHpGrantFromEffect(effect)
    if (tempGrant != null && tempGrant > 0 && input.onTempHpGrant) {
      // Current temp is unknown here — hook reads from draft; pass incoming only.
      // Caller supplies current via closure; we send incoming with placeholder current 0
      // and let the hook compare. Prefer dedicated currentTemp on hooks when needed.
      const accepted = await input.onTempHpGrant(tempGrant, {
        current: 0,
        incoming: tempGrant,
        larger: 'replace',
      })
      if (!accepted) {
        // Strip temp_hp mods so a rejected pool is not re-applied later.
        effect.mods = (effect.mods ?? []).filter((mod) => mod.target !== 'temp_hp')
      }
    }
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
