/** Quick node selfcheck: npx tsx src/ui/bodyScrollLock.selfcheck.ts */

// Minimal DOM for lock helpers (no jsdom dep — stub document + window).
const body = {
  style: {
    overflow: '',
    position: '',
    top: '',
    left: '',
    right: '',
    width: '',
  },
}
const html = {
  style: {
    overflow: '',
    overscrollBehavior: '',
  },
}
;(globalThis as unknown as { document: { body: typeof body; documentElement: typeof html } }).document =
  {
    body,
    documentElement: html,
  }
;(globalThis as unknown as { window: { scrollY: number; pageYOffset: number; scrollTo: (...a: unknown[]) => void } }).window =
  {
    scrollY: 120,
    pageYOffset: 120,
    scrollTo: () => undefined,
  }

const { acquireBodyScrollLock, forceReleaseBodyScrollLock } = await import(
  './bodyScrollLock.ts'
)

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

body.style.overflow = ''
body.style.position = ''
html.style.overflow = ''
const releaseA = acquireBodyScrollLock()
assert(body.style.overflow === 'hidden', 'first lock hides')
assert(html.style.overflow === 'hidden', 'html also locked')
assert(body.style.position === 'fixed', 'body pinned for iOS')
assert(body.style.top === '-120px', 'scroll offset frozen')
const releaseB = acquireBodyScrollLock()
assert(body.style.overflow === 'hidden', 'stacked still hidden')
releaseA()
assert(body.style.overflow === 'hidden', 'one open keeps lock')
releaseB()
assert(body.style.overflow === '', 'all released restores')
assert(body.style.position === '', 'position restored')
assert(html.style.overflow === '', 'html restored')

const releaseC = acquireBodyScrollLock()
assert(body.style.overflow === 'hidden', 'lock again')
forceReleaseBodyScrollLock()
assert(body.style.overflow === '', 'force clears')
releaseC()
assert(body.style.overflow === '', 'late release is noop-safe')

// Nginx map key: x-dvarf-client : mode : dest : authorization : accept
// YaBrowser stripped Sec-Fetch → empty client/mode/dest/auth → four colons.
const yandexKey =
  '::::text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
assert(/^::::text\/html/i.test(yandexKey), 'SPA pattern matches YaBrowser Accept')
assert(!/^:::text\/html/i.test(yandexKey), 'old three-colon key must NOT match four-colon')
assert(!/^:text\/html/i.test(yandexKey), 'old one-colon pattern must NOT match')

const apiKey = 'app:cors:empty:Bearer tok:application/json'
assert(/^app:/i.test(apiKey), 'API client header forces proxy')
assert(/:application\/json/i.test(apiKey), 'JSON Accept stays on API')
assert(!/^[^:]*:navigate:/i.test(apiKey), 'API fetch not navigate')
assert(!/^[^:]*:[^:]*:document:/i.test(apiKey), 'API fetch not document')

console.log('bodyScrollLock.selfcheck ok')
