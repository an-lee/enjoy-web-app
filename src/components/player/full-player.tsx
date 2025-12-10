/**
 * FullPlayer - Expanded player view for language learning practice
 *
 * Modern, minimal design with learning-focused controls:
 * - Row 1: Progress bar with time labels
 * - Row 2: Main controls (prev/play/next/replay) + Secondary controls (volume/speed/dictation/echo)
 */

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { usePlayerStore } from '@/stores/player'
import { GenerativeCover } from '@/components/library/generative-cover'
import { useDisplayTime } from './global-player'

// ============================================================================
// Types
// ============================================================================

interface FullPlayerProps {
  className?: string
  /** Whether media is loading */
  isLoading?: boolean
  /** Error message if loading failed */
  error?: string | null
  /** Whether it's a video */
  isVideo?: boolean
  /** Callback to seek to a position */
  onSeek?: (time: number) => void
  /** Callback to toggle play/pause */
  onTogglePlay?: () => void
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

// ============================================================================
// Sub-components
// ============================================================================

interface VolumePopoverProps {
  volume: number
  onVolumeChange: (volume: number) => void
}

function VolumePopover({ volume, onVolumeChange }: VolumePopoverProps) {
  const { t } = useTranslation()

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
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
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{t('player.volume')}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-3" side="top" align="center">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">{Math.round(volume * 100)}%</span>
          <Slider
            value={[volume]}
            min={0}
            max={1}
            step={0.01}
            orientation="vertical"
            onValueChange={(values) => onVolumeChange(values[0])}
            className="h-24"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onVolumeChange(volume > 0 ? 0 : 1)}
          >
            {volume > 0 ? t('player.mute') : t('player.unmute')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface SpeedPopoverProps {
  playbackRate: number
  onPlaybackRateChange: (rate: number) => void
}

function SpeedPopover({ playbackRate, onPlaybackRateChange }: SpeedPopoverProps) {
  const { t } = useTranslation()
  const presets = [0.5, 0.75, 1, 1.25]

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 px-2 font-mono text-xs">
              {playbackRate}x
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{t('player.speed')}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56 p-3" side="top" align="center">
        <div className="flex flex-col gap-3">
          {/* Current value display */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('player.speed')}</span>
            <span className="text-sm font-mono font-medium">{playbackRate}x</span>
          </div>

          {/* Horizontal slider */}
          <Slider
            value={[playbackRate]}
            min={0.5}
            max={2}
            step={0.05}
            onValueChange={(values) => onPlaybackRateChange(values[0])}
          />

          {/* Preset buttons */}
          <div className="flex justify-between gap-1">
            {presets.map((rate) => (
              <Button
                key={rate}
                variant={playbackRate === rate ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs font-mono flex-1"
                onClick={() => onPlaybackRateChange(rate)}
              >
                {rate}x
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Component
// ============================================================================

export function FullPlayer({
  className,
  isLoading,
  error,
  isVideo,
  onSeek,
  onTogglePlay,
}: FullPlayerProps) {
  const { t } = useTranslation()
  const displayTime = useDisplayTime()

  // Player state
  const {
    currentSession,
    isPlaying,
    volume,
    playbackRate,
    collapse,
    hide,
    setVolume,
    setPlaybackRate,
  } = usePlayerStore()

  // Handle seek via slider
  const handleSeek = useCallback(
    (values: number[]) => {
      if (!currentSession) return
      const newTime = (values[0] / 100) * currentSession.duration
      onSeek?.(newTime)
    },
    [currentSession, onSeek]
  )

  // Handle previous segment (5 seconds back for now, will be sentence-based later)
  const handlePrevSegment = useCallback(() => {
    if (!currentSession) return
    const newTime = Math.max(0, displayTime - 5)
    onSeek?.(newTime)
  }, [currentSession, displayTime, onSeek])

  // Handle next segment (5 seconds forward for now, will be sentence-based later)
  const handleNextSegment = useCallback(() => {
    if (!currentSession) return
    const newTime = Math.min(currentSession.duration, displayTime + 5)
    onSeek?.(newTime)
  }, [currentSession, displayTime, onSeek])

  // Handle replay current segment (go back 3 seconds for now, will be sentence-based later)
  const handleReplaySegment = useCallback(() => {
    if (!currentSession) return
    const newTime = Math.max(0, displayTime - 3)
    onSeek?.(newTime)
  }, [currentSession, displayTime, onSeek])

  // Handle collapse
  const handleCollapse = useCallback(() => {
    collapse()
  }, [collapse])

  // Handle close
  const handleClose = useCallback(() => {
    hide()
  }, [hide])

  // Handle dictation mode (placeholder)
  const handleDictationMode = useCallback(() => {
    // TODO: Implement dictation mode
    console.log('Dictation mode')
  }, [])

  // Handle echo mode (placeholder)
  const handleEchoMode = useCallback(() => {
    // TODO: Implement echo/shadowing mode
    console.log('Echo mode')
  }, [])

  if (!currentSession) return null

  const progress =
    currentSession.duration > 0
      ? (displayTime / currentSession.duration) * 100
      : 0

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'fixed inset-0 z-50',
          'bg-background',
          'animate-in fade-in duration-200',
          'flex flex-col',
          className
        )}
      >
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-4 h-14 border-b bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9"
                  onClick={handleCollapse}
                >
                  <Icon icon="lucide:chevron-down" className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t('player.collapse')}</TooltipContent>
            </Tooltip>
            <div className="min-w-0">
              <h2 className="text-sm font-medium truncate">
                {currentSession.mediaTitle}
              </h2>
              <p className="text-xs text-muted-foreground">
                {currentSession.language.toUpperCase()}
              </p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <Icon icon="lucide:x" className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('common.close')}</TooltipContent>
          </Tooltip>
        </header>

        {/* Main content area - Media display */}
        <main className="flex-1 flex items-center justify-center bg-muted/30 min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Icon icon="lucide:loader-2" className="w-10 h-10 animate-spin" />
              <p className="text-sm">{t('common.loading')}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 text-destructive">
              <Icon icon="lucide:alert-circle" className="w-10 h-10" />
              <p className="text-sm">{error}</p>
            </div>
          ) : isVideo ? (
            <div className="flex items-center justify-center w-full h-full p-4">
              <div className="w-full max-w-4xl aspect-video bg-black/10 dark:bg-black/40 rounded-xl flex items-center justify-center">
                <Icon icon="lucide:video" className="w-16 h-16 text-muted-foreground/50" />
              </div>
            </div>
          ) : (
            /* Audio visualization / cover */
            <div className="flex flex-col items-center gap-6 p-8">
              <div className="w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
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
              <div className="text-center max-w-md">
                <h3 className="text-lg font-semibold truncate">{currentSession.mediaTitle}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentSession.language.toUpperCase()}
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Controls area - Two rows */}
        <footer className="shrink-0 bg-background border-t">
          <div className="max-w-3xl mx-auto px-4 py-4 md:px-6">
            {/* Row 1: Progress bar with time */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-muted-foreground tabular-nums w-12 text-right shrink-0">
                {formatTime(displayTime)}
              </span>
              <Slider
                value={[progress]}
                min={0}
                max={100}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground tabular-nums w-12 shrink-0">
                {formatTime(currentSession.duration)}
              </span>
            </div>

            {/* Row 2: Controls */}
            <div className="flex items-center justify-between">
              {/* Main controls - Left side */}
              <div className="flex items-center gap-1">
                {/* Previous segment */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={handlePrevSegment}
                    >
                      <Icon icon="lucide:skip-back" className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{t('player.prevSegment')}</TooltipContent>
                </Tooltip>

                {/* Play/Pause */}
                <Button
                  variant="default"
                  size="icon"
                  className="h-11 w-11 rounded-full shadow-md"
                  onClick={onTogglePlay}
                >
                  <Icon
                    icon={isPlaying ? 'lucide:pause' : 'lucide:play'}
                    className={cn('w-5 h-5', !isPlaying && 'ml-0.5')}
                  />
                </Button>

                {/* Next segment */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={handleNextSegment}
                    >
                      <Icon icon="lucide:skip-forward" className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{t('player.nextSegment')}</TooltipContent>
                </Tooltip>

                {/* Replay current segment */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={handleReplaySegment}
                    >
                      <Icon icon="lucide:repeat-1" className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{t('player.replaySegment')}</TooltipContent>
                </Tooltip>
              </div>

              {/* Secondary controls - Right side */}
              <div className="flex items-center gap-1">
                {/* Volume */}
                <VolumePopover volume={volume} onVolumeChange={setVolume} />

                {/* Playback speed */}
                <SpeedPopover playbackRate={playbackRate} onPlaybackRateChange={setPlaybackRate} />

                {/* Divider */}
                <div className="w-px h-5 bg-border mx-1" />

                {/* Dictation mode */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={handleDictationMode}
                    >
                      <Icon icon="lucide:pencil-line" className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{t('player.dictationMode')}</TooltipContent>
                </Tooltip>

                {/* Echo/Shadowing mode */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={handleEchoMode}
                    >
                      <Icon icon="lucide:mic" className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{t('player.echoMode')}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
