/**
 * Quick node selfcheck: npx tsx src/features/characters/textBlocks.selfcheck.ts
 */
import { resourceShowsOnHot, type SheetResource } from '../../shared/dnd/rest'
import {
  appendBlockPart,
  blockHasResource,
  blockPlainText,
  createDividerPart,
  createResourcePart,
  createSpoilerPart,
  createTextPart,
  listResourceIds,
  migrateLegacyParts,
  partsPlainText,
  readTextBlocks,
  textBlocksToSheet,
  updateBlockParts,
  withBlockPlainText,
} from './textBlocks'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

const legacy = migrateLegacyParts('Привет', 'res-1')
assert(legacy.length === 2, 'legacy migrates resource + text')
assert(legacy[0].kind === 'resource' && legacy[0].resourceId === 'res-1', 'resource first')
assert(legacy[1].kind === 'text' && legacy[1].value === 'Привет', 'text second')

const parts = [
  createTextPart('А'),
  createSpoilerPart('Скрыто', 'тело', false),
  createDividerPart('---'),
  createResourcePart('res-2'),
]
assert(partsPlainText(parts).includes('А'), 'plain includes text')
assert(partsPlainText(parts).includes('Скрыто'), 'plain includes spoiler')
assert(listResourceIds(parts).includes('res-2'), 'lists resource id')

const sheet = textBlocksToSheet([
  {
    key: 'traits',
    defaultLabel: 'Умения',
    customLabel: null,
    isHidden: false,
    value: '',
    isCustom: false,
    resourceId: null,
    parts: [createTextPart('Черта'), createResourcePart('res-9')],
  },
])
const roundTrip = readTextBlocks(sheet)
assert(roundTrip[0]?.parts.some((p) => p.kind === 'resource'), 'round-trip keeps resource part')
assert(blockHasResource(roundTrip[0]!), 'blockHasResource true')
assert(
  updateBlockParts(roundTrip[0]!, [
    ...roundTrip[0]!.parts,
    createDividerPart('X'),
  ]).parts.some((p) => p.kind === 'divider'),
  'append divider via update',
)
assert(
  appendBlockPart(roundTrip[0]!, createSpoilerPart()).parts.some((p) => p.kind === 'spoiler'),
  'append spoiler',
)

const plainSynced = withBlockPlainText(
  {
    ...roundTrip[0]!,
    parts: [createTextPart('старое'), createResourcePart('res-keep')],
  },
  'новое из гранта',
)
assert(blockPlainText(plainSynced).includes('новое из гранта'), 'withBlockPlainText sets text')
assert(
  plainSynced.parts.some((p) => p.kind === 'resource' && p.resourceId === 'res-keep'),
  'withBlockPlainText keeps resource part',
)
assert(plainSynced.value.includes('новое из гранта'), 'value synced from parts')

const hotOn: SheetResource = {
  id: 'a',
  name: 'Rage',
  max: 3,
  used: 0,
  reset: 'long',
  onHot: true,
}
const hotOff: SheetResource = { ...hotOn, id: 'b', onHot: false }
const hotLegacy: SheetResource = {
  id: 'c',
  name: 'Surge',
  max: 1,
  used: 0,
  reset: 'short',
}
assert(resourceShowsOnHot(hotOn), 'explicit onHot true')
assert(!resourceShowsOnHot(hotOff), 'explicit onHot false')
assert(resourceShowsOnHot(hotLegacy), 'legacy undefined shows')

console.log('textBlocks.selfcheck OK')
