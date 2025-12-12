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

export function computeRmsEnvelope(
  samples: Float32Array,
  sampleRate: number,
  opts?: { points?: number }
): WaveformPoint[] {
  const points = Math.max(8, Math.min(opts?.points ?? 480, 2000))
  if (!samples.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return []

  const duration = samples.length / sampleRate
  const bucketSize = Math.max(1, Math.floor(samples.length / points))

  const rms: number[] = []
  for (let offset = 0; offset < samples.length; offset += bucketSize) {
    const end = Math.min(samples.length, offset + bucketSize)
    let sumSq = 0
    for (let i = offset; i < end; i++) sumSq += samples[i] * samples[i]
    const meanSq = sumSq / Math.max(1, end - offset)
    rms.push(Math.sqrt(meanSq))
  }

  const max = Math.max(...rms, 1e-9)
  const out: WaveformPoint[] = []
  const n = rms.length
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * duration
    out.push({ t, amp: rms[i] / max })
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


