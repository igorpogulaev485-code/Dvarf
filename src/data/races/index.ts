/**
 * Справочник официальных рас D&D 5e (2014 lineage).
 *
 * Группировка — по книгам-источникам.
 * Эффекты (`RaceEffect`) рассчитаны на автоматическое применение к листу персонажа
 * через `computeRaceBonuses` / `applyRaceToCharacter`.
 */
export type {
  AbilityBonuses,
  AbilityScoreMode,
  AgeBlock,
  AppliedRaceBonuses,
  AppliedNaturalWeapon,
  CreatureSize,
  LanguageGrant,
  RaceEffect,
  RaceEntry,
  RaceSourceId,
  RaceSourceMeta,
  RaceTrait,
  SheetSlot,
  SpeedBlock,
  NaturalWeaponEffect,
} from './types';

export {
  SHEET_SLOT_META,
  RACE_EFFECT_SHEET_SLOT,
  RACE_EFFECT_CATALOG,
} from './types';

export { RACE_SOURCES, RACE_SOURCE_ORDER } from './sources';
export {
  ALL_RACES,
  getRace,
  getRacesBySource,
  getRaceCompendiumGrouped,
  getRootRacesBySource,
  getSubraces,
  resolveRaceTraits,
  getDisplayName,
  hasMotmUpdate,
  listPlayableRaceIds,
} from './registry';
export { MOTM_UPDATED_RACE_IDS } from './motm';
export {
  computeRaceBonuses,
  applyRaceToCharacter,
  type RaceApplicationChoices,
  type ApplyRaceOptions,
} from './applyRace';
export {
  listRaceCatalog,
  filterRaceCatalog,
  buildRaceUiFields,
  validateRaceChoices,
  resolveAbilityOverrides,
  type RaceUiField,
  type RaceCatalogItem,
} from './choiceSchema';
