/** Run: npx tsx src/shared/dnd/classLevels.selfcheck.ts */
import {
  createClassLevel,
  formatClassLevelLabel,
  formatClassSummary,
} from './classLevels.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(formatClassSummary([createClassLevel({ name: 'Воин', level: 1 })]) === 'Воин 1', 'summary')
assert(formatClassLevelLabel('Воин 1', 1) === 'Воин 1', 'no double level from summary')
assert(formatClassLevelLabel('Воин', 1) === 'Воин 1', 'append when bare name')
assert(
  formatClassLevelLabel('Воин 2 / Плут 1', 3) === 'Воин 2 / Плут 1',
  'multiclass summary unchanged',
)
assert(formatClassLevelLabel(null, 5) === 'ур. 5', 'level only')
assert(formatClassLevelLabel('Следопыт', null) === 'Следопыт', 'name only')

console.log('classLevels.selfcheck: ok')
