/**
 * B-03: roll riders, advantage/disadvantage specs, duration/charge marks.
 * Looked up via buildBuffEffect alongside B01 / B02.
 */
import type { EffectDuration, SpellBuffSpec } from './activeEffects'
import type { BuffBuildContext } from './b02BuffSpecs'
import { damageTypeLabel, normalizeDamageType } from './damageTypes'

function hours(value: number): EffectDuration {
  return { unit: 'hours', value, remaining_rounds: value * 600 }
}
function minutes(value: number): EffectDuration {
  return { unit: 'minutes', value, remaining_rounds: value * 10 }
}
function rounds(value: number): EffectDuration {
  return { unit: 'rounds', value, remaining_rounds: value }
}
function days(value: number): EffectDuration {
  return { unit: 'hours', value: value * 24, remaining_rounds: value * 24 * 600 }
}

function slotOf(ctx: BuffBuildContext, fallback: number): number {
  const n = typeof ctx.slotLevel === 'number' ? ctx.slotLevel : fallback
  return Math.max(fallback, Math.floor(n))
}

function energyType(ctx: BuffBuildContext, fallback = 'fire'): string {
  const normalized = normalizeDamageType(ctx.option)
  if (normalized) return normalized
  const raw = (ctx.option || fallback).trim()
  return raw || fallback
}

type SpecBuilder = (ctx: BuffBuildContext) => SpellBuffSpec

