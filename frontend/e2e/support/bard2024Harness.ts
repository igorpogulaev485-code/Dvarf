/**
 * Offline harness for P24-M02-bard acceptance shots.
 *
 * Same stack as the druid/sorcerer harnesses: catalog JSON from src/shared/dnd/data/edition2024,
 * create2024_bridge.py (real backend validator) and an in-memory character store.
 * Extra bard routes: lobbies (ally targets) + POST /effects/apply (BI on ally sheet).
 */
import type { Page, Route } from '@playwright/test'
import {
  createStore,
  installDruidHarness,
  loadCatalog2024,
  runCreate2024Bridge,
  seedCharacterFromCreate,
  type HarnessStore,
  type StoredCharacter,
} from './druid2024Harness'

export {
  createStore,
  loadCatalog2024,
  runCreate2024Bridge,
  seedCharacterFromCreate,
  type HarnessStore,
  type StoredCharacter,
}

export const BARD_E2E_LOBBY_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001'
export const BARD_E2E_LOBBY_NAME = 'E2E Бард стол'

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

function ensurePlayEffects(sheet: Record<string, any>): Record<string, any> {
  const play = (sheet.play ?? {}) as Record<string, any>
  const effects = Array.isArray(play.effects) ? play.effects : []
  sheet.play = { ...play, effects }
  return sheet.play
}

/** Assign every stored character to the shared e2e lobby (ally pick needs lobby_id). */
export function bindStoreToBardLobby(store: HarnessStore) {
  for (const row of store.characters.values()) {
    row.lobby_id = BARD_E2E_LOBBY_ID
  }
}

export function lobbyMembersFromStore(store: HarnessStore) {
  return [...store.characters.values()].map((row, index) => ({
    id: `member-${index}`,
    character_id: row.id,
    user_id: '00000000-0000-4000-8000-000000000006',
    joined_at: '2024-01-01T00:00:00Z',
    character_name: String(row.name ?? 'Персонаж'),
    character_level: Number(row.level ?? 1),
    character_class_name: (row.class_name as string | null) ?? null,
    character_race_name: (row.race_name as string | null) ?? null,
    hp_current: (row.hp_current as number | null) ?? null,
    hp_max: (row.hp_max as number | null) ?? null,
  }))
}

/**
 * Install auth/catalog/create-2024 mocks, then bard-specific lobbies + effects/apply
 * (registered after the shared harness so these handlers win).
 */
