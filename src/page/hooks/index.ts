/**
 * Hooks Module - Unified entry point
 *
 * Structure:
 * - /queries/  - React Query hooks for data access (use-xxx-queries.ts)
 * - Root       - Business logic and utility hooks
 *
 * Pattern: UI Layer -> Hooks -> Database (Dexie)
 */

// ============================================================================
// React Query Hooks (Data Access Layer)
// ============================================================================

// Re-export all query hooks from /queries/
export {
  // Audio
  audioQueryKeys,
  useAudio,
  useAudioHistory,
  useAudiosByTranslationKey,
  useCreateAudio,
  useCreateTTSAudio,
  useDeleteAudio,
  type AudioLoader,
  type UseAudioOptions,
  type UseAudioReturn,
  type AudioWithUrl,
  type UseAudiosByTranslationKeyOptions,
  type UseAudiosByTranslationKeyReturn,
  // Translation
  translationQueryKeys,
  useTranslation,
  useTranslations,
  useTranslationByParams,
  useCreateTranslation,
  useUpdateTranslation,
  findExistingTranslation,
  // Transcript
  transcriptQueryKeys,
  useTranscript,
  useTranscriptsByTarget,
  useCreateTranscript,
  useUpdateTranscript,
  useDeleteTranscript,
} from './queries'

// ============================================================================
// Business Logic Hooks
// ============================================================================

export { useTTS, type UseTTSOptions, type UseTTSReturn } from './use-tts'
export { useRetranscribe } from './player/use-retranscribe'
export { useTranscriptSync, type TranscriptSyncState } from './player/use-transcript-sync'
export { useMediaElement, type UseMediaElementOptions, type UseMediaElementReturn } from './player/use-media-element'

// ============================================================================
// Utility Hooks
// ============================================================================

export { useCopyWithToast } from './use-copy-with-toast'
export { useIsMobile } from './use-mobile'
export { useModelStatus } from './use-model-status'
export { useDisplayTime } from './player/use-display-time'
