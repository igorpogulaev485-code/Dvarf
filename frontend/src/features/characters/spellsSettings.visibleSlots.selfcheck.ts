import assert from 'node:assert/strict'

/** Mirror of SpellsSettingsDialog slotLevelsVisible (non-advanced). */
function visibleSlotLevels(input: {
  slots: Record<string, { max: number; used: number }>
  suggestionSlots?: Record<string, { max: number; used: number }> | null
  advanced: boolean
}): number[] {
  const levels = Array.from({ length: 9 }, (_, i) => i + 1)
  if (input.advanced) return levels
  const withMax = levels.filter((lvl) => (input.slots[String(lvl)]?.max ?? 0) > 0)
  if (withMax.length > 0) return withMax
  if (input.suggestionSlots) {
    return levels.filter((lvl) => (input.suggestionSlots![String(lvl)]?.max ?? 0) > 0)
  }
  return []
}

assert.deepEqual(
  visibleSlotLevels({
    slots: { '1': { max: 4, used: 0 }, '2': { max: 3, used: 0 } },
    advanced: false,
  }),
  [1, 2],
)

assert.deepEqual(
  visibleSlotLevels({
    slots: {},
    suggestionSlots: {
      '1': { max: 2, used: 0 },
      '2': { max: 0, used: 0 },
      '3': { max: 0, used: 0 },
    },
    advanced: false,
  }),
  [1],
)

assert.deepEqual(
  visibleSlotLevels({ slots: {}, advanced: true }),
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
)

assert.deepEqual(visibleSlotLevels({ slots: {}, advanced: false }), [])

console.log('spellsSettings.visibleSlots.selfcheck: ok')
