/**
 * Pack 09: EK/AT known table, school budget, shots, kensei, rage, luck.
 * Run: npx tsx src/shared/dnd/pack09SubclassMagic.selfcheck.ts
 */
import {
  buildCastProfiles,
  buildGrimoireShelfSources,
  catalogSpellMatchesAnyShelf,
} from './castProfiles.ts'
import {
  resolveSpellLearnBudget,
  thirdCasterAnySchoolSlots,
  thirdCasterSchoolAllows,
} from './casterProgression.ts'
import { createClassLevel } from './classLevels.ts'
import {
  resolveFeatureChoiceOptions,
  resourceIsUnlimited,
  unlockFeaturesForClasses,
} from './classFeatures.ts'
import { desiredResourcesFromFeatures } from './featureResources.ts'
import { resolveSubclassChoiceOptions, validateSubclassPicks } from './subclassGrants.ts'
import { kenseiPairError } from './kenseiWeapons.ts'
import { elementalDisciplineById } from './monkElementalDisciplines.ts'
import { applyStrokeOfLuck } from './strokeOfLuck.ts'
import { syncPrimalChampion } from './primalChampion.ts'
import { WILD_SURGE_TABLE } from './wildMagicSurge.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const ek = (level: number) =>
  resolveSpellLearnBudget({
    classes: [
      createClassLevel({
        name: 'Воин',
        level,
        subclass_name: 'Мистический рыцарь',
      }),
    ],
    abilityModFor: () => 3,
  })

const at = (level: number) =>
  resolveSpellLearnBudget({
    classes: [
      createClassLevel({
        name: 'Плут',
        level,
        subclass_name: 'Мистический ловкач',
      }),
    ],
    abilityModFor: () => 3,
  })

assert(ek(3)?.leveledKnown === 3, 'EK 3 knows 3 spells')
assert(ek(3)?.cantrips === 2, 'EK 3 chooses 2 cantrips')
assert(ek(8)?.leveledKnown === 6, 'EK 8 knows 6')
assert(ek(14)?.leveledKnown === 10, 'EK 14 knows 10')
assert(ek(20)?.leveledKnown === 13, 'EK 20 knows 13')
assert(ek(20)?.cantrips === 3, 'EK 20 chooses 3 cantrips')
assert(at(3)?.leveledKnown === 3 && at(20)?.leveledKnown === 13, 'AT uses the same table')
assert(thirdCasterAnySchoolSlots(3) === 1, 'one any-school spell at 3')
assert(thirdCasterAnySchoolSlots(8) === 2, 'any-school grows at 8')
assert(thirdCasterAnySchoolSlots(20) === 4, 'four any-school slots at 20')
assert(
  thirdCasterSchoolAllows({
    level: 1,
    school: 'necromancy',
    restrictedSchools: ['abjuration', 'evocation'],
    anySchoolUsed: 0,
    anySchoolSlots: 1,
  }),
  'empty list can take an any-school spell',
)
assert(
  !thirdCasterSchoolAllows({
    level: 1,
    school: 'necromancy',
    restrictedSchools: ['abjuration', 'evocation'],
    anySchoolUsed: 1,
    anySchoolSlots: 1,
  }),
  'second any-school spell is over budget',
)
assert(
  thirdCasterSchoolAllows({
    level: 1,
    school: 'evocation',
    restrictedSchools: ['abjuration', 'evocation'],
    anySchoolUsed: 1,
    anySchoolSlots: 1,
  }),
  'restricted school stays open',
)

const ekProfiles = buildCastProfiles({
  classes: [
    createClassLevel({
      id: 'ek',
      name: 'Воин',
      level: 3,
      subclass_name: 'Мистический рыцарь',
    }),
  ],
  abilityModFor: () => 2,
  proficiencyBonus: 2,
})
const shelves = buildGrimoireShelfSources(ekProfiles)
assert(shelves.length === 1 && shelves[0]?.listSlug === 'wizard', 'EK shelf is the wizard list')
assert(
  catalogSpellMatchesAnyShelf(['wizard'], 1, shelves),
  '1st-level wizard spell is on the EK shelf at 3',
)
assert(
  !catalogSpellMatchesAnyShelf(['wizard'], 2, shelves),
  '2nd-level spell is above EK 3',
)
assert(catalogSpellMatchesAnyShelf(['wizard'], 0, shelves), 'cantrips are on the shelf')
const ek20 = buildGrimoireShelfSources(
  buildCastProfiles({
    classes: [
      createClassLevel({
        name: 'Воин',
        level: 20,
        subclass_name: 'Мистический рыцарь',
      }),
    ],
    abilityModFor: () => 5,
    proficiencyBonus: 6,
  }),
)
assert(catalogSpellMatchesAnyShelf(['wizard'], 4, ek20), 'EK 20 reaches 4th level')
assert(!catalogSpellMatchesAnyShelf(['wizard'], 5, ek20), 'EK 20 does not reach 5th')

