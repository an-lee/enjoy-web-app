/**
 * Database Module - Unified entry point
 *
 * Structure:
 * - /types/db.ts     - Type definitions
 * - /db/schema.ts    - Dexie database configuration
 * - /db/stores/*     - Data operation layer
 * - /db/id-generator.ts - UUID generation utilities
 */

// ============================================================================
// Database Instance & Initialization
// ============================================================================

export { db, EnjoyDatabase, initDatabase } from './schema'
import { cleanupExpiredCache } from './stores/cached-definition-store'

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
  PronunciationWordResult,
  PronunciationSyllableResult,
  // Entity types
  Video,
  Audio,
  Transcript,
  Recording,
  Dictation,
  Translation,
  CachedDefinition,
  SyncQueueItem,
  // Input types
  VideoInput,
  TTSAudioInput,
  PlatformAudioInput,
  AudioInput,
  TranscriptInput,
  RecordingInput,
  DictationInput,
  TranslationInput,
} from '@/types/db'

// ============================================================================
// Store Exports
// ============================================================================

// Video
export {
  videoStore,
  getVideoById,
  getVideoByProviderAndVid,
  getVideosBySyncStatus,
  getStarredVideos,
  getVideosByProvider,
  getVideosByLanguage,
  getAllVideos,
  saveVideo,
  saveLocalVideo,
  updateVideo,
  deleteVideo,
} from './stores/video-store'

// Audio
export {
  audioStore,
  getAudioById,
  getAudioByProviderAndAid,
  getAudiosBySyncStatus,
  getStarredAudios,
  getAudioByTranslationKey,
  getAudiosByTranslationKey,
  getAudiosByProvider,
  getAudiosByLanguage,
  getAudiosByVoice,
  getAllAudios,
  saveAudio,
  saveLocalAudio,
  updateAudio,
  deleteAudio,
} from './stores/audio-store'

// Transcript
export {
  transcriptStore,
  getTranscriptById,
  getTranscriptsByTarget,
  getTranscriptByTargetLanguageSource,
  getTranscriptsBySyncStatus,
  getTranscriptsByLanguage,
  getTranscriptsBySource,
  getAllTranscripts,
  getTranscriptsByVid,
  getTranscriptsByAid,
  saveTranscript,
  updateTranscript,
  deleteTranscript,
  getTrackId,
} from './stores/transcript-store'

// Recording
export {
  recordingStore,
  getRecordingById,
  getRecordingsByTarget,
  getRecordingsBySyncStatus,
  getRecordingsByLanguage,
  getAllRecordings,
  getRecordingsByVid,
  getRecordingsByAid,
  getRecordingsByUserId,
  saveRecording,
  updateRecording,
  deleteRecording,
} from './stores/recording-store'

// Dictation
export {
  dictationStore,
  getDictationById,
  getDictationsByTarget,
  getDictationsBySyncStatus,
  getDictationsByLanguage,
  getAllDictations,
  saveDictation,
  updateDictation,
  deleteDictation,
  calculateDictationAccuracy,
} from './stores/dictation-store'

// Translation
export {
  translationStore,
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
} from './stores/translation-store'

// CachedDefinition
export {
  cachedDefinitionStore,
  getCachedDefinition,
  getAllCachedDefinitions,
  setCachedDefinition,
  deleteCachedDefinition,
  clearAllCachedDefinitions,
  cleanupExpiredCache,
} from './stores/cached-definition-store'

// ============================================================================
// ID Generator Exports
// ============================================================================

export {
  // Hash utilities
  hashBlob,
  generateMd5,
  // Video ID
  generateVideoId,
  generateLocalVideoId,
  // Audio ID
  generateAudioId,
  generateTTSAudioId,
  generateLocalAudioId,
  // Other IDs
  generateTranscriptId,
  generateRecordingId,
  generateDictationId,
  generateTranslationId,
  generateCachedDefinitionId,
} from './id-generator'
