/**
 * B-05: class feature buffs II (paladin / warlock / wizard / ranger / rogue / sorcerer).
 * Looked up via buildBuffEffect / guessBuffSlug alongside B01–B04.
 */
import type { EffectDuration, EffectMod, SpellBuffSpec } from './activeEffects'
import type { BuffBuildContext } from './b02BuffSpecs'

function minutes(value: number): EffectDuration {
  return { unit: 'minutes', value, remaining_rounds: value * 10 }
}
function hours(value: number): EffectDuration {
  return { unit: 'hours', value, remaining_rounds: value * 600 }
}
function untilSourceTurn(): EffectDuration {
  return { unit: 'until_source_next_turn_end', value: 1, remaining_rounds: 1 }
}
function untilShortRest(): EffectDuration {
  return { unit: 'until_short_rest', value: 1 }
}
function untilLongRest(): EffectDuration {
  return { unit: 'until_long_rest', value: 1 }
}
function permanent(): EffectDuration {
  return { unit: 'permanent' }
}
function manual(): EffectDuration {
  return { unit: 'manual' }
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

function casterModOf(ctx: BuffBuildContext, fallback = 1): number {
  if (typeof ctx.casterMod === 'number' && Number.isFinite(ctx.casterMod)) {
    return Math.floor(ctx.casterMod)
  }
  return fallback
}

function chaBonusMin1(ctx: BuffBuildContext): number {
  return Math.max(1, casterModOf(ctx, 1))
}

function optionOf(ctx: BuffBuildContext): string {
  return String(ctx.option || '')
    .trim()
    .toLowerCase()
}

/** Temp HP from Dark One's Blessing: Cha mod + warlock level (min 1). */
export function darkOnesBlessingTempHp(warlockLevel: number, chaMod: number): number {
  return Math.max(1, Math.floor(chaMod) + Math.max(1, Math.floor(warlockLevel)))
}

/** Tomb of Levistus: 10 × warlock level temp HP. */
export function tombOfLevistusTempHp(warlockLevel: number): number {
  return 10 * Math.max(1, Math.floor(warlockLevel))
}

/** Inspiring Smite pool: 2d8 + paladin level (distributed by player). */
export function inspiringSmiteTempPool(paladinLevel: number, rng: () => number = Math.random): number {
  const a = 1 + Math.floor(rng() * 8)
  const b = 1 + Math.floor(rng() * 8)
  return a + b + Math.max(1, Math.floor(paladinLevel))
}

export const B05_BUFF_SPEC_BUILDERS: Record<string, SpecBuilder> = {
  // —— Paladin auras / channels ——
  aura_of_protection: (ctx) => {
    const n = chaBonusMin1(ctx)
    return {
      name: 'Аура защиты',
      slug: 'aura_of_protection',
      kind: 'feature',
      concentration: false,
      duration: permanent(),
      mods: [{ target: 'save', op: 'add', value: n, condition: 'all' }],
    }
  },
  aura_of_courage: () => ({
    name: 'Аура отваги',
    slug: 'aura_of_courage',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'label', op: 'set', condition: 'immune_frightened' }],
  }),
  aura_of_devotion: () => ({
    name: 'Аура верности',
    slug: 'aura_of_devotion',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'label', op: 'set', condition: 'immune_charmed' }],
  }),
  aura_of_warding: () => ({
    name: 'Аура опеки',
    slug: 'aura_of_warding',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'resistance', op: 'set', condition: 'spells' }],
  }),
  aura_of_alacrity: () => ({
    name: 'Аура рвения',
    slug: 'aura_of_alacrity',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'speed', op: 'add', value: 10 }],
  }),
  aura_of_the_sentinel: (ctx) => {
    const n = chaBonusMin1(ctx)
    return {
      name: 'Аура стража',
      slug: 'aura_of_the_sentinel',
      kind: 'feature',
      concentration: false,
      duration: permanent(),
      mods: [{ target: 'initiative', op: 'add', value: n }],
    }
  },
  cd_sacred_weapon: (ctx) => {
    const n = chaBonusMin1(ctx)
    return {
      name: 'Священное оружие',
      slug: 'cd_sacred_weapon',
      kind: 'feature',
      concentration: false,
      duration: minutes(1),
      mods: [
        { target: 'weapon_attack', op: 'add', value: n },
        { target: 'label', op: 'set', condition: 'sacred_weapon_light' },
      ],
    }
  },
  cd_vow_of_enmity: () => ({
    name: 'Обет вражды',
    slug: 'cd_vow_of_enmity',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [
      { target: 'advantage', op: 'advantage', condition: 'vow_target' },
      { target: 'label', op: 'set', condition: 'vow_target' },
    ],
  }),
  cd_inspiring_smite: (ctx) => {
    const level = classLevelOf(ctx, 1)
    const rolled =
      typeof ctx.slotLevel === 'number' && ctx.slotLevel > 0
        ? Math.floor(ctx.slotLevel)
        : level + 9 // placeholder average 2d8≈9 if not pre-rolled
    return {
      name: 'Вдохновляющая кара',
      slug: 'cd_inspiring_smite',
      kind: 'feature',
      concentration: false,
      duration: hours(1),
      mods: [{ target: 'temp_hp', op: 'set', value: Math.max(1, rolled) }],
    }
  },
  glorious_defense: (ctx) => {
    const n = chaBonusMin1(ctx)
    return {
      name: 'Блестящая оборона',
      slug: 'glorious_defense',
      kind: 'feature',
      concentration: false,
      duration: untilSourceTurn(),
      mods: [
        { target: 'ac', op: 'add', value: n, once: true },
        { target: 'label', op: 'set', condition: 'glorious_defense_riposte' },
      ],
    }
  },
  cd_watchers_will: () => ({
    name: 'Воля смотрителя',
    slug: 'cd_watchers_will',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [
      { target: 'advantage', op: 'advantage', condition: 'int' },
      { target: 'advantage', op: 'advantage', condition: 'wis' },
      { target: 'advantage', op: 'advantage', condition: 'cha' },
    ],
  }),
  cd_emissary_of_peace: () => ({
    name: 'Посланник мира',
    slug: 'cd_emissary_of_peace',
    kind: 'feature',
    concentration: false,
    duration: minutes(10),
    mods: [{ target: 'skill', op: 'add', value: 5, condition: 'persuasion' }],
  }),
  cd_turn_the_tide: (ctx) => {
    const n = Math.max(1, casterModOf(ctx, 1))
    return {
      name: 'Поворот волны',
      slug: 'cd_turn_the_tide',
      kind: 'feature',
      concentration: false,
      duration: manual(),
      mods: [
        { target: 'label', op: 'set', condition: 'turn_the_tide_heal' },
        { target: 'label', op: 'set', condition: `heal_1d6_plus_${n}` },
      ],
    }
  },
  unyielding_spirit: () => ({
    name: 'Непоколебимый дух',
    slug: 'unyielding_spirit',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'advantage', op: 'advantage', condition: 'paralyzed' },
      { target: 'advantage', op: 'advantage', condition: 'stunned' },
      { target: 'label', op: 'set', condition: 'adv_vs_paralyzed_stunned' },
    ],
  }),
  exalted_champion: () => ({
    name: 'Возвышенный чемпион',
    slug: 'exalted_champion',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [
      { target: 'resistance', op: 'set', condition: 'bludgeoning_nonmagic' },
      { target: 'resistance', op: 'set', condition: 'piercing_nonmagic' },
      { target: 'resistance', op: 'set', condition: 'slashing_nonmagic' },
      { target: 'advantage', op: 'advantage', condition: 'wis' },
      { target: 'label', op: 'set', condition: 'exalted_champion_aura' },
    ],
  }),
  supernatural_resistance: () => ({
    name: 'Сверхъестественное сопротивление',
    slug: 'supernatural_resistance',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'resistance', op: 'set', condition: 'bludgeoning_nonmagic' },
      { target: 'resistance', op: 'set', condition: 'piercing_nonmagic' },
      { target: 'resistance', op: 'set', condition: 'slashing_nonmagic' },
      { target: 'label', op: 'set', condition: 'oathbreaker' },
    ],
  }),

  // —— Warlock ——
  dark_ones_blessing: (ctx) => {
    const temp = darkOnesBlessingTempHp(classLevelOf(ctx, 1), casterModOf(ctx, 0))
    return {
      name: 'Благословение Темнейшего',
      slug: 'dark_ones_blessing',
      kind: 'feature',
      concentration: false,
      duration: hours(1),
      mods: [{ target: 'temp_hp', op: 'set', value: temp }],
    }
  },
  dark_ones_own_luck: () => ({
    name: 'Удача Темнейшего',
    slug: 'dark_ones_own_luck',
    kind: 'feature',
    concentration: false,
    duration: untilShortRest(),
    mods: [
      {
        target: 'attack_save',
        op: 'roll_die',
        dice: '1d10',
        once: true,
        condition: 'check_or_save',
      },
    ],
  }),
  improved_pact_weapon: () => ({
    name: 'Улучшенное оружие договора',
    slug: 'improved_pact_weapon',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'weapon_attack', op: 'add', value: 1 },
      { target: 'weapon_damage', op: 'add', value: 1 },
      { target: 'label', op: 'set', condition: 'pact_weapon_focus' },
    ],
  }),
  tomb_of_levistus: (ctx) => {
    const temp = tombOfLevistusTempHp(classLevelOf(ctx, 1))
    return {
      name: 'Гробница Левиста',
      slug: 'tomb_of_levistus',
      kind: 'feature',
      concentration: false,
      duration: untilSourceTurn(),
      mods: [
        { target: 'temp_hp', op: 'set', value: temp },
        { target: 'speed', op: 'set', value: 0 },
        { target: 'label', op: 'set', condition: 'restrained' },
        { target: 'label', op: 'set', condition: 'vulnerable_fire' },
      ],
    }
  },
  eldritch_mind: () => ({
    name: 'Элдрический разум',
    slug: 'eldritch_mind',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'advantage', op: 'advantage', condition: 'concentration' }],
  }),
  hexblades_curse: (ctx) => {
    const pb =
      typeof ctx.casterMod === 'number' && ctx.casterMod > 0
        ? Math.floor(ctx.casterMod)
        : Math.max(2, 2 + Math.floor((classLevelOf(ctx, 1) - 1) / 4))
    return {
      name: 'Проклятие ведьмовского клинка',
      slug: 'hexblades_curse',
      kind: 'feature',
      concentration: false,
      duration: minutes(1),
      mods: [
        {
          target: 'weapon_damage',
          op: 'add',
          value: pb,
          condition: 'cursed_target',
        },
        { target: 'label', op: 'set', condition: 'crit_19' },
        { target: 'label', op: 'set', condition: 'cursed_target' },
      ],
    }
  },
  celestial_resilience: (ctx) => {
    const self = Math.max(1, classLevelOf(ctx, 1) + casterModOf(ctx, 0))
    return {
      name: 'Небесная устойчивость',
      slug: 'celestial_resilience',
      kind: 'feature',
      concentration: false,
      duration: hours(1),
      mods: [{ target: 'temp_hp', op: 'set', value: self }],
    }
  },
  celestial_resilience_ally: (ctx) => {
    const self = Math.max(1, classLevelOf(ctx, 1) + casterModOf(ctx, 0))
    const half = Math.max(1, Math.floor(self / 2))
    return {
      name: 'Небесная устойчивость (союзник)',
      slug: 'celestial_resilience_ally',
      kind: 'feature',
      concentration: false,
      duration: hours(1),
      mods: [{ target: 'temp_hp', op: 'set', value: half }],
    }
  },
  healing_light: () => ({
    name: 'Целительный свет',
    slug: 'healing_light',
    kind: 'feature',
    concentration: false,
    duration: manual(),
    mods: [{ target: 'label', op: 'set', condition: 'healing_light_pool' }],
  }),
  pact_of_the_talisman: () => ({
    name: 'Договор талисмана',
    slug: 'pact_of_the_talisman',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [
      {
        target: 'check',
        op: 'roll_die',
        dice: '1d4',
        once: true,
        condition: 'failed_check',
      },
    ],
  }),
  elemental_gift: (ctx) => {
    const kind = optionOf(ctx) || 'fire'
    return {
      name: 'Дар стихии',
      slug: 'elemental_gift',
      kind: 'feature',
      concentration: false,
      duration: permanent(),
      mods: [
        { target: 'resistance', op: 'set', condition: kind },
        { target: 'label', op: 'set', condition: 'elemental_gift' },
      ],
    }
  },
  elemental_gift_flight: () => ({
    name: 'Дар стихии (полёт)',
    slug: 'elemental_gift_flight',
    kind: 'feature',
    concentration: false,
    duration: minutes(10),
    mods: [{ target: 'fly_speed', op: 'set', value: 30 }],
  }),
  among_the_dead: () => ({
    name: 'Среди мёртвых',
    slug: 'among_the_dead',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'label', op: 'set', condition: 'among_the_dead' }],
  }),
  defy_death: () => ({
    name: 'Бросить вызов смерти',
    slug: 'defy_death',
    kind: 'feature',
    concentration: false,
    duration: manual(),
    mods: [{ target: 'label', op: 'set', condition: 'defy_death_heal' }],
  }),
  indestructible_life: (ctx) => ({
    name: 'Неразрушимая жизнь',
    slug: 'indestructible_life',
    kind: 'feature',
    concentration: false,
    duration: manual(),
    mods: [
      {
        target: 'label',
        op: 'set',
        condition: `indestructible_life_${classLevelOf(ctx, 1)}`,
      },
    ],
  }),

  // —— Wizard ——
  spell_resistance: () => ({
    name: 'Сопротивление заклинаниям',
    slug: 'spell_resistance',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'advantage', op: 'advantage', condition: 'spells' },
      { target: 'resistance', op: 'set', condition: 'spells' },
      { target: 'label', op: 'set', condition: 'spell_damage_resist' },
    ],
  }),
  transmuters_stone: (ctx) => {
    const opt = optionOf(ctx) || 'speed'
    const mods: EffectMod[] = []
    if (opt === 'speed' || opt === 'скорость') {
      mods.push({ target: 'speed', op: 'add', value: 10 })
    } else if (opt === 'darkvision' || opt === 'зрение') {
      mods.push({ target: 'senses', op: 'set', value: 60, condition: 'darkvision' })
    } else if (opt === 'con' || opt === 'телосложение') {
      mods.push({ target: 'label', op: 'set', condition: 'con_save_proficiency' })
    } else {
      mods.push({ target: 'resistance', op: 'set', condition: opt || 'fire' })
    }
    return {
      name: 'Камень трансмутации',
      slug: 'transmuters_stone',
      kind: 'feature',
      concentration: false,
      duration: permanent(),
      mods,
    }
  },
  arcane_deflection: () => ({
    name: 'Магическое отражение',
    slug: 'arcane_deflection',
    kind: 'feature',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [
      { target: 'ac', op: 'add', value: 2, once: true },
      { target: 'save', op: 'add', value: 4, once: true, condition: 'all' },
      { target: 'label', op: 'set', condition: 'cantrips_only' },
    ],
  }),
  tactical_wit: (ctx) => {
    const n = casterModOf(ctx, 0)
    return {
      name: 'Тактическое чутьё',
      slug: 'tactical_wit',
      kind: 'feature',
      concentration: false,
      duration: permanent(),
      mods: [{ target: 'initiative', op: 'add', value: n }],
    }
  },
  durable_magic: () => ({
    name: 'Прочная магия',
    slug: 'durable_magic',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'ac', op: 'add', value: 2, condition: 'while_concentrating' },
      { target: 'save', op: 'add', value: 2, condition: 'all' },
      { target: 'label', op: 'set', condition: 'while_concentrating' },
    ],
  }),
  chronal_shift: () => ({
    name: 'Хроно-сдвиг',
    slug: 'chronal_shift',
    kind: 'feature',
    concentration: false,
    duration: manual(),
    mods: [{ target: 'label', op: 'set', condition: 'chronal_shift_reroll' }],
  }),
  convergent_future: () => ({
    name: 'Вероятное будущее',
    slug: 'convergent_future',
    kind: 'feature',
    concentration: false,
    duration: manual(),
    mods: [{ target: 'label', op: 'set', condition: 'convergent_future' }],
  }),
  adjust_density: (ctx) => {
    const lighter = optionOf(ctx) !== 'heavy' && optionOf(ctx) !== 'утяжел'
    return {
      name: 'Изменение плотности',
      slug: 'adjust_density',
      kind: 'feature',
      concentration: true,
      duration: minutes(1),
      mods: [
        { target: 'speed', op: 'add', value: lighter ? 10 : -10 },
        { target: 'label', op: 'set', condition: lighter ? 'density_light' : 'density_heavy' },
      ],
    }
  },

  // —— Ranger / Rogue ——
  multiattack_defense: () => ({
    name: 'Защита от множественных атак',
    slug: 'multiattack_defense',
    kind: 'feature',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [{ target: 'ac', op: 'add', value: 4 }],
  }),
  steel_will: () => ({
    name: 'Стальная воля',
    slug: 'steel_will',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'advantage', op: 'advantage', condition: 'frightened' },
      { target: 'label', op: 'set', condition: 'adv_vs_frightened' },
    ],
  }),
  colossus_slayer: () => ({
    name: 'Колосс-убийца',
    slug: 'colossus_slayer',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [
      {
        target: 'weapon_damage',
        op: 'roll_die',
        dice: '1d8',
        once: true,
        condition: 'marked_target_wounded',
      },
    ],
  }),
  slayers_prey: () => ({
    name: 'Добыча убийцы',
    slug: 'slayers_prey',
    kind: 'feature',
    concentration: false,
    duration: manual(),
    mods: [
      {
        target: 'weapon_damage',
        op: 'roll_die',
        dice: '1d6',
        once: true,
        condition: 'marked_target',
      },
    ],
  }),
  supernatural_defense: () => ({
    name: 'Сверхъестественная защита',
    slug: 'supernatural_defense',
    kind: 'feature',
    concentration: false,
    duration: manual(),
    mods: [
      {
        target: 'attack_save',
        op: 'roll_die',
        dice: '1d6',
        condition: 'vs_slayers_prey',
      },
    ],
  }),
  natures_veil: () => ({
    name: 'Завеса природы',
    slug: 'natures_veil',
    kind: 'feature',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [{ target: 'label', op: 'set', condition: 'invisible' }],
  }),
  dreadful_strikes: (ctx) => {
    const dice = classLevelOf(ctx, 1) >= 11 ? '1d6' : '1d4'
    return {
      name: 'Ужасающие удары',
      slug: 'dreadful_strikes',
      kind: 'feature',
      concentration: false,
      duration: permanent(),
      mods: [
        {
          target: 'weapon_damage',
          op: 'roll_die',
          dice,
          once: true,
          condition: 'psychic',
        },
      ],
    }
  },
  dread_ambusher: () => ({
    name: 'Жуткий преследователь',
    slug: 'dread_ambusher',
    kind: 'feature',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [
      { target: 'speed', op: 'add', value: 10 },
      {
        target: 'weapon_damage',
        op: 'roll_die',
        dice: '1d8',
        once: true,
        condition: 'first_turn_extra',
      },
      { target: 'label', op: 'set', condition: 'first_turn_extra_attack' },
    ],
  }),
  uncanny_dodge: () => ({
    name: 'Увёртливость',
    slug: 'uncanny_dodge',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'label', op: 'set', condition: 'uncanny_dodge' }],
  }),
  psi_bolstered_knack: () => ({
    name: 'Пси-укреплённая сноровка',
    slug: 'psi_bolstered_knack',
    kind: 'feature',
    concentration: false,
    duration: manual(),
    mods: [{ target: 'label', op: 'set', condition: 'psi_bolstered_knack' }],
  }),
  master_of_tactics: () => ({
    name: 'Мастер тактики',
    slug: 'master_of_tactics',
    kind: 'feature',
    concentration: false,
    duration: manual(),
    mods: [{ target: 'label', op: 'set', condition: 'help_bonus_action_30ft' }],
  }),
  perfected_bond: (ctx) => {
    const kind = optionOf(ctx) || 'all'
    return {
      name: 'Превосходная связь',
      slug: 'perfected_bond',
      kind: 'feature',
      concentration: false,
      duration: permanent(),
      mods: [
        { target: 'resistance', op: 'set', condition: kind === 'all' ? 'all_damage' : kind },
        { target: 'label', op: 'set', condition: 'perfected_bond_30ft' },
      ],
    }
  },

  // —— Sorcerer ——
  tides_of_chaos: () => ({
    name: 'Поток хаоса',
    slug: 'tides_of_chaos',
    kind: 'feature',
    concentration: false,
    duration: untilLongRest(),
    mods: [
      { target: 'advantage', op: 'advantage', condition: 'all', once: true },
      { target: 'label', op: 'set', condition: 'tides_of_chaos' },
    ],
  }),
  bend_luck: () => ({
    name: 'Подчинение удачи',
    slug: 'bend_luck',
    kind: 'feature',
    concentration: false,
    duration: manual(),
    mods: [
      {
        target: 'attack_save',
        op: 'roll_die',
        dice: '2d4',
        once: true,
        condition: 'bend_luck',
      },
    ],
  }),
  favored_by_the_gods: () => ({
    name: 'Любимчик богов',
    slug: 'favored_by_the_gods',
    kind: 'feature',
    concentration: false,
    duration: untilShortRest(),
    mods: [
      {
        target: 'attack_save',
        op: 'roll_die',
        dice: '2d4',
        once: true,
        condition: 'failed_attack_or_save',
      },
    ],
  }),
  strength_of_the_grave: () => ({
    name: 'Сила могилы',
    slug: 'strength_of_the_grave',
    kind: 'feature',
    concentration: false,
    duration: untilShortRest(),
    mods: [{ target: 'label', op: 'set', condition: 'drop_to_1_hp_cha' }],
  }),
  umbral_form: () => ({
    name: 'Мрачная форма',
    slug: 'umbral_form',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [
      { target: 'resistance', op: 'set', condition: 'all_except_radiant_force' },
      { target: 'label', op: 'set', condition: 'move_through_creatures' },
    ],
  }),
  wind_soul: () => ({
    name: 'Душа ветра',
    slug: 'wind_soul',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'immunity', op: 'set', condition: 'thunder' },
      { target: 'immunity', op: 'set', condition: 'lightning' },
      { target: 'fly_speed', op: 'set', value: 60 },
    ],
  }),
  wind_soul_share: () => ({
    name: 'Душа ветра (полёт союзникам)',
    slug: 'wind_soul_share',
    kind: 'feature',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'fly_speed', op: 'set', value: 30 }],
  }),
  psychic_defenses: () => ({
    name: 'Психическая защита',
    slug: 'psychic_defenses',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'resistance', op: 'set', condition: 'psychic' },
      { target: 'advantage', op: 'advantage', condition: 'charmed' },
      { target: 'advantage', op: 'advantage', condition: 'frightened' },
    ],
  }),
  restore_balance: () => ({
    name: 'Восстановление баланса',
    slug: 'restore_balance',
    kind: 'feature',
    concentration: false,
    duration: manual(),
    mods: [{ target: 'label', op: 'set', condition: 'cancel_adv_disadv' }],
  }),
  bastion_of_law: (ctx) => {
    const dice = Math.min(5, Math.max(1, classLevelOf(ctx, 1)))
    return {
      name: 'Бастион закона',
      slug: 'bastion_of_law',
      kind: 'feature',
      concentration: false,
      duration: untilLongRest(),
      charges: dice,
      mods: [{ target: 'label', op: 'set', condition: 'bastion_dice' }],
    }
  },
  trance_of_order: () => ({
    name: 'Медитация порядка',
    slug: 'trance_of_order',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [
      { target: 'label', op: 'set', condition: 'min_d20_10' },
      { target: 'label', op: 'set', condition: 'no_adv_vs_you' },
    ],
  }),
  magical_guidance: () => ({
    name: 'Волшебное указание',
    slug: 'magical_guidance',
    kind: 'feature',
    concentration: false,
    duration: manual(),
    mods: [{ target: 'label', op: 'set', condition: 'reroll_failed_check' }],
  }),
  lunar_empowerment: (ctx) => {
    const phase = optionOf(ctx) || 'full_moon'
    const mods: EffectMod[] = [{ target: 'label', op: 'set', condition: `lunar_${phase}` }]
    if (phase === 'full_moon' || phase === 'полная') {
      mods.push({ target: 'resistance', op: 'set', condition: 'radiant' })
    } else if (phase === 'new_moon' || phase === 'новая') {
      mods.push({ target: 'resistance', op: 'set', condition: 'necrotic' })
    } else {
      mods.push({ target: 'advantage', op: 'advantage', condition: 'stealth' })
    }
    return {
      name: 'Лунное усиление',
      slug: 'lunar_empowerment',
      kind: 'feature',
      concentration: false,
      duration: untilLongRest(),
      mods,
    }
  },
  lunar_phenomenon: (ctx) => {
    const phase = optionOf(ctx) || 'full_moon'
    return {
      name: 'Лунный феномен',
      slug: 'lunar_phenomenon',
      kind: 'feature',
      concentration: false,
      duration: minutes(1),
      mods: [{ target: 'label', op: 'set', condition: `lunar_phenomenon_${phase}` }],
    }
  },
}

