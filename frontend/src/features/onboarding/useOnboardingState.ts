import { useCallback, useEffect, useRef, useState } from 'react'
import { getMe, updateMe } from '../../shared/api/auth'
import {
  applyServerOnboarding,
  loadOnboardingStateForUser,
  restartTipsState,
  saveOnboardingState,
  shouldRunLobbyTour,
  shouldRunSheetTour,
  shouldShowCreateHints,
  toServerPayload,
} from './storage'
import {
  CREATE_HINT_VERSION,
  type OnboardingPanelId,
  type OnboardingSegment,
  type OnboardingState,
} from './types'

export function useOnboardingState(userId?: string | null) {
  const [state, setState] = useState<OnboardingState>(() => loadOnboardingStateForUser(userId))
  /** Logged-in users wait for /auth/me merge before welcome/tours flash. */
  const [hydrated, setHydrated] = useState(!userId)
  const pushGen = useRef(0)

  useEffect(() => {
    let cancelled = false
    const local = loadOnboardingStateForUser(userId)
    setState(local)

    if (!userId) {
      setHydrated(true)
      return () => {
        cancelled = true
      }
    }

    setHydrated(false)
    void getMe()
      .then((me) => {
        if (cancelled) return
        // Never adopt another account's progress — userId must match.
        if (me.id !== userId) return
        const { state: next, shouldUpload } = applyServerOnboarding(local, me.onboarding ?? null)
        setState(next)
        saveOnboardingState(next, userId)
        if (shouldUpload) {
          const gen = ++pushGen.current
          void updateMe({ onboarding: toServerPayload(next) }).catch(() => {
            if (gen === pushGen.current) {
              /* keep local; next commit retries */
            }
          })
        }
      })
      .catch(() => {
        // Offline / 401 — stay on localStorage for this device.
      })
      .finally(() => {
        if (!cancelled) setHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const pushServer = useCallback(
    (next: OnboardingState) => {
      if (!userId) return
      const gen = ++pushGen.current
      void updateMe({ onboarding: toServerPayload(next) }).catch(() => {
        if (gen === pushGen.current) {
          /* ignore — local remains source until next successful sync */
        }
      })
    },
    [userId],
  )

  const commit = useCallback(
    (updater: (prev: OnboardingState) => OnboardingState, opts?: { sync?: boolean }) => {
      setState((prev) => {
        const next = updater(prev)
        saveOnboardingState(next, userId)
        if (opts?.sync !== false && userId) {
          pushServer(next)
        }
        return next
      })
    },
    [userId, pushServer],
  )

  const completeWelcome = useCallback(
    (segment: OnboardingSegment) => {
      commit((prev) => ({
        ...prev,
        segment,
        welcomeDone: true,
        sheetTourDone: segment === 'skip' ? true : prev.sheetTourDone,
        lobbyTourDone: segment === 'skip' ? true : prev.lobbyTourDone,
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
    }, { sync: false })
  }, [commit])

  const dismissReadyBridge = useCallback(
    (opts: { startTour: boolean }) => {
      commit(
        (prev) => ({
          ...prev,
          pendingReadyBridge: false,
          pendingSheetTour: opts.startTour && !prev.sheetTourDone,
        }),
        { sync: false },
      )
    },
    [commit],
  )

  /** Start sheet tour without the «Персонаж готов» bridge (restart / sheet welcome). */
  const armSheetTour = useCallback(() => {
    commit(
      (prev) => {
        if (prev.segment === 'skip' || prev.sheetTourDone) return prev
        return {
          ...prev,
          pendingSheetTour: true,
          pendingReadyBridge: false,
        }
      },
      { sync: false },
    )
  }, [commit])

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

  const completeLobbyTour = useCallback(() => {
    commit((prev) => ({
      ...prev,
      lobbyTourDone: true,
      pendingLobbyTour: false,
    }))
  }, [commit])

  const skipLobbyTour = useCallback(() => {
    commit((prev) => ({
      ...prev,
      lobbyTourDone: true,
      pendingLobbyTour: false,
    }))
  }, [commit])

  /**
   * Kept for storage compatibility: panel «?» buttons were removed from the sheet.
   * ONB-03 may reuse dismissedPanelHelp if tips return.
   */
  const dismissPanelHelp = useCallback(
    (id: OnboardingPanelId) => {
      commit(
        (prev) =>
          prev.dismissedPanelHelp.includes(id)
            ? prev
            : { ...prev, dismissedPanelHelp: [...prev.dismissedPanelHelp, id] },
        { sync: false },
      )
    },
    [commit],
  )

  /** Marks that the help drawer was opened (progress flag; UI does not gate on it). */
  const markHelpOpened = useCallback(() => {
    commit((prev) => ({ ...prev, helpOpened: true }))
  }, [commit])

  /** Справка → «Показать подсказки снова». */
  const restartTips = useCallback(() => {
    commit((prev) => restartTipsState(prev))
  }, [commit])

  const showLobbyTour =
    hydrated && shouldRunLobbyTour(state) && (state.pendingLobbyTour || !state.lobbyTourDone)

  return {
    state,
    hydrated,
    completeWelcome,
    markCreateHintsSeen,
    queueAfterCreate,
    dismissReadyBridge,
    armSheetTour,
    completeSheetTour,
    skipSheetTour,
    completeLobbyTour,
    skipLobbyTour,
    dismissPanelHelp,
    markHelpOpened,
    restartTips,
    showWelcome: hydrated && !state.welcomeDone,
    showCreateHints: shouldShowCreateHints(state),
    showReadyBridge: state.pendingReadyBridge && state.segment !== 'skip',
    showSheetTour: shouldRunSheetTour(state),
    showLobbyTour,
  }
}
