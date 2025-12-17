import { useCallback } from 'react'
import { usePlayerStore } from '@/stores/player'
import { setDisplayTime } from '@/hooks/use-display-time'
import { useTranscriptDisplay } from '@/components/player/transcript'
import {
  clampSeekTimeToEchoWindow,
  normalizeEchoWindow,
} from '@/components/player/echo/echo-utils'
import { createLogger } from '@/lib/utils'

const log = createLogger({ name: 'usePlayerControls' })

/**
 * Find the media element in the DOM
 * This is a fallback when mediaRef is not available
 */
function findMediaElement(): HTMLAudioElement | HTMLVideoElement | null {
  // The media element is hidden in a div with class "hidden"
  const hiddenDiv = document.querySelector('.hidden audio, .hidden video')
  return hiddenDiv as HTMLAudioElement | HTMLVideoElement | null
}

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
export function usePlayerControls() {
  const {
    currentSession,
    setPlaying,
    updateProgress,
    echoModeActive,
    echoStartTime,
    echoEndTime,
    activateEchoMode,
    deactivateEchoMode,
  } = usePlayerStore()
  const { lines, activeLineIndex } = useTranscriptDisplay()

  // Calculate echo window
  const echoWindow = normalizeEchoWindow({
    active: echoModeActive,
    startTimeSeconds: echoStartTime,
    endTimeSeconds: echoEndTime,
    durationSeconds: currentSession?.duration,
  })

  // Seek to a specific time (basic action)
  const seek = useCallback(
    (time: number) => {
      const el = findMediaElement()
      if (!el) {
        log.warn('Media element not found, cannot seek')
        return
      }

      const nextTime = echoWindow ? clampSeekTimeToEchoWindow(time, echoWindow) : time
      el.currentTime = nextTime
      setDisplayTime(nextTime)
      updateProgress(nextTime)
    },
    [echoWindow, updateProgress]
  )

  // Toggle play/pause (basic action)
  const togglePlay = useCallback(() => {
    const el = findMediaElement()
    if (!el) {
      log.warn('Media element not found, cannot toggle play')
      return
    }

    log.debug('togglePlay', { paused: el.paused })

    if (el.paused) {
      el.play()
        .then(() => {
          log.debug('play() resolved')
          setPlaying(true)
        })
        .catch((err) => {
          log.warn('play() blocked:', err)
        })
    } else {
      el.pause()
      setPlaying(false)
      updateProgress(el.currentTime)
    }
  }, [setPlaying, updateProgress])

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
      seek(currentLine.startTimeSeconds)
    }
  }, [lines, activeLineIndex, seek, echoModeActive, activateEchoMode])

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

