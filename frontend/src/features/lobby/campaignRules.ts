/** L-08/L-16: правила кампании лобби — типы, дефолты, домашние + правила старта. */

export type HpOnLevelUp = 'average' | 'roll'
export type ProgressionMode = 'xp' | 'milestones'
export type StartAbilityMethod = 'standard_array' | 'point_buy' | 'roll' | 'any'
export type StartingKitMode = 'class_equipment' | 'class_gold' | 'fixed_gold'

export type StartingKit =
  | { mode: 'class_equipment' }
  | { mode: 'class_gold' }
  | { mode: 'fixed_gold'; gp: number }

export type StartRules = {
  level: number
  ability_method: StartAbilityMethod
  allowed_sources: string[]
  starting_kit: StartingKit
  banned_races: string[]
  banned_classes: string[]
}

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

export type BookSourceEntry = {
  id: string
  label: string
  aliases: string[]
}

/** Канон ↔ алиасы из фактических catalog.source (см. backend book_sources.py). */
export const BOOK_SOURCE_CATALOG: BookSourceEntry[] = [
  {
    id: 'phb',
    label: "Player's Handbook",
    aliases: ['phb', 'PHB', 'PHB 2014', 'phb-2014', 'srd-5.1', 'srd', 'SRD 5.1 (sample)'],
  },
  {
    id: 'tce',
    label: "Tasha's Cauldron of Everything",
    aliases: ['tce', 'TCE', 'TCE 2014', 'tce-2014', 'tasha', 'tcoe', 'TCoE'],
  },
  {
    id: 'xge',
    label: "Xanathar's Guide to Everything",
    aliases: ['xge', 'XGE', 'XGE 2014', 'xge-2014', 'xgte', 'XGtE'],
  },
  {
    id: 'mpmm',
    label: 'Mordenkainen Presents: Monsters of the Multiverse',
    aliases: ['mpmm', 'MPMM', 'ttg:MPMM'],
  },
  {
    id: 'scag',
    label: "Sword Coast Adventurer's Guide",
    aliases: ['scag', 'SCAG', 'SCAG 2014'],
  },
  {
    id: 'egw',
    label: "Explorer's Guide to Wildemount",
    aliases: ['egw', 'EGW', 'EGW 2014', 'egw-2014', 'egtw', 'EGtW'],
  },
  {
    id: 'mot',
    label: 'Mythic Odysseys of Theros',
    aliases: ['mot', 'MOT', 'MOT 2014'],
  },
  {
    id: 'vgm',
    label: "Volo's Guide to Monsters",
    aliases: ['vgm', 'VGM', 'vgtm', 'ttg:VGM'],
  },
  {
    id: 'mtf',
    label: "Mordenkainen's Tome of Foes",
    aliases: ['mtf', 'MTF', 'ttg:MTF'],
  },
  {
    id: 'erlw',
    label: 'Eberron: Rising from the Last War',
    aliases: ['erlw', 'ERLW', 'RLW 2014', 'ttg:ERLW', 'erftlw'],
  },
  {
    id: 'ggr',
    label: "Guildmasters' Guide to Ravnica",
    aliases: ['ggr', 'GGR', 'GGR 2014', 'ttg:GGR', 'ggtr', 'ggtr-2014'],
  },
  {
    id: 'ftd',
    label: "Fizban's Treasury of Dragons",
    aliases: ['ftd', 'FTD', 'FTD 2014', 'ftd-2014', 'ttg:FTD'],
  },
  {
    id: 'ai',
    label: 'Acquisitions Incorporated',
    aliases: ['ai', 'AI', 'AI 2014', 'ai-2014'],
  },
  {
    id: 'dmg',
    label: "Dungeon Master's Guide",
    aliases: ['dmg', 'DMG', 'DMG 2014'],
  },
  {
    id: 'eepc',
    label: "Elemental Evil Player's Companion",
    aliases: ['eepc', 'EEPC'],
  },
]

const ALIAS_TO_CANON: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const entry of BOOK_SOURCE_CATALOG) {
    map[entry.id.toLowerCase()] = entry.id
    for (const alias of entry.aliases) map[alias.trim().toLowerCase()] = entry.id
  }
  return map
})()

export function canonicalizeSource(raw: unknown): string | null {
  if (raw == null) return null
  const text = String(raw).trim()
  if (!text) return null
  const direct = ALIAS_TO_CANON[text.toLowerCase()]
  if (direct) return direct
  if (text.includes('+') || text.includes('|')) {
    const parts = text
      .replace(/\|/g, '+')
      .split('+')
      .map((p) => p.trim())
      .filter(Boolean)
    for (const part of parts) {
      const mapped = ALIAS_TO_CANON[part.toLowerCase()]
      if (mapped) return mapped
    }
  }
  return null
}

export function expandAllowedSources(allowed: string[]): Set<string> {
  const out = new Set<string>()
  for (const item of allowed) {
    const canon = canonicalizeSource(item) || item.trim().toLowerCase()
    out.add(canon)
    const entry = BOOK_SOURCE_CATALOG.find((b) => b.id === canon)
    if (entry) {
      out.add(canon.toLowerCase())
      for (const alias of entry.aliases) out.add(alias.trim().toLowerCase())
    } else {
      out.add(item.trim().toLowerCase())
    }
  }
  return out
}

