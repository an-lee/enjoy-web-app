/**
 * Transcript types
 */

import type { SyncableEntity, TargetType, TranscriptSource } from './common'

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

// ============================================================================
// Store Input Types
// ============================================================================

/**
 * Input type for creating Transcript
 */
export type TranscriptInput = Omit<Transcript, 'id' | 'createdAt' | 'updatedAt'>

