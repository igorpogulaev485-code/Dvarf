/**
 * Attunement limit (PHB 3, artificer 4/5/6), one item per family,
 * and class / race / alignment requirements.
 */

import {
  resolveClassFeatureSlug,
  resolveSubclassFeatureSlug,
} from '../../shared/dnd/classFeatures'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import {
  alignmentMatchesRequirement,
  isAlignmentSlug,
  recognizeAlignment,
} from '../../shared/dnd/alignments'
import { readAppliedRaceGrant } from '../../shared/dnd/raceGrants'
import { RACE_NAMING_PARENT } from '../../shared/dnd/raceNamingTables'
import { characterHasCasterClass } from '../../shared/dnd/casterProgression'
import { readClassLevels } from './classLevels'
import { asRecord } from './sheetTypes'
import type { AttunementSlot } from './attunement'
import { maxAttunementsForClasses } from './attunement'
import type { InventoryItem } from './inventory'

export type RobeColor = 'white' | 'gray' | 'black'

export type AttunementCharacter = {
  classes: ClassLevelEntry[]
  raceCatalogId: string | null
  raceSlug: string | null
  raceParentSlug: string | null
  alignmentSlug: string
  /** Free text that did not match the catalog. Alignment gates stay closed. */
  alignmentUnresolved: boolean
}

export const CLASS_LABEL_RU: Record<string, string> = {
  barbarian: 'варвар',
  bard: 'бард',
  cleric: 'жрец',
  druid: 'друид',
  fighter: 'воин',
  monk: 'монах',
  paladin: 'паладин',
  ranger: 'следопыт',
  rogue: 'плут',
  sorcerer: 'чародей',
  warlock: 'колдун',
  wizard: 'волшебник',
  artificer: 'изобретатель',
}

const RACE_LABEL_RU: Record<string, string> = {
  dwarf: 'дварф',
  elf: 'эльф',
  halfling: 'полурослик',
  human: 'человек',
  gnome: 'гном',
  half_elf: 'полуэльф',
  half_orc: 'полуорк',
  tiefling: 'тифлинг',
  dragonborn: 'драконорождённый',
  warforged: 'кованый',
  mark_of_finding_human: 'человек с меткой поиска',
  mark_of_finding_half_orc: 'полуорк с меткой поиска',
  mark_of_scribing: 'метка письма',
  mark_of_warding: 'метка охраны',
  fairy: 'фэйри',
  satyr: 'сатир',
  centaur: 'кентавр',
}

const ALIGNMENT_GROUP_RU: Record<string, string> = {
  good: 'любое доброе',
  evil: 'любое злое',
  lawful: 'любое законное',
  chaotic: 'любое хаотичное',
  neutral: 'нейтральное (не доброе и не злое)',
}

const ROBE_GROUP: Record<RobeColor, string> = {
  white: 'good',
  gray: 'neutral',
  black: 'evil',
}

export const ROBE_COLOR_OPTIONS: Array<{ value: RobeColor; label: string }> = [
  { value: 'white', label: 'Белая — доброе' },
  { value: 'gray', label: 'Серая — нейтральное' },
  { value: 'black', label: 'Чёрная — злое' },
]

function classSlugOf(row: ClassLevelEntry): string | null {
  const fromName = resolveClassFeatureSlug(row.name)
  if (fromName) return fromName
  const id = (row.catalog_id || '').toLowerCase()
  for (const slug of Object.keys(CLASS_LABEL_RU)) {
    if (id.includes(slug)) return slug
  }
  return null
}

/** Thief 13 ignores class, race, level, and «spellcaster» requirements. Alignment still applies. */
export function ignoresClassRaceLevel(classes: ClassLevelEntry[]): boolean {
  return classes.some((row) => {
    if (row.level < 13) return false
    if (classSlugOf(row) !== 'rogue') return false
    const sub = resolveSubclassFeatureSlug(row.subclass_name || '')
    if (sub === 'thief') return true
    const id = (row.subclass_catalog_id || '').toLowerCase()
    return id.includes('thief')
  })
}