/** Specs for B-03 catalog rows (riders / adv / marks). */
export const B03_BUFF_SPEC_BUILDERS: Record<string, SpecBuilder> = {
  true_strike: () => ({
    name: 'Меткий удар',
    slug: 'true_strike',
    kind: 'spell',
    concentration: true,
    duration: rounds(1),
    mods: [
      {
        target: 'advantage',
        op: 'advantage',
        condition: 'weapon_attack_once',
        once: true,
      },
    ],
  }),
  divine_favor: () => ({
    name: 'Божественное благоволение',
    slug: 'divine_favor',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      {
        target: 'weapon_damage',
        op: 'roll_die',
        dice: '1d4',
        condition: 'radiant',
      },
    ],
  }),
  sanctuary: () => ({
    name: 'Убежище',
    slug: 'sanctuary',
    kind: 'spell',
    concentration: false,
    duration: minutes(1),
    mods: [{ target: 'label', op: 'set', condition: 'sanctuary' }],
  }),
  expeditious_retreat: () => ({
    name: 'Поспешное отступление',
    slug: 'expeditious_retreat',
    kind: 'spell',
    concentration: true,
    duration: minutes(10),
    mods: [{ target: 'label', op: 'set', condition: 'dash_bonus_action' }],
  }),
  hunters_mark: (ctx) => {
    const slot = slotOf(ctx, 1)
    const dice = slot >= 5 ? '3d6' : slot >= 3 ? '2d6' : '1d6'
    const hoursValue = slot >= 5 ? 24 : slot >= 3 ? 8 : 1
    return {
      name: 'Метка охотника',
      slug: 'hunters_mark',
      kind: 'spell',
      concentration: true,
      duration: hours(hoursValue),
      mods: [
        {
          target: 'weapon_damage',
          op: 'roll_die',
          dice,
          condition: 'marked_target',
          once: false,
        },
        {
          target: 'advantage',
          op: 'advantage',
          condition: 'find_marked_target',
        },
        { target: 'label', op: 'set', condition: 'hunters_mark_target' },
      ],
    }
  },
  hex: (ctx) => {
    const slot = slotOf(ctx, 1)
    const hoursValue = slot >= 5 ? 24 : slot >= 3 ? 8 : 1
    const ability = (ctx.option || 'str').trim() || 'str'
    return {
      name: 'Сглаз',
      slug: 'hex',
      kind: 'spell',
      concentration: true,
      duration: hours(hoursValue),
      mods: [
        {
          target: 'weapon_damage',
          op: 'roll_die',
          dice: '1d6',
          condition: 'marked_target_necrotic',
          once: false,
        },
        {
          target: 'label',
          op: 'set',
          condition: `hex_ability_${ability}`,
        },
      ],
    }
  },
  ceremony_dedication: () => ({
    name: 'Церемония (посвящение)',
    slug: 'ceremony_dedication',
    kind: 'spell',
    concentration: false,
    duration: hours(24),
    mods: [{ target: 'save', op: 'roll_die', dice: '1d4' }],
  }),
  ceremony_coming_of_age: () => ({
    name: 'Церемония (становление)',
    slug: 'ceremony_coming_of_age',
    kind: 'spell',
    concentration: false,
    duration: hours(24),
    mods: [{ target: 'check', op: 'roll_die', dice: '1d4' }],
  }),
  searing_smite: (ctx) => {
    const slot = slotOf(ctx, 1)
    const dice = `${1 + Math.max(0, slot - 1)}d6`
    return {
      name: 'Палящая кара',
      slug: 'searing_smite',
      kind: 'spell',
      concentration: true,
      duration: minutes(1),
      mods: [
        {
          target: 'weapon_damage',
          op: 'roll_die',
          dice,
          condition: 'fire',
          once: true,
        },
        { target: 'label', op: 'set', condition: 'searing_smite_burn' },
      ],
    }
  },
  thunderous_smite: () => ({
    name: 'Громовая кара',
    slug: 'thunderous_smite',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      {
        target: 'weapon_damage',
        op: 'roll_die',
        dice: '2d6',
        condition: 'thunder',
        once: true,
      },
      { target: 'label', op: 'set', condition: 'thunderous_smite_push' },
    ],
  }),
  wrathful_smite: () => ({
    name: 'Гневная кара',
    slug: 'wrathful_smite',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      {
        target: 'weapon_damage',
        op: 'roll_die',
        dice: '1d6',
        condition: 'psychic',
        once: true,
      },
      { target: 'label', op: 'set', condition: 'wrathful_smite_fear' },
    ],
  }),
  branding_smite: (ctx) => {
    const slot = slotOf(ctx, 2)
    const dice = `${2 + Math.max(0, slot - 2)}d6`
    return {
      name: 'Клеймящая кара',
      slug: 'branding_smite',
      kind: 'spell',
      concentration: true,
      duration: minutes(1),
      mods: [
        {
          target: 'weapon_damage',
          op: 'roll_die',
          dice,
          condition: 'radiant',
          once: true,
        },
        { target: 'label', op: 'set', condition: 'branding_smite_glow' },
      ],
    }
  },
  blinding_smite: () => ({
    name: 'Ослепляющая кара',
    slug: 'blinding_smite',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      {
        target: 'weapon_damage',
        op: 'roll_die',
        dice: '3d8',
        condition: 'radiant',
        once: true,
      },
      { target: 'label', op: 'set', condition: 'blinding_smite_blind' },
    ],
  }),
  staggering_smite: () => ({
    name: 'Оглушающая кара',
    slug: 'staggering_smite',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      {
        target: 'weapon_damage',
        op: 'roll_die',
        dice: '4d6',
        condition: 'psychic',
        once: true,
      },
      { target: 'label', op: 'set', condition: 'staggering_smite_stun' },
    ],
  }),
  banishing_smite: () => ({
    name: 'Изгоняющая кара',
    slug: 'banishing_smite',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      {
        target: 'weapon_damage',
        op: 'roll_die',
        dice: '5d10',
        condition: 'force',
        once: true,
      },
      { target: 'label', op: 'set', condition: 'banishing_smite_banish' },
    ],
  }),
  invisibility: () => ({
    name: 'Невидимость',
    slug: 'invisibility',
    kind: 'spell',
    concentration: true,
    duration: hours(1),
    mods: [
      {
        target: 'advantage',
        op: 'advantage',
        condition: 'attack',
      },
      { target: 'label', op: 'set', condition: 'invisible_ends_on_attack_cast' },
    ],
  }),
  blur: () => ({
    name: 'Размытый образ',
    slug: 'blur',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      {
        target: 'disadvantage',
        op: 'disadvantage',
        condition: 'attacks_vs_you',
      },
      { target: 'label', op: 'set', condition: 'blur' },
    ],
  }),
  mirror_image: () => ({
    name: 'Отражения',
    slug: 'mirror_image',
    kind: 'spell',
    concentration: false,
    duration: minutes(1),
    charges: 3,
    mods: [
      {
        target: 'label',
        op: 'set',
        value: 3,
        condition: 'mirror_images',
      },
    ],
  }),
  levitate: () => ({
    name: 'Левитация',
    slug: 'levitate',
    kind: 'spell',
    concentration: true,
    duration: minutes(10),
    mods: [{ target: 'label', op: 'set', condition: 'levitate' }],
  }),
  warding_wind: () => ({
    name: 'Защитный ветер',
    slug: 'warding_wind',
    kind: 'spell',
    concentration: true,
    duration: minutes(10),
    mods: [
      {
        target: 'disadvantage',
        op: 'disadvantage',
        condition: 'ranged_weapon_vs_in_sphere',
      },
      { target: 'label', op: 'set', condition: 'warding_wind' },
      { target: 'label', op: 'set', condition: 'deafened_self' },
    ],
  }),
  crusaders_mantle: () => ({
    name: 'Мантия крестоносца',
    slug: 'crusaders_mantle',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      {
        target: 'weapon_damage',
        op: 'roll_die',
        dice: '1d4',
        condition: 'in_aura_radiant',
        once: false,
      },
      { target: 'label', op: 'set', condition: 'crusaders_mantle_aura' },
    ],
  }),
  aura_of_vitality: () => ({
    name: 'Аура живучести',
    slug: 'aura_of_vitality',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    charges: 10,
    mods: [
      {
        target: 'label',
        op: 'set',
        dice: '2d6',
        condition: 'aura_vitality_heal',
      },
    ],
  }),
  spirit_shroud: (ctx) => {
    const slot = slotOf(ctx, 3)
    const dice = `${1 + Math.max(0, Math.floor((slot - 3) / 2))}d8`
    const dtype = energyType(ctx, 'radiant')
    return {
      name: 'Покров духа',
      slug: 'spirit_shroud',
      kind: 'spell',
      concentration: true,
      duration: minutes(1),
      mods: [
        {
          target: 'weapon_damage',
          op: 'roll_die',
          dice,
          condition: dtype,
        },
        { target: 'label', op: 'set', condition: 'spirit_shroud_slow' },
      ],
    }
  },
  blink: () => ({
    name: 'Мерцание',
    slug: 'blink',
    kind: 'spell',
    concentration: false,
    duration: minutes(1),
    mods: [{ target: 'label', op: 'set', condition: 'blink' }],
  }),
  flame_arrows: (ctx) => {
    const slot = slotOf(ctx, 3)
    const charges = 12 + 2 * Math.max(0, slot - 3)
    return {
      name: 'Пылающие стрелы',
      slug: 'flame_arrows',
      kind: 'spell',
      concentration: true,
      duration: hours(1),
      charges,
      mods: [
        {
          target: 'weapon_damage',
          op: 'roll_die',
          dice: '1d6',
          condition: 'flame_arrows_fire',
          once: false,
        },
      ],
    }
  },
  water_walk: () => ({
    name: 'Хождение по воде',
    slug: 'water_walk',
    kind: 'spell',
    concentration: false,
    duration: hours(1),
    mods: [{ target: 'label', op: 'set', condition: 'water_walk' }],
  }),
  greater_invisibility: () => ({
    name: 'Высшая невидимость',
    slug: 'greater_invisibility',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [
      { target: 'advantage', op: 'advantage', condition: 'attack' },
      { target: 'label', op: 'set', condition: 'invisible' },
    ],
  }),
  otilukes_resilient_sphere: () => ({
    name: 'Отилюков упругий шар',
    slug: 'otilukes_resilient_sphere',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [{ target: 'label', op: 'set', condition: 'resilient_sphere' }],
  }),
  holy_weapon: () => ({
    name: 'Священное оружие',
    slug: 'holy_weapon',
    kind: 'spell',
    concentration: true,
    duration: hours(1),
    mods: [
      {
        target: 'weapon_damage',
        op: 'roll_die',
        dice: '2d8',
        condition: 'radiant',
      },
      { target: 'label', op: 'set', condition: 'weapon_magic' },
      { target: 'label', op: 'set', condition: 'holy_weapon_burst' },
    ],
  }),
  swift_quiver: () => ({
    name: 'Быстрый колчан',
    slug: 'swift_quiver',
    kind: 'spell',
    concentration: true,
    duration: minutes(1),
    mods: [{ target: 'label', op: 'set', condition: 'swift_quiver' }],
  }),
  antilife_shell: () => ({
    name: 'Преграда жизни',
    slug: 'antilife_shell',
    kind: 'spell',
    concentration: true,
    duration: hours(1),
    mods: [{ target: 'label', op: 'set', condition: 'antilife_shell' }],
  }),
  globe_of_invulnerability: (ctx) => {
    const slot = slotOf(ctx, 6)
    const threshold = slot >= 7 ? slot - 1 : 5
    return {
      name: 'Сфера неуязвимости',
      slug: 'globe_of_invulnerability',
      kind: 'spell',
      concentration: true,
      duration: minutes(1),
      mods: [
        {
          target: 'label',
          op: 'set',
          value: threshold,
          condition: 'globe_of_invulnerability',
        },
      ],
    }
  },
  contingency: () => ({
    name: 'Предосторожность',
    slug: 'contingency',
    kind: 'spell',
    concentration: false,
    duration: days(10),
    mods: [{ target: 'label', op: 'set', condition: 'contingency' }],
  }),
  etherealness: () => ({
    name: 'Эфирность',
    slug: 'etherealness',
    kind: 'spell',
    concentration: false,
    duration: hours(8),
    mods: [{ target: 'label', op: 'set', condition: 'etherealness' }],
  }),
  foresight: () => ({
    name: 'Предвидение',
    slug: 'foresight',
    kind: 'spell',
    concentration: false,
    duration: hours(8),
    mods: [
      { target: 'advantage', op: 'advantage', condition: 'attack' },
      { target: 'advantage', op: 'advantage', condition: 'check' },
      { target: 'advantage', op: 'advantage', condition: 'save' },
      {
        target: 'disadvantage',
        op: 'disadvantage',
        condition: 'attacks_vs_you',
      },
      { target: 'label', op: 'set', condition: 'foresight' },
    ],
  }),
  gift_of_alacrity: () => ({
    name: 'Дар проворства',
    slug: 'gift_of_alacrity',
    kind: 'spell',
    concentration: false,
    duration: hours(8),
    mods: [{ target: 'initiative', op: 'roll_die', dice: '1d8' }],
  }),
  fortunes_favor: () => ({
    name: 'Благосклонность судьбы',
    slug: 'fortunes_favor',
    kind: 'spell',
    concentration: false,
    duration: hours(1),
    charges: 1,
    mods: [
      {
        target: 'label',
        op: 'set',
        condition: 'fortunes_favor_luck',
      },
    ],
  }),
}

