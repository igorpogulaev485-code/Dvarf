/** Run: npx tsx --tsconfig tsconfig.app.json src/shared/dnd/bard2024Features.selfcheck.ts */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as bard from './bard2024Features'
import { computeProgression2024 } from './edition2024Classes'
import { createClassLevel } from './classLevels'
import { featureResourceId, syncFeatureResources } from './featureResources'
import { applyLongRest, applyShortRest } from './rest'
import { buildPendingWizardSteps2024 } from './pendingFeatureChoices2024'
import type { SheetResource } from './rest'
import type { SpellSlotState } from './spells'

const ENTRY = 'class-bard'

function biPool(max: number, used: number, reset: SheetResource['reset'] = 'long'): SheetResource {
  return {
    id: featureResourceId('bard', bard.BARDIC_INSPIRATION_POOL_ID, ENTRY),
    name: bard.BARDIC_INSPIRATION_NAME_RU,
    max,
    used,
    reset,
  }
}

function pool(poolId: string, max: number, used: number): SheetResource {
  return {
    id: featureResourceId('bard', poolId, ENTRY),
    name: poolId,
    max,
    used,
    reset: 'long',
  }
}

const slots = (rows: Record<string, [number, number]>): Record<string, SpellSlotState> =>
  Object.fromEntries(Object.entries(rows).map(([k, [max, used]]) => [k, { max, used }]))

/* names + gate */
assert.equal(bard.EXPERTISE_NAME_RU, 'Компетентность')
assert.equal(bard.COUNTERCHARM_NAME_RU, 'Контрчары')
assert.equal(bard.MAGICAL_SECRETS_NAME_RU, 'Магические тайны')
assert.equal(bard.SPELLCASTING_NAME_RU_2024, 'Сотворение заклинаний')
assert.equal(bard.JACK_OF_ALL_TRADES_NAME_RU, 'Мастер на все руки')
assert.equal(bard.SUPERIOR_INSPIRATION_NAME_RU, 'Превосходное вдохновение')
assert.equal(bard.WORDS_OF_CREATION_NAME_RU, 'Слова Творения')
assert.equal(bard.isBardClassSlug('bard'), true)
assert.equal(bard.isBardClassSlug('Бард'), true)
assert.equal(bard.isBardClassSlug('cleric'), false)
assert.deepEqual(Object.keys(bard.BARD_SUBCLASS_SLUGS_2024).sort(), ['dance', 'glamour', 'lore', 'valor'])
assert.equal(bard.isBardPackSubclass2024('bard__lore'), true)
assert.equal(bard.isBardPackSubclass2024('bard__moon'), false)

/* prepared column + BI die */
assert.deepEqual(
  [1, 3, 5, 11, 20].map((l) => bard.bardPreparedSpells2024(l)),
  [4, 6, 9, 16, 22],
)
assert.deepEqual(
  [1, 4, 5, 9, 10, 14, 15, 20].map((l) => bard.bardicInspirationDieSides2024(l)),
  [6, 6, 8, 8, 10, 10, 12, 12],
)
assert.equal(bard.bardicInspirationMaxUses2024(8), 1)
assert.equal(bard.bardicInspirationMaxUses2024(18), 4)
assert.equal(bard.biShortRestRestoresAll2024(4), false)
assert.equal(bard.biShortRestRestoresAll2024(5), true)

/* BI grant (no self-grant, one die at a time) */
assert.equal(
  bard.checkBardicInspirationGrant2024({ targetIsSelf: true, targetHasBardicDie: false, poolLeft: 3 }).ok,
  false,
)
assert.equal(
  bard.checkBardicInspirationGrant2024({ targetIsSelf: false, targetHasBardicDie: true, poolLeft: 3 }).ok,
  false,
)
assert.equal(
  bard.checkBardicInspirationGrant2024({ targetIsSelf: false, targetHasBardicDie: false, poolLeft: 0 }).ok,
  false,
)
assert.equal(
  bard.checkBardicInspirationGrant2024({ targetIsSelf: false, targetHasBardicDie: false, poolLeft: 1 }).ok,
  true,
)

/* Jack of All Trades: skills only */
const jack = (over: Partial<Parameters<typeof bard.jackOfAllTradesBonus2024>[0]>) =>
  bard.jackOfAllTradesBonus2024({
    bardLevel: 5,
    proficiencyBonus: 3,
    isSkillCheck: true,
    skillProficient: false,
    ...over,
  })
