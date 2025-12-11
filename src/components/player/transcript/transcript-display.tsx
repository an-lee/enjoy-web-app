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
import { ShadowReadingPanel } from './shadow-reading-panel'
import { TranscriptHeader } from './transcript-header'
import { TranscriptLines } from './transcript-lines'
import { RetranscribeDialog } from './retranscribe-dialog'
import { DEFAULT_TRANSCRIPT_CONFIG } from './types'
import type {
  TranscriptDisplayProps,
  TranscriptDisplayConfig,
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

  // Get transcript state
  const {
    lines,
    activeLineIndex,
    transcripts,
    availableTranscripts,
    setPrimaryLanguage,
    setSecondaryLanguage,
    primaryLanguage,
    secondaryLanguage,
  } = useTranscriptDisplay(currentTime)

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
  useAutoScroll(activeLineIndex, isPlaying, config, scrollAreaRef)

  // Placeholder for recording (not implemented yet)
  const [isRecording, setIsRecording] = useState(false)
  const handleRecord = useCallback(() => {
    // TODO: Implement recording
    setIsRecording((prev) => !prev)
  }, [])

  // Retranscribe functionality
  const { retranscribe, isTranscribing, progress, progressPercent } = useRetranscribe()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Get current ASR provider info
  const asrConfig = getAIServiceConfig('asr')

  // Get media duration for limitations
  const mediaDuration = currentSession?.duration || 0

  // Handle retranscribe with confirmation
  const handleRetranscribeClick = useCallback(() => {
    setShowConfirmDialog(true)
  }, [])

  const handleConfirmRetranscribe = useCallback(() => {
    setShowConfirmDialog(false)
    retranscribe(primaryLanguage || undefined)
  }, [retranscribe, primaryLanguage])

  // Handle secondary language change
  const handleSecondaryChange = useCallback(
    (value: string) => {
      if (value === 'none') {
        setSecondaryLanguage(null)
      } else {
        setSecondaryLanguage(value)
      }
    },
    [setSecondaryLanguage]
  )

  // Handle clear secondary language
  const handleClearSecondaryLanguage = useCallback(() => {
    setSecondaryLanguage(null)
  }, [setSecondaryLanguage])

  // Handle line click
  const handleLineClick = useCallback(
    (startTimeSeconds: number) => {
      onLineClick?.(startTimeSeconds)
    },
    [onLineClick]
  )

  // Loading state
  if (transcripts.isLoading) {
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

  // Error state
  if (transcripts.error) {
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

  // Empty state - no transcripts available
  if (availableTranscripts.length === 0) {
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

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with language selectors and retranscribe button */}
      <TranscriptHeader
        primaryLanguage={primaryLanguage}
        secondaryLanguage={secondaryLanguage}
        availableTranscripts={availableTranscripts}
        onPrimaryLanguageChange={setPrimaryLanguage}
        onSecondaryLanguageChange={handleSecondaryChange}
        onClearSecondaryLanguage={handleClearSecondaryLanguage}
        onRetranscribe={handleRetranscribeClick}
        isTranscribing={isTranscribing}
        progress={progress}
        hasCurrentSession={!!currentSession}
      />

      {/* Progress indicator for local model */}
      {isTranscribing && asrConfig.provider === AIProvider.LOCAL && progressPercent !== null && (
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

      {/* Confirmation Dialog */}
      <RetranscribeDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirmRetranscribe}
        mediaDuration={mediaDuration}
      />

      {/* Transcript lines */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <TranscriptLines
          lines={lines}
          showSecondary={config.showSecondary && !!secondaryLanguage}
          onLineClick={handleLineClick}
          echoModeActive={echoModeActive}
          echoStartLineIndex={echoStartLineIndex}
          echoEndLineIndex={echoEndLineIndex}
          onExpandEchoForward={handleExpandEchoForward}
          onExpandEchoBackward={handleExpandEchoBackward}
          onShrinkEchoForward={handleShrinkEchoForward}
          onShrinkEchoBackward={handleShrinkEchoBackward}
        />
      </ScrollArea>

      {/* Shadow Reading Panel - shown when echo mode is active */}
      {echoModeActive && echoRegionTimeRange ? (
        <ShadowReadingPanel
          startTime={echoRegionTimeRange.startTime}
          endTime={echoRegionTimeRange.endTime}
          onRecord={handleRecord}
          isRecording={isRecording}
        />
      ) : null}
    </div>
  )
}