export function characterClassSlugs(classes: ClassLevelEntry[]): Set<string> {
  const out = new Set<string>()
  for (const row of classes) {
    if (row.level <= 0) continue
    const slug = classSlugOf(row)
    if (slug) out.add(slug)
  }
  return out
}

function characterRaceSlugs(character: AttunementCharacter): Set<string> {
  const out = new Set<string>()
  const slug = (character.raceSlug || '').trim()
  const parent = (character.raceParentSlug || '').trim()
  if (slug) out.add(slug)
  if (parent) out.add(parent)
  const named = slug ? RACE_NAMING_PARENT[slug] : undefined
  if (named) out.add(named)
  return out
}

function listLabel(slugs: string[], labels: Record<string, string>): string {
  return slugs.map((slug) => labels[slug] || ALIGNMENT_GROUP_RU[slug] || slug).join(' или ')
}

export function itemIdentityKey(item: InventoryItem): string | null {
  const slug = item.catalog_slug?.trim()
  if (slug) return `slug:${slug}`
  const id = item.catalog_id?.trim()
  if (id) return `id:${id}`
  return null
}

/** +1/+2/+3 of one family, or an explicit single-attunement family (giant belts). */
export function familyBlockKey(item: InventoryItem): string | null {
  const family = item.family_slug?.trim()
  if (!family) return null
  if (item.single_attunement_family) return `family:${family}`
  if (item.variant_key === '1' || item.variant_key === '2' || item.variant_key === '3') {
    return `family:${family}`
  }
  return null
}

export type AttunementBlock = {
  /** Cannot attune. */
  blocked: boolean
  reason: string | null
  /** Shown, but the button stays available (free-text race). */
  hint: string | null
}

function alternativeLabel(alt: NonNullable<InventoryItem['attunement_alternatives']>[number]): string {
  const bits: string[] = []
  if (alt.races?.length) bits.push(listLabel(alt.races, RACE_LABEL_RU))
  if (alt.classes?.length) bits.push(listLabel(alt.classes, CLASS_LABEL_RU))
  if (alt.spellcaster) bits.push('заклинатель')
  if (alt.alignments?.length) bits.push(listLabel(alt.alignments, {}))
  return bits.join(' и ') || 'условие'
}

type AltVerdict = 'pass' | 'fail' | 'need-race' | 'need-alignment'

/** One branch of an OR gate. Inside the branch, class, race, alignment and spellcasting are AND. */
function alternativeVerdict(
  alt: NonNullable<InventoryItem['attunement_alternatives']>[number],
  character: AttunementCharacter,
  skipClassRace: boolean,
): AltVerdict {
  const classes = alt.classes ?? []
  const races = alt.races ?? []
  if (classes.length && !skipClassRace) {
    const have = characterClassSlugs(character.classes)
    if (!classes.some((slug) => have.has(slug))) return 'fail'
  }
  if (alt.spellcaster && !skipClassRace && !characterHasCasterClass(character.classes)) {
    return 'fail'
  }
  if (alt.alignments?.length) {
    if (!character.alignmentSlug || character.alignmentUnresolved) return 'need-alignment'
    if (
      !alt.alignments.some((need) => alignmentMatchesRequirement(character.alignmentSlug, need))
    ) {
      return 'fail'
    }
  }
  if (races.length && !skipClassRace) {
    if (!character.raceCatalogId) return 'need-race'
    const have = characterRaceSlugs(character)
    if (!races.some((slug) => have.has(slug))) return 'fail'
  }
  return 'pass'
}

/**
 * Card says "A, or B, or C" across race, class and alignment.
 * A branch with only race or class is open to a thief 13 (Use Magic Device still
 * ignores class, race and «spellcaster», not alignment).
 */
