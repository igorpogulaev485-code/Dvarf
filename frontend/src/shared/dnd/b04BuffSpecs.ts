/**
 * B-04: class feature buff specs (barbarian / bard / cleric / druid / fighter / monk).
 * Looked up via buildBuffEffect / guessBuffSlug alongside B01–B03.
 */
import type { EffectDuration, EffectMod, SpellBuffSpec } from './activeEffects'
import type { BuffBuildContext } from './b02BuffSpecs'

function minutes(value: number): EffectDuration {
  return { unit: 'minutes', value, remaining_rounds: value * 10 }
}
function hours(value: number): EffectDuration {
  return { unit: 'hours', value, remaining_rounds: value * 600 }
}
function rounds(value: number): EffectDuration {
  return { unit: 'rounds', value, remaining_rounds: value }
}
function untilSourceTurn(): EffectDuration {
  return { unit: 'until_source_next_turn_end', value: 1, remaining_rounds: 1 }
}
function untilLongRest(): EffectDuration {
  return { unit: 'until_long_rest', value: 1 }
}
function permanent(): EffectDuration {
  return { unit: 'permanent' }
}

type SpecBuilder = (ctx: BuffBuildContext) => SpellBuffSpec

function classLevelOf(ctx: BuffBuildContext, fallback = 1): number {
  const n =
    typeof ctx.classLevel === 'number'
      ? ctx.classLevel
      : typeof ctx.casterMod === 'number'
        ? ctx.casterMod
        : fallback
  return Math.max(1, Math.floor(n))
}

/** PHB rage melee Strength damage bonus by barbarian level. */
export function rageDamageBonus(barbarianLevel: number): number {
  const level = Math.max(1, Math.floor(barbarianLevel))
  if (level >= 16) return 4
  if (level >= 9) return 3
  return 2
}

function normalizeInspirationDie(raw: string | null | undefined): string {
  const t = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/к/g, 'd')
  const m = t.match(/^(\d*)d(4|6|8|10|12)$/i)
  if (m) return `${m[1] || '1'}d${m[2]}`
  if (/12/.test(t)) return '1d12'
  if (/10/.test(t)) return '1d10'
  if (/8/.test(t)) return '1d8'
  return '1d6'
}

function totemOption(ctx: BuffBuildContext): string {
  return String(ctx.option || '')
    .trim()
    .toLowerCase()
}

