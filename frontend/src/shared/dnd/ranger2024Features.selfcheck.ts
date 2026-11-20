/** Run: npx tsx --tsconfig tsconfig.app.json src/shared/dnd/ranger2024Features.selfcheck.ts */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as ranger from './ranger2024Features'
import {
  applyRanger2024FeatureUse,
  ASI_NAME_RU,
  DEFENSIVE_TACTICS_OPTIONS_2024,
  DRUIDIC_WARRIOR_CANTRIP_LIMIT_2024,
  DRUIDIC_WARRIOR_ID,
  DRUIDIC_WARRIOR_NAME_RU,
  DREAD_AMBUSHER_STRIKE_POOL_ID,
  EPIC_BOON_NAME_RU,
  EXTRA_ATTACK_NAME_RU,
  FAVORED_ENEMY_NAME_RU,
  FAVORED_ENEMY_POOL_ID,
  FERAL_SENSES_NAME_RU,
  FOE_SLAYER_NAME_RU,
  HUNTERS_MARK_NAME_RU,
  HUNTERS_PREY_OPTIONS_2024,
  huntersMarkExtraDie2024,
  isDruidicWarriorStyleId,
  isRelentlessHunterActive,
  hasFeralSensesBlindsight,
  listRangerFeaturesForLeveling,
  NATURES_VEIL_NAME_RU,
  NATURES_VEIL_POOL_ID,
  PRECISE_HUNTER_NAME_RU,
  PRIMAL_COMPANION_TYPES_2024,
  RANGER_CLASS_SLUG_2024,
  RANGER_FEATURE_NAMES_BY_ID,
  RANGER_SUBCLASS_SLUGS_2024,
  isPrimalCompanionType2024,
  primalCompanionStats2024,
  readDruidicWarriorCantrips2024,
  readPrimalCompanionType2024,
  RELENTLESS_HUNTER_NAME_RU,
  rovingClimbSwimEqualsSpeed,
  rovingSpeedBonusFt,
  SPELLCASTING_NAME_RU,
  TIRELESS_NAME_RU,
  TIRELESS_POOL_ID,
  tirelessTempHpFormulaRu2024,
  WEAPON_MASTERY_NAME_RU,
  writeDruidicWarriorCantrips2024,
} from './ranger2024Features'
import { emptyFeaturePicks, setFeaturePick } from './featurePicks'
import type { SheetResource } from './rest'

const ENTRY = 'entry-ranger'

assert.equal(SPELLCASTING_NAME_RU, 'Сотворение заклинаний')
assert.equal(FAVORED_ENEMY_NAME_RU, 'Избранный враг')
assert.equal(HUNTERS_MARK_NAME_RU, 'Метка охотника')
assert.equal(WEAPON_MASTERY_NAME_RU, 'Оружейное мастерство')
assert.equal(DRUIDIC_WARRIOR_NAME_RU, 'Воин-друид')
assert.equal(EXTRA_ATTACK_NAME_RU, 'Дополнительная атака')
assert.equal(TIRELESS_NAME_RU, 'Неутомимость')
assert.equal(RELENTLESS_HUNTER_NAME_RU, 'Неустанный охотник')
assert.equal(NATURES_VEIL_NAME_RU, 'Природная завеса')
assert.equal(PRECISE_HUNTER_NAME_RU, 'Меткий охотник')
assert.equal(FERAL_SENSES_NAME_RU, 'Звериные чувства')
assert.equal(EPIC_BOON_NAME_RU, 'Эпический дар')
assert.equal(FOE_SLAYER_NAME_RU, 'Истребитель врагов')
assert.equal(ASI_NAME_RU, 'Увеличение характеристик')
assert.equal(DRUIDIC_WARRIOR_ID, 'druidic-warrior')
assert.equal(FAVORED_ENEMY_POOL_ID, 'favored_enemy_uses')
assert.equal(TIRELESS_POOL_ID, 'tireless_uses')
assert.equal(NATURES_VEIL_POOL_ID, 'natures_veil_uses')
assert.equal(DREAD_AMBUSHER_STRIKE_POOL_ID, 'dread_ambusher_strike')
assert.equal(RANGER_CLASS_SLUG_2024, 'ranger')
assert.equal(RANGER_SUBCLASS_SLUGS_2024.hunter, 'ranger__hunter-ranger')
assert.equal(RANGER_SUBCLASS_SLUGS_2024.beastmaster, 'ranger__beastmaster')
assert.equal(RANGER_SUBCLASS_SLUGS_2024.feyWanderer, 'ranger__fey-wanderer')
assert.equal(RANGER_SUBCLASS_SLUGS_2024.gloomStalker, 'ranger__gloom-stalker')
assert.equal(RANGER_FEATURE_NAMES_BY_ID['favored-enemy'], 'Избранный враг')
assert.equal(RANGER_FEATURE_NAMES_BY_ID.dread_ambusher, 'Угроза из засады')

