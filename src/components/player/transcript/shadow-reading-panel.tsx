/**
 * ShadowReadingPanel Component
 *
 * Panel displayed at the bottom of transcript when echo mode is active.
 * Provides controls for shadow reading practice.
 */

import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn, formatTime } from '@/lib/utils'

interface ShadowReadingPanelProps {
  startTime: number
  endTime: number
  onRecord: () => void
  isRecording: boolean
}

export function ShadowReadingPanel({
  startTime,
  endTime,
  onRecord,
  isRecording,
}: ShadowReadingPanelProps) {
  const { t } = useTranslation()
  const duration = endTime - startTime

  return (
    <div className="shrink-0 bg-orange-950/30 border-t border-orange-800/50 shadow-lg">
      {/* Header row */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-orange-800/30">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:mic" className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-semibold text-foreground">
            {t('player.transcript.shadowReading')}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon icon="lucide:clock" className="w-4 h-4" />
          <span className="tabular-nums font-medium">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Content area */}
      <div className="px-6 py-4">
        <p className="text-sm text-muted-foreground mb-5">
          {t('player.transcript.shadowReadingHint')}
        </p>

        {/* Controls row */}
        <div className="flex items-center justify-center gap-4">
          {/* Pitch contour button */}
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-orange-900/20 rounded-lg transition-colors"
          >
            <Icon icon="lucide:activity" className="w-4 h-4" />
            <span>{t('player.transcript.showPitchContour')}</span>
          </button>

          {/* Record button - prominent orange */}
          <button
            type="button"
            onClick={onRecord}
            className={cn(
              'flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-medium transition-all',
              'shadow-md hover:shadow-lg',
              isRecording
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            )}
          >
            <Icon
              icon={isRecording ? 'lucide:square' : 'lucide:mic'}
              className="w-5 h-5"
            />
            <span>
              {isRecording
                ? t('player.transcript.stopRecording')
                : t('player.transcript.record')}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

