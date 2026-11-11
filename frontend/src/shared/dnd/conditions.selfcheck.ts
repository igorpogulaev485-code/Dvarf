/** Quick audit: which conditions are leveled vs binary. */
import {
  FALLBACK_CONDITIONS,
  clampConditionLevel,
  conditionLevelLabel,
  conditionMaxLevel,
  conditionStatusToast,
  exhaustionStatusToast,
  formatConditionLabel,
  isLeveledCondition,
  leveledConditionSlugs,
  readConditionMaxLevelFromData,
  setConditionLevel,
  toggleCondition,
} from './conditions.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const leveled = leveledConditionSlugs().sort()
assert(
  leveled.join(',') === 'exhaustion,intoxicated',
  `expected only exhaustion+intoxicated leveled, got ${leveled.join(',')}`,
)

assert(conditionMaxLevel('exhaustion') === 6, 'exhaustion max 6')
assert(conditionMaxLevel('intoxicated') === 5, 'intoxicated max 5')
assert(conditionMaxLevel('INTOXICATED') === 5, 'slug case-insensitive')
assert(conditionMaxLevel('poisoned') == null, 'poisoned binary')
assert(conditionMaxLevel('blinded') == null, 'blinded binary')
assert(!isLeveledCondition('prone'), 'prone not leveled')

assert(readConditionMaxLevelFromData({ max_level: 5 }) === 5, 'catalog max_level')
assert(
  conditionMaxLevel('custom-foo', { max_level: 3 }) === 3,
  'catalog data overrides unknown slug',
)
assert(clampConditionLevel('intoxicated', 99) === 5, 'clamp intoxicated')
assert(clampConditionLevel('exhaustion', 0) === 1, 'clamp min 1')
assert(clampConditionLevel('poisoned', 2) == null, 'binary clamp null')

assert(conditionLevelLabel('intoxicated', 1) === 'навеселе', 'intox L1 label')
assert(conditionLevelLabel('intoxicated', 5) === 'отключился', 'intox L5 label')
assert(conditionLevelLabel('exhaustion', 6) === 'смерть', 'exhaustion L6 label')

let list = toggleCondition([], {
  slug: 'intoxicated',
  name: 'Опьянение',
  catalog_id: null,
  level: 1,
})
assert(list.length === 1 && list[0]?.level === 1, 'add intoxicated L1')
list = setConditionLevel(list, 'intoxicated', 4)
assert(list[0]?.level === 4, 'raise intoxicated to 4')
assert(
  formatConditionLabel(list[0]!).includes('4') &&
    formatConditionLabel(list[0]!).includes('в стельку'),
  'format includes stage',
)

assert(
  conditionStatusToast({ action: 'add', ref: list[0]! }).includes('в стельку'),
  'add toast explains stage',
)
assert(
  conditionStatusToast({ action: 'level', ref: { ...list[0]!, level: 2 } }).includes(
    'подвыпивший',
  ),
  'level toast explains stage',
)
assert(
  conditionStatusToast({
    action: 'remove',
    ref: { slug: 'poisoned', name: 'Отравленный', catalog_id: null },
  }) === 'Снято: Отравленный',
  'remove toast',
)
assert(exhaustionStatusToast(0) === 'Снято: Истощение', 'exhaustion clear toast')
assert(
  exhaustionStatusToast(3).includes('помеха к атакам и сейвам'),
  'exhaustion level toast explains stage',
)

const binaryCount = FALLBACK_CONDITIONS.filter((row) => !row.maxLevel).length
assert(binaryCount === 14, `expected 14 binary PHB conditions, got ${binaryCount}`)

console.log(
  'conditions.selfcheck: ok (leveled=exhaustion×6, intoxicated×5; other PHB binary)',
)
