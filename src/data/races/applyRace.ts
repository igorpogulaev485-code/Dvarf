import type {
  AbilityKey,
  AttackRow,
  Character,
  RaceChoicesState,
  SkillKey,
} from '../../types/character';
import { abilityModifier, formatMod } from '../../types/character';
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
  choices?: Record<string, string | string[]>;
  abilityOverrides?: AbilityBonuses;
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
    naturalWeapons: [],
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
      (
        ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as AbilityKey[]
      ).forEach((a) => {
        bonuses[a] = (bonuses[a] ?? 0) + 1;
      });
    }
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
    case 'toolChoice': {
      const toolKey = `tool:${effect.options.join('|')}`;
      const picked = selected[toolKey];
      if (!picked) {
        out.pendingChoices.push({
          id: toolKey,
          nameRu: 'Инструмент',
          optionIds: effect.options,
        });
      } else {
        const tools = Array.isArray(picked) ? picked : [picked];
        out.toolProficiencies = [...new Set([...out.toolProficiencies, ...tools])];
      }
      break;
    }
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
    case 'naturalWeapon':
      out.naturalWeapons.push({
        nameRu: effect.nameRu,
        damageRu: effect.damageRu,
        ability: effect.ability,
      });
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
      out.pendingChoices.push({ id: 'feat', nameRu: 'Черта', optionIds: [] });
      break;
    case 'savingThrowAdvantage':
      break;
    default:
      break;
  }
}

export function formatSpeed(speed: SpeedBlock): string {
  const parts = [`${speed.walk} фут.`];
  if (speed.fly) parts.push(`полёт ${speed.fly}`);
  if (speed.swim) parts.push(`плавание ${speed.swim}`);
  if (speed.climb) parts.push(`лазание ${speed.climb}`);
  return parts.join(', ');
}

function buildFeaturesText(traits: RaceTrait[], bonuses: AppliedRaceBonuses): string {
  const blocks = traits.map((t) => `${t.nameRu}. ${t.descriptionRu}`);
  for (const sp of bonuses.spells) {
    blocks.push(
      `${sp.spellRu}. С ${sp.fromLevel} уровня, ${sp.uses}${sp.ability ? ` (${sp.ability})` : ''}.`,
    );
  }
  return blocks.join('\n\n');
}

function buildProficienciesText(
  out: AppliedRaceBonuses,
  extraLanguages: string[] = [],
): string {
  const lines: string[] = [];
  if (out.darkvisionFeet) {
    lines.push(`Тёмное зрение: ${out.darkvisionFeet} футов`);
  }
  if (out.weaponProficiencies.length) {
    lines.push(`Оружие: ${out.weaponProficiencies.join(', ')}`);
  }
  if (out.armorProficiencies.length) {
    lines.push(`Доспехи: ${out.armorProficiencies.join(', ')}`);
  }
  if (out.toolProficiencies.length) {
    lines.push(`Инструменты: ${out.toolProficiencies.join(', ')}`);
  }
  const langs = [...out.languages.fixed, ...extraLanguages.filter(Boolean)];
  if (out.languages.choose && !extraLanguages.length) {
    langs.push(`+${out.languages.choose} на выбор`);
  }
  if (langs.length) lines.push(`Языки: ${[...new Set(langs)].join(', ')}`);
  if (out.damageResistances.length) {
    lines.push(`Сопротивление: ${out.damageResistances.join(', ')}`);
  }
  if (out.damageImmunities.length) {
    lines.push(`Иммунитет (урон): ${out.damageImmunities.join(', ')}`);
  }
  if (out.conditionImmunities.length) {
    lines.push(`Иммунитет (состояние): ${out.conditionImmunities.join(', ')}`);
  }
  return lines.join('\n');
}

function attackBonusLabel(character: Character, ability?: AbilityKey): string {
  if (!ability) return '';
  const mod = abilityModifier(character.abilities[ability]) + character.proficiencyBonus;
  return formatMod(mod);
}

function mergeNaturalWeaponsIntoAttacks(
  character: Character,
  weapons: AppliedRaceBonuses['naturalWeapons'],
  previousNames: string[] = [],
): AttackRow[] {
  const withoutPrev = character.attacks.filter((row) => !previousNames.includes(row.name));
  const rows = [...withoutPrev];
  for (const w of weapons) {
    const exists = rows.some((r) => r.name === w.nameRu);
    if (exists) continue;
    const emptyIdx = rows.findIndex((r) => !r.name.trim());
    const next: AttackRow = {
      name: w.nameRu,
      attackBonus: attackBonusLabel(character, w.ability),
      damageType: w.damageRu,
    };
    if (emptyIdx >= 0) rows[emptyIdx] = next;
    else rows.push(next);
  }
  while (rows.length < 3) rows.push({ name: '', attackBonus: '', damageType: '' });
  return rows;
}

