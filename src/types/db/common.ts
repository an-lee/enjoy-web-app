/**
 * Common types and base interfaces
 * Shared across all database entities
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

