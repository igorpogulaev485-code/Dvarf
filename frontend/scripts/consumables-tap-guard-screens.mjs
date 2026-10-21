import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const OUT = '/opt/cursor/artifacts/screenshots'
const BASE = 'http://127.0.0.1:5173/dev/consumables-tap-guard'

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 420, height: 820 },
  deviceScaleFactor: 2,
})

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.locator('.play-desk-compact__subhead-label', { hasText: 'Расходники' }).waitFor()

async function shot(name) {
  const file = path.join(OUT, name)
  await page.screenshot({ path: file, fullPage: true })
  console.log('saved', file)
  return file
}

await shot('consumables_list_split_actions.png')

const boltsSpend = page.locator('.play-desk-compact__cons-row', {
  hasText: 'Болты арбалета',
}).getByRole('button', { name: 'потратить' })
await boltsSpend.click()
await page.locator('.ui-toast').waitFor()
await page.waitForTimeout(300)
await shot('consumables_toast_undo.png')

await page.locator('.ui-toast__action', { hasText: 'Отменить' }).click()
await page.waitForTimeout(400)
await shot('consumables_after_undo.png')

await boltsSpend.click()
await page.locator('.ui-toast').waitFor()
await page.getByRole('button', { name: /Журнал трат/ }).click()
await page.waitForTimeout(200)
await shot('consumables_spend_journal.png')

const potionQty = page.locator('.play-desk-compact__cons-row', {
  hasText: 'Зелье лечения',
}).getByRole('button', { name: '×N' })
await potionQty.click()
await page.getByRole('heading', { name: /Потратить: Зелье лечения/ }).waitFor()
await page.waitForTimeout(200)
await shot('consumables_qty_pad.png')

const amountInput = page.locator('.ui-dialog input').first()
await amountInput.fill('2')
await page.getByRole('button', { name: /Потратить 2/ }).click()
await page.locator('.ui-toast').waitFor()
await page.waitForTimeout(300)
await shot('consumables_multi_spend_toast.png')

await browser.close()
console.log('done')
