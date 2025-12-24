/**
 * Player UI Store
 *
 * Manages UI-related player state:
 * - Player mode (mini/expanded)
 * - Playing state
 * - Transcription state and progress
 */

import { create } from 'zustand'
import type { PlayerMode } from './types'
import { usePlayerSessionStore } from './player-session-store'

interface PlayerUIState {
  // UI State
  mode: PlayerMode
  isPlaying: boolean
  isBuffering: boolean
  isTranscribing: boolean
  transcribeProgress: string | null
  transcribeProgressPercent: number | null

  // Actions
  setPlaying: (playing: boolean) => void
  togglePlay: () => void
  expand: () => void
  collapse: () => void
  hide: () => void
  setBuffering: (buffering: boolean) => void
  setTranscribing: (isTranscribing: boolean) => void
  setTranscribeProgress: (progress: string | null, percent?: number | null) => void
  clearTranscribeState: () => void
}

export const usePlayerUIStore = create<PlayerUIState>((set) => ({
  // Initial UI state
  mode: 'mini',
  isPlaying: false,
  isBuffering: false,
  isTranscribing: false,
  transcribeProgress: null,
  transcribeProgressPercent: null,

  // Actions
  setPlaying: (playing: boolean) => {
    set({ isPlaying: playing })
  },

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }))
  },

  expand: () => {
    set({ mode: 'expanded' })
  },

  collapse: () => {
    set({ mode: 'mini' })
  },

  hide: () => {
    // Hide player by clearing session (handled by session store)
    // This is a convenience method that clears the session
    usePlayerSessionStore.getState().clearSession()
    set({ mode: 'mini', isPlaying: false, isBuffering: false })
  },

  setBuffering: (buffering: boolean) => {
    set({ isBuffering: buffering })
  },

  setTranscribing: (isTranscribing: boolean) => {
    set({ isTranscribing })
  },

  setTranscribeProgress: (progress: string | null, percent?: number | null) => {
    set({
      transcribeProgress: progress,
      transcribeProgressPercent: percent ?? null,
    })
  },

  clearTranscribeState: () => {
    set({
      isTranscribing: false,
      transcribeProgress: null,
      transcribeProgressPercent: null,
    })
  },
}))
