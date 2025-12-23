/**
 * TranscriptErrorState Component
 *
 * Error state display for transcript component.
 */

import { Icon } from '@iconify/react'
import { cn } from '@/shared/lib/utils'

interface TranscriptErrorStateProps {
  className?: string
  error: string
}

export function TranscriptErrorState({ className, error }: TranscriptErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center h-full text-center px-4',
        className
      )}
    >
      <Icon
        icon="lucide:alert-circle"
        className="w-8 h-8 text-destructive mb-3"
      />
      <p className="text-sm text-destructive">{error}</p>
    </div>
  )
}

