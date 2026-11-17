/** PHB 2024 Beast Master primal companion — npm run selfcheck:primal-companion-2024 */
import assert from 'node:assert/strict'
import { createClassLevel } from '../../shared/dnd/classLevels'
import { emptyFeaturePicks, setFeaturePick } from '../../shared/dnd/featurePicks'
import { resolveCompanionTemplate } from './companionTemplates'
import { syncPrimalCompanion2024 } from './primalCompanion2024'

const ENTRY = 'ranger-1'

const landTce = resolveCompanionTemplate({
  choiceId: 'companion_type',
  pickValue: 'beast_of_the_land',
  ctx: { hostClassLevel: 5, characterLevel: 5, rulesEdition: '2014' },
})
assert.ok(landTce)
assert.match(landTce.notes, /TCE/)

const land2024 = resolveCompanionTemplate({
  choiceId: 'primal-companion',
  pickValue: 'land',
  ctx: { hostClassLevel: 5, characterLevel: 5, hostWisMod: 3, rulesEdition: '2024' },
})
assert.ok(land2024)
assert.equal(land2024.stats.ac, 16)
assert.equal(land2024.stats.hp_max, 30)
assert.match(land2024.notes, /PHB 2024/)

for (const type of ['land', 'sea', 'sky'] as const) {
  const tpl = resolveCompanionTemplate({
    choiceId: 'primal-companion',
    pickValue: type,
    ctx: { hostClassLevel: 3, characterLevel: 3, hostWisMod: 2, rulesEdition: '2024' },
  })
  assert.ok(tpl, type)
}

const classes = [
  createClassLevel({
    id: ENTRY,
    name: 'Следопыт',
    catalog_id: 'ranger',
    level: 5,
    subclass_catalog_id: 'ranger__beastmaster',
  }),
]
const picks = setFeaturePick(emptyFeaturePicks(), ENTRY, 'primal_companion', 'land')
const synced = syncPrimalCompanion2024({
  companions: [],
  classes,
  featurePicks: picks,
  rulesEdition: '2024',
  characterLevel: 5,
  wisMod: 3,
})
assert.equal(synced.changed, true)
assert.equal(synced.companions.length, 1)
assert.equal(synced.companions[0]!.kind, 'primal_companion')
assert.equal(synced.companions[0]!.stats.ac, 16)
assert.equal(synced.companions[0]!.stats.hp_max, 30)

console.log('primalCompanion2024.selfcheck ok')