/**
 * ExpandedPlayer - Expanded player view for language learning practice
 *
 * Modern, minimal design with learning-focused controls:
 * - Row 1: Progress bar with time labels
 * - Row 2: Main controls (prev/play/next/replay) + Secondary controls (volume/speed/dictation/echo)
 */

import { useCallback, useState, useMemo } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { usePlayerStore } from '@/stores/player'
import { useDisplayTime } from '@/hooks/use-display-time'
import { useRetranscribe } from '@/hooks/use-retranscribe'
import { usePlayerControls } from '@/hooks/use-player-controls'
import { useTranscriptDisplay } from '../transcript/use-transcript-display'
import { LANGUAGE_NAMES } from '../transcript/constants'
import { ExpandedPlayerHeader } from './expanded-player-header'
import { ExpandedPlayerContent } from './expanded-player-content'
import { ExpandedPlayerControls } from './expanded-player-controls'
import type { ExpandedPlayerProps } from './types'

// ============================================================================
// Component
// ============================================================================

export function ExpandedPlayer({
  className,
  isLoading,
  error,
  isVideo,
  onSeek,
  onTogglePlay,
}: ExpandedPlayerProps) {
  const displayTime = useDisplayTime()

  // Player state
  const {
    currentSession,
    isPlaying,
    volume,
    playbackRate,
    collapse,
    hide,
    setVolume,
    setPlaybackRate,
    echoModeActive,
  } = usePlayerStore()

  // Get transcript data and state management
  const {
    lines,
    activeLineIndex,
    availableTranscripts,
    setPrimaryLanguage,
    setSecondaryLanguage,
    primaryLanguage,
    secondaryLanguage,
  } = useTranscriptDisplay(displayTime)

  // Retranscribe functionality
  const { retranscribe, isTranscribing, progress: retranscribeProgress } = useRetranscribe()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Get media duration for limitations
  const mediaDuration = currentSession?.duration || 0

  // Build language options
  const languageOptions = useMemo(
    () =>
      availableTranscripts.map((t) => ({
        value: t.language,
        label: LANGUAGE_NAMES[t.language] || t.language.toUpperCase(),
      })),
    [availableTranscripts]
  )

  // Secondary language options - filtered to exclude primary
  const secondaryLanguageOptions = useMemo(
    () => languageOptions.filter((o) => o.value !== primaryLanguage),
    [languageOptions, primaryLanguage]
  )

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

  // Get all player controls from unified hook
  const controls = usePlayerControls(
    onSeek || (() => {}),
    onTogglePlay || (() => {})
  )

  if (!currentSession) return null

  const progress =
    currentSession.duration > 0
      ? (displayTime / currentSession.duration) * 100
      : 0

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'fixed inset-0 z-50',
          'bg-background',
          'animate-in fade-in duration-200',
          'flex flex-col',
          className
        )}
      >
        <ExpandedPlayerHeader
          mediaTitle={currentSession.mediaTitle}
          language={currentSession.language}
          collapse={collapse}
          hide={hide}
          availableTranscripts={availableTranscripts}
          languageOptions={languageOptions}
          secondaryLanguageOptions={secondaryLanguageOptions}
          primaryLanguage={primaryLanguage}
          secondaryLanguage={secondaryLanguage}
          setPrimaryLanguage={setPrimaryLanguage}
          handleSecondaryChange={handleSecondaryChange}
          handleClearSecondaryLanguage={handleClearSecondaryLanguage}
          drawerOpen={drawerOpen}
          setDrawerOpen={setDrawerOpen}
          handleRetranscribeClick={handleRetranscribeClick}
          isTranscribing={isTranscribing}
          retranscribeProgress={retranscribeProgress}
          showConfirmDialog={showConfirmDialog}
          setShowConfirmDialog={setShowConfirmDialog}
          handleConfirmRetranscribe={handleConfirmRetranscribe}
          mediaDuration={mediaDuration}
          currentSession={currentSession}
        />

        <ExpandedPlayerContent
          isLoading={isLoading}
          error={error}
          isVideo={isVideo}
          displayTime={displayTime}
          isPlaying={isPlaying}
          onSeek={onSeek}
          lines={lines}
          activeLineIndex={activeLineIndex}
          primaryLanguage={primaryLanguage}
          secondaryLanguage={secondaryLanguage}
        />

        <ExpandedPlayerControls
          displayTime={displayTime}
          duration={currentSession.duration}
          progress={progress}
          isPlaying={isPlaying}
          volume={volume}
          playbackRate={playbackRate}
          echoModeActive={echoModeActive}
          onSeek={controls.handleSeek}
          onTogglePlay={controls.onTogglePlay}
          onDictationMode={controls.handleDictationMode}
          onEchoMode={controls.handleEchoMode}
          onVolumeChange={setVolume}
          onPlaybackRateChange={setPlaybackRate}
          onPrevLine={controls.handlePrevLine}
          onNextLine={controls.handleNextLine}
          onReplayLine={controls.handleReplayLine}
        />
      </div>
    </TooltipProvider>
  )
}

