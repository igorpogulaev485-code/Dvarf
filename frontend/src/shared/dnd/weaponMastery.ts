/**
 * P24-M01: Weapon Mastery (2024) — limits, picks, property labels, combat helpers.
 * Mirror of backend/app/dnd/weapon_mastery.py. 2014 must never show or store picks.
 */

export const WEAPON_MASTERY_IDS = [
  'cleave',
  'graze',
  'nick',
  'push',
  'sap',
  'slow',
  'topple',
  'vex',
] as const

export type WeaponMasteryId = (typeof WEAPON_MASTERY_IDS)[number]

export const TACTICAL_MASTER_OPTIONS: WeaponMasteryId[] = ['push', 'sap', 'slow']
export const TACTICAL_MASTER_LEVEL = 9

export type WeaponMasteryDictEntry = {
  id: WeaponMasteryId
  name_en: string
  name_ru: string
  summary_ru: string
}

/** Canonical RU labels (weapon_mastery_srd.json / next.dnd.su). */
export const WEAPON_MASTERY_DICTIONARY: WeaponMasteryDictEntry[] = [
  {
    id: 'cleave',
    name_en: 'Cleave',
    name_ru: 'Рассечение',
    summary_ru:
      'При попадании рукопашной атакой раз за ход — ещё один бросок атаки этим оружием по второму существу в 5 фт от первого и в досягаемости; урон без модификатора характеристики (если он не отрицательный).',
  },
  {
    id: 'graze',
    name_en: 'Graze',
    name_ru: 'Касание',
    summary_ru:
      'При промахе цель всё равно получает урон, равный модификатору характеристики атаки (тот же тип); растёт только этим модификатором.',
  },
  {
    id: 'nick',
    name_en: 'Nick',
    name_ru: 'Засечка',
    summary_ru:
      'Доп. атаку свойства «Лёгкое» можно сделать как часть действия «Атака», а не бонусным; только один раз за ход.',
  },
  {
    id: 'push',
    name_en: 'Push',
    name_ru: 'Толчок',
    summary_ru:
      'При попадании можно толкнуть существо размера Большое или меньше по прямой до 10 фт от себя.',
  },
  {
    id: 'sap',
    name_en: 'Sap',
    name_ru: 'Ослабление',
    summary_ru:
      'При попадании у цели помеха на следующий бросок атаки до начала вашего следующего хода.',
  },
  {
    id: 'slow',
    name_en: 'Slow',
    name_ru: 'Замедление',
    summary_ru:
      'При попадании и уроне скорость цели −10 фт до начала вашего следующего хода; несколько «Замедление» не суммируются сверх 10 фт.',
  },
  {
    id: 'topple',
    name_en: 'Topple',
    name_ru: 'Опрокидывание',
    summary_ru:
      'При попадании цель делает спас Телосложения (Сл 8 + мод. атаки + бонус мастерства) или получает состояние «опрокинутый».',
  },
  {
    id: 'vex',
    name_en: 'Vex',
    name_ru: 'Смущение',
    summary_ru:
      'При попадании и уроне вы получаете преимущество на следующий бросок атаки по этой цели до конца вашего следующего хода.',
  },
]

const DICT_BY_ID = Object.fromEntries(
  WEAPON_MASTERY_DICTIONARY.map((row) => [row.id, row]),
) as Record<WeaponMasteryId, WeaponMasteryDictEntry>

export function masteryPropertyById(id: string | null | undefined): WeaponMasteryDictEntry | null {
  const key = String(id || '')
    .trim()
    .toLowerCase() as WeaponMasteryId
  return DICT_BY_ID[key] ?? null
}

export function masteryPropertyNameRu(id: string | null | undefined): string {
  return masteryPropertyById(id)?.name_ru || String(id || '').trim() || '—'
}

export type WeaponMasteryClassRules = {
  slug: string
  enabled: boolean
  byLevel: Record<number, number>
  meleeOnly: boolean
  weaponCategories: Array<'simple' | 'martial'>
  changeAfterLongRest: number | 'all'
  requiresProficiency: boolean
}

