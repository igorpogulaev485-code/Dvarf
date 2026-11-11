/**
 * TCE Druidic Warrior: two druid cantrips as ranger spells (Wisdom).
 * They do not spend the ranger cantrip budget (rangers have none).
 * Replace one when you gain a ranger level — the feature picker is that swap.
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
export const DRUIDIC_WARRIOR_CANTRIPS_ID = 'druidic_warrior_cantrips'
export const DRUIDIC_WARRIOR_LIMIT = 2
const RANGER_STYLE_FEATURE = 'fighting_style_ranger'
const DRUID_CANTRIP_SET = new Set<string>(DRUID_CANTRIP_NAMES)

export function druidicWarriorCantripOptions(): Array<{ id: string; label: string }> {
  return DRUID_CANTRIP_NAMES.map((name) => ({
    id: name,
    label: bonusCantripLabelRu(name) ?? name,
  }))
}

export function isDruidicWarriorActive(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): boolean {
  return getFeaturePick(featurePicks, classEntryId, RANGER_STYLE_FEATURE) === DRUIDIC_WARRIOR_STYLE
}

function isDruidicWarriorSpellId(id: string): boolean {
  return id.startsWith(`feature-spell:${DRUIDIC_WARRIOR_CANTRIPS_ID}:`)
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
    const picks = getFeaturePickList(
      input.featurePicks,
      row.id,
      DRUIDIC_WARRIOR_CANTRIPS_ID,
    ).slice(0, DRUIDIC_WARRIOR_LIMIT)
    for (const nameEn of picks) {
      if (!DRUID_CANTRIP_SET.has(nameEn)) continue
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
