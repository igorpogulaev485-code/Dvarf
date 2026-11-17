/** Run: npx tsx src/shared/dnd/druid2024Features.selfcheck.ts */
import assert from 'node:assert/strict'
import * as druid from './druid2024Features'
import {
  applyDruid2024FeatureUse,
  druid2024CardFormulaRu,
  landChoiceByEntryId2024,
  landTerrainChoice2024,
  potentSpellcastingForSheet2024,
  resetDruid2024PicksOnLongRestAll,
  ARCHDRUID_NAME_RU,
  BEAST_SPELLS_NAME_RU,
  beastSpellsActive2024,
  DRUID_2024_CARD_BUTTONS,
  druid2024UseFeatureId,
  elementalFuryChoice2024,
  ELEMENTAL_FURY_NAME_RU,
  isBeastFormAllowed2024,
  knownFormsBudget2024,
  landsAidFormulaRu2024,
  landTerrainNameRu2024,
  LAND_TERRAINS_2024,
  LONGEVITY_NAME_RU,
  magicianExtraCantrips2024,
  magicianSkillBonus2024,
  moonMaxCr2024,
  EVERGREEN_WILD_SHAPE_NAME_RU,
  NATURE_MAGICIAN_NAME_RU,
  potentSpellcastingCantripBonus2024,
  potentSpellcastingRangeBonusFt2024,
  PRIMAL_ORDER_MAGICIAN,
  PRIMAL_ORDER_NAME_RU,
  PRIMAL_ORDER_WARDEN,
  PRIMAL_STRIKE_NAME_RU,
  primalStrikeDice2024,
  primalStrikeFormulaRu2024,
  POTENT_SPELLCASTING_NAME_RU,
  readElementalFury2024,
  readPrimalOrder2024,
  resetDruid2024PicksOnLongRest,
  restWildShape2024,
  returnWildShapeUses2024,
  spendWildShapeUse2024,
  starryFormFormulaRu2024,
  wardenGrants2024,
  wildResurgenceSlotUsed2024,
  wildShapeArmorClass2024,
  wildShapeLimits2024,
  wildShapeTempHp2024,
  wildShapeUsesMax2024,
  wrathOfTheSeaFormulaRu2024,
  WRATH_OF_THE_SEA_NAME_RU,
  WILD_RESURGENCE_NAME_RU,
  WILD_SHAPE_NAME_RU,
} from './druid2024Features'
import { featureChoiceOptionLabel } from './featureChoiceOptionLabel'
import { emptyFeaturePicks, getFeatureChoicePick, setFeaturePick } from './featurePicks'
import type { SheetResource } from './rest'

const ENTRY = 'entry-druid'
const MOON = 'druid__moon'
const LAND = 'druid__land'

/* Names (next.dnd.su) */
assert.equal(PRIMAL_ORDER_NAME_RU, 'Природный орден')
assert.equal(druid.PRIMAL_ORDER_MAGICIAN_NAME_RU, 'Ведун')
assert.equal(druid.PRIMAL_ORDER_WARDEN_NAME_RU, 'Страж')
assert.equal(WILD_SHAPE_NAME_RU, 'Дикий облик')
assert.equal(ELEMENTAL_FURY_NAME_RU, 'Ярость стихий')
assert.equal(POTENT_SPELLCASTING_NAME_RU, 'Мощные заклинания')
assert.equal(PRIMAL_STRIKE_NAME_RU, 'Природный удар')
assert.equal(BEAST_SPELLS_NAME_RU, 'Звериные заклинания')
assert.equal(ARCHDRUID_NAME_RU, 'Архидруид')
assert.equal(NATURE_MAGICIAN_NAME_RU, 'Природный ворожей')
assert.equal(EVERGREEN_WILD_SHAPE_NAME_RU, 'Неувядающий дикий облик')
assert.equal(WRATH_OF_THE_SEA_NAME_RU, 'Гнев морей')
assert.equal(LONGEVITY_NAME_RU, 'Долголетие')

