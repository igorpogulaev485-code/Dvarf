/**
 * P24-M02a+: 2024 class options — invocations, metamagic, replicate plans,
 * Cunning/Brutal Strike, rage extend, Divine Sense.
 * Mirror of backend/app/dnd/edition_2024_class_options.py.
 */

export type ClassOptions2024State = {
  eldritch_invocations: string[]
  metamagic: string[]
  replicate_plans: string[]
  rage: { active: boolean; rounds_extended: number; max_minutes: number }
}

export function emptyClassOptions2024(): ClassOptions2024State {
  return {
    eldritch_invocations: [],
    metamagic: [],
    replicate_plans: [],
    rage: { active: false, rounds_extended: 0, max_minutes: 10 },
  }
}

export function readClassOptions2024(raw: unknown): ClassOptions2024State {
  const empty = emptyClassOptions2024()
  if (!raw || typeof raw !== 'object') return empty
  const row = raw as Record<string, unknown>
  const list = (key: string) =>
    Array.isArray(row[key])
      ? (row[key] as unknown[]).map((x) => String(x)).filter(Boolean)
      : []
  const rageRaw =
    row.rage && typeof row.rage === 'object'
      ? (row.rage as Record<string, unknown>)
      : {}
  return {
    eldritch_invocations: list('eldritch_invocations'),
    metamagic: list('metamagic'),
    replicate_plans: list('replicate_plans'),
    rage: {
      active: Boolean(rageRaw.active),
      rounds_extended: Number(rageRaw.rounds_extended || 0),
      max_minutes: 10,
    },
  }
}

export function classOptions2024ToSheet(state: ClassOptions2024State): Record<string, unknown> {
  return {
    eldritch_invocations: [...state.eldritch_invocations],
    metamagic: [...state.metamagic],
    replicate_plans: [...state.replicate_plans],
    rage: {
      active: state.rage.active,
      rounds_extended: state.rage.rounds_extended,
      max_minutes: 10,
    },
  }
}

export type InvocationDef2024 = {
  id: string
  nameRu: string
  minLevel: number
  requiresPact?: 'blade' | 'chain' | 'tome'
  requiresInvocation?: string
  requiresDamageCantrip?: boolean
  repeatable?: boolean
  summaryRu: string
}