function alternativeBlock(
  item: InventoryItem,
  character: AttunementCharacter | null | undefined,
): AttunementBlock {
  const options = item.attunement_alternatives ?? []
  if (!character) return { blocked: false, reason: null, hint: null }
  const skipClassRace = ignoresClassRaceLevel(character.classes)
  const verdicts = options.map((alt) => alternativeVerdict(alt, character, skipClassRace))
  if (verdicts.includes('pass')) return { blocked: false, reason: null, hint: null }
  if (verdicts.includes('need-race')) {
    return { blocked: false, reason: null, hint: 'Выберите расу из справочника' }
  }
  if (verdicts.includes('need-alignment')) {
    return { blocked: true, reason: 'Укажите мировоззрение', hint: null }
  }
  const labels = options.map(alternativeLabel).filter((label) => label !== 'условие')
  return {
    blocked: true,
    reason: labels.length ? `Нужно одно из: ${labels.join('; ')}` : 'Требование настройки не выполнено',
    hint: null,
  }
}

export function requirementBlock(
  item: InventoryItem,
  character: AttunementCharacter | null | undefined,
): AttunementBlock {
  if (item.attunement_alternatives?.length) {
    const gate = alternativeBlock(item, character)
    if (!item.alignment_color_gate) return gate
    if (gate.blocked || !character) return gate
  }
  const classes = item.attunement_classes ?? []
  const races = item.attunement_races ?? []
  const alignments = item.attunement_alignments ?? []
  const colorGate = Boolean(item.alignment_color_gate)
  const needsSpellcaster = item.attunement_spellcaster === true
  if (!classes.length && !races.length && !alignments.length && !colorGate && !needsSpellcaster) {
    return { blocked: false, reason: null, hint: null }
  }
  if (!character) return { blocked: false, reason: null, hint: null }

  const reasons: string[] = []
  let hint: string | null = null
  const skipClassRace = ignoresClassRaceLevel(character.classes)

  if (classes.length && !skipClassRace) {
    const have = characterClassSlugs(character.classes)
    if (!classes.some((slug) => have.has(slug))) {
      reasons.push(`Нужен класс: ${listLabel(classes, CLASS_LABEL_RU)}`)
    }
  }

  if (needsSpellcaster && !skipClassRace && !characterHasCasterClass(character.classes)) {
    reasons.push(
      'Нужно уметь накладывать заклинания (заклинательство или магия договора)',
    )
  }

  if (races.length && !skipClassRace) {
    if (!character.raceCatalogId) {
      hint = 'Выберите расу из справочника'
    } else {
      const have = characterRaceSlugs(character)
      if (!races.some((slug) => have.has(slug))) {
        reasons.push(`Нужна раса: ${listLabel(races, RACE_LABEL_RU)}`)
      }
    }
  }

  if (alignments.length || colorGate) {
    if (!character.alignmentSlug || character.alignmentUnresolved) {
      reasons.push('Укажите мировоззрение')
    } else if (
      alignments.length &&
      !alignments.some((need) => alignmentMatchesRequirement(character.alignmentSlug, need))
    ) {
      reasons.push(`Мировоззрение не подходит (нужно ${listLabel(alignments, {})})`)
    }
  }

  if (colorGate && character.alignmentSlug && !character.alignmentUnresolved) {
    const color = item.robe_color
    if (color !== 'white' && color !== 'gray' && color !== 'black') {
      reasons.push('Укажите цвет мантии')
    } else if (!alignmentMatchesRequirement(character.alignmentSlug, ROBE_GROUP[color])) {
      reasons.push('Цвет мантии не совпадает с мировоззрением')
    }
  }

  if (!reasons.length) return { blocked: false, reason: null, hint }
  return { blocked: true, reason: reasons.join('. '), hint }
}

function filledSlot(slot: AttunementSlot): boolean {
  return Boolean(slot.item_id || slot.name.trim())
}

/** Slots past the character's limit stay, but their items do not function. */
export function overflowSlotIds(slots: AttunementSlot[], limit: number): Set<string> {
  let kept = 0
  const over = new Set<string>()
  for (const slot of slots) {
    if (!filledSlot(slot)) continue
    kept += 1
    if (kept > limit) over.add(slot.id)
  }
  return over
}