function stripAbilityBonuses(
  abilities: Record<AbilityKey, number>,
  bonuses?: AbilityBonuses,
): Record<AbilityKey, number> {
  if (!bonuses) return { ...abilities };
  const next = { ...abilities };
  for (const [k, v] of Object.entries(bonuses)) {
    const key = k as AbilityKey;
    next[key] = (next[key] ?? 10) - (v ?? 0);
  }
  return next;
}

function addAbilityBonuses(
  abilities: Record<AbilityKey, number>,
  bonuses: AbilityBonuses,
): Record<AbilityKey, number> {
  const next = { ...abilities };
  for (const [k, v] of Object.entries(bonuses)) {
    const key = k as AbilityKey;
    next[key] = (next[key] ?? 10) + (v ?? 0);
  }
  return next;
}

function parseHp(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function applyHpPerLevel(
  character: Character,
  nextPerLevel: number,
  prevPerLevel: number,
): { hitPointMax: string; hitPointCurrent: string } {
  const levelMatch = character.classAndLevel.match(/(\d+)\s*$/);
  const level = levelMatch ? Number(levelMatch[1]) : 1;
  const delta = (nextPerLevel - prevPerLevel) * Math.max(1, level);
  const max = parseHp(character.hitPointMax);
  const cur = parseHp(character.hitPointCurrent);
  if (max == null) {
    return { hitPointMax: character.hitPointMax, hitPointCurrent: character.hitPointCurrent };
  }
  const newMax = max + delta;
  const newCur =
    cur != null && cur === max ? newMax : cur != null ? Math.max(0, cur + delta) : character.hitPointCurrent;
  return {
    hitPointMax: String(newMax),
    hitPointCurrent: typeof newCur === 'number' ? String(newCur) : String(newCur),
  };
}

function computeArmorClass(
  character: Character,
  bonuses: AppliedRaceBonuses,
): string {
  if (bonuses.naturalArmorFormula) {
    const [baseStr, abl] = bonuses.naturalArmorFormula.split('+') as [string, string];
    const base = Number(baseStr);
    const key =
      abl === 'DEX' ? 'dexterity' : abl === 'CON' ? 'constitution' : null;
    if (key) {
      const ac = base + abilityModifier(character.abilities[key]) + bonuses.acBonus;
      return String(ac);
    }
  }
  if (bonuses.acBonus) {
    const cur = parseHp(character.armorClass);
    if (cur != null) return String(cur + bonuses.acBonus);
  }
  return character.armorClass;
}

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
  out.languages = mergeLanguages(parent?.languages ?? { fixed: [] }, entry.languages);

  const traits = resolveRaceTraits(raceId);
  const selected = choices.choices ?? {};

  for (const trait of traits) {
    for (const effect of trait.effects ?? []) {
      applyEffect(effect, out, selected);
    }
  }

  out.featuresText = buildFeaturesText(traits, out);
  out.proficienciesText = buildProficienciesText(out);
  return out;
}

export interface ApplyRaceOptions extends RaceApplicationChoices {
  /** @deprecated всегда применяем ASI со снятием предыдущих расовых */
  addAbilityScores?: boolean;
  replaceFeatures?: boolean;
  raceChoices?: RaceChoicesState;
  displayNameRu?: string;
}

/**
 * Накладывает расовые параметры на персонажа по SheetSlot-контракту.
 * Предыдущие расовые ASI / навыки / атаки снимаются перед записью новых.
 */
