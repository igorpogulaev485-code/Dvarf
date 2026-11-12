/**
 * B-08: map spent racial trait actions → ActiveEffect slugs / temp HP / heal.
 * Feature ids come from race trait_cards (`race:{id}`) or ClassFeaturesPanel.
 */
import {
  healingHandsDiceCount,
  hungryJawsTempHp,
  shifterTempHp,
} from '../../shared/dnd/b08RaceCombat'

export type B08SpendAction =
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

function normalizeRaceId(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/^race:/, '')
    .replace(/^race_grant:/, '')
}

/** After race trait card / ClassFeaturesPanel spend. */
export function resolveB08FeatureSpend(input: {
  featureId: string
  featureNameRu?: string
  characterLevel?: number
  proficiencyBonus?: number
  abilities?: { con?: number; cha?: number } | null
  raceSlug?: string | null
  revelationId?: string | null
  seasonId?: string | null
  rng?: () => number
}): B08SpendAction {
  const id = normalizeRaceId(input.featureId)
  const name = input.featureNameRu || ''
  const level = Math.max(1, Math.floor(input.characterLevel ?? 1))
  const pb = Math.max(2, Math.floor(input.proficiencyBonus ?? 2))
  const rng = input.rng ?? Math.random
  const revelation = (input.revelationId || '').trim() || 'heavenly_wings'
  const season = (input.seasonId || '').trim() || 'autumn'

  if (id === 'healing_hands' || /исцеляющ.*рук|целительн.*рук/i.test(name)) {
    const dice = healingHandsDiceCount(pb)
    let sum = 0
    for (let i = 0; i < dice; i += 1) sum += 1 + Math.floor(rng() * 4)
    return {
      kind: 'heal',
      amount: sum,
      label: `Исцеляющие руки: +${sum} хитов (${dice}к4)`,
    }
  }

  if (id === 'celestial_revelation' || /небесн.*откровен|сияющ.*душ|radiant_soul/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'celestial_revelation',
      name: 'Небесное откровение',
      option: revelation,
      classLevel: level,
      casterMod: pb,
      targetsSelf: true,
    }
  }

  if (id === 'radiant_soul') {
    return {
      kind: 'buff',
      slug: 'celestial_revelation',
      name: 'Небесное откровение',
      option: 'heavenly_wings',
      classLevel: level,
      casterMod: pb,
      targetsSelf: true,
    }
  }

  if (id === 'fey_step' || /шаг\s*фей/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'fey_step',
      name: 'Шаг фей',
      option: season,
      classLevel: level,
      casterMod: pb,
      targetsSelf: true,
    }
  }

  if (
    id === 'blessing_of_the_raven_queen' ||
    /благословен.*ворон/i.test(name)
  ) {
    return {
      kind: 'buff',
      slug: 'blessing_of_the_raven_queen',
      name: 'Благословение Королевы воронов',
      classLevel: level,
      casterMod: pb,
      targetsSelf: true,
    }
  }

  if (id === 'stones_endurance' || /каменн.*стойк|stone.?s?\s*endurance/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'stones_endurance',
      name: 'Каменная стойкость',
      casterMod: pb,
      targetsSelf: true,
    }
  }

  if (id === 'shifting' || id.startsWith('shifting_') || /^смещен/i.test(name)) {
    const opt =
      id.replace(/^shifting_?/, '') ||
      (/зверошкур|beasthide/i.test(name)
        ? 'beasthide'
        : /длиннозуб|longtooth/i.test(name)
          ? 'longtooth'
          : /быстроног|swiftstride/i.test(name)
            ? 'swiftstride'
            : /дикий|wildhunt/i.test(name)
              ? 'wildhunt'
              : 'base')
    return {
      kind: 'buff',
      slug: 'shifting',
      name: 'Смещение',
      option: opt === 'shifting' ? 'base' : opt,
      classLevel: level,
      casterMod: pb,
      targetsSelf: true,
    }
  }

  if (id === 'hungry_jaws' || /голодн.*челюст/i.test(name)) {
    const amount = hungryJawsTempHp(pb)
    return {
      kind: 'temp_hp',
      amount,
      label: `Голодные челюсти: ${amount} временных хитов`,
      forceReplace: true,
    }
  }

  if (id === 'feline_agility' || /кошач.*ловкост/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'feline_agility',
      name: 'Кошачья ловкость',
      targetsSelf: true,
    }
  }

  if (id === 'hidden_step' || /невидимый\s*шаг/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'hidden_step',
      name: 'Невидимый шаг',
      casterMod: pb,
      targetsSelf: true,
    }
  }

  if (id === 'fey_gift' || /дар\s*фей/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'fey_gift',
      name: 'Дар фей',
      option: 'hospitality',
      casterMod: pb,
      targetsSelf: false,
      maxTargets: 1,
    }
  }

  if (id === 'built_for_success' || /создан\s*для\s*успех/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'built_for_success',
      name: 'Создан для успеха',
      casterMod: pb,
      targetsSelf: true,
    }
  }

  if (id === 'starlight_step' || /зв[её]здн.*шаг/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'starlight_step',
      name: 'Звёздный шаг',
      casterMod: pb,
      targetsSelf: true,
    }
  }

  if (id === 'lucky_footwork' || /удачлив.*поступ/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'lucky_footwork',
      name: 'Удачливая поступь',
      targetsSelf: true,
    }
  }

  if (id === 'mingle_with_the_wind' || /слияние\s*с\s*ветр/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'mingle_with_the_wind',
      name: 'Слияние с ветром',
      targetsSelf: true,
    }
  }

  if (id === 'merge_with_stone' || /слияние\s*с\s*камн/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'merge_with_stone',
      name: 'Слияние с камнем',
      targetsSelf: true,
    }
  }

  if (id === 'forceful_presence' || /сила\s*личност/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'forceful_presence',
      name: 'Сила личности',
      targetsSelf: true,
    }
  }

  if (id === 'vengeful_assault' || /мстительн.*удар/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'vengeful_assault',
      name: 'Мстительный удар',
      targetsSelf: true,
    }
  }

  if (id === 'chromatic_warding' || /цветн.*защит/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'chromatic_warding',
      name: 'Цветная защита',
      targetsSelf: true,
    }
  }

  if (id === 'gem_flight' || /пол[её]т\s*самоцвет/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'gem_flight',
      name: 'Полёт самоцвета',
      classLevel: level,
      targetsSelf: true,
    }
  }

  if (id === 'githzerai_shield' || id === 'githzerai_psionics' || /псионик.*щит/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'githzerai_shield',
      name: 'Псионика гитцерая (Щит)',
      targetsSelf: true,
    }
  }

  if (id === 'simic_carapace' || /панцирь/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'simic_carapace',
      name: 'Панцирь',
      targetsSelf: true,
    }
  }

  if (id === 'unending_breath' || /нескончаем.*дыхан/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'unending_breath',
      name: 'Нескончаемое дыхание',
      targetsSelf: true,
    }
  }

  if (id === 'earth_walk' || /хождение\s*по\s*земле/i.test(name)) {
    return {
      kind: 'buff',
      slug: 'earth_walk',
      name: 'Хождение по земле',
      targetsSelf: true,
    }
  }

  // Shifting via temp HP helper for tests.
  if (id === 'shifting_temp') {
    const amount = shifterTempHp(pb)
    return {
      kind: 'temp_hp',
      amount,
      label: `Смещение: ${amount} временных хитов`,
    }
  }

  return { kind: 'none' }
}
