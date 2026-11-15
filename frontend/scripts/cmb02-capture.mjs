/**
 * CMB-02/03 screenshots: smite states + turn action groups + hdr/scene/combat control.
 * Requires API :8000 + vite :5173 + seed_cmb02_chars.py (+ lp01/qi01).
 *
 * Dev-only RNG hook via Math.random (not product code) for nat1 / nat20 frames.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync, readdirSync } from 'node:fs'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts'
const BASE = process.env.CMB02_BASE || 'http://127.0.0.1:5173'
const TAG = process.env.CMB02_TAG || ''
const PAL5 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7'
const PAL11 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8'
const ROGUE5 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9'
const WAR5 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
const WAR1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
const PAL_WL = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'
const MONK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6'

mkdirSync(ART, { recursive: true })
const out = (name) => `${ART}/${TAG}${name}`

async function login(page) {
  const body = await page.evaluate(async () => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'uikit03@example.com', password: 'uikit03-dev' }),
    })
    return res.json()
  })
  if (!body.access_token) throw new Error(`login failed: ${JSON.stringify(body).slice(0, 200)}`)
  await page.evaluate(
    ({ a, r }) => {
      localStorage.setItem('dvarf.access_token', a)
      localStorage.setItem('dvarf.refresh_token', r)
      localStorage.setItem('dvarf.mobileVitals.collapsed.v2', '0')
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
}

async function openSheet(page, id) {
  await page.goto(`${BASE}/characters/${id}`, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    document.querySelectorAll('.onboarding-modal, .coachmark, .welcome-card').forEach((el) => {
      if (el instanceof HTMLElement) el.style.display = 'none'
    })
  })
  const expand = page.getByRole('button', { name: /Развернуть шапку/i })
  if (await expand.count()) await expand.first().click().catch(() => {})
  await page.waitForSelector('.play-desk', { timeout: 20_000 })
}

async function openCombat(page, w) {
  if (w < 960) {
    const nav = page.locator('.mobile-scene-nav button, .mobile-scene-nav__tab').filter({ hasText: /Бой/i })
    if (await nav.count()) await nav.first().click().catch(() => {})
  }
  const tab = page.locator('button.play-desk__mode[data-mode="combat"], button:has-text("Бой")')
  if (await tab.count()) await tab.first().click().catch(() => {})
  await page.waitForTimeout(400)
  if (w < 960) {
    const atk = page.locator('.mobile-combat-seg__btn').filter({ hasText: /^Атаки$/ })
    if (await atk.count()) await atk.first().click().catch(() => {})
  }
  await page.waitForSelector('.play-desk-compact[data-onboarding="actions"]', { timeout: 15_000 }).catch(() => {})
}

async function shotPanel(page, path) {
  const box = await page.evaluate(() => {
    const el =
      document.querySelector('.play-desk-compact[data-onboarding="actions"]') ||
      document.querySelector('.play-desk-compact')
    if (!el) return null
    el.scrollIntoView({ block: 'start' })
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.left) - 4),
      y: Math.max(0, Math.round(r.top)),
      width: Math.max(80, Math.round(r.width) + 8),
      height: Math.min(window.innerHeight - Math.round(r.top) - 4, Math.max(220, Math.round(r.height) + 8)),
    }
  })
  if (!box) throw new Error(`no panel for ${path}`)
  await page.screenshot({ path, clip: box })
}

async function shotHeader(page, path) {
  const box = await page.evaluate(() => {
    const desk = document.querySelector('.play-desk')
    if (!desk) return null
    const wide = desk.classList.contains('play-desk--wide')
    const root = wide
      ? document.querySelector('.play-desk__top')
      : document.querySelector('.play-desk__mobile-chrome')
    if (!root) return null
    const r = root.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.x)),
      y: Math.max(0, Math.round(r.y)),
      width: Math.max(80, Math.round(r.width)),
      height: Math.max(40, wide ? Math.round(r.height) : Math.min(Math.round(r.height), 420)),
    }
  })
  if (!box) throw new Error(`no header for ${path}`)
  await page.screenshot({ path, clip: box })
}

async function shotSceneBlock(page, path) {
  const box = await page.evaluate(() => {
    const el =
      document.querySelector('.play-desk__scene-tools') ||
      document.querySelector('.scene-turn-controls') ||
      document.querySelector('[data-onboarding="scene-tools"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(r.left) - 4),
      y: Math.max(0, Math.round(r.top) - 4),
      width: Math.max(80, Math.round(r.width) + 8),
      height: Math.max(36, Math.round(r.height) + 8),
    }
  })
  if (!box) {
    // Fallback: empty 1×1 so pair diff still runs
    writeFileSync(path.replace(/\.png$/, '.missing.txt'), 'scene block not found')
    return false
  }
  await page.screenshot({ path, clip: box })
  return true
}

async function composePair(page, aPath, bPath, outPath, la, lb) {
  const stacked = await page.evaluate(
    async ({ a, b, la, lb }) => {
      async function load(src) {
        const img = new Image()
        img.src = src
        await img.decode()
        return img
      }
      const ia = await load(a)
      const ib = await load(b)
      const pad = 28
      const width = Math.max(ia.width, ib.width) + 24
      const height = ia.height + ib.height + pad * 3 + 36
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fbf7ec'
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = '#2d2d2a'
      ctx.font = '600 14px "IBM Plex Sans", sans-serif'
      ctx.fillText(la, 12, 18)
      ctx.drawImage(ia, 12, pad)
      ctx.fillText(lb, 12, pad + ia.height + 22)
      ctx.drawImage(ib, 12, pad * 2 + ia.height + 18)
      return canvas.toDataURL('image/png')
    },
    {
      a: `data:image/png;base64,${readFileSync(aPath).toString('base64')}`,
      b: `data:image/png;base64,${readFileSync(bPath).toString('base64')}`,
      la,
      lb,
    },
  )
  writeFileSync(outPath, Buffer.from(stacked.replace(/^data:image\/png;base64,/, ''), 'base64'))
}

async function openTurnGroup(page, label) {
  const tab = page.locator('.play-desk-turn-actions__tab').filter({ hasText: new RegExp(`^${label}$`, 'i') })
  if (!(await tab.count())) return false
  const btn = tab.first()
  const disabled = await btn.isDisabled().catch(() => false)
  if (disabled) return false
  const open = await btn.evaluate((el) => el.classList.contains('is-open'))
  if (!open) await btn.click().catch(() => {})
  await page.waitForTimeout(300)
  return true
}

async function openSmiteOnFirstMelee(page) {
  const btn = page.locator('.play-desk-compact__tool--smite').first()
  if (await btn.count()) {
    await btn.click().catch(() => {})
    await page.waitForTimeout(250)
  }
}

/** Dev-only: force next rollDie(20) face via Math.random mid-bucket. */
async function forceNextD20(page, face) {
  await page.evaluate((f) => {
    const faceN = Math.max(1, Math.min(20, Math.floor(f)))
    if (!window.__cmb02OrigRandom) {
      window.__cmb02OrigRandom = Math.random.bind(Math)
    }
    window.__cmb02PendingD20 = faceN
    Math.random = () => {
      if (window.__cmb02PendingD20 != null) {
        const pending = window.__cmb02PendingD20
        window.__cmb02PendingD20 = null
        return (pending - 0.5) / 20
      }
      return window.__cmb02OrigRandom()
    }
  }, face)
}

