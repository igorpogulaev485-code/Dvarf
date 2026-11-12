/**
 * B-07: map spent feat actions → ActiveEffect slugs / temp HP.
 * Feature ids are synthetic: feat:<slug> or feat-grant pool ids.
 */
import {
  chefSnackTempHp,
  inspiringLeaderTempHp,
} from '../../shared/dnd/b07FeatCombat'

export type B07SpendAction =
  | {
      kind: 'buff'
      slug: string
      name?: string
      option?: string | null
      classLevel?: number
      casterMod?: number | null
      slotLevel?: number | null
      targetsSelf?: boolean
      maxTargets?: number
    }
  | {
      kind: 'temp_hp'
      amount: number
      label: string
      forceReplace?: boolean
    }
  | {
      kind: 'heal'
      amount: number
      label: string
    }
  | { kind: 'none' }

function chaMod(abilities?: { cha?: number } | null): number {
  const score = abilities?.cha
  if (typeof score !== 'number') return 0
  return Math.floor((score - 10) / 2)
}

function normalizeFeatId(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/^feat:/, '')
    .replace(/^feat_grant:/, '')
}

/** After ClassFeaturesPanel / feat-card spend. */
export function resolveB07FeatureSpend(input: {
  featureId: string
  featureNameRu?: string
  characterLevel?: number
  proficiencyBonus?: number
  abilities?: { cha?: number; con?: number; wis?: number } | null
  rng?: () => number
}): B07SpendAction {
  const id = normalizeFeatId(input.featureId)
  const level = Math.max(1, Math.floor(input.characterLevel ?? 1))
  const pb = Math.max(2, Math.floor(input.proficiencyBonus ?? 2))
  const cha = chaMod(input.abilities)
  const rng = input.rng ?? Math.random

  // Pool ids embedded in feat-grant:{grantId}:{pool}
  const poolMatch = id.match(/(?:^|:)([a-z0-9_]+)$/)
  const poolOrSlug = poolMatch?.[1] || id

  if (
    id === 'inspiring_leader' ||
    poolOrSlug === 'inspiring_leader' ||
    /воодушевл|вдохновляющ.*лидер/i.test(input.featureNameRu || '')
  ) {
    return {
      kind: 'buff',
      slug: 'inspiring_leader',
      name: 'Воодушевляющий лидер',
      classLevel: level,
      casterMod: cha,
      targetsSelf: false,
      maxTargets: 6,
    }
  }

  if (
    id === 'chef_snack' ||
    poolOrSlug === 'chef_snack' ||
    (/шеф|chef/i.test(input.featureNameRu || '') && /закуск/i.test(input.featureNameRu || ''))
  ) {
    return {
      kind: 'buff',
      slug: 'chef_snack',
      name: 'Закуска шеф-повара',
      casterMod: pb,
      targetsSelf: true,
    }
  }

  if (id === 'chef_food' || poolOrSlug === 'chef_food') {
    return {
      kind: 'buff',
      slug: 'chef_food',
      name: 'Еда шеф-повара',
      targetsSelf: true,
    }
  }

  if (id === 'chef' || poolOrSlug === 'chef') {
    // Default chef button → cook snacks (bonus action eat is separate).
    return {
      kind: 'buff',
      slug: 'chef_snack',
      name: 'Закуска шеф-повара',
      casterMod: pb,
      targetsSelf: true,
    }
  }

  if (id === 'defensive_duelist' || poolOrSlug === 'defensive_duelist') {
    return {
      kind: 'buff',
      slug: 'defensive_duelist',
      name: 'Оборонительный дуэлянт',
      casterMod: pb,
      targetsSelf: true,
    }
  }

  if (
    id === 'protective_wings' ||
    poolOrSlug === 'protective_wings' ||
    id === 'gift_of_the_metallic_dragon'
  ) {
    return {
      kind: 'buff',
      slug: 'protective_wings',
      name: 'Защитные крылья',
      casterMod: pb,
      targetsSelf: true,
    }
  }

  if (
    id === 'chromatic_resistance' ||
    poolOrSlug === 'chromatic_resistance' ||
    id === 'gift_of_the_chromatic_dragon'
  ) {
    return {
      kind: 'buff',
      slug: 'chromatic_resistance',
      name: 'Реактивное сопротивление',
      option: 'fire',
      targetsSelf: true,
    }
  }

  if (id === 'chromatic_infusion' || poolOrSlug === 'chromatic_infusion') {
    return {
      kind: 'buff',
      slug: 'chromatic_infusion',
      name: 'Стихия оружия',
      option: 'fire',
      targetsSelf: true,
    }
  }

  if (id === 'bountiful_luck' || poolOrSlug === 'bountiful_luck') {
    return {
      kind: 'buff',
      slug: 'bountiful_luck',
      name: 'Бездонная удача',
      targetsSelf: false,
    }
  }

  if (id === 'second_chance' || poolOrSlug === 'second_chance') {
    return {
      kind: 'buff',
      slug: 'second_chance_spent',
      name: 'Второй шанс',
      targetsSelf: true,
    }
  }

  if (id === 'precise_strike' || poolOrSlug === 'precise_strike') {
    return {
      kind: 'buff',
      slug: 'precise_strike',
      name: 'Точный удар',
      targetsSelf: true,
    }
  }

  if (id === 'bolstering_rally' || poolOrSlug === 'bolstering_rally') {
    return {
      kind: 'buff',
      slug: 'bolstering_rally',
      name: 'Укрепляющий призыв',
      casterMod: cha,
      classLevel: pb,
      targetsSelf: false,
    }
  }

  if (id === 'commanding_rally' || poolOrSlug === 'commanding_rally') {
    return {
      kind: 'buff',
      slug: 'commanding_rally',
      name: 'Командный призыв',
      targetsSelf: false,
    }
  }

  if (id === 'demoralizing_strike' || poolOrSlug === 'demoralizing_strike') {
    return {
      kind: 'buff',
      slug: 'demoralizing_strike',
      name: 'Деморализующий удар',
      targetsSelf: true,
    }
  }

  if (id === 'strike_of_the_giants' || poolOrSlug === 'strike_of_the_giants') {
    return {
      kind: 'buff',
      slug: 'strike_of_the_giants',
      name: 'Удар великанов',
      option: 'hill',
      targetsSelf: true,
    }
  }

  if (id === 'magical_balance' || poolOrSlug === 'magical_balance') {
    return {
      kind: 'buff',
      slug: 'magical_balance',
      name: 'Магический баланс',
      targetsSelf: true,
    }
  }

  if (
    id === 'protective_ward' ||
    poolOrSlug === 'protective_ward' ||
    id === 'adept_of_the_white_robes'
  ) {
    return {
      kind: 'buff',
      slug: 'protective_ward',
      name: 'Защитная опека',
      casterMod: pb,
      targetsSelf: true,
    }
  }

  if (id === 'maelstrom_aura' || poolOrSlug === 'maelstrom_aura') {
    return {
      kind: 'buff',
      slug: 'maelstrom_aura',
      name: 'Аура водоворота',
      targetsSelf: true,
    }
  }

  if (id === 'flames_of_phlegethos' || poolOrSlug === 'flames_of_phlegethos') {
    return {
      kind: 'buff',
      slug: 'flames_of_phlegethos_shield',
      name: 'Пламя Флегетоса',
      targetsSelf: true,
    }
  }

  // Direct temp HP helper for tests / rest cook path.
  if (id === 'inspiring_leader_temp') {
    const amount = inspiringLeaderTempHp(level, cha)
    return {
      kind: 'temp_hp',
      amount,
      label: `Воодушевляющий лидер: ${amount} временных хитов`,
    }
  }

  if (id === 'chef_snack_temp') {
    const amount = chefSnackTempHp(pb)
    return {
      kind: 'temp_hp',
      amount,
      label: `Закуска шеф-повара: ${amount} временных хитов`,
    }
  }

  if (id === 'chef_food_heal') {
    const roll = 1 + Math.floor(rng() * 8)
    return {
      kind: 'heal',
      amount: roll,
      label: `Еда шеф-повара: +${roll} хитов (1к8)`,
    }
  }

  return { kind: 'none' }
}