/** Static or context-aware specs for B-04 catalog rows. */
export const B04_BUFF_SPEC_BUILDERS: Record<string, SpecBuilder> = {
  rage: (ctx) => {
    const level = classLevelOf(ctx, 1)
    const dmg = rageDamageBonus(level)
    const totem = totemOption(ctx)
    const mods: EffectMod[] = [
      { target: 'advantage', op: 'advantage', condition: 'str' },
      {
        target: 'save',
        op: 'advantage',
        condition: 'str',
      },
      {
        target: 'weapon_damage',
        op: 'add',
        value: dmg,
        condition: 'melee_str',
      },
      { target: 'resistance', op: 'set', condition: 'bludgeoning' },
      { target: 'resistance', op: 'set', condition: 'piercing' },
      { target: 'resistance', op: 'set', condition: 'slashing' },
      { target: 'label', op: 'set', condition: 'rage_no_concentrate' },
    ]
    if (totem === 'bear' || totem === 'медведь') {
      // Bear replaces B/P/S with resist everything except psychic.
      const filtered = mods.filter((m) => m.target !== 'resistance')
      for (const type of [
        'acid',
        'bludgeoning',
        'cold',
        'fire',
        'force',
        'lightning',
        'necrotic',
        'piercing',
        'poison',
        'radiant',
        'slashing',
        'thunder',
      ]) {
        filtered.push({ target: 'resistance', op: 'set', condition: type })
      }
      return {
        name: 'Ярость',
        slug: 'rage',
        kind: 'feature',
        concentration: false,
        duration: minutes(1),
        mods: filtered,
      }
    }
    if (totem === 'elk' || totem === 'лось') {
      mods.push({
        target: 'speed',
        op: 'add',
        value: 15,
        condition: 'no_heavy_armor',
      })
    }
    return {
      name: 'Ярость',
      slug: 'rage',
      kind: 'feature',
      concentration: false,
      duration: minutes(1),
      mods,
    }
  },
  reckless_attack: () => ({
    name: 'Безрассудная атака',
    slug: 'reckless_attack',
    kind: 'feature',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [
      {
        target: 'advantage',
        op: 'advantage',
        condition: 'str_attack',
      },
      {
        target: 'label',
        op: 'set',
        condition: 'attacks_vs_you',
      },
    ],
  }),
  danger_sense: () => ({
    name: 'Чувство опасности',
    slug: 'danger_sense',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [
      {
        target: 'save',
        op: 'advantage',
        condition: 'dex',
      },
      {
        target: 'label',
        op: 'set',
        condition: 'danger_sense',
      },
    ],
  }),
  zealous_presence: () => ({
    name: 'Ревностное присутствие',
    slug: 'zealous_presence',
    kind: 'feature',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [
      { target: 'advantage', op: 'advantage', condition: 'attack' },
      { target: 'save', op: 'advantage', condition: 'all' },
    ],
  }),
  call_the_hunt: (ctx) => {
    const allies = Math.max(0, Math.floor(Number(ctx.option) || 0))
    const temp = 5 * Math.max(1, allies || 1)
    return {
      name: 'Зов охоты',
      slug: 'call_the_hunt',
      kind: 'feature',
      concentration: false,
      duration: minutes(1),
      mods: [
        { target: 'temp_hp', op: 'set', value: temp },
        {
          target: 'weapon_damage',
          op: 'roll_die',
          dice: '1d6',
          condition: 'once_per_turn',
          once: true,
        },
      ],
    }
  },
  call_the_hunt_self: (ctx) => {
    const allies = Math.max(1, Math.floor(Number(ctx.option) || 1))
    return {
      name: 'Зов охоты',
      slug: 'call_the_hunt_self',
      kind: 'feature',
      concentration: false,
      duration: minutes(1),
      mods: [{ target: 'temp_hp', op: 'set', value: 5 * allies }],
    }
  },
  storm_aura_tundra: (ctx) => {
    const level = classLevelOf(ctx, 3)
    const temp = level >= 15 ? 5 : level >= 10 ? 4 : level >= 5 ? 3 : 2
    return {
      name: 'Аура шторма (тундра)',
      slug: 'storm_aura_tundra',
      kind: 'feature',
      concentration: false,
      duration: minutes(1),
      mods: [{ target: 'temp_hp', op: 'set', value: temp }],
    }
  },
  bolstering_magic: () => ({
    name: 'Подкрепляющая магия',
    slug: 'bolstering_magic',
    kind: 'feature',
    concentration: false,
    duration: minutes(10),
    mods: [
      {
        target: 'attack',
        op: 'roll_die',
        dice: '1d4',
        once: true,
      },
      {
        target: 'check',
        op: 'roll_die',
        dice: '1d4',
        once: true,
      },
    ],
  }),
  reckless_abandon: (ctx) => {
    const conMod = Math.max(0, Math.floor(ctx.casterMod ?? 0))
    return {
      name: 'Полное безрассудство',
      slug: 'reckless_abandon',
      kind: 'feature',
      concentration: false,
      duration: minutes(1),
      mods: [{ target: 'temp_hp', op: 'set', value: Math.max(1, conMod) }],
    }
  },
  spiked_retribution: () => ({
    name: 'Шипованная расплата',
    slug: 'spiked_retribution',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [{ target: 'label', op: 'set', condition: 'spiked_retribution_3' }],
  }),
  giants_havoc: () => ({
    name: 'Великанье разрушение',
    slug: 'giants_havoc',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [
      { target: 'label', op: 'set', condition: 'reach_plus_5' },
      { target: 'label', op: 'set', condition: 'large_while_raging' },
    ],
  }),
  demiurgic_colossus: () => ({
    name: 'Демиург-колосс',
    slug: 'demiurgic_colossus',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [
      { target: 'label', op: 'set', condition: 'huge_while_raging' },
      { target: 'label', op: 'set', condition: 'reach_plus_10' },
    ],
  }),

  bardic_inspiration: (ctx) => {
    const die = normalizeInspirationDie(ctx.option)
    return {
      name: 'Бардовское вдохновение',
      slug: 'bardic_inspiration',
      kind: 'feature',
      concentration: false,
      duration: minutes(10),
      mods: [
        {
          target: 'attack_save',
          op: 'roll_die',
          dice: die,
          once: true,
        },
        {
          target: 'check',
          op: 'roll_die',
          dice: die,
          once: true,
        },
      ],
    }
  },
  combat_inspiration: (ctx) => {
    const die = normalizeInspirationDie(ctx.option)
    return {
      name: 'Боевое вдохновение',
      slug: 'combat_inspiration',
      kind: 'feature',
      concentration: false,
      duration: minutes(10),
      mods: [
        {
          target: 'attack_save',
          op: 'roll_die',
          dice: die,
          once: true,
        },
        {
          target: 'check',
          op: 'roll_die',
          dice: die,
          once: true,
        },
        {
          target: 'weapon_damage',
          op: 'roll_die',
          dice: die,
          once: true,
          condition: 'combat_inspiration_damage',
        },
        {
          target: 'ac',
          op: 'roll_die',
          dice: die,
          once: true,
          condition: 'combat_inspiration_ac',
        },
        {
          target: 'label',
          op: 'set',
          condition: 'combat_inspiration',
        },
      ],
    }
  },
  mote_of_potential: (ctx) => {
    const die = normalizeInspirationDie(ctx.option)
    return {
      name: 'Частица потенциала',
      slug: 'mote_of_potential',
      kind: 'feature',
      concentration: false,
      duration: minutes(10),
      mods: [
        {
          target: 'attack_save',
          op: 'roll_die',
          dice: die,
          once: true,
        },
        {
          target: 'check',
          op: 'roll_die',
          dice: die,
          once: true,
        },
        {
          target: 'label',
          op: 'set',
          condition: 'mote_of_potential',
        },
      ],
    }
  },
  unfailing_inspiration: () => ({
    name: 'Неисчерпаемое вдохновение',
    slug: 'unfailing_inspiration',
    kind: 'feature',
    concentration: false,
    duration: minutes(10),
    mods: [{ target: 'label', op: 'set', condition: 'unfailing_inspiration' }],
  }),
  song_of_rest: (ctx) => {
    const die = normalizeInspirationDie(ctx.option || '1d6')
    return {
      name: 'Песнь отдыха',
      slug: 'song_of_rest',
      kind: 'feature',
      concentration: false,
      duration: { unit: 'until_short_rest', value: 1 },
      mods: [{ target: 'label', op: 'set', condition: `song_of_rest_${die}` }],
    }
  },
  countercharm: () => ({
    name: 'Контрчары',
    slug: 'countercharm',
    kind: 'feature',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [
      {
        target: 'save',
        op: 'advantage',
        condition: 'charmed_frightened',
      },
      { target: 'label', op: 'set', condition: 'countercharm' },
    ],
  }),
  mantle_of_inspiration: (ctx) => {
    const level = classLevelOf(ctx, 3)
    return {
      name: 'Мантия вдохновения',
      slug: 'mantle_of_inspiration',
      kind: 'feature',
      concentration: false,
      duration: hours(1),
      mods: [
        { target: 'temp_hp', op: 'set', value: 2 * level },
        { target: 'label', op: 'set', condition: 'mantle_move_no_oa' },
      ],
    }
  },
  defensive_flourish: (ctx) => {
    const rolled = Math.max(1, Math.floor(Number(ctx.option) || 0))
    return {
      name: 'Защитный расцвет',
      slug: 'defensive_flourish',
      kind: 'feature',
      concentration: false,
      duration: untilSourceTurn(),
      mods: [{ target: 'ac', op: 'add', value: rolled || 1 }],
    }
  },
  tales_from_beyond: () => ({
    name: 'Истории с того света',
    slug: 'tales_from_beyond',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [{ target: 'label', op: 'set', condition: 'tales_from_beyond' }],
  }),

  guided_strike: () => ({
    name: 'Направленный удар',
    slug: 'guided_strike',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [
      {
        target: 'attack',
        op: 'add',
        value: 10,
        once: true,
        condition: 'guided_strike',
      },
    ],
  }),
  war_gods_blessing: () => ({
    name: 'Благословение бога войны',
    slug: 'war_gods_blessing',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [
      {
        target: 'attack',
        op: 'add',
        value: 10,
        once: true,
        condition: 'war_gods_blessing',
      },
    ],
  }),
  dampen_elements: (ctx) => {
    const type = String(ctx.option || 'fire').trim().toLowerCase() || 'fire'
    return {
      name: 'Приглушение стихий',
      slug: 'dampen_elements',
      kind: 'feature',
      concentration: false,
      duration: rounds(1),
      mods: [{ target: 'resistance', op: 'set', condition: type }],
    }
  },
  blessing_of_the_trickster: () => ({
    name: 'Благословение проказника',
    slug: 'blessing_of_the_trickster',
    kind: 'feature',
    concentration: false,
    duration: hours(1),
    mods: [
      {
        target: 'advantage',
        op: 'advantage',
        condition: 'stealth',
      },
    ],
  }),
  blessing_of_the_forge: () => ({
    name: 'Благословение кузницы',
    slug: 'blessing_of_the_forge',
    kind: 'feature',
    concentration: false,
    duration: untilLongRest(),
    mods: [{ target: 'label', op: 'set', condition: 'blessing_of_the_forge' }],
  }),
  sentinel_at_deaths_door: () => ({
    name: 'Страж на пороге смерти',
    slug: 'sentinel_at_deaths_door',
    kind: 'feature',
    concentration: false,
    duration: rounds(1),
    mods: [{ target: 'label', op: 'set', condition: 'crit_to_hit' }],
  }),
  eyes_of_night: () => ({
    name: 'Глаза ночи',
    slug: 'eyes_of_night',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'senses', op: 'set', value: 300, condition: 'darkvision' }],
  }),
  eyes_of_night_share: () => ({
    name: 'Глаза ночи (передача)',
    slug: 'eyes_of_night_share',
    kind: 'feature',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'senses', op: 'set', value: 300, condition: 'darkvision' }],
  }),
  vigilant_blessing: () => ({
    name: 'Благословение бдительности',
    slug: 'vigilant_blessing',
    kind: 'feature',
    concentration: false,
    duration: untilLongRest(),
    mods: [
      {
        target: 'advantage',
        op: 'advantage',
        condition: 'initiative',
        once: true,
      },
    ],
  }),
  twilight_sanctuary: (ctx) => {
    const level = classLevelOf(ctx, 2)
    return {
      name: 'Сумеречное святилище',
      slug: 'twilight_sanctuary',
      kind: 'feature',
      concentration: false,
      duration: minutes(1),
      mods: [
        {
          target: 'temp_hp',
          op: 'roll_die',
          dice: '1d6',
          value: level,
        },
        { target: 'label', op: 'set', condition: 'twilight_sanctuary' },
      ],
    }
  },
  voice_of_authority: () => ({
    name: 'Голос авторитета',
    slug: 'voice_of_authority',
    kind: 'feature',
    concentration: false,
    duration: rounds(1),
    mods: [{ target: 'label', op: 'set', condition: 'voice_of_authority' }],
  }),
  spell_breaker: () => ({
    name: 'Разрушитель заклинаний',
    slug: 'spell_breaker',
    kind: 'feature',
    concentration: false,
    duration: rounds(1),
    mods: [{ target: 'label', op: 'set', condition: 'spell_breaker' }],
  }),

  spirit_totem_bear: (ctx) => {
    const level = classLevelOf(ctx, 2)
    return {
      name: 'Тотем духа (медведь)',
      slug: 'spirit_totem_bear',
      kind: 'feature',
      concentration: false,
      duration: minutes(1),
      mods: [
        { target: 'temp_hp', op: 'set', value: 5 + level },
        { target: 'advantage', op: 'advantage', condition: 'str' },
        { target: 'save', op: 'advantage', condition: 'str' },
        { target: 'label', op: 'set', condition: 'spirit_totem_bear' },
      ],
    }
  },
  spirit_totem_hawk: () => ({
    name: 'Тотем духа (ястреб)',
    slug: 'spirit_totem_hawk',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [
      {
        target: 'advantage',
        op: 'advantage',
        condition: 'attack',
        once: true,
      },
      { target: 'label', op: 'set', condition: 'spirit_totem_hawk' },
    ],
  }),
  spirit_totem_unicorn: () => ({
    name: 'Тотем духа (единорог)',
    slug: 'spirit_totem_unicorn',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [
      {
        target: 'advantage',
        op: 'advantage',
        condition: 'all',
      },
      { target: 'label', op: 'set', condition: 'spirit_totem_unicorn' },
    ],
  }),
  hearth_of_moonlight_and_shadow: () => ({
    name: 'Очаг лунного света и тени',
    slug: 'hearth_of_moonlight_and_shadow',
    kind: 'feature',
    concentration: false,
    duration: { unit: 'until_short_rest', value: 1 },
    mods: [
      { target: 'skill', op: 'add', value: 5, condition: 'stealth' },
      { target: 'skill', op: 'add', value: 5, condition: 'perception' },
    ],
  }),
  starry_form_archer: (ctx) => {
    const level = classLevelOf(ctx, 2)
    const dice = level >= 10 ? '2d8' : '1d8'
    return {
      name: 'Звёздный облик (Лучник)',
      slug: 'starry_form_archer',
      kind: 'feature',
      concentration: false,
      duration: minutes(10),
      mods: [
        {
          target: 'label',
          op: 'set',
          condition: `starry_archer_${dice}`,
        },
      ],
    }
  },
  starry_form_chalice: () => ({
    name: 'Звёздный облик (Чаша)',
    slug: 'starry_form_chalice',
    kind: 'feature',
    concentration: false,
    duration: minutes(10),
    mods: [
      {
        target: 'label',
        op: 'set',
        condition: 'starry_chalice_1d8',
      },
    ],
  }),
  starry_form_dragon: () => ({
    name: 'Звёздный облик (Дракон)',
    slug: 'starry_form_dragon',
    kind: 'feature',
    concentration: false,
    duration: minutes(10),
    mods: [
      {
        target: 'label',
        op: 'set',
        condition: 'starry_dragon_floor_10',
      },
    ],
  }),
  cosmic_omen_weal: () => ({
    name: 'Космическое знамение (Благо)',
    slug: 'cosmic_omen_weal',
    kind: 'feature',
    concentration: false,
    duration: untilLongRest(),
    mods: [
      {
        target: 'attack_save',
        op: 'roll_die',
        dice: '1d6',
        once: true,
      },
      {
        target: 'check',
        op: 'roll_die',
        dice: '1d6',
        once: true,
      },
    ],
  }),
  cosmic_omen_woe: () => ({
    name: 'Космическое знамение (Напасть)',
    slug: 'cosmic_omen_woe',
    kind: 'feature',
    concentration: false,
    duration: untilLongRest(),
    mods: [{ target: 'label', op: 'set', condition: 'cosmic_omen_woe' }],
  }),
  symbiotic_entity: (ctx) => {
    const level = classLevelOf(ctx, 2)
    return {
      name: 'Симбиотическая сущность',
      slug: 'symbiotic_entity',
      kind: 'feature',
      concentration: false,
      duration: minutes(10),
      mods: [
        { target: 'temp_hp', op: 'set', value: 4 * level },
        {
          target: 'weapon_damage',
          op: 'roll_die',
          dice: '1d6',
          condition: 'necrotic',
        },
        { target: 'label', op: 'set', condition: 'halo_of_spores_doubled' },
      ],
    }
  },
  enhanced_bond: () => ({
    name: 'Усиленная связь',
    slug: 'enhanced_bond',
    kind: 'feature',
    concentration: false,
    duration: hours(1),
    mods: [
      {
        target: 'label',
        op: 'set',
        condition: 'enhanced_bond_1d8',
      },
    ],
  }),

  fighting_spirit: (ctx) => {
    const level = classLevelOf(ctx, 3)
    const temp = level >= 15 ? 15 : level >= 10 ? 10 : 5
    return {
      name: 'Боевой дух',
      slug: 'fighting_spirit',
      kind: 'feature',
      concentration: false,
      duration: untilSourceTurn(),
      mods: [
        {
          target: 'advantage',
          op: 'advantage',
          condition: 'weapon_attack',
        },
        { target: 'temp_hp', op: 'set', value: temp },
      ],
    }
  },
  rally: (ctx) => {
    const die = normalizeInspirationDie(ctx.option || '1d8')
    const cha = Math.floor(ctx.casterMod ?? 0)
    return {
      name: 'Сплочение',
      slug: 'rally',
      kind: 'feature',
      concentration: false,
      duration: hours(1),
      mods: [
        {
          target: 'temp_hp',
          op: 'roll_die',
          dice: die,
          value: cha,
        },
      ],
    }
  },
  precision_attack: (ctx) => {
    const die = normalizeInspirationDie(ctx.option || '1d8')
    return {
      name: 'Точная атака',
      slug: 'precision_attack',
      kind: 'feature',
      concentration: false,
      duration: rounds(1),
      mods: [
        {
          target: 'attack',
          op: 'roll_die',
          dice: die,
          once: true,
        },
      ],
    }
  },
  parry: () => ({
    name: 'Парирование',
    slug: 'parry',
    kind: 'feature',
    concentration: false,
    duration: rounds(1),
    mods: [{ target: 'label', op: 'set', condition: 'parry' }],
  }),
  evasive_footwork: (ctx) => {
    const die = normalizeInspirationDie(ctx.option || '1d8')
    // Bake average placeholder; real AC uses rolled die via option value when known.
    const rolled = Math.max(1, Math.floor(Number(ctx.casterMod) || 0))
    return {
      name: 'Уклонение в движении',
      slug: 'evasive_footwork',
      kind: 'feature',
      concentration: false,
      duration: untilSourceTurn(),
      mods:
        rolled > 0
          ? [{ target: 'ac', op: 'add', value: rolled }]
          : [
              {
                target: 'ac',
                op: 'roll_die',
                dice: die,
              },
              { target: 'label', op: 'set', condition: `evasive_footwork_${die}` },
            ],
    }
  },
  bait_and_switch: (ctx) => {
    const rolled = Math.max(1, Math.floor(Number(ctx.option) || Number(ctx.casterMod) || 1))
    return {
      name: 'Приманка и замена',
      slug: 'bait_and_switch',
      kind: 'feature',
      concentration: false,
      duration: untilSourceTurn(),
      mods: [{ target: 'ac', op: 'add', value: rolled }],
    }
  },
  warding_maneuver: () => ({
    name: 'Оборонительный манёвр',
    slug: 'warding_maneuver',
    kind: 'feature',
    concentration: false,
    duration: rounds(1),
    mods: [
      {
        target: 'ac',
        op: 'roll_die',
        dice: '1d8',
        once: true,
      },
      { target: 'label', op: 'set', condition: 'warding_maneuver_resist' },
    ],
  }),
  runic_shield: () => ({
    name: 'Рунический щит',
    slug: 'runic_shield',
    kind: 'feature',
    concentration: false,
    duration: rounds(1),
    mods: [{ target: 'label', op: 'set', condition: 'runic_shield' }],
  }),
  protective_field: () => ({
    name: 'Защитное поле',
    slug: 'protective_field',
    kind: 'feature',
    concentration: false,
    duration: rounds(1),
    mods: [{ target: 'label', op: 'set', condition: 'protective_field' }],
  }),
  giants_might: (ctx) => {
    const level = classLevelOf(ctx, 3)
    const dice = level >= 18 ? '1d10' : level >= 10 ? '1d8' : '1d6'
    return {
      name: 'Исполинская мощь',
      slug: 'giants_might',
      kind: 'feature',
      concentration: false,
      duration: minutes(1),
      mods: [
        { target: 'advantage', op: 'advantage', condition: 'str' },
        { target: 'save', op: 'advantage', condition: 'str' },
        {
          target: 'weapon_damage',
          op: 'roll_die',
          dice,
          condition: 'once_per_turn',
          once: true,
        },
        { target: 'label', op: 'set', condition: 'large_size' },
      ],
    }
  },
  reclaim_potential: (ctx) => {
    const con = Math.floor(ctx.casterMod ?? 0)
    return {
      name: 'Поглотить потенциал',
      slug: 'reclaim_potential',
      kind: 'feature',
      concentration: false,
      duration: hours(1),
      mods: [
        {
          target: 'temp_hp',
          op: 'roll_die',
          dice: '2d6',
          value: con,
        },
      ],
    }
  },
  rallying_cry: () => ({
    name: 'Сплочающий крик',
    slug: 'rallying_cry',
    kind: 'feature',
    concentration: false,
    duration: rounds(1),
    mods: [{ target: 'label', op: 'set', condition: 'rallying_cry' }],
  }),
  inspiring_surge: () => ({
    name: 'Вдохновляющий всплеск',
    slug: 'inspiring_surge',
    kind: 'feature',
    concentration: false,
    duration: rounds(1),
    mods: [{ target: 'label', op: 'set', condition: 'inspiring_surge' }],
  }),
  bulwark: () => ({
    name: 'Оплот',
    slug: 'bulwark',
    kind: 'feature',
    concentration: false,
    duration: rounds(1),
    mods: [{ target: 'label', op: 'set', condition: 'bulwark_reroll' }],
  }),
  indomitable: () => ({
    name: 'Упорство',
    slug: 'indomitable',
    kind: 'feature',
    concentration: false,
    duration: rounds(1),
    mods: [{ target: 'label', op: 'set', condition: 'indomitable_reroll' }],
  }),
  second_wind: () => ({
    name: 'Второе дыхание',
    slug: 'second_wind',
    kind: 'feature',
    concentration: false,
    duration: rounds(1),
    mods: [{ target: 'label', op: 'set', condition: 'second_wind' }],
  }),

  patient_defense: () => ({
    name: 'Терпеливая оборона',
    slug: 'patient_defense',
    kind: 'feature',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [
      {
        target: 'disadvantage',
        op: 'disadvantage',
        condition: 'attacks_vs_you',
      },
      {
        target: 'save',
        op: 'advantage',
        condition: 'dex',
      },
      { target: 'label', op: 'set', condition: 'dodge' },
    ],
  }),
  empty_body: () => ({
    name: 'Пустое тело',
    slug: 'empty_body',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [
      { target: 'label', op: 'set', condition: 'invisible' },
      { target: 'resistance', op: 'set', condition: 'acid' },
      { target: 'resistance', op: 'set', condition: 'bludgeoning' },
      { target: 'resistance', op: 'set', condition: 'cold' },
      { target: 'resistance', op: 'set', condition: 'fire' },
      { target: 'resistance', op: 'set', condition: 'lightning' },
      { target: 'resistance', op: 'set', condition: 'necrotic' },
      { target: 'resistance', op: 'set', condition: 'piercing' },
      { target: 'resistance', op: 'set', condition: 'poison' },
      { target: 'resistance', op: 'set', condition: 'psychic' },
      { target: 'resistance', op: 'set', condition: 'radiant' },
      { target: 'resistance', op: 'set', condition: 'slashing' },
      { target: 'resistance', op: 'set', condition: 'thunder' },
    ],
  }),
  agile_parry: () => ({
    name: 'Ловкое парирование',
    slug: 'agile_parry',
    kind: 'feature',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [{ target: 'ac', op: 'add', value: 2 }],
  }),
  diamond_soul_reroll: () => ({
    name: 'Алмазная душа (переброс)',
    slug: 'diamond_soul_reroll',
    kind: 'feature',
    concentration: false,
    duration: rounds(1),
    mods: [{ target: 'label', op: 'set', condition: 'diamond_soul_reroll' }],
  }),
  evasion: () => ({
    name: 'Уклонение',
    slug: 'evasion',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'label', op: 'set', condition: 'evasion' }],
  }),
  wings_unfurled: () => ({
    name: 'Расправленные крылья',
    slug: 'wings_unfurled',
    kind: 'feature',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [
      {
        target: 'fly_speed',
        op: 'set',
        value: 0,
        condition: 'equals_walk',
      },
      { target: 'label', op: 'set', condition: 'wings_unfurled' },
    ],
  }),
  aspect_of_the_wyrm: (ctx) => {
    const type = String(ctx.option || 'fire').trim().toLowerCase() || 'fire'
    return {
      name: 'Аспект вирма',
      slug: 'aspect_of_the_wyrm',
      kind: 'feature',
      concentration: false,
      duration: minutes(1),
      mods: [
        { target: 'resistance', op: 'set', condition: type },
        { target: 'label', op: 'set', condition: 'aspect_of_the_wyrm' },
      ],
    }
  },
}

