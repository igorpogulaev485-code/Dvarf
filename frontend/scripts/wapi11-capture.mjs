/**
 * W-API-11 frames — Playwright на /dev/wapi11-preview.
 * Output: artifacts/wapi11/ (+ /opt/cursor/artifacts/wapi11/)
 */
import { mkdirSync, copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = join(__dirname, '../..')
const OUT = join(REPO, 'artifacts/wapi11')
const OPT = '/opt/cursor/artifacts/wapi11'
const BASE = process.env.WAPI11_BASE || 'http://127.0.0.1:5173'

mkdirSync(OUT, { recursive: true })
mkdirSync(OPT, { recursive: true })

const SHOTS = [
  { name: '01-entry-1440', scene: 'entry', size: { width: 1440, height: 900 } },
  { name: '02-upload-1440', scene: 'upload', size: { width: 1440, height: 900 } },
  { name: '03-review-filters-1440', scene: 'review', size: { width: 1440, height: 900 } },
  { name: '04-characters-1440', scene: 'characters', size: { width: 1440, height: 900 } },
  { name: '05-toggle-warn-1440', scene: 'toggle', size: { width: 1440, height: 900 } },
  { name: '06-confirm-1440', scene: 'confirm', size: { width: 1440, height: 900 } },
  { name: '07-status-390', scene: 'status', size: { width: 390, height: 844 }, narrow: true },
]

async function main() {
  const browser = await chromium.launch({ headless: true })
  const manifest = []

  for (const shot of SHOTS) {
    const page = await browser.newPage({
      viewport: shot.size,
      deviceScaleFactor: 1,
    })
    const q = new URLSearchParams({ scene: shot.scene })
    if (shot.narrow) q.set('narrow', '1')
    const url = `${BASE}/dev/wapi11-preview?${q.toString()}`
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
    await page.waitForSelector('[data-wapi11-preview]', { timeout: 15_000 })
    // Дать диалогам открыться
    await page.waitForTimeout(400)
    const file = `${shot.name}.png`
    const dest = join(OUT, file)
    await page.screenshot({ path: dest, fullPage: true })
    try {
      copyFileSync(dest, join(OPT, file))
    } catch {
      /* opt may be missing outside cloud */
    }
    manifest.push({ file, scene: shot.scene, ...shot.size, url })
    await page.close()
    console.log('shot', file)
  }

  await browser.close()
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  try {
    writeFileSync(join(OPT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  } catch {
    /* ignore */
  }
  console.log('wapi11-capture ok', OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
