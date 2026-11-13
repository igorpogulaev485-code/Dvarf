/** Local naparnik stat templates (2014 class companions + Tasha Summon*). Not bestiary. */

import { wildfireSpiritHp } from './bestiaryCompanionStats'
import {
  createCompanion,
  defaultCombatModesForCompanion,
  defaultControlForKind,
  defaultNatureForKind,
  type CompanionCommandCost,
  type CompanionEntry,
  type CompanionInitiativeMode,
  type CompanionKind,
  type CompanionResource,
} from './companions'
import {
  conjureAnimalsCounts,
  conjureFeyCrMax,
  conjureWoodlandOrMinorCounts,
  tceSpiritStats,
} from '../../shared/dnd/summonSpellPreview'
import { proficiencyBonusForLevel } from './spells'

export type CompanionTemplateContext = {
  hostClassLevel: number
  characterLevel: number
  /** Used by Steel Defender HP. */
  hostIntMod?: number
  /** Spellcasting ability mod — Tasha Summon* attack. */
  spellMod?: number
  /** Slot level used to cast (Summon* scaling). */
  slotLevel?: number
}

export type CompanionTemplatePatch = {
  kind: CompanionKind
  defaultName: string
  stats: CompanionEntry['stats']
  actions: string
  notes: string
  nature?: CompanionEntry['nature']
  control?: CompanionEntry['control']
  initiativeMode?: CompanionInitiativeMode
  commandCost?: CompanionCommandCost
  resources?: CompanionResource[]
}

function clampLevel(level: number): number {
  return Math.max(1, Math.min(20, Math.floor(level) || 1))
}

function pb(ctx: CompanionTemplateContext): number {
  return proficiencyBonusForLevel(ctx.characterLevel)
}

function spellAttack(ctx: CompanionTemplateContext): number {
  return pb(ctx) + Math.floor(ctx.spellMod ?? 0)
}

/** Tasha Primal Companion — Beast of the Land / Sea / Sky. */
function primalTemplate(
  variant: 'beast_of_the_land' | 'beast_of_the_sea' | 'beast_of_the_sky',
  ctx: CompanionTemplateContext,
): CompanionTemplatePatch {
  const level = clampLevel(ctx.hostClassLevel)
  const bonus = pb(ctx)
  const hp = 5 + 5 * level
  const ac = 13 + bonus
  if (variant === 'beast_of_the_sea') {
    return {
      kind: 'primal_companion',
      defaultName: 'Зверь моря',
      stats: { hp, hp_max: hp, ac, speed: 5 },
      actions: `Атака +${bonus + 2} (модификатор хозяина в игре). Плавание 60 фт.`,
      notes: 'TCE: Первобытный спутник · Зверь моря',
      nature: 'living',
      control: 'bonus_action_command',
    }
  }
  if (variant === 'beast_of_the_sky') {
    return {
      kind: 'primal_companion',
      defaultName: 'Зверь неба',
      stats: { hp, hp_max: hp, ac, speed: 5 },
      actions: `Атака +${bonus + 2}. Полёт 60 фт.`,
      notes: 'TCE: Первобытный спутник · Зверь неба',
      nature: 'living',
      control: 'bonus_action_command',
    }
  }
  return {
    kind: 'primal_companion',
    defaultName: 'Зверь земли',
    stats: { hp, hp_max: hp, ac, speed: 40 },
    actions: `Атака +${bonus + 2}. Лазание 40 фт.`,
    notes: 'TCE: Первобытный спутник · Зверь суши',
    nature: 'living',
    control: 'bonus_action_command',
  }
}

function steelDefenderTemplate(ctx: CompanionTemplateContext): CompanionTemplatePatch {
  const level = clampLevel(ctx.hostClassLevel)
  const intMod = Math.floor(ctx.hostIntMod ?? 0)
  const hp = Math.max(1, 2 + intMod + 5 * level)
  const bonus = pb(ctx)
  return {
    kind: 'steel_defender',
    defaultName: 'Стальной защитник',
    stats: { hp, hp_max: hp, ac: 15, speed: 40 },
    actions: `Силовой разрыв +${bonus + Math.max(intMod, 0)}; Починка.`,
    notes: 'TCE: Стальной защитник (хиты = 2 + Инт + 5×ур. изобретателя)',
    nature: 'construct',
    control: 'bonus_action_command',
    resources: [
      { id: 'repair', name: 'Починка', max: 3, used: 0, reset: 'long' },
    ],
  }
}

