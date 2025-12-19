/**
 * ContinueLearningCard - Sidebar card to continue the last learning session
 *
 * Uses EchoSession to find the most recent active session and displays
 * a card with media info, progress, and continue button.
 */

import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { usePlayerStore } from '@/page/stores/player'
import { getActiveEchoSessions, getVideoById, getAudioById } from '@/page/db'
import type { LibraryMedia } from '@/page/hooks/queries'
import type { EchoSession } from '@/page/types/db'
import { formatRelativeTime, createLogger } from '@/lib/utils'
import { GenerativeCover } from '@/page/components/library/generative-cover'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'continue-learning-card' })

// ============================================================================
// Types
// ============================================================================

interface ContinueLearningCardProps {
  className?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert EchoSession + Video/Audio to LibraryMedia
 */
async function echoSessionToLibraryMedia(
  session: Pick<EchoSession, 'targetType' | 'targetId'>
): Promise<LibraryMedia | null> {
  try {
    if (session.targetType === 'Video') {
      const video = await getVideoById(session.targetId)
      if (!video) return null

      return {
        id: video.id,
        type: 'video',
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        language: video.language,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
        video,
      }
    } else if (session.targetType === 'Audio') {
      const audio = await getAudioById(session.targetId)
      if (!audio) return null

      return {
        id: audio.id,
        type: 'audio',
        title: audio.title,
        description: audio.description,
        thumbnailUrl: audio.thumbnailUrl,
        duration: audio.duration,
        language: audio.language,
        createdAt: audio.createdAt,
        updatedAt: audio.updatedAt,
        audio,
      }
    }
  } catch (error) {
    log.error('Failed to load media for EchoSession:', error)
  }

  return null
}

/**
 * Get the most recent active EchoSession
 */
async function getMostRecentActiveSession(): Promise<EchoSession | null> {
  const sessions = await getActiveEchoSessions()
  if (sessions.length === 0) return null

  // Sort by lastActiveAt descending and return the first one
  const sorted = sessions.sort(
    (a, b) =>
      new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  )

  return sorted[0]
}

/**
 * Calculate progress percentage
 */
function formatProgress(currentTime: number, duration: number): number {
  if (duration <= 0) return 0
  return Math.round((currentTime / duration) * 100)
}

// ============================================================================
// Component
// ============================================================================

export function ContinueLearningCard({ className }: ContinueLearningCardProps) {
  const { t } = useTranslation()
  const { currentSession, loadMedia } = usePlayerStore()

  // Query most recent active EchoSession
  // Note: Hooks must be called before any conditional returns
  const { data: recentSession, isLoading } = useQuery({
    queryKey: ['most-recent-echo-session'],
    queryFn: getMostRecentActiveSession,
    staleTime: 1000 * 30, // 30 seconds
    enabled: !currentSession, // Only query if no active session
  })

  // Query media info for the session
  const { data: media, isLoading: isLoadingMedia } = useQuery({
    queryKey: ['continue-learning-media', recentSession?.id],
    queryFn: () => {
      if (!recentSession) return null
      return echoSessionToLibraryMedia(recentSession)
    },
    enabled: !!recentSession && !currentSession, // Only query if session exists and no active session
    staleTime: 1000 * 60, // 1 minute
  })

  // Don't show if there's already an active session
  if (currentSession) {
    return null
  }

  // Don't show if no session or media found
  if (!recentSession || !media || isLoading || isLoadingMedia) {
    return null
  }

  const progress = formatProgress(recentSession.currentTime, media.duration)

  const handleContinue = async () => {
    try {
      await loadMedia(media)
    } catch (error) {
      log.error('Failed to load media for continue learning:', error)
    }
  }

  return (
    <div className={cn('px-2 py-2', className)}>
      <button
        onClick={handleContinue}
        className={cn(
          'w-full rounded-lg p-3',
          'bg-primary/5 hover:bg-primary/10',
          'border border-primary/20 hover:border-primary/30',
          'transition-all duration-200',
          'group text-left'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20">
            <Icon icon="lucide:play" className="w-3 h-3 text-primary" />
          </div>
          <span className="text-xs font-medium text-primary">
            {t('player.continueLearning')}
          </span>
        </div>

        {/* Content */}
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="shrink-0 w-12 h-12 rounded-md overflow-hidden">
            {media.thumbnailUrl ? (
              <img
                src={media.thumbnailUrl}
                alt={media.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <GenerativeCover
                seed={media.id}
                type={media.type}
                className="w-full h-full"
              />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {media.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{media.language?.toUpperCase() || 'Unknown'}</span>
              <span>•</span>
              <span>{formatRelativeTime(recentSession.lastActiveAt)}</span>
            </div>

            {/* Progress bar */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {progress}%
              </span>
            </div>
          </div>
        </div>
      </button>
    </div>
  )
}
