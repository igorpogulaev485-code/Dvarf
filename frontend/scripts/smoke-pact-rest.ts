/** Slice 4: short-rest pact + single-class half caster. Run: npx tsx scripts/smoke-pact-rest.ts */
import { applyShortRest, applyLongRest } from '../src/shared/dnd/rest.ts'
import {
  suggestSpellcastingFromClasses,
  multiclassCasterLevel,
  warlockPactForLevel,
} from '../src/shared/dnd/casterProgression.ts'
import type { ClassLevelEntry } from '../src/shared/dnd/classLevels.ts'

function row(name: string, level: number, id = name): ClassLevelEntry {
  return {
    id,
    name,
    catalog_id: null,
    level,
    subclass_name: '',
    subclass_catalog_id: null,
  }
}

const mod = () => 3

const short = applyShortRest({
  resources: [{ id: 'a', name: 'A', max: 2, used: 2, reset: 'short' }],
  pact_slots: { max: 2, used: 2, level: 3 },
})
if (short.pact_slots?.used !== 0) throw new Error('short rest must clear pact used')
if (short.resources[0]?.used !== 0) throw new Error('short resources')

const omit = applyShortRest({ resources: [] })
if (omit.pact_slots !== undefined) throw new Error('omit pact should leave undefined')

const long = applyLongRest({
  resources: [],
  slots: { '1': { max: 2, used: 2 } },
  pact_slots: { max: 2, used: 1, level: 2 },
  exhaustion: 1,
  hp_max: 20,
  hit_dice_current: 2,
  hit_dice_max: 5,
})
if (long.pact_slots?.used !== 0) throw new Error('long pact')
if (long.slots?.['1']?.used !== 0) throw new Error('long slots')

const pal5 = suggestSpellcastingFromClasses({
  classes: [row('Паладин', 5)],
  abilityModFor: mod,
})
if (pal5?.slots['1']?.max !== 4 || pal5?.slots['2']?.max !== 2) {
  throw new Error(`paladin 5 expected 4/2 got ${JSON.stringify(pal5?.slots)}`)
}

const palFighter = suggestSpellcastingFromClasses({
  classes: [row('Воин', 3, 'f'), row('Паладин', 5, 'p')],
  abilityModFor: mod,
})
if (palFighter?.slots['1']?.max !== 4 || palFighter?.slots['2']?.max !== 2) {
  throw new Error('paladin+fighter should use class table')
}

const palWiz = suggestSpellcastingFromClasses({
  classes: [row('Паладин', 5, 'p'), row('Волшебник', 1, 'w')],
  abilityModFor: mod,
})
if (
  palWiz?.slots['1']?.max !== 4 ||
  palWiz?.slots['2']?.max !== 2 ||
  (palWiz?.slots['3']?.max ?? 0) !== 0
) {
  throw new Error(`MC pal5+wiz1 expected full L3 4/2 got ${JSON.stringify(palWiz?.slots)}`)
}

const wl = suggestSpellcastingFromClasses({
  classes: [row('Колдун', 5)],
  abilityModFor: mod,
})
if (wl?.pact_slots?.max !== 2 || wl?.pact_slots?.level !== 3) {
  throw new Error('warlock pact')
}
if ((wl?.slots['1']?.max ?? 0) !== 0) throw new Error('warlock should have no spell slots')

const palWl = suggestSpellcastingFromClasses({
  classes: [row('Паладин', 5, 'p'), row('Колдун', 2, 'k')],
  abilityModFor: mod,
})
if (palWl?.slots['1']?.max !== 4 || palWl?.slots['2']?.max !== 2) {
  throw new Error('pal+warlock should keep paladin table')
}
if (palWl?.pact_slots?.max !== 2 || palWl?.pact_slots?.level !== 1) {
  throw new Error('pal+warlock pact L2')
}

if (multiclassCasterLevel([row('Волшебник', 3), row('Колдун', 5)]) !== 3) {
  throw new Error('MC level should ignore warlock')
}

if (warlockPactForLevel(9).level !== 5 || warlockPactForLevel(17).max !== 4) {
  throw new Error('warlock milestones')
}

console.log('smoke-pact-rest: ok')
