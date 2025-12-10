/**
 * ContinueLearningCard - Sidebar card to continue the last learning session
 */

import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { usePlayerStore } from '@/stores/player'
import { GenerativeCover } from '@/components/library/generative-cover'

// ============================================================================
// Types
// ============================================================================

interface ContinueLearningCardProps {
  className?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  return `${diffDays}d`
}

function formatProgress(currentTime: number, duration: number): number {
  if (duration <= 0) return 0
  return Math.round((currentTime / duration) * 100)
}

// ============================================================================
// Component
// ============================================================================

export function ContinueLearningCard({ className }: ContinueLearningCardProps) {
  const { t } = useTranslation()
  const { recentSession, resumeSession, currentSession } = usePlayerStore()

  // Don't show if there's no recent session or if there's already an active session
  if (!recentSession || currentSession) {
    return null
  }

  const progress = formatProgress(recentSession.currentTime, recentSession.duration)

  return (
    <div className={cn('px-2 py-2', className)}>
      <button
        onClick={resumeSession}
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
            {recentSession.thumbnailUrl ? (
              <img
                src={recentSession.thumbnailUrl}
                alt={recentSession.mediaTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <GenerativeCover
                seed={recentSession.mediaId}
                type={recentSession.mediaType}
                className="w-full h-full"
              />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {recentSession.mediaTitle}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{recentSession.language.toUpperCase()}</span>
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