/* 2014 names must not leak into the 2024 module */
const forbidden = ['Изначальный указ', 'Могущественные заклинания']
for (const [key, value] of Object.entries(druid)) {
  if (typeof value !== 'string') continue
  for (const bad of forbidden) {
    assert.ok(!value.includes(bad), `${key} uses 2014 name «${bad}»`)
  }
}
for (const label of Object.values(DRUID_2024_CARD_BUTTONS)) {
  for (const bad of forbidden) assert.ok(!label.includes(bad))
}

/* Primal Order */
assert.equal(PRIMAL_ORDER_MAGICIAN, 'magician')
assert.equal(PRIMAL_ORDER_WARDEN, 'warden')
assert.deepEqual(
  druid.PRIMAL_ORDER_OPTIONS_2024.map((row) => [row.id, row.nameRu]),
  [
    ['magician', 'Ведун'],
    ['warden', 'Страж'],
  ],
)
assert.deepEqual(magicianSkillBonus2024(4), { nature: 4, arcana: 4 })
assert.deepEqual(magicianSkillBonus2024(0), { nature: 1, arcana: 1 })
assert.deepEqual(magicianSkillBonus2024(-2), { nature: 1, arcana: 1 })
assert.equal(magicianExtraCantrips2024(), 1)
assert.deepEqual(wardenGrants2024(), {
  martialWeapons: true,
  mediumArmor: true,
  heavyArmor: false,
  weaponMastery: false,
})
assert.equal(readPrimalOrder2024({ primal_order: 'magician' }), 'magician')
assert.equal(readPrimalOrder2024({ primal_order: 'WARDEN' }), 'warden')
assert.equal(readPrimalOrder2024({ primal_order: 'protector' }), null)
assert.equal(readPrimalOrder2024(null), null)
assert.equal(
  readPrimalOrder2024(setFeaturePick(emptyFeaturePicks(), ENTRY, 'primal_order', 'warden'), ENTRY),
  'warden',
)
assert.equal(
  readPrimalOrder2024(setFeaturePick(emptyFeaturePicks(), ENTRY, 'primal-order', 'magician'), ENTRY),
  'magician',
)
assert.equal(
  readPrimalOrder2024(setFeaturePick(emptyFeaturePicks(), ENTRY, 'primal_order', 'magician')),
  'magician',
)

/* Wild Shape uses table 2@2, 3@6, 4@17 */
const usesTable: Array<[number, number]> = [
  [1, 0], [2, 2], [5, 2], [6, 3], [16, 3], [17, 4], [20, 4],
]
for (const [level, uses] of usesTable) assert.equal(wildShapeUsesMax2024(level), uses, `uses L${level}`)

/* Known forms 4@2, 6@4, 8@8 */
const formsTable: Array<[number, number]> = [
  [1, 0], [2, 4], [3, 4], [4, 6], [7, 6], [8, 8], [20, 8],
]
for (const [level, forms] of formsTable) assert.equal(knownFormsBudget2024(level), forms, `forms L${level}`)

/* CR / fly / swim */
const l2 = wildShapeLimits2024(2, LAND)
assert.deepEqual([l2.uses, l2.knownForms, l2.crMax, l2.crLabelRu, l2.flyAllowed, l2.swimAllowed], [2, 4, 0.25, '1/4', false, true])
const l4 = wildShapeLimits2024(4, null)
assert.deepEqual([l4.knownForms, l4.crMax, l4.crLabelRu, l4.flyAllowed, l4.swimAllowed], [6, 0.5, '1/2', false, true])
const l8 = wildShapeLimits2024(8, 'druid__sea')
assert.deepEqual([l8.knownForms, l8.crMax, l8.crLabelRu, l8.flyAllowed, l8.swimAllowed], [8, 1, '1', true, true])
assert.equal(wildShapeLimits2024(1, null).knownForms, 0)
assert.equal(wildShapeLimits2024(1, null).swimAllowed, true)
assert.equal(wildShapeLimits2024(2, null).keepOwnHp, true)
assert.equal(isBeastFormAllowed2024({ cr: 0.25 }, 2), true)
assert.equal(isBeastFormAllowed2024({ cr: 0.5 }, 2), false)
assert.equal(isBeastFormAllowed2024({ cr: 0.25, fly: true }, 2), false)
assert.equal(isBeastFormAllowed2024({ cr: 0.25, fly: true }, 7), false)
assert.equal(isBeastFormAllowed2024({ cr: 1, fly: true }, 8), true)
assert.equal(isBeastFormAllowed2024({ cr: 0.25 }, 1), false)

