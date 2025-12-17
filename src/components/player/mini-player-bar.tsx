/**
 * MiniPlayerBar - Compact player bar that appears at the bottom of the screen
 *
 * Minimal design with essential controls only.
 */

import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn, formatTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { usePlayerStore } from '@/stores/player'
import { GenerativeCover } from '@/components/library/generative-cover'
import { useDisplayTime, usePlayerControls } from '@/hooks/player'
import { useSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'

// ============================================================================
// Types
// ============================================================================

interface MiniPlayerBarProps {
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function MiniPlayerBar({ className }: MiniPlayerBarProps) {
  const { t } = useTranslation()
  const displayTime = useDisplayTime()
  const isMobile = useIsMobile()
  const { state: sidebarState, open: sidebarOpen } = useSidebar()

  // Player state
  const { currentSession, isPlaying, expand, hide } = usePlayerStore()

  // Get all player controls from unified hook
  const controls = usePlayerControls()

  if (!currentSession) return null

  const progress =
    currentSession.duration > 0
      ? (displayTime / currentSession.duration) * 100
      : 0

  // Calculate left offset based on sidebar state
  // On mobile, sidebar is hidden, so no offset needed
  // On desktop, offset by sidebar width when sidebar is open and expanded
  // When sidebar is collapsed (offcanvas mode), it's completely hidden, so no offset
  const leftOffset = isMobile
    ? 'left-0'
    : sidebarOpen && sidebarState === 'expanded'
    ? 'left-[var(--sidebar-width)]'
    : 'left-0'

  return (
    <div
      className={cn(
        'fixed bottom-0 right-0 z-50',
        leftOffset,
        'bg-background/95 backdrop-blur-lg border-t',
        'shadow-[0_-2px_10px_rgba(0,0,0,0.08)]',
        'animate-in slide-in-from-bottom duration-300',
        'transition-[left] duration-200 ease-linear',
        className
      )}
    >
      {/* Progress slider at top */}
      <div className="px-4 pt-2">
        <Slider
          value={[progress]}
          min={0}
          max={100}
          step={0.1}
          onValueChange={controls.handleSeek}
          className="h-1"
        />
      </div>

      {/* Main content */}
      <div className="flex items-center gap-3 px-4 py-2">
        {/* Thumbnail - clickable to expand */}
        <button
          onClick={expand}
          className="relative shrink-0 w-10 h-10 rounded-md overflow-hidden group"
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
            <Icon icon="lucide:maximize-2" className="w-4 h-4 text-white" />
          </div>
        </button>

        {/* Title and time - clickable to expand */}
        <button onClick={expand} className="flex-1 min-w-0 text-left">
          <h4 className="text-sm font-medium truncate leading-tight">
            {currentSession.mediaTitle}
          </h4>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatTime(displayTime)} / {formatTime(currentSession.duration)}
          </p>
        </button>

        {/* Controls */}
        <div className="flex items-center gap-0.5">
          {/* Play/Pause button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={controls.onTogglePlay}
          >
            <Icon
              icon={isPlaying ? 'lucide:pause' : 'lucide:play'}
              className={cn('w-5 h-5', !isPlaying && 'ml-0.5')}
            />
            <span className="sr-only">
              {isPlaying ? t('player.pause') : t('player.play')}
            </span>
          </Button>

          {/* Expand button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={expand}
          >
            <Icon icon="lucide:chevron-up" className="w-5 h-5" />
            <span className="sr-only">{t('player.expand')}</span>
          </Button>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={hide}
          >
            <Icon icon="lucide:x" className="w-4 h-4" />
            <span className="sr-only">{t('common.close')}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
