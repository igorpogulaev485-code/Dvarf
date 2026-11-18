/**
 * P24-M04 live API: 2024 lobby via is_preview, join mismatch, session rules_edition.
 * Skips when P24_E2E_SKIP_LIVE=1 or API unreachable.
 */
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const API = process.env.P24_E2E_API || 'http://127.0.0.1:8000'
const ARTIFACTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../artifacts/p24-m04',
)

async function apiUp(page: Page): Promise<boolean> {
  try {
    const res = await page.request.get(`${API}/health`)
    return res.ok()
  } catch {
    return false
  }
}

async function loginViaApi(page: Page): Promise<string> {
  const email = `m04-${Date.now()}@example.com`
  const password = 'TestPass123!'
  const reg = await page.request.post(`${API}/auth/register`, {
    data: { email, password, display_name: 'M04 Tester' },
  })
  expect(reg.ok()).toBeTruthy()
  const regBody = await reg.json()
  const token = new URL(String(regBody.debug_verify_url || '')).searchParams.get('token')
  expect(token).toBeTruthy()
  const verified = await page.request.post(`${API}/auth/verify-email`, {
    data: { token },
  })
  expect(verified.ok()).toBeTruthy()
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

test.describe('P24-M04 live lobby API', () => {
  test('create 2024 lobby preview + join mismatch + session edition', async ({
    page,
  }, testInfo) => {
    test.skip(process.env.P24_E2E_SKIP_LIVE === '1', 'live API skipped')
    if (!(await apiUp(page))) {
      test.skip(true, 'API not reachable')
    }
    fs.mkdirSync(ARTIFACTS, { recursive: true })
    const access = await loginViaApi(page)

    const closed = await page.request.post(`${API}/lobbies`, {
      headers: { Authorization: `Bearer ${access}` },
      data: { name: 'm04-closed', rules_edition: '2024' },
    })
    expect(closed.status()).toBe(400)
    const closedBody = await closed.json()
    expect(closedBody.code || closedBody.detail?.code).toBeTruthy()

    const lobbyRes = await page.request.post(`${API}/lobbies`, {
      headers: { Authorization: `Bearer ${access}` },
      data: { name: 'm04-desk-2024', rules_edition: '2024', is_preview: true },
    })
    expect(lobbyRes.ok()).toBeTruthy()
    const lobby = await lobbyRes.json()
    expect(lobby.rules_edition).toBe('2024')

    // Create 2014 character via ordinary create
    const ch2014 = await page.request.post(`${API}/characters`, {
      headers: { Authorization: `Bearer ${access}` },
      data: { name: 'Old Hero', rules_edition: '2014' },
    })
    expect(ch2014.ok()).toBeTruthy()
    const char2014 = await ch2014.json()

    const join = await page.request.post(`${API}/lobbies/join`, {
      headers: { Authorization: `Bearer ${access}` },
      data: { code: lobby.invite_code, character_id: char2014.id },
    })
    expect(join.status()).toBe(400)
    const joinBody = await join.json()
    const code = joinBody.code || joinBody.detail?.code
    expect(code).toBe('lobby_rules_edition_mismatch')

    const shot = path.join(
      ARTIFACTS,
      `live-join-mismatch-${testInfo.project.name}.png`,
    )
    await page.goto(`/join?code=${lobby.invite_code}`)
    await page.waitForTimeout(500)
    await page.screenshot({ path: shot, fullPage: true })
  })
})