export const B04_NAME_TO_SLUG: Array<{ re: RegExp; slug: string }> = [
  { re: /^ярость$|^rage$/iu, slug: 'rage' },
  { re: /^безрассудн[\p{L}\p{N}_]*\s*атак|^reckless\s*attack/iu, slug: 'reckless_attack' },
  { re: /^чувств[\p{L}\p{N}_]*\s*опасност|^danger\s*sense/iu, slug: 'danger_sense' },
  {
    re: /^ревностн[\p{L}\p{N}_]*\s*присут|^zealous\s*presence/iu,
    slug: 'zealous_presence',
  },
  { re: /^зов\s*охот|^call\s*the\s*hunt/iu, slug: 'call_the_hunt' },
  {
    re: /^аура\s*шторм[\p{L}\p{N}_]*\s*\(?тунд|^storm\s*aura.*tundra/iu,
    slug: 'storm_aura_tundra',
  },
  {
    re: /^подкрепляющ[\p{L}\p{N}_]*\s*маг|^bolstering\s*magic/iu,
    slug: 'bolstering_magic',
  },
  {
    re: /^полн[\p{L}\p{N}_]*\s*безрассудств|^reckless\s*abandon/iu,
    slug: 'reckless_abandon',
  },
  {
    re: /^шипованн[\p{L}\p{N}_]*\s*расплат|^spiked\s*retribution/iu,
    slug: 'spiked_retribution',
  },
  {
    re: /^великан['’]?е\s*разрушен|^giant'?s?\s*havoc/iu,
    slug: 'giants_havoc',
  },
  {
    re: /^демиург[-‑]?колосс|^demiurgic\s*colossus/iu,
    slug: 'demiurgic_colossus',
  },
  {
    re: /^бардовск[\p{L}\p{N}_]*\s*вдохнов|^bardic\s*inspiration/iu,
    slug: 'bardic_inspiration',
  },
  {
    re: /^боев[\p{L}\p{N}_]*\s*вдохнов|^combat\s*inspiration/iu,
    slug: 'combat_inspiration',
  },
  {
    re: /^частиц[\p{L}\p{N}_]*\s*потенциал|^mote\s*of\s*potential/iu,
    slug: 'mote_of_potential',
  },
  {
    re: /^неисчерпаем[\p{L}\p{N}_]*\s*вдохнов|^unfailing\s*inspiration/iu,
    slug: 'unfailing_inspiration',
  },
  { re: /^песн[\p{L}\p{N}_]*\s*отдых|^song\s*of\s*rest/iu, slug: 'song_of_rest' },
  { re: /^контрчар|^countercharm/iu, slug: 'countercharm' },
  {
    re: /^манти[\p{L}\p{N}_]*\s*вдохнов|^mantle\s*of\s*inspiration/iu,
    slug: 'mantle_of_inspiration',
  },
  {
    re: /^защитн[\p{L}\p{N}_]*\s*расцвет|^defensive\s*flourish/iu,
    slug: 'defensive_flourish',
  },
  {
    re: /^истори[\p{L}\p{N}_]*\s*с\s*того\s*свет|^tales\s*from\s*beyond/iu,
    slug: 'tales_from_beyond',
  },
  {
    re: /^направленн[\p{L}\p{N}_]*\s*удар|^guided\s*strike/iu,
    slug: 'guided_strike',
  },
  {
    re: /^благословен[\p{L}\p{N}_]*\s*бог[\p{L}\p{N}_]*\s*войн|^war\s*god'?s?\s*blessing/iu,
    slug: 'war_gods_blessing',
  },
  {
    re: /^приглушен[\p{L}\p{N}_]*\s*стихи|^dampen\s*elements/iu,
    slug: 'dampen_elements',
  },
  {
    re: /^благословен[\p{L}\p{N}_]*\s*проказник|^blessing\s*of\s*the\s*trickster/iu,
    slug: 'blessing_of_the_trickster',
  },
  {
    re: /^благословен[\p{L}\p{N}_]*\s*кузниц|^blessing\s*of\s*the\s*forge/iu,
    slug: 'blessing_of_the_forge',
  },
  {
    re: /^страж[\p{L}\p{N}_]*\s*на\s*порог|^sentinel\s*at\s*death/iu,
    slug: 'sentinel_at_deaths_door',
  },
  { re: /^глаза\s*ночи|^eyes\s*of\s*night/iu, slug: 'eyes_of_night' },
  {
    re: /^благословен[\p{L}\p{N}_]*\s*бдительн|^vigilant\s*blessing/iu,
    slug: 'vigilant_blessing',
  },
  {
    re: /^сумеречн[\p{L}\p{N}_]*\s*святилищ|^twilight\s*sanctuary/iu,
    slug: 'twilight_sanctuary',
  },
  {
    re: /^голос\s*авторитет|^voice\s*of\s*authority/iu,
    slug: 'voice_of_authority',
  },
  {
    re: /^разрушител[\p{L}\p{N}_]*\s*заклинаний|^spell\s*breaker/iu,
    slug: 'spell_breaker',
  },
  {
    re: /^тотем\s*дух[\p{L}\p{N}_]*\s*\(?медвед|^spirit\s*totem.*bear/iu,
    slug: 'spirit_totem_bear',
  },
  {
    re: /^тотем\s*дух[\p{L}\p{N}_]*\s*\(?ястреб|^spirit\s*totem.*hawk/iu,
    slug: 'spirit_totem_hawk',
  },
  {
    re: /^тотем\s*дух[\p{L}\p{N}_]*\s*\(?единорог|^spirit\s*totem.*unicorn/iu,
    slug: 'spirit_totem_unicorn',
  },
  {
    re: /^очаг\s*лунн|^hearth\s*of\s*moonlight/iu,
    slug: 'hearth_of_moonlight_and_shadow',
  },
  {
    re: /^зв[её]здн[\p{L}\p{N}_]*\s*облик.*лучник|^starry\s*form.*archer/iu,
    slug: 'starry_form_archer',
  },
  {
    re: /^зв[её]здн[\p{L}\p{N}_]*\s*облик.*чаш|^starry\s*form.*chalice/iu,
    slug: 'starry_form_chalice',
  },
  {
    re: /^зв[её]здн[\p{L}\p{N}_]*\s*облик.*дракон|^starry\s*form.*dragon/iu,
    slug: 'starry_form_dragon',
  },
  {
    re: /^космическ[\p{L}\p{N}_]*\s*знамен|^cosmic\s*omen/iu,
    slug: 'cosmic_omen_weal',
  },
  {
    re: /^симбиотическ[\p{L}\p{N}_]*\s*сущност|^symbiotic\s*entity/iu,
    slug: 'symbiotic_entity',
  },
  { re: /^усиленн[\p{L}\p{N}_]*\s*связ|^enhanced\s*bond/iu, slug: 'enhanced_bond' },
  { re: /^боев[\p{L}\p{N}_]*\s*дух$|^fighting\s*spirit/iu, slug: 'fighting_spirit' },
  { re: /^сплочен|^rally$/iu, slug: 'rally' },
  {
    re: /^точн[\p{L}\p{N}_]*\s*атак|^precision\s*attack/iu,
    slug: 'precision_attack',
  },
  { re: /^парирован|^parry$/iu, slug: 'parry' },
  {
    re: /^уклонен[\p{L}\p{N}_]*\s*в\s*движен|^evasive\s*footwork/iu,
    slug: 'evasive_footwork',
  },
  {
    re: /^приманк[\p{L}\p{N}_]*\s*и\s*замен|^bait\s*and\s*switch/iu,
    slug: 'bait_and_switch',
  },
  {
    re: /^оборонительн[\p{L}\p{N}_]*\s*ман[её]вр|^warding\s*maneuver/iu,
    slug: 'warding_maneuver',
  },
  { re: /^руническ[\p{L}\p{N}_]*\s*щит|^runic\s*shield/iu, slug: 'runic_shield' },
  {
    re: /^защитн[\p{L}\p{N}_]*\s*поле|^protective\s*field/iu,
    slug: 'protective_field',
  },
  {
    re: /^исполинск[\p{L}\p{N}_]*\s*мощ|^giant'?s?\s*might/iu,
    slug: 'giants_might',
  },
  {
    re: /^поглотить\s*потенциал|^reclaim\s*potential/iu,
    slug: 'reclaim_potential',
  },
  { re: /^сплочающ[\p{L}\p{N}_]*\s*крик|^rallying\s*cry/iu, slug: 'rallying_cry' },
  {
    re: /^вдохновляющ[\p{L}\p{N}_]*\s*всплеск|^inspiring\s*surge/iu,
    slug: 'inspiring_surge',
  },
  { re: /^оплот$|^bulwark$/iu, slug: 'bulwark' },
  { re: /^упорств|^indomitable$/iu, slug: 'indomitable' },
  { re: /^второ[\p{L}\p{N}_]*\s*дыхан|^second\s*wind/iu, slug: 'second_wind' },
  {
    re: /^терпелив[\p{L}\p{N}_]*\s*оборон|^patient\s*defense/iu,
    slug: 'patient_defense',
  },
  { re: /^пуст[\p{L}\p{N}_]*\s*тело|^empty\s*body/iu, slug: 'empty_body' },
  { re: /^ловк[\p{L}\p{N}_]*\s*парир|^agile\s*parry/iu, slug: 'agile_parry' },
  { re: /^уклонен|^evasion$/iu, slug: 'evasion' },
  {
    re: /^расправленн[\p{L}\p{N}_]*\s*крыл|^wings\s*unfurled/iu,
    slug: 'wings_unfurled',
  },
  { re: /^аспект\s*вирм|^aspect\s*of\s*the\s*wyrm/iu, slug: 'aspect_of_the_wyrm' },
]

export function buildB04BuffSpec(
  slug: string,
  ctx: BuffBuildContext = {},
): SpellBuffSpec | null {
  const builder = B04_BUFF_SPEC_BUILDERS[slug]
  if (!builder) return null
  return builder(ctx)
}
