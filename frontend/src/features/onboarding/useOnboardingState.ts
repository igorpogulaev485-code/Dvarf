import { useCallback, useEffect, useState } from 'react'
import {
  loadOnboardingState,
  saveOnboardingState,
  shouldRunSheetTour,
  shouldShowCreateHints,
} from './storage'
import { CREATE_HINT_VERSION, type OnboardingPanelId, type OnboardingSegment, type OnboardingState } from './types'

export function useOnboardingState(userId?: string | null) {
  const [state, setState] = useState<OnboardingState>(() => loadOnboardingState(userId))

  useEffect(() => {
    setState(loadOnboardingState(userId))
  }, [userId])

  const commit = useCallback(
    (updater: (prev: OnboardingState) => OnboardingState) => {
      setState((prev) => {
        const next = updater(prev)
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
