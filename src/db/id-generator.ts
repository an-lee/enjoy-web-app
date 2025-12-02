// UUID v5 generator for deterministic IDs
// All IDs are generated using UUID v5 to ensure consistency across devices and servers

import { v5 as uuidv5 } from 'uuid'
import type { VideoProvider } from './schema'

// UUID namespace for this application (generated once, never changes)
// This ensures IDs are unique to this application
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8' // Standard DNS namespace

/**
 * Generate a hash from a Blob for use in UUID generation
 */
async function hashBlob(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate UUID for Video
 * - Third-party videos (YouTube, Netflix, etc.): uuid5(vid + provider)
 * - Local uploads: uuid5(hash(fileBlob))
 */
export async function generateVideoId(
  provider: VideoProvider,
  vid?: string,
  blob?: Blob
): Promise<string> {
  if (vid && provider !== 'local_upload') {
    // Third-party video: use vid + provider
    return uuidv5(`${vid}:${provider}`, UUID_NAMESPACE)
  } else if (blob) {
    // Local upload: use file hash
    const hash = await hashBlob(blob)
    return uuidv5(`video:${hash}`, UUID_NAMESPACE)
  } else {
    throw new Error('Video ID generation requires either vid+provider or blob')
  }
}

/**
 * Generate UUID for Audio
 * - Third-party audio: uuid5(aid + provider)
 * - TTS-generated: uuid5(translationId + voice) or uuid5(hash(blob) + voice)
 * - Local uploads: uuid5(hash(fileBlob))
 */
export async function generateAudioId(
  provider: VideoProvider,
  options: {
    aid?: string
    blob?: Blob
    translationId?: string
    voice?: string
  }
): Promise<string> {
  const { aid, blob, translationId, voice } = options

  if (aid && provider !== 'local_upload' && provider !== 'other') {
    // Third-party audio: use aid + provider
    return uuidv5(`${aid}:${provider}`, UUID_NAMESPACE)
  } else if (translationId && voice) {
    // TTS-generated from translation: use translationId + voice
    return uuidv5(`tts:${translationId}:${voice}`, UUID_NAMESPACE)
  } else if (blob && voice) {
    // TTS-generated (no translation): use blob hash + voice
    const hash = await hashBlob(blob)
    return uuidv5(`tts:${hash}:${voice}`, UUID_NAMESPACE)
  } else if (blob) {
    // Local upload: use file hash
    const hash = await hashBlob(blob)
    return uuidv5(`audio:${hash}`, UUID_NAMESPACE)
  } else {
    throw new Error(
      'Audio ID generation requires aid+provider, translationId+voice, or blob'
    )
  }
}

/**
 * Generate UUID for UserEcho
 * Uses videoId/audioId + userId to ensure one echo per user per media
 */
export function generateUserEchoId(
  userId: number,
  videoId?: string,
  audioId?: string
): string {
  if (videoId) {
    return uuidv5(`echo:video:${videoId}:${userId}`, UUID_NAMESPACE)
  } else if (audioId) {
    return uuidv5(`echo:audio:${audioId}:${userId}`, UUID_NAMESPACE)
  } else {
    throw new Error('UserEcho ID generation requires either videoId or audioId')
  }
}

/**
 * Generate UUID for Recording
 * Uses recording blob hash + userId + referenceOffset to ensure uniqueness
 * Alternative: echoId + referenceOffset + timestamp if echoId is available
 */
export async function generateRecordingId(
  userId: number,
  options: {
    blob: Blob
    referenceOffset?: number
    echoId?: string
    timestamp?: number
  }
): Promise<string> {
  const { blob, referenceOffset, echoId, timestamp } = options

  const hash = await hashBlob(blob)

  if (echoId && referenceOffset !== undefined) {
    // Use echoId + referenceOffset + hash for uniqueness
    return uuidv5(
      `recording:${echoId}:${referenceOffset}:${hash}:${userId}`,
      UUID_NAMESPACE
    )
  } else if (referenceOffset !== undefined) {
    // Use referenceOffset + hash + userId
    return uuidv5(
      `recording:${referenceOffset}:${hash}:${userId}`,
      UUID_NAMESPACE
    )
  } else if (timestamp) {
    // Fallback: use timestamp + hash + userId
    return uuidv5(`recording:${timestamp}:${hash}:${userId}`, UUID_NAMESPACE)
  } else {
    // Last resort: use hash + userId + current timestamp
    return uuidv5(
      `recording:${hash}:${userId}:${Date.now()}`,
      UUID_NAMESPACE
    )
  }
}

/**
 * Generate UUID for Transcript
 * Uses videoId/audioId + language to ensure one transcript per language per media
 */
export function generateTranscriptId(
  videoId?: string,
  audioId?: string,
  language?: string
): string {
  const lang = language || 'unknown'
  if (videoId) {
    return uuidv5(`transcript:video:${videoId}:${lang}`, UUID_NAMESPACE)
  } else if (audioId) {
    return uuidv5(`transcript:audio:${audioId}:${lang}`, UUID_NAMESPACE)
  } else {
    throw new Error('Transcript ID generation requires either videoId or audioId')
  }
}

/**
 * Generate UUID for Translation
 * Uses sourceText + targetLanguage + style + customPrompt to ensure same translation is reused
 */
export function generateTranslationId(
  sourceText: string,
  targetLanguage: string,
  style: string,
  customPrompt?: string
): string {
  const prompt = customPrompt || ''
  const key = `${sourceText}:${targetLanguage}:${style}:${prompt}`
  return uuidv5(`translation:${key}`, UUID_NAMESPACE)
}

/**
 * Generate UUID for CachedDefinition
 * Uses word + languagePair (already has composite key, but we can add UUID for consistency)
 */
export function generateCachedDefinitionId(
  word: string,
  languagePair: string
): string {
  return uuidv5(`cache:${word}:${languagePair}`, UUID_NAMESPACE)
}

