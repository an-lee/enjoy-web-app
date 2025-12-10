/**
 * Player Store - Global playback state management with session persistence
 *
 * Manages:
 * - Current playback session (media, progress, state)
 * - Recent session for "continue learning" feature
 * - Playback settings (volume, speed)
 * - Player UI state (expanded/collapsed)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LibraryMedia } from '@/hooks/queries'

// ============================================================================
// Types
// ============================================================================

export type PlayerMode = 'hidden' | 'mini' | 'expanded'

/**
 * Playback session - represents a media being played
 */
export interface PlaybackSession {
  // Media info
  mediaId: string
  mediaType: 'audio' | 'video'
  mediaTitle: string
  thumbnailUrl?: string
  duration: number // seconds

  // Progress
  currentTime: number // seconds
  currentSegmentIndex: number

  // Metadata
  language: string
  transcriptId?: string

  // Timestamps
  startedAt: string // ISO 8601
  lastActiveAt: string // ISO 8601
}

interface PlayerState {
  // ============================================================================
  // UI State
  // ============================================================================

  /** Current player mode: hidden (no media), mini (bar), expanded (full) */
  mode: PlayerMode

  /** Whether media is currently playing */
  isPlaying: boolean

  // ============================================================================
  // Session State
  // ============================================================================

  /** Current active playback session */
  currentSession: PlaybackSession | null

  /** Most recent session for "continue learning" feature */
  recentSession: PlaybackSession | null

  // ============================================================================
  // Playback Settings (persisted)
  // ============================================================================

  /** Volume level (0-1) */
  volume: number

  /** Playback speed (0.25-2) */
  playbackRate: number

  /** Repeat mode */
  repeatMode: 'none' | 'single' | 'segment'

  // ============================================================================
  // Actions
  // ============================================================================

  /** Load a media item and start playback */
  loadMedia: (media: LibraryMedia) => void

  /** Update playback progress */
  updateProgress: (currentTime: number, segmentIndex?: number) => void

  /** Set playing state */
  setPlaying: (playing: boolean) => void

  /** Toggle play/pause */
  togglePlay: () => void

  /** Save current session as recent (for resume later) */
  saveSession: () => void

  /** Clear current session */
  clearSession: () => void

  /** Resume the recent session */
  resumeSession: () => void

  /** Expand player to full mode */
  expand: () => void

  /** Collapse player to mini mode */
  collapse: () => void

  /** Hide player completely */
  hide: () => void

  /** Set volume (0-1) */
  setVolume: (volume: number) => void

  /** Set playback rate (0.25-2) */
  setPlaybackRate: (rate: number) => void

  /** Set repeat mode */
  setRepeatMode: (mode: 'none' | 'single' | 'segment') => void

  /** Seek to a specific time */
  seekTo: (time: number) => void
}

// ============================================================================
// Store Implementation
// ============================================================================

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      // Initial UI state
      mode: 'hidden',
      isPlaying: false,

      // Initial session state
      currentSession: null,
      recentSession: null,

      // Initial playback settings
      volume: 1,
      playbackRate: 1,
      repeatMode: 'none',

      // Actions
      loadMedia: (media: LibraryMedia) => {
        const now = new Date().toISOString()

        // Save current session as recent before loading new media
        const { currentSession } = get()
        if (currentSession && currentSession.mediaId !== media.id) {
          set({ recentSession: { ...currentSession, lastActiveAt: now } })
        }

        // Create new session
        const newSession: PlaybackSession = {
          mediaId: media.id,
          mediaType: media.type,
          mediaTitle: media.title,
          thumbnailUrl: media.thumbnailUrl,
          duration: media.duration,
          currentTime: 0,
          currentSegmentIndex: 0,
          language: media.language,
          startedAt: now,
          lastActiveAt: now,
        }

        set({
          currentSession: newSession,
          mode: 'expanded',
          isPlaying: true,
        })
      },

      updateProgress: (currentTime: number, segmentIndex?: number) => {
        const { currentSession } = get()
        if (!currentSession) return

        set({
          currentSession: {
            ...currentSession,
            currentTime,
            currentSegmentIndex: segmentIndex ?? currentSession.currentSegmentIndex,
            lastActiveAt: new Date().toISOString(),
          },
        })
      },

      setPlaying: (playing: boolean) => {
        set({ isPlaying: playing })
      },

      togglePlay: () => {
        set((state) => ({ isPlaying: !state.isPlaying }))
      },

      saveSession: () => {
        const { currentSession } = get()
        if (currentSession) {
          set({
            recentSession: {
              ...currentSession,
              lastActiveAt: new Date().toISOString(),
            },
          })
        }
      },

      clearSession: () => {
        const { currentSession } = get()
        // Save to recent before clearing
        if (currentSession) {
          set({
            recentSession: {
              ...currentSession,
              lastActiveAt: new Date().toISOString(),
            },
          })
        }
        set({
          currentSession: null,
          mode: 'hidden',
          isPlaying: false,
        })
      },

      resumeSession: () => {
        const { recentSession } = get()
        if (recentSession) {
          set({
            currentSession: {
              ...recentSession,
              lastActiveAt: new Date().toISOString(),
            },
            mode: 'expanded',
            isPlaying: true,
          })
        }
      },

      expand: () => {
        const { currentSession } = get()
        if (currentSession) {
          set({ mode: 'expanded' })
        }
      },

      collapse: () => {
        const { currentSession } = get()
        if (currentSession) {
          set({ mode: 'mini' })
        }
      },

      hide: () => {
        // Save session before hiding
        get().saveSession()
        set({
          currentSession: null,
          mode: 'hidden',
          isPlaying: false,
        })
      },

      setVolume: (volume: number) => {
        set({ volume: Math.max(0, Math.min(1, volume)) })
      },

      setPlaybackRate: (rate: number) => {
        set({ playbackRate: Math.max(0.25, Math.min(2, rate)) })
      },

      setRepeatMode: (repeatMode: 'none' | 'single' | 'segment') => {
        set({ repeatMode })
      },

      seekTo: (time: number) => {
        const { currentSession } = get()
        if (!currentSession) return

        const clampedTime = Math.max(0, Math.min(time, currentSession.duration))
        set({
          currentSession: {
            ...currentSession,
            currentTime: clampedTime,
            lastActiveAt: new Date().toISOString(),
          },
        })
      },
    }),
    {
      name: 'enjoy-player',
      // Only persist specific fields
      partialize: (state) => ({
        volume: state.volume,
        playbackRate: state.playbackRate,
        repeatMode: state.repeatMode,
        recentSession: state.recentSession,
      }),
    }
  )
)
