/**
 * Dexie database schema configuration
 * Re-exports types from @/page/types/db for convenience
 */

import Dexie, { type Table } from 'dexie'
import { createLogger } from '@/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'schema' })
import type {
  Video,
  Audio,
  Transcript,
  Recording,
  Dictation,
  Translation,
  CachedDefinition,
  EchoSession,
  SyncQueueItem,
} from '@/page/types/db'

// Re-export all types for backward compatibility
export * from '@/page/types/db'

// ============================================================================
// Database Class
// ============================================================================

export class EnjoyDatabase extends Dexie {
  videos!: Table<Video, string>
  audios!: Table<Audio, string>
  transcripts!: Table<Transcript, string>
  recordings!: Table<Recording, string>
  dictations!: Table<Dictation, string>
  translations!: Table<Translation, string>
  cachedDefinitions!: Table<CachedDefinition, [string, string]>
  echoSessions!: Table<EchoSession, string>
  syncQueue!: Table<SyncQueueItem, number>

  constructor() {
    super('EnjoyDatabase')

    // Version 6: Schema aligned with browser extension
    this.version(6).stores({
      // Video: id (UUID v5 primary key)
      videos:
        'id, [vid+provider], provider, language, level, starred, syncStatus, createdAt, updatedAt',

      // Audio: id (UUID v5 primary key)
      audios:
        'id, [aid+provider], provider, language, level, starred, translationKey, voice, syncStatus, createdAt, updatedAt',

      // Transcript: id (UUID v5 primary key)
      transcripts:
        'id, [targetType+targetId], [targetType+targetId+language+source], language, source, syncStatus, createdAt, updatedAt',

      // Recording: id (UUID v4 primary key)
      recordings:
        'id, [targetType+targetId], targetType, targetId, language, syncStatus, createdAt, updatedAt',

      // Dictation: id (UUID v4 primary key)
      dictations:
        'id, [targetType+targetId], targetType, targetId, language, syncStatus, createdAt, updatedAt',

      // Translation: id (UUID v5 primary key)
      translations:
        'id, sourceText, sourceLanguage, targetLanguage, style, [sourceText+targetLanguage+style], syncStatus, createdAt, updatedAt',

      // CachedDefinition: composite primary key
      cachedDefinitions:
        '[word+languagePair], id, syncStatus, expiresAt, createdAt, updatedAt',

      // SyncQueue: auto-increment primary key
      syncQueue: '++id, entityType, entityId, action, retryCount, createdAt',
    })

    // Version 7: Add EchoSession table
    this.version(7).stores({
      // EchoSession: id (UUID v4 primary key)
      echoSessions:
        'id, [targetType+targetId], targetType, targetId, language, syncStatus, startedAt, lastActiveAt, createdAt, updatedAt',
    })

    // Version 8: Refactor media storage - remove level/starred, use fileHandle
    this.version(8).stores({
      // Video: removed level, starred indexes
      videos:
        'id, [vid+provider], provider, language, syncStatus, createdAt, updatedAt',

      // Audio: removed level, starred indexes
      audios:
        'id, [aid+provider], provider, language, translationKey, voice, syncStatus, createdAt, updatedAt',

      // Other tables unchanged
      transcripts:
        'id, [targetType+targetId], [targetType+targetId+language+source], language, source, syncStatus, createdAt, updatedAt',
      recordings:
        'id, [targetType+targetId], targetType, targetId, language, syncStatus, createdAt, updatedAt',
      dictations:
        'id, [targetType+targetId], targetType, targetId, language, syncStatus, createdAt, updatedAt',
      translations:
        'id, sourceText, sourceLanguage, targetLanguage, style, [sourceText+targetLanguage+style], syncStatus, createdAt, updatedAt',
      cachedDefinitions:
        '[word+languagePair], id, syncStatus, expiresAt, createdAt, updatedAt',
      syncQueue:
        '++id, entityType, entityId, action, retryCount, createdAt',
      echoSessions:
        'id, [targetType+targetId], targetType, targetId, language, syncStatus, startedAt, lastActiveAt, createdAt, updatedAt',
    })

    // Version 9: Add composite index for sync queue to support deduplication
    this.version(9).stores({
      syncQueue:
        '++id, entityType, entityId, action, [entityType+entityId+action], retryCount, createdAt',
    })
  }
}

// ============================================================================
// Database Instance
// ============================================================================

export const db = new EnjoyDatabase()

/**
 * Initialize database (call this on app startup)
 */
export async function initDatabase(): Promise<void> {
  try {
    await db.open()
  } catch (error) {
    log.error('Failed to initialize database:', error)
    throw error
  }
}
