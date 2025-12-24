import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { Button } from '@/page/components/ui/button'
import { TranscriptDisplay } from '../transcript'
import { ExpandedPlayerControls } from './expanded-player-controls'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/page/components/ui/resizable'
import { createLogger } from '@/shared/lib/utils'
import { FileAccessErrorCode } from '@/page/lib/file-access'
import { usePlayerSessionStore } from '@/page/stores/player/player-session-store'
import { usePlayerUIStore } from '@/page/stores/player/player-ui-store'
import { useMediaElement } from '@/page/hooks/player'
import { useMediaLoader } from '@/page/hooks/player/use-media-loader'
import { usePlaybackSync } from '@/page/hooks/player/use-playback-sync'
import { usePlayerMedia } from '@/page/components/player/player-media-context'

const log = createLogger({ name: 'ExpandedPlayerContent' })

interface ExpandedPlayerContentProps {
  // No props needed - component manages its own state and registers mediaRef to store
}

export function ExpandedPlayerContent({}: ExpandedPlayerContentProps = {}) {
  const { t } = useTranslation()
  const currentSession = usePlayerSessionStore((s) => s.currentSession)
  const mode = usePlayerUIStore((s) => s.mode)
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
  const { registerMediaRef, unregisterMediaRef } = usePlayerMedia()
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

  // Register media ref with context
  useEffect(() => {
    registerMediaRef(mediaRef)
    return () => {
      unregisterMediaRef()
    }
    // Only register once on mount, unregister on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-register when media element is created (when mediaUrl changes and element exists)
  useEffect(() => {
    // Use a small delay to ensure the element is actually attached to the DOM
    if (mediaUrl) {
      const timer = setTimeout(() => {
        if (mediaRef.current) {
          registerMediaRef(mediaRef)
        }
      }, 0)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaUrl])

  // Get media element handlers
  const {
    handleTimeUpdate,
    handleEnded,
    handleCanPlay,
    handleWaiting,
    handleCanPlayThrough,
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

  // Note: mediaRef is automatically registered to store by useMediaElement hook
  // No need to register it again here

  if (!currentSession) return null

  const isVideo = currentSession.mediaType === 'video'

  // Determine which action button to show based on error code
  const showRetryButton =
    errorCode === FileAccessErrorCode.PERMISSION_DENIED ||
    errorCode === FileAccessErrorCode.PERMISSION_REQUIRED
  const showReselectButton = errorCode === FileAccessErrorCode.FILE_NOT_FOUND

  return (
    <main className="flex-1 flex min-h-0 overflow-hidden bg-muted/30">
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Icon icon="lucide:loader-2" className="w-10 h-10 animate-spin" />
          <p className="text-sm">{t('common.loading')}</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-destructive px-4">
          <Icon icon="lucide:alert-circle" className="w-10 h-10" />
          <p className="text-sm text-center max-w-md">{error}</p>
          {(showRetryButton || showReselectButton) && (
            <div className="flex gap-3 mt-2">
              {showRetryButton && handleRetry && (
                <Button onClick={handleRetry} variant="default" size="sm">
                  <Icon icon="lucide:refresh-cw" className="w-4 h-4 mr-2" />
                  {t('player.retry')}
                </Button>
              )}
              {showReselectButton && handleReselectFile && (
                <Button onClick={handleReselectFile} variant="default" size="sm">
                  <Icon icon="lucide:file-up" className="w-4 h-4 mr-2" />
                  {t('player.reselectFile')}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : isVideo ? (
        /* Video mode: Left-right layout with resizable panels */
        <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
          {/* Left panel: Video player */}
          <ResizablePanel defaultSize={60} minSize={40} className="flex flex-col">
            <div className="flex-1 flex items-center justify-center p-4 min-h-0">
              <div className="w-full h-full max-w-full bg-black rounded-xl overflow-hidden flex items-center justify-center">
                {mediaUrl && mediaRef ? (
                  <video
                    key={`video-expanded-${mediaUrl}`}
                    ref={mediaRef as React.RefObject<HTMLVideoElement>}
                    src={mediaUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                    onCanPlay={handleCanPlay}
                    onWaiting={handleWaiting}
                    onCanPlayThrough={handleCanPlayThrough}
                    onStalled={() => log.warn('stalled!')}
                    onError={handleLoadError}
                    playsInline
                    preload="auto"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Icon icon="lucide:video" className="w-16 h-16 text-muted-foreground/50" />
                )}
              </div>
            </div>
          </ResizablePanel>

          {/* Resizable handle */}
          <ResizableHandle withHandle />

          {/* Right panel: Transcript and controls - min width matches Chrome sidepanel (340px) */}
          <ResizablePanel defaultSize={40} minSize="340px" className="flex flex-col border-l min-w-[340px]">
            {/* Transcript section - takes available space */}
            <div className="flex-1 min-h-0">
              <TranscriptDisplay className="h-full" mediaRef={mediaRef} />
            </div>
            {/* Controls section - fixed at bottom */}
            <div className="shrink-0 border-t">
              <ExpandedPlayerControls />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        /* Audio mode: Centered transcript for optimal reading */
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-3xl">
            <TranscriptDisplay className="h-full" mediaRef={mediaRef} />
          </div>
        </div>
      )}

        {/* Audio element: Always render in hidden div for audio mode */}
        {/* Video element is rendered above in video mode */}
        {!isVideo && mediaUrl && (
          <div className="hidden">
            <audio
              key={`audio-expanded-${currentSession.mediaId}`}
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={mediaUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onCanPlay={handleCanPlay}
              onWaiting={handleWaiting}
              onCanPlayThrough={handleCanPlayThrough}
              onStalled={() => log.warn('stalled!')}
              onError={handleLoadError}
              preload="auto"
            />
          </div>
        )}
      </main>
  )
}

