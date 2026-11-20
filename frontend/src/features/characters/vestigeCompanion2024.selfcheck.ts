/** AU 2024 Vestige companion — npm run selfcheck:vestige-companion-2024 */
import assert from 'node:assert/strict'
import { createClassLevel } from '../../shared/dnd/classLevels'
import { emptyClassOptions2024 } from '../../shared/dnd/edition2024ClassOptions'
import { emptyFeaturePicks } from '../../shared/dnd/featurePicks'
import { parseCompanionActionAttacks } from './companionAttacks'
import { revokeFalseSubclassCompanions } from './companions'
import {
  DIVINE_POWER_RESOURCE_ID,
  restoreVestigeDivinePowerOnCompanions,
  syncVestigeCompanion2024,
} from './vestigeCompanion2024'

const ENTRY = 'warlock-1'

const classes = [
  createClassLevel({
    id: ENTRY,
    name: 'Колдун',
    catalog_id: 'warlock',
    level: 5,
    subclass_catalog_id: 'warlock__vestige-patron',
  }),
]

const synced = syncVestigeCompanion2024({
  companions: [],
  classes,
  featurePicks: emptyFeaturePicks(),
  classOptions2024: { ...emptyClassOptions2024(), vestige_companion_type: 'fiend' },
  rulesEdition: '2024',
  characterLevel: 5,
  chaMod: 3,
})
assert.equal(synced.changed, true)
assert.equal(synced.companions.length, 1)
assert.equal(synced.companions[0]!.kind, 'ally')
assert.equal(synced.companions[0]!.source?.feature, 'vestige-companion')
assert.equal(synced.companions[0]!.stats.ac, 16)
assert.equal(synced.companions[0]!.stats.hp_max, 4 + 5 * 4)
assert.equal(synced.companions[0]!.resources[0]?.id, DIVINE_POWER_RESOURCE_ID)
assert.equal(synced.companions[0]!.resources[0]?.reset, 'long')
assert.match(synced.companions[0]!.actions, /Удар предтечи/)
assert.match(synced.companions[0]!.actions, /Божественная сила/)
assert.match(synced.companions[0]!.notes, /Божественная сила/)

// revokeFalseSubclassCompanions must keep vestige (feature matches companion heuristic).
const afterRevoke = revokeFalseSubclassCompanions(synced.companions)
assert.equal(afterRevoke.length, 1)
assert.equal(afterRevoke[0]!.source?.feature, 'vestige-companion')

// Attack chip name must stay «Удар предтечи» (no «попадание» split).
const atks = parseCompanionActionAttacks(synced.companions[0]!, {
  characterLevel: 5,
  spellMod: 3,
})
assert.ok(
  atks.some((a) => /Удар предтечи/i.test(a.name)),
  `attack names: ${atks.map((a) => a.name).join(',')}`,
)

const l6 = syncVestigeCompanion2024({
  companions: synced.companions,
  classes: [
    createClassLevel({
      id: ENTRY,
      name: 'Колдун',
      catalog_id: 'warlock',
      level: 6,
      subclass_catalog_id: 'warlock__vestige-patron',
    }),
  ],
  featurePicks: emptyFeaturePicks(),
  classOptions2024: { ...emptyClassOptions2024(), vestige_companion_type: 'celestial' },
  rulesEdition: '2024',
  characterLevel: 6,
  chaMod: 4,
})
assert.equal(l6.companions[0]!.resources[0]?.reset, 'short')
assert.match(l6.companions[0]!.notes, /Магической искусностью/)

const spent = {
  ...l6.companions[0]!,
  resources: l6.companions[0]!.resources.map((r) =>
    r.id === DIVINE_POWER_RESOURCE_ID ? { ...r, used: 1 } : r,
  ),
}
const restored = restoreVestigeDivinePowerOnCompanions([spent])
assert.equal(restored.changed, true)
assert.equal(restored.companions[0]!.resources[0]!.used, 0)

const drop = syncVestigeCompanion2024({
  companions: l6.companions,
  classes: [
    createClassLevel({
      id: ENTRY,
      name: 'Колдун',
      catalog_id: 'warlock',
      level: 5,
      subclass_catalog_id: 'warlock__fiend-patron',
    }),
  ],
  featurePicks: emptyFeaturePicks(),
  classOptions2024: { ...emptyClassOptions2024(), vestige_companion_type: 'fiend' },
  rulesEdition: '2024',
  characterLevel: 5,
  chaMod: 3,
})
assert.equal(drop.companions.length, 0)
assert.equal(drop.changed, true)

const no2014 = syncVestigeCompanion2024({
  companions: [],
  classes,
  featurePicks: emptyFeaturePicks(),
  classOptions2024: { ...emptyClassOptions2024(), vestige_companion_type: 'fiend' },
  rulesEdition: '2014',
  characterLevel: 5,
  chaMod: 3,
})
assert.equal(no2014.changed, false)
assert.equal(no2014.companions.length, 0)

const under3 = syncVestigeCompanion2024({
  companions: synced.companions,
  classes: [
    createClassLevel({
      id: ENTRY,
      name: 'Колдун',
      catalog_id: 'warlock',
      level: 2,
      subclass_catalog_id: 'warlock__vestige-patron',
    }),
  ],
  featurePicks: emptyFeaturePicks(),
  classOptions2024: { ...emptyClassOptions2024(), vestige_companion_type: 'fiend' },
  rulesEdition: '2024',
  characterLevel: 2,
  chaMod: 3,
})
assert.equal(under3.companions.length, 0)

console.log('vestigeCompanion2024.selfcheck ok')