export function applyRaceToCharacter(
  character: Character,
  raceId: string,
  options: ApplyRaceOptions = {},
): Character {
  const raceChoices = options.raceChoices;
  const prev = character.raceChoices;
  const mergedChoices: RaceApplicationChoices = {
    ...options,
    choices: { ...options.choices, ...raceChoices?.choices },
    abilityOverrides: options.abilityOverrides ?? raceChoices?.abilityBonuses,
  };

  if (raceId === 'homebrew') {
    const name = raceChoices?.customName?.trim() || options.displayNameRu || 'Хомбрю';
    let abilities = stripAbilityBonuses(character.abilities, prev?.abilityBonuses);
    const prevSkills = new Set([
      ...(prev?.pickedSkills ?? []),
      ...(prev?.appliedSkillKeys ?? []),
    ]);
    const skillProficiencies = character.skillProficiencies.filter((s) => !prevSkills.has(s));
    const prevWeapons = prev?.appliedNaturalWeaponNames ?? [];
    const attacks = character.attacks.map((row) =>
      prevWeapons.includes(row.name) ? { name: '', attackBonus: '', damageType: '' } : row,
    );
    while (attacks.length < 3) attacks.push({ name: '', attackBonus: '', damageType: '' });
    const prevCantrips = new Set(prev?.appliedCantrips ?? []);
    const cantrips = character.cantrips.filter((c) => !prevCantrips.has(c));
    const { hitPointMax, hitPointCurrent } = applyHpPerLevel(
      character,
      0,
      prev?.appliedHpPerLevel ?? 0,
    );

    return {
      ...character,
      race: name,
      raceId: 'homebrew',
      raceChoices: { customName: name },
      abilities,
      skillProficiencies,
      attacks,
      cantrips,
      speed: '30 фут.',
      armorClass: prev?.appliedArmorClass ? '10' : character.armorClass,
      hitPointMax,
      hitPointCurrent,
      // Расовый текст снимаем — дальше руками
      featuresAndTraits: '',
      otherProficienciesAndLanguages: '',
      updatedAt: new Date().toISOString(),
    };
  }

  const bonuses = computeRaceBonuses(raceId, mergedChoices);
  if (!bonuses) return character;

  const pickedSkills = (raceChoices?.pickedSkills ?? []) as SkillKey[];
  const langExtra = raceChoices?.pickedLanguages?.filter(Boolean) ?? [];

  // 1) abilities — снять старые расовые, навесить новые
  let abilities = stripAbilityBonuses(character.abilities, prev?.abilityBonuses);
  abilities = addAbilityBonuses(abilities, bonuses.abilityBonuses);

  // 2) skills — убрать прошлые расовые, добавить фиксированные + выбранные
  const prevRacialSkills = new Set([
    ...(prev?.pickedSkills ?? []),
    ...(prev?.appliedSkillKeys ?? []),
  ]);
  const withoutPrevRacial = character.skillProficiencies.filter((s) => !prevRacialSkills.has(s));
  const skillProficiencies = [
    ...new Set([...withoutPrevRacial, ...bonuses.skillProficiencies, ...pickedSkills]),
  ] as SkillKey[];

  // 3) speed
  const speed = formatSpeed(bonuses.speed);

  // 4) otherProficiencies — тёмное зрение, языки, владения, сопротивления
  const profLang = buildProficienciesText(bonuses, langExtra);

  // 5) features
  const freeNotes = Object.entries(raceChoices?.freeText ?? {})
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => {
      if (k === 'feat') return `Черта: ${v}`;
      if (k.includes('cantrip')) return `Заговор (раса): ${v}`;
      return `${k}: ${v}`;
    });
  let features = bonuses.featuresText;
  if (freeNotes.length) features = [features, freeNotes.join('\n')].filter(Boolean).join('\n\n');

  // 6) cantrips
  const racialCantrips = [
    ...bonuses.cantrips.map((c) => c.spellRu),
    ...Object.entries(raceChoices?.freeText ?? {})
      .filter(([k, v]) => k.includes('cantrip') && v?.trim())
      .map(([, v]) => v!.trim()),
  ];
  const prevCantrips = new Set(prev?.appliedCantrips ?? []);
  const keptCantrips = character.cantrips.filter((c) => !prevCantrips.has(c));
  const cantrips = [...new Set([...keptCantrips, ...racialCantrips])];

  // 7) attacks — природное оружие
  const charForAttackBonus = { ...character, abilities };
  const attacks = mergeNaturalWeaponsIntoAttacks(
    charForAttackBonus,
    bonuses.naturalWeapons,
    prev?.appliedNaturalWeaponNames ?? [],
  );

  // 8) armorClass
  const armorClass = computeArmorClass({ ...character, abilities }, bonuses);

  // 9) hitPointMax
  const prevHpPerLevel = prev?.appliedHpPerLevel ?? 0;
  const { hitPointMax, hitPointCurrent } = applyHpPerLevel(
    character,
    bonuses.hpMaxPerLevel,
    prevHpPerLevel,
  );

  const nextChoices: RaceChoicesState = {
    ...raceChoices,
    abilityBonuses: bonuses.abilityBonuses,
    pickedSkills,
    pickedLanguages: langExtra,
    appliedNaturalWeaponNames: bonuses.naturalWeapons.map((w) => w.nameRu),
    appliedCantrips: racialCantrips,
    appliedSkillKeys: [...bonuses.skillProficiencies, ...pickedSkills],
    appliedHpPerLevel: bonuses.hpMaxPerLevel,
    appliedArmorClass: Boolean(bonuses.naturalArmorFormula || bonuses.acBonus),
  };

  return {
    ...character,
    race: options.displayNameRu ?? bonuses.displayNameRu,
    raceId,
    raceChoices: nextChoices,
    abilities,
    skillProficiencies,
    speed,
    armorClass,
    hitPointMax,
    hitPointCurrent,
    featuresAndTraits: features,
    otherProficienciesAndLanguages: profLang,
    cantrips,
    attacks,
    updatedAt: new Date().toISOString(),
  };
}
