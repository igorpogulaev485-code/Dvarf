export type OnboardingSegment = 'dnd_new' | 'product_new' | 'skip'

export type OnboardingPanelId =
  | 'combat_header'
  | 'desk_modes'
  | 'abilities'
  | 'skills'
  | 'saves'
  | 'attacks'
  | 'spells'
  | 'inventory'
  | 'attunement'
  | 'identity'
  | 'passives'
  | 'proficiencies'
  | 'languages_tools'
  | 'conditions'
  | 'rest'
  | 'text_blocks'
  | 'companions'
  | 'features'
  | 'classic'

export type SheetTourStepId =
  | 'combat_header'
  | 'desk_modes'
  | 'abilities'
  | 'actions'
  | 'checklist'

export type OnboardingState = {
  version: 1
  segment: OnboardingSegment | null
  welcomeDone: boolean
  createHintVersion: number
  sheetTourDone: boolean
  dismissedPanelHelp: OnboardingPanelId[]
  helpOpened: boolean
  /** After create Готово — show bridge dialog once. */
  pendingReadyBridge: boolean
  /** Start sheet tour after bridge (or immediately if skipped bridge). */
  pendingSheetTour: boolean
}

export const ONBOARDING_STORAGE_KEY = 'creed20.onboarding.v1'
export const CREATE_HINT_VERSION = 1

export function defaultOnboardingState(): OnboardingState {
  return {
    version: 1,
    segment: null,
    welcomeDone: false,
    createHintVersion: 0,
    sheetTourDone: false,
    dismissedPanelHelp: [],
    helpOpened: false,
    pendingReadyBridge: false,
    pendingSheetTour: false,
  }
}
