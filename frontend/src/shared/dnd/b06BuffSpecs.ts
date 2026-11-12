/**
 * B-06: Artificer infusions/elixirs/subclasses + duration potions.
 * Looked up via buildBuffEffect / guessBuffSlug alongside B01–B05.
 */
import type { EffectDuration, SpellBuffSpec } from './activeEffects'
import type { BuffBuildContext } from './b02BuffSpecs'

function minutes(value: number): EffectDuration {
  return { unit: 'minutes', value, remaining_rounds: value * 10 }
}
function hours(value: number): EffectDuration {
  return { unit: 'hours', value, remaining_rounds: value * 600 }
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

function optionOf(ctx: BuffBuildContext): string {
  return String(ctx.option || '')
    .trim()
    .toLowerCase()
}

/** Experimental elixir restorative reagents: 2d6 + Int (min 1). */
export function restorativeReagentsTempHp(
  intMod: number,
  rng: () => number = Math.random,
): number {
  const a = 1 + Math.floor(rng() * 6)
  const b = 1 + Math.floor(rng() * 6)
  return Math.max(1, a + b + Math.floor(intMod))
}

/** Eldritch Cannon Protector: 1d8 + Int (min +1). */
export function protectorCannonTempHp(
  intMod: number,
  rng: () => number = Math.random,
): number {
  const roll = 1 + Math.floor(rng() * 8)
  return roll + Math.max(1, Math.floor(intMod))
}

/** Defensive Field (Armorer Guardian): temp HP = artificer level. */
export function defensiveFieldTempHp(artificerLevel: number): number {
  return Math.max(1, Math.floor(artificerLevel))
}

/** Arcane Jolt dice: 2d6, or 4d6 at artificer 15+. */
export function arcaneJoltDice(artificerLevel: number): string {
  return Math.floor(artificerLevel) >= 15 ? '4d6' : '2d6'
}

const GIANT_STRENGTH_FLOORS: Record<string, number> = {
  potion_of_giant_strength: 21,
  potion_of_giant_strength_hill: 21,
  hill: 21,
  potion_of_giant_strength_frost: 23,
  frost: 23,
  potion_of_giant_strength_stone: 23,
  stone: 23,
  potion_of_giant_strength_fire: 25,
  fire: 25,
  potion_of_giant_strength_cloud: 27,
  cloud: 27,
  potion_of_giant_strength_storm: 29,
  storm: 29,
}

export function giantStrengthFloor(optionOrSlug: string | null | undefined): number {
  const key = String(optionOrSlug || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  return GIANT_STRENGTH_FLOORS[key] ?? 21
}

const RESISTANCE_LABEL_RU: Record<string, string> = {
  acid: 'кислоте',
  cold: 'холоду',
  fire: 'огню',
  force: 'силовому полю',
  lightning: 'молнии',
  necrotic: 'некротике',
  poison: 'яду',
  psychic: 'психической энергии',
  radiant: 'излучению',
  thunder: 'звуку',
}

function resistancePotionSpec(dtype: string): SpellBuffSpec {
  const label = RESISTANCE_LABEL_RU[dtype] || dtype
  return {
    name: `Зелье сопротивления (${label})`,
    slug: `potion_of_resistance_${dtype}`,
    kind: 'item',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'resistance', op: 'set', condition: dtype }],
  }
}

