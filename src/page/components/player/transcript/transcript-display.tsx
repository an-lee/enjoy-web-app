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
import { cn, createLogger } from '@/shared/lib/utils'
import { usePlayerStore } from '@/page/stores/player'
import { getAIServiceConfig } from '@/page/ai/core/config'
import { AIProvider } from '@/page/ai/types'
import { ScrollArea } from '@/page/components/ui/scroll-area'
import { Progress } from '@/page/components/ui/progress'
import { useDisplayTime, usePlayerControls, useRetranscribe, useEchoRegion, useEchoRegionManager } from '@/page/hooks/player'
import { useTranscriptDisplay } from '../../../hooks/player/use-transcript-display'
import { useAutoScroll } from '../../../hooks/player/use-auto-scroll'
import { useUploadSubtitle } from '../../../hooks/player/use-upload-subtitle'
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


  // Retranscribe functionality
  const { retranscribe, isTranscribing, progress, progressPercent } = useRetranscribe()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Upload subtitle functionality
  const {
    triggerFileSelect,
    handleFileSelect,
    fileInputRef,
    isUploading: isUploadingSubtitle,
  } = useUploadSubtitle()

  // Get current ASR provider info
  const asrConfig = getAIServiceConfig('asr')

  // Get media duration for limitations
  const mediaDuration = currentSession?.duration || 0

  // Handle retranscribe with confirmation
  const handleConfirmRetranscribe = useCallback(() => {
    setShowConfirmDialog(false)
    retranscribe(primaryLanguage || undefined)
  }, [retranscribe, primaryLanguage])

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

  // Empty state - show when no transcripts available
  // Logic:
  // 1. If syncing, show loading state
  // 2. If sync completed and no transcripts, show empty state with upload/transcribe buttons
  // 3. If transcribing, show progress (handled separately in main render)
  const showEmptyState = availableTranscripts.length === 0

  if (showEmptyState) {
    // Show loading state while syncing
    if (syncState.isSyncing) {
      return (
        <div
          className={cn(
            'flex flex-col items-center justify-center h-full text-center px-4',
            className
          )}
        >
          <Icon
            icon="lucide:loader-2"
            className="w-8 h-8 animate-spin text-primary mb-3"
          />
          <p className="text-sm text-muted-foreground">
            {t('player.transcript.syncing', { defaultValue: 'Syncing transcripts from server...' })}
          </p>
        </div>
      )
    }

    // Show empty state with action buttons after sync completes
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

        <p className="text-sm text-muted-foreground mb-1">
          {t('player.transcript.noTranscript')}
        </p>
        <p className="text-xs text-muted-foreground/60 mb-4">
          {t('player.transcript.noTranscriptHint')}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {/* Upload Subtitle Button */}
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".srt,.vtt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={triggerFileSelect}
              disabled={isUploadingSubtitle || isTranscribing}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              {isUploadingSubtitle ? (
                <>
                  <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                  <span>{t('common.loading')}</span>
                </>
              ) : (
                <>
                  <Icon icon="lucide:upload" className="w-4 h-4" />
                  <span>{t('player.transcript.uploadSubtitle', { defaultValue: 'Upload Subtitle' })}</span>
                </>
              )}
            </button>
          </div>

          {/* Transcribe Button */}
          <button
            type="button"
            onClick={handleTranscribeClick}
            disabled={isTranscribing || isUploadingSubtitle}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
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
        </div>
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