export const ELDRITCH_INVOCATIONS_2024: InvocationDef2024[] = [
  { id: 'agonizing-blast', nameRu: 'Мучительный заговор', minLevel: 2, requiresDamageCantrip: true, repeatable: true, summaryRu: 'К урону выбранного заговора — мод. Хар.' },
  { id: 'armor-of-shadows', nameRu: 'Доспех теней', minLevel: 1, summaryRu: 'Mage Armor на себя без ячейки.' },
  { id: 'ascendant-step', nameRu: 'Вознесённый шаг', minLevel: 5, summaryRu: 'Levitate на себя без ячейки.' },
  { id: 'devils-sight', nameRu: 'Дьявольское зрение', minLevel: 2, summaryRu: 'Видение в магической и обычной тьме 120 фт.' },
  { id: 'devouring-blade', nameRu: 'Пожирающий клинок', minLevel: 12, requiresInvocation: 'thirsting-blade', summaryRu: 'Thirsting Blade — две доп. атаки.' },
  { id: 'eldritch-mind', nameRu: 'Мистический разум', minLevel: 1, summaryRu: 'Преимущество к спас Тел. на концентрацию.' },
  { id: 'eldritch-smite', nameRu: 'Мистическая кара', minLevel: 5, requiresPact: 'blade', summaryRu: 'Ячейка договора → Force + опрокинуть.' },
  { id: 'eldritch-spear', nameRu: 'Мистическое копьё', minLevel: 2, requiresDamageCantrip: true, repeatable: true, summaryRu: 'Дальность заговора +30×ур.' },
  { id: 'fiendish-vigor', nameRu: 'Дьявольская мощь', minLevel: 2, summaryRu: 'False Life без ячейки.' },
  { id: 'gaze-of-two-minds', nameRu: 'Взгляд двух умов', minLevel: 5, summaryRu: 'Чужие чувства; каст из пространства союзника.' },
  { id: 'gift-of-the-depths', nameRu: 'Дар глубин', minLevel: 5, summaryRu: 'Дыхание под водой; Water Breathing 1/долгий.' },
  { id: 'gift-of-the-protectors', nameRu: 'Дар защитников', minLevel: 9, requiresPact: 'tome', summaryRu: '0 хитов → 1 хит 1/долгий.' },
  { id: 'investment-of-the-chain-master', nameRu: 'Вложение повелителя цепи', minLevel: 5, requiresPact: 'chain', summaryRu: 'Усиление фамильяра.' },
  { id: 'lessons-of-the-first-ones', nameRu: 'Уроки Первых', minLevel: 2, repeatable: true, summaryRu: 'Черта происхождения.' },
  { id: 'lifedrinker', nameRu: 'Жизнепийца', minLevel: 9, requiresPact: 'blade', summaryRu: 'Доп. 1d6 + кость хитов.' },
  { id: 'mask-of-many-faces', nameRu: 'Маска многих лиц', minLevel: 2, summaryRu: 'Disguise Self без ячейки.' },
  { id: 'master-of-myriad-forms', nameRu: 'Владыка обликов', minLevel: 5, summaryRu: 'Alter Self без ячейки.' },
  { id: 'misty-visions', nameRu: 'Туманные видения', minLevel: 2, summaryRu: 'Silent Image без ячейки.' },
  { id: 'one-with-shadows', nameRu: 'Единство с тенями', minLevel: 5, summaryRu: 'Invisibility в тусклом/тьме.' },
  { id: 'otherworldly-leap', nameRu: 'Иной прыжок', minLevel: 2, summaryRu: 'Jump на себя без ячейки.' },
  { id: 'pact-of-the-blade', nameRu: 'Договор клинка', minLevel: 1, summaryRu: 'Оружие договора; атаки от Хар.' },
  { id: 'pact-of-the-chain', nameRu: 'Договор цепи', minLevel: 1, summaryRu: 'Find Familiar особых форм.' },
  { id: 'pact-of-the-tome', nameRu: 'Договор тома', minLevel: 1, summaryRu: 'Книга теней: заговоры и ритуалы.' },
  { id: 'repelling-blast', nameRu: 'Отталкивающий заговор', minLevel: 2, requiresDamageCantrip: true, repeatable: true, summaryRu: 'Толчок до 10 фт.' },
  { id: 'thirsting-blade', nameRu: 'Жаждущий клинок', minLevel: 5, requiresPact: 'blade', summaryRu: 'Доп. атака оружием договора.' },
  { id: 'visions-of-distant-realms', nameRu: 'Видения дальних царств', minLevel: 9, summaryRu: 'Arcane Eye без ячейки.' },
  { id: 'whispers-of-the-grave', nameRu: 'Шёпот могилы', minLevel: 7, summaryRu: 'Speak with Dead без ячейки.' },
  { id: 'witch-sight', nameRu: 'Ведьмин взгляд', minLevel: 15, summaryRu: 'Truesight 30 фт.' },
]

const INVOCATIONS_BY_ID = Object.fromEntries(
  ELDRITCH_INVOCATIONS_2024.map((r) => [r.id, r]),
)

export function warlockInvocationLimit2024(level: number): number {
  const row: Record<number, number> = {
    1: 1, 2: 3, 3: 3, 4: 3, 5: 5, 6: 5, 7: 6, 8: 6, 9: 7, 10: 7,
    11: 7, 12: 8, 13: 8, 14: 8, 15: 9, 16: 9, 17: 9, 18: 10, 19: 10, 20: 10,
  }
  const lv = Math.max(1, Math.min(20, Math.floor(level || 1)))
  return row[lv] ?? 1
}

export type MetamagicDef2024 = {
  id: string
  nameRu: string
  cost: number
  summaryRu: string
  stackableWithOther?: boolean
}

export const METAMAGIC_2024: MetamagicDef2024[] = [
  { id: 'careful', nameRu: 'Аккуратное заклинание', cost: 1, summaryRu: 'До Хар. существ автоуспех на спас; без половины урона.' },
  { id: 'distant', nameRu: 'Далёкое заклинание', cost: 1, summaryRu: 'Дистанция ×2; касание → 30 фт.' },
  { id: 'empowered', nameRu: 'Усиленное заклинание', cost: 1, summaryRu: 'Перебросить до Хар. костей урона.', stackableWithOther: true },
  { id: 'extended', nameRu: 'Продлённое заклинание', cost: 1, summaryRu: 'Длительность ×2 (≤24 ч.); преимущество к концентрации.' },
  { id: 'heightened', nameRu: 'Непреодолимое заклинание', cost: 2, summaryRu: 'Одна цель — помеха на спасброски от этого заклинания.' },
  { id: 'quickened', nameRu: 'Ускоренное заклинание', cost: 2, summaryRu: 'Действие → бонусное (лимит заклинаний 1+ круга в ход).' },
  { id: 'seeking', nameRu: 'Ищущее заклинание', cost: 1, summaryRu: 'Промах атаки — переброс d20.', stackableWithOther: true },
  { id: 'subtle', nameRu: 'Неуловимое заклинание', cost: 1, summaryRu: 'Без V/S/M (кроме расходуемых/с ценой).' },
  { id: 'transmuted', nameRu: 'Преобразованное заклинание', cost: 1, summaryRu: 'Сменить тип урона (звук/кислота/огонь/холод/электричество/яд).' },
  { id: 'twinned', nameRu: 'Удвоенное заклинание', cost: 1, summaryRu: 'Повысить фактический круг на 1 для доп. цели.' },
]