export const B03_NAME_TO_SLUG: Array<{ re: RegExp; slug: string }> = [
  { re: /^метк[\p{L}\p{N}_]*\s*удар|^true\s*strike/iu, slug: 'true_strike' },
  {
    re: /^божественн[\p{L}\p{N}_]*\s*благоволен|^divine\s*favor/iu,
    slug: 'divine_favor',
  },
  { re: /^убежищ|^sanctuary$/iu, slug: 'sanctuary' },
  {
    re: /^поспешн[\p{L}\p{N}_]*\s*отступлен|^expeditious\s*retreat/iu,
    slug: 'expeditious_retreat',
  },
  { re: /^метк[\p{L}\p{N}_]*\s*охотник|^hunter'?s?\s*mark/iu, slug: 'hunters_mark' },
  { re: /^сглаз|^hex$/iu, slug: 'hex' },
  {
    re: /^церемони.*посвящен|^ceremony.*dedication/iu,
    slug: 'ceremony_dedication',
  },
  {
    re: /^церемони.*становлен|^ceremony.*coming\s*of\s*age/iu,
    slug: 'ceremony_coming_of_age',
  },
  { re: /^палящ[\p{L}\p{N}_]*\s*кар|^searing\s*smite/iu, slug: 'searing_smite' },
  { re: /^громов[\p{L}\p{N}_]*\s*кар|^thunderous\s*smite/iu, slug: 'thunderous_smite' },
  { re: /^гневн[\p{L}\p{N}_]*\s*кар|^wrathful\s*smite/iu, slug: 'wrathful_smite' },
  { re: /^клеймящ[\p{L}\p{N}_]*\s*кар|^branding\s*smite/iu, slug: 'branding_smite' },
  { re: /^ослепляющ[\p{L}\p{N}_]*\s*кар|^blinding\s*smite/iu, slug: 'blinding_smite' },
  { re: /^оглушающ[\p{L}\p{N}_]*\s*кар|^staggering\s*smite/iu, slug: 'staggering_smite' },
  { re: /^изгоняющ[\p{L}\p{N}_]*\s*кар|^banishing\s*smite/iu, slug: 'banishing_smite' },
  { re: /^невидимост(?!.*высш)|^invisibility$/iu, slug: 'invisibility' },
  { re: /^размыт[\p{L}\p{N}_]*\s*образ|^blur$/iu, slug: 'blur' },
  { re: /^отражен|^mirror\s*image/iu, slug: 'mirror_image' },
  { re: /^левитац|^levitate/iu, slug: 'levitate' },
  { re: /^защитн[\p{L}\p{N}_]*\s*ветр|^warding\s*wind/iu, slug: 'warding_wind' },
  {
    re: /^манти[\p{L}\p{N}_]*\s*крестоносц|^crusader'?s?\s*mantle/iu,
    slug: 'crusaders_mantle',
  },
  { re: /^аура\s*живуч|^aura\s*of\s*vitality/iu, slug: 'aura_of_vitality' },
  { re: /^покров\s*дух|^spirit\s*shroud/iu, slug: 'spirit_shroud' },
  { re: /^мерцан|^blink$/iu, slug: 'blink' },
  { re: /^пылающ[\p{L}\p{N}_]*\s*стрел|^flame\s*arrows/iu, slug: 'flame_arrows' },
  { re: /^хожден[\p{L}\p{N}_]*\s*по\s*вод|^water\s*walk/iu, slug: 'water_walk' },
  {
    re: /^высш[\p{L}\p{N}_]*\s*невидимост|^greater\s*invisibility/iu,
    slug: 'greater_invisibility',
  },
  {
    re: /^отилюк[\p{L}\p{N}_]*\s*упруг|^otiluke'?s?\s*resilient/iu,
    slug: 'otilukes_resilient_sphere',
  },
  { re: /^священн[\p{L}\p{N}_]*\s*оруж|^holy\s*weapon/iu, slug: 'holy_weapon' },
  { re: /^быстр[\p{L}\p{N}_]*\s*колчан|^swift\s*quiver/iu, slug: 'swift_quiver' },
  { re: /^преград[\p{L}\p{N}_]*\s*жизн|^antilife\s*shell/iu, slug: 'antilife_shell' },
  {
    re: /^сфер[\p{L}\p{N}_]*\s*неуязвим|^globe\s*of\s*invulnerability/iu,
    slug: 'globe_of_invulnerability',
  },
  { re: /^предосторожн|^contingency/iu, slug: 'contingency' },
  { re: /^эфирност|^etherealness/iu, slug: 'etherealness' },
  { re: /^предвиден|^foresight/iu, slug: 'foresight' },
  { re: /^дар\s*проворств|^gift\s*of\s*alacrity/iu, slug: 'gift_of_alacrity' },
  {
    re: /^благосклонност[\p{L}\p{N}_]*\s*судьб|^fortune'?s?\s*favor/iu,
    slug: 'fortunes_favor',
  },
]

export function buildB03BuffSpec(
  slug: string,
  ctx: BuffBuildContext = {},
): SpellBuffSpec | null {
  const builder = B03_BUFF_SPEC_BUILDERS[slug]
  if (!builder) return null
  return builder(ctx)
}

/** Human-readable damage type for rider chips (RU nominative). */
export function riderDamageTypeRu(raw: string | null | undefined): string | null {
  if (!raw) return null
  const cleaned = String(raw)
    .replace(/^next_melee_/, '')
    .replace(/^marked_target_?/, '')
    .replace(/^in_aura_/, '')
    .replace(/^flame_arrows_/, '')
    .replace(/_once$/, '')
  const normalized = normalizeDamageType(cleaned)
  if (normalized) return damageTypeLabel(normalized)
  if (/radiant|излуч/i.test(cleaned)) return damageTypeLabel('radiant')
  if (/necrotic|некрот/i.test(cleaned)) return damageTypeLabel('necrotic')
  if (/psychic|психич/i.test(cleaned)) return damageTypeLabel('psychic')
  if (/thunder|звук/i.test(cleaned)) return damageTypeLabel('thunder')
  if (/force|силов/i.test(cleaned)) return damageTypeLabel('force')
  if (/fire|огн/i.test(cleaned)) return damageTypeLabel('fire')
  if (/cold|холод/i.test(cleaned)) return damageTypeLabel('cold')
  if (/lightning|молни|электр/i.test(cleaned)) return damageTypeLabel('lightning')
  if (/acid|кислот/i.test(cleaned)) return damageTypeLabel('acid')
  return null
}
