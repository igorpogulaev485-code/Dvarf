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

export function shouldShowCreateHints(state: OnboardingState): boolean {
  if (state.segment === 'skip') return false
  return state.createHintVersion < CREATE_HINT_VERSION
}

export function shouldRunSheetTour(state: OnboardingState): boolean {
  if (state.segment === 'skip') return false
  if (state.sheetTourDone) return false
  return state.pendingSheetTour
}
