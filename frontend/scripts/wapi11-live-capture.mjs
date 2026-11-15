/**
 * W-API-11 live frames — настоящий SettingDetailPage + WorldImportPanel + API.
 * Output: artifacts/wapi11/live/ (+ /opt/cursor/artifacts/wapi11/live/)
 */
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
  existsSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = join(__dirname, '../..')
const OUT = join(REPO, 'artifacts/wapi11/live')
const OPT = '/opt/cursor/artifacts/wapi11/live'
const BASE = process.env.WAPI11_BASE || 'http://127.0.0.1:5173'
const API = process.env.WAPI11_API || 'http://127.0.0.1:8000'
const ZIP = join(REPO, 'artifacts/wapi11/fixtures/demo-world.zip')

mkdirSync(OUT, { recursive: true })
mkdirSync(OPT, { recursive: true })
mkdirSync(dirname(ZIP), { recursive: true })

function md5(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

function buildDemoZip() {
  const tmp = join(REPO, 'artifacts/wapi11/fixtures/demo-world')
  mkdirSync(join(tmp, 'world/locations'), { recursive: true })
  mkdirSync(join(tmp, 'world/npcs'), { recursive: true })
  mkdirSync(join(tmp, 'world/lore'), { recursive: true })
  mkdirSync(join(tmp, 'world/player-books/chapters'), { recursive: true })
  mkdirSync(join(tmp, 'campaign/party/characters'), { recursive: true })
  writeFileSync(
    join(tmp, 'world/locations/quiet-harbor.md'),
    `---\ntitle: Тихая гавань\ntags: [порт]\n---\n# Тихая гавань\n\nНебольшой порт на северном берегу.\n`,
  )
  writeFileSync(
    join(tmp, 'world/npcs/old-miller.md'),
    `---\ntitle: Старый мельник\n---\n# Старый мельник\n\nЖивёт у мельницы за гаванью. Знает все сплетни.\n`,
  )
  writeFileSync(
    join(tmp, 'world/lore/copper-compass.md'),
    `---\ntitle: Медный компас\n---\n# Медный компас\n\nСтарый компас, который иногда показывает не туда.\n`,
  )
  writeFileSync(
    join(tmp, 'world/player-books/chapters/harbor-tales-01.md'),
    `---\ntitle: Сказки гавани\n---\n# Сказки гавани\n\nГлава первая.\n`,
  )
  writeFileSync(
    join(tmp, 'world/player-books/chapters/harbor-tales-02.md'),
    `---\ntitle: Другая глава\n---\n# Другая глава\n\nГлава вторая.\n`,
  )
  writeFileSync(
    join(tmp, 'campaign/party/characters/mira.md'),
    `---\ntitle: Мира\nrace: Человек\nclass: Следопыт\nlevel: 3\n---\n# Мира\n\nСледопыт из гавани.\n`,
  )
  execSync(`cd "${tmp}" && zip -qr "${ZIP}" .`)
  return ZIP
}

async function api(token, path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Accept: 'application/json',
      'X-Dvarf-Client': 'app',
      ...(opts.body && !(opts.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    throw new Error(`${opts.method || 'GET'} ${path} → ${res.status} ${text.slice(0, 400)}`)
  }
  return data
}

async function registerAndLogin(page) {
  const email = `wapi11-${Date.now()}@example.com`
  const password = 'wapi11-live-pass'
  const reg = await api(null, '/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      display_name: 'Мастер Гавани',
    }),
  })
  if (reg.debug_verify_url) {
    const u = new URL(reg.debug_verify_url, API)
    const token = u.searchParams.get('token')
    if (token) {
      await api(null, '/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
    }
  }
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const body = await page.evaluate(
    async ({ email, password }) => {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Dvarf-Client': 'app' },
        body: JSON.stringify({ email, password }),
      })
      return res.json()
    },
    { email, password },
  )
  if (!body.access_token) throw new Error(`login failed: ${JSON.stringify(body).slice(0, 200)}`)
  await page.evaluate(
    ({ a, r }) => {
      localStorage.setItem('dvarf.access_token', a)
      localStorage.setItem('dvarf.refresh_token', r)
      localStorage.setItem(
        'creed20.onboarding.v1',
        JSON.stringify({
          version: 1,
          welcomeDone: true,
          segment: 'skip',
          createHintVersion: 1,
          sheetTourDone: true,
          lobbyTourDone: true,
          dismissedPanelHelp: [],
          helpOpened: false,
          pendingReadyBridge: false,
          pendingSheetTour: false,
          pendingLobbyTour: false,
        }),
      )
    },
    { a: body.access_token, r: body.refresh_token },
  )
  return body.access_token
}

async function shot(page, name, size) {
  await page.setViewportSize(size)
  await page.waitForTimeout(500)
  const file = `${name}.png`
  const dest = join(OUT, file)
  await page.screenshot({ path: dest, fullPage: true })
  try {
    copyFileSync(dest, join(OPT, file))
  } catch {
    /* ignore */
  }
  const hash = md5(dest)
  console.log('live shot', file, hash)
  return { file, md5: hash, ...size }
}

