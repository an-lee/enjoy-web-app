/**
 * Tests for Player Session Store
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { usePlayerSessionStore } from './player-session-store'
import type { PlaybackSession } from './types'

describe('Player Session Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    usePlayerSessionStore.setState({
      currentSession: null,
      currentEchoSessionId: null,
    })
  })

  describe('Initial State', () => {
    it('should have correct default values', () => {
      const state = usePlayerSessionStore.getState()
      expect(state.currentSession).toBeNull()
      expect(state.currentEchoSessionId).toBeNull()
    })
  })

  describe('Session Management', () => {
    it('should set session', () => {
      const session: PlaybackSession = {
        mediaId: 'test-media-1',
        mediaType: 'audio',
        mediaTitle: 'Test Audio',
        duration: 120,
        currentTime: 0,
        currentSegmentIndex: 0,
        language: 'en',
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }

      usePlayerSessionStore.getState().setSession(session, 'echo-session-1')

      const state = usePlayerSessionStore.getState()
      expect(state.currentSession).toEqual(session)
      expect(state.currentEchoSessionId).toBe('echo-session-1')
    })

    it('should clear session', () => {
      const session: PlaybackSession = {
        mediaId: 'test-media-1',
        mediaType: 'audio',
        mediaTitle: 'Test Audio',
        duration: 120,
        currentTime: 0,
        currentSegmentIndex: 0,
        language: 'en',
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }

      usePlayerSessionStore.getState().setSession(session, 'echo-session-1')
      usePlayerSessionStore.getState().clearSession()

      const state = usePlayerSessionStore.getState()
      expect(state.currentSession).toBeNull()
      expect(state.currentEchoSessionId).toBeNull()
    })
  })

  describe('Progress Updates', () => {
    it('should update progress', () => {
      const session: PlaybackSession = {
        mediaId: 'test-media-1',
        mediaType: 'audio',
        mediaTitle: 'Test Audio',
        duration: 120,
        currentTime: 0,
        currentSegmentIndex: 0,
        language: 'en',
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }

      usePlayerSessionStore.getState().setSession(session, 'echo-session-1')
      usePlayerSessionStore.getState().updateProgress(30.5, 5)

      const state = usePlayerSessionStore.getState()
      expect(state.currentSession?.currentTime).toBe(30.5)
      expect(state.currentSession?.currentSegmentIndex).toBe(5)
    })

    it('should not update if no session exists', () => {
      usePlayerSessionStore.getState().updateProgress(30.5, 5)
      expect(usePlayerSessionStore.getState().currentSession).toBeNull()
    })

    it('should update only currentTime if segmentIndex not provided', () => {
      const session: PlaybackSession = {
        mediaId: 'test-media-1',
        mediaType: 'audio',
        mediaTitle: 'Test Audio',
        duration: 120,
        currentTime: 0,
        currentSegmentIndex: 0,
        language: 'en',
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }

      usePlayerSessionStore.getState().setSession(session, 'echo-session-1')
      usePlayerSessionStore.getState().updateProgress(45.2)

      const state = usePlayerSessionStore.getState()
      expect(state.currentSession?.currentTime).toBe(45.2)
      expect(state.currentSession?.currentSegmentIndex).toBe(0) // Unchanged
    })
  })
})

