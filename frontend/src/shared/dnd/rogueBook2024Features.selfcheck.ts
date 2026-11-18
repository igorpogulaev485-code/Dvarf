/**
 * Lightweight self-check: npx --yes tsx src/shared/dnd/rogueBook2024Features.selfcheck.ts
 */
import assert from 'node:assert/strict'
import {
  BLOODTHIRST_NAME_RU,
  bloodthirstUses2024,
  FORBIDDEN_ROGUE_BOOK_LABELS_2024,
  isM02bRogueBookSubclass,
  isPhantom2024,
  isScionOfTheThree2024,
  M02B_ROGUE_BOOK_SLUGS,
  PHANTOM_NAME_RU,
  rogueBookAllowlistOpen2024,
  SCION_NAME_RU,
  TOKENS_OF_THE_DEPARTED_NAME_RU,
  tokensOfTheDepartedMax2024,
  WAILS_FROM_THE_GRAVE_NAME_RU,
  wailsFromTheGraveUses2024,
  wailsHalfDice2024,
} from './rogueBook2024Features.ts'
import { isPhb2024CreateSubclass, M02B_ROGUE_BOOK_SUBCLASS_SLUGS } from './edition2024Subclasses.ts'
import { CUNNING_STRIKE_2024 } from './edition2024ClassOptions.ts'

assert.equal(M02B_ROGUE_BOOK_SLUGS.length, 2)
assert.equal(M02B_ROGUE_BOOK_SUBCLASS_SLUGS.has('rogue__scion-of-the-three'), true)
assert.equal(M02B_ROGUE_BOOK_SUBCLASS_SLUGS.has('rogue__phantom'), true)
assert.equal(isScionOfTheThree2024('rogue__scion-of-the-three'), true)
assert.equal(isPhantom2024('rogue__phantom'), true)
assert.equal(isM02bRogueBookSubclass('rogue__thief'), false)
assert.equal(isPhb2024CreateSubclass('rogue__scion-of-the-three'), true)
assert.equal(isPhb2024CreateSubclass('rogue__phantom'), true)
assert.equal(isPhb2024CreateSubclass('rogue__swashbuckler'), false)
assert.equal(rogueBookAllowlistOpen2024('rogue__scion-of-the-three'), true)

assert.equal(SCION_NAME_RU, 'Наследник троицы')
assert.equal(PHANTOM_NAME_RU, 'Фантом')
assert.equal(BLOODTHIRST_NAME_RU, 'Кровожадность')
assert.equal(WAILS_FROM_THE_GRAVE_NAME_RU, 'Могильные стенания')
assert.equal(TOKENS_OF_THE_DEPARTED_NAME_RU, 'Сувениры усопших')

assert.equal(bloodthirstUses2024(14), 2)
assert.equal(bloodthirstUses2024(8), 1)
assert.equal(wailsFromTheGraveUses2024(16), 3)
assert.equal(wailsFromTheGraveUses2024(8), 1)
assert.equal(tokensOfTheDepartedMax2024(8), 0)
assert.equal(tokensOfTheDepartedMax2024(9), 2)
assert.equal(tokensOfTheDepartedMax2024(13), 3)
assert.equal(tokensOfTheDepartedMax2024(17), 4)
assert.equal(wailsHalfDice2024(5), 2) // 3d6 → ceil(1.5)=2? wait 5→3d6 → ceil(3/2)=2
assert.equal(wailsHalfDice2024(1), 1)

const strikeFear = CUNNING_STRIKE_2024.find((r) => r.id === 'strike-fear')
assert.ok(strikeFear)
assert.equal(strikeFear?.nameRu, 'Удар страха')
assert.equal(strikeFear?.requiresSubclass, 'rogue__scion-of-the-three')

for (const bad of FORBIDDEN_ROGUE_BOOK_LABELS_2024) {
  assert.notEqual(SCION_NAME_RU, bad)
  assert.notEqual(PHANTOM_NAME_RU, bad)
  assert.ok(!WAILS_FROM_THE_GRAVE_NAME_RU.includes(bad.split(' ')[0]!))
}

console.log('rogueBook2024Features.selfcheck ok')
