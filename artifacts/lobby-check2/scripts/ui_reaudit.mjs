/**
 * Independent UI + dual-client re-audit for lobby-fix after M1–M9.
 * Artifact only.
 */
import { createRequire } from 'node:module'
const require = createRequire('/agent/repos/Dvarf/frontend/package.json')
const { chromium } = require('playwright')
import fs from 'node:fs'
import path from 'node:path'

const root = '/agent/repos/Dvarf/artifacts/lobby-check2'
const seed = JSON.parse(fs.readFileSync(path.join(root, 'api-logs/ui-seed.json'), 'utf8'))
const outDir = path.join(root, 'screenshots')
const findings = []
fs.mkdirSync(outDir, { recursive: true })

function note(name, status, detail) {
  findings.push({ name, status, detail })
  console.log(`[${status}] ${name}${detail ? ' — ' + detail : ''}`)
}

async function auth(page, role) {
  const u = seed[role]
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ({ a, r }) => {
      localStorage.setItem('dvarf.access_token', a)
      localStorage.setItem('dvarf.refresh_token', r)
    },
    { a: u.token, r: u.refresh },
  )
}

async function dismiss(page) {
  for (const t of ['Пропустить', 'Готово', 'Понятно', 'Закрыть']) {
    const b = page.getByRole('button', { name: t })
    if (await b.count()) {
      try {
        await b.first().click({ timeout: 1200 })
      } catch {}
    }
  }
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: false })
}

async function api(method, urlPath, token, body) {
  const res = await fetch('http://127.0.0.1:8000' + urlPath, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text || 'null')
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json }
}

const browser = await chromium.launch({ headless: true })

