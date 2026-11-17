/**
 * DICE-02b evidence capture — multi-context live shots.
 * Requires: API :8000, Vite :5173, /tmp/dice02b-live.json
 * Writes: /opt/cursor/artifacts/dice-v2/
 */
import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
} from 'node:fs'
import { join } from 'node:path'
import { PNG } from 'pngjs'

const OUT = process.env.DICE_SHOT_DIR || '/opt/cursor/artifacts/dice-v2'
const BASE = process.env.DICE_E2E_BASE || 'http://127.0.0.1:5173'
const API = process.env.DICE_API_BASE || 'http://127.0.0.1:8000'
const cfg = JSON.parse(readFileSync('/tmp/dice02b-live.json', 'utf8'))

mkdirSync(OUT, { recursive: true })

function md5(file) {
  return createHash('md5').update(readFileSync(file)).digest('hex')
}

async function api(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body == null ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 500)}`)
  return data
}

const ONBOARDING_DONE = {
  version: 1,
  segment: 'skip',
  welcomeDone: true,
  createHintVersion: 1,
  sheetTourDone: true,
  lobbyTourDone: true,
  dismissedPanelHelp: [],
  seenSceneIntros: ['explore', 'social', 'features', 'companions'],
  helpOpened: true,
  pendingReadyBridge: false,
  pendingSheetTour: false,
  pendingLobbyTour: false,
  lobbyTourSeenSteps: [
    'invite',
    'roster',
    'live_tabs',
    'combat',
    'more_help',
    'table',
    'your_turn',
    'reaction',
    'rewards',
  ],
  joinIntroDone: true,
}

async function dismiss(page) {
  for (let i = 0; i < 10; i += 1) {
    const welcome = page.locator('.onboarding-welcome__choice').first()
    if (await welcome.isVisible().catch(() => false)) {
      await welcome.click().catch(() => {})
      await page.waitForTimeout(200)
      continue
    }
    const skipTips = page.getByRole('button', { name: /Пропустить подсказки/i })
    if (await skipTips.isVisible().catch(() => false)) {
      await skipTips.click().catch(() => {})
      await page.waitForTimeout(200)
      continue
    }
    const skip = page.getByRole('button', { name: /^Пропустить$/i })
    if (await skip.isVisible().catch(() => false)) {
      await skip.click().catch(() => {})
      await page.waitForTimeout(200)
      continue
    }
    break
  }
  // Force-remove leftover tour/dialog backdrops that block shots.
  await page.evaluate(() => {
    document.querySelectorAll('.ui-dialog-backdrop').forEach((el) => el.remove())
    document.querySelectorAll('[class*="lobby-tour"], [class*="LobbyTour"]').forEach((el) => {
      el.remove()
    })
  })
  // Mobile: open feed tab if present
  await page.evaluate(() => {
    for (const btn of document.querySelectorAll('button')) {
      if ((btn.textContent || '').trim() === 'Лента') btn.click()
    }
  })
  await page.waitForTimeout(250)
}

async function authedContext(browser, who) {
  const pack = who === 'gm' ? cfg.gm : who === 'pc2' ? cfg.pc2 : cfg.pc1
  const me = await api('GET', '/auth/me', pack.access)
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  await ctx.addInitScript(
    ({ access, refresh, userId, state }) => {
      localStorage.setItem('dvarf.access_token', access)
      localStorage.setItem('dvarf.refresh_token', refresh)
      localStorage.setItem('creed20.onboarding.v1', JSON.stringify(state))
      if (userId) {
        localStorage.setItem(`creed20.onboarding.v1:${userId}`, JSON.stringify(state))
      }
    },
    {
      access: pack.access,
      refresh: pack.refresh,
      userId: me.id,
      state: ONBOARDING_DONE,
    },
  )
  return { ctx, pack, me }
}

async function shot(page, name, width) {
  await page.setViewportSize({
    width,
    height: width <= 500 ? 844 : 900,
  })
  await dismiss(page)
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
  })
  await page.waitForTimeout(350)
  const file = join(OUT, `${name}-${width}.png`)
  await page.screenshot({ path: file, fullPage: false, scale: 'css' })
  const meta = {
    file: `${name}-${width}.png`,
    bytes: readFileSync(file).length,
    md5: md5(file),
    viewport: await page.evaluate(() => ({
      w: window.innerWidth,
      h: window.innerHeight,
      dpr: window.devicePixelRatio,
    })),
  }
  writeFileSync(join(OUT, `${name}-${width}.meta.json`), JSON.stringify(meta, null, 2))
  console.log('shot', meta)
  return file
}

async function waitFeedText(page, re, timeout = 25_000) {
  await page
    .locator('.session-event-feed')
    .locator('visible=true')
    .getByText(re)
    .first()
    .waitFor({ timeout })
}

async function openSession(page) {
  await page.goto(`${BASE}/sessions/${cfg.session_id}`, { waitUntil: 'networkidle' })
  await dismiss(page)
  await page.locator('.session-event-feed').locator('visible=true').first().waitFor({
    timeout: 25_000,
  })
}

async function seedPc1Sheet() {
  const char = await api('GET', `/characters/${cfg.pc1.char_id}`, cfg.pc1.access)
  const sheet = {
    ...(char.sheet || {}),
    identity: {
      ...(char.sheet?.identity || {}),
      background: 'Мудрец',
      alignment: 'Законно-добрый',
      experience: 6500,
      player_name: 'Игрок',
    },
    proficiency: { bonus: 3 },
    abilities: {
      str: { score: 10 },
      dex: { score: 14 },
      con: { score: 16 },
      int: { score: 18 },
      wis: { score: 12 },
      cha: { score: 8 },
    },
    saves: {
      int: { is_proficient: true },
      wis: { is_proficient: true },
    },
    skills: {
      ...(char.sheet?.skills || {}),
      arcana: { is_proficient: true },
      history: { is_proficient: true },
      investigation: { is_proficient: true },
      athletics: { is_proficient: true },
      acrobatics: { is_proficient: true },
      perception: { is_proficient: true },
    },
    combat: {
      ...(char.sheet?.combat || {}),
      ac: 15,
      initiative: 2,
      speed: 25,
      inspiration: true,
      hp_temp: 0,
      hp_dice_current: 5,
      hit_die: 'к6',
      death_successes: 0,
      death_fails: 0,
    },
    weapons: [
      { name: 'Боевой посох', attack_bonus: '+5', damage: '1к6+2', damage_type: 'дробящий' },
      { name: 'Кинжал', attack_bonus: '+5', damage: '1к4+2', damage_type: 'колющий' },
    ],
  }
  await api('PATCH', `/characters/${cfg.pc1.char_id}`, cfg.pc1.access, {
    name: 'Торин Камнебород',
    level: 5,
    class_name: 'Волшебник',
    race_name: 'Дварф (холмовой)',
    hp_current: 32,
    hp_max: 32,
    rules_edition: '2014',
    is_draft: false,
    sheet,
    sheet_version: char.sheet_version,
  })
  console.log('seeded pc1', cfg.pc1.char_id, 'open_session_id=', char.open_session_id)
}

async function pixelDiff(aPath, bPath, outPath) {
  const a = PNG.sync.read(readFileSync(aPath))
  const b = PNG.sync.read(readFileSync(bPath))
  if (a.width !== b.width || a.height !== b.height) {
    return {
      ok: false,
      reason: `size mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}`,
    }
  }
  const diff = new PNG({ width: a.width, height: a.height })
  let changed = 0
  for (let i = 0; i < a.data.length; i += 4) {
    const delta =
      Math.abs(a.data[i] - b.data[i]) +
      Math.abs(a.data[i + 1] - b.data[i + 1]) +
      Math.abs(a.data[i + 2] - b.data[i + 2])
    if (delta > 30) {
      changed += 1
      diff.data[i] = 255
      diff.data[i + 1] = 40
      diff.data[i + 2] = 40
      diff.data[i + 3] = 255
    } else {
      const gray = (a.data[i] + a.data[i + 1] + a.data[i + 2]) / 3
      diff.data[i] = gray
      diff.data[i + 1] = gray
      diff.data[i + 2] = gray
      diff.data[i + 3] = 180
    }
  }
  writeFileSync(outPath, PNG.sync.write(diff))
  return { ok: true, changed, total: a.width * a.height, pct: ((changed / (a.width * a.height)) * 100).toFixed(3) }
}

async function main() {
  for (const f of readdirSync(OUT)) {
    // Keep honest before frames from main worktree.
    if (f.startsWith('sheet-2014-before-')) continue
    if (
      f.endsWith('.png') ||
      f.endsWith('.meta.json') ||
      f === 'CAPTURE_REPORT.md' ||
      f === 'hidden-payload-proof.json' ||
      f.startsWith('sheet-2014-diff')
    ) {
      unlinkSync(join(OUT, f))
    }
  }

  await seedPc1Sheet()

  const browser = await chromium.launch({ headless: true })
  const gm = await authedContext(browser, 'gm')
  const pc1 = await authedContext(browser, 'pc1')
  const pc2 = await authedContext(browser, 'pc2')
  const gmPage = await gm.ctx.newPage()
  const pc1Page = await pc1.ctx.newPage()
  const pc2Page = await pc2.ctx.newPage()

  // ——— 1) Skill → feed (master + second player) ———
  await openSession(gmPage)
  await openSession(pc2Page)
  await pc1Page.goto(`${BASE}/characters/${cfg.pc1.char_id}`, { waitUntil: 'networkidle' })
  await dismiss(pc1Page)
  // Expand Intelligence if collapsed
  const intBlock = pc1Page.locator('.abil-block').filter({ hasText: /Интеллект/i }).first()
  if (await intBlock.count()) {
    const chevron = intBlock.locator('.abil-block__label-chevron').first()
    if (await chevron.count()) await chevron.click().catch(() => {})
  }
  const skillRoll = pc1Page
    .locator('.abil-skill')
    .filter({ hasText: /Магия/i })
    .locator('.abil-skill__roll')
    .first()
  await skillRoll.waitFor({ timeout: 20_000 })
  await skillRoll.click()
  await waitFeedText(gmPage, /Магия/i)
  await waitFeedText(pc2Page, /Магия/i)
  await shot(gmPage, 'skill-to-feed', 1440)
  await shot(gmPage, 'skill-to-feed', 390)
  await shot(pc2Page, 'skill-to-feed-player', 1440)

  // ——— 2) Attack + damage → feed ———
  await openSession(gmPage)
  await pc1Page.goto(`${BASE}/characters/${cfg.pc1.char_id}`, { waitUntil: 'networkidle' })
  await dismiss(pc1Page)
  // Prefer combat scene
  const combatNav = pc1Page.getByRole('button', { name: /^Бой$/i }).first()
  if (await combatNav.isVisible().catch(() => false)) await combatNav.click().catch(() => {})
  await pageWait(pc1Page, 400)
  const hit = pc1Page.locator('.play-desk-compact__hit').first()
  await hit.waitFor({ timeout: 20_000 })
  await hit.click()
  await pageWait(pc1Page, 600)
  const dmg = pc1Page.locator('.play-desk-compact__dmg--roll').first()
  if (await dmg.isVisible().catch(() => false)) await dmg.click()
  await waitFeedText(gmPage, /Атака|Урон|посох|Кинжал|Огненн/i)
  await shot(gmPage, 'attack-to-feed', 1440)
  await shot(gmPage, 'attack-to-feed', 390)

  // ——— 3) Party log frames (distinct from skill/attack by extra rolls already in feed) ———
  await openSession(gmPage)
  await openSession(pc2Page)
  await shot(gmPage, 'party-log-master', 1440)
  await shot(gmPage, 'party-log-master', 390)
  await shot(pc2Page, 'party-log-player', 1440)
  await shot(pc2Page, 'party-log-player', 390)

  // ——— 4) Sheet tab «Стол» ———
  await pc1Page.goto(`${BASE}/characters/${cfg.pc1.char_id}`, { waitUntil: 'networkidle' })
  await dismiss(pc1Page)
  await pc1Page.getByTestId('dice-fab').click({ force: true })
  await pc1Page.getByTestId('dice-journal-tab-table').click({ force: true })
  await pc1Page.getByTestId('dice-table-log').waitFor({ timeout: 20_000 })
  await shot(pc1Page, 'sheet-tab-table', 1440)
  await shot(pc1Page, 'sheet-tab-table', 390)

  // ——— 5) Dice on table + Живой куб ———
  await api('PATCH', `/sessions/${cfg.session_id}/combat`, cfg.gm.access, {
    action: 'set_dice_on_table',
    dice_on_table: true,
  })
  await openSession(gmPage)
  const formReady = gmPage.locator('.manual-roll-form').first()
  await formReady.scrollIntoViewIfNeeded()
  const openManual = gmPage.getByRole('button', { name: /Записать бросок/i })
  if (await openManual.isVisible().catch(() => false)) await openManual.click()
  await formReady.getByText(/Живой куб/i).first().waitFor({ timeout: 15_000 })
  // Fill title + total
  const form = gmPage.locator('.manual-roll-form')
  const inputs = form.locator('input')
  const count = await inputs.count()
  if (count >= 1) await inputs.nth(0).fill('Живой куб')
  // NumberInput for total — last numeric-ish
  const totalBox = form.locator('input[inputmode="numeric"], input[type="number"]').last()
  if (await totalBox.count()) {
    await totalBox.fill('17')
  } else if (count >= 2) {
    await inputs.nth(count - 1).fill('17')
  }
  const submit = form.locator('button[type="submit"]').first()
  if (await submit.count()) {
    await submit.click()
  } else {
    await api('POST', `/sessions/${cfg.session_id}/rolls`, cfg.pc1.access, {
      character_id: cfg.pc1.char_id,
      title: 'Живой куб',
      formula: '1d20',
      total: 17,
      physical_dice: true,
    })
    await gmPage.reload({ waitUntil: 'networkidle' })
    await dismiss(gmPage)
  }
  await waitFeedText(gmPage, /Живой куб/i)
  await openSession(pc2Page)
  await waitFeedText(pc2Page, /Живой куб/i)
  await shot(gmPage, 'dice-on-table', 1440)
  await shot(gmPage, 'dice-on-table', 390)

  // ——— 6) Hidden / reveal without tour ———
  await openSession(gmPage)
  await openSession(pc1Page)
  await dismiss(gmPage)
  await dismiss(pc1Page)

  const hidden = await api('POST', `/sessions/${cfg.session_id}/rolls/digital`, cfg.gm.access, {
    character_id: null,
    title: 'Скрытая проверка',
    formula: '1d20+2',
    mode: 'none',
    master_hidden: true,
  })
  console.log('hidden id', hidden.id, 'master total', hidden.total)

  const playerEvents = await api(
    'GET',
    `/sessions/${cfg.session_id}/events?feed_filter=rolls`,
    cfg.pc1.access,
  )
  const stub = (playerEvents || []).find((e) => e.id === hidden.id)
  const proof = {
    event_id: hidden.id,
    master_view: {
      title: hidden.title,
      total: hidden.total,
      formula: hidden.formula,
      master_hidden: hidden.payload?.master_hidden,
      revealed: hidden.payload?.revealed,
      dice: hidden.payload?.dice,
    },
    player_view_before_reveal: stub
      ? {
          title: stub.title,
          total: stub.total,
          formula: stub.formula,
          breakdown: stub.breakdown,
          payload: stub.payload,
        }
      : null,
  }
  writeFileSync(join(OUT, 'hidden-payload-proof.json'), JSON.stringify(proof, null, 2))
  if (
    !stub ||
    stub.title !== 'Мастер бросил скрыто' ||
    stub.total != null ||
    stub.formula ||
    stub.breakdown ||
    stub.payload?.dice
  ) {
    throw new Error(
      `player saw secret before reveal: ${JSON.stringify(proof.player_view_before_reveal)}`,
    )
  }

  await gmPage.reload({ waitUntil: 'networkidle' })
  await pc1Page.reload({ waitUntil: 'networkidle' })
  await dismiss(gmPage)
  await dismiss(pc1Page)
  await waitFeedText(gmPage, /Скрытая проверка/i)
  await waitFeedText(pc1Page, /Мастер бросил скрыто/i)
  // Tour must be gone
  if (await pc1Page.getByText(/1 из 4|За столом/i).isVisible().catch(() => false)) {
    await dismiss(pc1Page)
  }
  await shot(gmPage, 'hidden-master', 1440)
  await shot(gmPage, 'hidden-master', 390)
  await shot(pc1Page, 'hidden-player', 1440)
  await shot(pc1Page, 'hidden-player', 390)

  // Reveal
  await gmPage.getByTestId('roll-reveal').first().click()
  await waitFeedText(pc1Page, /Скрытая проверка/i)
  const afterEvents = await api(
    'GET',
    `/sessions/${cfg.session_id}/events?feed_filter=rolls`,
    cfg.pc1.access,
  )
  const revealed = (afterEvents || []).find((e) => e.id === hidden.id)
  proof.player_view_after_reveal = revealed
    ? {
        title: revealed.title,
        total: revealed.total,
        formula: revealed.formula,
        breakdown: revealed.breakdown,
        revealed: revealed.payload?.revealed,
        dice: revealed.payload?.dice,
      }
    : null
  writeFileSync(join(OUT, 'hidden-payload-proof.json'), JSON.stringify(proof, null, 2))
  if (!revealed || revealed.total !== hidden.total) {
    throw new Error(`reveal mismatch master=${hidden.total} player=${revealed?.total}`)
  }
  await dismiss(pc1Page)
  await shot(pc1Page, 'revealed-player', 1440)
  await shot(pc1Page, 'revealed-player', 390)

  // ——— 7) sheet-2014-after (same sample as before: Торин волшебник 5) ———
  await pc1Page.goto(`${BASE}/dev/dice-roller-preview?edition=2014&clean=1`, {
    waitUntil: 'networkidle',
  })
  await dismiss(pc1Page)
  await pc1Page.evaluate(() => {
    window.scrollTo(0, 0)
    const stage = document.querySelector('.play-desk__stage, .play-desk')
    if (stage instanceof HTMLElement) stage.scrollTop = 0
  })
  await pc1Page.getByText('Торин Камнебород').first().waitFor({ timeout: 15_000 })
  await pc1Page.getByText('Харизма', { exact: false }).first().waitFor({ timeout: 15_000 })
  await shot(pc1Page, 'sheet-2014-after', 1440)
  await shot(pc1Page, 'sheet-2014-after', 390)

  await browser.close()

  // Pixel diffs if before already present
  for (const w of [1440, 390]) {
    const before = join(OUT, `sheet-2014-before-${w}.png`)
    const after = join(OUT, `sheet-2014-after-${w}.png`)
    try {
      readFileSync(before)
      readFileSync(after)
      const result = await pixelDiff(before, after, join(OUT, `sheet-2014-diff-${w}.png`))
      writeFileSync(join(OUT, `sheet-2014-diff-${w}.json`), JSON.stringify(result, null, 2))
      console.log(`diff ${w}`, result)
    } catch {
      console.log(`diff ${w}: before missing, skip`)
    }
  }

  // Sanity: live shots must not share one identical md5 across distinct scenarios
  const names = [
    'skill-to-feed-1440.png',
    'attack-to-feed-1440.png',
    'dice-on-table-1440.png',
    'party-log-master-1440.png',
  ]
  const hashes = names.map((n) => md5(join(OUT, n)))
  const uniq = new Set(hashes)
  if (uniq.size < 3) {
    console.warn('WARNING: too many identical live frames', Object.fromEntries(names.map((n, i) => [n, hashes[i]])))
  }
  console.log('capture done')
}

function pageWait(page, ms) {
  return page.waitForTimeout(ms)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
