/**
 * P24-M02a+: 2024 class options — invocations, metamagic, replicate plans,
 * Cunning/Brutal Strike, rage extend, Divine Sense.
 * Mirror of backend/app/dnd/edition_2024_class_options.py.
 */

/** Active EFA replicate on the sheet (created magic item). */
export type ReplicateActive2024 = {
  planId: string
  attuned: boolean
  /** Creation order — oldest vanishes first when over the Magic Items column. */
  seq: number
}

export type ClassOptions2024State = {
  eldritch_invocations: string[]
  metamagic: string[]
  replicate_plans: string[]
  /** Active replicas created from known plans (2024 EFA). */
  replicate_active: ReplicateActive2024[]
  /** Spell stored in Spell-Storing Item (artificer spell slug, circles 1–3). */
  spell_storing_spell: string | null
  rage: {
    active: boolean
    rounds_extended: number
    max_minutes: number
    wild_heart?: 'wolf' | 'bear' | 'eagle' | null
    wild_heart_power?: 'falcon' | 'lion' | 'ram' | null
    world_tree_travel_used?: boolean
  }
  /** Wild Heart (2024, L6+): salmon | panther | owl */
  wild_heart_aspect?: 'salmon' | 'panther' | 'owl' | null
  /** Cleric Divine Order (2024). */
  divine_order?: 'protector' | 'thaumaturge' | null
  /** Cleric Blessed Strikes (2024, L7+). */
  blessed_strikes?: 'divine_strike' | 'potent_spellcasting' | null
  /** Druid Primal Order (2024): Ведун / Страж. */
  primal_order?: 'magician' | 'warden' | null
  /** Druid Elemental Fury (2024, L7+). */
  elemental_fury?: 'potent_spellcasting' | 'primal_strike' | null
  /** Druid Circle of the Land terrain (2024): arid | polar | temperate | tropical. */
  land_choice?: 'arid' | 'polar' | 'temperate' | 'tropical' | null
  /** Ranger Beast Master (2024, L3+): land | sea | sky. */
  primal_companion?: 'land' | 'sea' | 'sky' | null
  /** Warlock Vestige Patron (2024, L3+): Cleric domain for always-prepared. */
  vestige_domain?: 'war' | 'life' | 'trickery' | 'light' | null
  /** Warlock Vestige Patron (2024, L3+): companion creature type. */
  vestige_companion_type?: 'fiend' | 'celestial' | 'undead' | null
  /** Alchemist Experimental Elixir bottles currently held (2024). */
  experimental_elixirs?: Array<{ id: string; effect: string }>
  /** Cartographer Adventure Atlas card holders (display labels). */
  atlas_holders?: string[]
  /** Artillerist cannon mode chosen on last activation (2024). */
  cannon_mode?: 'flamethrower' | 'force_ballista' | 'protector' | null
}

function readBlessedStrikes(raw: unknown): 'divine_strike' | 'potent_spellcasting' | null {
  const key = String(raw ?? '').trim().toLowerCase()
  return key === 'divine_strike' || key === 'potent_spellcasting' ? key : null
}

function readPrimalOrder(raw: unknown): 'magician' | 'warden' | null {
  const key = String(raw ?? '').trim().toLowerCase()
  return key === 'magician' || key === 'warden' ? key : null
}

function readElementalFury(raw: unknown): 'potent_spellcasting' | 'primal_strike' | null {
  const key = String(raw ?? '').trim().toLowerCase()
  return key === 'potent_spellcasting' || key === 'primal_strike' ? key : null
}

function readLandChoice(raw: unknown): 'arid' | 'polar' | 'temperate' | 'tropical' | null {
  const key = String(raw ?? '').trim().toLowerCase()
  return key === 'arid' || key === 'polar' || key === 'temperate' || key === 'tropical' ? key : null
}

function readDivineOrder(raw: unknown): 'protector' | 'thaumaturge' | null {
  const key = String(raw ?? '').trim().toLowerCase()
  return key === 'protector' || key === 'thaumaturge' ? key : null
}