export async function installBardHarness(page: Page, store: HarnessStore) {
  await installDruidHarness(page, store)

  // LIFO: these win over the shared harness empty /lobbies and no-op effects handlers.
  await page.route('**/lobbies', async (route) => {
    const request = route.request()
    if (request.resourceType() !== 'fetch' && request.resourceType() !== 'xhr') {
      await route.continue()
      return
    }
    const url = new URL(request.url())
    if (url.pathname !== '/lobbies' && url.pathname !== '/lobbies/') {
      await route.fallback()
      return
    }
    if (request.method() !== 'GET') {
      await route.fallback()
      return
    }
    bindStoreToBardLobby(store)
    return json(route, [
      {
        id: BARD_E2E_LOBBY_ID,
        name: BARD_E2E_LOBBY_NAME,
        invite_code: null,
        is_owner: true,
        member_count: store.characters.size,
        rules_edition: '2024',
        has_open_session: false,
        open_session_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ])
  })

  await page.route(`**/lobbies/${BARD_E2E_LOBBY_ID}`, async (route) => {
    const request = route.request()
    if (request.resourceType() !== 'fetch' && request.resourceType() !== 'xhr') {
      await route.continue()
      return
    }
    if (request.method() !== 'GET') {
      await route.fallback()
      return
    }
    bindStoreToBardLobby(store)
    return json(route, {
      id: BARD_E2E_LOBBY_ID,
      name: BARD_E2E_LOBBY_NAME,
      invite_code: null,
      is_owner: true,
      owner_user_id: '00000000-0000-4000-8000-000000000006',
      members: lobbyMembersFromStore(store),
      rules_edition: '2024',
      campaign_rules: null,
      open_session_id: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  })

  await page.route('**/characters/*/effects/apply', async (route) => {
    const request = route.request()
    if (request.resourceType() !== 'fetch' && request.resourceType() !== 'xhr') {
      await route.continue()
      return
    }
    if (request.method() !== 'POST') {
      await route.fallback()
      return
    }
    const url = new URL(request.url())
    const applyMatch = /\/characters\/([0-9a-f-]{36})\/effects\/apply$/i.exec(url.pathname)
    if (!applyMatch) {
      await route.fallback()
      return
    }
    const sourceId = applyMatch[1]!
    if (!store.characters.get(sourceId)) {
      return json(route, { detail: 'Персонаж не найден' }, 404)
    }
    const body = (request.postDataJSON() || {}) as {
      target_character_ids?: string[]
      effect?: Record<string, unknown>
      linked_concentration?: boolean
    }
    const effect = body.effect
    const targets = (body.target_character_ids ?? []).filter(Boolean)
    if (!effect || !targets.length) {
      return json(route, { applied: 0, character_ids: [] })
    }
    const appliedIds: string[] = []
    for (const targetId of targets) {
      const row = store.characters.get(targetId)
      if (!row) continue
      const sheet = row.sheet as Record<string, any>
      const play = ensurePlayEffects(sheet)
      // Mirror into combat.effects — some sheet loaders still read combat first.
      const combat = (sheet.combat ?? {}) as Record<string, any>
      const combatEffects = Array.isArray(combat.effects) ? combat.effects : []
      const nextEffect = {
        ...effect,
        id:
          typeof effect.id === 'string' && effect.id
            ? effect.id
            : `fx-${Date.now()}-${appliedIds.length}`,
        linked_concentration: Boolean(body.linked_concentration),
      }
      play.effects = [...(play.effects as unknown[]), nextEffect]
      sheet.combat = { ...combat, effects: [...combatEffects, nextEffect] }
      row.sheet_version = Number(row.sheet_version) + 1
      appliedIds.push(targetId)
    }
    return json(route, { applied: appliedIds.length, character_ids: appliedIds })
  })
}

/** Install a 2024 BI die on an ally sheet (harness store) for target-side spend shots. */
export function installBiEffectOnCharacter(
  store: HarnessStore,
  characterId: string,
  opts?: { die?: string; sourceName?: string },
) {
  const row = store.characters.get(characterId)
  if (!row) throw new Error(`character ${characterId} not in store`)
  const sheet = row.sheet as Record<string, any>
  const play = ensurePlayEffects(sheet)
  const die = opts?.die ?? '1d8'
  const effect = {
    id: `fx-bi-${Date.now()}`,
    name: 'Бардовское вдохновение',
    slug: 'bardic_inspiration',
    kind: 'feature',
    source_name: opts?.sourceName ?? 'Бард',
    linked_concentration: false,
    inactive: false,
    duration: { kind: 'hours', amount: 1, started_at: new Date().toISOString() },
    mods: [
      { target: 'check', op: 'roll_die', dice: die, once: true, condition: 'after_failed_d20' },
      {
        target: 'attack_save',
        op: 'roll_die',
        dice: die,
        once: true,
        condition: 'after_failed_d20',
      },
    ],
  }
  play.effects = [...(play.effects as unknown[]), effect]
  const combat = (sheet.combat ?? {}) as Record<string, any>
  sheet.combat = {
    ...combat,
    effects: [...(Array.isArray(combat.effects) ? combat.effects : []), effect],
  }
  row.sheet_version = Number(row.sheet_version) + 1
  return effect
}

/** Seed a second stored character via the real create-2024 bridge (ally / target sheet). */
export function seedAllyFromBridge(
  store: HarnessStore,
  payload: unknown,
  opts?: { id?: string; name?: string },
): StoredCharacter {
  const result = runCreate2024Bridge(payload)
  if (!result.ok) throw new Error(`ally create bridge failed: ${result.message}`)
  const id =
    opts?.id ??
    `aaaaaaaa-aaaa-4aaa-8aaa-${String(store.characters.size + 1).padStart(12, '0')}`
  const row = seedCharacterFromCreate(id, result, false)
  if (opts?.name) {
    row.name = opts.name
    ;(row.sheet as Record<string, any>).name = opts.name
  }
  row.lobby_id = BARD_E2E_LOBBY_ID
  store.characters.set(id, row)
  bindStoreToBardLobby(store)
  return row
}