/* Moon: CR = floor(level/3), temp HP = 3 × level, AC = max(beast AC, 13 + Wis) */
assert.equal(moonMaxCr2024(3), 1)
assert.equal(moonMaxCr2024(8), 2)
assert.equal(moonMaxCr2024(9), 3)
assert.equal(moonMaxCr2024(20), 6)
assert.equal(wildShapeLimits2024(9, MOON).crMax, 3)
assert.equal(wildShapeLimits2024(9, MOON).crLabelRu, '3')
assert.equal(wildShapeLimits2024(9, MOON).moon, true)
assert.equal(wildShapeLimits2024(9, LAND).crMax, 1)
assert.equal(wildShapeLimits2024(20, MOON).crMax, 6)
assert.equal(wildShapeTempHp2024(5, MOON), 15)
assert.equal(wildShapeTempHp2024(5, LAND), 5)
assert.equal(wildShapeTempHp2024(5, null), 5)
assert.equal(wildShapeTempHp2024(1, MOON), 0)
assert.equal(wildShapeArmorClass2024(11, 4, MOON), 17)
assert.equal(wildShapeArmorClass2024(18, 4, MOON), 18)
assert.equal(wildShapeArmorClass2024(11, 4, LAND), 11)

/* Elemental Fury */
assert.equal(elementalFuryChoice2024.id, 'elemental-fury')
assert.deepEqual(elementalFuryChoice2024.options, ['potent_spellcasting', 'primal_strike'])
assert.equal(
  featureChoiceOptionLabel('potent_spellcasting', elementalFuryChoice2024),
  'Мощные заклинания',
)
assert.equal(featureChoiceOptionLabel('primal_strike', elementalFuryChoice2024), 'Природный удар')
assert.equal(primalStrikeDice2024(6), 0)
assert.equal(primalStrikeDice2024(7), 1)
assert.equal(primalStrikeDice2024(14), 1)
assert.equal(primalStrikeDice2024(15), 2)
assert.equal(primalStrikeFormulaRu2024(15), '2к8')
assert.equal(primalStrikeFormulaRu2024(6), '')
assert.equal(potentSpellcastingCantripBonus2024(4, 6), 0)
assert.equal(potentSpellcastingCantripBonus2024(4, 7), 4)
assert.equal(potentSpellcastingCantripBonus2024(-1, 7), 0)
assert.equal(potentSpellcastingRangeBonusFt2024(14), 0)
assert.equal(potentSpellcastingRangeBonusFt2024(15), 300)
{
  const created = {
    values: { 'class-druid:elemental_fury': 'primal_strike', 'class-druid:elemental-fury': 'primal_strike' },
  }
  assert.equal(readElementalFury2024(created, 'class-druid'), 'primal_strike')
  assert.equal(
    readElementalFury2024(emptyFeaturePicks(), 'class-druid', { elemental_fury: 'potent_spellcasting' }),
    'potent_spellcasting',
  )
  assert.equal(readElementalFury2024(emptyFeaturePicks(), 'class-druid', {}), null)
  assert.equal(readElementalFury2024(emptyFeaturePicks(), 'class-druid', { elemental_fury: 'x' }), null)
  assert.equal(
    getFeatureChoicePick(created, 'class-druid', 'elemental_fury', elementalFuryChoice2024.id),
    'primal_strike',
  )
  const potent = { values: { 'class-druid:elemental_fury': 'potent_spellcasting' } }
  const classes = [{ id: 'class-druid', name: 'Друид', level: 11 }]
  assert.equal(
    druid.druidPotentSpellcastingBonusForSheet2024({ rulesEdition: '2024', classes, featurePicks: potent, wisScore: 17 }),
    3,
  )
  assert.equal(
    druid.druidPotentSpellcastingBonusForSheet2024({ rulesEdition: '2014', classes, featurePicks: potent, wisScore: 17 }),
    0,
  )
  assert.equal(
    druid.druidPotentSpellcastingBonusForSheet2024({ rulesEdition: '2024', classes, featurePicks: created, wisScore: 17 }),
    0,
  )
}

