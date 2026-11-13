import {
  latestRevealedAt,
  recentRevealedPages,
  wikiRevealHasNew,
} from './wikiRevealSeen'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

assert(wikiRevealHasNew(null, null) === false, 'no latest → no badge')
assert(wikiRevealHasNew('2026-01-02T00:00:00Z', null) === false, 'first visit → no badge')
assert(
  wikiRevealHasNew('2026-01-02T00:00:00Z', '2026-01-01T00:00:00Z') === true,
  'newer reveal → badge',
)
assert(
  wikiRevealHasNew('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z') === false,
  'older reveal → no badge',
)

const pages = [
  { title: 'A', revealed_at: '2026-01-01T00:00:00Z' },
  { title: 'B', revealed_at: '2026-01-03T00:00:00Z' },
  { title: 'C', revealed_at: null },
]
assert(latestRevealedAt(pages) === '2026-01-03T00:00:00Z', 'latest pick')
assert(recentRevealedPages(pages, 10)[0]?.title === 'B', 'recent sort')

console.log('wikiRevealSeen.selfcheck: ok')