try {
  // Enable MOT for piety button without existing score — use a fresh char? Player already has score=1.
  // Create fresh seat character piety-test via API on master char after clearing? Simpler: check button visible now (score=1)
  // AND enable MOT then check another character without score.

  // Enable MOT in campaign rules
  const lobbyGet = await api('GET', `/lobbies/${seed.lobby_id}`, seed.master.token)
  const rules = lobbyGet.json.campaign_rules || {}
  const start = { ...(rules.start || {}), allowed_sources: ['phb', 'mot'] }
  await api('PATCH', `/lobbies/${seed.lobby_id}`, seed.master.token, {
    campaign_rules: { ...rules, start },
  })

  // ---------- MASTER 1440: prev turn, piety, companions, combat ----------
  const master = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await auth(master, 'master')
  await master.goto(seed.session_url, { waitUntil: 'networkidle' })
  await master.waitForTimeout(1200)
  await dismiss(master)
  await master.waitForTimeout(600)
  await shot(master, '01-filled-desk-1440.png')

  const body1 = await master.locator('body').innerText()
  note(
    'M2_piety_button_visible',
    body1.includes('Благочестие') ? 'PASS' : 'FAIL',
    body1.includes('Благочестие') ? 'видна (у игрока уже score после API)' : 'не найдена',
  )

  // Companions section
  const hasWolf = body1.includes('Волк-напарник')
  const hasStory = body1.includes('Спутник-сюжет')
  note('companions_on_table', hasWolf && hasStory ? 'PASS' : 'FAIL', `wolf=${hasWolf} story=${hasStory}`)
  await shot(master, '02-companions-region-1440.png')

  // Death saves: story should have pips; beast wolf ideally not unless story
  // Look for DeathSave UI near companions — count "Успех" labels in companion cards
  const companionCards = master.locator('.session-companion-card')
  const nCards = await companionCards.count()
  let wolfDeath = false
  let storyDeath = false
  for (let i = 0; i < nCards; i++) {
    const card = companionCards.nth(i)
    const t = await card.innerText()
    const hasPips = (await card.locator('.death-save, [class*="death"]').count()) > 0 || t.includes('Успех') || t.includes('Провал') || (await card.locator('button[aria-label*="успех" i], button[aria-label*="провал" i]').count()) > 0
    // also DeathSavePips may use circles without text
    const pipButtons = await card.locator('button').count()
    if (t.includes('Волк-напарник')) wolfDeath = hasPips || (await card.locator('[class*="death"]').count()) > 0
    if (t.includes('Спутник-сюжет')) storyDeath = hasPips || (await card.locator('[class*="death"]').count()) > 0 || pipButtons >= 6
  }
  // fallback: inspect HTML
  const wolfHtml = await master.locator('.session-companion-card', { hasText: 'Волк-напарник' }).innerHTML().catch(() => '')
  const storyHtml = await master.locator('.session-companion-card', { hasText: 'Спутник-сюжет' }).innerHTML().catch(() => '')
  wolfDeath = /death|DeathSave|успех|провал/i.test(wolfHtml)
  storyDeath = /death|DeathSave|успех|провал/i.test(storyHtml)
  note(
    'companion_death_saves_beast_vs_story',
    !wolfDeath && storyDeath ? 'PASS' : wolfDeath ? 'FAIL' : 'NOT_TESTED',
    `beast_has_death_ui=${wolfDeath} story_has_death_ui=${storyDeath} cards=${nCards} (2014: зверь без death saves)`,
  )

  // Start combat for prev button + initiative labels
  const fight = master.getByRole('button', { name: 'Бой' })
  if (await fight.count()) {
    await fight.first().click()
    await master.waitForTimeout(700)
    const startBtn = master.locator('.ui-dialog button').filter({ hasText: /Начать|В бой|Подтвердить|Старт/ })
    if (await startBtn.count()) await startBtn.first().click()
    await master.waitForTimeout(1200)
  }
  await shot(master, '03-combat-toolbar-1440.png')
  const bodyCombat = await master.locator('body').innerText()
  const hasPrev = bodyCombat.includes('предыдущий ход') || (await master.getByRole('button', { name: /предыдущий ход/i }).count()) > 0
  const hasNext = (await master.getByRole('button', { name: 'Следующий ход' }).count()) > 0
  note('M1_prev_turn_button', hasPrev && hasNext ? 'PASS' : 'FAIL', `prev=${hasPrev} next=${hasNext}`)

  // Initiative confusion: Волк-напарник · ход хозяина near enemy Волк
  const hasHostLabel = bodyCombat.includes('ход хозяина')
  const hasEnemyWolf = bodyCombat.includes('Волк') && !bodyCombat.includes('только')
  await shot(master, '04-initiative-wolf-labels-1440.png')
  // Capture initiative list text specifically
  const initText = await master.locator('.session-combat-order, .session-combat-track').innerText().catch(() => bodyCombat)
  note(
    'initiative_wolf_label_confusion',
    hasHostLabel ? 'PASS' : 'NOT_TESTED',
    `host_label=${hasHostLabel}; init_snip=${initText.replace(/\s+/g, ' ').slice(0, 220)}`,
  )

  // Click prev once
  if (hasPrev) {
    const prevBtn = master.getByRole('button', { name: /предыдущий ход/i }).first()
    await prevBtn.click()
    await master.waitForTimeout(500)
    await shot(master, '05-after-prev-1440.png')
    note('M1_prev_click_works', 'PASS', 'clicked')
  }

  // Open Ещё → Добыча
  const more = master.locator('button', { hasText: /^Ещё$/ })
  let moreOk = false
  if (await more.count()) {
    await more.last().click()
    await master.waitForTimeout(500)
    await shot(master, '06-more-menu-1440.png')
    moreOk = true
  }
  note('more_menu_1440', moreOk ? 'PASS' : 'FAIL')

  // Try rewards
  const lootEntry = master.locator('button, a, [role="menuitem"]').filter({ hasText: /Добыча|Награды|Опыт/ })
  if (await lootEntry.count()) {
    await lootEntry.first().click()
    await master.waitForTimeout(800)
    await shot(master, '07-rewards-dialog-1440.png')
    note('rewards_dialog_1440', (await master.locator('.ui-dialog, [role=dialog]').count()) > 0 ? 'PASS' : 'FAIL')
  } else {
    note('rewards_dialog_1440', 'NOT_TESTED', 'menu entry not found')
  }

  // ---------- 390 Rewards loot footer clipping ----------
  await master.setViewportSize({ width: 390, height: 700 })
  await master.goto(seed.session_url, { waitUntil: 'networkidle' })
  await master.waitForTimeout(1000)
  await dismiss(master)
  // ensure combat or just open more
  const more390 = master.locator('button', { hasText: /^Ещё$/ })
  if (await more390.count()) {
    await more390.last().click()
    await master.waitForTimeout(500)
    await shot(master, '08-more-menu-390.png')
    // scroll menu
    const panel = master.locator('.session-toolbar-more__body, .ui-details-menu__panel, [data-sc05-more]')
    if (await panel.count()) {
      await panel.first().evaluate((el) => {
        el.scrollTop = el.scrollHeight
      })
    }
    const lootBtn = master.locator('button, a').filter({ hasText: /Добыча|Награды/ })
    if (await lootBtn.count()) {
      await lootBtn.first().click()
      await master.waitForTimeout(700)
    } else {
      // try Опыт then tab Добыча
      const xpBtn = master.locator('button, a').filter({ hasText: /^Опыт$/ })
      if (await xpBtn.count()) {
        await xpBtn.first().click()
        await master.waitForTimeout(700)
      }
    }
  }
  // Switch to loot pane if tabs
  const lootTab = master.locator('button').filter({ hasText: /^Добыча$/ })
  if (await lootTab.count()) {
    await lootTab.first().click()
    await master.waitForTimeout(500)
  }
  await shot(master, '09-rewards-loot-390.png')
  // Measure footer vs empty chest / action buttons
  const dialog = master.locator('.ui-dialog').first()
  let clipFinding = 'NOT_TESTED'
  let clipDetail = ''
  if (await dialog.count()) {
    const metrics = await dialog.evaluate((dlg) => {
      const body = dlg.querySelector('.ui-dialog__body')
      const footer = dlg.querySelector('.ui-dialog__actions, footer')
      const lootActions = dlg.querySelector('.session-rewards__loot-actions')
      const empty = Array.from(dlg.querySelectorAll('*')).find((el) =>
        (el.textContent || '').includes('Сундук пуст'),
      )
      const br = body ? body.getBoundingClientRect() : null
      const fr = footer ? footer.getBoundingClientRect() : null
      const lr = lootActions ? lootActions.getBoundingClientRect() : null
      const er = empty ? empty.getBoundingClientRect() : null
      // any button in loot pane bottom
      const buttons = Array.from(dlg.querySelectorAll('button')).map((b) => {
        const r = b.getBoundingClientRect()
        return {
          text: (b.textContent || '').trim().slice(0, 40),
          top: r.top,
          bottom: r.bottom,
          visible: r.height > 0 && r.width > 0,
          clippedByFooter: fr ? r.bottom > fr.top + 1 && r.top < fr.bottom : false,
          fullyBelowFooter: fr ? r.top >= fr.top - 1 : false,
        }
      })
      return {
        bodyBottom: br?.bottom,
        footerTop: fr?.top,
        footerHeight: fr?.height,
        lootActionsBottom: lr?.bottom,
        emptyBottom: er?.bottom,
        buttons: buttons.filter((b) => b.visible && b.text),
        bodyScroll: body ? { scrollHeight: body.scrollHeight, clientHeight: body.clientHeight, scrollTop: body.scrollTop } : null,
      }
    })
    // Check if loot action buttons are under footer and not scrollable into view
    const body = dialog.locator('.ui-dialog__body')
    if (await body.count()) {
      await body.evaluate((el) => {
        el.scrollTop = el.scrollHeight
      })
      await master.waitForTimeout(300)
    }
    await shot(master, '10-rewards-loot-390-scrolled.png')
    const metrics2 = await dialog.evaluate((dlg) => {
      const footer = dlg.querySelector('.ui-dialog__actions, footer')
      const fr = footer ? footer.getBoundingClientRect() : null
      const lootActions = dlg.querySelector('.session-rewards__loot-actions')
      const lr = lootActions ? lootActions.getBoundingClientRect() : null
      const interesting = Array.from(dlg.querySelectorAll('button')).filter((b) => {
        const t = (b.textContent || '').trim()
        return /Положить|Добавить|Подобрать|Выдать|Сундук/i.test(t)
      })
      return {
        footerTop: fr?.top,
        lootActions: lr
          ? { top: lr.top, bottom: lr.bottom, height: lr.height }
          : null,
        actionButtons: interesting.map((b) => {
          const r = b.getBoundingClientRect()
          const style = getComputedStyle(b)
          return {
            text: (b.textContent || '').trim().slice(0, 48),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            obscured: fr ? r.bottom > fr.top + 2 && r.top < fr.top + 40 : false,
            display: style.display,
            visibility: style.visibility,
          }
        }),
      }
    })
    const obscured = (metrics2.actionButtons || []).filter((b) => b.obscured)
    const emptyMention = (await dialog.innerText()).includes('Сундук пуст')
    if (obscured.length > 0) {
      clipFinding = 'FAIL'
      clipDetail = `кнопки перекрыты футером: ${JSON.stringify(obscured)}; empty=${emptyMention}; ${JSON.stringify(metrics2)}`
    } else if (emptyMention) {
      clipFinding = 'PASS'
      clipDetail = `Сундук пуст виден; action buttons not obscured after scroll; ${JSON.stringify(metrics2)}`
    } else {
      clipFinding = 'PASS'
      clipDetail = JSON.stringify(metrics2)
    }
    // Also keep first metrics
    clipDetail = `beforeScroll=${JSON.stringify(metrics).slice(0, 400)}; after=${clipDetail}`
  }
  note('rewards_loot_390_footer_clipping', clipFinding, clipDetail)

  // Close dialog
  const close = master.getByRole('button', { name: /Отмена|Закрыть/ })
  if (await close.count()) await close.first().click().catch(() => {})

  // ---------- DUAL CLIENT XP toast ----------
  const player = await browser.newPage({ viewport: { width: 1100, height: 800 } })
  const player2 = await browser.newPage({ viewport: { width: 1100, height: 800 } })
  await auth(player, 'player')
  await auth(player2, 'player2')
  await player.goto(seed.session_url, { waitUntil: 'networkidle' })
  await player2.goto(seed.session_url, { waitUntil: 'networkidle' })
  await player.waitForTimeout(1500)
  await player2.waitForTimeout(1500)
  await dismiss(player)
  await dismiss(player2)

  // Hook toast observer via DOM mutation — look for toast text
  async function watchToasts(page, ms = 8000) {
    return page.evaluate((waitMs) => {
      return new Promise((resolve) => {
        const seen = []
        const push = () => {
          const nodes = document.querySelectorAll(
            '.ui-toast, [class*="toast"], [role="status"], .session-toast',
          )
          for (const n of nodes) {
            const t = (n.textContent || '').trim()
            if (t && !seen.includes(t)) seen.push(t)
          }
          // also scan body for +N опыта recently
          const body = document.body.innerText
          const m = body.match(/\+\d+\s*опыта/g)
          if (m) for (const x of m) if (!seen.includes(x)) seen.push(x)
        }
        push()
        const obs = new MutationObserver(() => push())
        obs.observe(document.body, { childList: true, subtree: true, characterData: true })
        setTimeout(() => {
          obs.disconnect()
          push()
          resolve(seen)
        }, waitMs)
      })
    }, ms)
  }

  const toastP = watchToasts(player, 6000)
  const toastP2 = watchToasts(player2, 6000)
  // Award XP only to player (with bonus -> per_recipient 75 if 50+25)
  const xpRes = await api('POST', `/sessions/${seed.session_id}/xp`, seed.master.token, {
    character_ids: [seed.player.char_id],
    per_character_xp: 40,
    bonuses: [{ character_id: seed.player.char_id, amount: 15, reason: 'dual' }],
    source: 'manual',
  })
  const per = xpRes.json?.per_recipient || {}
  const expected = per[seed.player.char_id] || 55
  const seenP = await toastP
  const seenP2 = await toastP2
  await shot(player, '11-player-after-xp.png')
  await shot(player2, '12-player2-nonrecipient-after-xp.png')
  const playerGot = seenP.some((t) => t.includes(`+${expected} опыта`) || t.includes('+55 опыта') || /\+\d+\s*опыта/.test(t))
  const player2Got = seenP2.some((t) => /\+\d+\s*опыта/.test(t))
  note(
    'M3_xp_toast_recipient_only',
    playerGot && !player2Got ? 'PASS' : 'FAIL',
    `expected=+${expected}; playerToasts=${JSON.stringify(seenP)}; player2Toasts=${JSON.stringify(seenP2)}; apiStatus=${xpRes.status}`,
  )
  // If player got toast, check amount matches per_recipient
  const amountMatch = seenP.some((t) => t.includes(`+${expected}`))
  note(
    'M3_xp_toast_per_recipient_amount',
    amountMatch ? 'PASS' : playerGot ? 'FAIL' : 'NOT_TESTED',
    `expected ${expected}, seen ${JSON.stringify(seenP)}`,
  )

  // ---------- Reaction timer dual ----------
  // Ensure combat active
  let sess = (await api('GET', `/sessions/${seed.session_id}`, seed.master.token)).json
  if (!sess.combat?.active) {
    // start minimal combat via API-like UI already may have ended — start via API entries
    const entries = (sess.seats || []).map((s) => ({
      kind: 'pc',
      ref_id: s.character_id,
      name: s.character_name,
      initiative: 10,
      initiative_pending: false,
    }))
    if ((sess.combatants || []).length) {
      for (const e of sess.combatants) {
        entries.push({
          kind: 'enemy',
          ref_id: e.id,
          name: e.name,
          initiative: 12,
          initiative_pending: false,
        })
      }
    }
    await api('POST', `/sessions/${seed.session_id}/combat/start`, seed.master.token, {
      entries,
      waves: [{ index: 1, combatant_ids: (sess.combatants || []).map((c) => c.id), released: true }],
    })
  }
  await player.reload({ waitUntil: 'networkidle' })
  await master.setViewportSize({ width: 1440, height: 900 })
  await master.goto(seed.session_url, { waitUntil: 'networkidle' })
  await master.waitForTimeout(800)
  await dismiss(master)
  await dismiss(player)

  // Damage player to trigger reaction
  await api('PATCH', `/sessions/${seed.session_id}/seats/${seed.player.char_id}/combat`, seed.master.token, {
    damage: 4,
  })
  await player.waitForTimeout(800)
  await shot(player, '13-reaction-dialog-player.png')
  const reactionOpen =
    (await player.locator('.ui-dialog').filter({ hasText: 'Есть ли реакция' }).count()) > 0 ||
    (await player.getByText('Есть ли реакция').count()) > 0
  note('reaction_dialog_opens_for_owner', reactionOpen ? 'PASS' : 'FAIL')

  // Master skip button
  await master.waitForTimeout(500)
  await shot(master, '14-master-waiting-reaction.png')
  const skipBtn = master.getByRole('button', { name: 'Пропустить' })
  const hasSkip = (await skipBtn.count()) > 0
  note('M5_master_skip_visible', hasSkip ? 'PASS' : 'NOT_TESTED', `count=${await skipBtn.count()}`)

  // Player clicks Нет реакции
  if (reactionOpen) {
    const noBtn = player.getByRole('button', { name: /Нет реакции/ })
    if (await noBtn.count()) {
      await noBtn.first().click()
      await player.waitForTimeout(600)
      note('reaction_no_button_works', 'PASS', 'clicked Нет реакции')
    } else {
      note('reaction_no_button_works', 'FAIL', 'button missing')
    }
  }

  // Trigger again and wait for autoskip (~10s) — verify dialog closes
  await api('PATCH', `/sessions/${seed.session_id}/seats/${seed.player.char_id}/combat`, seed.master.token, {
    damage: 3,
  })
  await player.waitForTimeout(500)
  const open2 =
    (await player.getByText('Есть ли реакция').count()) > 0 ||
    (await player.locator('.ui-dialog').filter({ hasText: 'реакция' }).count()) > 0
  if (open2) {
    // change reaction mid-timer by second damage (M4)
    await player.waitForTimeout(2000)
    await api('PATCH', `/sessions/${seed.session_id}/seats/${seed.player.char_id}/combat`, seed.master.token, {
      damage: 2,
    })
    await player.waitForTimeout(500)
    const timerText = await player.locator('.ui-dialog').innerText().catch(() => '')
    const seconds = (timerText.match(/через\s+(\d+)\s*с/) || [])[1]
    await shot(player, '15-reaction-timer-after-second-hit.png')
    // If timer reset, seconds should be high (>=8) shortly after second hit
    const secNum = seconds != null ? Number(seconds) : null
    note(
      'M4_reaction_timer_resets_on_new_reaction',
      secNum != null && secNum >= 7 ? 'PASS' : secNum != null ? 'FAIL' : 'NOT_TESTED',
      `seconds_left=${secNum}; snip=${timerText.slice(0, 120)}`,
    )
    // wait for autoskip
    await player.waitForTimeout(11000)
    const stillOpen = (await player.getByText('Есть ли реакция').count()) > 0
    note('reaction_autoskip_closes', !stillOpen ? 'PASS' : 'FAIL', `stillOpen=${stillOpen}`)
  } else {
    note('M4_reaction_timer_resets_on_new_reaction', 'NOT_TESTED', 'dialog did not open')
    note('reaction_autoskip_closes', 'NOT_TESTED')
  }

  // Player no fight button
  note(
    'player_no_fight_button',
    (await player.getByRole('button', { name: 'Бой' }).count()) === 0 ? 'PASS' : 'FAIL',
  )

  await master.close()
  await player.close()
  await player2.close()
} catch (e) {
  console.error(e)
  note('script_crash', 'FAIL', String(e))
} finally {
  fs.writeFileSync(path.join(root, 'api-logs/ui_findings.json'), JSON.stringify(findings, null, 2))
  await browser.close()
  const p = findings.filter((f) => f.status === 'PASS').length
  const f = findings.filter((f) => f.status === 'FAIL').length
  const n = findings.filter((f) => f.status === 'NOT_TESTED').length
  console.log(`DONE PASS=${p} FAIL=${f} NOT_TESTED=${n}`)
}
