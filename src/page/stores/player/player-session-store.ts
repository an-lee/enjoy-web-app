/**
 * Player Session Store
 *
 * Manages playback session state:
 * - Current playback session
 * - EchoSession ID for database persistence
 */

import { create } from 'zustand'
import type { PlaybackSession } from './types'

interface PlayerSessionState {
  // Session State
  currentSession: PlaybackSession | null
  currentEchoSessionId: string | null

  // Actions
  setSession: (session: PlaybackSession | null, echoSessionId: string | null) => void
  updateProgress: (currentTime: number, segmentIndex?: number) => void
  clearSession: () => void
}

export const usePlayerSessionStore = create<PlayerSessionState>((set) => ({
  // Initial session state
  currentSession: null,
  currentEchoSessionId: null,

  // Actions
  setSession: (session: PlaybackSession | null, echoSessionId: string | null) => {
    set({
      currentSession: session,
      currentEchoSessionId: echoSessionId,
    })
  },

  updateProgress: (currentTime: number, segmentIndex?: number) => {
    set((state) => {
      if (!state.currentSession) return state

      return {
        currentSession: {
          ...state.currentSession,
          currentTime,
          currentSegmentIndex: segmentIndex ?? state.currentSession.currentSegmentIndex,
          lastActiveAt: new Date().toISOString(),
        },
      }
    })
  },

  clearSession: () => {
    set({
      currentSession: null,
      currentEchoSessionId: null,
    })
  },
}))
