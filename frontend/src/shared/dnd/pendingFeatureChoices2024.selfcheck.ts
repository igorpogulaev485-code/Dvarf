/** P24-M03 level-up/down selfcheck — run: npm run selfcheck:p24-m03-levelup */
import assert from 'node:assert/strict'
import type { AppliedClassAsi } from './classAsi'
import { createClassLevel } from './classLevels'
import { checkMulticlassPrerequisites2024, computeProgression2024 } from './edition2024Classes'
import {
  asiFeatureId2024,
  buildPendingWizardSteps2024,
  clearAsiAndOptionsAboveLevel,
  EPIC_BOON_FEATURE_ID_2024,
  epicBoonLevelForClassSlug,
  featLevelsForClassSlug,
  parseEpicBoonStepId2024,
  subclassDropsOnLevelDown2024,
  subclassLevelForClassSlug,
  trimClassOptionsForLevel2024,
  weaponMasteryGain2024,
} from './pendingFeatureChoices2024'
import { emptyClassOptions2024 } from './edition2024ClassOptions'
import { emptyWeaponMasteryState } from './weaponMastery'
import { trimLevelUpSpellbookRows } from './wizardSpellbook'

const fighter = createClassLevel({ id: 'f1', name: 'Воин', catalog_id: 'fighter', level: 1 })

function steps(level: number, opts?: { hasSubclass?: boolean; classAsi?: AppliedClassAsi[] }) {
  return buildPendingWizardSteps2024({
    classEntryId: fighter.id,
    className: fighter.name,
    classSlug: 'fighter',
    classLevel: level,
    hasSubclass: opts?.hasSubclass ?? false,
    classAsi: opts?.classAsi ?? [],
  })
}

// catalog readers
assert.deepEqual(featLevelsForClassSlug('fighter'), [4, 6, 8, 12, 14, 16])
assert.equal(subclassLevelForClassSlug('fighter'), 3)
assert.equal(epicBoonLevelForClassSlug('fighter'), 19)
assert.equal(subclassLevelForClassSlug('nope'), 3)

// L1 → L2: nothing queued
assert.equal(steps(1).length, 0)
assert.equal(steps(2).length, 0)

// L3 queues subclass; not queued when the subclass is already set
assert.deepEqual(steps(3).map((s) => s.kind), ['subclass'])
assert.equal(steps(3, { hasSubclass: true }).length, 0)

// L4 queues ASI (ledger id is per level, so L4 and L6 never collide)
const l4 = steps(4, { hasSubclass: true })
assert.deepEqual(l4.map((s) => s.kind), ['asi'])
const asi4 = l4[0]
assert.ok(asi4.kind === 'asi' && asi4.featureId === asiFeatureId2024(4) && asi4.classLevel === 4)
assert.deepEqual(steps(4, { hasSubclass: false }).map((s) => s.kind), ['subclass', 'asi'])

const ledger4: AppliedClassAsi = {
  classEntryId: fighter.id,
  featureId: asiFeatureId2024(4),
  atClassLevel: 4,
  resolution: { kind: 'scores', modeId: 'plus2', keys: ['str'] },
  bonuses: { str: 2 },
}
assert.equal(steps(4, { hasSubclass: true, classAsi: [ledger4] }).length, 0)
assert.deepEqual(steps(6, { hasSubclass: true, classAsi: [ledger4] }).map((s) => s.kind), ['asi'])
assert.equal(steps(5, { hasSubclass: true }).length, 0)

// L19 queues epic boon (feat step, Russian prompt); recorded boon silences it
const l19 = steps(19, { hasSubclass: true })
assert.deepEqual(l19.map((s) => s.kind), ['feat'])
const epic = l19[0]
assert.ok(epic.kind === 'feat' && /Эпический дар/.test(epic.promptRu))
assert.deepEqual(parseEpicBoonStepId2024(epic.id), { classEntryId: fighter.id })
assert.equal(parseEpicBoonStepId2024('feat'), null)
const epicLedger: AppliedClassAsi = {
  classEntryId: fighter.id,
  featureId: EPIC_BOON_FEATURE_ID_2024,
  atClassLevel: 19,
  resolution: { kind: 'feat', featCatalogId: 'x', featSlug: 'x', featGrantId: 'g' },
  bonuses: {},
}
assert.equal(steps(19, { hasSubclass: true, classAsi: [epicLedger] }).length, 0)
assert.deepEqual(steps(16, { hasSubclass: true }).map((s) => s.kind), ['asi'])

// unknown class → nothing
assert.equal(
  buildPendingWizardSteps2024({
    classEntryId: 'x',
    className: 'Хомбрю',
    classSlug: 'homebrew',
    classLevel: 4,
    hasSubclass: false,
    classAsi: [],
  }).length,
  0,
)

// level-down 4 → 3: ASI ledger row for L4 is revoked, picks of level-4+ features cleared
const keepAsi: AppliedClassAsi = { ...ledger4, featureId: asiFeatureId2024(4), atClassLevel: 4 }
const otherClassAsi: AppliedClassAsi = { ...ledger4, classEntryId: 'other' }
const down = clearAsiAndOptionsAboveLevel({
  classEntryId: fighter.id,
  beforeLevel: 4,
  classAsi: [keepAsi, otherClassAsi],
  featurePicks: {
    values: {
      [`${fighter.id}:fighting_style`]: 'defense',
      [`${fighter.id}:l4_pick`]: 'x',
      'other:l4_pick': 'y',
    },
  },
  features: [
    { id: 'fighting_style', level: 1 },
    { id: 'l4_pick', level: 4 },
  ],
})
assert.deepEqual(down.revokedAsi, [keepAsi])
assert.deepEqual(down.keptAsi, [otherClassAsi])
assert.equal(down.featurePicks.values[`${fighter.id}:fighting_style`], 'defense')
assert.equal(down.featurePicks.values[`${fighter.id}:l4_pick`], undefined)
assert.equal(down.featurePicks.values['other:l4_pick'], 'y')

