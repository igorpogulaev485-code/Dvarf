/**
 * Lightweight self-check (no test runner): npx --yes tsx src/shared/dnd/pendingFeatureChoices.selfcheck.ts
 * Run from frontend/.
 */
import {
  resolveChoiceMaxPicks,
  unlockFeaturesForClasses,
  type UnlockedFeature,
} from './classFeatures'
import {
  setFeaturePick,
  emptyFeaturePicks,
  type FeaturePicksState,
} from './featurePicks'
import {
  listExpertiseOptions,
  syncSkillsExpertiseFromPicks,
  THIEVES_TOOLS_OPTION_ID,
} from './expertise'
import {
  buildPendingWizardSteps,
  clearFeaturePicksAboveClassLevel,
  isFeatureChoiceComplete,
  listUnlockedExpertiseKeys,
  withBackgroundStepIfNeeded,
} from './pendingFeatureChoices'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

function skillState(
  keys: string[],
): Record<string, { is_proficient: boolean; is_expertise: boolean }> {
  const out: Record<string, { is_proficient: boolean; is_expertise: boolean }> = {}
  for (const key of keys) out[key] = { is_proficient: true, is_expertise: false }
  return out
}

const rogueClasses = [
  {
    id: 'c1',
    name: 'Плут',
    level: 1,
    catalog_id: null,
    subclass_name: '',
    subclass_catalog_id: null,
  },
]

const unlockedL1 = unlockFeaturesForClasses({
  classes: rogueClasses,
  characterLevel: 1,
  abilities: { str: 10, dex: 16, con: 12, int: 12, wis: 10, cha: 10 },
})

assert(
  unlockedL1.some((f) => f.id === 'expertise_1' && f.choice?.options_from === 'expertise_skills_tools'),
  'expertise_1 must have expertise_skills_tools choice',
)

const expertiseFeature = unlockedL1.find((f) => f.id === 'expertise_1') as UnlockedFeature
assert(resolveChoiceMaxPicks(expertiseFeature.choice!, 1) === 2, 'expertise max_picks=2')

let picks: FeaturePicksState = emptyFeaturePicks()
assert(!isFeatureChoiceComplete(expertiseFeature, picks), 'empty expertise is incomplete')

const steps = buildPendingWizardSteps({
  unlocked: unlockedL1,
  featurePicks: picks,
  classAsi: [],
  filter: { mode: 'at_class_level', classEntryId: 'c1', classLevel: 1 },
  hasSubclassByEntryId: { c1: false },
})
assert(
  steps.some((s) => s.kind === 'feature_choice' && s.featureId === 'expertise_1'),
  'wizard queue includes expertise_1',
)

const options = listExpertiseOptions({
  skills: skillState(['stealth', 'perception', 'acrobatics', 'investigation']),
  tools: ['Воровские инструменты'],
})
assert(options.some((o) => o.id === 'stealth'), 'stealth in options')
assert(options.some((o) => o.id === THIEVES_TOOLS_OPTION_ID), 'thieves tools in options')

picks = setFeaturePick(picks, 'c1', 'expertise_1', 'stealth,perception')
assert(isFeatureChoiceComplete(expertiseFeature, picks), 'expertise complete after 2 picks')

const synced = syncSkillsExpertiseFromPicks({
  skills: skillState(['stealth', 'perception', 'acrobatics', 'investigation']),
  featurePicks: picks,
  expertiseKeys: listUnlockedExpertiseKeys(unlockedL1),
})
assert(synced.stealth.is_expertise, 'stealth expertise applied')
assert(synced.perception.is_expertise, 'perception expertise applied')
assert(!synced.acrobatics.is_expertise, 'acrobatics not expertise')

