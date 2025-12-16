import { useCallback } from 'react'
import { usePlayerStore } from '@/stores/player'
import { useDisplayTime } from '@/hooks/use-display-time'
import { useTranscriptDisplay } from '@/components/player/transcript/use-transcript-display'
import { createLogger } from '@/lib/utils'

const log = createLogger({ name: 'usePlayerControls' })

/**
 * Unified hook for all player controls
 *
 * Centralizes all player control logic including:
 * - Basic playback controls (play/pause, seek)
 * - Progress bar handling (percentage to time conversion)
 * - Line navigation (prev/next/replay)
 * - Echo mode toggle
 * - Dictation mode (placeholder)
 *
 * This hook should be used by all player UI components to ensure
 * consistent behavior across mini and expanded player modes.
 */
export function usePlayerControls(
  onSeek: (time: number) => void,
  onTogglePlay: () => void
) {
  const displayTime = useDisplayTime()
  const { currentSession } = usePlayerStore()
  const { lines, activeLineIndex } = useTranscriptDisplay(displayTime)
  const {
    echoModeActive,
    activateEchoMode,
    deactivateEchoMode,
  } = usePlayerStore()

  // Handle seek for line navigation (takes time in seconds)
  const handleSeekTime = useCallback(
    (time: number) => {
      onSeek(time)
    },
    [onSeek]
  )

  // Previous line handler
  const handlePrevLine = useCallback(() => {
    if (lines.length === 0 || activeLineIndex < 0) return

    // Find previous line
    const prevIndex = activeLineIndex > 0 ? activeLineIndex - 1 : 0
    const prevLine = lines[prevIndex]
    if (prevLine) {
      if (echoModeActive) {
        activateEchoMode(
          prevIndex,
          prevIndex,
          prevLine.startTimeSeconds,
          prevLine.endTimeSeconds
        )
      }
      onSeek(prevLine.startTimeSeconds)
    }
  }, [lines, activeLineIndex, onSeek, echoModeActive, activateEchoMode])

  // Next line handler
  const handleNextLine = useCallback(() => {
    if (lines.length === 0) return

    // Find next line
    const nextIndex = activeLineIndex < lines.length - 1 ? activeLineIndex + 1 : lines.length - 1
    const nextLine = lines[nextIndex]
    if (nextLine) {
      if (echoModeActive) {
        activateEchoMode(
          nextIndex,
          nextIndex,
          nextLine.startTimeSeconds,
          nextLine.endTimeSeconds
        )
      }
      onSeek(nextLine.startTimeSeconds)
    }
  }, [lines, activeLineIndex, onSeek, echoModeActive, activateEchoMode])

  // Replay current line handler
  const handleReplayLine = useCallback(() => {
    if (lines.length === 0 || activeLineIndex < 0) return

    const currentLine = lines[activeLineIndex]
    if (currentLine) {
      if (echoModeActive) {
        activateEchoMode(
          activeLineIndex,
          activeLineIndex,
          currentLine.startTimeSeconds,
          currentLine.endTimeSeconds
        )
      }
      onSeek(currentLine.startTimeSeconds)
    }
  }, [lines, activeLineIndex, onSeek, echoModeActive, activateEchoMode])

  // Echo mode toggle handler
  const handleEchoMode = useCallback(() => {
    if (echoModeActive) {
      log.debug('Deactivating echo mode')
      deactivateEchoMode()
    } else {
      // Activate echo mode based on current active line
      if (activeLineIndex >= 0 && activeLineIndex < lines.length) {
        const line = lines[activeLineIndex]
        log.debug('Activating echo mode', {
          activeLineIndex,
          startTime: line.startTimeSeconds,
          endTime: line.endTimeSeconds,
        })
        activateEchoMode(
          activeLineIndex,
          activeLineIndex,
          line.startTimeSeconds,
          line.endTimeSeconds
        )
      } else {
        log.warn('Cannot activate echo mode: no active line found', {
          activeLineIndex,
          linesCount: lines.length,
        })
      }
    }
  }, [echoModeActive, activeLineIndex, lines, activateEchoMode, deactivateEchoMode])

  // Handle seek via slider (takes percentage values array)
  const handleSeek = useCallback(
    (values: number[]) => {
      if (!currentSession) return
      const newTime = (values[0] / 100) * currentSession.duration
      onSeek(newTime)
    },
    [currentSession, onSeek]
  )

  // Placeholder handler for dictation mode
  const handleDictationMode = useCallback(() => {
    // TODO: Implement dictation mode
    log.info('Dictation mode - not yet implemented')
  }, [])

  return {
    // Basic controls
    onTogglePlay,
    onSeek: handleSeekTime,

    // Progress bar control (for sliders)
    handleSeek,

    // Line navigation
    handlePrevLine,
    handleNextLine,
    handleReplayLine,

    // Mode toggles
    handleEchoMode,
    handleDictationMode,
  }
}