/** SRD 5.2.1 class tables (same numbers as classes_srd.json). */
export const WEAPON_MASTERY_CLASS_RULES: Record<string, WeaponMasteryClassRules> = {
  fighter: {
    slug: 'fighter',
    enabled: true,
    byLevel: {
      1: 3, 2: 3, 3: 3, 4: 4, 5: 4, 6: 4, 7: 4, 8: 4, 9: 4, 10: 5, 11: 5, 12: 5, 13: 5, 14: 5,
      15: 5, 16: 6, 17: 6, 18: 6, 19: 6, 20: 6,
    },
    meleeOnly: false,
    weaponCategories: ['simple', 'martial'],
    changeAfterLongRest: 1,
    requiresProficiency: false,
  },
  barbarian: {
    slug: 'barbarian',
    enabled: true,
    byLevel: {
      1: 2, 2: 2, 3: 2, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3, 10: 4, 11: 4, 12: 4, 13: 4, 14: 4,
      15: 4, 16: 4, 17: 4, 18: 4, 19: 4, 20: 4,
    },
    meleeOnly: true,
    weaponCategories: ['simple', 'martial'],
    changeAfterLongRest: 1,
    requiresProficiency: false,
  },
  paladin: {
    slug: 'paladin',
    enabled: true,
    byLevel: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, 2])),
    meleeOnly: false,
    weaponCategories: ['simple', 'martial'],
    changeAfterLongRest: 'all',
    requiresProficiency: true,
  },
  ranger: {
    slug: 'ranger',
    enabled: true,
    byLevel: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, 2])),
    meleeOnly: false,
    weaponCategories: ['simple', 'martial'],
    changeAfterLongRest: 'all',
    requiresProficiency: true,
  },
  rogue: {
    slug: 'rogue',
    enabled: true,
    byLevel: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, 2])),
    meleeOnly: false,
    weaponCategories: ['simple', 'martial'],
    changeAfterLongRest: 'all',
    requiresProficiency: true,
  },
}

const CLASS_SLUG_ALIASES: Record<string, string> = {
  боец: 'fighter',
  варвар: 'barbarian',
  паладин: 'paladin',
  следопыт: 'ranger',
  плут: 'rogue',
  разбойник: 'rogue',
  fighter: 'fighter',
  barbarian: 'barbarian',
  paladin: 'paladin',
  ranger: 'ranger',
  rogue: 'rogue',
}

export function normalizeClassSlug(value: string | null | undefined): string | null {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
  if (!raw) return null
  if (CLASS_SLUG_ALIASES[raw]) return CLASS_SLUG_ALIASES[raw]
  const cleaned = raw.replace(/\s+/g, '-').replace(/_/g, '-')
  return CLASS_SLUG_ALIASES[cleaned] || cleaned
}

export type WeaponMasteryState = {
  known: string[]
  sourceClass: string | null
  baseline: string[]
  swapAvailable: boolean
}

export function emptyWeaponMasteryState(): WeaponMasteryState {
  return { known: [], sourceClass: null, baseline: [], swapAvailable: false }
}

export function readWeaponMasteryState(raw: unknown): WeaponMasteryState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyWeaponMasteryState()
  const row = raw as Record<string, unknown>
  const knownRaw = row.known ?? row.known_weapon_slugs
  const baselineRaw = row.baseline ?? row.rest_baseline ?? knownRaw
  const known = Array.isArray(knownRaw)
    ? knownRaw.map((x) => String(x).trim().toLowerCase()).filter(Boolean)
    : []
  const baseline = Array.isArray(baselineRaw)
    ? baselineRaw.map((x) => String(x).trim().toLowerCase()).filter(Boolean)
    : []
  return {
    known,
    sourceClass: normalizeClassSlug(
      typeof row.source_class === 'string'
        ? row.source_class
        : typeof row.sourceClass === 'string'
          ? row.sourceClass
          : null,
    ),
    baseline,
    swapAvailable: Boolean(row.swap_available ?? row.swapAvailable ?? row.long_rest_swap_available),
  }
}

