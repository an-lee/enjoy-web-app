/**
 * Player Store - Global playback state management with EchoSession persistence
 *
 * Manages:
 * - Current playback session (media, progress, state)
 * - Playback settings (volume, speed)
 * - Player UI state (expanded/collapsed)
 * - Automatic persistence via EchoSession in database
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LibraryMedia } from '@/page/hooks/queries'
import {
  getOrCreateActiveEchoSession,
  updateEchoSessionProgress,
  getEchoSessionById,
} from '@/page/db'
import { syncTranscriptsForTarget } from '@/page/db/services/sync-manager'
import type { TargetType } from '@/page/types/db'
import { createLogger } from '@/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'player-store' })

// ============================================================================
// Types
// ============================================================================

export type PlayerMode = 'hidden' | 'mini' | 'expanded'

/**
 * Playback session - represents a media being played
 * This is a lightweight in-memory representation
 * Full state is persisted in EchoSession database
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

  /** Current EchoSession ID (for database persistence) */
  currentEchoSessionId: string | null

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
  // Echo Mode State (for shadow reading practice)
  // ============================================================================

  /** Whether echo mode is currently active */
  echoModeActive: boolean

  /** Start line index of echo region */
  echoStartLineIndex: number

  /** End line index of echo region */
  echoEndLineIndex: number

  /** Start time of echo region in seconds */
  echoStartTime: number

  /** End time of echo region in seconds */
  echoEndTime: number

  // ============================================================================
  // Media Controls (internal - registered by PlayerContainer)
  // ============================================================================

  /** Media control functions (internal use only) */
  _mediaControls: {
    seek: (time: number) => void
    play: () => Promise<void>
    pause: () => void
    getCurrentTime: () => number
    isPaused: () => boolean
  } | null

  // ============================================================================
  // Recording Controls (internal - registered by ShadowRecording component)
  // ============================================================================

  /** Recording control functions (internal use only) */
  _recordingControls: {
    startRecording: () => Promise<void>
    stopRecording: () => Promise<void>
    isRecording: () => boolean
  } | null

  /** Recording player control functions (internal use only) */
  _recordingPlayerControls: {
    togglePlayback: () => void
    isPlaying: () => boolean
  } | null

  // ============================================================================
  // Actions
  // ============================================================================

  /** Load a media item and start playback (async - loads/creates EchoSession) */
  loadMedia: (media: LibraryMedia) => Promise<void>

  /** Update playback progress (with debounced save to database) */
  updateProgress: (currentTime: number, segmentIndex?: number) => void

  /** Set playing state */
  setPlaying: (playing: boolean) => void

  /** Toggle play/pause */
  togglePlay: () => void

  /** Clear current session */
  clearSession: () => void

  /** Expand player to full mode */
  expand: () => void

  /** Collapse player to mini mode */
  collapse: () => void

  /** Hide player completely */
  hide: () => void

  /** Set volume (0-1) and save to database */
  setVolume: (volume: number) => void

  /** Set playback rate (0.25-2) and save to database */
  setPlaybackRate: (rate: number) => void

  /** Set repeat mode */
  setRepeatMode: (mode: 'none' | 'single' | 'segment') => void

  /** Seek to a specific time and save to database */
  seekTo: (time: number) => void

  // ============================================================================
  // Echo Mode Actions
  // ============================================================================

  /** Activate echo mode with a region and save to database */
  activateEchoMode: (
    startLineIndex: number,
    endLineIndex: number,
    startTime: number,
    endTime: number
  ) => void

  /** Deactivate echo mode */
  deactivateEchoMode: () => void

  /** Update echo region boundaries and save to database */
  updateEchoRegion: (
    startLineIndex: number,
    endLineIndex: number,
    startTime: number,
    endTime: number
  ) => void

  // ============================================================================
  // Media Controls Actions
  // ============================================================================

  /** Register media control functions */
  registerMediaControls: (controls: {
    seek: (time: number) => void
    play: () => Promise<void>
    pause: () => void
    getCurrentTime: () => number
    isPaused: () => boolean
  }) => void

  /** Unregister media control functions */
  unregisterMediaControls: () => void

  // ============================================================================
  // Recording Actions
  // ============================================================================

  /** Register recording control functions */
  registerRecordingControls: (controls: {
    startRecording: () => Promise<void>
    stopRecording: () => Promise<void>
    isRecording: () => boolean
  }) => void

  /** Unregister recording control functions */
  unregisterRecordingControls: () => void

  /** Toggle recording (start/stop) */
  toggleRecording: () => Promise<void>

  // ============================================================================
  // Recording Player Actions
  // ============================================================================

  /** Register recording player control functions */
  registerRecordingPlayerControls: (controls: {
    togglePlayback: () => void
    isPlaying: () => boolean
  }) => void

  /** Unregister recording player control functions */
  unregisterRecordingPlayerControls: () => void

  /** Toggle recording playback (play/pause) */
  toggleRecordingPlayback: () => void
}

