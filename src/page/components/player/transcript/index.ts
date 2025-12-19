/**
 * Transcript Display Module
 *
 */

// Main component
export { TranscriptDisplay } from './transcript-display'

// Core components
export { TranscriptLines } from './transcript-lines'
export { TranscriptLineItem } from './transcript-line-item'
export { RetranscribeDialog } from './retranscribe-dialog'

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
