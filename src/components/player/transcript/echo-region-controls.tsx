/**
 * EchoRegionControls Component
 *
 * Control buttons for expanding/shrinking echo region boundaries.
 */

import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { formatHotkeyAsKbd } from '@/lib/format-hotkey'
import { useHotkeyBinding } from '@/stores/hotkeys'
import { useEchoRegion } from './use-echo-region'
import type { TranscriptLineState } from './types'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface EchoRegionControlsProps {
  position: 'top' | 'bottom'
  lines: TranscriptLineState[]
}

export function EchoRegionControls({
  position,
  lines,
}: EchoRegionControlsProps) {
  const { t } = useTranslation()

  // Get echo region data and handlers from hook
  const {
    echoStartLineIndex,
    echoEndLineIndex,
    handleExpandEchoForward,
    handleExpandEchoBackward,
    handleShrinkEchoForward,
    handleShrinkEchoBackward,
  } = useEchoRegion(lines)

  // Determine handlers and disabled states based on position
  const onExpand = position === 'top' ? handleExpandEchoBackward : handleExpandEchoForward
  const onShrink = position === 'top' ? handleShrinkEchoBackward : handleShrinkEchoForward

  const expandDisabled = useMemo(() => {
    if (position === 'top') {
      return echoStartLineIndex === 0
    } else {
      return echoEndLineIndex >= lines.length - 1
    }
  }, [position, echoStartLineIndex, echoEndLineIndex, lines.length])

  const shrinkDisabled = useMemo(() => {
    if (position === 'top') {
      return echoStartLineIndex >= echoEndLineIndex
    } else {
      return echoEndLineIndex <= echoStartLineIndex
    }
  }, [position, echoStartLineIndex, echoEndLineIndex])

  const expandLabel = position === 'top'
    ? t('player.transcript.expandEchoBackward')
    : t('player.transcript.expandEchoForward')
  const shrinkLabel = position === 'top'
    ? t('player.transcript.shrinkEchoBackward')
    : t('player.transcript.shrinkEchoForward')

  // Get hotkey bindings based on position
  const expandKey = useHotkeyBinding(
    position === 'top' ? 'player.expandEchoBackward' : 'player.expandEchoForward'
  )
  const shrinkKey = useHotkeyBinding(
    position === 'top' ? 'player.shrinkEchoBackward' : 'player.shrinkEchoForward'
  )

  return (
    <div className={cn('flex items-center justify-center gap-2', position === 'top' ? 'py-2 mb-1' : 'py-2 mt-1')}>
      <div className="h-px bg-border flex-1 max-w-[60px]" />
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onExpand}
              disabled={expandDisabled}
              className={cn(
                'p-1.5 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground',
                'disabled:opacity-30 disabled:cursor-not-allowed'
              )}
            >
              <Icon
                icon={position === 'top' ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                className="w-4 h-4"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side={position === 'top' ? 'bottom' : 'top'} className="flex items-center gap-2">
            <span>{expandLabel}</span>
            {expandKey && formatHotkeyAsKbd(expandKey)}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onShrink}
              disabled={shrinkDisabled}
              className={cn(
                'p-1.5 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground',
                'disabled:opacity-30 disabled:cursor-not-allowed'
              )}
            >
              <Icon icon="lucide:minus" className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side={position === 'top' ? 'bottom' : 'top'} className="flex items-center gap-2">
            <span>{shrinkLabel}</span>
            {shrinkKey && formatHotkeyAsKbd(shrinkKey)}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="h-px bg-border flex-1 max-w-[60px]" />
    </div>
  )
}

