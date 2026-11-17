/** Run: npx tsx --tsconfig tsconfig.app.json src/shared/dnd/paladin2024Features.selfcheck.ts */
import assert from 'node:assert/strict'
import * as paladin from './paladin2024Features'
import {
  ABJURE_FOES_NAME_RU,
  AURA_OF_PROTECTION_NAME_RU,
  applyPaladin2024FeatureUse,
  auraProtectionRadiusFt2024,
  auraProtectionSaveBonus2024,
  BLESSED_WARRIOR_ID,
  BLESSED_WARRIOR_NAME_RU,
  CHANNEL_DIVINITY_NAME_RU,
  channelDivinityMax2024,
  DIVINE_SENSE_NAME_RU,
  DIVINE_SMITE_SPELL_NAME_RU,
  evaluateLayOnHandsSpend2024,
  FAITHFUL_STEED_NAME_RU,
  FIND_STEED_SPELL_NAME_RU,
  holyNimbusDamageFormulaRu2024,
  HOLY_NIMBUS_NAME_RU,
  inspiringSmiteTempHpFormulaRu2024,
  INSPIRING_SMITE_NAME_RU,
  isPaladinClassSlug,
  LAY_ON_HANDS_NAME_RU,
  layOnHandsMax2024,
  OATH_OF_DEVOTION_NAME_RU,
  OATH_OF_GLORY_NAME_RU,
  OATH_OF_THE_ANCIENTS_NAME_RU,
  OATH_OF_VENGEANCE_NAME_RU,
  PALADIN_2024_CARD_BUTTONS,
  PALADIN_CLASS_SLUG_2024,
  PALADIN_FEATURE_NAMES_BY_ID,
  PALADIN_FREE_SMITE_POOL_ID,
  PALADIN_FREE_STEED_POOL_ID,
  PALADIN_OATH_SLUGS_2024,
  PALADINS_SMITE_NAME_RU,
  paladin2024UseFeatureId,
  paladinLevelDownDrops2024,
  PEERLESS_ATHLETE_NAME_RU,
  radiantStrikesRiderRu2024,
  RADIANT_STRIKES_NAME_RU,
  readBlessedWarriorCantrips2024,
  RESTORING_TOUCH_NAME_RU,
  SPELLCASTING_NAME_RU,
  WEAPON_MASTERY_NAME_RU,
  writeBlessedWarriorCantrips2024,
} from './paladin2024Features'
import { emptyFeaturePicks } from './featurePicks'
import type { SheetResource } from './rest'

const ENTRY = 'entry-paladin'

/* Names (FINAL) */
assert.equal(LAY_ON_HANDS_NAME_RU, 'Возложение рук')
assert.equal(WEAPON_MASTERY_NAME_RU, 'Оружейное мастерство')
assert.equal(SPELLCASTING_NAME_RU, 'Сотворение заклинаний')
assert.equal(BLESSED_WARRIOR_NAME_RU, 'Благословенный воин')
assert.equal(PALADINS_SMITE_NAME_RU, 'Кара паладина')
assert.equal(DIVINE_SMITE_SPELL_NAME_RU, 'Божественная кара')
assert.equal(CHANNEL_DIVINITY_NAME_RU, 'Проведение божественности')
assert.equal(DIVINE_SENSE_NAME_RU, 'Божественное чувство')
assert.equal(FAITHFUL_STEED_NAME_RU, 'Верный скакун')
assert.equal(FIND_STEED_SPELL_NAME_RU, 'Обретение скакуна')
assert.equal(AURA_OF_PROTECTION_NAME_RU, 'Аура защиты')
assert.equal(ABJURE_FOES_NAME_RU, 'Порицание врагов')
assert.equal(RADIANT_STRIKES_NAME_RU, 'Сияющие удары')
assert.equal(RESTORING_TOUCH_NAME_RU, 'Восстанавливающее касание')
assert.equal(INSPIRING_SMITE_NAME_RU, 'Воодушевляющая кара')
assert.equal(PEERLESS_ATHLETE_NAME_RU, 'Непревзойдённый атлет')
assert.equal(HOLY_NIMBUS_NAME_RU, 'Священный нимб')
assert.equal(OATH_OF_DEVOTION_NAME_RU, 'Клятва преданности')
assert.equal(OATH_OF_GLORY_NAME_RU, 'Клятва славы')
assert.equal(OATH_OF_THE_ANCIENTS_NAME_RU, 'Клятва древних')
assert.equal(OATH_OF_VENGEANCE_NAME_RU, 'Клятва мести')
assert.equal(BLESSED_WARRIOR_ID, 'blessed-warrior')
assert.equal(PALADIN_CLASS_SLUG_2024, 'paladin')
assert.equal(PALADIN_OATH_SLUGS_2024.devotion, 'paladin__oath-of-devotion')
assert.equal(PALADIN_OATH_SLUGS_2024.glory, 'paladin__oath-of-glory')
assert.equal(PALADIN_OATH_SLUGS_2024.ancients, 'paladin__oath-of-the-ancients')
assert.equal(PALADIN_OATH_SLUGS_2024.vengeance, 'paladin__oath-of-vengeance')
assert.equal(PALADIN_FREE_SMITE_POOL_ID, 'paladin_free_smite')
assert.equal(PALADIN_FREE_STEED_POOL_ID, 'paladin_free_steed')

