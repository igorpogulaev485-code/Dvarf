import type { AbilityKey, Character, SkillKey } from '../../types/character';
import type {
  AbilityBonuses,
  AppliedRaceBonuses,
  LanguageGrant,
  RaceEffect,
  RaceEntry,
  RaceTrait,
  SpeedBlock,
} from './types';
import { getRace, resolveRaceTraits, getDisplayName } from './registry';

export interface RaceApplicationChoices {
  /** Выбранные option id по choice.id */
  choices?: Record<string, string | string[]>;
  /**
   * Для гибкого ASI (MotM / lineage / variant human):
   * ключ — характеристика, значение — бонус.
   */
  abilityOverrides?: AbilityBonuses;
  /** Режим MotM: игнорировать фиксированный ASI исходной книги */
  useMotmAsi?: boolean;
}

function emptyApplied(raceId: string, displayNameRu: string): AppliedRaceBonuses {
  return {
    raceId,
    displayNameRu,
    abilityBonuses: {},
    speed: { walk: 30 },
    size: 'medium',
    languages: { fixed: [] },
    skillProficiencies: [],
    skillChoices: 0,
    toolProficiencies: [],
    weaponProficiencies: [],
    armorProficiencies: [],
    damageResistances: [],
    damageImmunities: [],
    conditionImmunities: [],
    hpMaxPerLevel: 0,
    acBonus: 0,
    powerfulBuild: false,
    cantrips: [],
    spells: [],
    featuresText: '',
    proficienciesText: '',
    pendingChoices: [],
  };
}

function mergeLanguages(base: LanguageGrant, extra: LanguageGrant): LanguageGrant {
  return {
    fixed: [...new Set([...base.fixed, ...extra.fixed])],
    choose: (base.choose ?? 0) + (extra.choose ?? 0) || undefined,
  };
}

