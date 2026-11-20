/**
 * P24-02: lobby homebrew tips by edition; 2014 catalog unchanged.
 * Run: npx --yes tsx src/features/lobby/campaignRules2024.selfcheck.ts
 */
import { HOMEBREW_CATALOG, HOMEBREW_KEYS } from './campaignRules.ts'
import {
  homebrewCatalogForEdition,
  homebrewMeaningTable,
  potionSelfTiming,
} from './campaignRules2024.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const c14 = homebrewCatalogForEdition('2014')
const c24 = homebrewCatalogForEdition('2024')

assert(c14.length === HOMEBREW_CATALOG.length, 'same key count 2014')
assert(c24.length === HOMEBREW_CATALOG.length, 'same key count 2024')
assert(
  HOMEBREW_KEYS.every((k) => c24.some((e) => e.key === k)),
  'all keys visible in 2024',
)

const potion14 = c14.find((e) => e.key === 'potion_bonus_self')!
const potion24 = c24.find((e) => e.key === 'potion_bonus_self')!
assert(potion14.label === 'Зелье бонусным действием', '2014 potion label')
assert(potion24.label === 'Зелье стоит действие', '2024 potion label')
assert(potion24.tip.includes('бонусное'), '2024 tip mentions book bonus')

const stack24 = c24.find((e) => e.key === 'inspiration_stack')!
assert(stack24.label.includes('героического'), '2024 stack heroic')

assert(potionSelfTiming({ edition: '2014', potion_bonus_self: false }) === 'action', '2014 off=action')
assert(potionSelfTiming({ edition: '2014', potion_bonus_self: true }) === 'bonus', '2014 on=bonus')
assert(potionSelfTiming({ edition: '2024', potion_bonus_self: false }) === 'bonus', '2024 off=book bonus')
assert(potionSelfTiming({ edition: '2024', potion_bonus_self: true }) === 'action', '2024 on=stricter action')

const table = homebrewMeaningTable()
assert(table.length === HOMEBREW_CATALOG.length, 'meaning table complete')

// 2014 catalog object identity for unchanged entries without overlay
const flanking14 = HOMEBREW_CATALOG.find((e) => e.key === 'flanking_advantage')!
assert(c14.find((e) => e.key === 'flanking_advantage') === flanking14, '2014 catalog unchanged ref')

console.log('campaignRules2024.selfcheck: ok')
