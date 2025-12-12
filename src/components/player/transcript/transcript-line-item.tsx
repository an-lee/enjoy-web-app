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
  onClick?: () => void
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
  const isInteractive = typeof onClick === 'function'

  const containerClassName = cn(
    'group w-full text-left px-4 py-2.5 transition-all duration-300',
    isInteractive && 'cursor-pointer',
    !isInteractive && 'cursor-text select-text',
    isInteractive &&
      'focus-visible:outline-none focus-visible:ring-none',
    // Echo region - warm orange tone with subtle styling
    // Only apply rounded corners to first and last lines
    isInEchoRegion && [
      'bg-[var(--echo-region)] text-[var(--echo-region-foreground)]',
      'border-l-4 border-[var(--echo-region-foreground)]/50',
      isEchoStart && 'rounded-t-lg',
      isEchoEnd && 'rounded-b-lg',
      // If it's both start and end (single line), apply both corners
      isEchoStart && isEchoEnd && 'rounded-lg',
      // Remove hover effect for middle lines to maintain unified appearance
      'shadow-sm',
      // Active line inside echo region should stand out from other echo lines
      line.isActive && [
        'border-l-[var(--echo-region-foreground)]/70',
        'font-bold',
        'shadow-md',
      ],
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
  )

  return (
    isInteractive ? (
      <button
        type="button"
        onClick={onClick}
        className={containerClassName}
      >
        {/* Primary text */}
        <p
          className={cn(
            'text-base md:text-lg leading-relaxed transition-all duration-300',
            isInEchoRegion && 'text-echo-region-foreground',
            !isInEchoRegion && line.isActive && 'text-primary font-medium text-lg md:text-xl',
            !isInEchoRegion && !line.isActive && 'text-foreground'
          )}
        >
          {line.primary.text}
        </p>

        {/* Secondary text (translation) */}
        {showSecondary && line.secondary && (
          <p
            className={cn(
              'mt-1.5 text-sm leading-relaxed transition-all duration-300',
              isInEchoRegion && 'text-(--echo-region-foreground)/80',
              !isInEchoRegion && line.isActive && 'text-primary/70',
              !isInEchoRegion && !line.isActive && 'text-muted-foreground'
            )}
          >
            {line.secondary.text}
          </p>
        )}
      </button>
    ) : (
      <div className={containerClassName}>
      {/* Primary text */}
      <p
        className={cn(
          'text-base md:text-lg leading-relaxed transition-all duration-300',
          isInEchoRegion && 'text-echo-region-foreground',
          !isInEchoRegion && line.isActive && 'text-primary font-medium text-lg md:text-xl',
          !isInEchoRegion && !line.isActive && 'text-foreground'
        )}
      >
        {line.primary.text}
      </p>

      {/* Secondary text (translation) */}
      {showSecondary && line.secondary && (
        <p
          className={cn(
            'mt-1.5 text-sm leading-relaxed transition-all duration-300',
            isInEchoRegion && 'text-(--echo-region-foreground)/80',
            !isInEchoRegion && line.isActive && 'text-primary/70',
            !isInEchoRegion && !line.isActive && 'text-muted-foreground'
          )}
        >
          {line.secondary.text}
        </p>
      )}
      </div>
    )
  )
})

