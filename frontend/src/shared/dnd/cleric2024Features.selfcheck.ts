/** Run: npx tsx --tsconfig tsconfig.app.json src/shared/dnd/cleric2024Features.selfcheck.ts */
import assert from 'node:assert/strict'
import * as cleric from './cleric2024Features'
import {
  applyCleric2024FeatureUse,
  AVATAR_OF_BATTLE_NAME_RU,
  blessedStrikesChoice2024,
  BLESSED_STRIKES_NAME_RU,
  CHANNEL_DIVINITY_NAME_RU,
  CLERIC_2024_CARD_BUTTONS,
  CLERIC_BASE_CHANNEL_OPTIONS_2024,
  cleric2024UseFeatureId,
  coronaOfLightMaxUses2024,
  DIVINE_INTERVENTION_NAME_RU,
  DIVINE_ORDER_NAME_RU,
  DIVINE_ORDER_PROTECTOR,
  DIVINE_ORDER_THAUMATURGE,
  DIVINE_SPARK_NAME_RU,
  decrementWishLockOnLongRest2024,
  discipleOfLifeBonus2024,
  divineInterventionAvailability2024,
  divineSparkDiceCount2024,
  divineSparkFormulaRu2024,
  divineStrikeDice2024,
  filterDivineInterventionSpells2024,
  GREATER_DIVINE_INTERVENTION_NAME_RU,
  potentSpellcastingTempHp2024,
  preserveLifePool2024,
  protectorGrants2024,
  radianceOfTheDawnFormulaRu2024,
  readDivineOrder2024,
  readWishLock2024,
  rollWishLockLongRests2024,
  searUndeadDiceCount2024,
  searUndeadFormulaRu2024,
  SEAR_UNDEAD_NAME_RU,
  setWishLock2024,
  supremeHealingActive2024,
  thaumaturgeExtraCantrips2024,
  thaumaturgeSkillBonus2024,
  trickeryDuplicityEndHeal2024,
  TURN_UNDEAD_NAME_RU,
  warAvatarResistances2024,
  type DivineInterventionSpellRow,
} from './cleric2024Features'
import { emptyFeaturePicks, setFeaturePick } from './featurePicks'
import type { SheetResource } from './rest'

const ENTRY = 'entry-cleric'

/* Names (next.dnd.su) */
assert.equal(CHANNEL_DIVINITY_NAME_RU, 'Проведение божественности')
assert.equal(DIVINE_SPARK_NAME_RU, 'Божественная искра')
assert.equal(TURN_UNDEAD_NAME_RU, 'Изгнание нежити')
assert.equal(SEAR_UNDEAD_NAME_RU, 'Испепеление нежити')
assert.equal(DIVINE_ORDER_NAME_RU, 'Божественный орден')
assert.equal(BLESSED_STRIKES_NAME_RU, 'Благословленные удары')
assert.equal(DIVINE_INTERVENTION_NAME_RU, 'Божественное вмешательство')
assert.equal(GREATER_DIVINE_INTERVENTION_NAME_RU, 'Великое божественное вмешательство')
assert.equal(AVATAR_OF_BATTLE_NAME_RU, 'Воплощение битвы')

/* 2014 names must not leak into the 2024 module */
const forbidden = ['Божественный канал', 'Выжигание', 'Благословенные удары']
for (const [key, value] of Object.entries(cleric)) {
  if (typeof value !== 'string') continue
  for (const bad of forbidden) {
    assert.ok(!value.includes(bad), `${key} uses 2014 name «${bad}»`)
  }
}
for (const label of Object.values(CLERIC_2024_CARD_BUTTONS)) {
  for (const bad of forbidden) assert.ok(!label.includes(bad))
}

/* Formulas: L11 Wis 18 (mod +4) */
assert.equal(divineSparkFormulaRu2024(11, 4), '2к8+4')
assert.equal(searUndeadFormulaRu2024(4), '4к8')
assert.equal(radianceOfTheDawnFormulaRu2024(11), '2к10+11')
assert.equal(divineSparkFormulaRu2024(2, 0), '1к8')
assert.equal(divineSparkFormulaRu2024(1, 3), '')
assert.equal(searUndeadFormulaRu2024(-1), '1к8')
assert.equal(searUndeadDiceCount2024(0), 1)

