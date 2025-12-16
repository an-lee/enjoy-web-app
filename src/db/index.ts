/**
 * Database Module - Unified entry point
 *
 * Structure:
 * - /types/db.ts     - Type definitions
 * - /db/schema.ts    - Dexie database configuration
 * - /db/repositories/*  - Data operation layer
 * - /db/id-generator.ts - UUID generation utilities
 */

// ============================================================================
// Database Instance & Initialization
// ============================================================================

export { db, EnjoyDatabase, initDatabase } from './schema'
import { cleanupExpiredCache } from './repositories/cached-definition-repository'

/**
 * Initialize database with cleanup (call this on app startup)
 */
export async function initDatabaseWithCleanup(): Promise<void> {
  const { initDatabase } = await import('./schema')
  await initDatabase()
  await cleanupExpiredCache()
}

// ============================================================================
// Type Exports (from @/types/db)
// ============================================================================

export type {
  // Enum types
  VideoProvider,
  AudioProvider,
  TranscriptSource,
  TargetType,
  SyncStatus,
  Level,
  TranslationStyle,
  // Base types
  SyncableEntity,
  TranscriptLine,
  // Pronunciation types
  PronunciationAssessmentResult,
  WordAssessment,
  SyllableAssessment,
  // Entity types
  Video,
  Audio,
  Transcript,
  Recording,
  Dictation,
  Translation,
  CachedDefinition,
  EchoSession,
  SyncQueueItem,
  // Input types
  VideoInput,
  TTSAudioInput,
  UserAudioInput,
  TranscriptInput,
  RecordingInput,
  DictationInput,
  TranslationInput,
  EchoSessionInput,
} from '@/types/db'

// ============================================================================
// Repository Exports
// ============================================================================

// Video
export {
  videoRepository,
  getVideoById,
  getVideoByProviderAndVid,
  getVideosBySyncStatus,
  getVideosByProvider,
  getVideosByLanguage,
  getAllVideos,
  saveVideo,
  saveVideoFromServer,
  saveLocalVideo,
  updateVideo,
  deleteVideo,
} from './repositories/video-repository'

// Audio
export {
  audioRepository,
  getAudioById,
  getAudioByProviderAndAid,
  getAudiosBySyncStatus,
  getAudioByTranslationKey,
  getAudiosByTranslationKey,
  getAudiosByProvider,
  getAudiosByLanguage,
  getAudiosByVoice,
  getAllAudios,
  saveAudio,
  saveLocalAudio,
  saveTTSAudio,
  updateAudio,
  deleteAudio,
} from './repositories/audio-repository'

// Transcript
export {
  transcriptRepository,
  getTranscriptById,
  getTranscriptsByTarget,
  getTranscriptByTargetLanguageSource,
  getTranscriptsBySyncStatus,
  getTranscriptsByLanguage,
  getTranscriptsBySource,
  getAllTranscripts,
  saveTranscript,
  saveTranscriptFromServer,
  updateTranscript,
  deleteTranscript,
  getTrackId,
} from './repositories/transcript-repository'

// Recording
export {
  recordingRepository,
  getRecordingById,
  getRecordingsByTarget,
  getRecordingsBySyncStatus,
  getRecordingsByLanguage,
  getAllRecordings,
  getRecordingsByEchoRegion,
  saveRecording,
  updateRecording,
  deleteRecording,
} from './repositories/recording-repository'

// Dictation
export {
  dictationRepository,
  getDictationById,
  getDictationsByTarget,
  getDictationsBySyncStatus,
  getDictationsByLanguage,
  getAllDictations,
  saveDictation,
  updateDictation,
  deleteDictation,
  calculateDictationAccuracy,
} from './repositories/dictation-repository'

// Translation
export {
  translationRepository,
  getTranslationById,
  getTranslationByTextAndStyle,
  getTranslationsBySourceText,
  getTranslationsBySourceLanguage,
  getTranslationsByTargetLanguage,
  getTranslationsByStyle,
  getTranslationsBySyncStatus,
  getAllTranslations,
  saveTranslation,
  updateTranslation,
  deleteTranslation,
} from './repositories/translation-repository'

// CachedDefinition
export {
  cachedDefinitionRepository,
  getCachedDefinition,
  getAllCachedDefinitions,
  setCachedDefinition,
  deleteCachedDefinition,
  clearAllCachedDefinitions,
  cleanupExpiredCache,
} from './repositories/cached-definition-repository'

// EchoSession
export {
  echoSessionRepository,
  getEchoSessionById,
  getEchoSessionsByTarget,
  getLatestEchoSessionByTarget,
  getActiveEchoSessionByTarget,
  getOrCreateActiveEchoSession,
  getEchoSessionsBySyncStatus,
  getEchoSessionsByLanguage,
  getActiveEchoSessions,
  getCompletedEchoSessions,
  getAllEchoSessions,
  saveEchoSession,
  updateEchoSession,
  updateEchoSessionProgress,
  incrementEchoSessionRecording,
  completeEchoSession,
  deleteEchoSession,
} from './repositories/echo-session-repository'

// ============================================================================
// ID Generator Exports
// ============================================================================

export {
  // Hash utilities
  hashBlob,
  generateMd5,
  // Video ID
  generateVideoId,
  generateLocalVideoVid,
  // Audio ID
  generateAudioId,
  generateTTSAudioAid,
  generateLocalAudioAid,
  // Other IDs
  generateTranscriptId,
  generateRecordingId,
  generateDictationId,
  generateTranslationId,
  generateCachedDefinitionId,
  generateEchoSessionId,
} from './id-generator'

// ============================================================================
// Sync Queue Repository Exports
// ============================================================================

export {
  syncQueueRepository,
  getSyncQueueItemById,
  getSyncQueueItemsByEntityType,
  getSyncQueueItemsByEntityId,
  getPendingSyncQueueItems,
  getFailedSyncQueueItems,
  getAllSyncQueueItems,
  addSyncQueueItem,
  updateSyncQueueItem,
  removeSyncQueueItem,
  removeSyncQueueItemsByEntityId,
  clearSyncQueue,
} from './repositories/sync-queue-repository'

// ============================================================================
// Sync State Repository Exports
// ============================================================================

export {
  syncStateRepository,
  getLastSyncAt,
  getAllSyncStates,
  updateLastSyncAt,
  clearSyncState,
  clearAllSyncStates,
} from './repositories/sync-state-repository'

// ============================================================================
// Sync Service Exports
// ============================================================================

export {
  queueUploadSync,
  processSyncQueue,
  downloadAudios,
  downloadVideos,
  downloadTranscriptsByTarget,
  fullSync,
} from './services/sync-service'

export type { SyncOptions, SyncResult } from './services/sync-service'

// ============================================================================
// Sync Manager Exports
// ============================================================================

export {
  initSyncManager,
  shutdownSyncManager,
  triggerSync,
  queueForSync,
  syncTranscriptsForTarget,
  getSyncManagerStatus,
} from './services/sync-manager'

export type { SyncManagerOptions } from './services/sync-manager'

// ============================================================================
// Sync Stats Exports
// ============================================================================

export { getUploadStats, queueLocalEntitiesForSync } from './repositories/sync-stats-repository'
