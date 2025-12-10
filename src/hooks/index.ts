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
  useAudios,
  useAudioHistory,
  useSaveAudio,
  useDeleteAudio,
  type AudioLoader,
  type UseAudioOptions,
  type UseAudioReturn,
  type AudioWithUrl,
  type UseAudiosOptions,
  type UseAudiosReturn,
  // Translation
  translationQueryKeys,
  useTranslationHistory,
  useFindExistingTranslation,
  useSaveTranslation,
  useUpdateTranslation,
  findExistingTranslation,
  // Transcript
  transcriptQueryKeys,
  useTranscript,
  useTranscriptsByTarget,
  useSaveTranscript,
  useUpdateTranscript,
  useDeleteTranscript,
} from './queries'

// ============================================================================
// Business Logic Hooks
// ============================================================================

export { useTTS, type UseTTSOptions, type UseTTSReturn } from './use-tts'

// ============================================================================
// Utility Hooks
// ============================================================================

export { useCopyWithToast } from './use-copy-with-toast'
export { useIsMobile } from './use-mobile'
export { useModelStatus } from './use-model-status'