export const B06_BUFF_SPEC_BUILDERS: Record<string, SpecBuilder> = {
  // —— Artificer features (B24) ——
  flash_of_genius: (ctx) => {
    const n = Math.max(1, casterModOf(ctx, 1))
    return {
      name: 'Вспышка гениальности',
      slug: 'flash_of_genius',
      kind: 'feature',
      concentration: false,
      duration: manual(),
      mods: [
        {
          target: 'check',
          op: 'add',
          value: n,
          once: true,
          condition: 'flash_of_genius',
        },
        {
          target: 'save',
          op: 'add',
          value: n,
          once: true,
          condition: 'flash_of_genius',
        },
        {
          target: 'label',
          op: 'set',
          value: n,
          condition: 'flash_of_genius_chip',
        },
      ],
    }
  },
  soul_of_artifice: (ctx) => {
    // option / slotLevel = number of attuned magic items
    const attuned =
      typeof ctx.slotLevel === 'number' && ctx.slotLevel >= 0
        ? Math.floor(ctx.slotLevel)
        : typeof ctx.option === 'string' && /^\d+$/.test(ctx.option.trim())
          ? Math.floor(Number(ctx.option))
          : 0
    const n = Math.max(0, attuned)
    return {
      name: 'Душа изобретения',
      slug: 'soul_of_artifice',
      kind: 'feature',
      concentration: false,
      duration: permanent(),
      mods: [
        { target: 'save', op: 'add', value: n, condition: 'all' },
        { target: 'label', op: 'set', condition: 'soul_of_artifice_1hp' },
      ],
    }
  },
  experimental_elixir_swiftness: () => ({
    name: 'Экспериментальный эликсир (стремительность)',
    slug: 'experimental_elixir_swiftness',
    kind: 'feature',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'speed', op: 'add', value: 10 }],
  }),
  experimental_elixir_resilience: () => ({
    name: 'Экспериментальный эликсир (устойчивость)',
    slug: 'experimental_elixir_resilience',
    kind: 'feature',
    concentration: false,
    duration: minutes(10),
    mods: [{ target: 'ac', op: 'add', value: 1 }],
  }),
  experimental_elixir_boldness: () => ({
    name: 'Экспериментальный эликсир (смелость)',
    slug: 'experimental_elixir_boldness',
    kind: 'feature',
    concentration: false,
    duration: minutes(1),
    mods: [{ target: 'attack_save', op: 'roll_die', dice: '1d4', once: false }],
  }),
  experimental_elixir_flight: () => ({
    name: 'Экспериментальный эликсир (полёт)',
    slug: 'experimental_elixir_flight',
    kind: 'feature',
    concentration: false,
    duration: minutes(10),
    mods: [{ target: 'fly_speed', op: 'set', value: 10 }],
  }),
  /** Healing elixir is instant HP — spend path heals; this is a short label if needed. */
  experimental_elixir_healing: () => ({
    name: 'Экспериментальный эликсир (лечение)',
    slug: 'experimental_elixir_healing',
    kind: 'feature',
    concentration: false,
    duration: manual(),
    mods: [{ target: 'label', op: 'set', condition: 'elixir_healing_2d8_int' }],
  }),
  experimental_elixir_transformation: () => ({
    name: 'Экспериментальный эликсир (трансформация)',
    slug: 'experimental_elixir_transformation',
    kind: 'feature',
    concentration: false,
    duration: hours(10),
    mods: [{ target: 'label', op: 'set', condition: 'alter_self_elixir' }],
  }),
  restorative_reagents: (ctx) => {
    const rolled =
      typeof ctx.slotLevel === 'number' && ctx.slotLevel > 0
        ? Math.floor(ctx.slotLevel)
        : Math.max(1, 7 + casterModOf(ctx, 1))
    return {
      name: 'Восстанавливающие реагенты',
      slug: 'restorative_reagents',
      kind: 'feature',
      concentration: false,
      duration: hours(1),
      mods: [{ target: 'temp_hp', op: 'set', value: Math.max(1, rolled) }],
    }
  },
  eldritch_cannon_protector: (ctx) => {
    const rolled =
      typeof ctx.slotLevel === 'number' && ctx.slotLevel > 0
        ? Math.floor(ctx.slotLevel)
        : protectorCannonTempHp(casterModOf(ctx, 1), () => 0.5)
    return {
      name: 'Мистическая пушка: защитник',
      slug: 'eldritch_cannon_protector',
      kind: 'feature',
      concentration: false,
      duration: hours(1),
      mods: [{ target: 'temp_hp', op: 'set', value: Math.max(1, rolled) }],
    }
  },
  fortified_position: () => ({
    name: 'Укреплённая позиция',
    slug: 'fortified_position',
    kind: 'feature',
    concentration: false,
    duration: hours(1),
    mods: [
      { target: 'ac', op: 'add', value: 2, condition: 'half_cover' },
      { target: 'save', op: 'add', value: 2, condition: 'dex' },
      { target: 'label', op: 'set', condition: 'fortified_position_half_cover' },
    ],
  }),
  arcane_jolt: (ctx) => {
    const dice = arcaneJoltDice(classLevelOf(ctx, 9))
    const mode = optionOf(ctx) === 'heal' ? 'heal' : 'damage'
    return {
      name: 'Магический импульс',
      slug: 'arcane_jolt',
      kind: 'feature',
      concentration: false,
      duration: manual(),
      mods:
        mode === 'heal'
          ? [{ target: 'label', op: 'set', dice, condition: 'arcane_jolt_heal' }]
          : [
              {
                target: 'weapon_damage',
                op: 'roll_die',
                dice,
                once: true,
                condition: 'arcane_jolt_force',
              },
            ],
    }
  },
  defensive_field: (ctx) => {
    const n = defensiveFieldTempHp(classLevelOf(ctx, 1))
    return {
      name: 'Защитное поле',
      slug: 'defensive_field',
      kind: 'feature',
      concentration: false,
      duration: untilLongRest(),
      mods: [
        { target: 'temp_hp', op: 'set', value: n },
        { target: 'label', op: 'set', condition: 'defensive_field_armor' },
      ],
    }
  },
  infiltrator_model: () => ({
    name: 'Модель «Диверсант»',
    slug: 'infiltrator_model',
    kind: 'feature',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'speed', op: 'add', value: 5 },
      { target: 'advantage', op: 'advantage', condition: 'stealth' },
      { target: 'label', op: 'set', condition: 'infiltrator_dampening' },
    ],
  }),

  // —— Duration potions (B25) ——
  potion_of_giant_strength: (ctx) => {
    const floor = giantStrengthFloor(optionOf(ctx) || 'hill')
    return {
      name: 'Зелье силы великана',
      slug: 'potion_of_giant_strength',
      kind: 'item',
      concentration: false,
      duration: hours(1),
      mods: [{ target: 'ability_score', op: 'set', value: floor, condition: 'str' }],
    }
  },
  potion_of_giant_strength_hill: () => ({
    name: 'Зелье силы холмового великана',
    slug: 'potion_of_giant_strength_hill',
    kind: 'item',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'ability_score', op: 'set', value: 21, condition: 'str' }],
  }),
  potion_of_giant_strength_frost: () => ({
    name: 'Зелье силы морозного великана',
    slug: 'potion_of_giant_strength_frost',
    kind: 'item',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'ability_score', op: 'set', value: 23, condition: 'str' }],
  }),
  potion_of_giant_strength_stone: () => ({
    name: 'Зелье силы каменного великана',
    slug: 'potion_of_giant_strength_stone',
    kind: 'item',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'ability_score', op: 'set', value: 23, condition: 'str' }],
  }),
  potion_of_giant_strength_fire: () => ({
    name: 'Зелье силы огненного великана',
    slug: 'potion_of_giant_strength_fire',
    kind: 'item',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'ability_score', op: 'set', value: 25, condition: 'str' }],
  }),
  potion_of_giant_strength_cloud: () => ({
    name: 'Зелье силы облачного великана',
    slug: 'potion_of_giant_strength_cloud',
    kind: 'item',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'ability_score', op: 'set', value: 27, condition: 'str' }],
  }),
  potion_of_giant_strength_storm: () => ({
    name: 'Зелье силы штормового великана',
    slug: 'potion_of_giant_strength_storm',
    kind: 'item',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'ability_score', op: 'set', value: 29, condition: 'str' }],
  }),
  potion_of_resistance: (ctx) => {
    const dtype = optionOf(ctx) || 'fire'
    return resistancePotionSpec(dtype)
  },
  potion_of_resistance_fire: () => resistancePotionSpec('fire'),
  potion_of_resistance_cold: () => resistancePotionSpec('cold'),
  potion_of_resistance_poison: () => resistancePotionSpec('poison'),
  potion_of_resistance_acid: () => resistancePotionSpec('acid'),
  potion_of_resistance_force: () => resistancePotionSpec('force'),
  potion_of_resistance_lightning: () => resistancePotionSpec('lightning'),
  potion_of_resistance_necrotic: () => resistancePotionSpec('necrotic'),
  potion_of_resistance_psychic: () => resistancePotionSpec('psychic'),
  potion_of_resistance_radiant: () => resistancePotionSpec('radiant'),
  potion_of_resistance_thunder: () => resistancePotionSpec('thunder'),
  potion_of_heroism: () => ({
    name: 'Зелье героизма',
    slug: 'potion_of_heroism',
    kind: 'item',
    concentration: false,
    duration: hours(1),
    mods: [
      { target: 'temp_hp', op: 'set', value: 10 },
      { target: 'attack_save', op: 'roll_die', dice: '1d4', once: false },
    ],
  }),
  potion_of_flying: () => ({
    name: 'Зелье полёта',
    slug: 'potion_of_flying',
    kind: 'item',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'fly_speed', op: 'set', condition: 'equal_walk' }],
  }),
  potion_of_climbing: () => ({
    name: 'Зелье лазания',
    slug: 'potion_of_climbing',
    kind: 'item',
    concentration: false,
    duration: hours(1),
    mods: [
      { target: 'climb_speed', op: 'set', condition: 'equal_walk' },
      {
        target: 'advantage',
        op: 'advantage',
        condition: 'athletics_climb',
      },
    ],
  }),
  potion_of_speed: () => ({
    name: 'Зелье скорости',
    slug: 'potion_of_speed',
    kind: 'item',
    concentration: false,
    duration: minutes(1),
    mods: [
      { target: 'speed', op: 'mul', value: 2 },
      { target: 'ac', op: 'add', value: 2 },
      { target: 'save', op: 'advantage', condition: 'dex' },
      { target: 'label', op: 'set', condition: 'haste_action' },
      // DMG potion: no lethargy listed on catalog card — keep as label note only if needed.
    ],
  }),
  potion_of_invisibility: () => ({
    name: 'Зелье невидимости',
    slug: 'potion_of_invisibility',
    kind: 'item',
    concentration: false,
    duration: hours(1),
    mods: [
      { target: 'advantage', op: 'advantage', condition: 'attack' },
      { target: 'label', op: 'set', condition: 'invisible_ends_on_attack_cast' },
    ],
  }),
  potion_of_growth: (ctx) => {
    const hrs =
      typeof ctx.slotLevel === 'number' && ctx.slotLevel >= 1 && ctx.slotLevel <= 4
        ? Math.floor(ctx.slotLevel)
        : 2
    return {
      name: 'Зелье роста',
      slug: 'potion_of_growth',
      kind: 'item',
      concentration: false,
      duration: hours(hrs),
      mods: [
        { target: 'advantage', op: 'advantage', condition: 'str' },
        { target: 'label', op: 'set', condition: 'size_up_weapon_d4' },
      ],
    }
  },
  potion_of_gaseous_form: () => ({
    name: 'Зелье газообразной формы',
    slug: 'potion_of_gaseous_form',
    kind: 'item',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'label', op: 'set', condition: 'gaseous_form' }],
  }),
  potion_of_water_breathing: () => ({
    name: 'Зелье подводного дыхания',
    slug: 'potion_of_water_breathing',
    kind: 'item',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'label', op: 'set', condition: 'water_breathing' }],
  }),
  potion_of_mind_reading: () => ({
    name: 'Зелье чтения мыслей',
    slug: 'potion_of_mind_reading',
    kind: 'item',
    concentration: false,
    // Detect Thoughts duration is 1 minute (card text «10 мин» is wrong — report error).
    duration: minutes(1),
    mods: [
      { target: 'label', op: 'set', value: 13, condition: 'detect_thoughts_dc13' },
    ],
  }),
  potion_of_giant_size: () => ({
    name: 'Зелье размера великана',
    slug: 'potion_of_giant_size',
    kind: 'item',
    concentration: false,
    duration: hours(24),
    mods: [
      { target: 'ability_score', op: 'set', value: 25, condition: 'str' },
      { target: 'label', op: 'set', condition: 'giant_size_huge' },
      { target: 'label', op: 'set', condition: 'reach_plus_5' },
      // hp_max ×2 is applied at drink time as add = current max (see spendConsumable).
    ],
  }),
  potion_of_maximum_power: () => ({
    name: 'Зелье максимальной силы',
    slug: 'potion_of_maximum_power',
    kind: 'item',
    concentration: false,
    duration: minutes(1),
    mods: [
      {
        target: 'label',
        op: 'set',
        condition: 'max_spell_damage_dice_le4',
      },
    ],
  }),
}

