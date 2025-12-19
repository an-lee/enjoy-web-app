export type MonoPcmSegment = {
  sampleRate: number
  /** Mono PCM samples in [-1, 1] */
  samples: Float32Array
}

let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('AudioContext is only available in the browser')
  }
  const Ctx = window.AudioContext || (window as any).webkitAudioContext
  if (!Ctx) throw new Error('AudioContext is not supported in this browser')
  if (!sharedAudioContext) sharedAudioContext = new Ctx()
  return sharedAudioContext
}

export async function decodeAudioBlobToBuffer(blob: Blob): Promise<AudioBuffer> {
  const audioCtx = getAudioContext()
  const data = await blob.arrayBuffer()
  // Some browsers require a detached ArrayBuffer; slice() ensures that.
  const copy = data.slice(0)
  return await audioCtx.decodeAudioData(copy)
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Extract a mono PCM segment from an AudioBuffer.
 * If multiple channels exist, channels are averaged into mono.
 */
export function extractMonoSegmentFromAudioBuffer(
  audioBuffer: AudioBuffer,
  startTimeSeconds: number,
  endTimeSeconds: number
): MonoPcmSegment {
  const sampleRate = audioBuffer.sampleRate
  const totalSamples = audioBuffer.length

  const startSample = clampInt(Math.floor(startTimeSeconds * sampleRate), 0, totalSamples)
  const endSample = clampInt(Math.ceil(endTimeSeconds * sampleRate), 0, totalSamples)

  if (endSample <= startSample) {
    return { sampleRate, samples: new Float32Array() }
  }

  const channels = audioBuffer.numberOfChannels
  if (channels <= 0) return { sampleRate, samples: new Float32Array() }

  const length = endSample - startSample
  const mono = new Float32Array(length)

  for (let ch = 0; ch < channels; ch++) {
    const channelData = audioBuffer.getChannelData(ch)
    const view = channelData.subarray(startSample, endSample)
    for (let i = 0; i < length; i++) mono[i] += view[i]
  }

  const inv = 1 / channels
  for (let i = 0; i < length; i++) mono[i] *= inv

  return { sampleRate, samples: mono }
}


