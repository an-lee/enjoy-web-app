/**
 * Dexie database schema configuration
 * Re-exports types from @/types/db for convenience
 */

import Dexie, { type Table } from 'dexie'
import type {
  Video,
  Audio,
  Transcript,
  UserEcho,
  Recording,
  Dictation,
  Translation,
  CachedDefinition,
  SyncQueueItem,
} from '@/types/db'

// Re-export all types for backward compatibility
export * from '@/types/db'

// ============================================================================
// Database Class
// ============================================================================

export class EnjoyDatabase extends Dexie {
  videos!: Table<Video, string>
  audios!: Table<Audio, string>
  transcripts!: Table<Transcript, string>
  userEchos!: Table<UserEcho, string>
  recordings!: Table<Recording, string>
  dictations!: Table<Dictation, string>
  translations!: Table<Translation, string>
  cachedDefinitions!: Table<CachedDefinition, [string, string]>
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

      // UserEcho: id (UUID v5 primary key)
      userEchos:
        'id, userId, [userId+targetType+targetId], targetType, targetId, status, syncStatus, createdAt, updatedAt',

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
    console.error('Failed to initialize database:', error)
    throw error
  }
}
