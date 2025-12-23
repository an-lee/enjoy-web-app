/**
 * usePlaybackSync Hook
 *
 * Synchronizes playback state between the player store and the media element.
 * Handles:
 * - Volume synchronization
 * - Playback rate synchronization
 * - Play/pause state synchronization
 * - State synchronization on mode changes
 */

import { useEffect } from 'react'
import { usePlayerStore } from '@/page/stores/player'
import { createLogger } from '@/shared/lib/utils'

const log = createLogger({ name: 'usePlaybackSync' })

export interface UsePlaybackSyncOptions {
  /** Media element ref */
  mediaRef: React.RefObject<HTMLAudioElement | HTMLVideoElement | null>
  /** Whether media is ready for playback */
  isReady: boolean
  /** Current player mode */
  mode: 'mini' | 'expanded'
}

export function usePlaybackSync({
  mediaRef,
  isReady,
  mode,
}: UsePlaybackSyncOptions): void {
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const volume = usePlayerStore((state) => state.volume)
  const playbackRate = usePlayerStore((state) => state.playbackRate)
  const setPlaying = usePlayerStore((state) => state.setPlaying)
  const currentSession = usePlayerStore((state) => state.currentSession)

  // Sync volume with media element
  useEffect(() => {
    if (mediaRef.current) {
      log.debug('Syncing volume:', volume)
      mediaRef.current.volume = volume
    }
  }, [mediaRef, volume])

  // Sync playback rate with media element
  useEffect(() => {
    if (mediaRef.current) {
      log.debug('Syncing playback rate:', playbackRate)
      mediaRef.current.playbackRate = playbackRate
    }
  }, [mediaRef, playbackRate])

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
  }, [isPlaying, isReady, setPlaying, mode, mediaRef])

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
  }, [mode, isReady, currentSession, isPlaying, volume, playbackRate, setPlaying, mediaRef])
}

