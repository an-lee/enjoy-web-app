/**
 * React Query Hooks - Unified export for data access layer
 *
 * This module exports all React Query hooks for database operations.
 * UI components should import from here for data fetching and mutations.
 *
 * Pattern: UI Layer -> Query Hooks -> Database (Dexie)
 *
 * Naming Convention (CRUD):
 * - Read: use{Entity}, use{Entity}s, use{Entity}sBy{Filter}
 * - Create: useCreate{Entity}
 * - Update: useUpdate{Entity}
 * - Delete: useDelete{Entity}
 */

// Audio Queries
export {
  // Query keys
  audioQueryKeys,
  // Query hooks (Read)
  useAudio,
  useAudioHistory,
  useAudiosByTranslationKey,
  // Mutation hooks (Create/Delete)
  useCreateAudio,
  useCreateTTSAudio,
  useDeleteAudio,
  // Types
  type AudioLoader,
  type UseAudioOptions,
  type UseAudioReturn,
  type AudioWithUrl,
  type UseAudiosByTranslationKeyOptions,
  type UseAudiosByTranslationKeyReturn,
} from './use-audio-queries'

// Video Queries
export {
  // Query keys
  videoQueryKeys,
  // Query hooks (Read)
  useVideo,
  useVideos,
  useVideosByProvider,
  // Mutation hooks (Create/Update/Delete)
  useCreateVideo,
  useSaveLocalVideo,
  useUpdateVideo,
  useDeleteVideo,
  // Types
  type VideoWithUrl,
  type UseVideoOptions,
  type UseVideoReturn,
  type UseVideosOptions,
} from './use-video-queries'

// Library Queries (Combined Audio/Video)
export {
  // Query keys
  libraryQueryKeys,
  // Query hooks (Read)
  useLibrary,
  useLibraryStats,
  // Mutation hooks
  useDeleteLibraryItem,
  // Types
  type MediaType,
  type LibraryMedia,
  type LibraryQueryResult,
  type UseLibraryOptions,
} from './use-library-queries'

// Translation Queries
export {
  // Query keys
  translationQueryKeys,
  // Query hooks (Read)
  useTranslation,
  useTranslations,
  useTranslationByParams,
  // Mutation hooks (Create/Update)
  useCreateTranslation,
  useUpdateTranslation,
  // Utility functions
  findExistingTranslation,
} from './use-translation-queries'

// Transcript Queries
export {
  // Query keys
  transcriptQueryKeys,
  // Query hooks (Read)
  useTranscript,
  useTranscriptsByTarget,
  // Mutation hooks (Create/Update/Delete)
  useCreateTranscript,
  useUpdateTranscript,
  useDeleteTranscript,
} from './use-transcript-queries'