/* Beast Spells / Archdruid */
assert.equal(beastSpellsActive2024(17), false)
assert.equal(beastSpellsActive2024(18), true)
assert.equal(druid.archdruidActive2024(19), false)
assert.equal(druid.archdruidActive2024(20), true)
assert.equal(druid.natureMagicianSlotLevel2024(2), 4)

/* Land terrains */
assert.deepEqual(
  LAND_TERRAINS_2024.map((row) => [row.id, row.nameRu]),
  [
    ['arid', 'Засушливая'],
    ['polar', 'Полярная'],
    ['temperate', 'Умеренная'],
    ['tropical', 'Тропическая'],
  ],
)
assert.equal(landTerrainNameRu2024('polar'), 'Полярная')
assert.equal(landTerrainNameRu2024('x'), '')

/* Lands Aid 2d6@3, 3d6@10, 4d6@14 */
assert.equal(landsAidFormulaRu2024(2), '')
assert.equal(landsAidFormulaRu2024(3), '2к6')
assert.equal(landsAidFormulaRu2024(9), '2к6')
assert.equal(landsAidFormulaRu2024(10), '3к6')
assert.equal(landsAidFormulaRu2024(13), '3к6')
assert.equal(landsAidFormulaRu2024(14), '4к6')

/* Wrath of the Sea: Wis mod d6, min 1 */
assert.equal(wrathOfTheSeaFormulaRu2024(4), '4к6')
assert.equal(wrathOfTheSeaFormulaRu2024(0), '1к6')
assert.equal(wrathOfTheSeaFormulaRu2024(-2), '1к6')

/* Starry form: 1d8+Wis, 2d8+Wis at 10+ */
assert.equal(starryFormFormulaRu2024(2, 3), '')
assert.equal(starryFormFormulaRu2024(3, 3), '1к8+3')
assert.equal(starryFormFormulaRu2024(9, 3), '1к8+3')
assert.equal(starryFormFormulaRu2024(10, 3), '2к8+3')
assert.deepEqual(druid.STARRY_FORMS_2024.map((row) => row.id), ['archer', 'chalice', 'dragon'])

/* Feature id routing */
assert.equal(druid2024UseFeatureId('wild_shape'), 'wild-shape')
assert.equal(druid2024UseFeatureId('wild_resurgence'), 'wild-resurgence')
assert.equal(druid2024UseFeatureId('nature-magician'), 'nature-magician')
assert.equal(druid2024UseFeatureId('spellcasting'), null)
assert.equal(druid2024UseFeatureId(null), null)

/* Apply */
function pool(poolId: string, max: number, used = 0, slug = 'druid'): SheetResource {
  return { id: `feat:${slug}:${poolId}:${ENTRY}`, name: poolId, max, used, reset: 'long' }
}
const base = (over: Partial<Parameters<typeof applyDruid2024FeatureUse>[0]> = {}) => ({
  featureId: 'wild-shape',
  resourceId: null,
  resources: [pool('wild_shape', 3), pool('nature_magician', 1)],
  classEntryId: ENTRY,
  druidLevel: 6,
  subclassSlug: LAND as string | null,
  wisMod: 4,
  ...over,
})
const usedOf = (r: SheetResource[], id: string) => r.find((row) => row.id.includes(`:${id}:`))?.used

