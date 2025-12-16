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
import { useShadowRecording } from '@/hooks/use-shadow-recording'
import { usePlayerStore } from '@/stores/player'
import { ShadowReadingPanelHeader } from './shadow-reading-panel-header'
import { PitchContourSection } from './pitch-contour-section'
import { RecordButton } from './record-button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { TargetType } from '@/types/db'

interface ShadowReadingPanelProps {
  startTime: number // seconds
  endTime: number // seconds
  referenceText: string
  onRecord: () => void
  isRecording: boolean
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

  // Initialize recording hook
  const {
    isRecording,
    recordingDuration,
    volume,
    startRecording,
    stopRecording,
    error: recordingError,
  } = useShadowRecording({
    startTime: startTime * 1000, // Convert to milliseconds
    endTime: endTime * 1000, // Convert to milliseconds
    referenceText,
    language,
    targetType: targetType || 'Audio', // Fallback to Audio if null
    targetId,
  })

  // Handle record button click
  const handleRecordClick = useCallback(async () => {
    if (isRecording) {
      await stopRecording()
    } else {
      await startRecording()
    }
    onRecord()
  }, [isRecording, startRecording, stopRecording, onRecord])

  // Calculate relative time for progress indicator (0 to duration)
  const currentTimeRelative = useMemo(() => {
    if (!Number.isFinite(displayTime)) return undefined
    // Clamp to region bounds
    if (displayTime < startTime) return 0
    if (displayTime >= endTime) return duration
    return (displayTime - startTime) * 1000 // Convert to milliseconds
  }, [displayTime, startTime, endTime, duration])

  // Calculate recording progress percentage (0-100)
  const recordingProgress = useMemo(() => {
    if (!isRecording || duration === 0) return 0
    return Math.min((recordingDuration / duration) * 100, 100)
  }, [isRecording, recordingDuration, duration])

  // Calculate ideal progress percentage (based on echo region duration)
  const idealProgress = useMemo(() => {
    if (!Number.isFinite(displayTime) || duration === 0) return 0
    if (displayTime < startTime) return 0
    if (displayTime >= endTime) return 100
    return ((displayTime - startTime) / (endTime - startTime)) * 100
  }, [displayTime, startTime, endTime, duration])

  // Progress bar color based on how well user is matching the pace
  // Green: on track, Yellow: slightly off, Red: too slow
  const progressColor = useMemo(() => {
    if (!isRecording) return 'bg-highlight-active-foreground'
    const diff = recordingProgress - idealProgress
    if (diff < -20) return 'bg-destructive' // Too slow
    if (diff < -10) return 'bg-yellow-500' // Slightly slow
    if (diff < 10) return 'bg-green-500' // On track
    if (diff < 20) return 'bg-yellow-500' // Slightly fast
    return 'bg-orange-500' // Too fast
  }, [isRecording, recordingProgress, idealProgress])

  // Volume visualization bars (0-100)
  const volumeBars = useMemo(() => {
    const barCount = 20
    const bars: number[] = []
    for (let i = 0; i < barCount; i++) {
      const threshold = (i / barCount) * 100
      bars.push(volume > threshold ? 1 : 0)
    }
    return bars
  }, [volume])

  return (
    <div className="bg-highlight-active/30 text-highlight-active-foreground rounded-lg shadow-sm px-4 py-4 -mt-1">
      <ShadowReadingPanelHeader duration={duration} />

      <div className="grid gap-3">
        <p className="text-sm text-(--highlight-active-foreground)/75 leading-relaxed">
          {t('player.transcript.shadowReadingHint')}
        </p>

        {/* Recording progress bar - shows ideal pace vs actual recording */}
        {isRecording && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {t('player.transcript.recordingProgress', { defaultValue: 'Recording Progress' })}
              </span>
              <span className="font-medium">
                {Math.round(recordingProgress)}% / {Math.round(idealProgress)}%
              </span>
            </div>
            <div className="relative">
              {/* Ideal progress (background, subtle) */}
              <Progress
                value={idealProgress}
                className="h-2 bg-highlight-active-foreground/20"
              />
              {/* Actual recording progress (foreground, colored) */}
              <div
                className={cn(
                  'absolute top-0 left-0 h-2 rounded-full transition-all',
                  progressColor
                )}
                style={{ width: `${recordingProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {recordingProgress < idealProgress - 10
                ? t('player.transcript.recordingTooSlow', {
                    defaultValue: 'Try to match the pace',
                  })
                : recordingProgress > idealProgress + 10
                  ? t('player.transcript.recordingTooFast', {
                      defaultValue: 'Slow down a bit',
                    })
                  : t('player.transcript.recordingOnTrack', {
                      defaultValue: 'Good pace!',
                    })}
            </p>
          </div>
        )}

        {/* Volume visualization */}
        {isRecording && (
          <div className="flex items-center justify-center gap-1 h-8">
            {volumeBars.map((bar, index) => (
              <div
                key={index}
                className={cn(
                  'w-1 rounded-full transition-all duration-75',
                  bar > 0
                    ? 'bg-highlight-active-foreground'
                    : 'bg-highlight-active-foreground/20'
                )}
                style={{
                  height: `${bar * 100}%`,
                  minHeight: '4px',
                }}
              />
            ))}
          </div>
        )}

        {/* Error message */}
        {recordingError && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {recordingError}
          </div>
        )}

        <PitchContourSection
          startTime={startTime}
          endTime={endTime}
          currentTimeRelative={currentTimeRelative}
        />

        <RecordButton
          isRecording={isRecording}
          onRecord={handleRecordClick}
        />
      </div>
    </div>
  )
}
