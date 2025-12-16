/**
 * Sync API types
 */

// ============================================================================
// Sync API Types
// ============================================================================

/**
 * Sync queue item for offline-first sync
 */
export interface SyncQueueItem {
  id: number // auto-increment
  entityType: 'audio' | 'video' | 'transcript' | 'recording' | 'dictation' | 'echoSession'
  entityId: string
  action: 'create' | 'update' | 'delete'
  payload?: unknown
  retryCount: number
  lastAttempt?: string // ISO 8601
  error?: string
  createdAt: string // ISO 8601
}

