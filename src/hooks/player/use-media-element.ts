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
import { usePlayerStore } from '@/stores/player'
import { setDisplayTime } from '@/hooks/player/use-display-time'
import {
  clampSeekTimeToEchoWindow,
  decideEchoPlaybackTime,
  normalizeEchoWindow,
  type EchoWindow,
} from '@/components/player/echo'
import { createLogger } from '@/lib/utils'

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
  /** Seek to a specific time (in seconds) */
  handleSeek: (time: number) => void
  /** Toggle play/pause */
  handleTogglePlay: () => void
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
  const {
    currentSession,
    setPlaying,
    updateProgress,
    echoModeActive,
    echoStartTime,
    echoEndTime,
    registerMediaControls,
    unregisterMediaControls,
  } = usePlayerStore()

  const lastStoreUpdateRef = useRef(0)
  const hasRestoredPositionRef = useRef(false)

  // Calculate echo window
  const echoWindow: EchoWindow | null = normalizeEchoWindow({
    active: echoModeActive,
    startTimeSeconds: echoStartTime,
    endTimeSeconds: echoEndTime,
    durationSeconds: currentSession?.duration,
  })

  // Handle seek from progress bar or line navigation
  const handleSeek = useCallback(
    (time: number) => {
      const el = mediaRef.current
      if (!el) return

      const nextTime = echoWindow ? clampSeekTimeToEchoWindow(time, echoWindow) : time
      el.currentTime = nextTime
      setDisplayTime(nextTime)
      updateProgress(nextTime)
    },
    [mediaRef, echoWindow, updateProgress]
  )

  // Handle toggle play
  const handleTogglePlay = useCallback(() => {
    const el = mediaRef.current
    log.debug('handleTogglePlay', { hasElement: !!el, paused: el?.paused })

    if (!el) {
      log.warn('No media element!')
      return
    }

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
  }, [mediaRef, setPlaying, updateProgress])

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
        const session = usePlayerStore.getState().currentSession
        if (session && session.currentTime > 0) {
          log.debug('Restoring position to:', session.currentTime)
          const state = usePlayerStore.getState()
          const maybeWindow = normalizeEchoWindow({
            active: state.echoModeActive,
            startTimeSeconds: state.echoStartTime,
            endTimeSeconds: state.echoEndTime,
            durationSeconds: session.duration,
          })
          const restoredTime = maybeWindow
            ? clampSeekTimeToEchoWindow(session.currentTime, maybeWindow)
            : session.currentTime
          el.currentTime = restoredTime
          setDisplayTime(restoredTime)
        }

        // Sync volume and playback rate
        const state = usePlayerStore.getState()
        el.volume = state.volume
        el.playbackRate = state.playbackRate
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

  // Store the latest echoWindow in a ref for use in registered controls
  const echoWindowRef = useRef(echoWindow)
  useEffect(() => {
    echoWindowRef.current = echoWindow
  }, [echoWindow])

  // Register media controls to the store for use by other components (e.g., hotkeys)
  useEffect(() => {
    const controls = {
      seek: (time: number) => {
        const el = mediaRef.current
        if (!el) return
        const currentEchoWindow = echoWindowRef.current
        const nextTime = currentEchoWindow
          ? clampSeekTimeToEchoWindow(time, currentEchoWindow)
          : time
        el.currentTime = nextTime
        setDisplayTime(nextTime)
        updateProgress(nextTime)
      },
      play: async () => {
        const el = mediaRef.current
        if (!el) return
        await el.play()
        setPlaying(true)
      },
      pause: () => {
        const el = mediaRef.current
        if (!el) return
        el.pause()
        setPlaying(false)
        updateProgress(el.currentTime)
      },
      getCurrentTime: () => {
        return mediaRef.current?.currentTime ?? 0
      },
      isPaused: () => {
        return mediaRef.current?.paused ?? true
      },
    }

    registerMediaControls(controls)
    log.debug('Media controls registered to store')

    return () => {
      unregisterMediaControls()
      log.debug('Media controls unregistered from store')
    }
  }, [mediaRef, setPlaying, updateProgress, registerMediaControls, unregisterMediaControls])

  return {
    handleSeek,
    handleTogglePlay,
    handleTimeUpdate,
    handleEnded,
    handleCanPlay,
    handleLoadError,
  }
}

