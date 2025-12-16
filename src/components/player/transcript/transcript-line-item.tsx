/**
 * TranscriptLineItem Component
 *
 * Individual transcript line item with primary and optional secondary text.
 * Handles click-to-seek, active state highlighting, and echo region styling.
 */

import { memo, useMemo } from 'react'
import { cn, formatTime } from '@/lib/utils'
import { useDisplayTime } from '@/hooks/use-display-time'
import { usePlayerStore } from '@/stores/player'
import type { TranscriptLineState } from './types'

interface TranscriptLineItemProps {
  line: TranscriptLineState
  /** Click handler - will be disabled automatically when in echo region or active */
  onLineClick?: (line: TranscriptLineState) => void
  /** Optional action area content (rendered on the right side of the header) */
  actionArea?: React.ReactNode
}

export const TranscriptLineItem = memo(function TranscriptLineItem({
  line,
  onLineClick,
  actionArea,
}: TranscriptLineItemProps) {
  // Get current time directly from hook (no prop drilling needed)
  const currentTimeSeconds = useDisplayTime()

  // Compute time-dependent state locally for better performance
  // This avoids recreating the entire lines array on every time update
  const isActive = useMemo(() => {
    return (
      currentTimeSeconds >= line.startTimeSeconds &&
      currentTimeSeconds < line.endTimeSeconds
    )
  }, [currentTimeSeconds, line.startTimeSeconds, line.endTimeSeconds])
  const isPast = currentTimeSeconds >= line.endTimeSeconds

  // Get echo region state directly from store (no prop drilling needed)
  const echoModeActive = usePlayerStore((state) => state.echoModeActive)
  const echoStartLineIndex = usePlayerStore((state) => state.echoStartLineIndex)
  const echoEndLineIndex = usePlayerStore((state) => state.echoEndLineIndex)

  // Compute echo region state locally
  const isInEchoRegion = useMemo(() => {
    return (
      echoModeActive &&
      line.index >= echoStartLineIndex &&
      line.index <= echoEndLineIndex
    )
  }, [echoModeActive, line.index, echoStartLineIndex, echoEndLineIndex])
  const isEchoStart = echoModeActive && line.index === echoStartLineIndex
  const isEchoEnd = echoModeActive && line.index === echoEndLineIndex

  // Determine if secondary text should be shown (if secondary line exists)
  const showSecondary = !!line.secondary

  // Disable click interaction when active or in echo region to allow text selection
  const shouldAllowTextSelection = isActive || isInEchoRegion
  const onClick = onLineClick && !shouldAllowTextSelection
    ? () => onLineClick(line)
    : undefined
  const isInteractive = typeof onClick === 'function'

  const containerClassName = cn(
    'group w-full text-left px-4 py-2.5 transition-all duration-300',
    isInteractive && 'cursor-pointer',
    (!isInteractive || shouldAllowTextSelection) && 'cursor-text select-text',
    isInteractive &&
      'focus-visible:outline-none focus-visible:ring-none',
    // Echo region - using standardized highlight styles
    // Only apply rounded corners to first and last lines
    isInEchoRegion && [
      'bg-highlight-active text-highlight-active-foreground',
      'border-l-4 border-highlight-active-border',
      isEchoStart && 'rounded-t-lg',
      isEchoEnd && 'rounded-b-lg',
      // If it's both start and end (single line), apply both corners
      isEchoStart && isEchoEnd && 'rounded-lg',
      // Remove hover effect for middle lines to maintain unified appearance
      'shadow-sm',
      // Active line inside echo region should stand out from other echo lines
      isActive && [
        'border-l-highlight-active-border',
        'font-bold',
        'shadow-md',
      ],
    ],
    // Non-echo region styles
    !isInEchoRegion && [
      'rounded-xl',
      'hover:bg-accent/50',
      // Active state - highlighted with scale and glow
      isActive && [
        'bg-primary/10 scale-[1.02]',
        'shadow-[0_0_30px_rgba(var(--primary),0.12)]',
      ],
      // Past state - dimmed
      isPast && !isActive && 'opacity-50',
      // Future state - slightly dimmed
      !isPast && !isActive && 'opacity-70 hover:opacity-100',
    ]
  )

  const content = (
    <>
      {/* Header row with timestamp and action area */}
      <div className="flex items-center justify-between mb-1.5">
        {/* Timestamp on the left */}
        <span
          className={cn(
            'text-xs font-mono tabular-nums transition-colors duration-300',
            isInEchoRegion && 'text-(--highlight-active-foreground)/70',
            !isInEchoRegion && isActive && 'text-primary/80',
            !isInEchoRegion && !isActive && 'text-muted-foreground/70'
          )}
        >
          {formatTime(line.startTimeSeconds)}
        </span>

        {/* Action area on the right */}
        {actionArea && (
          <div className="flex items-center gap-1">
            {actionArea}
          </div>
        )}
      </div>

      {/* Primary text */}
      <p
        className={cn(
          'text-base md:text-lg leading-relaxed transition-all duration-300',
          isInEchoRegion && 'text-highlight-active-foreground',
          !isInEchoRegion && isActive && 'text-primary font-medium text-lg md:text-xl',
          !isInEchoRegion && !isActive && 'text-foreground'
        )}
      >
        {line.primary.text}
      </p>

      {/* Secondary text (translation) */}
      {showSecondary && line.secondary && (
        <p
          className={cn(
            'mt-1.5 text-sm leading-relaxed transition-all duration-300',
            isInEchoRegion && 'text-(--highlight-active-foreground)/80',
            !isInEchoRegion && isActive && 'text-primary/70',
            !isInEchoRegion && !isActive && 'text-muted-foreground'
          )}
        >
          {line.secondary.text}
        </p>
      )}
    </>
  )

  return (
    isInteractive ? (
      <div
        onClick={onClick}
        className={containerClassName}
      >
        {content}
      </div>
    ) : (
      <div className={containerClassName}>
        {content}
      </div>
    )
  )
})

