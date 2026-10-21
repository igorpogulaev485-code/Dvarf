/** Run: npx tsx src/shared/dnd/castProfiles.selfcheck.ts */
import {
  backfillSpellClassFields,
  buildCastProfiles,
  mergeCastProfilesForDisplay,
  resolveSpellCastStats,
} from './castProfiles'
import { createClassLevel } from './classLevels'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

function abilityModFor(scores: Record<'int' | 'wis' | 'cha', number>) {
  return (ability: 'int' | 'wis' | 'cha') => abilityModifier(scores[ability])
}

// --- Квакк stats: Art 15 / Warlock 5, PB +6, INT 20, CHA 19 ---
const kvakClasses = [
  createClassLevel({ id: 'art', name: 'Изобретатель', level: 15 }),
  createClassLevel({ id: 'wlk', name: 'Колдун', level: 5 }),
]
const kvakMods = abilityModFor({ int: 20, wis: 10, cha: 19 })
const kvakProfiles = buildCastProfiles({
  classes: kvakClasses,
  abilityModFor: kvakMods,
  proficiencyBonus: 6,
})

assert(kvakProfiles.length === 2, 'kvak: 2 profiles')
const art = kvakProfiles.find((row) => row.slug === 'artificer')
const wlk = kvakProfiles.find((row) => row.slug === 'warlock')
assert(art?.ability === 'int', 'art int')
assert(wlk?.ability === 'cha', 'wlk cha')
assert(art?.mode === 'prepared_list', 'art mode')
assert(wlk?.mode === 'known', 'wlk mode')
assert(art?.cantripsBudget === 4, `art cantrips got ${art?.cantripsBudget}`)
assert(wlk?.cantripsBudget === 3, `wlk cantrips got ${wlk?.cantripsBudget}`)
assert(art?.saveDc === 19, `art DC got ${art?.saveDc}`)
assert(art?.attackBonus === 11, `art atk got ${art?.attackBonus}`)
assert(wlk?.saveDc === 18, `wlk DC got ${wlk?.saveDc}`)
assert(wlk?.attackBonus === 10, `wlk atk got ${wlk?.attackBonus}`)
assert(art?.maxPrepared != null && art.maxPrepared > 0, 'art prepare cap')
assert(wlk?.leveledKnownBudget === 6, `wlk known L5 got ${wlk?.leveledKnownBudget}`)

const artCast = resolveSpellCastStats({
  spell: { class_slug: 'artificer' },
  profiles: kvakProfiles,
  abilityModFor: kvakMods,
  proficiencyBonus: 6,
})
assert(artCast.saveDc === 19 && artCast.attackBonus === 11, 'resolve art')

const wlkCast = resolveSpellCastStats({
  spell: { class_slug: 'warlock' },
  profiles: kvakProfiles,
  abilityModFor: kvakMods,
  proficiencyBonus: 6,
})
assert(wlkCast.saveDc === 18 && wlkCast.attackBonus === 10, 'resolve wlk')

// Same CHA totals → display may merge; different totals stay separate.
const mergedEqual = mergeCastProfilesForDisplay(kvakProfiles)
assert(mergedEqual.length === 2, 'kvak display stays 2 (different totals)')

// --- Bard 6 / Wizard 8 / Warlock 6 ---
const stress = buildCastProfiles({
  classes: [
    createClassLevel({ id: 'b', name: 'Бард', level: 6 }),
    createClassLevel({ id: 'w', name: 'Волшебник', level: 8 }),
    createClassLevel({ id: 'k', name: 'Колдун', level: 6 }),
  ],
  abilityModFor: abilityModFor({ int: 18, wis: 10, cha: 16 }),
  proficiencyBonus: 6,
})
assert(stress.length === 3, 'stress 3 profiles')
const abilities = new Set(stress.map((row) => row.ability))
assert(abilities.has('int') && abilities.has('cha'), 'stress abilities')
assert(!abilities.has('wis'), 'no wis')
assert(stress.find((row) => row.slug === 'bard')?.mode === 'known', 'bard known')
assert(stress.find((row) => row.slug === 'wizard')?.mode === 'spellbook', 'wiz book')
assert(stress.find((row) => row.slug === 'warlock')?.mode === 'known', 'lock known')

// Equal CHA totals for bard+warlock with same cha mod → merge display
const equalCha = buildCastProfiles({
  classes: [
    createClassLevel({ id: 'b2', name: 'Бард', level: 5 }),
    createClassLevel({ id: 'k2', name: 'Колдун', level: 5 }),
  ],
  abilityModFor: abilityModFor({ int: 10, wis: 10, cha: 16 }),
  proficiencyBonus: 3,
})
const mergedCha = mergeCastProfilesForDisplay(equalCha)
assert(mergedCha.length === 1, 'equal cha+totals merge to 1 display row')
assert(
  (mergedCha[0]?.mergedFrom?.length ?? 0) === 2 ||
    mergedCha[0]!.labelRu.includes('·'),
  'merged label lists both',
)

// --- Mono wizard ---
const mono = buildCastProfiles({
  classes: [createClassLevel({ id: 'wiz', name: 'Волшебник', level: 5 })],
  abilityModFor: abilityModFor({ int: 16, wis: 10, cha: 10 }),
  proficiencyBonus: 3,
})
assert(mono.length === 1 && mono[0]!.slug === 'wizard', 'mono')
assert(mono[0]!.saveDc === 14 && mono[0]!.attackBonus === 6, 'mono stats INT+3 PB3')

const filled = backfillSpellClassFields(
  [
    { id: 'a', name: 'Луч', source_kind: 'catalog' as const },
    { id: 'b', class_slug: 'wizard' },
  ],
  mono,
)
assert(filled[0]!.class_slug === 'wizard', 'mono backfill')
assert(filled[1]!.class_slug === 'wizard', 'keep existing')

// Multiclass without tags: do NOT invent artificer for unlabeled when 2 profiles
const noGuess = backfillSpellClassFields(
  [{ id: 'x', source_kind: 'catalog' as const }],
  kvakProfiles,
)
assert(noGuess[0]!.class_slug == null, 'no silent guess on MC unlabeled')

const tome = backfillSpellClassFields(
  [{ id: 't', prepare_source_label: 'Гримуар договора', source_kind: 'feature' as const }],
  kvakProfiles,
)
assert(tome[0]!.class_slug === 'warlock', 'tome → warlock')

console.log('castProfiles.selfcheck: ok')
