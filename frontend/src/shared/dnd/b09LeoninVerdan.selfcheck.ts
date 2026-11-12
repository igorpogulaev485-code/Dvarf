/**
 * B-09 extras from B-08 backlog: B-358 Hunter's Instincts (Leonin),
 * B-382 Black Blood Healing (Verdan).
 * Run: npx tsx src/shared/dnd/b09LeoninVerdan.selfcheck.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  hasBlackBloodHealing,
  rollHitDieFace,
} from './hitDice.ts'
import {
  emptyRacePicks,
  raceGrantDefFromCatalog,
  validateRaceGrantPicks,
} from './raceGrants.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const here = dirname(fileURLToPath(import.meta.url))
const specPath = join(
  here,
  '../../../../backend/data/races/setting_race_catalog_spec.json',
)
const spec = JSON.parse(readFileSync(specPath, 'utf8')) as {
  races: Array<Record<string, unknown>>
}

function raceBySlug(slug: string): Record<string, unknown> {
  const row = spec.races.find((r) => r.slug === slug)
  assert(row, `missing race ${slug}`)
  return row
}

// —— B-358: Leonin Hunter's Instincts — skill choice, no initiative ——
{
  const leonin = raceBySlug('leonin')
  const choices = leonin.skill_choices as { count: number; from: string[] }
  assert(choices?.count === 1, 'leonin skill count 1')
  assert(
    JSON.stringify([...(choices.from || [])].sort()) ===
      JSON.stringify(['athletics', 'intimidation', 'perception', 'survival'].sort()),
    `leonin skill pool got ${JSON.stringify(choices.from)}`,
  )
  const traits = String(leonin.traits_text || '')
  // Clarifying «без бонуса к инициативе» is OK; a positive initiative grant is not.
  assert(
    !/\+\s*\d+.*инициатив|инициатив.*\+\s*\d+|бонус к инициативе(?!\s*нет)/i.test(traits),
    'leonin must not grant initiative bonus',
  )
  const cards = (leonin.trait_cards || []) as Array<{ id?: string; summary_ru?: string }>
  const hunter = cards.find((c) => c.id === 'hunters_instincts')
  assert(hunter, 'hunters_instincts trait card')
  assert(/Владение|навык/i.test(String(hunter.summary_ru || '')), 'hunter is a skill trait')

  const def = raceGrantDefFromCatalog({
    slug: 'leonin',
    nameRu: 'Леонин',
    data: leonin,
  })
  assert(def, 'leonin def')
  assert(def!.skillChoices?.count === 1, 'def skillChoices')
  assert(
    JSON.stringify([...(def!.skillChoices!.from as string[])].sort()) ===
      JSON.stringify(['athletics', 'intimidation', 'perception', 'survival'].sort()),
    'def skill pool',
  )
  // skillNeed enforced after ASI — fill ASI/langs so skill gate is reached.
  const modes = def!.abilityBonusChoices
  const modeId = modes?.preset === 'tasha_flexible' ? 'plus2_plus1' : modes?.modes?.[0]?.id ?? null
  // TASHA_FLEXIBLE_ASI_MODES ids — discover via empty validate message if needed.
  const basePicks = {
    ...emptyRacePicks(),
    abilityBonusModeId: 'plus2_plus1' as string | null,
    abilityBonusKeys: ['con', 'str'] as string[],
    languages: ['Дварфийский'],
  }
  const missingSkill = validateRaceGrantPicks({
    def: def!,
    picks: { ...basePicks, skills: [] },
    requireFeat: false,
  })
  assert(
    missingSkill != null && /навык/i.test(missingSkill),
    `must require skill pick, got ${missingSkill}`,
  )
  const withSkill = validateRaceGrantPicks({
    def: def!,
    picks: { ...basePicks, skills: ['survival'] },
    requireFeat: false,
  })
  assert(withSkill == null, `survival pick should validate, got ${withSkill}`)
  void modeId
}

// —— B-382: Verdan Black Blood Healing ——
{
  assert(hasBlackBloodHealing('verdan'), 'verdan has black blood')
  assert(!hasBlackBloodHealing('leonin'), 'leonin has no black blood')
  assert(!hasBlackBloodHealing('vedalken'), 'vedalken is not verdan')

  const verdan = raceBySlug('verdan')
  const traits = String(verdan.traits_text || '')
  assert(/перебрас|1 или 2/i.test(traits), 'verdan traits mention hit-die reroll')
  assert(!/сопротивлен.*яд/i.test(traits), 'verdan traits no longer claim poison resist for Black Blood')

  // Forced first roll = 1 → must reroll.
  let calls = 0
  const faces = [0.0, 0.5] // → 1, then ~mid of d8 → 5
  const roll = rollHitDieFace({
    die: 'd8',
    constitutionMod: 2,
    blackBloodHealing: true,
    rng: () => faces[Math.min(calls++, faces.length - 1)]!,
  })
  assert(roll.first === 1, `first should be 1 got ${roll.first}`)
  assert(roll.rerolled, 'must reroll 1')
  assert(roll.final === 5, `final 5 got ${roll.final}`)
  assert(roll.heal === 7, `heal 5+2=7 got ${roll.heal}`)
  assert(roll.note && /Чёрная кровь/i.test(roll.note), 'note present')

  // First roll = 3 → no reroll.
  calls = 0
  const keep = rollHitDieFace({
    die: 'd8',
    constitutionMod: 1,
    blackBloodHealing: true,
    rng: () => 0.3, // → floor(0.3*8)+1 = 3
  })
  assert(keep.first === 3 && !keep.rerolled && keep.final === 3, 'no reroll on 3')
  assert(keep.note == null, 'no note when no reroll')

  // Without trait, 1 stays 1.
  const plain = rollHitDieFace({
    die: 'd6',
    constitutionMod: 0,
    blackBloodHealing: false,
    rng: () => 0,
  })
  assert(plain.first === 1 && !plain.rerolled && plain.final === 1, 'no trait keeps 1')
}

console.log('b09LeoninVerdan.selfcheck: ok (B-358 skill choice; B-382 black blood reroll)')
