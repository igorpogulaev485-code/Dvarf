/**
 * SC-07: полноценные скрины реальных страниц (не /dev).
 * Лист — 5 сцен × 1440/390; Бой ещё и в бою; окно атаки с укрытием;
 * стол мастера/игрока; меню «Награды».
 */
import { chromium } from 'playwright'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'

const OUT = '/opt/cursor/artifacts'
const BASE = process.env.SC07_BASE || 'http://127.0.0.1:5173'
await mkdir(OUT, { recursive: true })

const login = JSON.parse(await readFile('/tmp/sc07-login.json', 'utf8'))
const login2 = JSON.parse(await readFile('/tmp/sc07-login2.json', 'utf8'))
const CHAR = JSON.parse(await readFile('/tmp/sc07-char.json', 'utf8')).id
const SESSION = JSON.parse(await readFile('/tmp/sc07-session.json', 'utf8')).id

const SCENES = [
  { id: 'combat', label: 'Бой' },
  { id: 'explore', label: 'Исследование' },
  { id: 'social', label: 'Общение' },
  { id: 'companions', label: 'Напарники' },
  { id: 'features', label: 'Способности' },
]

const browser = await chromium.launch({ headless: true })

async function withAuth(page, tokens, { onboardingDone = true } = {}) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ({ access, refresh, userId, onboardingDone }) => {
      localStorage.setItem('dvarf.access_token', access)
      localStorage.setItem('dvarf.refresh_token', refresh)
      if (userId) {
        localStorage.setItem(
          `creed20.onboarding.v1:${userId}`,
          JSON.stringify({
            version: 1,
            segment: 'dnd_knows',
            welcomeDone: onboardingDone,
            createHintVersion: 1,
            sheetTourDone: true,
            dismissedPanelHelp: [],
            helpOpened: false,
            pendingReadyBridge: false,
            pendingSheetTour: false,
          }),
        )
      }
      localStorage.removeItem('creed20.onboarding.v1')
    },
    {
      access: tokens.access_token,
      refresh: tokens.refresh_token,
      userId: tokens.user?.id,
      onboardingDone,
    },
  )
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  console.log('saved', name)
  return file
}

async function dismissDialogs(page) {
  // Close onboarding / help if any
  for (const label of ['Пропустить', 'Понятно', 'Закрыть', 'Позже']) {
    const btn = page.getByRole('button', { name: label })
    if (await btn.count()) {
      try {
        await btn.first().click({ timeout: 500 })
      } catch {
        /* ignore */
      }
    }
  }
  await page.keyboard.press('Escape').catch(() => {})
}

