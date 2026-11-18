/**
 * P24-M04 live API + product desk frames (sheet / lobby join / session).
 * Requires API on P24_E2E_API (default http://127.0.0.1:8000). Soft-skip removed —
 * unreachable API fails the suite (not counted green).
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const API = process.env.P24_E2E_API || 'http://127.0.0.1:8000'
const ARTIFACTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../artifacts/p24-m04',
)
const PAYLOAD_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'support/m04-fighter-2024-payload.json',
)

async function requireApi(page: Page): Promise<void> {
  if (process.env.P24_E2E_SKIP_LIVE === '1') {
    test.skip(true, 'P24_E2E_SKIP_LIVE=1')
    return
  }
  let ok = false
  try {
    const res = await page.request.get(`${API}/health`)
    ok = res.ok()
  } catch {
    ok = false
  }
  expect(ok, `API must be up at ${API}/health for P24-M04 live`).toBeTruthy()
}

async function registerAndLogin(
  request: APIRequestContext,
  page: Page,
  label: string,
): Promise<string> {
  const email = `m04-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
  const password = 'TestPass123!'
  const reg = await request.post(`${API}/auth/register`, {
    data: { email, password, display_name: `M04 ${label}` },
  })
  expect(reg.ok(), await reg.text()).toBeTruthy()
  const regBody = await reg.json()
  const token = new URL(String(regBody.debug_verify_url || '')).searchParams.get('token')
  expect(token).toBeTruthy()
  const verified = await request.post(`${API}/auth/verify-email`, {
    data: { token },
  })
  expect(verified.ok(), await verified.text()).toBeTruthy()
  const tokens = await verified.json()
  await page.addInitScript(
    ([access, refresh]) => {
      localStorage.setItem('dvarf.access_token', access)
      localStorage.setItem('dvarf.refresh_token', refresh)
    },
    [tokens.access_token as string, tokens.refresh_token as string],
  )
  return tokens.access_token as string
}

function auth(access: string) {
  return { Authorization: `Bearer ${access}` }
}

async function createFighter2024(
  request: APIRequestContext,
  access: string,
  name: string,
): Promise<{ id: string; name: string; sheet_version: number; sheet: Record<string, unknown> }> {
  const base = JSON.parse(fs.readFileSync(PAYLOAD_PATH, 'utf8')) as Record<string, unknown>
  const res = await request.post(`${API}/characters/create-2024`, {
    headers: auth(access),
    data: { ...base, name, is_preview: true },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  const body = await res.json()
  expect(body.rules_edition).toBe('2024')
  return {
    id: body.id as string,
    name: body.name as string,
    sheet_version: body.sheet_version as number,
    sheet: body.sheet as Record<string, unknown>,
  }
}

/**
 * Equip held greatsword (pack starting weapon) + grant heroic inspiration.
 * Mastery known must already include greatsword from create payload.
 */
async function equipHeldGreatswordAndInspiration(
  request: APIRequestContext,
  access: string,
  character: {
    id: string
    sheet_version: number
    sheet: Record<string, unknown>
  },
): Promise<void> {
  const sheet = structuredClone(character.sheet) as Record<string, unknown>
  const inventory = (sheet.inventory as { items?: Array<Record<string, unknown>> }) || {
    items: [],
  }
  const items = inventory.items || []
  const gs = items.find((it) => it.slug === 'greatsword')
  expect(gs, 'fighter pack must include greatsword').toBeTruthy()
  // draft sync mirrors inventory.equipped → attack.held
  if (gs) {
    gs.held = true
    gs.equipped = true
  }

  sheet.weapons = [
    {
      id: 'w-gs',
      name: 'Двуручный меч',
      catalog_id: 'greatsword',
      held: true,
      ability: 'str',
      is_proficient: true,
      damage: '2к6',
      damage_type: 'рубящий',
      inventory_item_id: gs?.id || 'start-greatsword-1',
      source_kind: 'weapon',
    },
  ]
  sheet.inventory = { ...inventory, items }
  const combat = { ...((sheet.combat as Record<string, unknown>) || {}), inspiration: true }
  sheet.combat = combat

  const patch = await request.patch(`${API}/characters/${character.id}`, {
    headers: auth(access),
    data: { sheet, sheet_version: character.sheet_version },
  })
  expect(patch.ok(), await patch.text()).toBeTruthy()
  const updated = await patch.json()
  const invGs = (updated.sheet?.inventory?.items || []).find(
    (it: { slug?: string }) => it.slug === 'greatsword',
  )
  expect(invGs?.equipped, 'greatsword must be equipped for held sync').toBe(true)
  expect(updated.sheet?.combat?.inspiration).toBe(true)
  const known = updated.sheet?.weapon_mastery?.known || []
  expect(known).toContain('greatsword')
}

