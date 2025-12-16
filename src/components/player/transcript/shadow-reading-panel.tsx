/**
 * ShadowReadingPanel Component
 *
 * Panel displayed below Echo Region when echo mode is active.
 * Provides controls for shadow reading practice.
 * Styled with soft purple tone to distinguish from Echo Region.
 */

import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDisplayTime } from '@/hooks/use-display-time'
import { usePlayerStore } from '@/stores/player'
import { ShadowReadingPanelHeader } from './shadow-reading-panel-header'
import { PitchContourSection } from './pitch-contour-section'
import { ShadowRecording } from './shadow-recording'
import type { TargetType } from '@/types/db'

interface ShadowReadingPanelProps {
  startTime: number // seconds
  endTime: number // seconds
  referenceText: string
  onRecord: () => void
}

export function ShadowReadingPanel({
  startTime,
  endTime,
  referenceText,
  onRecord,
}: ShadowReadingPanelProps) {
  const { t } = useTranslation()
  const duration = (endTime - startTime) * 1000 // Convert to milliseconds
  const displayTime = useDisplayTime()
  const currentSession = usePlayerStore((state) => state.currentSession)

  // Get targetType and targetId from current session
  const targetType: TargetType | null = useMemo(() => {
    if (!currentSession) return null
    return currentSession.mediaType === 'audio' ? 'Audio' : 'Video'
  }, [currentSession])

  const targetId = currentSession?.mediaId || ''
  const language = currentSession?.language || 'en'

  // Handle recording state changes
  const handleRecordingStateChange = useCallback(() => {
    onRecord() // Update parent state
  }, [onRecord])

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

        {targetType && (
          <ShadowRecording
            startTime={startTime}
            endTime={endTime}
            referenceText={referenceText}
            language={language}
            targetType={targetType}
            targetId={targetId}
            onRecordingStateChange={handleRecordingStateChange}
          />
        )}
      </div>
    </div>
  )
}
