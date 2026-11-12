/**
 * B-06: map spent Artificer features → ActiveEffect slugs / temp HP / heal.
 */
import {
  experimentalElixirSlugFromRoll,
  protectorCannonTempHp,
  restorativeReagentsTempHp,
} from '../../shared/dnd/b06BuffSpecs'
import { getFeaturePick, type FeaturePicksState } from '../../shared/dnd/featurePicks'
import { rollDiceNotation } from '../../shared/dnd/activeEffects'

export type B06SpendAction =
  | {
      kind: 'buff'
      slug: string
      name?: string
      option?: string | null
      classLevel?: number
      casterMod?: number | null
      slotLevel?: number | null
      targetsSelf?: boolean
      auraAllyDefaultOff?: boolean
    }
  | {
      kind: 'heal'
      amount: number
      label: string
    }
  | {
      kind: 'temp_hp'
      amount: number
      label: string
      forceReplace?: boolean
    }
  | {
      kind: 'none'
    }

function intMod(abilities?: { int?: number } | null): number {
  const score = abilities?.int
  if (typeof score !== 'number') return 0
  return Math.floor((score - 10) / 2)
}

function armorModel(
  featurePicks: FeaturePicksState | null | undefined,
  classEntryId: string,
): string {
  if (!featurePicks) return ''
  const raw =
    getFeaturePick(featurePicks, classEntryId, 'armor_model') ||
    getFeaturePick(featurePicks, classEntryId, 'armorer_armor_model') ||
    ''
  return String(raw).trim().toLowerCase()
}

function cannonType(
  featurePicks: FeaturePicksState | null | undefined,
  classEntryId: string,
): string {
  if (!featurePicks) return ''
  const raw = getFeaturePick(featurePicks, classEntryId, 'cannon_type') || ''
  return String(raw).trim().toLowerCase()
}

/** After ClassFeaturesPanel resource spend / «Применить эффект». */
export function resolveB06FeatureSpend(input: {
  featureId: string
  featureNameRu: string
  classEntryId: string
  classLevel: number
  featurePicks?: FeaturePicksState | null
  abilities?: { int?: number; cha?: number } | null
  attunedMagicItemCount?: number
  rng?: () => number
}): B06SpendAction {
  const id = input.featureId
  const level = Math.max(1, Math.floor(input.classLevel))
  const rng = input.rng ?? Math.random
  const int = intMod(input.abilities)

  if (id === 'flash_of_genius') {
    return {
      kind: 'buff',
      slug: 'flash_of_genius',
      name: 'Вспышка гениальности',
      casterMod: int,
      targetsSelf: false,
    }
  }

  if (id === 'soul_of_artifice') {
    const n = Math.max(0, Math.floor(input.attunedMagicItemCount ?? 0))
    return {
      kind: 'buff',
      slug: 'soul_of_artifice',
      name: 'Душа изобретения',
      slotLevel: n,
      targetsSelf: true,
    }
  }

  if (id === 'experimental_elixir') {
    const roll = 1 + Math.floor(rng() * 6)
    const slug = experimentalElixirSlugFromRoll(roll)
    if (slug === 'experimental_elixir_healing') {
      const heal = rollDiceNotation('2d8', rng) + Math.max(0, int)
      return {
        kind: 'heal',
        amount: Math.max(1, heal),
        label: `Эликсир (лечение): +${Math.max(1, heal)} хитов`,
      }
    }
    const names: Record<string, string> = {
      experimental_elixir_swiftness: 'Экспериментальный эликсир (стремительность)',
      experimental_elixir_resilience: 'Экспериментальный эликсир (устойчивость)',
      experimental_elixir_boldness: 'Экспериментальный эликсир (смелость)',
      experimental_elixir_flight: 'Экспериментальный эликсир (полёт)',
      experimental_elixir_transformation: 'Экспериментальный эликсир (трансформация)',
    }
    return {
      kind: 'buff',
      slug,
      name: names[slug] || input.featureNameRu,
      casterMod: int,
      targetsSelf: false,
    }
  }

  if (id === 'restorative_reagents') {
    // Lesser restoration uses the pool; temp HP rides on elixir drink.
    // «Применить эффект» still grants the temp pool when pressed.
    const amount = restorativeReagentsTempHp(int, rng)
    return {
      kind: 'temp_hp',
      amount,
      label: `Восстанавливающие реагенты: ${amount} временных хитов`,
    }
  }

  if (id === 'eldritch_cannon' || id === 'eldritch_cannon_protector') {
    const kind = cannonType(input.featurePicks, input.classEntryId)
    if (id === 'eldritch_cannon' && kind && kind !== 'protector') {
      return { kind: 'none' }
    }
    const amount = protectorCannonTempHp(int, rng)
    return {
      kind: 'buff',
      slug: 'eldritch_cannon_protector',
      name: 'Мистическая пушка: защитник',
      slotLevel: amount,
      casterMod: int,
      targetsSelf: false,
    }
  }

  if (id === 'fortified_position') {
    return {
      kind: 'buff',
      slug: 'fortified_position',
      name: 'Укреплённая позиция',
      targetsSelf: true,
      // Ally half-cover by positions → lobby 12–14; sheet half for self.
    }
  }

  if (id === 'arcane_jolt') {
    return {
      kind: 'buff',
      slug: 'arcane_jolt',
      name: 'Магический импульс',
      classLevel: level,
      option: 'damage',
      targetsSelf: true,
    }
  }

  if (id === 'perfected_armor' || id === 'defensive_field' || id === 'armor_model') {
    const model = armorModel(input.featurePicks, input.classEntryId)
    if (id === 'armor_model' || id === 'perfected_armor') {
      if (model === 'infiltrator' || model.includes('диверсант') || model.includes('infiltr')) {
        return {
          kind: 'buff',
          slug: 'infiltrator_model',
          name: 'Модель «Диверсант»',
          targetsSelf: true,
        }
      }
      if (id === 'armor_model') {
        // Guardian model: Defensive Field is a separate spend via perfected/guardian.
        return { kind: 'none' }
      }
    }
    if (
      id === 'defensive_field' ||
      model === 'guardian' ||
      model.includes('страж') ||
      model.includes('guardian') ||
      id === 'perfected_armor'
    ) {
      // Perfected armor guardian pull is lobby; infiltrator temp is separate.
      if (id === 'perfected_armor' && (model === 'infiltrator' || model.includes('диверсант'))) {
        const amount = Math.max(1, int + Math.ceil(level / 2))
        return {
          kind: 'temp_hp',
          amount,
          label: `Совершенный доспех (диверсант): ${amount} временных хитов`,
          forceReplace: true,
        }
      }
      return {
        kind: 'buff',
        slug: 'defensive_field',
        name: 'Защитное поле',
        classLevel: level,
        targetsSelf: true,
      }
    }
  }

  if (id === 'infiltrator_model' || id === 'charged_movement') {
    return {
      kind: 'buff',
      slug: 'infiltrator_model',
      name: 'Модель «Диверсант»',
      targetsSelf: true,
    }
  }

  return { kind: 'none' }
}
