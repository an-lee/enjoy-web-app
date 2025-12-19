/**
 * CachedDefinition entity types
 */

import type { SyncStatus } from './common'

// ============================================================================
// Local-Only Entity
// ============================================================================

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