export function buildB05BuffSpec(
  slug: string,
  ctx: BuffBuildContext = {},
): SpellBuffSpec | null {
  const builder = B05_BUFF_SPEC_BUILDERS[slug]
  if (!builder) return null
  return builder(ctx)
}

export const B05_NAME_TO_SLUG: Array<{ re: RegExp; slug: string }> = [
  { re: /^аура\s*защит(?!ы\s*от)|^aura\s*of\s*protection/iu, slug: 'aura_of_protection' },
  { re: /^аура\s*отваг|^aura\s*of\s*courage/iu, slug: 'aura_of_courage' },
  { re: /^аура\s*(верно|предан)|^aura\s*of\s*devotion/iu, slug: 'aura_of_devotion' },
  { re: /^аура\s*опек|^аура\s*защит\w*\s*от\s*маг|^aura\s*of\s*warding/iu, slug: 'aura_of_warding' },
  { re: /^аура\s*рвен|^aura\s*of\s*alacrity/iu, slug: 'aura_of_alacrity' },
  { re: /^аура\s*(страж|часов)|^aura\s*of\s*the\s*sentinel/iu, slug: 'aura_of_the_sentinel' },
  { re: /^священн\w*\s*оруж|^sacred\s*weapon/iu, slug: 'cd_sacred_weapon' },
  { re: /^обет\s*вражд|^vow\s*of\s*enmity/iu, slug: 'cd_vow_of_enmity' },
  { re: /^вдохновляющ\w*\s*кар|^inspiring\s*smite/iu, slug: 'cd_inspiring_smite' },
  { re: /^блестящ\w*\s*оборон|^славн\w*\s*оборон|^glorious\s*defense/iu, slug: 'glorious_defense' },
  { re: /^воля\s*смотрител|^watcher'?s?\s*will/iu, slug: 'cd_watchers_will' },
  { re: /^посланник\s*мира|^emissary\s*of\s*peace/iu, slug: 'cd_emissary_of_peace' },
  { re: /^поворот\s*волн|^переломн\w*\s*момент|^turn\s*the\s*tide/iu, slug: 'cd_turn_the_tide' },
  { re: /^непоколебим\w*\s*дух|^unyielding\s*spirit/iu, slug: 'unyielding_spirit' },
  { re: /^возвышенн\w*\s*чемпион|^exalted\s*champion/iu, slug: 'exalted_champion' },
  {
    re: /^сверхъестественн\w*\s*сопротивлени|^supernatural\s*resistance/iu,
    slug: 'supernatural_resistance',
  },
  { re: /^благословен\w*\s*темн|^dark\s*one'?s?\s*blessing/iu, slug: 'dark_ones_blessing' },
  { re: /^удач\w*\s*темн|^dark\s*one'?s?\s*own\s*luck/iu, slug: 'dark_ones_own_luck' },
  { re: /^улучшенн\w*\s*оруж\w*\s*договор|^improved\s*pact\s*weapon/iu, slug: 'improved_pact_weapon' },
  { re: /^гробниц\w*\s*левист|^tomb\s*of\s*levistus/iu, slug: 'tomb_of_levistus' },
  { re: /^элдрическ\w*\s*разум|^eldritch\s*mind/iu, slug: 'eldritch_mind' },
  { re: /^прокляти\w*\s*(ведьмов|хекс)|^hexblade'?s?\s*curse/iu, slug: 'hexblades_curse' },
  { re: /^небесн\w*\s*(устойчив|стойк)|^celestial\s*resilience/iu, slug: 'celestial_resilience' },
  { re: /^целителен\w*\s*свет|^healing\s*light/iu, slug: 'healing_light' },
  { re: /^договор\s*талисман|^pact\s*of\s*the\s*talisman/iu, slug: 'pact_of_the_talisman' },
  { re: /^дар\s*стихи|^elemental\s*gift/iu, slug: 'elemental_gift' },
  { re: /^среди\s*мёртв|^among\s*the\s*dead/iu, slug: 'among_the_dead' },
  { re: /^броси?ть\s*вызов\s*смерт|^defy\s*death/iu, slug: 'defy_death' },
  { re: /^неразрушим\w*\s*жизн|^indestructible\s*life/iu, slug: 'indestructible_life' },
  { re: /^сопротивлени\w*\s*заклинан|^spell\s*resistance/iu, slug: 'spell_resistance' },
  { re: /^камень\s*трансмут|^transmuter'?s?\s*stone/iu, slug: 'transmuters_stone' },
  { re: /^магическ\w*\s*(отражен|отклонен)|^arcane\s*deflection/iu, slug: 'arcane_deflection' },
  { re: /^тактическ\w*\s*чуть|^tactical\s*wit/iu, slug: 'tactical_wit' },
  { re: /^прочн\w*\s*маги|^стойк\w*\s*маги|^durable\s*magic/iu, slug: 'durable_magic' },
  { re: /^хроно[-‑]?сдвиг|^хрональн|^chronal\s*shift/iu, slug: 'chronal_shift' },
  { re: /^вероятн\w*\s*будущ|^сходящ|^convergent\s*future/iu, slug: 'convergent_future' },
  { re: /^изменен\w*\s*плотност|^adjust\s*density/iu, slug: 'adjust_density' },
  {
    re: /^защит\w*\s*от\s*множествен|^multiattack\s*defense/iu,
    slug: 'multiattack_defense',
  },
  { re: /^стальн\w*\s*вол|^steel\s*will/iu, slug: 'steel_will' },
  { re: /^колосс[-‑]?убийц|^убийц\w*\s*колосс|^colossus\s*slayer/iu, slug: 'colossus_slayer' },
  { re: /^добыч\w*\s*убийц|^добыч\w*\s*истребит|^slayer'?s?\s*prey/iu, slug: 'slayers_prey' },
  {
    re: /^сверхъестественн\w*\s*защит|^supernatural\s*defense/iu,
    slug: 'supernatural_defense',
  },
  { re: /^завес\w*\s*природ|^природн\w*\s*завес|^nature'?s?\s*veil/iu, slug: 'natures_veil' },
  { re: /^ужас\w*\s*удар|^dreadful\s*strikes/iu, slug: 'dreadful_strikes' },
  {
    re: /^жутк\w*\s*преследовател|^ужасн\w*\s*засад|^dread\s*ambusher/iu,
    slug: 'dread_ambusher',
  },
  { re: /^увёртливост|^невероятн\w*\s*уклон|^uncanny\s*dodge/iu, slug: 'uncanny_dodge' },
  {
    re: /^пси[-‑]?укрепл|^пси[-‑]?усилен|^psi[-‑]?bolstered/iu,
    slug: 'psi_bolstered_knack',
  },
  { re: /^мастер\s*тактик|^master\s*of\s*tactics/iu, slug: 'master_of_tactics' },
  { re: /^превосходн\w*\s*связ|^совершенн\w*\s*связ|^perfected\s*bond/iu, slug: 'perfected_bond' },
  { re: /^поток\s*хаос|^прилив\w*\s*хаос|^tides\s*of\s*chaos/iu, slug: 'tides_of_chaos' },
  { re: /^подчинен\w*\s*удач|^изгиб\s*удач|^bend\s*luck/iu, slug: 'bend_luck' },
  { re: /^любимчик\s*бог|^любимец\s*бог|^favored\s*by\s*the\s*gods/iu, slug: 'favored_by_the_gods' },
  { re: /^сила\s*могил|^strength\s*of\s*the\s*grave/iu, slug: 'strength_of_the_grave' },
  { re: /^мрачн\w*\s*форм|^умбральн|^umbral\s*form/iu, slug: 'umbral_form' },
  { re: /^душа\s*ветра|^wind\s*soul/iu, slug: 'wind_soul' },
  { re: /^психическ\w*\s*защит|^psychic\s*defenses/iu, slug: 'psychic_defenses' },
  { re: /^восстановлен\w*\s*баланс|^restore\s*balance/iu, slug: 'restore_balance' },
  { re: /^бастион\s*закон|^bastion\s*of\s*law/iu, slug: 'bastion_of_law' },
  { re: /^медитаци\w*\s*порядк|^транс\s*порядк|^trance\s*of\s*order/iu, slug: 'trance_of_order' },
  { re: /^волшебн\w*\s*указан|^магическ\w*\s*наставлен|^magical\s*guidance/iu, slug: 'magical_guidance' },
  { re: /^лунн\w*\s*усилен|^lunar\s*empowerment/iu, slug: 'lunar_empowerment' },
  { re: /^лунн\w*\s*феномен|^лунн\w*\s*явлен|^lunar\s*phenomenon/iu, slug: 'lunar_phenomenon' },
]
