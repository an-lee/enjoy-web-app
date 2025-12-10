/**
 * useMediaPlayback - Hook for loading and controlling media playback
 *
 * Handles:
 * - Loading media blob from IndexedDB
 * - Creating object URL for playback
 * - Syncing playback state with player store
 * - Cleanup on unmount
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { db } from '@/db'
import { usePlayerStore } from '@/stores/player'

// ============================================================================
// Types
// ============================================================================

export interface MediaPlaybackState {
  /** Object URL for the media (audio/video src) */
  mediaUrl: string | null
  /** Whether media is loading */
  isLoading: boolean
  /** Error message if loading failed */
  error: string | null
  /** Whether media is ready to play */
  isReady: boolean
}

export interface MediaPlaybackControls {
  /** Reference to the media element */
  mediaRef: React.RefObject<HTMLAudioElement | HTMLVideoElement | null>
  /** Play the media */
  play: () => Promise<void>
  /** Pause the media */
  pause: () => void
  /** Seek to a specific time (seconds) */
  seek: (time: number) => void
  /** Toggle play/pause */
  togglePlay: () => void
}

export type UseMediaPlaybackReturn = MediaPlaybackState & MediaPlaybackControls

// ============================================================================
// Hook
// ============================================================================

export function useMediaPlayback(): UseMediaPlaybackReturn {
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Player store state
  const {
    currentSession,
    isPlaying,
    volume,
    playbackRate,
    setPlaying,
    updateProgress,
  } = usePlayerStore()

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
  useEffect(() => {
    const el = mediaRef.current
    if (!el) return

    const handleTimeUpdate = () => {
      updateProgress(el.currentTime)
    }

    const handleEnded = () => {
      setPlaying(false)
    }

    const handleCanPlay = () => {
      setIsReady(true)
      // Restore playback position if needed
      if (currentSession && currentSession.currentTime > 0) {
        el.currentTime = currentSession.currentTime
      }
    }

    const handleError = () => {
      setError('Failed to load media')
      setIsReady(false)
    }

    el.addEventListener('timeupdate', handleTimeUpdate)
    el.addEventListener('ended', handleEnded)
    el.addEventListener('canplay', handleCanPlay)
    el.addEventListener('error', handleError)

    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate)
      el.removeEventListener('ended', handleEnded)
      el.removeEventListener('canplay', handleCanPlay)
      el.removeEventListener('error', handleError)
    }
  }, [updateProgress, setPlaying, currentSession])

  // Controls
  const play = useCallback(async () => {
    if (mediaRef.current) {
      try {
        await mediaRef.current.play()
        setPlaying(true)
      } catch {
        // Auto-play was prevented
      }
    }
  }, [setPlaying])

  const pause = useCallback(() => {
    if (mediaRef.current) {
      mediaRef.current.pause()
      setPlaying(false)
    }
  }, [setPlaying])

  const seek = useCallback((time: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time
      updateProgress(time)
    }
  }, [updateProgress])

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  return {
    mediaRef,
    mediaUrl,
    isLoading,
    error,
    isReady,
    play,
    pause,
    seek,
    togglePlay,
  }
}

