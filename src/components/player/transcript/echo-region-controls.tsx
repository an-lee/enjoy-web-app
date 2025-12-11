/**
 * EchoRegionControls Component
 *
 * Control buttons for expanding/shrinking echo region boundaries.
 */

import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'

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

  return (
    <div className={cn('flex items-center justify-center gap-2', position === 'top' ? 'py-2 mb-1' : 'py-2 mt-1')}>
      <div className="h-px bg-border flex-1 max-w-[60px]" />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onExpand}
          disabled={expandDisabled}
          className={cn(
            'p-1.5 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground',
            'disabled:opacity-30 disabled:cursor-not-allowed'
          )}
          title={expandLabel}
        >
          <Icon
            icon={position === 'top' ? 'lucide:chevron-up' : 'lucide:chevron-down'}
            className="w-4 h-4"
          />
        </button>
        <button
          type="button"
          onClick={onShrink}
          disabled={shrinkDisabled}
          className={cn(
            'p-1.5 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground',
            'disabled:opacity-30 disabled:cursor-not-allowed'
          )}
          title={shrinkLabel}
        >
          <Icon icon="lucide:minus" className="w-4 h-4" />
        </button>
      </div>
      <div className="h-px bg-border flex-1 max-w-[60px]" />
    </div>
  )
}

