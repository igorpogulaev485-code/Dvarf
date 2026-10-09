/** Run: npx tsx src/shared/dnd/backgroundAlignment.selfcheck.ts */
import {
  alignmentSuggestionFromIdeal,
  shouldApplyAlignmentFromIdeal,
} from './backgroundGrants'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(
  alignmentSuggestionFromIdeal(
    'Честность . Я никогда не выберу своей жертвой людей. (Законный)',
  ) === 'Законный',
  'lawful',
)
assert(alignmentSuggestionFromIdeal('Милосердие . … (Добрый)') === 'Добрый', 'good')
assert(
  alignmentSuggestionFromIdeal('Независимость . … (Хаотичный)') === 'Хаотичный',
  'chaotic',
)
assert(alignmentSuggestionFromIdeal('Стремление . … (Любой)') === null, 'any')
assert(alignmentSuggestionFromIdeal('Стремление . … (Любое)') === null, 'any-neuter')
assert(alignmentSuggestionFromIdeal('Кодекс. … (Законное)') === 'Законный', 'lawful-neuter')
assert(alignmentSuggestionFromIdeal('Вера. … (Добро)') === 'Добрый', 'good-short')
assert(alignmentSuggestionFromIdeal(null) === null, 'null')
assert(alignmentSuggestionFromIdeal('без тега') === null, 'no-tag')

assert(
  shouldApplyAlignmentFromIdeal({
    suggested: 'Законный',
    currentAlignment: '',
    previousIdeal: null,
    nextIdeal: 'x (Законный)',
  }),
  'empty → apply',
)
assert(
  shouldApplyAlignmentFromIdeal({
    suggested: 'Добрый',
    currentAlignment: 'Законный',
    previousIdeal: 'a (Законный)',
    nextIdeal: 'b (Добрый)',
  }),
  'ideal changed → apply',
)
assert(
  !shouldApplyAlignmentFromIdeal({
    suggested: 'Законный',
    currentAlignment: 'Хаотично-злой',
    previousIdeal: 'a (Законный)',
    nextIdeal: 'a (Законный)',
  }),
  'manual sticky when ideal unchanged',
)
assert(
  shouldApplyAlignmentFromIdeal({
    suggested: 'Законный',
    currentAlignment: 'Законный',
    previousIdeal: 'a (Законный)',
    nextIdeal: 'a (Законный)',
  }),
  'still matches previous auto → apply ok',
)

console.log('backgroundAlignment.selfcheck: ok')
