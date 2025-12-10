/**
 * Hooks Module - Unified entry point
 *
 * This module exports all React Query hooks for data management.
 * UI components should import hooks from here instead of directly
 * accessing database operations.
 *
 * Pattern:
 * - UI Layer -> Hooks (React Query) -> Database (Dexie)
 */

// Audio hooks
export {
  // Query hooks
  useAudioHistory,
  useAudios,
  // Mutation hooks
  useSaveAudio,
  useDeleteAudio,
  // Types
  audioKeys,
  type AudioWithUrl,
  type UseAudiosOptions,
  type UseAudiosReturn,
} from './use-audios'

export {
  useAudio,
  audioKeys as audioDetailKeys,
  type AudioLoader,
  type UseAudioOptions,
  type UseAudioReturn,
} from './use-audio'

// Translation hooks
export {
  // Query hooks
  useTranslationHistory,
  useFindExistingTranslation,
  // Mutation hooks
  useSaveTranslation,
  useUpdateTranslation,
  // Utility functions (for backward compatibility)
  findExistingTranslation,
  // Types
  translationKeys,
} from './use-translations'

// Transcript hooks
export {
  // Query hooks
  useTranscript,
  useTranscriptsByTarget,
  // Mutation hooks
  useSaveTranscript,
  useUpdateTranscript,
  useDeleteTranscript,
  // Types
  transcriptKeys,
} from './use-transcripts'

// TTS hook
export { useTTS, type UseTTSOptions, type UseTTSReturn } from './use-tts'

// Utility hooks
export { useCopyWithToast } from './use-copy-with-toast'
export { useIsMobile } from './use-mobile'
export { useModelStatus } from './use-model-status'