export function weaponMasteryToSheet(state: WeaponMasteryState): Record<string, unknown> {
  return {
    known: [...state.known],
    source_class: state.sourceClass,
    baseline: [...state.baseline],
    swap_available: Boolean(state.swapAvailable),
  }
}

export function masteryLimitForClass(rule: WeaponMasteryClassRules, level: number): number {
  if (!rule.enabled) return 0
  const lvl = Math.max(1, Math.min(20, Math.floor(level)))
  if (rule.byLevel[lvl] != null) return rule.byLevel[lvl]
  const keys = Object.keys(rule.byLevel)
    .map(Number)
    .filter((k) => k <= lvl)
    .sort((a, b) => a - b)
  if (keys.length) return rule.byLevel[keys[keys.length - 1]]
  return 0
}

export type ClassLevelLike = { name?: string; slug?: string; level: number }

export function resolveActiveMasteryBudget(
  classes: ClassLevelLike[],
  sourceClass?: string | null,
): { rule: WeaponMasteryClassRules | null; limit: number } {
  const granted: Array<{ rule: WeaponMasteryClassRules; level: number }> = []
  for (const row of classes) {
    const slug = normalizeClassSlug(row.slug || row.name)
    if (!slug) continue
    const rule = WEAPON_MASTERY_CLASS_RULES[slug]
    if (rule?.enabled) granted.push({ rule, level: row.level })
  }
  if (!granted.length) return { rule: null, limit: 0 }
  const src = normalizeClassSlug(sourceClass)
  if (src) {
    const hit = granted.find((g) => g.rule.slug === src)
    if (hit) return { rule: hit.rule, limit: masteryLimitForClass(hit.rule, hit.level) }
  }
  let best = granted[0]
  let bestLimit = masteryLimitForClass(best.rule, best.level)
  for (const g of granted.slice(1)) {
    const lim = masteryLimitForClass(g.rule, g.level)
    if (lim > bestLimit) {
      best = g
      bestLimit = lim
    }
  }
  return { rule: best.rule, limit: bestLimit }
}

export function hasTacticalMaster(classes: ClassLevelLike[]): boolean {
  return classes.some((row) => {
    const slug = normalizeClassSlug(row.slug || row.name)
    return slug === 'fighter' && row.level >= TACTICAL_MASTER_LEVEL
  })
}

export function countChangedWeapons(before: string[], after: string[]): number {
  const a = new Set(before.map((x) => x.trim().toLowerCase()).filter(Boolean))
  const b = new Set(after.map((x) => x.trim().toLowerCase()).filter(Boolean))
  let removed = 0
  let added = 0
  for (const x of a) if (!b.has(x)) removed += 1
  for (const x of b) if (!a.has(x)) added += 1
  return Math.max(removed, added)
}

export function markLongRestWeaponMasterySwap(state: WeaponMasteryState): WeaponMasteryState {
  return {
    ...state,
    baseline: state.known.length ? [...state.known] : [...state.baseline],
    swapAvailable: true,
  }
}

export type MasteryWeaponOption = {
  slug: string
  nameRu: string
  mastery: WeaponMasteryId
  category: 'simple' | 'martial'
  rangeKind: 'melee' | 'ranged'
  properties: string[]
}

export function weaponAllowedForMastery(
  weapon: MasteryWeaponOption,
  rule: WeaponMasteryClassRules,
  opts?: {
    hasSimpleProf?: boolean
    hasMartialProf?: boolean
    proficientSlugs?: string[]
  },
): boolean {
  if (!rule.weaponCategories.includes(weapon.category)) return false
  if (rule.meleeOnly && weapon.rangeKind !== 'melee') return false
  if (rule.requiresProficiency) {
    const set = new Set((opts?.proficientSlugs || []).map((s) => s.toLowerCase()))
    if (set.has(weapon.slug)) return true
    if (weapon.category === 'simple' && opts?.hasSimpleProf) return true
    if (weapon.category === 'martial' && opts?.hasMartialProf) return true
    return false
  }
  return true
}

