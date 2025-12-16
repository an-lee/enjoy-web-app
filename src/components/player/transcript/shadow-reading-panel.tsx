/**
 * ShadowReadingPanel Component
 *
 * Panel displayed below Echo Region when echo mode is active.
 * Provides controls for shadow reading practice.
 * Styled with soft purple tone to distinguish from Echo Region.
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDisplayTime } from '@/hooks/use-display-time'
import { ShadowReadingPanelHeader } from './shadow-reading-panel-header'
import { PitchContourSection } from './pitch-contour-section'
import { RecordButton } from './record-button'

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
  const displayTime = useDisplayTime()

  // Calculate relative time for progress indicator (0 to duration)
  const currentTimeRelative = useMemo(() => {
    if (!Number.isFinite(displayTime)) return undefined
    // Clamp to region bounds
    if (displayTime < startTime) return 0
    if (displayTime >= endTime) return duration
    return displayTime - startTime
  }, [displayTime, startTime, endTime, duration])

  return (
    <div className="bg-highlight-active/30 text-highlight-active-foreground rounded-lg shadow-sm px-4 py-4 -mt-1">
      <ShadowReadingPanelHeader duration={duration} />

      <div className="grid gap-3">
        <p className="text-sm text-(--highlight-active-foreground)/75 leading-relaxed">
          {t('player.transcript.shadowReadingHint')}
        </p>

        <PitchContourSection
          startTime={startTime}
          endTime={endTime}
          currentTimeRelative={currentTimeRelative}
        />

        <RecordButton isRecording={isRecording} onRecord={onRecord} />
      </div>
    </div>
  )
}

