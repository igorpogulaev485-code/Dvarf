/**
 * Self-check: background pack expand mirrors sheet inventory rules.
 * Run via create2024.selfcheck import chain / vitest-free assert.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CatalogEntry } from '../../shared/api/catalog'
import { buildItemNameIndex } from './create2024Labels'
import {
  expandBackgroundPackSummary,
  formatBackgroundPackPreview,
  parsePackSummaryChunk,
} from './create2024PackExpand'

const here = dirname(fileURLToPath(import.meta.url))
const liveRoot = join(here, '../../shared/dnd/data/edition2024')

function loadEntries(file: string): CatalogEntry[] {
  const raw = JSON.parse(readFileSync(join(liveRoot, file), 'utf8')) as {
    entries?: CatalogEntry[]
  }
  return Array.isArray(raw.entries) ? raw.entries : []
}

const PHB2024_BACKGROUNDS = [
  'acolyte',
  'artisan',
  'charlatan',
  'criminal',
  'entertainer',
  'farmer',
  'guard',
  'guide',
  'hermit',
  'merchant',
  'noble',
  'sage',
  'sailor',
  'scribe',
  'soldier',
  'wayfarer',
] as const

const items = buildItemNameIndex([
  ...loadEntries('equipment_srd.json'),
  ...loadEntries('weapons_srd.json'),
  ...loadEntries('armor_srd.json'),
])
const backgrounds = [
  ...loadEntries('backgrounds_ph24.json'),
  ...loadEntries('backgrounds_srd.json'),
]

{
  const { name, qty } = parsePackSummaryChunk('духи')
  assert.equal(name, 'духи')
  assert.equal(qty, 1)
  const coin = parsePackSummaryChunk('11 зм')
  assert.equal(coin.name, null)
  assert.equal(coin.qty, 11)
}

{
  const expanded = expandBackgroundPackSummary({
    packSummaryRu:
      'Музыкальный инструмент (выбранный), 2 костюма, зеркало, духи, дорожная одежда, 11 зм',
    backgroundToolId: 'bagpipes',
    toolChoices: { category: 'musical_instrument', count: 1 },
    items,
  })
  assert.equal(expanded.coinsGp, 11)
  const names = expanded.items.map((row) => row.name)
  assert.ok(names.includes('Волынка'), names.join(','))
  assert.ok(names.includes('Духи'), names.join(','))
  assert.ok(!names.some((n) => /выбранн/i.test(n)), names.join(','))
  assert.ok(!names.some((n) => /^ду$/i.test(n)), names.join(','))
  assert.ok(!names.some((n) => /^\d+\s*зм/i.test(n)), names.join(','))
  const preview = formatBackgroundPackPreview({
    packSummaryRu:
      'Музыкальный инструмент (выбранный), 2 костюма, зеркало, духи, дорожная одежда, 11 зм',
    backgroundToolId: 'bagpipes',
    toolChoices: { category: 'musical_instrument', count: 1 },
    items,
  })
  assert.match(preview, /Волынка/)
  assert.doesNotMatch(preview, /выбранн/i)
  assert.match(preview, /11 зм/)
}

for (const slug of PHB2024_BACKGROUNDS) {
  const entry = backgrounds.find((row) => row.slug === slug)
  assert.ok(entry, `missing background ${slug}`)
  const data = (entry.data || {}) as {
    tool_choices?: { category?: string; from_category?: string; count?: number }
    tool_proficiencies?: string[]
    equipment_or_gold?: { pack_summary_ru?: string }
  }
  const summary = data.equipment_or_gold?.pack_summary_ru || ''
  assert.ok(summary, `${slug}: empty pack_summary_ru`)
  let toolId: string | null = null
  if (data.tool_choices) {
    toolId = slug === 'entertainer' ? 'bagpipes' : 'dice-set'
    if (String(data.tool_choices.category || data.tool_choices.from_category || '').includes('artisan')) {
      toolId = 'smiths-tools'
    }
    if (String(data.tool_choices.category || data.tool_choices.from_category || '').includes('musical')) {
      toolId = 'bagpipes'
    }
  } else if (data.tool_proficiencies?.[0]) {
    toolId = data.tool_proficiencies[0]
  }
  const expanded = expandBackgroundPackSummary({
    packSummaryRu: summary,
    backgroundToolId: toolId,
    toolChoices: data.tool_choices ?? null,
    items,
  })
  assert.ok(expanded.coinsGp > 0, `${slug}: pack GP`)
  for (const row of expanded.items) {
    assert.doesNotMatch(row.name, /выбранн/i, `${slug}: ${row.name}`)
    assert.doesNotMatch(row.name, /^\d+\s*зм/i, `${slug}: coin item ${row.name}`)
    assert.doesNotMatch(row.name, /^ду$/i, `${slug}: truncated perfume`)
  }
  if (data.tool_choices && toolId) {
    const toolName = items.get(toolId.replace(/_/g, '-')) || toolId
    // At least one resolved tool name or slug hit.
    assert.ok(
      expanded.items.some(
        (row) =>
          row.slug === toolId.replace(/_/g, '-') ||
          row.name.toLowerCase().includes(String(toolName).toLowerCase().slice(0, 4)),
      ),
      `${slug}: expected tool ${toolId} in ${expanded.items.map((r) => r.name).join(', ')}`,
    )
  }
}

console.log('create2024PackExpand.selfcheck: ok')
