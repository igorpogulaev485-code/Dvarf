/**
 * Self-check for Artificer 2024 FINAL names and table helpers.
 * Run: npx tsx src/shared/dnd/artificer2024Features.selfcheck.ts
 */
import {
  ADVANCED_ARTIFICE_NAME_RU,
  ALCHEMICAL_SAVANT_NAME_RU,
  ARCANE_FIREARM_NAME_RU,
  ARCANE_JOLT_NAME_RU,
  ARMOR_MODEL_DREADNAUGHT_RU,
  ARMOR_MODEL_INFILTRATOR_RU,
  ARMOR_MODIFICATIONS_NAME_RU,
  ARTIFICER_CLASS_NAME_RU_2024,
  ARTIFICER_FEATURE_NAMES_BY_ID,
  ARTIFICER_SUBCLASS_SLUGS_2024,
  BATTLE_READY_NAME_RU,
  CHEMICAL_MASTERY_NAME_RU,
  cheatDeathHpRestored2024,
  experimentalElixirCount2024,
  FLASH_OF_GENIUS_NAME_RU,
  isEfaArtificerSubclassSlug,
  isOutOfPackArtificerSubclassSlug,
  MAGIC_ITEM_ADEPT_NAME_RU,
  MAGIC_ITEM_TINKER_NAME_RU,
  MAGIC_OF_MAKING_NAME_RU,
  PERFECTED_ARMOR_NAME_RU,
  replicateLimits2024,
  SOUL_OF_ARTIFICE_NAME_RU,
  SPELL_STORING_ITEM_NAME_RU,
  spellStoringItemCharges2024,
} from './artificer2024Features.ts'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`)
}

assert(ARTIFICER_CLASS_NAME_RU_2024 === 'Артефактор', 'class 2024 name')
assert(ARTIFICER_FEATURE_NAMES_BY_ID['flash-of-genius'] === FLASH_OF_GENIUS_NAME_RU, 'flash name')
assert(FLASH_OF_GENIUS_NAME_RU === 'Вспышка гениальности', 'flash final')
assert(MAGIC_ITEM_ADEPT_NAME_RU === 'Адепт магических предметов', 'adept final')
assert(SPELL_STORING_ITEM_NAME_RU === 'Предмет, хранящий заклинание', 'ssi final')
assert(ADVANCED_ARTIFICE_NAME_RU === 'Изобретательность', 'advanced final')
assert(SOUL_OF_ARTIFICE_NAME_RU === 'Душа творения', 'soul final')
assert(MAGIC_OF_MAKING_NAME_RU === 'Магия вещей', 'making final')
assert(MAGIC_ITEM_TINKER_NAME_RU === 'Магический мастеровой', 'tinker final')
assert(ALCHEMICAL_SAVANT_NAME_RU === 'Знаток алхимии', 'savant final')
assert(CHEMICAL_MASTERY_NAME_RU === 'Химическое мастерство', 'chem final')
assert(ARCANE_FIREARM_NAME_RU === 'Магическое огнестрельное', 'firearm final')
assert(BATTLE_READY_NAME_RU === 'Готов к бою', 'battle ready final')
assert(ARCANE_JOLT_NAME_RU === 'Магический импульс', 'jolt final')
assert(ARMOR_MODIFICATIONS_NAME_RU === 'Модификации доспеха', 'armor mods final')
assert(PERFECTED_ARMOR_NAME_RU === 'Совершенный доспех', 'perfected final')
assert(ARMOR_MODEL_DREADNAUGHT_RU === 'Дредноут', 'dreadnaught')
assert(ARMOR_MODEL_INFILTRATOR_RU === 'Диверсант', 'infiltrator not Лазутчик')

assert(replicateLimits2024(1).plansKnown === 0, 'L1 no plans')
assert(replicateLimits2024(2).plansKnown === 4 && replicateLimits2024(2).magicItems === 2, 'L2 plans')
assert(replicateLimits2024(5).magicItems === 2, 'L5 items 2')
assert(replicateLimits2024(11).plansKnown === 6 && replicateLimits2024(11).magicItems === 4, 'L11')
assert(experimentalElixirCount2024(3) === 2, 'elixir L3 = 2')
assert(experimentalElixirCount2024(5) === 3, 'elixir L5 = 3')
assert(spellStoringItemCharges2024(3) === 6, 'ssi charges')
assert(spellStoringItemCharges2024(0) === 2, 'ssi min 2')
assert(cheatDeathHpRestored2024(2) === 40, 'cheat death 20×n')

assert(isEfaArtificerSubclassSlug(ARTIFICER_SUBCLASS_SLUGS_2024.cartographer), 'cartographer EFA')
assert(isOutOfPackArtificerSubclassSlug('artificer__reanimator'), 'reanimator out')
assert(!isEfaArtificerSubclassSlug('artificer__reanimator'), 'reanimator not EFA picker')

console.log('artificer2024Features.selfcheck: ok')
