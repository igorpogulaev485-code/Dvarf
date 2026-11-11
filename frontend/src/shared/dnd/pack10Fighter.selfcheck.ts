/**
 * Pack 10: fighter archetypes, resources, and false companions.
 * Run: npx tsx src/shared/dnd/pack10Fighter.selfcheck.ts
 */
import { createClassLevel } from './classLevels.ts'
import { unlockFeaturesForClasses, choiceOptionsAtLevel } from './classFeatures.ts'
import { constitutionHpDelta } from './constitutionHp.ts'
import {
  desiredResourcesFromFeatures,
  syncFeatureResources,
} from './featureResources.ts'
import {
  dropDuplicateFightingStyles,
  emptyFeaturePicks,
  fightingStylesTakenElsewhere,
  setFeaturePick,
} from './featurePicks.ts'
import {
  bridgeTotemSpiritPick,
  fighterSkillAndLanguageGrants,
  knownRuneIds,
  runeChargesAtLevel,
} from './fighterArchetypeGrants.ts'
import { halfProficiencyRoundUp } from '../../features/characters/featureCombatBonuses.ts'
import { ironMindSaveKey } from './featureSaveProficiency.ts'
import { revokeFalseSubclassCompanions, createCompanion } from '../../features/characters/companions.ts'
import type { CompanionEntry } from '../../features/characters/companions.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function fighter(level: number, subclass: string) {
  const row = createClassLevel({
    id: 'f1',
    name: 'Воин',
    level,
    subclass_name: subclass,
  })
  return unlockFeaturesForClasses({
    classes: [row],
    characterLevel: level,
    abilities: { str: 16, dex: 14, con: 15, int: 10, wis: 13, cha: 10 },
    subclassSlugByEntryId: { [row.id]: subclass },
  })
}

const champ20 = fighter(20, 'champion')
const improved = champ20.find((row) => row.id === 'improved_critical')
const superior = champ20.find((row) => row.id === 'superior_critical')
assert(improved?.scaleValue === '19–20', `improved critical scale ${improved?.scaleValue}`)
assert(superior?.scaleValue === '18–20', `superior critical scale ${superior?.scaleValue}`)
assert(!String(improved?.summary_ru).includes('18–20'), 'improved text stays 19-20')

let picks = setFeaturePick(emptyFeaturePicks(), 'f1', 'fighting_style', 'defense')
picks = setFeaturePick(picks, 'f1', 'additional_fighting_style', 'defense')
const cleaned = dropDuplicateFightingStyles(picks)
assert(
  cleaned.values['f1:additional_fighting_style'] == null,
  'second style cannot repeat defense',
)
const taken = fightingStylesTakenElsewhere(cleaned, {
  classEntryId: 'f1',
  featureId: 'additional_fighting_style',
})
assert(taken.has('defense'), 'defense is taken by the first style')
assert(halfProficiencyRoundUp(6) === 3, 'half of +6 rounds up to 3')
assert(halfProficiencyRoundUp(5) === 3, 'half of +5 rounds up to 3')

const cavalier = fighter(3, 'cavalier')
const bonus = cavalier.find((row) => row.id === 'bonus_proficiency_cavalier')
assert(bonus?.choice, 'cavalier choice')
const cavalierOptions = choiceOptionsAtLevel(bonus!.choice!, 3)
assert(cavalierOptions.includes('animal_handling'), 'animal handling')
assert(cavalierOptions.includes('lang:Дварфийский'), 'dwarvish language option')
assert(!cavalierOptions.includes('unarmed_fighting'), 'no unarmed fighting')
const plan = fighterSkillAndLanguageGrants({
  features: cavalier,
  featurePicks: setFeaturePick(emptyFeaturePicks(), 'f1', 'bonus_proficiency_cavalier', 'lang:Дварфийский'),
  persuasionFromOtherSources: false,
})
assert(plan.languages.includes('Дварфийский'), 'dwarvish granted')
assert(plan.skills.length === 0, 'language branch is not also a skill')