export function resolveEffectiveMasteryProperty(opts: {
  weaponSlug: string
  known: string[]
  weaponMastery: WeaponMasteryId | null | undefined
  tacticalMaster?: boolean
  substitute?: string | null
}): WeaponMasteryId | null {
  const slug = opts.weaponSlug.trim().toLowerCase()
  if (!slug || !opts.known.map((x) => x.toLowerCase()).includes(slug)) return null
  const base = opts.weaponMastery
  if (!base || !WEAPON_MASTERY_IDS.includes(base)) return null
  if (opts.tacticalMaster && opts.substitute) {
    const sub = opts.substitute.trim().toLowerCase() as WeaponMasteryId
    if (TACTICAL_MASTER_OPTIONS.includes(sub)) return sub
  }
  return base
}

export function toppleSaveDc(attackAbilityMod: number, proficiencyBonus: number): number {
  return 8 + attackAbilityMod + proficiencyBonus
}

export type MasteryApplyResult = {
  propertyId: WeaponMasteryId
  nameRu: string
  applied: boolean
  feedLineRu: string
  effects: Record<string, unknown>
}

export function applyMasteryProperty(
  propertyId: string,
  opts: {
    hit: boolean
    damageDealt?: boolean
    attackAbilityMod?: number
    proficiencyBonus?: number
    damageType?: string | null
    nickAlreadyUsed?: boolean
    cleaveAlreadyUsed?: boolean
  },
): MasteryApplyResult {
  const pid = propertyId.trim().toLowerCase() as WeaponMasteryId
  const card = masteryPropertyById(pid)
  const nameRu = card?.name_ru || pid
  const effects: Record<string, unknown> = { property: pid }
  const fail = (reason: string): MasteryApplyResult => ({
    propertyId: pid,
    nameRu,
    applied: false,
    feedLineRu: reason,
    effects,
  })
  if (!WEAPON_MASTERY_IDS.includes(pid)) return fail(`Неизвестное свойство: ${pid}`)

  if (pid === 'graze') {
    if (opts.hit) return fail('Касание срабатывает только при промахе')
    const dmg = Math.max(0, Math.floor(opts.attackAbilityMod ?? 0))
    effects.graze_damage = dmg
    effects.damage_type = opts.damageType ?? null
    return {
      propertyId: pid,
      nameRu,
      applied: true,
      feedLineRu: `Касание: ${dmg} урона (${opts.damageType || 'тот же тип'}) при промахе`,
      effects,
    }
  }

  if (!opts.hit) return fail(`${nameRu}: нужно попадание`)

  if (pid === 'cleave') {
    if (opts.cleaveAlreadyUsed) return fail('Рассечение уже использовано в этот ход')
    effects.cleave_extra_attack = true
    return {
      propertyId: pid,
      nameRu,
      applied: true,
      feedLineRu: 'Рассечение: доп. атака по второму существу в 5 фт',
      effects,
    }
  }
  if (pid === 'nick') {
    if (opts.nickAlreadyUsed) return fail('Засечка уже использована в этот ход')
    effects.nick_light_attack_in_attack_action = true
    effects.consumes_bonus_action = false
    return {
      propertyId: pid,
      nameRu,
      applied: true,
      feedLineRu: 'Засечка: доп. атака лёгким как часть действия «Атака»',
      effects,
    }
  }
  if (pid === 'push') {
    effects.push_ft = 10
    return {
      propertyId: pid,
      nameRu,
      applied: true,
      feedLineRu: 'Толчок: цель оттолкнута на 10 фт',
      effects,
    }
  }
  if (pid === 'sap') {
    effects.target_attack_disadvantage_next = true
    return {
      propertyId: pid,
      nameRu,
      applied: true,
      feedLineRu: 'Ослабление: помеха на следующую атаку цели',
      effects,
    }
  }
  if (pid === 'slow') {
    if (!opts.damageDealt) return fail('Замедление требует попадания и урона')
    effects.speed_penalty_ft = 10
    return {
      propertyId: pid,
      nameRu,
      applied: true,
      feedLineRu: 'Замедление: скорость цели −10 фт',
      effects,
    }
  }
  if (pid === 'topple') {
    const dc = toppleSaveDc(opts.attackAbilityMod ?? 0, opts.proficiencyBonus ?? 2)
    effects.save = { ability: 'con', dc }
    effects.condition_on_fail = 'prone'
    return {
      propertyId: pid,
      nameRu,
      applied: true,
      feedLineRu: `Опрокидывание: спас Тел Сл ${dc} или опрокинут`,
      effects,
    }
  }
  if (pid === 'vex') {
    if (!opts.damageDealt) return fail('Смущение требует попадания и урона')
    effects.attacker_advantage_next_vs_target = true
    return {
      propertyId: pid,
      nameRu,
      applied: true,
      feedLineRu: 'Смущение: преимущество на следующую атаку по этой цели',
      effects,
    }
  }
  return fail(`Свойство ${pid} не реализовано`)
}

