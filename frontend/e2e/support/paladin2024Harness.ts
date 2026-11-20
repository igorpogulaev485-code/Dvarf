/**
 * Offline harness for P24-M02-paladin acceptance shots.
 *
 * Same stack as bard/druid: catalog JSON, create2024_bridge.py, in-memory character store.
 * Paladin does not need lobby/ally routes — re-export the shared create store + installDruidHarness.
 */
import type { Page } from '@playwright/test'
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

/** Install auth/catalog/create-2024 mocks (no live API). */
export async function installPaladinHarness(page: Page, store: HarnessStore) {
  await installDruidHarness(page, store)
}
