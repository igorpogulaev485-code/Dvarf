/** P24-M02B-monk selfcheck — npm run selfcheck:p24-m02b-monk */
import assert from 'node:assert/strict'
import {
  FOCUSED_STRIKE_NAME_RU,
  isM02bMonkBookSubclass,
  isMysticArtsMonk2024,
  MYSTIC_ARTS_NAME_RU,
  MYSTIC_FOCUS_NAME_RU,
  mysticFocusPointsFromSlot2024,
  mysticFocusSlotRestoreCost2024,
} from './monkBook2024Features'
import {
  isPhb2024CreateSubclass,
  sharedOptionsForSubclass2024,
  thirdCasterBlock2024,
} from './edition2024Subclasses'
import { applyMonk2024FeatureUse } from './monk2024Features'
import { clampSlot } from './spells'

assert.equal(isM02bMonkBookSubclass('monk__warrior-of-the-mystic-arts'), true)
assert.equal(isMysticArtsMonk2024('monk__warrior-of-the-mystic-arts'), true)
assert.equal(isPhb2024CreateSubclass('monk__warrior-of-the-mystic-arts'), true)
assert.equal(isPhb2024CreateSubclass('warlock__undead'), false)
assert.equal(MYSTIC_ARTS_NAME_RU, 'Мистический воин')
assert.equal(MYSTIC_FOCUS_NAME_RU, 'Мистическая сосредоточенность')
assert.equal(FOCUSED_STRIKE_NAME_RU, 'Сфокусированный удар')

const third3 = thirdCasterBlock2024('monk__warrior-of-the-mystic-arts', 3)
assert.ok(third3)
assert.equal(third3?.ability, 'wis')
assert.equal(third3?.spell_list, 'sorcerer')
assert.equal(third3?.prepare_mode, 'prepared')
assert.equal(third3?.cantrips, 2)
assert.equal(third3?.prepared_spells, 3)
assert.equal(third3?.slots['1'], 2)

const third10 = thirdCasterBlock2024('monk__warrior-of-the-mystic-arts', 10)
assert.equal(third10?.cantrips, 3)
assert.equal(third10?.prepared_spells, 7)

assert.equal(mysticFocusPointsFromSlot2024(2), 2)
assert.equal(mysticFocusSlotRestoreCost2024(1, 6), 2)
assert.equal(mysticFocusSlotRestoreCost2024(2, 6), null)
assert.equal(mysticFocusSlotRestoreCost2024(2, 7), 3)
assert.equal(mysticFocusSlotRestoreCost2024(5, 20), null)

const opts = sharedOptionsForSubclass2024('monk__warrior-of-the-mystic-arts', 11)
assert.ok(opts.some((o) => o.feature_id === 'mystic-focus' && o.name_ru === MYSTIC_FOCUS_NAME_RU))
assert.ok(opts.some((o) => o.feature_id === 'focused-strike' && o.name_ru === FOCUSED_STRIKE_NAME_RU))
assert.ok(!opts.some((o) => o.name_ru === 'Мистический фокус'))
assert.ok(!opts.some((o) => o.name_ru === 'Сосредоточенный удар'))

const focusRes = [
  {
    id: 'feat:monk:focus_points:entry1',
    name: 'Очки сосредоточенности',
    max: 6,
    used: 4,
    reset: 'short' as const,
  },
]
const slotToFocus = applyMonk2024FeatureUse({
  featureId: 'mystic-focus',
  resourceId: null,
  resources: focusRes,
  classEntryId: 'entry1',
  monkLevel: 6,
  subclassSlug: 'monk__warrior-of-the-mystic-arts',
  mode: 'slot-to-focus',
  choice: '1',
  slots: { '1': clampSlot({ max: 3, used: 0 }) },
})
assert.equal(slotToFocus.ok, true, slotToFocus.message)
assert.equal(slotToFocus.resources.find((r) => r.id.includes('focus'))?.used, 3)
assert.equal(slotToFocus.slots?.['1']?.used, 1)

const stun = applyMonk2024FeatureUse({
  featureId: 'stunning-strike',
  resourceId: null,
  resources: [
    { id: 'feat:monk:focus_points:entry1', name: 'Очки', max: 11, used: 0, reset: 'short' },
  ],
  classEntryId: 'entry1',
  monkLevel: 11,
  subclassSlug: 'monk__warrior-of-the-mystic-arts',
  mode: 'fail',
  target: 'Гоблин',
})
assert.equal(stun.ok, true, stun.message)
assert.ok(stun.message.includes(FOCUSED_STRIKE_NAME_RU))

console.log('monkBook2024Features.selfcheck: ok')
