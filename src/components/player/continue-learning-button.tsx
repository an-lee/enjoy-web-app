/**
 * ContinueLearningButton - Button to resume the last practice session
 */

import { usePlayerStore } from '@/stores/player'
import { formatRelativeTime } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface ContinueLearningButtonProps {
  className?: string
  variant?: 'default' | 'compact'
}

// ============================================================================
// Component
// ============================================================================

export function ContinueLearningButton({
  className,
  variant = 'default',
}: ContinueLearningButtonProps) {
  const { recentSession, resumeSession, currentSession } = usePlayerStore()

  // Don't show if there's no recent session or if there's already an active session
  if (!recentSession || currentSession) {
    return null
  }

  if (variant === 'compact') {
    return (
      <button onClick={resumeSession} className={className}>
        Continue: {recentSession.mediaTitle.slice(0, 20)}
        {recentSession.mediaTitle.length > 20 ? '...' : ''}
      </button>
    )
  }

  return (
    <button onClick={resumeSession} className={className}>
      <span>Continue Learning</span>
      <span className="text-muted-foreground">
        {recentSession.mediaTitle} • {formatRelativeTime(recentSession.lastActiveAt)}
      </span>
    </button>
  )
}

