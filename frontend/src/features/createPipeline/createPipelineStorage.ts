/** localStorage persistence for create-pipeline F5 protection. */

import { emptyFeaturePicks } from '../../shared/dnd/featurePicks'
import {
  CREATE_PIPELINE_VERSION,
  createEmptyPipelineState,
  type CreatePipelineState,
} from './createPipelineTypes'

const STORAGE_KEY = 'dvarf.createPipeline.v2'
/** Drop legacy drafts that used the old step order. */
const LEGACY_STORAGE_KEYS = ['dvarf.createPipeline.v1']

function normalizeLoadedState(parsed: CreatePipelineState): CreatePipelineState {
  const empty = createEmptyPipelineState()
  return {
    ...empty,
    ...parsed,
    version: CREATE_PIPELINE_VERSION,
    classGrantPicks: parsed.classGrantPicks ?? {},
    subclassSetups: parsed.subclassSetups ?? {},
    featurePicks: parsed.featurePicks ?? emptyFeaturePicks(),
    classAsi: Array.isArray(parsed.classAsi) ? parsed.classAsi : [],
    sheetDraft: parsed.sheetDraft ?? {},
    stepDirty: parsed.stepDirty ?? {},
    feat: parsed.feat ?? null,
    featSetup: parsed.featSetup ?? null,
    featAcknowledged: Boolean(parsed.featAcknowledged),
  }
}

function clearLegacyKeys(): void {
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }
}

export function loadPipelineState(): CreatePipelineState | null {
  try {
    clearLegacyKeys()
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CreatePipelineState
    if (!parsed || parsed.version !== CREATE_PIPELINE_VERSION) return null
    return normalizeLoadedState(parsed)
  } catch {
    return null
  }
}

export function savePipelineState(state: CreatePipelineState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota / private mode — ignore; in-memory still works.
  }
}

export function clearPipelineState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    clearLegacyKeys()
  } catch {
    // ignore
  }
}

export function loadOrCreatePipelineState(): CreatePipelineState {
  return loadPipelineState() ?? createEmptyPipelineState()
}
