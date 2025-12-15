/**
 * Database Repositories - Unified export for all repository modules
 */

// Video Repository
export {
  videoRepository,
  getVideoById,
  getVideoByProviderAndVid,
  getVideosBySyncStatus,
  getVideosByProvider,
  getVideosByLanguage,
  getAllVideos,
  saveVideo,
  saveLocalVideo,
  updateVideo,
  deleteVideo,
} from './video-repository'

// Audio Repository
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
  updateAudio,
  deleteAudio,
  type TTSAudioInput,
  type UserAudioInput,
} from './audio-repository'

// Transcript Repository
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
  updateTranscript,
  deleteTranscript,
  getTrackId,
} from './transcript-repository'

// Recording Repository
export {
  recordingRepository,
  getRecordingById,
  getRecordingsByTarget,
  getRecordingsBySyncStatus,
  getRecordingsByLanguage,
  getAllRecordings,
  saveRecording,
  updateRecording,
  deleteRecording,
} from './recording-repository'

// Dictation Repository
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
} from './dictation-repository'

// Translation Repository
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
} from './translation-repository'

// CachedDefinition Repository
export {
  cachedDefinitionRepository,
  getCachedDefinition,
  getAllCachedDefinitions,
  setCachedDefinition,
  deleteCachedDefinition,
  clearAllCachedDefinitions,
  cleanupExpiredCache,
} from './cached-definition-repository'

// EchoSession Repository
export {
  echoSessionRepository,
  getEchoSessionById,
  getEchoSessionsByTarget,
  getLatestEchoSessionByTarget,
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
} from './echo-session-repository'