/* Divine Spark ladder */
const ladder: Array<[number, number]> = [
  [1, 0], [2, 1], [6, 1], [7, 2], [12, 2], [13, 3], [17, 3], [18, 4], [20, 4],
]
for (const [level, dice] of ladder) assert.equal(divineSparkDiceCount2024(level), dice, `L${level}`)

/* Preserve Life pool */
assert.equal(preserveLifePool2024(3), 15)
assert.equal(preserveLifePool2024(11), 55)

/* Divine Order */
assert.equal(DIVINE_ORDER_PROTECTOR, 'protector')
assert.equal(DIVINE_ORDER_THAUMATURGE, 'thaumaturge')
assert.deepEqual(thaumaturgeSkillBonus2024(4), { arcana: 4, religion: 4 })
assert.deepEqual(thaumaturgeSkillBonus2024(0), { arcana: 1, religion: 1 })
assert.deepEqual(thaumaturgeSkillBonus2024(-2), { arcana: 1, religion: 1 })
assert.deepEqual(protectorGrants2024(), { martialWeapons: true, heavyArmor: true })
assert.equal(thaumaturgeExtraCantrips2024(), 1)
assert.equal(readDivineOrder2024({ divine_order: 'thaumaturge' }), 'thaumaturge')
assert.equal(readDivineOrder2024({ divine_order: 'PROTECTOR' }), 'protector')
assert.equal(readDivineOrder2024({ divine_order: 'x' }), null)
assert.equal(readDivineOrder2024(null), null)
assert.equal(
  readDivineOrder2024(setFeaturePick(emptyFeaturePicks(), ENTRY, 'divine_order', 'protector'), ENTRY),
  'protector',
)
assert.equal(
  readDivineOrder2024(setFeaturePick(emptyFeaturePicks(), ENTRY, 'divine-order', 'thaumaturge'), ENTRY),
  'thaumaturge',
)
assert.equal(
  readDivineOrder2024(setFeaturePick(emptyFeaturePicks(), ENTRY, 'divine_order', 'thaumaturge')),
  'thaumaturge',
)

/* Channel options */
assert.deepEqual(
  CLERIC_BASE_CHANNEL_OPTIONS_2024.map((row) => [row.feature_id, row.name_ru, row.kind, row.min_level]),
  [
    ['divine-spark', 'Божественная искра', 'action', 2],
    ['turn-undead', 'Изгнание нежити', 'action', 2],
  ],
)

/* Blessed Strikes */
assert.equal(blessedStrikesChoice2024.id, 'blessed-strikes')
assert.deepEqual(blessedStrikesChoice2024.options, ['divine_strike', 'potent_spellcasting'])
assert.equal(divineStrikeDice2024(6), 0)
assert.equal(divineStrikeDice2024(7), 1)
assert.equal(divineStrikeDice2024(13), 1)
assert.equal(divineStrikeDice2024(14), 2)
assert.equal(divineStrikeDice2024(20), 2)
assert.equal(potentSpellcastingTempHp2024(4, 13), 0)
assert.equal(potentSpellcastingTempHp2024(4, 14), 8)

/* Wish lock 2d4 */
let min = 99
let max = 0
for (let i = 0; i < 400; i += 1) {
  const n = rollWishLockLongRests2024()
  min = Math.min(min, n)
  max = Math.max(max, n)
  assert.ok(n >= 2 && n <= 8)
}
assert.equal(min, 2)
assert.equal(max, 8)
assert.equal(rollWishLockLongRests2024(() => 0), 2)
assert.equal(rollWishLockLongRests2024(() => 0.999999), 8)

let picks = setWishLock2024(emptyFeaturePicks(), ENTRY, 3)
assert.equal(readWishLock2024(picks, ENTRY), 3)
picks = decrementWishLockOnLongRest2024(picks, ENTRY)
assert.equal(readWishLock2024(picks, ENTRY), 2)
picks = decrementWishLockOnLongRest2024(decrementWishLockOnLongRest2024(picks, ENTRY), ENTRY)
assert.equal(readWishLock2024(picks, ENTRY), 0)
assert.equal(decrementWishLockOnLongRest2024(picks, ENTRY), picks)

