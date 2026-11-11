/**
 * Wizard tradition rules for pack 08 (PHB 2014, XGtE, TCoE, EGW).
 * Pure helpers: spellbook rebind, ward, portent, capstones, school grants, feature use.
 */

import type { ClassLevelEntry } from './classLevels'
import { resolveSubclassFeatureSlug } from './classFeatures'
import type { FeaturePicksState } from './featurePicks'
import { getFeaturePickList, setFeaturePick } from './featurePicks'
import {
  featureResourceId,
  parseFeatureResourceId,
} from './featureResources'
import type { SheetResource } from './rest'
import { clampResource } from './rest'
import type { AppliedSubclassGrant } from './subclassGrants'
import type { SpellbookAcquisition } from './wizardSpellbook'

export type WizardSheetSpell = {
  id: string
  name: string
  level: number
  prepared?: boolean
  prepared_locked?: boolean
  prepare_source_label?: string
  in_spellbook?: boolean
  spellbook_acquisition?: SpellbookAcquisition
  school?: string
  ritual?: boolean
  grant_cast?: {
    max: number
    used: number
    reset: 'short' | 'long'
    label: string
  }
  catalog_id?: string | null
  class_slug?: string | null
  source_kind?: string
}

export const SIGNATURE_PREPARE_LABEL = 'Фирменное заклинание'
export const SPELL_MASTERY_FEATURE_ID = 'spell_mastery'
export const SIGNATURE_SPELLS_FEATURE_ID = 'signature_spells'

/** EGW dunamancy: DC = chronurgy, DG = graviturgy, D = both traditions. */
export const EGW_TRADITION_BY_SLUG: Record<string, Array<'chronurgy_magic' | 'graviturgy_magic'>> = {
  sapping_sting: ['chronurgy_magic', 'graviturgy_magic'],
  gift_of_alacrity: ['chronurgy_magic'],
  magnify_gravity: ['graviturgy_magic'],
  fortune_s_favor: ['chronurgy_magic', 'graviturgy_magic'],
  immovable_object: ['graviturgy_magic'],
  wristpocket: ['chronurgy_magic', 'graviturgy_magic'],
  pulse_wave: ['chronurgy_magic', 'graviturgy_magic'],
  gravity_sinkhole: ['graviturgy_magic'],
  temporal_shunt: ['chronurgy_magic'],
  gravity_fissure: ['graviturgy_magic'],
  tether_essence: ['chronurgy_magic', 'graviturgy_magic'],
  dark_star: ['graviturgy_magic'],
  reality_break: ['chronurgy_magic'],
  ravenous_void: ['graviturgy_magic'],
  time_ravage: ['chronurgy_magic'],
}

export function egwSubclassesForSlug(
  slug: string,
): Array<{ class: 'wizard'; subclass: 'chronurgy_magic' | 'graviturgy_magic' }> {
  const traditions = EGW_TRADITION_BY_SLUG[slug] ?? []
  return traditions.map((subclass) => ({ class: 'wizard', subclass }))
}

/** PHB Arcane Ward: 2 × wizard level + Intelligence modifier. */
export function arcaneWardMax(wizardLevel: number, intelligenceScore: number): number {
  const level = Math.min(20, Math.max(1, Math.floor(wizardLevel) || 1))
  const mod = Math.floor((Math.max(1, Math.floor(intelligenceScore)) - 10) / 2)
  return level * 2 + mod
}

export function isAbjurationSchool(school: string | null | undefined): boolean {
  const key = (school ?? '').trim().toLowerCase()
  return key === 'abjuration' || key === 'ограждение' || key === 'преграждение'
}

export function isCounterspellOrDispel(spell: { name: string }): boolean {
  const name = spell.name.trim().toLowerCase().replace(/ё/g, 'е')
  return (
    name.includes('контрзакл') ||
    name.includes('counterspell') ||
    name.includes('рассеивание магии') ||
    name.includes('dispel magic')
  )
}

/**
 * PHB: an unprepared wizard spell in the book is not a slot cast.
 * A ritual in the book may still be cast as a ritual.
 */
