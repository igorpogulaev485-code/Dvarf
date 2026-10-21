/**
 * Stealthy (UA) skill_or_expertise → proficiency or expertise on stealth.
 * Run: npx --yes tsx src/shared/dnd/featGrants.stealthy.selfcheck.ts
 */
import {
  buildAppliedFeatPackage,
  emptyFeatPicks,
  featGrantDefFromCatalog,
} from './featGrants'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

const def = featGrantDefFromCatalog({
  slug: 'stealthy',
  nameRu: 'Скрытный (Stealthy)',
  data: {
    summary_ru: '+1 Лов; Скрытность',
    benefits_ru: '…',
    grants: {
      ability_bonuses: { dex: 1 },
      skill_or_expertise: ['stealth'],
      flags: ['stealthy'],
    },
  },
})

assert(def, 'stealthy def parsed')
assert(def.skillOrExpertise.includes('stealth'), 'skill_or_expertise parsed')
assert(def.fixedGrants.abilityBonuses.dex === 1, '+1 dex fixed')
assert(def.fixedGrants.flags.includes('stealthy'), 'stealthy flag')

const picks = emptyFeatPicks()

const withoutStealth = buildAppliedFeatPackage({
  def,
  picks,
  proficientSkills: ['perception'],
})
assert(withoutStealth.skills.includes('stealth'), 'grants stealth proficiency')
assert(
  !withoutStealth.expertiseSkills.includes('stealth'),
  'no expertise when not proficient',
)
assert(withoutStealth.abilityBonuses.dex === 1, 'dex bump applied')

const withStealth = buildAppliedFeatPackage({
  def,
  picks,
  proficientSkills: ['stealth', 'perception'],
})
assert(
  withStealth.expertiseSkills.includes('stealth'),
  'expertise when already proficient',
)
assert(
  !withStealth.skills.includes('stealth') ||
    withStealth.expertiseSkills.includes('stealth'),
  'expertise path covers stealth',
)
// Prefer expertise-only in skills list when already proficient (no double-list noise).
assert(
  !withStealth.skills.includes('stealth'),
  'skills list does not also list stealth when upgrading to expertise',
)

console.log('featGrants.stealthy selfcheck ok')
