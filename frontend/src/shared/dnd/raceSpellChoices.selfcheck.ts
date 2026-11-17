/**
 * Astral Elf / high elf racial spell_choices + Звёздный шаг resource.
 * Run: npx tsx src/shared/dnd/raceSpellChoices.selfcheck.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  emptyRacePicks,
  listMissingRaceSpellChoiceLabels,
  raceGrantDefFromCatalog,
  resolveRacialSpellsForGrant,
  validateRaceGrantPicks,
} from './raceGrants.ts'
import { desiredRaceResources, syncRaceResources } from './raceResources.ts'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

const specPath = join(
  process.cwd(),
  process.cwd().endsWith('frontend')
    ? '../backend/data/races/phb2014_race_catalog_spec.json'
    : 'backend/data/races/phb2014_race_catalog_spec.json',
)
const spec = JSON.parse(readFileSync(specPath, 'utf8')) as {
  races: Array<Record<string, unknown> & { slug: string; name_ru: string }>
}

function defFor(slug: string) {
  const row = spec.races.find((r) => r.slug === slug)
  assert(row, `missing ${slug}`)
  const def = raceGrantDefFromCatalog({
    slug: row.slug,
    nameRu: row.name_ru,
    data: row,
  })
  assert(def, `def ${slug}`)
  return def
}

const astral = defFor('astral_elf')
assert(astral.spellChoices.length === 1, 'astral has astral_fire choice')
assert(astral.spellChoices[0]?.options.length === 3, 'three cantrips')
assert(astral.racialResources.some((r) => r.id === 'starlight_step'), 'starlight resource')
assert(
  astral.traitCards.some((c) => c.id === 'starlight_step'),
  'starlight trait card',
)

const empty = emptyRacePicks()
const missing = listMissingRaceSpellChoiceLabels({ def: astral, picks: empty })
assert(missing.includes('Астральное пламя'), 'missing label for old chars')

const picks = {
  ...empty,
  abilityBonusModeId: 'plus1x3',
  abilityBonusKeys: ['str', 'dex', 'con'] as const,
  languages: ['Эльфийский'],
  spellChoiceIds: { astral_fire: 'sacred_flame' },
  spellChoiceAbility: { astral_fire: 'cha' as const },
}
// Tasha flexible may use different mode ids — soft-validate spell fork only
assert(
  listMissingRaceSpellChoiceLabels({ def: astral, picks }).length === 0,
  'complete astral pick',
)

const spells = resolveRacialSpellsForGrant({ def: astral, picks })
assert(spells.some((s) => s.spellSlug === 'sacred_flame' && s.castingAbility === 'cha'), 'sacred flame cha')
assert(spells.every((s) => s.grant === 'innate' && s.level === 0), 'innate cantrips')

const desired = desiredRaceResources({
  racialResources: astral.racialResources,
  proficiencyBonus: 3,
})
assert(desired.length === 1 && desired[0]?.max === 3, 'PB=3 → 3 cells')
assert(desired[0]?.id === 'race-res:starlight_step', 'race-res id')
const synced = syncRaceResources(
  [{ id: 'race-res:starlight_step', name: 'old', max: 2, used: 1, reset: 'long', track: 'spend' }],
  desired,
)
assert(synced[0]?.max === 3 && synced[0]?.used === 1, 'keep used, bump max')

const high = defFor('high_elf')
assert(high.spellChoices[0]?.optionsFrom === 'wizard_cantrips', 'high elf wizard list')
assert((high.spellChoices[0]?.options.length ?? 0) >= 10, 'wizard cantrips expanded')

const drow = defFor('drow')
assert(drow.racialSpells.length === 3, 'drow innate trio')
assert(drow.spellChoices.length === 0, 'drow has no cantrip picker')

const half = defFor('half_elf_high')
assert(half.spellChoices[0]?.optionsFrom === 'wizard_cantrips', 'half elf high wizard cantrip')

// validateRaceGrantPicks rejects incomplete spell choice when ASI/langs satisfied enough to reach it
const badSpell = validateRaceGrantPicks({
  def: astral,
  picks: {
    ...picks,
    spellChoiceIds: {},
    spellChoiceAbility: {},
  },
  requireFeat: false,
})
assert(badSpell && /Астральное пламя|заговор|выбор/i.test(badSpell), `spell validate: ${badSpell}`)

console.log('raceSpellChoices.selfcheck: ok')
