/**
 * Selfcheck: npx tsx --test src/shared/dnd/fighterBook2024Features.selfcheck.ts
 */
import assert from 'node:assert/strict'
import {
  ARCANE_ARCHER_NAME_RU,
  BANNERET_NAME_RU,
  FORBIDDEN_FIGHTER_BOOK_LABELS_2024,
  M02B_FIGHTER_BOOK_SLUGS,
  arcaneArcherFeatureIdsAtLevel2024,
  arcaneShotUses2024,
  banneretEmanationFeet2024,
  banneretFeatureIdsAtLevel2024,
  fighterBookAllowlistOpen2024,
  groupRecoveryAllyCap2024,
  isArcaneArcher2024,
  isBanneret2024,
  isM02bFighterBookSubclass,
} from './fighterBook2024Features'
import {
  arcaneShotDie2024,
  arcaneShotsKnown2024,
} from './arcaneShots2024'
import {
  isPhb2024CreateSubclass,
  M02B_FIGHTER_BOOK_SUBCLASS_SLUGS,
} from './edition2024Subclasses'
import { isOutOfPackFighterSubclassSlug } from './fighter2024Features'

assert.deepEqual([...M02B_FIGHTER_BOOK_SLUGS], [
  'fighter__arcane-archer',
  'fighter__banneret',
])
assert.equal(ARCANE_ARCHER_NAME_RU, 'Мистический лучник')
assert.equal(BANNERET_NAME_RU, 'Знаменосец')
assert.ok(FORBIDDEN_FIGHTER_BOOK_LABELS_2024.includes('Баннерет'))
assert.equal(isArcaneArcher2024('fighter__arcane-archer'), true)
assert.equal(isBanneret2024('fighter__banneret'), true)
assert.equal(isM02bFighterBookSubclass('fighter__champion'), false)
assert.equal(fighterBookAllowlistOpen2024('fighter__arcane-archer'), true)
assert.equal(fighterBookAllowlistOpen2024('fighter__banneret'), true)
assert.equal(isPhb2024CreateSubclass('fighter__arcane-archer'), true)
assert.equal(isPhb2024CreateSubclass('fighter__banneret'), true)
assert.equal(M02B_FIGHTER_BOOK_SUBCLASS_SLUGS.has('fighter__banneret'), true)
assert.equal(isOutOfPackFighterSubclassSlug('fighter__arcane-archer'), false)
assert.equal(isOutOfPackFighterSubclassSlug('fighter__purple-dragon-knight'), true)
assert.equal(isPhb2024CreateSubclass('fighter__purple-dragon-knight'), false)

assert.deepEqual(arcaneArcherFeatureIdsAtLevel2024(3), [
  'arcane-archer-lore',
  'arcane-shot',
])
assert.ok(arcaneArcherFeatureIdsAtLevel2024(7).includes('curving-shot'))
assert.ok(arcaneArcherFeatureIdsAtLevel2024(10).includes('ever-ready-shot'))
assert.ok(arcaneArcherFeatureIdsAtLevel2024(15).includes('indomitable-teleport'))
assert.ok(arcaneArcherFeatureIdsAtLevel2024(18).includes('masterful-shots'))
assert.deepEqual(banneretFeatureIdsAtLevel2024(3), [
  'knightly-envoy',
  'group-recovery',
])
assert.ok(banneretFeatureIdsAtLevel2024(18).includes('inspiring-commander'))

assert.equal(arcaneShotsKnown2024(3), 2)
assert.equal(arcaneShotsKnown2024(7), 3)
assert.equal(arcaneShotsKnown2024(10), 4)
assert.equal(arcaneShotsKnown2024(15), 5)
assert.equal(arcaneShotsKnown2024(18), 6)
assert.equal(arcaneShotDie2024(3), 'd6')
assert.equal(arcaneShotDie2024(10), 'd8')
assert.equal(arcaneShotDie2024(15), 'd10')
assert.equal(arcaneShotDie2024(18), 'd12')
assert.equal(arcaneShotUses2024(14), 2) // INT 14 → +2
assert.equal(arcaneShotUses2024(8), 1) // INT 8 → -1 → min 1
assert.equal(groupRecoveryAllyCap2024(14), 2)
assert.equal(groupRecoveryAllyCap2024(8), 1)
assert.equal(banneretEmanationFeet2024(10), 30)
assert.equal(banneretEmanationFeet2024(18), 60)

console.log('fighterBook2024Features.selfcheck ok')
