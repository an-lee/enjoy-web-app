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

export async function loadMediaBlobForSession(session: {
  mediaId: string
  mediaType: 'audio' | 'video'
}): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser')
  }
  const { db } = await import('@/db')

  if (session.mediaType === 'audio') {
    const audio = await db.audios.get(session.mediaId)
    if (!audio?.blob) throw new Error('Audio blob not found in local storage')
    return audio.blob
  }

  const video = await db.videos.get(session.mediaId)
  if (!video?.blob) throw new Error('Video blob not found in local storage')
  return video.blob
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


