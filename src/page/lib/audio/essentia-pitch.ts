import type { PitchPoint, WaveformPoint } from './waveform'
import { mapPitchToEnvelopeTimes } from './waveform'

type EssentiaInstance = {
  version: string
  arrayToVector: (arr: Float32Array) => any
  vectorToArray: (vec: any) => number[]
  PitchYinProbabilistic: (
    input: any,
    frameSize?: number,
    hopSize?: number,
    lowRMSThreshold?: number,
    outputUnvoiced?: 'zero' | 'nan',
    preciseTime?: boolean,
    sampleRate?: number
  ) => { pitch: any; voicedProbabilities: any }
}

let essentiaPromise: Promise<EssentiaInstance> | null = null

async function loadEssentia(): Promise<EssentiaInstance> {
  // Prefer the ESM builds shipped by Essentia.js for bundlers like Vite.
  // The package root entry is CommonJS/UMD and can produce runtime shape issues.
  try {
    const [{ default: Essentia }, { EssentiaWASM }] = await Promise.all([
      import('essentia.js/dist/essentia.js-core.es.js') as any,
      import('essentia.js/dist/essentia-wasm.es.js') as any,
    ])
    return new Essentia(EssentiaWASM) as EssentiaInstance
  } catch {
    // Fallback: attempt package root (CJS/UMD). Keep this for environments that
    // don't resolve dist ESM paths properly.
    const mod: any = await import('essentia.js')

    const EssentiaCtor =
      mod.Essentia ??
      mod.default?.Essentia ??
      (typeof mod.default === 'function' ? mod.default : undefined)
    const EssentiaWASM = mod.EssentiaWASM ?? mod.default?.EssentiaWASM

    if (!EssentiaCtor || !EssentiaWASM) {
      throw new Error('Failed to load Essentia.js exports (Essentia / EssentiaWASM)')
    }

    return new EssentiaCtor(EssentiaWASM) as EssentiaInstance
  }
}

export async function getEssentia(): Promise<EssentiaInstance> {
  if (typeof window === 'undefined') {
    throw new Error('Essentia.js is only available in the browser')
  }
  if (!essentiaPromise) essentiaPromise = loadEssentia()
  return essentiaPromise
}

export type PitchContourResult = {
  envelope: WaveformPoint[]
  pitch: PitchPoint[]
  meta: {
    sampleRate: number
    frameSize: number
    hopSize: number
    voicedThreshold: number
    essentiaVersion: string
  }
}

export async function extractPitchContourForEnvelope(
  samples: Float32Array,
  sampleRate: number,
  envelope: WaveformPoint[],
  opts?: {
    frameSize?: number
    hopSize?: number
    voicedThreshold?: number
  }
): Promise<PitchContourResult> {
  const essentia = await getEssentia()

  const frameSize = opts?.frameSize ?? 4096
  const hopSize = opts?.hopSize ?? 256
  const voicedThreshold = opts?.voicedThreshold ?? 0.6

  if (!samples.length) {
    return {
      envelope,
      pitch: envelope.map((p) => ({ t: p.t, pitchHz: null })),
      meta: {
        sampleRate,
        frameSize,
        hopSize,
        voicedThreshold,
        essentiaVersion: essentia.version,
      },
    }
  }

  const vec = essentia.arrayToVector(samples)
  const out = essentia.PitchYinProbabilistic(
    vec,
    frameSize,
    hopSize,
    0.1,
    'zero',
    false,
    sampleRate
  )

  const pitchArr = essentia.vectorToArray(out.pitch)
  const probArr = essentia.vectorToArray(out.voicedProbabilities)

  // Free Emscripten heap objects when possible
  try {
    out.pitch?.delete?.()
    out.voicedProbabilities?.delete?.()
    vec?.delete?.()
  } catch {
    // ignore
  }

  const pitch = mapPitchToEnvelopeTimes(
    envelope,
    Float64Array.from(pitchArr),
    Float64Array.from(probArr),
    sampleRate,
    hopSize,
    { minVoicedProb: voicedThreshold }
  )

  return {
    envelope,
    pitch,
    meta: {
      sampleRate,
      frameSize,
      hopSize,
      voicedThreshold,
      essentiaVersion: essentia.version,
    },
  }
}


