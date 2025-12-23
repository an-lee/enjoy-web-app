/**
 * MiniPlayerBar - Compact player bar that appears at the bottom of the screen
 *
 * Minimal design with essential controls only.
 *
 * This component manages its own media loading and playback for mini/hidden modes.
 * When `hidden` prop is true, only the media element is rendered (no UI).
 */

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn, formatTime, createLogger } from '@/shared/lib/utils'
import { Button } from '@/page/components/ui/button'
import { Slider } from '@/page/components/ui/slider'
import { usePlayerStore } from '@/page/stores/player'
import { GenerativeCover } from '@/page/components/library/generative-cover'
import { useDisplayTime, usePlayerControls, useMediaElement } from '@/page/hooks/player'
import { useMediaLoader } from '@/page/hooks/player/use-media-loader'
import { usePlaybackSync } from '@/page/hooks/player/use-playback-sync'
import { useSidebar } from '@/page/components/ui/sidebar'
import { useIsMobile } from '@/page/hooks/use-mobile'

const log = createLogger({ name: 'MiniPlayerBar' })

// ============================================================================
// Types
// ============================================================================

interface MiniPlayerBarProps {
  className?: string
  /** If true, only render media element without UI (for hidden mode) */
  hidden?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function MiniPlayerBar({ className, hidden = false }: MiniPlayerBarProps) {
  const { t } = useTranslation()
  const displayTime = useDisplayTime()
  const isMobile = useIsMobile()
  const { state: sidebarState, open: sidebarOpen } = useSidebar()
  const mode = usePlayerStore((state) => state.mode)

  // Player state
  const { currentSession, isPlaying, expand, hide } = usePlayerStore()

  // Media element and loading logic
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Load media from IndexedDB
  const { mediaUrl } = useMediaLoader()

  // Get media element handlers
  const {
    handleTimeUpdate,
    handleEnded,
    handleCanPlay,
    handleLoadError,
  } = useMediaElement({
    mediaRef,
    onReady: setIsReady,
    onError: (errorMsg) => {
      log.error('Media element error:', errorMsg)
    },
  })

  // Sync playback state
  usePlaybackSync({
    mediaRef,
    isReady,
    mode,
  })

  // Get all player controls from unified hook
  const controls = usePlayerControls()

  if (!currentSession) return null

  const isVideo = currentSession.mediaType === 'video'

  // For hidden mode, only render media element
  if (hidden) {
    return (
      <>
        {mediaUrl && (
          <>
            {isVideo ? (
              <div className="hidden">
                <video
                  key={`video-hidden-${currentSession.mediaId}`}
                  ref={mediaRef as React.RefObject<HTMLVideoElement>}
                  src={mediaUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleEnded}
                  onCanPlay={handleCanPlay}
                  onWaiting={() => log.debug('buffering...')}
                  onStalled={() => log.warn('stalled!')}
                  onError={handleLoadError}
                  playsInline
                  preload="auto"
                />
              </div>
            ) : (
              <div className="hidden">
                <audio
                  key={`audio-hidden-${currentSession.mediaId}`}
                  ref={mediaRef as React.RefObject<HTMLAudioElement>}
                  src={mediaUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleEnded}
                  onCanPlay={handleCanPlay}
                  onWaiting={() => log.debug('buffering...')}
                  onStalled={() => log.warn('stalled!')}
                  onError={handleLoadError}
                  preload="auto"
                />
              </div>
            )}
          </>
        )}
      </>
    )
  }

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

      {/* Media element - hidden for audio, visible container for video (but video itself is hidden in mini mode) */}
      {mediaUrl && (
        <>
          {isVideo ? (
            <div className="hidden">
              <video
                key={`video-mini-${currentSession.mediaId}`}
                ref={mediaRef as React.RefObject<HTMLVideoElement>}
                src={mediaUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onCanPlay={handleCanPlay}
                onWaiting={() => log.debug('buffering...')}
                onStalled={() => log.warn('stalled!')}
                onError={handleLoadError}
                playsInline
                preload="auto"
              />
            </div>
          ) : (
            <div className="hidden">
              <audio
                key={`audio-mini-${currentSession.mediaId}`}
                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                src={mediaUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onCanPlay={handleCanPlay}
                onWaiting={() => log.debug('buffering...')}
                onStalled={() => log.warn('stalled!')}
                onError={handleLoadError}
                preload="auto"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