async function main() {
  buildDemoZip()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const token = await registerAndLogin(page)

  const lobby = await api(token, '/lobbies', {
    method: 'POST',
    body: JSON.stringify({ name: 'Стол Северный берег' }),
  })
  const setting = await api(token, `/lobbies/${lobby.id}/settings`, {
    method: 'POST',
    body: JSON.stringify({ name: 'Северный берег' }),
  })

  // Upload zip via API so review is ready when we open the panel
  const job = await api(token, `/settings/${setting.id}/world-imports/jobs`, {
    method: 'POST',
    body: JSON.stringify({ rules_edition: '2014', source_kind: 'zip' }),
    headers: { 'Idempotency-Key': `live-zip-${Date.now()}` },
  })
  const form = new FormData()
  const zipBytes = readFileSync(ZIP)
  form.append('file', new Blob([zipBytes], { type: 'application/zip' }), 'demo-world.zip')
  form.append('rules_edition', '2014')
  await api(token, `/settings/${setting.id}/world-imports/${job.id}/vault-zip`, {
    method: 'POST',
    body: form,
  })

  const settingUrl = `${BASE}/settings/${setting.id}?worldImport=1`
  const manifest = []

  // 01 entry — setting page with Залить мир (panel open)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(settingUrl, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForSelector('text=Залить мир', { timeout: 30_000 })
  // Ensure panel visible
  const hideBtn = page.getByRole('button', { name: 'Скрыть импорт мира' })
  if (!(await hideBtn.count())) {
    await page.getByRole('button', { name: 'Залить мир' }).first().click()
  }
  await page.waitForSelector('text=Сверка', { timeout: 30_000 })
  manifest.push(await shot(page, '01-entry-upload-1440', { width: 1440, height: 900 }))

  // 02 review with filters
  await page.getByRole('tab', { name: 'Конфликты' }).click().catch(() => {})
  await page.waitForTimeout(300)
  await page.getByRole('tab', { name: 'Все' }).click().catch(() => {})
  // Expand book pack if collapsed
  const bookToggle = page.getByRole('button', { name: /Книга:/ })
  if (await bookToggle.count()) {
    const label = await bookToggle.first().innerText()
    if (label.includes('▸')) await bookToggle.first().click()
  }
  manifest.push(await shot(page, '02-review-filters-1440', { width: 1440, height: 900 }))

  // 03 characters filter
  await page.getByRole('tab', { name: 'Персонажи' }).click()
  await page.waitForTimeout(400)
  manifest.push(await shot(page, '03-characters-1440', { width: 1440, height: 900 }))
  await page.getByRole('tab', { name: 'Все' }).click().catch(() => {})

  // 04 toggle warning dialog
  const aiChip = page.getByRole('checkbox', { name: /ИИ может подтверждать/ })
  await aiChip.click()
  await page.waitForSelector('text=Включить автоподтверждение ИИ?', { timeout: 10_000 })
  manifest.push(await shot(page, '04-toggle-warn-1440', { width: 1440, height: 900 }))
  await page.getByRole('button', { name: 'Оставить выкл.' }).click()

  // 05 token — create then redact secret before shot
  await page.getByRole('button', { name: 'Выписать токен' }).click()
  await page.waitForSelector('text=Скопируйте сейчас', { timeout: 15_000 })
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'))
    for (const el of inputs) {
      if (typeof el.value === 'string' && el.value.startsWith('wapi_') && el.value.length > 12) {
        el.value = 'wapi_••••••••••••••••'
      }
    }
  })
  manifest.push(await shot(page, '05-token-redacted-1440', { width: 1440, height: 900 }))

  // 06 confirm dialog
  await page.getByRole('button', { name: 'Подтвердить', exact: true }).click()
  await page.waitForSelector('text=Подтвердить заливку?', { timeout: 10_000 })
  manifest.push(await shot(page, '06-confirm-dialog-1440', { width: 1440, height: 900 }))
  // Cancel dialog then open undo path after actual confirm via API for status variety
  await page.getByRole('button', { name: 'Назад' }).click()

  // Confirm via API so undo dialog is available
  await api(token, `/settings/${setting.id}/world-imports/${job.id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('text=Отменить подтверждение', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Отменить подтверждение' }).click()
  await page.waitForSelector('text=Отменить подтверждение?', { timeout: 10_000 })
  manifest.push(await shot(page, '07-undo-dialog-1440', { width: 1440, height: 900 }))
  await page.getByRole('button', { name: 'Оставить' }).click()

  // 08 narrow status
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(settingUrl, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForSelector('text=Импорт мира', { timeout: 30_000 })
  // On narrow, panel shows status only
  await page.waitForSelector('text=Подтверждено', { timeout: 15_000 }).catch(async () => {
    await page.waitForSelector('text=Заливка ждёт сверки', { timeout: 5_000 }).catch(() => {})
  })
  manifest.push(await shot(page, '08-status-390', { width: 390, height: 844 }))

  // uniqueness
  const hashes = new Set(manifest.map((m) => m.md5))
  if (hashes.size !== manifest.length) {
    throw new Error(`md5 not unique: ${manifest.map((m) => m.md5).join(', ')}`)
  }

  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  try {
    writeFileSync(join(OPT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  } catch {
    /* ignore */
  }
  await browser.close()
  console.log('wapi11-live-capture ok', OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
