/**
 * LOBBY-FIX after frames — real Vite+API, master + player, 1440/390/(760).
 * Output: /opt/cursor/artifacts/lobbyfix/ + docs/audit/frames/lobby-fix/
 */
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  copyFileSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'

const ART = '/opt/cursor/artifacts/lobbyfix'
const DOCS = new URL('../../docs/audit/frames/lobby-fix/', import.meta.url).pathname
const BASE = process.env.LOBBYFIX_BASE || 'http://127.0.0.1:5173'
const API = process.env.LOBBYFIX_API || 'http://127.0.0.1:8000'

mkdirSync(ART, { recursive: true })
mkdirSync(DOCS, { recursive: true })

function md5(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const body = await page.evaluate(async ({ email, password }) => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    return res.json()
  }, { email, password })
  if (!body.access_token) throw new Error(`login ${email}: ${JSON.stringify(body).slice(0, 200)}`)
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

async function api(token, path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${path} → ${res.status} ${text.slice(0, 300)}`)
  return data
}

async function shot(page, name, { w = 1440, h = 900 } = {}) {
  await page.setViewportSize({ width: w, height: h })
  await page.waitForTimeout(350)
  const file = `${name}-${w === 390 && h === 760 ? '760' : w}.png`
  const artPath = `${ART}/${file}`
  await page.screenshot({ path: artPath, fullPage: false })
  copyFileSync(artPath, `${DOCS}/${file}`)
  return { file, md5: md5(artPath) }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const masterCtx = await browser.newContext()
  const playerCtx = await browser.newContext()
  const master = await masterCtx.newPage()
  const player = await playerCtx.newPage()

  const frames = []
  const push = (meta) => frames.push(meta)

  const masterToken = await login(master, 'uikit03@example.com', 'uikit03-dev')
  const playerToken = await login(player, 'player02@example.com', 'player02-dev')

  // Close leftover open sessions so player can transfer
  const masterLobbies = await api(masterToken, '/lobbies')
  for (const L of masterLobbies || []) {
    const full = await api(masterToken, `/lobbies/${L.id}`)
    for (const s of full.sessions || []) {
      if (s.closed_at) continue
      try {
        await api(masterToken, `/sessions/${s.id}/close`, {
          method: 'POST',
          body: JSON.stringify({ summary: 'cleanup', write_journal: false }),
        })
      } catch {
        /* ignore */
      }
    }
  }

  // Create lobby
  const lobbyName = `LOBBY-FIX ${Date.now().toString(36)}`
  const lobby = await api(masterToken, '/lobbies', {
    method: 'POST',
    body: JSON.stringify({ name: lobbyName }),
  })
  const invite = lobby.invite_code || lobby.code
  const code = invite || (await api(masterToken, `/lobbies/${lobby.id}`)).invite_code

  // Player joins (transfer if already in another lobby)
  const chars = await api(playerToken, '/characters')
  const charId = chars[0]?.id
  if (!charId) throw new Error('player has no characters')
  try {
    await api(playerToken, '/lobbies/join', {
      method: 'POST',
      body: JSON.stringify({
        code,
        character_id: charId,
        action: 'join',
        acknowledge_start_mismatch: true,
      }),
    })
  } catch (err) {
    const msg = String(err?.message || err)
    if (!msg.includes('409')) throw err
    await api(playerToken, '/lobbies/join', {
      method: 'POST',
      body: JSON.stringify({
        code,
        character_id: charId,
        action: 'transfer',
        acknowledge_start_mismatch: true,
      }),
    })
  }

  // Hub
  await master.goto(`${BASE}/lobbies/${lobby.id}`, { waitUntil: 'networkidle' })
  push(await shot(master, 'm-hub-after'))
  push(await shot(master, 'm-hub-after', { w: 390, h: 844 }))

  // Campaign rules
  await master.evaluate(() => {
    location.hash = 'settings'
  })
  await master.waitForTimeout(500)
  push(await shot(master, 'm-campaign-rules'))
  push(await shot(master, 'm-campaign-rules', { w: 390, h: 844 }))

  // Join page
  await player.goto(`${BASE}/join/${code}`, { waitUntil: 'networkidle' })
  push(await shot(player, 'p-join'))
  push(await shot(player, 'p-join', { w: 390, h: 844 }))

  // Create session (all seated by default on BE)
  const session = await api(masterToken, `/lobbies/${lobby.id}/sessions`, {
    method: 'POST',
    body: JSON.stringify({ name: 'LOBBY-FIX стол' }),
  })

  // Loading skeleton — navigate and screenshot quickly
  const loadP = master.goto(`${BASE}/sessions/${session.id}`, { waitUntil: 'domcontentloaded' })
  await master.waitForTimeout(80)
  push(await shot(master, 'm-session-loading', { w: 390, h: 844 }))
  await loadP
  await master.waitForSelector('.session-table-chrome__back, .session-live-desk', { timeout: 30_000 })
  push(await shot(master, 'm-session-empty'))
  push(await shot(master, 'm-session-empty', { w: 390, h: 844 }))
  push(await shot(master, 'm-session-empty', { w: 390, h: 760 }))

  // UI: open custom NPC dialog with CR field (before combat)
  const moreSummary = master.locator('.session-toolbar-more summary').first()
  if (await moreSummary.count()) {
    await moreSummary.click({ force: true })
    await master.waitForTimeout(250)
    const enemiesBtn = master.getByRole('button', { name: '+ Враги' }).first()
    if (await enemiesBtn.count()) {
      await enemiesBtn.click({ force: true })
      await master.getByRole('dialog').waitFor({ timeout: 8000 })
      await master.getByRole('button', { name: 'Свой НПС' }).click({ force: true })
      await master.waitForTimeout(300)
      // hide portal overlay without destroying React tree / closing dialog
      await master.addStyleTag({ content: '.ui-menu__panel{display:none!important}' })
      await master.getByLabel('Показатель опасности').waitFor({ timeout: 5000 })
      push(await shot(master, 'm-custom-npc-cr'))
      push(await shot(master, 'm-custom-npc-cr', { w: 390, h: 844 }))
      await master.getByRole('button', { name: 'Отмена' }).click({ force: true }).catch(() => {})
      await master.waitForTimeout(300)
    }
  }

  // Custom NPC with CR via API (real combatants for XP)
  await api(masterToken, `/sessions/${session.id}/combatants`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Свой гоблин',
      hp_max: 7,
      ac: 15,
      cr: '1/4',
      count: 2,
      actions: [{ name_ru: 'Скимитар', text_ru: '+4, 1к6+2', attack_bonus: 4, damage_dice: '1к6+2' }],
    }),
  })

  // Start combat — PCs pending init; enemies rolled
  const detail = await api(masterToken, `/sessions/${session.id}`)
  const seatIds = (detail.seats || []).map((s) => s.character_id)
  const entries = [
    ...(detail.seats || []).map((s) => ({
      kind: 'pc',
      ref_id: s.character_id,
      name: s.character_name,
      initiative: null,
      initiative_pending: true,
      dex_mod: s.dex_mod ?? 0,
    })),
    ...(detail.combatants || [])
      .filter((e) => (e.alive_count ?? 1) > 0)
      .map((e) => ({
        kind: 'enemy',
        ref_id: e.id,
        name: e.name,
        initiative: 10 + (e.dex_mod ?? 0),
        initiative_pending: false,
        dex_mod: e.dex_mod ?? 0,
      })),
  ]
  if (!entries.length) throw new Error('no combat entries')
  await api(masterToken, `/sessions/${session.id}/combat/start`, {
    method: 'POST',
    body: JSON.stringify({ entries, waves: [] }),
  })

  await master.reload({ waitUntil: 'networkidle' })
  await master.waitForTimeout(800)
  push(await shot(master, 'm-combat-pending-init'))
  push(await shot(master, 'm-combat-pending-init', { w: 390, h: 844 }))

  // Roll remaining (two tracks in DOM — click the visible one)
  const rollRem = master.getByRole('button', { name: 'Бросить за оставшихся' })
  const n = await rollRem.count()
  let clicked = false
  for (let i = 0; i < n; i++) {
    const btn = rollRem.nth(i)
    if (await btn.isVisible()) {
      await btn.click()
      clicked = true
      break
    }
  }
  if (!clicked && n > 0) await rollRem.first().click({ force: true })
  await master.waitForTimeout(800)
  push(await shot(master, 'm-after-roll-remaining'))
  push(await shot(master, 'm-after-roll-remaining', { w: 390, h: 844 }))

  // Player combat view
  await player.goto(`${BASE}/sessions/${session.id}`, { waitUntil: 'networkidle' })
  push(await shot(player, 'p-combat-live'))
  push(await shot(player, 'p-combat-live', { w: 390, h: 844 }))

  // Damage form empty hint — open card damage if visible
  const amount = master.locator('input[aria-label="Количество"]').first()
  if (await amount.count()) {
    await amount.click()
    push(await shot(master, 'm-damage-empty'))
    push(await shot(master, 'm-damage-empty', { w: 390, h: 844 }))
    await amount.fill('4')
    await master.getByRole('button', { name: 'Урон' }).first().click()
    await master.waitForTimeout(600)
  }

  // Reaction dialog for player if open
  async function dismissOpenDialogs(page) {
    for (let i = 0; i < 4; i++) {
      const dlg = page.locator('[role="dialog"], .ui-dialog').last()
      if (!(await dlg.count()) || !(await dlg.isVisible().catch(() => false))) break
      const noReaction = page.getByRole('button', { name: 'Нет реакции' })
      const cancel = page.getByRole('button', { name: /Отмена|Закрыть/ })
      if (await noReaction.count()) {
        await noReaction.first().click({ force: true })
      } else if (await cancel.count()) {
        await cancel.first().click({ force: true })
      } else {
        await page.keyboard.press('Escape')
      }
      await page.waitForTimeout(350)
    }
    await page.locator('.ui-dialog-backdrop').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {})
  }

  if (await player.getByRole('dialog', { name: /реакц/i }).count()) {
    push(await shot(player, 'p-reaction'))
    push(await shot(player, 'p-reaction', { w: 390, h: 844 }))
    await player.getByRole('button', { name: 'Нет реакции' }).click()
    await player.waitForTimeout(400)
  } else if (await master.getByRole('button', { name: 'Нет реакции' }).count()) {
    push(await shot(master, 'm-waiting-reaction'))
    push(await shot(master, 'm-waiting-reaction', { w: 390, h: 844 }))
    await master.getByRole('button', { name: 'Нет реакции' }).first().click()
    await master.waitForTimeout(400)
  }
  await dismissOpenDialogs(master)
  await dismissOpenDialogs(player)

  // Defeat all enemies so XP pool fills from CR (HP≤0 → claimable)
  const live = await api(masterToken, `/sessions/${session.id}`)
  for (const e of live.combatants || []) {
    const members = e.members || []
    if (members.length > 0) {
      await api(masterToken, `/sessions/${session.id}/combatants/${e.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          member_damages: members.map((m) => ({
            member_id: m.id,
            damage: 9999,
          })),
          outcome: 'killed',
        }),
      })
    } else {
      await api(masterToken, `/sessions/${session.id}/combatants/${e.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ damage: 9999, outcome: 'killed', hp_current: 0 }),
      })
    }
  }
  await dismissOpenDialogs(master)

  // End combat → rewards with XP pool
  const endBtn = master.getByRole('button', { name: 'Завершить бой' }).first()
  if (await endBtn.count()) {
    await endBtn.click({ force: true })
    await master.waitForTimeout(500)
    const confirm = master.getByRole('button', { name: /Завершить|Подтвердить|Да/ }).last()
    if (await confirm.count() && (await confirm.isVisible().catch(() => false))) {
      await confirm.click({ force: true })
    }
    await master.waitForTimeout(900)
  }

  // Ensure rewards dialog is open
  const rewardsOpen = master.getByRole('dialog').filter({ hasText: /Наград|опыт|Опыт/i })
  if (!(await rewardsOpen.count()) || !(await rewardsOpen.first().isVisible().catch(() => false))) {
    await master.getByRole('button', { name: 'Ещё' }).first().click().catch(() => {})
    await master.waitForTimeout(200)
    const rewardsBtn = master.getByRole('button', { name: /Награды/ }).first()
    if (await rewardsBtn.count()) await rewardsBtn.click()
    await master.waitForTimeout(500)
  }
  push(await shot(master, 'm-rewards-after-end'))
  push(await shot(master, 'm-rewards-after-end', { w: 390, h: 844 }))

  // Award XP while player page is live → toast
  const pending = await api(masterToken, `/sessions/${session.id}`)
  const pool = pending.combat?.pending_rewards?.xp_pool || 0
  await player.bringToFront()
  await player.setViewportSize({ width: 1440, height: 900 })
  if (pool > 0 && seatIds.length) {
    await api(masterToken, `/sessions/${session.id}/xp`, {
      method: 'POST',
      body: JSON.stringify({
        character_ids: seatIds,
        total_xp: pool,
        source: 'combat',
        clear_pending_rewards: true,
      }),
    })
    await player.waitForTimeout(800)
  } else if (seatIds.length) {
    // fallback so toast frame still shows something
    await api(masterToken, `/sessions/${session.id}/xp`, {
      method: 'POST',
      body: JSON.stringify({
        character_ids: seatIds,
        total_xp: 100,
        source: 'combat',
        clear_pending_rewards: true,
      }),
    })
    await player.waitForTimeout(800)
  }
  push(await shot(player, 'p-after-xp'))
  push(await shot(player, 'p-after-xp', { w: 390, h: 844 }))

  // Deduplicate md5 names
  const byHash = new Map()
  const unique = []
  for (const f of frames) {
    if (byHash.has(f.md5)) {
      f.duplicateOf = byHash.get(f.md5)
    } else {
      byHash.set(f.md5, f.file)
      unique.push(f)
    }
  }

  const manifest = {
    generated: new Date().toISOString(),
    count: frames.length,
    uniqueMd5: byHash.size,
    frames,
  }
  writeFileSync(`${ART}/manifest.json`, JSON.stringify(manifest, null, 2))
  writeFileSync(`${DOCS}/manifest.json`, JSON.stringify(manifest, null, 2))
  console.log(JSON.stringify({ count: frames.length, uniqueMd5: byHash.size, pool }, null, 2))

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
