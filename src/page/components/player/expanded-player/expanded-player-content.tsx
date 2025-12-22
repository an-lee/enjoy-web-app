import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { TranscriptDisplay } from '../transcript'
import { createLogger } from '@/shared/lib/utils'

const log = createLogger({ name: 'ExpandedPlayerContent' })

interface ExpandedPlayerContentProps {
  /** Whether media is loading */
  isLoading?: boolean
  /** Error message if loading failed */
  error?: string | null
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
}

export function ExpandedPlayerContent({
  isLoading,
  error,
  isVideo,
  mediaRef,
  mediaUrl,
  onTimeUpdate,
  onEnded,
  onCanPlay,
  onError,
}: ExpandedPlayerContentProps) {
  const { t } = useTranslation()

  return (
    <main className="flex-1 flex min-h-0 overflow-hidden bg-muted/30">
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Icon icon="lucide:loader-2" className="w-10 h-10 animate-spin" />
          <p className="text-sm">{t('common.loading')}</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-destructive">
          <Icon icon="lucide:alert-circle" className="w-10 h-10" />
          <p className="text-sm">{error}</p>
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