function eldritchCannonTemplate(
  variant: 'flamethrower' | 'force_ballista' | 'protector' | string,
  ctx: CompanionTemplateContext,
): CompanionTemplatePatch {
  const level = clampLevel(ctx.hostClassLevel)
  const hp = Math.max(1, 5 * level)
  const labels: Record<string, string> = {
    flamethrower: 'Огнемёт',
    force_ballista: 'Силовая баллиста',
    protector: 'Защитник',
  }
  const name = labels[variant] ?? 'Мистическая пушка'
  const actionByVariant: Record<string, string> = {
    flamethrower: 'Огнемёт: конус 15 фт., ловкость, 2к8 огонь',
    force_ballista: 'Силовая баллиста: +бонус атаки, 2к8 сила, толчок 5 фт.',
    protector: 'Защитник: временные хиты = 1к8 + мод. Инт в радиусе 10 фт.',
  }
  return {
    kind: 'eldritch_cannon',
    defaultName: name,
    stats: { hp, hp_max: hp, ac: 18, speed: 0 },
    actions: actionByVariant[variant] ?? 'Активация бонусным действием хозяина',
    notes: 'TCE: Мистическая пушка (хиты = 5×ур. изобретателя, КД 18)',
    nature: 'construct',
    control: 'bonus_action_command',
    resources: [
      {
        id: 'cannon_summon',
        name: 'Создать пушку',
        max: 1,
        used: 0,
        reset: 'long',
      },
    ],
  }
}

function drakeTemplate(ctx: CompanionTemplateContext): CompanionTemplatePatch {
  const level = clampLevel(ctx.hostClassLevel)
  const bonus = pb(ctx)
  const hp = 5 + 5 * level
  return {
    kind: 'drake',
    defaultName: 'Дрейк',
    stats: { hp, hp_max: hp, ac: 14 + bonus, speed: 40 },
    actions: `Укус +${bonus + 3}; дыхание / суть — по выбору в архетипе.`,
    notes: 'Fizban: Drake Companion (базовый каркас; урон сущности — в заметках)',
    nature: 'living',
    control: 'bonus_action_command',
  }
}

function phbBeastStub(): CompanionTemplatePatch {
  return {
    kind: 'beast_companion',
    defaultName: 'Зверь-спутник',
    stats: { hp: null, hp_max: null, ac: null, speed: null },
    actions: '',
    notes: 'PHB: зверь КР ≤ ¼ — выбери из бестиария или заполни статы вручную',
    nature: 'living',
    // C-02 Н5: ход хозяина, команда за действие.
    control: 'bonus_action_command',
    initiativeMode: 'with_master',
    commandCost: 'action',
  }
}

function familiarStub(): CompanionTemplatePatch {
  return {
    kind: 'familiar',
    defaultName: 'Фамильяр',
    stats: { hp: 2, hp_max: 2, ac: 12, speed: 20 },
    actions: 'Не атакует; телепатия 100 фт.; передача касания. Облик — из бестиария.',
    notes:
      'Find Familiar: stub; при выборе существа из бестиария статы подтягиваются на карточку',
    nature: 'summoned',
    control: 'own_initiative',
  }
}

/** TCE Wildfire Spirit — HP always 5+5×druidLevel, never catalog average alone. */
function wildfireSpiritTemplate(ctx: CompanionTemplateContext): CompanionTemplatePatch {
  const level = Math.max(1, Math.floor(ctx.hostClassLevel || ctx.characterLevel || 1))
  const hp = wildfireSpiritHp(level)
  const bonus = pb(ctx)
  const atk = spellAttack(ctx)
  const atkLabel = ctx.spellMod != null ? `+${atk}` : `+${bonus}(+мод. закл.)`
  return {
    // Unified with subclass grant kind (was 'other' vs 'ally').
    kind: 'ally',
    defaultName: 'Дух дикого огня',
    stats: {
      hp,
      hp_max: hp,
      ac: 13,
      speed: 30,
      speed_fly: 30,
      str: 10,
      dex: 14,
      con: 14,
      immunities:
        'огонь; очарование, испуг, захват, сбивание с ног, опутанность',
    },
    actions: [
      `Семя пламени: ${atkLabel} 1к6+${bonus} огонь (60 фт.)`,
      `Огненная телепортация: 1к6+${bonus} огонь (спас Ловк., 15 фт.)`,
    ].join('\n'),
    notes: `Призыв духа дикого огня · хиты = 5 + 5×ур. = ${hp} (TCE) · парит`,
    nature: 'summoned',
    control: 'bonus_action_command',
    initiativeMode: 'with_master',
    commandCost: 'bonus',
  }
}

