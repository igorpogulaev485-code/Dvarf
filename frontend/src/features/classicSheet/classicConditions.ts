import type { CharacterDetail } from '../../shared/api/characters'
import { formatConditionLabel } from '../../shared/dnd/conditions'
import { readPlay } from '../characters/play'
import { asRecord } from '../characters/sheetTypes'

/**
 * Active combat conditions for the classic blank (same field as Play Desk).
 * Exhaustion uses its own bubbles — omitted here.
 * Read-only: free-text → ConditionRef[] is out of scope.
 */
export function classicConditionsLabel(character: CharacterDetail): string {
  const play = readPlay(asRecord(character.sheet), character.level)
  return play.conditions
    .filter((item) => item.slug !== 'exhaustion')
    .map((item) => formatConditionLabel(item))
    .join(', ')
}
