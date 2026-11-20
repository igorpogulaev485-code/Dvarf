/**
 * P24-M05: 2024 rules captions / derived print fields for ClassicPrint2024.
 * 2014 ClassicPrintSheet must not import this.
 */
import type { CharacterDetail } from '../../shared/api/characters'
import { ABILITY_LABELS, asRecord, type AbilityKey } from '../characters/sheetTypes'
import { readIdentityExtras } from '../characters/identity'
import {
  masteryPropertyNameRu,
  readWeaponMasteryState,
  SRD_WEAPONS_2024_MASTERY,
  srdWeaponMasteryBySlug,
} from '../../shared/dnd/weaponMastery'
import speciesSrd from '../../shared/dnd/data/edition2024/species_srd.json'
import speciesPh24 from '../../shared/dnd/data/edition2024/species_ph24.json'
import speciesEfa from '../../shared/dnd/data/edition2024/species_efa.json'
import speciesRtw from '../../shared/dnd/data/edition2024/species_rtw.json'
import speciesLfl from '../../shared/dnd/data/edition2024/species_lfl.json'

/** Print caption — exhaustion 2024 (P24-02). */
export const PRINT_EXHAUSTION_2024_NOTE =
  '−2×ур. к броскам D20 / −5 фт скорости × ур.'

/** Print caption — heroic inspiration 2024 (book). */
export const PRINT_HEROIC_INSPIRATION_2024_NOTE =
  'Переброс любого кубика; не преимущество; макс. 1'

/** Print caption — long rest 2024 (не процедура 2014 «половина костей»). */
export const PRINT_REST_2024_NOTE =
  'Длинный отдых: все хиты + все кости; старт ≥1 хит; −1 истощение; пауза 16 ч'

type SpeciesEntryLike = { slug?: string; name_ru?: string }

function speciesEntriesFrom(pack: unknown): SpeciesEntryLike[] {
  const root = asRecord(pack)
  const list = root.entries
  return Array.isArray(list) ? (list as SpeciesEntryLike[]) : []
}

const SPECIES_NAME_RU_BY_SLUG: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const pack of [speciesSrd, speciesPh24, speciesEfa, speciesRtw, speciesLfl]) {
    for (const row of speciesEntriesFrom(pack)) {
      const slug = String(row.slug || '')
        .trim()
        .toLowerCase()
      const name = String(row.name_ru || '').trim()
      if (slug && name && !out[slug]) out[slug] = name
    }
  }
  return out
})()

const SRD_NAME_TO_SLUG = new Map(
  SRD_WEAPONS_2024_MASTERY.map((w) => [w.nameRu.trim().toLowerCase(), w.slug] as const),
)

/** RU name from 2024 species catalog; null if slug unknown/empty. */
export function speciesNameRu2024(slug: string | null | undefined): string | null {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
  if (!key) return null
  return SPECIES_NAME_RU_BY_SLUG[key] ?? null
}

/**
 * M05-1: «Вид» value — catalog RU from identity.speciesSlug / species_slug,
 * fallback to race_name when slug empty or unknown.
 */
export function classicPrintSpeciesLabel2024(character: CharacterDetail): string {
  const sheet = asRecord(character.sheet)
  const slug = readIdentityExtras(sheet).speciesSlug
  return speciesNameRu2024(slug) || String(character.race_name ?? '').trim() || ''
}

/** Known weapon mastery picks as «Оружие (свойство)». */
export function classicPrintWeaponMasterySlots2024(character: CharacterDetail): string[] {
  const sheet = asRecord(character.sheet)
  const state = readWeaponMasteryState(sheet.weapon_mastery)
  return state.known.map((slug) => {
    const weapon = srdWeaponMasteryBySlug(slug)
    if (!weapon) return slug
    return `${weapon.nameRu} (${masteryPropertyNameRu(weapon.mastery)})`
  })
}

export function classicPrintWeaponMasterySlotsLine2024(character: CharacterDetail): string {
  return classicPrintWeaponMasterySlots2024(character).join(', ')
}

/**
 * Mastery property RU for one attack row when the weapon slug is in known picks.
 */
export function classicPrintWeaponMasteryNote2024(
  character: CharacterDetail,
  opts: { catalogId?: string | null; name?: string | null },
): string {
  const sheet = asRecord(character.sheet)
  const state = readWeaponMasteryState(sheet.weapon_mastery)
  if (!state.known.length) return ''
  const known = new Set(state.known.map((s) => s.toLowerCase()))
  const fromId = String(opts.catalogId || '')
    .trim()
    .toLowerCase()
  let slug = fromId && known.has(fromId) ? fromId : ''
  if (!slug) {
    const name = String(opts.name || '')
      .trim()
      .toLowerCase()
    const hit = SRD_NAME_TO_SLUG.get(name)
    if (hit && known.has(hit)) slug = hit
  }
  if (!slug) return ''
  const weapon = srdWeaponMasteryBySlug(slug)
  if (!weapon) return ''
  return masteryPropertyNameRu(weapon.mastery)
}

function formatAsiBoosts(asi: Record<string, unknown>): string {
  const parts: string[] = []
  for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]) {
    const n = Number(asi[key])
    if (!Number.isFinite(n) || n === 0) continue
    const sign = n > 0 ? '+' : ''
    parts.push(`${ABILITY_LABELS[key]} ${sign}${n}`)
  }
  return parts.join(', ')
}

/**
 * M05-6: origin feat + ability boosts from create_2024 (accepted data only).
 * Empty when character has no create_2024 fragment.
 */
export function classicPrintBackgroundOriginLine2024(character: CharacterDetail): string {
  const sheet = asRecord(character.sheet)
  const create = asRecord(sheet.create_2024)
  if (!Object.keys(create).length) return ''

  const origin = asRecord(create.origin_feat)
  const featName =
    String(origin.name_ru || '').trim() ||
    String(origin.slug || '').trim() ||
    String(asRecord(sheet.features_text).feats || '').trim()

  const asi = asRecord(create.background_asi)
  const asiLine = formatAsiBoosts(asi)

  const chunks: string[] = []
  if (featName) chunks.push(`Черта происхождения: ${featName}`)
  if (asiLine) chunks.push(`ASI: ${asiLine}`)
  return chunks.join(' · ')
}

/** Catalog_id list from sheet.weapons aligned with classicWeaponRows order. */
export function classicPrintWeaponCatalogIds(character: CharacterDetail): Array<string | null> {
  const sheet = asRecord(character.sheet)
  const raw = sheet.weapons
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const row = asRecord(item)
    return typeof row.catalog_id === 'string' ? row.catalog_id : null
  })
}