/* 2014 names must not leak into the 2024 module */
const forbidden = ['Божественный канал', 'Наложение рук', 'Использование заклинаний']
for (const [key, value] of Object.entries(paladin)) {
  if (typeof value !== 'string') continue
  for (const bad of forbidden) {
    assert.ok(!value.includes(bad), `${key} uses 2014 name «${bad}»`)
  }
}
for (const label of Object.values(PALADIN_2024_CARD_BUTTONS)) {
  for (const bad of forbidden) assert.ok(!label.includes(bad))
}

/* Max tables */
assert.equal(layOnHandsMax2024(1), 5)
assert.equal(layOnHandsMax2024(9), 45)
assert.equal(layOnHandsMax2024(20), 100)
assert.equal(channelDivinityMax2024(1), 0)
assert.equal(channelDivinityMax2024(2), 0)
assert.equal(channelDivinityMax2024(3), 2)
assert.equal(channelDivinityMax2024(10), 2)
assert.equal(channelDivinityMax2024(11), 3)
assert.equal(channelDivinityMax2024(20), 3)

/* Aura radius */
assert.equal(auraProtectionRadiusFt2024(5), 0)
assert.equal(auraProtectionRadiusFt2024(6), 10)
assert.equal(auraProtectionRadiusFt2024(17), 10)
assert.equal(auraProtectionRadiusFt2024(18), 30)
assert.equal(auraProtectionRadiusFt2024(20), 30)
assert.equal(auraProtectionSaveBonus2024(4), 4)
assert.equal(auraProtectionSaveBonus2024(0), 1)
assert.equal(auraProtectionSaveBonus2024(-2), 1)

/* Formulas */
assert.equal(radiantStrikesRiderRu2024(), '+1к8 излучения')
assert.equal(inspiringSmiteTempHpFormulaRu2024(6), '2к8+6')
assert.equal(inspiringSmiteTempHpFormulaRu2024(11), '2к8+11')
assert.equal(holyNimbusDamageFormulaRu2024(4, 6), '10')
assert.equal(holyNimbusDamageFormulaRu2024(0, 2), '2')

/* Lay on Hands cost */
assert.deepEqual(evaluateLayOnHandsSpend2024({ heal: 10, paladinLevel: 5 }), { ok: true, cost: 10 })
assert.deepEqual(evaluateLayOnHandsSpend2024({ poison: true, paladinLevel: 5 }), {
  ok: true,
  cost: 5,
})
assert.deepEqual(
  evaluateLayOnHandsSpend2024({ heal: 8, poison: true, paladinLevel: 5 }),
  { ok: true, cost: 13 },
)
assert.equal(
  evaluateLayOnHandsSpend2024({
    conditions: ['frightened'],
    paladinLevel: 10,
  }).ok,
  false,
  'Restoring Touch needs L14',
)
assert.deepEqual(
  evaluateLayOnHandsSpend2024({
    conditions: ['frightened', 'blinded'],
    paladinLevel: 14,
  }),
  { ok: true, cost: 10 },
)
assert.equal(
  evaluateLayOnHandsSpend2024({
    conditions: ['poisoned'],
    paladinLevel: 14,
  }).ok,
  false,
)
assert.equal(evaluateLayOnHandsSpend2024({ heal: 0, paladinLevel: 5 }).ok, false)

