/** localStorage persistence for create-pipeline F5 protection. */

import {
  createEmptyPipelineState,
  type CreatePipelineState,
} from './createPipelineTypes'

const STORAGE_KEY = 'dvarf.createPipeline.v1'

export function loadPipelineState(): CreatePipelineState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CreatePipelineState
    if (!parsed || parsed.version !== 1) return null
    return parsed
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
  } catch {
    // ignore
  }
}

export function loadOrCreatePipelineState(): CreatePipelineState {
  return loadPipelineState() ?? createEmptyPipelineState()
}
