/**
 * Pack 06: druid circles, grants, texts, proficiencies.
 * Run: npx tsx src/shared/dnd/pack06DruidCircles.selfcheck.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClassLevel } from './classLevels.ts'
import {
  classGrantDef,
  DRUID_PHB_WEAPONS,
  packageForMode,
  skillOptionsForPackage,
} from './classGrants.ts'
import { unlockFeaturesForClasses } from './classFeatures.ts'
import { desiredResourcesFromFeatures } from './featureResources.ts'
import {
  conjureAnimalsCounts,
  conjureFeyCrMax,
  summonCastPreview,
  tceSpiritStats,
} from './summonSpellPreview.ts'
import { resolveCastEffectSummary } from './spellCatalog.ts'
import { syncDruidCircleSpells, landCircleSpells } from '../../features/characters/druidCircleSpells.ts'
import { withDruidicLanguage } from '../../features/characters/languagesTools.ts'
import { reconcileDruidStartWeapons } from '../../features/characters/classEffects.ts'
import { alwaysPreparedSpellNameRu } from './alwaysPreparedSpellNamesRu.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const here = dirname(fileURLToPath(import.meta.url))
function featureAt(level: number, slug: string, id: string) {
  const row = createClassLevel({ id: 'druid-1', name: 'Друид', level, subclass_name: slug })
  const rows = unlockFeaturesForClasses({
    classes: [row],
    characterLevel: level,
    subclassSlugByEntryId: { [row.id]: slug },
  })
  const found = rows.find((item) => item.id === id)
  assert(found, `${id} at ${level}`)
  return found
}

const balm = featureAt(9, 'circle_of_dreams', 'balm_of_the_summer_court')
assert(balm.resourceUses === 9, `balm pool ${balm.resourceUses}`)
assert(balm.resource?.uses_from === 'class_level', 'balm from druid level')
assert(balm.resource?.per_use_cap === 'half_class_level', 'balm per-use cap')
assert(/не снимает/i.test(balm.summary_ru), 'balm states it does not remove exhaustion')
assert(!/снятие/i.test(balm.summary_ru), 'balm does not promise exhaustion removal')
assert(/временн/i.test(balm.summary_ru), 'balm temp hp')

const star = featureAt(9, 'circle_of_stars', 'star_map')
assert(star.resourceUses === 4, `guiding bolt uses ${star.resourceUses}`)
assert(star.resource?.uses_from === 'proficiency_bonus', 'star map from PB')
assert(/бонусу мастерства/i.test(star.summary_ru), 'star map text uses PB')
assert(alwaysPreparedSpellNameRu('Guidance') === 'Указание', 'one Guidance translation')

const timeless = featureAt(18, 'circle_of_the_land', 'timeless_body')
assert(/10 лет/i.test(timeless.summary_ru), 'timeless body 10:1')
assert(!/иммунитет/i.test(timeless.summary_ru), 'no magical aging immunity')

const beast = featureAt(18, 'circle_of_the_moon', 'beast_spells')
assert(/нельзя/i.test(beast.summary_ru), 'beast spells deny materials')
assert(/Архидруид/i.test(beast.summary_ru), 'archdruid exception stays at 20')

const speech = featureAt(2, 'circle_of_the_shepherd', 'speech_of_the_woods')
assert(/Сильван/i.test(speech.summary_ru), 'sylvan')
assert(!/speak with animals/i.test(speech.summary_ru), 'no extra spell required')

const guard = featureAt(10, 'circle_of_the_shepherd', 'guardian_spirit')
assert(/конце своего хода/i.test(guard.summary_ru), 'end of turn')
assert(!/начале хода/i.test(guard.summary_ru), 'not start of turn')
assert(guard.scaleValue === '5 хитов в конце хода призванных зверей и фей', guard.scaleValue ?? '')

const stride = featureAt(6, 'circle_of_the_land', 'lands_stride')
assert(/немагическ/i.test(stride.summary_ru), 'nonmagical terrain')
assert(/шипами/i.test(stride.summary_ru), 'thorns')

const sanctuary = featureAt(14, 'circle_of_the_land', 'natures_sanctuary')
assert(/24 часа/i.test(sanctuary.summary_ru), '24 hours')
assert(/промахивается/i.test(sanctuary.summary_ru), 'auto miss')

const druidic = featureAt(1, 'circle_of_the_land', 'druidic')
assert(/Сл 15/i.test(druidic.summary_ru), 'perception DC 15')
assert(/без магии/i.test(druidic.summary_ru), 'cannot decipher without magic')

const pools = desiredResourcesFromFeatures({
  features: [balm, star],
  characterLevel: 9,
})
assert(pools.find((row) => row.id.includes('balm'))?.max === 9, 'resource max is druid level')
assert(pools.find((row) => row.id.includes('star_map'))?.max === 4, 'resource max is PB')

const underdark = landCircleSpells('underdark').filter((row) => row.fromClassLevel === 5)
assert(underdark.map((row) => row.name).join(',') === 'Gaseous Form,Stinking Cloud', 'underdark 5')
assert(underdark.every((row) => row.level === 3), 'both are 3rd-level spells')

const druidGrant = classGrantDef('druid')
assert(druidGrant, 'druid grant')
const start = packageForMode(druidGrant, 'start')
assert(!start.weapons.includes('simple'), 'not every simple weapon')
assert(start.weaponExtras.join('|') === DRUID_PHB_WEAPONS.join('|'), 'ten weapons')
const skills = skillOptionsForPackage(start)
assert(skills.length === 8 && skills.includes('arcana'), `skills ${skills.join(',')}`)

const reconciled = reconcileDruidStartWeapons({
  classGrants: [
    {
      classEntryId: 'druid-1',
      slug: 'druid',
      mode: 'start',
      saves: [],
      skills: [],
      tools: [],
      armorKeys: [],
      weaponKeys: ['simple'],
      weaponExtras: ['Ятаган'],
      level1Hp: null,
      equipmentPackageId: null,
      equipmentItemIds: [],
      equipmentAttackIds: [],
      equipmentCoinsGp: 0,
    },
  ],
  weapons: { simple: true, martial: false, extras: ['Ятаган'] },
})
assert(reconciled.changed, 'old simple category is rewritten')
assert(reconciled.weapons.simple === false, 'simple category cleared')
assert(reconciled.weapons.extras.includes('Серп'), 'sickle')
assert(!reconciled.weapons.extras.includes('Ручной топор'), 'handaxe stays off the list')

const languages = withDruidicLanguage(['Общий', 'Сильван'], true)
assert(languages.changed && languages.languages.includes('Друидический'), 'druidic on the sheet')
assert(!withDruidicLanguage(languages.languages, true).changed, 'druidic once')

const animals = conjureAnimalsCounts(9)
assert(animals.multiplier === 4 && animals.cr2 === 4 && animals.crQuarter === 32, 'animals x4')
assert(conjureFeyCrMax(9) === 9, 'fey CR 9')
const beastSpirit = tceSpiritStats('beast', 9)
assert(
  beastSpirit.ac === 20 && beastSpirit.hp === 65 && beastSpirit.hpAlt === 55 && beastSpirit.attacks === 4,
  'beast spirit',
)
const preview = summonCastPreview({ name: 'Призыв животных', level: 3 }, 9)
assert(preview?.lines.some((line) => line.includes('32')), 'cast preview counts')
const summary = resolveCastEffectSummary(
  { name: 'Призыв феи', level: 6 },
  { characterLevel: 17, slotLevel: 9 },
)
assert(summary.lines.some((line) => /КР ≤9/.test(line)), summary.lines.join(' | '))

const synced = syncDruidCircleSpells({
  spells: {
    casting_ability: 'wis',
    max_prepared: null,
    slots: {},
    pact_slots: null,
    known: [],
    has_spell_focus: false,
    has_component_pouch: false,
  },
  classes: [{ id: 'druid-1', name: 'Друид', level: 3, subclass_name: 'Круг земли' }],
  subclassSlugByEntryId: { 'druid-1': 'circle_of_the_land' },
  featurePicks: { values: { 'druid-1:circle_spells_land': 'arctic' } },
})
assert(
  synced.spells.known.some((row) => row.name === 'Удержание личности' || /удержан/i.test(row.name)),
  `arctic spells ${synced.spells.known.map((row) => row.name).join(', ')}`,
)

const seed = JSON.parse(
  readFileSync(join(here, '../../../../backend/data/classes/subclass_catalog_seed_2014.json'), 'utf8'),
) as { classes: Array<{ parent_slug?: string; subclasses?: Array<{ slug?: string; always_prepared_spells?: Array<{ name: string; from_class_level?: number; requires_choice?: { value?: string } }> }> }> }
const land = seed.classes
  .find((row) => row.parent_slug === 'druid')
  ?.subclasses?.find((row) => row.slug === 'circle_of_the_land')
const at5 = (land?.always_prepared_spells ?? []).filter(
  (row) => row.requires_choice?.value === 'underdark' && row.from_class_level === 5,
)
assert(at5.map((row) => row.name).join(',') === 'Gaseous Form,Stinking Cloud', 'seed underdark')

console.log('pack06DruidCircles.selfcheck: ok')
