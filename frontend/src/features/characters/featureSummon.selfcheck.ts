/**
 * Lightweight self-check: npx --yes tsx src/features/characters/featureSummon.selfcheck.ts
 */
import { unlockFeaturesForClasses } from '../../shared/dnd/classFeatures.ts'
import {
  applyFeatureSummon,
  featureSummonId,
  readCompanions,
} from './companions.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const unlocked = unlockFeaturesForClasses({
  classes: [
    {
      id: 'druid-1',
      name: 'Друид',
      catalog_id: null,
      level: 6,
      subclass_name: 'Круг дикого огня',
      subclass_catalog_id: null,
    },
  ],
  characterLevel: 6,
  abilities: { wis: 16 },
  subclassSlugByEntryId: { 'druid-1': 'circle_of_wildfire' },
})

const summonFeat = unlocked.find((row) => row.id === 'summon_wildfire_spirit')
assert(summonFeat, 'wildfire summon feature unlocked')
assert(summonFeat.summon, 'summon block parsed')
assert(summonFeat.summon.kind === 'ally', 'kind=ally (напарник)')
assert(summonFeat.summon.name_ru === 'Дух дикого огня', 'name')
assert(summonFeat.summon.hp_base === 10 && summonFeat.summon.hp_per_level === 5, 'hp formula')
assert(summonFeat.summon.ac === 13, 'ac 13')
assert(Boolean(summonFeat.summon.actions_ru?.trim()), 'actions prefilled')

const companions = applyFeatureSummon({
  companions: [],
  classEntryId: summonFeat.classEntryId,
  subclassSlug: 'circle_of_wildfire',
  featureId: summonFeat.id,
  classLevel: 6,
  summon: {
    kind: summonFeat.summon.kind,
    nameRu: summonFeat.summon.name_ru,
    notesRu: summonFeat.summon.notes_ru,
    actionsRu: summonFeat.summon.actions_ru,
    ac: summonFeat.summon.ac,
    speed: summonFeat.summon.speed,
    hpBase: summonFeat.summon.hp_base,
    hpPerLevel: summonFeat.summon.hp_per_level,
  },
})
assert(companions.length === 1, 'one ally card')
assert(companions[0]!.kind === 'ally', 'stored as ally')
assert(companions[0]!.stats.hp === 10 + 5 * 6, 'hp = 10+5×level (TCoE)')
assert(companions[0]!.stats.ac === 13, 'ac filled')
assert(companions[0]!.stats.speed === 30, 'speed filled')
assert(Boolean(companions[0]!.actions?.trim()), 'actions on card')
assert(
  companions[0]!.id === featureSummonId(summonFeat.classEntryId, summonFeat.id),
  'stable summon id',
)

const replaced = applyFeatureSummon({
  companions,
  classEntryId: summonFeat.classEntryId,
  subclassSlug: 'circle_of_wildfire',
  featureId: summonFeat.id,
  classLevel: 6,
  summon: {
    kind: 'ally',
    nameRu: 'Дух дикого огня',
    hpBase: 10,
    hpPerLevel: 5,
    ac: 13,
    speed: 30,
    actionsRu: 'Пламенная атака',
  },
})
assert(replaced.length === 1, 're-summon replaces, no duplicates')

const roundTrip = readCompanions(replaced)
assert(roundTrip[0]?.kind === 'ally', 'persist ally kind')

console.log(
  'featureSummon.selfcheck: ok (wildfire → напарник ally; hp 10+5×lvl; actions; replace)',
)
