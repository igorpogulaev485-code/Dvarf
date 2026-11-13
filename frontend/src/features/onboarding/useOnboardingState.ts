import { useCallback, useEffect, useState } from 'react'
import {
  loadOnboardingStateForUser,
  saveOnboardingState,
  shouldRunSheetTour,
  shouldShowCreateHints,
} from './storage'
import { CREATE_HINT_VERSION, type OnboardingPanelId, type OnboardingSegment, type OnboardingState } from './types'

export function useOnboardingState(userId?: string | null) {
  const [state, setState] = useState<OnboardingState>(() => loadOnboardingStateForUser(userId))

  useEffect(() => {
    setState(loadOnboardingStateForUser(userId))
  }, [userId])

  const commit = useCallback(
    (updater: (prev: OnboardingState) => OnboardingState) => {
      setState((prev) => {
        const next = updater(prev)
        // Prefer the named key once we know the user; otherwise keep anon so a
        // later userId adopt can merge (B7).
        saveOnboardingState(next, userId)
        return next
      })
    },
    [userId],
  )

  const completeWelcome = useCallback(
    (segment: OnboardingSegment) => {
      commit((prev) => ({
        ...prev,
        segment,
        welcomeDone: true,
        sheetTourDone: segment === 'skip' ? true : prev.sheetTourDone,
      }))
    },
    [commit],
  )

  const markCreateHintsSeen = useCallback(() => {
    commit((prev) => ({ ...prev, createHintVersion: CREATE_HINT_VERSION }))
  }, [commit])

  const queueAfterCreate = useCallback(() => {
    commit((prev) => {
      if (prev.segment === 'skip' || prev.sheetTourDone) {
        return {
          ...prev,
          pendingReadyBridge: false,
          pendingSheetTour: false,
        }
      }
      return {
        ...prev,
        pendingReadyBridge: true,
        pendingSheetTour: true,
      }
    })
  }, [commit])

  const dismissReadyBridge = useCallback(
    (opts: { startTour: boolean }) => {
      commit((prev) => ({
        ...prev,
        pendingReadyBridge: false,
        pendingSheetTour: opts.startTour && !prev.sheetTourDone,
      }))
    },
    [commit],
  )

  const completeSheetTour = useCallback(() => {
    commit((prev) => ({
      ...prev,
      sheetTourDone: true,
      pendingSheetTour: false,
    }))
  }, [commit])

  const skipSheetTour = useCallback(() => {
    commit((prev) => ({
      ...prev,
      sheetTourDone: true,
      pendingSheetTour: false,
      pendingReadyBridge: false,
    }))
  }, [commit])

  /**
   * Kept for storage compatibility: panel «?» buttons were removed from the sheet.
   * ONB-03 may reuse dismissedPanelHelp if tips return.
   */
  const dismissPanelHelp = useCallback(
    (id: OnboardingPanelId) => {
      commit((prev) =>
        prev.dismissedPanelHelp.includes(id)
          ? prev
          : { ...prev, dismissedPanelHelp: [...prev.dismissedPanelHelp, id] },
      )
    },
    [commit],
  )

  /** Marks that the help drawer was opened (progress flag; UI does not gate on it). */
  const markHelpOpened = useCallback(() => {
    commit((prev) => ({ ...prev, helpOpened: true }))
  }, [commit])

  return {
    state,
    completeWelcome,
    markCreateHintsSeen,
    queueAfterCreate,
    dismissReadyBridge,
    completeSheetTour,
    skipSheetTour,
    dismissPanelHelp,
    markHelpOpened,
    showWelcome: !state.welcomeDone,
    showCreateHints: shouldShowCreateHints(state),
    showReadyBridge: state.pendingReadyBridge && state.segment !== 'skip',
    showSheetTour: shouldRunSheetTour(state),
  }
}
