/**
 * Database type definitions
 * Aligned with Enjoy browser extension schema for shared backend API compatibility
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export type VideoProvider = 'youtube' | 'netflix'
export type AudioProvider = 'youtube' | 'spotify' | 'podcast' | 'tts' | 'local_upload'
export type TranscriptSource = 'official' | 'auto' | 'ai' | 'user'
export type TargetType = 'Video' | 'Audio'
export type SyncStatus = 'local' | 'synced' | 'pending'

// Local-only types (not synced)
export type Level = 'beginner' | 'intermediate' | 'advanced'
export type TranslationStyle =
  | 'literal'
  | 'natural'
  | 'casual'
  | 'formal'
  | 'simplified'
  | 'detailed'
  | 'custom'

// ============================================================================
// Base Interfaces
// ============================================================================

/**
 * Base interface for entities that can be synced with the server
 */
export interface SyncableEntity {
  syncStatus?: SyncStatus
  serverUpdatedAt?: string // ISO 8601
}

// ============================================================================
// Transcript Types
// ============================================================================

/**
 * Transcript line with timing information
 * Note: Timeline uses milliseconds (integer)
 */
export interface TranscriptLine {
  text: string
  start: number // milliseconds
  duration: number // milliseconds
  timeline?: TranscriptLine[] // nested: Line → Word → Phoneme
  confidence?: number // 0-1
}

// ============================================================================
// Pronunciation Assessment Types
// ============================================================================

export interface PronunciationAssessmentResult {
  accuracyScore?: number
  fluencyScore?: number
  completenessScore?: number
  prosodyScore?: number
  words?: PronunciationWordResult[]
}

export interface PronunciationWordResult {
  word: string
  accuracyScore?: number
  errorType?: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation'
  syllables?: PronunciationSyllableResult[]
}

export interface PronunciationSyllableResult {
  syllable: string
  accuracyScore?: number
}

// ============================================================================
// Core Entities (Synced with Server)
// ============================================================================

/**
 * Video content
 * ID generation: UUID v5 with `video:${provider}:${vid}`
 */
export interface Video extends SyncableEntity {
  id: string // UUID v5
  vid: string // Platform video ID (e.g., YouTube: "dQw4w9WgXcQ")
  provider: VideoProvider
  title: string
  description?: string
  thumbnailUrl?: string
  duration: number // seconds
  language: string // BCP 47
  season?: number
  episode?: number
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  // Local-only extensions
  level?: Level
  starred?: boolean
  summary?: string
  blob?: Blob
  mediaBlobKey?: string
  thumbnailBlobKey?: string
}

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

/**
 * Transcript for video or audio
 * ID generation: UUID v5 with `transcript:${targetType}:${targetId}:${language}:${source}`
 */
export interface Transcript extends SyncableEntity {
  id: string // UUID v5
  targetType: TargetType
  targetId: string
  language: string // BCP 47
  source: TranscriptSource
  timeline: TranscriptLine[]
  referenceId?: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/**
 * User Recording for pronunciation practice
 * ID generation: UUID v4 (random)
 */
export interface Recording extends SyncableEntity {
  id: string // UUID v4
  targetType: TargetType
  targetId: string
  referenceStart: number // milliseconds
  referenceDuration: number // milliseconds
  referenceText: string
  language: string // BCP 47
  duration: number // milliseconds
  md5?: string
  audioUrl?: string
  pronunciationScore?: number // 0-100
  assessment?: PronunciationAssessmentResult
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  // Local-only
  blob?: Blob
}

/**
 * User Dictation for listening practice
 * ID generation: UUID v4 (random)
 */
export interface Dictation extends SyncableEntity {
  id: string // UUID v4
  targetType: TargetType
  targetId: string
  referenceStart: number // milliseconds
  referenceDuration: number // milliseconds
  referenceText: string
  language: string // BCP 47
  userInput: string
  accuracy: number // 0-100
  correctWords: number
  missedWords: number
  extraWords: number
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

// ============================================================================
// Local-Only Entities
// ============================================================================

/**
 * User Echo - Practice session for a Video or Audio
 * ID generation: UUID v5 with `echo:${targetType}:${targetId}:${userId}`
 */
export interface UserEcho {
  id: string // UUID v5
  userId: number
  targetType: TargetType
  targetId: string
  currentSegmentIndex?: number
  totalSegments?: number
  status?: 'in_progress' | 'completed' | 'paused'
  totalPracticeTime?: number // milliseconds
  averageScore?: number
  lastPracticedAt?: string // ISO 8601
  syncStatus?: SyncStatus
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/**
 * Translation - AI-generated translation
 * ID generation: UUID v5
 */
export interface Translation {
  id: string // UUID v5
  sourceText: string
  sourceLanguage: string
  targetLanguage: string
  translatedText: string
  style: TranslationStyle
  customPrompt?: string
  aiModel?: string
  syncStatus?: SyncStatus
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/**
 * Dictionary Cache
 * ID generation: UUID v5 with `cache:${word}:${languagePair}`
 */
export interface CachedDefinition {
  id: string // UUID v5
  word: string
  languagePair: string // e.g., 'en:zh'
  data: unknown
  expiresAt: number // timestamp (milliseconds)
  syncStatus?: SyncStatus
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

// ============================================================================
// Sync API Types
// ============================================================================

/**
 * Sync queue item for offline-first sync
 */
export interface SyncQueueItem {
  id: number // auto-increment
  entityType: 'video' | 'transcript' | 'recording' | 'dictation'
  entityId: string
  action: 'create' | 'update' | 'delete'
  payload?: unknown
  retryCount: number
  lastAttempt?: string // ISO 8601
  error?: string
  createdAt: string // ISO 8601
}

// ============================================================================
// Store Input Types
// ============================================================================

/**
 * Input type for creating/updating Video
 */
export type VideoInput = Omit<Video, 'id' | 'createdAt' | 'updatedAt'> & {
  vid: string
}

/**
 * Input type for creating TTS audio
 */
export type TTSAudioInput = Omit<Audio, 'id' | 'aid' | 'createdAt' | 'updatedAt'> & {
  provider: 'tts'
  sourceText: string
  voice: string
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

/**
 * Input type for creating Transcript
 */
export type TranscriptInput = Omit<Transcript, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Input type for creating Recording
 */
export type RecordingInput = Omit<Recording, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Input type for creating Dictation
 */
export type DictationInput = Omit<Dictation, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Input type for creating UserEcho
 */
export type UserEchoInput = Omit<UserEcho, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Input type for creating Translation
 */
export type TranslationInput = Omit<Translation, 'id' | 'createdAt' | 'updatedAt'>