assert.equal(huntersMarkExtraDie2024(19), 'd6')
assert.equal(huntersMarkExtraDie2024(20), 'd10')
assert.equal(isRelentlessHunterActive(12), false)
assert.equal(isRelentlessHunterActive(13), true)
assert.equal(hasFeralSensesBlindsight(17), false)
assert.equal(hasFeralSensesBlindsight(18), true)

assert.equal(rovingSpeedBonusFt({ rangerLevel: 5, wearingHeavyArmor: false }), 0)
assert.equal(rovingSpeedBonusFt({ rangerLevel: 6, wearingHeavyArmor: false }), 10)
assert.equal(rovingSpeedBonusFt({ rangerLevel: 12, wearingHeavyArmor: true }), 0)
assert.equal(rovingClimbSwimEqualsSpeed({ rangerLevel: 6, wearingHeavyArmor: false }), true)
assert.equal(rovingClimbSwimEqualsSpeed({ rangerLevel: 6, wearingHeavyArmor: true }), false)

assert.equal(tirelessTempHpFormulaRu2024(3), '1к8+3')
assert.equal(tirelessTempHpFormulaRu2024(-2), '1к8+1')

const preyIds = HUNTERS_PREY_OPTIONS_2024.map((row) => row.id)
assert.ok(preyIds.includes('colossus_slayer'))
assert.ok(preyIds.includes('horde_breaker'))
assert.ok(!preyIds.includes('giant_slayer'))
assert.ok(!preyIds.includes('giant_killer'))

const defIds = DEFENSIVE_TACTICS_OPTIONS_2024.map((row) => row.id)
assert.ok(defIds.includes('escape_the_horde'))
assert.ok(defIds.includes('multiattack_defense'))
assert.ok(!defIds.includes('steel_will'))

assert.deepEqual(
  PRIMAL_COMPANION_TYPES_2024.map((row) => row.nameRu),
  ['Земной', 'Морской', 'Небесный'],
)
assert.equal(isPrimalCompanionType2024('land'), true)
assert.equal(isPrimalCompanionType2024('beast_of_the_land'), false)

const land5 = primalCompanionStats2024({ type: 'land', rangerLevel: 5, wisMod: 3 })
assert.equal(land5.ac, 16)
assert.equal(land5.hp, 30)
assert.equal(land5.speed, 40)
assert.equal(land5.speedClimb, 40)

const sea5 = primalCompanionStats2024({ type: 'sea', rangerLevel: 5, wisMod: 2 })
assert.equal(sea5.hp, 30)
assert.equal(sea5.speedSwim, 60)

const sky5 = primalCompanionStats2024({ type: 'sky', rangerLevel: 5, wisMod: 2 })
assert.equal(sky5.hp, 24)
assert.equal(sky5.speedFly, 60)

let picksPrimal = emptyFeaturePicks()
picksPrimal = setFeaturePick(picksPrimal, ENTRY, 'primal_companion', 'sea')
assert.equal(readPrimalCompanionType2024(picksPrimal, ENTRY), 'sea')

const l1 = listRangerFeaturesForLeveling(1).map((row) => row.id)
assert.ok(l1.includes('favored-enemy'))
assert.ok(l1.includes('spellcasting'))
const l10 = listRangerFeaturesForLeveling(10)
assert.equal(l10.length, 1)
assert.equal(l10[0]?.id, 'tireless')
assert.equal(l10[0]?.nameRu, TIRELESS_NAME_RU)
assert.deepEqual(listRangerFeaturesForLeveling(7), [{ id: 'subclass-feature', nameRu: 'Умение подкласса', unlockLevel: 7 }])

