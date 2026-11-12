/**
 * B-02: spell buff specs that write sheet numbers (AC, temp HP, speed, resist…).
 * Looked up via buildBuffEffect / guessBuffSlug alongside B01_BUFF_SPECS.
 */
import type { EffectDuration, EffectMod, SpellBuffSpec } from './activeEffects'

export type BuffBuildContext = {
  /** Cast slot level (upcast). */
  slotLevel?: number | null
  /** Spell’s base level from catalog. */
  spellLevel?: number | null
  /** Caster spellcasting ability modifier (heroism temp HP). */
  casterMod?: number | null
  /**
   * Player choice: ability key (enhance_ability), damage type
   * (protection_from_energy / elemental_weapon / absorb_elements),
   * warm|cold (fire_shield), lower|upper (tasha guise), beast|tree (guardian).
   */
  option?: string | null
}

function hours(value: number): EffectDuration {
  return { unit: 'hours', value, remaining_rounds: value * 600 }
}
function minutes(value: number): EffectDuration {
  return { unit: 'minutes', value, remaining_rounds: value * 10 }
}
function untilSourceTurn(): EffectDuration {
  return { unit: 'until_source_next_turn_end', value: 1, remaining_rounds: 1 }
}

type SpecBuilder = (ctx: BuffBuildContext) => SpellBuffSpec

function slotOf(ctx: BuffBuildContext, fallback: number): number {
  const n = typeof ctx.slotLevel === 'number' ? ctx.slotLevel : fallback
  return Math.max(fallback, Math.floor(n))
}

