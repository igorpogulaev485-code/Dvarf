/**
 * node --experimental-strip-types src/shared/dnd/activeEffects.selfcheck.ts
 */
import {
  acBonusFromActiveEffects,
  applyEffectStacking,
  buildBuffEffect,
  buildInfusionDefenseEffect,
  filterEffectsAfterRest,
  listRollDieChips,
  resolveAdvantageFromEffects,
} from './activeEffects.ts'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

const sof = buildBuffEffect({
  name: 'Щит веры',
  sourceCharacterId: 'cleric',
  sourceName: 'Жрец',
})
assert(sof, 'shield of faith built')
assert(acBonusFromActiveEffects([sof]) === 2, 'sof +2 AC')
assert(sof!.duration?.remaining_rounds === 100, 'sof 100 rounds')

const bless = buildBuffEffect({ name: 'Благословение', sourceCharacterId: 'c1', sourceName: 'A' })
assert(listRollDieChips([bless], 'attack').length === 1, 'bless attack d4')
assert(listRollDieChips([bless], 'save').length === 1, 'bless save d4')

const guide = buildBuffEffect({ name: 'Указание', sourceCharacterId: 'c1', sourceName: 'A' })
assert(listRollDieChips([guide], 'check')[0]?.once === true, 'guidance once')

const stacked = applyEffectStacking([
  { ...bless!, id: 'a' },
  { ...bless!, id: 'b', source_name: 'B' },
])
assert(stacked.filter((row) => !row.inactive).length === 1, 'same slug one active')
assert(stacked.some((row) => row.inactive), 'duplicate greyed')

const bond = buildBuffEffect({ name: 'Ободряющая связь', sourceCharacterId: 'c1' })
const mixed = applyEffectStacking([bless!, bond!])
assert(
  listRollDieChips(mixed, 'attack').length === 2,
  'bless + emboldening two d4',
)

assert(acBonusFromActiveEffects([{ name: 'Улучшенная защита · +1 КД' }]) === 1, 'legacy ac')
const infusion = buildInfusionDefenseEffect({
  name: 'Улучшенная защита',
  acBonus: 2,
  sourceCharacterId: 'art',
  sourceName: 'Изобретатель',
})
assert(acBonusFromActiveEffects([infusion]) === 2, 'infusion mods ac')

const short = filterEffectsAfterRest([sof!], 'short')
assert(short.removed.length === 1, 'short rest clears 10 min')
const aidLike = buildBuffEffect({ name: 'Щит веры' })!
aidLike.duration = { unit: 'hours', value: 8, remaining_rounds: 4800 }
const long = filterEffectsAfterRest([aidLike], 'long')
assert(long.removed.length === 1, 'long rest clears 8h')
const feast = {
  ...aidLike,
  id: 'feast',
  duration: { unit: 'hours', value: 24, remaining_rounds: 14400 },
}
assert(filterEffectsAfterRest([feast], 'long').kept.length === 1, '24h stays')

assert(
  resolveAdvantageFromEffects([
    {
      id: '1',
      name: 'A',
      mods: [{ target: 'advantage', op: 'advantage' }],
    },
    {
      id: '2',
      name: 'B',
      mods: [{ target: 'disadvantage', op: 'disadvantage' }],
    },
  ]) === 'normal',
  'adv+dis cancel',
)

console.log('activeEffects.selfcheck: ok')