function resolveAbilityBonuses(
  entry: RaceEntry,
  parent: RaceEntry | undefined,
  choices: RaceApplicationChoices,
): AbilityBonuses {
  if (choices.abilityOverrides && Object.keys(choices.abilityOverrides).length > 0) {
    return { ...choices.abilityOverrides };
  }

  if (choices.useMotmAsi || entry.abilityScore.kind === 'flexibleMotm') {
    return {};
  }

  const bonuses: AbilityBonuses = {};

  const applyMode = (mode: RaceEntry['abilityScore']) => {
    if (mode.kind === 'fixed' || mode.kind === 'custom' || mode.kind === 'fixedPlusChoose') {
      for (const [k, v] of Object.entries(mode.bonuses)) {
        const key = k as AbilityKey;
        bonuses[key] = (bonuses[key] ?? 0) + (v ?? 0);
      }
    } else if (mode.kind === 'allPlusOne') {
      (['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as AbilityKey[]).forEach(
        (a) => {
          bonuses[a] = (bonuses[a] ?? 0) + 1;
        },
      );
    }
    // chooseTwoPlusOne / flexibleMotm — ждут abilityOverrides
  };

  if (parent) applyMode(parent.abilityScore);
  applyMode(entry.abilityScore);
  return bonuses;
}

function applyEffect(
  effect: RaceEffect,
  out: AppliedRaceBonuses,
  selected: Record<string, string | string[]>,
): void {
  switch (effect.type) {
    case 'darkvision':
      out.darkvisionFeet = Math.max(out.darkvisionFeet ?? 0, effect.feet);
      break;
    case 'speedOverride':
      out.speed = { ...out.speed, ...effect.speed };
      break;
    case 'skillProficiency':
      out.skillProficiencies = [...new Set([...out.skillProficiencies, ...effect.skills])];
      break;
    case 'skillChoice':
      out.skillChoices += effect.count;
      break;
    case 'toolProficiency':
      out.toolProficiencies = [...new Set([...out.toolProficiencies, ...effect.tools])];
      break;
    case 'toolChoice':
      out.pendingChoices.push({
        id: `tool:${effect.options.join('|')}`,
        nameRu: 'Инструмент',
        optionIds: effect.options,
      });
      break;
    case 'weaponProficiency':
      out.weaponProficiencies = [...new Set([...out.weaponProficiencies, ...effect.weapons])];
      break;
    case 'armorProficiency':
      out.armorProficiencies = [...new Set([...out.armorProficiencies, ...effect.armors])];
      break;
    case 'damageResistance':
      out.damageResistances = [...new Set([...out.damageResistances, ...effect.damageTypes])];
      break;
    case 'damageImmunity':
      out.damageImmunities = [...new Set([...out.damageImmunities, ...effect.damageTypes])];
      break;
    case 'conditionImmunity':
      out.conditionImmunities = [...new Set([...out.conditionImmunities, ...effect.conditions])];
      break;
    case 'hpMaxPerLevel':
      out.hpMaxPerLevel += effect.amount;
      break;
    case 'naturalArmor':
      out.naturalArmorFormula = effect.formula;
      break;
    case 'acBonus':
      out.acBonus += effect.amount;
      break;
    case 'powerfulBuild':
      out.powerfulBuild = true;
      break;
    case 'cantrip':
      out.cantrips.push({ spellRu: effect.spellRu, ability: effect.ability });
      break;
    case 'spell':
      out.spells.push({
        spellRu: effect.spellRu,
        fromLevel: effect.fromLevel,
        uses: effect.uses,
        ability: effect.ability,
      });
      break;
    case 'language':
      out.languages = mergeLanguages(out.languages, {
        fixed: effect.fixed ?? [],
        choose: effect.choose,
      });
      break;
    case 'choice': {
      const picked = selected[effect.id];
      if (!picked) {
        out.pendingChoices.push({
          id: effect.id,
          nameRu: effect.nameRu,
          optionIds: effect.options.map((o) => o.id),
        });
        break;
      }
      const ids = Array.isArray(picked) ? picked : [picked];
      for (const id of ids) {
        const opt = effect.options.find((o) => o.id === id);
        if (opt?.effects) {
          for (const nested of opt.effects) applyEffect(nested, out, selected);
        }
      }
      break;
    }
    case 'feat':
      out.pendingChoices.push({
        id: 'feat',
        nameRu: 'Черта',
        optionIds: [],
      });
      break;
    case 'savingThrowAdvantage':
      // текстовая черта — попадает в featuresText через trait.description
      break;
    default:
      break;
  }
}

function formatSpeed(speed: SpeedBlock): string {
  const parts = [`${speed.walk} фут.`];
  if (speed.fly) parts.push(`полёт ${speed.fly}`);
  if (speed.swim) parts.push(`плавание ${speed.swim}`);
  if (speed.climb) parts.push(`лазание ${speed.climb}`);
  return parts.join(', ');
}

function buildFeaturesText(traits: RaceTrait[]): string {
  return traits
    .map((t) => `${t.nameRu}. ${t.descriptionRu}`)
    .join('\n\n');
}

function buildProficienciesText(out: AppliedRaceBonuses): string {
  const lines: string[] = [];
  if (out.weaponProficiencies.length) {
    lines.push(`Оружие: ${out.weaponProficiencies.join(', ')}`);
  }
  if (out.armorProficiencies.length) {
    lines.push(`Доспехи: ${out.armorProficiencies.join(', ')}`);
  }
  if (out.toolProficiencies.length) {
    lines.push(`Инструменты: ${out.toolProficiencies.join(', ')}`);
  }
  const langs = [...out.languages.fixed];
  if (out.languages.choose) langs.push(`+${out.languages.choose} на выбор`);
  if (langs.length) lines.push(`Языки: ${langs.join(', ')}`);
  if (out.damageResistances.length) {
    lines.push(`Сопротивление: ${out.damageResistances.join(', ')}`);
  }
  if (out.damageImmunities.length) {
    lines.push(`Иммунитет (урон): ${out.damageImmunities.join(', ')}`);
  }
  if (out.darkvisionFeet) {
    lines.push(`Тёмное зрение: ${out.darkvisionFeet} футов`);
  }
  return lines.join('\n');
}

/**
 * Собирает все расовые бонусы (родитель + подраса) в снимок для листа.
 */
export function computeRaceBonuses(
  raceId: string,
  choices: RaceApplicationChoices = {},
): AppliedRaceBonuses | null {
  const entry = getRace(raceId);
  if (!entry) return null;

  const parent = entry.parentId ? getRace(entry.parentId) : undefined;
  const displayNameRu = getDisplayName(raceId);
  const out = emptyApplied(raceId, displayNameRu);

  out.abilityBonuses = resolveAbilityBonuses(entry, parent, choices);
  out.size = entry.size;
  out.sizeNotesRu = entry.sizeNotesRu ?? parent?.sizeNotesRu;
  out.speed = { ...(parent?.speed ?? { walk: 30 }), ...entry.speed };
  out.languages = mergeLanguages(
    parent?.languages ?? { fixed: [] },
    entry.languages,
  );

  const traits = resolveRaceTraits(raceId);
  const selected = choices.choices ?? {};

  for (const trait of traits) {
    for (const effect of trait.effects ?? []) {
      applyEffect(effect, out, selected);
    }
  }

  out.featuresText = buildFeaturesText(traits);
  out.proficienciesText = buildProficienciesText(out);
  return out;
}

export interface ApplyRaceOptions extends RaceApplicationChoices {
  /**
   * Если true — прибавляет ASI к текущим ability scores.
   * По умолчанию false (пока нет разделения «база / раса»).
   */
  addAbilityScores?: boolean;
  /** Заменять featuresAndTraits текстом расы (по умолчанию дописывать) */
  replaceFeatures?: boolean;
  /** Полное состояние попапа */
  raceChoices?: import('../../types/character').RaceChoicesState;
  /** Своё имя на листе (хомбрю или override) */
  displayNameRu?: string;
}

/**
 * Накладывает расовые плюшки на персонажа.
 * Не мутирует исходный объект — возвращает новый.
 */
export function applyRaceToCharacter(
  character: Character,
  raceId: string,
  options: ApplyRaceOptions = {},
): Character {
  const raceChoices = options.raceChoices;
  const mergedChoices: RaceApplicationChoices = {
    ...options,
    choices: {
      ...options.choices,
      ...raceChoices?.choices,
    },
    abilityOverrides: options.abilityOverrides ?? raceChoices?.abilityBonuses,
  };

  if (raceId === 'homebrew') {
    const name = raceChoices?.customName?.trim() || options.displayNameRu || 'Хомбрю';
    return {
      ...character,
      race: name,
      raceId: 'homebrew',
      raceChoices: {
        customName: name,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  const bonuses = computeRaceBonuses(raceId, mergedChoices);
  if (!bonuses) return character;

  const abilities = { ...character.abilities };
  if (options.addAbilityScores) {
    for (const [k, v] of Object.entries(bonuses.abilityBonuses)) {
      const key = k as AbilityKey;
      abilities[key] = (abilities[key] ?? 10) + (v ?? 0);
    }
  }

  const pickedSkills = (raceChoices?.pickedSkills ?? []) as SkillKey[];
  const skillProficiencies = [
    ...new Set([
      ...character.skillProficiencies,
      ...bonuses.skillProficiencies,
      ...pickedSkills,
    ]),
  ] as SkillKey[];

  const langExtra = raceChoices?.pickedLanguages?.filter(Boolean) ?? [];
  let profLang = options.replaceFeatures
    ? bonuses.proficienciesText
    : [character.otherProficienciesAndLanguages, bonuses.proficienciesText]
        .filter(Boolean)
        .join('\n');
  if (langExtra.length) {
    profLang = [profLang, `Языки (выбор): ${langExtra.join(', ')}`].filter(Boolean).join('\n');
  }

  const freeNotes = Object.entries(raceChoices?.freeText ?? {})
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v}`);

  let features = options.replaceFeatures
    ? bonuses.featuresText
    : [character.featuresAndTraits, bonuses.featuresText].filter(Boolean).join('\n\n');
  if (freeNotes.length) {
    features = [features, freeNotes.join('\n')].filter(Boolean).join('\n\n');
  }

  const cantrips = [
    ...character.cantrips,
    ...bonuses.cantrips.map((c) => c.spellRu),
    ...Object.entries(raceChoices?.freeText ?? {})
      .filter(([k, v]) => k.includes('cantrip') && v?.trim())
      .map(([, v]) => v!.trim()),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const displayName = options.displayNameRu ?? bonuses.displayNameRu;

  return {
    ...character,
    race: displayName,
    raceId,
    raceChoices,
    abilities,
    skillProficiencies,
    speed: formatSpeed(bonuses.speed),
    featuresAndTraits: features,
    otherProficienciesAndLanguages: profLang,
    cantrips,
    updatedAt: new Date().toISOString(),
  };
}
