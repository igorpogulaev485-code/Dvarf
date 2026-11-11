/**
 * Run: npx --yes tsx src/shared/dnd/pack11.selfcheck.ts
 */
import { applyHpDelta, constitutionHpDelta } from './constitutionHp.ts'
import {
  exhaustionHpCurrent,
  exhaustionHpMax,
  exhaustionRollFlags,
  exhaustionSpeedFt,
} from './exhaustion2014.ts'
import { isPrimalChampionClass, syncPrimalChampion } from './primalChampion.ts'
import {
  presentSubclassCopy,
  subclassCopyHasInternalLater,
} from './subclassPlayerCopy.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(exhaustionSpeedFt(30, 1) === 30, 'exhaustion 1 keeps speed')
assert(exhaustionSpeedFt(30, 2) === 15, 'exhaustion 2 halves speed')
assert(exhaustionSpeedFt(30, 4) === 15, 'exhaustion 4 still halved')
assert(exhaustionSpeedFt(30, 5) === 0, 'exhaustion 5 speed 0')
assert(exhaustionSpeedFt(30, 6) === 0, 'exhaustion 6 speed 0')
assert(exhaustionHpMax(59, 3) === 59, 'hp max untouched before 4')
assert(exhaustionHpMax(59, 4) === 29, 'hp max halved at 4')
assert(exhaustionHpCurrent(59, 59, 4) === 29, 'current clamped to halved max')
const flags1 = exhaustionRollFlags(1)
assert(flags1.disadvantageOnChecks && !flags1.disadvantageOnAttacksAndSaves, 'level 1 checks only')
const flags3 = exhaustionRollFlags(3)
assert(flags3.disadvantageOnChecks && flags3.disadvantageOnAttacksAndSaves, 'level 3 attacks and saves')
assert(!exhaustionRollFlags(0).disadvantageOnChecks, 'cleared exhaustion')

assert(constitutionHpDelta({ previousMod: 2, nextMod: 3, levelCount: 8 }) === 8, 'druid 8 +1 mod')
assert(constitutionHpDelta({ previousMod: 3, nextMod: 2, levelCount: 8 }) === -8, 'reverse ASI exact')
assert(constitutionHpDelta({ previousMod: 4, nextMod: 6, levelCount: 20 }) === 40, 'barb 20 +2 mod')
const raised = applyHpDelta({ hpMax: 59, hpCurrent: 59, delta: 8 })
assert(raised.hpMax === 67 && raised.hpCurrent === 67, 'full hp moves with max')
const wounded = applyHpDelta({ hpMax: 67, hpCurrent: 50, delta: -8 })
assert(wounded.hpMax === 59 && wounded.hpCurrent === 42, 'wounded tracks the delta')

const base = {
  classes: [{ id: 'b', name: 'Варвар', catalog_id: null, level: 20 }],
  abilities: { str: 20, con: 19 },
  primalChampion: null,
}
assert(isPrimalChampionClass(base.classes[0]!), 'barbarian 20')
const champ = syncPrimalChampion(base, { str: 24, con: 24 })
assert(champ.abilities.str === 24 && champ.abilities.con === 23, '20/19 → 24/23')
assert(champ.primalChampion?.str === 4 && champ.primalChampion.con === 4, 'ledger +4/+4')
const again = syncPrimalChampion(champ, { str: 24, con: 24 })
assert(again === champ, 'champion does not stack')
const dropped = syncPrimalChampion(
  { ...champ, classes: [{ ...base.classes[0]!, level: 19 }] },
  { str: 20, con: 20 },
)
assert(dropped.abilities.str === 20 && dropped.abilities.con === 19, 'revoke on level down')
assert(dropped.primalChampion == null, 'ledger cleared')
const manual = syncPrimalChampion(
  { ...base, abilities: { str: 24, con: 23 } },
  { str: 24, con: 24 },
)
assert(manual.abilities.str === 24 && manual.abilities.con === 23, 'manual 24/23 stays')
assert(manual.primalChampion?.str === 0 && manual.primalChampion.con === 0, 'no second +4')

const later =
  "Martial weapons + smith's tools; INT вместо STR/DEX для magic weapons — правило атаки later."
const shown = presentSubclassCopy(later) ?? ''
assert(!subclassCopyHasInternalLater(shown), 'battle smith note has no later')
assert(shown.includes('Интеллекта'), 'battle smith names Intelligence')
assert(
  presentSubclassCopy('Владение воинским оружием и инструментами кузнеца. Атака магическим оружием может идти от Интеллекта вместо Силы или Ловкости — бонус на карточке атаки выставь вручную.') ===
    'Владение воинским оружием и инструментами кузнеца. Атака магическим оружием может идти от Интеллекта вместо Силы или Ловкости — бонус на карточке атаки выставь вручную.',
  'already rewritten note is stable',
)

console.log('pack11.selfcheck: ok')
