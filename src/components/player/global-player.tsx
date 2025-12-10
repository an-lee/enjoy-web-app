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

import { useRef, useCallback, useEffect, useState } from 'react'
import { usePlayerStore } from '@/stores/player'
import { db } from '@/db'
import { MiniPlayerBar } from './mini-player-bar'
import { FullPlayer } from './full-player'

// ============================================================================
// Component
// ============================================================================

export function GlobalPlayer() {
  const { mode, currentSession, isPlaying, volume, playbackRate, setPlaying, updateProgress } = usePlayerStore()
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Load media blob from IndexedDB
  useEffect(() => {
    if (!currentSession) {
      setMediaUrl(null)
      setIsReady(false)
      return
    }

    let objectUrl: string | null = null
    let isMounted = true

    const loadMedia = async () => {
      setIsLoading(true)
      setError(null)
      setIsReady(false)

      try {
        let blob: Blob | undefined

        if (currentSession.mediaType === 'audio') {
          const audio = await db.audios.get(currentSession.mediaId)
          blob = audio?.blob
        } else {
          const video = await db.videos.get(currentSession.mediaId)
          blob = video?.blob
        }

        if (!isMounted) return

        if (!blob) {
          setError('Media not found in local storage')
          setIsLoading(false)
          return
        }

        // Create object URL from blob
        objectUrl = URL.createObjectURL(blob)
        setMediaUrl(objectUrl)
        setIsLoading(false)
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Failed to load media')
        setIsLoading(false)
      }
    }

    loadMedia()

    // Cleanup: revoke object URL when session changes
    return () => {
      isMounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [currentSession?.mediaId, currentSession?.mediaType])

  // Sync volume with media element
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume
    }
  }, [volume])

  // Sync playback rate with media element
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  // Sync play state with media element
  useEffect(() => {
    const el = mediaRef.current
    if (!el || !isReady) return

    if (isPlaying) {
      el.play().catch(() => {
        // Auto-play was prevented
        setPlaying(false)
      })
    } else {
      el.pause()
    }
  }, [isPlaying, isReady, setPlaying])

  // Handle media element events
  const handleTimeUpdate = useCallback(() => {
    if (mediaRef.current) {
      updateProgress(mediaRef.current.currentTime)
    }
  }, [updateProgress])

  const handleEnded = useCallback(() => {
    setPlaying(false)
  }, [setPlaying])

  const handleCanPlay = useCallback(() => {
    setIsReady(true)
    // Restore playback position if needed
    if (currentSession && currentSession.currentTime > 0 && mediaRef.current) {
      mediaRef.current.currentTime = currentSession.currentTime
    }
    // Sync volume and playback rate
    if (mediaRef.current) {
      mediaRef.current.volume = usePlayerStore.getState().volume
      mediaRef.current.playbackRate = usePlayerStore.getState().playbackRate
    }
  }, [currentSession])

  const handleError = useCallback(() => {
    setError('Failed to load media')
    setIsReady(false)
  }, [])

  // Handle seek from progress bar
  const handleSeek = useCallback((time: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time
      updateProgress(time)
    }
  }, [updateProgress])

  // Handle toggle play
  const handleTogglePlay = useCallback(() => {
    const el = mediaRef.current
    if (!el) return

    if (isPlaying) {
      el.pause()
      setPlaying(false)
    } else {
      el.play().then(() => {
        setPlaying(true)
      }).catch(() => {
        // Auto-play was prevented
      })
    }
  }, [isPlaying, setPlaying])

  // Don't render anything if no session and mode is hidden
  if (mode === 'hidden' && !currentSession) {
    return null
  }

  const isVideo = currentSession?.mediaType === 'video'

  return (
    <>
      {/* Mini player bar - shown in mini mode */}
      {mode === 'mini' && currentSession && (
        <MiniPlayerBar onSeek={handleSeek} onTogglePlay={handleTogglePlay} />
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
              onError={handleError}
              playsInline
            />
          ) : (
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={mediaUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onCanPlay={handleCanPlay}
              onError={handleError}
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
