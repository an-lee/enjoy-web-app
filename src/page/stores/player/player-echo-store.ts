/**
 * Player Echo Store
 *
 * Manages Echo mode state (for shadow reading practice):
 * - Echo mode active state
 * - Echo region boundaries (line indices and time)
 *
 * Note: Database synchronization is handled in hooks, not in this store.
 */

import { create } from 'zustand'

interface PlayerEchoState {
  // Echo Mode State
  echoModeActive: boolean
  echoStartLineIndex: number
  echoEndLineIndex: number
  echoStartTime: number
  echoEndTime: number

  // Actions
  activateEchoMode: (
    startLineIndex: number,
    endLineIndex: number,
    startTime: number,
    endTime: number
  ) => void
  deactivateEchoMode: () => void
  updateEchoRegion: (
    startLineIndex: number,
    endLineIndex: number,
    startTime: number,
    endTime: number
  ) => void
}

export const usePlayerEchoStore = create<PlayerEchoState>((set) => ({
  // Initial echo mode state
  echoModeActive: false,
  echoStartLineIndex: -1,
  echoEndLineIndex: -1,
  echoStartTime: -1,
  echoEndTime: -1,

  // Actions
  activateEchoMode: (
    startLineIndex: number,
    endLineIndex: number,
    startTime: number,
    endTime: number
  ) => {
    set({
      echoModeActive: true,
      echoStartLineIndex: startLineIndex,
      echoEndLineIndex: endLineIndex,
      echoStartTime: startTime,
      echoEndTime: endTime,
    })
  },

  deactivateEchoMode: () => {
    set({
      echoModeActive: false,
      echoStartLineIndex: -1,
      echoEndLineIndex: -1,
      echoStartTime: -1,
      echoEndTime: -1,
    })
  },

  updateEchoRegion: (
    startLineIndex: number,
    endLineIndex: number,
    startTime: number,
    endTime: number
  ) => {
    set({
      echoStartLineIndex: startLineIndex,
      echoEndLineIndex: endLineIndex,
      echoStartTime: startTime,
      echoEndTime: endTime,
    })
  },
}))
