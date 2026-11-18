/**
 * P24-M05: live ClassicPrint2024 frames → artifacts/p24-m05/
 * Blank layout=2024 + ClassicSheetPage with mocked 2024 character (API route).
 */
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const ART = process.env.P24_M05_ART || '/opt/cursor/artifacts/p24-m05'
const REPO_ART = process.env.P24_M05_REPO_ART || join(process.cwd(), '..', 'artifacts', 'p24-m05')
const BASE = process.env.P24_M05_BASE || 'http://127.0.0.1:5173'
const CHAR_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'

mkdirSync(ART, { recursive: true })
mkdirSync(REPO_ART, { recursive: true })

function md5file(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

const sample2024 = {
  id: CHAR_ID,
  name: 'Элара Ветрорез',
  avatar_url: null,
  level: 5,
  class_name: 'Воин',
  race_name: 'Дварф (fallback)',
  hp_current: 44,
  hp_max: 48,
  rules_edition: '2024',
  sheet_version: 1,
  is_draft: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  sheet: {
    ui: { classic_sheet_layout: '2024' },
    identity: {
      background: 'Солдат',
      species_slug: 'elf',
      subclass_name: 'Мастер боевых искусств',
      experience: 6500,
    },
    proficiency: { bonus: 3 },
    abilities: {
      str: { score: 16 },
      dex: { score: 14 },
      con: { score: 14 },
      int: { score: 10 },
      wis: { score: 12 },
      cha: { score: 8 },
    },
    combat: {
      ac: 18,
      initiative: 2,
      speed: 30,
      inspiration: true,
      exhaustion: 1,
      hp_temp: 0,
      hp_dice_current: 5,
      hit_die: 'к10',
      death_successes: 0,
      death_fails: 0,
      training_armor_light: true,
      training_armor_medium: true,
      training_armor_heavy: true,
      training_shield: true,
      training_weapon_simple: true,
      training_weapon_martial: true,
    },
    weapon_mastery: {
      known: ['longsword', 'dagger', 'battleaxe'],
      source_class: 'fighter',
      baseline: ['longsword', 'dagger', 'battleaxe'],
      swap_available: false,
    },
    weapons: [
      {
        id: 'w1',
        name: 'Длинный меч',
        catalog_id: 'longsword',
        attack_bonus: '+6',
        damage: '1к8+3',
        damage_type: 'рубящий',
        ability: 'str',
        is_proficient: true,
        source_kind: 'weapon',
      },
      {
        id: 'w2',
        name: 'Кинжал',
        catalog_id: 'dagger',
        attack_bonus: '+5',
        damage: '1к4+2',
        damage_type: 'колющий',
        ability: 'dex',
        is_proficient: true,
        source_kind: 'weapon',
      },
    ],
    create_2024: {
      version: 1,
      background_asi: { str: 2, con: 1 },
      background_asi_mode: '+2/+1',
      origin_feat: { slug: 'savage-attacker', name_ru: 'Свирепый атакующий' },
    },
    features_text: { feats: 'Свирепый атакующий', traits: '', features: '' },
    inventory: { coins: { gp: 40 }, items: [], notes: '' },
    spells: { known: [], slots: {}, casting_ability: null },
    text_blocks: {},
    notes: {},
  },
}

async function shotEl(page, selector, name) {
  const path = join(ART, `${name}.png`)
  await page.locator(selector).first().screenshot({ path, animations: 'disabled' })
  const repoPath = join(REPO_ART, `${name}.png`)
  copyFileSync(path, repoPath)
  return { name, path: repoPath, md5: md5file(path) }
}

async function shotClip(page, name, clip) {
  const path = join(ART, `${name}.png`)
  await page.screenshot({ path, clip, animations: 'disabled' })
  const repoPath = join(REPO_ART, `${name}.png`)
  copyFileSync(path, repoPath)
  return { name, path: repoPath, md5: md5file(path) }
}

async function hideChrome(page) {
  await page.evaluate(() => {
    document.querySelectorAll(
      '.classic-print-toolbar, .onboarding-modal, .coachmark, .welcome-card, .ui-toast',
    ).forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
}

async function waitSheet(page) {
  await page.waitForFunction(
    () => document.querySelectorAll('.classic-lss-p1, .classic-sheet').length > 0,
    null,
    { timeout: 60_000 },
  )
  await page.waitForTimeout(1200)
  await hideChrome(page)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const results = []

  async function captureViewport(label, viewport) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()

    await page.route('http://127.0.0.1:5173/auth/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/auth/login') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'm05-demo',
            refresh_token: 'm05-demo-r',
            token_type: 'bearer',
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u-m05',
          email: 'm05@example.com',
          display_name: 'M05',
        }),
      })
    })
    await page.route(`http://127.0.0.1:5173/characters/${CHAR_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sample2024),
      })
    })
    await page.route(`http://127.0.0.1:5173/characters/${CHAR_ID}?*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sample2024),
      })
    })
    await page.route('http://127.0.0.1:5173/characters', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([sample2024]),
      })
    })
    await page.route('http://127.0.0.1:5173/catalog**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.addInitScript(() => {
      localStorage.setItem('dvarf.access_token', 'm05-demo')
      localStorage.setItem('dvarf.refresh_token', 'm05-demo-r')
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
    })

    // 1) Blank 2024 — captions / labels
    await page.goto(`${BASE}/classic/blank?layout=2024&v=${Date.now()}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    })
    await waitSheet(page)
    results.push(await shotEl(page, '.classic-lss-p1', `blank-2024-p1-${label}`))

    // Top header crop (Вид + origin area)
    const blankBox = await page.locator('.classic-lss-p1').boundingBox()
    if (blankBox) {
      results.push(
        await shotClip(page, `blank-2024-header-${label}`, {
          x: Math.max(0, blankBox.x),
          y: Math.max(0, blankBox.y),
          width: Math.min(blankBox.width, viewport.width - 8),
          height: Math.min(420, blankBox.height),
        }),
      )
    }

    // 2) Live ClassicSheetPage print layout 2024
    await page.goto(`${BASE}/characters/${CHAR_ID}/classic?v=${Date.now()}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    })
    await waitSheet(page)
    const switched = await page.evaluate(() => {
      const root = [...document.querySelectorAll('.classic-toolbar-segmented')].find((el) =>
        /Макет/.test(el.getAttribute('aria-label') || ''),
      )
      const btn =
        root &&
        [...root.querySelectorAll('.ui-segmented__item')].find((b) => b.textContent?.trim() === '2024')
      if (!btn) return false
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      return true
    })
    if (switched) await page.waitForTimeout(1200)
    await hideChrome(page)
    await page.waitForTimeout(400)

    const markers = await page.evaluate(() => {
      const text = document.body.innerText
      return {
        vid: /Вид/.test(text),
        speciesElf: /Эльф/.test(text),
        exhaustion: /броскам D20/.test(text),
        heroic: /Переброс любого кубика/.test(text),
        rest: /пауза 16 ч/.test(text),
        mastery: /Мастерство оружия/.test(text),
        origin: /Черта происхождения/.test(text),
        asi: /СИЛ \+2/.test(text) || /ASI:/.test(text),
        notesSap: /Ослабление/.test(text),
        notesNick: /Засечка/.test(text),
      }
    })
    writeFileSync(join(ART, `markers-${label}.json`), JSON.stringify(markers, null, 2))
    writeFileSync(join(REPO_ART, `markers-${label}.json`), JSON.stringify(markers, null, 2))
    console.log('markers', label, markers)
    for (const [k, v] of Object.entries(markers)) {
      if (!v) console.warn(`WARN marker ${k}=false at ${label}`)
    }

    results.push(await shotEl(page, '.classic-lss-p1', `live-classic-2024-p1-${label}`))
    const liveBox = await page.locator('.classic-lss-p1').boundingBox()
    if (liveBox) {
      results.push(
        await shotClip(page, `live-classic-2024-header-${label}`, {
          x: Math.max(0, liveBox.x),
          y: Math.max(0, liveBox.y),
          width: Math.min(liveBox.width, viewport.width - 8),
          height: Math.min(480, liveBox.height),
        }),
      )
      // Left column: exhaustion / heroic / rest notes
      results.push(
        await shotClip(page, `live-classic-2024-rules-${label}`, {
          x: Math.max(0, liveBox.x),
          y: Math.max(0, liveBox.y + 200),
          width: Math.min(520, liveBox.width),
          height: Math.min(700, Math.max(200, liveBox.height - 200)),
        }),
      )
    }

    await context.close()
  }

  await captureViewport('desktop-1440', { width: 1440, height: 900 })
  await captureViewport('phone-390', { width: 390, height: 844 })

  writeFileSync(join(ART, 'capture-index.json'), JSON.stringify(results, null, 2))
  writeFileSync(join(REPO_ART, 'capture-index.json'), JSON.stringify(results, null, 2))
  console.log('p24-m05 capture ok', results.map((r) => r.name).join(', '))
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