function conjureGroupTemplate(
  titleRu: string,
  notes: string,
): CompanionTemplatePatch {
  return {
    kind: 'other',
    defaultName: titleRu,
    stats: { hp: null, hp_max: null, ac: null, speed: null },
    actions: 'Группа призванных: статы каждого — у Мастера / из бестиария',
    notes,
    nature: 'summoned',
    control: 'own_initiative',
  }
}

/** Tasha / Fizban spirit: AC = acBase + slotLevel; HP = hpBase + per×(slot−minLevel). */
function tashaSpiritTemplate(input: {
  titleRu: string
  minLevel: number
  acBase: number
  hpBase: number
  hpPerAbove: number
  speed: number
  ctx: CompanionTemplateContext
  notesExtra?: string
}): CompanionTemplatePatch {
  const slot = Math.max(input.minLevel, Math.floor(input.ctx.slotLevel ?? input.minLevel))
  const above = Math.max(0, slot - input.minLevel)
  const hp = Math.max(1, input.hpBase + input.hpPerAbove * above)
  const ac = input.acBase + slot
  const atk = spellAttack(input.ctx)
  return {
    kind: 'other',
    defaultName: input.titleRu,
    stats: { hp, hp_max: hp, ac, speed: input.speed },
    actions: `Атака +${atk} (мод. заклинаний хозяина). Мультиатака — по таблице духа.`,
    notes: `Дух (TCE/Fizban) · ячейка ${slot}${input.notesExtra ? ` · ${input.notesExtra}` : ''}`,
    nature: 'summoned',
    // C-02 Н5: Summon* — ход хозяина, команда бесплатно.
    control: 'with_master',
    initiativeMode: 'with_master',
    commandCost: 'none',
  }
}

function tceSpiritCard(
  kind: 'beast' | 'fey' | 'elemental',
  ctx: CompanionTemplateContext,
): CompanionTemplatePatch {
  const stats = tceSpiritStats(kind, ctx.slotLevel ?? (kind === 'beast' ? 2 : kind === 'fey' ? 3 : 4))
  const atk = spellAttack(ctx)
  const hpNote =
    stats.hpAlt != null
      ? `Хиты ${stats.hp} (земля/вода) или ${stats.hpAlt} (${stats.hpAltLabel})`
      : `Хиты ${stats.hp}`
  return {
    kind: 'other',
    defaultName: stats.titleRu,
    stats: { hp: stats.hp, hp_max: stats.hp, ac: stats.ac, speed: kind === 'fey' ? 40 : kind === 'beast' ? 30 : 40 },
    actions: `Атака +${atk} · ${stats.attacks} атак. · ${stats.attackRu}. Скорость ${stats.speedRu}.`,
    notes: `${stats.titleRu} · ячейка ${Math.max(kind === 'beast' ? 2 : kind === 'fey' ? 3 : 4, Math.floor(ctx.slotLevel ?? 0))} · КД ${stats.ac} · ${hpNote}`,
    nature: 'summoned',
    control: 'with_master',
    initiativeMode: 'with_master',
    commandCost: 'none',
  }
}

const SUMMON_SPELL_TEMPLATES: Record<
  string,
  (ctx: CompanionTemplateContext) => CompanionTemplatePatch