/* Spell filter */
const spells: DivineInterventionSpellRow[] = [
  { slug: 'cure-wounds', level: 1, classes: ['cleric', 'bard'], casting_time: { unit: 'action', amount: 1 } },
  { slug: 'sacred-flame', level: 0, classes: ['cleric'], casting_time: { unit: 'action', amount: 1 } },
  { slug: 'raise-dead', level: 5, classes: ['cleric'], casting_time: { unit: 'hour', amount: 1 } },
  { slug: 'resurrection', level: 7, classes: ['cleric'], casting_time: { unit: 'hour', amount: 1 } },
  { slug: 'shield', level: 1, classes: ['wizard'], casting_time: { unit: 'reaction', amount: 1 } },
  { slug: 'counter-cleric', level: 3, classes: ['cleric'], casting_time: { unit: 'reaction', amount: 1 } },
  { slug: 'wizard-only', level: 2, classes: ['wizard'], casting_time: 'Действие' },
  { slug: 'ru-reaction', level: 2, classes: ['cleric'], casting_time: 'Реакция' },
]
assert.deepEqual(
  filterDivineInterventionSpells2024(spells).map((s) => s.slug),
  ['cure-wounds', 'raise-dead'],
)

/* Subclass helpers */
assert.equal(discipleOfLifeBonus2024(3), 5)
assert.equal(supremeHealingActive2024(16), false)
assert.equal(supremeHealingActive2024(17), true)
assert.deepEqual(warAvatarResistances2024(17), ['bludgeoning', 'piercing', 'slashing'])
assert.deepEqual(warAvatarResistances2024(16), [])
assert.equal(trickeryDuplicityEndHeal2024(17), 17)
assert.equal(trickeryDuplicityEndHeal2024(9), 0)
assert.equal(coronaOfLightMaxUses2024(4, 17), 4)
assert.equal(coronaOfLightMaxUses2024(0, 17), 1)
assert.equal(coronaOfLightMaxUses2024(4, 16), 0)

/* Feature id routing */
assert.equal(cleric2024UseFeatureId('divine_spark'), 'divine-spark')
assert.equal(cleric2024UseFeatureId('greater-divine-intervention'), 'divine-intervention')
assert.equal(cleric2024UseFeatureId('war_gods_blessing'), 'war-gods-blessing')
assert.equal(cleric2024UseFeatureId('spellcasting'), null)
assert.equal(cleric2024UseFeatureId(null), null)

/* Apply */
function pool(poolId: string, max: number, used = 0, slug = 'cleric'): SheetResource {
  return { id: `feat:${slug}:${poolId}:${ENTRY}`, name: poolId, max, used, reset: 'long' }
}
const base = (over: Partial<Parameters<typeof applyCleric2024FeatureUse>[0]> = {}) => ({
  featureId: 'divine-spark',
  resourceId: null,
  resources: [pool('channel_divinity', 3), pool('divine_intervention', 1)],
  classEntryId: ENTRY,
  clericLevel: 11,
  wisMod: 4,
  ...over,
})
const usedOf = (r: SheetResource[], id: string) =>
  r.find((row) => row.id.includes(`:${id}:`))?.used

const spark = applyCleric2024FeatureUse(base({ mode: 'radiant' }))
assert.ok(spark.ok)
assert.equal(usedOf(spark.resources, 'channel_divinity'), 1)
assert.ok(spark.feedLineRu.includes('2к8+4'))
assert.equal(spark.patches?.damageType, 'radiant')

const heal = applyCleric2024FeatureUse(base({ mode: 'heal' }))
assert.ok(heal.ok && heal.patches?.damageType === undefined)

const empty = applyCleric2024FeatureUse(base({ resources: [pool('channel_divinity', 2, 2)] }))
assert.equal(empty.ok, false)
assert.ok(empty.message)

