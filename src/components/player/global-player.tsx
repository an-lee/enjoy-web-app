/**
 * GlobalPlayer - Global player container that manages player modes
 *
 * This component should be placed in the root layout to enable
 * media playback across all pages.
 *
 * Modes:
 * - hidden: No player UI shown
 * - mini: Mini player bar at the bottom
 * - expanded: Full-screen player
 */

import { useRef, useCallback } from 'react'
import { usePlayerStore } from '@/stores/player'
import { MiniPlayerBar } from './mini-player-bar'
import { FullPlayer } from './full-player'
import { useMediaPlayback } from './hooks/use-media-playback'

// ============================================================================
// Component
// ============================================================================

export function GlobalPlayer() {
  const { mode, currentSession } = usePlayerStore()
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const {
    mediaUrl,
    isLoading,
    error,
    seek,
  } = useMediaPlayback()

  // Handle seek from progress bar
  const handleSeek = useCallback((time: number) => {
    seek(time)
  }, [seek])

  // Don't render anything if no session and mode is hidden
  if (mode === 'hidden' && !currentSession) {
    return null
  }

  return (
    <>
      {/* Mini player bar - shown in mini mode */}
      {mode === 'mini' && currentSession && (
        <MiniPlayerBar onSeek={handleSeek} />
      )}

      {/* Full player - shown in expanded mode */}
      {mode === 'expanded' && currentSession && (
        <FullPlayer
          mediaUrl={mediaUrl}
          isLoading={isLoading}
          error={error}
          onSeek={handleSeek}
          videoRef={videoRef}
          audioRef={audioRef}
        />
      )}

      {/* Hidden media elements for background playback in mini mode */}
      {mode === 'mini' && currentSession && mediaUrl && (
        <>
          {currentSession.mediaType === 'audio' ? (
            <audio
              ref={audioRef}
              src={mediaUrl}
              className="hidden"
            />
          ) : (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="hidden"
            />
          )}
        </>
      )}
    </>
  )
}

// ============================================================================
// Continue Learning Button Component
// ============================================================================

interface ContinueLearningButtonProps {
  className?: string
  variant?: 'default' | 'compact'
}

export function ContinueLearningButton({
  className,
  variant = 'default',
}: ContinueLearningButtonProps) {
  const { recentSession, resumeSession, currentSession } = usePlayerStore()

  // Don't show if there's no recent session or if there's already an active session
  if (!recentSession || currentSession) {
    return null
  }

  // Format relative time
  const formatRelativeTime = (isoString: string): string => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={resumeSession}
        className={className}
      >
        Continue: {recentSession.mediaTitle.slice(0, 20)}
        {recentSession.mediaTitle.length > 20 ? '...' : ''}
      </button>
    )
  }

  return (
    <button
      onClick={resumeSession}
      className={className}
    >
      <span>Continue Learning</span>
      <span className="text-muted-foreground">
        {recentSession.mediaTitle} • {formatRelativeTime(recentSession.lastActiveAt)}
      </span>
    </button>
  )
}

