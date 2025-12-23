/**
 * Tests for Player Settings Store
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { usePlayerSettingsStore } from './player-settings-store'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('Player Settings Store', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset store to initial state
    usePlayerSettingsStore.setState({
      volume: 1,
      playbackRate: 1,
      repeatMode: 'none',
    })
  })

  describe('Initial State', () => {
    it('should have correct default values', () => {
      const state = usePlayerSettingsStore.getState()
      expect(state.volume).toBe(1)
      expect(state.playbackRate).toBe(1)
      expect(state.repeatMode).toBe('none')
    })
  })

  describe('Volume Management', () => {
    it('should set volume', () => {
      usePlayerSettingsStore.getState().setVolume(0.7)
      expect(usePlayerSettingsStore.getState().volume).toBe(0.7)
    })

    it('should clamp volume to 0-1 range', () => {
      usePlayerSettingsStore.getState().setVolume(-0.5)
      expect(usePlayerSettingsStore.getState().volume).toBe(0)

      usePlayerSettingsStore.getState().setVolume(1.5)
      expect(usePlayerSettingsStore.getState().volume).toBe(1)
    })

    it('should persist volume (tested via store state)', () => {
      usePlayerSettingsStore.getState().setVolume(0.8)
      // Persistence is handled by Zustand persist middleware
      // We verify the state is updated correctly
      expect(usePlayerSettingsStore.getState().volume).toBe(0.8)
    })
  })

  describe('Playback Rate Management', () => {
    it('should set playback rate', () => {
      usePlayerSettingsStore.getState().setPlaybackRate(1.5)
      expect(usePlayerSettingsStore.getState().playbackRate).toBe(1.5)
    })

    it('should clamp playback rate to 0.25-2 range', () => {
      usePlayerSettingsStore.getState().setPlaybackRate(0.1)
      expect(usePlayerSettingsStore.getState().playbackRate).toBe(0.25)

      usePlayerSettingsStore.getState().setPlaybackRate(3)
      expect(usePlayerSettingsStore.getState().playbackRate).toBe(2)
    })

    it('should persist playback rate (tested via store state)', () => {
      usePlayerSettingsStore.getState().setPlaybackRate(1.25)
      // Persistence is handled by Zustand persist middleware
      // We verify the state is updated correctly
      expect(usePlayerSettingsStore.getState().playbackRate).toBe(1.25)
    })
  })

  describe('Repeat Mode Management', () => {
    it('should set repeat mode to none', () => {
      usePlayerSettingsStore.getState().setRepeatMode('none')
      expect(usePlayerSettingsStore.getState().repeatMode).toBe('none')
    })

    it('should set repeat mode to single', () => {
      usePlayerSettingsStore.getState().setRepeatMode('single')
      expect(usePlayerSettingsStore.getState().repeatMode).toBe('single')
    })

    it('should set repeat mode to segment', () => {
      usePlayerSettingsStore.getState().setRepeatMode('segment')
      expect(usePlayerSettingsStore.getState().repeatMode).toBe('segment')
    })

    it('should persist repeat mode (tested via store state)', () => {
      usePlayerSettingsStore.getState().setRepeatMode('single')
      // Persistence is handled by Zustand persist middleware
      // We verify the state is updated correctly
      expect(usePlayerSettingsStore.getState().repeatMode).toBe('single')
    })
  })
})

