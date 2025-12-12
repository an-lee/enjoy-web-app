import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn, formatTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { VolumePopover } from './volume-popover'
import { SpeedPopover } from './speed-popover'

interface ExpandedPlayerControlsProps {
  displayTime: number
  duration: number
  progress: number
  isPlaying: boolean
  volume: number
  playbackRate: number
  echoModeActive: boolean
  onSeek: (values: number[]) => void
  onTogglePlay: () => void
  onPrevSegment: () => void
  onNextSegment: () => void
  onReplaySegment: () => void
  onDictationMode: () => void
  onEchoMode: () => void
  onVolumeChange: (volume: number) => void
  onPlaybackRateChange: (rate: number) => void
}

export function ExpandedPlayerControls({
  displayTime,
  duration,
  progress,
  isPlaying,
  volume,
  playbackRate,
  echoModeActive,
  onSeek,
  onTogglePlay,
  onPrevSegment,
  onNextSegment,
  onReplaySegment,
  onDictationMode,
  onEchoMode,
  onVolumeChange,
  onPlaybackRateChange,
}: ExpandedPlayerControlsProps) {
  const { t } = useTranslation()

  return (
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
            onValueChange={onSeek}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground tabular-nums w-12 shrink-0">
            {formatTime(duration)}
          </span>
        </div>

        {/* Row 2: Controls */}
        <div className="flex items-center justify-between">
          {/* Main controls - Left side */}
          <div className="flex items-center gap-1">
            {/* Play/Pause */}
            <Button
              variant="default"
              size="icon"
              className="h-12 w-11 rounded-full shadow-md"
              onClick={onTogglePlay}
            >
              <Icon
                icon={isPlaying ? 'lucide:pause' : 'lucide:play'}
                className={cn('w-6 h-5', !isPlaying && 'ml-0.5')}
              />
            </Button>

            {/* Previous segment */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onPrevSegment}
                >
                  <Icon icon="lucide:skip-back" className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t('player.prevSegment')}</TooltipContent>
            </Tooltip>

            {/* Next segment */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onNextSegment}
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
                  onClick={onReplaySegment}
                >
                  <Icon icon="lucide:repeat-1" className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t('player.replaySegment')}</TooltipContent>
            </Tooltip>
          </div>

          {/* Secondary controls - Right side */}
          <div className="flex items-center gap-1">
            {/* Dictation mode */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onDictationMode}
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
                  variant={echoModeActive ? 'secondary' : 'ghost'}
                  size="icon"
                  className={cn(
                    'h-9 w-9',
                    echoModeActive &&
                      'bg-orange-500/20 hover:bg-orange-500/30 text-orange-600 dark:text-orange-400'
                  )}
                  onClick={onEchoMode}
                >
                  <Icon icon="lucide:mic" className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {echoModeActive ? t('player.transcript.exitEchoMode') : t('player.echoMode')}
              </TooltipContent>
            </Tooltip>

            {/* Divider */}
            <div className="w-px h-5 bg-border mx-1" />

            {/* Playback speed */}
            <SpeedPopover playbackRate={playbackRate} onPlaybackRateChange={onPlaybackRateChange} />

            {/* Volume */}
            <VolumePopover volume={volume} onVolumeChange={onVolumeChange} />
          </div>
        </div>
      </div>
    </footer>
  )
}

