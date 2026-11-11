/**
 * Apply the 2014 slot table and revoke domain/oath spells in one sheet update.
 * Level up/down must not wait for a later effect or a reload.
 */

import {
  applySpellcastingSuggestion,
  highestSpellSlotLevelForClasses,
  spellcastingTableChanged,
  suggestSpellcastingFromClasses,
  type SubclassCasterOverlay,
} from '../../shared/dnd/casterProgression'
import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { syncSubclassAlwaysPreparedSpells, type SubclassGrantDraftSlice } from './subclassEffects'
import { abilityModifier, type AbilityKey } from './sheetTypes'
import { createSheetSpell } from './spells'
import { syncWizardSchoolSpellbook } from '../../shared/dnd/wizardTradition'

export function reconcileSubclassSpellcasting(input: {
  classes: ClassLevelEntry[]
  abilities: Record<AbilityKey, number>
  slice: SubclassGrantDraftSlice
  subclassCasters?: SubclassCasterOverlay[]
}): { slice: SubclassGrantDraftSlice; tableChanged: boolean } {
  const classLevelByEntryId: Record<string, number> = {}
  for (const row of input.classes) classLevelByEntryId[row.id] = row.level

  const synced = syncSubclassAlwaysPreparedSpells({
    draft: input.slice,
    maxSpellLevel: highestSpellSlotLevelForClasses(input.classes, input.subclassCasters),
    classLevelByEntryId,
  })
  const school = syncWizardSchoolSpellbook({
    known: synced.spells.known,
    classes: input.classes,
    grants: synced.subclassGrants,
    makeSpell: (draft) => ({
      ...createSheetSpell(),
      id: draft.id,
      name: draft.name,
      level: draft.level,
      school: draft.school,
      prepared: false,
      in_spellbook: true,
      spellbook_acquisition: 'feature' as const,
      class_slug: 'wizard',
    }),
  })
  if (school.changed) {
    synced.spells = { ...synced.spells, known: school.known }
  }

  const suggestion = suggestSpellcastingFromClasses({
    classes: input.classes,
    subclassCasters: input.subclassCasters,
    abilityModFor: (ability) => abilityModifier(input.abilities[ability] ?? 10),
  })
  if (!suggestion) return { slice: synced, tableChanged: false }

  const nextFields = applySpellcastingSuggestion(synced.spells, suggestion)
  const tableChanged = spellcastingTableChanged(synced.spells, nextFields)
  if (!tableChanged) return { slice: synced, tableChanged: false }
  return {
    slice: {
      ...synced,
      spells: { ...synced.spells, ...nextFields },
    },
    tableChanged: true,
  }
}
