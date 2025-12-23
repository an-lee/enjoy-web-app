/**
 * ExpandedPlayer - Expanded player view for language learning practice
 *
 * Modern, minimal design with learning-focused controls:
 * - Row 1: Progress bar with time labels
 * - Row 2: Main controls (prev/play/next/replay) + Secondary controls (volume/speed/dictation/echo)
 *
 * This component manages its own media loading and playback logic to avoid prop drilling.
 */

import { TooltipProvider } from '@/page/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import { usePlayerSessionStore } from '@/page/stores/player/player-session-store'
import { ExpandedPlayerHeader } from './expanded-player-header'
import { ExpandedPlayerContent } from './expanded-player-content'
import { ExpandedPlayerControls } from './expanded-player-controls'
import type { ExpandedPlayerProps } from './types'

// ============================================================================
// Component
// ============================================================================

export function ExpandedPlayer({ className }: ExpandedPlayerProps = {}) {
  const currentSession = usePlayerSessionStore((s) => s.currentSession)

  if (!currentSession) return null

  const isVideo = currentSession.mediaType === 'video'

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
        <ExpandedPlayerHeader />

        <ExpandedPlayerContent />

        {/* Controls: Only show at bottom for audio mode (video mode has controls in right panel) */}
        {!isVideo && <ExpandedPlayerControls />}
      </div>
    </TooltipProvider>
  )
}