const METAMAGIC_BY_ID = Object.fromEntries(METAMAGIC_2024.map((r) => [r.id, r]))

/** PHB 2024 / next.dnd.su: 2 at L2, +2 at L10 (4), +2 at L17 (6). */
export function metamagicKnownLimit2024(level: number): number {
  if (level < 2) return 0
  if (level >= 17) return 6
  if (level >= 10) return 4
  return 2
}

export function metamagicById2024(id: string | null | undefined): MetamagicDef2024 | null {
  if (!id) return null
  const key = id.replace(/_/g, '-').replace(/-spell$/, '')
  return METAMAGIC_BY_ID[key] ?? null
}

export function applyMetamagicSpend2024(input: {
  known: string[]
  optionId: string
  sorceryPointsMax: number
  sorceryPointsUsed: number
}): { ok: true; cost: number; newUsed: number; feedLineRu: string; nameRu: string } | { ok: false; reasonRu: string } {
  const def = metamagicById2024(input.optionId)
  if (!def) return { ok: false, reasonRu: 'Неизвестная метамагия' }
  if (!input.known.includes(def.id)) return { ok: false, reasonRu: 'Метамагия не выбрана' }
  const remaining = Math.max(0, input.sorceryPointsMax - input.sorceryPointsUsed)
  if (remaining < def.cost) {
    return { ok: false, reasonRu: `Недостаточно очков чародейства (${remaining} < ${def.cost})` }
  }
  return {
    ok: true,
    cost: def.cost,
    newUsed: input.sorceryPointsUsed + def.cost,
    nameRu: def.nameRu,
    feedLineRu: `Метамагия «${def.nameRu}» (−${def.cost} очк. чародейства)`,
  }
}

export type StrikeOption2024 = {
  id: string
  nameRu: string
  costDice: number
  save: 'dex' | 'con' | null
  minLevel: number
  summaryRu: string
  requiresKit?: string
}

export const CUNNING_STRIKE_2024: StrikeOption2024[] = [
  { id: 'poison', nameRu: 'Яд', costDice: 1, save: 'con', minLevel: 5, summaryRu: 'Спас Тел. или Отравлен 1 мин.', requiresKit: 'poisoners-kit' },
  { id: 'trip', nameRu: 'Подножка', costDice: 1, save: 'dex', minLevel: 5, summaryRu: 'Большое или меньше: спас Лов. или Опрокинут.' },
  { id: 'withdraw', nameRu: 'Отход', costDice: 1, save: null, minLevel: 5, summaryRu: 'Перемещение до половины скорости без OA.' },
  { id: 'daze', nameRu: 'Оглушение', costDice: 2, save: 'con', minLevel: 14, summaryRu: 'Спас Тел. или только одно: движение/действие/бонусное.' },
  { id: 'knock-out', nameRu: 'Нокаут', costDice: 6, save: 'con', minLevel: 14, summaryRu: 'Спас Тел. или Бессознателен.' },
  { id: 'obscure', nameRu: 'Затмение', costDice: 3, save: 'dex', minLevel: 14, summaryRu: 'Спас Лов. или Слепота.' },
]

export const BRUTAL_STRIKE_2024: StrikeOption2024[] = [
  { id: 'forceful-blow', nameRu: 'Мощный удар', costDice: 0, save: null, minLevel: 9, summaryRu: 'Толчок 15 фт + движение без OA. +1d10.' },
  { id: 'hamstring-blow', nameRu: 'Подрезание', costDice: 0, save: null, minLevel: 9, summaryRu: 'Скорость −15 фт. +1d10.' },
  { id: 'staggering-blow', nameRu: 'Шокирующий удар', costDice: 0, save: null, minLevel: 13, summaryRu: 'Помеха на след. спас; без OA.' },
  { id: 'sundering-blow', nameRu: 'Крушащий удар', costDice: 0, save: null, minLevel: 13, summaryRu: 'След. атака союзника +5.' },
]

