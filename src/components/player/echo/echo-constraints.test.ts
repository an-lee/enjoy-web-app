import { describe, expect, it } from 'vitest'
import {
  clampSeekTimeToEchoWindow,
  decideEchoPlaybackTime,
  normalizeEchoWindow,
} from './echo-constraints'

describe('echo-constraints', () => {
  describe('normalizeEchoWindow', () => {
    it('returns null when inactive', () => {
      expect(
        normalizeEchoWindow({
          active: false,
          startTimeSeconds: 1,
          endTimeSeconds: 2,
          durationSeconds: 10,
        })
      ).toBeNull()
    })

    it('returns null for invalid values', () => {
      expect(
        normalizeEchoWindow({
          active: true,
          startTimeSeconds: Number.NaN,
          endTimeSeconds: 2,
          durationSeconds: 10,
        })
      ).toBeNull()
    })

    it('clamps to duration when provided and valid', () => {
      expect(
        normalizeEchoWindow({
          active: true,
          startTimeSeconds: -1,
          endTimeSeconds: 999,
          durationSeconds: 10,
        })
      ).toEqual({ start: 0, end: 10 })
    })

    it('returns null when end <= start (after normalization)', () => {
      expect(
        normalizeEchoWindow({
          active: true,
          startTimeSeconds: 5,
          endTimeSeconds: 5,
          durationSeconds: 10,
        })
      ).toBeNull()
    })
  })

  describe('clampSeekTimeToEchoWindow', () => {
    const w = { start: 10, end: 20 }

    it('clamps below start', () => {
      expect(clampSeekTimeToEchoWindow(0, w)).toBe(10)
    })

    it('clamps above end to < end', () => {
      const t = clampSeekTimeToEchoWindow(999, w, { seekEpsilonSeconds: 0.02 })
      expect(t).toBeLessThan(20)
      expect(t).toBeGreaterThanOrEqual(10)
    })
  })

  describe('decideEchoPlaybackTime', () => {
    const w = { start: 10, end: 20 }

    it('ok inside window', () => {
      expect(decideEchoPlaybackTime(10.5, w)).toEqual({ kind: 'ok' })
    })

    it('clamps before start', () => {
      expect(decideEchoPlaybackTime(0, w)).toEqual({ kind: 'clamp', timeSeconds: 10 })
    })

    it('loops at end', () => {
      expect(decideEchoPlaybackTime(20, w)).toEqual({ kind: 'loop', timeSeconds: 10 })
    })
  })
})


