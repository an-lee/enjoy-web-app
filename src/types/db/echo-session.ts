/**
 * EchoSession entity types
 * Tracks practice sessions for shadow reading/echo practice
 */

import type { SyncableEntity, TargetType } from './common'

// ============================================================================
// Core Entity
// ============================================================================

/**
 * EchoSession - Practice session for shadow reading/echo practice
 * ID generation: UUID v4 (random) - each practice session is unique
 *
 * Tracks:
 * - Player settings (progress, speed, volume, etc.)
 * - Practice statistics (recording count, total duration, etc.)
 * - Can be synced to remote server for cross-device continuation
 */
export interface EchoSession extends SyncableEntity {
  id: string // UUID v4
  targetType: TargetType // 'Video' | 'Audio'
  targetId: string // Video.id or Audio.id
  language: string // BCP 47

  // ============================================================================
  // Player Settings
  // ============================================================================

  /** Current playback position in seconds */
  currentTime: number // seconds

  /** Playback speed (0.25-2) */
  playbackRate: number

  /** Volume level (0-1) */
  volume: number

  /** Echo mode region start time in seconds */
  echoStartTime?: number

  /** Echo mode region end time in seconds */
  echoEndTime?: number

  /** Current main transcript ID used for practice */
  transcriptId?: string

  // ============================================================================
  // Practice Statistics
  // ============================================================================

  /** Total number of recordings made in this session */
  recordingsCount: number

  /** Total duration of all recordings in milliseconds */
  recordingsDuration: number // milliseconds

  /** Last recording timestamp */
  lastRecordingAt?: string // ISO 8601

  // ============================================================================
  // Metadata
  // ============================================================================

  /** Session started timestamp */
  startedAt: string // ISO 8601

  /** Last active timestamp (updated on progress changes) */
  lastActiveAt: string // ISO 8601

  /** Session completed timestamp (if session is finished) */
  completedAt?: string // ISO 8601

  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

// ============================================================================
// Store Input Types
// ============================================================================

/**
 * Input type for creating EchoSession
 */
export type EchoSessionInput = Omit<
  EchoSession,
  'id' | 'createdAt' | 'updatedAt' | 'recordingsCount' | 'recordingsDuration'
> & {
  recordingsCount?: number // Optional, defaults to 0
  recordingsDuration?: number // Optional, defaults to 0
}