const shots = resolveSubclassChoiceOptions('arcane_shots')
assert(Array.isArray(shots) && shots.length === 8, 'eight arcane shots')
const weapons = resolveSubclassChoiceOptions('kensei_eligible')
assert(Array.isArray(weapons) && weapons.length > 2, 'kensei catalog is not a stub')
assert(kenseiPairError(['longsword', 'longbow']) == null, 'melee plus ranged is legal')
assert(kenseiPairError(['longsword', 'rapier']) != null, 'two melee weapons are not the level-3 pair')

const disciplines = resolveFeatureChoiceOptions({
  id: 'elemental_disciplines',
  label_ru: 'Дисциплины',
  options_from: 'monk_elemental_disciplines',
})
assert(disciplines.includes('wave_of_rolling_earth'), 'wave exists in the catalog')
assert(
  (elementalDisciplineById('wave_of_rolling_earth')?.minLevel ?? 0) > 3,
  'wave requires a higher level',
)

const rage20 = unlockFeaturesForClasses({
  classes: [createClassLevel({ id: 'barb', name: 'Варвар', level: 20 })],
  characterLevel: 20,
})
const rage = rage20.find((row) => row.id === 'rage')
assert(rage && resourceIsUnlimited(rage.resource, 20), 'rage is unlimited at 20')
assert(!resourceIsUnlimited(rage?.resource, 17), 'rage is still limited at 17')
const pools = desiredResourcesFromFeatures({
  features: rage20,
  characterLevel: 20,
  classSlugByEntryId: { barb: 'barbarian' },
})
assert(pools.some((row) => row.unlimited && row.name.includes('Ярость')), 'rage pool flag')

const luck = unlockFeaturesForClasses({
  classes: [createClassLevel({ id: 'rogue', name: 'Плут', level: 20 })],
  characterLevel: 20,
})
assert(luck.some((row) => row.id === 'stroke_of_luck' && row.resource?.pool_id), 'luck has a pool')
assert(
  applyStrokeOfLuck('Проверка · Сила: 8 (d20:3 +5)') ===
    'Проверка · Сила: 25 (d20:20 +5 · удача, было 8)',
  'check d20 becomes 20 and the modifier stays',
)
assert(
  applyStrokeOfLuck('Молот: 12 (d20:10 +2) · урон 7 (1d8: 5+2)')?.includes('попадание (удача)'),
  'attack miss can be marked a hit',
)
assert(applyStrokeOfLuck('Спас · Сила: 8 (d20:3 +5)') == null, 'saves are not luck')

const champ = syncPrimalChampion(
  {
    classes: [createClassLevel({ id: 'barb', name: 'Варвар', level: 20 })],
    abilities: { str: 16, con: 15 },
    primalChampion: null,
  },
  { str: 24, con: 24 },
)
assert(champ.abilities.str === 20 && champ.abilities.con === 19, '16/15 become 20/19')
assert(champ.primalChampion?.str === 4 && champ.primalChampion.con === 4, 'ledger is +4/+4')

assert(WILD_SURGE_TABLE.length === 8, 'wild surge table has 8 rows')
assert(
  validateSubclassPicks(
    {
      slug: 'way_of_the_kensei',
      labelRu: 'Кэнсэй',
      nameEn: 'Kensei',
      parentSlug: 'monk',
      grantsLevel: 3,
      source: 'xge',
      sheetGrants: {
        armor: [],
        weapons: { simple: false, martial: false, extras: [] },
        toolsFixed: [],
        skillsFixed: [],
        languagesFixed: [],
        skillChoices: null,
        languageChoices: null,
        caster: null,
      },
      choices: [
        {
          id: 'kensei_weapons',
          labelRu: 'Оружие',
          kind: 'multi',
          count: 2,
          from: weapons as string[],
          appliesTo: 'sheet_field',
          required: true,
        },
      ],
      alwaysPreparedSpells: [],
      featuresByLevel: {},
    },
    { values: { kensei_weapons: ['longsword', 'rapier'] } },
  ) != null,
  'setup rejects two melee kensei weapons',
)

const shadow = unlockFeaturesForClasses({
  classes: [
    createClassLevel({
      id: 'monk',
      name: 'Монах',
      level: 3,
      subclass_name: 'Путь тени',
    }),
  ],
  characterLevel: 3,
  subclassSlugByEntryId: { monk: 'way_of_shadow' },
})
const shadowActs = shadow.filter((row) => row.id.startsWith('shadow_arts_'))
assert(shadowActs.length === 4, 'four shadow arts actions')
assert(shadowActs.every((row) => row.resource?.pool_id === 'ki' && row.resource.spend_cost === 2), 'each costs 2 ki')

console.log('pack09SubclassMagic.selfcheck: ok')
