/**
 * Self-check for P24-M02B-artificer book allowlist and Reanimator helpers.
 * Run: npx tsx src/shared/dnd/artificerBook2024Features.selfcheck.ts
 */
import { isPhb2024CreateSubclass, M02B_ARTIFICER_BOOK_SUBCLASS_SLUGS } from './edition2024Subclasses.ts'
import {
  artificerBookAllowlistOpen2024,
  deathBurstDamageDice2024,
  FORBIDDEN_ARTIFICER_BOOK_LABELS_2024,
  isM02bArtificerBookSubclass,
  isReanimator2024,
  M02B_ARTIFICER_BOOK_SLUGS,
  REANIMATED_COMPANION_NAME_RU,
  REANIMATOR_NAME_RU,
  reanimatedCompanionStats2024,
  reanimatorAlwaysPreparedAtLevel2024,
  revivingBoltDamageDice2024,
  strangeModificationPickCount2024,
} from './artificerBook2024Features.ts'
import { isOutOfPackArtificerSubclassSlug } from './artificer2024Features.ts'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`)
}

assert(M02B_ARTIFICER_BOOK_SLUGS.length === 6, 'six paths')
assert(M02B_ARTIFICER_BOOK_SUBCLASS_SLUGS.size === 6, 'set size 6')
for (const slug of M02B_ARTIFICER_BOOK_SLUGS) {
  assert(isM02bArtificerBookSubclass(slug), `book ${slug}`)
  assert(isPhb2024CreateSubclass(slug), `picker ${slug}`)
  assert(artificerBookAllowlistOpen2024(slug), `allow ${slug}`)
}
assert(isReanimator2024('artificer__reanimator'), 'reanimator slug')
assert(!isOutOfPackArtificerSubclassSlug('artificer__reanimator'), 'reanimator not out of pack')
assert(REANIMATOR_NAME_RU === 'Реаниматор', 'reanimator name')
assert(REANIMATED_COMPANION_NAME_RU === 'Реанимированный спутник', 'companion name')
assert(FORBIDDEN_ARTIFICER_BOOK_LABELS_2024.includes('Оживлённый спутник'), 'forbidden label')
assert(strangeModificationPickCount2024(3) === 0, 'mods L3')
assert(strangeModificationPickCount2024(5) === 1, 'mods L5')
assert(strangeModificationPickCount2024(9) === 2, 'mods L9')
assert(strangeModificationPickCount2024(15) === 3, 'mods L15')
assert(revivingBoltDamageDice2024(3) === '2к4', 'bolt L3')
assert(revivingBoltDamageDice2024(11) === '3к4', 'bolt L11')
assert(revivingBoltDamageDice2024(17) === '4к4', 'bolt L17')
assert(deathBurstDamageDice2024(8) === '2к4', 'burst L8')
assert(deathBurstDamageDice2024(9) === '4к4', 'burst L9')
assert(reanimatorAlwaysPreparedAtLevel2024(3).includes('witch-bolt'), 'always L3')
assert(reanimatorAlwaysPreparedAtLevel2024(17).includes('raise-dead'), 'always L17')
const stats = reanimatedCompanionStats2024({
  artificerLevel: 5,
  intMod: 3,
  modifications: ['ferocity'],
})
assert(stats.ac === 13, 'ac')
assert(stats.hp === 30, 'hp')
assert(stats.swipeDice === '1к6', 'ferocity swipe')
assert(!stats.notesRu.includes('Оживлённый'), 'no forbidden name in notes')

console.log('artificerBook2024Features.selfcheck: ok')