> = {
  find_familiar: () => familiarStub(),
  wildfire_spirit: (ctx) => wildfireSpiritTemplate(ctx),
  summon_wildfire_spirit: (ctx) => wildfireSpiritTemplate(ctx),
  summon_beast: (ctx) => tceSpiritCard('beast', ctx),
  summon_fey: (ctx) => tceSpiritCard('fey', ctx),
  summon_shadowspawn: (ctx) =>
    tashaSpiritTemplate({
      titleRu: 'Дух тени',
      minLevel: 3,
      acBase: 11,
      hpBase: 35,
      hpPerAbove: 15,
      speed: 40,
      ctx,
    }),
  summon_undead: (ctx) =>
    tashaSpiritTemplate({
      titleRu: 'Дух нежити',
      minLevel: 3,
      acBase: 11,
      hpBase: 30,
      hpPerAbove: 10,
      speed: 30,
      ctx,
      notesExtra: 'Скелет: хиты база 20',
    }),
  summon_aberration: (ctx) =>
    tashaSpiritTemplate({
      titleRu: 'Дух аберрации',
      minLevel: 4,
      acBase: 11,
      hpBase: 40,
      hpPerAbove: 10,
      speed: 30,
      ctx,
    }),
  summon_construct: (ctx) =>
    tashaSpiritTemplate({
      titleRu: 'Дух конструкта',
      minLevel: 4,
      acBase: 13,
      hpBase: 40,
      hpPerAbove: 15,
      speed: 30,
      ctx,
      notesExtra: 'Metal default (Clay AC 12+L)',
    }),
  summon_elemental: (ctx) => tceSpiritCard('elemental', ctx),
  summon_celestial: (ctx) =>
    tashaSpiritTemplate({
      titleRu: 'Дух небожителя',
      minLevel: 5,
      acBase: 11,
      hpBase: 40,
      hpPerAbove: 10,
      speed: 30,
      ctx,
    }),
  summon_fiend: (ctx) =>
    tashaSpiritTemplate({
      titleRu: 'Дух исчадия',
      minLevel: 6,
      acBase: 12,
      hpBase: 50,
      hpPerAbove: 15,
      speed: 40,
      ctx,
    }),
  summon_draconic_spirit: (ctx) =>
    tashaSpiritTemplate({
      titleRu: 'Дух дракона',
      minLevel: 5,
      acBase: 14,
      hpBase: 50,
      hpPerAbove: 10,
      speed: 30,
      ctx,
      notesExtra: 'Fizban',
    }),
  conjure_animals: (ctx) => {
    const slot = Math.max(3, Math.floor(ctx.slotLevel ?? 3))
    const counts = conjureAnimalsCounts(slot)
    return conjureGroupTemplate(
      'Призванные звери',
      `Призыв животных · ячейка ${slot} · множитель ×${counts.multiplier}: КР≤2 → ${counts.cr2}, КР≤1 → ${counts.cr1}, КР≤½ → ${counts.crHalf}, КР≤¼ → ${counts.crQuarter}. Выбери зверей в пикере (только по типу и КР)`,
    )
  },
  conjure_woodland_beings: (ctx) => {
    const slot = Math.max(4, Math.floor(ctx.slotLevel ?? 4))
    const counts = conjureWoodlandOrMinorCounts(slot)
    return conjureGroupTemplate(
      'Лесные обитатели',
      `Призыв лесных обитателей · ячейка ${slot} · множитель ×${counts.multiplier}: КР≤2 → ${counts.cr2}, КР≤1 → ${counts.cr1}, КР≤½ → ${counts.crHalf}, КР≤¼ → ${counts.crQuarter}. Выбери существо в пикере (только феи по КР)`,
    )
  },
  conjure_minor_elementals: (ctx) => {
    const slot = Math.max(4, Math.floor(ctx.slotLevel ?? 4))
    const counts = conjureWoodlandOrMinorCounts(slot)
    return conjureGroupTemplate(
      'Малые элементали',
      `Призыв малых элементалей · ячейка ${slot} · множитель ×${counts.multiplier}: КР≤2 → ${counts.cr2}, КР≤1 → ${counts.cr1}, КР≤½ → ${counts.crHalf}, КР≤¼ → ${counts.crQuarter}. Выбери существо в пикере`,
    )
  },
  conjure_elemental: (ctx) => {
    const slot = Math.max(5, Math.floor(ctx.slotLevel ?? 5))
    return conjureGroupTemplate(
      'Призванный элементаль',
      `Призыв элементаля · ячейка ${slot} · один элементаль КР≤${5 + Math.max(0, slot - 5)}. Выбери в пикере`,
    )
  },
  conjure_fey: (ctx) => {
    const slot = Math.max(6, Math.floor(ctx.slotLevel ?? 6))
    const cr = conjureFeyCrMax(slot)
    return conjureGroupTemplate(
      'Призванная фея',
      `Призыв феи · ячейка ${slot} · одно существо КР≤${cr} (база 6, +1 за круг выше 6). Выбери в пикере`,
    )
  },
  conjure_celestial: (ctx) => {
    const slot = Math.max(7, Math.floor(ctx.slotLevel ?? 7))
    const cr = slot >= 9 ? 5 : 4
    return conjureGroupTemplate(
      'Призванный небожитель',
      `Призыв небожителя · ячейка ${slot} · КР≤${cr}. Выбери в пикере`,
    )
  },
  find_steed: () =>
    conjureGroupTemplate(
      'Скакун',
      'Поиск скакуна: выбери облик в пикере (боевой конь, пони, верблюд, лось, мастифф)',
    ),
  find_greater_steed: () =>
    conjureGroupTemplate(
      'Высший скакун',
      'Поиск высшего скакуна: выбери облик в пикере (грифон, пегас, …)',
    ),
  animate_dead: () =>
    conjureGroupTemplate(
      'Нежить',
      'Восставший труп: выбери скелет или зомби и число по ячейке',
    ),
  create_undead: () =>
    conjureGroupTemplate(
      'Нежить',
      'Сотворение нежити (только ночью): выбери тип и число по ячейке',
    ),
  summon_greater_demon: () =>
    conjureGroupTemplate(
      'Высший демон',
      'Summon Greater Demon (XGE): демон КР≤5. Статы — бестиарий/Мастер',
    ),
  summon_lesser_demons: () =>
    conjureGroupTemplate(
      'Низшие демоны',
      'Summon Lesser Demons (XGE): группа по таблице. Статы — бестиарий/Мастер',
    ),
}