// ============================================================================
// Debounce utility for progress updates
// ============================================================================

let progressUpdateTimer: ReturnType<typeof setTimeout> | null = null
const PROGRESS_UPDATE_DEBOUNCE_MS = 2000 // 2 seconds

function debouncedSaveProgress(echoSessionId: string, currentTime: number) {
  if (progressUpdateTimer) {
    clearTimeout(progressUpdateTimer)
  }

  progressUpdateTimer = setTimeout(async () => {
    try {
      await updateEchoSessionProgress(echoSessionId, {
        currentTime,
      })
      log.debug('Progress saved to EchoSession', { echoSessionId, currentTime })
    } catch (error) {
      log.error('Failed to save progress to EchoSession:', error)
    }
  }, PROGRESS_UPDATE_DEBOUNCE_MS)
}

// ============================================================================
// Helper: Convert media type to TargetType
// ============================================================================

function mediaTypeToTargetType(mediaType: 'audio' | 'video'): TargetType {
  return mediaType === 'audio' ? 'Audio' : 'Video'
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
      currentEchoSessionId: null,

      // Initial playback settings
      volume: 1,
      playbackRate: 1,
      repeatMode: 'none',

      // Initial echo mode state
      echoModeActive: false,
      echoStartLineIndex: -1,
      echoEndLineIndex: -1,
      echoStartTime: -1,
      echoEndTime: -1,

      // Media controls (registered by PlayerContainer component)
      _mediaControls: null as {
        seek: (time: number) => void
        play: () => Promise<void>
        pause: () => void
        getCurrentTime: () => number
        isPaused: () => boolean
      } | null,

      // Recording controls (registered by ShadowRecording component)
      _recordingControls: null as {
        startRecording: () => Promise<void>
        stopRecording: () => Promise<void>
        isRecording: () => boolean
      } | null,

      // Recording player controls (registered by RecordingPlayer component)
      _recordingPlayerControls: null as {
        togglePlayback: () => void
        isPlaying: () => boolean
      } | null,

      // Actions
      loadMedia: async (media: LibraryMedia) => {
        try {
          const targetType = mediaTypeToTargetType(media.type)
          const state = get()

          // Get or create active EchoSession for this media
          const echoSessionId = await getOrCreateActiveEchoSession(
            targetType,
            media.id,
            media.language,
            {
              currentTime: 0, // Will be overridden if session exists
              playbackRate: state.playbackRate,
              volume: state.volume,
            }
          )

          // Load the EchoSession to get persisted state
          const echoSession = await getEchoSessionById(echoSessionId)
          if (!echoSession) {
            log.error('Failed to load EchoSession after creation', {
              echoSessionId,
            })
            return
          }

          // Create PlaybackSession from EchoSession
          const newSession: PlaybackSession = {
            mediaId: media.id,
            mediaType: media.type,
            mediaTitle: media.title,
            thumbnailUrl: media.thumbnailUrl,
            duration: media.duration,
            currentTime: echoSession.currentTime,
            currentSegmentIndex: 0, // Not persisted, always start at 0
            language: echoSession.language,
            transcriptId: echoSession.transcriptId,
            startedAt: echoSession.startedAt,
            lastActiveAt: echoSession.lastActiveAt,
          }

          // Restore playback settings from EchoSession
          const restoredPlaybackRate = echoSession.playbackRate ?? state.playbackRate
          const restoredVolume = echoSession.volume ?? state.volume

          // Restore echo mode state if exists
          const hasEchoRegion =
            echoSession.echoStartTime !== undefined &&
            echoSession.echoEndTime !== undefined &&
            echoSession.echoStartTime >= 0 &&
            echoSession.echoEndTime >= 0

          // Handle currentTime outside echo region
          let restoredCurrentTime = echoSession.currentTime
          if (hasEchoRegion && echoSession.echoStartTime !== undefined && echoSession.echoEndTime !== undefined) {
            // Clamp currentTime to echo region if it's outside
            if (restoredCurrentTime < echoSession.echoStartTime) {
              restoredCurrentTime = echoSession.echoStartTime
              log.debug('CurrentTime before echo region, clamping to start', {
                originalTime: echoSession.currentTime,
                clampedTime: restoredCurrentTime,
              })
            } else if (restoredCurrentTime >= echoSession.echoEndTime) {
              restoredCurrentTime = echoSession.echoStartTime
              log.debug('CurrentTime at or after echo region end, resetting to start', {
                originalTime: echoSession.currentTime,
                resetTime: restoredCurrentTime,
              })
            }
          }

          // Update session with potentially adjusted currentTime
          const finalSession: PlaybackSession = {
            ...newSession,
            currentTime: restoredCurrentTime,
          }

          set({
            currentSession: finalSession,
            currentEchoSessionId: echoSessionId,
            mode: 'expanded',
            isPlaying: true,
            playbackRate: restoredPlaybackRate,
            volume: restoredVolume,
            echoModeActive: hasEchoRegion,
            echoStartTime: echoSession.echoStartTime ?? -1,
            echoEndTime: echoSession.echoEndTime ?? -1,
            // Note: echoStartLineIndex and echoEndLineIndex are not persisted
            // They will be recalculated from echoStartTime/echoEndTime when transcript loads
          })

          // If currentTime was adjusted, save it to database
          if (restoredCurrentTime !== echoSession.currentTime) {
            try {
              await updateEchoSessionProgress(echoSessionId, {
                currentTime: restoredCurrentTime,
              })
              log.debug('Saved adjusted currentTime to EchoSession', {
                echoSessionId,
                adjustedTime: restoredCurrentTime,
              })
            } catch (error) {
              log.error('Failed to save adjusted currentTime to EchoSession:', error)
            }
          }

          log.debug('Media loaded with EchoSession', {
            mediaId: media.id,
            echoSessionId,
            currentTime: echoSession.currentTime,
          })

          // Sync transcripts for this target in background (non-blocking)
          syncTranscriptsForTarget(targetType, media.id, { background: true }).catch((error) => {
            log.error('Failed to sync transcripts for target:', error)
            // Don't block media loading if transcript sync fails
          })
        } catch (error) {
          log.error('Failed to load media:', error)
          // Don't update state on error - keep previous session
        }
      },

      updateProgress: (currentTime: number, segmentIndex?: number) => {
        const { currentSession, currentEchoSessionId } = get()
        if (!currentSession) return

        // Update in-memory state immediately
        set({
          currentSession: {
            ...currentSession,
            currentTime,
            currentSegmentIndex: segmentIndex ?? currentSession.currentSegmentIndex,
            lastActiveAt: new Date().toISOString(),
          },
        })

        // Debounced save to database
        if (currentEchoSessionId) {
          debouncedSaveProgress(currentEchoSessionId, currentTime)
        }
      },

      setPlaying: (playing: boolean) => {
        set({ isPlaying: playing })
      },

      togglePlay: () => {
        set((state) => ({ isPlaying: !state.isPlaying }))
      },

      clearSession: () => {
        // Clear debounce timer
        if (progressUpdateTimer) {
          clearTimeout(progressUpdateTimer)
          progressUpdateTimer = null
        }

        set({
          currentSession: null,
          currentEchoSessionId: null,
          mode: 'hidden',
          isPlaying: false,
          echoModeActive: false,
          echoStartLineIndex: -1,
          echoEndLineIndex: -1,
          echoStartTime: -1,
          echoEndTime: -1,
        })
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
        // Clear session (which will also clear echoSessionId)
        get().clearSession()
      },

      setVolume: async (volume: number) => {
        const clampedVolume = Math.max(0, Math.min(1, volume))
        set({ volume: clampedVolume })

        // Save to database immediately
        const { currentEchoSessionId } = get()
        if (currentEchoSessionId) {
          try {
            await updateEchoSessionProgress(currentEchoSessionId, {
              volume: clampedVolume,
            })
            log.debug('Volume saved to EchoSession', {
              echoSessionId: currentEchoSessionId,
              volume: clampedVolume,
            })
          } catch (error) {
            log.error('Failed to save volume to EchoSession:', error)
          }
        }
      },

      setPlaybackRate: async (rate: number) => {
        const clampedRate = Math.max(0.25, Math.min(2, rate))
        set({ playbackRate: clampedRate })

        // Save to database immediately
        const { currentEchoSessionId } = get()
        if (currentEchoSessionId) {
          try {
            await updateEchoSessionProgress(currentEchoSessionId, {
              playbackRate: clampedRate,
            })
            log.debug('Playback rate saved to EchoSession', {
              echoSessionId: currentEchoSessionId,
              playbackRate: clampedRate,
            })
          } catch (error) {
            log.error('Failed to save playback rate to EchoSession:', error)
          }
        }
      },

      setRepeatMode: (repeatMode: 'none' | 'single' | 'segment') => {
        set({ repeatMode })
        // Note: repeatMode is not persisted in EchoSession (it's a UI preference)
      },

      seekTo: async (time: number) => {
        const { currentSession, currentEchoSessionId } = get()
        if (!currentSession) return

        const clampedTime = Math.max(0, Math.min(time, currentSession.duration))

        // Update in-memory state immediately
        set({
          currentSession: {
            ...currentSession,
            currentTime: clampedTime,
            lastActiveAt: new Date().toISOString(),
          },
        })

        // Save to database immediately (seek is explicit user action)
        if (currentEchoSessionId) {
          try {
            await updateEchoSessionProgress(currentEchoSessionId, {
              currentTime: clampedTime,
            })
            log.debug('Seek saved to EchoSession', {
              echoSessionId: currentEchoSessionId,
              currentTime: clampedTime,
            })
          } catch (error) {
            log.error('Failed to save seek to EchoSession:', error)
          }
        }
      },

      // Echo mode actions
      activateEchoMode: async (
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

        // Save to database immediately
        const { currentEchoSessionId } = get()
        if (currentEchoSessionId) {
          try {
            await updateEchoSessionProgress(currentEchoSessionId, {
              echoStartTime: startTime,
              echoEndTime: endTime,
            })
            log.debug('Echo mode activated and saved to EchoSession', {
              echoSessionId: currentEchoSessionId,
              echoStartTime: startTime,
              echoEndTime: endTime,
            })
          } catch (error) {
            log.error('Failed to save echo mode to EchoSession:', error)
          }
        }
      },

      deactivateEchoMode: async () => {
        set({
          echoModeActive: false,
          echoStartLineIndex: -1,
          echoEndLineIndex: -1,
          echoStartTime: -1,
          echoEndTime: -1,
        })

        // Save to database immediately
        const { currentEchoSessionId } = get()
        if (currentEchoSessionId) {
          try {
            await updateEchoSessionProgress(currentEchoSessionId, {
              echoStartTime: undefined,
              echoEndTime: undefined,
            })
            log.debug('Echo mode deactivated and saved to EchoSession', {
              echoSessionId: currentEchoSessionId,
            })
          } catch (error) {
            log.error('Failed to save echo mode deactivation to EchoSession:', error)
          }
        }
      },

      updateEchoRegion: async (
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

        // Save to database immediately
        const { currentEchoSessionId } = get()
        if (currentEchoSessionId) {
          try {
            await updateEchoSessionProgress(currentEchoSessionId, {
              echoStartTime: startTime,
              echoEndTime: endTime,
            })
            log.debug('Echo region updated and saved to EchoSession', {
              echoSessionId: currentEchoSessionId,
              echoStartTime: startTime,
              echoEndTime: endTime,
            })
          } catch (error) {
            log.error('Failed to save echo region update to EchoSession:', error)
          }
        }
      },

      // Media Controls Actions
      registerMediaControls: (controls) => {
        set({ _mediaControls: controls })
        log.debug('Media controls registered')
      },

      unregisterMediaControls: () => {
        set({ _mediaControls: null })
        log.debug('Media controls unregistered')
      },

      // Recording Actions
      registerRecordingControls: (controls) => {
        set({ _recordingControls: controls })
        log.debug('Recording controls registered')
      },

      unregisterRecordingControls: () => {
        set({ _recordingControls: null })
        log.debug('Recording controls unregistered')
      },

      toggleRecording: async () => {
        const { _recordingControls, echoModeActive } = get()
        if (!_recordingControls || !echoModeActive) {
          log.debug('Cannot toggle recording: no controls registered or echo mode not active')
          return
        }

        const isRecording = _recordingControls.isRecording()
        if (isRecording) {
          await _recordingControls.stopRecording()
          log.debug('Recording stopped via shortcut')
        } else {
          await _recordingControls.startRecording()
          log.debug('Recording started via shortcut')
        }
      },

      // Recording Player Actions
      registerRecordingPlayerControls: (controls) => {
        set({ _recordingPlayerControls: controls })
        log.debug('Recording player controls registered')
      },

      unregisterRecordingPlayerControls: () => {
        set({ _recordingPlayerControls: null })
        log.debug('Recording player controls unregistered')
      },

      toggleRecordingPlayback: () => {
        const { _recordingPlayerControls, echoModeActive } = get()
        if (!_recordingPlayerControls || !echoModeActive) {
          log.debug('Cannot toggle recording playback: no player controls or echo mode not active')
          return
        }
        _recordingPlayerControls.togglePlayback()
        log.debug('Recording playback toggled via shortcut')
      },
    }),
    {
      name: 'enjoy-player',
      // Only persist playback settings (not session state - that's in EchoSession)
      partialize: (state) => ({
        volume: state.volume,
        playbackRate: state.playbackRate,
        repeatMode: state.repeatMode,
      }),
    }
  )
)
