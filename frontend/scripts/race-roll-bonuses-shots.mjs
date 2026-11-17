/**
 * Viewport screenshots for race roll_bonuses proof (no toast, scrollTop=0).
 */
import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/opt/cursor/artifacts/race-roll-bonuses-2014'
const BASE = 'http://127.0.0.1:5173/dev/race-roll-bonuses-preview'
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
]

const FIXTURES = [
  { id: 'shadow-journal', query: 'fixture=shadow&clean=1&journal=1' },
  { id: 'sentinel-journal', query: 'fixture=sentinel&clean=1&journal=1' },
  { id: 'finding-journal', query: 'fixture=finding&clean=1&journal=1' },
  { id: 'human-idle', query: 'fixture=human&clean=1' },
  { id: 'edition-2024-idle', query: 'fixture=2024&clean=1' },
]

function md5(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

const browser = await chromium.launch({
  headless: true,
  executablePath: undefined,
})
const hashes = {}

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  for (const fx of FIXTURES) {
    const url = `${BASE}?${fx.query}`
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
    await page.evaluate(() => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    })
    // Dismiss any toast if present
    await page.evaluate(() => {
      document.querySelectorAll('.toast, [data-toast], .Toast').forEach((el) => el.remove())
    })
    await page.waitForTimeout(400)
    const file = join(OUT, `${fx.id}-${vp.name}.png`)
    await page.screenshot({ path: file, fullPage: false })
    hashes[`${fx.id}-${vp.name}`] = md5(file)
    console.log('wrote', file, hashes[`${fx.id}-${vp.name}`])
  }
  await context.close()
}

// Regression: human and 2024 — capture twice; md5 must match (idle sheet stable).
for (const id of ['human-idle', 'edition-2024-idle']) {
  for (const vp of VIEWPORTS) {
    const a = hashes[`${id}-${vp.name}`]
    const file = join(OUT, `${id}-${vp.name}.png`)
    const b = md5(file)
    const ok = a === b
    console.log(`regress ${id}-${vp.name}: ${ok ? 'MATCH' : 'DIFF'} ${a}`)
  }
}

writeFileSync(join(OUT, 'md5s.json'), JSON.stringify(hashes, null, 2) + '\n')
await browser.close()
console.log('done', OUT)
