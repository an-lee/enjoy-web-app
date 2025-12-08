/**
 * Database Stores - Unified export for all store modules
 */

// Video Store
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
} from './video-store'

// Audio Store
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
  type TTSAudioInput,
  type PlatformAudioInput,
  type AudioInput,
} from './audio-store'

// Transcript Store
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
} from './transcript-store'

// Recording Store
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
  getRecordingsByEchoId,
  saveRecording,
  updateRecording,
  deleteRecording,
} from './recording-store'

// Dictation Store
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
} from './dictation-store'

// UserEcho Store
export {
  userEchoStore,
  getUserEchoById,
  getUserEchoByTarget,
  getUserEchosByUserId,
  getUserEchosByStatus,
  getUserEchosBySyncStatus,
  getAllUserEchos,
  getUserEchoByVideo,
  getUserEchoByAudio,
  getUserEchosByVid,
  getUserEchosByAid,
  saveUserEcho,
  updateUserEcho,
  deleteUserEcho,
} from './user-echo-store'

// Translation Store
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
} from './translation-store'

// CachedDefinition Store
export {
  cachedDefinitionStore,
  getCachedDefinition,
  getAllCachedDefinitions,
  setCachedDefinition,
  deleteCachedDefinition,
  clearAllCachedDefinitions,
  cleanupExpiredCache,
} from './cached-definition-store'

