/**
 * W-API-11 selfcheck: фильтры сверки и группировка книг.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/lobby/worldImportReview.selfcheck.ts
 */
import assert from 'node:assert/strict'
import type { WorldImportDiffEntry, WorldImportJob } from '../../shared/api/worldImports'
import {
  emptyCharacterSheetFields,
  filterDiffEntries,
  groupReviewEntries,
  isBookEntry,
  isCharacterEntry,
  jobStatusBanner,
  officeHolderLabel,
} from './worldImportReview'

function entry(
  partial: Partial<WorldImportDiffEntry> & Pick<WorldImportDiffEntry, 'source_key' | 'item_type' | 'status'>,
): WorldImportDiffEntry {
  return {
    draft_item_id: 'd1',
    title: partial.title ?? partial.source_key,
    page_id: null,
    message: '',
    hint: '',
    ...partial,
  }
}

const sample: WorldImportDiffEntry[] = [
  entry({
    source_key: 'world/locations/lunnyy-most.md',
    item_type: 'location',
    status: 'new',
    title: 'Лунный мост',
  }),
  entry({
    source_key: 'world/npcs/tandil.md',
    item_type: 'npc',
    status: 'conflict',
    title: 'Тандил',
  }),
  entry({
    source_key: 'world/player-books/chapters/Ledyanye-rasteniya-12-08.md',
    item_type: 'player_book_chapter',
    status: 'new',
    title: 'Ледяные растения',
  }),
  entry({
    source_key: 'world/player-books/chapters/other.md',
    item_type: 'player_book_chapter',
    status: 'update',
    title: 'Другая глава',
  }),
  entry({
    source_key: 'campaign/party/characters/kavil.md',
    item_type: 'party_character',
    status: 'new',
    title: 'Кавил',
  }),
  entry({
    source_key: 'world/lore/artefacts-kardian.md',
    item_type: 'ai_suggestion',
    status: 'ai_suggestion',
    title: 'Кардиан?',
  }),
  entry({
    source_key: 'world/npcs/gone.md',
    item_type: 'npc',
    status: 'missing_in_source',
    title: 'Пропал',
  }),
]

assert.equal(filterDiffEntries(sample, 'all').length, 7)
assert.equal(filterDiffEntries(sample, 'conflict').length, 1)
assert.equal(filterDiffEntries(sample, 'ai_suggestion').length, 1)
assert.equal(filterDiffEntries(sample, 'missing_in_source').length, 1)
assert.equal(filterDiffEntries(sample, 'character').length, 1)
assert.equal(filterDiffEntries(sample, 'book').length, 2)
assert.ok(isBookEntry(sample[2]!))
assert.ok(isCharacterEntry(sample[4]!))

const groups = groupReviewEntries(sample)
const charGroup = groups.find((g) => g.kind === 'character')
assert.ok(charGroup)
assert.equal(charGroup!.entries.length, 1)
const bookGroups = groups.filter((g) => g.kind === 'book')
assert.ok(bookGroups.length >= 1)
assert.ok(bookGroups.every((g) => g.collapsedByDefault))
assert.equal(
  bookGroups.reduce((n, g) => n + g.entries.length, 0),
  2,
)

const ready = jobStatusBanner({
  id: 'j',
  setting_id: 's',
  lobby_id: 'l',
  author_id: 'a',
  status: 'ready_for_review',
  rules_edition: '2014',
  source_kind: 'zip',
  idempotency_key: null,
  source_ref: null,
  last_confirmed_at: null,
  created_at: '',
  updated_at: '',
} satisfies WorldImportJob)
assert.equal(ready.text, 'Заливка ждёт сверки')
assert.equal(ready.tone, 'warn')

const confirmed = jobStatusBanner({
  ...ready,
  status: 'confirmed',
  last_confirmed_at: '2026-11-15T12:00:00Z',
} as WorldImportJob)
assert.equal(confirmed.text, 'Подтверждено')

assert.equal(officeHolderLabel('current'), 'текущий')
assert.equal(officeHolderLabel('former'), 'бывший')

const empty = emptyCharacterSheetFields({
  id: 'i',
  job_id: 'j',
  item_type: 'party_character',
  source_key: 'campaign/party/characters/kavil.md',
  status: 'proposed',
  proposal: { name: 'Кавил', sheet: { class_name: '', race_name: 'Человек' } },
  created_at: '',
  updated_at: '',
})
assert.ok(empty.includes('Класс'))
assert.ok(!empty.includes('Раса'))

console.log('worldImportReview.selfcheck: ok')
