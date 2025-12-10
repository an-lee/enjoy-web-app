/**
 * GlobalPlayer - Global player container that manages player modes and media playback
 *
 * This component should be placed in the root layout to enable
 * media playback across all pages.
 *
 * Modes:
 * - hidden: No player UI shown
 * - mini: Mini player bar at the bottom
 * - expanded: Full-screen player
 */

import { useRef, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { usePlayerStore } from '@/stores/player'
import { db } from '@/db'
import { createLogger } from '@/lib/utils'
import { MiniPlayerBar } from './mini-player-bar'
import { FullPlayer } from './full-player'
import { PlayerHotkeys } from './player-hotkeys'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'Player' })

// ============================================================================
// Time Display Store (separate from main store to avoid re-renders)
// ============================================================================

let currentDisplayTime = 0
const timeListeners = new Set<() => void>()

function subscribeToTime(callback: () => void) {
  timeListeners.add(callback)
  return () => timeListeners.delete(callback)
}

function getDisplayTime() {
  return currentDisplayTime
}

function setDisplayTime(time: number) {
  currentDisplayTime = time
  timeListeners.forEach((listener) => listener())
}

// Hook to subscribe to display time changes
export function useDisplayTime() {
  return useSyncExternalStore(subscribeToTime, getDisplayTime, getDisplayTime)
}

// ============================================================================
// Component
// ============================================================================

