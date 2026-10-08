/** Naparniki / companions model: HP lifecycle, revoke, name merge. */
import {
  applyHpChange,
  createCompanion,
  isCompanionDead,
  isCompanionStable,
  mergeSubclassCompanions,
  readCompanions,
  restoreCompanion,
  revokeCompanionsForSubclass,
  setCompanionActive,
} from '../src/features/characters/companions.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const dog = createCompanion({
  kind: 'other',
  nature: 'living',
  name: 'Рекс',
  stats: { hp: 11, hp_max: 11, ac: 12, speed: 40 },
  source: { kind: 'manual', labelRu: 'Вручную' },
})
assert(dog.active, 'dog starts active')

const dying = applyHpChange(dog, 0)
assert(!dying.active, '0 HP deactivates')
assert(dying.death != null, 'living gets death track')
assert(!isCompanionDead(dying), 'not dead yet')

const stable = {
  ...dying,
  death: { successes: 3, failures: 1 },
}
assert(isCompanionStable(stable), '3 successes = stable')

const dead = {
  ...dying,
  death: { successes: 1, failures: 3 },
}
assert(isCompanionDead(dead), '3 fails = dead')
assert(setCompanionActive(dead, true).active === false, 'cannot activate dead')

const healed = applyHpChange(dying, 5)
assert(healed.death == null, 'heal clears death')
assert(healed.active, 'heal reactivates')

const revived = applyHpChange(dead, 1)
assert(revived.active && revived.death == null, 'setting HP>0 clears dead state')

const cannon = createCompanion({
  kind: 'eldritch_cannon',
  name: 'Гвоздь',
  stats: { hp: 5, hp_max: 5, ac: 18, speed: 0 },
})
assert(cannon.nature === 'construct', 'cannon is construct')
const down = applyHpChange(cannon, 0)
assert(!down.active && down.death == null, 'construct dismisses without death saves')
const back = restoreCompanion(down)
assert(back.active && back.stats.hp === 5, 'restore summon/construct')

const legacy = readCompanions([
  {
    id: 'legacy-1',
    kind: 'drake',
    name: 'Искорка',
    catalog_ref: null,
    source: {
      classEntryId: 'cls-1',
      subclassSlug: 'drakewarden',
      feature: 'drake_companion',
    },
    stats: { hp: 20, ac: 14, speed: 40 },
    notes: '',
  },
])
assert(legacy[0]?.source?.kind === 'subclass', 'legacy source migrates')
assert(legacy[0]?.nature === 'living', 'drake default living')
assert(legacy[0]?.name === 'Искорка', 'name kept')

const kept = createCompanion({
  kind: 'other',
  name: 'Собака партии',
  source: { kind: 'manual', labelRu: 'Вручную' },
})
const granted = createCompanion({
  kind: 'beast_companion',
  name: 'beast_of_the_land',
  source: {
    kind: 'subclass',
    labelRu: 'Архетип: Повелитель зверей',
    classEntryId: 'cls-1',
    subclassSlug: 'beast_master',
    feature: 'companion_type',
  },
})
const afterRevoke = revokeCompanionsForSubclass(
  [kept, granted],
  'cls-1',
  'beast_master',
)
assert(afterRevoke.length === 1 && afterRevoke[0]?.name === 'Собака партии', 'manual survives revoke')

const previousNamed = createCompanion({
  id: 'stable-id',
  kind: 'beast_companion',
  name: 'Волчок',
  stats: { hp: 7, hp_max: 15, ac: 13, speed: 40 },
  notes: 'любит сыр',
  source: {
    kind: 'subclass',
    labelRu: 'Архетип: Повелитель зверей',
    classEntryId: 'cls-1',
    subclassSlug: 'beast_master',
    feature: 'companion_type',
  },
})
const reapplied = createCompanion({
  kind: 'beast_companion',
  name: 'beast_of_the_sea',
  source: {
    kind: 'subclass',
    labelRu: 'Архетип: Повелитель зверей',
    classEntryId: 'cls-1',
    subclassSlug: 'beast_master',
    feature: 'companion_type',
  },
})
const merged = mergeSubclassCompanions({
  previous: [previousNamed],
  next: [reapplied],
})
assert(merged[0]?.id === 'stable-id', 'id stable')
assert(merged[0]?.name === 'Волчок', 'custom name not overwritten')
assert(merged[0]?.stats.hp === 7, 'current HP kept')
assert(merged[0]?.notes === 'любит сыр', 'notes kept')

console.log('smoke-companions: ok')
