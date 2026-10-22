/** Run: npx --yes tsx src/features/characters/familiarForms.selfcheck.ts */
import { emptyFeaturePicks, setFeaturePick } from '../../shared/dnd/featurePicks.ts'
import { createSheetSpell } from './spells.ts'
import { PACT_BOON_FEATURE_ID } from './pactTomeEffects.ts'
import { pactChainFamiliarSpellId } from './pactChainEffects.ts'
import {
  applyFindFamiliarCompanion,
  familiarAllowedSlugs,
  FIND_FAMILIAR_FALLBACK_PICKS,
  resolveFamiliarCastMode,
  warlockHasPactChain,
} from './familiarForms.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const warlockId = 'wlk-1'
const classes = [
  { id: warlockId, name: 'Колдун', level: 5 },
  { id: 'wiz-1', name: 'Волшебник', level: 5 },
]
const chainPicks = setFeaturePick(
  emptyFeaturePicks(),
  warlockId,
  PACT_BOON_FEATURE_ID,
  'chain',
)
const bladePicks = setFeaturePick(
  emptyFeaturePicks(),
  warlockId,
  PACT_BOON_FEATURE_ID,
  'blade',
)

assert(warlockHasPactChain(chainPicks, classes), 'chain detected')
assert(!warlockHasPactChain(bladePicks, classes), 'blade not chain')

assert(
  resolveFamiliarCastMode({
    spell: { id: 'x', name: 'Поиск фамильяра' },
    featurePicks: bladePicks,
    classes,
  }) === 'spell',
  'wizard/book without chain → spell',
)

assert(
  resolveFamiliarCastMode({
    spell: { id: 'x', name: 'Поиск фамильяра' },
    featurePicks: chainPicks,
    classes,
  }) === 'pact_chain',
  'any Find Familiar cast with Chain → pact_chain',
)

assert(
  resolveFamiliarCastMode({
    spell: { id: pactChainFamiliarSpellId(), name: 'Поиск фамильяра' },
    featurePicks: chainPicks,
    classes,
  }) === 'pact_chain',
  'feature spell id → pact_chain',
)

assert(
  resolveFamiliarCastMode({
    featurePicks: chainPicks,
    classes,
    forceMode: 'wild_companion',
  }) === 'wild_companion',
  'force wild companion',
)

const spellSlugs = familiarAllowedSlugs('spell')
assert(spellSlugs.includes('owl') && !spellSlugs.includes('imp'), 'spell no imp')
const chainSlugs = familiarAllowedSlugs('pact_chain')
assert(chainSlugs.includes('imp') && chainSlugs.includes('owl'), 'chain has both')

const imp = FIND_FAMILIAR_FALLBACK_PICKS.imp!
const applied = applyFindFamiliarCompanion({
  companions: [],
  pick: imp,
  mode: 'pact_chain',
  spell: {
    ...createSheetSpell(),
    id: pactChainFamiliarSpellId(),
    name: 'Поиск фамильяра',
    level: 1,
  },
  slotLevel: 0,
})
assert(applied.companions.length === 1, 'one familiar')
assert(applied.companions[0]!.kind === 'familiar', 'kind familiar')
assert(applied.companions[0]!.name === 'Бес', 'imp name')
assert(applied.companions[0]!.stats.hp === 10, 'imp hp')
assert(
  (applied.companions[0]!.notes || '').includes('Цепи') ||
    (applied.companions[0]!.notes || '').includes('Цепь') ||
    (applied.companions[0]!.notes || '').includes('Пакта'),
  'notes mention chain',
)

const wild = applyFindFamiliarCompanion({
  companions: applied.companions,
  pick: FIND_FAMILIAR_FALLBACK_PICKS.owl!,
  mode: 'wild_companion',
  druidLevel: 5,
})
assert(wild.companions.some((r) => r.source?.feature === 'wild_companion'), 'wild card')
assert(
  wild.companions.filter((r) => r.kind === 'familiar').length === 2,
  'wild does not remove chain familiar from other source',
)
assert(wild.companions.find((r) => r.source?.feature === 'wild_companion')!.name.includes('Сова'), 'owl name')

console.log('familiarForms.selfcheck: ok')
