/**
 * useLoadMedia Hook
 *
 * Handles loading media and creating/restoring EchoSession.
 * Uses React Query mutation for async operations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LibraryMedia } from '@/page/hooks/queries'
import {
  getOrCreateActiveEchoSession,
  getEchoSessionById,
} from '@/page/db'
import { syncTranscriptsForTarget } from '@/page/db/services/sync-manager'
import type { TargetType } from '@/page/types/db'
import { createLogger } from '@/shared/lib/utils'
import { usePlayerSessionStore } from '@/page/stores/player/player-session-store'
import { usePlayerSettingsStore } from '@/page/stores/player/player-settings-store'
import { usePlayerEchoStore } from '@/page/stores/player/player-echo-store'
import { usePlayerUIStore } from '@/page/stores/player/player-ui-store'
import type { PlaybackSession } from '@/page/stores/player/types'

const log = createLogger({ name: 'use-load-media' })

// Helper: Convert media type to TargetType
function mediaTypeToTargetType(mediaType: 'audio' | 'video'): TargetType {
  return mediaType === 'audio' ? 'Audio' : 'Video'
}

export function useLoadMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (media: LibraryMedia): Promise<PlaybackSession> => {
      const targetType = mediaTypeToTargetType(media.type)
      const settings = usePlayerSettingsStore.getState()

      // 1. Create/get active EchoSession
      const echoSessionId = await getOrCreateActiveEchoSession(
        targetType,
        media.id,
        media.language,
        {
          currentTime: 0, // Will be overridden if session exists
          playbackRate: settings.playbackRate,
          volume: settings.volume,
        }
      )

      // 2. Load EchoSession
      const echoSession = await getEchoSessionById(echoSessionId)
      if (!echoSession) {
        throw new Error('Failed to load EchoSession after creation')
      }

      // 3. Create PlaybackSession
      const session: PlaybackSession = {
        mediaId: media.id,
        mediaType: media.type,
        mediaTitle: media.title,
        thumbnailUrl: media.thumbnailUrl,
        duration: media.duration,
        currentTime: echoSession.currentTime,
        currentSegmentIndex: 0, // Not persisted, always start at 0
        language: echoSession.language,
        transcriptId: echoSession.transcriptId,
        startedAt: echoSession.startedAt,
        lastActiveAt: echoSession.lastActiveAt,
      }

      // 4. Restore playback settings from EchoSession
      const restoredPlaybackRate = echoSession.playbackRate ?? settings.playbackRate
      const restoredVolume = echoSession.volume ?? settings.volume

      // 5. Restore echo mode state if exists
      const hasEchoRegion =
        echoSession.echoStartTime !== undefined &&
        echoSession.echoEndTime !== undefined &&
        echoSession.echoStartTime >= 0 &&
        echoSession.echoEndTime >= 0

      // 6. Handle currentTime outside echo region
      let restoredCurrentTime = echoSession.currentTime
      if (hasEchoRegion && echoSession.echoStartTime !== undefined && echoSession.echoEndTime !== undefined) {
        // Clamp currentTime to echo region if it's outside
        if (restoredCurrentTime < echoSession.echoStartTime) {
          restoredCurrentTime = echoSession.echoStartTime
          log.debug('CurrentTime before echo region, clamping to start', {
            originalTime: echoSession.currentTime,
            clampedTime: restoredCurrentTime,
          })
        } else if (restoredCurrentTime >= echoSession.echoEndTime) {
          restoredCurrentTime = echoSession.echoStartTime
          log.debug('CurrentTime at or after echo region end, resetting to start', {
            originalTime: echoSession.currentTime,
            resetTime: restoredCurrentTime,
          })
        }
      }

      // 7. Update session with potentially adjusted currentTime
      const finalSession: PlaybackSession = {
        ...session,
        currentTime: restoredCurrentTime,
      }

      // 8. Update stores (synchronous operations)
      usePlayerSessionStore.getState().setSession(finalSession, echoSessionId)
      usePlayerSettingsStore.getState().setVolume(restoredVolume)
      usePlayerSettingsStore.getState().setPlaybackRate(restoredPlaybackRate)

      if (hasEchoRegion && echoSession.echoStartTime !== undefined && echoSession.echoEndTime !== undefined) {
        usePlayerEchoStore.getState().activateEchoMode(
          -1, // line indices will be recalculated when transcript loads
          -1,
          echoSession.echoStartTime,
          echoSession.echoEndTime
        )
      }

      usePlayerUIStore.getState().expand()
      usePlayerUIStore.getState().setPlaying(true)

      // 9. If currentTime was adjusted, save it to database
      if (restoredCurrentTime !== echoSession.currentTime) {
        try {
          const { updateEchoSessionProgress } = await import('@/page/db')
          await updateEchoSessionProgress(echoSessionId, {
            currentTime: restoredCurrentTime,
          })
          log.debug('Saved adjusted currentTime to EchoSession', {
            echoSessionId,
            adjustedTime: restoredCurrentTime,
          })
        } catch (error) {
          log.error('Failed to save adjusted currentTime to EchoSession:', error)
        }
      }

      log.debug('Media loaded with EchoSession', {
        mediaId: media.id,
        echoSessionId,
        currentTime: finalSession.currentTime,
      })

      // 10. Invalidate continue learning card queries
      queryClient.invalidateQueries({ queryKey: ['most-recent-echo-session'] })
      queryClient.invalidateQueries({ queryKey: ['continue-learning-media'] })

      // 11. Sync transcripts for this target in background (non-blocking)
      syncTranscriptsForTarget(targetType, media.id, { background: true }).catch((error) => {
        log.error('Failed to sync transcripts for target:', error)
        // Don't block media loading if transcript sync fails
      })

      return finalSession
    },
  })
}