/** Static or context-aware specs for B-02 catalog rows. */
export const B02_BUFF_SPEC_BUILDERS: Record<string, SpecBuilder> = {
  blade_ward: () => ({
    name: 'Защита от оружия',
    slug: 'blade_ward',
    kind: 'spell',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [
      { target: 'resistance', op: 'set', condition: 'bludgeoning' },
      { target: 'resistance', op: 'set', condition: 'piercing' },
      { target: 'resistance', op: 'set', condition: 'slashing' },
    ],
  }),
  shield: () => ({
    name: 'Щит',
    slug: 'shield',
    kind: 'spell',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [
      { target: 'ac', op: 'add', value: 5 },
      {
        target: 'label',
        op: 'set',
        condition: 'magic_missile_immunity',
      },
    ],
  }),
  mage_armor: () => ({
    name: 'Доспехи мага',
    slug: 'mage_armor',
    kind: 'spell',
    concentration: false,
    duration: hours(8),
    mods: [
      {
        target: 'ac_formula',
        op: 'set',
        value: 13,
        condition: 'mage_armor',
      },
    ],
  }),
  heroism: (ctx) => {
    const mod = Math.max(1, Math.floor(ctx.casterMod ?? 1))
    return {
      name: 'Героизм',
      slug: 'heroism',
      kind: 'spell',
      concentration: true,
      duration: minutes(1),
      mods: [
        { target: 'temp_hp', op: 'set', value: mod, condition: 'each_turn_start' },
        { target: 'immunity', op: 'set', condition: 'frightened' },
      ],
    }
  },
  false_life: (ctx) => {
    const slot = slotOf(ctx, 1)
    const bonus = 4 + 5 * Math.max(0, slot - 1)
    return {
      name: 'Псевдожизнь',
      slug: 'false_life',
      kind: 'spell',
      concentration: false,
      duration: hours(1),
      mods: [{ target: 'temp_hp', op: 'roll_die', dice: '1d4', value: bonus }],
    }
  },
  armor_of_agathys: (ctx) => {
    const slot = slotOf(ctx, 1)
    const temp = 5 + 5 * Math.max(0, slot - 1)
    return {
      name: 'Доспех Агатиса',
      slug: 'armor_of_agathys',
      kind: 'spell',
      concentration: false,
      duration: hours(1),
      mods: [
        { target: 'temp_hp', op: 'set', value: temp },
        {
          target: 'label',
          op: 'set',
          value: temp,
          condition: 'retaliation_cold',
        },
      ],
    }
  },
  protection_from_evil_and_good: () => ({
    name: 'Защита от зла и добра',
    slug: 'protection_from_evil_and_good',
    kind: 'spell',
    concentration: true,
    duration: minutes(10),
    mods: [
      {
        target: 'label',
        op: 'set',
        condition: 'prot_evil_good',
      },
    ],
  }),
  longstrider: () => ({
    name: 'Скороход',
    slug: 'longstrider',
    kind: 'spell',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'speed', op: 'add', value: 10 }],
  }),
  jump: () => ({
    name: 'Прыжок',
    slug: 'jump',
    kind: 'spell',
    concentration: false,
    duration: minutes(1),
    mods: [{ target: 'label', op: 'set', condition: 'jump_x3' }],
  }),
  absorb_elements: (ctx) => {
    const dtype = (ctx.option || 'fire').trim() || 'fire'
    const slot = slotOf(ctx, 1)
    const dice = `${1 + Math.max(0, slot - 1)}d6`
    return {
      name: 'Поглощение стихий',
      slug: 'absorb_elements',
      kind: 'spell',
      concentration: false,
      duration: untilSourceTurn(),
      mods: [
        { target: 'resistance', op: 'set', condition: dtype },
        {
          target: 'label',
          op: 'set',
          dice,
          condition: `next_melee_${dtype}`,
        },
      ],
    }
  },
  zephyr_strike: () => ({
    name: 'Удар Зефира',
    slug: 'zephyr_strike',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      { target: 'label', op: 'set', condition: 'no_opportunity' },
      {
        target: 'advantage',
        op: 'advantage',
        condition: 'weapon_attack_once',
        once: true,
      },
      { target: 'speed', op: 'add', value: 30, condition: 'after_zephyr_hit', once: true },
    ],
  }),
  ceremony_wedding: () => ({
    name: 'Церемония (венчание)',
    slug: 'ceremony_wedding',
    kind: 'spell',
    concentration: false,
    duration: { unit: 'hours', value: 168, remaining_rounds: 168 * 600 },
    mods: [{ target: 'ac', op: 'add', value: 2, condition: 'within_30_ft' }],
  }),
  aid: (ctx) => {
    const slot = slotOf(ctx, 2)
    const bonus = 5 + 5 * Math.max(0, slot - 2)
    return {
      name: 'Подмога',
      slug: 'aid',
      kind: 'spell',
      concentration: false,
      duration: hours(8),
      mods: [{ target: 'hp_max', op: 'add', value: bonus }],
    }
  },
  barkskin: () => ({
    name: 'Дубовая кора',
    slug: 'barkskin',
    kind: 'spell',
    concentration: true,
    duration: hours(1),
    mods: [{ target: 'ac_min', op: 'set', value: 16 }],
  }),
  enhance_ability: (ctx) => {
    const ability = (ctx.option || 'cha').trim().toLowerCase() || 'cha'
    const mods: EffectMod[] = [
      {
        target: 'check',
        op: 'advantage',
        condition: ability,
      },
    ]
    if (ability === 'con' || ability === 'constitution') {
      mods.push({ target: 'temp_hp', op: 'roll_die', dice: '2d6' })
    }
    if (ability === 'str' || ability === 'strength') {
      mods.push({ target: 'label', op: 'set', condition: 'double_carry' })
    }
    return {
      name: 'Улучшение характеристики',
      slug: 'enhance_ability',
      kind: 'spell',
      concentration: true,
      duration: hours(1),
      mods,
    }
  },
  warding_bond: () => ({
    name: 'Охраняющая связь',
    slug: 'warding_bond',
    kind: 'spell',
    concentration: false,
    duration: hours(1),
    mods: [
      { target: 'ac', op: 'add', value: 1 },
      { target: 'save', op: 'add', value: 1 },
      { target: 'resistance', op: 'set', condition: 'all' },
      { target: 'label', op: 'set', condition: 'shared_damage' },
    ],
  }),
  magic_weapon: (ctx) => {
    const slot = slotOf(ctx, 2)
    const bonus = slot >= 6 ? 3 : slot >= 4 ? 2 : 1
    return {
      name: 'Магическое оружие',
      slug: 'magic_weapon',
      kind: 'spell',
      concentration: true,
      duration: hours(1),
      mods: [
        { target: 'weapon_attack', op: 'add', value: bonus },
        { target: 'weapon_damage', op: 'add', value: bonus },
        { target: 'label', op: 'set', condition: 'weapon_magic' },
      ],
    }
  },
  protection_from_poison: () => ({
    name: 'Защита от яда',
    slug: 'protection_from_poison',
    kind: 'spell',
    concentration: false,
    duration: hours(1),
    mods: [
      { target: 'resistance', op: 'set', condition: 'poison' },
      {
        target: 'save',
        op: 'advantage',
        condition: 'poisoned',
      },
    ],
  }),
  pass_without_trace: () => ({
    name: 'Бесследное передвижение',
    slug: 'pass_without_trace',
    kind: 'spell',
    concentration: true,
    duration: hours(1),
    mods: [
      { target: 'skill', op: 'add', value: 10, condition: 'stealth' },
      { target: 'label', op: 'set', condition: 'no_tracks' },
    ],
  }),
  enlarge: () => ({
    name: 'Увеличение',
    slug: 'enlarge',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      { target: 'advantage', op: 'advantage', condition: 'str' },
      { target: 'label', op: 'set', condition: 'size_up_weapon_d4' },
    ],
  }),
  spider_climb: () => ({
    name: 'Паук',
    slug: 'spider_climb',
    kind: 'spell',
    concentration: true,
    duration: hours(1),
    mods: [{ target: 'climb_speed', op: 'set', condition: 'equal_walk' }],
  }),
  darkvision: () => ({
    name: 'Тёмное зрение',
    slug: 'darkvision',
    kind: 'spell',
    concentration: false,
    duration: hours(8),
    mods: [{ target: 'senses', op: 'set', value: 60, condition: 'darkvision' }],
  }),
  shadow_blade: (ctx) => {
    const slot = slotOf(ctx, 2)
    const dice =
      slot >= 5 ? '5d8' : slot >= 4 ? '4d8' : slot >= 3 ? '3d8' : '2d8'
    return {
      name: 'Теневой клинок',
      slug: 'shadow_blade',
      kind: 'spell',
      concentration: true,
      duration: minutes(1),
      mods: [
        { target: 'label', op: 'set', dice, condition: 'shadow_blade_weapon' },
      ],
    }
  },
  haste: () => ({
    name: 'Ускорение',
    slug: 'haste',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      { target: 'speed', op: 'mul', value: 2 },
      { target: 'ac', op: 'add', value: 2 },
      { target: 'save', op: 'advantage', condition: 'dex' },
      { target: 'label', op: 'set', condition: 'haste_action' },
    ],
  }),
  protection_from_energy: (ctx) => {
    const dtype = (ctx.option || 'fire').trim() || 'fire'
    return {
      name: 'Защита от энергии',
      slug: 'protection_from_energy',
      kind: 'spell',
      concentration: true,
      duration: hours(1),
      mods: [{ target: 'resistance', op: 'set', condition: dtype }],
    }
  },
  fly: () => ({
    name: 'Полёт',
    slug: 'fly',
    kind: 'spell',
    concentration: true,
    duration: minutes(10),
    mods: [{ target: 'fly_speed', op: 'set', value: 60 }],
  }),
  beacon_of_hope: () => ({
    name: 'Маяк надежды',
    slug: 'beacon_of_hope',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      { target: 'save', op: 'advantage', condition: 'wis' },
      { target: 'save', op: 'advantage', condition: 'death' },
      { target: 'label', op: 'set', condition: 'max_healing' },
    ],
  }),
  elemental_weapon: (ctx) => {
    const slot = slotOf(ctx, 3)
    const bonus = slot >= 7 ? 3 : slot >= 5 ? 2 : 1
    const dice = slot >= 7 ? '3d4' : slot >= 5 ? '2d4' : '1d4'
    const dtype = (ctx.option || 'fire').trim() || 'fire'
    return {
      name: 'Стихийное оружие',
      slug: 'elemental_weapon',
      kind: 'spell',
      concentration: true,
      duration: hours(1),
      mods: [
        { target: 'weapon_attack', op: 'add', value: bonus },
        {
          target: 'weapon_damage',
          op: 'add',
          value: bonus,
          dice,
          condition: dtype,
        },
        { target: 'label', op: 'set', condition: 'weapon_magic' },
      ],
    }
  },
  intellect_fortress: () => ({
    name: 'Крепость интеллекта',
    slug: 'intellect_fortress',
    kind: 'spell',
    concentration: true,
    duration: hours(1),
    mods: [
      { target: 'resistance', op: 'set', condition: 'psychic' },
      { target: 'save', op: 'advantage', condition: 'int' },
      { target: 'save', op: 'advantage', condition: 'wis' },
      { target: 'save', op: 'advantage', condition: 'cha' },
    ],
  }),
  stoneskin: () => ({
    name: 'Каменная кожа',
    slug: 'stoneskin',
    kind: 'spell',
    concentration: true,
    duration: hours(1),
    mods: [
      { target: 'resistance', op: 'set', condition: 'bludgeoning', dice: 'nonmagical' },
      { target: 'resistance', op: 'set', condition: 'piercing', dice: 'nonmagical' },
      { target: 'resistance', op: 'set', condition: 'slashing', dice: 'nonmagical' },
    ],
  }),
  death_ward: () => ({
    name: 'Защита от смерти',
    slug: 'death_ward',
    kind: 'spell',
    concentration: false,
    duration: hours(8),
    mods: [{ target: 'label', op: 'set', condition: 'death_ward' }],
  }),
  freedom_of_movement: () => ({
    name: 'Свобода перемещения',
    slug: 'freedom_of_movement',
    kind: 'spell',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'label', op: 'set', condition: 'freedom_of_movement' }],
  }),
  aura_of_life: () => ({
    name: 'Аура жизни',
    slug: 'aura_of_life',
    kind: 'spell',
    concentration: true,
    duration: minutes(10),
    mods: [
      { target: 'resistance', op: 'set', condition: 'necrotic' },
      { target: 'label', op: 'set', condition: 'hp_max_locked' },
    ],
  }),
  aura_of_purity: () => ({
    name: 'Аура очищения',
    slug: 'aura_of_purity',
    kind: 'spell',
    concentration: true,
    duration: minutes(10),
    mods: [
      { target: 'resistance', op: 'set', condition: 'poison' },
      { target: 'immunity', op: 'set', condition: 'disease' },
      { target: 'label', op: 'set', condition: 'aura_purity_saves' },
    ],
  }),
  fire_shield: (ctx) => {
    const warm = (ctx.option || 'warm') !== 'cold'
    return {
      name: warm ? 'Огненный щит (тёплый)' : 'Огненный щит (холодный)',
      slug: 'fire_shield',
      kind: 'spell',
      concentration: false,
      duration: minutes(10),
      mods: [
        {
          target: 'resistance',
          op: 'set',
          condition: warm ? 'cold' : 'fire',
        },
        {
          target: 'label',
          op: 'set',
          condition: warm ? 'retaliation_fire_2d8' : 'retaliation_cold_2d8',
        },
      ],
    }
  },
  guardian_of_nature: (ctx) => {
    const tree = (ctx.option || 'beast') === 'tree'
    if (tree) {
      return {
        name: 'Страж природы (древо)',
        slug: 'guardian_of_nature',
        kind: 'spell',
        concentration: true,
        duration: minutes(1),
        mods: [
          { target: 'temp_hp', op: 'set', value: 10 },
          { target: 'save', op: 'advantage', condition: 'con' },
          { target: 'advantage', op: 'advantage', condition: 'dex_wis_attack' },
        ],
      }
    }
    return {
      name: 'Страж природы (зверь)',
      slug: 'guardian_of_nature',
      kind: 'spell',
      concentration: true,
      duration: minutes(1),
      mods: [
        { target: 'speed', op: 'add', value: 10 },
        { target: 'senses', op: 'set', value: 120, condition: 'darkvision' },
        { target: 'advantage', op: 'advantage', condition: 'str_attack' },
      ],
    }
  },
  shadow_of_moil: () => ({
    name: 'Облачение тени',
    slug: 'shadow_of_moil',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      { target: 'resistance', op: 'set', condition: 'radiant' },
      { target: 'label', op: 'set', condition: 'heavily_obscured_retaliation' },
    ],
  }),
  circle_of_power: () => ({
    name: 'Круг силы',
    slug: 'circle_of_power',
    kind: 'spell',
    concentration: true,
    duration: minutes(10),
    mods: [
      { target: 'save', op: 'advantage', condition: 'spells' },
      { target: 'label', op: 'set', condition: 'circle_of_power_negate' },
    ],
  }),
  skill_empowerment: (ctx) => {
    const skill = (ctx.option || 'persuasion').trim() || 'persuasion'
    return {
      name: 'Усиление навыка',
      slug: 'skill_empowerment',
      kind: 'spell',
      concentration: true,
      duration: hours(1),
      mods: [{ target: 'skill', op: 'set', condition: `expertise:${skill}` }],
    }
  },
  heroes_feast: (ctx) => {
    // 2d10 rolled at build time by caller into option as numeric string, or roll here.
    const rolled =
      typeof ctx.option === 'string' && /^\d+$/.test(ctx.option)
        ? Number(ctx.option)
        : null
    const bonus = rolled ?? 11 // mid; real roll in applySpellBuff
    return {
      name: 'Пир героев',
      slug: 'heroes_feast',
      kind: 'spell',
      concentration: false,
      duration: hours(24),
      mods: [
        { target: 'hp_max', op: 'add', value: bonus, dice: '2d10' },
        { target: 'immunity', op: 'set', condition: 'poison' },
        { target: 'immunity', op: 'set', condition: 'frightened' },
        { target: 'save', op: 'advantage', condition: 'wis' },
      ],
    }
  },
  tensers_transformation: () => ({
    name: 'Трансформация Тензера',
    slug: 'tensers_transformation',
    kind: 'spell',
    concentration: true,
    duration: minutes(10),
    mods: [
      { target: 'temp_hp', op: 'set', value: 50, condition: 'clear_on_end' },
      { target: 'advantage', op: 'advantage', condition: 'weapon_attack' },
      { target: 'label', op: 'set', condition: 'tensers_extras' },
    ],
  }),
  tashas_otherworldly_guise: (ctx) => {
    const upper = (ctx.option || 'lower') === 'upper'
    return {
      name: 'Потусторонний облик Таши',
      slug: 'tashas_otherworldly_guise',
      kind: 'spell',
      concentration: true,
      duration: minutes(1),
      mods: [
        { target: 'ac', op: 'add', value: 2 },
        { target: 'fly_speed', op: 'set', value: 40 },
        ...(upper
          ? ([
              { target: 'immunity', op: 'set', condition: 'radiant' },
              { target: 'immunity', op: 'set', condition: 'necrotic' },
              { target: 'immunity', op: 'set', condition: 'charmed' },
            ] as EffectMod[])
          : ([
              { target: 'immunity', op: 'set', condition: 'fire' },
              { target: 'immunity', op: 'set', condition: 'poison' },
              { target: 'immunity', op: 'set', condition: 'poisoned' },
            ] as EffectMod[])),
      ],
    }
  },
  primordial_ward: () => ({
    name: 'Первородный страж',
    slug: 'primordial_ward',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      { target: 'resistance', op: 'set', condition: 'thunder' },
      { target: 'resistance', op: 'set', condition: 'acid' },
      { target: 'resistance', op: 'set', condition: 'fire' },
      { target: 'resistance', op: 'set', condition: 'cold' },
      { target: 'resistance', op: 'set', condition: 'lightning' },
    ],
  }),
  investiture_of_flame: () => ({
    name: 'Облачение огня',
    slug: 'investiture_of_flame',
    kind: 'spell',
    concentration: true,
    duration: minutes(10),
    mods: [
      { target: 'immunity', op: 'set', condition: 'fire' },
      { target: 'resistance', op: 'set', condition: 'cold' },
    ],
  }),
  investiture_of_ice: () => ({
    name: 'Облачение льда',
    slug: 'investiture_of_ice',
    kind: 'spell',
    concentration: true,
    duration: minutes(10),
    mods: [
      { target: 'immunity', op: 'set', condition: 'cold' },
      { target: 'resistance', op: 'set', condition: 'fire' },
    ],
  }),
  investiture_of_stone: () => ({
    name: 'Облачение камня',
    slug: 'investiture_of_stone',
    kind: 'spell',
    concentration: true,
    duration: minutes(10),
    mods: [
      { target: 'resistance', op: 'set', condition: 'bludgeoning', dice: 'nonmagical' },
      { target: 'resistance', op: 'set', condition: 'piercing', dice: 'nonmagical' },
      { target: 'resistance', op: 'set', condition: 'slashing', dice: 'nonmagical' },
    ],
  }),
  investiture_of_wind: () => ({
    name: 'Облачение ветра',
    slug: 'investiture_of_wind',
    kind: 'spell',
    concentration: true,
    duration: minutes(10),
    mods: [
      { target: 'fly_speed', op: 'set', value: 60 },
      { target: 'disadvantage', op: 'disadvantage', condition: 'ranged_vs_you' },
    ],
  }),
  regenerate: () => ({
    name: 'Регенерация',
    slug: 'regenerate',
    kind: 'spell',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'label', op: 'set', condition: 'regenerate_1_hp_turn' }],
  }),
  holy_aura: () => ({
    name: 'Аура святости',
    slug: 'holy_aura',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      { target: 'save', op: 'advantage', condition: 'all' },
      { target: 'label', op: 'set', condition: 'holy_aura_attacks' },
    ],
  }),
  mind_blank: () => ({
    name: 'Сокрытие разума',
    slug: 'mind_blank',
    kind: 'spell',
    concentration: false,
    duration: hours(24),
    mods: [
      { target: 'immunity', op: 'set', condition: 'psychic' },
      { target: 'immunity', op: 'set', condition: 'charmed' },
      { target: 'label', op: 'set', condition: 'mind_blank' },
    ],
  }),
  glibness: () => ({
    name: 'Находчивость',
    slug: 'glibness',
    kind: 'spell',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'label', op: 'set', condition: 'glibness_cha_15' }],
  }),
  invulnerability: () => ({
    name: 'Неуязвимость',
    slug: 'invulnerability',
    kind: 'spell',
    concentration: true,
    duration: minutes(10),
    mods: [{ target: 'immunity', op: 'set', condition: 'all_damage' }],
  }),
  borrowed_knowledge: (ctx) => {
    const skill = (ctx.option || 'arcana').trim() || 'arcana'
    return {
      name: 'Заимствованные знания',
      slug: 'borrowed_knowledge',
      kind: 'spell',
      concentration: false,
      duration: hours(1),
      mods: [{ target: 'skill', op: 'set', condition: `proficiency:${skill}` }],
    }
  },
  ashardalons_stride: (ctx) => {
    const slot = slotOf(ctx, 3)
    const bonus = 20 + 5 * Math.max(0, slot - 3)
    return {
      name: 'Шаг Ашардалона',
      slug: 'ashardalons_stride',
      kind: 'spell',
      concentration: true,
      duration: minutes(1),
      mods: [
        { target: 'speed', op: 'add', value: bonus },
        { target: 'label', op: 'set', condition: 'ashardalon_trail' },
      ],
    }
  },
}

