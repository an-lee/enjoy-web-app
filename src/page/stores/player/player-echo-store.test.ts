/**
 * Tests for Player Echo Store
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { usePlayerEchoStore } from './player-echo-store'

describe('Player Echo Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    usePlayerEchoStore.setState({
      echoModeActive: false,
      echoStartLineIndex: -1,
      echoEndLineIndex: -1,
      echoStartTime: -1,
      echoEndTime: -1,
    })
  })

  describe('Initial State', () => {
    it('should have correct default values', () => {
      const state = usePlayerEchoStore.getState()
      expect(state.echoModeActive).toBe(false)
      expect(state.echoStartLineIndex).toBe(-1)
      expect(state.echoEndLineIndex).toBe(-1)
      expect(state.echoStartTime).toBe(-1)
      expect(state.echoEndTime).toBe(-1)
    })
  })

  describe('Echo Mode Activation', () => {
    it('should activate echo mode', () => {
      usePlayerEchoStore.getState().activateEchoMode(5, 10, 25, 35)

      const state = usePlayerEchoStore.getState()
      expect(state.echoModeActive).toBe(true)
      expect(state.echoStartLineIndex).toBe(5)
      expect(state.echoEndLineIndex).toBe(10)
      expect(state.echoStartTime).toBe(25)
      expect(state.echoEndTime).toBe(35)
    })

    it('should activate echo mode with single line', () => {
      usePlayerEchoStore.getState().activateEchoMode(7, 7, 30, 35)

      const state = usePlayerEchoStore.getState()
      expect(state.echoModeActive).toBe(true)
      expect(state.echoStartLineIndex).toBe(7)
      expect(state.echoEndLineIndex).toBe(7)
      expect(state.echoStartTime).toBe(30)
      expect(state.echoEndTime).toBe(35)
    })
  })

  describe('Echo Mode Deactivation', () => {
    it('should deactivate echo mode', () => {
      usePlayerEchoStore.getState().activateEchoMode(5, 10, 25, 35)
      usePlayerEchoStore.getState().deactivateEchoMode()

      const state = usePlayerEchoStore.getState()
      expect(state.echoModeActive).toBe(false)
      expect(state.echoStartLineIndex).toBe(-1)
      expect(state.echoEndLineIndex).toBe(-1)
      expect(state.echoStartTime).toBe(-1)
      expect(state.echoEndTime).toBe(-1)
    })
  })

  describe('Echo Region Updates', () => {
    it('should update echo region', () => {
      usePlayerEchoStore.getState().activateEchoMode(5, 10, 25, 35)
      usePlayerEchoStore.getState().updateEchoRegion(7, 12, 30, 40)

      const state = usePlayerEchoStore.getState()
      expect(state.echoModeActive).toBe(true) // Should remain active
      expect(state.echoStartLineIndex).toBe(7)
      expect(state.echoEndLineIndex).toBe(12)
      expect(state.echoStartTime).toBe(30)
      expect(state.echoEndTime).toBe(40)
    })

    it('should update echo region without activating', () => {
      usePlayerEchoStore.getState().updateEchoRegion(3, 8, 20, 30)

      const state = usePlayerEchoStore.getState()
      expect(state.echoModeActive).toBe(false) // Should remain inactive
      expect(state.echoStartLineIndex).toBe(3)
      expect(state.echoEndLineIndex).toBe(8)
      expect(state.echoStartTime).toBe(20)
      expect(state.echoEndTime).toBe(30)
    })
  })
})

