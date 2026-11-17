/**
 * Offline harness for P24-M02-bard acceptance shots.
 *
 * Same stack as the druid/sorcerer harnesses: catalog JSON from src/shared/dnd/data/edition2024,
 * create2024_bridge.py (real backend validator) and an in-memory character store.
 * The bard needs no extra catalog kinds, so the generic druid harness is reused as-is.
 */
export {
  createStore,
  installDruidHarness as installBardHarness,
  loadCatalog2024,
  runCreate2024Bridge,
  seedCharacterFromCreate,
  type HarnessStore,
  type StoredCharacter,
} from './druid2024Harness'
