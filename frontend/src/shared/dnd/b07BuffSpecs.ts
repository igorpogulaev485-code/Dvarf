/**
 * B-07: feat buff specs (Inspiring Leader, Chef snacks, reaction AC, giant/dragon spends…).
 * Wired via buildBuffEffect / guessBuffSlug after B-01 and beside B-06.
 */
import type { EffectDuration, SpellBuffSpec } from './activeEffects'
import type { BuffBuildContext } from './b02BuffSpecs'
import {
  chefSnackTempHp,
  inspiringLeaderTempHp,
} from './b07FeatCombat'

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

function levelOf(ctx: BuffBuildContext, fallback = 1): number {
  const n =
    typeof ctx.classLevel === 'number'
      ? ctx.classLevel
      : typeof ctx.slotLevel === 'number'
        ? ctx.slotLevel
        : fallback
  return Math.max(1, Math.floor(n))
}

function modOf(ctx: BuffBuildContext, fallback = 0): number {
  if (typeof ctx.casterMod === 'number' && Number.isFinite(ctx.casterMod)) {
    return Math.floor(ctx.casterMod)
  }
  return fallback
}

function optionOf(ctx: BuffBuildContext): string {
  return String(ctx.option || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
}

export function inspiringLeaderTempFromCtx(ctx: BuffBuildContext): number {
  return inspiringLeaderTempHp(levelOf(ctx, 1), modOf(ctx, 0))
}

export function chefSnackTempFromCtx(ctx: BuffBuildContext): number {
  // casterMod carries proficiency bonus for snacks.
  return chefSnackTempHp(Math.max(1, modOf(ctx, 2)))
}

export const B07_BUFF_SPEC_BUILDERS: Record<string, SpecBuilder> = {
  inspiring_leader: (ctx) => {
    const temp = inspiringLeaderTempFromCtx(ctx)
    return {
      name: 'Воодушевляющий лидер',
      slug: 'inspiring_leader',
      kind: 'feat',
      concentration: false,
      duration: untilShortRest(),
      mods: [
        { target: 'temp_hp', op: 'set', value: temp },
        {
          target: 'label',
          op: 'set',
          condition: 'inspiring_leader_once_per_rest',
        },
      ],
    }
  },

  chef_snack: (ctx) => {
    const temp = chefSnackTempFromCtx(ctx)
    return {
      name: 'Закуска шеф-повара',
      slug: 'chef_snack',
      kind: 'feat',
      concentration: false,
      duration: hours(8),
      mods: [{ target: 'temp_hp', op: 'set', value: temp }],
    }
  },

  /** Marker that food was cooked this short rest (heal +1d8 is applied at rest spend). */
  chef_food: (_ctx) => ({
    name: 'Еда шеф-повара',
    slug: 'chef_food',
    kind: 'feat',
    concentration: false,
    duration: untilShortRest(),
    mods: [{ target: 'label', op: 'set', condition: 'chef_food_hd_bonus_1d8' }],
  }),

  defensive_duelist: (ctx) => {
    const pb = Math.max(2, modOf(ctx, 2))
    return {
      name: 'Оборонительный дуэлянт',
      slug: 'defensive_duelist',
      kind: 'feat',
      concentration: false,
      duration: untilSourceTurn(),
      mods: [
        {
          target: 'ac',
          op: 'add',
          value: pb,
          once: true,
          condition: 'vs_this_melee_attack',
        },
      ],
      charges: 1,
    }
  },

  protective_wings: (ctx) => {
    const pb = Math.max(2, modOf(ctx, 2))
    return {
      name: 'Защитные крылья',
      slug: 'protective_wings',
      kind: 'feat',
      concentration: false,
      duration: untilSourceTurn(),
      mods: [
        {
          target: 'ac',
          op: 'add',
          value: pb,
          once: true,
          condition: 'vs_this_attack',
        },
      ],
      charges: 1,
    }
  },

  chromatic_resistance: (ctx) => {
    const dtype = optionOf(ctx) || 'fire'
    const labels: Record<string, string> = {
      acid: 'кислоте',
      fire: 'огню',
      lightning: 'молнии',
      poison: 'яду',
      cold: 'холоду',
    }
    const label = labels[dtype] || dtype
    return {
      name: `Реактивное сопротивление (${label})`,
      slug: 'chromatic_resistance',
      kind: 'feat',
      concentration: false,
      duration: untilSourceTurn(),
      mods: [{ target: 'resistance', op: 'set', condition: dtype }],
    }
  },

  chromatic_infusion: (ctx) => {
    const dtype = optionOf(ctx) || 'fire'
    return {
      name: 'Дар цветного дракона: стихия оружия',
      slug: 'chromatic_infusion',
      kind: 'feat',
      concentration: false,
      duration: minutes(1),
      mods: [
        {
          target: 'weapon_damage',
          op: 'roll_die',
          dice: '1d4',
          condition: dtype,
        },
      ],
    }
  },

  savage_attacker: (_ctx) => ({
    name: 'Дикий атакующий',
    slug: 'savage_attacker',
    kind: 'feat',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [{ target: 'label', op: 'set', condition: 'savage_attacker_used' }],
  }),

  bountiful_luck: (_ctx) => ({
    name: 'Бездонная удача',
    slug: 'bountiful_luck',
    kind: 'feat',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [
      {
        target: 'attack_save',
        op: 'roll_die',
        dice: '1d20',
        once: true,
        condition: 'bountiful_luck_reroll',
      },
      {
        target: 'check',
        op: 'roll_die',
        dice: '1d20',
        once: true,
        condition: 'bountiful_luck_reroll',
      },
    ],
    charges: 1,
  }),

  flames_of_phlegethos_shield: (_ctx) => ({
    name: 'Пламя Флегетоса',
    slug: 'flames_of_phlegethos_shield',
    kind: 'feat',
    concentration: false,
    duration: untilSourceTurn(),
    mods: [{ target: 'label', op: 'set', condition: 'phlegethos_fire_shield' }],
  }),

  second_chance_spent: (_ctx) => ({
    name: 'Второй шанс (использован)',
    slug: 'second_chance_spent',
    kind: 'feat',
    concentration: false,
    duration: untilShortRest(),
    mods: [{ target: 'label', op: 'set', condition: 'second_chance_spent' }],
  }),

  precise_strike: (_ctx) => ({
    name: 'Точный удар',
    slug: 'precise_strike',
    kind: 'feat',
    concentration: false,
    duration: manual(),
    mods: [
      {
        target: 'attack',
        op: 'roll_die',
        dice: '1d8',
        once: true,
        condition: 'precise_strike',
      },
    ],
    charges: 1,
  }),

  bolstering_rally: (ctx) => {
    // Temp HP = Cha mod (casterMod) + PB (classLevel).
    const temp = Math.max(1, modOf(ctx, 0) + levelOf(ctx, 2))
    return {
      name: 'Укрепляющий призыв',
      slug: 'bolstering_rally',
      kind: 'feat',
      concentration: false,
      duration: untilShortRest(),
      mods: [{ target: 'temp_hp', op: 'set', value: temp }],
    }
  },

  commanding_rally: (_ctx) => ({
    name: 'Командный призыв',
    slug: 'commanding_rally',
    kind: 'feat',
    concentration: false,
    duration: manual(),
    mods: [
      {
        target: 'attack',
        op: 'roll_die',
        dice: '1d8',
        once: true,
        condition: 'commanding_rally',
      },
    ],
    charges: 1,
  }),

  demoralizing_strike: (_ctx) => ({
    name: 'Деморализующий удар',
    slug: 'demoralizing_strike',
    kind: 'feat',
    concentration: false,
    duration: minutes(1),
    mods: [
      {
        target: 'weapon_damage',
        op: 'roll_die',
        dice: '1d8',
        once: true,
        condition: 'psychic',
      },
      {
        target: 'label',
        op: 'set',
        condition: 'demoralizing_strike_lobby',
      },
    ],
  }),

  strike_of_the_giants: (ctx) => {
    const opt = optionOf(ctx) || 'hill'
    const table: Record<string, { dice: string; type: string; name: string }> = {
      hill: { dice: '1d6', type: 'bludgeoning', name: 'Удар холмового великана' },
      stone: { dice: '1d6', type: 'bludgeoning', name: 'Удар каменного великана' },
      frost: { dice: '1d6', type: 'cold', name: 'Удар ледяного великана' },
      fire: { dice: '1d8', type: 'fire', name: 'Удар огненного великана' },
      cloud: { dice: '1d4', type: 'thunder', name: 'Удар облачного великана' },
      storm: { dice: '1d6', type: 'lightning', name: 'Удар штормового великана' },
    }
    const row = table[opt] || table.hill!
    return {
      name: row.name,
      slug: 'strike_of_the_giants',
      kind: 'feat',
      concentration: false,
      duration: untilSourceTurn(),
      mods: [
        {
          target: 'weapon_damage',
          op: 'roll_die',
          dice: row.dice,
          once: true,
          condition: row.type,
        },
      ],
    }
  },

  vigor_of_the_hill_giant: (_ctx) => ({
    name: 'Стойкость холмового великана',
    slug: 'vigor_of_the_hill_giant',
    kind: 'feat',
    concentration: false,
    duration: untilLongRest(),
    mods: [{ target: 'label', op: 'set', condition: 'hill_giant_vigor' }],
  }),

  soul_of_the_storm_giant: (_ctx) => ({
    name: 'Аура водоворота',
    slug: 'soul_of_the_storm_giant',
    kind: 'feat',
    concentration: false,
    duration: minutes(10),
    mods: [{ target: 'label', op: 'set', condition: 'maelstrom_aura' }],
  }),

  maelstrom_aura: (_ctx) => ({
    name: 'Аура водоворота',
    slug: 'maelstrom_aura',
    kind: 'feat',
    concentration: false,
    duration: minutes(10),
    mods: [{ target: 'label', op: 'set', condition: 'maelstrom_aura' }],
  }),

  magical_balance: (_ctx) => ({
    name: 'Магический баланс',
    slug: 'magical_balance',
    kind: 'feat',
    concentration: false,
    duration: manual(),
    mods: [
      {
        target: 'save',
        op: 'roll_die',
        dice: '1d4',
        once: true,
        condition: 'magical_balance',
      },
    ],
    charges: 1,
  }),

  protective_ward: (ctx) => {
    const pb = Math.max(2, modOf(ctx, 2))
    return {
      name: 'Защитная опека',
      slug: 'protective_ward',
      kind: 'feat',
      concentration: false,
      duration: untilSourceTurn(),
      mods: [{ target: 'ac', op: 'add', value: pb, once: true }],
      charges: 1,
    }
  },
}

export function buildB07BuffSpec(
  slug: string,
  ctx: BuffBuildContext = {},
): SpellBuffSpec | null {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  const builder = B07_BUFF_SPEC_BUILDERS[key]
  if (!builder) return null
  return builder(ctx)
}

export const B07_NAME_TO_SLUG: Array<{ re: RegExp; slug: string }> = [
  { re: /^воодушевл|^вдохновляющ.*лидер|^inspiring\s*leader/i, slug: 'inspiring_leader' },
  { re: /^закуск.*шеф|^шеф.*закуск|^chef\s*snack/i, slug: 'chef_snack' },
  { re: /^еда\s*шеф|^шеф.*ед|^chef\s*food/i, slug: 'chef_food' },
  { re: /^оборонительн.*дуэл|^defensive\s*duelist/i, slug: 'defensive_duelist' },
  { re: /^защитн.*крыл|^protective\s*wings/i, slug: 'protective_wings' },
  { re: /^реактивн.*сопрот|^chromatic\s*resistance/i, slug: 'chromatic_resistance' },
  { re: /^дар\s*цветн.*стих|^chromatic\s*infusion/i, slug: 'chromatic_infusion' },
  { re: /^дик(ий|ого)\s*атакующ|^savage\s*attacker/i, slug: 'savage_attacker' },
  { re: /^бездонн.*удач|^обильн.*удач|^bountiful\s*luck/i, slug: 'bountiful_luck' },
  { re: /^плам.*флегетос|^flames?\s*of\s*phlegethos/i, slug: 'flames_of_phlegethos_shield' },
  { re: /^второй\s*шанс|^second\s*chance/i, slug: 'second_chance_spent' },
  { re: /^точн(ый|ого)\s*удар|^precise\s*strike/i, slug: 'precise_strike' },
  { re: /^укрепляющ.*приз|^bolstering\s*rally/i, slug: 'bolstering_rally' },
  { re: /^командн.*приз|^commanding\s*rally/i, slug: 'commanding_rally' },
  { re: /^деморализ|^demoralizing\s*strike/i, slug: 'demoralizing_strike' },
  { re: /^удар\s*великан|^strike\s*of\s*the\s*giants/i, slug: 'strike_of_the_giants' },
  { re: /^магическ.*баланс|^magical\s*balance/i, slug: 'magical_balance' },
  { re: /^защитн.*опек|^protective\s*ward/i, slug: 'protective_ward' },
  { re: /^аура\s*водоворот|^maelstrom/i, slug: 'maelstrom_aura' },
]
