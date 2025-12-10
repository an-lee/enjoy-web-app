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
import { MiniPlayerBar } from './mini-player-bar'
import { FullPlayer } from './full-player'

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
// Debug logging
// ============================================================================

const DEBUG = true
function log(...args: unknown[]) {
  if (DEBUG) {
    console.log('[GlobalPlayer]', ...args)
  }
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
  log('Render #', renderCountRef.current, { mode, isPlaying, isReady, mediaUrl: !!mediaUrl })

  // Load media blob from IndexedDB
  useEffect(() => {
    log('Effect: Load media', { sessionId: currentSession?.mediaId })

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
      log('Loading media blob from IndexedDB...')
      setIsLoading(true)
      setError(null)
      setIsReady(false)

      try {
        let blob: Blob | undefined

        if (currentSession.mediaType === 'audio') {
          const audio = await db.audios.get(currentSession.mediaId)
          blob = audio?.blob
          log('Audio blob loaded:', { size: blob?.size, type: blob?.type })
        } else {
          const video = await db.videos.get(currentSession.mediaId)
          blob = video?.blob
          log('Video blob loaded:', { size: blob?.size, type: blob?.type })
        }

        if (!isMounted) return

        if (!blob) {
          log('ERROR: Blob not found!')
          setError('Media not found in local storage')
          setIsLoading(false)
          return
        }

        // Create object URL from blob
        objectUrl = URL.createObjectURL(blob)
        log('Object URL created:', objectUrl)
        setMediaUrl(objectUrl)
        setIsLoading(false)
      } catch (err) {
        if (!isMounted) return
        log('ERROR loading media:', err)
        setError(err instanceof Error ? err.message : 'Failed to load media')
        setIsLoading(false)
      }
    }

    loadMedia()

    // Cleanup: revoke object URL when session changes
    return () => {
      log('Cleanup: revoking object URL')
      isMounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [currentSession?.mediaId, currentSession?.mediaType])

  // Sync volume with media element
  useEffect(() => {
    if (mediaRef.current) {
      log('Syncing volume:', volume)
      mediaRef.current.volume = volume
    }
  }, [volume])

  // Sync playback rate with media element
  useEffect(() => {
    if (mediaRef.current) {
      log('Syncing playback rate:', playbackRate)
      mediaRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  // Sync play state with media element
  useEffect(() => {
    const el = mediaRef.current
    log('Effect: Sync play state', { isPlaying, isReady, hasElement: !!el })

    if (!el || !isReady) {
      log('Skipping play sync - not ready')
      return
    }

    if (isPlaying) {
      log('Calling el.play()...')
      el.play().then(() => {
        log('el.play() succeeded')
      }).catch((err) => {
        log('el.play() FAILED:', err)
        // Auto-play was prevented
        setPlaying(false)
      })
    } else {
      log('Calling el.pause()')
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
      log('TimeUpdate (throttled):', time.toFixed(2))
      updateProgress(time)
    }
  }, [updateProgress])

  const handleEnded = useCallback(() => {
    log('Media ended')
    setPlaying(false)
    // Save final progress
    if (mediaRef.current) {
      updateProgress(mediaRef.current.currentTime)
    }
  }, [setPlaying, updateProgress])

  const handleCanPlay = useCallback((e: React.SyntheticEvent<HTMLAudioElement | HTMLVideoElement>) => {
    const el = e.currentTarget
    log('canplay event fired', {
      readyState: el.readyState,
      networkState: el.networkState,
      duration: el.duration,
      paused: el.paused,
      hasRestoredPosition: hasRestoredPositionRef.current,
    })

    // Only restore position once per media load
    if (!hasRestoredPositionRef.current) {
      hasRestoredPositionRef.current = true
      setIsReady(true)

      // Restore playback position if needed
      const session = usePlayerStore.getState().currentSession
      if (session && session.currentTime > 0) {
        log('Restoring position to:', session.currentTime)
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
    log('ERROR loading media:', {
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
    log('handleTogglePlay called', {
      hasElement: !!el,
      paused: el?.paused,
      readyState: el?.readyState,
      networkState: el?.networkState,
    })

    if (!el) {
      log('No media element!')
      return
    }

    if (el.paused) {
      log('Element is paused, calling play()...')
      el.play().then(() => {
        log('play() promise resolved')
        setPlaying(true)
      }).catch((err) => {
        log('play() promise REJECTED:', err)
        // Auto-play was prevented
      })
    } else {
      log('Element is playing, calling pause()')
      el.pause()
      setPlaying(false)
      // Save progress when pausing
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
              onCanPlayThrough={() => log('canplaythrough')}
              onLoadedData={() => log('loadeddata')}
              onLoadedMetadata={() => log('loadedmetadata')}
              onPlay={() => log('play event')}
              onPause={() => log('pause event')}
              onWaiting={() => log('waiting - buffering...')}
              onPlaying={() => log('playing event')}
              onStalled={() => log('stalled!')}
              onSuspend={() => log('suspend')}
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
              onCanPlayThrough={() => log('canplaythrough')}
              onLoadedData={() => log('loadeddata')}
              onLoadedMetadata={() => log('loadedmetadata')}
              onPlay={() => log('play event')}
              onPause={() => log('pause event')}
              onWaiting={() => log('waiting - buffering...')}
              onPlaying={() => log('playing event')}
              onStalled={() => log('stalled!')}
              onSuspend={() => log('suspend')}
              onError={handleLoadError}
              preload="auto"
            />
          )}
        </div>
      )}
    </>
  )
}

// ============================================================================
// Continue Learning Button Component
// ============================================================================

interface ContinueLearningButtonProps {
  className?: string
  variant?: 'default' | 'compact'
}

export function ContinueLearningButton({
  className,
  variant = 'default',
}: ContinueLearningButtonProps) {
  const { recentSession, resumeSession, currentSession } = usePlayerStore()

  // Don't show if there's no recent session or if there's already an active session
  if (!recentSession || currentSession) {
    return null
  }

  // Format relative time
  const formatRelativeTime = (isoString: string): string => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={resumeSession}
        className={className}
      >
        Continue: {recentSession.mediaTitle.slice(0, 20)}
        {recentSession.mediaTitle.length > 20 ? '...' : ''}
      </button>
    )
  }

  return (
    <button
      onClick={resumeSession}
      className={className}
    >
      <span>Continue Learning</span>
      <span className="text-muted-foreground">
        {recentSession.mediaTitle} • {formatRelativeTime(recentSession.lastActiveAt)}
      </span>
    </button>
  )
}
