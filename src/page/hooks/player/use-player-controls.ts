import { useCallback } from 'react'
import { usePlayerStore } from '@/page/stores/player'
import { useTranscriptDisplay } from '@/page/hooks/player'
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
 * This hook uses the registered media controls from the store,
 * which are provided by the PlayerContainer component via useMediaElement.
 *
 * This hook should be used by all player UI components to ensure
 * consistent behavior across mini and expanded player modes.
 */
export function usePlayerControls() {
  const {
    currentSession,
    echoModeActive,
    echoStartTime,
    activateEchoMode,
    deactivateEchoMode,
    _mediaControls,
  } = usePlayerStore()
  const { lines, activeLineIndex } = useTranscriptDisplay()

  // Seek to a specific time (basic action)
  // Uses registered media controls which handle echo window constraints
  const seek = useCallback(
    (time: number) => {
      if (!_mediaControls) {
        log.warn('Media controls not registered, cannot seek')
        return
      }
      _mediaControls.seek(time)
    },
    [_mediaControls]
  )

  // Toggle play/pause (basic action)
  const togglePlay = useCallback(() => {
    if (!_mediaControls) {
      log.warn('Media controls not registered, cannot toggle play')
      return
    }

    const isPaused = _mediaControls.isPaused()
    log.debug('togglePlay', { isPaused })

    if (isPaused) {
      _mediaControls.play().catch((err) => {
        log.warn('play() blocked:', err)
      })
    } else {
      _mediaControls.pause()
    }
  }, [_mediaControls])

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
      seek(prevLine.startTimeSeconds)
    }
  }, [lines, activeLineIndex, seek, echoModeActive, activateEchoMode])

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
      seek(nextLine.startTimeSeconds)
    }
  }, [lines, activeLineIndex, seek, echoModeActive, activateEchoMode])

  // Replay current line handler
  const handleReplayLine = useCallback(() => {
    if (!_mediaControls) {
      log.warn('Media controls not registered, cannot replay')
      return
    }

    if (echoModeActive) {
      // In echo mode: replay from the beginning of the current echo region
      // Don't change the echo region
      seek(echoStartTime)
    } else {
      // In non-echo mode: replay from the current line's start
      if (lines.length === 0 || activeLineIndex < 0) return
      const currentLine = lines[activeLineIndex]
      if (currentLine) {
        seek(currentLine.startTimeSeconds)
      }
    }

    // Always start playing
    if (_mediaControls.isPaused()) {
      _mediaControls.play().catch((err) => {
        log.warn('play() blocked:', err)
      })
    }
  }, [lines, activeLineIndex, seek, echoModeActive, echoStartTime, _mediaControls])

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
      seek(newTime)
    },
    [currentSession, seek]
  )

  // Placeholder handler for dictation mode
  const handleDictationMode = useCallback(() => {
    // TODO: Implement dictation mode
    log.info('Dictation mode - not yet implemented')
  }, [])

  return {
    // Basic controls
    onTogglePlay: togglePlay,
    onSeek: seek,

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

