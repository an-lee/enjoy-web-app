import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { TranscriptDisplay } from '../transcript'
import type { TranscriptLineState } from '../transcript/types'

interface ExpandedPlayerContentProps {
  isLoading?: boolean
  error?: string | null
  isVideo?: boolean
  displayTime: number
  isPlaying: boolean
  onSeek?: (time: number) => void
  lines: TranscriptLineState[]
  activeLineIndex: number
  primaryLanguage: string | null
  secondaryLanguage: string | null
}

export function ExpandedPlayerContent({
  isLoading,
  error,
  isVideo,
  displayTime,
  isPlaying,
  onSeek,
  lines,
  activeLineIndex,
  primaryLanguage,
  secondaryLanguage,
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
        /* Video mode: Video placeholder on top, transcript below */
        <div className="flex-1 flex flex-col">
          <div className="shrink-0 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl aspect-video bg-black/10 dark:bg-black/40 rounded-xl flex items-center justify-center">
              <Icon icon="lucide:video" className="w-16 h-16 text-muted-foreground/50" />
            </div>
          </div>
          {/* Transcript below video - centered with max width */}
          <div className="flex-1 min-h-0 border-t flex justify-center">
            <div className="w-full max-w-3xl">
              <TranscriptDisplay
                currentTime={displayTime}
                isPlaying={isPlaying}
                onLineClick={onSeek}
                className="h-full"
                lines={lines}
                activeLineIndex={activeLineIndex}
                primaryLanguage={primaryLanguage}
                secondaryLanguage={secondaryLanguage}
                showSecondary={!!secondaryLanguage}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Audio mode: Centered transcript for optimal reading */
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-3xl">
            <TranscriptDisplay
              currentTime={displayTime}
              isPlaying={isPlaying}
              onLineClick={onSeek}
              className="h-full"
              lines={lines}
              activeLineIndex={activeLineIndex}
              primaryLanguage={primaryLanguage}
              secondaryLanguage={secondaryLanguage}
              showSecondary={!!secondaryLanguage}
            />
          </div>
        </div>
      )}
    </main>
  )
}