export function wizardLeveledCastGate(spell: {
  level: number
  prepared?: boolean
  prepared_locked?: boolean
  ritual?: boolean
}): { slot: boolean; ritualOnly: boolean; message: string } {
  if (spell.level <= 0 || spell.prepared || spell.prepared_locked) {
    return { slot: true, ritualOnly: false, message: '' }
  }
  if (spell.ritual) {
    return {
      slot: false,
      ritualOnly: true,
      message: 'Не подготовлено: из книги только ритуалом, без ячейки',
    }
  }
  return {
    slot: false,
    ritualOnly: false,
    message: 'Сначала подготовь заклинание — обычный каст из книги недоступен',
  }
}

export function rollD20(rng: () => number = Math.random): number {
  return 1 + Math.floor(rng() * 20)
}

export function rollPortentDice(count: number, rng: () => number = Math.random): number[] {
  const n = Math.max(0, Math.min(3, Math.floor(count) || 0))
  return Array.from({ length: n }, () => rollD20(rng))
}

const SCHOOL_BOOK_GRANTS: Array<{
  subclass: string
  minLevel: number
  slug: string
  name: string
  level: number
  school: string
  keys: string[]
}> = [
  {
    subclass: 'school_of_necromancy',
    minLevel: 6,
    slug: 'animate_dead',
    name: 'Восставший труп',
    level: 3,
    school: 'necromancy',
    keys: ['восставший-труп', 'animate-dead'],
  },
  {
    subclass: 'school_of_transmutation',
    minLevel: 10,
    slug: 'polymorph',
    name: 'Превращение',
    level: 4,
    school: 'transmutation',
    keys: ['превращение', 'polymorph'],
  },
]

function nameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

export function wizardFeatureSpellId(classEntryId: string, slug: string): string {
  return `feature-spell:${classEntryId}:${slug}`
}

/**
 * Necromancer 6 adds Animate Dead to the book; Transmuter 10 adds Polymorph.
 * Grants do not consume the +2 spells per level. Leaving the tradition
 * removes only the feature copy, not a spell the wizard copied themselves.
 */
export function syncWizardSchoolSpellbook<T extends WizardSheetSpell>(input: {
  known: T[]
  classes: ClassLevelEntry[]
  grants: Array<Pick<AppliedSubclassGrant, 'classEntryId' | 'slug' | 'parentSlug'>>
  makeSpell: (draft: {
    id: string
    name: string
    level: number
    school: string
  }) => T
}): { known: T[]; changed: boolean } {
  let known = input.known
  let changed = false
  const traditions = input.classes
    .filter((row) => /волшебник|wizard|^маг$/i.test(row.name.trim()))
    .map((row) => {
      const grant = input.grants.find((item) => item.classEntryId === row.id)
      const slug =
        grant?.slug || resolveSubclassFeatureSlug(row.subclass_name || '') || ''
      return { classEntryId: row.id, slug, level: row.level }
    })
    .filter((row) => row.slug)
  for (const grant of SCHOOL_BOOK_GRANTS) {
    for (const row of traditions) {
      const qualified = row.slug === grant.subclass && row.level >= grant.minLevel
      const featureId = wizardFeatureSpellId(row.classEntryId, grant.slug)
      const already = known.some(
        (spell) =>
          spell.id !== featureId &&
          grant.keys.includes(nameKey(spell.name)) &&
          spell.level === grant.level,
      )
      if (qualified && !already && !known.some((spell) => spell.id === featureId)) {
        known = [
          ...known,
          input.makeSpell({
            id: featureId,
            name: grant.name,
            level: grant.level,
            school: grant.school,
          }),
        ]
        changed = true
      }
      if (!qualified && known.some((spell) => spell.id === featureId)) {
        known = known.filter((spell) => spell.id !== featureId)
        changed = true
      }
    }
  }
  const liveIds = new Set<string>()
  for (const row of traditions) {
    for (const grant of SCHOOL_BOOK_GRANTS) {
      if (row.slug === grant.subclass && row.level >= grant.minLevel) {
        liveIds.add(wizardFeatureSpellId(row.classEntryId, grant.slug))
      }
    }
  }
  const next = known.filter((spell) => {
    if (!spell.id.startsWith('feature-spell:')) return true
    if (!spell.id.endsWith(':animate_dead') && !spell.id.endsWith(':polymorph')) return true
    return liveIds.has(spell.id)
  })
  if (next.length !== known.length) changed = true
  return { known: changed ? next : input.known, changed }
}

