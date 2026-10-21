/**
 * Slice U: opaque «обязательные развилки» → concrete blocking reasons.
 * Run: npx tsx src/shared/dnd/backgroundSetupValidation.selfcheck.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  backgroundGrantDefFromCatalog,
  backgroundSetupBlockingReasons,
  emptyBackgroundPicks,
  validateBackgroundGrantPicks,
} from './backgroundGrants'

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

const acolyteRow = spec.backgrounds.find((row) => row.slug === 'acolyte')
assert(acolyteRow, 'acolyte in PHB background catalog')

const def = backgroundGrantDefFromCatalog({
  slug: acolyteRow.slug,
  nameRu: acolyteRow.name_ru,
  data: acolyteRow.data,
})
assert(def.languagesChoose === 2, 'acolyte chooses 2 languages')
assert(def.equipment.length > 0, 'acolyte has equipment package')
assert(def.equipmentOrChoices.length > 0, 'acolyte has prayer book/drum OR')

const empty = emptyBackgroundPicks()
const emptyReasons = backgroundSetupBlockingReasons({ def, picks: empty })
assert(
  emptyReasons.some((row) => row.includes('языки')),
  `empty lists languages: ${emptyReasons.join(' | ')}`,
)
assert(
  emptyReasons.some((row) => row.includes('снаряжение')),
  `empty lists equipment: ${emptyReasons.join(' | ')}`,
)
assert(
  emptyReasons.length >= 2,
  'empty acolyte shows multiple reasons at once (not one opaque line)',
)

const langsOnly = {
  ...empty,
  languages: ['Эльфийский', 'Дварфийский'],
}
const langsReasons = backgroundSetupBlockingReasons({ def, picks: langsOnly })
assert(
  !langsReasons.some((row) => row.includes('языки')),
  'languages satisfied',
)
assert(
  langsReasons.some((row) => row.includes('снаряжение')),
  'still needs equipment after languages',
)

const skipGear = {
  ...langsOnly,
  equipmentPackageId: 'skip',
}
assert(
  backgroundSetupBlockingReasons({ def, picks: skipGear }).length === 0,
  '2 languages + Без снаряжения → Apply ok',
)
assert(
  validateBackgroundGrantPicks({ def, picks: skipGear }) === null,
  'validate agrees with blockingReasons',
)

const packWithoutOr = {
  ...langsOnly,
  equipmentPackageId: def.equipment[0]!.id,
  equipmentOrPicks: {},
}
const orReasons = backgroundSetupBlockingReasons({ def, picks: packWithoutOr })
assert(
  orReasons.some((row) => row.includes('Молитвенник') || row.includes('вариант')),
  `pack without OR blocked: ${orReasons.join(' | ')}`,
)

const packWithOr = {
  ...packWithoutOr,
  equipmentOrPicks: {
    [def.equipmentOrChoices[0]!.id]: def.equipmentOrChoices[0]!.options[0]!,
  },
}
assert(
  backgroundSetupBlockingReasons({ def, picks: packWithOr }).length === 0,
  'pack + OR → ok',
)

const oneTrait = {
  ...skipGear,
  personalityTraits: [def.personalityTraits[0]!],
}
const traitReasons = backgroundSetupBlockingReasons({ def, picks: oneTrait })
assert(
  traitReasons.some((row) => row.includes('Черты характера')),
  `partial personality blocked: ${traitReasons.join(' | ')}`,
)

const variantOnly = backgroundSetupBlockingReasons({
  def: null,
  picks: empty,
  variantPending: true,
})
assert(
  variantOnly.length === 1 && variantOnly[0]!.includes('вариант'),
  'variantPending is a single clear reason',
)

console.log('backgroundSetupValidation.selfcheck: ok')