export const B02_NAME_TO_SLUG: Array<{ re: RegExp; slug: string }> = [
  { re: /^защит[аы]\s*от\s*оружи|^blade\s*ward/iu, slug: 'blade_ward' },
  { re: /^щит$|^shield$/iu, slug: 'shield' },
  { re: /^доспех[иа]?\s*мага|^mage\s*armou?r/iu, slug: 'mage_armor' },
  { re: /^героизм|^heroism/iu, slug: 'heroism' },
  { re: /^псевдожизн|^false\s*life/iu, slug: 'false_life' },
  { re: /^доспех\s*агатис|^armor\s*of\s*agathys/iu, slug: 'armor_of_agathys' },
  {
    re: /^защит[аы]\s*от\s*зла|^protection\s*from\s*evil/iu,
    slug: 'protection_from_evil_and_good',
  },
  { re: /^скороход|^longstrider/iu, slug: 'longstrider' },
  { re: /^прыжок|^jump$/iu, slug: 'jump' },
  { re: /^поглощен[\p{L}\p{N}_]*\s*стих|^absorb\s*elements/iu, slug: 'absorb_elements' },
  { re: /^удар\s*зефир|^zephyr\s*strike/iu, slug: 'zephyr_strike' },
  { re: /^церемони.*венчан|^ceremony/iu, slug: 'ceremony_wedding' },
  { re: /^подмог|^aid$/iu, slug: 'aid' },
  { re: /^дубов[\p{L}\p{N}_]*\s*кор|^barkskin/iu, slug: 'barkskin' },
  { re: /^улучшен[\p{L}\p{N}_]*\s*характерист|^enhance\s*ability/iu, slug: 'enhance_ability' },
  { re: /^охраняющ[\p{L}\p{N}_]*\s*связ|^warding\s*bond/iu, slug: 'warding_bond' },
  { re: /^магическ[\p{L}\p{N}_]*\s*оруж|^magic\s*weapon/iu, slug: 'magic_weapon' },
  { re: /^защит[аы]\s*от\s*яда|^protection\s*from\s*poison/iu, slug: 'protection_from_poison' },
  { re: /^бесследн|^pass\s*without\s*trace/iu, slug: 'pass_without_trace' },
  { re: /^увеличен|^enlarge/iu, slug: 'enlarge' },
  { re: /^паук$|^spider\s*climb/iu, slug: 'spider_climb' },
  { re: /^т[её]мн[\p{L}\p{N}_]*\s*зрен|^darkvision/iu, slug: 'darkvision' },
  { re: /^тенев[\p{L}\p{N}_]*\s*клин|^shadow\s*blade/iu, slug: 'shadow_blade' },
  { re: /^ускорен|^haste$/iu, slug: 'haste' },
  { re: /^защит[аы]\s*от\s*энерг|^protection\s*from\s*energy/iu, slug: 'protection_from_energy' },
  { re: /^пол[её]т$|^fly$/iu, slug: 'fly' },
  { re: /^маяк\s*надежд|^beacon\s*of\s*hope/iu, slug: 'beacon_of_hope' },
  { re: /^стихийн[\p{L}\p{N}_]*\s*оруж|^elemental\s*weapon/iu, slug: 'elemental_weapon' },
  { re: /^крепост[\p{L}\p{N}_]*\s*интеллект|^intellect\s*fortress/iu, slug: 'intellect_fortress' },
  { re: /^каменн[\p{L}\p{N}_]*\s*кож|^stoneskin/iu, slug: 'stoneskin' },
  { re: /^защит[аы]\s*от\s*смерт|^death\s*ward/iu, slug: 'death_ward' },
  { re: /^свобод[\p{L}\p{N}_]*\s*перемещ|^freedom\s*of\s*movement/iu, slug: 'freedom_of_movement' },
  { re: /^аура\s*жизн|^aura\s*of\s*life/iu, slug: 'aura_of_life' },
  { re: /^аура\s*очищ|^aura\s*of\s*purity/iu, slug: 'aura_of_purity' },
  { re: /^огненн[\p{L}\p{N}_]*\s*щит|^fire\s*shield/iu, slug: 'fire_shield' },
  { re: /^страж\s*природ|^guardian\s*of\s*nature/iu, slug: 'guardian_of_nature' },
  { re: /^облачен[\p{L}\p{N}_]*\s*тен|^shadow\s*of\s*moil/iu, slug: 'shadow_of_moil' },
  { re: /^круг\s*сил|^circle\s*of\s*power/iu, slug: 'circle_of_power' },
  { re: /^усилен[\p{L}\p{N}_]*\s*навык|^skill\s*empowerment/iu, slug: 'skill_empowerment' },
  { re: /^пир\s*геро|^heroes'?\s*feast/iu, slug: 'heroes_feast' },
  { re: /^трансформац[\p{L}\p{N}_]*\s*тензер|^tenser's?\s*transformation/iu, slug: 'tensers_transformation' },
  {
    re: /^потусторонн[\p{L}\p{N}_]*\s*облик|^tasha'?s?\s*otherworldly/iu,
    slug: 'tashas_otherworldly_guise',
  },
  { re: /^первородн[\p{L}\p{N}_]*\s*страж|^primordial\s*ward/iu, slug: 'primordial_ward' },
  { re: /^облачен[\p{L}\p{N}_]*\s*огня|^investiture\s*of\s*flame/iu, slug: 'investiture_of_flame' },
  { re: /^облачен[\p{L}\p{N}_]*\s*льда|^investiture\s*of\s*ice/iu, slug: 'investiture_of_ice' },
  { re: /^облачен[\p{L}\p{N}_]*\s*камн|^investiture\s*of\s*stone/iu, slug: 'investiture_of_stone' },
  { re: /^облачен[\p{L}\p{N}_]*\s*ветр|^investiture\s*of\s*wind/iu, slug: 'investiture_of_wind' },
  { re: /^регенерац|^regenerate/iu, slug: 'regenerate' },
  { re: /^аура\s*свят|^holy\s*aura/iu, slug: 'holy_aura' },
  { re: /^сокрыт[\p{L}\p{N}_]*\s*разум|^mind\s*blank/iu, slug: 'mind_blank' },
  { re: /^находчив|^glibness/iu, slug: 'glibness' },
  { re: /^неуязвим|^invulnerability/iu, slug: 'invulnerability' },
  { re: /^заимствованн[\p{L}\p{N}_]*\s*знан|^borrowed\s*knowledge/iu, slug: 'borrowed_knowledge' },
  { re: /^шаг\s*ашардал|^ashardalon'?s?\s*stride/iu, slug: 'ashardalons_stride' },
]

export function buildB02BuffSpec(
  slug: string,
  ctx: BuffBuildContext = {},
): SpellBuffSpec | null {
  const builder = B02_BUFF_SPEC_BUILDERS[slug]
  if (!builder) return null
  return builder(ctx)
}
