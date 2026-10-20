import {
  createSheetSpell,
  readSpells,
  spellsToSheet,
  type SheetSpell,
  type SpellsState,
} from '../characters/spells'
import { abilityModifier, asRecord, formatModifier, readNumber } from '../characters/sheetTypes'
import {
  SPELLCASTING_ABILITY_LABELS,
  isSpellcastingAbility,
  spellAttackBonus,
  spellSaveDc,
  type SpellcastingAbility,
} from '../../shared/dnd/spells'
import type { CharacterDetail } from '../../shared/api/characters'
import type { ClassicPatch } from './fromApi'

/** Official 2014 spell sheet line counts per level (incl. cantrips = 0). */
export const SPELL_LINE_COUNTS: Record<number, number> = {
  0: 8,
  1: 13,
  2: 13,
  3: 13,
  4: 7,
  5: 9,
  6: 9,
  7: 9,
  8: 7,
  9: 7,
}

export const SPELL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export function classicSpellsState(character: CharacterDetail): SpellsState {
  return readSpells(asRecord(character.sheet))
}

export function classicSpellAbilityLabel(ability: SpellcastingAbility | null): string {
  if (!ability) return ''
  return SPELLCASTING_ABILITY_LABELS[ability]
}

export function classicSpellStats(
  character: CharacterDetail,
  spells: SpellsState,
): { saveDc: string; attackBonus: string } {
  const ability = spells.casting_ability
  if (!ability) return { saveDc: '', attackBonus: '' }
  const abilities = asRecord(asRecord(character.sheet).abilities)
  const score = readNumber(asRecord(abilities[ability]).score, 10)
  const mod = abilityModifier(score)
  const proficiency = asRecord(asRecord(character.sheet).proficiency)
  const bonus = readNumber(proficiency.bonus, 2)
  return {
    saveDc: String(spellSaveDc(mod, bonus)),
    attackBonus: formatModifier(spellAttackBonus(mod, bonus)),
  }
}

export function spellsAtLevel(known: SheetSpell[], level: number): SheetSpell[] {
  return known.filter((spell) => spell.level === level)
}

/** Pad to official line count for a printable blank look. */
export function paddedSpellLines(
  known: SheetSpell[],
  level: number,
): Array<SheetSpell | null> {
  const lines = SPELL_LINE_COUNTS[level] ?? 9
  const rows: Array<SheetSpell | null> = [...spellsAtLevel(known, level)]
  while (rows.length < lines) rows.push(null)
  return rows.slice(0, lines)
}

function writeSpells(character: CharacterDetail, state: SpellsState): ClassicPatch {
  const sheet = structuredClone(asRecord(character.sheet))
  Object.assign(sheet, spellsToSheet(state))
  return { sheet }
}

export function setCastingAbility(
  character: CharacterDetail,
  ability: SpellcastingAbility | null,
): ClassicPatch {
  const spells = classicSpellsState(character)
  return writeSpells(character, { ...spells, casting_ability: ability })
}

export function setSlotTotal(
  character: CharacterDetail,
  level: number,
  total: number,
): ClassicPatch {
  const spells = classicSpellsState(character)
  const key = String(level)
  const prev = spells.slots[key] ?? { max: 0, used: 0 }
  const max = Math.max(0, Math.floor(total))
  return writeSpells(character, {
    ...spells,
    slots: {
      ...spells.slots,
      [key]: { max, used: Math.min(prev.used, max) },
    },
  })
}

export function setSlotExpended(
  character: CharacterDetail,
  level: number,
  expended: number,
): ClassicPatch {
  const spells = classicSpellsState(character)
  const key = String(level)
  const prev = spells.slots[key] ?? { max: 0, used: 0 }
  const used = Math.max(0, Math.min(prev.max, Math.floor(expended)))
  return writeSpells(character, {
    ...spells,
    slots: { ...spells.slots, [key]: { ...prev, used } },
  })
}

export function setSpellNameAt(
  character: CharacterDetail,
  level: number,
  index: number,
  name: string,
): ClassicPatch {
  const spells = classicSpellsState(character)
  const atLevel = spellsAtLevel(spells.known, level)
  const trimmed = name.trim()
  const nextKnown = [...spells.known]

  if (index < atLevel.length) {
    const target = atLevel[index]
    if (!trimmed) {
      return writeSpells(character, {
        ...spells,
        known: nextKnown.filter((spell) => spell.id !== target.id),
      })
    }
    return writeSpells(character, {
      ...spells,
      known: nextKnown.map((spell) =>
        spell.id === target.id ? { ...spell, name: trimmed } : spell,
      ),
    })
  }

  if (!trimmed) return { sheet: asRecord(character.sheet) }

  const created = createSheetSpell()
  created.name = trimmed
  created.level = level
  created.prepared = level <= 0
  return writeSpells(character, {
    ...spells,
    known: [...nextKnown, created],
  })
}

export function toggleSpellPrepared(
  character: CharacterDetail,
  spellId: string,
): ClassicPatch {
  const spells = classicSpellsState(character)
  return writeSpells(character, {
    ...spells,
    known: spells.known.map((spell) => {
      if (spell.id !== spellId || spell.level <= 0) return spell
      if (spell.prepared_locked) return spell
      return { ...spell, prepared: !spell.prepared }
    }),
  })
}

export function parseCastingAbilityInput(value: string): SpellcastingAbility | null {
  const raw = value.trim().toLowerCase()
  if (!raw) return null
  if (raw === 'int' || raw === 'инт' || raw === 'интеллект') return 'int'
  if (raw === 'wis' || raw === 'муд' || raw === 'мудрость') return 'wis'
  if (raw === 'cha' || raw === 'хар' || raw === 'харизма') return 'cha'
  return isSpellcastingAbility(raw) ? raw : null
}