async function clickFirstMeleeAttack(page) {
  // Prefer the attack-roll bonus button inside a weapon row
  const roll = page.locator('.play-desk-compact__row.is-attack .play-desk-compact__mod--roll').first()
  if (await roll.count()) {
    await roll.click().catch(() => {})
    await page.waitForTimeout(500)
    return true
  }
  const hit = page.locator('.play-desk-compact__row.is-attack .play-desk-compact__hit').first()
  if (await hit.count()) {
    await hit.click().catch(() => {})
    await page.waitForTimeout(500)
    return true
  }
  return false
}

async function clickSmiteCircle(page, level = 1) {
  const btn = page.locator('.play-desk-smite__slot').filter({ hasText: new RegExp(`^${level}\\s·`) }).first()
  if (await btn.count()) {
    await btn.click().catch(() => {})
    await page.waitForTimeout(400)
    return true
  }
  const any = page.locator('.play-desk-smite__slot:not(:disabled)').first()
  if (await any.count()) {
    await any.click().catch(() => {})
    await page.waitForTimeout(400)
    return true
  }
  return false
}

async function toggleUndead(page) {
  const btn = page.locator('.play-desk-smite__undead, .play-desk-smite button, .play-desk-smite .sheet-chip').filter({
    hasText: /\+1к8|нежить/i,
  })
  if (await btn.count()) {
    await btn.first().click().catch(() => {})
    await page.waitForTimeout(200)
  }
}

