/**
 * Transcript Display Types
 *
 * Types for transcript display component configuration and state management.
 */

import type { Transcript, TranscriptLine } from '@/types/db'

// ============================================================================
// Display Configuration
// ============================================================================

/**
 * Configuration for transcript display behavior
 */
export interface TranscriptDisplayConfig {
  /** Enable auto-scroll to current line when playing */
  autoScroll: boolean
  /** Scroll behavior: smooth animation or instant jump */
  scrollBehavior: 'smooth' | 'instant'
  /** Scroll position: center the active line or show at top */
  scrollPosition: 'center' | 'top'
  /** Show secondary transcript (translation) */
  showSecondary: boolean
  /** Highlight mode for active line */
  highlightMode: 'line' | 'word'
}

/**
 * Default display configuration
 */
export const DEFAULT_TRANSCRIPT_CONFIG: TranscriptDisplayConfig = {
  autoScroll: true,
  scrollBehavior: 'smooth',
  scrollPosition: 'center',
  showSecondary: true,
  highlightMode: 'line',
}

// ============================================================================
// Line State
// ============================================================================

/**
 * State for a single transcript line
 */
export interface TranscriptLineState {
  /** Line index in the transcript */
  index: number
  /** Primary transcript line data */
  primary: TranscriptLine
  /** Secondary transcript line data (if available and aligned) */
  secondary?: TranscriptLine
  /** Whether this line is currently active */
  isActive: boolean
  /** Whether this line has been played */
  isPast: boolean
  /** Start time in seconds (converted from milliseconds) */
  startTimeSeconds: number
  /** End time in seconds (converted from milliseconds) */
  endTimeSeconds: number
}

// ============================================================================
// Transcript Selection
// ============================================================================

/**
 * Selected transcripts for display
 */
export interface SelectedTranscripts {
  /** Primary transcript (main language) */
  primary: Transcript | null
  /** Secondary transcript (translation/alternative) */
  secondary: Transcript | null
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: string | null
}

// ============================================================================
// Component Props
// ============================================================================

/**
 * Props for TranscriptDisplay component
 */
export interface TranscriptDisplayProps {
  /** CSS class name */
  className?: string
  /** Display configuration */
  config?: Partial<TranscriptDisplayConfig>
}

/**
 * Props for TranscriptLine component
 */
export interface TranscriptLineProps {
  /** Line state */
  line: TranscriptLineState
  /** Whether this line is active */
  isActive: boolean
  /** Click handler */
  onClick?: () => void
  /** Show secondary text */
  showSecondary?: boolean
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useTranscriptDisplay hook
 */
export interface UseTranscriptDisplayReturn {
  /** Processed lines with state */
  lines: TranscriptLineState[]
  /** Currently active line index */
  activeLineIndex: number
  /** Selected transcripts */
  transcripts: SelectedTranscripts
  /** Available transcripts for the current media */
  availableTranscripts: Transcript[]
  /** Set primary transcript by language */
  setPrimaryLanguage: (language: string) => void
  /** Set secondary transcript by language */
  setSecondaryLanguage: (language: string | null) => void
  /** Current primary language */
  primaryLanguage: string | null
  /** Current secondary language */
  secondaryLanguage: string | null
  /** Transcript sync state */
  syncState: {
    isSyncing: boolean
    hasSynced: boolean
    error: string | null
    syncTranscripts: () => Promise<void>
  }
}

