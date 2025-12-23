/**
 * ExpandedPlayer - Expanded player view for language learning practice
 *
 * Modern, minimal design with learning-focused controls:
 * - Row 1: Progress bar with time labels
 * - Row 2: Main controls (prev/play/next/replay) + Secondary controls (volume/speed/dictation/echo)
 */

import { TooltipProvider } from '@/page/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import { usePlayerStore } from '@/page/stores/player'
import { ExpandedPlayerHeader } from './expanded-player-header'
import { ExpandedPlayerContent } from './expanded-player-content'
import { ExpandedPlayerControls } from './expanded-player-controls'
import type { ExpandedPlayerProps } from './types'

// ============================================================================
// Component
// ============================================================================

export function ExpandedPlayer({
  className,
  isLoading,
  error,
  errorCode,
  isVideo,
  mediaRef,
  mediaUrl,
  onTimeUpdate,
  onEnded,
  onCanPlay,
  onError,
  onRetry,
  onReselectFile,
}: ExpandedPlayerProps) {
  const { currentSession } = usePlayerStore()

  if (!currentSession) return null

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'fixed inset-0 z-50',
          'bg-background',
          'animate-in fade-in duration-200',
          'flex flex-col',
          className
        )}
      >
        <ExpandedPlayerHeader mediaRef={mediaRef} />

        <ExpandedPlayerContent
          isLoading={isLoading}
          error={error}
          errorCode={errorCode}
          isVideo={isVideo}
          mediaRef={mediaRef}
          mediaUrl={mediaUrl}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          onCanPlay={onCanPlay}
          onError={onError}
          onRetry={onRetry}
          onReselectFile={onReselectFile}
        />

        {/* Controls: Only show at bottom for audio mode (video mode has controls in right panel) */}
        {!isVideo && <ExpandedPlayerControls />}
      </div>
    </TooltipProvider>
  )
}