export function resolveCunningStrike2024(input: {
  optionIds: string[]
  rogueLevel: number
  sneakAttackDice: number
  dexMod: number
  proficiencyBonus: number
  hasPoisonersKit?: boolean
}): { ok: true; diceSpent: number; remaining: number; feedLineRu: string; effects: StrikeOption2024[]; dc: number } | { ok: false; reasonRu: string } {
  if (input.rogueLevel < 5) return { ok: false, reasonRu: 'Хитрый удар с 5 ур. плута' }
  const maxOpts = input.rogueLevel >= 11 ? 2 : 1
  if (input.optionIds.length > maxOpts) {
    return { ok: false, reasonRu: `Можно до ${maxOpts} эффектов` }
  }
  const byId = Object.fromEntries(CUNNING_STRIKE_2024.map((r) => [r.id, r]))
  const effects: StrikeOption2024[] = []
  let cost = 0
  for (const oid of input.optionIds) {
    const opt = byId[oid]
    if (!opt) return { ok: false, reasonRu: `Неизвестный Хитрый удар: ${oid}` }
    if (input.rogueLevel < opt.minLevel) {
      return { ok: false, reasonRu: `«${opt.nameRu}» с ${opt.minLevel} ур.` }
    }
    if (opt.requiresKit === 'poisoners-kit' && !input.hasPoisonersKit) {
      return { ok: false, reasonRu: 'Для «Яда» нужен набор отравителя' }
    }
    cost += opt.costDice
    effects.push(opt)
  }
  if (cost > input.sneakAttackDice) {
    return { ok: false, reasonRu: `Недостаточно костей Скрытой атаки (${input.sneakAttackDice}d6 < ${cost}d6)` }
  }
  const dc = 8 + input.dexMod + input.proficiencyBonus
  return {
    ok: true,
    diceSpent: cost,
    remaining: input.sneakAttackDice - cost,
    effects,
    dc,
    feedLineRu: `Хитрый удар: ${effects.map((e) => e.nameRu).join(', ')} (−${cost}d6 Скрытой атаки)`,
  }
}

export function resolveBrutalStrike2024(input: {
  optionIds: string[]
  barbarianLevel: number
  recklessUsed: boolean
  attackHasAdvantage: boolean
  attackHasDisadvantage: boolean
}): { ok: true; extraDamage: string; feedLineRu: string; effects: StrikeOption2024[]; forgoAdvantage: true } | { ok: false; reasonRu: string } {
  if (input.barbarianLevel < 9) return { ok: false, reasonRu: 'Жестокий удар с 9 ур. варвара' }
  if (!input.recklessUsed) return { ok: false, reasonRu: 'Нужна Безрассудная атака' }
  if (input.attackHasDisadvantage) return { ok: false, reasonRu: 'Нельзя при помехе' }
  if (!input.attackHasAdvantage) return { ok: false, reasonRu: 'Нужно отказаться от преимущества' }
  const maxFx = input.barbarianLevel >= 17 ? 2 : 1
  if (!input.optionIds.length || input.optionIds.length > maxFx) {
    return { ok: false, reasonRu: `Выберите 1–${maxFx} эффекта` }
  }
  const byId = Object.fromEntries(BRUTAL_STRIKE_2024.map((r) => [r.id, r]))
  const effects: StrikeOption2024[] = []
  for (const oid of input.optionIds) {
    const opt = byId[oid]
    if (!opt) return { ok: false, reasonRu: `Неизвестный Жестокий удар: ${oid}` }
    if (input.barbarianLevel < opt.minLevel) {
      return { ok: false, reasonRu: `«${opt.nameRu}» с ${opt.minLevel} ур.` }
    }
    effects.push(opt)
  }
  const dice = input.barbarianLevel >= 17 ? 2 : 1
  return {
    ok: true,
    extraDamage: `${dice}d10`,
    forgoAdvantage: true,
    effects,
    feedLineRu: `Жестокий удар (+${dice}d10, без преимущества): ${effects.map((e) => e.nameRu).join(', ')}`,
  }
}