/* Feature id routing */
assert.equal(paladin2024UseFeatureId('divine_sense'), 'divine-sense')
assert.equal(paladin2024UseFeatureId('paladin_free_smite'), 'free-smite')
assert.equal(paladin2024UseFeatureId('free-steed'), 'free-steed')
assert.equal(paladin2024UseFeatureId('inspiring_smite'), 'inspiring-smite')
assert.equal(paladin2024UseFeatureId('spellcasting'), null)
assert.equal(paladin2024UseFeatureId(null), null)
assert.equal(PALADIN_FEATURE_NAMES_BY_ID['abjure-foes'], 'Порицание врагов')
assert.equal(PALADIN_FEATURE_NAMES_BY_ID.peerless_athlete, 'Непревзойдённый атлет')
assert.ok(PALADIN_2024_CARD_BUTTONS['lay-on-hands'])
assert.ok(PALADIN_2024_CARD_BUTTONS.holy_nimbus)

/* Class slug / Blessed Warrior cantrips */
assert.equal(isPaladinClassSlug('paladin'), true)
assert.equal(isPaladinClassSlug('Паладин'), true)
assert.equal(isPaladinClassSlug('cleric'), false)
let picks = emptyFeaturePicks()
picks = writeBlessedWarriorCantrips2024(picks, ENTRY, ['sacred-flame', 'guidance', 'spare-the-dying'])
assert.deepEqual(readBlessedWarriorCantrips2024(picks, ENTRY), ['sacred-flame', 'guidance'])

/* Level-down drops */
const down11to10 = paladinLevelDownDrops2024(11, 10)
assert.equal(down11to10.channel_max_before, 3)
assert.equal(down11to10.channel_max_after, 2)
assert.ok(down11to10.features.some((row) => row.id === 'radiant-strikes'))
const down3to2 = paladinLevelDownDrops2024(3, 2)
assert.equal(down3to2.subclass, true)
assert.equal(down3to2.channel_max_after, 0)
const down5to4 = paladinLevelDownDrops2024(5, 4)
assert.equal(down5to4.free_steed, true)
assert.equal(down5to4.free_smite, false)

/* Apply */
function pool(poolId: string, max: number, used = 0, slug = 'paladin'): SheetResource {
  return { id: `feat:${slug}:${poolId}:${ENTRY}`, name: poolId, max, used, reset: 'long' }
}
const base = (over: Partial<Parameters<typeof applyPaladin2024FeatureUse>[0]> = {}) => ({
  featureId: 'divine-sense',
  resourceId: null,
  resources: [
    pool('channel_divinity', 2),
    pool('lay_on_hands_hp', 55),
    pool('paladin_free_smite', 1),
    pool('paladin_free_steed', 1),
    pool('glorious_defense', 3),
    pool('undying_sentinel', 1),
    pool('holy_nimbus', 1),
  ],
  classEntryId: ENTRY,
  paladinLevel: 11,
  chaMod: 4,
  proficiencyBonus: 4,
  ...over,
})
const usedOf = (r: SheetResource[], id: string) =>
  r.find((row) => row.id.includes(`:${id}:`))?.used

const sense = applyPaladin2024FeatureUse(base())
assert.ok(sense.ok)
assert.equal(usedOf(sense.resources, 'channel_divinity'), 1)
assert.ok(sense.feedLineRu.includes('Божественное чувство'))

const refund = applyPaladin2024FeatureUse(
  base({
    mode: 'refund',
    resources: [pool('channel_divinity', 2, 1)],
  }),
)
assert.ok(refund.ok)
assert.equal(usedOf(refund.resources, 'channel_divinity'), 0)