/** Character has Weapon Mastery only on 2024 sheets with a granting class. */
export function characterHasWeaponMastery(
  rulesEdition: string | null | undefined,
  classes: ClassLevelLike[],
): boolean {
  if (String(rulesEdition || '') !== '2024') return false
  return resolveActiveMasteryBudget(classes).limit > 0
}

/** SRD 5.2.1 weapons with mastery (from weapons_srd.json). */
export const SRD_WEAPONS_2024_MASTERY: MasteryWeaponOption[] = [
  { slug: 'battleaxe', nameRu: "Боевой топор", mastery: 'topple', category: 'martial', rangeKind: 'melee', properties: ["versatile"] },
  { slug: 'blowgun', nameRu: "Духовая трубка", mastery: 'vex', category: 'martial', rangeKind: 'ranged', properties: ["ammunition", "loading"] },
  { slug: 'club', nameRu: "Дубинка", mastery: 'slow', category: 'simple', rangeKind: 'melee', properties: ["light"] },
  { slug: 'dagger', nameRu: "Кинжал", mastery: 'nick', category: 'simple', rangeKind: 'melee', properties: ["finesse", "light", "thrown"] },
  { slug: 'dart', nameRu: "Дротик", mastery: 'vex', category: 'simple', rangeKind: 'ranged', properties: ["finesse", "thrown"] },
  { slug: 'flail', nameRu: "Цеп", mastery: 'sap', category: 'martial', rangeKind: 'melee', properties: [] },
  { slug: 'glaive', nameRu: "Глефа", mastery: 'graze', category: 'martial', rangeKind: 'melee', properties: ["heavy", "reach", "two_handed"] },
  { slug: 'greataxe', nameRu: "Секира", mastery: 'cleave', category: 'martial', rangeKind: 'melee', properties: ["heavy", "two_handed"] },
  { slug: 'greatclub', nameRu: "Двуручная дубина", mastery: 'push', category: 'simple', rangeKind: 'melee', properties: ["two_handed"] },
  { slug: 'greatsword', nameRu: "Двуручный меч", mastery: 'graze', category: 'martial', rangeKind: 'melee', properties: ["heavy", "two_handed"] },
  { slug: 'halberd', nameRu: "Алебарда", mastery: 'cleave', category: 'martial', rangeKind: 'melee', properties: ["heavy", "reach", "two_handed"] },
  { slug: 'hand-crossbow', nameRu: "Одноручный арбалет", mastery: 'vex', category: 'martial', rangeKind: 'ranged', properties: ["ammunition", "light", "loading"] },
  { slug: 'handaxe', nameRu: "Одноручный топор", mastery: 'vex', category: 'simple', rangeKind: 'melee', properties: ["light", "thrown"] },
  { slug: 'heavy-crossbow', nameRu: "Тяжёлый арбалет", mastery: 'push', category: 'martial', rangeKind: 'ranged', properties: ["ammunition", "heavy", "loading", "two_handed"] },
  { slug: 'javelin', nameRu: "Метательное копьё", mastery: 'slow', category: 'simple', rangeKind: 'melee', properties: ["thrown"] },
  { slug: 'lance', nameRu: "Кавалерийское копьё", mastery: 'topple', category: 'martial', rangeKind: 'melee', properties: ["heavy", "reach", "two_handed"] },
  { slug: 'light-crossbow', nameRu: "Лёгкий арбалет", mastery: 'slow', category: 'simple', rangeKind: 'ranged', properties: ["ammunition", "loading", "two_handed"] },
  { slug: 'light-hammer', nameRu: "Лёгкий молот", mastery: 'nick', category: 'simple', rangeKind: 'melee', properties: ["light", "thrown"] },
  { slug: 'longbow', nameRu: "Длинный лук", mastery: 'slow', category: 'martial', rangeKind: 'ranged', properties: ["ammunition", "heavy", "two_handed"] },
  { slug: 'longsword', nameRu: "Длинный меч", mastery: 'sap', category: 'martial', rangeKind: 'melee', properties: ["versatile"] },
  { slug: 'mace', nameRu: "Булава", mastery: 'sap', category: 'simple', rangeKind: 'melee', properties: [] },
  { slug: 'maul', nameRu: "Молот", mastery: 'topple', category: 'martial', rangeKind: 'melee', properties: ["heavy", "two_handed"] },
  { slug: 'morningstar', nameRu: "Моргенштерн", mastery: 'sap', category: 'martial', rangeKind: 'melee', properties: [] },
  { slug: 'musket', nameRu: "Мушкет", mastery: 'slow', category: 'martial', rangeKind: 'ranged', properties: ["ammunition", "loading", "two_handed"] },
  { slug: 'pike', nameRu: "Пика", mastery: 'push', category: 'martial', rangeKind: 'melee', properties: ["heavy", "reach", "two_handed"] },
  { slug: 'pistol', nameRu: "Пистоль", mastery: 'vex', category: 'martial', rangeKind: 'ranged', properties: ["ammunition", "loading"] },
  { slug: 'quarterstaff', nameRu: "Боевой посох", mastery: 'topple', category: 'simple', rangeKind: 'melee', properties: ["versatile"] },
  { slug: 'rapier', nameRu: "Рапира", mastery: 'vex', category: 'martial', rangeKind: 'melee', properties: ["finesse"] },
  { slug: 'scimitar', nameRu: "Ятаган", mastery: 'nick', category: 'martial', rangeKind: 'melee', properties: ["finesse", "light"] },
  { slug: 'shortbow', nameRu: "Короткий лук", mastery: 'vex', category: 'simple', rangeKind: 'ranged', properties: ["ammunition", "two_handed"] },
  { slug: 'shortsword', nameRu: "Короткий меч", mastery: 'vex', category: 'martial', rangeKind: 'melee', properties: ["finesse", "light"] },
  { slug: 'sickle', nameRu: "Серп", mastery: 'nick', category: 'simple', rangeKind: 'melee', properties: ["light"] },
  { slug: 'sling', nameRu: "Праща", mastery: 'slow', category: 'simple', rangeKind: 'ranged', properties: ["ammunition"] },
  { slug: 'spear', nameRu: "Копьё", mastery: 'sap', category: 'simple', rangeKind: 'melee', properties: ["thrown", "versatile"] },
  { slug: 'trident', nameRu: "Трезубец", mastery: 'topple', category: 'martial', rangeKind: 'melee', properties: ["thrown", "versatile"] },
  { slug: 'war-pick', nameRu: "Клевец", mastery: 'sap', category: 'martial', rangeKind: 'melee', properties: ["versatile"] },
  { slug: 'warhammer', nameRu: "Боевой молот", mastery: 'push', category: 'martial', rangeKind: 'melee', properties: ["versatile"] },
  { slug: 'whip', nameRu: "Кнут", mastery: 'slow', category: 'martial', rangeKind: 'melee', properties: ["finesse", "reach"] },
]

export function srdWeaponMasteryBySlug(slug: string | null | undefined): MasteryWeaponOption | null {
  const key = String(slug || "").trim().toLowerCase()
  if (!key) return null
  return SRD_WEAPONS_2024_MASTERY.find((w) => w.slug === key) ?? null
}
