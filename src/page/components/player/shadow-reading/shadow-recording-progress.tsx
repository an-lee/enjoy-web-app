/**
 * ShadowRecordingProgress Component
 *
 * Displays recording progress bar and audio visualization during recording.
 * Shows recording duration as percentage of echo region total duration.
 */

import { useMemo, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Progress } from '@/page/components/ui/progress'
import { cn } from '@/lib/utils'

interface ShadowRecordingProgressProps {
  /** Whether recording is in progress */
  isRecording: boolean
  /** Current recording duration in milliseconds */
  recordingDuration: number
  /** Echo region total duration in milliseconds */
  echoRegionDuration: number
  /** Ref for the visualization canvas container */
  canvasRef: RefObject<HTMLDivElement | null>
}

export function ShadowRecordingProgress({
  isRecording,
  recordingDuration,
  echoRegionDuration,
  canvasRef,
}: ShadowRecordingProgressProps) {
  const { t } = useTranslation()

  // Calculate recording progress percentage (0-100)
  // Progress = recording duration / echo region total duration
  // When exceeds 100%, cap at 100%
  const recordingProgress = useMemo(() => {
    if (!isRecording || echoRegionDuration === 0) return 0
    return Math.min((recordingDuration / echoRegionDuration) * 100, 100)
  }, [isRecording, recordingDuration, echoRegionDuration])

  // Progress bar color based on how close to 100% (echo region duration)
  // Green: 0-70% (normal), Yellow: 70-90% (approaching), Orange: 90-100% (nearly done), Red: 100% (completed/exceeded)
  const progressColor = useMemo(() => {
    if (!isRecording) return 'bg-highlight-active-foreground'
    if (recordingProgress >= 100) return 'bg-destructive' // Completed/exceeded
    if (recordingProgress >= 90) return 'bg-orange-500' // Nearly done
    if (recordingProgress >= 70) return 'bg-yellow-500' // Approaching limit
    return 'bg-green-500' // Normal progress
  }, [isRecording, recordingProgress])

  // Get progress status message
  const progressMessage = useMemo(() => {
    if (recordingProgress >= 100) {
      return t('player.transcript.recordingCompleted', {
        defaultValue: 'Recording completed',
      })
    }
    if (recordingProgress >= 90) {
      return t('player.transcript.recordingNearlyDone', {
        defaultValue: 'Nearly done',
      })
    }
    if (recordingProgress >= 70) {
      return t('player.transcript.recordingApproaching', {
        defaultValue: 'Approaching time limit',
      })
    }
    return t('player.transcript.recordingInProgress', {
      defaultValue: 'Recording in progress',
    })
  }, [recordingProgress, t])

  if (!isRecording) {
    return null
  }

  return (
    <div className="space-y-3">
      {/* Recording progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {t('player.transcript.recordingProgress', {
              defaultValue: 'Recording Progress',
            })}
          </span>
          <span className="font-medium">{Math.round(recordingProgress)}%</span>
        </div>
        <div className="relative">
          {/* Background progress bar (100% = echo region total duration) */}
          <Progress
            value={100}
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
        <p className="text-xs text-muted-foreground">{progressMessage}</p>
      </div>

      {/* Frequency histogram visualization */}
      <div
        ref={canvasRef}
        className="flex items-center justify-center h-8 w-full"
        style={{ minHeight: '32px' }}
      />
    </div>
  )
}

