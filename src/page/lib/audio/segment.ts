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

/**
 * Cache for decoded AudioBuffers to avoid re-decoding the same blob.
 * Key: blob size + first 8 bytes (as a simple hash to identify the blob)
 * Value: Promise<AudioBuffer>
 *
 * Note: This is a simple in-memory cache. For production, consider using
 * IndexedDB for persistent caching across page reloads.
 */
const audioBufferCache = new Map<string, Promise<AudioBuffer>>()
const MAX_CACHE_SIZE = 10 // Limit cache size to prevent memory issues

/**
 * Generate a simple cache key from blob metadata.
 * Uses size + first few bytes as a lightweight identifier.
 */
async function getBlobCacheKey(blob: Blob): Promise<string> {
  const size = blob.size
  // Read first 8 bytes as a simple identifier
  const slice = blob.slice(0, Math.min(8, blob.size))
  const arrayBuffer = await slice.arrayBuffer()
  const bytes = Array.from(new Uint8Array(arrayBuffer))
  return `${size}-${bytes.join(',')}`
}

/**
 * Decode audio blob to AudioBuffer with caching.
 * Subsequent calls with the same blob will return the cached AudioBuffer,
 * avoiding expensive re-decoding operations.
 */
export async function decodeAudioBlobToBuffer(blob: Blob): Promise<AudioBuffer> {
  const cacheKey = await getBlobCacheKey(blob)

  // Check cache
  const cached = audioBufferCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // Decode and cache
  const audioCtx = getAudioContext()
  const decodePromise = (async () => {
    const data = await blob.arrayBuffer()
    // Some browsers require a detached ArrayBuffer; slice() ensures that.
    const copy = data.slice(0)
    return await audioCtx.decodeAudioData(copy)
  })()

  // Limit cache size by removing oldest entries
  if (audioBufferCache.size >= MAX_CACHE_SIZE) {
    const firstKey = audioBufferCache.keys().next().value
    if (firstKey) {
      audioBufferCache.delete(firstKey)
    }
  }

  audioBufferCache.set(cacheKey, decodePromise)
  return decodePromise
}

/**
 * Clear the AudioBuffer cache. Useful for memory management.
 */
export function clearAudioBufferCache(): void {
  audioBufferCache.clear()
}

/**
 * Check if a blob size is small enough to use the full-load method efficiently.
 * For small files, loading the entire blob is faster than using partial loading.
 */
const SMALL_FILE_THRESHOLD = 10 * 1024 * 1024 // 10MB

/**
 * Check if a blob should use optimized loading strategy.
 */
export function shouldUseOptimizedLoading(blob: Blob): boolean {
  return blob.size > SMALL_FILE_THRESHOLD
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


