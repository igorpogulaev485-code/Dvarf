/**
 * 2014 race spell_choices: astral elf, high elf, drow, half-elf high.
 * Run: npx tsx src/shared/dnd/raceSpellChoices.selfcheck.ts
 *
 * Other races still needing bespoke work (not spell_choices):
 * - aasimar revelation pick (revelation_choices)
 * - eladrin season (season_choices)
 * - custom_lineage variable trait
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  emptyRacePicks,
  raceGrantDefFromCatalog,
  resolveRacialSpellsForGrant,
  validateRaceGrantPicks,
} from './raceGrants.ts'
import { desiredRaceResources, syncRaceResources } from './raceResources.ts'
import { proficiencyBonusForTotalLevel } from './classFeatures.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const here = dirname(fileURLToPath(import.meta.url))
const specPath = join(here, '../../../../backend/data/races/phb2014_race_catalog_spec.json')
const spec = JSON.parse(readFileSync(specPath, 'utf8')) as {
  races: Array<Record<string, unknown>>
}

function raceBySlug(slug: string): Record<string, unknown> {
  const row = spec.races.find((r) => r.slug === slug)
  assert(row, `missing race ${slug}`)
  return row
}

// —— Astral Elf ——
{
  const astral = raceBySlug('astral_elf')
  const def = raceGrantDefFromCatalog({
    slug: 'astral_elf',
    nameRu: 'Эльф (астральный)',
    data: astral,
  })
  assert(def, 'astral def')
  assert(def!.spellChoices.length === 1, 'astral one spell choice')
  assert(def!.racialResources.some((r) => r.id === 'starlight_step'), 'starlight resource')
  const asiReady = {
    ...emptyRacePicks(),
    abilityBonusModeId: 'plus1x3',
    abilityBonusKeys: ['dex', 'int', 'wis'] as const,
    languages: ['Эльфийский'],
  }
  const missing = validateRaceGrantPicks({
    def: def!,
    picks: asiReady,
    requireFeat: false,
  })
  assert(missing != null && /Астральное пламя/i.test(missing), `missing pick: ${missing}`)
  const picks = {
    ...emptyRacePicks(),
    abilityBonusModeId: 'plus1x3',
    abilityBonusKeys: ['dex', 'int', 'wis'],
    languages: ['Эльфийский'],
    spellChoiceIds: { astral_fire: 'light' },
    spellChoiceAbility: { astral_fire: 'cha' },
  }
  const ok = validateRaceGrantPicks({ def: def!, picks, requireFeat: false })
  assert(ok == null, `validate should pass: ${ok}`)
  const spells = resolveRacialSpellsForGrant({ def: def!, picks })
  const cantrip = spells.find((row) => row.id === 'astral_fire')
  assert(cantrip?.spellSlug === 'light' && cantrip.grant === 'innate', 'innate cantrip on grant')
  assert(cantrip?.castingAbility === 'cha', 'chosen CHA')
  const pb = proficiencyBonusForTotalLevel(5)
  const desired = desiredRaceResources({
    racialResources: def!.racialResources,
    proficiencyBonus: pb,
  })
  assert(desired[0]?.max === pb, 'starlight max follows PB')
  const synced = syncRaceResources(
    [{ id: 'race-res:starlight_step', name: 'Звёздный шаг', max: 2, used: 1, reset: 'long' }],
    desired,
  )
  assert(synced[0]?.max === pb && synced[0]?.used === 1, 'preserve used, bump max')
}

// —— High elf wizard cantrip ——
{
  const high = raceBySlug('high_elf')
  const def = raceGrantDefFromCatalog({
    slug: 'high_elf',
    nameRu: 'Эльф (высший)',
    data: high,
  })
  assert(def?.spellChoices[0]?.optionsFrom === 'wizard_cantrips', 'wizard list')
  assert(def!.spellChoices[0]!.options.length >= 10, 'wizard options expanded')
}

// —— Drow innate leveled ——
{
  const drow = raceBySlug('drow')
  const def = raceGrantDefFromCatalog({
    slug: 'drow',
    nameRu: 'Эльф (дроу)',
    data: drow,
  })
  assert((def?.racialSpells.length ?? 0) === 3, 'drow three spells')
  assert(
    def!.racialSpells.every((row) => row.castingAbility === 'cha'),
    'drow CHA',
  )
}

console.log('raceSpellChoices.selfcheck: ok')