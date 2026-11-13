/**
 * TCE Blessed Warrior: two cleric cantrips as paladin spells (Charisma).
 * They do not spend the paladin cantrip budget (paladins have none at L2).
 * Replace one when you gain a paladin level — the feature picker is that swap.
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
export const BLESSED_WARRIOR_CANTRIPS_ID = 'blessed_warrior_cantrips'
export const BLESSED_WARRIOR_LIMIT = 2
const PALADIN_STYLE_FEATURE = 'fighting_style_paladin'
const CLERIC_CANTRIP_SET = new Set<string>(CLERIC_CANTRIP_NAMES)

export function blessedWarriorCantripOptions(): Array<{ id: string; label: string }> {
  return CLERIC_CANTRIP_NAMES.map((name) => ({
    id: name,
    label: bonusCantripLabelRu(name) ?? name,
  }))
}

export function isBlessedWarriorActive(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): boolean {
  return getFeaturePick(featurePicks, classEntryId, PALADIN_STYLE_FEATURE) === BLESSED_WARRIOR_STYLE
}

function isBlessedWarriorSpellId(id: string): boolean {
  return id.startsWith(`feature-spell:${BLESSED_WARRIOR_CANTRIPS_ID}:`)
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
    const picks = getFeaturePickList(
      input.featurePicks,
      row.id,
      BLESSED_WARRIOR_CANTRIPS_ID,
    ).slice(0, BLESSED_WARRIOR_LIMIT)
    for (const nameEn of picks) {
      if (!CLERIC_CANTRIP_SET.has(nameEn)) continue
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