assert.equal(jack({}), 1)
assert.equal(jack({ proficiencyBonus: 5 }), 2)
assert.equal(jack({ skillProficient: true }), 0)
assert.equal(jack({ isSkillCheck: false }), 0)
assert.equal(jack({ isInitiative: true }), 0)
assert.equal(jack({ bardLevel: 1 }), 0)

/* Expertise 2 / 9 */
assert.deepEqual(
  [1, 2, 8, 9, 20].map((l) => bard.expertiseSkillsTotal2024(l)),
  [0, 2, 2, 4, 4],
)
assert.equal(bard.expertiseChoice2024.max_picks, 2)
assert.equal(bard.expertiseChoice2024.options_from, 'expertise_skills_tools')
assert.deepEqual(
  bard.expertisePicksOutstanding2024({ bardLevel: 1, featurePicks: { values: {} }, classEntryId: ENTRY }),
  [],
)
assert.deepEqual(
  bard
    .expertisePicksOutstanding2024({ bardLevel: 9, featurePicks: { values: {} }, classEntryId: ENTRY })
    .map((row) => row.featureId),
  ['expertise', 'expertise_9'],
)

/* Magical Secrets (2024 four-list model from 10) */
assert.deepEqual(bard.magicalSecretsEligibleLists2024({ bardLevel: 9, kind: 'new' }), ['bard'])
assert.deepEqual(bard.magicalSecretsEligibleLists2024({ bardLevel: 10, kind: 'replace' }), [
  'bard',
  'wizard',
  'druid',
  'cleric',
])
assert.deepEqual(bard.magicalSecretsEligibleLists2024({ bardLevel: 12, kind: 'new' }), ['bard'])
assert.equal(bard.magicalSecretsEligibleLists2024({ bardLevel: 13, kind: 'new' }).length, 4)
assert.equal(bard.preparedColumnGrowsAtLevel2024(12), false)

/* Font of Inspiration: slot -> exactly 1 use, never before 5 */
const sl = slots({ '1': [4, 0], '2': [3, 1], '3': [3, 3] })
const refused = bard.fontOfInspirationSlotToUse2024({
  bardLevel: 4,
  slotLevel: 1,
  slots: sl,
  resources: [biPool(3, 2)],
  classEntryId: ENTRY,
})
assert.equal(refused.ok, false)
const fontOk = bard.fontOfInspirationSlotToUse2024({
  bardLevel: 5,
  slotLevel: 2,
  slots: sl,
  resources: [biPool(3, 2)],
  classEntryId: ENTRY,
})
assert.equal(fontOk.ok, true)
if (fontOk.ok) {
  assert.equal(fontOk.slots['2']!.used, 2)
  assert.equal(fontOk.resources[0]!.used, 1)
}
assert.equal(
  bard.fontOfInspirationSlotToUse2024({
    bardLevel: 5,
    slotLevel: 3,
    slots: sl,
    resources: [biPool(3, 2)],
    classEntryId: ENTRY,
  }).ok,
  false,
)
assert.equal(
  bard.fontOfInspirationSlotToUse2024({
    bardLevel: 5,
    slotLevel: 1,
    slots: sl,
    resources: [biPool(3, 0)],
    classEntryId: ENTRY,
  }).ok,
  false,
)

/* Superior Inspiration: top-up to 2 (0->2, 1->2, 2+ none), not the 2014 +1 */
const sup = (max: number, used: number, bardLevel = 18) =>
  bard.superiorInspirationRestoreAmount2024({ bardLevel, max, used })
assert.equal(sup(5, 5), 2)
assert.equal(sup(5, 4), 1)
assert.equal(sup(5, 3), 0)
assert.equal(sup(5, 5, 17), 0)
assert.equal(sup(1, 1), 1)
const supApplied = bard.applySuperiorInspirationOnInitiative2024({
  bardLevel: 18,
  resources: [biPool(4, 4)],
  classEntryId: ENTRY,
})
assert.equal(supApplied.ok, true)
assert.equal(supApplied.resources[0]!.used, 2)
assert.equal(
  bard.applySuperiorInspirationOnInitiative2024({ bardLevel: 18, resources: [biPool(4, 1)] }).ok,
  false,
)

