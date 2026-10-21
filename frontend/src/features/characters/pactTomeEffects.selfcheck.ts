/**
 * Run: npx --yes tsx src/features/characters/pactTomeEffects.selfcheck.ts
 */
import { emptyFeaturePicks, setFeaturePick, toggleFeaturePickInList } from '../../shared/dnd/featurePicks'
import {
  canRemoveSheetSpell,
  countLearnedCantrips,
  createSheetSpell,
  type SpellsState,
} from './spells'
import {
  clearPactTomeCantripsIfNeeded,
  isPactTomeSpellId,
  PACT_BOON_FEATURE_ID,
  PACT_TOME_CANTRIPS_FEATURE_ID,
  PACT_TOME_CANTRIPS_LIMIT,
  pactTomeSpellId,
  sanitizeFeaturePicksForPactBoons,
  syncPactTomeCantrips,
  withPactTomeCantripsStep,
} from './pactTomeEffects'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function emptySpells(): SpellsState {
  return {
    casting_ability: 'cha',
    max_prepared: null,
    slots: {},
    pact_slots: null,
    known: [],
    has_spell_focus: false,
    has_component_pouch: false,
  }
}

const classId = 'warlock-1'
const catalog: Record<string, { nameRu: string }> = {
  sacred_flame: { nameRu: 'Священное пламя' },
  fire_bolt: { nameRu: 'Огненный снаряд' },
  guidance: { nameRu: 'Наставление' },
  eldritch_blast: { nameRu: 'Мистический заряд' },
}

function resolveSpell(slug: string) {
  const row = catalog[slug]
  if (!row) return null
  return { slug, nameRu: row.nameRu, catalogId: slug }
}

let picks = emptyFeaturePicks()
picks = setFeaturePick(picks, classId, PACT_BOON_FEATURE_ID, 'tome')
for (const slug of ['sacred_flame', 'fire_bolt', 'guidance'] as const) {
  picks = toggleFeaturePickInList(
    picks,
    classId,
    PACT_TOME_CANTRIPS_FEATURE_ID,
    slug,
    PACT_TOME_CANTRIPS_LIMIT,
  )
}

const synced = syncPactTomeCantrips({
  spells: emptySpells(),
  featurePicks: picks,
  classes: [{ id: classId, name: 'Колдун', level: 3 }],
  resolveSpell,
})
assert(synced.changed, 'tome sync changes sheet')
assert(synced.spells.known.length === 3, 'three tome cantrips')
assert(
  synced.spells.known.every((row) => row.prepared_locked && row.source_kind === 'feature'),
  'locked feature source',
)
assert(
  synced.spells.known.every((row) => isPactTomeSpellId(row.id)),
  'stable feature-spell:pact_tome ids',
)
assert(
  synced.spells.known.some((row) => row.id === pactTomeSpellId('sacred_flame')),
  'sacred_flame id',
)

// Budget: locked grants do not count as removable learned cantrips.
const withClassCantrip: SpellsState = {
  ...synced.spells,
  known: [
    ...synced.spells.known,
    { ...createSheetSpell(), name: 'Мистический заряд', level: 0 },
    { ...createSheetSpell(), name: 'Доп. заговор', level: 0 },
  ],
}
assert(
  countLearnedCantrips(withClassCantrip.known) === 2,
  'tome cantrips excluded from learned budget',
)
assert(
  synced.spells.known.every((row) => !canRemoveSheetSpell(row)),
  'tome cantrips not removable as class known',
)

// Revoke on pact change.
const bladePicks = setFeaturePick(picks, classId, PACT_BOON_FEATURE_ID, 'blade')
const clearedPicks = clearPactTomeCantripsIfNeeded(bladePicks, classId)
assert(
  !clearedPicks.values[`${classId}:${PACT_TOME_CANTRIPS_FEATURE_ID}`],
  'cantrip picks cleared when leaving tome',
)
const revoked = syncPactTomeCantrips({
  spells: synced.spells,
  featurePicks: clearedPicks,
  classes: [{ id: classId, name: 'Колдун', level: 3 }],
  resolveSpell,
})
assert(revoked.spells.known.length === 0, 'tome spells stripped on revoke')

// sanitize across classes
const dirty = setFeaturePick(
  setFeaturePick(emptyFeaturePicks(), classId, PACT_BOON_FEATURE_ID, 'chain'),
  classId,
  PACT_TOME_CANTRIPS_FEATURE_ID,
  'fire_bolt,guidance',
)
const sanitized = sanitizeFeaturePicksForPactBoons({
  featurePicks: dirty,
  classes: [{ id: classId, name: 'Warlock' }],
})
assert(
  !sanitized.values[`${classId}:${PACT_TOME_CANTRIPS_FEATURE_ID}`],
  'sanitize strips orphan tome picks',
)

// Wizard step enqueue
const incomplete = setFeaturePick(emptyFeaturePicks(), classId, PACT_BOON_FEATURE_ID, 'tome')
const queued = withPactTomeCantripsStep([], {
  classEntryId: classId,
  className: 'Колдун',
  classLevel: 3,
  featurePicks: incomplete,
})
assert(queued.length === 1 && queued[0]?.kind === 'pact_tome_cantrips', 'wizard step queued')

const complete = withPactTomeCantripsStep([], {
  classEntryId: classId,
  className: 'Колдун',
  classLevel: 3,
  featurePicks: picks,
})
assert(complete.length === 0, 'no step when 3 cantrips picked')

console.log('pactTomeEffects.selfcheck: ok')
