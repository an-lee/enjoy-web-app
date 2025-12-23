/**
 * Player Transcription Store
 *
 * Manages transcription-related state:
 * - Transcription in progress flag
 * - Transcription progress message and percentage
 *
 * Note: This store is separate from UI store to allow independent updates
 * and better separation of concerns.
 */

import { create } from 'zustand'

interface PlayerTranscriptionState {
  // Transcription State
  isTranscribing: boolean
  transcribeProgress: string | null
  transcribeProgressPercent: number | null

  // Actions
  setTranscribing: (isTranscribing: boolean) => void
  setTranscribeProgress: (progress: string | null, percent?: number | null) => void
  clearTranscribeState: () => void
}

export const usePlayerTranscriptionStore = create<PlayerTranscriptionState>((set) => ({
  // Initial transcription state
  isTranscribing: false,
  transcribeProgress: null,
  transcribeProgressPercent: null,

  // Actions
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