async function spendActionViaDash(page) {
  const opened = await openTurnGroup(page, 'Действие')
  if (!opened) return false
  const dash = page.locator('.play-desk-turn-actions__panel .sheet-chip').filter({ hasText: /^Рывок$/ })
  if (await dash.count()) {
    await dash.first().click().catch(() => {})
    await page.waitForTimeout(300)
    // close panel — click tab again
    await openTurnGroup(page, 'Действие')
    return true
  }
  return false
}

function cleanupTmp() {
  for (const name of readdirSync(ART)) {
    if (name.startsWith('_tmp') || name.startsWith(`${TAG}_tmp`)) {
      try {
        unlinkSync(`${ART}/${name}`)
      } catch {
        /* ignore */
      }
    }
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await login(page)

  // —— Smite idle / open-arm (paladin 5) ——
  for (const w of [1440, 390]) {
    await page.setViewportSize({ width: w, height: 1600 })
    await openSheet(page, PAL5)
    await openCombat(page, w)
    await shotPanel(page, out(`smite-idle-${w}.png`))
    await openSmiteOnFirstMelee(page)
    await shotPanel(page, out(`smite-open-hit-${w}.png`))
  }

  // Smite improved (paladin 11)
  await page.setViewportSize({ width: 1440, height: 1600 })
  await openSheet(page, PAL11)
  await openCombat(page, 1440)
  await openSmiteOnFirstMelee(page)
  await shotPanel(page, out('smite-improved-1440.png'))

  // —— Smite interactive states (paladin 5, forced dice) ——
  await page.setViewportSize({ width: 1440, height: 1600 })
  await openSheet(page, PAL5)
  await openCombat(page, 1440)

  // nat1 → no smite offer
  await forceNextD20(page, 1)
  await clickFirstMeleeAttack(page)
  await shotPanel(page, out('smite-nat1-1440.png'))

  // fresh sheet for crit
  await openSheet(page, PAL5)
  await openCombat(page, 1440)
  await forceNextD20(page, 20)
  await clickFirstMeleeAttack(page)
  await page.waitForSelector('.play-desk-smite.is-confirm', { timeout: 8_000 }).catch(() => {})
  await clickSmiteCircle(page, 1)
  await page.waitForSelector('.play-desk-smite__radiant', { timeout: 5_000 }).catch(() => {})
  await shotPanel(page, out('smite-crit-1440.png'))

  // undead + apply
  await openSheet(page, PAL5)
  await openCombat(page, 1440)
  await forceNextD20(page, 15)
  await clickFirstMeleeAttack(page)
  await page.waitForSelector('.play-desk-smite.is-confirm', { timeout: 8_000 }).catch(() => {})
  await toggleUndead(page)
  await shotPanel(page, out('smite-undead-1440.png'))
  await clickSmiteCircle(page, 1)
  await page.waitForSelector('.play-desk-smite__radiant', { timeout: 5_000 }).catch(() => {})
  await shotPanel(page, out('smite-applied-1440.png'))

  // —— Turn pairs: rogue5 / war5 ——
  for (const w of [1440, 390]) {
    await page.setViewportSize({ width: w, height: 1800 })
    const shots = []
    for (const [id, tag] of [
      [ROGUE5, 'rogue'],
      [WAR5, 'war'],
    ]) {
      await openSheet(page, id)
      await openCombat(page, w)
      const closed = out(`_tmp-turn-closed-${tag}-${w}.png`)
      await shotPanel(page, closed)
      shots.push(['closed', closed])

      for (const group of ['Действие', 'Бонусное', 'Реакция']) {
        await openTurnGroup(page, group)
        const p = out(`_tmp-turn-${group}-${tag}-${w}.png`)
        await shotPanel(page, p)
        shots.push([group, p])
      }
    }
    const map = Object.fromEntries(
      ['closed', 'Действие', 'Бонусное', 'Реакция'].map((k) => {
        const rogue = shots.find((s) => s[0] === k && s[1].includes('rogue'))?.[1]
        const war = shots.find((s) => s[0] === k && s[1].includes('war'))?.[1]
        return [k, { rogue, war }]
      }),
    )
    const keys = [
      ['closed', 'turn-closed'],
      ['Действие', 'turn-action'],
      ['Бонусное', 'turn-bonus'],
      ['Реакция', 'turn-reaction'],
    ]
    for (const [k, name] of keys) {
      if (map[k]?.rogue && map[k]?.war && existsSync(map[k].rogue) && existsSync(map[k].war)) {
        await composePair(
          page,
          map[k].rogue,
          map[k].war,
          out(`${name}-pair-${w}.png`),
          'плут 5',
          'воин 5 (GWM+щит)',
        )
      }
    }
  }

  // Monk bonus
  await page.setViewportSize({ width: 1440, height: 1600 })
  await openSheet(page, MONK)
  await openCombat(page, 1440)
  await openTurnGroup(page, 'Бонусное')
  await shotPanel(page, out('turn-bonus-monk-1440.png'))

  // Action spent (rogue after Dash)
  await openSheet(page, ROGUE5)
  await openCombat(page, 1440)
  await spendActionViaDash(page)
  await shotPanel(page, out('turn-action-spent-1440.png'))

  // Paladin 5: disabled Бонусное tooltip
  await openSheet(page, PAL5)
  await openCombat(page, 1440)
  const bonusTab = page.locator('.play-desk-turn-actions__tab').filter({ hasText: /^Бонусное$/i })
  if (await bonusTab.count()) {
    await bonusTab.first().hover({ force: true }).catch(() => {})
    await page.waitForTimeout(400)
    // Force native title into a visible tip bubble for headless screenshot
    await page.evaluate(() => {
      const tab = document.querySelector('.play-desk-turn-actions__tab:disabled')
      if (!tab) return
      const tip = tab.getAttribute('title') || 'Нет бонусных действий'
      let bubble = document.getElementById('cmb02-tip-bubble')
      if (!bubble) {
        bubble = document.createElement('div')
        bubble.id = 'cmb02-tip-bubble'
        document.body.appendChild(bubble)
      }
      const r = tab.getBoundingClientRect()
      bubble.textContent = tip
      bubble.setAttribute(
        'style',
        [
          'position:fixed',
          `left:${Math.round(r.left)}px`,
          `top:${Math.round(r.bottom) + 6}px`,
          'z-index:99999',
          'padding:6px 10px',
          'border-radius:8px',
          'background:#2d2d2a',
          'color:#fbf7ec',
          'font:600 12px "IBM Plex Sans",sans-serif',
          'box-shadow:0 4px 14px rgba(0,0,0,.18)',
          'pointer-events:none',
          'max-width:240px',
        ].join(';'),
      )
    })
    await shotPanel(page, out('turn-bonus-paladin-disabled-tooltip-1440.png'))
    await page.evaluate(() => document.getElementById('cmb02-tip-bubble')?.remove())
  }

  // combat-pair-390 (after)
  await page.setViewportSize({ width: 390, height: 1600 })
  await openSheet(page, ROGUE5)
  await openCombat(page, 390)
  const combatRogue = out('_tmp-combat-rogue-390.png')
  await shotPanel(page, combatRogue)
  await openSheet(page, WAR5)
  await openCombat(page, 390)
  const combatWar = out('_tmp-combat-war-390.png')
  await shotPanel(page, combatWar)
  await composePair(
    page,
    combatRogue,
    combatWar,
    out('combat-pair-390.png'),
    'плут 5',
    'воин 5',
  )

  // HDR + scene control
  for (const w of [1440, 390]) {
    await page.setViewportSize({ width: w, height: 1200 })
    await openSheet(page, ROGUE5)
    await openCombat(page, w)
    await shotHeader(page, out(`hdr-pair-${w}.png`))
    await shotHeader(page, out(`header-${w}.png`))
  }
  await page.setViewportSize({ width: 1440, height: 1200 })
  await openSheet(page, ROGUE5)
  await openCombat(page, 1440)
  await shotSceneBlock(page, out('scene-block-pair-1440.png'))

  // —— CMB-04 ——
  for (const w of [1440, 390]) {
    await page.setViewportSize({ width: w, height: 1600 })
    // Smite open confirm after hit
    await openSheet(page, PAL5)
    await openCombat(page, w)
    await forceNextD20(page, 15)
    await clickFirstMeleeAttack(page)
    await page.waitForSelector('.play-desk-smite.is-confirm', { timeout: 8_000 }).catch(() => {})
    await shotPanel(page, out(`smite-open-hit-${w}.png`))

    // Undead chip on
    await toggleUndead(page)
    await shotPanel(page, out(`smite-undead-${w}.png`))

    // Nat 1 mark
    await openSheet(page, PAL5)
    await openCombat(page, w)
    await forceNextD20(page, 1)
    await clickFirstMeleeAttack(page)
    await page.waitForSelector('.play-desk-smite__nat1', { timeout: 5_000 }).catch(() => {})
    await shotPanel(page, out(`smite-nat1-${w}.png`))

    // Pact smite (paladin 2 / warlock 3)
    await openSheet(page, PAL_WL)
    await openCombat(page, w)
    await openSmiteOnFirstMelee(page)
    await page.waitForSelector('.play-desk-smite__slot--pact, .play-desk-smite', { timeout: 5_000 }).catch(() => {})
    await shotPanel(page, out(`smite-pact-${w}.png`))
  }

  // Fighter: Second Wind in Бонусное
  for (const w of [1440, 390]) {
    await page.setViewportSize({ width: w, height: 1600 })
    await openSheet(page, WAR5)
    await openCombat(page, w)
    await openTurnGroup(page, 'Бонусное')
    await shotPanel(page, out(`turn-bonus-fighter-${w}.png`))

    const sw = page.locator('.play-desk-turn-actions__panel .sheet-chip').filter({
      hasText: /Второе дыхание/,
    })
    if (await sw.count()) {
      await sw.first().click().catch(() => {})
      await page.waitForTimeout(400)
      await openTurnGroup(page, 'Бонусное')
      await shotPanel(page, out(`turn-bonus-fighter-spent-${w}.png`))
    }

    await openSheet(page, WAR5)
    await openCombat(page, w)
    await openTurnGroup(page, 'Действие')
    await shotPanel(page, out(`turn-action-surge-${w}.png`))
  }

  // Warrior 1 also has Second Wind (no Action Surge)
  await page.setViewportSize({ width: 1440, height: 1600 })
  await openSheet(page, WAR1)
  await openCombat(page, 1440)
  await openTurnGroup(page, 'Бонусное')
  await shotPanel(page, out('turn-bonus-fighter1-1440.png'))

  cleanupTmp()
  console.log('cmb02-capture done →', ART)
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
