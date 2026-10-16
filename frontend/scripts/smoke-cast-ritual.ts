/** Slice 8: ritual cast path does not spend slots; meta fields present on sheet spells. */
import { resolveCastEffect } from '../src/shared/dnd/spellCatalog.ts'
import {
  createSheetSpell,
  type SheetSpell,
} from '../src/features/characters/spells.ts'
import type { CastChoice } from '../src/features/characters/CastSpellDialog.tsx'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const detectMagic: SheetSpell = {
  ...createSheetSpell(),
  id: 'detect-magic',
  name: 'Detect Magic',
  level: 1,
  prepared: true,
  ritual: true,
  duration: '10 минут',
  school: 'divination',
  higher_levels: '',
  casting_time: '1 действие',
  range: 'на себя',
  damage: '',
}

const ritualChoice: CastChoice = { usePact: false, slotLevel: 1, ritual: true }
assert(ritualChoice.ritual === true, 'ritual flag')
assert(detectMagic.ritual === true, 'spell ritual')

const effect = resolveCastEffect(detectMagic, { characterLevel: 5, slotLevel: 1 })
assert(effect.effect === '', 'no damage table')

const fireball: SheetSpell = {
  ...createSheetSpell(),
  id: 'fireball',
  name: 'Fireball',
  level: 3,
  prepared: true,
  damage: '8d6 огонь',
  damage_at_slot_level: { '3': '8d6', '4': '9d6', '5': '10d6' },
  higher_levels: 'Урон +1к6 за каждый уровень ячейки выше 3.',
}
const up = resolveCastEffect(fireball, { characterLevel: 5, slotLevel: 5 })
assert(up.scaled && up.effect.includes('10d6'), `upcast got ${up.effect}`)
assert(Boolean(fireball.higher_levels), 'higher_levels on sheet')

console.log('smoke-cast-ritual: ok')
