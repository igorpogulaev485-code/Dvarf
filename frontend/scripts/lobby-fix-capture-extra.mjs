/**
 * Supplemental frames: custom NPC CR dialog + player reaction dialog.
 * Merges into existing lobbyfix manifest.
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
  if (!body.access_token) throw new Error(`login ${email}`)
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

async function closePortals(page) {
  await page.evaluate(() => {
    document.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'))
    document.querySelectorAll('.ui-menu__panel').forEach((el) => el.remove())
  })
  await page.waitForTimeout(150)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const masterCtx = await browser.newContext()
  const playerCtx = await browser.newContext()
  const master = await masterCtx.newPage()
  const player = await playerCtx.newPage()
  const frames = []

  const masterToken = await login(master, 'uikit03@example.com', 'uikit03-dev')
  const playerToken = await login(player, 'player02@example.com', 'player02-dev')

  for (const L of (await api(masterToken, '/lobbies')) || []) {
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

  const lobby = await api(masterToken, '/lobbies', {
    method: 'POST',
    body: JSON.stringify({ name: `LOBBY-FIX extra ${Date.now().toString(36)}` }),
  })
  const code = lobby.invite_code || (await api(masterToken, `/lobbies/${lobby.id}`)).invite_code
  const chars = await api(playerToken, '/characters')
  const charId = chars[0]?.id
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
  } catch {
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

  const session = await api(masterToken, `/lobbies/${lobby.id}/sessions`, {
    method: 'POST',
    body: JSON.stringify({ name: 'LOBBY-FIX extra стол' }),
  })

  await master.goto(`${BASE}/sessions/${session.id}`, { waitUntil: 'networkidle' })
  await master.waitForSelector('.session-table-chrome__back, .session-live-desk', { timeout: 30_000 })

  // --- Custom NPC CR dialog ---
  const moreSummary = master.locator('.session-toolbar-more summary').first()
  await moreSummary.click({ force: true })
  await master.waitForTimeout(250)
  await master.getByRole('button', { name: '+ Враги' }).first().click({ force: true })
  await master.getByRole('dialog').waitFor({ timeout: 8000 })
  // close «Ещё» portal without Esc (Esc would close the dialog)
  await closePortals(master)
  await master.getByRole('button', { name: 'Свой НПС' }).click({ force: true })
  await master.waitForTimeout(400)
  await master.getByLabel('Показатель опасности').waitFor({ timeout: 5000 })
  frames.push(await shot(master, 'm-custom-npc-cr'))
  frames.push(await shot(master, 'm-custom-npc-cr', { w: 390, h: 844 }))
  await master.getByRole('button', { name: 'Отмена' }).click({ force: true })
  await master.waitForTimeout(300)

  // Combatants + start combat
  await api(masterToken, `/sessions/${session.id}/combatants`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Свой гоблин',
      hp_max: 7,
      ac: 15,
      cr: '1/4',
      count: 1,
      actions: [{ name_ru: 'Скимитар', text_ru: '+4', attack_bonus: 4, damage_dice: '1к6+2' }],
    }),
  })
  const detail = await api(masterToken, `/sessions/${session.id}`)
  const entries = [
    ...(detail.seats || []).map((s) => ({
      kind: 'pc',
      ref_id: s.character_id,
      name: s.character_name,
      initiative: 12,
      initiative_pending: false,
      dex_mod: s.dex_mod ?? 0,
    })),
    ...(detail.combatants || []).map((e) => ({
      kind: 'enemy',
      ref_id: e.id,
      name: e.name,
      initiative: 8,
      initiative_pending: false,
      dex_mod: e.dex_mod ?? 0,
    })),
  ]
  await api(masterToken, `/sessions/${session.id}/combat/start`, {
    method: 'POST',
    body: JSON.stringify({ entries, waves: [] }),
  })

  await player.goto(`${BASE}/sessions/${session.id}`, { waitUntil: 'networkidle' })
  await player.waitForTimeout(500)

  // Damage PC via seat combat patch → waiting_reaction + reaction_character_id
  const seat = (await api(masterToken, `/sessions/${session.id}`)).seats?.[0]
  if (!seat) throw new Error('no seat')
  await api(masterToken, `/sessions/${session.id}/seats/${seat.character_id}/combat`, {
    method: 'PATCH',
    body: JSON.stringify({ damage: 4, damage_type: 'slashing' }),
  })
  // Reload player so WS/state picks up reaction flag
  await player.reload({ waitUntil: 'networkidle' })
  await player.waitForTimeout(400)

  // Poll player for reaction dialog
  let got = false
  for (let i = 0; i < 20; i++) {
    await player.waitForTimeout(300)
    const dlg = player.getByRole('dialog', { name: /реакц/i })
    if ((await dlg.count()) && (await dlg.first().isVisible().catch(() => false))) {
      frames.push(await shot(player, 'p-reaction'))
      frames.push(await shot(player, 'p-reaction', { w: 390, h: 844 }))
      got = true
      break
    }
    // also check title text
    if (await player.getByText('Есть ли реакция?').count()) {
      frames.push(await shot(player, 'p-reaction'))
      frames.push(await shot(player, 'p-reaction', { w: 390, h: 844 }))
      got = true
      break
    }
  }
  if (!got) {
    // Force-check combat state
    const st = await api(masterToken, `/sessions/${session.id}`)
    console.warn('no reaction dialog', {
      waiting: st.combat?.waiting_reaction,
      reaction_character_id: st.combat?.reaction_character_id,
    })
  } else {
    await player.getByRole('button', { name: 'Нет реакции' }).click().catch(() => {})
  }

  // Merge into main manifest
  const manifestPath = `${ART}/manifest.json`
  let prev = { frames: [] }
  if (existsSync(manifestPath)) {
    prev = JSON.parse(readFileSync(manifestPath, 'utf8'))
  }
  const byFile = new Map((prev.frames || []).map((f) => [f.file, f]))
  for (const f of frames) byFile.set(f.file, f)
  // rehash all files on disk for uniqueness
  const allFrames = []
  const byHash = new Map()
  for (const [file] of [...byFile.entries()].sort()) {
    const p = `${ART}/${file}`
    if (!existsSync(p)) continue
    const h = md5(p)
    const entry = { file, md5: h }
    if (byHash.has(h)) entry.duplicateOf = byHash.get(h)
    else byHash.set(h, file)
    allFrames.push(entry)
    copyFileSync(p, `${DOCS}/${file}`)
  }
  const manifest = {
    generated: new Date().toISOString(),
    count: allFrames.length,
    uniqueMd5: byHash.size,
    frames: allFrames,
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  writeFileSync(`${DOCS}/manifest.json`, JSON.stringify(manifest, null, 2))
  console.log(JSON.stringify({ added: frames, uniqueMd5: byHash.size, count: allFrames.length }, null, 2))
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
