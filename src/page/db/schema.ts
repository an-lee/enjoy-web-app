/**
 * Dexie database schema configuration
 * Re-exports types from @/page/types/db for convenience
 */

import Dexie, { type Table } from 'dexie'
import { createLogger } from '@/shared/lib/utils'

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

/**
 * Get database name for a user
 * Each user has their own isolated database
 */
function getDatabaseName(userId: string | null | undefined): string {
  // Handle null, undefined, empty string, or non-string types
  if (!userId || typeof userId !== 'string') {
    // Fallback to default name for unauthenticated state
    // This should rarely be used in production
    return 'EnjoyDatabase'
  }
  // Use userId as part of database name for isolation
  // IndexedDB database names can contain alphanumeric, dash, and underscore
  // We sanitize userId to ensure it's safe for use in database names
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `EnjoyDatabase_${sanitizedUserId}`
}

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

  constructor(userId: string | null | undefined = null) {
    const dbName = getDatabaseName(userId)
    super(dbName)

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
// Database Instance Manager
// ============================================================================

/**
 * Database instance cache - stores open database instances per user
 */
const dbInstances = new Map<string | null, EnjoyDatabase>()

/**
 * Current active database instance (default: unauthenticated state)
 */
let currentDb: EnjoyDatabase | null = null

/**
 * Get or create database instance for a user
 * @param userId - User ID, or null/undefined for unauthenticated state
 * @returns Database instance for the user
 */
export function getDatabase(userId: string | null | undefined = null): EnjoyDatabase {
  // Normalize userId: convert undefined to null for consistent Map keys
  const normalizedUserId = userId ?? null

  // Check if we already have an instance for this user
  if (dbInstances.has(normalizedUserId)) {
    const db = dbInstances.get(normalizedUserId)!
    // If this is not the current active db, make it current
    if (db !== currentDb) {
      currentDb = db
    }
    return db
  }

  // Create new database instance for this user
  const db = new EnjoyDatabase(userId)
  dbInstances.set(normalizedUserId, db)
  currentDb = db
  return db
}

/**
 * Switch to a different user's database
 * @param userId - User ID to switch to, or null/undefined for unauthenticated state
 * @returns Database instance for the user
 */
export async function switchDatabase(userId: string | null | undefined): Promise<EnjoyDatabase> {
  const db = getDatabase(userId)

  // Ensure database is open
  if (!db.isOpen()) {
    try {
      await db.open()
      log.info(`Database opened for user: ${userId || 'unauthenticated'}`)
    } catch (error) {
      log.error(`Failed to open database for user ${userId}:`, error)
      throw error
    }
  }

  return db
}

/**
 * Close and remove database instance for a user
 * Useful for cleanup when user logs out
 * @param userId - User ID whose database should be closed
 */
export async function closeDatabase(userId: string | null | undefined): Promise<void> {
  // Normalize userId: convert undefined to null for consistent Map keys
  const normalizedUserId = userId ?? null
  const db = dbInstances.get(normalizedUserId)
  if (db) {
    try {
      if (db.isOpen()) {
        await db.close()
      }
      dbInstances.delete(normalizedUserId)
      // If this was the current database, reset currentDb
      if (currentDb === db) {
        currentDb = null
      }
      log.info(`Database closed for user: ${normalizedUserId || 'unauthenticated'}`)
    } catch (error) {
      log.error(`Failed to close database for user ${normalizedUserId}:`, error)
    }
  }
}

/**
 * Get the current active database instance
 * @returns Current database instance, or creates a default one if none exists
 */
export function getCurrentDatabase(): EnjoyDatabase {
  if (!currentDb) {
    // Create default database for unauthenticated state
    currentDb = getDatabase(null)
  }
  return currentDb
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getCurrentDatabase() instead for better user isolation
 */
export const db = new Proxy({} as EnjoyDatabase, {
  get(_target, prop) {
    const current = getCurrentDatabase()
    const value = (current as any)[prop]
    // If it's a function, bind it to the current database instance
    if (typeof value === 'function') {
      return value.bind(current)
    }
    return value
  },
})

// ============================================================================
// Database Initialization
// ============================================================================

/**
 * Initialize database for a specific user
 * @param userId - User ID to initialize database for, or null/undefined for unauthenticated state
 */
export async function initDatabase(userId: string | null | undefined = null): Promise<void> {
  try {
    // Switch to and open the database for the user
    await switchDatabase(userId)
    log.info(`Database initialized for user: ${userId || 'unauthenticated'}`)
  } catch (error) {
    log.error('Failed to initialize database:', error)
    throw error
  }
}