const ws = applyDruid2024FeatureUse(base())
assert.ok(ws.ok)
assert.equal(usedOf(ws.resources, 'wild_shape'), 1)
assert.equal(ws.patches?.tempHp, 6)
assert.equal(ws.patches?.keepOwnHp, true)
assert.equal(ws.patches?.armorClass, undefined)
assert.ok(ws.feedLineRu.includes('свои хиты'))

const wsMoon = applyDruid2024FeatureUse(base({ subclassSlug: MOON, druidLevel: 9, beastAc: 12 }))
assert.ok(wsMoon.ok)
assert.equal(wsMoon.patches?.tempHp, 27)
assert.equal(wsMoon.patches?.armorClass, 17)
assert.equal(wsMoon.patches?.keepOwnHp, true)

assert.equal(applyDruid2024FeatureUse(base({ druidLevel: 1 })).ok, false)
const wsEmpty = applyDruid2024FeatureUse(base({ resources: [pool('wild_shape', 2, 2)] }))
assert.equal(wsEmpty.ok, false)
assert.ok(wsEmpty.message)

/* Wild Resurgence */
const emptyPool = [pool('wild_shape', 3, 3)]
const slotToShape = applyDruid2024FeatureUse(
  base({ featureId: 'wild-resurgence', mode: 'slot-to-shape', slotLevel: 2, resources: emptyPool, druidLevel: 5 }),
)
assert.ok(slotToShape.ok)
assert.equal(usedOf(slotToShape.resources, 'wild_shape'), 2)
assert.equal(slotToShape.patches?.spendSlotLevel, 2)
assert.equal(
  applyDruid2024FeatureUse(
    base({ featureId: 'wild-resurgence', mode: 'slot-to-shape', resources: [pool('wild_shape', 3, 1)], druidLevel: 5 }),
  ).ok,
  false,
  'only when WS empty',
)
assert.equal(
  applyDruid2024FeatureUse(
    base({
      featureId: 'wild-resurgence',
      mode: 'slot-to-shape',
      resources: emptyPool,
      druidLevel: 5,
      resurgenceUsedThisTurn: true,
    }),
  ).ok,
  false,
  '1/turn',
)
assert.equal(
  applyDruid2024FeatureUse(base({ featureId: 'wild-resurgence', mode: 'slot-to-shape', druidLevel: 4, resources: emptyPool })).ok,
  false,
  'needs level 5',
)
const shapeToSlot = applyDruid2024FeatureUse(base({ featureId: 'wild-resurgence', mode: 'shape-to-slot', druidLevel: 5 }))
assert.ok(shapeToSlot.ok)
assert.equal(usedOf(shapeToSlot.resources, 'wild_shape'), 1)
assert.equal(shapeToSlot.patches?.gainSlotLevel, 1)
const lockedPicks = shapeToSlot.patches!.featurePicks!
assert.equal(wildResurgenceSlotUsed2024(lockedPicks, ENTRY), true)
assert.equal(
  applyDruid2024FeatureUse(
    base({ featureId: 'wild-resurgence', mode: 'shape-to-slot', druidLevel: 5, featurePicks: lockedPicks }),
  ).ok,
  false,
  '1/long',
)
assert.equal(wildResurgenceSlotUsed2024(resetDruid2024PicksOnLongRest(lockedPicks, ENTRY), ENTRY), false)
assert.equal(resetDruid2024PicksOnLongRest(emptyFeaturePicks(), ENTRY).values[`${ENTRY}:wild_resurgence_slot_used`], undefined)
assert.equal(WILD_RESURGENCE_NAME_RU, 'Дикое восстановление')

/* Evergreen Wild Shape (L20): regain 1 on initiative if empty */
const evergreen = applyDruid2024FeatureUse(
  base({ featureId: 'evergreen-wild-shape', druidLevel: 20, resources: [pool('wild_shape', 4, 4)] }),
)
assert.ok(evergreen.ok)
assert.equal(usedOf(evergreen.resources, 'wild_shape'), 3)
assert.equal(
  applyDruid2024FeatureUse(base({ featureId: 'evergreen-wild-shape', druidLevel: 20, resources: [pool('wild_shape', 4, 3)] })).ok,
  false,
  'only when empty',
)
assert.equal(
  applyDruid2024FeatureUse(base({ featureId: 'evergreen-wild-shape', druidLevel: 19, resources: [pool('wild_shape', 3, 3)] })).ok,
  false,
)