export function syncWizardCapstoneSpells<T extends WizardSheetSpell>(input: {
  known: T[]
  featurePicks: FeaturePicksState
  classEntryId: string
}): { known: T[]; changed: boolean } {
  const signatureIds = new Set(
    getFeaturePickList(input.featurePicks, input.classEntryId, SIGNATURE_SPELLS_FEATURE_ID),
  )
  let changed = false
  const known = input.known.map((spell) => {
    const pinned = signatureIds.has(spell.id) && spell.level === 3
    if (pinned) {
      const used = spell.grant_cast?.label === SIGNATURE_PREPARE_LABEL ? spell.grant_cast.used : 0
      const same =
        spell.prepared === true &&
        spell.prepared_locked === true &&
        spell.prepare_source_label === SIGNATURE_PREPARE_LABEL &&
        spell.grant_cast?.max === 1 &&
        spell.grant_cast.reset === 'short' &&
        spell.grant_cast.label === SIGNATURE_PREPARE_LABEL &&
        spell.grant_cast.used === Math.min(1, used)
      if (same) return spell
      changed = true
      return {
        ...spell,
        prepared: true,
        prepared_locked: true,
        prepare_source_label: SIGNATURE_PREPARE_LABEL,
        grant_cast: {
          max: 1,
          used: Math.min(1, used),
          reset: 'short' as const,
          label: SIGNATURE_PREPARE_LABEL,
        },
      }
    }
    if (spell.prepare_source_label === SIGNATURE_PREPARE_LABEL || spell.grant_cast?.label === SIGNATURE_PREPARE_LABEL) {
      changed = true
      const next = { ...spell, prepared_locked: false }
      delete next.prepare_source_label
      if (next.grant_cast?.label === SIGNATURE_PREPARE_LABEL) delete next.grant_cast
      return next
    }
    return spell
  })
  return { known: changed ? known : input.known, changed }
}

export function setWizardCapstonePick(
  picks: FeaturePicksState,
  classEntryId: string,
  featureId: string,
  spellIds: string[],
): FeaturePicksState {
  const unique = [...new Set(spellIds.map((id) => id.trim()).filter(Boolean))]
  return setFeaturePick(
    picks,
    classEntryId,
    featureId,
    unique.length ? unique.join(',') : null,
  )
}

export function masterySpellIds(
  picks: FeaturePicksState,
  classEntryId: string,
): string[] {
  return getFeaturePickList(picks, classEntryId, SPELL_MASTERY_FEATURE_ID)
}

function resourceByPool(resources: SheetResource[], poolId: string): SheetResource | null {
  return (
    resources.find((row) => parseFeatureResourceId(row.id)?.poolId === poolId) ?? null
  )
}

function mapResource(
  resources: SheetResource[],
  id: string,
  patch: (row: SheetResource) => SheetResource,
): SheetResource[] {
  return resources.map((row) => (row.id === id ? clampResource(patch(row)) : row))
}

function spendOne(resources: SheetResource[], id: string): SheetResource[] | null {
  const row = resources.find((item) => item.id === id)
  if (!row) return null
  if (row.track === 'stock') {
    if (row.used <= 0) return null
    return mapResource(resources, id, (item) => ({ ...item, used: item.used - 1 }))
  }
  if (row.used >= row.max) return null
  return mapResource(resources, id, (item) => ({ ...item, used: item.used + 1 }))
}

