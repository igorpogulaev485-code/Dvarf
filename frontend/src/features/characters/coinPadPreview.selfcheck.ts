/** Run: npx tsx src/features/characters/coinPadPreview.selfcheck.ts */
import {
  COIN_META,
  formatCoinApplyPreview,
  previewCoinApply,
} from './coinPadPreview.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`coinPadPreview.selfcheck: ${msg}`)
}

assert(COIN_META.every((row) => row.label.length > 1), 'full coin labels')
assert(
  COIN_META.map((row) => row.label).join(',') ===
    'Золото,Серебро,Медь,Платина,Электрум',
  'expected coin names',
)

const purse = { cp: 0, sp: 5, ep: 0, gp: 25, pp: 0 }
const take = previewCoinApply(purse, 'gp', 10, 1)
assert(take.before === 25 && take.after === 35, 'take gold')
assert(take.totalAfterGp > take.totalBeforeGp, 'gp total rises')

const give = previewCoinApply(purse, 'gp', 10, -1)
assert(give.after === 15, 'give gold')

const line = formatCoinApplyPreview(purse, 'gp', 10, 1)
assert(line != null && line.includes('Золото: 25 → 35'), line ?? 'missing')
assert(line!.includes('всего'), 'shows gold total preview')
assert(formatCoinApplyPreview(purse, 'gp', 0, 1) == null, 'no preview at 0')

console.log('coinPadPreview.selfcheck: ok')
