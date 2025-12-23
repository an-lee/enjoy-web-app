/**
 * useProgressSync Hook
 *
 * Handles synchronization of playback progress to the EchoSession database.
 * Uses debouncing to avoid excessive writes during playback.
 */

import { useEffect, useRef } from 'react'
import { usePlayerSessionStore } from '@/page/stores/player/player-session-store'
import { updateEchoSessionProgress } from '@/page/db'
import { createLogger } from '@/shared/lib/utils'

const log = createLogger({ name: 'use-progress-sync' })

const PROGRESS_UPDATE_DEBOUNCE_MS = 2000 // 2 seconds

export function useProgressSync() {
  const currentTime = usePlayerSessionStore((s) => s.currentSession?.currentTime ?? 0)
  const echoSessionId = usePlayerSessionStore((s) => s.currentEchoSessionId)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!echoSessionId || currentTime <= 0) return

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // Set new timer
    timerRef.current = setTimeout(async () => {
      try {
        await updateEchoSessionProgress(echoSessionId, {
          currentTime,
        })
        log.debug('Progress saved to EchoSession', {
          echoSessionId,
          currentTime,
        })
      } catch (error) {
        log.error('Failed to save progress to EchoSession:', error)
      }
    }, PROGRESS_UPDATE_DEBOUNCE_MS)

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [currentTime, echoSessionId])
}