async function shot(page: Page, name: string, project: string) {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  const file = path.join(ARTIFACTS, `${name}-${project}.png`)
  await page.screenshot({ path: file, fullPage: true })
}

/** Onboarding tour overlays block Playwright clicks on desk/session. */
async function dismissTour(page: Page) {
  const skip = page.getByRole('button', { name: /Пропустить/i })
  for (let i = 0; i < 6; i += 1) {
    if (!(await skip.isVisible().catch(() => false))) break
    await skip.click().catch(() => null)
    await page.waitForTimeout(200)
  }
}

async function expandMobileHeader(page: Page) {
  const expandHeader = page.getByRole('button', { name: /Развернуть шапку/i })
  if (await expandHeader.isVisible().catch(() => false)) {
    await expandHeader.click()
    await page.waitForTimeout(300)
  }
}

test.describe('P24-M04 live lobby/session/desk', () => {
  test.setTimeout(300_000)

  test('join mismatch + session edition + live desk frames', async ({
    page,
    request,
  }, testInfo) => {
    await requireApi(page)
    const project = testInfo.project.name
    fs.mkdirSync(ARTIFACTS, { recursive: true })

    const ownerAccess = await registerAndLogin(request, page, 'owner')

    const closed = await request.post(`${API}/lobbies`, {
      headers: auth(ownerAccess),
      data: { name: 'm04-closed', rules_edition: '2024' },
    })
    expect(closed.status()).toBe(400)

    const lobbyRes = await request.post(`${API}/lobbies`, {
      headers: auth(ownerAccess),
      data: { name: 'm04-desk-2024', rules_edition: '2024', is_preview: true },
    })
    expect(lobbyRes.ok(), await lobbyRes.text()).toBeTruthy()
    const lobby = await lobbyRes.json()
    expect(lobby.rules_edition).toBe('2024')
    const inviteCode = String(lobby.invite_code)

    const ch2014 = await request.post(`${API}/characters`, {
      headers: auth(ownerAccess),
      data: { name: 'Old Hero', rules_edition: '2014' },
    })
    expect(ch2014.ok(), await ch2014.text()).toBeTruthy()
    const char2014 = await ch2014.json()

    const joinBad = await request.post(`${API}/lobbies/join`, {
      headers: auth(ownerAccess),
      data: { code: inviteCode, character_id: char2014.id },
    })
    expect(joinBad.status()).toBe(400)
    const joinBody = await joinBad.json()
    const code = joinBody.code || joinBody.detail?.code
    expect(code).toBe('lobby_rules_edition_mismatch')

    await page.goto(`/join?code=${inviteCode}`)
    await expect(page.getByTestId('join-edition-empty')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('join-edition-empty')).toContainText(/запрещ/i)
    await shot(page, 'live-join-mismatch', project)

    const alice = await createFighter2024(request, ownerAccess, 'Алиса-стол')
    await equipHeldGreatswordAndInspiration(request, ownerAccess, alice)

    const joinOk = await request.post(`${API}/lobbies/join`, {
      headers: auth(ownerAccess),
      data: { code: inviteCode, character_id: alice.id },
    })
    expect(joinOk.ok(), await joinOk.text()).toBeTruthy()

    const allyEmail = `m04-ally-${Date.now()}@example.com`
    const allyReg = await request.post(`${API}/auth/register`, {
      data: { email: allyEmail, password: 'TestPass123!', display_name: 'Ally' },
    })
    expect(allyReg.ok()).toBeTruthy()
    const allyRegBody = await allyReg.json()
    const allyToken = new URL(String(allyRegBody.debug_verify_url || '')).searchParams.get(
      'token',
    )
    const allyVerified = await request.post(`${API}/auth/verify-email`, {
      data: { token: allyToken },
    })
    expect(allyVerified.ok()).toBeTruthy()
    const allyAccess = (await allyVerified.json()).access_token as string
    const boris = await createFighter2024(request, allyAccess, 'Борис-союзник')
    const allyJoin = await request.post(`${API}/lobbies/join`, {
      headers: auth(allyAccess),
      data: { code: inviteCode, character_id: boris.id },
    })
    expect(allyJoin.ok(), await allyJoin.text()).toBeTruthy()

    const sessRes = await request.post(`${API}/lobbies/${lobby.id}/sessions`, {
      headers: auth(ownerAccess),
      data: { title: 'M04 live desk', character_ids: [alice.id, boris.id] },
    })
    expect(sessRes.ok(), await sessRes.text()).toBeTruthy()
    const session = await sessRes.json()
    expect(session.rules_edition).toBe('2024')
    expect(session.seats?.length).toBeGreaterThanOrEqual(2)

    await page.goto(`/sessions/${session.id}`)
    await expect(page.getByText(/Алиса-стол|Борис/i).first()).toBeVisible({
      timeout: 25_000,
    })
    await dismissTour(page)
    await shot(page, 'live-session-edition', project)

    // Live bestiary / add combatant (edition from session)
    await page.locator('summary, .session-toolbar-more__summary, [data-onboarding="lobby-more"]').filter({ hasText: 'Ещё' }).first().click({ timeout: 8_000 })
    await page.getByText('+ Враги', { exact: true }).click({ timeout: 8_000 })
    await expect(page.getByTestId('add-combatant-edition')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('add-combatant-edition')).toContainText('2024')
    await expect(page.getByRole('button', { name: 'Бестиарий' })).toBeVisible()
    await shot(page, 'live-bestiary-add-2024', project)
    await page.getByRole('button', { name: 'Отмена' }).click()

    // Surprise 2024 on StartCombat
    await page.getByRole('button', { name: /^Бой$/i }).first().click()
    await expect(page.getByRole('button', { name: 'Начать бой' })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/помеха к инициативе/i).first()).toBeVisible({
      timeout: 10_000,
    })
    await shot(page, 'live-surprise-start-2024', project)
    await page.getByRole('button', { name: 'Отмена' }).click()

    // Live character desk
    await page.goto(`/characters/${alice.id}`)
    await expect(page.getByText('Алиса-стол').first()).toBeVisible({ timeout: 30_000 })
    await dismissTour(page)
    await expandMobileHeader(page)

    // Rest 2024
    await page.getByRole('button', { name: /Отдых/i }).first().click({ timeout: 15_000 })
    await expect(page.getByTestId('rest-2024-hint')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('rest-2024-hint')).toContainText(/все кости|16/i)
    await shot(page, 'live-rest-2024', project)
    await page.getByRole('button', { name: /Отмена|Закрыть/i }).first().click().catch(() => null)

    await page.waitForTimeout(1200)
    await expandMobileHeader(page)

    // Heroic transfer (second grant)
    const inspChip = page
      .locator('button.play-desk-header__chip, button.mobile-vitals__chip')
      .filter({ hasText: /Г\.вдохн|Вдохн|героич/i })
      .first()
    const inspFallback = page.getByRole('button', { name: /Г\.вдохн|Вдохнов|героич/i }).first()
    const insp = (await inspChip.isVisible().catch(() => false)) ? inspChip : inspFallback
    await expect(insp).toBeVisible({ timeout: 10_000 })
    // Already has inspiration from patch — second grant opens transfer
    await insp.click()
    await expect(page.getByTestId('heroic-inspiration-transfer')).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.getByTestId('heroic-transfer-ally').locator('option', { hasText: /Борис/i }),
    ).toHaveCount(1, { timeout: 10_000 })
    await shot(page, 'live-heroic-transfer', project)
    await page.getByRole('button', { name: 'Отмена' }).click().catch(() => null)

    // Heroic reroll chip after a live skill roll (inspiration still held)
    const athletics = page.getByRole('button', { name: /Атлетика/i }).first()
    await expect(athletics).toBeVisible({ timeout: 10_000 })
    await athletics.click()
    await expect(page.getByTestId('heroic-inspiration-reroll-chip')).toBeVisible({
      timeout: 10_000,
    })
    await shot(page, 'live-heroic-reroll', project)
    // Spend → posts feed line; keep dialog evidence first
    await page.getByRole('button', { name: 'Перебросить' }).click()
    await page.waitForTimeout(500)

    // Mastery panel — must be visible (no else-shot). Greatsword = Graze → needs miss.
    const combatTab = page.getByRole('button', { name: /^Бой$/i }).first()
    if (await combatTab.isVisible().catch(() => false)) {
      await combatTab.click({ timeout: 5_000 }).catch(() => null)
    }
    const mastery = page.getByTestId('weapon-mastery-attack')
    await expect(mastery, 'held greatsword + known mastery must mount panel').toBeVisible({
      timeout: 15_000,
    })
    await mastery.scrollIntoViewIfNeeded()
    await expect(page.getByTestId('weapon-mastery-apply')).toBeVisible()
    await page.getByTestId('weapon-mastery-outcome-miss').click()
    await page.getByTestId('weapon-mastery-apply').click()
    // Honest apply evidence — feed/toast line, not just weapon name on the sheet
    await expect(
      page.getByText(/Касание:|Мастерство · Касание|Касание:/i).first(),
    ).toBeVisible({ timeout: 10_000 })
    await shot(page, 'live-mastery-feed', project)

    // Session feed should carry mastery line from postSheetRollToSession
    await page.goto(`/sessions/${session.id}`)
    await dismissTour(page)
    await expect(page.getByRole('heading', { name: 'Живой стол' })).toBeVisible({
      timeout: 20_000,
    })
    // Phone: feed is behind «Лента» tab (nav hidden on desktop ≥1000px)
    const liveNav = page.getByRole('navigation', { name: 'Живой стол' })
    const feedTab = liveNav.getByRole('button', { name: 'Лента' })
    const onPhone = await feedTab.isVisible().catch(() => false)
    if (onPhone) {
      await feedTab.click()
      await expect(feedTab).toHaveAttribute('aria-current', 'page', { timeout: 10_000 })
      // Desk grid itself collapses (center hidden); feed is the sibling mobile panel
      await expect(page.locator('.session-live-mobile-panel')).toBeVisible({ timeout: 10_000 })
    } else {
      await expect(page.locator('.session-live-desk__rail')).toBeVisible({ timeout: 10_000 })
    }
    const feedRoot = onPhone
      ? page.locator('.session-live-mobile-panel')
      : page.locator('.session-live-desk__rail')
    const masteryFeed = feedRoot
      .locator('.session-event-feed__title')
      .filter({ hasText: /Мастерство · Касание/i })
      .first()
    await expect(masteryFeed).toBeVisible({ timeout: 20_000 })
    await masteryFeed.scrollIntoViewIfNeeded()
    await expect(
      feedRoot
        .locator('.session-event-feed__title')
        .filter({ hasText: /Героическое вдохновение · переброс/i })
        .first(),
    ).toBeVisible({ timeout: 10_000 })
    await shot(page, 'live-mastery-session-feed', project)
  })
})