export function emptyClassOptions2024(): ClassOptions2024State {
  return {
    eldritch_invocations: [],
    metamagic: [],
    replicate_plans: [],
    replicate_active: [],
    spell_storing_spell: null,
    rage: { active: false, rounds_extended: 0, max_minutes: 10 },
    divine_order: null,
    blessed_strikes: null,
    primal_order: null,
    elemental_fury: null,
    land_choice: null,
    primal_companion: null,
    vestige_domain: null,
    vestige_companion_type: null,
    experimental_elixirs: [],
    atlas_holders: [],
    cannon_mode: null,
  }
}

function readReplicateActive(raw: unknown): ReplicateActive2024[] {
  if (!Array.isArray(raw)) return []
  const out: ReplicateActive2024[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const rec = row as Record<string, unknown>
    const planId = String(rec.planId ?? rec.plan_id ?? '')
      .trim()
      .toLowerCase()
      .replace(/_/g, '-')
    if (!planId) continue
    out.push({
      planId,
      attuned: Boolean(rec.attuned),
      seq: Math.max(0, Math.floor(Number(rec.seq ?? out.length) || 0)),
    })
  }
  return out
}

function readPrimalCompanion(raw: unknown): 'land' | 'sea' | 'sky' | null {
  const key = String(raw ?? '').trim().toLowerCase()
  return key === 'land' || key === 'sea' || key === 'sky' ? key : null
}

function readVestigeDomain(raw: unknown): 'war' | 'life' | 'trickery' | 'light' | null {
  const key = String(raw ?? '').trim().toLowerCase()
  return key === 'war' || key === 'life' || key === 'trickery' || key === 'light' ? key : null
}

function readVestigeCompanionType(raw: unknown): 'fiend' | 'celestial' | 'undead' | null {
  const key = String(raw ?? '').trim().toLowerCase()
  return key === 'fiend' || key === 'celestial' || key === 'undead' ? key : null
}

function readWildHeartRage(raw: unknown): 'wolf' | 'bear' | 'eagle' | null {
  const key = String(raw ?? '').trim().toLowerCase()
  return key === 'wolf' || key === 'bear' || key === 'eagle' ? key : null
}

function readWildHeartPower(raw: unknown): 'falcon' | 'lion' | 'ram' | null {
  const key = String(raw ?? '').trim().toLowerCase()
  return key === 'falcon' || key === 'lion' || key === 'ram' ? key : null
}

function readWildHeartAspect(raw: unknown): 'salmon' | 'panther' | 'owl' | null {
  const key = String(raw ?? '').trim().toLowerCase()
  return key === 'salmon' || key === 'panther' || key === 'owl' ? key : null
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
  const spellStoring = String(row.spell_storing_spell ?? '').trim() || null
  return {
    eldritch_invocations: list('eldritch_invocations'),
    metamagic: list('metamagic'),
    replicate_plans: list('replicate_plans'),
    replicate_active: readReplicateActive(row.replicate_active),
    spell_storing_spell: spellStoring,
    rage: {
      active: Boolean(rageRaw.active),
      rounds_extended: Number(rageRaw.rounds_extended || 0),
      max_minutes: 10,
      ...(rageRaw.wild_heart != null && rageRaw.wild_heart !== ''
        ? { wild_heart: readWildHeartRage(rageRaw.wild_heart) }
        : {}),
      ...(rageRaw.wild_heart_power != null && rageRaw.wild_heart_power !== ''
        ? { wild_heart_power: readWildHeartPower(rageRaw.wild_heart_power) }
        : {}),
      ...(rageRaw.world_tree_travel_used != null
        ? { world_tree_travel_used: Boolean(rageRaw.world_tree_travel_used) }
        : {}),
    },
    wild_heart_aspect: readWildHeartAspect(row.wild_heart_aspect),
    divine_order: readDivineOrder(row.divine_order),
    blessed_strikes: readBlessedStrikes(row.blessed_strikes),
    primal_order: readPrimalOrder(row.primal_order),
    elemental_fury: readElementalFury(row.elemental_fury),
    land_choice: readLandChoice(row.land_choice),
    primal_companion: readPrimalCompanion(row.primal_companion),
    vestige_domain: readVestigeDomain(row.vestige_domain),
    vestige_companion_type: readVestigeCompanionType(row.vestige_companion_type),
    experimental_elixirs: Array.isArray(row.experimental_elixirs)
      ? (row.experimental_elixirs as unknown[])
          .map((item) => {
            if (!item || typeof item !== 'object') return null
            const rec = item as Record<string, unknown>
            const id = String(rec.id ?? '').trim()
            const effect = String(rec.effect ?? '').trim()
            return id && effect ? { id, effect } : null
          })
          .filter((item): item is { id: string; effect: string } => Boolean(item))
      : [],
    atlas_holders: list('atlas_holders'),
    cannon_mode: (() => {
      const key = String(row.cannon_mode ?? '').trim().toLowerCase()
      return key === 'flamethrower' || key === 'force_ballista' || key === 'protector'
        ? key
        : null
    })(),
  }
}

