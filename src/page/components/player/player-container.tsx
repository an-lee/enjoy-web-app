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

import { useRef, useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayerStore } from '@/page/stores/player'
import { db, updateVideo, updateAudio } from '@/page/db'
import { createLogger } from '@/shared/lib/utils'
import { getMediaUrl, FileAccessError, verifyFile } from '@/page/lib/file-access'
import { selectFileWithHandle } from '@/page/lib/file-helpers'
import { useMediaElement, setDisplayTime } from '@/page/hooks/player'
import { MiniPlayerBar } from './mini-player-bar'
import { ExpandedPlayer } from './expanded-player'
import { PlayerHotkeys } from './player-hotkeys'
import type { Video, Audio } from '@/page/types/db'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'PlayerContainer' })

// ============================================================================
// Component
// ============================================================================

export function PlayerContainer() {
  const { t } = useTranslation()
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
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [currentMedia, setCurrentMedia] = useState<Video | Audio | null>(null)
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
          setError(t('player.mediaNotFound'))
          setErrorCode(null)
          setCurrentMedia(null)
          setIsLoading(false)
          return
        }

        setCurrentMedia(media)

        // Get media URL using unified interface
        objectUrl = await getMediaUrl(media)
        log.debug('Media URL created:', objectUrl)
        setMediaUrl(objectUrl)
        setError(null)
        setErrorCode(null)
        setIsLoading(false)
      } catch (err) {
        if (!isMounted) return
        log.error('Loading media failed:', err)

        // Handle FileAccessError with i18n
        if (err instanceof FileAccessError) {
          setError(t(err.code))
          setErrorCode(err.code)
        } else {
          // Fallback for other errors
          setError(t('player.loadingFailed'))
          setErrorCode(null)
        }
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
    log.debug('Effect: Sync play state', { isPlaying, isReady, hasElement: !!el, mode })

    if (!el || !isReady) {
      log.debug('Skipping play sync - not ready')
      return
    }

    // When mode changes, sync the actual playback state with store state
    // This ensures UI correctly reflects playback state after mode switch
    const actualIsPlaying = !el.paused
    if (actualIsPlaying !== isPlaying) {
      log.debug('Playback state mismatch detected, syncing...', {
        storeIsPlaying: isPlaying,
        actualIsPlaying,
      })
      if (isPlaying) {
        el.play().catch((err) => {
          log.warn('el.play() blocked:', err)
          setPlaying(false)
        })
      } else {
        el.pause()
      }
    } else if (isPlaying) {
      // Ensure playing state is maintained
      if (el.paused) {
        log.debug('Element is paused but should be playing, calling play()...')
        el.play()
          .then(() => {
            log.debug('el.play() succeeded')
          })
          .catch((err) => {
            log.warn('el.play() blocked:', err)
            setPlaying(false)
          })
      }
    } else {
      // Ensure paused state is maintained
      if (!el.paused) {
        log.debug('Element is playing but should be paused, calling pause()')
        el.pause()
      }
    }
  }, [isPlaying, isReady, setPlaying, mode])

  // Sync all media state when mode changes (to handle video element recreation)
  useEffect(() => {
    const el = mediaRef.current
    if (!el || !isReady || !currentSession) return

    const isVideo = currentSession.mediaType === 'video'

    // When mode changes, ensure all state is synchronized
    // This is especially important when video element is recreated in different location
    log.debug('Effect: Sync media state on mode change', { mode, isVideo })

    // Sync playback state
    const actualIsPlaying = !el.paused
    if (actualIsPlaying !== isPlaying) {
      log.debug('Syncing playback state on mode change', {
        storeIsPlaying: isPlaying,
        actualIsPlaying,
      })
      if (isPlaying && el.paused) {
        el.play().catch((err) => {
          log.warn('el.play() blocked on mode change:', err)
          setPlaying(false)
        })
      } else if (!isPlaying && !el.paused) {
        el.pause()
      }
    }

    // Sync volume and playback rate (already handled by other effects, but ensure they're set)
    if (el.volume !== volume) {
      el.volume = volume
    }
    if (el.playbackRate !== playbackRate) {
      el.playbackRate = playbackRate
    }

    // Sync currentTime if needed (useMediaElement hook handles this on canplay, but ensure it's set)
    if (currentSession.currentTime > 0 && Math.abs(el.currentTime - currentSession.currentTime) > 0.5) {
      log.debug('Syncing currentTime on mode change', {
        storeTime: currentSession.currentTime,
        elementTime: el.currentTime,
      })
      el.currentTime = currentSession.currentTime
    }
  }, [mode, isReady, currentSession, isPlaying, volume, playbackRate, setPlaying])

  // Handle retry for permission errors
  const handleRetry = useCallback(async () => {
    if (!currentSession || !currentMedia) return

    log.debug('Retrying media load...')
    setIsLoading(true)
    setError(null)
    setErrorCode(null)

    try {
      const objectUrl = await getMediaUrl(currentMedia)
      log.debug('Media URL created on retry:', objectUrl)
      setMediaUrl(objectUrl)
      setIsLoading(false)
    } catch (err) {
      log.error('Retry failed:', err)
      if (err instanceof FileAccessError) {
        setError(t(err.code))
        setErrorCode(err.code)
      } else {
        setError(t('player.loadingFailed'))
        setErrorCode(null)
      }
      setIsLoading(false)
    }
  }, [currentSession, currentMedia, t])

  // Handle file reselection for file not found errors
  const handleReselectFile = useCallback(async () => {
    if (!currentSession || !currentMedia) return

    log.debug('Reselecting file...')
    setIsLoading(true)
    setError(null)
    setErrorCode(null)

    try {
      // Determine file types based on media type
      const isVideo = currentSession.mediaType === 'video'
      const fileTypes = isVideo
        ? [
            {
              description: 'Video files',
              accept: {
                'video/*': ['.mp4', '.webm', '.ogg', '.mov', '.avi'],
              },
            },
          ]
        : [
            {
              description: 'Audio files',
              accept: {
                'audio/*': ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac'],
              },
            },
          ]

      // Select file with handle
      const fileHandle = await selectFileWithHandle({
        types: fileTypes,
      })

      if (!fileHandle) {
        // User cancelled
        setIsLoading(false)
        return
      }

      // Get file and verify it matches the expected hash and size
      const file = await fileHandle.getFile()

      if (!currentMedia.md5 || !currentMedia.size) {
        throw new Error('Media metadata missing for verification')
      }

      // Verify file matches
      const isValid = await verifyFile(file, currentMedia.md5, currentMedia.size)
      if (!isValid) {
        setError(t('fileAccess.fileMismatch'))
        setErrorCode(null)
        setIsLoading(false)
        return
      }

      // Update media with new fileHandle
      if (isVideo) {
        await updateVideo(currentMedia.id, { fileHandle })
      } else {
        await updateAudio(currentMedia.id, { fileHandle })
      }

      // Update current media state
      const updatedMedia = { ...currentMedia, fileHandle }
      setCurrentMedia(updatedMedia)

      // Try to load media with new fileHandle
      const objectUrl = await getMediaUrl(updatedMedia)
      log.debug('Media URL created after reselection:', objectUrl)
      setMediaUrl(objectUrl)
      setIsLoading(false)
    } catch (err) {
      log.error('File reselection failed:', err)
      if (err instanceof FileAccessError) {
        setError(t(err.code))
        setErrorCode(err.code)
      } else {
        setError(t('player.loadingFailed'))
        setErrorCode(null)
      }
      setIsLoading(false)
    }
  }, [currentSession, currentMedia, t])

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
          errorCode={errorCode}
          isVideo={isVideo}
          mediaRef={isVideo ? mediaRef : undefined}
          mediaUrl={isVideo ? mediaUrl : undefined}
          onTimeUpdate={isVideo ? handleTimeUpdate : undefined}
          onEnded={isVideo ? handleEnded : undefined}
          onCanPlay={isVideo ? handleCanPlay : undefined}
          onError={isVideo ? handleLoadError : undefined}
          onRetry={handleRetry}
          onReselectFile={handleReselectFile}
        />
      )}

      {/* Actual media element - always render one element, position changes based on mode */}
      {currentSession && mediaUrl && (
        <>
          {/* Video: render in hidden div when NOT in expanded mode */}
          {/* In expanded mode, video is rendered in ExpandedPlayerContent with the same ref */}
          {isVideo && mode !== 'expanded' && (
            <div className="hidden">
              <video
                key={`video-${currentSession.mediaId}`}
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
            </div>
          )}
          {/* Audio: always render in hidden div (no visual display needed) */}
          {!isVideo && (
            <div className="hidden">
              <audio
                key={`audio-${currentSession.mediaId}`}
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
            </div>
          )}
        </>
      )}
    </>
  )
}

