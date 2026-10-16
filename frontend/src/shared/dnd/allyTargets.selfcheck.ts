/**
 * node --experimental-strip-types src/shared/dnd/allyTargets.selfcheck.ts
 * (or via frontend test script)
 */
import {
  guessAllyTargetCount,
  guessAppliesToAllies,
  guessResourceAppliesToAllies,
} from './allyTargets.ts'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

assert(guessAppliesToAllies('Щит веры'), 'shield of faith RU')
assert(guessAppliesToAllies('Shield of Faith'), 'shield of faith EN')
assert(guessAppliesToAllies('', 'shield_of_faith'), 'catalog slug')
assert(guessAppliesToAllies('', 'shield-of-faith'), 'catalog hyphen')
assert(guessAppliesToAllies('Благословение'), 'bless RU')
assert(guessAllyTargetCount('Благословение') === 3, 'bless count')
assert(guessAllyTargetCount('Щит веры') === 1, 'sof count')
assert(guessAllyTargetCount('', 'bless') === 3, 'bless catalog count')
assert(!guessAppliesToAllies('Огненный шар'), 'fireball no')
assert(guessResourceAppliesToAllies('Вдохновение барда'), 'inspiration')

console.log('allyTargets.selfcheck: ok')
