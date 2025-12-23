/**
 * usePlayerSettingsSync Hook
 *
 * Handles synchronization of player settings (volume, playbackRate)
 * to the EchoSession database. Uses debouncing to avoid excessive writes.
 */

import { useEffect } from 'react'
import { usePlayerSettingsStore } from '@/page/stores/player/player-settings-store'
import { usePlayerSessionStore } from '@/page/stores/player/player-session-store'
import { updateEchoSessionProgress } from '@/page/db'
import { createLogger } from '@/shared/lib/utils'

const log = createLogger({ name: 'use-player-settings-sync' })

const DEBOUNCE_MS = 500 // 500ms debounce for settings updates

export function usePlayerSettingsSync() {
  const volume = usePlayerSettingsStore((s) => s.volume)
  const playbackRate = usePlayerSettingsStore((s) => s.playbackRate)
  const echoSessionId = usePlayerSessionStore((s) => s.currentEchoSessionId)

  // Sync volume to database
  useEffect(() => {
    if (!echoSessionId) return

    const timer = setTimeout(() => {
      updateEchoSessionProgress(echoSessionId, { volume })
        .then(() => {
          log.debug('Volume saved to EchoSession', {
            echoSessionId,
            volume,
          })
        })
        .catch((error) => {
          log.error('Failed to save volume to EchoSession:', error)
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [volume, echoSessionId])

  // Sync playbackRate to database
  useEffect(() => {
    if (!echoSessionId) return

    const timer = setTimeout(() => {
      updateEchoSessionProgress(echoSessionId, { playbackRate })
        .then(() => {
          log.debug('Playback rate saved to EchoSession', {
            echoSessionId,
            playbackRate,
          })
        })
        .catch((error) => {
          log.error('Failed to save playback rate to EchoSession:', error)
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [playbackRate, echoSessionId])
}