export function suppressedAttunementItemIds(input: {
  slots: AttunementSlot[]
  items: InventoryItem[]
  character?: AttunementCharacter | null
}): Set<string> {
  const limit = maxAttunementsForClasses(input.character?.classes ?? [])
  const over = overflowSlotIds(input.slots, limit)
  const byId = new Map(input.items.map((item) => [item.id, item]))
  const seenIdentity = new Map<string, string>()
  const seenFamily = new Map<string, string>()
  const suppressed = new Set<string>()

  for (const slot of input.slots) {
    if (!slot.item_id) continue
    const item = byId.get(slot.item_id)
    if (over.has(slot.id)) {
      suppressed.add(slot.item_id)
      continue
    }
    if (!item) continue
    const gate = requirementBlock(item, input.character)
    if (gate.blocked) {
      suppressed.add(item.id)
      continue
    }
    const identity = itemIdentityKey(item)
    const family = familyBlockKey(item)
    if (identity && seenIdentity.has(identity)) {
      suppressed.add(item.id)
      continue
    }
    if (family && seenFamily.has(family)) {
      suppressed.add(item.id)
      continue
    }
    if (identity) seenIdentity.set(identity, item.name || 'предмет')
    if (family) seenFamily.set(family, item.name || 'предмет')
  }
  return suppressed
}

export function duplicateAttunementReason(
  item: InventoryItem,
  slots: AttunementSlot[],
  items: InventoryItem[],
  currentSlotId: string,
): string | null {
  const byId = new Map(items.map((row) => [row.id, row]))
  const identity = itemIdentityKey(item)
  const family = familyBlockKey(item)
  for (const slot of slots) {
    if (slot.id === currentSlotId || !slot.item_id || slot.item_id === item.id) continue
    const other = byId.get(slot.item_id)
    if (!other) continue
    const sameIdentity = identity != null && itemIdentityKey(other) === identity
    const sameFamily = family != null && familyBlockKey(other) === family
    if (sameIdentity || sameFamily) {
      const name = other.name?.trim() || 'предмет'
      return `Уже настроен предмет этого вида: ${name} (DMG, Настройка)`
    }
  }
  return null
}

export function attunementChoiceReason(input: {
  item: InventoryItem
  slots: AttunementSlot[]
  items: InventoryItem[]
  currentSlotId: string
  character?: AttunementCharacter | null
}): AttunementBlock {
  const gate = requirementBlock(input.item, input.character)
  const duplicate = duplicateAttunementReason(
    input.item,
    input.slots,
    input.items,
    input.currentSlotId,
  )
  if (!duplicate) return gate
  const reason = gate.reason ? `${gate.reason}. ${duplicate}` : duplicate
  return { blocked: true, reason, hint: gate.hint }
}

export function attunementGateFromSheet(input: {
  sheet: Record<string, unknown>
  className?: string | null
  level?: number | null
}): AttunementCharacter {
  const identity = asRecord(input.sheet.identity)
  const classes = readClassLevels(input.sheet, {
    className: input.className ?? '',
    level: input.level ?? 1,
    subclassName: typeof identity.subclass_name === 'string' ? identity.subclass_name : '',
    classCatalogId:
      typeof identity.class_catalog_id === 'string' ? identity.class_catalog_id : null,
  })
  const grant = readAppliedRaceGrant(input.sheet.race_grant)
  const raw = typeof identity.alignment === 'string' ? identity.alignment.trim() : ''
  const stored =
    typeof identity.alignment_text === 'string' ? identity.alignment_text.trim() : ''
  const slug = isAlignmentSlug(raw) ? raw : recognizeAlignment(raw) ?? ''
  return {
    classes,
    raceCatalogId:
      typeof identity.race_catalog_id === 'string'
        ? identity.race_catalog_id
        : grant?.raceCatalogId ?? null,
    raceSlug: grant?.slug ?? null,
    raceParentSlug: grant?.parentSlug ?? null,
    alignmentSlug: slug,
    alignmentUnresolved: !slug && Boolean(stored || raw),
  }
}

export function slotOverLimit(
  slots: AttunementSlot[],
  slotId: string,
  classes: ClassLevelEntry[],
): boolean {
  return overflowSlotIds(slots, maxAttunementsForClasses(classes)).has(slotId)
}