/* Nature Magician (L20): 2 slot levels per WS use, 1/long */
const nm = applyDruid2024FeatureUse(
  base({
    featureId: 'nature-magician',
    druidLevel: 20,
    usesToConvert: 2,
    resources: [pool('wild_shape', 4, 1), pool('nature_magician', 1)],
  }),
)
assert.ok(nm.ok)
assert.equal(usedOf(nm.resources, 'wild_shape'), 3)
assert.equal(usedOf(nm.resources, 'nature_magician'), 1)
assert.equal(nm.patches?.gainSlotLevel, 4)
assert.equal(
  applyDruid2024FeatureUse(
    base({
      featureId: 'nature-magician',
      druidLevel: 20,
      usesToConvert: 1,
      resources: [pool('wild_shape', 4, 0), pool('nature_magician', 1, 1)],
    }),
  ).ok,
  false,
  '1/long',
)
assert.equal(
  applyDruid2024FeatureUse(
    base({ featureId: 'nature-magician', druidLevel: 20, usesToConvert: 4, resources: [pool('wild_shape', 4, 3)] }),
  ).ok,
  false,
  'not enough uses',
)
assert.equal(
  applyDruid2024FeatureUse(base({ featureId: 'nature-magician', druidLevel: 19, usesToConvert: 1 })).ok,
  false,
)

/* Subclass use: Lands Aid / Wrath of the Sea / Starry Form */
const aid = applyDruid2024FeatureUse(base({ featureId: 'lands-aid', druidLevel: 10 }))
assert.ok(aid.ok && aid.feedLineRu.includes('3к6') && aid.patches?.damageType === 'necrotic')
assert.equal(usedOf(aid.resources, 'wild_shape'), 1)
const aidHeal = applyDruid2024FeatureUse(base({ featureId: 'lands-aid', druidLevel: 14, mode: 'heal' }))
assert.ok(aidHeal.ok && aidHeal.feedLineRu.includes('4к6') && aidHeal.patches?.damageType === undefined)
const wrath = applyDruid2024FeatureUse(base({ featureId: 'wrath-of-the-sea', druidLevel: 3 }))
assert.ok(wrath.ok && wrath.feedLineRu.includes('4к6') && wrath.patches?.damageType === 'cold')
assert.equal(applyDruid2024FeatureUse(base({ featureId: 'starry-form', druidLevel: 3 })).ok, false)
const archer = applyDruid2024FeatureUse(base({ featureId: 'starry-form', mode: 'archer', druidLevel: 10 }))
assert.ok(archer.ok && archer.feedLineRu.includes('2к8+4'))
assert.equal(archer.patches?.featurePicks?.values[`${ENTRY}:starry_form_active`], 'archer')
const chalice = applyDruid2024FeatureUse(base({ featureId: 'starry-form', mode: 'chalice', druidLevel: 3 }))
assert.ok(chalice.ok && chalice.feedLineRu.includes('1к8+4'))

/* Rest / spend / return helpers */
{
  const rows = [pool('wild_shape', 3, 3)]
  const short = restWildShape2024(rows, 'short', ENTRY)
  assert.equal(usedOf(short, 'wild_shape'), 2)
  assert.equal(usedOf(restWildShape2024(short, 'short', ENTRY), 'wild_shape'), 1)
  assert.equal(usedOf(restWildShape2024(rows, 'long', ENTRY), 'wild_shape'), 0)
  assert.equal(usedOf(restWildShape2024([pool('wild_shape', 3, 0)], 'short', ENTRY), 'wild_shape'), 0)
  assert.equal(usedOf(returnWildShapeUses2024(rows, 1, ENTRY), 'wild_shape'), 2)
  const spent = spendWildShapeUse2024([pool('wild_shape', 2, 1)], ENTRY)
  assert.ok(spent.ok && usedOf(spent.resources, 'wild_shape') === 2)
  assert.equal(spendWildShapeUse2024([pool('wild_shape', 2, 2)], ENTRY).ok, false)
  assert.equal(spendWildShapeUse2024([], ENTRY).ok, false)
}

