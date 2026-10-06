import type { AbilityKey, RaceChoicesState, SkillKey } from '../../types/character';
import { ABILITY_LABELS_RU, SKILL_DEFS } from '../../types/character';
import type { AbilityBonuses, RaceEntry, RaceEffect } from './types';
import { RACE_SOURCES } from './sources';
import { getRace, getSubraces, resolveRaceTraits, ALL_RACES } from './registry';

const ALL_ABILITIES: AbilityKey[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
];

/** Поля попапа — набор виджетов, уникальный для каждой расы. */
export type RaceUiField =
  | {
      type: 'homebrewName';
      id: 'homebrewName';
      labelRu: string;
    }
  | {
      type: 'subrace';
      id: 'subrace';
      labelRu: string;
      options: { id: string; labelRu: string; sourceRu: string }[];
    }
  | {
      type: 'asiFixed';
      id: 'asiFixed';
      labelRu: string;
      bonuses: AbilityBonuses;
    }
  | {
      type: 'asiChooseTwo';
      id: 'asiChooseTwo';
      labelRu: string;
    }
  | {
      type: 'asiFlexible';
      id: 'asiFlexible';
      labelRu: string;
    }
  | {
      type: 'asiFixedPlusChoose';
      id: 'asiFixedPlusChoose';
      labelRu: string;
      fixed: AbilityBonuses;
      choosePlusOne: number;
    }
  | {
      type: 'language';
      id: string;
      labelRu: string;
      count: number;
    }
  | {
      type: 'skill';
      id: string;
      labelRu: string;
      count: number;
      /** Если задан — выбор только из пула */
      pool?: SkillKey[];
    }
  | {
      type: 'tool';
      id: string;
      labelRu: string;
      options: string[];
      count: number;
    }
  | {
      type: 'option';
      id: string;
      labelRu: string;
      options: { id: string; labelRu: string }[];
      /** Сколько выбрать (по умолчанию 1) */
      count?: number;
    }
  | {
      type: 'freeText';
      id: string;
      labelRu: string;
      placeholderRu?: string;
    }
  | {
      type: 'info';
      id: string;
      labelRu: string;
      textRu: string;
    };

export type RaceCatalogItem = {
  id: string;
  labelRu: string;
  sourceRu: string;
  kind: RaceEntry['kind'];
  /** Есть подрасы — попап начнётся с их выбора */
  hasSubraces: boolean;
  searchText: string;
};

function sourceLabel(entry: RaceEntry): string {
  return RACE_SOURCES[entry.source]?.nameRu ?? entry.source;
}