const empty = applyPaladin2024FeatureUse(base({ resources: [pool('channel_divinity', 2, 2)] }))
assert.equal(empty.ok, false)
assert.ok(empty.message)

const abjureEarly = applyPaladin2024FeatureUse(base({ featureId: 'abjure-foes', paladinLevel: 8 }))
assert.equal(abjureEarly.ok, false)
const abjure = applyPaladin2024FeatureUse(base({ featureId: 'abjure_foes', paladinLevel: 9 }))
assert.ok(abjure.ok && abjure.feedLineRu.includes('Порицание врагов'))

const inspire = applyPaladin2024FeatureUse(base({ featureId: 'inspiring-smite' }))
assert.ok(inspire.ok)
assert.equal(inspire.patches?.diceExpression, '2к8+11')

const lay = applyPaladin2024FeatureUse(
  base({
    featureId: 'lay-on-hands',
    heal: 12,
    poison: true,
    paladinLevel: 11,
  }),
)
assert.ok(lay.ok)
assert.equal(usedOf(lay.resources, 'lay_on_hands_hp'), 17)
assert.ok(lay.feedLineRu.includes('Возложение рук'))

const restoreTooEarly = applyPaladin2024FeatureUse(
  base({
    featureId: 'lay-on-hands',
    conditions: ['frightened'],
    paladinLevel: 11,
  }),
)
assert.equal(restoreTooEarly.ok, false)

const restore = applyPaladin2024FeatureUse(
  base({
    featureId: 'lay-on-hands',
    conditions: ['frightened', 'stunned'],
    paladinLevel: 14,
  }),
)
assert.ok(restore.ok)
assert.equal(usedOf(restore.resources, 'lay_on_hands_hp'), 10)

const freeSmite = applyPaladin2024FeatureUse(base({ featureId: 'paladin-free-smite' }))
assert.ok(freeSmite.ok)
assert.equal(usedOf(freeSmite.resources, 'paladin_free_smite'), 1)
const freeSmiteRefund = applyPaladin2024FeatureUse(
  base({
    featureId: 'free-smite',
    mode: 'refund',
    resources: [pool('paladin_free_smite', 1, 1)],
  }),
)
assert.ok(freeSmiteRefund.ok)
assert.equal(usedOf(freeSmiteRefund.resources, 'paladin_free_smite'), 0)

const freeSteed = applyPaladin2024FeatureUse(
  base({ featureId: 'free-steed', paladinLevel: 5 }),
)
assert.ok(freeSteed.ok && freeSteed.feedLineRu.includes('Обретение скакуна'))

const glory = applyPaladin2024FeatureUse(
  base({ featureId: 'glorious-defense', paladinLevel: 15 }),
)
assert.ok(glory.ok)
assert.equal(usedOf(glory.resources, 'glorious_defense'), 1)

const nimbus = applyPaladin2024FeatureUse(
  base({ featureId: 'holy-nimbus', paladinLevel: 20, proficiencyBonus: 6 }),
)
assert.ok(nimbus.ok)
assert.equal(usedOf(nimbus.resources, 'holy_nimbus'), 1)
assert.equal(nimbus.patches?.diceExpression, '10')

const nimbusRegain = applyPaladin2024FeatureUse(
  base({
    featureId: 'holy-nimbus',
    mode: 'regain',
    paladinLevel: 20,
    slotLevel: 5,
    slots: { '5': { max: 1, used: 0 } },
    resources: [pool('holy_nimbus', 1, 1)],
  }),
)
assert.ok(nimbusRegain.ok)
assert.equal(usedOf(nimbusRegain.resources, 'holy_nimbus'), 0)
assert.equal(nimbusRegain.slots?.['5']?.used, 1)

assert.equal(
  applyPaladin2024FeatureUse(
    base({
      featureId: 'holy-nimbus',
      mode: 'regain',
      paladinLevel: 20,
      slotLevel: 4,
      slots: { '4': { max: 1, used: 0 } },
      resources: [pool('holy_nimbus', 1, 1)],
    }),
  ).ok,
  false,
)

console.log('paladin2024Features.selfcheck: ok')
