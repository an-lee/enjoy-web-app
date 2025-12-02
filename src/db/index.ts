// Re-export database instance and initialization
export { db, EnjoyDatabase } from './database'
import { initDatabase as _initDatabase } from './database'
import { cleanupExpiredCache } from './cached-definition'

// Initialize database with cleanup (call this on app startup)
export async function initDatabase(): Promise<void> {
  await _initDatabase()
  // Clean up expired cache on startup
  await cleanupExpiredCache()
}

// Re-export all types from schema
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

// Re-export Video helper functions
export {
  getVideosBySyncStatus,
  getVideoById,
  getStarredVideos,
} from './video'

// Re-export Audio helper functions
export {
  getAudiosBySyncStatus,
  getAudioById,
  getStarredAudios,
  getAudioByTranslationKey,
  getAudiosByTranslationKey,
  saveAudio,
} from './audio'

// Re-export Transcript helper functions
export {
  getTranscriptsByVid,
  getTranscriptsByAid,
  getTranscriptsBySyncStatus,
} from './transcript'

// Re-export UserEcho helper functions
export {
  getUserEchoByVideo,
  getUserEchoByAudio,
  getUserEchosByUserId,
  getUserEchosByVid,
  getUserEchosByAid,
  getUserEchosByStatus,
  getUserEchosBySyncStatus,
} from './user-echo'

// Re-export Recording helper functions
export {
  getRecordingsByVid,
  getRecordingsByAid,
  getRecordingsBySyncStatus,
  getRecordingsByUserId,
  getRecordingsByEchoId,
} from './recording'

// Re-export Translation helper functions
export {
  getTranslationByTextAndStyle,
  getTranslationsBySourceText,
  getTranslationsBySourceLanguage,
  getTranslationsByTargetLanguage,
  getTranslationsByStyle,
  getTranslationsBySyncStatus,
} from './translation'

// Re-export CachedDefinition helper functions
export {
  getCachedDefinition,
  setCachedDefinition,
  cleanupExpiredCache,
} from './cached-definition'

// Re-export ID generator functions
export {
  generateVideoId,
  generateAudioId,
  generateUserEchoId,
  generateRecordingId,
  generateTranscriptId,
  generateTranslationId,
  generateCachedDefinitionId,
} from './id-generator'