/**
 * Player Settings Store
 *
 * Manages playback settings (persisted):
 * - Volume
 * - Playback rate
 * - Repeat mode
 *
 * Note: Database synchronization is handled in hooks, not in this store.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PlayerSettingsState {
  // Playback Settings
  volume: number
  playbackRate: number
  repeatMode: 'none' | 'single' | 'segment'

  // Actions
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
  setRepeatMode: (mode: 'none' | 'single' | 'segment') => void
}

export const usePlayerSettingsStore = create<PlayerSettingsState>()(
  persist(
    (set) => ({
      // Initial playback settings
      volume: 1,
      playbackRate: 1,
      repeatMode: 'none',

      // Actions
      setVolume: (volume: number) => {
        const clampedVolume = Math.max(0, Math.min(1, volume))
        set({ volume: clampedVolume })
      },

      setPlaybackRate: (rate: number) => {
        const clampedRate = Math.max(0.25, Math.min(2, rate))
        set({ playbackRate: clampedRate })
      },

      setRepeatMode: (repeatMode: 'none' | 'single' | 'segment') => {
        set({ repeatMode })
        // Note: repeatMode is not persisted in EchoSession (it's a UI preference)
      },
    }),
    {
      name: 'enjoy-player-settings',
      partialize: (state) => ({
        volume: state.volume,
        playbackRate: state.playbackRate,
        repeatMode: state.repeatMode,
      }),
    }
  )
)
