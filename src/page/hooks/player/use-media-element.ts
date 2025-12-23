/**
 * useMediaElement Hook
 *
 * Manages media element operations and event handlers for player container.
 * Handles:
 * - Seek operations with echo window constraints
 * - Play/pause toggle
 * - Time update events with throttling
 * - Media ended events
 * - Media ready events (canplay)
 * - Error handling
 */

import { useCallback, useRef, useEffect } from 'react'
import { usePlayerSessionStore } from '@/page/stores/player/player-session-store'
import { usePlayerEchoStore } from '@/page/stores/player/player-echo-store'
import { usePlayerUIStore } from '@/page/stores/player/player-ui-store'
import { usePlayerSettingsStore } from '@/page/stores/player/player-settings-store'
import { setDisplayTime } from '@/page/hooks/player/use-display-time'
import {
  clampSeekTimeToEchoWindow,
  decideEchoPlaybackTime,
  normalizeEchoWindow,
  type EchoWindow,
} from '@/page/components/player/echo'
import { createLogger } from '@/shared/lib/utils'

const log = createLogger({ name: 'useMediaElement' })

export interface UseMediaElementOptions {
  /** Media element ref */
  mediaRef: React.RefObject<HTMLAudioElement | HTMLVideoElement | null>
  /** Callback when media becomes ready */
  onReady?: (isReady: boolean) => void
  /** Callback when error occurs */
  onError?: (error: string) => void
}

export interface UseMediaElementReturn {
  /** Time update event handler */
  handleTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement | HTMLVideoElement>) => void
  /** Media ended event handler */
  handleEnded: () => void
  /** Media canplay event handler */
  handleCanPlay: (e: React.SyntheticEvent<HTMLAudioElement | HTMLVideoElement>) => void
  /** Media error event handler */
  handleLoadError: (e: React.SyntheticEvent<HTMLAudioElement | HTMLVideoElement>) => void
}