assert.equal(isDruidicWarriorStyleId('druidic-warrior'), true)
assert.equal(isDruidicWarriorStyleId('druidic_warrior'), true)
assert.equal(isDruidicWarriorStyleId('archery'), false)
let picks = emptyFeaturePicks()
picks = writeDruidicWarriorCantrips2024(picks, ENTRY, ['guidance', 'druidcraft', 'mending'])
assert.deepEqual(readDruidicWarriorCantrips2024(picks, ENTRY), ['guidance', 'druidcraft'].slice(0, DRUIDIC_WARRIOR_CANTRIP_LIMIT_2024))

const exportNames = Object.keys(ranger)
assert.ok(
  !exportNames.some((key) => key.toLowerCase().includes('first_turn_extra')),
  'no 2014 first-turn extra attack export',
)
const moduleText = readFileSync(
  fileURLToPath(new URL('./ranger2024Features.ts', import.meta.url)),
  'utf8',
)
assert.ok(!moduleText.includes('first_turn_extra_attack'))
assert.ok(!moduleText.includes('first_turn_extra'))

function pool(poolId: string, max: number, used = 0, slug = 'ranger'): SheetResource {
  return { id: `feat:${slug}:${poolId}:${ENTRY}`, name: poolId, max, used, reset: 'long' }
}

const base = (over: Partial<Parameters<typeof applyRanger2024FeatureUse>[0]> = {}) => ({
  featureId: 'tireless',
  resourceId: null,
  resources: [
    pool(FAVORED_ENEMY_POOL_ID, 2),
    pool(TIRELESS_POOL_ID, 3),
    pool(NATURES_VEIL_POOL_ID, 3),
    pool(DREAD_AMBUSHER_STRIKE_POOL_ID, 2),
  ],
  classEntryId: ENTRY,
  rangerLevel: 11,
  abilities: { wis: 16 },
  ...over,
})

const usedOf = (r: SheetResource[], id: string) =>
  r.find((row) => row.id.includes(`:${id}:`))?.used

const tireless = applyRanger2024FeatureUse(base())
assert.ok(tireless.ok)
assert.equal(usedOf(tireless.resources, TIRELESS_POOL_ID), 1)
assert.equal(tireless.patches?.diceExpression, '1к8+3')
assert.ok(tireless.feedLineRu.includes('Неутомимость'))

const tirelessEarly = applyRanger2024FeatureUse(base({ rangerLevel: 9 }))
assert.equal(tirelessEarly.ok, false)

const veil = applyRanger2024FeatureUse(base({ featureId: 'natures_veil', rangerLevel: 14 }))
assert.ok(veil.ok && usedOf(veil.resources, NATURES_VEIL_POOL_ID) === 1)

const mark = applyRanger2024FeatureUse(base({ featureId: 'favored-enemy' }))
assert.ok(mark.ok && mark.feedLineRu.includes('Метка охотника'))
assert.equal(usedOf(mark.resources, FAVORED_ENEMY_POOL_ID), 1)

const markRefund = applyRanger2024FeatureUse(
  base({
    featureId: 'favored-enemy',
    refund: true,
    resources: [pool(FAVORED_ENEMY_POOL_ID, 2, 1)],
  }),
)
assert.ok(markRefund.ok)
assert.equal(usedOf(markRefund.resources, FAVORED_ENEMY_POOL_ID), 0)

const dread = applyRanger2024FeatureUse(base({ featureId: 'dread_ambusher_strike', rangerLevel: 5 }))
assert.ok(dread.ok)
assert.equal(usedOf(dread.resources, DREAD_AMBUSHER_STRIKE_POOL_ID), 1)

const exhausted = applyRanger2024FeatureUse(
  base({ resources: [pool(TIRELESS_POOL_ID, 1, 1)] }),
)
assert.equal(exhausted.ok, false)
assert.ok(exhausted.message)

console.log('ranger2024Features.selfcheck: ok')