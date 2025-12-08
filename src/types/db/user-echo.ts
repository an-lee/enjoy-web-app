/**
 * UserEcho entity types
 */

import type { TargetType, SyncStatus } from './common'

// ============================================================================
// Local-Only Entity
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

// ============================================================================
// Store Input Types
// ============================================================================

/**
 * Input type for creating UserEcho
 */
export type UserEchoInput = Omit<UserEcho, 'id' | 'createdAt' | 'updatedAt'>

