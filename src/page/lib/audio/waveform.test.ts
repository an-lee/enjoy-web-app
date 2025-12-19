import { describe, it, expect } from 'vitest'
import { computeRmsEnvelope, mapPitchToEnvelopeTimes } from './waveform'

describe('audio waveform utilities', () => {
  it('computeRmsEnvelope returns normalized envelope points', () => {
    const sampleRate = 10
    // 2 seconds: first second silent, second second constant amplitude
    const samples = new Float32Array([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
    ])

    const env = computeRmsEnvelope(samples, sampleRate, { points: 4 })
    expect(env.length).toBeGreaterThan(0)
    expect(env[0].t).toBeGreaterThanOrEqual(0)
    expect(env[env.length - 1].t).toBeLessThanOrEqual(2)
    // Normalized
    for (const p of env) {
      expect(p.amp).toBeGreaterThanOrEqual(0)
      expect(p.amp).toBeLessThanOrEqual(1)
    }
    // There should be a clear increase in the second half
    const firstHalf = env.slice(0, Math.floor(env.length / 2)).map((p) => p.amp)
    const secondHalf = env.slice(Math.floor(env.length / 2)).map((p) => p.amp)
    expect(Math.max(...secondHalf)).toBeGreaterThan(Math.max(...firstHalf))
  })

  it('mapPitchToEnvelopeTimes maps pitch frames to envelope timestamps', () => {
    const envelope = [
      { t: 0, amp: 0 },
      { t: 0.5, amp: 0.2 },
      { t: 1.0, amp: 0.4 },
    ]
    // hopSize=1, sampleRate=2 => frameTime=0.5s, so indices 0,1,2 match above times
    const pitchFrames = Float64Array.from([100, 110, 120])
    const probFrames = Float64Array.from([1, 0.2, 1])

    const mapped = mapPitchToEnvelopeTimes(envelope, pitchFrames, probFrames, 2, 1, {
      minVoicedProb: 0.6,
    })

    expect(mapped.map((p) => p.pitchHz)).toEqual([100, null, 120])
  })
})


