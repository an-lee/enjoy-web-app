/**
 * Recording entity types
 */

import type { SyncableEntity, TargetType } from './common'
import type { PronunciationAssessmentResult } from './pronunciation'

// ============================================================================
// Core Entity
// ============================================================================

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

// ============================================================================
// Store Input Types
// ============================================================================

/**
 * Input type for creating Recording
 */
export type RecordingInput = Omit<Recording, 'id' | 'createdAt' | 'updatedAt'>

