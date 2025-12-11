/**
 * TranscriptLineItem Component
 *
 * Individual transcript line item with primary and optional secondary text.
 * Handles click-to-seek, active state highlighting, and echo region styling.
 */

import { memo } from 'react'
import { cn } from '@/lib/utils'
import type { TranscriptLineState } from './types'

interface TranscriptLineItemProps {
  line: TranscriptLineState
  showSecondary: boolean
  onClick: () => void
  isInEchoRegion: boolean
  isEchoStart?: boolean
  isEchoEnd?: boolean
}

export const TranscriptLineItem = memo(function TranscriptLineItem({
  line,
  showSecondary,
  onClick,
  isInEchoRegion,
  isEchoStart,
  isEchoEnd,
}: TranscriptLineItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full text-left px-6 py-4 transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        // Echo region - prominent orange/amber background (matching reference)
        // Only apply rounded corners to first and last lines
        isInEchoRegion && [
          'bg-orange-600/90 text-white',
          isEchoStart && 'rounded-t-lg',
          isEchoEnd && 'rounded-b-lg',
          // If it's both start and end (single line), apply both corners
          isEchoStart && isEchoEnd && 'rounded-lg',
          // Remove hover effect for middle lines to maintain unified appearance
          isEchoStart || isEchoEnd ? 'hover:bg-orange-600' : 'hover:bg-orange-600/95',
          'shadow-md',
        ],
        // Non-echo region styles
        !isInEchoRegion && [
          'rounded-xl',
          'hover:bg-accent/50',
          // Active state - highlighted with scale and glow
          line.isActive && [
            'bg-primary/10 scale-[1.02]',
            'shadow-[0_0_30px_rgba(var(--primary),0.12)]',
          ],
          // Past state - dimmed
          line.isPast && !line.isActive && 'opacity-50',
          // Future state - slightly dimmed
          !line.isPast && !line.isActive && 'opacity-70 hover:opacity-100',
        ]
      )}
    >
      {/* Primary text */}
      <p
        className={cn(
          'text-lg md:text-xl leading-relaxed transition-all duration-300',
          isInEchoRegion && 'text-white font-medium',
          !isInEchoRegion && line.isActive && 'text-primary font-medium text-xl md:text-2xl',
          !isInEchoRegion && !line.isActive && 'text-foreground'
        )}
      >
        {line.primary.text}
      </p>

      {/* Secondary text (translation) */}
      {showSecondary && line.secondary && (
        <p
          className={cn(
            'mt-2 text-base leading-relaxed transition-all duration-300',
            isInEchoRegion && 'text-white/80',
            !isInEchoRegion && line.isActive && 'text-primary/70',
            !isInEchoRegion && !line.isActive && 'text-muted-foreground'
          )}
        >
          {line.secondary.text}
        </p>
      )}
    </button>
  )
})

