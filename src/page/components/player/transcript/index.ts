/**
 * Transcript Display Module
 *
 */

// Main component
export { TranscriptDisplay } from './transcript-display'

// Core components
export { TranscriptLines } from './transcript-lines'
export { TranscriptLineItem } from './transcript-line-item'
export { TranscribeDialog } from './transcribe-dialog'

// State components
export { TranscriptLoadingState } from './transcript-loading-state'
export { TranscriptErrorState } from './transcript-error-state'
export { TranscriptEmptyState } from './transcript-empty-state'
export { TranscriptProgressIndicator } from './transcript-progress-indicator'

// Types
export type {
  TranscriptDisplayConfig,
  TranscriptDisplayProps,
  TranscriptLineState,
  SelectedTranscripts,
  UseTranscriptDisplayReturn,
} from './types'
export { DEFAULT_TRANSCRIPT_CONFIG } from './types'

// Constants
export { SCROLL_OFFSET, LANGUAGE_NAMES } from './constants'
