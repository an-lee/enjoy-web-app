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

import { useRef, useCallback, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn, createLogger } from '@/lib/utils'
import { usePlayerStore } from '@/stores/player'
import { getAIServiceConfig } from '@/ai/core/config'
import { AIProvider } from '@/ai/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { useDisplayTime } from '@/hooks/use-display-time'
import { useTranscriptDisplay } from './use-transcript-display'
import { useRetranscribe } from '@/hooks/use-retranscribe'
import { useEchoRegion } from './use-echo-region'
import { useAutoScroll } from './use-auto-scroll'
import { TranscriptLines } from './transcript-lines'
import { RetranscribeDialog } from './retranscribe-dialog'
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
  currentTime: _currentTimeProp, // Use useDisplayTime instead for real-time updates
  isPlaying,
  onLineClick,
  config: configOverrides,
  // Optional props for external state management
  lines: externalLines,
  activeLineIndex: externalActiveLineIndex,
  primaryLanguage: externalPrimaryLanguage,
  secondaryLanguage: externalSecondaryLanguage,
  showSecondary: externalShowSecondary,
}: TranscriptDisplayProps) {
  const renderCountRef = useRef(0)
  renderCountRef.current++
  log.debug('TranscriptDisplay render', {
    renderCount: renderCountRef.current,
    isPlaying,
    currentTime: _currentTimeProp,
  })

  const { t } = useTranslation()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const currentSession = usePlayerStore((state) => state.currentSession)
  const activateEchoMode = usePlayerStore((state) => state.activateEchoMode)

  // Get real-time display time from the external store
  const currentTime = useDisplayTime()

  // Merge config with defaults - memoized to prevent unnecessary re-renders
  const config: TranscriptDisplayConfig = useMemo(() => {
    log.debug('Config recalculated', { configOverrides })
    return {
      ...DEFAULT_TRANSCRIPT_CONFIG,
      ...configOverrides,
    }
  }, [configOverrides])

  // Use external props if provided, otherwise use internal state
  const useExternalState = externalLines !== undefined
  const internalTranscriptState = useTranscriptDisplay(currentTime)

  const lines = useExternalState ? externalLines! : internalTranscriptState.lines
  const activeLineIndex = useExternalState
    ? externalActiveLineIndex ?? -1
    : internalTranscriptState.activeLineIndex
  const transcripts = useExternalState
    ? { primary: null, secondary: null, isLoading: false, error: null }
    : internalTranscriptState.transcripts
  const availableTranscripts = useExternalState
    ? []
    : internalTranscriptState.availableTranscripts
  const primaryLanguage = useExternalState
    ? externalPrimaryLanguage ?? null
    : internalTranscriptState.primaryLanguage
  const secondaryLanguage = useExternalState
    ? externalSecondaryLanguage ?? null
    : internalTranscriptState.secondaryLanguage
  const showSecondary = useExternalState
    ? externalShowSecondary ?? false
    : config.showSecondary && !!secondaryLanguage

  // Echo region management
  const {
    echoModeActive,
    echoStartLineIndex,
    echoEndLineIndex,
    echoRegionTimeRange,
    handleExpandEchoForward,
    handleExpandEchoBackward,
    handleShrinkEchoForward,
    handleShrinkEchoBackward,
  } = useEchoRegion(lines)

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

  // Placeholder for recording (not implemented yet)
  const [isRecording, setIsRecording] = useState(false)
  const handleRecord = useCallback(() => {
    // TODO: Implement recording
    setIsRecording((prev) => !prev)
  }, [])

  // Retranscribe functionality - only used if managing state internally
  const { retranscribe, isTranscribing, progress, progressPercent } = useRetranscribe()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Get current ASR provider info
  const asrConfig = getAIServiceConfig('asr')

  // Get media duration for limitations
  const mediaDuration = currentSession?.duration || 0

  // Handle retranscribe with confirmation - only if managing state internally
  const handleConfirmRetranscribe = useCallback(() => {
    setShowConfirmDialog(false)
    retranscribe(primaryLanguage || undefined)
  }, [retranscribe, primaryLanguage])

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

      onLineClick?.(line.startTimeSeconds)
    },
    [onLineClick, echoModeActive, activateEchoMode]
  )

  // Loading state - only show if managing state internally
  if (!useExternalState && transcripts.isLoading) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full',
          className
        )}
      >
        <Icon
          icon="lucide:loader-2"
          className="w-8 h-8 animate-spin text-muted-foreground"
        />
        <p className="mt-3 text-sm text-muted-foreground">
          {t('common.loading')}
        </p>
      </div>
    )
  }

  // Error state - only show if managing state internally
  if (!useExternalState && transcripts.error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full text-center px-4',
          className
        )}
      >
        <Icon
          icon="lucide:alert-circle"
          className="w-8 h-8 text-destructive mb-3"
        />
        <p className="text-sm text-destructive">{transcripts.error}</p>
      </div>
    )
  }

  // Empty state - only show if managing state internally
  if (!useExternalState && availableTranscripts.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full text-center px-4',
          className
        )}
      >
        <Icon
          icon="lucide:subtitles"
          className="w-12 h-12 text-muted-foreground/40 mb-3"
        />
        <p className="text-sm text-muted-foreground">
          {t('player.transcript.noTranscript')}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {t('player.transcript.noTranscriptHint')}
        </p>
      </div>
    )
  }

  // Empty state if no lines provided
  if (lines.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full text-center px-4',
          className
        )}
      >
        <Icon
          icon="lucide:subtitles"
          className="w-12 h-12 text-muted-foreground/40 mb-3"
        />
        <p className="text-sm text-muted-foreground">
          {t('player.transcript.noTranscript')}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>

      {/* Progress indicator for local model - only if managing state internally */}
      {!useExternalState && isTranscribing && asrConfig.provider === AIProvider.LOCAL && progressPercent !== null && (
        <div className="shrink-0 px-4 py-2 border-b bg-background/50">
          <div className="flex items-center gap-2 mb-1">
            <Icon icon="lucide:activity" className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">{progress}</span>
            {progressPercent !== null && (
              <span className="text-xs text-muted-foreground ml-auto">{progressPercent}%</span>
            )}
          </div>
          <Progress value={progressPercent} className="h-1" />
        </div>
      )}

      {/* Confirmation Dialog - only if managing state internally */}
      {!useExternalState && (
        <RetranscribeDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          onConfirm={handleConfirmRetranscribe}
          mediaDuration={mediaDuration}
        />
      )}

      {/* Transcript lines */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
        <TranscriptLines
          lines={lines}
          showSecondary={showSecondary}
          onLineClick={handleLineClick}
          echoModeActive={echoModeActive}
          echoStartLineIndex={echoStartLineIndex}
          echoEndLineIndex={echoEndLineIndex}
          onExpandEchoForward={handleExpandEchoForward}
          onExpandEchoBackward={handleExpandEchoBackward}
          onShrinkEchoForward={handleShrinkEchoForward}
          onShrinkEchoBackward={handleShrinkEchoBackward}
          echoStartTime={echoRegionTimeRange?.startTime}
          echoEndTime={echoRegionTimeRange?.endTime}
          onRecord={echoModeActive ? handleRecord : undefined}
          isRecording={isRecording}
        />
      </ScrollArea>
    </div>
  )
}
