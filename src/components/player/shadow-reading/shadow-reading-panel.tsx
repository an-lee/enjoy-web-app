/**
 * ShadowReadingPanel Component
 *
 * Panel displayed below Echo Region when echo mode is active.
 * Provides controls for shadow reading practice.
 * Styled with soft purple tone to distinguish from Echo Region.
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDisplayTime } from '@/hooks/player'
import { ShadowReadingPanelHeader } from './shadow-reading-panel-header'
import { PitchContourSection } from '../pitch-contour'
import { ShadowRecorder } from './shadow-recorder'
import { ShadowRecordingList } from './shadow-recording-list'
import { usePlayerStore } from '@/stores/player'
import { TargetType } from '@/types/db'

interface ShadowReadingPanelProps {
  startTime: number // seconds
  endTime: number // seconds
  referenceText: string
}

export function ShadowReadingPanel({
  startTime,
  endTime,
}: ShadowReadingPanelProps) {
  const { t } = useTranslation()
  const duration = (endTime - startTime) * 1000 // Convert to milliseconds
  const displayTime = useDisplayTime()
  const currentSession = usePlayerStore((state) => state.currentSession)
  const targetType: TargetType | null = useMemo(() => {
    if (!currentSession) return null
    return currentSession.mediaType === 'audio' ? 'Audio' : 'Video'
  }, [currentSession])
  const targetId = currentSession?.mediaId || ''
  const language = currentSession?.language || 'en'

  // Calculate relative time for progress indicator (0 to duration)
  const currentTimeRelative = useMemo(() => {
    if (!Number.isFinite(displayTime)) return undefined
    // Clamp to region bounds
    if (displayTime < startTime) return 0
    if (displayTime >= endTime) return duration
    return (displayTime - startTime) * 1000 // Convert to milliseconds
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

        <ShadowRecordingList
          targetType={targetType}
          targetId={targetId}
          language={language}
          startTime={startTime * 1000}
          endTime={endTime * 1000}
        />

        <ShadowRecorder />
      </div>
    </div>
  )
}

