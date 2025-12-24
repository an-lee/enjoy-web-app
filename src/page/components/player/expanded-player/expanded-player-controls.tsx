import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn, formatTime } from '@/shared/lib/utils'
import { formatHotkeyAsKbd } from '@/page/lib/format-hotkey'
import { useHotkeyBinding } from '@/page/stores/hotkeys'
import { usePlayerSessionStore } from '@/page/stores/player/player-session-store'
import { usePlayerUIStore } from '@/page/stores/player/player-ui-store'
import { usePlayerSettingsStore } from '@/page/stores/player/player-settings-store'
import { usePlayerEchoStore } from '@/page/stores/player/player-echo-store'
import { useDisplayTime, usePlayerControls } from '@/page/hooks/player'
import { Button } from '@/page/components/ui/button'
import { Slider } from '@/page/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/page/components/ui/tooltip'
import { VolumePopover } from './volume-popover'
import { SpeedPopover } from './speed-popover'

interface ExpandedPlayerControlsProps {
  // No props needed - component gets all data from hooks
}

export function ExpandedPlayerControls({}: ExpandedPlayerControlsProps) {
  const { t } = useTranslation()
  const displayTime = useDisplayTime()

  // Get player state from stores
  const currentSession = usePlayerSessionStore((s) => s.currentSession)
  const isPlaying = usePlayerUIStore((s) => s.isPlaying)
  const isBuffering = usePlayerUIStore((s) => s.isBuffering)
  const volume = usePlayerSettingsStore((s) => s.volume)
  const playbackRate = usePlayerSettingsStore((s) => s.playbackRate)
  const echoModeActive = usePlayerEchoStore((s) => s.echoModeActive)
  const setVolume = usePlayerSettingsStore((s) => s.setVolume)
  const setPlaybackRate = usePlayerSettingsStore((s) => s.setPlaybackRate)

  // Get all player controls from unified hook
  const controls = usePlayerControls()

  // Calculate progress and duration
  const duration = currentSession?.duration || 0
  const progress = useMemo(
    () => (duration > 0 ? (displayTime / duration) * 100 : 0),
    [displayTime, duration]
  )

  // Get hotkey bindings
  const togglePlayKey = useHotkeyBinding('player.togglePlay')
  const echoModeKey = useHotkeyBinding('player.toggleEchoMode')
  const dictationKey = useHotkeyBinding('player.toggleDictationMode')
  const prevLineKey = useHotkeyBinding('player.prevLine')
  const nextLineKey = useHotkeyBinding('player.nextLine')
  const replayLineKey = useHotkeyBinding('player.replayLine')

  return (
    <footer className="shrink-0 bg-background border-t">
      <div className="max-w-3xl mx-auto px-4 py-4">
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
            onValueChange={controls.handleSeek}
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
            {/* Previous line */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={controls.handlePrevLine}
                >
                  <Icon icon="lucide:skip-back" className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex items-center gap-2">
                <span>{t('hotkeys.prevLine')}</span>
                {prevLineKey && formatHotkeyAsKbd(prevLineKey)}
              </TooltipContent>
            </Tooltip>

            {/* Play/Pause */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="h-12 w-11 rounded-full shadow-md"
                  onClick={controls.onTogglePlay}
                  disabled={isBuffering}
                >
                  {isBuffering ? (
                    <Icon icon="lucide:loader-2" className="w-6 h-5 animate-spin" />
                  ) : (
                    <Icon
                      icon={isPlaying ? 'lucide:pause' : 'lucide:play'}
                      className={cn('w-6 h-5', !isPlaying && 'ml-0.5')}
                    />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex items-center gap-2">
                <span>
                  {isBuffering
                    ? t('player.buffering', { defaultValue: 'Buffering...' })
                    : t('hotkeys.togglePlay')}
                </span>
                {togglePlayKey && !isBuffering && formatHotkeyAsKbd(togglePlayKey)}
              </TooltipContent>
            </Tooltip>

            {/* Next line */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={controls.handleNextLine}
                >
                  <Icon icon="lucide:skip-forward" className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex items-center gap-2">
                <span>{t('hotkeys.nextLine')}</span>
                {nextLineKey && formatHotkeyAsKbd(nextLineKey)}
              </TooltipContent>
            </Tooltip>

            {/* Replay current line */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={controls.handleReplayLine}
                >
                  <Icon icon="lucide:rotate-ccw" className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex items-center gap-2">
                <span>{t('hotkeys.replayLine')}</span>
                {replayLineKey && formatHotkeyAsKbd(replayLineKey)}
              </TooltipContent>
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
                  onClick={controls.handleDictationMode}
                >
                  <Icon icon="lucide:pencil-line" className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex items-center gap-2">
                <span>{t('player.dictationMode')}</span>
                {dictationKey && formatHotkeyAsKbd(dictationKey)}
              </TooltipContent>
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
                  onClick={controls.handleEchoMode}
                >
                  <Icon icon="lucide:mic" className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex items-center gap-2">
                <span>{echoModeActive ? t('player.transcript.exitEchoMode') : t('player.echoMode')}</span>
                {echoModeKey && formatHotkeyAsKbd(echoModeKey)}
              </TooltipContent>
            </Tooltip>

            {/* Divider */}
            <div className="w-px h-5 bg-border mx-1" />

            {/* Playback speed */}
            <SpeedPopover playbackRate={playbackRate} onPlaybackRateChange={setPlaybackRate} />

            {/* Volume */}
            <VolumePopover volume={volume} onVolumeChange={setVolume} />
          </div>
        </div>
      </div>
    </footer>
  )
}

