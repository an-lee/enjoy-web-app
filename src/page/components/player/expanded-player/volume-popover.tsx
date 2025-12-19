import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
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

interface VolumePopoverProps {
  volume: number
  onVolumeChange: (volume: number) => void
}

export function VolumePopover({ volume, onVolumeChange }: VolumePopoverProps) {
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

