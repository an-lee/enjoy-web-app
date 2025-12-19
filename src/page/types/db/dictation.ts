/**
 * Dictation entity types
 */

import type { SyncableEntity, TargetType } from './common'

// ============================================================================
// Core Entity
// ============================================================================

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
// Store Input Types
// ============================================================================

/**
 * Input type for creating Dictation
 */
export type DictationInput = Omit<Dictation, 'id' | 'createdAt' | 'updatedAt'>

