/**
 * Tests for Player Transcription Store
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { usePlayerTranscriptionStore } from './player-transcription-store'

describe('Player Transcription Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    usePlayerTranscriptionStore.setState({
      isTranscribing: false,
      transcribeProgress: null,
      transcribeProgressPercent: null,
    })
  })

  describe('Initial State', () => {
    it('should have correct default values', () => {
      const state = usePlayerTranscriptionStore.getState()
      expect(state.isTranscribing).toBe(false)
      expect(state.transcribeProgress).toBeNull()
      expect(state.transcribeProgressPercent).toBeNull()
    })
  })

  describe('Transcription State Management', () => {
    it('should set transcribing state', () => {
      usePlayerTranscriptionStore.getState().setTranscribing(true)
      expect(usePlayerTranscriptionStore.getState().isTranscribing).toBe(true)
    })

    it('should clear transcribing state', () => {
      usePlayerTranscriptionStore.setState({ isTranscribing: true })
      usePlayerTranscriptionStore.getState().setTranscribing(false)
      expect(usePlayerTranscriptionStore.getState().isTranscribing).toBe(false)
    })
  })

  describe('Progress Management', () => {
    it('should set progress with message and percent', () => {
      usePlayerTranscriptionStore
        .getState()
        .setTranscribeProgress('Loading media...', 10)

      const state = usePlayerTranscriptionStore.getState()
      expect(state.transcribeProgress).toBe('Loading media...')
      expect(state.transcribeProgressPercent).toBe(10)
    })

    it('should set progress with message only', () => {
      usePlayerTranscriptionStore.getState().setTranscribeProgress('Processing...', null)

      const state = usePlayerTranscriptionStore.getState()
      expect(state.transcribeProgress).toBe('Processing...')
      expect(state.transcribeProgressPercent).toBeNull()
    })

    it('should clear progress', () => {
      usePlayerTranscriptionStore
        .getState()
        .setTranscribeProgress('Loading...', 50)
      usePlayerTranscriptionStore.getState().clearTranscribeState()

      const state = usePlayerTranscriptionStore.getState()
      expect(state.isTranscribing).toBe(false)
      expect(state.transcribeProgress).toBeNull()
      expect(state.transcribeProgressPercent).toBeNull()
    })
  })

  describe('Clear State', () => {
    it('should clear all transcription state', () => {
      usePlayerTranscriptionStore.setState({
        isTranscribing: true,
        transcribeProgress: 'Transcribing...',
        transcribeProgressPercent: 75,
      })

      usePlayerTranscriptionStore.getState().clearTranscribeState()

      const state = usePlayerTranscriptionStore.getState()
      expect(state.isTranscribing).toBe(false)
      expect(state.transcribeProgress).toBeNull()
      expect(state.transcribeProgressPercent).toBeNull()
    })
  })
})