/** After the generic rest reset: portent dice, ward end, power surge floor. */
export function finishWizardResourcesOnRest(
  resources: SheetResource[],
  kind: 'short' | 'long',
  rng: () => number = Math.random,
): SheetResource[] {
  return resources.map((raw) => {
    const row = clampResource(raw)
    const poolId = parseFeatureResourceId(row.id)?.poolId
    if (!poolId) return row
    if (poolId === 'portent' && kind === 'long') {
      const dice = rollPortentDice(row.max, rng)
      return clampResource({ ...row, dice, used: dice.length, track: 'stock' })
    }
    if (poolId === 'arcane_ward' && kind === 'long') {
      return clampResource({
        ...row,
        used: 0,
        track: 'stock',
        wardCreated: false,
        activeLabel: undefined,
      })
    }
    if (poolId === 'power_surge' && kind === 'short' && row.used <= 0) {
      return clampResource({ ...row, used: 1, track: 'stock' })
    }
    if (
      (poolId === 'bladesong' || poolId === 'the_third_eye' || poolId === 'event_horizon') &&
      row.activeLabel
    ) {
      return clampResource({ ...row, activeLabel: undefined })
    }
    return row
  })
}

export function createArcaneWard(resources: SheetResource[]): {
  resources: SheetResource[]
  ok: boolean
  message: string
} {
  const row = resourceByPool(resources, 'arcane_ward')
  if (!row) return { resources, ok: false, message: 'Магический щит ещё не на листе' }
  if (row.wardCreated) {
    return { resources, ok: false, message: 'Щит уже создан до продолжительного отдыха' }
  }
  return {
    resources: mapResource(resources, row.id, (item) => ({
      ...item,
      used: item.max,
      track: 'stock',
      wardCreated: true,
    })),
    ok: true,
    message: `Магический щит создан: ${row.max}/${row.max}`,
  }
}

/**
 * Casting an abjuration spell of 1st level or higher creates the ward
 * or restores 2 × the slot level (PHB).
 */
export function applyAbjurationToWard(
  resources: SheetResource[],
  slotLevel: number,
): { resources: SheetResource[]; note: string | null } {
  const row = resourceByPool(resources, 'arcane_ward')
  if (!row) return { resources, note: null }
  const circle = Math.max(1, Math.floor(slotLevel) || 1)
  if (!row.wardCreated) {
    const next = mapResource(resources, row.id, (item) => ({
      ...item,
      used: item.max,
      track: 'stock',
      wardCreated: true,
    }))
    return { resources: next, note: `Магический щит создан ${row.max}/${row.max}` }
  }
  const gain = circle * 2
  const current = Math.min(row.max, row.used + gain)
  if (current === row.used) return { resources, note: null }
  return {
    resources: mapResource(resources, row.id, (item) => ({
      ...item,
      used: current,
      track: 'stock',
      wardCreated: true,
    })),
    note: `Магический щит +${current - row.used} (${current}/${row.max})`,
  }
}

export function gainPowerSurge(resources: SheetResource[]): {
  resources: SheetResource[]
  note: string | null
} {
  const row = resourceByPool(resources, 'power_surge')
  if (!row) return { resources, note: null }
  if (row.used >= row.max) {
    return { resources, note: 'Всплеск силы уже полон' }
  }
  const next = mapResource(resources, row.id, (item) => ({
    ...item,
    used: item.used + 1,
    track: 'stock',
  }))
  return {
    resources: next,
    note: `Всплеск силы ${row.used + 1}/${row.max}`,
  }
}

export const WIZARD_RESOLVED_FEATURE_IDS = new Set([
  'portent',
  'the_third_eye',
  'hypnotic_gaze',
  'instinctive_charm',
  'command_undead',
  'minor_conjuration',
  'master_transmuter',
  'bladesong',
  'manifest_mind',
  'chronal_shift',
  'momentary_stasis',
  'arcane_abeyance',
  'convergent_future',
  'violent_attraction',
  'event_horizon',
  'power_surge',
])

export function wizardResolvedFeatureId(featureOrPoolId: string): boolean {
  return WIZARD_RESOLVED_FEATURE_IDS.has(featureOrPoolId)
}

const THIRD_EYE_MODES = [
  { id: 'darkvision', label: 'Тёмное зрение 60 фт.' },
  { id: 'ethereal', label: 'Эфирное зрение 60 фт.' },
  { id: 'tongues', label: 'Чтение любого языка' },
  { id: 'see_invisibility', label: 'Видеть невидимое 10 фт.' },
] as const