/* Words of Creation */
assert.deepEqual(bard.wordsOfCreationAlwaysPrepared2024(19), [])
assert.deepEqual(bard.wordsOfCreationAlwaysPrepared2024(20), ['power-word-heal', 'power-word-kill'])
assert.equal(bard.wordsOfCreationSecondTarget2024({ bardLevel: 20, spellSlug: 'power-word-kill' }).available, true)
assert.equal(bard.wordsOfCreationSecondTarget2024({ bardLevel: 20, spellSlug: 'fireball' }).available, false)
assert.equal(
  bard.wordsOfCreationSecondTarget2024({ bardLevel: 20, spellSlug: 'power-word-heal', secondTargetDistanceFt: 15 })
    .available,
  false,
)

/* Countercharm: reaction, 30 ft, no BI cost */
assert.equal(bard.COUNTERCHARM_BUTTON_2024.kind, 'reaction')
assert.equal(bard.COUNTERCHARM_BUTTON_2024.rangeFt, 30)
assert.equal(bard.COUNTERCHARM_BUTTON_2024.costsInspiration, false)
const counter = bard.applyBard2024FeatureUse({
  featureId: 'countercharm',
  resourceId: null,
  resources: [biPool(3, 1)],
  classEntryId: ENTRY,
  bardLevel: 7,
})
assert.equal(counter.ok, true)
assert.equal(counter.resources[0]!.used, 1)
assert.equal(
  bard.applyBard2024FeatureUse({
    featureId: 'countercharm',
    resourceId: null,
    resources: [],
    classEntryId: ENTRY,
    bardLevel: 6,
  }).ok,
  false,
)

const supUse = bard.applyBard2024FeatureUse({
  featureId: 'superior-inspiration',
  resourceId: null,
  resources: [biPool(4, 4)],
  classEntryId: ENTRY,
  bardLevel: 18,
})
assert.equal(supUse.ok, true)
assert.equal(supUse.resources[0]!.used, 2)
assert.equal(bard.bard2024UseFeatureId('superior_inspiration'), 'superior-inspiration')
assert.equal(bard.hasDazzlingFootwork2024([{ id: 'dazzling_footwork' }]), true)
assert.equal(bard.hasDazzlingFootwork2024([{ id: 'other' }]), false)
assert.equal(bard.danceAcFormula2024(4).base, 14)
assert.equal(bard.danceAcFormula2024(4).allowsShield, false)

/* BI use through the dialog helper */
const grant = bard.applyBard2024FeatureUse({
  featureId: 'bardic-inspiration',
  resourceId: null,
  resources: [biPool(3, 0)],
  classEntryId: ENTRY,
  bardLevel: 10,
  targetName: 'Торин',
})
assert.equal(grant.ok, true)
assert.equal(grant.resources[0]!.used, 1)
assert.equal(grant.patches?.grantedDieLabel, '1к10')
assert.equal(
  bard.applyBard2024FeatureUse({
    featureId: 'bardic-inspiration',
    resourceId: null,
    resources: [biPool(3, 0)],
    classEntryId: ENTRY,
    bardLevel: 10,
    targetIsSelf: true,
  }).ok,
  false,
)

/* Colleges */
assert.equal(bard.danceUnarmoredAc2024({ dexMod: 3, chaMod: 4, wearingArmor: false, wearingShield: false }), 17)
assert.equal(bard.danceUnarmoredAc2024({ dexMod: 3, chaMod: 4, wearingArmor: true, wearingShield: false }), null)
assert.equal(bard.danceUnarmoredAc2024({ dexMod: 3, chaMod: 4, wearingArmor: false, wearingShield: true }), null)
assert.equal(bard.glamourMantleTempHp2024(4), 8)
assert.equal(bard.glamourMantleTargets2024(8), 1)
assert.equal(bard.valorMartialTrainingGrants2024().weaponMastery, false)
assert.equal(bard.valorMartialTrainingGrants2024().shields, true)
assert.equal(bard.bardMaxSpellCircle2024(6), 3)
assert.equal(
  bard.loreDiscoveryEligible2024({ bardLevel: 6, spellLevel: 3, spellClasses: ['wizard'] }),
  true,
)
assert.equal(
  bard.loreDiscoveryEligible2024({ bardLevel: 6, spellLevel: 4, spellClasses: ['wizard'] }),
  false,
)
assert.equal(
  bard.loreDiscoveryEligible2024({ bardLevel: 6, spellLevel: 1, spellClasses: ['sorcerer'] }),
  false,
)