export function classOptions2024ToSheet(state: ClassOptions2024State): Record<string, unknown> {
  return {
    eldritch_invocations: [...state.eldritch_invocations],
    metamagic: [...state.metamagic],
    replicate_plans: [...state.replicate_plans],
    replicate_active: state.replicate_active.map((row) => ({
      plan_id: row.planId,
      attuned: row.attuned,
      seq: row.seq,
    })),
    ...(state.spell_storing_spell
      ? { spell_storing_spell: state.spell_storing_spell }
      : { spell_storing_spell: null }),
    rage: {
      active: state.rage.active,
      rounds_extended: state.rage.rounds_extended,
      max_minutes: 10,
      ...(state.rage.wild_heart ? { wild_heart: state.rage.wild_heart } : {}),
      ...(state.rage.wild_heart_power ? { wild_heart_power: state.rage.wild_heart_power } : {}),
      ...(state.rage.world_tree_travel_used != null
        ? { world_tree_travel_used: state.rage.world_tree_travel_used }
        : {}),
    },
    ...(state.wild_heart_aspect ? { wild_heart_aspect: state.wild_heart_aspect } : {}),
    ...(state.divine_order ? { divine_order: state.divine_order } : {}),
    ...(state.blessed_strikes ? { blessed_strikes: state.blessed_strikes } : {}),
    ...(state.primal_order ? { primal_order: state.primal_order } : {}),
    ...(state.elemental_fury ? { elemental_fury: state.elemental_fury } : {}),
    ...(state.land_choice ? { land_choice: state.land_choice } : {}),
    ...(state.primal_companion ? { primal_companion: state.primal_companion } : {}),
    ...(state.vestige_domain ? { vestige_domain: state.vestige_domain } : {}),
    ...(state.vestige_companion_type ? { vestige_companion_type: state.vestige_companion_type } : {}),
    experimental_elixirs: (state.experimental_elixirs ?? []).map((row) => ({
      id: row.id,
      effect: row.effect,
    })),
    atlas_holders: [...(state.atlas_holders ?? [])],
    ...(state.cannon_mode ? { cannon_mode: state.cannon_mode } : { cannon_mode: null }),
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
  { id: 'agonizing-blast', nameRu: 'Мучительный взрыв', minLevel: 2, requiresDamageCantrip: true, repeatable: true, summaryRu: 'К броскам урона выбранного заговора колдуна — мод. Харизмы.' },
  { id: 'armor-of-shadows', nameRu: 'Доспех теней', minLevel: 1, summaryRu: '«Доспех мага» на себя без ячейки; КД обновляется, пока эффект активен.' },
  { id: 'ascendant-step', nameRu: 'Восходящий шаг', minLevel: 5, summaryRu: '«Левитация» на себя без ячейки.' },
  { id: 'devils-sight', nameRu: 'Дьявольское зрение', minLevel: 2, summaryRu: 'Нормально видно в тусклом свете и темноте (магической и нет) 120 фт.' },
  { id: 'devouring-blade', nameRu: 'Пожирающий клинок', minLevel: 12, requiresInvocation: 'thirsting-blade', summaryRu: '«Жаждущий клинок» даёт две доп. атаки (итого три).' },
  { id: 'eldritch-mind', nameRu: 'Мистический разум', minLevel: 1, summaryRu: 'Преимущество на спасброски Тел. для концентрации.' },
  { id: 'eldritch-smite', nameRu: 'Мистическая кара', minLevel: 5, requiresPact: 'blade', summaryRu: '1/ход при попадании оружием договора: ячейка → 1к8 силового + 1к8/круг; можно опрокинуть.' },
  { id: 'eldritch-spear', nameRu: 'Мистическое копьё', minLevel: 2, requiresDamageCantrip: true, repeatable: true, summaryRu: 'Дальность выбранного заговора +30 фт. × уровень колдуна.' },
  { id: 'fiendish-vigor', nameRu: 'Мощь Исчадия', minLevel: 2, summaryRu: '«Псевдожизнь» на себя без ячейки; временные хиты по максимуму костей.' },
  { id: 'gaze-of-two-minds', nameRu: 'Взор двух умов', minLevel: 5, summaryRu: 'Бонусом — чужие чувства; каст из пространства союзника в пределах 60 фт.' },
  { id: 'gift-of-the-depths', nameRu: 'Дар глубин', minLevel: 5, summaryRu: 'Дыхание под водой и плавание = Скорости; «Подводное дыхание» 1/долгий без ячейки.' },
  { id: 'gift-of-the-protectors', nameRu: 'Дар защитников', minLevel: 9, requiresPact: 'tome', summaryRu: 'Страница имён: 0 хитов → 1 хит (1/долгий на всю страницу).' },
  { id: 'investment-of-the-chain-master', nameRu: 'Облачение хозяина цепи', minLevel: 5, requiresPact: 'chain', summaryRu: 'Усиление фамильяра договора цепи.' },
  { id: 'lessons-of-the-first-ones', nameRu: 'Уроки древних', minLevel: 2, repeatable: true, summaryRu: 'Одна черта происхождения; повторяемое — другая черта.' },
  { id: 'lifedrinker', nameRu: 'Пьющий жизни', minLevel: 9, requiresPact: 'blade', summaryRu: '1/ход: +1к6 (излучение/некрот./психика) и можно потратить Кость хитов.' },
  { id: 'mask-of-many-faces', nameRu: 'Маска многих лиц', minLevel: 2, summaryRu: '«Маскировка» без ячейки.' },
  { id: 'master-of-myriad-forms', nameRu: 'Мастер бесчисленных обликов', minLevel: 5, summaryRu: '«Смена обличия» без ячейки.' },
  { id: 'misty-visions', nameRu: 'Туманные видения', minLevel: 2, summaryRu: '«Безмолвный образ» без ячейки.' },
  { id: 'one-with-shadows', nameRu: 'Один среди теней', minLevel: 5, summaryRu: 'В тусклом/тьме — «Невидимость» на себя без ячейки.' },
  { id: 'otherworldly-leap', nameRu: 'Потусторонний прыжок', minLevel: 2, summaryRu: '«Прыжок» на себя без ячейки.' },
  { id: 'pact-of-the-blade', nameRu: 'Договор клинка', minLevel: 1, summaryRu: 'Оружие договора; владение; фокусировка; атака/урон от Харизмы; смена типа урона.' },
  { id: 'pact-of-the-chain', nameRu: 'Договор цепи', minLevel: 1, summaryRu: '«Обретение фамильяра» действием Магия без ячейки; особые формы.' },
  { id: 'pact-of-the-tome', nameRu: 'Договор гримуара', minLevel: 1, summaryRu: 'Книга теней: 3 заговора и 2 ритуала 1 круга любого класса; фокусировка.' },
  { id: 'repelling-blast', nameRu: 'Отталкивающий заряд', minLevel: 2, requiresDamageCantrip: true, repeatable: true, summaryRu: 'При попадании заговором атакой — оттолкнуть до 10 фт. (Большой или меньше).' },
  { id: 'thirsting-blade', nameRu: 'Жаждущий клинок', minLevel: 5, requiresPact: 'blade', summaryRu: 'Доп. атака только оружием договора (действие Атака — две атаки).' },
  { id: 'visions-of-distant-realms', nameRu: 'Видения дальних земель', minLevel: 9, summaryRu: '«Магический глаз» без ячейки.' },
  { id: 'whispers-of-the-grave', nameRu: 'Могильный шёпот', minLevel: 7, summaryRu: '«Разговор с мёртвыми» без ячейки.' },
  { id: 'witch-sight', nameRu: 'Ведьмачий взор', minLevel: 15, summaryRu: 'Истинное зрение 30 фт.' },
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
  requiresSubclass?: string
}

export const CUNNING_STRIKE_2024: StrikeOption2024[] = [
  { id: 'poison', nameRu: 'Отравление', costDice: 1, save: 'con', minLevel: 5, summaryRu: 'Спас Тел. или Отравлена 1 мин.; повтор в конце каждого своего хода. Нужны инструменты отравителя.', requiresKit: 'poisoners-kit' },
  { id: 'trip', nameRu: 'Подсечка', costDice: 1, save: 'dex', minLevel: 5, summaryRu: 'Цель Большая или меньше: спас Лов. или Опрокинута.' },
  { id: 'withdraw', nameRu: 'Отступление', costDice: 1, save: null, minLevel: 5, summaryRu: 'Сразу после атаки переместиться до половины скорости без провоцированных.' },
  { id: 'daze', nameRu: 'Шок', costDice: 2, save: 'con', minLevel: 14, summaryRu: 'Спас Тел. или в следующий свой ход цель может только либо переместиться, либо совершить одно действие, либо бонусное.' },
  { id: 'knock-out', nameRu: 'Нокаут', costDice: 6, save: 'con', minLevel: 14, summaryRu: 'Спас Тел. или Бессознательна 1 мин. / до урона; повтор в конце каждого своего хода.' },
  { id: 'obscure', nameRu: 'Ослепление', costDice: 3, save: 'dex', minLevel: 14, summaryRu: 'Спас Лов. или Ослеплена до конца своего следующего хода.' },
  {
    id: 'supreme-sneak',
    nameRu: 'Скрытная атака',
    costDice: 1,
    save: null,
    minLevel: 9,
    summaryRu: 'До конца текущего хода — преимущество на проверки Скрытности (Хитрое действие: Засада).',
    requiresSubclass: 'rogue__thief',
  },
]

export const BRUTAL_STRIKE_2024: StrikeOption2024[] = [
  { id: 'forceful-blow', nameRu: 'Мощный удар', costDice: 0, save: null, minLevel: 9, summaryRu: 'Толчок 15 фт + движение без OA. +1d10.' },
  { id: 'hamstring-blow', nameRu: 'Калечащий удар', costDice: 0, save: null, minLevel: 9, summaryRu: 'Скорость цели −15 фт до начала вашего следующего хода. +1d10.' },
  { id: 'staggering-blow', nameRu: 'Потрясающий удар', costDice: 0, save: null, minLevel: 13, summaryRu: 'Помеха на след. спас; без OA до начала вашего следующего хода.' },
  { id: 'sundering-blow', nameRu: 'Расшатывающий удар', costDice: 0, save: null, minLevel: 13, summaryRu: '+5 к следующему броску атаки по цели другим существом.' },
]

export function resolveCunningStrike2024(input: {
  optionIds: string[]
  rogueLevel: number
  sneakAttackDice: number
  dexMod: number
  proficiencyBonus: number
  hasPoisonersKit?: boolean
  subclassSlug?: string | null
}): { ok: true; diceSpent: number; remaining: number; feedLineRu: string; effects: StrikeOption2024[]; dc: number } | { ok: false; reasonRu: string } {
  if (input.rogueLevel < 5) return { ok: false, reasonRu: 'Хитрый удар с 5 ур. плута' }
  const maxOpts = input.rogueLevel >= 11 ? 2 : 1
  if (input.optionIds.length > maxOpts) {
    return { ok: false, reasonRu: `Можно до ${maxOpts} эффектов` }
  }
  const byId = Object.fromEntries(CUNNING_STRIKE_2024.map((r) => [r.id, r]))
  const effects: StrikeOption2024[] = []
  let cost = 0
  const sub = String(input.subclassSlug || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
  for (const oid of input.optionIds) {
    const opt = byId[oid]
    if (!opt) return { ok: false, reasonRu: `Неизвестный Хитрый удар: ${oid}` }
    if (input.rogueLevel < opt.minLevel) {
      return { ok: false, reasonRu: `«${opt.nameRu}» с ${opt.minLevel} ур.` }
    }
    if (opt.requiresSubclass) {
      const need = opt.requiresSubclass.replace(/_/g, '-')
      if (!sub || (sub !== need && !sub.endsWith(need) && !sub.includes(need))) {
        return { ok: false, reasonRu: `«${opt.nameRu}» доступен подклассу Вор (с 9 ур.)` }
      }
    }
    if (opt.requiresKit === 'poisoners-kit' && !input.hasPoisonersKit) {
      return { ok: false, reasonRu: 'Для «Отравления» нужен набор отравителя' }
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
  /** If true, creating/attuning counts against the artificer attunement cap. */
  requiresAttunement?: boolean
}

export const ARTIFICER_REPLICATE_PLANS_2024: ReplicatePlan2024[] = [
  { id: 'alchemy-jug', nameRu: 'Алхимический кувшин', minLevel: 2, rarity: 'uncommon' },
  { id: 'bag-of-holding', nameRu: 'Сумка хранения', minLevel: 2, rarity: 'uncommon' },
  { id: 'cap-of-water-breathing', nameRu: 'Шапка водного дыхания', minLevel: 2, rarity: 'uncommon' },
  { id: 'goggles-of-night', nameRu: 'Очки ночного зрения', minLevel: 2, rarity: 'uncommon' },
  { id: 'lantern-of-revealing', nameRu: 'Фонарь выявления', minLevel: 2, rarity: 'uncommon' },
  { id: 'rope-of-climbing', nameRu: 'Верёвка лазания', minLevel: 2, rarity: 'uncommon' },
  { id: 'sending-stones', nameRu: 'Камни послания', minLevel: 2, rarity: 'uncommon' },
  { id: 'wand-of-magic-detection', nameRu: 'Жезл обнаружения магии', minLevel: 2, rarity: 'uncommon', requiresAttunement: true },
  { id: 'boots-of-the-winding-path', nameRu: 'Сапоги извилистого пути', minLevel: 6, rarity: 'uncommon', requiresAttunement: true },
  { id: 'helm-of-awareness', nameRu: 'Шлем бдительности', minLevel: 6, rarity: 'uncommon', requiresAttunement: true },
  { id: 'radiant-weapon', nameRu: 'Сияющее оружие', minLevel: 6, rarity: 'rare', requiresAttunement: true },
  { id: 'repulsion-shield', nameRu: 'Щит отталкивания', minLevel: 6, rarity: 'rare', requiresAttunement: true },
  { id: 'spell-refueling-ring', nameRu: 'Кольцо подпитки заклинаний', minLevel: 6, rarity: 'uncommon', requiresAttunement: true },
  { id: 'boots-of-speed', nameRu: 'Сапоги скорости', minLevel: 10, rarity: 'rare', requiresAttunement: true },
  { id: 'winged-boots', nameRu: 'Крылатые сапоги', minLevel: 10, rarity: 'uncommon', requiresAttunement: true },
  { id: 'belt-of-hill-giant-strength', nameRu: 'Пояс силы холмового великана', minLevel: 14, rarity: 'rare', requiresAttunement: true },
  { id: 'amulet-of-health', nameRu: 'Амулет здоровья', minLevel: 14, rarity: 'rare', requiresAttunement: true },
  { id: 'armor-of-resistance', nameRu: 'Доспех сопротивления', minLevel: 14, rarity: 'rare', requiresAttunement: true },
]

const REPLICATE_PLANS_BY_ID = Object.fromEntries(
  ARTIFICER_REPLICATE_PLANS_2024.map((row) => [row.id, row]),
)

export function replicatePlanById2024(id: string | null | undefined): ReplicatePlan2024 | null {
  if (!id) return null
  const key = String(id).trim().toLowerCase().replace(/_/g, '-')
  return REPLICATE_PLANS_BY_ID[key] ?? null
}

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
