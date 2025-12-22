import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { Button } from '@/page/components/ui/button'
import { TranscriptDisplay } from '../transcript'
import { createLogger } from '@/shared/lib/utils'
import { FileAccessErrorCode } from '@/page/lib/file-access'

const log = createLogger({ name: 'ExpandedPlayerContent' })

interface ExpandedPlayerContentProps {
  /** Whether media is loading */
  isLoading?: boolean
  /** Error message if loading failed */
  error?: string | null
  /** Error code for determining action buttons */
  errorCode?: string | null
  /** Whether it's a video */
  isVideo?: boolean
  /** Media element ref (for video display) */
  mediaRef?: React.RefObject<HTMLVideoElement | HTMLAudioElement | null>
  /** Media URL (for video display) */
  mediaUrl?: string | null
  /** Media event handlers */
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement>) => void
  onEnded?: () => void
  onCanPlay?: (e: React.SyntheticEvent<HTMLVideoElement>) => void
  onError?: (e: React.SyntheticEvent<HTMLVideoElement>) => void
  /** Retry handler for permission errors */
  onRetry?: () => void
  /** Reselect file handler for file not found errors */
  onReselectFile?: () => void
}

export function ExpandedPlayerContent({
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
}: ExpandedPlayerContentProps) {
  const { t } = useTranslation()

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
              {showRetryButton && onRetry && (
                <Button onClick={onRetry} variant="default" size="sm">
                  <Icon icon="lucide:refresh-cw" className="w-4 h-4 mr-2" />
                  {t('player.retry')}
                </Button>
              )}
              {showReselectButton && onReselectFile && (
                <Button onClick={onReselectFile} variant="default" size="sm">
                  <Icon icon="lucide:file-up" className="w-4 h-4 mr-2" />
                  {t('player.reselectFile')}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : isVideo ? (
        /* Video mode: Actual video player on top, transcript below */
        <div className="flex-1 flex flex-col">
          <div className="shrink-0 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl aspect-video bg-black rounded-xl overflow-hidden">
              {mediaUrl && mediaRef ? (
                <video
                  key={`video-expanded-${mediaUrl}`}
                  ref={mediaRef as React.RefObject<HTMLVideoElement>}
                  src={mediaUrl}
                  onTimeUpdate={onTimeUpdate}
                  onEnded={onEnded}
                  onCanPlay={onCanPlay}
                  onWaiting={() => log.debug('buffering...')}
                  onStalled={() => log.warn('stalled!')}
                  onError={onError}
                  playsInline
                  preload="auto"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon icon="lucide:video" className="w-16 h-16 text-muted-foreground/50" />
                </div>
              )}
            </div>
          </div>
          {/* Transcript below video - centered with max width */}
          <div className="flex-1 min-h-0 border-t flex justify-center">
            <div className="w-full max-w-3xl">
              <TranscriptDisplay className="h-full" />
            </div>
          </div>
        </div>
      ) : (
        /* Audio mode: Centered transcript for optimal reading */
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-3xl">
            <TranscriptDisplay className="h-full" />
          </div>
        </div>
      )}
    </main>
  )
}