const rogueL6 = [{ ...rogueClasses[0], level: 6 }]
const unlockedL6 = unlockFeaturesForClasses({
  classes: rogueL6,
  characterLevel: 6,
  abilities: { str: 10, dex: 16, con: 12, int: 12, wis: 10, cha: 10 },
})
const stepsL6 = buildPendingWizardSteps({
  unlocked: unlockedL6,
  featurePicks: picks,
  classAsi: [],
  filter: { mode: 'at_class_level', classEntryId: 'c1', classLevel: 6 },
  hasSubclassByEntryId: { c1: true },
})
assert(
  stepsL6.some((s) => s.kind === 'feature_choice' && s.featureId === 'expertise_6'),
  'level-up queue includes expertise_6',
)

const fighterClasses = [
  {
    id: 'f1',
    name: 'Воин',
    level: 1,
    catalog_id: null,
    subclass_name: '',
    subclass_catalog_id: null,
  },
]
const fighterUnlocked = unlockFeaturesForClasses({
  classes: fighterClasses,
  characterLevel: 1,
  abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
})
const fighterSteps = buildPendingWizardSteps({
  unlocked: fighterUnlocked,
  featurePicks: emptyFeaturePicks(),
  classAsi: [],
  filter: { mode: 'at_class_level', classEntryId: 'f1', classLevel: 1 },
  hasSubclassByEntryId: { f1: false },
})
assert(
  fighterSteps.some((s) => s.kind === 'feature_choice' && s.featureId === 'fighting_style'),
  'fighter fighting style in queue',
)

const warlockClasses = [
  {
    id: 'w1',
    name: 'Колдун',
    level: 1,
    catalog_id: null,
    subclass_name: '',
    subclass_catalog_id: null,
  },
]
const warlockUnlocked = unlockFeaturesForClasses({
  classes: warlockClasses,
  characterLevel: 1,
  abilities: { str: 8, dex: 12, con: 14, int: 10, wis: 10, cha: 16 },
})
const warlockSteps = buildPendingWizardSteps({
  unlocked: warlockUnlocked,
  featurePicks: emptyFeaturePicks(),
  classAsi: [],
  filter: { mode: 'at_class_level', classEntryId: 'w1', classLevel: 1 },
  hasSubclassByEntryId: { w1: false },
})
assert(
  warlockSteps.some((s) => s.kind === 'subclass' && s.featureId === 'otherworldly_patron'),
  'warlock patron subclass step at L1',
)

const rogueL13 = [{ ...rogueClasses[0], level: 13 }]
const unlockedL13 = unlockFeaturesForClasses({
  classes: rogueL13,
  characterLevel: 13,
  abilities: { str: 10, dex: 16, con: 12, int: 12, wis: 10, cha: 10 },
})
const startAt13 = buildPendingWizardSteps({
  unlocked: unlockedL13,
  featurePicks: emptyFeaturePicks(),
  classAsi: [],
  filter: { mode: 'up_to_class_level', classEntryId: 'c1', maxClassLevel: 13 },
  hasSubclassByEntryId: { c1: false },
})
assert(
  startAt13.some((s) => s.kind === 'feature_choice' && s.featureId === 'expertise_1'),
  'start@13 includes expertise_1',
)
assert(
  startAt13.some((s) => s.kind === 'feature_choice' && s.featureId === 'expertise_6'),
  'start@13 includes expertise_6',
)
assert(
  startAt13.filter((s) => s.kind === 'asi').length >= 3,
  'start@13 includes multiple ASI steps',
)
assert(
  startAt13.some((s) => s.kind === 'asi' && s.classLevel === 4),
  'ASI step ledger level is feature level 4, not 13',
)
assert(
  startAt13.some((s) => s.kind === 'subclass'),
  'start@13 includes archetype gate',
)

picks = setFeaturePick(picks, 'c1', 'expertise_6', 'investigation,thieves_tools')
const cleared = clearFeaturePicksAboveClassLevel({
  featurePicks: picks,
  classEntryId: 'c1',
  features: unlockedL6.map((f) => ({ id: f.id, level: f.level })),
  newClassLevel: 5,
})
assert(
  !cleared.values['c1:expertise_6'],
  'expertise_6 pick cleared on level-down below 6',
)
assert(cleared.values['c1:expertise_1'] === 'stealth,perception', 'expertise_1 kept')

console.log('pendingFeatureChoices.selfcheck: ok')
