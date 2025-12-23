/**
 * ExpandedPlayer - Expanded player view for language learning practice
 *
 * Modern, minimal design with learning-focused controls:
 * - Row 1: Progress bar with time labels
 * - Row 2: Main controls (prev/play/next/replay) + Secondary controls (volume/speed/dictation/echo)
 *
 * This component manages its own media loading and playback logic to avoid prop drilling.
 */

import { useRef, useState } from 'react'
import { TooltipProvider } from '@/page/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import { usePlayerStore } from '@/page/stores/player'
import { useMediaElement } from '@/page/hooks/player'
import { useMediaLoader } from '@/page/hooks/player/use-media-loader'
import { usePlaybackSync } from '@/page/hooks/player/use-playback-sync'
import { createLogger } from '@/shared/lib/utils'
import { ExpandedPlayerHeader } from './expanded-player-header'
import { ExpandedPlayerContent } from './expanded-player-content'
import { ExpandedPlayerControls } from './expanded-player-controls'
import type { ExpandedPlayerProps } from './types'

const log = createLogger({ name: 'ExpandedPlayer' })

// ============================================================================
// Component
// ============================================================================

export function ExpandedPlayer({ className }: ExpandedPlayerProps = {}) {
  const { currentSession, mode } = usePlayerStore()
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Load media from IndexedDB
  const {
    mediaUrl,
    isLoading,
    error,
    errorCode,
    handleRetry,
    handleReselectFile,
  } = useMediaLoader()

  // Get media element handlers
  const {
    handleTimeUpdate,
    handleEnded,
    handleCanPlay,
    handleLoadError,
  } = useMediaElement({
    mediaRef,
    onReady: setIsReady,
    onError: (errorMsg) => {
      log.error('Media element error:', errorMsg)
    },
  })

  // Sync playback state
  usePlaybackSync({
    mediaRef,
    isReady,
    mode,
  })

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
        <ExpandedPlayerHeader mediaRef={mediaRef} />

        <ExpandedPlayerContent
          isLoading={isLoading}
          error={error}
          errorCode={errorCode}
          isVideo={isVideo}
          mediaRef={mediaRef}
          mediaUrl={mediaUrl}
          onTimeUpdate={isVideo ? handleTimeUpdate : undefined}
          onEnded={isVideo ? handleEnded : undefined}
          onCanPlay={isVideo ? handleCanPlay : undefined}
          onError={isVideo ? handleLoadError : undefined}
          onRetry={handleRetry}
          onReselectFile={handleReselectFile}
        />

        {/* Controls: Only show at bottom for audio mode (video mode has controls in right panel) */}
        {!isVideo && <ExpandedPlayerControls />}

        {/* Audio element: Always render in hidden div for audio mode */}
        {/* Video element is rendered in ExpandedPlayerContent */}
        {!isVideo && mediaUrl && (
          <div className="hidden">
            <audio
              key={`audio-expanded-${currentSession.mediaId}`}
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={mediaUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onCanPlay={handleCanPlay}
              onWaiting={() => log.debug('buffering...')}
              onStalled={() => log.warn('stalled!')}
              onError={handleLoadError}
              preload="auto"
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