// level-down 3 → 2 drops the subclass; 4 → 3 does not
assert.equal(subclassDropsOnLevelDown2024('fighter', 3), true)
assert.equal(subclassDropsOnLevelDown2024('fighter', 4), false)

// 2024 progression follows the class level (no 2014 pack): no features above the level
const at3 = computeProgression2024({
  classes: [{ ...fighter, level: 3 }],
})
assert.ok(at3.features.every((f) => f.level <= 3))
assert.equal(at3.feat_levels_reached.length, 0)
const at4 = computeProgression2024({ classes: [{ ...fighter, level: 4 }] })
assert.deepEqual(at4.feat_levels_reached, [4])

// weapon mastery growth + trimming on level-down
assert.equal(weaponMasteryGain2024('fighter', 1), 3)
assert.equal(weaponMasteryGain2024('fighter', 2), 0)
assert.equal(weaponMasteryGain2024('fighter', 4), 1)
assert.equal(weaponMasteryGain2024('wizard', 5), 0)
const trimmed = trimClassOptionsForLevel2024({
  slug: 'fighter',
  newLevel: 3,
  classOptions: emptyClassOptions2024(),
  weaponMastery: {
    ...emptyWeaponMasteryState(),
    sourceClass: 'fighter',
    known: ['a', 'b', 'c', 'd'],
    baseline: ['a', 'b', 'c', 'd'],
  },
})
assert.deepEqual(trimmed.weaponMastery.known, ['a', 'b', 'c'])
const warlockTrim = trimClassOptionsForLevel2024({
  slug: 'warlock',
  newLevel: 4,
  classOptions: { ...emptyClassOptions2024(), eldritch_invocations: ['1', '2', '3', '4', '5'] },
  weaponMastery: emptyWeaponMasteryState(),
})
assert.equal(warlockTrim.classOptions.eldritch_invocations.length, 3)

// multiclass prerequisites 2024 (fighter: any of STR/DEX ≥ 13)
const base = { str: 8, dex: 8, con: 10, int: 10, wis: 10, cha: 10 }
assert.equal(
  checkMulticlassPrerequisites2024({ currentClasses: ['fighter'], newClass: 'fighter', abilities: base }).ok,
  false,
)
assert.equal(
  checkMulticlassPrerequisites2024({
    currentClasses: ['fighter'],
    newClass: 'fighter',
    abilities: { ...base, dex: 13 },
  }).ok,
  true,
)
assert.equal(
  checkMulticlassPrerequisites2024({
    currentClasses: ['fighter'],
    newClass: 'fighter',
    abilities: { ...base, str: 13 },
  }).ok,
  true,
)
const mc = checkMulticlassPrerequisites2024({
  currentClasses: ['Воин'],
  newClass: 'wizard',
  abilities: { ...base, str: 13, int: 12 },
})
assert.equal(mc.ok, false)
assert.match(mc.reasonRu, /≥13/)

// wizard: +2 book spells on every level from 2, none at 1 (create fills the 6)
const wizardRow = createClassLevel({ id: 'w1', name: 'Волшебник', catalog_id: 'wizard', level: 1 })
function wizardSteps(level: number, hasSubclass = true) {
  return buildPendingWizardSteps2024({
    classEntryId: wizardRow.id,
    className: wizardRow.name,
    classSlug: 'wizard',
    classLevel: level,
    hasSubclass,
    classAsi: [],
  })
}
assert.equal(wizardSteps(1).length, 0, 'wizard L1: create handles the book')
const w2 = wizardSteps(2)
assert.deepEqual(w2.map((s) => s.kind), ['spellbook_picks'])
const w2step = w2[0]
assert.ok(w2step.kind === 'spellbook_picks' && w2step.picksNeeded === 2 && w2step.classLevel === 2)
assert.deepEqual(
  wizardSteps(3, false).map((s) => s.kind),
  ['subclass', 'spellbook_picks'],
  'book picks follow the subclass step',
)
assert.equal(steps(2).length, 0, 'non-wizard gets no book picks')

// wizard level-down: newest level_up research goes first
const starting = Array.from({ length: 6 }, (_, i) => ({
  level: 1,
  name: `s${i}`,
  spellbook_acquisition: 'starting' as const,
}))
const l2 = ['a', 'b'].map((name) => ({ level: 1, name, spellbook_acquisition: 'level_up' as const }))
const l3 = ['c', 'd'].map((name) => ({ level: 2, name, spellbook_acquisition: 'level_up' as const }))
const bookAtL3 = [...starting, ...l2, ...l3]
assert.deepEqual(
  trimLevelUpSpellbookRows(bookAtL3, 2).map((s) => s.name),
  [...starting, ...l2].map((s) => s.name),
  'L3 → L2 drops the level 3 picks',
)
assert.equal(trimLevelUpSpellbookRows(bookAtL3, 3), bookAtL3, 'no change at the same level')
assert.equal(trimLevelUpSpellbookRows(bookAtL3, 1).length, 6, 'L1 keeps only the starting six')

console.log('pendingFeatureChoices2024.selfcheck ok')
