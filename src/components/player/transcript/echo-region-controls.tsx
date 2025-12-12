/**
 * EchoRegionControls Component
 *
 * Control buttons for expanding/shrinking echo region boundaries.
 */

import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { formatHotkey } from '@/lib/format-hotkey'
import { useHotkeyBinding } from '@/stores/hotkeys'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface EchoRegionControlsProps {
  position: 'top' | 'bottom'
  onExpand: () => void
  onShrink: () => void
  expandDisabled: boolean
  shrinkDisabled: boolean
  expandLabel: string
  shrinkLabel: string
}

export function EchoRegionControls({
  position,
  onExpand,
  onShrink,
  expandDisabled,
  shrinkDisabled,
  expandLabel,
  shrinkLabel,
}: EchoRegionControlsProps) {
  // Get hotkey bindings based on position
  const expandKey = formatHotkey(
    useHotkeyBinding(position === 'top' ? 'player.expandEchoBackward' : 'player.expandEchoForward')
  )
  const shrinkKey = formatHotkey(
    useHotkeyBinding(position === 'top' ? 'player.shrinkEchoBackward' : 'player.shrinkEchoForward')
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
          <TooltipContent side={position === 'top' ? 'bottom' : 'top'}>
            {expandLabel}
            {expandKey && <span className="ml-2 text-muted-foreground">({expandKey})</span>}
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
          <TooltipContent side={position === 'top' ? 'bottom' : 'top'}>
            {shrinkLabel}
            {shrinkKey && <span className="ml-2 text-muted-foreground">({shrinkKey})</span>}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="h-px bg-border flex-1 max-w-[60px]" />
    </div>
  )
}

