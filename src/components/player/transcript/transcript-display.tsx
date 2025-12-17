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
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn, createLogger } from '@/lib/utils'
import { usePlayerStore } from '@/stores/player'
import { getAIServiceConfig } from '@/ai/core/config'
import { AIProvider } from '@/ai/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { useDisplayTime } from '@/hooks/player/use-display-time'
import { usePlayerControls } from '@/hooks/player/use-player-controls'
import { useRetranscribe } from '@/hooks/player/use-retranscribe'
import { useTranscriptDisplay } from './use-transcript-display'
import { useEchoRegion } from '../echo/use-echo-region'
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
  config: configOverrides,
}: TranscriptDisplayProps) {
  const { t } = useTranslation()
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
    primaryLanguage,
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

  // Echo region management
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

      onSeek(line.startTimeSeconds)
    },
    [onSeek, echoModeActive, activateEchoMode]
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

  // Empty state
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

        {/* Show sync status if syncing */}
        {syncState.isSyncing && (
          <>
            <Icon
              icon="lucide:loader-2"
              className="w-6 h-6 animate-spin text-primary mb-2"
            />
            <p className="text-sm text-muted-foreground mb-1">
              {t('player.transcript.syncing', { defaultValue: 'Syncing transcripts from server...' })}
            </p>
          </>
        )}

        {/* Show error if sync failed */}
        {syncState.hasSynced && syncState.error && !syncState.isSyncing && (
          <p className="text-sm text-destructive mb-3">
            {syncState.error}
          </p>
        )}

        {/* Show no transcript message */}
        {!syncState.isSyncing && (
          <>
            <p className="text-sm text-muted-foreground">
              {t('player.transcript.noTranscript')}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {t('player.transcript.noTranscriptHint')}
            </p>
          </>
        )}

        {/* Show generate transcript button if sync completed and still no transcripts */}
        {syncState.hasSynced && !syncState.isSyncing && availableTranscripts.length === 0 && (
          <button
            type="button"
            onClick={handleConfirmRetranscribe}
            disabled={isTranscribing}
            className={cn(
              'mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            {isTranscribing ? (
              <>
                <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                <span>{progress || t('player.transcript.retranscribing')}</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:mic" className="w-4 h-4" />
                <span>{t('player.transcript.generateTranscript', { defaultValue: 'Generate Transcript' })}</span>
              </>
            )}
          </button>
        )}
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
      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
        <TranscriptLines
          lines={lines}
          onLineClick={handleLineClick}
        />
      </ScrollArea>
    </div>
  )
}
