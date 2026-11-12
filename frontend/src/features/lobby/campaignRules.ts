/** L-08: правила кампании лобби — типы, дефолты, справочник 11 домашних ключей. */

export type HpOnLevelUp = 'average' | 'roll'
export type ProgressionMode = 'xp' | 'milestones'

export type HomebrewKey =
  | 'potion_bonus_self'
  | 'inspiration_stack'
  | 'flanking_advantage'
  | 'gunpowder_exploding'
  | 'hidden_death_saves'
  | 'fumble_on_1'
  | 'group_initiative'
  | 'reroll_initiative_each_round'
  | 'gritty_rest'
  | 'feat_at_level_1'
  | 'encumbrance'

export type HomebrewCatalogEntry = {
  key: HomebrewKey
  label: string
  tip: string
  source: string
}

export type CampaignRules = {
  edition_2014: {
    feats_instead_of_asi: boolean
    multiclass: boolean
    hp_on_level_up: HpOnLevelUp
  }
  homebrew: Record<HomebrewKey, boolean> & { inspiration_stack_max: number }
  progression: { mode: ProgressionMode; xp_remainder: number }
  inspiration_after_roll: boolean
  enemies_ac_visible: boolean
  custom_rules: string[]
}

export const HOMEBREW_KEYS: HomebrewKey[] = [
  'potion_bonus_self',
  'inspiration_stack',
  'flanking_advantage',
  'gunpowder_exploding',
  'hidden_death_saves',
  'fumble_on_1',
  'group_initiative',
  'reroll_initiative_each_round',
  'gritty_rest',
  'feat_at_level_1',
  'encumbrance',
]

/** Те же тексты, что backend/app/services/campaign_rules.py HOMEBREW_CATALOG. */
export const HOMEBREW_CATALOG: HomebrewCatalogEntry[] = [
  {
    key: 'potion_bonus_self',
    label: 'Зелье бонусным действием',
    tip: 'Выпить зелье лечения самому — бонусное действие. Напоить другого персонажа — полноценное действие.',
    source: 'Домашнее (популярное)',
  },
  {
    key: 'inspiration_stack',
    label: 'Вдохновение копится',
    tip: 'Вдохновение за отыгрыш копится, а не затирается. Мастер задаёт максимум (по умолчанию 3).',
    source: 'Домашнее',
  },
  {
    key: 'flanking_advantage',
    label: 'Фланкирование',
    tip: 'Союзник на противоположной стороне цели (цель не недееспособна) даёт преимущество на атаки ближнего боя. Без карты позиции отмечаются вручную.',
    source: 'DMG 2014 (вариант)',
  },
  {
    key: 'gunpowder_exploding',
    label: 'Порох (exploding)',
    tip: 'Кубы урона огнестрела при максимуме перебрасываются и добавляются (включая скрытую атаку и крит). Перебросов за атаку не больше бонуса мастерства.',
    source: 'Kobold Press',
  },
  {
    key: 'hidden_death_saves',
    label: 'Скрытые спасброски от смерти',
    tip: 'Спасброски от смерти видит только мастер (и сомастер) и владелец умирающего персонажа.',
    source: 'Домашнее / карточка S-03',
  },
  {
    key: 'fumble_on_1',
    label: 'Провал на 1',
    tip: 'Естественная 1 на броске атаки — неудача. Мастер выбирает последствие: уронил оружие, задел ближайшего союзника или потерял реакцию до следующего хода.',
    source: 'Домашнее',
  },
  {
    key: 'group_initiative',
    label: 'Групповая инициатива',
    tip: 'Враги одного типа ходят одним блоком. Игроки ходят в любом порядке в своём окне инициативы.',
    source: 'Домашнее',
  },
  {
    key: 'reroll_initiative_each_round',
    label: 'Инициатива каждый раунд',
    tip: 'Инициатива перебрасывается в начале каждого раунда боя.',
    source: 'Домашнее / DMG вариант',
  },
  {
    key: 'gritty_rest',
    label: 'Суровый реализм',
    tip: 'Короткий отдых — 8 часов. Длинный отдых — 7 дней.',
    source: 'DMG 2014',
  },
  {
    key: 'feat_at_level_1',
    label: 'Черта на 1 уровне',
    tip: 'Каждый персонаж получает черту на 1 уровне. Лист предлагает выбор при создании (крючок L-16).',
    source: 'Домашнее',
  },
  {
    key: 'encumbrance',
    label: 'Нагрузка (вариант PHB)',
    tip: 'Учёт веса и грузоподъёмности: >5×Сил — скорость −10 фт, >10×Сил — −20 фт и помеха на проверки/атаки/спасброски с Силой, Ловкостью и Телосложением.',
    source: 'PHB 2014 (вариант «Нагрузка»)',
  },
]

