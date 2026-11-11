/** Active concentration tracker for the digital sheet (play combat block). */

export type ConcentrationState = {
  spell_id: string
  name: string
}

export function readConcentration(raw: unknown): ConcentrationState | null {
  if (raw == null || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const spell_id = typeof row.spell_id === 'string' ? row.spell_id : ''
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  if (!spell_id && !name) return null
  return {
    spell_id: spell_id || `conc-${name}`,
    name: name || 'Заклинание',
  }
}

export function setConcentration(input: {
  spellId: string
  name: string
}): ConcentrationState {
  return {
    spell_id: input.spellId,
    name: input.name.trim() || 'Заклинание',
  }
}

export function clearConcentration(): null {
  return null
}
