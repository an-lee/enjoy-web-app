/**
 * MiniPlayerBar - Compact player bar that appears at the bottom of the screen
 *
 * Displays:
 * - Thumbnail and title
 * - Progress bar
 * - Play/pause button
 * - Expand/close buttons
 */

import { useCallback, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { usePlayerStore } from '@/stores/player'
import { ProgressBar } from './shared/progress-bar'
import { GenerativeCover } from '@/components/library/generative-cover'

// ============================================================================
// Types
// ============================================================================

interface MiniPlayerBarProps {
  className?: string
  /** Callback to seek to a position */
  onSeek?: (time: number) => void
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ============================================================================
// Component
// ============================================================================

export const MiniPlayerBar = forwardRef<HTMLDivElement, MiniPlayerBarProps>(
  function MiniPlayerBar({ className, onSeek }, ref) {
    const { t } = useTranslation()

    // Player state
    const {
      currentSession,
      isPlaying,
      togglePlay,
      expand,
      hide,
    } = usePlayerStore()

    // Handle seek
    const handleSeek = useCallback(
      (progressPercent: number) => {
        if (!currentSession) return
        const newTime = (progressPercent / 100) * currentSession.duration
        onSeek?.(newTime)
      },
      [currentSession, onSeek]
    )

    // Handle expand
    const handleExpand = useCallback(() => {
      expand()
    }, [expand])

    // Handle close
    const handleClose = useCallback(() => {
      hide()
    }, [hide])

    if (!currentSession) return null

    const progress =
      currentSession.duration > 0
        ? (currentSession.currentTime / currentSession.duration) * 100
        : 0

    return (
      <div
        ref={ref}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-background/95 backdrop-blur-lg border-t',
          'shadow-[0_-4px_20px_rgba(0,0,0,0.1)]',
          'animate-in slide-in-from-bottom duration-300',
          className
        )}
      >
        {/* Progress bar at top edge */}
        <div className="absolute top-0 left-0 right-0 -translate-y-1/2">
          <ProgressBar
            progress={progress}
            onSeek={handleSeek}
            size="sm"
            className="mx-4"
          />
        </div>

        {/* Main content */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Thumbnail */}
          <button
            onClick={handleExpand}
            className="relative shrink-0 w-12 h-12 rounded-md overflow-hidden group"
          >
            {currentSession.thumbnailUrl ? (
              <img
                src={currentSession.thumbnailUrl}
                alt={currentSession.mediaTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <GenerativeCover
                seed={currentSession.mediaId}
                type={currentSession.mediaType}
                className="w-full h-full"
              />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Icon icon="lucide:maximize-2" className="w-5 h-5 text-white" />
            </div>
          </button>

          {/* Title and time */}
          <button onClick={handleExpand} className="flex-1 min-w-0 text-left">
            <h4 className="text-sm font-medium truncate">
              {currentSession.mediaTitle}
            </h4>
            <p className="text-xs text-muted-foreground">
              {formatTime(currentSession.currentTime)} /{' '}
              {formatTime(currentSession.duration)}
            </p>
          </button>

          {/* Controls */}
          <div className="flex items-center gap-1">
            {/* Play/Pause button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={togglePlay}
            >
              <Icon
                icon={isPlaying ? 'lucide:pause' : 'lucide:play'}
                className="w-5 h-5"
              />
              <span className="sr-only">
                {isPlaying ? t('player.pause') : t('player.play')}
              </span>
            </Button>

            {/* Expand button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={handleExpand}
            >
              <Icon icon="lucide:chevron-up" className="w-5 h-5" />
              <span className="sr-only">{t('player.expand')}</span>
            </Button>

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground hover:text-foreground"
              onClick={handleClose}
            >
              <Icon icon="lucide:x" className="w-5 h-5" />
              <span className="sr-only">{t('common.close')}</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }
)