const samurai = fighter(7, 'samurai')
const courtier = samurai.find((row) => row.id === 'elegant_courtier')
assert(courtier?.summary_ru.includes('Мудрости'), 'courtier mentions wisdom')
assert(courtier?.choice?.optional === true, 'courtier save pick is optional')
assert(
  ironMindSaveKey({ alreadyHasWisdom: false, pick: null }) === 'wis',
  'wisdom save when missing',
)
assert(
  ironMindSaveKey({ alreadyHasWisdom: true, pick: 'charisma' }) === 'cha',
  'charisma save when wisdom exists',
)

const envoy = fighter(7, 'purple_dragon_knight').find((row) => row.id === 'royal_envoy')
assert(envoy?.summary_ru.includes('компетентность') || envoy?.summary_ru.includes('Компетентность') || envoy?.summary_ru.toLowerCase().includes('компетентность'), 'envoy expertise')
const envoyPlan = fighterSkillAndLanguageGrants({
  features: [{ id: 'royal_envoy', classEntryId: 'f1' }],
  featurePicks: emptyFeaturePicks(),
  persuasionFromOtherSources: false,
})
assert(envoyPlan.skills.includes('persuasion') && envoyPlan.expertise.includes('persuasion'), 'envoy persuasion')
const envoyAlt = fighterSkillAndLanguageGrants({
  features: [{ id: 'royal_envoy', classEntryId: 'f1' }],
  featurePicks: setFeaturePick(emptyFeaturePicks(), 'f1', 'royal_envoy', 'insight'),
  persuasionFromOtherSources: true,
})
assert(envoyAlt.skills.includes('insight'), 'envoy substitute skill')

const cav20 = fighter(20, 'cavalier')
const mark = cav20.find((row) => row.id === 'unwavering_mark')
const ward = cav20.find((row) => row.id === 'warding_maneuver')
assert(mark?.resource?.uses_from === 'ability_modifier' && mark.resource.ability === 'str', 'mark from str')
assert(ward?.resource?.uses_from === 'ability_modifier' && ward.resource.ability === 'con', 'ward from con')
assert(cav20.find((row) => row.id === 'born_to_the_saddle')?.summary_ru.includes('5 фт'), 'mount 5 ft')
assert(cav20.find((row) => row.id === 'hold_the_line')?.summary_ru.includes('5 фт'), 'hold the line 5 ft')
assert(cav20.find((row) => row.id === 'ferocious_charger')?.summary_ru.includes('по прямой'), 'charger straight line')

const echo = fighter(20, 'echo_knight')
const unleash = echo.find((row) => row.id === 'unleash_incarnation')
const reclaim = echo.find((row) => row.id === 'reclaim_potential')
assert(unleash?.resource?.ability === 'con', 'unleash from con')
assert(reclaim?.resource?.uses_from === 'ability_modifier', 'reclaim has a counter')
const echoPools = desiredResourcesFromFeatures({
  features: echo,
  characterLevel: 20,
  abilities: { con: 15 },
})
const unleashPool = echoPools.find((row) => row.id.includes(':unleash_incarnation:'))
const reclaimPool = echoPools.find((row) => row.id.includes(':reclaim_potential:'))
assert(unleashPool?.max === 2, `unleash max ${unleashPool?.max}`)
assert(reclaimPool?.max === 2, `reclaim max ${reclaimPool?.max}`)

const psi = fighter(20, 'psi_warrior')
assert(psi.find((row) => row.id === 'guarded_mind')?.summary_ru.includes('без действия'), 'guarded mind no action')
const psiPools = desiredResourcesFromFeatures({
  features: psi,
  characterLevel: 20,
  abilities: { int: 10 },
})
const dice = psiPools.find((row) => row.id.includes(':psionic_energy:'))
assert(dice?.max === 12, `psionic dice ${dice?.max}`)
const stale = syncFeatureResources(
  [{ id: dice!.id, name: 'Пси-энергия', max: 4, used: 0, reset: 'long', track: 'spend' }],
  psiPools,
)
assert(stale.find((row) => row.id === dice!.id)?.max === 12, 'psionic pool rescales from 4')