const mantle = bard.applyBard2024FeatureUse({
  featureId: 'mantle-of-inspiration',
  resourceId: null,
  resources: [biPool(4, 0)],
  classEntryId: ENTRY,
  bardLevel: 3,
  chaScore: 16,
  dieRoll: 5,
})
assert.equal(mantle.ok, true)
assert.equal(mantle.patches?.tempHp, 10)
assert.equal(mantle.resources[0]!.used, 1)

const majesty = bard.applyBard2024FeatureUse({
  featureId: 'mantle-of-majesty',
  resourceId: null,
  resources: [pool(bard.MANTLE_OF_MAJESTY_POOL_ID, 1, 1)],
  classEntryId: ENTRY,
  bardLevel: 6,
  mode: 'regain',
  slotLevel: 3,
  slots: slots({ '3': [2, 0] }),
})
assert.equal(majesty.ok, true)
assert.equal(majesty.resources[0]!.used, 0)
assert.equal(majesty.slots?.['3']?.used, 1)

const peerlessFail = bard.applyBard2024FeatureUse({
  featureId: 'peerless-skill',
  resourceId: null,
  resources: [biPool(3, 0)],
  classEntryId: ENTRY,
  bardLevel: 14,
  succeeded: false,
})
assert.equal(peerlessFail.resources[0]!.used, 0)

/* Level-down */
const down19 = bard.bardLevelDownDrops2024(19)
assert.equal(down19.words_of_creation, true)
assert.equal(down19.magical_secrets, false)
assert.equal(bard.bardLevelDownDrops2024(9).magical_secrets, true)
assert.equal(bard.bardLevelDownDrops2024(2).subclass, true)
assert.deepEqual(bard.bardPickFeatureIdsToDrop2024(8), ['expertise_9'])
assert.deepEqual(bard.bardPickFeatureIdsToDrop2024(5), ['expertise_9', 'magical_discoveries'])
assert.equal(bard.bardPickFeatureIdsToDrop2024(1).includes('expertise'), true)

/* Card buttons / routing */
assert.equal(bard.bard2024UseFeatureId('font_of_inspiration'), 'font-of-inspiration')
assert.equal(bard.bard2024UseFeatureId('song_of_rest'), null)
assert.equal(bard.isBard2014OnlyFeatureId('song_of_rest'), true)
assert.equal(bard.BARD_2024_CARD_BUTTONS['font-of-inspiration'], 'Ячейка → вдохновение…')

/* catalog contract: FE mirror carries the accepted RU names */
const here = path.dirname(fileURLToPath(import.meta.url))
const classes = JSON.parse(
  readFileSync(path.join(here, 'data/edition2024/classes_srd.json'), 'utf8'),
) as {
  entries: Array<{
    slug: string
    data: { levels: Array<{ features: Array<{ id: string; name_ru: string }> }> }
  }>
}
const bardRow = classes.entries.find((row) => row.slug === 'bard')
assert.ok(bardRow, 'bard in FE classes_srd')
const names = new Map<string, string>()
for (const level of bardRow.data.levels) {
  for (const feat of level.features) names.set(feat.id, feat.name_ru)
}
assert.equal(names.get('spellcasting'), bard.SPELLCASTING_NAME_RU_2024)
assert.equal(names.get('expertise'), bard.EXPERTISE_NAME_RU)
assert.equal(names.get('expertise-9'), bard.EXPERTISE_NAME_RU)
assert.equal(names.get('countercharm'), bard.COUNTERCHARM_NAME_RU)
assert.equal(names.get('magical-secrets'), bard.MAGICAL_SECRETS_NAME_RU)
assert.equal(names.get('font-of-inspiration'), bard.FONT_OF_INSPIRATION_NAME_RU)
assert.equal(names.get('superior-inspiration'), bard.SUPERIOR_INSPIRATION_NAME_RU)
assert.equal(names.get('words-of-creation'), bard.WORDS_OF_CREATION_NAME_RU)
assert.equal(names.has('song-of-rest'), false)

