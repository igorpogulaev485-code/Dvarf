/** Quick node selfcheck: npx tsx src/shared/dnd/backgroundFeature.selfcheck.ts */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  backgroundFeatureCardFromGrant,
  buildBackgroundFeatureText,
  resolveBackgroundGrantDef,
  upsertBackgroundFeatureBlock,
} from './backgroundGrants.ts'
import {
  ensureBackgroundFeatureOnDraft,
  type BackgroundGrantDraftSlice,
} from '../../features/characters/backgroundEffects.ts'
import {
  blockPlainText,
  readTextBlocks,
} from '../../features/characters/textBlocks.ts'
import { EMPTY_ARMOR, EMPTY_WEAPONS } from '../../features/characters/identity.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const here = dirname(fileURLToPath(import.meta.url))
const specPath = join(
  here,
  '../../../../backend/data/backgrounds/phb2014_background_catalog_spec.json',
)
const spec = JSON.parse(readFileSync(specPath, 'utf8')) as {
  backgrounds: Array<{
    slug: string
    name_ru: string
    data: Record<string, unknown>
  }>
}
const criminal = spec.backgrounds.find((row) => row.slug === 'criminal')
assert(criminal, 'criminal in catalog')
assert(
  String(criminal.data.feature_name_ru) === 'Криминальные связи',
  'criminal feature name',
)
assert(
  String(criminal.data.feature_text_ru).startsWith('У вас есть'),
  'criminal feature text starts with У вас есть',
)

const def = resolveBackgroundGrantDef({
  backgroundName: criminal.name_ru,
  catalogSlug: criminal.slug,
  catalogData: criminal.data,
  nameRu: criminal.name_ru,
})
assert(def, 'resolve criminal def')
assert(def.featureNameRu === 'Криминальные связи', 'def feature name')

const card = backgroundFeatureCardFromGrant({
  slug: 'criminal',
  featureNameRu: def.featureNameRu,
  featureTextRu: def.featureTextRu,
})
assert(card, 'feature card')
assert(card.nameRu === 'Криминальные связи', 'card name')
assert(card.summaryRu.includes('связного'), 'card body')

const featureText = buildBackgroundFeatureText(def)
assert(featureText.includes('Умение предыстории: Криминальные связи'), 'marker title')

const emptySlice = (): BackgroundGrantDraftSlice => ({
  identity: {
    experience: 0,
    subclassName: '',
    background: 'Преступник',
    backgroundSlug: 'criminal',
    alignment: '',
    gender: null,
    size: '',
    darkvision: 0,
    armor: EMPTY_ARMOR,
    weapons: EMPTY_WEAPONS,
    languages: [],
    tools: [],
    raceAppliedLanguages: [],
  },
  skills: {},
  inventory: { coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [], notes: '' },
  textBlocks: readTextBlocks({}),
  weapons: [],
  backgroundGrant: {
    backgroundCatalogId: 'bg-criminal',
    slug: 'criminal',
    skills: ['deception', 'stealth'],
    tools: [],
    languages: [],
    weaponExtras: [],
    featureNameRu: null,
    featureTextRu: null,
    featNoteRu: null,
    equipmentPackageId: null,
    equipmentOrPicks: {},
    equipmentItemIds: [],
    equipmentAttackIds: [],
    equipmentCoinsGp: 0,
    choiceTablePicks: {},
    personalityTraits: [],
    ideal: null,
    bond: null,
    flaw: null,
  },
  protectedSkills: new Set(),
  protectedTools: new Set(),
  protectedLanguages: new Set(),
  protectedWeaponExtras: new Set(),
})

const before = emptySlice()
const after = ensureBackgroundFeatureOnDraft(before, def)
assert(after.backgroundGrant?.featureNameRu === 'Криминальные связи', 'backfill name')
assert(
  (after.backgroundGrant?.featureTextRu || '').startsWith('У вас есть'),
  'backfill text',
)
const traits = after.textBlocks.find((b) => b.key === 'traits')
assert(traits, 'traits block')
const plain = blockPlainText(traits)
assert(plain.includes('<!-- dvarf-background-feature -->'), 'traits marker')
assert(plain.includes('Криминальные связи'), 'traits name')

const again = ensureBackgroundFeatureOnDraft(after, def)
assert(again.textBlocks === after.textBlocks, 'idempotent textBlocks ref')
assert(again.backgroundGrant === after.backgroundGrant, 'idempotent grant ref')

const patched = upsertBackgroundFeatureBlock('ручная заметка', featureText)
assert(patched.includes('ручная заметка'), 'keeps manual notes')
assert(patched.includes('Криминальные связи'), 'upserts feature')

console.log('backgroundFeature.selfcheck ok')
