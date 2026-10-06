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
  CreatureSize,
  LanguageGrant,
  RaceEffect,
  RaceEntry,
  RaceSourceId,
  RaceSourceMeta,
  RaceTrait,
  SpeedBlock,
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
