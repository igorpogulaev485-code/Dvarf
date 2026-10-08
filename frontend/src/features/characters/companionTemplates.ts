/** Local naparnik stat templates (2014 class companions). Not the bestiary catalog. */

import {
  createCompanion,
  defaultControlForKind,
  defaultNatureForKind,
  type CompanionEntry,
  type CompanionKind,
} from './companions'
import { proficiencyBonusForLevel } from './spells'

export type CompanionTemplateContext = {
  hostClassLevel: number
  characterLevel: number
  /** Used by Steel Defender HP. */
  hostIntMod?: number
}

export type CompanionTemplatePatch = {
  kind: CompanionKind
  defaultName: string
  stats: CompanionEntry['stats']
  actions: string
  notes: string
  nature?: CompanionEntry['nature']
  control?: CompanionEntry['control']
}

function clampLevel(level: number): number {
  return Math.max(1, Math.min(20, Math.floor(level) || 1))
}

function pb(ctx: CompanionTemplateContext): number {
  return proficiencyBonusForLevel(ctx.characterLevel)
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
    actions: `Force-Empowered Rend +${bonus + Math.max(intMod, 0)}; Repair (3/день).`,
    notes: 'Tasha: Steel Defender (HP = 2 + INT + 5×ур. артификатора)',
    nature: 'construct',
    control: 'bonus_action_command',
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
    source: input.source,
  })
}