const TRANSMUTER_EFFECTS: Record<string, string> = {
  major_transformation:
    'Большое преобразование: немагический предмет не больше куба 5 фт. в другой той же массы и не большей цены. 10 минут работы. Камень уничтожен до продолжительного отдыха.',
  panacea:
    'Панацея: касание снимает проклятия, болезни и яды и восстанавливает все хиты. Камень уничтожен до продолжительного отдыха.',
  restore_life:
    'Возвращение жизни: raise dead касанием без ячейки и без записи в книге. Камень уничтожен до продолжительного отдыха.',
  restore_youth:
    'Возвращение молодости: видимый возраст −3к10 лет, не ниже 13. Срок жизни не растёт. Камень уничтожен до продолжительного отдыха.',
}

export type WizardFeatureUseInput = {
  featureId: string
  resourceId: string | null
  resources: SheetResource[]
  classEntryId: string
  classSlug: string
  wizardLevel: number
  intelligenceScore: number
  mode?: string | null
  target?: string | null
  saveFailed?: boolean | null
  objectName?: string | null
  dieIndex?: number | null
  transmuterEffect?: string | null
  companions?: Array<{ id: string; name: string; notes?: string; source?: { feature?: string } }>
}

export type WizardFeatureUseResult = {
  ok: boolean
  message: string
  resources: SheetResource[]
  exhaustionDelta: number
  concentrationName: string | null
  activeLabels: string[]
  companion: { id: string; name: string; notes: string } | null
}

export function applyWizardFeatureUse(input: WizardFeatureUseInput): WizardFeatureUseResult {
  const base: WizardFeatureUseResult = {
    ok: false,
    message: 'Нечего применять',
    resources: input.resources,
    exhaustionDelta: 0,
    concentrationName: null,
    activeLabels: [],
    companion: null,
  }
  const resource =
    (input.resourceId
      ? input.resources.find((row) => row.id === input.resourceId)
      : null) ??
    input.resources.find(
      (row) =>
        parseFeatureResourceId(row.id)?.poolId === input.featureId &&
        parseFeatureResourceId(row.id)?.classEntryId === input.classEntryId,
    ) ??
    null
  const id = resource?.id ?? null

  if (input.featureId === 'bladesong' && resource?.activeLabel) {
    return {
      ...base,
      ok: true,
      message: 'Песнь клинка закончилась',
      resources: mapResource(input.resources, resource.id, (row) => ({
        ...row,
        activeLabel: undefined,
      })),
    }
  }

  if (input.featureId === 'minor_conjuration' || input.featureId === 'command_undead') {
    return resolveManual(input, base, null)
  }

  if (!id || !resource) {
    return { ...base, message: 'Ресурс умения не найден' }
  }
  const spent = spendOne(input.resources, id)
  if (!spent && input.featureId !== 'portent') {
    return { ...base, message: 'Нет использований' }
  }
  return resolveManual(input, base, spent)
}

