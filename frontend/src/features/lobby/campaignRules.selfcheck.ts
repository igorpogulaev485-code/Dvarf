/** npx tsx src/features/lobby/campaignRules.selfcheck.ts */
import {
  HOMEBREW_CATALOG,
  HOMEBREW_KEYS,
  defaultCampaignRules,
  encumbranceSpeedPenalty,
  normalizeCampaignRules,
  summarizeEnabledRules,
} from './campaignRules.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(HOMEBREW_KEYS.length === 11, 'exactly 11 homebrew keys')
assert(HOMEBREW_CATALOG.length === 11, 'catalog length 11')
assert(
  !HOMEBREW_KEYS.includes('crit_max_plus_dice' as never),
  'no crit max+dice key',
)
assert(
  HOMEBREW_CATALOG.every((row) => HOMEBREW_KEYS.includes(row.key)),
  'catalog keys match',
)

const defaults = defaultCampaignRules()
assert(defaults.edition_2014.feats_instead_of_asi === true, 'feats default on')
assert(defaults.edition_2014.multiclass === true, 'multiclass default on')
assert(defaults.edition_2014.hp_on_level_up === 'average', 'hp average')
assert(defaults.homebrew.hidden_death_saves === true, 'death saves hidden default')
assert(defaults.homebrew.encumbrance === false, 'encumbrance off')
assert(defaults.inspiration_after_roll === false, 'inspiration after roll off')
assert(defaults.enemies_ac_visible === false, 'enemy ac hidden')
assert(defaults.progression.mode === 'xp', 'xp default')

const normalized = normalizeCampaignRules({
  homebrew: { potion_bonus_self: true, inspiration_stack_max: 99 },
  custom_rules: ['  дом  ', ''],
})
assert(normalized.homebrew.potion_bonus_self === true, 'potion on')
assert(normalized.homebrew.inspiration_stack_max === 20, 'stack max clamped')
assert(normalized.custom_rules.length === 1, 'custom cleaned')

const summary = summarizeEnabledRules(normalized)
assert(summary.some((line) => /зелье/i.test(line)), 'summary has potion')

const light = encumbranceSpeedPenalty(10, 51)
assert(light.tier === 'encumbered' && light.speedPenalty === 10, '5x str')
const heavy = encumbranceSpeedPenalty(10, 101)
assert(heavy.tier === 'heavily' && heavy.disadvantage, '10x str')

console.log('campaignRules.selfcheck: ok')