export function resolveRageExtend2024(input: {
  active: boolean
  roundsExtended: number
  reason: string
  wearingHeavyArmor?: boolean
  incapacitated?: boolean
}): { ok: true; roundsExtended: number; feedLineRu: string } | { ok: false; reasonRu: string } {
  if (!input.active) return { ok: false, reasonRu: 'Ярость не активна' }
  if (input.wearingHeavyArmor || input.incapacitated) {
    return { ok: false, reasonRu: 'Ярость прервана' }
  }
  const reason = input.reason.trim().toLowerCase()
  if (!['attack', 'save', 'bonus', 'атака', 'спас', 'бонусное'].includes(reason)) {
    return { ok: false, reasonRu: 'Продление: атака, спас или бонусное' }
  }
  const next = input.roundsExtended + 1
  if (next > 100) return { ok: false, reasonRu: 'Ярость истекла (10 минут)' }
  return {
    ok: true,
    roundsExtended: next,
    feedLineRu: `Ярость продлена (${reason}) до конца следующего хода`,
  }
}

export function resolveDivineSenseChannel2024(channelRemaining: number): {
  ok: true
  feedLineRu: string
  spendChannel: number
} | { ok: false; reasonRu: string } {
  if (channelRemaining <= 0) {
    return { ok: false, reasonRu: 'Нет применений Проведения божественности' }
  }
  return {
    ok: true,
    spendChannel: 1,
    feedLineRu: 'Проведение: Божественное чувство (бонусное, 10 мин., 60 фт.)',
  }
}

export type ReplicatePlan2024 = {
  id: string
  nameRu: string
  minLevel: number
  rarity: string
}

export const ARTIFICER_REPLICATE_PLANS_2024: ReplicatePlan2024[] = [
  { id: 'alchemy-jug', nameRu: 'Алхимический кувшин', minLevel: 2, rarity: 'uncommon' },
  { id: 'bag-of-holding', nameRu: 'Сумка хранения', minLevel: 2, rarity: 'uncommon' },
  { id: 'cap-of-water-breathing', nameRu: 'Шапка водного дыхания', minLevel: 2, rarity: 'uncommon' },
  { id: 'goggles-of-night', nameRu: 'Очки ночного зрения', minLevel: 2, rarity: 'uncommon' },
  { id: 'lantern-of-revealing', nameRu: 'Фонарь выявления', minLevel: 2, rarity: 'uncommon' },
  { id: 'rope-of-climbing', nameRu: 'Верёвка лазания', minLevel: 2, rarity: 'uncommon' },
  { id: 'sending-stones', nameRu: 'Камни послания', minLevel: 2, rarity: 'uncommon' },
  { id: 'wand-of-magic-detection', nameRu: 'Жезл обнаружения магии', minLevel: 2, rarity: 'uncommon' },
  { id: 'boots-of-the-winding-path', nameRu: 'Сапоги извилистого пути', minLevel: 6, rarity: 'uncommon' },
  { id: 'helm-of-awareness', nameRu: 'Шлем бдительности', minLevel: 6, rarity: 'uncommon' },
  { id: 'radiant-weapon', nameRu: 'Сияющее оружие', minLevel: 6, rarity: 'rare' },
  { id: 'repulsion-shield', nameRu: 'Щит отталкивания', minLevel: 6, rarity: 'rare' },
  { id: 'spell-refueling-ring', nameRu: 'Кольцо подпитки заклинаний', minLevel: 6, rarity: 'uncommon' },
  { id: 'boots-of-speed', nameRu: 'Сапоги скорости', minLevel: 10, rarity: 'rare' },
  { id: 'winged-boots', nameRu: 'Крылатые сапоги', minLevel: 10, rarity: 'uncommon' },
  { id: 'belt-of-hill-giant-strength', nameRu: 'Пояс силы холмового великана', minLevel: 14, rarity: 'rare' },
  { id: 'amulet-of-health', nameRu: 'Амулет здоровья', minLevel: 14, rarity: 'rare' },
  { id: 'armor-of-resistance', nameRu: 'Доспех сопротивления', minLevel: 14, rarity: 'rare' },
]

export function invocationById2024(id: string): InvocationDef2024 | null {
  return INVOCATIONS_BY_ID[id] ?? null
}

export function parseSneakAttackDice(value: unknown): number {
  const text = String(value || '').toLowerCase()
  if (text.includes('d')) {
    const n = Number.parseInt(text.split('d')[0] || '0', 10)
    return Number.isFinite(n) ? Math.max(0, n) : 0
  }
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}
