/**
 * Run: npx --yes tsx src/features/characters/asiFeatHydrate.selfcheck.ts
 */
import type { CatalogEntry } from '../../shared/api/catalog'
import type { AppliedClassAsi } from '../../shared/dnd/classAsi'
import type { AppliedFeatGrant } from '../../shared/dnd/featGrants'
import {
  buildAsiFeatGrantFromCatalog,
  findMissingAsiFeatEntries,
  matchFeatCatalogEntry,
} from './asiFeatHydrate.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const mobileEntry = {
  id: 'feat-mobile-id',
  kind: 'feat' as const,
  slug: 'mobile',
  name_ru: 'Подвижный',
  name_en: 'Mobile',
  rules_edition: '2014' as const,
  parent_id: null,
  source: 'phb',
  external_ref: null,
  data: {
    grants: { speed_bonus: 10, flags: ['mobile'] },
    summary_ru: '+10 скорости',
    benefits_ru: 'Скорость +10',
  },
  sort_order: 0,
  is_active: true,
  created_at: '',
  updated_at: '',
} satisfies CatalogEntry

const alertEntry = {
  ...mobileEntry,
  id: 'feat-alert-id',
  slug: 'alert',
  name_ru: 'Бдительный',
  name_en: 'Alert',
  data: {
    grants: { initiative_bonus: 5, flags: ['alert'] },
    summary_ru: '+5 к инициативе',
    benefits_ru: 'Инициатива +5',
  },
} satisfies CatalogEntry

const asiMobile: AppliedClassAsi = {
  classEntryId: 'rogue-1',
  featureId: 'asi_4',
  atClassLevel: 4,
  resolution: {
    kind: 'feat',
    featCatalogId: 'feat-mobile-id',
    featSlug: 'mobile',
    featGrantId: 'grant-mobile',
  },
  bonuses: {},
}

const asiAlert: AppliedClassAsi = {
  classEntryId: 'rogue-1',
  featureId: 'asi_8',
  atClassLevel: 8,
  resolution: {
    kind: 'feat',
    featCatalogId: 'feat-alert-id',
    featSlug: 'alert',
    featGrantId: 'grant-alert',
  },
  bonuses: {},
}

assert(
  findMissingAsiFeatEntries([asiMobile, asiAlert], []).length === 2,
  'both ASI feats missing from empty ledger',
)

const mobileGrant = buildAsiFeatGrantFromCatalog({
  entry: asiMobile,
  catalogEntry: mobileEntry,
  characterLevel: 20,
})
assert(mobileGrant, 'mobile grant built')
assert(mobileGrant!.applied.speedBonus === 10, 'mobile +10 speed')
assert(mobileGrant!.id === 'grant-mobile', 'keeps featGrantId')

const alertGrant = buildAsiFeatGrantFromCatalog({
  entry: asiAlert,
  catalogEntry: alertEntry,
  characterLevel: 20,
})
assert(alertGrant, 'alert grant built')
assert(alertGrant!.applied.initiativeBonus === 5, 'alert +5 init')

const ledger: AppliedFeatGrant[] = [mobileGrant!, alertGrant!]
assert(
  findMissingAsiFeatEntries([asiMobile, asiAlert], ledger).length === 0,
  'ledger covers both ASI feats',
)

assert(
  matchFeatCatalogEntry([mobileEntry, alertEntry], asiAlert.resolution as Extract<
    AppliedClassAsi['resolution'],
    { kind: 'feat' }
  >)?.slug === 'alert',
  'match by catalog id',
)

console.log('asiFeatHydrate.selfcheck: ok')
