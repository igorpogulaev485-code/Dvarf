import { chromium } from 'playwright'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const OUT = '/opt/cursor/artifacts/screenshots'
const CHAR_ID = 'c32d7762-cb8c-40c2-81a0-e0a7c6619e7d'
const BASE = 'http://127.0.0.1:5173'

await mkdir(OUT, { recursive: true })
const access = (await readFile('/tmp/tapguard_access.txt', 'utf8')).trim()
const refresh = (await readFile('/tmp/tapguard_refresh.txt', 'utf8')).trim()

const browser = await chromium.launch({ headless: true })

async function capture(viewport, prefix) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 })
  await page.addInitScript(
    ([a, r]) => {
      localStorage.setItem('dvarf.access_token', a)
      localStorage.setItem('dvarf.refresh_token', r)
    },
    [access, refresh],
  )
  await page.goto(`${BASE}/characters/${CHAR_ID}`, { waitUntil: 'networkidle' })
  // Wait for Play Desk attacks / consumables
  await page.locator('.play-desk-compact__subhead-label', { hasText: 'Расходники' }).waitFor({
    timeout: 30000,
  })
  await page.waitForTimeout(500)

  async function shot(name) {
    const file = path.join(OUT, `${prefix}_${name}.png`)
    await page.screenshot({ path: file, fullPage: false })
    console.log('saved', file)
  }

  // Scroll consumables into view if needed
  await page.locator('.play-desk-compact__consumables').scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  await shot('sheet_consumables_list')

  const boltsSpend = page
    .locator('.play-desk-compact__cons-row', { hasText: 'Болты арбалета' })
    .getByRole('button', { name: 'потратить' })
  await boltsSpend.click()
  await page.locator('.ui-toast').waitFor()
  await page.waitForTimeout(300)
  await shot('sheet_toast_undo')

  await page.locator('.ui-toast__action', { hasText: 'Отменить' }).click()
  await page.waitForTimeout(400)
  await shot('sheet_after_undo')

  await boltsSpend.click()
  await page.locator('.ui-toast').waitFor()
  const journal = page.getByRole('button', { name: /Журнал трат/ })
  if (await journal.count()) {
    await journal.click()
    await page.waitForTimeout(200)
  }
  await shot('sheet_journal')

  const potionQty = page
    .locator('.play-desk-compact__cons-row', { hasText: 'Зелье лечения' })
    .getByRole('button', { name: '×N' })
  await potionQty.click()
  await page.getByRole('heading', { name: /Потратить: Зелье лечения/ }).waitFor()
  await page.waitForTimeout(200)
  await shot('sheet_qty_pad')

  await page.getByRole('button', { name: 'Отмена' }).click()
  await page.waitForTimeout(200)

  await page.close()
}

await capture({ width: 420, height: 900 }, 'real_mobile')
await capture({ width: 1280, height: 900 }, 'real_desktop')
await browser.close()
console.log('done')
