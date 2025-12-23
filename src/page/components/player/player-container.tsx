/**
 * PlayerContainer - Global player container that manages player modes and media playback
 *
 * This component should be placed in the root layout to enable
 * media playback across all pages.
 *
 * Modes:
 * - hidden: No player UI shown
 * - mini: Mini player bar at the bottom
 * - expanded: Full-screen player
 */

import { useRef, useState } from 'react'
import { usePlayerStore } from '@/page/stores/player'
import { useMediaElement } from '@/page/hooks/player'
import { useMediaLoader } from '@/page/hooks/player/use-media-loader'
import { usePlaybackSync } from '@/page/hooks/player/use-playback-sync'
import { createLogger } from '@/shared/lib/utils'
import { MiniPlayerBar } from './mini-player-bar'
import { ExpandedPlayer } from './expanded-player'
import { PlayerHotkeys } from './player-hotkeys'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'PlayerContainer' })

// ============================================================================
// Component
// ============================================================================

export function PlayerContainer() {
  const mode = usePlayerStore((state) => state.mode)
  const currentSession = usePlayerStore((state) => state.currentSession)

  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Load media from IndexedDB and handle errors
  const {
    mediaUrl,
    isLoading,
    error,
    errorCode,
    handleRetry,
    handleReselectFile,
  } = useMediaLoader()

  // Get media element handlers from hook
  const {
    handleTimeUpdate,
    handleEnded,
    handleCanPlay,
    handleLoadError,
  } = useMediaElement({
    mediaRef,
    onReady: setIsReady,
    onError: (errorMsg) => {
      // Error handling is managed by useMediaLoader
      log.error('Media element error:', errorMsg)
    },
  })

  // Sync playback state (volume, playback rate, play/pause)
  usePlaybackSync({
    mediaRef,
    isReady,
    mode,
  })

  // Don't render anything if no session and mode is hidden
  if (mode === 'hidden' && !currentSession) {
    return null
  }

  const isVideo = currentSession?.mediaType === 'video'

  return (
    <>
      {/* Player hotkeys - active when player is visible (mini or expanded) */}
      {(mode === 'mini' || mode === 'expanded') && currentSession && (
        <PlayerHotkeys />
      )}

      {/* Mini player bar - shown in mini mode */}
      {mode === 'mini' && currentSession && (
        <MiniPlayerBar />
      )}

      {/* Full player - shown in expanded mode */}
      {mode === 'expanded' && currentSession && (
        <ExpandedPlayer
          isLoading={isLoading}
          error={error}
          errorCode={errorCode}
          isVideo={isVideo}
          mediaRef={isVideo ? mediaRef : undefined}
          mediaUrl={isVideo ? mediaUrl : undefined}
          onTimeUpdate={isVideo ? handleTimeUpdate : undefined}
          onEnded={isVideo ? handleEnded : undefined}
          onCanPlay={isVideo ? handleCanPlay : undefined}
          onError={isVideo ? handleLoadError : undefined}
          onRetry={handleRetry}
          onReselectFile={handleReselectFile}
        />
      )}

      {/* Actual media element - always render one element, position changes based on mode */}
      {currentSession && mediaUrl && (
        <>
          {/* Video: render in hidden div when NOT in expanded mode */}
          {/* In expanded mode, video is rendered in ExpandedPlayerContent with the same ref */}
          {isVideo && mode !== 'expanded' && (
            <div className="hidden">
              <video
                key={`video-${currentSession.mediaId}`}
                ref={mediaRef as React.RefObject<HTMLVideoElement>}
                src={mediaUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onCanPlay={handleCanPlay}
                onWaiting={() => log.debug('buffering...')}
                onStalled={() => log.warn('stalled!')}
                onError={handleLoadError}
                playsInline
                preload="auto"
              />
            </div>
          )}
          {/* Audio: always render in hidden div (no visual display needed) */}
          {!isVideo && (
            <div className="hidden">
              <audio
                key={`audio-${currentSession.mediaId}`}
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
        </>
      )}
    </>
  )
}