/** Элементы автокомплита: листья + родители с подрасами + хомбрю. */
export function listRaceCatalog(): RaceCatalogItem[] {
  const items: RaceCatalogItem[] = [];

  for (const entry of ALL_RACES) {
    if (entry.id === 'motm-framework' || entry.id === 'ua-note') continue;

    const subs = getSubraces(entry.id);
    const isRootWithSubs = entry.kind === 'race' && subs.length > 0;
    const isLeaf =
      entry.kind === 'subrace' ||
      entry.kind === 'variant' ||
      (entry.kind === 'race' && subs.length === 0);

    if (!isRootWithSubs && !isLeaf) continue;

    const parent = entry.parentId ? getRace(entry.parentId) : undefined;
    const labelRu =
      parent && !entry.nameRu.toLowerCase().includes(parent.nameRu.toLowerCase())
        ? `${parent.nameRu} — ${entry.nameRu}`
        : entry.nameRu;

    items.push({
      id: entry.id,
      labelRu,
      sourceRu: sourceLabel(entry),
      kind: entry.kind,
      hasSubraces: isRootWithSubs,
      searchText: [labelRu, entry.nameEn, entry.nameRu, parent?.nameRu, sourceLabel(entry)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    });
  }

  return items.sort((a, b) => a.labelRu.localeCompare(b.labelRu, 'ru'));
}

export function filterRaceCatalog(query: string): RaceCatalogItem[] {
  const q = query.trim().toLowerCase();
  const all = listRaceCatalog();
  if (!q) return all;
  return all.filter((item) => item.searchText.includes(q));
}

function collectEffects(entry: RaceEntry, parent?: RaceEntry): RaceEffect[] {
  const traits = resolveRaceTraits(entry.id);
  // If resolving with parent already merges — resolveRaceTraits(entry.id) is enough
  void parent;
  return traits.flatMap((t) => t.effects ?? []);
}

function languageChooseCount(entry: RaceEntry, parent?: RaceEntry): number {
  return (parent?.languages.choose ?? 0) + (entry.languages.choose ?? 0);
}

function describeBonuses(bonuses: AbilityBonuses): string {
  return Object.entries(bonuses)
    .filter(([, v]) => v)
    .map(([k, v]) => `${v! >= 0 ? '+' : ''}${v} ${ABILITY_LABELS_RU[k as AbilityKey]}`)
    .join(', ');
}

/**
 * Строит уникальный набор полей попапа для выбранной записи автокомплита.
 * `resolvedSubraceId` — если пользователь уже выбрал подрасу внутри попапа.
 */
export function buildRaceUiFields(
  selectedId: string,
  resolvedSubraceId?: string,
): { titleRu: string; fields: RaceUiField[]; effectiveRaceId: string } {
  const selected = getRace(selectedId);
  if (!selected) {
    return { titleRu: 'Раса', fields: [], effectiveRaceId: selectedId };
  }

  if (selected.id === 'homebrew') {
    return {
      titleRu: 'Хомбрю',
      effectiveRaceId: 'homebrew',
      fields: [
        {
          type: 'homebrewName',
          id: 'homebrewName',
          labelRu: 'Название расы на листе',
        },
        {
          type: 'info',
          id: 'homebrew-hint',
          labelRu: 'Дальше',
          textRu:
            'После подтверждения на листе вручную укажите характеристики, скорость, черты и владения.',
        },
      ],
    };
  }

  const subs = getSubraces(selectedId);
  const needsSubrace = selected.kind === 'race' && subs.length > 0 && !resolvedSubraceId;

  if (needsSubrace) {
    return {
      titleRu: selected.nameRu,
      effectiveRaceId: selectedId,
      fields: [
        {
          type: 'subrace',
          id: 'subrace',
          labelRu: 'Подраса / вариант',
          options: [
            {
              id: selected.id,
              labelRu: `${selected.nameRu} (базовый)`,
              sourceRu: sourceLabel(selected),
            },
            ...subs.map((s) => ({
              id: s.id,
              labelRu: s.nameRu,
              sourceRu: sourceLabel(s),
            })),
          ],
        },
      ],
    };
  }

  const effectiveId = resolvedSubraceId ?? selectedId;
  const entry = getRace(effectiveId)!;
  const parent = entry.parentId ? getRace(entry.parentId) : undefined;
  const fields: RaceUiField[] = [];

  // ASI
  const modes = [parent?.abilityScore, entry.abilityScore].filter(Boolean) as RaceEntry['abilityScore'][];
  // Merge display: prefer leaf mode for interactive, show combined fixed from both
  const leafMode = entry.abilityScore;
  const parentMode = parent?.abilityScore;

  if (leafMode.kind === 'flexibleMotm' || parentMode?.kind === 'flexibleMotm') {
    fields.push({
      type: 'asiFlexible',
      id: 'asiFlexible',
      labelRu: 'Повышение характеристик (+2 и +1, или +1 к трём)',
    });
  } else if (leafMode.kind === 'chooseTwoPlusOne' || parentMode?.kind === 'chooseTwoPlusOne') {
    fields.push({
      type: 'asiChooseTwo',
      id: 'asiChooseTwo',
      labelRu: 'Повышение характеристик (+1 к двум разным)',
    });
  } else if (leafMode.kind === 'fixedPlusChoose' || parentMode?.kind === 'fixedPlusChoose') {
    const mode = leafMode.kind === 'fixedPlusChoose' ? leafMode : (parentMode as Extract<RaceEntry['abilityScore'], { kind: 'fixedPlusChoose' }>);
    const fixed: AbilityBonuses = { ...mode.bonuses };
    if (parentMode?.kind === 'fixed') {
      for (const [k, v] of Object.entries(parentMode.bonuses)) {
        const key = k as AbilityKey;
        fixed[key] = (fixed[key] ?? 0) + (v ?? 0);
      }
    }
    if (leafMode.kind === 'fixed' && parentMode?.kind === 'fixedPlusChoose') {
      // shouldn't happen
    }
    // Also merge parent fixed into half-elf case (half-elf has no parent)
    if (parentMode?.kind === 'fixedPlusChoose' && leafMode.kind === 'fixed') {
      for (const [k, v] of Object.entries(leafMode.bonuses)) {
        const key = k as AbilityKey;
        fixed[key] = (fixed[key] ?? 0) + (v ?? 0);
      }
    }
    fields.push({
      type: 'asiFixedPlusChoose',
      id: 'asiFixedPlusChoose',
      labelRu: `Повышение характеристик (${describeBonuses(mode.bonuses)}, ещё +1 ×${mode.choosePlusOne})`,
      fixed: mode.bonuses,
      choosePlusOne: mode.choosePlusOne,
    });
  } else if (leafMode.kind === 'allPlusOne' || parentMode?.kind === 'allPlusOne') {
    fields.push({
      type: 'asiFixed',
      id: 'asiFixed',
      labelRu: 'Повышение характеристик',
      bonuses: {
        strength: 1,
        dexterity: 1,
        constitution: 1,
        intelligence: 1,
        wisdom: 1,
        charisma: 1,
      },
    });
  } else {
    const fixed: AbilityBonuses = {};
    for (const mode of modes) {
      if (mode.kind === 'fixed' || mode.kind === 'custom') {
        for (const [k, v] of Object.entries(mode.bonuses)) {
          const key = k as AbilityKey;
          fixed[key] = (fixed[key] ?? 0) + (v ?? 0);
        }
      }
    }
    if (Object.keys(fixed).length) {
      fields.push({
        type: 'asiFixed',
        id: 'asiFixed',
        labelRu: 'Повышение характеристик',
        bonuses: fixed,
      });
    }
  }

  const langCount = languageChooseCount(entry, parent);
  if (langCount > 0) {
    fields.push({
      type: 'language',
      id: 'languages',
      labelRu: langCount === 1 ? 'Дополнительный язык' : `Дополнительные языки (×${langCount})`,
      count: langCount,
    });
  }

  const effects = collectEffects(entry);
  let skillChoiceOrdinal = 0;
  for (const effect of effects) {
    switch (effect.type) {
      case 'skillChoice': {
        skillChoiceOrdinal += 1;
        fields.push({
          type: 'skill',
          id: `skillChoice:${skillChoiceOrdinal}`,
          labelRu: effect.count === 1 ? 'Навык' : `Навыки (выберите ${effect.count})`,
          count: effect.count,
        });
        break;
      }
      case 'toolChoice':
        fields.push({
          type: 'tool',
          id: `tool:${effect.options.join('|')}`,
          labelRu: 'Инструменты',
          options: effect.options,
          count: effect.count,
        });
        break;
      case 'choice':
        if (effect.options.length === 0) {
          fields.push({
            type: 'freeText',
            id: effect.id,
            labelRu: effect.nameRu,
            placeholderRu: 'Введите название',
          });
        } else {
          fields.push({
            type: 'option',
            id: effect.id,
            labelRu: effect.nameRu,
            options: effect.options.map((o) => ({ id: o.id, labelRu: o.labelRu })),
            count: 1,
          });
        }
        break;
      case 'feat':
        fields.push({
          type: 'freeText',
          id: 'feat',
          labelRu: 'Черта',
          placeholderRu: 'Название черты (пока вручную)',
        });
        break;
      case 'language':
        if (effect.choose) {
          // already counted via languageChooseCount if on entry.languages;
          // trait-level extra languages
          fields.push({
            type: 'language',
            id: `lang-extra:${effect.choose}`,
            labelRu: `Язык (×${effect.choose})`,
            count: effect.choose,
          });
        }
        break;
      default:
        break;
    }
  }

  // Kenku / lizardfolk style: choice with skill options — already as option type.
  // Convert option fields that are clearly multi-skill picks when name says "Два"
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (f.type === 'option' && /два|2 /i.test(f.labelRu) && f.options.length >= 2) {
      fields[i] = { ...f, count: 2 };
    }
  }

  fields.push({
    type: 'info',
    id: 'apply-note',
    labelRu: 'На лист',
    textRu:
      'После «Готово» подтянутся скорость, владения, черты и заговоры расы (где они заданы в справочнике). Заглушки и ручные поля — на следующем этапе.',
  });

  const titleRu = parent
    ? entry.nameRu.toLowerCase().includes(parent.nameRu.toLowerCase())
      ? entry.nameRu
      : `${parent.nameRu} (${entry.nameRu})`
    : entry.nameRu;

  return { titleRu, fields, effectiveRaceId: effectiveId };
}

