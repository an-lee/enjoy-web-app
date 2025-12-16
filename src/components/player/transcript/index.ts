/**
 * Transcript Display Module
 *
 * Exports transcript display components and hooks for the player.
 */

// Main component
export { TranscriptDisplay } from './transcript-display'

// Sub-components (exported for potential external use)
export { ShadowReadingPanel } from './shadow-reading-panel'
export { ShadowRecorder } from './shadow-recorder'
export { ShadowRecordingProgress } from './shadow-recording-progress'
export { ShadowRecordingList } from './shadow-recording-list'
export { RecordingPlayer } from './recording-player'
export { TranscriptLineItem } from './transcript-line-item'
export { LanguageSelector } from './language-selector'
export { TranscriptHeader } from './transcript-header'
export { TranscriptLines } from './transcript-lines'
export { EchoRegionControls } from './echo-region-controls'
export { RetranscribeDialog } from './retranscribe-dialog'

// Hooks
export { useTranscriptDisplay } from './use-transcript-display'
export { useEchoRegion } from './use-echo-region'
export { useAutoScroll } from './use-auto-scroll'

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

