/**
 * FullPlayer - Expanded player view for practice mode
 *
 * Displays:
 * - Video/Audio player
 * - Playback controls
 * - Progress bar
 * - (Future: Transcript panel, recording controls)
 */

import { useCallback, forwardRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePlayerStore } from '@/stores/player'
import { ProgressBar } from './shared/progress-bar'
import { GenerativeCover } from '@/components/library/generative-cover'

// ============================================================================
// Types
// ============================================================================

interface FullPlayerProps {
  className?: string
  /** Media URL for playback */
  mediaUrl: string | null
  /** Whether media is loading */
  isLoading?: boolean
  /** Error message if loading failed */
  error?: string | null
  /** Callback to seek to a position */
  onSeek?: (time: number) => void
  /** Reference to the video element */
  videoRef?: RefObject<HTMLVideoElement | null>
  /** Reference to the audio element */
  audioRef?: RefObject<HTMLAudioElement | null>
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

// ============================================================================
// Component
// ============================================================================

export const FullPlayer = forwardRef<HTMLDivElement, FullPlayerProps>(
  function FullPlayer(
    { className, mediaUrl, isLoading, error, onSeek, videoRef, audioRef },
    ref
  ) {
    const { t } = useTranslation()

    // Player state
    const {
      currentSession,
      isPlaying,
      volume,
      playbackRate,
      togglePlay,
      collapse,
      hide,
      setVolume,
      setPlaybackRate,
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

    // Handle skip backward (5 seconds)
    const handleSkipBackward = useCallback(() => {
      if (!currentSession) return
      const newTime = Math.max(0, currentSession.currentTime - 5)
      onSeek?.(newTime)
    }, [currentSession, onSeek])

    // Handle skip forward (5 seconds)
    const handleSkipForward = useCallback(() => {
      if (!currentSession) return
      const newTime = Math.min(
        currentSession.duration,
        currentSession.currentTime + 5
      )
      onSeek?.(newTime)
    }, [currentSession, onSeek])

    // Handle collapse
    const handleCollapse = useCallback(() => {
      collapse()
    }, [collapse])

    // Handle close
    const handleClose = useCallback(() => {
      hide()
    }, [hide])

    // Handle volume change
    const handleVolumeChange = useCallback(
      (values: number[]) => {
        setVolume(values[0])
      },
      [setVolume]
    )

    // Handle playback rate change
    const handlePlaybackRateChange = useCallback(
      (rate: number) => {
        setPlaybackRate(rate)
      },
      [setPlaybackRate]
    )

    if (!currentSession) return null

    const progress =
      currentSession.duration > 0
        ? (currentSession.currentTime / currentSession.duration) * 100
        : 0

    const isVideo = currentSession.mediaType === 'video'

    return (
      <div
        ref={ref}
        className={cn(
          'fixed inset-0 z-50',
          'bg-background',
          'animate-in fade-in duration-200',
          'flex flex-col',
          className
        )}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={handleCollapse}
            >
              <Icon icon="lucide:chevron-down" className="w-5 h-5" />
              <span className="sr-only">{t('player.collapse')}</span>
            </Button>
            <div className="min-w-0">
              <h2 className="text-sm font-medium truncate">
                {currentSession.mediaTitle}
              </h2>
              <p className="text-xs text-muted-foreground">
                {currentSession.language.toUpperCase()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Icon icon="lucide:x" className="w-5 h-5" />
            <span className="sr-only">{t('common.close')}</span>
          </Button>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Media display */}
          <div className="flex-1 flex items-center justify-center bg-black/5 dark:bg-black/20 min-h-0">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Icon
                  icon="lucide:loader-2"
                  className="w-8 h-8 animate-spin"
                />
                <p className="text-sm">{t('common.loading')}</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 text-destructive">
                <Icon icon="lucide:alert-circle" className="w-8 h-8" />
                <p className="text-sm">{error}</p>
              </div>
            ) : isVideo ? (
              <video
                ref={videoRef as RefObject<HTMLVideoElement>}
                src={mediaUrl || undefined}
                className="max-w-full max-h-full object-contain"
                playsInline
              />
            ) : (
              /* Audio visualization / cover */
              <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl">
                {currentSession.thumbnailUrl ? (
                  <img
                    src={currentSession.thumbnailUrl}
                    alt={currentSession.mediaTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <GenerativeCover
                    seed={currentSession.mediaId}
                    type="audio"
                    className="w-full h-full"
                  />
                )}
              </div>
            )}

            {/* Hidden audio element */}
            {!isVideo && (
              <audio
                ref={audioRef as RefObject<HTMLAudioElement>}
                src={mediaUrl || undefined}
                className="hidden"
              />
            )}
          </div>

          {/* Controls area */}
          <div className="shrink-0 px-4 py-4 md:px-8 md:py-6 bg-background border-t">
            {/* Progress bar */}
            <div className="mb-4">
              <ProgressBar
                progress={progress}
                onSeek={handleSeek}
                size="md"
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentSession.currentTime)}</span>
                <span>{formatTime(currentSession.duration)}</span>
              </div>
            </div>

            {/* Main controls */}
            <div className="flex items-center justify-center gap-4 mb-4">
              {/* Skip backward */}
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12"
                onClick={handleSkipBackward}
              >
                <Icon icon="lucide:rotate-ccw" className="w-5 h-5" />
                <span className="sr-only">{t('player.skipBackward')}</span>
              </Button>

              {/* Play/Pause */}
              <Button
                variant="default"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={togglePlay}
              >
                <Icon
                  icon={isPlaying ? 'lucide:pause' : 'lucide:play'}
                  className="w-6 h-6"
                />
                <span className="sr-only">
                  {isPlaying ? t('player.pause') : t('player.play')}
                </span>
              </Button>

              {/* Skip forward */}
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12"
                onClick={handleSkipForward}
              >
                <Icon icon="lucide:rotate-cw" className="w-5 h-5" />
                <span className="sr-only">{t('player.skipForward')}</span>
              </Button>
            </div>

            {/* Secondary controls */}
            <div className="flex items-center justify-between">
              {/* Volume control */}
              <div className="flex items-center gap-2 w-32">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setVolume(volume > 0 ? 0 : 1)}
                >
                  <Icon
                    icon={
                      volume === 0
                        ? 'lucide:volume-x'
                        : volume < 0.5
                          ? 'lucide:volume-1'
                          : 'lucide:volume-2'
                    }
                    className="w-4 h-4"
                  />
                </Button>
                <Slider
                  value={[volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="flex-1"
                />
              </div>

              {/* Playback rate */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-3">
                    <Icon icon="lucide:gauge" className="w-4 h-4 mr-1" />
                    {playbackRate}x
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {PLAYBACK_RATES.map((rate) => (
                    <DropdownMenuItem
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={cn(
                        playbackRate === rate && 'bg-accent font-medium'
                      )}
                    >
                      {rate}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Placeholder for future controls (repeat, etc.) */}
              <div className="w-32 flex justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                  <Icon icon="lucide:repeat" className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

