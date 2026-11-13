import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const OUT = '/opt/cursor/artifacts'
await mkdir(OUT, { recursive: true })

const base = process.env.SC04_BASE || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ headless: true })

async function shot(name, { width, height, path }) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-sc04-preview]')
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  await page.close()
  console.log('wrote', name)
}

try {
  await shot('sc04-master-1440', {
    width: 1440,
    height: 900,
    path: '/dev/sc04-live-table-preview?role=master',
  })
  await shot('sc04-player-1440', {
    width: 1440,
    height: 900,
    path: '/dev/sc04-live-table-preview?role=player&tab=chat',
  })
  await shot('sc04-table-390', {
    width: 390,
    height: 844,
    path: '/dev/sc04-live-table-preview?role=player',
  })
  await shot('sc04-feed-390', {
    width: 390,
    height: 844,
    path: '/dev/sc04-live-table-preview?role=master&feed=1',
  })
} finally {
  await browser.close()
}
