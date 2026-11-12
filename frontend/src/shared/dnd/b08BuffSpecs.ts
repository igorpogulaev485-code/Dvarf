/**
 * B-08: racial activatable buff specs (Lucky markers, Relentless, Stone's Endurance,
 * Shifting, Celestial Revelation, Fey Step, EEPC genasi spends…).
 * Wired via buildBuffEffect / guessBuffSlug after B-01 and beside B-07.
 */
import type { EffectDuration, SpellBuffSpec } from './activeEffects'
import type { BuffBuildContext } from './b02BuffSpecs'
import {
  healingHandsDiceCount,
  hungryJawsTempHp,
  shifterTempHp,
} from './b08RaceCombat'

function minutes(value: number): EffectDuration {
  return { unit: 'minutes', value, remaining_rounds: value * 10 }
}
function hours(value: number): EffectDuration {
  return { unit: 'hours', value, remaining_rounds: value * 600 }
}
function untilShortRest(): EffectDuration {
  return { unit: 'until_short_rest', value: 1 }
}
function untilLongRest(): EffectDuration {
  return { unit: 'until_long_rest', value: 1 }
}
function untilSourceTurn(): EffectDuration {
  return { unit: 'until_source_next_turn_end', value: 1, remaining_rounds: 1 }
}
function manual(): EffectDuration {
  return { unit: 'manual' }
}

type SpecBuilder = (ctx: BuffBuildContext) => SpellBuffSpec

function pbOf(ctx: BuffBuildContext, fallback = 2): number {
  if (typeof ctx.casterMod === 'number' && Number.isFinite(ctx.casterMod)) {
    return Math.max(1, Math.floor(ctx.casterMod))
  }
  return fallback
}

function levelOf(ctx: BuffBuildContext, fallback = 1): number {
  const n =
    typeof ctx.classLevel === 'number'
      ? ctx.classLevel
      : typeof ctx.slotLevel === 'number'
        ? ctx.slotLevel
        : fallback
  return Math.max(1, Math.floor(n))
}

