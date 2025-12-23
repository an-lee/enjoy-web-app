/**
 * Tests for Player UI Store
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { usePlayerUIStore } from './player-ui-store'

describe('Player UI Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    usePlayerUIStore.setState({
      mode: 'mini',
      isPlaying: false,
      isTranscribing: false,
    })
  })

  describe('Initial State', () => {
    it('should have correct default values', () => {
      const state = usePlayerUIStore.getState()
      expect(state.mode).toBe('mini')
      expect(state.isPlaying).toBe(false)
      expect(state.isTranscribing).toBe(false)
    })
  })

  describe('Mode Management', () => {
    it('should expand player', () => {
      usePlayerUIStore.getState().expand()
      expect(usePlayerUIStore.getState().mode).toBe('expanded')
    })

    it('should collapse player', () => {
      usePlayerUIStore.setState({ mode: 'expanded' })
      usePlayerUIStore.getState().collapse()
      expect(usePlayerUIStore.getState().mode).toBe('mini')
    })

    it('should hide player', () => {
      usePlayerUIStore.setState({ mode: 'expanded', isPlaying: true })
      usePlayerUIStore.getState().hide()
      const state = usePlayerUIStore.getState()
      expect(state.mode).toBe('mini')
      expect(state.isPlaying).toBe(false)
    })
  })

  describe('Playback State', () => {
    it('should set playing state', () => {
      usePlayerUIStore.getState().setPlaying(true)
      expect(usePlayerUIStore.getState().isPlaying).toBe(true)
    })

    it('should set paused state', () => {
      usePlayerUIStore.setState({ isPlaying: true })
      usePlayerUIStore.getState().setPlaying(false)
      expect(usePlayerUIStore.getState().isPlaying).toBe(false)
    })
  })

  describe('Transcription State', () => {
    it('should set transcribing state', () => {
      usePlayerUIStore.getState().setTranscribing(true)
      expect(usePlayerUIStore.getState().isTranscribing).toBe(true)
    })

    it('should clear transcribing state', () => {
      usePlayerUIStore.setState({ isTranscribing: true })
      usePlayerUIStore.getState().setTranscribing(false)
      expect(usePlayerUIStore.getState().isTranscribing).toBe(false)
    })
  })
})

