/** Quick node selfcheck: npx tsx src/ui/bodyScrollLock.selfcheck.ts */

// Minimal DOM for lock helpers (no jsdom dep — stub document.body).
const body = { style: { overflow: '' } }
;(globalThis as unknown as { document: { body: typeof body } }).document = {
  body,
}

const { acquireBodyScrollLock, forceReleaseBodyScrollLock } = await import(
  './bodyScrollLock.ts'
)

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

body.style.overflow = ''
const releaseA = acquireBodyScrollLock()
assert(body.style.overflow === 'hidden', 'first lock hides')
const releaseB = acquireBodyScrollLock()
assert(body.style.overflow === 'hidden', 'stacked still hidden')
releaseA()
assert(body.style.overflow === 'hidden', 'one open keeps lock')
releaseB()
assert(body.style.overflow === '', 'all released restores')

const releaseC = acquireBodyScrollLock()
assert(body.style.overflow === 'hidden', 'lock again')
forceReleaseBodyScrollLock()
assert(body.style.overflow === '', 'force clears')
releaseC()
assert(body.style.overflow === '', 'late release is noop-safe')

// Nginx map key shape that broke YaBrowser (empty Sec-Fetch → three colons).
const yandexKey =
  ':::text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
assert(/^:::text\/html/i.test(yandexKey), 'SPA pattern matches YaBrowser Accept')
assert(!/^:text\/html/i.test(yandexKey), 'old one-colon pattern must NOT match')

const apiKey = 'cors:empty:Bearer tok:application/json'
assert(!/^navigate:/i.test(apiKey), 'API fetch not navigate')
assert(!/^[^:]*:document:/i.test(apiKey), 'API fetch not document')

console.log('bodyScrollLock.selfcheck ok')
