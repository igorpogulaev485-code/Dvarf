/**
 * TCE / PHB 2024 Druidic Warrior: two druid cantrips as ranger spells (Wisdom).
 * They do not spend the ranger cantrip budget (rangers have none).
 * Replace one when you gain a ranger level — the feature picker is that swap.
 *
 * Create pipeline stores SRD slugs (`guidance`); legacy picks may use
 * English names (`Guidance`). Accept both. Feature id may be underscore or kebab.
 */

import {
  bonusCantripLabelRu,
  DRUID_CANTRIP_NAMES,
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

export const DRUIDIC_WARRIOR_STYLE = 'druidic_warrior'
export const DRUIDIC_WARRIOR_STYLE_KEBAB = 'druidic-warrior'
export const DRUIDIC_WARRIOR_CANTRIPS_ID = 'druidic_warrior_cantrips'
export const DRUIDIC_WARRIOR_CANTRIPS_ID_KEBAB = 'druidic-warrior-cantrips'
export const DRUIDIC_WARRIOR_LIMIT = 2
const RANGER_STYLE_FEATURE = 'fighting_style_ranger'
const RANGER_STYLE_FEATURE_KEBAB = 'fighting-style-ranger'
const DRUID_CANTRIP_SET = new Set<string>(DRUID_CANTRIP_NAMES)

const SLUG_TO_EN: Record<string, string> = Object.fromEntries(
  DRUID_CANTRIP_NAMES.map((name) => [
    name.toLowerCase().replace(/\s+/g, '-'),
    name,
  ]),
)

/** Resolve create slug or English catalog name to the EN key used by enrichers. */
export function resolveDruidicWarriorCantripKey(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (DRUID_CANTRIP_SET.has(trimmed)) return trimmed
  const slug = trimmed.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
  const fromSlug = SLUG_TO_EN[slug]
  if (fromSlug) return fromSlug
  return null
}

export function druidicWarriorCantripOptions(): Array<{ id: string; label: string }> {
  return DRUID_CANTRIP_NAMES.map((name) => ({
    id: name,
    label: bonusCantripLabelRu(name) ?? name,
  }))
}

function readDruidicWarriorStyle(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): string | null {
  return (
    getFeaturePick(featurePicks, classEntryId, RANGER_STYLE_FEATURE) ??
    getFeaturePick(featurePicks, classEntryId, RANGER_STYLE_FEATURE_KEBAB)
  )
}

export function isDruidicWarriorActive(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): boolean {
  const style = (readDruidicWarriorStyle(featurePicks, classEntryId) || '').trim().toLowerCase()
  return style === DRUIDIC_WARRIOR_STYLE || style === DRUIDIC_WARRIOR_STYLE_KEBAB
}

function isDruidicWarriorSpellId(id: string): boolean {
  return (
    id.startsWith(`feature-spell:${DRUIDIC_WARRIOR_CANTRIPS_ID}:`) ||
    id.startsWith(`feature-spell:${DRUIDIC_WARRIOR_CANTRIPS_ID_KEBAB}:`) ||
    id.startsWith(`feature-spell:druidic-warrior-cantrips:`)
  )
}

function readDruidicWarriorCantrips(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): string[] {
  const fromUnderscore = getFeaturePickList(
    featurePicks,
    classEntryId,
    DRUIDIC_WARRIOR_CANTRIPS_ID,
  )
  const fromKebab = getFeaturePickList(
    featurePicks,
    classEntryId,
    DRUIDIC_WARRIOR_CANTRIPS_ID_KEBAB,
  )
  return (fromUnderscore.length ? fromUnderscore : fromKebab).slice(0, DRUIDIC_WARRIOR_LIMIT)
}

export function syncDruidicWarriorCantrips(input: {
  spells: SpellsState
  featurePicks: FeaturePicksState
  classes: Array<{ id: string; name: string; level: number }>
}): { spells: SpellsState; changed: boolean } {
  let known = input.spells.known.filter((spell) => !isDruidicWarriorSpellId(spell.id))
  let changed = known.length !== input.spells.known.length

  for (const row of input.classes) {
    if (!/следопыт|ranger/i.test(row.name.trim()) || row.level < 2) continue
    if (!isDruidicWarriorActive(input.featurePicks, row.id)) continue
    const picks = readDruidicWarriorCantrips(input.featurePicks, row.id)
    for (const raw of picks) {
      const nameEn = resolveDruidicWarriorCantripKey(raw)
      if (!nameEn) continue
      const nameRu = bonusCantripLabelRu(nameEn) ?? nameEn
      const id = featureSpellId(DRUIDIC_WARRIOR_CANTRIPS_ID, `${row.id}:${nameEn}`)
      const created = enrichAlwaysPreparedSheetSpell(
        asAlwaysPreparedSpell(
          {
            ...createSheetSpell(),
            id,
            name: nameRu,
            level: 0,
            class_slug: 'ranger',
            class_entry_id: row.id,
          },
          {
            source_kind: 'feature',
            label: 'Воин-друид',
            class_slug: 'ranger',
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