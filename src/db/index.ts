import Dexie, { type Table } from 'dexie'
import type {
  Video,
  Audio,
  Transcript,
  UserEcho,
  Recording,
  Translation,
  CachedDefinition,
  SyncStatus,
  TranslationStyle,
} from './schema'

// Export types for convenience
export type {
  Video,
  Audio,
  Transcript,
  UserEcho,
  Recording,
  Translation,
  CachedDefinition,
  TranscriptLine,
  VideoProvider,
  Level,
  TranslationStyle,
  SyncStatus,
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
    this.version(3).stores({
      // Video: id (primary key, also used as vid for association), indexes for common queries
      videos:
        'id, serverId, provider, language, level, starred, syncStatus, createdAt, updatedAt',
      // Audio: id (primary key, also used as aid for association), indexes for common queries
      audios:
        'id, serverId, provider, language, level, starred, syncStatus, createdAt, updatedAt',
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

// Helper functions for Video
export async function getVideosBySyncStatus(
  status: SyncStatus
): Promise<Video[]> {
  return db.videos.where('syncStatus').equals(status).toArray()
}

export async function getVideoById(id: string): Promise<Video | undefined> {
  return db.videos.get(id)
}

export async function getStarredVideos(): Promise<Video[]> {
  return db.videos.where('starred').equals(1).toArray()
}

// Helper functions for Audio
export async function getAudiosBySyncStatus(
  status: SyncStatus
): Promise<Audio[]> {
  return db.audios.where('syncStatus').equals(status).toArray()
}

export async function getAudioById(id: string): Promise<Audio | undefined> {
  return db.audios.get(id)
}

export async function getStarredAudios(): Promise<Audio[]> {
  return db.audios.where('starred').equals(1).toArray()
}

// Helper functions for Transcript
export async function getTranscriptsByVid(vid: string): Promise<Transcript[]> {
  return db.transcripts.where('vid').equals(vid).toArray()
}

export async function getTranscriptsByAid(aid: string): Promise<Transcript[]> {
  return db.transcripts.where('aid').equals(aid).toArray()
}

export async function getTranscriptsBySyncStatus(
  status: SyncStatus
): Promise<Transcript[]> {
  return db.transcripts.where('syncStatus').equals(status).toArray()
}

// Helper functions for UserEcho
export async function getUserEchoByVideo(
  userId: number,
  vid: string
): Promise<UserEcho | undefined> {
  return db.userEchos.where('[userId+vid]').equals([userId, vid]).first()
}

export async function getUserEchoByAudio(
  userId: number,
  aid: string
): Promise<UserEcho | undefined> {
  return db.userEchos.where('[userId+aid]').equals([userId, aid]).first()
}

export async function getUserEchosByUserId(userId: number): Promise<UserEcho[]> {
  return db.userEchos.where('userId').equals(userId).toArray()
}

export async function getUserEchosByVid(vid: string): Promise<UserEcho[]> {
  return db.userEchos.where('vid').equals(vid).toArray()
}

export async function getUserEchosByAid(aid: string): Promise<UserEcho[]> {
  return db.userEchos.where('aid').equals(aid).toArray()
}

export async function getUserEchosByStatus(
  status: NonNullable<UserEcho['status']>
): Promise<UserEcho[]> {
  return db.userEchos.where('status').equals(status).toArray()
}

export async function getUserEchosBySyncStatus(
  status: SyncStatus
): Promise<UserEcho[]> {
  return db.userEchos.where('syncStatus').equals(status).toArray()
}

// Helper functions for Recording
export async function getRecordingsByVid(vid: string): Promise<Recording[]> {
  return db.recordings.where('vid').equals(vid).toArray()
}

export async function getRecordingsByAid(aid: string): Promise<Recording[]> {
  return db.recordings.where('aid').equals(aid).toArray()
}

export async function getRecordingsBySyncStatus(
  status: SyncStatus
): Promise<Recording[]> {
  return db.recordings.where('syncStatus').equals(status).toArray()
}

export async function getRecordingsByUserId(userId: number): Promise<Recording[]> {
  return db.recordings.where('userId').equals(userId).toArray()
}

export async function getRecordingsByEchoId(echoId: string): Promise<Recording[]> {
  return db.recordings.where('echoId').equals(echoId).toArray()
}

// Helper functions for Translation
export async function getTranslationByTextAndStyle(
  sourceText: string,
  targetLanguage: string,
  style: TranslationStyle
): Promise<Translation | undefined> {
  return db.translations
    .where('[sourceText+targetLanguage+style]')
    .equals([sourceText, targetLanguage, style])
    .first()
}

export async function getTranslationsBySourceText(
  sourceText: string
): Promise<Translation[]> {
  return db.translations.where('sourceText').equals(sourceText).toArray()
}

export async function getTranslationsBySourceLanguage(
  sourceLanguage: string
): Promise<Translation[]> {
  return db.translations.where('sourceLanguage').equals(sourceLanguage).toArray()
}

export async function getTranslationsByTargetLanguage(
  targetLanguage: string
): Promise<Translation[]> {
  return db.translations.where('targetLanguage').equals(targetLanguage).toArray()
}

export async function getTranslationsByStyle(
  style: TranslationStyle
): Promise<Translation[]> {
  return db.translations.where('style').equals(style).toArray()
}

export async function getTranslationsBySyncStatus(
  status: SyncStatus
): Promise<Translation[]> {
  return db.translations.where('syncStatus').equals(status).toArray()
}

// Helper functions for CachedDefinition
export async function getCachedDefinition(
  word: string,
  languagePair: string
): Promise<CachedDefinition | undefined> {
  const cached = await db.cachedDefinitions.get([word, languagePair])
  if (cached && cached.expiresAt > Date.now()) {
    return cached
  }
  // Remove expired cache
  if (cached) {
    await db.cachedDefinitions.delete([word, languagePair])
  }
  return undefined
}

export async function setCachedDefinition(
  word: string,
  languagePair: string,
  data: unknown,
  ttl: number = 24 * 60 * 60 * 1000 // 24 hours default
): Promise<void> {
  const now = Date.now()
  await db.cachedDefinitions.put({
    id: `${word}-${languagePair}`,
    word,
    languagePair,
    data,
    expiresAt: now + ttl,
    createdAt: now,
    updatedAt: now,
  })
}

// Clean up expired cache entries
export async function cleanupExpiredCache(): Promise<number> {
  const now = Date.now()
  const expired = await db.cachedDefinitions
    .where('expiresAt')
    .below(now)
    .toArray()
  const keys = expired.map((item) => [item.word, item.languagePair] as [string, string])
  await db.cachedDefinitions.bulkDelete(keys)
  return keys.length
}

// Initialize database (call this on app startup)
export async function initDatabase(): Promise<void> {
  try {
    await db.open()
    // Clean up expired cache on startup
    await cleanupExpiredCache()
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw error
  }
}