import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isTceAdditionalBardSpellSlug2014,
  TCE_ADDITIONAL_BARD_SPELL_SLUGS_2014,
  TCE_ADDITIONAL_BARD_SPELLS_FEATURE_ID,
  TCE_ADDITIONAL_BARD_SPELLS_NAME_RU,
} from './tceAdditionalBardSpells.ts'

assert.equal(TCE_ADDITIONAL_BARD_SPELLS_NAME_RU, 'Дополнительные заклинания барда')
assert.equal(TCE_ADDITIONAL_BARD_SPELLS_FEATURE_ID, 'additional_bard_spells')
assert.equal(TCE_ADDITIONAL_BARD_SPELL_SLUGS_2014.length, 15)
assert.ok(isTceAdditionalBardSpellSlug2014('phantasmal_killer'))
assert.ok(isTceAdditionalBardSpellSlug2014('Phantasmal_Killer'))
assert.equal(isTceAdditionalBardSpellSlug2014('fireball'), false)
assert.equal(isTceAdditionalBardSpellSlug2014(''), false)

const here = dirname(fileURLToPath(import.meta.url))
const spellsPath = join(here, '../../../public/spells-2014.json')
const spells = JSON.parse(readFileSync(spellsPath, 'utf8')) as Array<{
  slug?: string
  data?: { classes?: string[]; tce_additional_classes?: string[] }
}>
const bySlug = new Map(spells.map((row) => [row.slug, row]))
for (const slug of TCE_ADDITIONAL_BARD_SPELL_SLUGS_2014) {
  const row = bySlug.get(slug)
  assert.ok(row, `missing spell ${slug}`)
  assert.ok(row.data?.classes?.includes('bard'), `${slug} must list bard`)
  assert.ok(
    row.data?.tce_additional_classes?.includes('bard'),
    `${slug} must mark tce_additional_classes`,
  )
}

const bardPack = JSON.parse(
  readFileSync(join(here, 'data/bard_2014.json'), 'utf8'),
) as { features: Array<{ id?: string; optional?: boolean; source_book?: string }> }
const additional = bardPack.features.find((f) => f.id === 'additional_bard_spells')
assert.ok(additional, 'bard_2014 feature additional_bard_spells')
assert.equal(additional.optional, true)
assert.equal(additional.source_book, 'tcoe')

console.log('tceAdditionalBardSpells.selfcheck: ok')