export function validateRaceChoices(
  fields: RaceUiField[],
  state: RaceChoicesState,
): string | null {
  for (const field of fields) {
    switch (field.type) {
      case 'homebrewName':
        if (!state.customName?.trim()) return 'Укажите название расы';
        break;
      case 'subrace':
        // handled outside via resolvedSubraceId
        break;
      case 'asiChooseTwo': {
        const entries = Object.entries(state.abilityBonuses ?? {}).filter(([, v]) => (v ?? 0) > 0);
        if (entries.length !== 2 || entries.some(([, v]) => v !== 1)) {
          return 'Выберите +1 к двум разным характеристикам';
        }
        break;
      }
      case 'asiFlexible': {
        const vals = Object.values(state.abilityBonuses ?? {}).filter((v) => (v ?? 0) > 0);
        const sum = vals.reduce((a, b) => a + (b ?? 0), 0);
        const okPlus2Plus1 =
          sum === 3 && vals.includes(2) && vals.filter((v) => v === 1).length === 1 && vals.length === 2;
        const okThree =
          sum === 3 && vals.length === 3 && vals.every((v) => v === 1);
        if (!okPlus2Plus1 && !okThree) {
          return 'Распределите +2 и +1, либо +1 к трём характеристикам';
        }
        break;
      }
      case 'asiFixedPlusChoose': {
        const extras = Object.entries(state.abilityBonuses ?? {}).filter(([k, v]) => {
          if ((field.fixed[k as AbilityKey] ?? 0) > 0) return false;
          return (v ?? 0) > 0;
        });
        if (
          extras.length !== field.choosePlusOne ||
          extras.some(([, v]) => v !== 1)
        ) {
          return `Выберите ещё +1 к ${field.choosePlusOne} характеристикам (кроме фиксированных)`;
        }
        break;
      }
      case 'language': {
        const n = state.pickedLanguages?.filter(Boolean).length ?? 0;
        if (n < field.count) return `Укажите язык (${field.count})`;
        break;
      }
      case 'skill': {
        const n = state.pickedSkills?.length ?? 0;
        // skills may be split across multiple skill fields — validate total at end
        void n;
        break;
      }
      case 'tool': {
        const picked = state.choices?.[field.id];
        const arr = picked == null ? [] : Array.isArray(picked) ? picked : [picked];
        if (arr.length < field.count) return 'Выберите инструмент';
        break;
      }
      case 'option': {
        const picked = state.choices?.[field.id];
        const arr = picked == null ? [] : Array.isArray(picked) ? picked : [picked];
        const need = field.count ?? 1;
        if (arr.length < need) return `Сделайте выбор: ${field.labelRu}`;
        break;
      }
      case 'freeText':
        if (!state.freeText?.[field.id]?.trim()) return `Заполните: ${field.labelRu}`;
        break;
      default:
        break;
    }
  }

  const skillFields = fields.filter((f) => f.type === 'skill') as Extract<RaceUiField, { type: 'skill' }>[];
  if (skillFields.length) {
    const need = skillFields.reduce((s, f) => s + f.count, 0);
    const have = new Set(state.pickedSkills ?? []).size;
    if (have < need) return `Выберите навыки (${need})`;
  }

  return null;
}

/** Собирает abilityOverrides для apply из state + fixed частей схемы. */
export function resolveAbilityOverrides(
  fields: RaceUiField[],
  state: RaceChoicesState,
): AbilityBonuses {
  const fromState = { ...(state.abilityBonuses ?? {}) };
  for (const field of fields) {
    if (field.type === 'asiFixed') {
      for (const [k, v] of Object.entries(field.bonuses)) {
        const key = k as AbilityKey;
        fromState[key] = (fromState[key] ?? 0) + (v ?? 0);
      }
    }
    if (field.type === 'asiFixedPlusChoose') {
      for (const [k, v] of Object.entries(field.fixed)) {
        const key = k as AbilityKey;
        fromState[key] = (fromState[key] ?? 0) + (v ?? 0);
      }
    }
  }
  return fromState;
}

export { ALL_ABILITIES, ABILITY_LABELS_RU, SKILL_DEFS };
