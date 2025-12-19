import { useTranslation } from 'react-i18next'
import { formatHotkeyAsKbd } from '@/page/lib/format-hotkey'
import { useHotkeyBinding } from '@/page/stores/hotkeys'
import { Button } from '@/page/components/ui/button'
import { Slider } from '@/page/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/page/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/page/components/ui/popover'

interface SpeedPopoverProps {
  playbackRate: number
  onPlaybackRateChange: (rate: number) => void
}

export function SpeedPopover({ playbackRate, onPlaybackRateChange }: SpeedPopoverProps) {
  const { t } = useTranslation()
  const presets = [0.5, 0.75, 1, 1.25]
  const slowDownKey = useHotkeyBinding('player.slowDown')
  const speedUpKey = useHotkeyBinding('player.speedUp')

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
        <TooltipContent side="top" className="flex items-center gap-2">
          <span>{t('player.speed')}</span>
          {slowDownKey && formatHotkeyAsKbd(slowDownKey)}
          {slowDownKey && speedUpKey && <span className="mx-1">/</span>}
          {speedUpKey && formatHotkeyAsKbd(speedUpKey)}
        </TooltipContent>
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