function resolveManual(
  input: WizardFeatureUseInput,
  base: WizardFeatureUseResult,
  spent: SheetResource[] | null,
): WizardFeatureUseResult {
  const target = (input.target ?? '').trim()
  const objectName = (input.objectName ?? '').trim()
  switch (input.featureId) {
    case 'portent': {
      const row = input.resources.find((item) =>
        input.resourceId ? item.id === input.resourceId : parseFeatureResourceId(item.id)?.poolId === 'portent',
      )
      const dice = row?.dice ?? []
      const index = input.dieIndex ?? 0
      const value = dice[index]
      if (!row || value == null) return { ...base, message: 'Нет записанной кости знамения' }
      const nextDice = dice.filter((_, i) => i !== index)
      return {
        ...base,
        ok: true,
        message: `Знамение: бросок заменён на ${value}${target ? ` (${target})` : ''}. Кость потрачена.`,
        resources: mapResource(input.resources, row.id, (item) => ({
          ...item,
          dice: nextDice,
          used: nextDice.length,
          track: 'stock',
        })),
      }
    }
    case 'the_third_eye': {
      const mode = THIRD_EYE_MODES.find((row) => row.id === input.mode) ?? THIRD_EYE_MODES[0]
      return {
        ...base,
        ok: true,
        message: `Третий глаз: ${mode.label}. До короткого или продолжительного отдыха.`,
        resources: mapResource(spent ?? input.resources, spentResourceId(spent, input), (row) => ({
          ...row,
          activeLabel: mode.label,
        })),
        activeLabels: [mode.label],
      }
    }
    case 'hypnotic_gaze':
      if (!target) return { ...base, message: 'Укажи цель в 5 фт.' }
      return {
        ...base,
        ok: true,
        message: input.saveFailed
          ? `${target}: провал спасброска Мудрости — очарован до конца вашего следующего хода, скорость 0, недееспособен. Дальше действием можно продлевать, пока цель в 5 фт.`
          : `${target}: успех спасброска Мудрости. На это существо Гипнотический взгляд больше не действует до продолжительного отдыха.`,
        resources: spent ?? input.resources,
      }
    case 'instinctive_charm':
      if (!target) return { ...base, message: 'Укажи атакующего в 30 фт.' }
      return {
        ...base,
        ok: true,
        message: input.saveFailed
          ? `${target}: провал спасброска Мудрости — атака уходит в ближайшее другое существо в пределах досягаемости.`
          : `${target}: успех. На этого атакующего Инстинктивное очарование больше не действует до продолжительного отдыха.`,
        resources: spent ?? input.resources,
      }
    case 'command_undead':
      if (!target) {
        return { ...base, message: 'Укажи нежить в 60 фт. При Интеллекте 8+ у цели преимущество.' }
      }
      return {
        ...base,
        ok: true,
        message: input.saveFailed
          ? `${target}: провал спасброска Харизмы — нежить под контролем, пока умение не использовано снова. Интеллект 12+ повторяет спас в конце каждого часа.`
          : `${target}: успех спасброска Харизмы — это существо больше нельзя повелевать.`,
        resources: input.resources,
      }
    case 'minor_conjuration':
      if (!objectName) return { ...base, message: 'Назови предмет, который уже видел.' }
      return {
        ...base,
        ok: true,
        message: `Малый вызов: «${objectName}» — немагический предмет в руке или на земле в 10 фт., до 3 фт. по стороне и 10 фунтов, на 1 час или до урона. На листе это ручная отметка, карточки предмета нет.`,
        resources: input.resources,
      }
    case 'master_transmuter': {
      const effect = TRANSMUTER_EFFECTS[input.transmuterEffect ?? ''] ?? TRANSMUTER_EFFECTS.panacea
      return {
        ...base,
        ok: true,
        message: effect,
        resources: spent ?? input.resources,
      }
    }
    case 'bladesong': {
      const mod = Math.floor((Math.max(1, input.intelligenceScore) - 10) / 2)
      const bonus = Math.max(1, mod)
      return {
        ...base,
        ok: true,
        message: `Песнь клинка: КД +${bonus}, скорость +10 фт., преимущество на Акробатику, +${bonus} к спасброску концентрации. 1 минута. Это не концентрация: песнь спадает от недееспособности, среднего или тяжёлого доспеха, щита или атаки двумя руками.`,
        resources: mapResource(spent ?? input.resources, spentResourceId(spent, input), (row) => ({
          ...row,
          activeLabel: 'Песнь клинка',
        })),
        activeLabels: ['Песнь клинка'],
      }
    }
    case 'manifest_mind':
      return {
        ...base,
        ok: true,
        message:
          'Спектральный разум проявлен в 60 фт. Каст через него тратит это использование (бонус мастерства за продолжительный отдых).',
        resources: spent ?? input.resources,
        companion: {
          id: `manifest-mind:${input.classEntryId}`,
          name: 'Спектральный разум',
          notes: objectName || 'Призрачная книга',
        },
      }
    case 'chronal_shift':
      return {
        ...base,
        ok: true,
        message: target
          ? `${target} перебрасывает атаку, проверку или спасбросок и обязан взять новый результат.`
          : 'Укажи существо в 30 фт. Оно перебрасывает бросок и берёт новый результат.',
        resources: spent ?? input.resources,
      }
    case 'momentary_stasis':
      return {
        ...base,
        ok: true,
        message: target
          ? input.saveFailed === false
            ? `${target}: успех спасброска Телосложения — стазис не подействовал.`
            : `${target}: провал спасброска Телосложения — недееспособен, скорость 0 до конца вашего следующего хода или до урона.`
          : 'Укажи существо не больше Large в 60 фт.',
        resources: spent ?? input.resources,
      }
    case 'arcane_abeyance':
      if (!objectName) {
        return { ...base, message: 'Назови заклинание не выше 4 круга, которое сжимаешь в бусину.' }
      }
      return {
        ...base,
        ok: true,
        message: `Магическая отсрочка: «${objectName}» (не выше 4 круга) сжато в серую бусину на 1 час. Существо может действием выпустить эффект. Бусина одна.`,
        resources: spent ?? input.resources,
      }
    case 'convergent_future':
      return {
        ...base,
        ok: true,
        message: `${target || 'Бросок'} заменён на ${input.saveFailed === false ? 'провал' : 'успех'}. Уровень истощения +1.`,
        resources: spent ?? input.resources,
        exhaustionDelta: 1,
      }
    case 'violent_attraction':
      return {
        ...base,
        ok: true,
        message:
          input.mode === 'fall'
            ? `${target || 'Существо'} падает: +2к10 урона от падения.`
            : `${target || 'Попадание оружием'} в 60 фт.: +1к10 урона типа оружия.`,
        resources: spent ?? input.resources,
      }
    case 'event_horizon':
      return {
        ...base,
        ok: true,
        message:
          'Горизонт событий: сфера 30 фт. на 1 минуту, концентрация. Труднопроходимая местность. Существо в сфере в начале хода — спасбросок Силы, иначе 2к10 силового и скорость 0.',
        resources: spent ?? input.resources,
        concentrationName: 'Горизонт событий',
      }
    case 'power_surge': {
      const extra = Math.max(1, Math.floor(input.wizardLevel / 2))
      return {
        ...base,
        ok: true,
        message: `Всплеск силы: +${extra} силового урона одной цели заклинания волшебника (раз за ход).`,
        resources: spent ?? input.resources,
      }
    }
    default:
      return base
  }
}