export function defaultCampaignRules(): CampaignRules {
  return {
    edition_2014: {
      feats_instead_of_asi: true,
      multiclass: true,
      hp_on_level_up: 'average',
    },
    homebrew: {
      potion_bonus_self: false,
      inspiration_stack: false,
      inspiration_stack_max: 3,
      flanking_advantage: false,
      gunpowder_exploding: false,
      hidden_death_saves: true,
      fumble_on_1: false,
      group_initiative: false,
      reroll_initiative_each_round: false,
      gritty_rest: false,
      feat_at_level_1: false,
      encumbrance: false,
    },
    progression: { mode: 'xp', xp_remainder: 0 },
    inspiration_after_roll: false,
    enemies_ac_visible: false,
    custom_rules: [],
  }
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return Boolean(value)
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (['1', 'true', 'yes', 'on', 'да'].includes(v)) return true
    if (['0', 'false', 'no', 'off', 'нет'].includes(v)) return false
  }
  return fallback
}

export function normalizeCampaignRules(raw: unknown): CampaignRules {
  const base = defaultCampaignRules()
  if (!raw || typeof raw !== 'object') return base
  const obj = raw as Record<string, unknown>

  const edition = obj.edition_2014
  if (edition && typeof edition === 'object') {
    const e = edition as Record<string, unknown>
    base.edition_2014.feats_instead_of_asi = asBool(e.feats_instead_of_asi, true)
    base.edition_2014.multiclass = asBool(e.multiclass, true)
    if (e.hp_on_level_up === 'average' || e.hp_on_level_up === 'roll') {
      base.edition_2014.hp_on_level_up = e.hp_on_level_up
    }
  }

  const home = obj.homebrew
  if (home && typeof home === 'object') {
    const h = home as Record<string, unknown>
    for (const key of HOMEBREW_KEYS) {
      const def = base.homebrew[key]
      base.homebrew[key] = asBool(h[key], def)
    }
    const maxRaw = Number(h.inspiration_stack_max)
    base.homebrew.inspiration_stack_max = Number.isFinite(maxRaw)
      ? Math.max(1, Math.min(20, Math.floor(maxRaw)))
      : 3
  }

  const prog = obj.progression
  if (prog && typeof prog === 'object') {
    const p = prog as Record<string, unknown>
    const mode = p.mode
    if (mode === 'xp' || mode === 'milestones') base.progression.mode = mode
    const rem = Number(p.xp_remainder)
    base.progression.xp_remainder = Number.isFinite(rem)
      ? Math.max(0, Math.floor(rem))
      : 0
  }

  if ('inspiration_after_roll' in obj) {
    base.inspiration_after_roll = asBool(obj.inspiration_after_roll, false)
  }
  if ('enemies_ac_visible' in obj) {
    base.enemies_ac_visible = asBool(obj.enemies_ac_visible, false)
  }

  if (Array.isArray(obj.custom_rules)) {
    base.custom_rules = obj.custom_rules
      .map((row) => {
        if (typeof row === 'string') return row.trim()
        if (row && typeof row === 'object') {
          const r = row as Record<string, unknown>
          return String(r.text ?? r.title ?? '').trim()
        }
        return ''
      })
      .filter(Boolean)
      .slice(0, 50)
  }

  return base
}

/** Сводка включённых правил для игрока (только чтение). */
export function summarizeEnabledRules(rules: CampaignRules): string[] {
  const lines: string[] = []
  if (rules.edition_2014.feats_instead_of_asi) lines.push('Черты вместо ASI')
  else lines.push('Только ASI (без черт)')
  if (rules.edition_2014.multiclass) lines.push('Мультикласс разрешён')
  else lines.push('Мультикласс выключен')
  lines.push(
    rules.edition_2014.hp_on_level_up === 'average'
      ? 'Хиты при повышении: среднее'
      : 'Хиты при повышении: бросок',
  )
  lines.push(rules.progression.mode === 'xp' ? 'Прогрессия: опыт' : 'Прогрессия: вехи')
  if (rules.inspiration_after_roll) lines.push('Вдохновение после броска')
  if (rules.enemies_ac_visible) lines.push('КД врагов видно игрокам')
  else lines.push('КД врагов скрыто')

  for (const entry of HOMEBREW_CATALOG) {
    if (rules.homebrew[entry.key]) {
      if (entry.key === 'inspiration_stack') {
        lines.push(`${entry.label} (макс. ${rules.homebrew.inspiration_stack_max})`)
      } else {
        lines.push(entry.label)
      }
    }
  }
  for (const text of rules.custom_rules) {
    lines.push(text)
  }
  return lines
}

/** PHB variant encumbrance thresholds. */
export function encumbranceSpeedPenalty(
  strength: number,
  carriedLb: number,
): { tier: 'none' | 'encumbered' | 'heavily'; speedPenalty: number; disadvantage: boolean } {
  const str = Math.max(0, Math.floor(strength))
  if (carriedLb > str * 10) {
    return { tier: 'heavily', speedPenalty: 20, disadvantage: true }
  }
  if (carriedLb > str * 5) {
    return { tier: 'encumbered', speedPenalty: 10, disadvantage: false }
  }
  return { tier: 'none', speedPenalty: 0, disadvantage: false }
}
