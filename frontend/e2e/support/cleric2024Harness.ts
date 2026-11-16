/**
 * Offline harness for P24-M02-cleric acceptance shots.
 *
 * Same stack as sorcerer2024Harness: catalog JSON, create2024_bridge.py, in-memory character store.
 * Cleric: prepared caster (Divine Order, Channel Divinity, domains, Divine Intervention).
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page, Route } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(here, '../../src/shared/dnd/data/edition2024')
const BRIDGE = path.join(here, 'create2024_bridge.py')
const VENV_PYTHON = path.resolve(here, '../../../backend/.venv/bin/python')
const PYTHON = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3'
const LANGUAGES = (
  JSON.parse(fs.readFileSync(path.join(here, '../fixtures/p24-m03c-catalog.json'), 'utf8')) as {
    languages: unknown
  }
).languages

const NAMESPACE_URL = Buffer.from('6ba7b8119dad11d180b400c04fd430c8', 'hex')

function uuid5(name: string): string {
  const hash = createHash('sha1').update(NAMESPACE_URL).update(name, 'utf8').digest()
  hash[6] = (hash[6]! & 0x0f) | 0x50
  hash[8] = (hash[8]! & 0x3f) | 0x80
  const hex = hash.subarray(0, 16).toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

type CatalogRow = Record<string, unknown> & { kind: string; slug: string }

let catalogCache: Record<string, CatalogRow[]> | null = null

export function loadCatalog2024(): Record<string, CatalogRow[]> {
  if (catalogCache) return catalogCache
  const out: Record<string, CatalogRow[]> = {}
  for (const file of fs.readdirSync(DATA_DIR).sort()) {
    if (!file.endsWith('.json')) continue
    const payload = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')) as {
      entries?: Array<Record<string, unknown>>
    }
    for (const entry of payload.entries ?? []) {
      const kind = String(entry.kind)
      const slug = String(entry.slug)
      const row: CatalogRow = {
        rules_edition: '2024',
        parent_id: null,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        ...entry,
        id: uuid5(`dvarf:catalog:2024:${kind}:${slug}`),
        kind,
        slug,
      }
      ;(out[kind] ??= []).push(row)
    }
  }
  catalogCache = out
  return out
}

type BridgeResult =
  | {
      ok: true
      name: string
      level: number
      class_name: string
      race_name: string
      hp_max: number
      hp_current: number
      sheet: Record<string, unknown>
      warnings: string[]
    }
  | { ok: false; code: string; message: string }

export function runCreate2024Bridge(payload: unknown): BridgeResult {
  const stdout = execFileSync(PYTHON, [BRIDGE], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  return JSON.parse(stdout) as BridgeResult
}

export type StoredCharacter = Record<string, unknown> & {
  id: string
  sheet: Record<string, unknown>
  sheet_version: number
}

export type HarnessStore = {
  characters: Map<string, StoredCharacter>
  lastCreatePayload: unknown
  patches: Array<Record<string, unknown>>
  unmatched: string[]
}

export function createStore(): HarnessStore {
  return { characters: new Map(), lastCreatePayload: null, patches: [], unmatched: [] }
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

function summary(row: StoredCharacter) {
  const { sheet: _sheet, ...rest } = row
  return rest
}

export function seedCharacterFromCreate(
  id: string,
  result: Extract<BridgeResult, { ok: true }>,
  isDraft = false,
): StoredCharacter {
  return {
    id,
    name: result.name,
    avatar_url: null,
    level: result.level,
    class_name: result.class_name,
    race_name: result.race_name,
    hp_current: result.hp_current,
    hp_max: result.hp_max,
    rules_edition: '2024',
    sheet_version: 1,
    is_draft: isDraft,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    sheet: result.sheet,
    can_edit: true,
    lobby_id: null,
    campaign_rules: null,
    open_session_id: null,
  }
}

const USER = {
  id: '00000000-0000-4000-8000-000000000005',
  email: 'm02c@example.com',
  display_name: 'M02c',
  is_email_verified: true,
  access_token: 'access',
  refresh_token: 'refresh',
}

/** Install auth + catalog + create-2024 + character CRUD mocks (no live API). */
export async function installClericHarness(page: Page, store: HarnessStore) {
  await page.addInitScript(() => {
    localStorage.setItem('dvarf.access_token', 'access')
    localStorage.setItem('dvarf.refresh_token', 'refresh')
    try {
      localStorage.removeItem('dvarf.createPipeline.v2')
    } catch {
      /* ignore */
    }
  })
  const catalog = loadCatalog2024()
  let nextId = 1

  await page.route(
    (url) => {
      const p = url.pathname
      return (
        p === '/health' ||
        p.startsWith('/auth') ||
        p.startsWith('/catalog') ||
        p.startsWith('/characters') ||
        p.startsWith('/users') ||
        p.startsWith('/lobbies') ||
        p.startsWith('/sessions') ||
        p.startsWith('/me')
      )
    },
    async (route) => {
      const request = route.request()
      const type = request.resourceType()
      if (type !== 'fetch' && type !== 'xhr') {
        await route.continue()
        return
      }
      const url = new URL(request.url())
      const pathname = url.pathname
      const method = request.method()

      if (pathname === '/health') return json(route, { status: 'ok' })
      if (pathname.startsWith('/auth')) return json(route, USER)

      if (pathname === '/catalog' || pathname === '/catalog/') {
        const kind = url.searchParams.get('kind') || ''
        const parent = url.searchParams.get('parent_id')
        const q = (url.searchParams.get('q') || '').trim().toLowerCase()
        let rows = catalog[kind] ?? []
        if (parent) rows = rows.filter((row) => row.parent_id === parent)
        if (q) {
          rows = rows.filter(
            (row) =>
              String(row.name_ru).toLowerCase().includes(q) ||
              String(row.name_en ?? '').toLowerCase().includes(q) ||
              row.slug.includes(q),
          )
        }
        return json(route, rows)
      }
      if (pathname.startsWith('/catalog')) return json(route, [])
      if (pathname.startsWith('/lobbies') || pathname.startsWith('/sessions')) {
        if (method === 'GET') return json(route, [])
      }

      if (pathname === '/characters/create-2024/languages') return json(route, LANGUAGES)

      if (pathname === '/characters/create-2024/validate' && method === 'POST') {
        const result = runCreate2024Bridge(request.postDataJSON())
        if (!result.ok) return json(route, { detail: result.message, code: result.code }, 400)
        return json(route, result)
      }
      if (pathname === '/characters/create-2024' && method === 'POST') {
        const payload = request.postDataJSON()
        store.lastCreatePayload = payload
        const result = runCreate2024Bridge(payload)
        if (!result.ok) return json(route, { detail: result.message, code: result.code }, 400)
        const id = `dddddddd-dddd-4ddd-8ddd-${String(nextId++).padStart(12, '0')}`
        const row = seedCharacterFromCreate(id, result, Boolean((payload as { is_draft?: boolean }).is_draft))
        store.characters.set(id, row)
        return json(route, row)
      }

      if (pathname === '/characters' || pathname === '/characters/') {
        if (method === 'GET') {
          return json(route, [...store.characters.values()].map(summary))
        }
        return json(route, { detail: 'not mocked' }, 404)
      }

      const match = /^\/characters\/([0-9a-f-]{36})$/i.exec(pathname)
      if (match) {
        const row = store.characters.get(match[1]!)
        if (!row) return json(route, { detail: 'Персонаж не найден' }, 404)
        if (method === 'GET') return json(route, row)
        if (method === 'PATCH' || method === 'PUT') {
          const body = request.postDataJSON() as Record<string, unknown>
          store.patches.push(body)
          for (const [key, value] of Object.entries(body)) {
            if (key === 'sheet_version') continue
            if (value !== undefined) row[key] = value
          }
          row.sheet_version = Number(row.sheet_version) + 1
          return json(route, row)
        }
      }

      store.unmatched.push(`${method} ${pathname}`)
      return json(route, { detail: 'not mocked' }, 404)
    },
  )
}
