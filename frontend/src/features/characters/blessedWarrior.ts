/**
 * TCE / PHB 2024 Blessed Warrior: two cleric cantrips as paladin spells (Charisma).
 * They do not spend the paladin cantrip budget (paladins have none at L2).
 * Replace one when you gain a paladin level — the feature picker is that swap.
 *
 * Create pipeline stores SRD slugs (`guidance`); legacy / TCE picks may use
 * English names (`Guidance`). Accept both. Feature id may be underscore or kebab.
 */

import {
  bonusCantripLabelRu,
  CLERIC_CANTRIP_NAMES,
} from '../../shared/dnd/bonusCantrips'
import {
  getFeaturePick,
  getFeaturePickList,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import { enrichAlwaysPreparedSheetSpell } from './alwaysPreparedSpellEnrichment'
import {
  asAlwaysPreparedSpell,
  createSheetSpell,
  featureSpellId,
  type SpellsState,
} from './spells'

export const BLESSED_WARRIOR_STYLE = 'blessed_warrior'
export const BLESSED_WARRIOR_STYLE_KEBAB = 'blessed-warrior'
export const BLESSED_WARRIOR_CANTRIPS_ID = 'blessed_warrior_cantrips'
export const BLESSED_WARRIOR_CANTRIPS_ID_KEBAB = 'blessed-warrior-cantrips'
export const BLESSED_WARRIOR_LIMIT = 2
const PALADIN_STYLE_FEATURE = 'fighting_style_paladin'
const PALADIN_STYLE_FEATURE_KEBAB = 'fighting-style-paladin'
const CLERIC_CANTRIP_SET = new Set<string>(CLERIC_CANTRIP_NAMES)

const SLUG_TO_EN: Record<string, string> = Object.fromEntries(
  CLERIC_CANTRIP_NAMES.map((name) => [
    name.toLowerCase().replace(/\s+/g, '-'),
    name,
  ]),
)

/** Resolve create slug or English catalog name to the EN key used by enrichers. */
export function resolveBlessedWarriorCantripKey(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (CLERIC_CANTRIP_SET.has(trimmed)) return trimmed
  const slug = trimmed.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
  const fromSlug = SLUG_TO_EN[slug]
  if (fromSlug) return fromSlug
  return null
}

export function blessedWarriorCantripOptions(): Array<{ id: string; label: string }> {
  return CLERIC_CANTRIP_NAMES.map((name) => ({
    id: name,
    label: bonusCantripLabelRu(name) ?? name,
  }))
}

function readBlessedWarriorStyle(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): string | null {
  return (
    getFeaturePick(featurePicks, classEntryId, PALADIN_STYLE_FEATURE) ??
    getFeaturePick(featurePicks, classEntryId, PALADIN_STYLE_FEATURE_KEBAB)
  )
}

export function isBlessedWarriorActive(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): boolean {
  const style = (readBlessedWarriorStyle(featurePicks, classEntryId) || '').trim().toLowerCase()
  return style === BLESSED_WARRIOR_STYLE || style === BLESSED_WARRIOR_STYLE_KEBAB
}

function isBlessedWarriorSpellId(id: string): boolean {
  return (
    id.startsWith(`feature-spell:${BLESSED_WARRIOR_CANTRIPS_ID}:`) ||
    id.startsWith(`feature-spell:${BLESSED_WARRIOR_CANTRIPS_ID_KEBAB}:`)
  )
}

function readBlessedWarriorCantrips(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): string[] {
  const fromUnderscore = getFeaturePickList(
    featurePicks,
    classEntryId,
    BLESSED_WARRIOR_CANTRIPS_ID,
  )
  const fromKebab = getFeaturePickList(
    featurePicks,
    classEntryId,
    BLESSED_WARRIOR_CANTRIPS_ID_KEBAB,
  )
  return (fromUnderscore.length ? fromUnderscore : fromKebab).slice(0, BLESSED_WARRIOR_LIMIT)
}

export function syncBlessedWarriorCantrips(input: {
  spells: SpellsState
  featurePicks: FeaturePicksState
  classes: Array<{ id: string; name: string; level: number }>
}): { spells: SpellsState; changed: boolean } {
  let known = input.spells.known.filter((spell) => !isBlessedWarriorSpellId(spell.id))
  let changed = known.length !== input.spells.known.length

  for (const row of input.classes) {
    if (!/паладин|paladin/i.test(row.name.trim()) || row.level < 2) continue
    if (!isBlessedWarriorActive(input.featurePicks, row.id)) continue
    const picks = readBlessedWarriorCantrips(input.featurePicks, row.id)
    for (const raw of picks) {
      const nameEn = resolveBlessedWarriorCantripKey(raw)
      if (!nameEn) continue
      const nameRu = bonusCantripLabelRu(nameEn) ?? nameEn
      const id = featureSpellId(BLESSED_WARRIOR_CANTRIPS_ID, `${row.id}:${nameEn}`)
      const created = enrichAlwaysPreparedSheetSpell(
        asAlwaysPreparedSpell(
          {
            ...createSheetSpell(),
            id,
            name: nameRu,
            level: 0,
            class_slug: 'paladin',
            class_entry_id: row.id,
          },
          {
            source_kind: 'feature',
            label: 'Благословенный воин',
            class_slug: 'paladin',
            class_entry_id: row.id,
          },
        ),
        nameEn,
      )
      known.push(created)
      changed = true
    }
  }

  if (!changed) return { spells: input.spells, changed: false }
  return { spells: { ...input.spells, known }, changed: true }
}
