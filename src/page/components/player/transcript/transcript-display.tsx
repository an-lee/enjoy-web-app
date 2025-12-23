/**
 * TranscriptDisplay - Lyrics-style transcript display component
 *
 * Features:
 * - Primary and secondary (translation) transcript support
 * - Time-based highlighting of current line
 * - Auto-scroll to active line when playing
 * - Click to seek functionality
 * - Smooth transitions and elegant styling
 */

import { useRef, useCallback, useState, useMemo, useEffect } from 'react'
import { cn, createLogger } from '@/shared/lib/utils'
import { usePlayerStore } from '@/page/stores/player'
import { getAIServiceConfig } from '@/page/ai/core/config'
import { AIProvider } from '@/page/ai/types'
import { ScrollArea } from '@/page/components/ui/scroll-area'
import { useDisplayTime, usePlayerControls, useRetranscribe, useEchoRegion, useEchoRegionManager } from '@/page/hooks/player'
import { useTranscriptDisplay } from '../../../hooks/player/use-transcript-display'
import { useAutoScroll } from '../../../hooks/player/use-auto-scroll'
import { useUploadSubtitle } from '../../../hooks/player/use-upload-subtitle'
import { TranscriptLines } from './transcript-lines'
import { RetranscribeDialog } from './retranscribe-dialog'
import { TranscriptLoadingState } from './transcript-loading-state'
import { TranscriptErrorState } from './transcript-error-state'
import { TranscriptEmptyState } from './transcript-empty-state'
import { TranscriptProgressIndicator } from './transcript-progress-indicator'
import { DEFAULT_TRANSCRIPT_CONFIG } from './types'
import type {
  TranscriptDisplayProps,
  TranscriptDisplayConfig,
  TranscriptLineState,
} from './types'

// ============================================================================
// Constants
// ============================================================================

// Logger for debugging
const log = createLogger({ name: 'TranscriptDisplay' })

// ============================================================================
// Main Component
// ============================================================================

export function TranscriptDisplay({
  className,
  config: configOverrides,
  mediaRef,
}: TranscriptDisplayProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const currentSession = usePlayerStore((state) => state.currentSession)
  const activateEchoMode = usePlayerStore((state) => state.activateEchoMode)
  const isPlaying = usePlayerStore((state) => state.isPlaying)

  // Get real-time display time from the external store
  const currentTime = useDisplayTime()

  // Get player controls for line click handling
  const { onSeek } = usePlayerControls()

  // Merge config with defaults - memoized to prevent unnecessary re-renders
  const config: TranscriptDisplayConfig = useMemo(() => {
    return {
      ...DEFAULT_TRANSCRIPT_CONFIG,
      ...configOverrides,
    }
  }, [configOverrides])

  // Get transcript data from hook
  const {
    lines,
    activeLineIndex,
    transcripts,
    availableTranscripts,
    syncState,
  } = useTranscriptDisplay()

  // Track previous activeLineIndex to only log when it changes
  const prevActiveLineIndexRef = useRef<number>(activeLineIndex)
  useEffect(() => {
    if (prevActiveLineIndexRef.current !== activeLineIndex) {
      log.debug('Active line changed', {
        previousIndex: prevActiveLineIndexRef.current,
        currentIndex: activeLineIndex,
        isPlaying,
        currentTime,
      })
      prevActiveLineIndexRef.current = activeLineIndex
    }
  }, [activeLineIndex, isPlaying, currentTime])

  // Echo region management - useEchoRegionManager handles side effects and should only be called once
  useEchoRegionManager()

  // Echo region state (no lines needed here as we only read state)
  const {
    echoModeActive,
    echoStartLineIndex,
    echoEndLineIndex,
  } = useEchoRegion()

  // Auto-scroll to active line
  const scrollTargetIndex = useMemo(() => {
    // In echo mode, we want playback UX to keep the echo region in view.
    // If activeLineIndex is momentarily unknown (e.g., timestamp gaps), we fall back to the echo start line.
    if (echoModeActive && echoStartLineIndex >= 0 && echoEndLineIndex >= echoStartLineIndex) {
      if (activeLineIndex < 0) return echoStartLineIndex
      if (activeLineIndex < echoStartLineIndex) return echoStartLineIndex
      if (activeLineIndex > echoEndLineIndex) return echoEndLineIndex
      return activeLineIndex
    }

    return activeLineIndex
  }, [echoModeActive, echoStartLineIndex, echoEndLineIndex, activeLineIndex])

  useAutoScroll(scrollTargetIndex, isPlaying, config, scrollAreaRef)


  // Retranscribe functionality (only for status, actual retranscribe is handled in RetranscribeDialog)
  const { isTranscribing, progress, progressPercent } = useRetranscribe({
    mediaRef,
  })
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Upload subtitle functionality
  const {
    triggerFileSelect,
    handleFileSelect,
    fileInputRef,
    isUploading: isUploadingSubtitle,
  } = useUploadSubtitle()

  // Get media duration for limitations
  const mediaDuration = currentSession?.duration || 0

  // Handle transcribe button click
  const handleTranscribeClick = useCallback(() => {
    setShowConfirmDialog(true)
  }, [])

  // Handle line click
  const handleLineClick = useCallback(
    (line: TranscriptLineState) => {
      // In echo mode, clicking outside the current region should still work:
      // we move the echo region to the selected line (single-line window),
      // then seek (PlayerContainer will enforce the updated window).
      if (echoModeActive) {
        activateEchoMode(
          line.index,
          line.index,
          line.startTimeSeconds,
          line.endTimeSeconds
        )
      }

      onSeek(line.startTimeSeconds)
    },
    [onSeek, echoModeActive, activateEchoMode]
  )

  // Get current ASR provider info for progress indicator
  const asrConfig = getAIServiceConfig('asr')
  const showProgressIndicator = isTranscribing && asrConfig.provider === AIProvider.LOCAL && progressPercent !== null

  // Determine if we should show empty state
  const showEmptyState = availableTranscripts.length === 0 || lines.length === 0

  // Render RetranscribeDialog at the top level so it's always available
  const dialogElement = (
    <RetranscribeDialog
      open={showConfirmDialog}
      onOpenChange={setShowConfirmDialog}
      mediaDuration={mediaDuration}
      mediaRef={mediaRef}
    />
  )

  // Loading state
  if (transcripts.isLoading) {
    return (
      <>
        {dialogElement}
        <TranscriptLoadingState className={className} />
      </>
    )
  }

  // Error state
  if (transcripts.error) {
    return (
      <>
        {dialogElement}
        <TranscriptErrorState className={className} error={transcripts.error} />
      </>
    )
  }

  // Empty state - show when no transcripts available or no lines
  if (showEmptyState) {
    return (
      <>
        {dialogElement}
        <TranscriptEmptyState
          className={className}
          isSyncing={syncState.isSyncing}
          isTranscribing={isTranscribing}
          isUploading={isUploadingSubtitle}
          onUploadClick={triggerFileSelect}
          onTranscribeClick={handleTranscribeClick}
          transcribeProgress={progress}
          fileInputRef={fileInputRef}
          onFileSelect={handleFileSelect}
        />
      </>
    )
  }

  // Main content: transcript lines with progress indicator
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {dialogElement}

      {/* Progress indicator for local model */}
      {showProgressIndicator && (
        <TranscriptProgressIndicator
          progress={progress}
          progressPercent={progressPercent}
        />
      )}

      {/* Transcript lines */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
        <TranscriptLines
          lines={lines}
          onLineClick={handleLineClick}
        />
      </ScrollArea>
    </div>
  )
}
