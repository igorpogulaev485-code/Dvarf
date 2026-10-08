/** Local naparnik stat templates (2014 class companions + Tasha Summon*). Not bestiary. */

import {
  createCompanion,
  defaultControlForKind,
  defaultNatureForKind,
  type CompanionEntry,
  type CompanionKind,
  type CompanionResource,
} from './companions'
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
      notes: 'Tasha: Primal Companion · Beast of the Sea',
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
      notes: 'Tasha: Primal Companion · Beast of the Sky',
      nature: 'living',
      control: 'bonus_action_command',
    }
  }
  return {
    kind: 'primal_companion',
    defaultName: 'Зверь земли',
    stats: { hp, hp_max: hp, ac, speed: 40 },
    actions: `Атака +${bonus + 2}. Лазание 40 фт.`,
    notes: 'Tasha: Primal Companion · Beast of the Land',
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
    actions: `Force-Empowered Rend +${bonus + Math.max(intMod, 0)}; Repair.`,
    notes: 'Tasha: Steel Defender (HP = 2 + INT + 5×ур. артификатора)',
    nature: 'construct',
    control: 'bonus_action_command',
    resources: [
      { id: 'repair', name: 'Repair', max: 3, used: 0, reset: 'long' },
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
    protector: 'Защитник: temp HP = 1к8 + INT модификатор в радиусе 10 фт.',
  }
  return {
    kind: 'eldritch_cannon',
    defaultName: name,
    stats: { hp, hp_max: hp, ac: 18, speed: 0 },
    actions: actionByVariant[variant] ?? 'Активация бонусным действием хозяина',
    notes: 'Tasha: Eldritch Cannon (HP = 5×ур. артификатора, КД 18)',
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
    control: 'bonus_action_command',
  }
}

function familiarStub(): CompanionTemplatePatch {
  return {
    kind: 'familiar',
    defaultName: 'Фамильяр',
    stats: { hp: 2, hp_max: 2, ac: 12, speed: 20 },
    actions: 'Не атакует; телепатия 100 фт.; передача касания. Облик — из бестиария.',
    notes: 'Find Familiar: типовой крошечный stub; точный статблок облика — из бестиария',
    nature: 'summoned',
    control: 'own_initiative',
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
    notes: `Tasha/Fizban spirit · ячейка ${slot}${input.notesExtra ? ` · ${input.notesExtra}` : ''}`,
    nature: 'summoned',
    control: 'bonus_action_command',
  }
}

const SUMMON_SPELL_TEMPLATES: Record<
  string,
  (ctx: CompanionTemplateContext) => CompanionTemplatePatch
> = {
  find_familiar: () => familiarStub(),
  summon_beast: (ctx) =>
    tashaSpiritTemplate({
      titleRu: 'Дух зверя',
      minLevel: 2,
      acBase: 11,
      hpBase: 30,
      hpPerAbove: 5,
      speed: 30,
      ctx,
      notesExtra: 'по умолчанию Land/Sea (Air: HP base 20)',
    }),
  summon_fey: (ctx) =>
    tashaSpiritTemplate({
      titleRu: 'Дух феи',
      minLevel: 3,
      acBase: 12,
      hpBase: 30,
      hpPerAbove: 10,
      speed: 40,
      ctx,
    }),
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
      notesExtra: 'Skeletal: HP base 20',
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
  summon_elemental: (ctx) =>
    tashaSpiritTemplate({
      titleRu: 'Дух стихии',
      minLevel: 4,
      acBase: 11,
      hpBase: 50,
      hpPerAbove: 10,
      speed: 40,
      ctx,
    }),
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
  conjure_animals: () =>
    conjureGroupTemplate(
      'Призванные звери',
      'Conjure Animals: варианты КР (1×2 / 2×1 / 4×½ / 8×¼). Статы — бестиарий/Мастер',
    ),
  conjure_woodland_beings: () =>
    conjureGroupTemplate(
      'Лесные обитатели',
      'Conjure Woodland Beings: варианты КР. Статы — бестиарий/Мастер',
    ),
  conjure_minor_elementals: () =>
    conjureGroupTemplate(
      'Малые элементали',
      'Conjure Minor Elementals: варианты КР. Статы — бестиарий/Мастер',
    ),
  conjure_elemental: () =>
    conjureGroupTemplate(
      'Призванный элементаль',
      'Conjure Elemental: один элементаль КР≤5 (выше ячейкой). Статы — бестиарий',
    ),
  conjure_fey: () =>
    conjureGroupTemplate(
      'Призванная фея',
      'Conjure Fey: одно существо КР≤6. Статы — бестиарий',
    ),
  conjure_celestial: () =>
    conjureGroupTemplate(
      'Призванный небожитель',
      'Conjure Celestial: КР≤4 (7-й+ → КР≤5). Статы — бестиарий',
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
  return createCompanion({
    kind,
    name: input.name?.trim() || input.template.defaultName,
    nature: input.template.nature ?? defaultNatureForKind(kind),
    control: input.template.control ?? defaultControlForKind(kind),
    stats: { ...input.template.stats },
    actions: input.template.actions,
    notes: input.template.notes,
    resources: input.template.resources ?? [],
    source: input.source,
  })
}