export function GlobalPlayer() {
  const mode = usePlayerStore((state) => state.mode)
  const currentSession = usePlayerStore((state) => state.currentSession)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const volume = usePlayerStore((state) => state.volume)
  const playbackRate = usePlayerStore((state) => state.playbackRate)
  const setPlaying = usePlayerStore((state) => state.setPlaying)
  const updateProgress = usePlayerStore((state) => state.updateProgress)

  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const lastStoreUpdateRef = useRef(0)
  const renderCountRef = useRef(0)
  const hasRestoredPositionRef = useRef(false)

  // Log render
  renderCountRef.current++
  log.debug('Render #', renderCountRef.current, { mode, isPlaying, isReady, mediaUrl: !!mediaUrl })

  // Load media blob from IndexedDB
  useEffect(() => {
    log.debug('Effect: Load media', { sessionId: currentSession?.mediaId })

    // Reset position restoration flag for new media
    hasRestoredPositionRef.current = false

    if (!currentSession) {
      setMediaUrl(null)
      setIsReady(false)
      setDisplayTime(0)
      return
    }

    let objectUrl: string | null = null
    let isMounted = true

    const loadMedia = async () => {
      log.debug('Loading media blob from IndexedDB...')
      setIsLoading(true)
      setError(null)
      setIsReady(false)

      try {
        let blob: Blob | undefined

        if (currentSession.mediaType === 'audio') {
          const audio = await db.audios.get(currentSession.mediaId)
          blob = audio?.blob
          log.debug('Audio blob loaded:', { size: blob?.size, type: blob?.type })
        } else {
          const video = await db.videos.get(currentSession.mediaId)
          blob = video?.blob
          log.debug('Video blob loaded:', { size: blob?.size, type: blob?.type })
        }

        if (!isMounted) return

        if (!blob) {
          log.error('Blob not found!')
          setError('Media not found in local storage')
          setIsLoading(false)
          return
        }

        // Create object URL from blob
        objectUrl = URL.createObjectURL(blob)
        log.debug('Object URL created:', objectUrl)
        setMediaUrl(objectUrl)
        setIsLoading(false)
      } catch (err) {
        if (!isMounted) return
        log.error('Loading media failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to load media')
        setIsLoading(false)
      }
    }

    loadMedia()

    // Cleanup: revoke object URL when session changes
    return () => {
      log.debug('Cleanup: revoking object URL')
      isMounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [currentSession?.mediaId, currentSession?.mediaType])

  // Sync volume with media element
  useEffect(() => {
    if (mediaRef.current) {
      log.debug('Syncing volume:', volume)
      mediaRef.current.volume = volume
    }
  }, [volume])

  // Sync playback rate with media element
  useEffect(() => {
    if (mediaRef.current) {
      log.debug('Syncing playback rate:', playbackRate)
      mediaRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  // Sync play state with media element
  useEffect(() => {
    const el = mediaRef.current
    log.debug('Effect: Sync play state', { isPlaying, isReady, hasElement: !!el })

    if (!el || !isReady) {
      log.debug('Skipping play sync - not ready')
      return
    }

    if (isPlaying) {
      log.debug('Calling el.play()...')
      el.play().then(() => {
        log.debug('el.play() succeeded')
      }).catch((err) => {
        log.warn('el.play() blocked:', err)
        // Auto-play was prevented
        setPlaying(false)
      })
    } else {
      log.debug('Calling el.pause()')
      el.pause()
    }
  }, [isPlaying, isReady, setPlaying])

  // Handle media element events - use stable refs
  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLAudioElement | HTMLVideoElement>) => {
    const el = e.currentTarget
    const time = el.currentTime

    // Update display time (external store, doesn't cause re-render of this component)
    setDisplayTime(time)

    // Throttle store updates to every 2 seconds
    const now = Date.now()
    if (now - lastStoreUpdateRef.current >= 2000) {
      lastStoreUpdateRef.current = now
      log.debug('TimeUpdate (throttled):', time.toFixed(2))
      updateProgress(time)
    }
  }, [updateProgress])

  const handleEnded = useCallback(() => {
    log.debug('Media ended')
    setPlaying(false)
    // Save final progress
    if (mediaRef.current) {
      updateProgress(mediaRef.current.currentTime)
    }
  }, [setPlaying, updateProgress])

  const handleCanPlay = useCallback((e: React.SyntheticEvent<HTMLAudioElement | HTMLVideoElement>) => {
    const el = e.currentTarget
    log.debug('canplay event', {
      readyState: el.readyState,
      duration: el.duration,
      hasRestoredPosition: hasRestoredPositionRef.current,
    })

    // Only restore position once per media load
    if (!hasRestoredPositionRef.current) {
      hasRestoredPositionRef.current = true
      setIsReady(true)

      // Restore playback position if needed
      const session = usePlayerStore.getState().currentSession
      if (session && session.currentTime > 0) {
        log.debug('Restoring position to:', session.currentTime)
        el.currentTime = session.currentTime
        setDisplayTime(session.currentTime)
      }

      // Sync volume and playback rate
      const state = usePlayerStore.getState()
      el.volume = state.volume
      el.playbackRate = state.playbackRate
    }
  }, [])

  const handleLoadError = useCallback((e: React.SyntheticEvent<HTMLAudioElement | HTMLVideoElement>) => {
    const el = e.currentTarget
    log.error('Media load error:', {
      error: el.error,
      networkState: el.networkState,
      readyState: el.readyState,
    })
    setError('Failed to load media')
    setIsReady(false)
  }, [])

  // Handle seek from progress bar
  const handleSeek = useCallback((time: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time
      setDisplayTime(time)
      updateProgress(time)
    }
  }, [updateProgress])

  // Handle toggle play
  const handleTogglePlay = useCallback(() => {
    const el = mediaRef.current
    log.debug('handleTogglePlay', { hasElement: !!el, paused: el?.paused })

    if (!el) {
      log.warn('No media element!')
      return
    }

    if (el.paused) {
      el.play().then(() => {
        log.debug('play() resolved')
        setPlaying(true)
      }).catch((err) => {
        log.warn('play() blocked:', err)
      })
    } else {
      el.pause()
      setPlaying(false)
      updateProgress(el.currentTime)
    }
  }, [setPlaying, updateProgress])

  // Save progress when component unmounts or session changes
  useEffect(() => {
    return () => {
      if (mediaRef.current) {
        updateProgress(mediaRef.current.currentTime)
      }
    }
  }, [updateProgress, currentSession?.mediaId])

  // Don't render anything if no session and mode is hidden
  if (mode === 'hidden' && !currentSession) {
    return null
  }

  const isVideo = currentSession?.mediaType === 'video'

  return (
    <>
      {/* Player hotkeys - active when player is visible (mini or expanded) */}
      {(mode === 'mini' || mode === 'expanded') && currentSession && (
        <PlayerHotkeys onTogglePlay={handleTogglePlay} onSeek={handleSeek} />
      )}

      {/* Mini player bar - shown in mini mode */}
      {mode === 'mini' && currentSession && (
        <MiniPlayerBar
          onSeek={handleSeek}
          onTogglePlay={handleTogglePlay}
        />
      )}

      {/* Full player - shown in expanded mode */}
      {mode === 'expanded' && currentSession && (
        <FullPlayer
          isLoading={isLoading}
          error={error}
          isVideo={isVideo}
          onSeek={handleSeek}
          onTogglePlay={handleTogglePlay}
        />
      )}

      {/* Actual media element - always rendered when there's a session */}
      {currentSession && mediaUrl && (
        <div className="hidden">
          {isVideo ? (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={mediaUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onCanPlay={handleCanPlay}
              onWaiting={() => log.debug('buffering...')}
              onStalled={() => log.warn('stalled!')}
              onError={handleLoadError}
              playsInline
              preload="auto"
            />
          ) : (
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={mediaUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onCanPlay={handleCanPlay}
              onWaiting={() => log.debug('buffering...')}
              onStalled={() => log.warn('stalled!')}
              onError={handleLoadError}
              preload="auto"
            />
          )}
        </div>
      )}
    </>
  )
}

