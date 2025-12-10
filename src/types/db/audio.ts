/**
 * Audio entity types
 */

import type { SyncableEntity, AudioProvider, Level } from './common'

// ============================================================================
// Core Entity
// ============================================================================

/**
 * Audio content (follows same design as Video)
 * ID generation: UUID v5 with `audio:${provider}:${aid}`
 */
export interface Audio extends SyncableEntity {
  id: string // UUID v5
  aid: string // Platform audio ID or unique identifier
  provider: AudioProvider
  title: string
  description?: string
  thumbnailUrl?: string
  duration: number // seconds
  language: string // BCP 47
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  // Local-only extensions
  level?: Level
  starred?: boolean
  summary?: string
  // TTS-specific fields
  translationKey?: string
  sourceText?: string
  voice?: string
  // Local storage
  blob?: Blob
  mediaBlobKey?: string
  thumbnailBlobKey?: string
}

// ============================================================================
// Store Input Types
// ============================================================================

/**
 * Input type for creating TTS audio
 * Note: blob is required for TTS audio to generate aid (hash of the audio)
 */
export type TTSAudioInput = Omit<Audio, 'id' | 'aid' | 'createdAt' | 'updatedAt' | 'blob'> & {
  provider: 'user'
  sourceText: string
  voice: string
  blob: Blob // Required for TTS to generate aid from hash
}

/**
 * Input type for creating platform audio
 */
export type PlatformAudioInput = Omit<Audio, 'id' | 'createdAt' | 'updatedAt'> & {
  aid: string
}

/**
 * Union type for audio input
 */
export type AudioInput = TTSAudioInput | PlatformAudioInput