const rune3 = fighter(3, 'rune_knight')
const carver = rune3.find((row) => row.id === 'rune_carver')
const at3 = choiceOptionsAtLevel(carver!.choice!, 3)
assert(at3.includes('rune_cloud') && at3.includes('rune_stone'), 'cloud and stone at 3')
assert(!at3.includes('rune_hill') && !at3.includes('rune_storm'), 'hill and storm wait until 7')
const at7 = choiceOptionsAtLevel(carver!.choice!, 7)
assert(at7.includes('rune_hill') && at7.includes('rune_storm'), 'hill and storm at 7')
const rune20 = fighter(20, 'rune_knight')
assert(rune20.find((row) => row.id === 'great_stature')?.summary_ru.includes('3к4'), 'great stature 3d4')
assert(rune20.find((row) => row.id === 'great_stature')?.summary_ru.includes('1к8'), 'great stature 1d8')
assert(!rune20.find((row) => row.id === 'great_stature')?.summary_ru.includes('3к10'), 'no 3d10 hp')
assert(rune20.find((row) => row.id === 'runic_juggernaut')?.summary_ru.includes('5 фт'), 'juggernaut reach')
const runePicks = setFeaturePick(
  emptyFeaturePicks(),
  'f1',
  'rune_carver',
  'rune_cloud,rune_fire',
)
assert(knownRuneIds(runePicks, 'f1').length === 2, 'two known runes')
assert(runeChargesAtLevel(3) === 1 && runeChargesAtLevel(15) === 2, 'rune charges')
const runePools = desiredResourcesFromFeatures({
  features: rune20,
  characterLevel: 20,
  abilities: { str: 16, con: 15 },
  featurePicks: runePicks,
})
assert(runePools.find((row) => row.id.includes(':giants_might:'))?.max === 6, 'giants might pb')
assert(runePools.find((row) => row.id.includes(':runic_shield:'))?.max === 6, 'runic shield pb')
const cloud = runePools.find((row) => row.id.includes(':rune_cloud:'))
assert(cloud?.max === 2 && cloud.reset === 'short', `cloud rune ${cloud?.max} ${cloud?.reset}`)

assert(constitutionHpDelta({ previousMod: 2, nextMod: 3, levelCount: 8 }) === 8, 'hp +8 at level 8')
assert(constitutionHpDelta({ previousMod: 4, nextMod: 6, levelCount: 20 }) === 40, 'hp +40 at 20')

const bridged = bridgeTotemSpiritPick({
  featurePicks: emptyFeaturePicks(),
  classEntryId: 'b1',
  values: { totem_spirit_3: 'bear' },
})
assert(bridged.values['b1:totem_spirit'] === 'bear', 'bear stays as totem pick')

const bear = createCompanion({
  name: 'Медведь',
  source: { kind: 'subclass', labelRu: 'Тотем', feature: 'totem_spirit_3', subclassSlug: 'path_of_the_totem_warrior' },
})
const essence = createCompanion({
  name: 'Кислота',
  source: { kind: 'subclass', labelRu: 'Сущность', feature: 'drake_essence', subclassSlug: 'drakewarden' },
})
const drake = createCompanion({
  name: 'Искра',
  kind: 'drake',
  source: { kind: 'subclass', labelRu: 'Дрейк', feature: 'drake_companion', subclassSlug: 'drakewarden' },
})
const manual = createCompanion({
  name: 'Пёс',
  source: { kind: 'manual', labelRu: 'Свой' },
})
const kept = revokeFalseSubclassCompanions([bear, essence, drake, manual] as CompanionEntry[])
assert(kept.length === 2 && kept.some((row) => row.name === 'Искра') && kept.some((row) => row.name === 'Пёс'), 'false companions dropped')

console.log('pack10 fighter selfcheck ok')
