// UUID generator for deterministic and random IDs
// Aligned with Enjoy browser extension ID generation rules

import { v4 as uuidv4, v5 as uuidv5 } from 'uuid'
import type {
  VideoProvider,
  AudioProvider,
  TargetType,
  TranscriptSource,
} from './schema'

// ============================================================================
// UUID Namespace
// ============================================================================

/**
 * UUID namespace for this application (RFC 4122 URL namespace)
 * This ensures IDs are unique and consistent with the browser extension
 */
const UUID_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

// ============================================================================
// Hash Utilities
// ============================================================================

/**
 * Generate a SHA-256 hash from a Blob for use in UUID generation
 */
export async function hashBlob(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate MD5 hash from a Blob (for recording audio files)
 * Note: Uses SHA-256 as MD5 is not natively available in Web Crypto API
 * The server should accept both for compatibility
 */
export async function generateMd5(blob: Blob): Promise<string> {
  return hashBlob(blob)
}

// ============================================================================
// Video ID Generation
// ============================================================================

/**
 * Generate UUID v5 for Video
 * Format: `video:${provider}:${vid}`
 * Same provider + vid always generates same UUID
 */
export function generateVideoId(provider: VideoProvider, vid: string): string {
  return uuidv5(`video:${provider}:${vid}`, UUID_NAMESPACE)
}

/**
 * Generate vid (hash) for local upload Video
 * Returns the SHA-256 hash of the video blob, used as vid with provider 'user'
 */
export async function generateLocalVideoVid(blob: Blob): Promise<string> {
  return hashBlob(blob)
}

// ============================================================================
// Audio ID Generation
// ============================================================================

/**
 * Generate UUID v5 for Audio
 * Format: `audio:${provider}:${aid}`
 * Same provider + aid always generates same UUID
 */
export function generateAudioId(provider: AudioProvider, aid: string): string {
  return uuidv5(`audio:${provider}:${aid}`, UUID_NAMESPACE)
}

/**
 * Generate aid (hash) for TTS-generated Audio from blob
 * Returns the SHA-256 hash of the audio blob
 */
export async function generateTTSAudioAid(blob: Blob): Promise<string> {
  return hashBlob(blob)
}

/**
 * Generate aid (hash) for local upload Audio
 * Returns the SHA-256 hash of the audio blob, used as aid with provider 'user'
 */
export async function generateLocalAudioAid(blob: Blob): Promise<string> {
  return hashBlob(blob)
}

// ============================================================================
// Transcript ID Generation
// ============================================================================

/**
 * Generate UUID v5 for Transcript
 * Format: `transcript:${targetType}:${targetId}:${language}:${source}`
 * Same video/audio + language + source always generates same UUID
 */
export function generateTranscriptId(
  targetType: TargetType,
  targetId: string,
  language: string,
  source: TranscriptSource
): string {
  return uuidv5(
    `transcript:${targetType}:${targetId}:${language}:${source}`,
    UUID_NAMESPACE
  )
}

// ============================================================================
// Recording ID Generation
// ============================================================================

/**
 * Generate UUID v4 for Recording (random)
 * Each recording is unique, even for the same segment
 */
export function generateRecordingId(): string {
  return uuidv4()
}

// ============================================================================
// Dictation ID Generation
// ============================================================================

/**
 * Generate UUID v4 for Dictation (random)
 * Each dictation attempt is unique
 */
export function generateDictationId(): string {
  return uuidv4()
}

// ============================================================================
// Translation ID Generation
// ============================================================================

/**
 * Generate UUID v5 for Translation
 * Format: `translation:${sourceText}:${targetLanguage}:${style}:${customPrompt}`
 * Same source + target + style + prompt always generates same UUID
 */
export function generateTranslationId(
  sourceText: string,
  targetLanguage: string,
  style: string,
  customPrompt?: string
): string {
  const prompt = customPrompt || ''
  return uuidv5(
    `translation:${sourceText}:${targetLanguage}:${style}:${prompt}`,
    UUID_NAMESPACE
  )
}

// ============================================================================
// CachedDefinition ID Generation
// ============================================================================

/**
 * Generate UUID v5 for CachedDefinition
 * Format: `cache:${word}:${languagePair}`
 */
export function generateCachedDefinitionId(
  word: string,
  languagePair: string
): string {
  return uuidv5(`cache:${word}:${languagePair}`, UUID_NAMESPACE)
}
