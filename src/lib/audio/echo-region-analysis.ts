import { decodeAudioBlobToBuffer, extractMonoSegmentFromAudioBuffer } from './segment'
import { computeRmsEnvelope } from './waveform'
import { extractPitchContourForEnvelope } from './essentia-pitch'

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

export async function analyzeEchoRegionFromBlob(opts: {
  blob: Blob
  startTimeSeconds: number
  endTimeSeconds: number
  envelopePoints?: number
}): Promise<EchoRegionAnalysisResult> {
  const { blob, startTimeSeconds, endTimeSeconds } = opts

  const audioBuffer = await decodeAudioBlobToBuffer(blob)
  const segment = extractMonoSegmentFromAudioBuffer(audioBuffer, startTimeSeconds, endTimeSeconds)

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


