import {
  CREATE_HINT_VERSION,
  defaultOnboardingState,
  ONBOARDING_STORAGE_KEY,
  type OnboardingPanelId,
  type OnboardingSegment,
  type OnboardingServerPayload,
  type OnboardingState,
  toServerPayload,
} from './types'

function storageKey(userId?: string | null): string {
  if (userId) return `${ONBOARDING_STORAGE_KEY}:${userId}`
  return ONBOARDING_STORAGE_KEY
}

function isPanelId(value: unknown): value is OnboardingPanelId {
  return typeof value === 'string' && value.length > 0
}

export function isSegment(value: unknown): value is OnboardingSegment {
  return value === 'dnd_new' || value === 'product_new' || value === 'skip'
}

export function loadOnboardingState(userId?: string | null): OnboardingState {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return defaultOnboardingState()
    const parsed = JSON.parse(raw) as Partial<OnboardingState>
    if (parsed.version !== 1) return defaultOnboardingState()
    const base = defaultOnboardingState()
    return {
      ...base,
      segment: isSegment(parsed.segment) ? parsed.segment : null,
      welcomeDone: Boolean(parsed.welcomeDone),
      createHintVersion:
        typeof parsed.createHintVersion === 'number' ? parsed.createHintVersion : 0,
      sheetTourDone: Boolean(parsed.sheetTourDone),
      lobbyTourDone: Boolean(parsed.lobbyTourDone),
      dismissedPanelHelp: Array.isArray(parsed.dismissedPanelHelp)
        ? parsed.dismissedPanelHelp.filter(isPanelId)
        : [],
      helpOpened: Boolean(parsed.helpOpened),
      pendingReadyBridge: Boolean(parsed.pendingReadyBridge),
      pendingSheetTour: Boolean(parsed.pendingSheetTour),
      pendingLobbyTour: Boolean(parsed.pendingLobbyTour),
    }
  } catch {
    return defaultOnboardingState()
  }
}

export function saveOnboardingState(
  state: OnboardingState,
  userId?: string | null,
): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state))
  } catch {
    // Quota / private mode — ignore.
  }
}

export function clearOnboardingState(userId?: string | null): void {
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    // ignore
  }
}

/** Merge two progress blobs — keeps pending tour/bridge across the userId race (B7). */
export function mergeOnboardingState(
  primary: OnboardingState,
  secondary: OnboardingState,
): OnboardingState {
  const sheetTourDone = primary.sheetTourDone || secondary.sheetTourDone
  const lobbyTourDone = primary.lobbyTourDone || secondary.lobbyTourDone
  const dismissed = new Set([...primary.dismissedPanelHelp, ...secondary.dismissedPanelHelp])
  return {
    version: 1,
    segment: primary.segment ?? secondary.segment,
    welcomeDone: primary.welcomeDone || secondary.welcomeDone,
    createHintVersion: Math.max(primary.createHintVersion, secondary.createHintVersion),
    sheetTourDone,
    lobbyTourDone,
    dismissedPanelHelp: Array.from(dismissed),
    helpOpened: primary.helpOpened || secondary.helpOpened,
    pendingReadyBridge:
      !sheetTourDone && (primary.pendingReadyBridge || secondary.pendingReadyBridge),
    pendingSheetTour:
      !sheetTourDone && (primary.pendingSheetTour || secondary.pendingSheetTour),
    pendingLobbyTour:
      !lobbyTourDone && (primary.pendingLobbyTour || secondary.pendingLobbyTour),
  }
}

/**
 * Load for a signed-in user: adopt anonymous-key progress written before `/auth/me`
 * returned an id, then clear the anonymous key so it cannot overwrite later.
 */