/* Card formulas, land terrain choice, long-rest upkeep */
assert.equal(druid2024CardFormulaRu({ featureId: 'lands_aid', druidLevel: 10, wisMod: 3 }), '3к6')
assert.equal(druid2024CardFormulaRu({ featureId: 'wrath-of-the-sea', druidLevel: 3, wisMod: 0 }), '1к6')
assert.equal(
  druid2024CardFormulaRu({
    featureId: 'elemental_fury',
    druidLevel: 15,
    wisMod: 3,
    elementalFury: 'primal_strike',
  }),
  '2к8',
)
assert.equal(
  druid2024CardFormulaRu({
    featureId: 'elemental_fury',
    druidLevel: 15,
    wisMod: 3,
    elementalFury: 'potent_spellcasting',
  }),
  '',
)
assert.deepEqual(landTerrainChoice2024.options, ['arid', 'polar', 'temperate', 'tropical'])
assert.equal(landTerrainChoice2024.id, 'circle_spells_land')
{
  const picks = setFeaturePick({ values: {} }, ENTRY, 'circle_spells_land', 'polar')
  assert.deepEqual(landChoiceByEntryId2024([{ id: ENTRY }, { id: 'other' }], picks), {
    [ENTRY]: 'polar',
    other: null,
  })
  assert.equal(
    landChoiceByEntryId2024([{ id: ENTRY }], { values: {} }, { land_choice: 'tropical' })[ENTRY],
    'tropical',
  )
  assert.equal(landChoiceByEntryId2024([{ id: ENTRY }], setFeaturePick({ values: {} }, ENTRY, 'circle_spells_land', 'arctic'))[ENTRY], null)
  const locked = setFeaturePick(
    setFeaturePick({ values: {} }, ENTRY, 'wild_resurgence_slot_used', 'on'),
    ENTRY,
    'nature_magician_spent',
    'on',
  )
  assert.deepEqual(resetDruid2024PicksOnLongRestAll(locked), { values: {} })
}
{
  const nm = applyDruid2024FeatureUse({
    featureId: 'nature-magician',
    resourceId: null,
    resources: [pool('wild_shape', 2, 0)],
    classEntryId: ENTRY,
    druidLevel: 20,
    usesToConvert: 1,
    featurePicks: { values: {} },
  })
  assert.ok(nm.ok)
  assert.equal(nm.patches?.featurePicks?.values[`${ENTRY}:nature_magician_spent`], 'on')
  const again = applyDruid2024FeatureUse({
    featureId: 'nature-magician',
    resourceId: null,
    resources: [pool('wild_shape', 2, 0)],
    classEntryId: ENTRY,
    druidLevel: 20,
    usesToConvert: 1,
    featurePicks: nm.patches?.featurePicks,
  })
  assert.equal(again.ok, false)
}
assert.deepEqual(
  potentSpellcastingForSheet2024({
    rulesEdition: '2024',
    classes: [{ id: ENTRY, name: 'Друид', level: 7 }],
    featurePicks: setFeaturePick({ values: {} }, ENTRY, 'elemental_fury', 'potent_spellcasting'),
    wisScore: 16,
  }),
  { bonus: 3, classSlug: 'druid' },
)
assert.equal(
  potentSpellcastingForSheet2024({
    rulesEdition: '2014',
    classes: [{ id: ENTRY, name: 'Друид', level: 7 }],
    featurePicks: setFeaturePick({ values: {} }, ENTRY, 'elemental_fury', 'potent_spellcasting'),
    wisScore: 16,
  }).bonus,
  0,
)

console.log('druid2024Features.selfcheck: ok')