function optionOf(ctx: BuffBuildContext): string {
  return String(ctx.option || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
}

export const B08_BUFF_SPEC_BUILDERS: Record<string, SpecBuilder> = {
  /** Spent marker after Relentless Endurance fires (1/LR). */
  relentless_endurance_spent: (_ctx) => ({
    name: 'Непоколебимая стойкость (израсходована)',
    slug: 'relentless_endurance_spent',
    kind: 'race',
    concentration: false,
    duration: untilLongRest(),
    mods: [{ target: 'label', op: 'set', condition: 'relentless_endurance_spent' }],
  }),

  /** Halfling Lucky offered/used this roll — optional spent marker (trait is at-will). */
  halfling_lucky: (_ctx) => ({
    name: 'Удача',
    slug: 'halfling_lucky',
    kind: 'race',
    concentration: false,
    duration: manual(),
    mods: [{ target: 'label', op: 'set', condition: 'halfling_lucky' }],
  }),

  stones_endurance: (_ctx) => ({
    name: 'Каменная стойкость',
    slug: 'stones_endurance',
    kind: 'race',
    concentration: false,
    duration: manual(),
    mods: [
      {
        target: 'label',
        op: 'set',
        condition: 'stones_endurance_reaction',
      },
    ],
  }),

  shifting: (ctx) => {
    const temp = shifterTempHp(pbOf(ctx, 2))
    const opt = optionOf(ctx)
    const mods: SpellBuffSpec['mods'] = [
      { target: 'temp_hp', op: 'set', value: temp },
      { target: 'label', op: 'set', condition: `shifting_${opt || 'base'}` },
    ]
    if (opt === 'beasthide' || opt === 'зверошкур') {
      mods.push({ target: 'ac', op: 'add', value: 1 })
      mods.push({
        target: 'temp_hp',
        op: 'set',
        value: temp + Math.max(0, levelOf(ctx, 1)), // beasthide often +Con; keep PB*2 + level floor via option
      })
    }
    return {
      name: 'Смещение',
      slug: 'shifting',
      kind: 'race',
      concentration: false,
      duration: minutes(1),
      mods,
    }
  },

  hungry_jaws: (ctx) => ({
    name: 'Голодные челюсти',
    slug: 'hungry_jaws',
    kind: 'race',
    concentration: false,
    duration: untilLongRest(),
    mods: [
      { target: 'temp_hp', op: 'set', value: hungryJawsTempHp(pbOf(ctx, 2)) },
      { target: 'label', op: 'set', condition: 'hungry_jaws' },
    ],
  }),

  feline_agility: (_ctx) => ({
    name: 'Кошачья ловкость',
    slug: 'feline_agility',
    kind: 'race',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [
      { target: 'speed', op: 'mul', value: 2 },
      { target: 'label', op: 'set', condition: 'feline_agility' },
    ],
  }),

  celestial_revelation: (ctx) => {
    const opt = optionOf(ctx)
    const mods: SpellBuffSpec['mods'] = [
      { target: 'label', op: 'set', condition: `celestial_revelation_${opt || 'active'}` },
    ]
    if (opt === 'heavenly_wings' || opt === 'небесные_крылья' || opt === 'radiant_soul') {
      mods.push({ target: 'fly_speed', op: 'set', condition: 'equal_walk' })
    }
    if (opt === 'inner_radiance' || opt === 'внутреннее_сияние') {
      mods.push({
        target: 'label',
        op: 'set',
        condition: 'celestial_revelation_radiance_damage',
      })
    }
    if (opt === 'necrotic_shroud' || opt === 'некротический_покров') {
      mods.push({
        target: 'label',
        op: 'set',
        condition: 'celestial_revelation_shroud',
      })
    }
    return {
      name: 'Небесное откровение',
      slug: 'celestial_revelation',
      kind: 'race',
      concentration: false,
      duration: minutes(1),
      mods,
    }
  },

  healing_hands: (ctx) => {
    const n = healingHandsDiceCount(pbOf(ctx, 2))
    return {
      name: 'Исцеляющие руки',
      slug: 'healing_hands',
      kind: 'race',
      concentration: false,
      duration: manual(),
      mods: [
        {
          target: 'label',
          op: 'set',
          condition: `healing_hands_${n}d4`,
        },
      ],
    }
  },

  fey_step: (ctx) => {
    const opt = optionOf(ctx)
    return {
      name: 'Шаг фей',
      slug: 'fey_step',
      kind: 'race',
      concentration: false,
      duration: untilSourceTurn(),
      mods: [
        { target: 'label', op: 'set', condition: `fey_step_${opt || 'teleport'}` },
      ],
    }
  },

  blessing_of_the_raven_queen: (ctx) => {
    const level = levelOf(ctx, 1)
    const mods: SpellBuffSpec['mods'] = [
      { target: 'label', op: 'set', condition: 'blessing_of_the_raven_queen' },
    ]
    if (level >= 3) {
      mods.push({
        target: 'resistance',
        op: 'set',
        condition: 'all',
      })
    }
    return {
      name: 'Благословение Королевы воронов',
      slug: 'blessing_of_the_raven_queen',
      kind: 'race',
      concentration: false,
      duration: untilSourceTurn(),
      mods,
    }
  },

  hidden_step: (_ctx) => ({
    name: 'Невидимый шаг',
    slug: 'hidden_step',
    kind: 'race',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [{ target: 'label', op: 'set', condition: 'invisible_hidden_step' }],
  }),

  fey_gift: (ctx) => {
    const opt = optionOf(ctx)
    const pb = pbOf(ctx, 2)
    const mods: SpellBuffSpec['mods'] = [
      { target: 'label', op: 'set', condition: `fey_gift_${opt || 'help'}` },
    ]
    if (opt === 'hospitality' || opt === 'гостеприимство') {
      mods.push({ target: 'temp_hp', op: 'set', value: pb })
    }
    if (opt === 'passage' || opt === 'проход') {
      mods.push({ target: 'speed', op: 'add', value: 10 })
    }
    return {
      name: 'Дар фей',
      slug: 'fey_gift',
      kind: 'race',
      concentration: false,
      duration: untilSourceTurn(),
      mods,
    }
  },

  built_for_success: (_ctx) => ({
    name: 'Создан для успеха',
    slug: 'built_for_success',
    kind: 'race',
    concentration: false,
    duration: manual(),
    mods: [
      {
        target: 'attack_save',
        op: 'roll_die',
        dice: '1к4',
        once: true,
      },
      {
        target: 'check',
        op: 'roll_die',
        dice: '1к4',
        once: true,
      },
      {
        target: 'save',
        op: 'roll_die',
        dice: '1к4',
        once: true,
      },
    ],
    charges: 1,
  }),

  starlight_step: (_ctx) => ({
    name: 'Звёздный шаг',
    slug: 'starlight_step',
    kind: 'race',
    concentration: false,
    duration: manual(),
    mods: [{ target: 'label', op: 'set', condition: 'starlight_step' }],
  }),

  lucky_footwork: (_ctx) => ({
    name: 'Удачливая поступь',
    slug: 'lucky_footwork',
    kind: 'race',
    concentration: false,
    duration: manual(),
    mods: [
      {
        target: 'save',
        op: 'roll_die',
        dice: '1к4',
        once: true,
        condition: 'dex',
      },
    ],
    charges: 1,
  }),

  fortune_from_the_many: (_ctx) => ({
    name: 'Удача множества',
    slug: 'fortune_from_the_many',
    kind: 'race',
    concentration: false,
    duration: manual(),
    mods: [
      {
        target: 'label',
        op: 'set',
        condition: 'fortune_from_the_many_plus_allies',
      },
    ],
  }),

  mingle_with_the_wind: (_ctx) => ({
    name: 'Слияние с ветром',
    slug: 'mingle_with_the_wind',
    kind: 'race',
    concentration: true,
    duration: minutes(10),
    mods: [
      { target: 'label', op: 'set', condition: 'levitate_self' },
      { target: 'fly_speed', op: 'set', value: 20, condition: 'levitate' },
    ],
  }),

  merge_with_stone: (_ctx) => ({
    name: 'Слияние с камнем',
    slug: 'merge_with_stone',
    kind: 'race',
    concentration: true,
    duration: hours(1),
    mods: [
      {
        target: 'check',
        op: 'add',
        value: 10,
        condition: 'stealth',
      },
      {
        target: 'label',
        op: 'set',
        condition: 'pass_without_trace_aura_30',
      },
    ],
  }),

  forceful_presence: (_ctx) => ({
    name: 'Сила личности',
    slug: 'forceful_presence',
    kind: 'race',
    concentration: false,
    duration: untilShortRest(),
    mods: [
      {
        target: 'check',
        op: 'advantage',
        condition: 'intimidation_or_persuasion',
        once: true,
      },
    ],
    charges: 1,
  }),

  vengeful_assault: (_ctx) => ({
    name: 'Мстительный удар',
    slug: 'vengeful_assault',
    kind: 'race',
    concentration: false,
    duration: untilShortRest(),
    mods: [{ target: 'label', op: 'set', condition: 'vengeful_assault_spent' }],
  }),

  chromatic_warding: (ctx) => {
    const opt = optionOf(ctx) || 'ancestry'
    return {
      name: 'Цветная защита',
      slug: 'chromatic_warding',
      kind: 'race',
      concentration: false,
      duration: minutes(1),
      mods: [
        { target: 'immunity', op: 'set', condition: opt },
        { target: 'label', op: 'set', condition: `chromatic_warding_${opt}` },
      ],
    }
  },

  gem_flight: (_ctx) => ({
    name: 'Полёт самоцвета',
    slug: 'gem_flight',
    kind: 'race',
    concentration: false,
    duration: minutes(1),
    mods: [
      { target: 'fly_speed', op: 'set', condition: 'equal_walk' },
      { target: 'label', op: 'set', condition: 'gem_flight' },
    ],
  }),

  githzerai_shield: (_ctx) => ({
    name: 'Псионика гитцерая (Щит)',
    slug: 'githzerai_shield',
    kind: 'race',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [{ target: 'ac', op: 'add', value: 5 }],
  }),

  simic_carapace: (_ctx) => ({
    name: 'Панцирь',
    slug: 'simic_carapace',
    kind: 'race',
    concentration: false,
    duration: untilLongRest(),
    mods: [
      {
        target: 'ac',
        op: 'add',
        value: 1,
        condition: 'no_heavy_armor',
      },
    ],
  }),

  unending_breath: (_ctx) => ({
    name: 'Нескончаемое дыхание',
    slug: 'unending_breath',
    kind: 'race',
    concentration: false,
    duration: untilLongRest(),
    mods: [{ target: 'label', op: 'set', condition: 'unending_breath' }],
  }),

  earth_walk: (_ctx) => ({
    name: 'Хождение по земле',
    slug: 'earth_walk',
    kind: 'race',
    concentration: false,
    duration: untilLongRest(),
    mods: [{ target: 'label', op: 'set', condition: 'earth_walk' }],
  }),
}

export function buildB08BuffSpec(
  slug: string,
  ctx: BuffBuildContext = {},
): SpellBuffSpec | null {
  const builder = B08_BUFF_SPEC_BUILDERS[slug]
  if (!builder) return null
  return builder(ctx)
}

export const B08_NAME_TO_SLUG: Array<{ re: RegExp; slug: string }> = [
  { re: /^непоколебим.*стойк/i, slug: 'relentless_endurance_spent' },
  { re: /^удача$/i, slug: 'halfling_lucky' },
  { re: /^каменн.*стойк/i, slug: 'stones_endurance' },
  { re: /^смещен/i, slug: 'shifting' },
  { re: /^голодн.*челюст/i, slug: 'hungry_jaws' },
  { re: /^кошач.*ловкост/i, slug: 'feline_agility' },
  { re: /^небесн.*откровен/i, slug: 'celestial_revelation' },
  { re: /^исцеляющ.*рук/i, slug: 'healing_hands' },
  { re: /^целительн.*рук/i, slug: 'healing_hands' },
  { re: /^шаг\s*фей/i, slug: 'fey_step' },
  { re: /^благословен.*королев.*ворон/i, slug: 'blessing_of_the_raven_queen' },
  { re: /^невидимый\s*шаг/i, slug: 'hidden_step' },
  { re: /^дар\s*фей/i, slug: 'fey_gift' },
  { re: /^создан\s*для\s*успех/i, slug: 'built_for_success' },
  { re: /^зв[её]здн.*шаг/i, slug: 'starlight_step' },
  { re: /^удачлив.*поступ/i, slug: 'lucky_footwork' },
  { re: /^удача\s*множеств/i, slug: 'fortune_from_the_many' },
  { re: /^слияние\s*с\s*ветр/i, slug: 'mingle_with_the_wind' },
  { re: /^слияние\s*с\s*камн/i, slug: 'merge_with_stone' },
  { re: /^сила\s*личност/i, slug: 'forceful_presence' },
  { re: /^мстительн.*удар/i, slug: 'vengeful_assault' },
  { re: /^цветн.*защит/i, slug: 'chromatic_warding' },
  { re: /^пол[её]т\s*самоцвет/i, slug: 'gem_flight' },
  { re: /^псионик.*щит/i, slug: 'githzerai_shield' },
  { re: /^панцирь/i, slug: 'simic_carapace' },
  { re: /^нескончаем.*дыхан/i, slug: 'unending_breath' },
  { re: /^хождение\s*по\s*земле/i, slug: 'earth_walk' },
]
