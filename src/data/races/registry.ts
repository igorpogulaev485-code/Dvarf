import type { RaceEntry, RaceSourceId, RaceTrait } from './types';
import { RACE_SOURCES, RACE_SOURCE_ORDER } from './sources';
import { PHB_RACES } from './phb';
import { EEPC_RACES } from './eepc';
import { SCAG_RACES } from './scag';
import { VOLO_RACES } from './volo';
import { MTOF_RACES } from './mtof';
import { GGR_RACES } from './ggr';
import { ERLW_RACES } from './erlw';
import { EGW_RACES } from './egw';
import { MOT_RACES } from './mot';
import { VRGR_RACES } from './vrgr';
import { AAG_RACES } from './aag';
import { FTD_RACES } from './ftd';
import { MOTM_RACES, MOTM_UPDATED_RACE_IDS } from './motm';
import { UA_RACES } from './ua';

export const ALL_RACES: RaceEntry[] = [
  ...PHB_RACES,
  ...EEPC_RACES,
  ...SCAG_RACES,
  ...VOLO_RACES,
  ...MTOF_RACES,
  ...GGR_RACES,
  ...ERLW_RACES,
  ...EGW_RACES,
  ...MOT_RACES,
  ...VRGR_RACES,
  ...AAG_RACES,
  ...FTD_RACES,
  ...MOTM_RACES,
  ...UA_RACES,
];

const byId = new Map<string, RaceEntry>();
for (const race of ALL_RACES) {
  if (byId.has(race.id)) {
    console.warn(`[races] duplicate id: ${race.id}`);
  }
  byId.set(race.id, race);
}

export function getRace(id: string): RaceEntry | undefined {
  return byId.get(id);
}

export function getRacesBySource(source: RaceSourceId): RaceEntry[] {
  return ALL_RACES.filter((r) => r.source === source);
}

/** Все записи справочника, сгруппированные по книгам (включая подрасы). */
export function getRaceCompendiumGrouped(): {
  source: RaceSourceId;
  meta: (typeof RACE_SOURCES)[RaceSourceId];
  races: RaceEntry[];
}[] {
  return RACE_SOURCE_ORDER.map((source) => ({
    source,
    meta: RACE_SOURCES[source],
    races: ALL_RACES.filter((r) => r.source === source),
  })).filter((g) => g.races.length > 0);
}

/** Только «корневые» расы книги (без подрас/вариантов). */
export function getRootRacesBySource(source: RaceSourceId): RaceEntry[] {
  return ALL_RACES.filter(
    (r) => r.source === source && (r.kind === 'race' || !r.parentId),
  );
}

/** Подрасы / варианты конкретной расы. */
export function getSubraces(parentId: string): RaceEntry[] {
  return ALL_RACES.filter((r) => r.parentId === parentId);
}

/**
 * Черты для применения: родитель (если есть) + выбранная запись.
 * Скорость/тёмное зрение из подрасы перекрывают родительские через effects.
 */
export function resolveRaceTraits(raceId: string): RaceTrait[] {
  const entry = getRace(raceId);
  if (!entry) return [];
  const parent = entry.parentId ? getRace(entry.parentId) : undefined;
  const traits = [...(parent?.traits ?? []), ...entry.traits];

  // Подмена тёмного зрения: если у подрасы есть superior darkvision — убираем обычное родителя
  const hasSuperiorDarkvision = entry.traits.some((t) =>
    t.effects?.some((e) => e.type === 'darkvision' && e.feet > 60),
  );
  if (hasSuperiorDarkvision && parent) {
    return traits.filter((t) => {
      if (!parent.traits.includes(t)) return true;
      const onlyNormalDv =
        t.effects?.length === 1 &&
        t.effects[0].type === 'darkvision' &&
        t.effects[0].feet <= 60;
      return !onlyNormalDv;
    });
  }
  return traits;
}

export function getDisplayName(raceId: string): string {
  const entry = getRace(raceId);
  if (!entry) return raceId;
  if (!entry.parentId) return entry.nameRu;
  const parent = getRace(entry.parentId);
  if (!parent) return entry.nameRu;
  // «Дварф (холмовой)» — если имя подрасы уже содержит родителя, не дублируем
  if (entry.nameRu.toLowerCase().includes(parent.nameRu.toLowerCase())) {
    return entry.nameRu;
  }
  return `${parent.nameRu} (${entry.nameRu})`;
}

export function hasMotmUpdate(raceId: string): boolean {
  const entry = getRace(raceId);
  if (!entry) return false;
  if (entry.motmUpdate) return true;
  if (entry.parentId && MOTM_UPDATED_RACE_IDS.includes(entry.parentId as (typeof MOTM_UPDATED_RACE_IDS)[number])) {
    return true;
  }
  return MOTM_UPDATED_RACE_IDS.includes(raceId as (typeof MOTM_UPDATED_RACE_IDS)[number]);
}

export function listPlayableRaceIds(): string[] {
  return ALL_RACES.filter((r) => r.id !== 'motm-framework' && r.id !== 'ua-note').map((r) => r.id);
}
