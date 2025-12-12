/**
 * ShadowReadingPanel Component
 *
 * Panel displayed below Echo Region when echo mode is active.
 * Provides controls for shadow reading practice.
 * Styled with soft purple tone to distinguish from Echo Region.
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
    <div className="bg-shadow-panel text-shadow-panel-foreground border-t border-(--shadow-panel-foreground)/30 rounded-b-lg shadow-sm px-4 py-4 -mt-1">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:mic" className="w-5 h-5 text-shadow-panel-foreground" />
          <h3 className="text-base font-semibold text-shadow-panel-foreground">
            {t('player.transcript.shadowReading')}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-(--shadow-panel-foreground)/70">
          <Icon icon="lucide:clock" className="w-4 h-4" />
          <span className="tabular-nums font-medium">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Content area */}
      <div className="grid gap-4">
        <p className="text-sm text-(--shadow-panel-foreground)/75 leading-relaxed">
          {t('player.transcript.shadowReadingHint')}
        </p>

        {/* Pitch contour */}
        <div className="flex items-center justify-center gap-3">
          {/* Pitch contour button */}
          <button
            type="button"
            className="btn-text cursor-pointer flex items-center gap-2 px-4 py-2 text-sm text-(--shadow-panel-foreground)/80 hover:text-shadow-panel-foreground hover:bg-(--shadow-panel-foreground)/10 rounded-md transition-all hover:border-(--shadow-panel-foreground)/30"
          >
            <Icon icon="lucide:activity" className="w-4 h-4" />
            <span>{t('player.transcript.showPitchContour')}</span>
          </button>
        </div>

        {/* Record button */}
        <div className="flex items-center justify-center gap-3">
          {/* Record button - using shadow panel foreground color */}
          <button
            type="button"
            onClick={onRecord}
            className={cn(
              'flex items-center justify-center gap-2 px-6 py-2.5 rounded-md font-medium transition-all',
              'shadow-sm hover:shadow-md',
              isRecording
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-shadow-panel-foreground text-shadow-panel hover:opacity-90'
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

