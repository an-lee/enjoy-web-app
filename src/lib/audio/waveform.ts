export type WaveformPoint = {
  /** Time in seconds relative to the segment start */
  t: number
  /** Normalized amplitude envelope in [0, 1] */
  amp: number
}

export type PitchPoint = {
  /** Time in seconds relative to the segment start */
  t: number
  /** Pitch in Hz. Null means unvoiced/unknown. */
  pitchHz: number | null
  /** Optional voiced probability in [0, 1] */
  voicedProb?: number
}

export type EnvelopeType = 'rms' | 'peak' | 'hybrid'

export function computeRmsEnvelope(
  samples: Float32Array,
  sampleRate: number,
  opts?: { points?: number; envelopeType?: EnvelopeType; enhanceContrast?: boolean }
): WaveformPoint[] {
  const points = Math.max(8, Math.min(opts?.points ?? 480, 2000))
  const envelopeType = opts?.envelopeType ?? 'peak'
  const enhanceContrast = opts?.enhanceContrast ?? true
  if (!samples.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return []

  const duration = samples.length / sampleRate
  const bucketSize = Math.max(1, Math.floor(samples.length / points))

  const values: number[] = []
  for (let offset = 0; offset < samples.length; offset += bucketSize) {
    const end = Math.min(samples.length, offset + bucketSize)

    if (envelopeType === 'peak') {
      // Peak envelope: better for detecting stressed syllables
      let peak = 0
      for (let i = offset; i < end; i++) {
        const abs = Math.abs(samples[i])
        if (abs > peak) peak = abs
      }
      values.push(peak)
    } else if (envelopeType === 'hybrid') {
      // Hybrid: RMS weighted by peak to capture both average and stress
      let sumSq = 0
      let peak = 0
      for (let i = offset; i < end; i++) {
        const abs = Math.abs(samples[i])
        sumSq += samples[i] * samples[i]
        if (abs > peak) peak = abs
      }
      const rms = Math.sqrt(sumSq / Math.max(1, end - offset))
      // Weighted combination: 60% peak (stress), 40% RMS (overall energy)
      values.push(0.6 * peak + 0.4 * rms)
    } else {
      // RMS envelope: traditional average energy
      let sumSq = 0
      for (let i = offset; i < end; i++) sumSq += samples[i] * samples[i]
      const meanSq = sumSq / Math.max(1, end - offset)
      values.push(Math.sqrt(meanSq))
    }
  }

  const max = Math.max(...values, 1e-9)
  const out: WaveformPoint[] = []
  const n = values.length
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * duration
    let amp = values[i] / max

    // Enhance contrast: apply square root scaling to make pauses more visible
    // and stressed syllables more prominent
    if (enhanceContrast) {
      // Square root scaling: compresses high values, expands low values
      // This makes pauses (low values) more visible and stresses (high values) still prominent
      amp = Math.sqrt(amp)

      // Apply threshold to emphasize pauses: values below 0.1 become even smaller
      // This creates a more distinct separation between silence and speech
      if (amp < 0.1) {
        amp = amp * 0.5 // Reduce pause amplitude further
      }
    }

    out.push({ t, amp })
  }
  return out
}

export function mapPitchToEnvelopeTimes(
  envelope: WaveformPoint[],
  pitchFrames: Float64Array,
  voicedProbFrames: Float64Array | undefined,
  sampleRate: number,
  hopSize: number,
  opts?: { minVoicedProb?: number }
): PitchPoint[] {
  const minVoicedProb = opts?.minVoicedProb ?? 0.6
  if (!envelope.length) return []
  if (!pitchFrames.length) {
    return envelope.map((p) => ({ t: p.t, pitchHz: null }))
  }
  const frames = pitchFrames.length
  const frameTimeSeconds = hopSize / sampleRate

  return envelope.map((p) => {
    const idx = Math.max(0, Math.min(frames - 1, Math.round(p.t / frameTimeSeconds)))
    const hz = pitchFrames[idx]
    const prob = voicedProbFrames ? voicedProbFrames[idx] : undefined
    const isVoiced = Number.isFinite(hz) && hz > 0 && (prob === undefined || prob >= minVoicedProb)
    return { t: p.t, pitchHz: isVoiced ? hz : null, voicedProb: prob }
  })
}


