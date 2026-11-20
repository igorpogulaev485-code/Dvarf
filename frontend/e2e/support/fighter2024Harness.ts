/**
 * Offline harness for P24-M02-fighter acceptance shots.
 *
 * Same stack as ranger/artificer: catalog JSON, create2024_bridge.py, in-memory character store.
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
export async function installFighterHarness(page: Page, store: HarnessStore) {
  await installDruidHarness(page, store)
}