/* Progression + rests: BI is long-rest only below 5, then a short rest returns ALL uses */
function bardSnap(level: number, subclass: string | null = null) {
  const row = createClassLevel({ name: 'Бард', level, catalog_id: 'bard' })
  return computeProgression2024({
    classes: [row],
    subclassSlugByEntryId: subclass ? { [row.id]: subclass } : {},
    abilities: { cha: 18 },
  })
}
const snap4 = bardSnap(4)
const bi4 = snap4.desiredResources.find((r) => r.id.includes(':bardic_inspiration:'))
assert.ok(bi4)
assert.equal(bi4.reset, 'long')
assert.equal(bi4.max, 4)
const snap5 = bardSnap(5)
const bi5 = snap5.desiredResources.find((r) => r.id.includes(':bardic_inspiration:'))
assert.ok(bi5)
assert.equal(bi5.reset, 'short')
assert.equal(bi5.shortRestRegain, undefined)
const spent4 = syncFeatureResources([], snap4.desiredResources).map((r) => ({ ...r, used: r.max }))
const afterShort4 = applyShortRest({ resources: spent4 })
assert.equal(afterShort4.resources.find((r) => r.id.includes(':bardic_inspiration:'))!.used, 4)
const spent5 = syncFeatureResources([], snap5.desiredResources).map((r) => ({ ...r, used: r.max }))
const afterShort5 = applyShortRest({ resources: spent5 })
assert.equal(afterShort5.resources.find((r) => r.id.includes(':bardic_inspiration:'))!.used, 0)
const longRest = applyLongRest({
  resources: spent4,
  slots: { '1': { max: 4, used: 4 } },
  pact_slots: null,
  exhaustion: 0,
  hp_max: 30,
  hit_dice_current: 0,
  hit_dice_max: 4,
  rules_edition: '2024',
  hp_current: 10,
})
assert.equal(longRest.resources.find((r) => r.id.includes(':bardic_inspiration:'))!.used, 0)
assert.equal(longRest.slots?.['1']?.used, 0)
// A short rest must not restore spell slots.
assert.equal((afterShort5 as { slots?: unknown }).slots, undefined)

/* Progression: expertise choices on 2 / 9, no 2014-only rows, college rows */
const snap9 = bardSnap(9)
const exp2 = snap9.features.find((f) => f.id === 'expertise')
const exp9 = snap9.features.find((f) => f.id === 'expertise_9')
assert.equal(exp2?.choice?.max_picks, 2)
assert.equal(exp9?.choice?.id, 'expertise_9')
assert.equal(exp9?.name_ru, 'Компетентность')
assert.equal(bardSnap(1).features.some((f) => f.id === 'expertise'), false)
for (const f of bardSnap(20, 'bard__lore').features) {
  assert.equal(bard.isBard2014OnlyFeatureId(f.id), false, f.id)
}
assert.equal(bardSnap(20).features.some((f) => f.id === 'song_of_rest'), false)
const glam = bardSnap(6, 'bard__glamour')
assert.ok(glam.features.some((f) => f.id === 'mantle_of_majesty'))
const dance = bardSnap(3, 'bard__dance')
assert.equal(bard.hasDazzlingFootwork2024(dance.features), true)
const lore14 = bardSnap(14, 'bard__lore')
assert.ok(lore14.features.some((f) => f.id === 'magical_discoveries'))
assert.ok(lore14.features.some((f) => f.id === 'peerless_skill'))

/* Level-up queue: Expertise on 2 and 9 */
const queue = (level: number, values: Record<string, string>) =>
  buildPendingWizardSteps2024({
    classEntryId: ENTRY,
    className: 'Бард',
    classSlug: 'bard',
    classLevel: level,
    hasSubclass: true,
    classAsi: [],
    featurePicks: { values },
  }).filter((step) => step.kind === 'feature_choice')
assert.equal(queue(1, {}).length, 0)
assert.deepEqual(
  queue(2, {}).map((step) => (step.kind === 'feature_choice' ? step.featureId : '')),
  ['expertise'],
)
assert.equal(queue(2, { [`${ENTRY}:expertise`]: 'stealth,arcana' }).length, 0)
assert.deepEqual(
  queue(9, { [`${ENTRY}:expertise`]: 'stealth,arcana' }).map((step) =>
    step.kind === 'feature_choice' ? step.featureId : '',
  ),
  ['expertise_9'],
)

console.log('bard2024Features.selfcheck ok')
