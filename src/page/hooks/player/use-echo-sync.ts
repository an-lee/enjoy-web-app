/**
 * useEchoSync Hook
 *
 * Handles synchronization of echo mode state to the EchoSession database.
 */

import { useEffect } from 'react'
import { usePlayerEchoStore } from '@/page/stores/player/player-echo-store'
import { usePlayerSessionStore } from '@/page/stores/player/player-session-store'
import { updateEchoSessionProgress } from '@/page/db'
import { createLogger } from '@/shared/lib/utils'

const log = createLogger({ name: 'use-echo-sync' })

export function useEchoSync() {
  const echoModeActive = usePlayerEchoStore((s) => s.echoModeActive)
  const echoStartTime = usePlayerEchoStore((s) => s.echoStartTime)
  const echoEndTime = usePlayerEchoStore((s) => s.echoEndTime)
  const echoSessionId = usePlayerSessionStore((s) => s.currentEchoSessionId)

  // Sync echo mode state to database
  useEffect(() => {
    if (!echoSessionId) return

    // Only sync if echo mode is active and has valid times
    if (echoModeActive && echoStartTime >= 0 && echoEndTime >= 0) {
      updateEchoSessionProgress(echoSessionId, {
        echoStartTime,
        echoEndTime,
      })
        .then(() => {
          log.debug('Echo mode state saved to EchoSession', {
            echoSessionId,
            echoStartTime,
            echoEndTime,
          })
        })
        .catch((error) => {
          log.error('Failed to save echo mode state to EchoSession:', error)
        })
    } else if (!echoModeActive) {
      // Clear echo region when deactivated
      updateEchoSessionProgress(echoSessionId, {
        echoStartTime: undefined,
        echoEndTime: undefined,
      })
        .then(() => {
          log.debug('Echo mode deactivated and saved to EchoSession', {
            echoSessionId,
          })
        })
        .catch((error) => {
          log.error('Failed to save echo mode deactivation to EchoSession:', error)
        })
    }
  }, [echoModeActive, echoStartTime, echoEndTime, echoSessionId])
}

