/**
 * Create-pipeline spells merge: keep player-chosen known spells, but always
 * re-inject race / feat / subclass-granted rows from the freshly applied draft.
 *
 * Race + feat sheet spells are built during applyPipelineToSheet; the player
 * `input.spells` / sheetDraft copy must not drop them (older bug: only race
 * was re-injected, so Magic Initiate from Variant Human vanished while
 * post-create DM gifts like Shadow Touched still showed).
 */

import {
  isFeatSheetSpell,
  isRaceSheetSpell,
  type SheetSpell,
  type SpellsState,
} from '../characters/spells'

export function isPipelineManagedSheetSpell(
  spell: SheetSpell,
  subclassGrantedIds: ReadonlySet<string>,
): boolean {
  return (
    isRaceSheetSpell(spell) ||
    isFeatSheetSpell(spell) ||
    subclassGrantedIds.has(spell.id)
  )
}

export function mergeCreatePipelineKnownSpells(input: {
  playerKnown: readonly SheetSpell[]
  draftKnown: readonly SheetSpell[]
  subclassGrantedIds: ReadonlySet<string>
}): SheetSpell[] {
  const managed = input.subclassGrantedIds
  return [
    ...input.playerKnown.filter(
      (row) => !isPipelineManagedSheetSpell(row, managed),
    ),
    ...input.draftKnown.filter((row) =>
      isPipelineManagedSheetSpell(row, managed),
    ),
  ]
}

export function mergeCreatePipelineSpells(input: {
  playerSpells: SpellsState
  draftSpells: SpellsState
  subclassGrantedIds: ReadonlySet<string>
}): SpellsState {
  return {
    ...input.playerSpells,
    known: mergeCreatePipelineKnownSpells({
      playerKnown: input.playerSpells.known,
      draftKnown: input.draftSpells.known,
      subclassGrantedIds: input.subclassGrantedIds,
    }),
  }
}