function spentResourceId(spent: SheetResource[] | null, input: WizardFeatureUseInput): string {
  if (input.resourceId) return input.resourceId
  const row = (spent ?? input.resources).find(
    (item) => parseFeatureResourceId(item.id)?.poolId === input.featureId,
  )
  return row?.id ?? ''
}

export function wizardResourceId(
  classSlug: string,
  poolId: string,
  classEntryId: string,
): string {
  return featureResourceId(classSlug, poolId, classEntryId)
}

export function bladesongBonuses(input: {
  resources: SheetResource[]
  intelligenceScore: number
}): { ac: number; speed: number; concentrationSave: number; active: boolean } {
  const row = resourceByPool(input.resources, 'bladesong')
  if (!row?.activeLabel) {
    return { ac: 0, speed: 0, concentrationSave: 0, active: false }
  }
  const mod = Math.floor((Math.max(1, input.intelligenceScore) - 10) / 2)
  const bonus = Math.max(1, mod)
  return { ac: bonus, speed: 10, concentrationSave: bonus, active: true }
}

export function thirdEyeDarkvisionBonus(resources: SheetResource[]): number {
  const row = resourceByPool(resources, 'the_third_eye')
  if (!row?.activeLabel) return 0
  if (row.activeLabel.includes('Тёмное зрение')) return 60
  return 0
}

export function activeWizardLabels(resources: SheetResource[]): string[] {
  const labels: string[] = []
  for (const row of resources) {
    const pool = parseFeatureResourceId(row.id)?.poolId
    if (!pool || !wizardResolvedFeatureId(pool)) continue
    if (row.activeLabel) labels.push(row.activeLabel)
    if (pool === 'portent' && row.dice?.length) {
      labels.push(`Знамение: ${row.dice.join(', ')}`)
    }
    if (pool === 'arcane_ward') {
      labels.push(`Щит ${row.used}/${row.max}${row.wardCreated ? '' : ' · не создан'}`)
    }
  }
  return labels
}

export { THIRD_EYE_MODES, TRANSMUTER_EFFECTS }
