import {
  decodeAudioBlobToBuffer,
  extractMonoSegmentFromAudioBuffer,
  shouldUseOptimizedLoading,
} from './segment'
import { computeRmsEnvelope } from './waveform'
import { extractPitchContourForEnvelope } from './essentia-pitch'
import {
  getAudioAnalysisWorkerManager,
  isWebCodecsSupported,
} from './workers/audio-analysis-worker-manager'

/**
 * Check if WebCodecs API is supported in the current browser.
 * WebCodecs provides more efficient streaming audio decoding.
 */
export { isWebCodecsSupported }

export type EchoRegionSeriesPoint = {
  /** Time in seconds relative to region start */
  t: number
  /** Reference (original media) normalized amplitude in [0, 1] */
  ampRef: number
  /** Reference pitch in Hz */
  pitchRefHz: number | null
  /** Optional user recording normalized amplitude */
  ampUser?: number
  /** Optional user pitch in Hz */
  pitchUserHz?: number | null
}

export type EchoRegionAnalysisResult = {
  points: EchoRegionSeriesPoint[]
  meta: {
    durationSeconds: number
    sampleRate: number
    essentiaVersion?: string
  }
}

/**
 * Load media blob for analysis, supporting all media source types:
 * - blob: Direct blob storage (for TTS-generated audio)
 * - fileHandle: Local file handle (for user-uploaded files)
 * - mediaUrl: Server URL (for synced media files)
 *
 * For large files from server URLs, this function attempts to use HTTP Range requests
 * to reduce initial download time. However, note that compressed audio/video formats
 * (MP3, MP4, etc.) still require full file decoding, so the optimization is limited.
 */
export async function loadMediaBlobForSession(session: {
  mediaId: string
  mediaType: 'audio' | 'video'
}): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser')
  }
  const { db } = await import('@/page/db')

  if (session.mediaType === 'audio') {
    const audio = await db.audios.get(session.mediaId)
    if (!audio) throw new Error('Audio not found')

    // Priority 1: Direct blob (for TTS-generated audio)
    if (audio.blob) {
      return audio.blob
    }

    // Priority 2: Server URL (for synced media)
    if (audio.mediaUrl) {
      // For server URLs, we could use Range requests, but compressed audio formats
      // (MP3, AAC, etc.) require full file decoding anyway, so we fetch the full file.
      // The browser's caching will help with subsequent requests.
      const response = await fetch(audio.mediaUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch audio from server: ${response.statusText}`)
      }
      return await response.blob()
    }

    // Priority 3: Local file handle (for user-uploaded files)
    if (audio.fileHandle) {
      return await audio.fileHandle.getFile()
    }

    throw new Error('Audio file not available (no blob, mediaUrl, or fileHandle)')
  }

  // Video handling
  const video = await db.videos.get(session.mediaId)
  if (!video) throw new Error('Video not found')

  // Priority 1: Server URL (for synced media)
  if (video.mediaUrl) {
    // Similar to audio: compressed video formats require full file decoding
    const response = await fetch(video.mediaUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch video from server: ${response.statusText}`)
    }
    return await response.blob()
  }

  // Priority 2: Local file handle (for user-uploaded files)
  if (video.fileHandle) {
    return await video.fileHandle.getFile()
  }

  throw new Error('Video file not available (no mediaUrl or fileHandle)')
}

/**
 * Analyze echo region from blob.
 *
 * Performance optimizations:
 * - Uses Web Worker for decoding to avoid blocking main thread
 * - Uses WebCodecs API when available for more efficient streaming decoding
 * - Falls back to Web Audio API if WebCodecs is not supported
 * - Caches decoded AudioBuffers to avoid re-decoding the same file
 *
 * For large files:
 * - Decoding happens in a background thread (non-blocking)
 * - WebCodecs can provide streaming decoding (when supported)
 * - Subsequent analyses of the same file use cached AudioBuffer
 */
export async function analyzeEchoRegionFromBlob(opts: {
  blob: Blob
  startTimeSeconds: number
  endTimeSeconds: number
  envelopePoints?: number
  useWorker?: boolean // Option to disable worker (for testing or fallback)
}): Promise<EchoRegionAnalysisResult> {
  const { blob, startTimeSeconds, endTimeSeconds, useWorker = true } = opts

  // Check if we should log performance info for large files
  const isLargeFile = shouldUseOptimizedLoading(blob)
  const webCodecsSupported = isWebCodecsSupported()

  if (isLargeFile && typeof console !== 'undefined') {
    console.debug(
      `[PitchContour] Analyzing large file (${(blob.size / 1024 / 1024).toFixed(2)}MB). ` +
        `Worker: ${useWorker}, WebCodecs: ${webCodecsSupported}`
    )
  }

  let segment: { sampleRate: number; samples: Float32Array }

  if (useWorker && typeof window !== 'undefined') {
    // Use Web Worker for decoding (non-blocking, supports WebCodecs)
    try {
      const workerManager = getAudioAnalysisWorkerManager()
      segment = await workerManager.decodeAudio(blob, startTimeSeconds, endTimeSeconds)
    } catch (error) {
      // Fallback to main thread if worker fails
      console.warn('[PitchContour] Worker failed, falling back to main thread:', error)
      const audioBuffer = await decodeAudioBlobToBuffer(blob)
      segment = extractMonoSegmentFromAudioBuffer(audioBuffer, startTimeSeconds, endTimeSeconds)
    }
  } else {
    // Use main thread (traditional method, with caching)
    const audioBuffer = await decodeAudioBlobToBuffer(blob)
    segment = extractMonoSegmentFromAudioBuffer(audioBuffer, startTimeSeconds, endTimeSeconds)
  }

  const durationSeconds = segment.samples.length / segment.sampleRate
  const envelope = computeRmsEnvelope(segment.samples, segment.sampleRate, {
    points: opts.envelopePoints ?? 520,
  })

  const pitchRes = await extractPitchContourForEnvelope(segment.samples, segment.sampleRate, envelope, {
    frameSize: 4096,
    hopSize: 256,
    voicedThreshold: 0.6,
  })

  const points: EchoRegionSeriesPoint[] = envelope.map((p, idx) => ({
    t: p.t,
    ampRef: p.amp,
    pitchRefHz: pitchRes.pitch[idx]?.pitchHz ?? null,
  }))

  return {
    points,
    meta: {
      durationSeconds,
      sampleRate: segment.sampleRate,
      essentiaVersion: pitchRes.meta.essentiaVersion,
    },
  }
}