export function useMediaElement({
  mediaRef,
  onReady,
  onError,
}: UseMediaElementOptions): UseMediaElementReturn {
  const currentSession = usePlayerSessionStore((s) => s.currentSession)
  const updateProgress = usePlayerSessionStore((s) => s.updateProgress)
  const echoModeActive = usePlayerEchoStore((s) => s.echoModeActive)
  const echoStartTime = usePlayerEchoStore((s) => s.echoStartTime)
  const echoEndTime = usePlayerEchoStore((s) => s.echoEndTime)
  const setPlaying = usePlayerUIStore((s) => s.setPlaying)

  const lastStoreUpdateRef = useRef(0)
  const hasRestoredPositionRef = useRef(false)

  // Calculate echo window
  const echoWindow: EchoWindow | null = normalizeEchoWindow({
    active: echoModeActive,
    startTimeSeconds: echoStartTime,
    endTimeSeconds: echoEndTime,
    durationSeconds: currentSession?.duration,
  })

  // Note: handleSeek and handleTogglePlay are not returned from this hook
  // They are available through usePlayerControls() hook which uses store.getMediaControls()
  // This avoids duplication and ensures all controls go through the store

  // Handle time update events
  const handleTimeUpdate = useCallback(
    (e: React.SyntheticEvent<HTMLAudioElement | HTMLVideoElement>) => {
      const el = e.currentTarget
      const time = el.currentTime

      // Echo mode guard: keep playback strictly inside window.
      // This is applied before throttled store updates so looping/clamping is immediate.
      if (echoWindow) {
        const decision = decideEchoPlaybackTime(time, echoWindow)
        if (decision.kind !== 'ok') {
          const nextTime = decision.timeSeconds
          el.currentTime = nextTime
          setDisplayTime(nextTime)
          updateProgress(nextTime)
          lastStoreUpdateRef.current = Date.now()
          // Echo mode should not auto-loop infinitely.
          // When reaching the end, rewind to start and pause.
          el.pause()
          setPlaying(false)
          return
        }
      }

      // Update display time (external store, doesn't cause re-render of this component)
      setDisplayTime(time)

      // Throttle store updates to every 2 seconds
      const now = Date.now()
      if (now - lastStoreUpdateRef.current >= 2000) {
        lastStoreUpdateRef.current = now
        log.debug('TimeUpdate (throttled):', time.toFixed(2))
        updateProgress(time)
      }
    },
    [echoWindow, setPlaying, updateProgress]
  )

  // Handle media ended
  const handleEnded = useCallback(() => {
    log.debug('Media ended')
    const el = mediaRef.current
    if (el && echoWindow) {
      // If echo window reaches the end of the media, the browser may emit "ended".
      // In echo mode, we rewind to the start of the echo window and pause.
      el.currentTime = echoWindow.start
      setDisplayTime(echoWindow.start)
      updateProgress(echoWindow.start)
      el.pause()
      setPlaying(false)
      return
    }

    setPlaying(false)
    // Save final progress
    if (el) {
      updateProgress(el.currentTime)
    }
  }, [mediaRef, echoWindow, setPlaying, updateProgress])

  // Handle media ready (canplay)
  const handleCanPlay = useCallback(
    (e: React.SyntheticEvent<HTMLAudioElement | HTMLVideoElement>) => {
      const el = e.currentTarget
      log.debug('canplay event', {
        readyState: el.readyState,
        duration: el.duration,
        hasRestoredPosition: hasRestoredPositionRef.current,
      })

      // Only restore position once per media load
      if (!hasRestoredPositionRef.current) {
        hasRestoredPositionRef.current = true
        onReady?.(true)

        // Restore playback position if needed
        const session = usePlayerSessionStore.getState().currentSession
        if (session && session.currentTime > 0) {
          log.debug('Restoring position to:', session.currentTime)
          const echoState = usePlayerEchoStore.getState()
          const maybeWindow = normalizeEchoWindow({
            active: echoState.echoModeActive,
            startTimeSeconds: echoState.echoStartTime,
            endTimeSeconds: echoState.echoEndTime,
            durationSeconds: session.duration,
          })
          const restoredTime = maybeWindow
            ? clampSeekTimeToEchoWindow(session.currentTime, maybeWindow)
            : session.currentTime
          el.currentTime = restoredTime
          setDisplayTime(restoredTime)
        }

        // Sync volume and playback rate
        const settings = usePlayerSettingsStore.getState()
        el.volume = settings.volume
        el.playbackRate = settings.playbackRate
      }
    },
    [onReady]
  )

  // Handle load error
  const handleLoadError = useCallback(
    (e: React.SyntheticEvent<HTMLAudioElement | HTMLVideoElement>) => {
      const el = e.currentTarget
      log.error('Media load error:', {
        error: el.error,
        networkState: el.networkState,
        readyState: el.readyState,
      })
      onError?.('Failed to load media')
      onReady?.(false)
    },
    [onError, onReady]
  )

  // Reset position restoration flag when session changes
  useEffect(() => {
    hasRestoredPositionRef.current = false
  }, [currentSession?.mediaId])

  // Save progress when component unmounts or session changes
  useEffect(() => {
    return () => {
      const el = mediaRef.current
      if (el) {
        updateProgress(el.currentTime)
      }
    }
  }, [mediaRef, updateProgress, currentSession?.mediaId])

  // When echo mode becomes active / window changes, ensure current time is inside the window.
  useEffect(() => {
    const el = mediaRef.current
    if (!el || !echoWindow) return

    // We need to check if media is ready - but we don't have that state here
    // This effect will run when echo window changes, and we'll clamp if needed
    const decision = decideEchoPlaybackTime(el.currentTime, echoWindow)
    if (decision.kind === 'ok') return

    el.currentTime = decision.timeSeconds
    setDisplayTime(decision.timeSeconds)
    updateProgress(decision.timeSeconds)
    lastStoreUpdateRef.current = Date.now()
  }, [echoWindow, mediaRef, updateProgress])

  // Note: Media ref registration is now handled by PlayerMediaProvider
  // Components should use usePlayerMedia() hook to access media controls

  return {
    handleTimeUpdate,
    handleEnded,
    handleCanPlay,
    handleLoadError,
  }
}

