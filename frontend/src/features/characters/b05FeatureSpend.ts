/**
 * B-05: map spent class features → ActiveEffect slugs / heal / temp HP actions.
 */
import { rollDiceNotation } from '../../shared/dnd/activeEffects'
import {
  darkOnesBlessingTempHp,
  inspiringSmiteTempPool,
} from '../../shared/dnd/b05BuffSpecs'
import { quickenedHealingAmount } from '../../shared/dnd/o02TashaFeatures'

export type B05SpendAction =
  | {
      kind: 'buff'
      slug: string
      name?: string
      option?: string | null
      classLevel?: number
      casterMod?: number | null
      /** Pre-rolled temp HP pool (inspiring smite / dark one's blessing). */
      slotLevel?: number | null
      targetsSelf?: boolean
      /** Ally aura: apply inactive until «в ауре» toggle. */
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

function chaMod(abilities?: { cha?: number } | null): number {
  const score = abilities?.cha
  if (typeof score !== 'number') return 0
  return Math.floor((score - 10) / 2)
}

function intMod(abilities?: { int?: number } | null): number {
  const score = abilities?.int
  if (typeof score !== 'number') return 0
  return Math.floor((score - 10) / 2)
}

/** After ClassFeaturesPanel resource spend. */
export function resolveB05FeatureSpend(input: {
  featureId: string
  featureNameRu: string
  classEntryId: string
  classLevel: number
  abilities?: { cha?: number; int?: number; con?: number; wis?: number } | null
  proficiencyBonus?: number
  /** O-02: Martial Arts die label for Quickened Healing (e.g. "1к8"). */
  martialArtsDie?: string | null
  rng?: () => number
}): B05SpendAction {
  const id = input.featureId
  const level = Math.max(1, Math.floor(input.classLevel))
  const rng = input.rng ?? Math.random
  const cha = chaMod(input.abilities)

  if (id === 'dark_ones_blessing') {
    const amount = darkOnesBlessingTempHp(level, cha)
    return {
      kind: 'temp_hp',
      amount,
      label: `Благословение Темнейшего: ${amount} временных хитов`,
    }
  }
  if (id === 'tomb_of_levistus') {
    return {
      kind: 'buff',
      slug: 'tomb_of_levistus',
      name: 'Гробница Левиста',
      classLevel: level,
      targetsSelf: true,
    }
  }
  if (id === 'hexblades_curse') {
    return {
      kind: 'buff',
      slug: 'hexblades_curse',
      name: 'Проклятие ведьмовского клинка',
      classLevel: level,
      casterMod: input.proficiencyBonus ?? undefined,
      targetsSelf: true,
    }
  }
  if (id === 'celestial_resilience') {
    return {
      kind: 'buff',
      slug: 'celestial_resilience',
      name: 'Небесная устойчивость',
      classLevel: level,
      casterMod: cha,
      targetsSelf: true,
    }
  }
  if (id === 'elemental_gift') {
    return {
      kind: 'buff',
      slug: 'elemental_gift_flight',
      name: 'Дар стихии (полёт)',
      targetsSelf: true,
    }
  }
  if (id === 'indestructible_life') {
    const heal = rollDiceNotation('1d8', rng) + level
    return { kind: 'heal', amount: heal, label: `Неразрушимая жизнь: +${heal} хитов` }
  }
  if (id === 'defy_death') {
    const con =
      typeof input.abilities?.con === 'number'
        ? Math.floor((input.abilities.con - 10) / 2)
        : 0
    const heal = rollDiceNotation('1d8', rng) + con
    return { kind: 'heal', amount: Math.max(1, heal), label: `Бросить вызов смерти: +${heal}` }
  }
  if (id === 'slayers_prey') {
    return {
      kind: 'buff',
      slug: 'slayers_prey',
      name: 'Добыча убийцы',
      targetsSelf: true,
    }
  }
  if (id === 'natures_veil') {
    return {
      kind: 'buff',
      slug: 'natures_veil',
      name: 'Завеса природы',
      targetsSelf: true,
    }
  }
  if (id === 'favored_foe') {
    return {
      kind: 'buff',
      slug: 'favored_foe',
      name: 'Избранный противник',
      targetsSelf: true,
    }
  }
  if (id === 'quickened_healing') {
    const heal = quickenedHealingAmount(
      input.martialArtsDie,
      input.proficiencyBonus ?? 2,
      rng,
    )
    return { kind: 'heal', amount: heal.amount, label: heal.label }
  }
  if (id === 'dread_ambusher') {
    return {
      kind: 'buff',
      slug: 'dread_ambusher',
      name: 'Жуткий преследователь (первый ход)',
      targetsSelf: true,
    }
  }
  if (id === 'multiattack_defense') {
    return {
      kind: 'buff',
      slug: 'multiattack_defense',
      name: 'Защита от множественных атак',
      targetsSelf: true,
    }
  }
  if (id === 'tides_of_chaos') {
    return {
      kind: 'buff',
      slug: 'tides_of_chaos',
      name: 'Поток хаоса',
      targetsSelf: true,
    }
  }
  if (id === 'umbral_form') {
    return {
      kind: 'buff',
      slug: 'umbral_form',
      name: 'Мрачная форма',
      targetsSelf: true,
    }
  }
  if (id === 'bastion_of_law') {
    return {
      kind: 'buff',
      slug: 'bastion_of_law',
      name: 'Бастион закона',
      classLevel: Math.min(5, Math.max(1, cha || 1)),
      targetsSelf: true,
    }
  }
  if (id === 'trance_of_order') {
    return {
      kind: 'buff',
      slug: 'trance_of_order',
      name: 'Медитация порядка',
      targetsSelf: true,
    }
  }
  if (id === 'lunar_empowerment') {
    return {
      kind: 'buff',
      slug: 'lunar_empowerment',
      name: 'Лунное усиление',
      option: 'full_moon',
      targetsSelf: true,
    }
  }
  if (id === 'lunar_phenomenon') {
    return {
      kind: 'buff',
      slug: 'lunar_phenomenon',
      name: 'Лунный феномен',
      option: 'full_moon',
      targetsSelf: true,
    }
  }
  if (id === 'arcane_deflection') {
    return {
      kind: 'buff',
      slug: 'arcane_deflection',
      name: 'Магическое отражение',
      targetsSelf: true,
    }
  }
  if (id === 'adjust_density') {
    return {
      kind: 'buff',
      slug: 'adjust_density',
      name: 'Изменение плотности',
      option: 'light',
      targetsSelf: false,
    }
  }
  if (id === 'transmuters_stone') {
    return {
      kind: 'buff',
      slug: 'transmuters_stone',
      name: 'Камень трансмутации',
      option: 'speed',
      targetsSelf: true,
    }
  }
  if (id === 'exalted_champion') {
    return {
      kind: 'buff',
      slug: 'exalted_champion',
      name: 'Возвышенный чемпион',
      targetsSelf: true,
    }
  }
  if (id === 'glorious_defense') {
    return {
      kind: 'buff',
      slug: 'glorious_defense',
      name: 'Блестящая оборона',
      casterMod: cha,
      targetsSelf: true,
    }
  }
  if (id === 'wind_soul') {
    return {
      kind: 'buff',
      slug: 'wind_soul_share',
      name: 'Душа ветра (полёт союзникам)',
      targetsSelf: false,
    }
  }
  // Permanent self toggles / apply-once from card spend
  if (id === 'eldritch_mind') {
    return {
      kind: 'buff',
      slug: 'eldritch_mind',
      name: 'Элдрический разум',
      targetsSelf: true,
    }
  }
  if (id === 'improved_pact_weapon') {
    return {
      kind: 'buff',
      slug: 'improved_pact_weapon',
      name: 'Улучшенное оружие договора',
      targetsSelf: true,
    }
  }
  if (id === 'spell_resistance') {
    return {
      kind: 'buff',
      slug: 'spell_resistance',
      name: 'Сопротивление заклинаниям',
      targetsSelf: true,
    }
  }
  if (id === 'durable_magic') {
    return {
      kind: 'buff',
      slug: 'durable_magic',
      name: 'Прочная магия',
      targetsSelf: true,
    }
  }
  if (id === 'steel_will') {
    return {
      kind: 'buff',
      slug: 'steel_will',
      name: 'Стальная воля',
      targetsSelf: true,
    }
  }
  if (id === 'colossus_slayer') {
    return {
      kind: 'buff',
      slug: 'colossus_slayer',
      name: 'Колосс-убийца',
      targetsSelf: true,
    }
  }
  if (id === 'dreadful_strikes') {
    return {
      kind: 'buff',
      slug: 'dreadful_strikes',
      name: 'Ужасающие удары',
      classLevel: level,
      targetsSelf: true,
    }
  }
  if (id === 'psychic_defenses') {
    return {
      kind: 'buff',
      slug: 'psychic_defenses',
      name: 'Психическая защита',
      targetsSelf: true,
    }
  }
  if (id === 'wind_soul' || id === 'wind_soul_self') {
    return {
      kind: 'buff',
      slug: 'wind_soul',
      name: 'Душа ветра',
      targetsSelf: true,
    }
  }
  if (id === 'strength_of_the_grave') {
    return {
      kind: 'buff',
      slug: 'strength_of_the_grave',
      name: 'Сила могилы',
      targetsSelf: true,
    }
  }
  if (id === 'perfected_bond') {
    return {
      kind: 'buff',
      slug: 'perfected_bond',
      name: 'Превосходная связь',
      option: 'all',
      targetsSelf: true,
    }
  }
  if (id === 'supernatural_resistance') {
    return {
      kind: 'buff',
      slug: 'supernatural_resistance',
      name: 'Сверхъестественное сопротивление',
      targetsSelf: true,
    }
  }
  if (id === 'unyielding_spirit') {
    return {
      kind: 'buff',
      slug: 'unyielding_spirit',
      name: 'Непоколебимый дух',
      targetsSelf: true,
    }
  }
  if (id === 'aura_of_alacrity') {
    return {
      kind: 'buff',
      slug: 'aura_of_alacrity',
      name: 'Аура рвения',
      targetsSelf: true,
    }
  }
  if (id === 'aura_of_courage') {
    return {
      kind: 'buff',
      slug: 'aura_of_courage',
      name: 'Аура отваги',
      targetsSelf: true,
    }
  }
  if (id === 'aura_of_devotion') {
    return {
      kind: 'buff',
      slug: 'aura_of_devotion',
      name: 'Аура верности',
      targetsSelf: true,
    }
  }
  if (id === 'aura_of_warding') {
    return {
      kind: 'buff',
      slug: 'aura_of_warding',
      name: 'Аура опеки',
      targetsSelf: true,
    }
  }
  if (id === 'aura_of_protection') {
    return {
      kind: 'buff',
      slug: 'aura_of_protection',
      name: 'Аура защиты',
      casterMod: Math.max(1, cha),
      targetsSelf: false,
      auraAllyDefaultOff: true,
    }
  }
  if (id === 'aura_of_the_sentinel') {
    return {
      kind: 'buff',
      slug: 'aura_of_the_sentinel',
      name: 'Аура стража',
      casterMod: Math.max(1, cha),
      targetsSelf: true,
    }
  }
  if (id === 'tactical_wit') {
    return {
      kind: 'buff',
      slug: 'tactical_wit',
      name: 'Тактическое чутьё',
      casterMod: intMod(input.abilities),
      targetsSelf: true,
    }
  }
  if (id === 'dark_ones_own_luck') {
    return {
      kind: 'buff',
      slug: 'dark_ones_own_luck',
      name: 'Удача Темнейшего',
      targetsSelf: true,
    }
  }
  if (id === 'bend_luck') {
    return {
      kind: 'buff',
      slug: 'bend_luck',
      name: 'Подчинение удачи',
      targetsSelf: true,
    }
  }
  if (id === 'favored_by_the_gods') {
    return {
      kind: 'buff',
      slug: 'favored_by_the_gods',
      name: 'Любимчик богов',
      targetsSelf: true,
    }
  }
  if (id === 'pact_of_the_talisman') {
    return {
      kind: 'buff',
      slug: 'pact_of_the_talisman',
      name: 'Договор талисмана',
      targetsSelf: true,
    }
  }
  if (id === 'among_the_dead') {
    return {
      kind: 'buff',
      slug: 'among_the_dead',
      name: 'Среди мёртвых',
      targetsSelf: true,
    }
  }
  if (id === 'master_of_tactics') {
    return {
      kind: 'buff',
      slug: 'master_of_tactics',
      name: 'Мастер тактики',
      targetsSelf: true,
    }
  }
  if (id === 'psi_bolstered_knack') {
    return {
      kind: 'buff',
      slug: 'psi_bolstered_knack',
      name: 'Пси-укреплённая сноровка',
      targetsSelf: true,
    }
  }
  if (id === 'magical_guidance') {
    return {
      kind: 'buff',
      slug: 'magical_guidance',
      name: 'Волшебное указание',
      targetsSelf: true,
    }
  }
  if (id === 'restore_balance') {
    return {
      kind: 'buff',
      slug: 'restore_balance',
      name: 'Восстановление баланса',
      targetsSelf: true,
    }
  }
  if (id === 'uncanny_dodge') {
    return {
      kind: 'buff',
      slug: 'uncanny_dodge',
      name: 'Увёртливость',
      targetsSelf: true,
    }
  }
  return { kind: 'none' }
}

/** Paladin Channel Divinity option label → buff. */
export function resolveB05ChannelSpend(
  label: string,
  classLevel: number,
  abilities?: { cha?: number } | null,
  rng: () => number = Math.random,
): B05SpendAction {
  const t = label.toLowerCase()
  const cha = chaMod(abilities)
  const level = Math.max(1, Math.floor(classLevel))

  if (t.includes('священн') && t.includes('оруж')) {
    return {
      kind: 'buff',
      slug: 'cd_sacred_weapon',
      name: 'Священное оружие',
      casterMod: Math.max(1, cha),
      targetsSelf: true,
    }
  }
  if (t.includes('обет') && t.includes('вражд')) {
    return {
      kind: 'buff',
      slug: 'cd_vow_of_enmity',
      name: 'Обет вражды',
      targetsSelf: true,
    }
  }
  if (t.includes('вдохновляющ') || (t.includes('воодушевл') && t.includes('кар'))) {
    const pool = inspiringSmiteTempPool(level, rng)
    return {
      kind: 'buff',
      slug: 'cd_inspiring_smite',
      name: 'Вдохновляющая кара',
      slotLevel: pool,
      classLevel: level,
      targetsSelf: false,
    }
  }
  if (t.includes('воля') && t.includes('смотрител')) {
    return {
      kind: 'buff',
      slug: 'cd_watchers_will',
      name: 'Воля смотрителя',
      targetsSelf: false,
    }
  }
  if (t.includes('посланник') || t.includes('мира')) {
    return {
      kind: 'buff',
      slug: 'cd_emissary_of_peace',
      name: 'Посланник мира',
      targetsSelf: true,
    }
  }
  if (t.includes('поворот') || t.includes('перелом') || t.includes('волн')) {
    const heal = rollDiceNotation('1d6', rng) + Math.max(1, cha)
    return {
      kind: 'heal',
      amount: Math.max(1, heal),
      label: `Поворот волны: +${Math.max(1, heal)} хитов`,
    }
  }
  if (t.includes('аура') && t.includes('защит') && !t.includes('маг')) {
    return {
      kind: 'buff',
      slug: 'aura_of_protection',
      name: 'Аура защиты',
      casterMod: Math.max(1, cha),
      targetsSelf: false,
      auraAllyDefaultOff: true,
    }
  }
  return { kind: 'none' }
}

/** True when this feature spend should default ally effect to «вне ауры». */
export function isAuraAllySlug(slug: string): boolean {
  return (
    slug === 'aura_of_protection' ||
    slug === 'aura_of_courage' ||
    slug === 'aura_of_devotion' ||
    slug === 'aura_of_warding' ||
    slug === 'aura_of_alacrity' ||
    slug === 'aura_of_the_sentinel' ||
    slug === 'exalted_champion'
  )
}
