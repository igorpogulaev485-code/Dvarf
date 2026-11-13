import { segmentJournalBody, wrapSelectionAsHidden } from './journalHidden'
import { journalHasNew } from './journalSeen'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

assert(
  wrapSelectionAsHidden('abc', 1, 2) === 'a{{скрыто}}b{{/скрыто}}c',
  'wrap selection',
)

const parts = segmentJournalBody('x {{скрыто}}y{{/скрыто}} z')
assert(parts.length === 3, 'segment count')
assert(parts[1]?.kind === 'hidden' && parts[1].text === 'y', 'hidden part')

assert(journalHasNew('2026-11-13T12:00:00Z', null) === true, 'unseen is new')
assert(
  journalHasNew('2026-11-13T12:00:00Z', '2026-11-13T13:00:00Z') === false,
  'seen after publish',
)
assert(
  journalHasNew('2026-11-13T14:00:00Z', '2026-11-13T13:00:00Z') === true,
  'publish after seen',
)

console.log('journalHidden.selfcheck: ok')