export function buildB06BuffSpec(
  slug: string,
  ctx: BuffBuildContext = {},
): SpellBuffSpec | null {
  const builder = B06_BUFF_SPEC_BUILDERS[slug]
  if (!builder) return null
  return builder(ctx)
}

/** Map experimental elixir d6 (1–6) → buff slug. */
export function experimentalElixirSlugFromRoll(roll: number): string {
  const n = Math.max(1, Math.min(6, Math.floor(roll)))
  switch (n) {
    case 1:
      return 'experimental_elixir_healing'
    case 2:
      return 'experimental_elixir_swiftness'
    case 3:
      return 'experimental_elixir_resilience'
    case 4:
      return 'experimental_elixir_boldness'
    case 5:
      return 'experimental_elixir_flight'
    default:
      return 'experimental_elixir_transformation'
  }
}

export const B06_NAME_TO_SLUG: Array<{ re: RegExp; slug: string }> = [
  {
    re: /^вспышк\w*\s*гениальн|^проблеск\w*\s*гениальн|^flash\s*of\s*genius/iu,
    slug: 'flash_of_genius',
  },
  { re: /^душа\s*изобретен|^soul\s*of\s*artifice/iu, slug: 'soul_of_artifice' },
  {
    re: /^экспериментальн\w*\s*эликсир\s*\(?\s*стремитель|^experimental\s*elixir\s*\(?\s*swift/iu,
    slug: 'experimental_elixir_swiftness',
  },
  {
    re: /^экспериментальн\w*\s*эликсир\s*\(?\s*устойчив|^experimental\s*elixir\s*\(?\s*resilien/iu,
    slug: 'experimental_elixir_resilience',
  },
  {
    re: /^экспериментальн\w*\s*эликсир\s*\(?\s*смел|^experimental\s*elixir\s*\(?\s*bold/iu,
    slug: 'experimental_elixir_boldness',
  },
  {
    re: /^экспериментальн\w*\s*эликсир\s*\(?\s*пол[её]т|^experimental\s*elixir\s*\(?\s*flight/iu,
    slug: 'experimental_elixir_flight',
  },
  {
    re: /^восстанавливающ\w*\s*реагент|^restorative\s*reagents/iu,
    slug: 'restorative_reagents',
  },
  {
    re: /^мистическ\w*\s*пушк\w*.*защитник|^eldritch\s*cannon.*protector/iu,
    slug: 'eldritch_cannon_protector',
  },
  { re: /^укрепл[её]нн\w*\s*позици|^fortified\s*position/iu, slug: 'fortified_position' },
  {
    re: /^магическ\w*\s*(импульс|встряск)|^arcane\s*jolt/iu,
    slug: 'arcane_jolt',
  },
  { re: /^защитн\w*\s*поле|^defensive\s*field/iu, slug: 'defensive_field' },
  {
    re: /^модель\s*[«"]?диверсант|^заряженн\w*\s*шаг|^infiltrator\s*model/iu,
    slug: 'infiltrator_model',
  },
  {
    re: /^зелье\s*силы\s*(холмов|великан)|^potion\s*of\s*(hill\s*)?giant\s*strength/iu,
    slug: 'potion_of_giant_strength',
  },
  {
    re: /^зелье\s*сопротивлени|^potion\s*of\s*resistance/iu,
    slug: 'potion_of_resistance',
  },
  { re: /^зелье\s*героизм|^potion\s*of\s*heroism/iu, slug: 'potion_of_heroism' },
  { re: /^зелье\s*пол[её]т|^potion\s*of\s*flying/iu, slug: 'potion_of_flying' },
  { re: /^зелье\s*лазани|^potion\s*of\s*climbing/iu, slug: 'potion_of_climbing' },
  { re: /^зелье\s*скорост|^potion\s*of\s*speed/iu, slug: 'potion_of_speed' },
  {
    re: /^зелье\s*невидимост|^potion\s*of\s*invisibility/iu,
    slug: 'potion_of_invisibility',
  },
  {
    re: /^зелье\s*(роста|увеличени)|^potion\s*of\s*growth/iu,
    slug: 'potion_of_growth',
  },
  {
    re: /^зелье\s*газообразн|^potion\s*of\s*gaseous\s*form/iu,
    slug: 'potion_of_gaseous_form',
  },
  {
    re: /^зелье\s*(подводн|водн)\w*\s*дыхани|^potion\s*of\s*water\s*breathing/iu,
    slug: 'potion_of_water_breathing',
  },
  {
    re: /^зелье\s*чтен\w*\s*мысл|^potion\s*of\s*mind\s*reading/iu,
    slug: 'potion_of_mind_reading',
  },
  {
    re: /^зелье\s*размера\s*великан|^potion\s*of\s*giant\s*size/iu,
    slug: 'potion_of_giant_size',
  },
  {
    re: /^зелье\s*максимальн\w*\s*сил|^potion\s*of\s*maximum\s*power/iu,
    slug: 'potion_of_maximum_power',
  },
]