export function loadOnboardingStateForUser(userId?: string | null): OnboardingState {
  if (!userId) return loadOnboardingState(null)
  const named = loadOnboardingState(userId)
  const anon = loadOnboardingState(null)
  const anonDefault = defaultOnboardingState()
  const anonUntouched =
    anon.segment === anonDefault.segment &&
    anon.welcomeDone === anonDefault.welcomeDone &&
    anon.createHintVersion === anonDefault.createHintVersion &&
    anon.sheetTourDone === anonDefault.sheetTourDone &&
    anon.lobbyTourDone === anonDefault.lobbyTourDone &&
    anon.pendingReadyBridge === anonDefault.pendingReadyBridge &&
    anon.pendingSheetTour === anonDefault.pendingSheetTour &&
    anon.pendingLobbyTour === anonDefault.pendingLobbyTour &&
    anon.helpOpened === anonDefault.helpOpened &&
    anon.dismissedPanelHelp.length === 0
  if (anonUntouched) return named
  const merged = mergeOnboardingState(named, anon)
  saveOnboardingState(merged, userId)
  clearOnboardingState(null)
  return merged
}

export function shouldShowCreateHints(state: OnboardingState): boolean {
  if (state.segment === 'skip') return false
  return state.createHintVersion < CREATE_HINT_VERSION
}

export function shouldRunSheetTour(state: OnboardingState): boolean {
  if (state.segment === 'skip') return false
  if (state.sheetTourDone) return false
  return state.pendingSheetTour
}

export function shouldRunLobbyTour(state: OnboardingState): boolean {
  if (state.segment === 'skip') return false
  if (state.lobbyTourDone) return false
  // First visit: run when never done. After «Показать снова» pendingLobbyTour arms it.
  return true
}

export function isServerOnboardingEmpty(
  server: OnboardingServerPayload | null | undefined,
): boolean {
  if (!server) return true
  return (
    !server.welcomeDone &&
    server.segment == null &&
    !server.sheetTourDone &&
    !server.lobbyTourDone
  )
}

export function hasLocalDurableProgress(state: OnboardingState): boolean {
  return (
    state.welcomeDone ||
    state.segment != null ||
    state.sheetTourDone ||
    state.lobbyTourDone ||
    state.createHintVersion > 0
  )
}

/**
 * After `/auth/me`: server is source of truth for durable flags.
 * Empty server + local progress → keep local and upload once.
 * Session pending* flags stay local.
 */
export function applyServerOnboarding(
  local: OnboardingState,
  server: OnboardingServerPayload | null | undefined,
): { state: OnboardingState; shouldUpload: boolean } {
  if (isServerOnboardingEmpty(server)) {
    if (hasLocalDurableProgress(local)) {
      return { state: local, shouldUpload: true }
    }
    return { state: local, shouldUpload: false }
  }
  const sheetTourDone = Boolean(server!.sheetTourDone)
  const lobbyTourDone = Boolean(server!.lobbyTourDone)
  const segment = isSegment(server!.segment) ? server!.segment : local.segment
  return {
    state: {
      ...local,
      welcomeDone: Boolean(server!.welcomeDone),
      segment,
      sheetTourDone,
      lobbyTourDone,
      createHintVersion:
        typeof server!.createHintVersion === 'number'
          ? Math.max(local.createHintVersion, server!.createHintVersion)
          : local.createHintVersion,
      helpOpened: server!.helpOpened ? true : local.helpOpened,
      pendingReadyBridge: !sheetTourDone && local.pendingReadyBridge,
      pendingSheetTour: !sheetTourDone && local.pendingSheetTour,
      pendingLobbyTour: !lobbyTourDone && local.pendingLobbyTour,
    },
    shouldUpload: false,
  }
}

/** Reset tours for «Показать подсказки снова». Keeps segment unless it was skip. */
export function restartTipsState(prev: OnboardingState): OnboardingState {
  const wasSkip = prev.segment === 'skip'
  return {
    ...prev,
    segment: wasSkip ? null : prev.segment,
    welcomeDone: wasSkip ? false : Boolean(prev.segment) || prev.welcomeDone,
    sheetTourDone: false,
    lobbyTourDone: false,
    pendingReadyBridge: false,
    pendingSheetTour: !wasSkip && prev.segment != null,
    pendingLobbyTour: true,
    createHintVersion: 0,
  }
}

export { toServerPayload }
