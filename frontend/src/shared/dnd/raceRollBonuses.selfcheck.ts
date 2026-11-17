/**
 * Race roll_bonuses (ERLW marks d4 / pale elf advantage).
 * Run: npx tsx src/shared/dnd/raceRollBonuses.selfcheck.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveRaceGrantDef } from './raceGrants.ts'
import {
  raceAdvantageSkillKeys,
  raceBonusDiceForCheck,
  readRaceRollBonuses,
} from './raceRollBonuses.ts'
import { rollBonusDiceParts } from '../../features/characters/deskRolls.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const here = dirname(fileURLToPath(import.meta.url))
const specPath = join(
  here,
  '../../../../backend/data/races/phb2014_race_catalog_spec.json',
)
const spec = JSON.parse(readFileSync(specPath, 'utf8')) as {
  races: Array<Record<string, unknown> & { slug: string; name_ru: string }>
}

function defFor(slug: string) {
  const row = spec.races.find((race) => race.slug === slug)
  assert(row, `missing ${slug}`)
  const def = resolveRaceGrantDef({
    raceName: row.name_ru,
    catalogSlug: row.slug,
    catalogData: row,
    nameRu: row.name_ru,
  })
  assert(def, `resolve failed for ${slug}`)
  return def
}

const MARK_SLUGS = [
  'mark_of_warding',
  'mark_of_shadow',
  'mark_of_healing',
  'mark_of_hospitality',
  'mark_of_finding_human',
  'mark_of_handling',
  'mark_of_making',
  'mark_of_passage',
  'mark_of_sentinel',
  'mark_of_scribing',
  'mark_of_detection',
  'mark_of_storm',
  'mark_of_finding_half_orc',
] as const

for (const slug of MARK_SLUGS) {
  const def = defFor(slug)
  assert(def.rollBonuses.length >= 1, `${slug} has roll_bonuses`)
  assert(
    def.rollBonuses.every((row) => row.dice === '1d4'),
    `${slug} d4`,
  )
}

{
  const shadow = defFor('mark_of_shadow')
  const stealth = raceBonusDiceForCheck({
    rollBonuses: shadow.rollBonuses,
    skillKey: 'stealth',
    rulesEdition: '2014',
  })
  assert(stealth.length === 1 && stealth[0]?.dice === '1d4', 'shadow stealth d4')
  assert(
    /лукавого/i.test(stealth[0]?.label ?? ''),
    `shadow label got ${stealth[0]?.label}`,
  )
  const athletics = raceBonusDiceForCheck({
    rollBonuses: shadow.rollBonuses,
    skillKey: 'athletics',
    rulesEdition: '2014',
  })
  assert(athletics.length === 0, 'shadow athletics no d4')
  const as2024 = raceBonusDiceForCheck({
    rollBonuses: shadow.rollBonuses,
    skillKey: 'stealth',
    rulesEdition: '2024',
  })
  assert(as2024.length === 0, '2024 edition gated')
}

{
  const pale = defFor('pale_elf')
  const keys = raceAdvantageSkillKeys({
    rollBonuses: pale.rollBonuses,
    rulesEdition: '2014',
  })
  assert(keys.has('investigation') && keys.has('insight'), 'pale elf adv skills')
  assert(
    raceBonusDiceForCheck({
      rollBonuses: pale.rollBonuses,
      skillKey: 'investigation',
      rulesEdition: '2014',
    }).length === 0,
    'pale elf is advantage not die',
  )
}

{
  const human = defFor('human')
  assert((human.rollBonuses ?? []).length === 0, 'plain human no roll_bonuses')
}

{
  const parsed = readRaceRollBonuses([
    {
      id: 'x',
      name_ru: 'Тест',
      dice: '1к4',
      skills: ['stealth'],
    },
  ])
  assert(parsed[0]?.dice === '1d4', 'к normalized to d')
  const rolled = rollBonusDiceParts(
    [{ dice: '1d4', label: 'Интуиция лукавого' }],
    () => 0.99,
  )
  assert(rolled.total === 4, 'forced d4=4')
  assert(/\+1к4 \(Интуиция лукавого\)/.test(rolled.text), `text ${rolled.text}`)
}

console.log('raceRollBonuses.selfcheck: ok')
