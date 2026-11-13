import {
  CREATE_HINT_VERSION,
  defaultOnboardingState,
  ONBOARDING_STORAGE_KEY,
  type OnboardingPanelId,
  type OnboardingSegment,
  type OnboardingState,
} from './types'

function storageKey(userId?: string | null): string {
  if (userId) return `${ONBOARDING_STORAGE_KEY}:${userId}`
  return ONBOARDING_STORAGE_KEY
}

function isPanelId(value: unknown): value is OnboardingPanelId {
  return typeof value === 'string' && value.length > 0
}

function isSegment(value: unknown): value is OnboardingSegment {
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
      dismissedPanelHelp: Array.isArray(parsed.dismissedPanelHelp)
        ? parsed.dismissedPanelHelp.filter(isPanelId)
        : [],
      helpOpened: Boolean(parsed.helpOpened),
      pendingReadyBridge: Boolean(parsed.pendingReadyBridge),
      pendingSheetTour: Boolean(parsed.pendingSheetTour),
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
  const dismissed = new Set([...primary.dismissedPanelHelp, ...secondary.dismissedPanelHelp])
  return {
    version: 1,
    segment: primary.segment ?? secondary.segment,
    welcomeDone: primary.welcomeDone || secondary.welcomeDone,
    createHintVersion: Math.max(primary.createHintVersion, secondary.createHintVersion),
    sheetTourDone,
    dismissedPanelHelp: Array.from(dismissed),
    helpOpened: primary.helpOpened || secondary.helpOpened,
    pendingReadyBridge:
      !sheetTourDone && (primary.pendingReadyBridge || secondary.pendingReadyBridge),
    pendingSheetTour:
      !sheetTourDone && (primary.pendingSheetTour || secondary.pendingSheetTour),
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
    anon.pendingReadyBridge === anonDefault.pendingReadyBridge &&
    anon.pendingSheetTour === anonDefault.pendingSheetTour &&
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