export function sourceMatchesAllowed(rawSource: unknown, allowedCanon: string[]): boolean {
  if (rawSource == null) return true
  const text = String(rawSource).trim()
  if (!text) return true
  const allowed = expandAllowedSources(allowedCanon)
  const parts = text
    .replace(/\|/g, '+')
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length > 1) {
    let knownOk = false
    for (const part of parts) {
      const canon = canonicalizeSource(part)
      const key = (canon || part).toLowerCase()
      if (allowed.has(key) || allowed.has(part.toLowerCase())) {
        knownOk = true
        continue
      }
      if (!canon && !(part.toLowerCase() in ALIAS_TO_CANON)) continue
      return false
    }
    return knownOk
  }
  const canon = canonicalizeSource(text)
  if (canon && allowed.has(canon.toLowerCase())) return true
  return allowed.has(text.toLowerCase())
}

/** Виды каталога, которые режет фильтр книг (навыки/состояния/инвентарь — нет). */
export const FILTERED_CATALOG_KINDS = new Set([
  'race',
  'class',
  'subclass',
  'feat',
  'spell',
  'background',
])

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
  start: StartRules
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

export function defaultStartRules(): StartRules {
  return {
    level: 1,
    ability_method: 'any',
    allowed_sources: ['phb'],
    starting_kit: { mode: 'class_equipment' },
    banned_races: [],
    banned_classes: [],
  }
}

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
    start: defaultStartRules(),
  }
}

export function normalizeStartRules(raw: unknown): StartRules {
  const base = defaultStartRules()
  if (!raw || typeof raw !== 'object') return base
  const obj = raw as Record<string, unknown>
  const level = Number(obj.level)
  base.level = Number.isFinite(level) ? Math.max(1, Math.min(20, Math.floor(level))) : 1
  const method = obj.ability_method
  if (
    method === 'standard_array' ||
    method === 'point_buy' ||
    method === 'roll' ||
    method === 'any'
  ) {
    base.ability_method = method
  }
  if (Array.isArray(obj.allowed_sources)) {
    const seen = new Set<string>()
    const cleaned: string[] = []
    for (const item of obj.allowed_sources) {
      const canon = canonicalizeSource(item) || String(item || '')
        .trim()
        .toLowerCase()
      if (!canon || seen.has(canon)) continue
      seen.add(canon)
      cleaned.push(canon)
    }
    base.allowed_sources = cleaned.length ? cleaned : ['phb']
  }
  const kit = obj.starting_kit
  if (kit && typeof kit === 'object') {
    const k = kit as Record<string, unknown>
    if (k.mode === 'fixed_gold') {
      const gp = Number(k.gp)
      base.starting_kit = {
        mode: 'fixed_gold',
        gp: Number.isFinite(gp) ? Math.max(0, Math.floor(gp)) : 0,
      }
    } else if (k.mode === 'class_gold' || k.mode === 'class_equipment') {
      base.starting_kit = { mode: k.mode }
    }
  }
  const slugList = (value: unknown): string[] => {
    if (!Array.isArray(value)) return []
    const seen = new Set<string>()
    const out: string[] = []
    for (const item of value) {
      const slug = String(item || '')
        .trim()
        .toLowerCase()
      if (!slug || seen.has(slug)) continue
      seen.add(slug)
      out.push(slug)
    }
    return out
  }
  base.banned_races = slugList(obj.banned_races)
  base.banned_classes = slugList(obj.banned_classes)
  return base
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

  base.start = normalizeStartRules(obj.start)

  return base
}

const ABILITY_METHOD_LABEL: Record<StartAbilityMethod, string> = {
  standard_array: 'стандартный набор',
  point_buy: 'покупка очков',
  roll: 'броски',
  any: 'любой метод',
}

const KIT_LABEL: Record<StartingKitMode, string> = {
  class_equipment: 'снаряжение класса',
  class_gold: 'золото по таблице класса',
  fixed_gold: 'фиксированное золото',
}

/** Сводка правил старта (для входа / игрока). */
export function summarizeStartRules(start: StartRules): string[] {
  const lines: string[] = []
  lines.push(`Стартовый уровень: ${start.level}`)
  lines.push(`Характеристики: ${ABILITY_METHOD_LABEL[start.ability_method]}`)
  const books = start.allowed_sources
    .map((id) => BOOK_SOURCE_CATALOG.find((b) => b.id === id)?.label || id)
    .join(', ')
  lines.push(`Книги: ${books || 'PHB'}`)
  if (start.starting_kit.mode === 'fixed_gold') {
    lines.push(`Стартовый набор: ${start.starting_kit.gp} зм`)
  } else {
    lines.push(`Стартовый набор: ${KIT_LABEL[start.starting_kit.mode]}`)
  }
  if (start.banned_races.length) {
    lines.push(`Запрещённые расы: ${start.banned_races.join(', ')}`)
  }
  if (start.banned_classes.length) {
    lines.push(`Запрещённые классы: ${start.banned_classes.join(', ')}`)
  }
  return lines
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
  lines.push(...summarizeStartRules(rules.start))
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
