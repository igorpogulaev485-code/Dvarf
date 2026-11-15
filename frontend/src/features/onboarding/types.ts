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
  | 'hot_bar'
  | 'desk_modes'
  | 'turn_actions'
  | 'help'

/** First-visit «что здесь» cards for non-combat scenes (TOUR-01). */
export type SceneIntroId = 'explore' | 'social' | 'features' | 'companions'

/** LOBBY-TOUR: master hub/session + player session steps. */
export type LobbyTourStepId =
  | 'invite'
  | 'roster'
  | 'live_tabs'
  | 'combat'
  | 'more_help'
  | 'table'
  | 'your_turn'
  | 'reaction'
  | 'rewards'

export type LobbyTourSurface = 'hub' | 'session'

/** Durable flags mirrored to users.onboarding (ONB-03). */
export type OnboardingServerPayload = {
  version: 1
  welcomeDone: boolean
  segment: OnboardingSegment | null
  sheetTourDone: boolean
  lobbyTourDone: boolean
  createHintVersion?: number
  helpOpened?: boolean
}

export type OnboardingState = {
  version: 1
  segment: OnboardingSegment | null
  welcomeDone: boolean
  createHintVersion: number
  sheetTourDone: boolean
  lobbyTourDone: boolean
  dismissedPanelHelp: OnboardingPanelId[]
  /** Scene first-visit cards already shown (local; reset with restart tips). */
  seenSceneIntros: SceneIntroId[]
  helpOpened: boolean
  /** After create Готово — show bridge dialog once. Local-only. */
  pendingReadyBridge: boolean
  /** Start sheet tour after bridge (or immediately if skipped bridge). Local-only. */
  pendingSheetTour: boolean
  /** After «Показать снова» — run lobby tour on next table visit. Local-only arm. */
  pendingLobbyTour: boolean
  /** Completed LOBBY-TOUR step ids this run (local; multi-page hub→session). */
  lobbyTourSeenSteps: LobbyTourStepId[]
  /** /join «что здесь» card dismissed (local; reset with restart tips). */
  joinIntroDone: boolean
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
    lobbyTourDone: false,
    dismissedPanelHelp: [],
    seenSceneIntros: [],
    helpOpened: false,
    pendingReadyBridge: false,
    pendingSheetTour: false,
    pendingLobbyTour: false,
    lobbyTourSeenSteps: [],
    joinIntroDone: false,
  }
}

export function toServerPayload(state: OnboardingState): OnboardingServerPayload {
  return {
    version: 1,
    welcomeDone: state.welcomeDone,
    segment: state.segment,
    sheetTourDone: state.sheetTourDone,
    lobbyTourDone: state.lobbyTourDone,
    createHintVersion: state.createHintVersion,
    helpOpened: state.helpOpened,
  }
}
