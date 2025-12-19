/**
 * Tests for Player Store with EchoSession integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { LibraryMedia } from '@/page/hooks/queries'
import type { EchoSession, TargetType } from '@/page/types/db'

// Mock logger before importing store
vi.mock('@/lib/utils', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

// Mock shared logger
vi.mock('@/shared/lib/utils', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}))

// Mock database schema to prevent IndexedDB initialization
vi.mock('@/page/db/schema', () => ({
  db: {
    echoSessions: {
      get: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      where: vi.fn(),
    },
  },
  EnjoyDatabase: vi.fn(),
  initDatabase: vi.fn().mockResolvedValue(undefined),
}))

// Create in-memory data store for EchoSessions (hoisted so it's available in mock factory)
const echoSessionData = vi.hoisted(() => new Map<string, EchoSession>())

// Mock database operations - use vi.hoisted to ensure they're available in mock factory
const { getOrCreateActiveEchoSessionSpy, updateEchoSessionProgressSpy, getEchoSessionByIdSpy } = vi.hoisted(() => {
  const getOrCreateActiveEchoSessionSpy = vi.fn(
    async (
      targetType: TargetType,
      targetId: string,
      language: string,
      initialValues?: {
        currentTime?: number
        playbackRate?: number
        volume?: number
        transcriptId?: string
      }
    ): Promise<string> => {
      // Check if active session exists
      const existing = Array.from(echoSessionData.values()).find(
        (s) =>
          s.targetType === targetType &&
          s.targetId === targetId &&
          !s.completedAt
      )

      if (existing) {
        // Update lastActiveAt
        existing.lastActiveAt = new Date().toISOString()
        existing.updatedAt = new Date().toISOString()
        echoSessionData.set(existing.id, existing)
        return existing.id
      }

      // Create new session
      const now = new Date().toISOString()
      const id = `echo-session-${targetType}-${targetId}-${Date.now()}`
      const session: EchoSession = {
        id,
        targetType,
        targetId,
        language,
        currentTime: initialValues?.currentTime ?? 0,
        playbackRate: initialValues?.playbackRate ?? 1,
        volume: initialValues?.volume ?? 1,
        transcriptId: initialValues?.transcriptId,
        recordingsCount: 0,
        recordingsDuration: 0,
        startedAt: now,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      }
      echoSessionData.set(id, session)
      return id
    }
  )

  const updateEchoSessionProgressSpy = vi.fn(
    async (
      id: string,
      progress: {
        currentTime?: number
        playbackRate?: number
        volume?: number
        echoStartTime?: number
        echoEndTime?: number
        transcriptId?: string
      }
    ): Promise<void> => {
      const session = echoSessionData.get(id)
      if (!session) return

      const now = new Date().toISOString()
      echoSessionData.set(id, {
        ...session,
        ...progress,
        lastActiveAt: now,
        updatedAt: now,
      })
    }
  )

  const getEchoSessionByIdSpy = vi.fn(async (id: string): Promise<EchoSession | undefined> => {
    return echoSessionData.get(id)
  })

  return {
    getOrCreateActiveEchoSessionSpy,
    updateEchoSessionProgressSpy,
    getEchoSessionByIdSpy,
  }
})

vi.mock('@/page/db', () => {
  return {
    getOrCreateActiveEchoSession: getOrCreateActiveEchoSessionSpy,
    updateEchoSessionProgress: updateEchoSessionProgressSpy,
    getEchoSessionById: getEchoSessionByIdSpy,
  }
})

vi.mock('@/page/db/services/sync-manager', () => ({
  syncTranscriptsForTarget: vi.fn().mockResolvedValue({
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  }),
}))

// Import store after mocking
import { usePlayerStore } from './player'

// ============================================================================
// Test Utilities
// ============================================================================

function createTestMedia(overrides: Partial<LibraryMedia> = {}): LibraryMedia {
  return {
    id: 'test-media-1',
    type: 'audio',
    title: 'Test Audio',
    duration: 120, // 2 minutes
    language: 'en',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function waitForDebounce(ms: number = 2500) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================================================
// Tests
// ============================================================================

describe('Player Store with EchoSession Integration', () => {
  beforeEach(() => {
    // Clear all data
    echoSessionData.clear()
    localStorage.clear()

    // Reset store to initial state
    usePlayerStore.setState({
      mode: 'hidden',
      isPlaying: false,
      currentSession: null,
      currentEchoSessionId: null,
      volume: 1,
      playbackRate: 1,
      repeatMode: 'none',
      echoModeActive: false,
      echoStartLineIndex: -1,
      echoEndLineIndex: -1,
      echoStartTime: -1,
      echoEndTime: -1,
    })

    // Clear all mocks (spies already have default implementations from mock factory)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct default values', () => {
      const state = usePlayerStore.getState()
      expect(state.mode).toBe('hidden')
      expect(state.isPlaying).toBe(false)
      expect(state.currentSession).toBeNull()
      expect(state.currentEchoSessionId).toBeNull()
      expect(state.volume).toBe(1)
      expect(state.playbackRate).toBe(1)
      expect(state.repeatMode).toBe('none')
    })
  })

  describe('loadMedia', () => {
    it('should create new EchoSession for first-time media', async () => {
      const media = createTestMedia()

      await usePlayerStore.getState().loadMedia(media)

      const state = usePlayerStore.getState()
      expect(state.currentSession).toBeTruthy()
      expect(state.currentSession?.mediaId).toBe(media.id)
      expect(state.currentSession?.currentTime).toBe(0)
      expect(state.currentEchoSessionId).toBeTruthy()
      expect(state.mode).toBe('expanded')
      expect(state.isPlaying).toBe(true)

      // Verify EchoSession was created
      expect(getOrCreateActiveEchoSessionSpy).toHaveBeenCalledWith(
        'Audio',
        media.id,
        media.language,
        expect.objectContaining({
          currentTime: 0,
        })
      )
    })

    it('should restore state from existing EchoSession', async () => {
      const media = createTestMedia()
      const now = new Date().toISOString()

      // Create existing EchoSession
      const existingSession: EchoSession = {
        id: 'existing-session-1',
        targetType: 'Audio',
        targetId: media.id,
        language: media.language,
        currentTime: 45.5, // Restored position
        playbackRate: 1.5, // Restored speed
        volume: 0.8, // Restored volume
        recordingsCount: 5,
        recordingsDuration: 10000,
        startedAt: now,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      }
      echoSessionData.set(existingSession.id, existingSession)

      // getOrCreateActiveEchoSession will automatically find and return existing session
      await usePlayerStore.getState().loadMedia(media)

      const state = usePlayerStore.getState()
      expect(state.currentSession?.currentTime).toBe(45.5)
      expect(state.playbackRate).toBe(1.5)
      expect(state.volume).toBe(0.8)
      expect(state.currentEchoSessionId).toBe(existingSession.id)
    })

    it('should restore echo mode region from EchoSession', async () => {
      const media = createTestMedia()
      const now = new Date().toISOString()

      const existingSession: EchoSession = {
        id: 'session-with-echo',
        targetType: 'Audio',
        targetId: media.id,
        language: media.language,
        currentTime: 30,
        playbackRate: 1,
        volume: 1,
        echoStartTime: 25,
        echoEndTime: 35,
        recordingsCount: 0,
        recordingsDuration: 0,
        startedAt: now,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      }
      echoSessionData.set(existingSession.id, existingSession)

      await usePlayerStore.getState().loadMedia(media)

      const state = usePlayerStore.getState()
      expect(state.echoModeActive).toBe(true)
      expect(state.echoStartTime).toBe(25)
      expect(state.echoEndTime).toBe(35)
    })

    it('should use store defaults when EchoSession has no echo region', async () => {
      const media = createTestMedia()
      const now = new Date().toISOString()

      const existingSession: EchoSession = {
        id: 'session-no-echo',
        targetType: 'Audio',
        targetId: media.id,
        language: media.language,
        currentTime: 30,
        playbackRate: 1,
        volume: 1,
        recordingsCount: 0,
        recordingsDuration: 0,
        startedAt: now,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      }
      echoSessionData.set(existingSession.id, existingSession)

      await usePlayerStore.getState().loadMedia(media)

      const state = usePlayerStore.getState()
      expect(state.echoModeActive).toBe(false)
      expect(state.echoStartTime).toBe(-1)
      expect(state.echoEndTime).toBe(-1)
    })

    it('should handle video media type', async () => {
      const media = createTestMedia({ type: 'video' })

      await usePlayerStore.getState().loadMedia(media)

      expect(getOrCreateActiveEchoSessionSpy).toHaveBeenCalledWith(
        'Video',
        media.id,
        media.language,
        expect.any(Object)
      )
    })

    it('should not update state on error', async () => {
      const media = createTestMedia()
      getOrCreateActiveEchoSessionSpy.mockRejectedValueOnce(
        new Error('Database error')
      )

      const initialState = usePlayerStore.getState()

      await usePlayerStore.getState().loadMedia(media)

      // State should remain unchanged
      const state = usePlayerStore.getState()
      expect(state.currentSession).toBe(initialState.currentSession)
      expect(state.currentEchoSessionId).toBe(initialState.currentEchoSessionId)
    })
  })

  describe('updateProgress', () => {
    it('should update in-memory state immediately', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)

      usePlayerStore.getState().updateProgress(30.5, 5)

      const state = usePlayerStore.getState()
      expect(state.currentSession?.currentTime).toBe(30.5)
      expect(state.currentSession?.currentSegmentIndex).toBe(5)
    })

    it('should debounce database save', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)
      const echoSessionId = usePlayerStore.getState().currentEchoSessionId!

      // Update progress multiple times quickly
      usePlayerStore.getState().updateProgress(10, 1)
      usePlayerStore.getState().updateProgress(20, 2)
      usePlayerStore.getState().updateProgress(30, 3)

      // Should not be called immediately
      expect(updateEchoSessionProgressSpy).not.toHaveBeenCalled()

      // Wait for debounce
      await waitForDebounce()

      // Should be called once with final value
      expect(updateEchoSessionProgressSpy).toHaveBeenCalledTimes(1)
      expect(updateEchoSessionProgressSpy).toHaveBeenCalledWith(echoSessionId, {
        currentTime: 30,
      })
    })

    it('should not save if no EchoSession exists', () => {
      usePlayerStore.getState().updateProgress(10, 1)

      expect(updateEchoSessionProgressSpy).not.toHaveBeenCalled()
    })
  })

  describe('setVolume', () => {
    it('should update volume and save immediately', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)
      const echoSessionId = usePlayerStore.getState().currentEchoSessionId!

      await usePlayerStore.getState().setVolume(0.7)

      const state = usePlayerStore.getState()
      expect(state.volume).toBe(0.7)

      // Should save immediately (not debounced)
      expect(updateEchoSessionProgressSpy).toHaveBeenCalledWith(echoSessionId, {
        volume: 0.7,
      })
    })

    it('should clamp volume to valid range', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)

      await usePlayerStore.getState().setVolume(-0.5) // Below 0
      expect(usePlayerStore.getState().volume).toBe(0)

      await usePlayerStore.getState().setVolume(1.5) // Above 1
      expect(usePlayerStore.getState().volume).toBe(1)
    })
  })

  describe('setPlaybackRate', () => {
    it('should update playback rate and save immediately', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)
      const echoSessionId = usePlayerStore.getState().currentEchoSessionId!

      await usePlayerStore.getState().setPlaybackRate(1.5)

      const state = usePlayerStore.getState()
      expect(state.playbackRate).toBe(1.5)

      // Should save immediately
      expect(updateEchoSessionProgressSpy).toHaveBeenCalledWith(echoSessionId, {
        playbackRate: 1.5,
      })
    })

    it('should clamp playback rate to valid range', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)

      await usePlayerStore.getState().setPlaybackRate(0.1) // Below 0.25
      expect(usePlayerStore.getState().playbackRate).toBe(0.25)

      await usePlayerStore.getState().setPlaybackRate(3) // Above 2
      expect(usePlayerStore.getState().playbackRate).toBe(2)
    })
  })

  describe('seekTo', () => {
    it('should update position and save immediately', async () => {
      const media = createTestMedia({ duration: 120 })
      await usePlayerStore.getState().loadMedia(media)
      const echoSessionId = usePlayerStore.getState().currentEchoSessionId!

      await usePlayerStore.getState().seekTo(60)

      const state = usePlayerStore.getState()
      expect(state.currentSession?.currentTime).toBe(60)

      // Should save immediately (seek is explicit user action)
      expect(updateEchoSessionProgressSpy).toHaveBeenCalledWith(echoSessionId, {
        currentTime: 60,
      })
    })

    it('should clamp seek time to valid range', async () => {
      const media = createTestMedia({ duration: 120 })
      await usePlayerStore.getState().loadMedia(media)

      await usePlayerStore.getState().seekTo(-10) // Below 0
      expect(usePlayerStore.getState().currentSession?.currentTime).toBe(0)

      await usePlayerStore.getState().seekTo(150) // Above duration
      expect(usePlayerStore.getState().currentSession?.currentTime).toBe(120)
    })
  })

  describe('Echo Mode', () => {
    it('should activate echo mode and save to database', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)
      const echoSessionId = usePlayerStore.getState().currentEchoSessionId!

      await usePlayerStore.getState().activateEchoMode(5, 10, 25, 35)

      const state = usePlayerStore.getState()
      expect(state.echoModeActive).toBe(true)
      expect(state.echoStartLineIndex).toBe(5)
      expect(state.echoEndLineIndex).toBe(10)
      expect(state.echoStartTime).toBe(25)
      expect(state.echoEndTime).toBe(35)

      // Should save immediately
      expect(updateEchoSessionProgressSpy).toHaveBeenCalledWith(echoSessionId, {
        echoStartTime: 25,
        echoEndTime: 35,
      })
    })

    it('should deactivate echo mode and clear in database', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)
      const echoSessionId = usePlayerStore.getState().currentEchoSessionId!

      // First activate
      await usePlayerStore.getState().activateEchoMode(5, 10, 25, 35)
      vi.clearAllMocks()

      // Then deactivate
      await usePlayerStore.getState().deactivateEchoMode()

      const state = usePlayerStore.getState()
      expect(state.echoModeActive).toBe(false)
      expect(state.echoStartTime).toBe(-1)
      expect(state.echoEndTime).toBe(-1)

      // Should clear in database
      expect(updateEchoSessionProgressSpy).toHaveBeenCalledWith(echoSessionId, {
        echoStartTime: undefined,
        echoEndTime: undefined,
      })
    })

    it('should update echo region and save to database', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)
      const echoSessionId = usePlayerStore.getState().currentEchoSessionId!

      await usePlayerStore.getState().updateEchoRegion(7, 12, 30, 40)

      const state = usePlayerStore.getState()
      expect(state.echoStartLineIndex).toBe(7)
      expect(state.echoEndLineIndex).toBe(12)
      expect(state.echoStartTime).toBe(30)
      expect(state.echoEndTime).toBe(40)

      // Should save immediately
      expect(updateEchoSessionProgressSpy).toHaveBeenCalledWith(echoSessionId, {
        echoStartTime: 30,
        echoEndTime: 40,
      })
    })
  })

  describe('clearSession', () => {
    it('should clear all session state', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)

      usePlayerStore.getState().clearSession()

      const state = usePlayerStore.getState()
      expect(state.currentSession).toBeNull()
      expect(state.currentEchoSessionId).toBeNull()
      expect(state.mode).toBe('hidden')
      expect(state.isPlaying).toBe(false)
      expect(state.echoModeActive).toBe(false)
    })

    it('should clear debounce timer', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)

      // Start progress update
      usePlayerStore.getState().updateProgress(10, 1)

      // Clear session (should cancel debounce)
      usePlayerStore.getState().clearSession()

      // Wait for debounce time
      await waitForDebounce()

      // Should not have been called
      expect(updateEchoSessionProgressSpy).not.toHaveBeenCalled()
    })
  })

  describe('Single Active Session Guarantee', () => {
    it('should reuse existing active session when loading same media', async () => {
      const media = createTestMedia()
      const now = new Date().toISOString()

      // Create existing active session
      const existingSession: EchoSession = {
        id: 'existing-active-1',
        targetType: 'Audio',
        targetId: media.id,
        language: media.language,
        currentTime: 50,
        playbackRate: 1.2,
        volume: 0.9,
        recordingsCount: 3,
        recordingsDuration: 5000,
        startedAt: now,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      }
      echoSessionData.set(existingSession.id, existingSession)

      // Load media first time
      await usePlayerStore.getState().loadMedia(media)
      const firstSessionId = usePlayerStore.getState().currentEchoSessionId

      // Clear store state but keep EchoSession
      usePlayerStore.setState({
        currentSession: null,
        currentEchoSessionId: null,
      })

      // Load same media again
      await usePlayerStore.getState().loadMedia(media)
      const secondSessionId = usePlayerStore.getState().currentEchoSessionId

      // Should reuse the same session
      expect(firstSessionId).toBe(secondSessionId)
      expect(secondSessionId).toBe(existingSession.id)

      // Should restore state from existing session
      const state = usePlayerStore.getState()
      expect(state.currentSession?.currentTime).toBe(50)
      expect(state.playbackRate).toBe(1.2)
      expect(state.volume).toBe(0.9)
    })

    it('should create new session if previous was completed', async () => {
      const media = createTestMedia()
      const now = new Date().toISOString()

      // Create completed session
      const completedSession: EchoSession = {
        id: 'completed-session-1',
        targetType: 'Audio',
        targetId: media.id,
        language: media.language,
        currentTime: 120, // Finished
        playbackRate: 1,
        volume: 1,
        recordingsCount: 10,
        recordingsDuration: 20000,
        startedAt: now,
        lastActiveAt: now,
        completedAt: now, // Marked as completed
        createdAt: now,
        updatedAt: now,
      }
      echoSessionData.set(completedSession.id, completedSession)

      // Load media - should create new session
      await usePlayerStore.getState().loadMedia(media)
      const newSessionId = usePlayerStore.getState().currentEchoSessionId

      // Should be different from completed session
      expect(newSessionId).not.toBe(completedSession.id)
      expect(newSessionId).toBeTruthy()

      // New session should start from beginning
      const state = usePlayerStore.getState()
      expect(state.currentSession?.currentTime).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully in setVolume', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)

      updateEchoSessionProgressSpy.mockRejectedValueOnce(
        new Error('Database error')
      )

      // Should not throw
      await expect(
        usePlayerStore.getState().setVolume(0.5)
      ).resolves.not.toThrow()

      // State should still be updated
      expect(usePlayerStore.getState().volume).toBe(0.5)
    })

    it('should handle database errors gracefully in setPlaybackRate', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)

      updateEchoSessionProgressSpy.mockRejectedValueOnce(
        new Error('Database error')
      )

      await expect(
        usePlayerStore.getState().setPlaybackRate(1.5)
      ).resolves.not.toThrow()

      expect(usePlayerStore.getState().playbackRate).toBe(1.5)
    })
  })

  describe('UI State Management', () => {
    it('should expand player when loading media', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)

      expect(usePlayerStore.getState().mode).toBe('expanded')
      expect(usePlayerStore.getState().isPlaying).toBe(true)
    })

    it('should allow collapsing to mini mode', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)

      usePlayerStore.getState().collapse()

      expect(usePlayerStore.getState().mode).toBe('mini')
    })

    it('should allow expanding from mini mode', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)
      usePlayerStore.getState().collapse()

      usePlayerStore.getState().expand()

      expect(usePlayerStore.getState().mode).toBe('expanded')
    })

    it('should hide player and clear session', async () => {
      const media = createTestMedia()
      await usePlayerStore.getState().loadMedia(media)

      usePlayerStore.getState().hide()

      const state = usePlayerStore.getState()
      expect(state.mode).toBe('hidden')
      expect(state.currentSession).toBeNull()
      expect(state.isPlaying).toBe(false)
    })
  })
})

