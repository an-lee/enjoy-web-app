/**
 * React Query Hooks - Unified export for data access layer
 *
 * This module exports all React Query hooks for database operations.
 * UI components should import from here for data fetching and mutations.
 *
 * Pattern: UI Layer -> Query Hooks -> Database (Dexie)
 */

// Audio Queries
export {
  // Query keys
  audioQueryKeys,
  // Query hooks
  useAudio,
  useAudios,
  useAudioHistory,
  // Mutation hooks
  useSaveAudio,
  useDeleteAudio,
  // Types
  type AudioLoader,
  type UseAudioOptions,
  type UseAudioReturn,
  type AudioWithUrl,
  type UseAudiosOptions,
  type UseAudiosReturn,
} from './use-audio-queries'

// Translation Queries
export {
  // Query keys
  translationQueryKeys,
  // Query hooks
  useTranslationHistory,
  useFindExistingTranslation,
  // Mutation hooks
  useSaveTranslation,
  useUpdateTranslation,
  // Utility functions
  findExistingTranslation,
} from './use-translation-queries'

// Transcript Queries
export {
  // Query keys
  transcriptQueryKeys,
  // Query hooks
  useTranscript,
  useTranscriptsByTarget,
  // Mutation hooks
  useSaveTranscript,
  useUpdateTranscript,
  useDeleteTranscript,
} from './use-transcript-queries'