/**
 * Resolve a local template from subclass pick id/value.
 * Returns null when no known template (caller keeps free-text card).
 */
export function resolveCompanionTemplate(input: {
  choiceId: string
  pickValue: string
  ctx: CompanionTemplateContext
}): CompanionTemplatePatch | null {
  const id = input.choiceId.toLowerCase()
  const value = input.pickValue.trim().toLowerCase()

  if (
    value === 'beast_of_the_land' ||
    value === 'beast_of_the_sea' ||
    value === 'beast_of_the_sky'
  ) {
    return primalTemplate(value, input.ctx)
  }
  if (value === 'phb_beast_cr_1_4' || (id.includes('companion') && value.includes('phb'))) {
    return phbBeastStub()
  }
  if (id.includes('cannon') || value === 'flamethrower' || value === 'force_ballista' || value === 'protector') {
    return eldritchCannonTemplate(value || 'flamethrower', input.ctx)
  }
  if (id.includes('defender')) {
    return steelDefenderTemplate(input.ctx)
  }
  if (id.includes('drake')) {
    return drakeTemplate(input.ctx)
  }
  if (id.includes('primal') || id.includes('companion_type')) {
    if (value.includes('sea')) return primalTemplate('beast_of_the_sea', input.ctx)
    if (value.includes('sky')) return primalTemplate('beast_of_the_sky', input.ctx)
    if (value.includes('land')) return primalTemplate('beast_of_the_land', input.ctx)
  }
  if (id.includes('wildfire') || (id.includes('spirit') && value.includes('wildfire'))) {
    return wildfireSpiritTemplate(input.ctx)
  }
  // Name-only open_text (rangers_companion): PHB stub; type/primal handled via
  // companion_type pick in applySubclassGrantToDraft / resolveCompanionTemplate value.
  if (id.includes('rangers_companion') || (id.includes('companion') && !id.includes('type'))) {
    return phbBeastStub()
  }
  return null
}

/** Template for a naparnik spell slug (cast path). */
export function resolveSpellCompanionTemplate(input: {
  slug: string
  ctx: CompanionTemplateContext
}): CompanionTemplatePatch | null {
  const factory = SUMMON_SPELL_TEMPLATES[input.slug]
  if (!factory) return null
  return factory(input.ctx)
}

export function companionFromTemplate(input: {
  template: CompanionTemplatePatch
  name?: string
  source: CompanionEntry['source']
}): CompanionEntry {
  const kind = input.template.kind
  const modes =
    input.template.initiativeMode && input.template.commandCost
      ? {
          initiativeMode: input.template.initiativeMode,
          commandCost: input.template.commandCost,
        }
      : defaultCombatModesForCompanion({
          kind,
          source: input.source,
        })
  return createCompanion({
    kind,
    name: input.name?.trim() || input.template.defaultName,
    nature: input.template.nature ?? defaultNatureForKind(kind),
    control: input.template.control ?? defaultControlForKind(kind),
    initiativeMode: modes.initiativeMode,
    commandCost: modes.commandCost,
    stats: { ...input.template.stats },
    actions: input.template.actions,
    notes: input.template.notes,
    resources: input.template.resources ?? [],
    source: input.source,
  })
}
