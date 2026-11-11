/**
 * Run: npx --yes tsx --tsconfig tsconfig.app.json src/features/characters/pack07Druid.selfcheck.ts
 */
import { featureResourceId, spendPoolUses } from '../../shared/dnd/featureResources.ts'
import { resourceIsUnlimited } from '../../shared/dnd/classFeatures.ts'
import { unlockFeaturesForClasses } from '../../shared/dnd/classFeatures.ts'
import { applyArcaneRecovery } from '../../shared/dnd/arcaneRecovery.ts'
import { wildfireSpiritHp } from './bestiaryCompanionStats.ts'
import {
  applyBeastWildShape,
  formatWildShapeLimit,
  physicalScoresForPick,
  resolveWildShapeOptions,
  wildShapeCastBlock,
  wildShapeLimits,
  ELEMENTAL_FALLBACK_STATS,
  type BestiaryFormPick,
} from './wildShape.ts'
import { createCompanion } from './companions.ts'
import {
  concentrationEndNotice,
  dismissCompanionsForEndedConcentration,
} from './spellCompanions.ts'
import { symbioticNecroticRider } from './featureCombatBonuses.ts'
import { FIND_FAMILIAR_BEAST_SLUGS, FIND_FAMILIAR_FALLBACK_PICKS } from './familiarForms.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(wildfireSpiritHp(9) === 50, 'spirit hp 9 → 50')
assert(wildfireSpiritHp(20) === 105, 'spirit hp 20 → 105')
assert(wildfireSpiritHp(6) === 35, 'spirit hp 6 → 35')

const moon6 = wildShapeLimits({ druidLevel: 6, subclassSlug: 'circle_of_the_moon' })
assert(moon6.maxCr === 2 && moon6.allowSwim && !moon6.allowFly, 'moon 6 CR 2 swim')
assert(formatWildShapeLimit(moon6).includes('CR 2'), 'moon 6 label')
const moon2 = wildShapeLimits({ druidLevel: 2, subclassSlug: 'circle_of_the_moon' })
assert(moon2.maxCr === 1 && !moon2.allowSwim && !moon2.allowFly, 'moon 2 CR 1')
const moon8 = wildShapeLimits({ druidLevel: 8, subclassSlug: 'circle_of_the_moon' })
assert(moon8.maxCr === 2 && moon8.allowFly, 'moon 8 fly')
const moon9 = wildShapeLimits({ druidLevel: 9, subclassSlug: 'circle_of_the_moon' })
assert(moon9.maxCr === 3, 'moon 9 CR 3')
const moon18 = wildShapeLimits({ druidLevel: 18, subclassSlug: 'circle_of_the_moon' })
assert(moon18.maxCr === 6 && moon18.allowFly, 'moon 18 CR 6 fly')

const bear = physicalScoresForPick({
  slug: 'brown_bear',
  name_ru: 'Бурый медведь',
})
assert(bear?.str === 19 && bear.dex === 10 && bear.con === 16, 'brown bear STR 19')

const air = ELEMENTAL_FALLBACK_STATS.air
assert(air?.speed_fly === 90 && air.speed_walk === 0, 'air fly 90')
const airPick: BestiaryFormPick = {
  slug: 'air_elemental',
  name_ru: 'Воздушный элементаль',
  ...air!,
}
const shaped = applyBeastWildShape({
  companions: [],
  knownForms: [],
  pick: airPick,
  hostHp: 20,
  hostHpMax: 20,
  druidLevel: 10,
  formSource: 'elemental_wild_shape',
})
assert(shaped.companions[0]?.stats.speed_fly === 90, 'card keeps fly')
assert((shaped.companions[0]?.notes || '').includes('полёт 90'), 'notes mention fly')
assert(shaped.companions[0]?.stats.str === 14, 'air STR stored')

const bearForm = applyBeastWildShape({
  companions: [],
  knownForms: [],
  pick: {
    slug: 'brown_bear',
    name_ru: 'Бурый медведь',
    cr: '1',
    type: 'beast',
    ac: 11,
    hp: 34,
    speed_walk: 40,
    actions_text: 'Укус и когти.',
  },
  hostHp: 20,
  hostHpMax: 20,
  druidLevel: 2,
})
assert(bearForm.companions[0]?.stats.str === 19, 'bear form STR 19')

