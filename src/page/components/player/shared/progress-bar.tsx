/**
 * ProgressBar - Interactive progress bar for media playback
 */

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/shared/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface ProgressBarProps {
  /** Current progress (0-100) */
  progress: number
  /** Buffered progress (0-100) */
  buffered?: number
  /** Callback when user seeks to a position (0-100) */
  onSeek?: (progress: number) => void
  /** Additional class names */
  className?: string
  /** Whether the bar is interactive */
  interactive?: boolean
  /** Height variant */
  size?: 'sm' | 'md' | 'lg'
}

// ============================================================================
// Component
// ============================================================================

export function ProgressBar({
  progress,
  buffered = 0,
  onSeek,
  className,
  interactive = true,
  size = 'md',
}: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)

  const calculateProgress = useCallback((clientX: number): number => {
    if (!barRef.current) return 0
    const rect = barRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const width = rect.width
    return Math.max(0, Math.min(100, (x / width) * 100))
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!interactive || !onSeek) return
      setIsDragging(true)
      const newProgress = calculateProgress(e.clientX)
      onSeek(newProgress)
    },
    [interactive, onSeek, calculateProgress]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!interactive) return
      const newProgress = calculateProgress(e.clientX)
      setHoverProgress(newProgress)

      if (isDragging && onSeek) {
        onSeek(newProgress)
      }
    },
    [interactive, isDragging, onSeek, calculateProgress]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
    setHoverProgress(null)
  }, [])

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  }

  return (
    <div
      ref={barRef}
      className={cn(
        'relative w-full rounded-full overflow-hidden cursor-pointer group',
        sizeClasses[size],
        'bg-muted/50',
        interactive && 'hover:h-2 transition-all duration-150',
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Buffered layer */}
      {buffered > 0 && (
        <div
          className="absolute inset-y-0 left-0 bg-muted-foreground/20 transition-all"
          style={{ width: `${buffered}%` }}
        />
      )}

      {/* Progress layer */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 bg-primary transition-all',
          isDragging && 'transition-none'
        )}
        style={{ width: `${progress}%` }}
      />

      {/* Hover indicator */}
      {interactive && hoverProgress !== null && (
        <div
          className="absolute inset-y-0 bg-primary/30 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            left: `${Math.min(progress, hoverProgress)}%`,
            width: `${Math.abs(hoverProgress - progress)}%`,
          }}
        />
      )}

      {/* Seek handle (visible on hover/drag) */}
      {interactive && (
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-sm',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            isDragging && 'opacity-100 scale-110'
          )}
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      )}
    </div>
  )
}