const turn = applyCleric2024FeatureUse(base({ featureId: 'turn_undead' }))
assert.ok(turn.ok && turn.feedLineRu.includes('4к8') && turn.feedLineRu.includes('Испепеление нежити'))
const turn3 = applyCleric2024FeatureUse(base({ featureId: 'turn-undead', clericLevel: 3 }))
assert.ok(turn3.ok && !turn3.feedLineRu.includes('4к8'))

const preserve = applyCleric2024FeatureUse(base({ featureId: 'preserve-life', amount: 56 }))
assert.equal(preserve.ok, false)
const preserveOk = applyCleric2024FeatureUse(base({ featureId: 'preserve-life', amount: 40 }))
assert.ok(preserveOk.ok && preserveOk.patches?.healPool === 55)

const radiance = applyCleric2024FeatureUse(base({ featureId: 'radiance-of-the-dawn' }))
assert.ok(radiance.ok && radiance.feedLineRu.includes('2к10+11'))

assert.equal(applyCleric2024FeatureUse(base({ featureId: 'war-gods-blessing' })).ok, false)
const wgb = applyCleric2024FeatureUse(base({ featureId: 'war-gods-blessing', choice: 'shield-of-faith' }))
assert.ok(wgb.ok && usedOf(wgb.resources, 'channel_divinity') === 1)

const dup = applyCleric2024FeatureUse(base({ featureId: 'invoke-duplicity', mode: 'create' }))
assert.ok(dup.ok && dup.patches?.featurePicks)
const dupPicks = dup.patches!.featurePicks!
assert.equal(
  applyCleric2024FeatureUse(base({ featureId: 'invoke-duplicity', mode: 'create', featurePicks: dupPicks })).ok,
  false,
)
const dupEnd = applyCleric2024FeatureUse(
  base({ featureId: 'invoke-duplicity', mode: 'dismiss', featurePicks: dupPicks, clericLevel: 17 }),
)
assert.ok(dupEnd.ok && dupEnd.patches?.healPool === 17)
assert.equal(applyCleric2024FeatureUse(base({ featureId: 'invoke-duplicity', mode: 'move' })).ok, false)

const flare = applyCleric2024FeatureUse(
  base({ featureId: 'warding-flare', resources: [pool('warding_flare', 4, 1, 'cleric')] }),
)
assert.ok(flare.ok && usedOf(flare.resources, 'warding_flare') === 2)

const di = applyCleric2024FeatureUse(base({ featureId: 'divine-intervention', mode: 'spell', spellId: 'raise-dead' }))
assert.ok(di.ok && usedOf(di.resources, 'divine_intervention') === 1)
assert.equal(
  applyCleric2024FeatureUse(base({ featureId: 'divine-intervention', mode: 'spell' })).ok,
  false,
)
assert.equal(
  applyCleric2024FeatureUse(base({ featureId: 'divine-intervention', mode: 'wish' })).ok,
  false,
  'wish needs level 20',
)
const wish = applyCleric2024FeatureUse(
  base({ featureId: 'divine-intervention', mode: 'wish', clericLevel: 20, rng: () => 0.5 }),
)
assert.ok(wish.ok)
assert.equal(wish.patches?.wishLockLongRests, 6)
const lockedPicks = wish.patches!.featurePicks!
assert.equal(readWishLock2024(lockedPicks, ENTRY), 6)
const locked = divineInterventionAvailability2024({
  clericLevel: 20,
  resources: [pool('divine_intervention', 1)],
  featurePicks: lockedPicks,
  classEntryId: ENTRY,
})
assert.equal(locked.available, false)
assert.equal(
  divineInterventionAvailability2024({
    clericLevel: 9,
    resources: [pool('divine_intervention', 1)],
    featurePicks: emptyFeaturePicks(),
    classEntryId: ENTRY,
  }).available,
  false,
)
assert.equal(
  divineInterventionAvailability2024({
    clericLevel: 20,
    resources: [pool('divine_intervention', 1)],
    featurePicks: emptyFeaturePicks(),
    classEntryId: ENTRY,
  }).available,
  true,
)

console.log('cleric2024Features.selfcheck: ok')