const blocked = wildShapeCastBlock({
  companions: bearForm.companions,
  classes: [{ name: 'Друид', level: 2 }],
  classSlug: 'druid',
  material: '',
})
assert(blocked?.includes('Звериных заклинаний'), 'level 2 cast blocked')
assert(
  wildShapeCastBlock({
    companions: bearForm.companions,
    classes: [{ name: 'Друид', level: 18 }],
    classSlug: 'druid',
    material: 'веточка омелы',
  })?.includes('материальн'),
  'level 18 material blocked',
)
assert(
  wildShapeCastBlock({
    companions: bearForm.companions,
    classes: [{ name: 'Друид', level: 20 }],
    classSlug: 'druid',
    material: 'веточка омелы',
  }) == null,
  'archdruid ignores free M',
)
assert(
  wildShapeCastBlock({
    companions: [],
    classes: [{ name: 'Друид', level: 2 }],
    classSlug: 'druid',
  }) == null,
  'no form, cast allowed',
)

const poolId = featureResourceId('druid', 'wild_shape', 'c1')
const spent = spendPoolUses({
  resources: [
    {
      id: poolId,
      name: 'Дикий облик',
      max: 2,
      used: 2,
      reset: 'short',
      unlimited: true,
    },
  ],
  classSlug: 'druid',
  poolId: 'wild_shape',
  classEntryId: 'c1',
  amount: 2,
  label: 'элементаль',
})
assert(spent.ok && spent.resources[0]?.used === 0, 'unlimited spend does not deplete')

const unlocked = unlockFeaturesForClasses({
  classes: [
    {
      id: 'c1',
      name: 'Друид',
      catalog_id: null,
      level: 20,
      subclass_name: 'Круг луны',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 20,
  abilities: { wis: 16 },
  subclassSlugByEntryId: { c1: 'circle_of_the_moon' },
})
const wild = unlocked.find((row) => row.id === 'wild_shape')
assert(wild && resourceIsUnlimited(wild.resource, 20), 'archdruid flag')
assert(!resourceIsUnlimited(wild?.resource, 19), 'still limited at 19')
const options = resolveWildShapeOptions({
  features: unlocked,
  resources: spent.resources,
  classSlug: 'druid',
  classEntryId: 'c1',
})
assert(options.some((row) => row.id === 'beast_form' && !row.disabled), 'beast stays open')
assert(
  options.some((row) => row.id === 'elemental_wild_shape' && !row.disabled),
  'elemental stays open at 0 shown uses',
)

const elemental = createCompanion({
  name: 'Призванный элементаль',
  kind: 'other',
  role: 'ally',
  nature: 'summoned',
  active: true,
  stats: { hp: 90, hp_max: 90, ac: 15, speed: 0, speed_fly: 90 },
  source: { kind: 'spell', labelRu: 'Призыв элементаля', feature: 'spell:conjure_elemental' },
})
const dropped = dismissCompanionsForEndedConcentration({
  companions: [elemental],
  ended: { spell_id: 'spell-1', name: 'Призыв элементаля' },
})
assert(dropped.hostileNames.length === 1, 'elemental stays named hostile')
assert(dropped.dismissedNames.length === 0, 'not dismissed inactive')
assert(dropped.companions[0]?.active === true, 'card stays active')
assert((dropped.companions[0]?.stats.hp ?? 0) > 0, 'hp not zeroed')
assert((dropped.companions[0]?.notes || '').includes('1 час'), 'one hour')
const notice = concentrationEndNotice(dropped)
assert(notice?.includes('враждебен') && !notice.includes('неактивен'), 'toast is hostile')

const slots = { '5': { max: 1, used: 1 }, '6': { max: 1, used: 1 } }
const recovered = applyArcaneRecovery({ slots, wizardLevel: 9, recoverByLevel: { 5: 1 } })
assert(recovered.ok && recovered.slots['5']?.used === 0, 'natural recovery restores 5th')
const tooHigh = applyArcaneRecovery({ slots, wizardLevel: 9, recoverByLevel: { 6: 1 } })
assert(!tooHigh.ok, 'no 6+')

assert(
  symbioticNecroticRider({
    features: [{ id: 'symbiotic_entity' }],
    resources: [{ id: 'feat:druid:symbiotic_entity:c1', activeLabel: 'Симбиотическая сущность · 10 мин' }],
    hpTemp: 40,
  })?.dice === '1d6',
  'symbiotic rider',
)
assert(
  symbioticNecroticRider({
    features: [{ id: 'symbiotic_entity' }],
    resources: [{ id: 'feat:druid:symbiotic_entity:c1', activeLabel: 'Симбиотическая сущность · 10 мин' }],
    hpTemp: 0,
  }) == null,
  'rider off without temp hp',
)

assert(FIND_FAMILIAR_BEAST_SLUGS.length === 15, '15 familiar forms')
assert(
  ['spider', 'rat', 'octopus'].every((slug) => FIND_FAMILIAR_FALLBACK_PICKS[slug]),
  'missing forms have fallbacks',
)

console.log('pack07Druid.selfcheck: ok')
