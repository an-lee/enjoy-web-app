import Dexie, { type Table } from 'dexie'
import type {
  Video,
  Audio,
  Transcript,
  UserEcho,
  Recording,
  Translation,
  CachedDefinition,
} from './schema'

// Define the database class
export class EnjoyDatabase extends Dexie {
  videos!: Table<Video, string>
  audios!: Table<Audio, string>
  transcripts!: Table<Transcript, string>
  userEchos!: Table<UserEcho, string>
  recordings!: Table<Recording, string>
  translations!: Table<Translation, string>
  cachedDefinitions!: Table<CachedDefinition, [string, string]> // Composite key: [word, languagePair]

  constructor() {
    super('EnjoyDatabase')
    this.version(4).stores({
      // Video: id (primary key, also used as vid for association), indexes for common queries
      videos:
        'id, serverId, provider, language, level, starred, syncStatus, createdAt, updatedAt',
      // Audio: id (primary key, also used as aid for association), indexes for common queries
      // Added translationKey index for TTS audio lookup
      audios:
        'id, serverId, provider, language, level, starred, translationKey, syncStatus, createdAt, updatedAt',
      // Transcript: id (primary key), indexes for target lookup
      transcripts:
        'id, vid, aid, language, serverId, syncStatus, createdAt, updatedAt',
      // UserEcho: id (primary key), indexes for user and target lookup
      // Note: [userId+vid] and [userId+aid] are compound indexes for unique user practice sessions
      userEchos:
        'id, userId, vid, aid, [userId+vid], [userId+aid], status, serverId, syncStatus, createdAt, updatedAt',
      // Recording: id (primary key), indexes for target, user, and echo lookup
      recordings:
        'id, echoId, vid, aid, userId, serverId, syncStatus, createdAt, updatedAt',
      // Translation: id (primary key), indexes for source and translation lookup
      // Note: [sourceText+targetLanguage+style] is a compound index for unique translations
      translations:
        'id, sourceText, sourceLanguage, targetLanguage, style, [sourceText+targetLanguage+style], serverId, syncStatus, createdAt, updatedAt',
      // CachedDefinition: composite primary key [word+languagePair]
      cachedDefinitions:
        '[word+languagePair], serverId, syncStatus, expiresAt, createdAt, updatedAt',
    })
  }
}

// Create and export a singleton instance
export const db = new EnjoyDatabase()

// Initialize database (call this on app startup)
// Note: cleanupExpiredCache should be called separately after import to avoid circular dependency
export async function initDatabase(): Promise<void> {
  try {
    await db.open()
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw error
  }
}