async function openSheet(page, width, height) {
  await page.setViewportSize({ width, height })
  await page.goto(`${BASE}/characters/${CHAR}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.play-desk, .mobile-vitals, .play-desk-header', {
    timeout: 30000,
  })
  await page.waitForTimeout(400)
  await dismissDialogs(page)
  await page.waitForTimeout(200)
}

async function selectScene(page, label, width) {
  if (width <= 960) {
    // BottomSceneNav: role=tab, aria-label = full MODE_LABELS name
    const tab = page.getByRole('tab', { name: label })
    if (await tab.count()) {
      await tab.first().click()
    } else {
      await page.locator('.mobile-scene-nav__tab').filter({ hasText: label.slice(0, 3) }).first().click()
    }
  } else {
    await page.locator('.play-desk__mode', { hasText: label }).click()
  }
  await page.waitForTimeout(350)
}

async function ensureCombatIdle(page) {
  // Outside combat: no turn economy marks if possible — just open Бой
}

async function ensureCombatActive(page) {
  const btn = page.getByRole('button', { name: /Новый ход/ })
  if (await btn.count()) {
    await btn.first().click()
    await page.waitForTimeout(400)
  }
}

async function enableDiceOnTable(page) {
  const toggle = page.getByRole('button', { name: /Кубики на столе/ })
  if (await toggle.count()) {
    const pressed = await toggle.first().getAttribute('aria-pressed')
    if (pressed !== 'true') {
      await toggle.first().click()
      await page.waitForTimeout(200)
    }
  }
}

try {
  // ——— Character sheet scenes ———
  for (const vp of [
    { w: 1440, h: 900, tag: '1440' },
    { w: 390, h: 844, tag: '390' },
  ]) {
    const page = await browser.newPage({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
    })
    await withAuth(page, login)
    await openSheet(page, vp.w, vp.h)

    for (const scene of SCENES) {
      await selectScene(page, scene.label, vp.w)
      if (scene.id === 'combat') {
        await ensureCombatIdle(page)
        await shot(page, `sc07-sheet-${scene.id}-out-${vp.tag}`)
        await ensureCombatActive(page)
        await shot(page, `sc07-sheet-${scene.id}-in-${vp.tag}`)
      } else {
        await shot(page, `sc07-sheet-${scene.id}-${vp.tag}`)
      }
    }

    // Attack dialog with cover expanded (desktop primarily; also 390)
    await selectScene(page, 'Бой', vp.w)
    await enableDiceOnTable(page)
    // With dice on table + no lobby combat → attack opens EnterOwnNumberDialog (+ cover)
    const weaponHit = page
      .locator('.play-desk-compact button')
      .filter({ hasText: /Длинный меч|Короткий меч|\+/ })
      .first()
    if (await weaponHit.count()) {
      await weaponHit.click()
    } else {
      const anyWeaponBtn = page.locator('.play-desk-compact__weapons button, .play-desk-compact button').nth(0)
      if (await anyWeaponBtn.count()) await anyWeaponBtn.click()
    }
    await page.waitForTimeout(500)
    // Expand cover
    const cover = page.getByRole('button', { name: /Укрытие \/ состояние цели/ })
    if (await cover.count()) {
      await cover.first().click()
      await page.waitForTimeout(300)
      await shot(page, `sc07-attack-cover-${vp.tag}`)
    } else {
      // Try link-style control
      const cover2 = page.locator('button, a, summary').filter({ hasText: /Укрытие/ })
      if (await cover2.count()) {
        await cover2.first().click()
        await page.waitForTimeout(300)
      }
      await shot(page, `sc07-attack-cover-${vp.tag}`)
    }
    await page.keyboard.press('Escape').catch(() => {})
    await page.close()
  }

  // ——— Master table ———
  for (const vp of [
    { w: 1440, h: 900, tag: '1440' },
    { w: 390, h: 844, tag: '390' },
  ]) {
    const page = await browser.newPage({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
    })
    await withAuth(page, login)
    await page.setViewportSize({ width: vp.w, height: vp.h })
    await page.goto(`${BASE}/sessions/${SESSION}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await dismissDialogs(page)
    await page.waitForSelector('.session-table, .session-live, .session-table-toolbar, main', {
      timeout: 30000,
    })
    await page.waitForTimeout(400)
    await shot(page, `sc07-table-master-${vp.tag}`)

    // Rewards menu
    const rewards = page.locator('[data-sc05-rewards], .session-toolbar-rewards').first()
    if (await rewards.count()) {
      const summary = rewards.locator('summary, button').first()
      await summary.click()
      await page.waitForTimeout(300)
      await shot(page, `sc07-rewards-menu-${vp.tag}`)
    } else {
      const byText = page.getByText('Награды').first()
      if (await byText.count()) {
        await byText.click()
        await page.waitForTimeout(300)
      }
      await shot(page, `sc07-rewards-menu-${vp.tag}`)
    }
    await page.close()
  }

  // ——— Player table ———
  for (const vp of [
    { w: 1440, h: 900, tag: '1440' },
    { w: 390, h: 844, tag: '390' },
  ]) {
    const page = await browser.newPage({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
    })
    await withAuth(page, login2)
    await page.setViewportSize({ width: vp.w, height: vp.h })
    await page.goto(`${BASE}/sessions/${SESSION}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await dismissDialogs(page)
    await page.waitForSelector('.session-table, .session-live, .session-table-toolbar, main', {
      timeout: 30000,
    })
    await page.waitForTimeout(400)
    await shot(page, `sc07-table-player-${vp.tag}`)
    await page.close()
  }

  await writeFile(
    path.join(OUT, 'sc07-screens-manifest.txt'),
    [
      'sc07-sheet-combat-out-1440.png',
      'sc07-sheet-combat-in-1440.png',
      'sc07-sheet-explore-1440.png',
      'sc07-sheet-social-1440.png',
      'sc07-sheet-companions-1440.png',
      'sc07-sheet-features-1440.png',
      'sc07-sheet-combat-out-390.png',
      'sc07-sheet-combat-in-390.png',
      'sc07-sheet-explore-390.png',
      'sc07-sheet-social-390.png',
      'sc07-sheet-companions-390.png',
      'sc07-sheet-features-390.png',
      'sc07-attack-cover-1440.png',
      'sc07-attack-cover-390.png',
      'sc07-table-master-1440.png',
      'sc07-table-master-390.png',
      'sc07-table-player-1440.png',
      'sc07-table-player-390.png',
      'sc07-rewards-menu-1440.png',
      'sc07-rewards-menu-390.png',
    ].join('\n') + '\n',
  )
  console.log('done')
} finally {
  await browser.close()
}
