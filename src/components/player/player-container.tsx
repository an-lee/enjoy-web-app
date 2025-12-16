/**
 * PlayerContainer - Global player container that manages player modes and media playback
 *
 * This component should be placed in the root layout to enable
 * media playback across all pages.
 *
 * Modes:
 * - hidden: No player UI shown
 * - mini: Mini player bar at the bottom
 * - expanded: Full-screen player
 */

import { useRef, useEffect, useState } from 'react'
import { usePlayerStore } from '@/stores/player'
import { db } from '@/db'
import { createLogger } from '@/lib/utils'
import { setDisplayTime } from '@/hooks/use-display-time'
import { getMediaUrl } from '@/lib/file-access'
import { useMediaElement } from '@/hooks/use-media-element'
import { MiniPlayerBar } from './mini-player-bar'
import { ExpandedPlayer } from './expanded-player'
import { PlayerHotkeys } from './player-hotkeys'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'PlayerContainer' })

// ============================================================================
// Component
// ============================================================================

export function PlayerContainer() {
  const mode = usePlayerStore((state) => state.mode)
  const currentSession = usePlayerStore((state) => state.currentSession)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const volume = usePlayerStore((state) => state.volume)
  const playbackRate = usePlayerStore((state) => state.playbackRate)
  const setPlaying = usePlayerStore((state) => state.setPlaying)

  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const renderCountRef = useRef(0)

  // Log render
  renderCountRef.current++
  log.debug('Render #', renderCountRef.current, { mode, isPlaying, isReady, mediaUrl: !!mediaUrl })

  // Load media blob from IndexedDB
  useEffect(() => {
    log.debug('Effect: Load media', { sessionId: currentSession?.mediaId })

    if (!currentSession) {
      setMediaUrl(null)
      setIsReady(false)
      setDisplayTime(0)
      return
    }

    let objectUrl: string | null = null
    let isMounted = true

    const loadMedia = async () => {
      log.debug('Loading media from database...')
      setIsLoading(true)
      setError(null)
      setIsReady(false)

      try {
        let media

        if (currentSession.mediaType === 'audio') {
          media = await db.audios.get(currentSession.mediaId)
        } else {
          media = await db.videos.get(currentSession.mediaId)
        }

        if (!isMounted) return

        if (!media) {
          log.error('Media not found!')
          setError('Media not found in local storage')
          setIsLoading(false)
          return
        }

        // Get media URL using unified interface
        objectUrl = await getMediaUrl(media)
        log.debug('Media URL created:', objectUrl)
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

  // Get media element handlers from hook
  const {
    handleTimeUpdate,
    handleEnded,
    handleCanPlay,
    handleLoadError,
  } = useMediaElement({
    mediaRef,
    onReady: setIsReady,
    onError: setError,
  })

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
      el.play()
        .then(() => {
          log.debug('el.play() succeeded')
        })
        .catch((err) => {
          log.warn('el.play() blocked:', err)
          // Auto-play was prevented
          setPlaying(false)
        })
    } else {
      log.debug('Calling el.pause()')
      el.pause()
    }
  }, [isPlaying, isReady, setPlaying])


  // Don't render anything if no session and mode is hidden
  if (mode === 'hidden' && !currentSession) {
    return null
  }

  const isVideo = currentSession?.mediaType === 'video'

  return (
    <>
      {/* Player hotkeys - active when player is visible (mini or expanded) */}
      {(mode === 'mini' || mode === 'expanded') && currentSession && (
        <PlayerHotkeys />
      )}

      {/* Mini player bar - shown in mini mode */}
      {mode === 'mini' && currentSession && (
        <MiniPlayerBar />
      )}

      {/* Full player - shown in expanded mode */}
      {mode === 'expanded' && currentSession && (
        <ExpandedPlayer
          isLoading={isLoading}
          error={error}
          isVideo={isVideo}
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

